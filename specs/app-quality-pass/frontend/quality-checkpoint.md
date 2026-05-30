# Namelift App Quality Pass

## Goal

Move the app from a functional repair pass to a polished, coherent SaaS product. The product should feel like the landing page: simple, tactile, evidence-aware, and easy to understand in one path.

## External References

- 21st.dev forms/components: use as a reference for clear component categories, polished form surfaces, and React/Next data-entry patterns. Do not import registry code for this pass.
- Awwwards SaaS category: use as visual pressure toward cleaner hierarchy, stronger interaction design, and less generic SaaS repetition.
- Current low-priced AI utility examples support one-time packs rather than subscriptions. For Namelift, this should be a per-startup pack rather than credits.

## Pricing Decision

Use a simple one-time pack:

- Free: 3 names for the first startup only, no credit card.
- Paid: startup naming pack, $5 one-time per startup.
- Paid value: 50 name candidates, checked recommendation signals for shortlisted names, and one evidence report/export.
- Repeat use: buy another $5 pack when another startup needs deeper work.
- Deferred: no monthly subscription, no separate billing center, no expensive pro tier until real usage data says founders need it.

Why this wins:

- It matches the landing promise: "for the price of a coffee."
- It avoids subscription fatigue for a job-to-be-done product that users may use occasionally.
- It keeps the paid boundary obvious: free exploration first, pay when an idea feels real.
- It gives enough perceived value at $5 without pretending to provide legal clearance.

Copy guardrail:

- Say "checked recommendations", "screening signals", and "evidence report".
- Do not say "legal clearance", "guaranteed available", or "audited" as a final legal claim.

## UX Direction

Primary flow remains:

1. Describe the startup.
2. Generate names.
3. Decide with a shortlist and checked recommendations.

Changes for this pass:

- Make the dashboard an active naming cockpit, not a generic project list.
- Replace generic empty states with paper/brief/report-specific states.
- Make the new-project form feel like a guided brief with a live naming receipt.
- Make results read like a structured evidence table, even while preserving card accessibility.
- Make shortlist comparison feel like comparison, with a winner panel and matrix.
- Make checkout lead with the $5 per-startup pack value, while keeping payment-pending honesty in a smaller banner.

## Visual Direction

Selected direction: **Paper Receipt Workspace**.

- Base: warm off-white workspace with ink, clean blue actions, and restrained green/orange status accents.
- Motif: paper notes, naming receipts, shortlist slots, evidence rows.
- Components: dense but calm app shell, sharper hierarchy, small motion through CSS transitions only.
- Assets: use existing paper/cursor assets in `public/images`, lucide icons for controls, no raw inline SVG, no new UI dependency.

Rejected:

- Full shadcn/ReUI import: too much churn for a CSS-module app that already has working components.
- Glass/WebGL effects: overkill for a form-heavy naming workflow.
- New generated image asset: not needed yet because existing paper assets already match the landing page. Revisit for a paid-success illustration after payment provider selection.

## Implementation Checklist

- Align `$5 per-startup pack` across landing, app shell, checkout, route docs, and tests.
- Upgrade dashboard hero into an active project workflow with 1-2-3 steps and paper asset.
- Redesign describe form into form + live brief receipt.
- Upgrade result cards with evidence preview columns and paid-lock clarity.
- Upgrade shortlist with comparison matrix and selected recommendation panel.
- Upgrade reports empty state and report detail into evidence/report surfaces.
- Rename the app billing route copy to pack status, not subscriptions.
- Replace internal demo language with customer-facing demo-mode language.
- Verify responsive desktop/mobile, route coverage, dead clicks, raw SVG audit, typecheck, lint, tests, build.

## Acceptance Criteria

- Users can understand what is free and what costs $5 without reading more than one screen.
- Every major route still works and no repaired interaction regresses.
- Visual design has a clear Namelift-specific identity instead of generic white cards.
- Mobile layout does not shove the main action off-screen unnecessarily.
- The only remaining external integration gap is the hosted payment processor.
