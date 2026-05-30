# ADR-0009: Immutable Screening Reports

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Product, Engineering, Legal Review

## Context

Users need to share results with cofounders, advisors, and counsel. Screening sources change over time, and provider results may differ between runs. Reports must make it clear what was checked, when it was checked, and what the product did not determine.

## Decision

Create immutable report snapshots for exported screening reports.

Each report must include:

- Stable report ID.
- Created timestamp.
- Project and brief summary.
- Candidate names and taglines.
- Screening sources and statuses.
- Queries performed.
- Provider result timestamps.
- Provider failures and unsupported checks.
- Prompt, model, scoring, screening, and disclaimer versions.
- User notes.
- Required screening-only disclaimer.
- Recommended next steps.

Reports may be superseded by later reports, but existing report snapshots must not be silently overwritten.

## Options Considered

### Option A: Live Report Views Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Simple and always fresh.

**Cons:** Poor auditability; users cannot reconstruct what was shared.

### Option B: Immutable Report Snapshots

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Auditable, shareable, debuggable, trust-aligned.

**Cons:** Requires storage, versioning, and retention policy.

### Option C: Full Event-Sourced Reports

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Low to medium |

**Pros:** Maximum historical reconstruction.

**Cons:** Too complex for MVP.

## Trade-off Analysis

Immutable report snapshots are the right middle ground. They support trust without requiring full event sourcing.

## Consequences

- Reports need version metadata.
- Re-screening creates a new report or new screening run, not an overwrite.
- Report deletion and retention rules must be explicit.
- Immutable means the report content is not silently mutated while retained; deletion may remove user content and leave only a minimal audit tombstone.
- Support can debug user questions with stable artifacts.

## Action Items

1. [ ] Define report snapshot schema.
2. [ ] Add Markdown export pipeline first.
3. [ ] Add PDF export after private beta requirements are clear.
4. [ ] Add CSV export after the report schema and scoring dimensions stabilize.
5. [ ] Add supersedes/superseded-by relation for re-run reports.
6. [ ] Add report disclaimer and prohibited-language tests.
