# ADR-0008: Privacy-First Provider Routing

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Legal Review

## Context

Users may enter confidential startup ideas, unreleased product descriptions, competitor lists, and candidate names. External provider calls can leak sensitive context if the app sends more data than necessary.

## Decision

Use privacy-first provider routing.

Default behavior:

- Send the minimum data needed for each provider check.
- Prefer candidate name plus required jurisdiction/category metadata over the full founder brief.
- Do not send raw startup descriptions to external screening providers unless the user explicitly enables a feature that requires it.
- Make strict confidential mode visible and clear.
- Display which checks are skipped, minimized, or run externally.
- Never use customer ideas or screening history for public examples or model training without explicit opt-in.

## Options Considered

### Option A: Send Full Brief To All Providers

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Simpler implementation and richer context.

**Cons:** Higher privacy risk, harder to explain, unnecessary exposure.

### Option B: Least-Disclosure Routing

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Better trust, less data exposure, easier enterprise/studio adoption.

**Cons:** More routing logic and provider-specific data contracts.

### Option C: No External Calls In Confidential Mode Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | High |

**Pros:** Very clear privacy boundary for sensitive projects.

**Cons:** Less useful screening for those projects unless local datasets exist.

## Trade-off Analysis

Least-disclosure routing should be the default. Confidential mode can become stricter by disabling selected external calls or requiring explicit consent before each provider class.

## Consequences

- Provider adapters need input minimization rules.
- UI must explain what leaves the system.
- Logs must redact sensitive fields.
- Deletion and retention policies become core product requirements.
- External provider calls must be impossible before explicit user action in the screening step.
- Competitor names, raw briefs, and category details need source-specific routing rules.

## Action Items

1. [ ] Define provider data-class matrix.
2. [ ] Add confidential mode behavior per provider type.
3. [ ] Add log redaction and secret scanning.
4. [ ] Add project deletion and retention controls.
5. [ ] Add explicit opt-in for use of customer examples or training data.
6. [ ] Add tests proving confidential mode blocks or prompts before external calls.
7. [ ] Add routing rules for domains, trademark/public records, search, and social checks.
