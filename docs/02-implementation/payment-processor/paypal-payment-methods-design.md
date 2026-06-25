# Additional Payment Methods (Venmo, Apple Pay, Google Pay) — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 3 of 3 (additional payment methods via PayPal checkout)
> **Requirements:** `paypal-payment-methods-requirements.md`

---

## 1. Overview & principles

Broaden checkout funding sources **inside the PayPal adapter** while keeping the app
method-agnostic. Today, `app/src/lib/payments/providers/paypal.ts`:
- Loads the SDK once via `loadScript({ clientId, components: 'buttons,card-fields',
  currency:'USD', intent })` (single-load rule — a second load breaks the first).
- Renders vertical Smart Buttons (`paypal.Buttons`) + a guarded `FUNDING.CARD` button.

The neutral rule (req G2/NFR-1): pages/components only ever render `<ProviderCheckout>`
and read **neutral capability flags**; the adapter owns all funding/wallet specifics.

Fulfillment is **unchanged** for every method: one-time → `createOrder`/server capture
(`capturePaypalOrder`) + `PAYMENT.CAPTURE.COMPLETED`; subscription → `createSubscription`
+ synchronous confirmation + `BILLING.SUBSCRIPTION.ACTIVATED`.

## 2. Phase 1 — Venmo

### 2.1 SDK load change
Enable Venmo on the existing single SDK load. In `loadPayPal(...)` options add:
```
enableFunding: 'venmo'   // @paypal/paypal-js maps to enable-funding=venmo
```
Venmo only renders for eligible US buyers in supported contexts; the default
`paypal.Buttons` already surfaces enabled funding sources as additional buttons.

### 2.2 Rendering
No new button code is strictly required: with Venmo enabled, the vertical-layout
`paypal.Buttons` renders the Venmo button automatically when eligible. Optionally, to
guarantee placement, render a dedicated `FUNDING.VENMO` button mirroring the existing
guarded `FUNDING.CARD` pattern (eligibility-guarded, non-fatal).

### 2.3 Fulfillment & discounts
Venmo uses the same `createOrder`/`createSubscription` config object as the other
buttons, so capture/activation + the discounted amount (Feature 2) apply unchanged
(req FR-3/FR-4).

### 2.4 Eligibility & non-fatal absence
Wrap any dedicated Venmo button render in the existing `isEligible()` guard +
try/catch so a non-eligible context simply omits it (req FR-2), exactly like the card
button.

## 3. Phase 2 — Apple Pay & Google Pay

> These are **separate PayPal SDK components**, not part of `buttons`. They need their
> own render flow and (Apple Pay) domain registration.

### 3.1 SDK components
Extend the single SDK load's components to include the wallet components, e.g.:
```
components: 'buttons,card-fields,applepay,googlepay'
```
(Confirm exact names + load implications against current PayPal docs during impl.)

### 3.2 Apple Pay
- **Component:** use `paypal.Applepay()` to (a) check `applePaySession`
  eligibility/merchant capabilities, (b) render an Apple Pay button into an isolated
  DOM node (same React-isolation pattern as the wallet buttons), (c) on click, create
  the PayPal order/subscription (server-side create for one-time, same as card), run
  the Apple Pay sheet, then confirm the order with PayPal.
- **Domain registration (FR-6):**
  - Serve `app/public/.well-known/apple-developer-merchantid-domain-association`
    (file already obtained — currently in Downloads) at
    `https://shrey.fit/.well-known/apple-developer-merchantid-domain-association`.
  - Register `shrey.fit` as an Apple Pay web domain in the PayPal dashboard.
  - Next.js: ensure the `.well-known` path is served as a static asset (place under
    `app/public/.well-known/`; confirm no rewrite/header strips it).
- **Modes:** support one-time first; confirm subscription support via Apple Pay +
  PayPal and scope accordingly (req open question).

