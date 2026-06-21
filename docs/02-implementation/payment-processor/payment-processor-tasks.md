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

> **Sandbox catalog created 2026-06-19** via `firebase/scripts/paypal-setup-catalog.js`.
> Prices: Online Coaching $250/mo · Complete Transformation $250/mo + $60 one-time
> `setup_fee` · one-time (Orders API, no plan): In-Person Session $75, 4-Pack $240.
> **SANDBOX plan IDs (→ `SANDBOX_PLANS` in constants.ts):**
> - `ONLINE_COACHING` = `P-98H09129JK640830CNI26BLQ`  (product `PROD-2P670379WE121992A`)
> - `COMPLETE_TRANSFORMATION` = `P-9YF75345BP118725ENI26GLI`
> LIVE plan IDs are created at cutover by re-running the script with live creds.
> ⚠️ Owner: rotate the sandbox secret that was pasted in chat.
- [ ] **T3.0 (owner)** Create PayPal apps for **BOTH** environments (NFR-7 / design §7.1):
  - **Sandbox** (used in dev): sandbox Client ID + Secret; sandbox Catalog Product →
    Billing Plan (`P-xxxx`) per recurring tier (Online Coaching, Complete
    Transformation); register sandbox webhook → sandbox `PAYPAL_WEBHOOK_ID`.
  - **Live** (used in prod): live Client ID + Secret; live Billing Plans (`P-xxxx`);
    register live webhook → live `PAYPAL_WEBHOOK_ID`.
  - Provide both sets of plan IDs (→ `SANDBOX_PLANS` / `LIVE_PLANS`).
- [x] **T3.1** Add `@paypal/react-paypal-js` (client) + `@paypal/paypal-server-sdk`
  (server). Env split per environment (design §7.1):
  - dev `.env.local`: `NEXT_PUBLIC_PAYPAL_ENV=sandbox` + sandbox `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
  - prod `apphosting.yaml`: `NEXT_PUBLIC_PAYPAL_ENV=production` + live `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
  - Secret Manager: sandbox + live `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID`;
    server adapter selects API base (`api-m.sandbox.paypal.com` vs `api-m.paypal.com`).
  - `constants.ts`: `PAYPAL_PLANS = PAYPAL_LIVE ? LIVE_PLANS : SANDBOX_PLANS`
    (+ `PAYPAL_ONETIME` $75/$240 amounts). *Done 2026-06-19; tsc PASSED.*
  - **DONE:** `constants.ts` (SANDBOX_PLANS/LIVE_PLANS/PAYPAL_PLANS/PAYPAL_ONETIME +
    `PAYPAL_ENV`/`PAYPAL_LIVE`), `app/package.json` dep `@paypal/react-paypal-js`,
    `apphosting.yaml` (`NEXT_PUBLIC_PAYPAL_ENV=production` + live client id placeholder),
    `.env.local` (`NEXT_PUBLIC_PAYPAL_ENV=sandbox` + sandbox client id placeholder).
  - **OWNER TODO:** `npm --prefix app install` to lock the dep; paste sandbox
    `NEXT_PUBLIC_PAYPAL_CLIENT_ID` into `.env.local` + live one into `apphosting.yaml`;
    `@paypal/paypal-server-sdk` is added in `firebase/functions` during T3.3.

