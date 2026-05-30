# ADR-0021: Production Auth Baseline

**Status:** Accepted
**Date:** 2026-05-30
**Deciders:** Jadan Jones, Codex
**Review date:** Before production launch, and again at 40,000 monthly retained users

## Context

Namelift is a solo-user product. Customers need accounts to save history, enforce one free preview, buy one-time 50-name packs, and retrieve billing/evidence records. We do not need team collaboration, workspace switching, invitations, B2B role hierarchies, domain joins, or organization billing.

The app already uses Next.js App Router APIs, Neon Postgres, Drizzle, and a thin Clerk integration. The login/signup screens are custom product screens, while server auth currently resolves actors through `src/server/auth.ts`.

Cost is a product constraint. The app should stay close to free until it proves demand.

## Decision

Use Clerk for production user authentication in a user-only configuration.

Do not use Clerk Organizations, OrganizationSwitcher, Clerk org IDs, Clerk memberships, B2B add-ons, invitation flows, verified domains, custom org roles, or organization billing.

All authenticated Clerk users map to an internal personal tenant:

```text
orgId = personal:<clerkUserId>
```

The current `orgId` field remains as an internal tenant/scope field for ownership checks, billing records, audit events, and future portability. It must not be interpreted as a Clerk Organization.

## Options Considered

### Option A: Clerk User-Only

| Dimension | Assessment |
| --- | --- |
| Complexity | Low |
| Cost | Free up to 50,000 monthly retained users, then Pro/overage |
| Scalability | Strong enough for this product |
| Security / compliance | Managed sessions, user management, MFA/security features available |
| Operational burden | Low |
| Lock-in / portability | Medium |

**Pros:** Fastest path, mature Next.js integration, hosted user/session/security surface, generous free tier, no auth database schema to operate directly.

**Cons:** External auth vendor, pricing changes possible, production auth depends on Clerk availability, user data lives partly outside our database.

**Docs checked:** Clerk pricing and Organizations docs.

### Option B: Neon Auth

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Included with Neon up to 60,000 MAU on Free and up to 1M MAU on paid plans |
| Scalability | Promising, tied to Neon platform |
| Security / compliance | Managed auth service with httpOnly session handling |
| Operational burden | Medium-low |
| Lock-in / portability | Medium, but identity lives closer to the database |

**Pros:** Same vendor as the database, auth data in the Neon auth schema, strong cost story, based on Better Auth, fewer dashboards.

**Cons:** Newer platform surface, evolving SDK, not a drop-in Better Auth replacement, migration from Clerk still requires auth UI/session work.

**Docs checked:** Neon pricing and Neon Auth architecture notes.

### Option C: Better Auth Self-Hosted

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium-high |
| Cost | Framework is free/open source; optional managed infrastructure is paid |
| Scalability | Depends on our database/runtime |
| Security / compliance | We operate more of the auth surface |
| Operational burden | Higher than Clerk |
| Lock-in / portability | Low |

**Pros:** Excellent control, Drizzle adapter, no per-user auth vendor charge, strong fit with a Postgres app.

**Cons:** More implementation/security ownership, email/OAuth/session configuration falls on us, slower path to production.

**Docs checked:** Better Auth pricing and Drizzle adapter docs.

### Option D: Auth.js

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Free/open source |
| Scalability | Depends on our database/runtime |
| Security / compliance | We operate more of the auth surface |
| Operational burden | Medium-high |
| Lock-in / portability | Low |

**Pros:** Mature ecosystem, many providers, Drizzle adapter.

**Cons:** Auth.js is now part of Better Auth, and Better Auth is the stronger forward-looking self-hosted option for this app.

**Docs checked:** Auth.js Drizzle adapter docs.

### Option E: Stack Auth

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium |
| Cost | Managed free tier supports 10,000 users; self-hosting is free |
| Scalability | Strong managed option; self-host depends on our setup |
| Security / compliance | Managed or self-hosted |
| Operational burden | Medium |
| Lock-in / portability | Medium-low |

**Pros:** Open-source Clerk/Auth0-style alternative with managed and self-host options.

**Cons:** The product emphasizes organizations/teams/RBAC that Namelift does not need; managed free tier is less generous than Clerk or Neon Auth for this app.

**Docs checked:** Stack Auth home/pricing docs.

## Trade-off Analysis

Clerk user-only gives the best production speed-to-risk ratio. Its free user allowance is generous enough for a low-budget solo product, and avoiding Organizations removes the biggest pricing/complexity mismatch.

Neon Auth is the strongest future alternative because it aligns with the existing Neon database choice. It should be re-evaluated before launch if Clerk setup becomes awkward, if keeping identity in Postgres becomes a hard requirement, or if Neon Auth SDK maturity removes the current migration uncertainty.

Better Auth is the strongest self-hosted alternative, but self-hosting auth creates security and delivery burden that is not justified before payment, trademark, and live AI quality are finished.

## Council Review

- Contrarian: Do not let a field named `orgId` smuggle paid B2B auth complexity back into the product.
- First principles: The product needs durable ownership, not collaboration. A personal tenant is enough.
- Expansionist: Keeping auth behind `src/server/auth.ts` preserves migration paths to Neon Auth or Better Auth.
- Outsider: A solo naming tool should not expose teams, invites, organizations, or workspace switching.
- Executor: Lock Clerk to user-only now, update docs/tests, and defer any auth-provider migration until it solves a real cost or control problem.

## Consequences

- Production auth can move forward without B2B organization complexity.
- Costs remain close to free until the app has significant retained usage.
- `orgId` remains an internal tenant field and should eventually be renamed to `tenantId` in a schema cleanup.
- If Clerk pricing changes or user growth approaches 40,000 monthly retained users, re-open Neon Auth and Better Auth.

## Verification

- `src/server/auth.ts` maps Clerk users to `personal:<userId>` and ignores Clerk Organization context.
- Configured Clerk clients render real user-only `<SignIn />` and `<SignUp />` components on the existing `/login` and `/signup` routes.
- Local/test environments without Clerk config keep demo auth isolated to local-only headers.
- Unit tests cover personal tenant IDs and access behavior.
- Security docs identify Clerk Organizations as intentionally out of scope.

## Action Items

1. [x] Ignore Clerk `orgId` in server actor resolution.
2. [x] Add tests for personal tenant behavior.
3. [x] Document Clerk Organizations as out of scope.
4. [x] Replace configured-production login/signup behavior with real Clerk user-only auth screens.
5. [ ] Before launch, consider renaming internal `orgId` fields to `tenantId` to reduce future confusion.
6. [ ] Re-evaluate Neon Auth and Better Auth at 40,000 monthly retained users or if Clerk pricing/product fit changes.
