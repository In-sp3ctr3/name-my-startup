# Namelift Backend Threat Model

## Scope

Current hardening slice for account history, free preview usage, paid Launch Pack entitlement, and generation APIs.

## Assets

- Startup briefs and generated candidate names.
- Prompt/model inputs, model outputs, eval results, and AI usage ledger entries.
- User/project history and saved-name state.
- Free preview claim: exactly one 3-name preview per customer.
- Paid Launch Pack entitlement: 50 names for one startup after verified payment.
- Anonymous session cookies, free preview claim links, future payment provider event IDs, and webhook signatures.

## Actors

- Anonymous visitor using the public landing/start flow.
- Authenticated customer.
- Abusive caller bypassing the UI and calling APIs directly.
- Future payment provider webhook sender.
- AI/model provider and optional search/evidence providers.

## Trust Boundaries

- Browser/localStorage is untrusted.
- API route handlers are the server boundary.
- Clerk is the identity provider in production, configured as user-only auth.
- Clerk Organizations are intentionally out of scope; `orgId` is an internal personal tenant identifier, not a Clerk Organization ID.
- Neon/Postgres constraints become the durable source of truth.
- Future payment webhooks must be verified before granting pack access.
- Model/provider responses are untrusted until schema validation and eval guardrails pass.

## Key Abuse Cases And Mitigations

- Client asks for 80 names before payment: generation count is now derived server-side from entitlement.
- Customer attempts a second free preview: free preview claims are modeled as one per user and one per signed anonymous session, with database uniqueness and tests.
- Customer deletes a project to regain the free preview: free preview claims are separate from active project state.
- Clerk Organization context changes tenant access: server actor resolution ignores Clerk Organization context and always maps signed-in users to an internal `personal:<userId>` tenant.
- Browser localStorage claims to be signed in: demo auth headers are only emitted when Clerk is not configured, and configured production auth uses Clerk sessions plus server-side `auth()`.
- Customer unlocks paid names from a success URL alone: production provider is disabled; local/test grants are behind a non-production fixture, and real payment unlock must be verified-webhook-backed before production.
- Unauthenticated history leakage: `/start` no longer exposes history in the product UI, and production demo auth fallback is gated.
- Caller repeats generation to mine hidden data: repeated generation requests return stored candidates for the entitled run instead of creating a new hidden batch.
- Caller hammers generation/checkout endpoints: rate-limit buckets are keyed by user or anonymous actor.
- Broken prompt/model output stores unsafe claims: structured output, legal-language validation, and deterministic naming evals run before persistence.
- Model or search usage eats margin: model calls are logged to `ai_usage_events`, daily AI budget checks run before generation, and provider evidence is cached.
- Weak public evidence is mistaken for clearance: provider rows store `high`/`medium`/`low`/`unknown` confidence, and source summaries must say screening signal rather than legal availability.
- External evidence providers see sensitive briefs: strict-sensitivity projects block real provider routing, and provider queries use candidate/domain/category terms instead of sending the full brief.

## Residual Risks

- Payment webhook signature verification and live checkout sessions are intentionally deferred until a provider is selected.
- Local/test can use in-memory persistence and a dev pack-grant fixture; production must provide `DATABASE_URL`, user-only Clerk keys, and `ANON_SESSION_SECRET`.
- Real trademark and social provider choices are still deferred; production copy must keep screening-only language until those integrations are source-backed.
- Free RDAP, DNS, and Common Crawl evidence is incomplete by design; paid/commercial search and legal review remain future product-quality upgrades.
