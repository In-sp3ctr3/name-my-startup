# Namelift App Quality Redesign Checkpoint

## Scope

Redo the app quality pass after the current dashboard failed the product and visual bar. The landing page remains the brand anchor. The private app must become a focused workspace where the user can describe a startup, use the once-ever first-startup preview, save or shortlist names, and pay once per startup for the full checked pack/report. Hosted payment processor integration remains deferred.

## Product Contract

- Target user: solo founders, small studios, and builders who need a name quickly but do not want to pretend a generator is legal clearance.
- Promise: turn a rough startup idea into a short list of usable names with honest screening signals.
- Primary CTA: Start a project.
- Activation moment: the user submits one brief and either sees the first startup's `3` free names or reaches the `$5` pack checkout for later startups.
- Free value: `3` names for the first startup only, no card.
- Paid boundary: deeper name volume, checked recommendations, and an evidence report.
- Paid deliverable: a one-time `$5` pack for one startup. No subscription dashboard and no credits.

## Current-State Audit

Observed in browser on `http://127.0.0.1:3100` with screenshots saved under `output/audit-before/`.

- `/app` contains nine visible `Coffee Pack` mentions when seeded data exists. The page reads like dashboard, pricing page, onboarding tour, receipt, stat report, and project list at the same time.
- The global shell adds a `Coffee Pack` nav item plus two sidebar promo cards, so pricing competes with the actual task on every route.
- Dashboard hierarchy is broken: large hero, 1-2-3 cards, receipt card, four stat cards, project list CTAs, and side cards all fight for first attention.
- Project cards contain both `Continue` and `Coffee Pack`, which turns every project row into an upsell row.
- Free model was too generous: `3` starter generations × `12` names = `36` names before payment, which weakened the `$5` value boundary.
- Fake paper/tape CSS and checkered app background read as decorative shortcuts rather than product polish.
- Results and shortlist repeat paid-lock language inside many cards/rows. The page should explain the paid boundary once, then let users evaluate names.
- The app shell interactions work, but the shell visually overexplains the product instead of staying quiet.

## Research Signals

- Dashboard UX references emphasize decision-first hierarchy. Designpixil's 2026 SaaS dashboard guide says dashboards should be organized by what decision the user needs to make, not by every data point available, and warns against treating dashboards as reports: https://designpixil.com/blog/saas-dashboard-ux-best-practices
- Empty-state references agree that first-run states need context, preview, and one relevant CTA. SaasCrisp and Atlassian both stress short copy and careful CTA count: https://www.saascrisp.com/glossary/empty-state and https://atlassian.design/foundations/content/designing-messages/empty-state
- Competitor pattern: broad naming generators like Namecheap and NameSnack are free and domain/affiliate-led. Namecheap advertises unlimited/free name ideas, and NameSnack says it is `100% free`; both make money around domains/brand services: https://www.namecheap.com/visual/business-name-generator/ and https://www.namesnack.com/
- Paid creative tools often use "try free, pay when satisfied" rather than recurring subscriptions for a discrete deliverable. Looka lets users create for free and pay for a one-time package when they want deliverables: https://looka.com/pricing/
- 21st.dev was checked for resource direction. Its React/Next catalog is useful as pattern inspiration for polished components and dashboards, but this repo is a CSS Modules app with working primitives, so importing registry/Tailwind code would add churn without solving the hierarchy problem: https://21st.dev/community/components/s/21st-dev and https://21st.dev/s/dashboard
- Awwwards/dashboard inspiration was scanned for visual pressure, but award-style dashboards skew decorative. For this app, the reusable principle is stronger spacing, typography, and controlled hierarchy, not cinematic effects.

## Pricing Decision

Selected model: **first-startup preview, repeatable $5 per-startup pack**.

- Free: `3` names for the first startup only.
- Paid: `$5` one-time per startup.
- Paid value: `50` name candidates, checked recommendations for up to `5` shortlisted names, and one evidence report.
- Repeat use: buy another pack for another startup.
- Copy: keep "price of coffee" on the landing page, but stop plastering `Coffee Pack` across the app. In-app pricing copy appears at paywall/checkout only.

Why this is better:

- A `3`-name first-startup preview is enough to prove taste without giving away the full job repeatedly.
- `$5` for `50` names plus checked recommendation/report feels generous because free competitors mostly monetize domains or brand assets, not evidence workflow.
- The paid boundary is tied to user intent: "I found names worth checking", not "the dashboard is trying to sell me something."

Rejected:

