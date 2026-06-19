# Payment Processor Abstraction — Tasks

> **Status:** in progress
> **Created:** 2026-06-19
> **Related:** `payment-processor-requirements.md`, `payment-processor-design.md`

Legend: `[ ]` todo · `[x]` done · `[~]` in progress · 🔒 blocked on provider approval

---

## Phase 0 — Specs
- [x] **T0.1** Requirements doc (`payment-processor-requirements.md`).
- [x] **T0.2** Design doc (`payment-processor-design.md`).
- [x] **T0.3** Tasks doc (this file).

## Phase 1 — Client abstraction (Stripe-safe, no functional change)
> Goal: app talks only to `@/lib/payments`; Stripe still the live provider; build green.

> **Progress (2026-06-19):** Phase 1a (the abstraction layer itself, T1.1–T1.4)
> is **done and TSC-verified** (`tsc --noEmit` PASSED against the whole project —
> the new files compile with zero functional change; Stripe still the live path).
> Phase 1b (re-pointing the 6 call sites, T1.5–T1.10) is **pending next session**.
> Re-point approach: change each page's imports from `@/lib/stripe` to
> `@/lib/payments`, use `getPaymentProvider({mode})` for catalog/checkout, and use
> the neutral `Product`/`Price` types (replace `StripeProduct`/`StripePrice`). Note
> the type bridge: neutral `Price.active` is required + `lookupKey` (camelCase),
> vs Stripe's optional `active?` + `lookup_key` — the Stripe adapter already maps
> these, so pages should consume neutral types end-to-end.

- [x] **T1.1** Create `app/src/lib/payments/types.ts` — neutral `PaymentProvider`,
  `Product`, `Price`, `Transaction`, `ProviderCapabilities`, `CheckoutOptions`.
  *Done; no SDK imports.*
- [x] **T1.2** Create `app/src/lib/payments/pricing.ts` — neutral helpers
  (`formatCurrency`, `selectSignupPrice`, `selectSessionPrice`, `isSessionProduct`,
  `buildSessionPricing`, `calculateSessionSavings`). *Done; pure functions.*
- [x] **T1.3** Create `app/src/lib/payments/providers/stripe.ts` — adapter
  delegating to existing `lib/stripe.ts` + Stripe portal/history callables;
  capabilities `{hostedPortal:true, showsStoredCard:true, inAppCancel:true}`.
  *Done; maps `lookup_key`→`lookupKey`.*
- [x] **T1.4** Create `app/src/lib/payments/index.ts` — `getPaymentProvider(hint?)`
  resolving by `NEXT_PUBLIC_PAYMENT_PROVIDER[_SUBSCRIPTION|_ONETIME]`, default
  `stripe`; re-exports types + pricing. *Done; returns Stripe adapter today.*
- [x] **T1.5** Re-point `signup/components/ServiceTierStep.tsx` →
  `getPaymentProvider().fetchAllProducts()` + neutral `Product` + `selectSignupPrice`
  from `@/lib/payments`. *Done; tsc PASSED.*
- [x] **T1.6** Re-point `signup/components/PaymentStep.tsx` subscription branch →
  `getPaymentProvider({mode:'subscription'}).startCheckout()` (replaced the direct
  `fetch()` to `createCheckoutSession`); GA4 events preserved. *Done; tsc PASSED.
  One-time branch still uses Stripe Elements `confirmPayment` directly + the
  `createPaymentIntent` callable — intentionally deferred to the per-provider phase
  (card-on-page Elements is provider-specific; PayPal/Paddle use overlay/redirect).*
- [x] **T1.7** Re-point `app/payment/page.tsx` → `getPaymentProvider({mode}).startCheckout()`
  + `formatCurrency` from `@/lib/payments`. *Done; tsc PASSED.*
- [x] **T1.8** Re-point `dashboard/client/upgrade/page.tsx` → provider
  `startCheckout()`; keep GA4 event. *Done — imports `getPaymentProvider`+
  `formatCurrency` from `@/lib/payments`; uses
  `getPaymentProvider({mode:'subscription'}).startCheckout(...)` (returns `{url}`).
  Still loads catalog via direct Firestore + `selectSignupPrice` from `@/lib/stripe`
  (acceptable; full neutral-catalog swap optional). GA4 begin_checkout preserved.*
