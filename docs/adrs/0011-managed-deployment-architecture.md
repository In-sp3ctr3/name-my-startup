# ADR-0011: Managed Deployment Architecture

**Status:** Accepted
**Date:** 2026-05-30
**Deciders:** Engineering

## Context

The product should ship quickly and reliably. The team needs preview environments, managed persistence, background jobs, object storage, secrets, and CI without taking on unnecessary platform work.

## Decision

Deploy the MVP on managed infrastructure:

- Netlify for managed Next.js app hosting.
- Neon for managed Postgres.
- Netlify Background Functions and Scheduled Functions for the MVP worker lane.
- Object storage for report files and raw provider payload references.
- Clerk for managed authentication.
- Managed error tracking.
- CI with migrations, tests, and copy scans.

The old Vercel Enterprise scope must not be used for this product unless explicit authorization is obtained from that account owner.

## Options Considered

### Option A: Managed App Platform

| Dimension | Assessment |
| --- | --- |
| Complexity | Low to medium |
| Cost | Low to medium |
| Scalability | Medium to high |
| Team familiarity | High |

**Pros:** Fast deploys, preview environments, fewer ops concerns.

**Cons:** Runtime limits and vendor constraints.

### Option B: Container Platform

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** More control over workers and runtime.

**Cons:** More setup and operational overhead.

### Option C: Full Cloud-Native Infrastructure

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | High |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Maximum flexibility.

**Cons:** Overbuilt for MVP.

## Trade-off Analysis

Managed deployment keeps the team focused on product learning. The architecture must preserve portability through clear database migrations, provider adapters, and job handlers.

## Consequences

- Preview environments can support fast UI review.
- Environment variable and secret management must be disciplined.
- Worker deployment may need separation from the web app.
- CI gates become the main reliability guardrail.

## Action Items

1. [x] Choose hosting provider for the MVP.
2. [x] Add Netlify file-based configuration.
3. [x] Add detached Postgres-backed job runner path.
4. [ ] Configure Netlify production environment variables.
5. [ ] Add migration gate to CI.
6. [ ] Add secret management and provider credential rotation plan.
7. [ ] Add rollback procedure for app and migrations.
