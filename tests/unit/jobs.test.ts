import { beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "@/lib/types";
import { drainJobQueue } from "@/server/jobs";
import { createJobRun, createProject, getJobRun, getProjectSnapshot, resetStoreForTests } from "@/server/store";

const actor: Actor = {
  userId: "jobs-user",
  orgId: "jobs-org",
  source: "demo"
};

const brief = {
  thing: "Queue Proof",
  description: "A test startup for proving the detached job runner.",
  audience: "founders",
  category: "naming tools",
  geography: "United States",
  tone: "sharp",
  requiredWords: [],
  forbiddenWords: [],
  competitors: [],
  tlds: [".com"],
  lanes: ["descriptive" as const],
  sensitivity: "standard" as const
};

describe("job runner", () => {
  beforeEach(() => resetStoreForTests());

  it("drains a queued generation job into persisted candidates", async () => {
    const project = await createProject(actor, brief);
    const job = await createJobRun(actor, {
      jobType: "generation",
      projectId: project.id,
      requestPayload: { projectId: project.id }
    });

    const summary = await drainJobQueue("unit-worker", 1);
    const snapshot = await getProjectSnapshot(actor, project.id);

    expect(summary).toMatchObject({ processed: 1, succeeded: 1, failed: 0 });
    await expect(getJobRun(actor, job.id)).resolves.toMatchObject({ status: "succeeded", attempts: 1 });
    expect(snapshot?.candidates).toHaveLength(3);
  });
});
