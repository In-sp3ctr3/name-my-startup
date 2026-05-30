import { NextResponse } from "next/server";
import { z } from "zod";
import { detachedJobsEnabled } from "@/env";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { executeQueuedJobInline } from "@/server/jobs";
import { triggerBackgroundJobDrain } from "@/server/job-trigger";
import { assertRateLimit, createJobRun, getProjectSnapshot, resolveGenerationAccess } from "@/server/store";

const generationRequestSchema = z.object({
  count: z.number().int().min(1).max(80).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    let actor = await getCurrentActor({ allowAnonymous: true });
    await assertRateLimit(actor, "generation:create", 6, 60_000);
    const { projectId } = await params;
    let snapshot = await getProjectSnapshot(actor, projectId);
    if (!snapshot && actor.source === "anonymous") {
      actor = await getCurrentActor();
      snapshot = await getProjectSnapshot(actor, projectId);
    }
    if (!snapshot) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });

    const rawBody = await request.json().catch(() => ({}));
    generationRequestSchema.parse(rawBody);
    const access = resolveGenerationAccess(snapshot);
    if (access.existingRun) {
      return NextResponse.json({
        generationRun: access.existingRun,
        candidates: snapshot.candidates.filter((candidate) => candidate.generationRunId === access.existingRun?.id)
      });
    }

    const job = await createJobRun(actor, {
      jobType: "generation",
      projectId,
      idempotencyKey: request.headers.get("idempotency-key") ? `${actor.userId}:generation:${projectId}:${request.headers.get("idempotency-key")}` : undefined,
      requestPayload: { projectId, accessType: access.accessType, count: access.count, requestedCount: rawBody.count ?? null }
    });
    if (detachedJobsEnabled) {
      await triggerBackgroundJobDrain(request, job.id);
      return NextResponse.json({ job, queued: true }, { status: 202 });
    }

    const result = await executeQueuedJobInline(actor, job.id);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