- `3 × 12` free generations: too much value before the paid moment.
- Monthly plan/pro tier: not supported by current product scope or user request.
- Repeating pack CTAs globally: conversion-hostile because it creates noise before the user has a shortlist.

## UX Flow

Primary journey:

1. Dashboard: show current projects and the next obvious action. No pricing panel.
2. Brief: collect startup context with a focused form and a small "what happens next" guide.
3. Results: show `3` free names for the first startup, or a pack-required state for later startups. Paid boundary appears once as a quiet banner.
4. Shortlist: compare saved names, add notes, pick candidates worth checking. If unpaid, show one primary `$5` checked-recommendations CTA.
5. Checkout: explain the one-time pack, payment integration pending, then simulate unlock only for this frontend build.
6. Reports: create/download reports after unlock, with screening-only disclaimer intact.

Dashboard hierarchy:

- Level 1: page title, project count, one `New project` button.
- Level 2: active/latest project next step.
- Level 3: project list.
- Level 4: usage/pack status only in settings/profile/paywall, not the main dashboard.

State coverage:

- First-run dashboard: empty state with one CTA and a preview of what a project row will contain.
- Populated dashboard: compact project list, no stats strip, no workflow hero.
- Search no-results: keep existing actionable no-results state.
- Unpaid results/shortlist: one paid boundary message per screen.
- Paid/unlocked: replace payment CTA with "Generate 50-name batch" or "Create report".

## Visual Direction Options

### Option A: Plain Founder Workspace

Dense, quiet, white/soft-gray workspace with strong typography, crisp dividers, small blue actions, and no decorative paper in the app shell. Feels like Linear/Uber-style operational software without cloning their identity.

Failure mode: can become bland if the spacing, type hierarchy, and empty states are not carefully tuned.

### Option B: Editorial Naming Desk

Keeps a small editorial personality through one real raster paper asset in empty/landing moments, but removes fake tape, checkered backgrounds, and repeated receipt styling from task screens.

Failure mode: can fall back into the bad current pass if decorative paper appears on every panel.

### Option C: Brand Lab Cards

More colorful name cards and score chips, with a stronger brand-analysis feel.

Failure mode: too much visual competition for a workflow that should help users decide calmly.

Selected direction: **Plain Founder Workspace with light editorial moments**.

- App background: solid off-white/light gray, not a grid.
- Surfaces: fewer cards, sharper section boundaries, subtle shadows only for overlays/modals.
- Typography: smaller dashboard headings; reserve large type for landing and empty states.
- Color: ink, white, light gray, blue actions, green/orange/red only for state.
- Assets: lucide icons for controls; existing raster paper imagery only in landing/first-run or checkout if it supports the moment. No fake tape or CSS-drawn asset imitation.
- Motion: small hover/focus transitions only.

## Resource Plan

- Keep existing React/Next/CSS Modules stack.
- Keep `lucide-react` for UI icons.
- Do not install 21st.dev/shadcn/ReUI in this pass; the problem is hierarchy and product flow, not missing primitives.
- Do not generate a new image asset for the dashboard. Existing assets are enough for landing/empty state accents; polished app screens should not depend on faux paper.
- Update the asset manifest to mark fake paper/tape/checkerboard motifs as removed from the app shell.

## Implementation Plan

1. Update offer constants: first startup gets `3` names once ever, paid copy is `$5` per startup for `50` names.
2. Simplify app shell: remove global pack nav and sidebar promo cards; keep compact usage/status only where it helps.
3. Replace dashboard hero/stats/side cards with a focused projects workspace and first-run empty state.
4. Remove per-project paid buttons; keep project row primary action as `Continue`.
5. Simplify brief sidebar copy and remove receipt/tape treatment.
6. Reduce paid repetition in results/shortlist to one boundary message per screen.
7. Update landing pricing text to first-startup preview plus `$5` per-startup pack.
8. Update route map, asset manifest, tests, and QA expectations.

## Acceptance Criteria

- `/app` has one primary CTA and no global pricing spam.
- `Coffee Pack` appears only at checkout/paywall/pack-status contexts, not repeatedly across dashboard cards.
- Free offer is one `3`-name first-startup preview.
- Results still support search, filter, sort, save, shortlist, and paid unlock.
- Notification bell, profile menu, search, route links, forms, report actions, and checkout simulation still work.
- App shell fills the viewport on desktop and mobile without right-side dead space.
- No fake tape/checkered app background/raw SVG.
- `pnpm verify`, `pnpm build`, and `pnpm frontend:qa` pass after implementation.
