# Frontend Asset Manifest

Scope: internal post-CTA Namelift flow, implemented from `/Users/jadanjones/Downloads/NameShark.zip`.

- UI icons: `lucide-react`, matching the handoff's thin-line icon weight while preserving the repo's no-raw-SVG audit.
- Typography: `next/font/google` loads Manrope for the internal product UI and Caveat for the paper-note motif. The existing landing page keeps its Inter variable.
- Product visuals: CSS tiles, confidence rings, orbit animation, gift box, and confetti are implemented as DOM/CSS to match the handoff. The `/start` side accent uses the generated bitmap `public/images/start-sticky-notes-clean.png`.
- Sample name data: deterministic local data in `src/app/product/namelift-data.ts`, matching the handoff's 3 free names plus 50-name Launch Pack model.
- External assets deferred: hosted checkout branding, production domain/social/trademark provider logos, and any payment processor assets.

Raw SVG policy: no inline raw SVG or `dangerouslySetInnerHTML` is used in app code.
