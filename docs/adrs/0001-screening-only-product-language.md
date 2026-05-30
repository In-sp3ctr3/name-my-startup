# ADR-0001: Screening-Only Product Language

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Product, Engineering, Legal Review

## Context

Name My Startup will help founders generate and screen candidate names. Users may be tempted to treat results as legal clearance, especially when domain, trademark, search, and social signals are shown in one place.

The product must reduce naming friction without creating the impression that it provides legal advice or determines whether a name is legally available.

## Decision

Use screening-only product language across the application, reports, emails, marketing, analytics labels, and support scripts.

The product must say things like:

- Screening result.
- Possible conflict found.
- No obvious conflict found in this screen.
- Requires human/legal review.
- Source unavailable.
- Source not checked.
- Provider error.
- Inconclusive result.

The product must not say things like:

- Legally available.
- Safe to use.
- Cleared.
- Approved.
- No conflicts.
- Guaranteed unique.

Every screening page and exported report must include:

> Automated screening result only. This is not a legal availability determination and does not replace review by qualified trademark counsel.

## Options Considered

### Option A: Availability Language

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | High |
| Team familiarity | High |

**Pros:** Simple copy, familiar market language, easy to sell.

**Cons:** Misleading, creates legal risk, encourages over-trust, conflicts with product principle.

### Option B: Screening-Only Language

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Low |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Honest, defensible, aligns with evidence-based workflow, creates trust.

**Cons:** Requires copy discipline, may reduce short-term conversion from users seeking certainty.

### Option C: Hide Legal Caveats In Terms

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | Medium |

**Pros:** Keeps UI cleaner.

**Cons:** Users may not see the limitation; support and legal risk remain high.

## Trade-off Analysis

Screening-only language is less punchy than availability language, but it is the right long-term trust posture. The product can still be useful by showing evidence, timestamps, and next steps without implying final clearance.

## Consequences

- Copy QA becomes a release gate.
- Reports must carry disclaimer and version metadata.
- Marketing must avoid stronger claims than the product can support.
- User trust depends on clarity rather than certainty theater.
- Visual language must avoid approval semantics such as green checkmarks, certificate framing, or winner-style screening badges.

## Action Items

1. [ ] Create a product-copy lint list for prohibited terms.
2. [ ] Add UI tests that scan rendered pages and reports for prohibited language.
3. [ ] Add disclaimer component for screening pages and exports.
4. [ ] Add support-script guidance for handling legal-availability questions.
5. [ ] Normalize provider vocabulary into canonical screening states before rendering.
6. [ ] Validate LLM-generated summaries server-side before saving reports.
7. [ ] Add visual-regression or DOM checks for approval-like screening indicators.
