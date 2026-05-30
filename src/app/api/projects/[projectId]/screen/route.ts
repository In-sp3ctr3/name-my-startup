import { NextResponse } from "next/server";
import { detachedJobsEnabled } from "@/env";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { assertScreeningCanRun, executeQueuedJobInline } from "@/server/jobs";
import { triggerBackgroundJobDrain } from "@/server/job-trigger";
import { createJobRun, getProjectSnapshot } from "@/server/store";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const { projectId } = await params;
    const snapshot = await getProjectSnapshot(actor, projectId);
    if (!snapshot) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });

    if (snapshot.screeningResults.length > 0) {
      const latestRun = [...snapshot.screeningRuns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (latestRun) return NextResponse.json({ screeningRun: latestRun, results: snapshot.screeningResults });
    }

    assertScreeningCanRun(snapshot);

    const job = await createJobRun(actor, {
      jobType: "screening",
      projectId,
      requestPayload: { projectId }
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
