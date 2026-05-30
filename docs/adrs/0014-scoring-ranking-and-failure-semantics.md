# ADR-0014: Scoring, Ranking, And Failure Semantics

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Product, Engineering, Legal Review

## Context

The product will rank and compare candidate names. If scoring hides uncertainty or treats missing provider data as favorable, users may over-trust results.

## Decision

Use explainable, multi-dimensional scoring. Do not use a single verdict-style score as the primary decision mechanism.

Scoring dimensions may include:

- Strategic fit.
- Audience fit.
- Distinctiveness.
- Memorability.
- Pronunciation ease.
- Spelling ease.
- Domain registration signal.
- Trademark/public-record signal.
- Search/category signal.
- Tagline strength.

Provider failure, skipped checks, unsupported sources, stale cache, rate limits, malformed responses, and inconclusive results must never improve ranking. They should either be neutral with visible caveat or increase the need for review.

## Options Considered

### Option A: Single Overall Score

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Easy to scan.

**Cons:** Can imply false certainty and hide why a name is risky.

### Option B: Explainable Dimensional Scores

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Shows tradeoffs, supports comparison, avoids verdict-style UX.

**Cons:** Requires thoughtful UI and calibration.

### Option C: No Scores, Notes Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | Medium |

**Pros:** Avoids false objectivity.

**Cons:** Harder to compare many candidates quickly.

## Trade-off Analysis

Explainable dimensional scoring best supports the studio workflow. It helps users filter and compare without turning the app into a false legal decision engine.

## Consequences

- The UI must reveal score inputs and caveats.
- Reports must distinguish brand-fit signals from screening signals.
- Failure semantics must be tested across all provider adapters.
- Ranking changes must be versioned.

## Action Items

1. [ ] Define canonical score dimensions and allowed labels.
2. [ ] Add failure-semantics tests for every provider status.
3. [ ] Store scoring rubric version with every candidate and report.
4. [ ] Ensure unchecked or failed sources do not produce favorable badges.