- [~] **T3.2** `providers/paypal.ts` (client) — **Smart Buttons** via `renderCheckout`
  for BOTH flows (subscription `createSubscription({plan_id})`, one-time
  `createOrder`/capture); capabilities `{buttonCheckout:true, hostedPortal:false,
  showsStoredCard:false, inAppCancel:true}`; register in `index.ts`.
  - [x] **T3.2a** Adapter built + registered + tsc PASSED (2026-06-19).
    `app/src/lib/payments/providers/paypal.ts` — Smart Buttons via `renderCheckout`
    (subscription `createSubscription({plan_id, custom_id:uid})`; one-time
    `createOrder`+`capture` with `PAYPAL_ONETIME` amounts + `custom_id:uid`); SDK
    loaded imperatively via `loadScript` from `@paypal/paypal-js` (added as a direct
    dep; sub-dep of react-paypal-js). **Catalog identity (design §2.6):** neutral
    `Product.id` = the Stripe product id (so `user.tier`/check-in eligibility logic is
    unchanged); PayPal ids live on `Price.id` (recurring → `P-xxxx`, one-time →
    `IN_PERSON`/`IN_PERSON_4PACK`). `getBillingHistory` reads neutral
    `billing_customers/{uid}/transactions`; `cancelSubscription` → `cancelPaypalSubscription`
    callable (built in T3.3). Registered in `index.ts` REGISTRY.
  - [x] **T3.2b** Adopt `<ProviderCheckout>` in the 4 checkout call sites — DONE
    2026-06-19, tsc PASSED. Enhanced `<ProviderCheckout>`: renders a trigger button
    first (no account creation / SDK popup until click), then branches on
    `capabilities.buttonCheckout` (Stripe redirect vs PayPal Smart Buttons mounted in a
    revealed container). Added async `onBeforeCheckout` that may return
    `{userId, metadata}` — this preserves the signup flow's "create the Firebase account
    at the very last step, just before the processor call" semantics (owner-confirmed)
    across BOTH provider types, and is where GA4 `begin_checkout` fires.
    **Price-id resolution (design §2.3a):** each page resolves the ACTIVE provider's
    checkout price id at load via `getPaymentProvider({mode}).fetchProduct(stripeProdId)`
    → `select(Signup|Session)Price` → `price.id` (Stripe `price_…` unchanged; PayPal
    `P-…`/one-time key), since `Product.id` = Stripe product id in both adapters.
    Call sites: `upgrade/page` (per-card `<ProviderCheckout>`), `sessions/buy` +
    `PricingCard` (new optional `action` slot), `payment/page` (account creation moved
    into `prepareCheckout` onBeforeCheckout → `{userId, metadata}`), signup `PaymentStep`
    subscription branch (`SubscriptionPaymentForm` now uses `<ProviderCheckout>`; the
    one-time Stripe Elements branch is untouched — PayPal one-time goes through
    sessions/buy + payment/page).
    - **OWNER TODO:** set dev provider env in `.env.local` to click-test PayPal —
      `NEXT_PUBLIC_PAYMENT_PROVIDER=paypal` (both modes) or per-mode
      `NEXT_PUBLIC_PAYMENT_PROVIDER_SUBSCRIPTION`/`_ONETIME`. Buttons render + popup works,
      but fulfillment needs the webhook (T3.3/T3.5). Run full `npm --prefix app run build`.


