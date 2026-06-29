# Subscription Management Console — Design

> Companion to `subscription-management-requirements.md`. Implements FR-1…FR-19.
> Provider-neutral concepts (`tierId`/`tierName`) stay in the app layer; PayPal-specific
> identity (`planId`, pricing schemes, status) stays behind the PayPal adapter seam.

## 1. Architecture overview

```
Admin UI (/dashboard/admin/subscriptions)
   │  httpsCallable (admin-gated)
   ▼
payments/index.js callables  ──►  PROVIDERS.paypal (paypal.js adapter)  ──►  PayPal REST
   │                                      │
   │  read/write                          │ resolvePlanTier(planId) reads
   ▼                                      ▼
Firestore: paypalPlans/{planId}  ◄── webhook writes on create/reprice
Firestore: users/{uid}           ◄── source of "active subscriptions per plan"
```

- **Seam respected:** the admin UI never sees PayPal REST shapes; it calls neutral
  callables. The callables translate to PayPal via the adapter. The webhook resolves
  `plan_id → tier` from the registry.

## 2. Data model — `paypalPlans/{planId}` (FR-1, FR-2)

Document id = the PayPal plan id (`P-…`). Globally unique across sandbox/live, so one
collection serves both envs (same convention as the old merged `PLAN_TIER_MAP`).

