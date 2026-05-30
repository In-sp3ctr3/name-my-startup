import { detachedJobsEnabled, env } from "@/env";

export async function triggerBackgroundJobDrain(request: Request, jobId: string) {
  if (!detachedJobsEnabled) return false;
  if (!env.JOB_RUNNER_SECRET) throw new Error("JOB_RUNNER_SECRET is required for detached job execution.");

  const origin = new URL(request.url).origin;
  const url = env.JOB_BACKGROUND_TRIGGER_URL ?? `${origin}/.netlify/functions/jobs-drain-background`;

  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.JOB_RUNNER_SECRET}`
    },
    body: JSON.stringify({ jobId })
  }).catch((error) => {
    console.error("Failed to trigger background job drain", error);
  });

  return true;
}
