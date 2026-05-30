# ADR-0010: Observability, Auditability, And Cost Tracking

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product

## Context

The product depends on AI calls, provider APIs, background jobs, report generation, and confidential customer data. Failures can be expensive, misleading, or invisible if not instrumented.

## Decision

Treat observability as product infrastructure from day one.

Capture:

- Request IDs.
- Project IDs.
- Generation run IDs.
- Screening run IDs.
- Provider names and versions.
- Provider latency and error rates.
- Job queue duration.
- Token usage and model cost.
- Report generation duration.
- Prohibited-copy scan failures.
- Export events.
- Admin access events.

Logs must be structured and PII-safe. Raw briefs, candidate lists, provider payloads, and reports should not be emitted in plaintext logs.

## Options Considered

### Option A: Logs Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Quick to start.

**Cons:** Weak debugging, poor cost control, risky for provider failures.

### Option B: Structured Logs, Metrics, Traces, And Audit Events

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Debuggable, cost-aware, supports trust and support workflows.

**Cons:** Requires instrumentation discipline.

### Option C: Full Enterprise Observability Suite From Day One

| Dimension | Assessment |
| --- | --- |
| Complexity | High |
| Cost | High |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Powerful.

**Cons:** Overkill before MVP usage patterns are known.

## Trade-off Analysis

Structured logs, metrics, traces, and audit events are enough for MVP without becoming enterprise-heavy. The key is to make provider failures, model costs, and report state visible.

## Consequences

- Every workflow needs correlation IDs.
- Logging must be redacted by default.
- Cost thresholds can protect runaway usage.
- Audit events become part of trust and compliance posture.

## Action Items

1. [ ] Add request/run/report correlation ID strategy.
2. [ ] Add structured logger with redaction.
3. [ ] Add provider health dashboard or admin view.
4. [ ] Add AI cost and provider quota alerts.
5. [ ] Add audit event schema and retention policy.

