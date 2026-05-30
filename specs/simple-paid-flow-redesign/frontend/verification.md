# Simple Paid Flow Verification

## Browser Evidence

Dev server: `http://127.0.0.1:3100`

Final screenshots:

- `output/simple-paid-flow-final/start-desktop.png`
- `output/simple-paid-flow-final/starter-results-desktop.png`
- `output/simple-paid-flow-final/checkout-desktop.png`
- `output/simple-paid-flow-final/evidence-bundle-desktop.png`
- `output/simple-paid-flow-final/evidence-bundle-viewport.png`
- `output/simple-paid-flow-final/start-mobile.png`

Playwright click-through covered:

1. `/start` brief composer renders.
2. Submit brief and generate the once-ever `3` free names for the first startup.
3. Shortlist a preview name.
4. Open `/checkout/launch-pack`.
5. Pass the account-ready gate and preview the `$5` checkout.
6. Return to paid evidence bundle.
7. Search/filter/sort names.
8. Confirm Porkbun domain action is visible.
9. Start a second startup and confirm it routes to the `$5` pack instead of another free generation.
10. Confirm history search, notification bell, and profile menu work on desktop and mobile.

Console errors during screenshot pass: none.

## Checks

- `npx pnpm@10.18.3 verify`: passed.
- `npx pnpm@10.18.3 frontend:qa`: passed.
- `npx pnpm@10.18.3 build`: passed.

## Remaining Integration Work

- Replace preview unlock with Lemon Squeezy or equivalent hosted checkout.
- Move payment/bundle entitlement out of localStorage and into persisted account/payment state.
- Add server-side Porkbun/domain availability checks with throttling and timestamps.
- Add production social/trademark provider integrations.
