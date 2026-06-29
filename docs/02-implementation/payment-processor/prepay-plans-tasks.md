# Pre-Pay (Multi-Month) Subscription Plans — Tasks

Status: Draft (2026-06-29)
Related: prepay-plans-requirements.md, prepay-plans-design.md

Legend: `[ ]` todo · `[x]` done. Each task tagged **[Phase A]** (de-monthly refactor,
zero behavior change — ship + verify first) or **[Phase B]** (quarterly feature — only
after Phase A verified in production).

Verification commands (Windows cmd):
- JS: `node --check <file>`
- Functions tests (from `firebase/functions`): `npx jest`
- App typecheck: `node app/node_modules/typescript/bin/tsc --noEmit -p app/tsconfig.json`

---

## Phase A — De-assume "monthly"

### A1. BillingPeriod model — `app/src/lib/constants.ts`
- [x] A1.1 Add `BillingIntervalUnit`, `BillingPeriodLabel`, `BillingPeriod` types.
- [x] A1.2 Add `PERIOD_MONTHLY`, `PERIOD_QUARTERLY` constants + `periodMonths()` +
  `periodLabel()` helpers.
- [x] A1.3 Add `BillingOption` interface; add `billingOptions: BillingOption[]` to the OC
  and CT entries in `APP_PRODUCTS` — **monthly option only** (amount = current monthly
  price, planKey = current key). `APP_PRODUCTS.amount` stays the monthly anchor.
- [x] A1.4 Add `getBillingOptions()`, `getBillingOption(id, count)`,
  `defaultBillingOption(id)` helpers.
- [x] A1.5 Extend the `PAYPAL_PLANS` key union/typing with the (future) quarterly keys but
  leave their values unset in `SANDBOX_PLANS`/`LIVE_PLANS` until Phase B. (Done via the
  `PaypalPlanKey` type; plan ids added in Phase B.)

### A2. PayPal adapter — `firebase/functions/payments/providers/paypal.js`
- [x] A2.1 `createPlan(spec)`: read `const intervalCount = spec.intervalCount || 1;` and use
  it for `frequency.interval_count` on BOTH the TRIAL and REGULAR cycles (default 1 ⇒
  identical body today).
- [x] A2.2 `buildPriceOverride(opts)`: read `opts.intervalCount || 1` and use it in the
  override cycles' `frequency` (replaces hardcoded `interval_count: 1`).
- [x] A2.3 `PLAN_TIER_MAP` entries gain `intervalCount: 1`; `resolvePlanTier` /
  `resolvePlanTierAsync` return `intervalCount` (default 1 from registry/missing).
- [x] A2.4 Activation event (`BILLING.SUBSCRIPTION.ACTIVATED`): emit `intervalCount` +
  `months` on the neutral subscription object (keep `interval:"month"` string for
  back-compat, derived from count).
- [x] A2.5 `node --check firebase/functions/payments/providers/paypal.js`.

### A3. Fulfillment — `firebase/functions/payments/fulfillment.js`
- [x] A3.1 Accept `intervalCount`/`months` in the activation + renewal writers; persist on
  the user doc and `subscriptions/{uid}` alongside `amount`/`interval` (default 1 when
  absent). (Persisted on the neutral subscription record via writeSubscriptionRecord.)
- [x] A3.2 `node --check firebase/functions/payments/fulfillment.js`.

### A4. Callable layer — `firebase/functions/payments/index.js`
- [x] A4.1 Replace `SUBSCRIPTION_PRICE_MINOR` (tier→price) with a `(tierId, intervalCount)`
  lookup via `subscriptionPriceMinor(tierId, count)`; seed monthly values (OC 20000,
  CT 25000 at count 1). Update all call sites.
- [x] A4.2 Activation/renewal paths write `intervalCount`/`months` into fulfillment.
  (Webhook activation emits them; the card path keeps monthly default until Phase B.)
- [x] A4.3 `createPaypalPlan` passes `intervalCount` (from `req.data.intervalCount` || 1)
  through to `createPlan` + the registry.
- [x] A4.4 Admin `listAllSubscriptions` returns `intervalCount` (default 1).
- [x] A4.5 `node --check firebase/functions/payments/index.js` + `npx jest` (suite green).

### A5. Client app — period-aware reads/displays
- [x] A5.1 `app/src/types/subscription-admin.ts`: carry `intervalCount`.
- [x] A5.2 `app/src/app/dashboard/admin/subscriptions/page.tsx`: render cadence
  (/mo · /qtr · /yr) from `intervalCount`.
- [x] A5.3 MRR = Σ(amount ÷ months) — fixed in `app/src/lib/payments/providers/paypal.ts`
  `getRevenueMetrics` (the source the admin/revenue pages read).