- [x] **T3.3** `payments/providers/paypal.js` (server) — DONE 2026-06-19, `node --check`
  PASSED (all 3 Functions files). `verifySignature` (PayPal verify-webhook-signature
  API + `PAYPAL_WEBHOOK_ID`) + `parseEvent` mapping `BILLING.SUBSCRIPTION.ACTIVATED/
  UPDATED/RE-ACTIVATED→activated`, `CANCELLED/EXPIRED/SUSPENDED→canceled`,
  `PAYMENT.SALE.COMPLETED→transaction`, `PAYMENT.SALE/CAPTURE.REFUNDED→refunded`,
  `PAYMENT.CAPTURE.COMPLETED`/`CHECKOUT.ORDER.APPROVED→session package` (neutral §3.2/3.3).
  `cancelSubscription(id)` via PayPal API. **Plan→tier map** resolves `plan_id`→the SAME
  Stripe product id (`tierId`) so `user.tier` is unchanged (live ids TODO at Phase 5).
  Uses raw `https` + OAuth client-credentials — **no `@paypal/paypal-server-sdk` dep
  needed** (T3.1's server-sdk note is obsolete). Registered in `payments/index.js`
  PROVIDERS; added `cancelPaypalSubscription` onCall (auth-gated, verifies ownership);
  added `setFulfillmentHooks` injection. **`onFirstActivation` parity hook wired** in
  main `firebase/functions/index.js` (welcome email + onboarding setup goal +
  `new_client_signup` feed) and `paymentWebhook`/`cancelPaypalSubscription` exported.
  - **OWNER TODO (T3.5):** put sandbox `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET`/
    `PAYPAL_WEBHOOK_ID`/`PAYPAL_ENV=sandbox` in Functions env (Secret Manager), deploy,
    register the sandbox webhook at the `paymentWebhook?provider=paypal` URL.

- [x] **T3.4** Billing page capability-driven — DONE 2026-06-20, tsc PASSED. Owner
  decision: do **NOT** link to PayPal's account page (it's all-or-nothing, can't be
  scoped like Stripe's restricted portal). `billing/page.tsx` now branches on
  `provider.capabilities` (no processor names): **history** — Stripe keeps its rich live
  `getBillingHistory` callable; PayPal reads neutral `billing_customers/{uid}/transactions`
  via `provider.getBillingHistory(uid)`. **Payment method** — `showsStoredCard:false`
  (PayPal) hides the card block, shows read-only "Paid with PayPal". **Cancel** —
  `!hostedPortal && inAppCancel` (PayPal) shows an in-app Cancel Subscription button
  (confirm dialog) → `provider.cancelSubscription` → `cancelPaypalSubscription` callable;
  Stripe keeps its restricted "Update Payment Method" portal button. No "Manage in PayPal"
  link anywhere. Design §5 updated to match.

- [ ] **T3.5** Sandbox E2E: subscribe, one-time package, cancel, billing history.

## Phase 3.6 — PayPal ACDC card fields (card-only checkout, no PayPal account) — FR-12 / design §2.6a
> Smart Buttons force card-paying subscribers to log into/create a PayPal account
> (bad CX). ACDC is enabled on the account. Add hosted card fields for card-only
> subscription + one-time checkout. Reuses existing webhook/fulfillment/cancel.
>
> **POST-FIX-#6 context already done:** one-time server-side capture
> (`capturePaypalOrder`) + `detectProvider` header routing + welcome-flicker fix are
> already merged; ACDC builds on top of them.

- [x] **T3.6.0** Docs-first: requirements FR-11/FR-12 + capability matrix; design §2.6a.
- [ ] **T3.6.1** Add `cardFields` to `ProviderCapabilities` (types.ts); set `true` on
      PayPal adapter, `false`/omit on Stripe & Paddle. tsc-verify.
- [ ] **T3.6.2** PayPal client adapter: load SDK with `components:'buttons,card-fields'`;
      add a `renderCardFields(opts & {container,onApproved,onError})` path:
      - one-time → `paypal.CardFields({ createOrder, onApprove })`; `onApprove` calls the
        `capturePaypalOrder` callable (NOT client capture).
      - subscription → vault the card (`CardFields.submit()` does 3DS), then call new
        callable `createPaypalSubscriptionWithCard({ vaultToken, planId, userId })`.
- [ ] **T3.6.3** Server: `firebase/functions/payments/providers/paypal.js` add
      `createSubscriptionWithCard(vaultToken, planId, custom_id)` →
      `POST /v1/billing/subscriptions` with vaulted `payment_source`. Export a
      `createPaypalSubscriptionWithCard` onCall in `payments/index.js` + main
      `functions/index.js` (bind PAYPAL secrets). `node --check`.
- [ ] **T3.6.4** `<ProviderCheckout>`: when `capabilities.cardFields`, render BOTH the
      Smart Button (wallet) and a "Pay with card" section (hosted fields + Pay button →
      `CardFields.submit()`), mounted in the isolated non-React container (§2.3a). On
      success → navigate to `successUrl`; webhook fulfills. Adopt on the 4 checkout pages.
- [ ] **T3.6.5** Verify (tsc + `node --check`); owner deploys functions
      (`paymentWebhook`, `capturePaypalOrder`, `cancelPaypalSubscription`,
      `createPaypalSubscriptionWithCard`); sandbox E2E with **card 4111 1111 1111 1111**:
      subscription activates with NO PayPal login, one-time creates exactly 1 package,
      3DS challenge handled, cancel + billing history still work.

## Phase 3.7 — Unified checkout flow (`/checkout` + `/checkout/success`) — design §2.7
> ONE reusable checkout destination every Buy/Pay/Subscribe button routes to, instead
> of inline per-page checkout UIs. **Reusability rule (owner):** `/checkout` is
> scenario-agnostic and assumes the user is ALREADY authenticated — no account creation,
> no reCAPTCHA, no signup branching inside it. Callers do any scenario-specific work
> (e.g. signup account creation) BEFORE routing in. Builds on Phase 3.6 (ACDC card fields).

- [x] **T3.7.0** Docs-first: design §2.7 (CHECKOUT_ITEMS registry, `/checkout`,
      `/checkout/success`, card-in-modal, Cardholder Name, deferred Apple/Google Pay)
      + this tasks phase.
- [ ] **T3.7.1** `constants.ts` — `CHECKOUT_ITEMS` registry keyed by short URL param
      (`IN_PERSON`, `IN_PERSON_4PACK`, `ONLINE_COACHING`, `COMPLETE_TRANSFORMATION`) →
      `{ mode, productId: SERVICE_TIERS.x, fulfillment }` + `CheckoutItemKey` type +
      `getCheckoutItem(key)` helper. tsc-verify.
- [ ] **T3.7.2** `paypal.ts` `renderCardFields` — add `cardField.NameField()`
      (Cardholder Name) in the isolated container; keep the single `buttons,card-fields`
      `loadScript`. tsc-verify.
- [ ] **T3.7.3** `<ProviderCheckout>` — add card-in-modal mode (Radix `Dialog`); wallet
      buttons inline, ACDC fields mount inside the modal (iframe-isolation §2.3a). Inline
      behavior stays the default. Stripe unaffected (capability-driven). tsc-verify.
- [ ] **T3.7.4** `/checkout/page.tsx` — generic, auth-required: parse `item` + `return`
      (allowlist: must start with `/`, not `//`; else `/dashboard`); resolve summary +
      active-provider `priceId`; render `<ProviderCheckout>` (modal-card);
      `successUrl=/checkout/success?item=&return=`. tsc-verify.
- [ ] **T3.7.5** `/checkout/success/page.tsx` — "Finalizing…" → Firestore `onSnapshot`
      on `users/{uid}` awaiting the item's fulfillment signal (`session_package` →
      `sessionBalance.purchased` > baseline; `subscription_active` → `accountActivated`);
      ✅ + Continue (→ `return`); 15s soft-timeout fallback. tsc-verify.
