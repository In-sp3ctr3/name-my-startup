import { NextResponse } from "next/server";
import { detachedJobsEnabled } from "@/env";
import { getCurrentActor } from "@/server/auth";
import { errorResponse } from "@/server/api";
import { executeQueuedJobInline } from "@/server/jobs";
import { triggerBackgroundJobDrain } from "@/server/job-trigger";
import { createJobRun, getProjectSnapshot } from "@/server/store";
import { namesForCheckedRecommendations } from "@/server/selection";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const { projectId } = await params;
    const snapshot = await getProjectSnapshot(actor, projectId);
    if (!snapshot) return NextResponse.json({ error: "Project not found", code: "project_not_found" }, { status: 404 });

    const latestReport = [...snapshot.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    if (latestReport) return NextResponse.json({ report: latestReport });

    const candidates = namesForCheckedRecommendations(snapshot);
    if (candidates.length === 0) return NextResponse.json({ error: "Generate names before export.", code: "generation_required" }, { status: 400 });
    const job = await createJobRun(actor, {
      jobType: "report",
      projectId,
      requestPayload: { projectId, candidateCount: candidates.length, screeningResultCount: snapshot.screeningResults.length }
    });
    if (detachedJobsEnabled) {
      await triggerBackgroundJobDrain(request, job.id);
      return NextResponse.json({ job, queued: true }, { status: 202 });
    }

    const result = await executeQueuedJobInline(actor, job.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
