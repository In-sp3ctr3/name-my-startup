import { NextResponse } from "next/server";
import { env } from "@/env";
import { errorResponse } from "@/server/api";
import { drainJobQueue, sweepAndDrainJobQueue } from "@/server/jobs";

function hasRunnerAccess(request: Request) {
  const secret = env.JOB_RUNNER_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const runnerSecret = request.headers.get("x-job-runner-secret");
  return bearer === `Bearer ${secret}` || runnerSecret === secret;
}

export async function POST(request: Request) {
  try {
    if (!hasRunnerAccess(request)) {
      return NextResponse.json({ error: "Job runner access denied.", code: "job_runner_forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as { sweep?: boolean; workerId?: string };
    const workerId = typeof body.workerId === "string" ? body.workerId : undefined;
    const result = body.sweep ? await sweepAndDrainJobQueue(workerId) : await drainJobQueue(workerId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
