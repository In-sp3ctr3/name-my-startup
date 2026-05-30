# ADR-0016: Data Retention And Deletion

**Status:** Proposed
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Legal Review

## Context

Name My Startup stores sensitive startup ideas, generated names, screening evidence, provider payloads, exported reports, analytics events, and audit records. These data classes have different retention needs.

## Decision

Define data retention and deletion before implementation.

Default posture:

- Minimize collection.
- Do not store raw briefs or candidate names in analytics.
- Do not log raw briefs, candidate lists, provider payloads, or reports in plaintext.
- Do not use customer data for public examples or model training without explicit opt-in.
- Encrypt stored briefs, candidates, provider payload references, and reports.
- Delete user content on request while preserving minimal audit tombstones needed for security, billing, or abuse prevention.

Retention policy must distinguish:

- Raw briefs.
- Candidate names.
- Prompt/model inputs and outputs.
- Provider raw payloads.
- Normalized evidence.
- Reports.
- Audit events.
- Analytics events.
- Error tracking traces.
- Billing records.
- Support materials.
- Backups.

## Options Considered

### Option A: Keep Everything Indefinitely

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Medium over time |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Easier debugging and analytics.

**Cons:** Poor privacy posture and larger breach impact.

### Option B: Retention By Data Class

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | Medium |

**Pros:** Privacy-aligned, auditable, practical for product support.

**Cons:** Requires deletion workflows and careful backups.

### Option C: Delete Everything On Project Deletion

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Low |
| Scalability | Medium |
| Team familiarity | Medium |

**Pros:** Strong user-facing deletion story.

**Cons:** May conflict with fraud, billing, legal hold, and audit needs.

## Trade-off Analysis

Retention by data class gives the product enough auditability to explain reports while still minimizing sensitive idea retention. Deletion should erase user content and leave only minimal tombstones where required.

## Consequences

- Schema must classify data by retention class.
- Report deletion and project deletion need explicit semantics.
- Backups need documented retention.
- Error tracking and support workflows must avoid copying sensitive data.

## Action Items

1. [ ] Create a retention table before schema implementation.
2. [ ] Add project deletion and report deletion flows.
3. [ ] Add cryptographic erasure or object deletion for raw provider payloads and reports.
4. [ ] Add analytics redaction rules.
5. [ ] Add deletion tests covering user content, report snapshots, raw payloads, audit tombstones, and backups.
