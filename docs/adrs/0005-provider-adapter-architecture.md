# ADR-0005: Provider Adapter Architecture

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Legal Review

## Context

Screening depends on external sources for domain registration signals, trademark/public-record signals, web/category signals, and eventually social handle signals. Provider APIs will differ in reliability, rate limits, terms, payloads, and coverage.

## Decision

Use an official-first, multi-provider adapter architecture.

Each adapter must expose:

- Provider name and version.
- Supported check types.
- Input schema.
- Output schema.
- Provider status.
- Timestamp.
- Query metadata.
- Normalized result.
- Raw payload reference.
- Confidence/freshness metadata.
- Error and retry classification.

Adapters must normalize source results into these canonical screening labels before anything is rendered or summarized:

- Possible conflict found.
- No obvious conflict found in this screen.
- Requires human/legal review.
- Source unavailable.
- Source not checked.
- Provider error.
- Inconclusive result.

The application should prefer official or structured sources where possible, then commercial providers with visible coverage labels.

## Options Considered

### Option A: Hard-Code Provider Calls In Screening Logic

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Fastest initial implementation.

**Cons:** Brittle, difficult to replace providers, hard to audit.

### Option B: Provider Adapter Interface

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Replaceable providers, consistent evidence ledger, cleaner retries and failure states.

**Cons:** Requires contract design and provider-specific normalization.

### Option C: Single Aggregator Provider

| Dimension | Assessment |
| --- | --- |
| Complexity | Low to medium |
| Cost | Medium to high |
| Scalability | Medium |
| Team familiarity | Medium |

**Pros:** Faster coverage across many sources.

**Cons:** Vendor lock-in, less control over provenance, may obscure failures.

## Trade-off Analysis

Provider adapters are necessary because the product's trust depends on source provenance and failure visibility. A single aggregator can be used behind an adapter later, but the product should not make the aggregator the architecture.

## Consequences

- Each provider needs contract tests.
- Screening logic can reason over normalized signals.
- Raw payload storage and redaction rules become important.
- Provider health and quota visibility become product infrastructure.

## Action Items

1. [ ] Define adapter interface and normalized result taxonomy.
2. [ ] Build domain/RDAP adapter first.
3. [ ] Build USPTO/public-record adapter second.
4. [ ] Build search/category adapter third.
5. [ ] Add provider contract tests and failure fixtures.
6. [ ] Add provider vocabulary mapping tests so raw provider wording cannot leak into user-facing claims.
