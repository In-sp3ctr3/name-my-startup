# Name My Startup

Backend/API service for Name My Startup. The remaining code owns project data, candidate generation, screening labels, provider adapters, report snapshots, auth fallback, abuse checks, and persistence.

## Local Development

```bash
npx pnpm@10.18.3 install
npx pnpm@10.18.3 dev
```

The API uses Clerk when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are configured. Local/demo development can set `ALLOW_DEMO_AUTH=true`, `ALLOW_IN_MEMORY_STORE=true`, and `ENABLE_DEV_PAYMENT_FIXTURE=true`; production should use Clerk, Neon `DATABASE_URL`, and a real `ANON_SESSION_SECRET`.

Live AI generation uses `OPENAI_API_KEY`; without it, deterministic fixture generation keeps backend flows testable. AI Brain V1 adds versioned prompts, structured generation, deterministic evals, a model-usage ledger, provider evidence caching, and optional OpenRouter fallback configuration. Payment provider integration is intentionally disabled for now: checkout intent and webhook routes exist, but the disabled gateway will not grant paid packs. Local/test paid-pack verification uses the guarded dev entitlement fixture only outside production.

Useful AI checks:

- `pnpm ai:eval` runs deterministic naming evals without spending model credits.
- `OPENAI_API_KEY=... pnpm ai:eval:live` runs the guarded tiny live eval.

## Verification

```bash
npx pnpm@10.18.3 verify
```

The verification suite runs copy guardrails, TypeScript, ESLint, and backend unit tests.
