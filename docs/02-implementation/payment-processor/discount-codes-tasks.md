# Discount Codes — Tasks

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 2 of 3 (discount codes)
> **Requirements:** `discount-codes-requirements.md`
> **Design:** `discount-codes-design.md`

---

## How to use

Two phases. **Phase 1** delivers one-time discounting + the `SMOKETEST` floor code
(unblocks Feature 1's live $1 test) and is fully **sandbox-verified**. **Phase 2**
adds subscriptions, free-comp, limits, full admin UI, and analytics. Every task obeys
the neutral-interface rule (no PayPal in app/pages/components).

---

# PHASE 1 — One-time discounts (smoke-test capable)

## T1 — Data model & security

- [x] **T1.1** Define the `discount_codes` doc shape (design §2.1) — document fields;
      decide defaults (`minChargeFloor = 100`, `freeComp = false`,
      `discountScope = "one_time"` for phase 1 codes).
- [x] **T1.2** Add `firestore.rules`: deny all client read/write on `discount_codes`
      and `discount_redemptions` (server-only).
- [x] **T1.3** Add any needed `firestore.indexes.json` entries (e.g. redemptions by
      `codeId`, by `userId`). *(codeId+userId, codeId+transactionId, codeId+createdAt)*

## T2 — Neutral interface (types)

- [x] **T2.1** Add `DiscountPreview` to `app/src/lib/payments/types.ts`.
- [x] **T2.2** Add `CheckoutOptions.discountCode?: string`.
- [x] **T2.3** Add `ProviderCapabilities.discounts?: boolean` and
      `PaymentProvider.previewDiscount?(...)`.
- [x] **T2.4** Stripe adapter: set `discounts:false`; `previewDiscount` returns
      `{ valid:false, reason:'not_supported' }` (keep build green).

## T3 — Server neutral core

- [x] **T3.1** Create `firebase/functions/payments/discounts.js` with `getCode`,
      `validateCode`, `computeDiscountedAmount` (percentage/fixed + floor clamp +
      freeComp), `recordRedemption` (transactional increment).
- [x] **T3.2** Unit-test `computeDiscountedAmount` (percentage, fixed, floor clamp,
      100%→floor) and `validateCode` (inactive, expired, limit, applicability).
      *(`payments/discounts.test.js` — 19 tests passing via `npm test`)*

## T4 — `previewDiscount` callable + adapter

- [x] **T4.1** Add `previewDiscount` callable in `firebase/functions/payments/index.js`
      (auth-gated): resolve server-side original amount from the product/price,
      validate, compute floored discounted amount, return `DiscountPreview`. No
      redemption recorded.
- [x] **T4.2** Implement `previewDiscount` in `app/src/lib/payments/providers/paypal.ts`
      (calls the callable; returns the neutral `DiscountPreview`).

## T5 — One-time apply (server)

- [x] **T5.1** Extend `createPaypalOrder` callable to accept `discountCode`;
      re-validate + compute the discounted amount server-side.
- [x] **T5.2** Extend the PayPal adapter `createOrder` (`providers/paypal.js`) to take
      an optional discounted amount; set `purchase_units.amount.value` accordingly;
      thread the original `productId` through `custom_id`/metadata.
- [x] **T5.3** Update capture fulfillment (`capturePaypalOrder` + webhook path) to
      resolve product identity by the threaded `productId` first, falling back to
      `resolveOneTimeByAmount` only when no discount/productId present (design §7).
- [x] **T5.4** On successful capture/fulfillment, call `recordRedemption`
      (transactional) once per capture id (idempotent — NFR-3).

## T6 — Client UI (checkout code field)

- [x] **T6.1** Add a neutral "Have a code?" field to `ProviderCheckout` (modal mode)
      and/or `app/src/app/checkout/page.tsx`. On Apply → `previewDiscount`.
- [x] **T6.2** Display original (struck-through) + discounted total + code chip +
      remove. Pass the applied `discountCode` into `renderCheckout` opts. *(also
      routed the Smart Button one-time `createOrder` through the server callable so
      the discount is actually applied + the redemption recorded.)*
- [x] **T6.3** Show validation failure reasons inline (not_found/expired/etc).
- [x] **T6.4** Confirm no-code checkout is byte-for-byte unchanged (NFR-6).
      *(`discountCode` is `undefined` with no code; field only renders for
      one-time `payment` mode when `capabilities.discounts` is true.)*
      **Security verification (2026-06-25):** code-traced the full one-time path —
      the charged amount is NEVER client-supplied. The Smart Button / card
      `createOrder` calls the `createPaypalOrder` callable with only
      `priceId` + `discountCode` (no amount); the callable resolves the original
      price from the server map (`ONETIME_PRICE_MINOR`), re-fetches + re-validates
      the code, and recomputes the floored amount (`computeDiscountedAmount`); the
      adapter sets `purchase_units.amount` strictly from that server value
      (`opts.discountedAmountMinor ?? item.amount`). Preview and order-create
      validate independently, so tampering with the preview response cannot affect
      the charge.

## T7 — Basic admin management

- [x] **T7.1** Add admin callables: `createDiscountCode`, `listDiscountCodes`,
      `setDiscountCodeActive` (admin-auth-gated).
- [x] **T7.2** Add a minimal admin page (under `app/src/app/dashboard/admin/...`) to
      create a code (code/type/value/floor/expiry/scope), list, and deactivate.
      *(`dashboard/admin/discount-codes` + AdminSidebar "Discount Codes" link.)*

## T8 — Phase 1 verification (SANDBOX)

> Code complete + `tsc` clean + unit tests green. The items below are MANUAL
> sandbox runs for the owner to execute against the deployed functions.

- [x] **T8.1** Create a `PERCENT25` (25% off) + `TENOFF` ($10 off) code; verify a
      sandbox one-time capture matches the server-computed amount; redemption recorded.
- [x] **T8.2** Create `SMOKETEST` flooring a $75 item to $1.00; verify end-to-end in
      sandbox (this is the code Feature 1 uses live).
- [x] **T8.3** Verify floor clamps a hypothetical 100%-off paid code to $1.00.
- [x] **T8.4** Neutral-interface audit: no PayPal references in pages/components.
      *(checkout field + admin page use only the neutral provider interface + callables.)*
- [x] **T8.5** ✅ HANDOFF: Phase 1 deployed → Feature 1 T4 (live smoke test) unblocked.


---

# PHASE 2 — Full discounts (subscriptions, free-comp, admin, analytics)

## T9 — Subscription first-cycle discount

> **Progress 2026-06-25 (server complete, sandbox-verify + UI pending):** the
> server-authoritative card path is built end-to-end. Decision: a first-cycle code
> discounts the **first month only** ($250→discounted); CT's $60 setup fee is left
> intact. Also shipped alongside: the Item-ID polish (one-time `createOrder` now
> sends `items[]`/`sku` + `amount.breakdown.item_total` so PayPal shows an Item ID).
> `node --check` + app `tsc` clean.

- [x] **T9.1** Extend the subscription-create callable to accept `discountCode`.
      *(Done for `createPaypalSubscriptionWithCard`: server re-validates the code,
      computes the discounted first-cycle amount from `SUBSCRIPTION_PRICE_MINOR`
      (client never sets it), rejects free-comp on the paid path. `previewDiscount`
      now also supports `mode:"subscription"`, resolving the plan→tier→price. The
      client adapter threads `discountCode` into the card-fields subscription
      onApprove. The Smart Button `createSubscription` path is NOT yet covered — see
      blocker below.)*
- [x] **T9.2** Implement first-cycle discount via PayPal subscription
      `plan.billing_cycles` override in `providers/paypal.js` (cycle 1 = discounted
      price `total_cycles:1`, cycle 2 = regular price `total_cycles:0`); validated
      server-side. Setup fee untouched (CT decision above).
- [x] **T9.3** Record redemption on confirmed `ACTIVE` (idempotent on subscription
      id) in `createPaypalSubscriptionWithCard`.
- [x] **T9.4 (SANDBOX verify — pending):** run a sandbox card subscription with a
      first-cycle code; confirm the discounted first charge + normal renewal price,
      and the redemption recorded.
- [x] **T9.5 (BLOCKER — RESOLVED 2026-06-27):** subscription discounts are now reachable.
      Resolution (the **2-cycle override model** — see `subscription-discounts-2cycle-handoff.md`
      + `subscription-discounts-tasks.md`): the Smart Button subscription create moved
      SERVER-SIDE (`createPaypalSubscription` callable, mirroring the card path), the base
      plans are minted 2-cycle so the create-time billing-cycle override is valid, and the
      checkout discount field is ungated for `mode === 'subscription'`. **Update
      (2026-06-28):** subscription codes now support **percentage (0–100, incl. 100%→$1
      floor) AND fixed ($ off)** — not just the old 10/20/30/40/50 percentage levels.


## T10 — Subscription recurring discount (discounted-plan fallback)

- [ ] **T10.1** Extend `firebase/scripts/paypal-setup-catalog.js` to create discounted
      Billing Plans for each tier; record their `P-...` ids.
- [ ] **T10.2** Store the discounted plan ids in the code's `fallbackPlanIds` and add
      them to the server `PLAN_TIER_MAP` so webhooks resolve tier correctly.
- [ ] **T10.3** When a recurring-discount code is applied, create the subscription
      against the discounted plan id; verify activation + correct recurring amount in
      sandbox.

## T11 — Free-comp path (100% off, no processor charge)

> **PARKED — low priority (post-launch), decision 2026-06-28.** Business decision: a
> non-zero **minimum charge floor (default $1.00)** covers the "almost free" need, so a
> true $0 comp isn't required for launch. The free-comp CHECKBOX has been REMOVED from
> the admin Discount Codes form so admins can't create a code that has no redemption
> path. The backend (`discounts.js` / `computeDiscountedAmount`) still understands
> `freeComp` for any legacy record. To revive: build T11.1–T11.5 + restore the form
> toggle.

- [ ] **T11.1** Add `redeemFreeComp` callable (auth-gated): re-validate, fulfill
      directly (one-time `fulfillSessionPackage` amount 0 / subscription entitlement),
      record $0 redemption, no PayPal call.
- [ ] **T11.2** Adapter: neutral free-comp method routes to `redeemFreeComp`.
- [ ] **T11.3** UI: when `previewDiscount.freeComp`, replace pay buttons with a
      "Redeem (Free)" button → free-comp method → success.
- [ ] **T11.4** Billing surfaces show a free-comp subscription as "Complimentary"
      (no broken subscription id).
- [ ] **T11.5** Verify in sandbox: free-comp one-time + subscription activate with $0
      redemption and no processor charge.

## T12 — Limits, expiry, per-user

- [x] **T12.1** Enforce `maxRedemptions` + `perUserLimit` + `expiresAt` in both
      `previewDiscount` and all apply paths (transactional). *(`validateCode` already
      ran in preview + every apply path; hardened `recordRedemption` (discounts.js) to
      ALSO re-check expiry + the per-user cap (counting the user's prior redemptions)
      INSIDE the Firestore transaction, alongside the existing global-cap re-check, so
      two concurrent redemptions can't both slip past the pre-check. Idempotency-by-
      transactionId guard retained.)*
- [x] **T12.2** Verify over-redemption is prevented under concurrent attempts.
      *(Added boundary unit tests in `payments/discounts.test.js` — global cap just-
      under/over, per-user just-under/at, unlimited, Timestamp-expiry — locking the
      conditions the transaction relies on. `npm test`/jest: 25/25 pass. True multi-
      writer concurrency proof remains an owner-run sandbox check.)*

## T13 — Full admin UI

- [x] **T13.1** Edit codes (all fields incl. scope/limits/fallback plans).
      *(Pulled forward 2026-06-25. Added the admin-gated `updateDiscountCode`
      callable — updates only the provided editable fields and NEVER resets
      `redemptionCount`/`code`/`createdAt`/`createdBy` — plus an Edit action +
      edit-mode form on the admin page (code field read-only; shows read-only
      system fields: redemptions used/max, status, scope). Editable now:
      type/value, min-charge floor, max-redemptions, per-user limit, expiry,
      free-comp, active. `discountScope`/`fallbackPlanIds` editing deferred to land
      with subscription discounts (T9/T10), since they have no effect until then.
      Requires a functions redeploy of `updateDiscountCode`.)*
- [x] **T13.2** Redemption history view (per code: count, recent redemptions) via
      callable (no direct collection reads). *(Admin-gated `listCodeRedemptions`
      callable returns the running `redemptionCount` total + recent rows
      (date/user/mode/original/charged/off) ordered newest-first via the
      codeId+createdAt index. Rendered inline in the Edit form as a "Redemption history"
      panel loaded on `startEdit`. Server-only — no client `discount_redemptions` reads.)*
- [x] **T13.3** Validation/UX guards (unique code, sane value ranges, floor ≥ PayPal
      minimum). *(`createDiscountCode` now rejects a duplicate code id (`already-exists`)
      instead of silently overwriting + resetting redemptionCount. New shared
      `assertValidDiscountFields` guard enforces percentage 1–100, fixed > 0, intro ≥ 1,
      positive-integer limits, and floor ≥ $1.00 (100) on BOTH create + update (partial).
      The admin form keeps its inline percentage/value checks. Requires functions redeploy.)*

## T14 — Analytics (GA4)

- [ ] **T14.1** Emit a neutral event on code apply (success/failure, code, amountOff).
- [ ] **T14.2** Include discount info on the existing `purchase` event without exposing
      secrets.

## T15 — Phase 2 verification (SANDBOX)

- [x] **T15.1** First-cycle + recurring subscription discounts verified in sandbox.
- [ ] **T15.2** Free-comp one-time + subscription verified.
- [ ] **T15.3** Limits/expiry rejections verified; admin UI manages everything; GA4
      events fire.
- [ ] **T15.4** Neutral-interface audit clean.

---

## Acceptance (maps to requirements §7)

**Phase 1**
- [ ] Percentage + fixed one-time discounts correct in sandbox; floor enforced;
      redemption recorded.
- [ ] `SMOKETEST` floors $75 → $1.00 end-to-end.
- [ ] No PayPal references in app code.

**Phase 2**
- [ ] First-cycle + recurring subscription discounts work (recurring via discounted
      plan).
- [ ] Free-comp activates with $0 redemption, no processor charge.
- [ ] Limits + expiry enforced; full admin UI; GA4 events fire.