- [x] **T1.9** Re-point `dashboard/client/sessions/buy/page.tsx` → checkout via
  `getPaymentProvider({mode:'payment'}).startCheckout()`. *Done; tsc PASSED.
  `getSessionPricing`/`calculateSessionSavings` still from `@/lib/stripe` (delegate
  to neutral helpers; optional future swap).*
- [x] **T1.10** Re-point `dashboard/client/billing/page.tsx` → portal via
  `getPaymentProvider().openBillingPortal({restricted:true})`. *Done; build PASSED.
  The rich billing-history fetch still calls the Stripe `getBillingHistory` callable
  directly (its response is richer than the neutral `Transaction[]`); moving it to
  `provider.getBillingHistory()` + capability-flag rendering is folded into the
  per-provider phase (T3.4) when the neutral `billing_*` store lands.*
- [x] **T1.11** `app/src/lib/stripe.ts` + `types/stripe.ts` retained as the Stripe
  adapter's backing impl; neutral helpers live in `payments/pricing.ts`. *Done.*
- [x] **T1.12** Build-verify — `npm --prefix app run build` ✓ Compiled, 76/76 pages,
  no errors; Stripe behavior unchanged. *Done.*
- [x] **T1.13** Owner committed + pushed Phase 1 to `main` (2026-06-19).

## Phase 1.5 — Interface extension for button-checkout (Smart Buttons)
> Adds the seam pieces PayPal needs. Stripe-safe; build stays green.
> Decisions (owner-approved 2026-06-19): **Smart Buttons for BOTH** sub + one-time;
> add a `renderCheckout` capability **(A)** rather than per-page PayPal code.

- [x] **T1.5.1** `types.ts` — added `buttonCheckout: boolean` to `ProviderCapabilities`
  and optional `renderCheckout(opts & {container,onApproved,onError}) => Promise<()=>void>`
  to `PaymentProvider`. *Done; tsc PASSED.*
- [x] **T1.5.2** `providers/stripe.ts` — set `buttonCheckout:false` (no `renderCheckout`).
  *Done.*
- [x] **T1.5.3** `app/src/components/payments/ProviderCheckout.tsx` — shared component
  branching on `capabilities.buttonCheckout` (redirect via `startCheckout` vs mount
  via `renderCheckout`). *Done; tsc PASSED.*
- [ ] **T1.5.4** Adopt `<ProviderCheckout>` in the checkout call sites (PaymentStep,
  payment/page, upgrade/page, sessions/buy) — keep GA4 events. **Deferred into
  Phase 3 (T3.2):** with only Stripe registered (`buttonCheckout:false`), the
  component would just re-wrap the existing `startCheckout` calls with no behavior
  change; it becomes load-bearing when the PayPal adapter renders Smart Buttons, so
  the page swap happens then to avoid dead UI now.
- [x] **T1.5.5** Build-verify — `tsc --noEmit` PASSED (Stripe behavior unchanged;
  new interface members are additive/optional). Full `next build` re-run with the
  page adoption in Phase 3.

## Phase 2 — Server seam (Stripe still live) — built 2026-06-19 (scaffolding; not yet live-wired)
> All `node --check` syntax-verified. NOT yet registered as a live webhook — the
> invertase extension + existing triggers in `../index.js` remain the live Stripe
> path until cutover (design §8). Generic path is wired live per-provider in Phase 3/5.
- [x] **T2.1** `firebase/functions/payments/fulfillment.js` — neutral
  `activateSubscription`, `deactivateSubscription`, `fulfillSessionPackage`,
  `writeSubscriptionRecord`, `writeTransactionRecord`, `writeBillingCustomer`.
  Ported from `index.js` (`syncSubscriptionToUser`, `createSessionPackageFromPayment`):
  write-once `accountActivated`, tier sync, trainer auto-assign, subscriptionId
  cleanup on cancel, 60-day session-package expiry, idempotent package create.
  *Welcome email / onboarding goal / `new_client_signup` activity-feed are exposed
  as an `onFirstActivation` hook — MUST be wired before PayPal go-live (T3.3).*
- [x] **T2.2** `firebase/functions/payments/index.js` — generic `paymentWebhook`
  (HTTP: verify→parse→fulfill) with provider registry + `?provider=` routing; returns
  500 on fulfillment error so the provider retries (fulfillment is idempotent).
  *(getBillingHistory/openBillingPortal/cancelSubscription callables added per-provider
  in Phase 3 alongside PayPal.)*
