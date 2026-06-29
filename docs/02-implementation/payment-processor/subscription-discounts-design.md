# Subscription Discounts (PayPal discounted-plan fallback) — Design

Status: Draft. Implements `subscription-discounts-requirements.md`. PayPal is the live
processor; Stripe is dormant. Sandbox/dev only (no prod clients → no back-compat).

> **MODEL UPDATE (2026-06-27): SHIPPED as the 2-cycle override model — NOT the 22-plan
> matrix below.** §§1–6 and §10–§12 originally specified "2 base + 20 pre-created
> discounted plans" with a `DISCOUNTED_PLAN_INDEX`. That was replaced before launch by
> the simpler **2-cycle override** approach (source of truth:
> `subscription-discounts-2cycle-handoff.md`):
> - Mint exactly **2 base plans** (OC, CT), each **2-cycle**: TRIAL (seq 1) + REGULAR
>   (seq 2), both at the regular price.
> - Apply discounts as a **create-time `plan.billing_cycles` override** computed
>   server-side in `resolveSubscriptionPlan` → `buildPriceOverride({scope,
>   discountedMinor, regularMinor, trialCycles})`. Intro = reprice seq 1 (TRIAL,
>   `total_cycles:N`) → PayPal auto-reverts after N; recurring = reprice both cycles.
> - Any percentage 0–100 is allowed (the fixed 10/20/30/40/50 level set was dropped);
>   the server computes the discounted price and rejects anything that doesn't reduce it.
> - There is **no** `DISCOUNTED_PLAN_INDEX` / `fallbackPlanIds` / 20 discounted plans.
>   `PLAN_TIER_MAP` holds only the 2 base ids per env.
> The sections below are kept for history; read them through this model.

## 1. Approach

PayPal cannot discount a subscription at create-time via a `billing_cycles` override
(INVALID_BILLING_CYCLE_SEQUENCE — see requirements §1) **when the base plan has only one
cycle**. The shipped fix is a **2-cycle base plan** (TRIAL seq 1 + REGULAR seq 2) so a
create-time override can REPRICE the existing cycles (PayPal can reprice existing cycles,
just not ADD one). The discount lives in a per-subscriber create-time override, NOT in a
separate pre-created plan. (The original "pre-create discounted Billing Plans" approach
in §2 was superseded — see the MODEL UPDATE banner above.)

## 2. Plan matrix (22 plans) — SUPERSEDED (historical)
> Replaced by the 2-cycle override model (see banner). Kept for history only.


Base monthly: OC = `20000` minor ($200), CT = `25000` minor ($250).

For each tier T ∈ {OC, CT}, base price `B`, and level d ∈ {10,20,30,40,50}:
- **recurring** plan: single REGULAR cycle (∞) at `round(B × (1 − d/100))`.
- **first_cycle (intro)** plan: cycle 1 = TRIAL tenure, `total_cycles: 1`, price
  `round(B × (1 − d/100))`; cycle 2 = REGULAR tenure (∞) at `B`.

Counts: 2 base + (2 tiers × 5 levels × 2 scopes) = **2 + 20 = 22**.

Discounted amounts (minor units):

| Level | OC recurring / intro-month | CT recurring / intro-month |
|------:|---------------------------:|---------------------------:|
| 10%   | 18000 ($180)               | 22500 ($225)               |
| 20%   | 16000 ($160)               | 20000 ($200)               |
| 30%   | 14000 ($140)               | 17500 ($175)               |
| 40%   | 12000 ($120)               | 15000 ($150)               |
| 50%   | 10000 ($100)               | 12500 ($125)               |

(Intro plans: the month-1 price = the column value; months 2+ = base B.)

## 3. Catalog script (`firebase/scripts/paypal-setup-catalog.js`)

Extend to:
- Set OC monthly `200.00`, CT monthly `250.00`, **remove CT `setupFee`**.
- After creating each tier's base product + base plan, generate the 10 discounted plans
  for that tier (5 levels × {recurring, intro}) under the SAME catalog product.
