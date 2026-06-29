# Pre-Pay (Multi-Month) Subscription Plans — Design

Status: Draft (2026-06-29)
Owner: Payments
Related: prepay-plans-requirements.md, subscription-discounts-2cycle-handoff.md,
subscription-management-design.md, discount-codes-design.md

## 1. Guiding principle

`user.tier` (the neutral AppProductId) defines **what you get**. A new orthogonal
dimension, the **billing period**, defines **how often you pay**. These never mix:
quarterly OC is still `tier = online_coaching`, so `FEATURE_MATRIX`, check-in eligibility,
sidebar, and page guards are 100% untouched. The period only affects the PayPal plan id,
the charged amount, the cadence math, and how analytics normalize revenue.

PayPal has no "% discount at charge time" for subscriptions — the price is baked into the
Billing Plan. So the quarterly discount is realized by **minting/repricing the quarterly
plan**, not by applying a runtime percentage. "Admin-configurable discount %" therefore
means **"admin sets a %, server reprices the quarterly plan to match"** (config drives
price — single source of truth).

## 2. The BillingPeriod model (Phase A)

### 2.1 Types — `app/src/lib/constants.ts`
```ts
export type BillingIntervalUnit = 'MONTH';            // room for 'WEEK'|'YEAR' later
export type BillingPeriodLabel = 'monthly' | 'quarterly' | 'annual';

export interface BillingPeriod {
  intervalUnit: BillingIntervalUnit;  // 'MONTH'
  intervalCount: number;              // 1 | 3 | 12
}

/** Canonical periods. */
export const PERIOD_MONTHLY:   BillingPeriod = { intervalUnit: 'MONTH', intervalCount: 1 };
export const PERIOD_QUARTERLY: BillingPeriod = { intervalUnit: 'MONTH', intervalCount: 3 };

/** intervalCount → months (today identity since unit is MONTH; explicit for future units). */
export function periodMonths(p: BillingPeriod): number { return p.intervalCount; }

/** intervalCount → label. */
export function periodLabel(p: BillingPeriod): BillingPeriodLabel {
  if (p.intervalCount === 3) return 'quarterly';
  if (p.intervalCount === 12) return 'annual';
  return 'monthly';
}
```

### 2.2 Per-product billing options
A subscription `AppProduct` gains `billingOptions`. Each option pairs a period with the
PayPal plan key (resolved env-side) and its full-period price (minor units):
```ts
export interface BillingOption {
  period: BillingPeriod;
  /** Key into PAYPAL_PLANS (resolved sandbox/live in the adapter). */
  planKey: 'ONLINE_COACHING' | 'COMPLETE_TRANSFORMATION'
         | 'ONLINE_COACHING_QUARTERLY' | 'COMPLETE_TRANSFORMATION_QUARTERLY';
  /** Total charged per period, minor units (e.g. 54000 = $540/quarter). */
  amount: number;
}
```
**Phase A:** only the monthly option is populated for OC/CT — `amount` = the existing
monthly price, `planKey` = the existing monthly key. Nothing else changes.
**Phase B:** add the quarterly option per tier.

`APP_PRODUCTS[id].amount` stays the **monthly anchor price** (back-compat). Helpers:
```ts
export function getBillingOptions(id: AppProductId): BillingOption[]; // [] for one-time
export function getBillingOption(id: AppProductId, count: number): BillingOption | null;
export function defaultBillingOption(id: AppProductId): BillingOption | null; // monthly
```

### 2.3 Why `months` matters: MRR
A quarterly charge of $540 every 3 months = **$180 MRR**. Any revenue/MRR rollup MUST
divide by `months`. This is the single most important correctness change in Phase A and
the reason we do the refactor before the feature.

## 3. Phase A — touch points (refactor, zero behavior change)