```ts
interface PaypalPlanDoc {
  planId: string;            // 'P-…' (also the doc id)
  productId: string;         // PayPal product id the plan belongs to
  tierId: string;            // neutral app product id: 'online_coaching' | 'complete_transformation'
  tierName: string;          // 'Online Coaching' | 'Complete Transformation'
  kind: 'base' | 'discount';
  scope: null | 'recurring' | 'first_cycle';   // discount scope (null for base)
  level: null | 10 | 20 | 30 | 40 | 50;         // discount level (null for base)
  amountMinor: number;       // current price, minor units (e.g. 20000 = $200.00)
  currency: string;          // 'USD'
  status: 'ACTIVE' | 'INACTIVE';
  env: 'sandbox' | 'live';
  name: string;              // human label, e.g. 'Online Coaching Monthly'
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Tier resolution (FR-3)
`resolvePlanTier(planId)` in `paypal.js` becomes async-capable with a layered lookup:
1. In-code `PLAN_TIER_MAP` (fast path / safety seed for the 4 base ids).
2. Firestore `paypalPlans/{planId}` (authoritative for everything, incl. runtime-created).

Because `parseEvent` is currently synchronous, we resolve the tier in the **webhook
handler** (which is already async) by reading the registry, and pass `{tierId,tierName}`
into the neutral event — OR we make the small set of call-sites that need the tier
`await` a `resolvePlanTierAsync`. Design choice: add `resolvePlanTierAsync(planId)` that
does the Firestore read and keep the sync `resolvePlanTier` as the in-memory fallback;
update the webhook dispatch path to use the async form. (Cache reads per-invocation.)

### Seed / migration (FR-4)
`firebase/scripts/seed-paypal-plans.js` upserts the 4 known base ids (from the current
`PLAN_TIER_MAP`) into `paypalPlans`. The discount catalog script
(`paypal-setup-catalog.js`) also upserts each plan it creates (base + 20 discounted),
so a sandbox/live catalog run leaves the registry fully populated. Idempotent (merge).

### Security (`firestore.rules`)
```
match /paypalPlans/{planId} {
  allow read: if isAdmin();          // console reads; functions use Admin SDK (bypass rules)
  allow write: if false;             // only Cloud Functions (Admin SDK) write
}
```
All mutations go through admin-gated callables → Admin SDK writes (rules bypassed). No
direct client writes.

## 3. PayPal adapter additions (`firebase/functions/payments/providers/paypal.js`)

| Function | PayPal call | Purpose |
|---|---|---|
| `listPlans(productId?, ctx)` | `GET /v1/billing/plans?product_id=` | enumerate plans (optional; registry is primary source for the table) |
| `getPlan(planId, ctx)` | `GET /v1/billing/plans/{id}` | fetch one plan (status, pricing) |
| `createPlan(spec, ctx)` | `POST /v1/billing/plans` | create a plan; returns `P-…` |
| `updatePlanPricing(planId, amountMinor, ctx)` | `POST /v1/billing/plans/{id}/update-pricing-schemes` | reprice a plan (bulk/global) |
| `activatePlan(planId, ctx)` | `POST /v1/billing/plans/{id}/activate` | turn ON |
| `deactivatePlan(planId, ctx)` | `POST /v1/billing/plans/{id}/deactivate` | turn OFF (blocks new subs only) |
| `reviseSubscriptionPricing(subId, amountMinor, ctx)` | `POST /v1/billing/subscriptions/{id}/revise` (inline `plan.billing_cycles[].pricing_scheme.fixed_price`, SAME plan_id) | per-client reprice |

Existing/kept: `reviseSubscription` (change plan_id), `cancelSubscription`,
`suspendSubscription`, `activatePaypalSubscription`, `getSubscription`.

### `update-pricing-schemes` payload (per plan)
```json
{
  "pricing_schemes": [
    { "billing_cycle_sequence": 1,
      "pricing_scheme": { "fixed_price": { "value": "220.00", "currency_code": "USD" } } }
  ]
}
```
For **first_cycle (intro)** plans (2 cycles: TRIAL seq 1, REGULAR seq 2), bulk reprice
targets the cycle(s) appropriate to the action; default bulk action repices the REGULAR
cycle. (Edge handling documented in tasks.)

### Per-client inline pricing override — VERIFIED (S1, 2026-06-27)
**`/revise` does NOT work for same-plan price overrides.** Sandbox testing returned
`422 OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED` for every `billing_cycles` override variant via
`POST /v1/billing/subscriptions/{id}/revise` (full array, single cycle, with/without
top-level `plan_id`). `/revise` is only for moving a subscription to a DIFFERENT plan id.

**The mechanism the merchant dashboard's "Update pricing" actually uses — and what we
ship — is `PATCH /v1/billing/subscriptions/{id}`** with a JSON-Patch `replace` on the
REGULAR cycle's `fixed_price`:
```json
[
  { "op": "replace",
    "path": "/plan/billing_cycles/@sequence==1/pricing_scheme/fixed_price",
    "value": { "currency_code": "USD", "value": "175.00" } }
]
```
- Sandbox result: **HTTP 204**. The subscription keeps its `plan_id`
  (`plan_overridden: true`); the new price applies from the NEXT billing cycle (PayPal's
  "<10 days before renewal → following cycle" rule). The plan itself is untouched.
- Path notes (other shapes that FAIL with `INVALID_PATCH_PATH`): stopping at
  `…/pricing_scheme`, replacing `/plan`, or replacing `/plan/billing_cycles`. You MUST
  drill all the way to `…/pricing_scheme/fixed_price` and select the cycle with the
  array filter `@sequence==N`.
- REGULAR cycle sequence: base/recurring plans = 1; first_cycle intro plans = 2. The
  adapter reads the plan's `billing_cycles` and picks the REGULAR cycle's sequence.

Implemented as `paypal.js reviseSubscriptionPricing(subscriptionId, amountMinor, opts, ctx)`
→ backed by the admin callable `repriceClientSubscription({targetUserId, newAmountMinor})`
→ surfaced as the console's "Change price (same plan)" action. NOT feature-flagged
(validated). Script: `paypal-validate-revise-pricing.js` (`--inspect` read-only GET,
`--patch` applies the verified shape).


## 4. Callables (`firebase/functions/payments/index.js`) — all `assertAdmin`

| Callable | Input | Action |
|---|---|---|
| `listPaypalPlans` | `{ env }` | read `paypalPlans` (+ active-sub counts from `users`) |
| `createPaypalPlan` | `{ productId, name, tierId, amountMinor, interval, env }` | `createPlan` → upsert registry |
| `updatePaypalPlan` | `{ planId, name?, amountMinor? }` | rename and/or `updatePlanPricing` → registry |
| `setPaypalPlanActive` | `{ planId, active }` | `activate`/`deactivate` → registry status |
| `repricePlans` | `{ planIds[], action:{mode:'percent'|'amount'|'set', value}, dryRun }` | compute new prices ($1 floor); `dryRun` returns old→new preview; else loop `updatePlanPricing` + registry + (base) constants |
| `listPlanSubscriptions` | `{ planId }` | query `users` where `subscriptionPlanId == planId` (or tier) → list |
| `getPaypalSubscriptionDetail` | `{ subscriptionId }` | `getSubscription` + user doc merge |
| `repriceClientSubscription` | `{ targetUserId, newAmountMinor }` | `reviseSubscriptionPricing` + optimistic user-doc write (FR-17) |
| `adminPauseSubscription` / `adminResumeSubscription` | `{ targetUserId, ... }` | admin variants of suspend/resume (if not already present) |

Existing admin callables reused: `adminCancelSubscription`, `revisePaypalSubscription`
(change plan). All exported from `firebase/functions/index.js`.

`assertAdmin(req)` helper: verifies `admins/{uid}` doc OR `users/{uid}.role === 'admin'`
(match existing admin checks already used by `adminCancelSubscription`).

### Active-sub count source (FR-5, FR-14; C-1)
PayPal has no list API. We read Firestore `users` where the user has an active
subscription, grouping by their stored plan id. Requires that the activation webhook
persists the **plan id** on the user doc (it stores `subscriptionId`, `tier`,
`priceId`/plan). We'll persist `subscriptionPlanId` on the user doc going forward and
backfill in the seed migration if needed.

## 5. Admin UI

### Sidebar (`app/src/components/AdminSidebar.tsx`)
Add under **Financial** group: **"Manage Subscriptions"** → `/dashboard/admin/subscriptions`
(icon e.g. `CreditCard` / `Layers`).

### Page `/dashboard/admin/subscriptions` — two tabs (mirror PayPal screenshot)

**Tab A — Subscription plans**
- Status filter: Active / Inactive / All; search by plan id.
- Table columns: checkbox · Plan (name + id) · Product · Status (ON/OFF toggle) ·
  Price · Active subscriptions (clickable) · ⋯ menu (Reprice, Rename, Activate/Deactivate).
- Toolbar: **Create Plan** button; **Bulk reprice** (enabled when ≥1 selected) with
  quick-select **All OC / All CT**; action picker (%, $, set) → **Preview dialog**
  (old→new per plan) → **Confirm**.
- Clicking an active-sub count → Tab B filtered to that plan.

**Tab B — Subscriptions**
- Table: Client · Plan · Status · Price · Next billing · (row click → detail).
- Filter by plan (from the count drill-down) or all.

**Subscription detail (dialog or sub-route)**
- Info: client, status, current price, next billing, start, recent history.
- Actions: **Cancel**, **Pause/Resume**, **Change price** (amount input → confirm),
  **Change plan** (select another plan id → revise).

### Per-client convenience entry
Add a **"Change price"** action on the existing admin client-management detail page
(`app/src/app/dashboard/admin/client-management/[id]/page.tsx`) that calls
`repriceClientSubscription`.

### Client adapter / lib
Extend `app/src/lib/admin-api.ts` (or a new `app/src/lib/subscription-admin-api.ts`) with
typed wrappers for the new callables. Types in `app/src/types/` (e.g. `subscription-admin.ts`).

## 6. Display sync (FR-17, FR-19)

- `repriceClientSubscription` writes to the user doc optimistically:
  `pendingPriceMinor`, `priceEffectiveAt` (next billing date from `currentPeriodEnd`).
- `membership`/`billing` pages show: current price now, plus "New price ${X} effective
  {date}" when `pendingPriceMinor` is set and `priceEffectiveAt` is in the future.
- The `BILLING.SUBSCRIPTION.UPDATED` webhook continues to reconcile the actual `amount`
  from `last_payment` after the next charge; on reconcile we clear `pendingPriceMinor`
  once `amount === pendingPriceMinor` (or `priceEffectiveAt` has passed).
- Bulk/base reprice updates `SUBSCRIPTION_PRICE_MINOR` (server) + `constants.ts` so new
  checkouts match (FR-13). (Manual constants edit documented in tasks; the callable also
  updates a server-readable price doc if we choose to make checkout price dynamic.)

## 7. Pricing math (FR-11, FR-12)
`computeNewPrice(currentMinor, action)`:
- `percent`: `round(currentMinor * (1 + value/100))`
- `amount`:  `currentMinor + value*100` (value in dollars; allow negative)
- `set`:     `value*100`
- Clamp to **$1.00 floor** (`max(100, …)`); round to whole cents.
Preview returns `[{planId, name, oldMinor, newMinor}]`.

## 8. Rollout / ordering (see tasks)
1. **T.S1 sandbox-validate** the `revise` pricing-override payload (de-risk 422).
2. Registry + seed/migration + `resolvePlanTierAsync` + rules.
3. Adapter functions.
4. Callables + exports.
5. Admin UI (plans tab → subscriptions tab → detail; create/reprice/activate).
6. Display sync + constants.
7. Type-check + sandbox verification.

## 9. Open implementation notes
- Keep `reviseSubscriptionPricing` behind a flag until T.S1 passes.
- `listPlans` from PayPal is optional reconciliation; the **registry** is the table's
  source of truth (with PayPal `getPlan` used to confirm live status when toggling).
- First-cycle (intro) plans have 2 billing cycles — reprice UI should make clear which
  cycle a change targets (default: the recurring/REGULAR cycle).