- Naming convention so ids are self-describing in the PayPal dashboard:
  `"<Tier> — <d>% off (recurring)"` and `"<Tier> — <d>% off (first month)"`.
- Print a paste-ready block for `constants.ts` containing base + discounted ids keyed by
  `TIER_SCOPE_LEVEL` (e.g. `OC_RECURRING_20`, `CT_FIRST_30`).
- The $60 CT session is a one-time Orders item — **no plan**; it's only an amount in
  `PAYPAL_ONETIME` (no catalog entry needed). The script just prints a reminder.

Cleanup helper (separate script or `--deactivate-old` flag): deactivate the old base
plan ids via `POST /v1/billing/plans/{id}/deactivate`. Cancelling test subscriptions +
deleting test users is done with existing scripts (`bulk-delete-test-accounts.js`) and
the cancel callable.

## 4. Constants & maps (`app/src/lib/constants.ts`, `providers/paypal.{js,ts}`)

- `SANDBOX_PLANS` / `LIVE_PLANS`: new base ids for `ONLINE_COACHING`, `COMPLETE_TRANSFORMATION`.
- New `SANDBOX_DISCOUNTED_PLANS` / `LIVE_DISCOUNTED_PLANS` keyed by `TIER_SCOPE_LEVEL`,
  exposed as `PAYPAL_DISCOUNTED_PLANS` (env-selected, same pattern as `PAYPAL_PLANS`).
- App subscription tier ids stay `online_coaching` / `complete_transformation`.

Server adapter (`providers/paypal.js`):
- `PLAN_TIER_MAP`: add ALL 20 discounted plan ids → their tier (`online_coaching` /
  `complete_transformation`) so `resolvePlanTier` keeps resolving tier for webhooks.
- `DISCOUNTED_PLAN_INDEX`: `{ [tierId]: { first_cycle: {10:P,20:P,...}, recurring: {...} } }`
  for create-time selection. Built from the same constants.


## 5. Discount-code schema (Firestore `discount_codes/{CODE}`)

Existing fields plus (already partly present):
- `discountScope`: `'one_time' | 'first_cycle' | 'recurring'`.
- `type`: `'percentage'`; `value`: one of 10/20/30/40/50 (subscription codes).
- `appliesTo.modes`: gate to `['subscription']` or `['payment']` as appropriate.
- `fallbackPlanIds`: OPTIONAL explicit override map `{ online_coaching: 'P-...',
  complete_transformation: 'P-...' }`. When absent, the server derives the plan from
  `DISCOUNTED_PLAN_INDEX[tier][scope][value]`. (Explicit map supports bespoke promos.)

`discounts.js` stays the math/validation core; plan SELECTION lives in the callable
(provider-specific), not in the neutral core.

## 6. Subscription create flow (`payments/index.js`)

`createPaypalSubscription` (Smart Button) and `createPaypalSubscriptionWithCard` (ACDC):

```
uid, planId(base), discountCode?, paypalEnv
 → if discountCode:
     codeDoc = getCode(code); validate (scope subscription, level ∈ allowed, limits)
     tier = resolvePlanTier(planId).tierId            // base plan → tier
     scope = codeDoc.discountScope                     // first_cycle | recurring
     level = codeDoc.value
     targetPlanId = codeDoc.fallbackPlanIds?.[tier]
                 ?? DISCOUNTED_PLAN_INDEX[tier][scope][level]
     if !targetPlanId → HttpsError('failed-precondition', 'No discounted plan for this code')
     planToUse = targetPlanId
     customId  = JSON token {u, c, p:tier, o:basePriceMinor}   // for webhook redemption
   else:
     planToUse = planId; customId = uid
 → PROVIDERS.paypal.createSubscription(planToUse, customId, cfg)   // NO billing_cycles override
```

Remove `buildFirstCycleOverride` usage and the `subOpts.firstCycleDiscountMinor` path
entirely (delete the override builder). Remove the interim "reject discountCode on
subscription" guard. Redemption recording on confirmed ACTIVE / ACTIVATED webhook is
unchanged (idempotent on subscription id). `custom_id` JSON token unchanged.

