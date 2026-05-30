# ADR-0017: Authentication, Tenancy, And Access Control

**Status:** Superseded by [ADR-0021](0021-production-auth-baseline.md) for auth provider and tenancy scope
**Date:** 2026-05-26
**Deciders:** Engineering, Product, Legal Review

## Context

The product handles confidential startup ideas, generated names, screening evidence, reports, and billing. Collaboration is no longer in scope for Namelift; it is a solo-user product.

## Decision

Use managed authentication for any persisted private beta workspace, external provider screening, shared report, collaborator access, billing, or support/admin action.

Phase 1 Local MVP may support anonymous or local-session projects only while using mock providers. Anonymous projects must not call real external providers, create public shared reports, or store long-lived sensitive data without a clear retention boundary.

Access model:

- User owns personal projects by default.
- Internal `orgId` fields are personal tenant identifiers, not Clerk Organizations.
- External provider screening, persisted report export, report sharing, billing, and deletion require authenticated authorization checks.
- Admin access must be audited.

## Options Considered

### Option A: Accounts Required From The First Local Prototype

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Cleanest persistence and quota model.

**Cons:** Adds friction before the local naming loop is proven.

### Option B: Anonymous Local MVP, Managed Auth Before Real Screening

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Medium |
| Scalability | High |
| Team familiarity | High |

**Pros:** Fast learning loop while protecting real provider usage and sensitive reports.

**Cons:** Requires a migration path from anonymous project to account-owned project.

### Option C: Fully Anonymous MVP

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Low |
| Scalability | Low |
| Team familiarity | High |

**Pros:** Lowest friction.

**Cons:** Poor abuse prevention, weak deletion semantics, no reliable quotas, unsafe for real screening.

## Trade-off Analysis

Anonymous local use is acceptable only for the Phase 1 mock-provider loop. The moment the product persists sensitive projects, calls real providers, shares reports, or bills users, managed authentication and workspace-level authorization become non-negotiable.

## Consequences

- Real screening is auth-gated.
- Anonymous projects need clear retention and upgrade behavior.
- Personal tenant ownership must be represented in the data model. Clerk Organizations and organization roles are out of scope unless a future ADR reintroduces collaboration.
- Audit logs must include report sharing, deletion, admin access, and billing events.

## Action Items

1. [ ] Choose managed auth provider during scaffold.
2. [ ] Define user, personal tenant, and project ownership schema.
3. [ ] Add authorization checks for screening, report export, sharing, deletion, and admin actions.
4. [ ] Define anonymous-to-authenticated project upgrade behavior.
5. [ ] Add access-control tests for personal projects, shared reports, and admin access.
