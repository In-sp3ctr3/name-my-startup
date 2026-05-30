# App Frontend Repair Checkpoint

## Scope

Revamp the private SaaS app so the frontend is a working product instead of a static mockup. Preserve the working landing page and backend API. Leave real payment processor integration as the only known unfinished external integration.

## Product Contract

- Target user: founders, studios, and serial builders with a rough startup idea and naming anxiety.
- Promise: turn a messy startup idea into a usable shortlist of name options with clear screening signals.
- Primary CTA: Name my startup / New project.
- Activation moment: the user submits a brief and sees generated names they can filter, save, shortlist, and inspect.
- Free value: create a project and generate a starter set of names.
- Paid boundary: checked recommendations, deeper screening evidence, and report/export polish.
- Paid deliverable: one-time Launch Pack / checked recommendations report. No full billing center is needed before payment integration.

## Current-State Audit

- `/` landing page works and should stay intact.
- `/app` renders a dashboard mock, but the product content is fixed-width and leaves a large empty area on wide screens.
- `/app/saved`, `/app/reports`, `/app/billing`, and `/app/settings` are placeholder pages.
- The app frontend does not call the existing `/api/projects` API routes.
- Describe, auth, and checkout forms are inert; submit-looking controls are links.
- Notification bell, avatar/profile menu, filter controls, sort controls, load more, shortlist actions, report actions, social auth buttons, and several export/detail controls are dead.
- The topbar New project button shows two plus icons because the plus is passed both as `children` and as the `icon` prop.
- Several labels overstate payment/subscription behavior or imply stronger availability/legal conclusions than the ADRs allow.
- Routes mostly exist, but many route targets lead to placeholders instead of useful product states.

## Keep, Change, Remove

Keep:

- Public landing page and current brand direction.
- App routes for dashboard, new project, results, shortlist, reports, saved names, settings, checkout, auth, and report detail.
- Backend API shape for projects, generation, candidate status, screening, and reports.

Change:

- Replace mock project data with API-backed frontend state.
- Make `/app` full-width, responsive, and centered around the active workflow.
- Turn topbar search, notifications, and profile into working client interactions.
- Turn filters, sorting, load more, save, shortlist, notes, export, and report actions into real UI behavior.
- Make checkout a payment-pending handoff that can simulate unlock for frontend completion without pretending a processor is integrated.
- Replace Billing with a lightweight Launch Pack / usage page or redirect concept; no subscription-heavy billing section.

Remove/de-emphasize:

- Pro-plan/subscription renewal language.
- Static placeholder pages.
- Decorative dashboard clutter that does not support the 1-2-3 naming flow.

## Target Sitemap

- `/` public landing page.
- `/start` same product entry as `/app/new/describe`.
- `/login` and `/signup` local demo auth screens that navigate into the app.
- `/app` dashboard with projects, usage, recent saved names, recent reports, global search, notifications, and profile menu.
- `/app/new/describe` project brief form; creates a project and starts generation.
- `/app/new/vibe` optional tuning route; can remain as an editable step but must be functional.
- `/app/new/generating` progress route for active generation state.
- `/app/projects/[projectId]/results` generated names with search, filters, sorting, save, shortlist, and Launch Pack CTA.
- `/app/projects/[projectId]/shortlist` saved/shortlisted comparison, notes, winner selection, screening/report actions.
- `/app/projects/[projectId]/names/[nameId]/report` checked recommendation/report detail using project data when available.
- `/app/saved` saved names across projects.
- `/app/reports` report/export history and generated markdown report previews.
- `/app/settings` account, privacy, and generation preferences.
- `/checkout/launch-pack` payment-pending checkout shell with clear Lemon Squeezy/payment integration TODO.

## Primary Flow

1. Describe: enter startup idea, audience, category, tone, words, TLDs, and privacy sensitivity.
2. Generate: create project through `/api/projects`, call `/api/projects/[projectId]/generate`, and navigate to results.
3. Decide: filter/save/shortlist names, create checked recommendations/report, and route through Launch Pack checkout when deeper checks are requested.

## Acceptance Criteria

- No duplicate plus icon on New project.
- No placeholder app routes remain.
- App layout uses the available viewport on desktop and works on mobile/tablet widths.
- Topbar search filters useful app content or opens actionable results.
- Notification bell opens notifications; profile opens account menu with working links/actions.
- New project form creates a project through the API and generation produces results.
- Results search, filters, sorting, load more, save, shortlist, and view details work.
- Saved, shortlist, reports, and settings pages render useful states based on available project data.
- Checkout clearly states payment processor integration is pending and does not claim real payment processing.
- Screening/report language uses screening-only framing, not legal clearance.
- `pnpm`-equivalent typecheck, lint, tests, build, and frontend QA pass or have documented failures.

## Implementation Plan

1. Add a small app data layer and client components for API-backed project, candidate, and report workflows.
2. Replace static product screens with stateful components while keeping the existing visual language.
3. Repair the app shell interactions and responsive layout CSS.
4. Replace placeholder routes with saved/reports/settings/Launch Pack states.
5. Add a frontend route/interaction contract and basic QA harness.
6. Verify with typecheck, lint, tests, build, and browser/Playwright checks.

## Council Notes

Contrarian: a large rewrite could break the working landing page. Keep landing files isolated and only touch app product files.

First principles: the app only needs to make naming feel simple: describe, generate, decide. Anything not serving that flow should be collapsed.

Expansionist: connecting the existing API now makes future payment integration cleaner because paid unlock can call screening/report endpoints after checkout.

Outsider: users will not understand dead premium buttons. Every locked action must either explain the Launch Pack or run a clear payment-pending simulation.

Executor: implement a direct API-backed frontend with minimal new dependencies and verify every route.
