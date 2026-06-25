# Additional Payment Methods (Venmo, Apple Pay, Google Pay) — Tasks

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 3 of 3 (additional payment methods via PayPal checkout)
> **Requirements:** `paypal-payment-methods-requirements.md`
> **Design:** `paypal-payment-methods-design.md`

---

## How to use

Two phases. **Phase 1 (Venmo)** is small and runs first in the overall staging.
**Phase 2 (Apple/Google Pay)** runs last (after live + discounts). Every task obeys
the neutral-interface rule (no wallet name in app/pages/components — only the adapter).

---

# PHASE 1 — Venmo  ✅ COMPLETE (verified in sandbox 2026-06-24)

> Implemented + checked in. Also delivered alongside: a controlled, boxed
> payment-method layout (Card → PayPal → More ways to pay), checkout right-side
> accepted-methods sidebar, and enlarged Google Pay / Apple Pay logos.

## T1 — Enable Venmo funding

- [x] **T1.1** In `app/src/lib/payments/providers/paypal.ts` `loadPayPal(...)`, add
      `enableFunding: 'venmo'` to the single `loadScript` options (do NOT add a second
      load — NFR-3).
- [x] **T1.2** Venmo renders via its own eligibility-guarded `FUNDING.VENMO` button in
      the "More ways to pay" boxed section of `renderCheckout` (each funding source
      rendered explicitly for controlled order); cleanup closes all instances.

## T2 — Verify fulfillment + discounts (SANDBOX)

- [x] **T2.1** Confirm a Venmo **one-time** purchase captures + fulfills via the
      existing `capturePaypalOrder` + `PAYMENT.CAPTURE.COMPLETED` path.
- [x] **T2.2** Confirm a Venmo **subscription** activates via the existing
      create + synchronous confirmation + `BILLING.SUBSCRIPTION.ACTIVATED` path.
- [x] **T2.3** Confirm a non-eligible context omits Venmo without breaking the PayPal/
      card buttons (FR-2).
- [ ] **T2.4** (Deferred to Feature 2 phase 1) Confirm a discounted Venmo one-time
      charges the server-set discounted amount (FR-4).

## T3 — Logos & neutral copy

- [x] **T3.1** Add a Venmo mark to `PaymentMethodLogos` where appropriate.
- [x] **T3.2** Confirm no app page/component references `venmo` (adapter-only — G2).

## T4 — Phase 1 acceptance

- [x] **T4.1** Venmo renders + completes (one-time + subscription) in sandbox.
- [x] **T4.2** Non-eligibility non-fatal; no regression to existing buttons (NFR-2).
- [x] **T4.3** Neutral-interface audit clean.


---

# PHASE 2 — Apple Pay & Google Pay

## T5 — SDK components

- [ ] **T5.1** Add `applepay,googlepay` to the single SDK load `components` string in
      `loadPayPal(...)` (confirm exact names vs current PayPal docs); ensure the
      existing `buttons,card-fields` + Venmo funding still load from the one call.

## T6 — Google Pay

- [ ] **T6.1** Confirm the merchant is enabled for Google Pay in the PayPal dashboard.
- [ ] **T6.2** Implement `paypal.Googlepay()` flow in `renderCheckout`: eligibility +
      config fetch, render button into an isolated DOM node, build payment request,
      confirm the PayPal order/subscription on authorization; extend cleanup.
- [ ] **T6.3** Verify a Google Pay one-time + subscription fulfill via existing paths
      in an eligible Chrome/Android context.

## T7 — Apple Pay domain registration

- [ ] **T7.1** Move the obtained
      `apple-developer-merchantid-domain-association` file into
      `app/public/.well-known/`.
- [ ] **T7.2** Verify `https://shrey.fit/.well-known/apple-developer-merchantid-domain-association`
      returns 200 with correct content (check `next.config.ts` doesn't strip it).
- [ ] **T7.3** Register `shrey.fit` as an Apple Pay web domain in the PayPal dashboard.

## T8 — Apple Pay component

- [ ] **T8.1** Implement `paypal.Applepay()` flow in `renderCheckout`: eligibility
      (`ApplePaySession` + merchant capabilities), render button into an isolated DOM
      node, create order/subscription, run the Apple Pay sheet, confirm with PayPal;
      extend cleanup.
- [ ] **T8.2** Verify Apple Pay one-time on a real Apple device against the registered
      live domain; confirm fulfillment via existing paths.
- [ ] **T8.3** Confirm/scope subscription support via Apple Pay (fall back to existing
      buttons if unsupported).

## T9 — Neutral capability + logos

- [ ] **T9.1** Add `ProviderCapabilities.wallets?: boolean` to
      `app/src/lib/payments/types.ts`; set `true` in PayPal adapter, `false` in Stripe.
- [ ] **T9.2** Add Apple Pay + Google Pay marks to `PaymentMethodLogos`; update neutral
      checkout copy if needed (no method-specific branching in the page).

## T10 — Phase 2 acceptance

- [ ] **T10.1** Apple Pay renders + completes on a real Apple device (domain
      registered); Google Pay renders + completes in an eligible context.
- [ ] **T10.2** Both fulfill via existing capture/activation + webhook paths (G3).
- [ ] **T10.3** App remains method-agnostic; `.well-known` returns 200; logos updated.
- [ ] **T10.4** Neutral-interface audit clean.

---

## Acceptance (maps to requirements §7)

**Phase 1 (Venmo)**
- [ ] Venmo renders for eligible buyer; one-time + subscription fulfill; non-eligible
      non-fatal; discounted Venmo one-time charges discounted amount; no `venmo` in app.

**Phase 2 (Apple/Google Pay)**
- [ ] Apple Pay (domain registered) + Google Pay render + complete; both fulfill via
      existing paths; app method-agnostic; logos updated.