### 3.3 Google Pay
- **Component:** use `paypal.Googlepay()` to fetch merchant config + eligibility,
  render the Google Pay button (isolated DOM node), build the payment data request,
  and on authorization confirm the PayPal order/subscription.
- **No domain-association file** (unlike Apple Pay), but the merchant must be enabled
  for Google Pay in PayPal.

### 3.4 Neutral capability surface (FR-10)
Add a neutral capability so the app can render generic "available wallets" affordances
without naming a method:
```
ProviderCapabilities.wallets?: boolean   // provider exposes extra wallet buttons
```
The adapter decides which concrete wallets to attempt (eligibility-gated). The app
shows neutral copy ("PayPal, Venmo, and more") + updated `PaymentMethodLogos`.

### 3.5 Rendering integration
- All wallet buttons mount into their own isolated child DOM nodes appended to the
  same `container` `ProviderCheckout` passes in (matching the existing
  `renderCheckout` pattern that appends plain nodes React never reconciles).
- The returned cleanup closure tears down every mounted button (wallets + card),
  extending the current cleanup that already closes `buttons` + `cardButtons`.

## 4. Files touched (anticipated)

- `app/src/lib/payments/providers/paypal.ts`
  - `loadPayPal`: add `enableFunding: 'venmo'` (phase 1); add `applepay,googlepay` to
    `components` (phase 2).
  - `renderCheckout`: optional dedicated Venmo button (phase 1); Apple/Google Pay
    render + confirm flows (phase 2); extend cleanup.
  - `capabilities`: add `wallets: true` (phase 2).
- `app/src/lib/payments/types.ts` — `ProviderCapabilities.wallets?: boolean`.
- `app/src/lib/payments/providers/stripe.ts` — `wallets:false` (parity).
- `app/src/components/payments/PaymentMethodLogos.tsx` — add Venmo / Apple Pay /
  Google Pay marks.
- `app/public/.well-known/apple-developer-merchantid-domain-association` — NEW static
  asset (phase 2).
- `app/next.config.ts` — verify `.well-known` is served (add header/rewrite only if
  needed).
- (Possibly) `app/src/app/checkout/page.tsx` — neutral copy update only.

## 5. Risks & mitigations

- **Risk: second SDK load breaks buttons.** The code explicitly warns a second
  `loadScript` tears down the first. **Mitigation:** add all components/funding to the
  **single** load (NFR-3); never add a separate load for wallets.
- **Risk: Apple Pay not testable in sandbox.** **Mitigation:** verify Apple Pay on
  live with the registered domain (coordinate with Feature 1); gate behind eligibility
  so non-Apple contexts are unaffected.
- **Risk: wallet supports only one mode (order vs subscription).** **Mitigation:**
  scope per mode in impl; fall back to existing buttons where unsupported.
- **Risk: `.well-known` stripped by framework routing.** **Mitigation:** place under
  `public/` and verify the served URL returns the file with 200 + correct content
  before registering with PayPal.
- **Risk: discounted amount must apply to wallets.** **Mitigation:** wallets use the
  same server-side `createOrder`/`createSubscription` (with `discountCode`) as other
  buttons, so the discount applies automatically.

## 6. Phasing

- **Phase 1 (Venmo):** SDK `enableFunding`, optional dedicated guarded button, sandbox
  verification. Low risk, no domain work.
- **Phase 2 (Apple/Google Pay):** components + render/confirm flows + Apple Pay domain
  registration + logos + neutral `wallets` capability. Apple Pay verified on live.

## 7. Testing

- **Phase 1 (sandbox):** Venmo button renders for eligible buyer; one-time +
  subscription fulfill via existing paths; non-eligible context omits it; discounted
  Venmo one-time charges discounted amount.
- **Phase 2:** Google Pay in eligible sandbox/Chrome; Apple Pay on a real Apple device
  against the registered live domain; both fulfill via existing paths; app stays
  method-agnostic; `.well-known` returns 200.
