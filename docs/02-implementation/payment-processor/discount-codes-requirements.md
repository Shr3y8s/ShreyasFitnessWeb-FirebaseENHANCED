# Discount Codes — Requirements

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 2 of 3 (discount codes)
> **Related:** `payment-processor-requirements.md`, `payment-processor-design.md`,
> `paypal-live-readiness-requirements.md`, `paypal-payment-methods-requirements.md`

---

## 1. Background & Problem

The app sells two subscription tiers (Online Coaching, Complete Transformation) and
two one-time session packages (single in-person, 4-pack) through PayPal Smart
Buttons + a guest card button. There is **no discount/promo-code capability today**.

Unlike Stripe Checkout (which has a built-in promo-code field and `allow_promotion_codes`),
**PayPal Smart Buttons have no built-in coupon field.** Discounts must therefore be
implemented as **our own provider-neutral system**: codes stored in Firestore,
validated and applied **server-side**, and translated into provider mechanics inside
the PayPal adapter only (order-amount override for one-time; subscription pricing
override / discounted-plan fallback for subscriptions).

The owner needs discount codes for:
1. **Friends & family / promotional pricing** (real customer-facing discounts).
2. A controlled **low-value live smoke test** (Feature 1) — a code that floors the
   price to ≈ $1 so the live PayPal path can be proven with a real, refundable charge.

## 2. Vision

A **provider-neutral discount-code system**: the app applies a code through the
neutral `PaymentProvider` interface; the active provider's adapter is solely
responsible for translating the validated discount into processor-specific calls.
Codes are **admin-managed**, validated/applied **server-side** (never trust the
client), support **percentage and fixed-amount** discounts on **both** one-time and
subscription purchases, and enforce a **minimum-charge floor** to prevent invalid
(< PayPal-minimum) or accidental free transactions.

## 3. Scope

**In scope:**
- A neutral discount model + Firestore schema (admin-managed).
- Server-side **validation** (existence, active, not expired, usage limits,
  applicability to the item) and **application** (compute discounted amount).
- One-time order discounting (order amount override).
- Subscription discounting: **first-cycle** and **recurring**, with a
  **discounted-plan fallback** where PayPal can't natively express the discount.
- A **minimum-charge floor** (e.g. $1.00) + an explicit **free-comp path**
  (100%-off) that bypasses the processor and fulfills/activates server-side.
- A **code-entry UI** in the unified checkout + signup checkout.
- An **admin UI** to create/manage codes and view redemptions.
- **GA4** analytics for code apply/redeem.
- Full **sandbox** testability (no live dependency to build/verify the feature).

**Out of scope:**
- Live PayPal config/smoke test itself (Feature 1 — this feature only *enables* it).
- Venmo / Apple Pay / Google Pay (Feature 3).
- Stripe discount implementation (Stripe adapter provides a documented no-op /
  "not supported" so the build stays green; can be implemented later).

## 4. Goals

- **G1** — Discounts flow entirely through the neutral interface; no page/component
  references PayPal or a PayPal discount mechanic.
- **G2** — Codes are validated and applied **server-side**; the client never sets the
  charged amount.
- **G3** — Support **percentage** and **fixed-amount** codes on **one-time** and
  **subscription** purchases (first-cycle and recurring).
- **G4** — A **minimum-charge floor** prevents sub-minimum / invalid charges; an
  explicit free-comp path handles genuine 100%-off without hitting the processor.
- **G5** — Admin can create, edit, deactivate, and audit codes via UI.
- **G6** — The entire feature is **developed and verified in sandbox**.

## 5. Functional Requirements

### Phase 1 (smoke-test capable — one-time only)
- **FR-1 Code model.** A discount code has: `code` (case-insensitive unique),
  `type` (`percentage` | `fixed`), `value`, `active`, optional `expiresAt`,
  optional `maxRedemptions` + `redemptionCount`, optional `appliesTo` (item/product
  scope), `minChargeFloor` (default $1.00), and `freeComp` (bool).
- **FR-2 Server-side validation.** A neutral callable validates a code against an
  item and returns a neutral result: `{ valid, reason?, originalAmount,
  discountedAmount, label }`. Validation checks active, expiry, redemption limit,
  and applicability.
