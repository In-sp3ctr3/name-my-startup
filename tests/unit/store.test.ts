import { describe, expect, it, beforeEach } from "vitest";
import {
  addGenerationRun,
  assertRateLimit,
  BusinessRuleError,
  claimNextQueuedJobRun,
  completeJobRun,
  createCheckoutIntent,
  createJobRun,
  createProject,
  deleteAccountData,
  deleteProject,
  exportAccountData,
  getAiUsageSummary,
  getBillingSummary,
  getJobHealth,
  getJobRun,
  getProjectSnapshot,
  grantPaidPack,
  hasUsedFreePreview,
  listJobRuns,
  recordAiUsageEvent,
  recordProviderEvent,
  requeueStaleJobRuns,
  resetStoreForTests,
  resolveGenerationAccess,
  startJobRun
} from "@/server/store";
import type { Actor } from "@/lib/types";

const actor: Actor = {
  userId: "user-1",
  orgId: "org-1",
  source: "demo"
};

const brief = {
  thing: "Private Thing",
  description: "A private project for testing deletion behavior.",
  audience: "founders",
  category: "privacy tools",
  geography: "United States",
  tone: "calm",
  requiredWords: [],
  forbiddenWords: [],
  competitors: [],
  tlds: [".com"],
  lanes: ["descriptive" as const],
  sensitivity: "standard" as const
};

