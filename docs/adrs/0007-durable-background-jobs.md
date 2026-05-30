# ADR-0007: Durable Background Jobs

**Status:** Accepted for MVP
**Date:** 2026-05-30
**Deciders:** Engineering

## Context

Generation, screening, provider lookups, report rendering, and re-screening can exceed request timeouts and provider rate limits. These workflows need retries, idempotency, cancellation, and visible progress.

## Decision

Use `job_runs` in Postgres as the durable queue for the free/low-cost MVP. Netlify Background Functions drain queued jobs after user-facing APIs enqueue them. A Netlify Scheduled Function requeues stale leases and drains retries hourly.

Managed workflow tools such as Inngest or Trigger.dev remain a future upgrade path if throughput, step-level observability, or retry policy complexity grows. Temporal remains deferred.

Required job properties:

- Idempotent steps.
- Retry policies by provider error type.
- Rate limits and concurrency controls.
- Cancellation.
- Progress events.
- Dead-letter or failed-job inspection.
- Correlation IDs linking jobs to projects, runs, and reports.

## Options Considered

### Option A: Synchronous Request Handlers

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Simple to build.

**Cons:** Timeout risk, poor retries, bad user experience for long screening.

### Option B: Managed Durable Workflow Runner

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Retries, observability, scheduling, good fit for serverless apps.

**Cons:** Vendor dependency.

### Option C: Self-Hosted Queue

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium to high |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** More control, strong ecosystem.

**Cons:** More operational burden.

## Trade-off Analysis

Managed workflows fit the MVP if the team wants to minimize operational load. The architecture should keep job handlers portable so the runner can change later.

## Consequences

- Screening progress can be streamed or polled by the UI.
- Provider retries become consistent.
- Job state must be reconciled with database state.
- The MVP avoids Redis and paid workflow infrastructure.
- The worker is portable because generation, screening, and report logic live in shared server handlers.

## Action Items

1. [ ] Select workflow runner during scaffold.
2. [x] Define idempotency keys for generation, screening, and report jobs.
3. [x] Add job progress table.
4. [x] Add stale lease requeue and failed-job marking.
5. [ ] Add richer provider-specific retry policies.
6. [ ] Add dead-letter inspection UI if job volume justifies it.
