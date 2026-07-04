# Apple Pay & Google Pay (one-time, via PayPal) — Requirements

> **Status:** Draft → ready for review
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-04
> **Decision basis:** `applepay-googlepay-decision.md` (Option A — one-time via Orders v2)
> **Design:** `applepay-googlepay-design.md`
> **Tasks:** `applepay-googlepay-tasks.md`
> **Expands:** the "Phase 2" stub in `paypal-payment-methods-{requirements,design,tasks}.md`
> **Related:** `payment-processor-requirements.md`, `discount-codes-requirements.md`,
> `paypal-live-readiness-requirements.md`

---

## 1. Background & problem

Checkout today (via `app/src/lib/payments/providers/paypal.ts`) renders, in a
controlled boxed layout:
- **Pay with Card** — PayPal-hosted guest card (no PayPal account),
- **Pay with PayPal** — PayPal + Pay Later,
- **More ways to pay** — **Venmo** (eligibility-guarded, phase-1 complete).

Apple Pay and Google Pay are **not** integrated. Unlike Venmo (a PayPal funding source
on `paypal.Buttons`), Apple/Google Pay are **separate PayPal SDK components**
(`applepay` / `googlepay`) with their own render + confirm flow, and Apple Pay requires
**domain registration**. The `PaymentMethodLogos` component already shows Apple/Google
Pay marks as **display-only**; this feature makes them functional for **one-time**
purchases.

Per `applepay-googlepay-decision.md`, we build **Option A** (one-time via Orders v2)
now and **defer** wallet-funded recurring (Option B — Vault + Orders + a self-managed
billing engine).

## 2. Vision

Add Apple Pay + Google Pay as first-class **one-time** wallet options **through the
neutral payment interface**, so pages stay method-agnostic. The PayPal adapter enables
and renders the wallet buttons internally (eligibility-gated); fulfillment is unchanged
— all wallets resolve to the same server order-capture path and the same idempotent
`PAYMENT.CAPTURE.COMPLETED` webhook.

## 3. Scope

**In scope**
- Integrate **Apple Pay** (`paypal.Applepay()`) as a one-time wallet button on eligible
  Apple devices/Safari, incl. **domain registration** (`.well-known` file already
  obtained).
- Integrate **Google Pay** (`paypal.Googlepay()` + Google `pay.js`) as a one-time
  wallet button on eligible Android/Chrome contexts, incl. **Google production
  approval**.
- Keep all method selection/rendering inside the PayPal adapter; expose only a neutral
  capability flag (`capabilities.wallets`).
- Make the existing Apple/Google Pay `PaymentMethodLogos` marks functional (they render
  where the buttons are eligible).

**Out of scope**
- **Wallet-funded recurring / subscriptions** (Option B — Vault + Orders + scheduled
  charges). Documented in `applepay-googlepay-decision.md §4` as a data-gated future
  phase. In `mode === 'subscription'`, wallet buttons **do not render**; buyers use the
  existing PayPal / guest-card path.
- Non-PayPal wallet integrations (native Stripe Apple Pay — Stripe is dormant).
- Changing fulfillment, tiers, plans, or the neutral data model.

## 4. Goals

- **G1** — Apple Pay / Google Pay are available at **one-time** checkout for eligible
  buyers/devices (session package + 4-pack).
- **G2** — The checkout UI stays **method-agnostic**: no page/component references
  `applepay`/`googlepay`; only the adapter + `PaymentMethodLogos` do.
- **G3** — Wallet purchases use the **same** server `createPaypalOrder` +
  `capturePaypalOrder` + idempotent `PAYMENT.CAPTURE.COMPLETED` webhook (zero new
  fulfillment paths).
- **G4** — Wallets honor **discount codes** (the server-set discounted amount applies
  regardless of funding source).
- **G5** — Non-eligibility and subscription mode are **non-fatal**: the wallet simply
  isn't shown; existing buttons/card are unaffected.

## 5. Functional requirements

### SDK & rendering
- **FR-1 Single SDK load.** Add `applepay,googlepay` to the **single** PayPal SDK
  `loadScript` `components` string (currently `buttons,card-fields`), preserving
  `enableFunding: 'venmo'`. NEVER add a second PayPal `loadScript` (breaks the first).
- **FR-2 Google pay.js.** Load Google's `pay.js` (a non-PayPal script — allowed) to
  render the Google Pay button; the single-load rule applies only to the PayPal SDK.
- **FR-3 Apple Pay component.** Use `paypal.Applepay()`: check eligibility
  (`window.ApplePaySession` + merchant validation), render an Apple Pay button into an
  isolated DOM node, and on click create the PayPal order server-side, run the Apple Pay
  sheet, validate the merchant, and confirm the order with PayPal.
- **FR-4 Google Pay component.** Use `paypal.Googlepay()`: fetch merchant config +
  eligibility (`isReadyToPay`), render the Google Pay button into an isolated DOM node,
  build the payment data request, and on authorization confirm the PayPal order.
- **FR-5 Controlled placement.** Render the wallet buttons in the existing "More ways
  to pay" boxed section (alongside Venmo), matching the current `renderSection`
  isolated-DOM pattern; extend the cleanup closure to tear them down.

