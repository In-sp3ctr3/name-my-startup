import { env } from "@/env";
import type {
  Actor,
  Candidate,
  GenerationRun,
  JobRun,
  ReportSnapshot,
  ScreeningRun,
  ScreeningSourceResult
} from "@/lib/types";
import { briefHasStrictExternalRouting, findAbuseSignals } from "@/server/abuse";
import { GENERATION_PROMPT_VERSION, GENERATION_SCHEMA_VERSION, estimateGenerationCost, generateCandidates } from "@/server/generation";
import { runProviderScreen } from "@/server/providers";
import { buildReportSnapshot, renderMarkdownReport } from "@/server/reports";
import { namesForCheckedRecommendations } from "@/server/selection";
import {
  addGenerationRun,
  addReportSnapshot,
  addScreeningRun,
  assertAiBudget,
  BusinessRuleError,
  claimNextQueuedJobRun,
  completeJobRun,
  completeScreeningRun,
  failJobRun,
  getJobRun,
  getProjectSnapshot,
  recordAiUsageEvent,
  replaceGeneratedCandidates,
  resolveGenerationAccess,
  requeueStaleJobRuns,
  startJobRun
} from "@/server/store";

export type GenerationJobResult = {
  generationRun: GenerationRun;
  candidates: Candidate[];
  job: JobRun | null;
};

export type ScreeningJobResult = {
  screeningRun: ScreeningRun;
  results: ScreeningSourceResult[];
  job: JobRun | null;
};

export type ReportJobResult = {
  report: ReportSnapshot;
  job: JobRun | null;
};

export type JobExecutionResult = GenerationJobResult | ScreeningJobResult | ReportJobResult;

export type JobDrainSummary = {
  workerId: string;
  processed: number;
  succeeded: number;
  failed: number;
  jobs: Array<{ id: string; type: JobRun["jobType"]; status: "succeeded" | "failed"; error?: string }>;
};

class JobExecutionError extends BusinessRuleError {
  constructor(
    code: string,
    message: string,
    status = 409
  ) {
    super(code, message, status);
    this.name = "JobExecutionError";
  }
}

function actorFromJob(job: JobRun): Actor {
  const anonymous = job.ownerUserId.startsWith("anon:");
  return {
    userId: job.ownerUserId,
    orgId: job.orgId,
    source: anonymous ? "anonymous" : "clerk"
  };
}

function projectIdFromJob(job: JobRun) {
  const payload = job.requestPayload as { projectId?: unknown };
  const projectId = typeof payload?.projectId === "string" ? payload.projectId : job.projectId;
  if (!projectId) throw new JobExecutionError("project_id_missing", "Job is missing a project id.", 422);
  return projectId;
}