- [x] A5.4 `app/src/app/dashboard/client/membership/page.tsx`:
  "Next billing" fallback adds `months` (default 1).
- [x] A5.5 `node app/node_modules/typescript/bin/tsc --noEmit -p app/tsconfig.json`.

### A6. Phase A verification + ship
- [x] A6.1 All build checks green (JS_OK + jest 25/25 + TS_OK).

- [ ] A6.2 Deploy functions + app.
- [ ] A6.3 Smoke test (monthly, expect NO change): new OC purchase, new CT purchase, a
  renewal event, membership/billing pages, admin subscriptions list, revenue MRR.
- [ ] A6.4 Git checkpoint tagged before starting Phase B.

---

## Phase B — Quarterly plans

### B1. Mint plans
- [ ] B1.1 Extend `createPlan` callers / catalog scripts (`paypal-setup-catalog.js`,
  `seed-paypal-plans.js`) to mint a 2-cycle plan with `intervalCount: 3`.
- [ ] B1.2 Mint OC-Q + CT-Q in **sandbox** at the 10% quarterly price (OC 54000, CT 67500).
  Record plan ids.
- [ ] B1.3 (after sandbox verified) Mint OC-Q + CT-Q in **live**. Record plan ids.
- [ ] B1.4 Add the ids to `SANDBOX_PLANS`/`LIVE_PLANS` under
  `ONLINE_COACHING_QUARTERLY` / `COMPLETE_TRANSFORMATION_QUARTERLY`.

### B2. Register tier mapping
- [ ] B2.1 `PLAN_TIER_MAP` += 4 entries (2 sandbox + 2 live) → same tierId,
  `intervalCount: 3`.
- [ ] B2.2 Write `paypalPlans/{planId}` registry docs (tierId, tierName, intervalCount: 3).

### B3. Billing options + checkout
- [ ] B3.1 `constants.ts`: add the quarterly `BillingOption` to OC and CT
  `billingOptions` (period quarterly, planKey quarterly, amount 54000/67500).
- [ ] B3.2 `CHECKOUT_ITEMS` += `ONLINE_COACHING_QUARTERLY`,
  `COMPLETE_TRANSFORMATION_QUARTERLY` (subscription, same productId/tier).
- [ ] B3.3 Pricing UI (`ServiceTierStep`, `PricingCard`, `product-marketing.ts`): add a
  **Monthly / Quarterly** toggle; quarterly shows total + effective $/mo + "Save 10%".
- [ ] B3.4 Checkout resolves the selected option → planKey → plan id → existing
  `createPaypalSubscription*` callable (plan id is the only difference).

### B4. Admin discount configuration
- [ ] B4.1 `config/prepayPricing` Firestore doc + firestore.rules (client read ok / write
  denied).
- [ ] B4.2 New admin callable `updatePrepayPricing({ tierId, discountPct })`: validate
  0–50, compute quarterly minor, `updatePlanPricing(quarterlyPlanId, minor,
  {billingCycleSequences:[1,2]})`, persist config + amount. Export from index.js.
- [ ] B4.3 Admin UI: monthly anchor (read-only) + discount % input per tier + computed
  quarterly preview + "Save & reprice"; note "applies to new/renewing subs only".
- [ ] B4.4 `node --check` + `npx jest` + `tsc`.

### B5. Discounts interaction
- [ ] B5.1 Discount-code subscription path passes `intervalCount` (from resolved plan) into
  `buildPriceOverride`; `subscriptionPriceMinor(tierId, 3)` resolves the quarterly original
  amount. Verify override accepted by PayPal in sandbox.

### B6. No-refund messaging + legal
- [ ] B6.1 Quarterly checkout copy: "Billed once every 3 months. No refunds — access
  continues until the end of your paid period."
- [ ] B6.2 ToS clause (`docs/03-legal/terms-of-service.md` + `app/src/app/legal/terms/page.tsx`):
  pre-paid multi-month is non-refundable; cancel stops next renewal only.

### B7. Phase B verification
- [ ] B7.1 Sandbox: buy Quarterly OC + CT, confirm single discounted charge, same tier +
  feature access, next billing +3 months, MRR normalized.
- [ ] B7.2 Admin changes discount % → quarterly plan reprices; preview matches PayPal.
- [ ] B7.3 Discounted quarterly subscription (code) activates correctly.
- [ ] B7.4 Live mint + register + deploy + live smoke test per tier.

---

## Notes / deferred
- **monthly ↔ quarterly switch:** operational only — cancel at period end, start new next
  period. No code this iteration (documented in design §1 Non-Goals).
- **Annual:** model supports `intervalCount: 12`; no annual plan minted now.
- **Existing subscribers + reprice:** keep locked-in price until renewal (PayPal behavior,
  FR-B8) — surfaced in the admin UI note.