### Eligibility & fallback
- **FR-6 Eligibility-guarded.** Apple Pay renders only on Apple devices/browsers where
  `ApplePaySession` is available + merchant-capable; Google Pay only where
  `isReadyToPay` is true. Absence is **non-fatal** (mirrors the Venmo/card guards).
- **FR-7 One-time only.** In `mode === 'subscription'`, wallet buttons are **not
  rendered**. (Recurring is Option B — deferred.)

### Fulfillment & money
- **FR-8 Same fulfillment.** A wallet one-time purchase fulfills via the existing
  `createPaypalOrder` → `capturePaypalOrder` (synchronous) + idempotent
  `PAYMENT.CAPTURE.COMPLETED` webhook. No new fulfillment code.
- **FR-9 Server-authoritative amount + discounts.** The order amount (incl. any
  validated `discountCode`) is set **server-side** in `createPaypalOrder`; the wallet
  flow forwards `discountCode` unchanged so the discounted amount applies to wallets
  automatically. The client never sets the amount.
- **FR-10 Payment-method label.** Where PayPal exposes the funding instrument on the
  capture, the neutral transaction row records it (`derivePaymentMethod`). PayPal may
  surface Apple/Google Pay as an underlying `card` (brand+last4) rather than a distinct
  wallet name; this is acceptable (documented limitation) and the UI falls back to
  "PayPal"/card as today.

### Domain / account prerequisites
- **FR-11 Apple Pay domain registration.** Host
  `app/public/.well-known/apple-developer-merchantid-domain-association` so
  `https://shrey.fit/.well-known/apple-developer-merchantid-domain-association` returns
  200 with correct content (verify Next.js/App Hosting doesn't strip it); register
  `shrey.fit` as an Apple Pay web domain in the PayPal dashboard.
- **FR-12 Google Pay enablement.** Confirm the merchant is enabled for Google Pay in
  PayPal and obtain **Google production approval** before live.

### Neutral surface & logos
- **FR-13 Neutral capability.** Add `ProviderCapabilities.wallets?: boolean` to
  `app/src/lib/payments/types.ts`; set `true` in the PayPal adapter, `false` in Stripe.
  The app may use it for neutral copy only — it must not branch on a specific wallet.
- **FR-14 Functional logos.** Update `PaymentMethodLogos` comments/behavior so the
  Apple/Google Pay marks reflect the now-functional buttons; no method-specific
  branching leaks into pages.

## 6. Non-functional requirements

- **NFR-1 Neutral interface.** All wallet-specific SDK config/rendering lives only in
  `app/src/lib/payments/providers/paypal.ts` (+ server adapter/callables if needed). No
  app page imports a wallet SDK or references a method name.
- **NFR-2 No regression.** Existing Card / PayPal / Pay Later / Venmo buttons, ACDC
  card fields, and both subscription + one-time flows continue to work unchanged.
- **NFR-3 Single PayPal SDK load.** Wallet components are added to the one existing
  `loadScript`; Google `pay.js` is a separate, allowed script.
- **NFR-4 Performance.** Eligibility checks gate rendering so non-eligible contexts add
  no visible cost; wallet mount must not materially slow checkout.
- **NFR-5 Security/compliance.** The Apple Pay domain-association file is served
  correctly (200 + exact bytes) and kept in sync if checkout domains change.

## 7. Acceptance criteria

- **AC-1** Google Pay button renders + completes a one-time purchase in an eligible
  Chrome/Android (sandbox) context; fulfillment via the existing capture + webhook path.
- **AC-2** Apple Pay button renders + completes a one-time purchase on a **real Apple
  device** against the **registered live domain**; fulfillment via the existing path.
- **AC-3** A **discounted** one-time wallet purchase charges the **server-set
  discounted** amount (FR-9).
- **AC-4** Non-eligible contexts and `mode === 'subscription'` omit the wallet buttons
  with **no regression** to the existing buttons/card (FR-6/FR-7, NFR-2).
- **AC-5** `https://shrey.fit/.well-known/apple-developer-merchantid-domain-association`
  returns 200 with correct content; `shrey.fit` registered in PayPal.
- **AC-6** App remains method-agnostic (no `applepay`/`googlepay` outside the adapter +
  logos); `capabilities.wallets` present; logos updated.

## 8. Open questions / assumptions

- **Assumption:** the single SDK load can host `buttons,card-fields` +
  `enableFunding=venmo` + `applepay,googlepay`; exact component names confirmed in the
  design against current PayPal docs during implementation.
- **Assumption:** Apple Pay sandbox testing is limited, so Apple Pay is verified on
  **live** with the registered domain (coordinate with live-readiness); gated behind
  eligibility so non-Apple contexts are unaffected.
- **Open:** whether PayPal's capture payload reliably distinguishes Apple/Google Pay
  from an underlying card for the history label (FR-10). Default: accept card/"PayPal"
  fallback.
- **Open (future):** wallet-funded **recurring** (Option B) — tracked in
  `applepay-googlepay-decision.md §4`, revisited if one-time wallet adoption is high.