async function runGenerationJob(job: JobRun, actor: Actor): Promise<GenerationJobResult> {
  const projectId = projectIdFromJob(job);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) throw new JobExecutionError("project_not_found", "Project not found.", 404);

  const access = resolveGenerationAccess(snapshot);
  if (access.existingRun) {
    const candidates = snapshot.candidates.filter((candidate) => candidate.generationRunId === access.existingRun?.id);
    const completedJob = await completeJobRun(actor, job.id, { generationRunId: access.existingRun.id, candidateCount: candidates.length, reused: true });
    return { generationRun: access.existingRun, candidates, job: completedJob };
  }

  await assertAiBudget(
    actor,
    estimateGenerationCost(
      snapshot.project.brief,
      access.count,
      snapshot.candidates.map((candidate) => candidate.name),
      access.accessType
    )
  );

  const generated = await generateCandidates(
    snapshot.project.brief,
    access.count,
    snapshot.candidates.map((candidate) => candidate.name),
    { accessType: access.accessType }
  );
  const completedAt = new Date().toISOString();
  const run = await addGenerationRun(actor, projectId, {
    projectId,
    status: "succeeded",
    model: generated.aiUsage.model,
    accessType: access.accessType,
    promptVersion: GENERATION_PROMPT_VERSION,
    schemaVersion: GENERATION_SCHEMA_VERSION,
    validationStatus: generated.validationStatus,
    outputSnapshot: { candidateCount: generated.candidates.length, eval: generated.evalResult },
    costEstimateCents: generated.costEstimateCents,
    completedAt
  });
  if (!run) throw new JobExecutionError("generation_forbidden", "Generation run could not be created.", 403);

  await recordAiUsageEvent(actor, {
    projectId,
    generationRunId: run.id,
    provider: generated.aiUsage.provider,
    model: generated.aiUsage.model,
    task: "naming_generation",
    promptVersion: GENERATION_PROMPT_VERSION,
    inputTokens: generated.aiUsage.inputTokens,
    outputTokens: generated.aiUsage.outputTokens,
    estimatedCostMicroCents: generated.aiUsage.estimatedCostMicroCents,
    status: generated.aiUsage.status,
    metadata: {
      accessType: access.accessType,
      candidateCount: generated.candidates.length,
      evalScore: generated.evalResult.score
    }
  });
  const candidates = await replaceGeneratedCandidates(actor, projectId, run.id, generated.candidates);
  const completedJob = await completeJobRun(actor, job.id, { generationRunId: run.id, candidateCount: candidates.length });
  return { generationRun: run, candidates, job: completedJob };
}

async function runScreeningJob(job: JobRun, actor: Actor): Promise<ScreeningJobResult> {
  const projectId = projectIdFromJob(job);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) throw new JobExecutionError("project_not_found", "Project not found.", 404);

  if (snapshot.screeningResults.length > 0) {
    const latestRun = [...snapshot.screeningRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (latestRun) {
      const completedJob = await completeJobRun(actor, job.id, { screeningRunId: latestRun.id, resultCount: snapshot.screeningResults.length, reused: true });
      return { screeningRun: latestRun, results: snapshot.screeningResults, job: completedJob };
    }
  }

  const candidates = namesForCheckedRecommendations(snapshot);
  if (candidates.length === 0) throw new JobExecutionError("generation_required", "Generate names before creating checked recommendations.", 400);

  const abuseSignals = candidates.flatMap((candidate) => findAbuseSignals(candidate.name));
  if (abuseSignals.length > 0) throw new JobExecutionError("abuse_review_required", "Screening blocked for abuse-prevention review.", 422);

  const run = await addScreeningRun(actor, projectId, env.ENABLE_REAL_PROVIDERS === "true" ? "real" : "mock");
  if (!run) throw new JobExecutionError("screening_forbidden", "Screening run could not be created.", 403);

  const nestedResults = await Promise.all(candidates.map((candidate) => runProviderScreen(candidate, snapshot.project.brief, run.id, snapshot.project.id)));
  const results = nestedResults.flat();
  const completed = await completeScreeningRun(actor, run.id, results);
  if (!completed) throw new JobExecutionError("screening_forbidden", "Screening run could not be completed.", 403);
  const updatedSnapshot = await getProjectSnapshot(actor, projectId);
  const persistedResults = updatedSnapshot?.screeningResults.filter((result) => result.screeningRunId === run.id) ?? [];
  const completedJob = await completeJobRun(actor, job.id, { screeningRunId: run.id, resultCount: results.length });
  return { screeningRun: completed, results: persistedResults, job: completedJob };
}

