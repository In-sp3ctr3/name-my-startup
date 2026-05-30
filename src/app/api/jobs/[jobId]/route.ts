import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getCurrentActor } from "@/server/auth";
import { getJobRun } from "@/server/store";

export async function GET(_: Request, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const actor = await getCurrentActor({ allowAnonymous: true });
    const { jobId } = await params;
    const job = await getJobRun(actor, jobId);
    if (!job) return NextResponse.json({ error: "Job not found", code: "job_not_found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch (error) {
    return errorResponse(error);
  }
}
