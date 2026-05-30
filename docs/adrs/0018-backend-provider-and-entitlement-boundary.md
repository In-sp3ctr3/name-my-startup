# ADR-0018: Backend Provider And Entitlement Boundary

## Status

Accepted

Auth provider details are refined by [ADR-0021](0021-production-auth-baseline.md): Clerk is user-only, Clerk Organizations are out of scope, and `orgId` is treated as an internal personal tenant field.

## Context

Namelift needs authenticated history, one free 3-name preview per customer, and one-time 50-name Launch Packs per startup. The repo already includes Next.js App Router API routes, Clerk, Neon serverless Postgres, Drizzle, and an initial Postgres schema. Runtime persistence is still partly in-memory while the product flow is being wired.

## Decision

Keep the current backend direction: Vercel/Next route handlers, Clerk for identity, Neon Postgres for durable data, and Drizzle for schema/migrations.

Do not migrate to Convex, Supabase, Firebase, InsForge, or a custom backend for this slice. Those remain possible later if requirements change, but they would replace working repo choices before the product needs that cost.

## Current-Doc Evidence

- Vercel Functions support serverless request handling for auth, streaming, and database queries: https://vercel.com/docs/functions
- Clerk App Router `auth()` / `auth.protect()` is the intended auth boundary for pages and route handlers: https://clerk.com/docs/reference/nextjs/app-router/auth
- Neon serverless driver is designed for serverless JavaScript/TypeScript over HTTP/WebSockets: https://neon.com/docs/serverless/serverless-driver
- Drizzle documents direct Neon HTTP integration through `drizzle-orm/neon-http`: https://orm.drizzle.team/docs/connect-neon

## Consequences

- Business rules must be enforced server-side before UI state is trusted.
- Free-preview claims and paid-pack entitlements need durable uniqueness constraints.
- Payment success URLs must not unlock paid packs by themselves; the future webhook must verify provider signatures and grant entitlements idempotently.
- Local demo auth remains allowed only for local/testing. Production must use Clerk-backed actors.

## Verification

- Unit tests cover one free preview per customer and server-derived generation counts.
- Next slice: persist these rules through Neon/Drizzle migrations and add route-level tests for unauthenticated access, second free preview rejection, tampered generation count, unpaid paid-pack denial, and payment webhook idempotency.
