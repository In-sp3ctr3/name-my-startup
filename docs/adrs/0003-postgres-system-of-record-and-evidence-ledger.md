# ADR-0003: Postgres System Of Record And Evidence Ledger

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Legal Review

## Context

The product needs to persist confidential briefs, generated candidates, screening runs, provider responses, user notes, exports, and audit events. Reports must be reproducible enough to explain what a user saw at a specific time.

## Decision

Use Postgres as the primary system of record, with JSONB for provider payload metadata and optional pgvector later for semantic similarity.

Persist an evidence ledger for:

- Generation runs.
- Candidate names.
- Screening runs.
- Provider source results.
- Raw provider payload references.
- Report snapshots.
- Audit events.
- Prompt, model, scoring, and disclaimer versions.

## Options Considered

### Option A: Postgres With Relational Tables And JSONB

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Low to medium |
| Scalability | High enough for MVP and growth |
| Team familiarity | High |

**Pros:** Strong consistency, flexible payload storage, mature tooling, good auditability.

**Cons:** Requires schema care as provider data evolves.

### Option B: Document Database

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Flexible nested documents for reports and provider payloads.

**Cons:** Harder relational queries, more care for consistency and reporting.

### Option C: Event Store Only

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Low to medium |

**Pros:** Excellent auditability.

**Cons:** Too complex for MVP; requires projection infrastructure.

## Trade-off Analysis

Postgres balances structured product data with flexible provider metadata. JSONB allows provider payloads to evolve without blocking the schema, while relational tables keep project, candidate, report, and access control queries straightforward.

## Consequences

- Provider results can be audited and replayed.
- Reports can refer to immutable run snapshots.
- Data deletion and retention policies need explicit handling.
- The schema should distinguish mutable workspace state from immutable report artifacts.

## Action Items

1. [ ] Define schema for users, organizations, projects, briefs, candidates, screening runs, provider results, reports, and audit events.
2. [ ] Store raw provider payloads in object storage when payloads are large or sensitive.
3. [ ] Add immutable report snapshot tables.
4. [ ] Add migrations and seed fixtures for known screening scenarios.

