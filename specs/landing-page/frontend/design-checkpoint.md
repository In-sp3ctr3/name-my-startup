# Landing Page Frontend Checkpoint

## Phase 0: Scope And Baseline

Goal: add the missing public landing page for Name My Startup while preserving the existing API/backend project.

Current state: the repo has a Next.js App Router backend with API route handlers and no existing public `page.tsx`, root layout, global stylesheet, component system, or frontend design tokens.

Product contract:

- Target user: founders, studios, and serial builders with a rough startup idea and naming anxiety.
- Promise: turn a messy idea into launch-ready name options.
- Primary CTA: "Name my startup".
- Activation moment: user sees that rough inputs become a clean shortlist with confidence signals.
- Free value: free exploration before payment.
- Paid boundary: upgraded checks, reports, unlimited comparison/export.
- Paid deliverable: Launch Pack confidence report and availability/risk checks.

User supplied the reference mockup and exact copy/sections. Approval for the visual direction is delegated by the request to replicate the landing page 1:1, so alternate mockups are not produced.

## Phase 1: Research Signals

The design uses the user's explicit product signals instead of outside research: founders start with messy notes, bad placeholder names, and uncertainty about domain/social/legal availability. The product should feel like messy founder notes becoming a clean, confident shortlist.

Assumptions:

- The page is public, acquisition-oriented, and should load before account/payment.
- Mobile visitors need the same primary CTA, with table content converted into readable cards.
- Pricing should make the one-time Launch Pack the primary paid path, not a forced subscription.

## Phase 2: Personas And Problem

Primary proto-persona: early founder naming a single startup.

- Goal: quickly move from vague idea to viable names.
- Anxiety: picking a name that is unavailable, too generic, or risky.
- Constraint: not ready to pay before seeing value.
- UX implication: show transformation and checks before pricing.

Secondary proto-persona: agency/studio naming multiple projects.

- Goal: repeated shortlists and client-ready exports.
- Anxiety: repetitive manual checks and presentability.
- UX implication: recurring Studio pricing is out of scope; the `$5` per-startup pack remains visually primary.

Problem statement: make naming feel less blank-page and more like a guided narrowing process.

## Phase 3: Pattern Scan

Reference principles from the supplied mockup:

- Split hero: messy paper artifact on the left, clean AI shortlist on the right.
- Sticky, quiet navigation with a single blue CTA.
- Mostly white page with thin gray borders and functional status colors.
- Cards and tables are restrained, with generous spacing and soft shadows.
- Motion explains cause and effect: paper -> highlighted headline -> annotation -> cards.

Rejected anti-patterns:

- Purple gradients, sparkles, abstract blobs, and random 3D icons.
- Payment-first funnel.
- Component-library default SaaS screens.
- SVG-heavy illustration where raster paper texture is the point.

## Phase 4: UX Flow And Wireframe

Desktop flow:

1. Header: brand, anchors, login, CTA.
2. Hero: crumpled paper notes, animated dotted arrow, headline, annotation, CTA, result cards.
3. How it works: three spacious step cards with connecting arrows.
4. Examples: table of rough ideas to shortlists with status/vibe signals.
5. Pricing: first-startup free preview and highlighted `$5` per-startup pack.
6. Final CTA: compact confidence close.
7. Footer: brand, anchors, copyright.

Mobile flow:

1. Sticky header with menu disclosure and CTA.
2. Hero stacks copy before the paper visual and result cards.
3. Steps stack vertically.
4. Examples render as cards instead of a cramped table.
5. Pricing stacks with Launch Pack still highlighted.

## Phase 5: Conversion Funnel

Offer decision:

- Free: $0 for the first startup's 3-name preview.
- Startup Naming Pack: $5 one-time per startup, primary paid conversion.
- Studio/monthly plan: removed for this stage; repeated use means buying another startup pack.

Funnel:

1. Landing promise.
2. Visual transformation proof.
3. Process explanation.
4. Example outcomes.
5. Pricing after value proof.
6. Final CTA.

Objections handled:

- "Will it produce usable names?" Examples and result cards.
- "Will I have to pay too early?" Free-to-try copy before pricing.
- "Can I trust availability?" Status signals, domain checks, social checks, trademark risk signals.

Suggested analytics events for later: `landing_cta_click`, `examples_cta_click`, `pricing_plan_click`, `mobile_menu_open`, `hero_sequence_view`.

## Phase 6: Visual Direction

Selected thesis: clean white workspace plus messy founder-paper artifact, resolved by electric-blue annotations and confident shortlist cards.

Typography:

- UI/headings: modern sans stack with strong weights and tight but readable hierarchy.
- Paper notes: handwritten system fallbacks so the paper copy remains editable and exact.

Color roles:

- Electric blue: CTA, annotation, cursor, dotted arrows, active/selected states.
- Green: available/positive checks.
- Orange: premium/needs-attention signals.
- Red: high-risk signal if needed later.
- Neutral grays: body text, borders, inactive UI, card surfaces.

Imagery:

- Generated raster crumpled paper asset with paperclip/sticky note.
- Handwritten notes overlaid in DOM for exact copy and responsiveness.
- No decorative sparkles, blobs, or abstract assets.

## Phase 7: Resource Plan

Selected:

- Project-native Next.js/React/CSS.
- Generated raster paper asset via built-in image generation.
- CSS and IntersectionObserver for choreographed hero and scroll reveals.

Rejected/deferred:

- Tailwind: not present in this repo; adding it would be a large style-system change for one page.
- shadcn/ReUI/Kibo: unnecessary for a static landing page and likely to pull the visual toward defaults.
- Motion/Framer: useful but not required; the choreography can be implemented with CSS transforms/opacity and reduced-motion support.
- SVG illustrations: avoided per user direction except not needed.

## Phase 8: Implementation Plan

Files:

- `src/app/layout.tsx`: root metadata and global CSS import.
- `src/app/page.tsx`: landing route.
- `src/app/landing-page.tsx`: client component for nav/reveal behavior.
- `src/app/globals.css`: page design system, responsive layout, motion, components.
- `public/images/namelift-paper.png`: generated paper bitmap.

Acceptance criteria:

- Sections match requested order and copy.
- Header is sticky with desktop and mobile navigation.
- Hero includes crumpled paper, dotted arrows, cursor click, annotation, and sequenced result cards.
- How-it-works has more vertical breathing room.
- Examples and pricing preserve the requested product/funnel.
- Responsive behavior works at desktop and mobile widths.
- `pnpm typecheck`, `pnpm lint`, and `pnpm build` pass.

## Council Review

Contrarian: the biggest risk is over-copying the screenshot while missing the user's updated pricing/copy. Use the user-provided text as source of truth where it differs from the image.

First principles: the page must communicate transformation from blank-page anxiety to launch confidence.

Expansionist: keeping the shortlist/status components in DOM makes later API-backed data easy.

Outsider: avoid unexplained decorative effects; every visual should be paper, naming, annotation, or confidence signal.

Executor: implement a focused static landing page now, verify in browser, and defer real checkout/examples pages until product routes exist.