- **FR-3 Apply to one-time order.** When a valid code is applied to a one-time
  checkout, the **server** creates/captures the PayPal order at the discounted
  amount (resolved server-side from the code + item — never from the client).
- **FR-4 Minimum-charge floor.** The discounted amount can never go below the code's
  `minChargeFloor` (≥ PayPal's transactional minimum). A discount that would breach
  the floor is clamped to the floor (configurable: clamp vs reject).
- **FR-5 Redemption recording.** On successful fulfillment, the server records a
  redemption (code, user, amount discounted, transaction id) and increments
  `redemptionCount` atomically.
- **FR-6 Checkout code-entry UI.** The unified `/checkout` page (and the signup
  checkout) shows a "Have a code?" field; applying updates the displayed total via
  the neutral validate call. The displayed total is informational; the server
  re-validates on capture.
- **FR-7 Admin code management (basic).** Admin can create a code (the fields in
  FR-1) and deactivate it. Minimum viable: create + list + deactivate.

### Phase 2 (full)
- **FR-8 Subscription first-cycle discount.** A code can discount the **first
  billing cycle** of a subscription (incl. the CT $60 setup fee handling), applied
  server-side at subscription-create time.
- **FR-9 Subscription recurring discount.** A code can discount **every** cycle. Where
  PayPal can't natively express an ongoing discount on an existing plan, the system
  uses a **discounted-plan fallback**: a pre-created discounted Billing Plan that the
  subscription is created against (documented, owner-confirmed workaround).
- **FR-10 Free-comp path.** A 100%-off code (or `freeComp: true`) **bypasses PayPal**
  entirely: the server fulfills/activates the account (one-time package or
  subscription entitlement) and records a $0 redemption, without a processor charge.
  Clearly separated from the floored paid path.
- **FR-11 Usage limits & expiry enforced.** `maxRedemptions`, per-user limits (if
  set), and `expiresAt` are enforced server-side on both validate and apply.
- **FR-12 Admin UI (full).** Admin can edit codes, set all limits/scopes, see
  redemption history + counts, and create the smoke-test code.
- **FR-13 GA4 analytics.** Emit events on code apply (success/failure) and on
  redeemed purchase (with code + discount amount) without exposing secrets.

## 6. Non-Functional Requirements

- **NFR-1 Security.** All validation/application is server-side; the client cannot
  influence the charged amount. Codes are not guessable resources (read via callable,
  not open Firestore reads of the whole collection).
- **NFR-2 Atomicity.** Redemption count increments and limit checks are transactional
  to prevent over-redemption under concurrency.
- **NFR-3 Idempotency.** Applying a discount must not break the existing idempotent
  fulfillment (webhook backup + synchronous path); a redemption is recorded once per
  transaction.
- **NFR-4 Neutral model.** No PayPal-specific concept leaks into neutral types or app
  code; the adapter owns all translation.
- **NFR-5 Sandbox-first.** The whole feature is verifiable in PayPal sandbox.
- **NFR-6 Backward compatible.** Checkouts without a code behave exactly as today.

## 7. Acceptance Criteria

**Phase 1:**
- An admin-created percentage and fixed code each correctly discount a one-time
  purchase in sandbox; the captured amount matches the server-computed discounted
  amount; redemption recorded; floor enforced.
- A `SMOKETEST` code floors a $75 item to $1.00 in sandbox end-to-end (then usable
  for the Feature 1 live test).
- No app code references PayPal; all via neutral interface.

**Phase 2:**
- First-cycle and recurring subscription discounts work in sandbox (recurring via the
  discounted-plan fallback where needed).
- A 100%-off/free-comp code activates an account with no processor charge and a $0
  redemption.
- Usage limits + expiry enforced; admin UI manages all of the above; GA4 events fire.

## 8. Open Questions / Assumptions

- **Floor value:** assume **$1.00** default `minChargeFloor`; confirm PayPal's exact
  transactional minimum for USD (design will validate).
- **Floor breach behavior:** assume **clamp to floor** (a 100%-off paid code becomes a
  $1.00 charge) unless `freeComp` is set, in which case use the free-comp bypass.
- **Per-user limits:** assume optional; default is global `maxRedemptions` only.
- **Recurring discount fallback:** assume the discounted-plan workaround is acceptable
  (owner-confirmed) when a native ongoing discount isn't expressible.
