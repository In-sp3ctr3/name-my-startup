# Security Test Plan

## Covered In This Slice

- One free preview per customer is enforced in store tests.
- Anonymous free preview claims merge into a signed-in actor only when the actor has no prior claim.
- Generation access returns `3` for free preview and `50` only after paid-pack entitlement.
- Repeated generation access returns the existing entitled run instead of generating a second hidden batch.
- Auth tenancy maps signed-in users to internal personal tenants and does not trust Clerk Organization context.
- Configured Clerk clients render real user-only sign-in/sign-up components; demo auth headers are only sent when Clerk is not configured.
- AI Brain V1 prompt registry, cost estimation, batch evals, provider cache, and AI ledger primitives are covered by unit/eval tests.
- Evidence Engine V1 covers RDAP, DNS-over-HTTPS, Common Crawl helper behavior, conservative confidence labels, and provider cache persistence.
- Provider events are idempotent and rate limits block repeated actions.
- The product UI hides history from unauthenticated `/start`.
- Billing copy avoids credit-balance or remaining-name language.
- Payment provider routes exist but stay disabled until a real provider adapter is configured.

## Required Next Tests

- API rejects unauthenticated project/history/generation requests in production auth mode.
- API rejects a second free preview with `409`.
- API ignores tampered generation `count` and uses entitlement-derived count.
- API prevents cross-user project reads and candidate updates.
- Clerk Organizations must remain disabled/out of scope.
- Staging should run a manual Clerk login/signup smoke test with real keys before launch.
- Live model eval should be run manually before launch with a small OpenAI key and `AI_EVAL_LIVE=true`.
- Search/provider cache behavior should be covered at route level once real providers are enabled in a staging-like environment.
- Trademark/public-record and social-handle providers need dedicated contract tests after those adapters are selected.
- Payment webhook verifies provider signature and grants each provider event only once.
