function originFromRequest(request: Request) {
  return process.env.URL ?? process.env.DEPLOY_PRIME_URL ?? new URL(request.url).origin;
}

export default async function handler(request: Request) {
  const secret = process.env.JOB_RUNNER_SECRET;
  if (!secret) throw new Error("JOB_RUNNER_SECRET is required.");

  const origin = originFromRequest(request);

  const response = await fetch(`${origin}/api/internal/jobs/drain`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`
    },
    body: JSON.stringify({ sweep: true, workerId: "netlify-scheduled-sweep" })
  });
  if (!response.ok) {
    throw new Error(`Job sweep failed with status ${response.status}: ${await response.text()}`);
  }
}
