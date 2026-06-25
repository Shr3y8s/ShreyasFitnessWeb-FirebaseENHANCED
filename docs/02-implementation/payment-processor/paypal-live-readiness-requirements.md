# PayPal Live Readiness — Requirements

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 1 of 3 (PayPal live status & gaps)
> **Related:** `payment-processor-requirements.md`, `payment-processor-design.md`,
> `discount-codes-requirements.md`, `paypal-payment-methods-requirements.md`

---

## 1. Background & Problem

PayPal is the sole active payment processor (Stripe was rejected — see
`payment-processor-requirements.md` §1). The PayPal **code** is implemented and
working in **sandbox** (`npm run dev`): Smart Buttons + dedicated card button for
both subscription and one-time checkout, server-side order capture, synchronous
subscription confirmation, and idempotent webhook fulfillment.

Production (`shrey.fit`) is configured to use **live** PayPal:
- `app/apphosting.yaml` sets `NEXT_PUBLIC_PAYPAL_ENV=production` + a live
  `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
- `app/src/lib/constants.ts` `LIVE_PLANS` holds real `P-...` billing-plan ids
  (catalog run 2026-06-21).
- `firebase/functions/payments/providers/paypal.js` `PLAN_TIER_MAP` maps the live
  plan ids → app tiers.
- A dedicated `paypalWebhookLive` Cloud Function binds the live secret set.

**However, no live transaction has ever been completed.** Before a real customer
(or the owner) runs a live checkout on `shrey.fit`, we must verify that the
production configuration (secrets, webhook registration, PayPal app settings) is
complete and correct — these are **config gaps**, not code gaps. A failed first
live charge (no fulfillment, no account activation, money taken) is the worst
possible launch outcome.

## 2. Vision

A documented, repeatable **go-live verification** that proves the live PayPal path
works end-to-end **before** depending on it for real customers — culminating in a
single controlled **low-value live smoke test** (≈ $1, enabled by the discount-code
feature) that exercises the full chain: checkout → capture → webhook → fulfillment
→ account activation → refund.

## 3. Scope

**In scope:**
- Audit + close the production **configuration** gaps required for live PayPal.
- A go-live checklist and a verification/smoke-test procedure.
- Confirmation that the app talks only to the neutral `PaymentProvider` interface
  on the live path (no regressions).

**Out of scope (covered by other specs):**
- The discount-code system itself (Feature 2) — only *consumed* here to enable the
  ≈ $1 smoke test.
- Venmo / Apple Pay / Google Pay (Feature 3).
- Any change to the neutral interface or fulfillment logic (already live-shaped).

## 4. Goals

- **G1** — A real live PayPal subscription **and** one-time purchase can be
  completed on `shrey.fit` and correctly fulfill (activate account / grant
  sessions) via the live webhook + synchronous confirmation.
- **G2** — Zero hardcoded provider references leak into the app layer on the live
  path; everything routes through `@/lib/payments`.
- **G3** — The go-live steps are documented and repeatable (re-runnable if
  credentials rotate).
- **G4** — A safe, reversible **smoke test** (low-value live charge + refund)
  proves the path without risking a large erroneous charge.

## 5. Functional Requirements

- **FR-1 Live credentials present.** The live secret set
  (`PAYPAL_CLIENT_ID_LIVE`, `PAYPAL_CLIENT_SECRET_LIVE`, `PAYPAL_WEBHOOK_ID_LIVE`)
  exists in Google Cloud Secret Manager and is bound to the fulfilling functions
  (`paypalWebhookLive`, the PayPal callables, and any account-deletion function
  that binds `PAYPAL_SECRETS`).
- **FR-2 Live client id published.** `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in
  `apphosting.yaml` is the **live** app's client id (not a sandbox/placeholder),
  and `NEXT_PUBLIC_PAYPAL_ENV=production`.
- **FR-3 Live billing plans valid.** `LIVE_PLANS` ids resolve to ACTIVE billing
  plans in the live PayPal account, and each maps to the correct tier in the
  server `PLAN_TIER_MAP`.
- **FR-4 Live webhook registered.** A webhook in the **live** PayPal dashboard
  points at the deployed `paypalWebhookLive` URL and is subscribed to all events
  the parser handles (see FR-6). `PAYPAL_WEBHOOK_ID_LIVE` equals that webhook's id.
- **FR-5 Live app capabilities.** The live PayPal app has the funding sources and
  capabilities needed by the current checkout enabled (PayPal wallet, guest/“Debit
  or Credit Card” button; Vault if card-subscription paths are ever re-enabled).
- **FR-6 Event coverage.** The live webhook subscription includes, at minimum:
  `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`,
  `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`,
  `BILLING.SUBSCRIPTION.SUSPENDED`, `PAYMENT.SALE.COMPLETED`,
  `PAYMENT.SALE.REFUNDED`, `PAYMENT.CAPTURE.COMPLETED`,
  `PAYMENT.CAPTURE.REFUNDED`, `CHECKOUT.ORDER.APPROVED`.
- **FR-7 Live one-time smoke test.** Using a discount code (Feature 2) that floors
  the price at ≈ $1, complete a **live** one-time purchase on `shrey.fit`, confirm
  the session package is granted and a transaction record is written, then **refund**
  it from the live PayPal dashboard and confirm the neutral record reflects the
  refund.
- **FR-8 Live subscription verification.** Either via the same low-value approach
  or a real first cycle, confirm a live subscription activates the account
  (`accountActivated`), writes the neutral subscription record, and rolls billing
  fields forward on renewal.
- **FR-9 Neutral-interface compliance.** Verify (by code audit) that no app page or
  component imports PayPal SDK/types directly on the live path — all access is via
  `@/lib/payments`.

## 6. Non-Functional Requirements

- **NFR-1 Reversibility.** The smoke test must be fully refundable; no test leaves
  a customer charged or an account in a bad state.
- **NFR-2 Idempotency unchanged.** Live fulfillment must remain idempotent (webhook
  backup + synchronous path must not double-fulfill).
- **NFR-3 Observability.** Live webhook + callable activity must be inspectable via
  Cloud Functions logs to diagnose any failed first charge.
- **NFR-4 Secret hygiene.** Live secrets never appear in source, `apphosting.yaml`
  plaintext, client bundle, or logs.

## 7. Acceptance Criteria

- A completed live one-time purchase on `shrey.fit` grants sessions and is then
  refunded, with neutral records correct at each step (FR-7).
- A live subscription activation is confirmed end-to-end (FR-8).
- The go-live checklist is fully checked, with the live webhook id matching the
  registered webhook and all FR-6 events subscribed.
- Code audit confirms neutral-interface-only access on the live path (FR-9).

## 8. Open Questions / Assumptions

- **Assumption:** The live billing plans created 2026-06-21 are still ACTIVE and
  priced correctly ($250/mo; CT carries the $60 setup fee). To be confirmed in the
  design's verification step.
- **Assumption:** The smoke test depends on Feature 2 (discount codes) phase 1 being
  available so the live charge can be floored to ≈ $1. If discounts slip, an
  alternative is a temporary low-priced one-time item — but the discount path is
  preferred (and is itself sandbox-proven first).