- [ ] **T3.7.6** Repoint Buy/Pay buttons → `router.push('/checkout?item=&return=')`:
      `sessions/buy` + `PricingCard` (remove inline card form/`ProviderCheckout` from the
      cards), `upgrade/page`, then signup (create the Firebase account + reCAPTCHA at the
      end of the signup steps, THEN route to `/checkout` — `/payment` superseded for
      signup). tsc-verify.
- [ ] **T3.7.7** Verify: `tsc --noEmit` (app) + `node --check` any touched Functions.
      Owner runs dev + tests: dashboard → Buy 1-1 sessions → Buy Now → `/checkout` →
      card-in-modal (with name) or PayPal → `/checkout/success` waits → Continue.

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

## Phase 6 — Admin Billing Management 🔮 (future, post-launch)
> Not launch-critical. Captured here so the design intent isn't lost. Depends on
> PayPal being live (Phase 3/5). Everything stays provider-agnostic behind the seam.
> See design §10 (Pricing changes) and §11 (Promotions/coupons) for the detail.
- [ ] **T6.1** Move catalog amounts/labels from hardcoded `constants.ts` →
  Firestore `billing_config` doc (admin-writable, app-readable). `PAYPAL_PLANS`/
  `PAYPAL_ONETIME` become the seed/fallback. Keep all plan/amount lookups behind a
  single resolver so this swap is small (structure T3.3 with that in mind).
- [ ] **T6.2** Admin pricing UI (`dashboard/admin/*`) + admin-gated callables:
  recurring price edit → PayPal `update-pricing-schemes` (same `P-xxxx`); one-time
  amount edit → `billing_config` write; CT `setup_fee` edit → plan `PATCH`.
  Optional helper `firebase/scripts/paypal-update-pricing.js` (mirrors catalog script).
- [ ] **T6.3** Promotions/coupons — neutral coupon engine (ours; full Stripe-level
  RULES: percent/fixed/intro, expiry, max redemptions, per-user, tier scope,
  first-timers, stackable) in Firestore `coupons` + server-side validator. Add
  optional `discount` to `CheckoutOptions` (validated server-side, never trusted from
  client). Per-provider mapping via an `appliesTo` capability:
  - `one_time` → PayPal order `breakdown.discount` (full support).
  - `first_cycle` → PayPal inline `plan` override at `createSubscription`
    (intro price / first-N-cycles / waived setup_fee) — full support.
  - `recurring_forever` → **NOT supported on PayPal** (capability-gated off; would
    require a dedicated discounted plan). Admin UI hides it while PayPal is the
    subscription processor; auto-enables if a capable provider (e.g. Paddle) is added.
- [ ] **T6.4** Admin coupon UI + redemption reporting; catalog active/inactive toggles
  + marketing-copy edits (currently `product-marketing.ts`).

## Execution note
Phases 1–2 are **safe groundwork** with no dependency on provider approval and are
executed now. Phases 3–4 begin once an account is approved. Phase 5 is the final
production cutover. Phase 6 is post-launch admin/promotions tooling.