| # | File | Change |
|---|------|--------|
| A | `app/src/lib/constants.ts` | Add `BillingPeriod` types, `PERIOD_*`, helpers, `billingOptions` on OC/CT (monthly only). Add quarterly **plan-key placeholders** to `PAYPAL_PLANS` typing but leave values undefined until Phase B. |
| B | `firebase/functions/payments/providers/paypal.js` | `createPlan(spec)` reads `spec.intervalCount` (default 1) for BOTH cycles' `frequency.interval_count`. `buildPriceOverride(opts)` reads `opts.intervalCount` (default 1) for the override cycles' `frequency`. Activation event emits `intervalCount` + `months` instead of hardcoded `interval:"month"`. `PLAN_TIER_MAP` entries gain `intervalCount` (existing = 1). `resolvePlanTier`/`resolvePlanTierAsync` return it. |
| C | `firebase/functions/payments/fulfillment.js` | Accept + persist `intervalCount`/`months` on the user doc + `subscriptions` record alongside `amount`/`interval`. Keep writing legacy `interval` string for back-compat (derived from count). |
| D | `firebase/functions/payments/index.js` | `SUBSCRIPTION_PRICE_MINOR` → keyed by `(tierId, intervalCount)` (helper `subscriptionPriceMinor(tierId, count)`; monthly today). Activation/renewal write `intervalCount`/`months`. Admin `listSubscriptions` returns `intervalCount`. |
| E | `firebase/functions/payments/index.js` (`createPaypalPlan`) | Pass `intervalCount` through to `createPlan` (admin can mint non-monthly plans). |
| F | Revenue dashboard `app/src/app/dashboard/admin/revenue/page.tsx` | MRR = Σ(amount ÷ months). |
| G | Membership/Billing `app/src/app/dashboard/client/membership/page.tsx`, `billing/page.tsx` | "Next billing" fallback adds `months`; render cadence label; "then $X/period" copy reads period. |
| H | Admin subscriptions `app/src/app/dashboard/admin/subscriptions/page.tsx` + `app/src/types/subscription-admin.ts` + `subscription-admin-api.ts` | Carry/render `intervalCount` → "Monthly"/"Quarterly". |

**Behavior-preservation rule:** every new param defaults to monthly (`intervalCount = 1`,
`months = 1`). With only monthly options configured the produced PayPal bodies, stored
docs, and rendered values are byte-identical to today. Verified by the existing jest suite
+ `node --check` + `tsc --noEmit`.

### 3.1 PayPal cycle frequency (the real fix in `createPlan`/`buildPriceOverride`)
Today both cycles hardcode `frequency: { interval_unit, interval_count: 1 }`. After Phase A:
```js
const intervalCount = spec.intervalCount || 1;
frequency: { interval_unit: intervalUnit, interval_count: intervalCount }
```
For a quarterly plan PayPal then bills every 3 months. The 2-cycle TRIAL+REGULAR shape is
preserved, so the discount-code override model keeps working (override must also use
`interval_count: 3` — see §5).

## 4. Phase B — quarterly plans

### 4.1 Mint plans (`paypal-setup-catalog.js` / `seed-paypal-plans.js`)
For OC and CT, in sandbox AND live, create a 2-cycle plan with
`frequency.interval_count = 3` at the discounted quarterly price. Record the 4 ids.
Add to `SANDBOX_PLANS`/`LIVE_PLANS` under new keys
`ONLINE_COACHING_QUARTERLY` / `COMPLETE_TRANSFORMATION_QUARTERLY`.

### 4.2 Register tier mapping
`PLAN_TIER_MAP` += 4 entries → same `tierId`, `intervalCount: 3`. Also write the
`paypalPlans/{planId}` registry docs (tierId, tierName, intervalCount) so runtime
resolution works without redeploy.

### 4.3 Checkout / pricing UI
- `CHECKOUT_ITEMS` += `ONLINE_COACHING_QUARTERLY`, `COMPLETE_TRANSFORMATION_QUARTERLY`
  (mode `subscription`, same `productId` = tier, `fulfillment: subscription_active`).