describe("store access and deletion", () => {
  beforeEach(() => resetStoreForTests());

  it("blocks cross-org access and tombstones deletion", async () => {
    const project = await createProject(actor, brief);

    await expect(getProjectSnapshot({ userId: "other", orgId: "other", source: "demo" }, project.id)).resolves.toBeNull();
    await expect(deleteProject(actor, project.id)).resolves.toBe(true);
    await expect(getProjectSnapshot(actor, project.id)).resolves.toBeNull();
  });

  it("allows only one free preview per customer", async () => {
    const project = await createProject(actor, brief);

    expect(project.accessType).toBe("free_preview");
    await expect(hasUsedFreePreview(actor)).resolves.toBe(true);
    await expect(createProject(actor, { ...brief, thing: "Second Thing" })).rejects.toThrow(BusinessRuleError);
  });

  it("derives generation counts from server entitlements", async () => {
    const project = await createProject(actor, brief);
    const snapshot = await getProjectSnapshot(actor, project.id);

    expect(snapshot).not.toBeNull();
    expect(resolveGenerationAccess(snapshot!)).toMatchObject({ accessType: "free_preview", count: 3 });
    const run = await addGenerationRun(actor, project.id, {
      projectId: project.id,
      status: "succeeded",
      model: "test-model",
      accessType: "free_preview",
      promptVersion: "test",
      schemaVersion: "test",
      validationStatus: "valid",
      costEstimateCents: 0
    });
    expect(resolveGenerationAccess((await getProjectSnapshot(actor, project.id))!)).toMatchObject({ existingRun: run });

    await grantPaidPack(actor, project.id);
    expect(resolveGenerationAccess((await getProjectSnapshot(actor, project.id))!)).toMatchObject({ accessType: "paid_pack", count: 50 });
  });

  it("merges an anonymous free preview into a user that has no prior claim", async () => {
    const anonymous: Actor = {
      userId: "anon:abc123",
      orgId: "anon:abc123",
      source: "anonymous",
      anonSessionHash: "abc123"
    };
    const project = await createProject(anonymous, brief);
    const signedInActor: Actor = { ...actor, anonSessionHash: "abc123" };

    expect(await hasUsedFreePreview(anonymous)).toBe(true);
    expect(await getProjectSnapshot(signedInActor, project.id)).not.toBeNull();
    expect(await hasUsedFreePreview(signedInActor)).toBe(true);
    await expect(createProject(signedInActor, { ...brief, thing: "Second Thing" })).rejects.toThrow(BusinessRuleError);
  });

  it("keeps checkout intents provider-disabled until a pack is explicitly granted", async () => {
    const project = await createProject(actor, brief);
    const intent = await createCheckoutIntent(actor, project.id);
    const before = await getProjectSnapshot(actor, project.id);

    expect(intent?.status).toBe("provider_unconfigured");
    expect(before?.project.paidPackStatus).toBe("none");

    await grantPaidPack(actor, project.id, { provider: "placeholder", externalPaymentId: "dev-payment" });
    const billing = await getBillingSummary(actor, 5);
    expect(billing.currentPack?.projectId).toBe(project.id);
    expect(billing.history.map((item) => item.title)).toContain("Launch Pack purchased");
  });

  it("deduplicates provider events and rate limits repeated actions", async () => {
    const first = await recordProviderEvent({
      provider: "placeholder",
      externalEventId: "evt-1",
      eventType: "checkout.completed",
      status: "processed",
      payloadHash: "hash"
    });
    const second = await recordProviderEvent({
      provider: "placeholder",
      externalEventId: "evt-1",
      eventType: "checkout.completed",
      status: "processed",
      payloadHash: "hash"
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);

    await assertRateLimit(actor, "test", 1, 60_000);
    await expect(assertRateLimit(actor, "test", 1, 60_000)).rejects.toMatchObject({ code: "rate_limited" });
  });

  it("records model usage in the AI ledger", async () => {
    const event = await recordAiUsageEvent(actor, {
      provider: "fixture",
      model: "deterministic-fixture",
      task: "naming_generation",
      promptVersion: "test-prompt",
      inputTokens: 10,
      outputTokens: 20,
      estimatedCostMicroCents: 0,
      status: "fallback",
      metadata: { test: true }
    });

    expect(event.ownerUserId).toBe(actor.userId);
    expect(event.task).toBe("naming_generation");
    await expect(getAiUsageSummary(actor)).resolves.toMatchObject({ totalEvents: 1, dailyEvents: 1 });
  });

  it("tracks durable job lifecycle with idempotency and health summaries", async () => {
    const project = await createProject(actor, brief);
    const first = await createJobRun(actor, {
      jobType: "generation",
      projectId: project.id,
      idempotencyKey: "job-key-1",
      requestPayload: { projectId: project.id }
    });
    const duplicate = await createJobRun(actor, {
      jobType: "generation",
      projectId: project.id,
      idempotencyKey: "job-key-1",
      requestPayload: { projectId: project.id }
    });

    expect(duplicate.id).toBe(first.id);
    await startJobRun(actor, first.id);
    await completeJobRun(actor, first.id, { ok: true });

    await expect(getJobRun(actor, first.id)).resolves.toMatchObject({ status: "succeeded", attempts: 1 });
    await expect(listJobRuns(actor)).resolves.toHaveLength(1);
    await expect(getJobHealth(actor)).resolves.toMatchObject({ total: 1, succeeded: 1 });
  });

  it("claims queued jobs once and requeues stale worker leases", async () => {
    const project = await createProject(actor, brief);
    const job = await createJobRun(actor, {
      jobType: "screening",
      projectId: project.id,
      requestPayload: { projectId: project.id }
    });

    await expect(claimNextQueuedJobRun("worker-1")).resolves.toMatchObject({
      id: job.id,
      status: "running",
      attempts: 1,
      lockedBy: "worker-1"
    });
    await expect(claimNextQueuedJobRun("worker-2")).resolves.toBeNull();

    const swept = await requeueStaleJobRuns(new Date(Date.now() + 1000));
    expect(swept.requeued).toHaveLength(1);
    expect(swept.failed).toHaveLength(0);

    await expect(claimNextQueuedJobRun("worker-2")).resolves.toMatchObject({
      id: job.id,
      status: "running",
      attempts: 2,
      lockedBy: "worker-2"
    });
  });

  it("exports account data and redacts projects on account deletion", async () => {
    const project = await createProject(actor, brief);
    const exported = await exportAccountData(actor);

    expect(exported.projects).toHaveLength(1);
    expect(exported.projects[0]?.project.id).toBe(project.id);

    const deletion = await deleteAccountData(actor);
    expect(deletion.deletedProjects).toBe(1);
    await expect(getProjectSnapshot(actor, project.id)).resolves.toBeNull();
    await expect(exportAccountData(actor)).resolves.toMatchObject({ projects: [] });
  });
});
