# ADR-0015: Abuse Prevention

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Trust And Safety

## Context

The product can be abused for bulk domain/handle enumeration, phishing names, impersonation, typosquatting, competitor spoofing, provider quota drain, or laundering a report into a fake clearance certificate.

## Decision

Build abuse prevention into the MVP architecture.

Controls:

- Auth-gated screening.
- Per-user, per-organization, and per-project quotas.
- Provider budgets and concurrency limits.
- Retry caps during provider outages.
- Prompt filters for requests to imitate existing brands.
- Checks for famous-brand lookalikes and Unicode homoglyphs.
- Blocks or warnings for phishing, impersonation, and confusingly similar brand requests.
- Report disclaimers that prevent clearance-certificate framing.
- Administrative visibility into abnormal usage.

## Options Considered

### Option A: Add Abuse Controls After Launch

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low initially |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Faster first build.

**Cons:** Provider quotas and trust can be damaged quickly.

### Option B: MVP-Level Abuse Controls

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Protects providers, users, and product trust.

**Cons:** Requires moderation rules and false-positive handling.

### Option C: Heavy Manual Review

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | High |
| Scalability | Low |
| Team familiarity | Medium |

**Pros:** Strong control.

**Cons:** Too slow for self-serve founder workflow.

## Trade-off Analysis

MVP-level automated controls are sufficient if they target obvious abuse: bulk enumeration, famous-brand imitation, phishing intent, and provider retry storms.

## Consequences

- Anonymous usage should be limited to generation, not deep screening.
- Screening quotas become product and infrastructure requirements.
- Abuse events need audit logging.
- False positives need a support path.

## Action Items

1. [ ] Define usage quotas and provider budgets.
2. [ ] Add prompt and candidate checks for impersonation and homoglyphs.
3. [ ] Add retry storm protection during provider outages.
4. [ ] Add abuse event logging and admin visibility.
5. [ ] Add tests for bulk enumeration, famous-brand lookalikes, phishing prompts, and Unicode confusables.

