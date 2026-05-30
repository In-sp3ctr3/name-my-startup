# ADR-0006: Progressive Screening Pipeline

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product

## Context

Screening every generated name across every source would be slow, expensive, and noisy. The product should keep the naming flow fast while still giving deeper evidence for names the user actually cares about.

## Decision

Implement a progressive screening pipeline:

1. Internal quality screen for all generated candidates.
2. Lightweight domain registration signals for high-ranked or user-selected candidates.
3. Trademark/public-record and web/category signals for shortlisted candidates.
4. AI synthesis after deterministic provider results are stored.
5. Re-run screening before export, purchase, launch checklist, or counsel handoff.

Each stage must preserve provider failures and inconclusive states.

## Options Considered

### Option A: Screen Everything Immediately

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | High |
| Scalability | Low to medium |
| Team familiarity | Medium |

**Pros:** Complete-looking results up front.

**Cons:** Slow, expensive, API-heavy, creates noise before users shortlist.

### Option B: Progressive Screening

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Fast workflow, cost-aware, matches user decision stages.

**Cons:** Requires UI clarity about partial screening.

### Option C: Manual Screening Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Avoids provider complexity.

**Cons:** Weakens product value and leaves the founder in the old manual loop.

## Trade-off Analysis

Progressive screening supports the product principle: generate, filter, compare, decide. It avoids wasting expensive provider calls on names the user will reject immediately.

## Consequences

- The UI must show which stages have run.
- Reports must state the configured screening depth.
- Ranking must not treat unchecked sources as positive signals.
- Background job orchestration becomes important.

## Action Items

1. [ ] Define screening stages and state machine.
2. [ ] Add UI badges for unchecked, running, checked, inconclusive, and possible conflict found.
3. [ ] Persist stage-level timestamps and provider statuses.
4. [ ] Add re-run screening action before report export.

