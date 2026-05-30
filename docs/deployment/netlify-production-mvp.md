# Netlify Production MVP

## Decision

Use Netlify for the web app and lightweight detached workers, Neon for Postgres, Clerk for auth, and the existing OpenAI/OpenRouter gateway for naming. Do not use the old Vercel Enterprise scope.

Netlify runs this Next.js App Router app through its OpenNext adapter. Production generation, screening, and report work should run with `JOB_EXECUTION_MODE=detached`, which queues work in Postgres and drains it through Netlify Functions.

## Required Netlify Environment Variables

Set these in the Netlify UI, not in `netlify.toml`:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `ANON_SESSION_SECRET`
- `JOB_EXECUTION_MODE=detached`
- `JOB_RUNNER_SECRET`
- `OPENAI_API_KEY`

Optional:

- `OPENROUTER_API_KEY`
- `OPENROUTER_NAMING_MODEL`
- `BRAVE_SEARCH_API_KEY`
- `ENABLE_REAL_PROVIDERS=true`
- `AI_DAILY_BUDGET_CENTS=100`
- `AI_MAX_GENERATION_COST_CENTS=15`

Keep these production values unset or false:

- `ALLOW_DEMO_AUTH`
- `ALLOW_IN_MEMORY_STORE`
- `ENABLE_DEV_PAYMENT_FIXTURE`
- `NEXT_PUBLIC_E2E_DISABLE_CLERK`

## Build Settings

The repo includes `netlify.toml`:

- Build command: `npx --yes pnpm@10.18.3 build`
- Publish directory: `.next`
- Functions directory: `netlify/functions`
- Scheduled sweep: hourly
- Secret scan false-positive omit keys: `AI_PRIMARY_PROVIDER,AI_FALLBACK_PROVIDER,JOB_EXECUTION_MODE`
- Edge 404 redirects for common secret/config scanner paths such as `/.env*`, `/api/env`, `/api/config`, `/config*`, `/settings.js`, `/js/env.js`, and `/js/config.js`.

Netlify environment variables that server-side code needs must include the Functions scope. Netlify does not expose variables declared in `netlify.toml` to serverless functions at runtime.
`SECRETS_SCAN_OMIT_KEYS` is only for non-secret enum-style config values that appear naturally in source code. Do not add real secret keys such as `OPENAI_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `ANON_SESSION_SECRET`, or `JOB_RUNNER_SECRET`.

Netlify still needs the Git repository connected through the dashboard.

## Job Flow

1. App API creates a `job_runs` row.
2. In production detached mode, the API returns `202` with a `job`.
3. The API triggers `/.netlify/functions/jobs-drain-background`.
4. The background function calls `/api/internal/jobs/drain` with `JOB_RUNNER_SECRET`.
5. The internal route atomically claims queued jobs, runs the workflow, and marks success or failure.
6. The client polls `/api/jobs/:jobId`, then reloads the project snapshot.
7. `jobs-sweep` runs hourly to requeue stale worker leases or mark exhausted jobs failed.

## Deploy Checklist

- Run `pnpm verify`.
- Run `pnpm frontend:qa`.
- Run `pnpm build`.
- Run `pnpm db:migrate` against the Neon database for this Netlify site.
- Confirm Netlify environment variables are scoped to production and deploy previews as intended.
- Generate `JOB_RUNNER_SECRET` with a long random value.
- Confirm `/api/internal/jobs/drain` returns `403` without the secret.
- Create a free preview and confirm exactly three names.
- Use the dev/test entitlement fixture only outside production to confirm the 50-name flow.
- Confirm the old QualityWorks/Vercel account is not linked to the project.

## Known Limits

- This is a free/low-cost MVP path, not a forever-free AI cost model. OpenAI/OpenRouter budgets still need monitoring.
- The queue is Postgres-backed and intentionally simple. If throughput grows, move the same job handlers to a managed workflow runner.
- Payment provider integration remains intentionally disabled.