## 7. Revise / change-plan (`payments/index.js` + admin UI)

New callable `revisePaypalSubscription({ subscriptionId, newPlanId, paypalEnv })`
(admin-only): `POST /v1/billing/subscriptions/{id}/revise { plan_id }`. Adapter helper
`reviseSubscription(id, planId, cfg)`. The `BILLING.SUBSCRIPTION.UPDATED` webhook already
routes through `activateSubscription`/record sync, so tier + amount update on next read.
Admin UI: a "Change plan" action in the client-management subscription panel with a plan
picker (base + discounted, labeled). Used to end a promo (→ base), move tier, reprice one.

## 8. CT member in-person rate (FUTURE — a discount, NOT a product)

The $60 CT-member in-person rate is **20% off the existing `in_person` product** ($75)
for active Complete Transformation members. It is **NOT** a separate product / tier /
plan / catalog item — earlier drafts modeled it as an `IN_PERSON_MEMBER` product, which
was wrong and has been removed (constants `AppProductId`/`APP_PRODUCTS`/`SERVICE_TIERS`/
`PAYPAL_ONETIME`, the `paypal.ts` catalog entry, `ONETIME_AMOUNTS.IN_PERSON_MEMBER`, and
the `createPaypalOrder` CT-gate all deleted).

When built, it should reuse the SAME `in_person` product + `fulfillSessionPackage` path,
applying the member rate as a server-computed discount gated to `tier ===
'complete_transformation'` (same percentage-discount machinery as the discount codes).
No new product/tier/plan is introduced. Deferred — out of scope for this phase.


## 9. Checkout & portal display

- **Checkout** (`ProviderCheckout.tsx` + `checkout/page.tsx`): re-enable the discount
  field for subscription mode (`discountsSupported = !!capabilities.discounts` — drop the
  `&& mode === 'payment'`). Re-point the subscription Smart Button to the server
  `createPaypalSubscription` (passing `discountCode`). Order Summary shows the discounted
  monthly for recurring, and an intro breakdown for first_cycle ("Today $X, then $250/mo").
  `previewDiscount` already supports subscription mode (`SUBSCRIPTION_PRICE_MINOR`) — update
  it to use the new base prices and return scope-aware preview text.
- **Billing / Membership** (`client/billing`, `client/membership`): read the neutral
  subscription record (`amount` = actual charged, post-discount; `tierName`, `interval`).
  Show the discounted amount; for intro subs, surface "intro then base" using the plan
  scope (store `discountScope` + `basePriceMinor` on the subscription record at activation).

## 10. Webhook / fulfillment notes

- `resolvePlanTier` must know every discounted plan id (via `PLAN_TIER_MAP`) so
  activation writes the correct tier. The `amount` written is the ACTUAL first charge
  (`last_payment.amount`), which is the discounted value for intro/recurring — correct
  for MRR and portal display.
- On activation, also persist `discountScope` and `basePriceMinor` (from the custom_id
  token / plan lookup) to the neutral subscription record so the portal can render
  "intro then base" without a live PayPal read.

## 11. Cutover runbook (sandbox)

1. Cancel existing test subscriptions (cancel callable / PayPal dashboard).
2. Deactivate old OC/CT base plans (`/deactivate`).
3. Bulk-delete test users (`firebase/scripts/bulk-delete-test-accounts.js`).
4. Run the catalog script (sandbox creds) → record base + 20 discounted `P-` ids.
5. Paste ids into `constants.ts` (base + discounted maps).
6. Deploy functions + rebuild app.
7. Seed sandbox discount codes (one per scope/level as needed) via admin UI.
8. Sandbox verify (see tasks T-verify).

## 12. Risks / notes
- 22 plans is a lot to mint; the script must be idempotent-aware (PayPal doesn't dedupe
  by name — run ONCE, record ids; re-runs create duplicates).
- Level set is fixed (10–50 by 10). New levels require new plans + index entries.
- `previewDiscount` and the create path must use the SAME base-price source to avoid
  display/charge mismatch.