- Pricing surfaces (`ServiceTierStep`, `PricingCard`, `product-marketing.ts`) gain a
  **Monthly / Quarterly** segmented toggle. Quarterly shows total + "(= $X/mo, save 10%)"
  + a clear **"Billed once every 3 months. No refunds — access continues until the end of
  your paid period."** line.
- The checkout resolves the chosen option → its `planKey` → plan id (env-side) → the
  existing `createPaypalSubscription*` callables, unchanged except the plan id.

### 4.4 Admin discount configuration (config drives price)
- Firestore: `config/prepayPricing` →
  `{ quarterly: { online_coaching: { discountPct: 10 }, complete_transformation: { discountPct: 10 } }, updatedAt, updatedBy }`.
- Admin screen (extend `app/src/app/dashboard/admin/subscriptions/page.tsx` or a small new
  "Pricing" card): shows monthly anchor (read-only), a **discount %** input per tier, a
  computed quarterly-price preview, and **"Save & reprice"**.
- New admin callable `updatePrepayPricing({ tierId, discountPct })`:
  1. validate (0 ≤ pct ≤ 50), 2. compute `quarterlyMinor = monthlyMinor × 3 × (1 − pct/100)`
  rounded to cents, 3. `updatePlanPricing(quarterlyPlanId, quarterlyMinor, {billingCycleSequences:[1,2]})`,
  4. persist config + the displayed amount. Existing subscribers keep their price until
  renewal (PayPal behavior — FR-B8, documented in the UI).

### 4.5 No-refund messaging
Quarterly checkout copy (§4.3) + a clause in `docs/03-legal/terms-of-service.md` and the
rendered `app/src/app/legal/terms/page.tsx`: pre-paid multi-month terms are non-refundable;
access continues through the paid period; cancellation stops the next renewal only.

## 5. Discounts interaction (Phase B)
`buildPriceOverride` (Phase A change) already takes `intervalCount`. When a discount code
is applied to a quarterly subscription, the caller passes `intervalCount: 3` (resolved from
the plan's period via `resolvePlanTier`). `SUBSCRIPTION_PRICE_MINOR` lookup uses
`(tierId, 3)` so the original amount is the quarterly price, and the floor/percentage math
in `discounts.js` is unchanged (operates on whatever minor amount it's given).

## 6. Data model changes (additive, back-compat)
- **user doc:** `+ intervalCount?: number` (default 1 when absent). Existing `interval`
  string retained.
- **subscriptions/{uid}:** `+ intervalCount?: number`, `+ months?: number`.
- **paypalPlans/{planId}:** `+ intervalCount?: number` (default 1).
- **config/prepayPricing:** new doc (Phase B), admin-write via callable only; firestore.rules
  denies client writes (read allowed for price display, or fetched via a callable).

Migration: none required — readers default missing `intervalCount` to 1 (monthly).

## 7. Rollout
1. **Phase A** — land refactor, `node --check` + jest + `tsc`, deploy functions + app,
   smoke-test monthly OC/CT purchase + renewal + dashboards (expect no change). Tag a
   git checkpoint.
2. **Phase B** — mint sandbox quarterly plans, wire UI + admin config behind the toggle,
   full sandbox test per tier, then mint live plans, register live ids, deploy, live
   smoke test, announce.

## 8. Risks / mitigations
- **MRR over-count** if a multi-month amount is summed as monthly → fixed by §2.3/§3-F
  BEFORE any quarterly plan exists.
- **Override rejected by PayPal** if override cycle frequency ≠ plan frequency → §3.1/§5
  thread `intervalCount` everywhere.
- **Price/display drift** if % stored separately from plan price → §4.4 config-drives-price
  reprices the plan on save.
- **Chargeback risk** from a quarterly buyer who quits early → §4.5 explicit no-refund copy
  at checkout + ToS.