async function runReportJob(job: JobRun, actor: Actor): Promise<ReportJobResult> {
  const projectId = projectIdFromJob(job);
  const snapshot = await getProjectSnapshot(actor, projectId);
  if (!snapshot) throw new JobExecutionError("project_not_found", "Project not found.", 404);

  const latestReport = [...snapshot.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (latestReport) {
    const completedJob = await completeJobRun(actor, job.id, { reportId: latestReport.id, reused: true });
    return { report: latestReport, job: completedJob };
  }

  const candidates = namesForCheckedRecommendations(snapshot);
  if (candidates.length === 0) throw new JobExecutionError("generation_required", "Generate names before export.", 400);

  const markdown = renderMarkdownReport({
    project: snapshot.project,
    candidates,
    results: snapshot.screeningResults,
    promptVersion: snapshot.generationRuns.at(-1)?.promptVersion ?? GENERATION_PROMPT_VERSION
  });
  const report = await addReportSnapshot(
    actor,
    buildReportSnapshot({
      projectId,
      markdown,
      candidateIds: candidates.map((candidate) => candidate.id),
      promptVersion: snapshot.generationRuns.at(-1)?.promptVersion ?? GENERATION_PROMPT_VERSION
    })
  );
  if (!report) throw new JobExecutionError("report_forbidden", "Report could not be created.", 403);
  const completedJob = await completeJobRun(actor, job.id, { reportId: report.id, candidateCount: candidates.length });
  return { report, job: completedJob };
}

export async function executeClaimedJobRun(job: JobRun): Promise<JobExecutionResult> {
  const actor = actorFromJob(job);
  try {
    if (job.jobType === "generation") return await runGenerationJob(job, actor);
    if (job.jobType === "screening") return await runScreeningJob(job, actor);
    return await runReportJob(job, actor);
  } catch (error) {
    await failJobRun(actor, job.id, error).catch(() => null);
    throw error;
  }
}

export async function executeQueuedJobInline(actor: Actor, jobId: string): Promise<JobExecutionResult> {
  const job = await getJobRun(actor, jobId);
  if (!job) throw new JobExecutionError("job_not_found", "Job not found.", 404);
  const running = await startJobRun(actor, job.id);
  return executeClaimedJobRun(running ?? { ...job, status: "running" });
}

export async function drainJobQueue(workerId = `worker:${crypto.randomUUID()}`, limit = env.JOB_DRAIN_BATCH_SIZE): Promise<JobDrainSummary> {
  const summary: JobDrainSummary = {
    workerId,
    processed: 0,
    succeeded: 0,
    failed: 0,
    jobs: []
  };

  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextQueuedJobRun(workerId);
    if (!job) break;
    summary.processed += 1;
    try {
      await executeClaimedJobRun(job);
      summary.succeeded += 1;
      summary.jobs.push({ id: job.id, type: job.jobType, status: "succeeded" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      summary.jobs.push({ id: job.id, type: job.jobType, status: "failed", error: message.slice(0, 160) });
    }
  }

  return summary;
}

export async function sweepAndDrainJobQueue(workerId = `sweeper:${crypto.randomUUID()}`) {
  const staleBefore = new Date(Date.now() - env.JOB_STALE_AFTER_MS);
  const swept = await requeueStaleJobRuns(staleBefore);
  const drained = await drainJobQueue(workerId, env.JOB_DRAIN_BATCH_SIZE);
  return {
    staleBefore: staleBefore.toISOString(),
    requeued: swept.requeued.length,
    markedFailed: swept.failed.length,
    drained
  };
}

export function assertScreeningCanRun(snapshot: Awaited<ReturnType<typeof getProjectSnapshot>>) {
  if (!snapshot) throw new JobExecutionError("project_not_found", "Project not found.", 404);
  if (env.ENABLE_REAL_PROVIDERS === "true" && briefHasStrictExternalRouting(snapshot.project.brief)) {
    throw new JobExecutionError("strict_external_routing", "Strict confidential mode requires source-by-source approval before external checks.");
  }
  const candidates = namesForCheckedRecommendations(snapshot);
  if (candidates.length === 0) throw new JobExecutionError("generation_required", "Generate names before creating checked recommendations.", 400);
  const abuseSignals = candidates.flatMap((candidate) => findAbuseSignals(candidate.name));
  if (abuseSignals.length > 0) throw new JobExecutionError("abuse_review_required", "Screening blocked for abuse-prevention review.", 422);
}
