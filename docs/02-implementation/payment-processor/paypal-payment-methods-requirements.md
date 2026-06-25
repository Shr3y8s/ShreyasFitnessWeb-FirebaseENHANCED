# Additional Payment Methods (Venmo, Apple Pay, Google Pay) — Requirements

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 3 of 3 (additional payment methods via PayPal checkout)
> **Related:** `payment-processor-requirements.md`, `payment-processor-design.md`,
> `paypal-live-readiness-requirements.md`, `discount-codes-requirements.md`

---

## 1. Background & Problem

The current PayPal checkout renders the standard Smart Buttons (PayPal wallet + Pay
Later) plus a dedicated guest "Debit or Credit Card" button. The SDK is loaded with
`components: 'buttons,card-fields'` but **does not explicitly enable Venmo**, and does
**not** integrate **Apple Pay** or **Google Pay** (which, in PayPal, are separate SDK
components — `applepay` / `googlepay` — not part of the default `buttons`).

The owner wants to broaden accepted wallets to reduce checkout friction:
- **Venmo** — popular with the US fitness demographic; trivial to enable via PayPal.
- **Apple Pay** — one-tap on Apple devices; requires PayPal `applepay` component +
  **domain registration** (`.well-known` association file already obtained).
- **Google Pay** — one-tap on Android/Chrome; requires PayPal `googlepay` component.

## 2. Vision

Expand the wallet options available at checkout **through the neutral payment
interface**, so the checkout UI stays method-agnostic. The PayPal adapter enables and
renders the additional funding sources internally; pages/components never hardcode a
specific method. Fulfillment is unchanged — all methods resolve to the same
order-capture / subscription-activation paths and the same idempotent webhook.

## 3. Scope

**In scope:**
- **Phase 1:** Enable **Venmo** as a funding source on the existing Smart Buttons.
- **Phase 2:** Integrate **Apple Pay** and **Google Pay** as PayPal wallet
  components, including Apple Pay **domain registration**.
- Keep all method selection/rendering inside the PayPal adapter; expose only neutral
  capability flags to the app.

**Out of scope:**
- Live PayPal readiness (Feature 1) and discount codes (Feature 2) — independent,
  though all methods must coexist with a discounted amount.
- Non-PayPal wallet integrations (e.g. native Stripe Apple Pay) — Stripe is dormant.
- Changing fulfillment, tiers, or the neutral data model.

## 4. Goals

- **G1** — New wallets are available at checkout for eligible buyers/devices.
- **G2** — The checkout UI remains **method-agnostic**; no page/component references
  `venmo`, `applepay`, or `googlepay` — only the adapter does.
- **G3** — All methods use the **same** order/subscription create + capture +
  idempotent webhook fulfillment (zero new fulfillment paths).
- **G4** — New methods work alongside **discount codes** (the discounted, server-set
  amount applies regardless of funding source).
- **G5** — Sandbox-verifiable where PayPal supports it; documented device/domain
  prerequisites for Apple/Google Pay.

## 5. Functional Requirements

### Phase 1 — Venmo
- **FR-1 Enable Venmo funding.** The PayPal SDK load enables Venmo (e.g.
  `enable-funding=venmo`) so the Venmo button renders for eligible US buyers in
  supported contexts.
- **FR-2 Eligibility-guarded.** If Venmo is not eligible in a given context, its
  absence is non-fatal (the existing PayPal/card buttons still render) — mirroring the
  current eligibility-guarded card button.
- **FR-3 Same fulfillment.** A Venmo purchase (one-time or subscription) fulfills via
  the existing capture/activation + webhook paths with no new code.
- **FR-4 Works with discounts.** A Venmo one-time purchase honors a server-applied
  discount amount.

### Phase 2 — Apple Pay & Google Pay
- **FR-5 Apple Pay component.** Integrate PayPal's `applepay` component: render an
  Apple Pay button on eligible Apple devices/browsers; complete payment through the
  PayPal order/subscription flow.
- **FR-6 Apple Pay domain registration.** Host the
  `.well-known/apple-developer-merchantid-domain-association` file on `shrey.fit`
  (and any other checkout domain) and register the domain with PayPal/Apple so Apple
  Pay is authorized.
- **FR-7 Google Pay component.** Integrate PayPal's `googlepay` component: render a
  Google Pay button on eligible Android/Chrome contexts; complete payment through the
  PayPal order/subscription flow.
- **FR-8 Eligibility-guarded (wallets).** Apple/Google Pay buttons render only where
  eligible; their absence is non-fatal.
- **FR-9 Same fulfillment.** Apple/Google Pay purchases fulfill via the existing
  capture/activation + webhook paths.
- **FR-10 Neutral capability surface.** The app sees only neutral flags (e.g.
  `capabilities.wallets`) / logos; it does not branch on a specific wallet.
- **FR-11 Method logos.** `PaymentMethodLogos` is updated to reflect the newly
  available methods (Venmo, Apple Pay, Google Pay) where appropriate.

## 6. Non-Functional Requirements

- **NFR-1 Neutral interface.** All method-specific SDK config/rendering lives only in
  `app/src/lib/payments/providers/paypal.ts` (+ server adapter if needed). No app page
  imports a wallet SDK or references a method name.
- **NFR-2 No regression.** Existing PayPal/card/Pay Later buttons and both
  subscription + one-time flows continue to work unchanged.
- **NFR-3 Single SDK load.** Additional components/funding must be added to the
  **single** PayPal SDK `loadScript` call (the codebase already documents that a
  second script load breaks the first — see `paypal.ts`).
- **NFR-4 Performance.** Adding components must not materially slow checkout mount;
  eligibility checks gate rendering.
- **NFR-5 Security/compliance.** Apple Pay domain association is served correctly and
  kept in sync if domains change.

## 7. Acceptance Criteria

**Phase 1 (Venmo):**
- Venmo button renders for an eligible sandbox buyer; a Venmo one-time + subscription
  purchase fulfills via existing paths; non-eligibility is non-fatal.
- A Venmo one-time purchase with a discount code charges the discounted amount.
- No app code references `venmo`.

**Phase 2 (Apple/Google Pay):**
- Apple Pay button renders + completes on a real Apple device with the domain
  registered; Google Pay renders + completes on an eligible Android/Chrome context.
- Both fulfill via existing capture/activation + webhook paths.
- App remains method-agnostic; logos updated.

## 8. Open Questions / Assumptions

- **Assumption:** The single SDK load can host `buttons,card-fields` +
  `enable-funding=venmo` and the `applepay`/`googlepay` components together; exact
  component string to be confirmed in the design against current PayPal SDK docs.
- **Assumption:** Apple Pay requires the live domain (`shrey.fit`) verified; sandbox
  testing of Apple Pay is limited, so Apple Pay verification may occur partly on live
  (coordinated with Feature 1).
- **Assumption:** Apple Pay/Google Pay support both one-time orders and subscriptions
  via PayPal; if a wallet supports only one mode, the design will scope it accordingly.
- **Open:** Whether to surface a wallet on the signup checkout in addition to the
  unified `/checkout` page (default: both, since both use `ProviderCheckout`).