- [x] **T2.3** `firebase/functions/payments/providers/stripe.js` — reference
  `verifySignature` (HMAC via `stripe.webhooks.constructEvent`) + `parseEvent`
  (event-mapping table §3.3) so the generic path is proven on Stripe.
- [x] **T2.4** Neutral `billing_customers/**` writes (customer + subscriptions +
  transactions); `users/*` activation flags preserved by fulfillment.
- [x] **T2.5** `firestore.rules` for `billing_customers/**` — owner/admin read,
  `write: if false` (server-only via admin SDK). *Deploy with `firebase deploy
  --only firestore:rules` at cutover; additive (new collection), safe to deploy now.*

## Phase 3 — PayPal adapter ✅ launch processor (account approved 2026-06-19)
- [ ] **T3.0 (owner)** Create PayPal apps for **BOTH** environments (NFR-7 / design §7.1):
  - **Sandbox** (used in dev): sandbox Client ID + Secret; sandbox Catalog Product →
    Billing Plan (`P-xxxx`) per recurring tier (Online Coaching, Complete
    Transformation); register sandbox webhook → sandbox `PAYPAL_WEBHOOK_ID`.
  - **Live** (used in prod): live Client ID + Secret; live Billing Plans (`P-xxxx`);
    register live webhook → live `PAYPAL_WEBHOOK_ID`.
  - Provide both sets of plan IDs (→ `SANDBOX_PLANS` / `LIVE_PLANS`).
- [ ] **T3.1** Add `@paypal/react-paypal-js` (client) + `@paypal/paypal-server-sdk`
  (server). Env split per environment (design §7.1):
  - dev `.env.local`: `NEXT_PUBLIC_PAYPAL_ENV=sandbox` + sandbox `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
  - prod `apphosting.yaml`: `NEXT_PUBLIC_PAYPAL_ENV=production` + live `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
  - Secret Manager: sandbox + live `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID`;
    server adapter selects API base (`api-m.sandbox.paypal.com` vs `api-m.paypal.com`).
  - `constants.ts`: `PAYPAL_PLANS = PAYPAL_LIVE ? LIVE_PLANS : SANDBOX_PLANS`.
- [ ] **T3.2** `providers/paypal.ts` (client) — **Smart Buttons** via `renderCheckout`
  for BOTH flows (subscription `createSubscription({plan_id})`, one-time
  `createOrder`/capture); capabilities `{buttonCheckout:true, hostedPortal:false,
  showsStoredCard:false, inAppCancel:true}`; register in `index.ts`.
- [ ] **T3.3** `payments/providers/paypal.js` (server) — webhook verify + event map
  (`BILLING.SUBSCRIPTION.*`, `PAYMENT.SALE.*`); order capture; subscription cancel.
- [ ] **T3.4** Billing page in no-hosted-portal mode (manage-in-PayPal + in-app cancel),
  driven by capability flags.
- [ ] **T3.5** Sandbox E2E: subscribe, one-time package, cancel, billing history.

## Phase 4 — Paddle adapter 🔒 (needs approved Paddle)
- [ ] **T4.1** Add `@paddle/paddle-js` + `@paddle/paddle-node-sdk`; env/secrets.
- [ ] **T4.2** `providers/paddle.ts` (client) — overlay checkout, capabilities
  `{hostedPortal:true, showsStoredCard:true, inAppCancel:true}`.
- [ ] **T4.3** `payments/providers/paddle.js` (server) — webhook verify + event map;
  portal session; transactions list.
- [ ] **T4.4** Sandbox E2E: subscribe, one-time, portal, billing history.

## Phase 5 — Cutover
- [ ] **T5.1** Set per-mode provider env (e.g. subscription=paddle, onetime=paypal,
  or single provider) in `apphosting.yaml`.
- [ ] **T5.2** Deploy Functions; register live webhook endpoint(s).
- [ ] **T5.3** Live smoke purchase (small/refunded); verify activation + history.
- [ ] **T5.4** Remove invertase `firestore-stripe-payments` from `firebase.json`;
  retire Stripe env/secrets.
- [ ] **T5.5** Update launch plan Master Checklist (payment provider = live).

## Execution note
Phases 1–2 are **safe groundwork** with no dependency on provider approval and are
executed now. Phases 3–4 begin once an account is approved. Phase 5 is the final
production cutover.
