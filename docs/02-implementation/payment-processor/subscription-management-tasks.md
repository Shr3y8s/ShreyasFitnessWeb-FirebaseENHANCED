# Subscription Management Console — Tasks

> Companion to `subscription-management-requirements.md` + `-design.md`.
> Ordered for safety: de-risk the 422 first, build the registry foundation, then
> adapter → callables → UI → display sync → verify.
> Legend: `[ ]` todo · `[x]` done. Each task notes the FR(s) it satisfies.

## Phase S — De-risk (do first)

- [x] **S1. Sandbox-validate per-client pricing override** (C-2, FR-16) — DONE 2026-06-27.
  - Finding: `/revise` REJECTS same-plan overrides (`422 OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED`).
    The working mechanism (what the dashboard uses) is **`PATCH /v1/billing/subscriptions/{id}`**
    `replace /plan/billing_cycles/@sequence==N/pricing_scheme/fixed_price` → **HTTP 204**,
    plan_id unchanged (`plan_overridden:true`), new price next cycle. Recorded in `-design.md` §3.
  - Script gained `--inspect` (read-only GET) + `--patch` (applies the verified shape).


## Phase 1 — Registry foundation (FR-1…FR-4)

- [ ] **1.1 Define `paypalPlans` schema** (FR-2) — documented in design; add a JSDoc
  typedef in `paypal.js` and a TS type `app/src/types/subscription-admin.ts`.
- [ ] **1.2 `resolvePlanTierAsync(planId)`** in `paypal.js` (FR-3): in-code map → Firestore
  `paypalPlans/{planId}`; per-invocation cache. Keep sync `resolvePlanTier` as fallback.
- [ ] **1.3 Wire webhook tier resolution** to use the async registry lookup in the
  `BILLING.SUBSCRIPTION.ACTIVATED/UPDATED` path (so runtime plans resolve tiers).
- [ ] **1.4 Persist `subscriptionPlanId` on user doc** in fulfillment (FR-5/FR-14 source).
- [ ] **1.5 Seed script `firebase/scripts/seed-paypal-plans.js`** (FR-4): upsert the 4
  base ids from `PLAN_TIER_MAP`; idempotent merge; supports `--env`.
- [ ] **1.6 Catalog script upserts registry** — extend `paypal-setup-catalog.js` to write
  each created plan (base + 20 discounted) into `paypalPlans`.
- [ ] **1.7 `firestore.rules`** — `paypalPlans`: admin read, no client write.
- [ ] **1.8 `firestore.indexes.json`** — add index for `users` by `subscriptionPlanId` +
  active status if needed for count queries.

## Phase 2 — PayPal adapter (`paypal.js`) (FR-7…FR-9, FR-16)

- [ ] **2.1 `getPlan(planId, ctx)`** — `GET /v1/billing/plans/{id}`.
- [ ] **2.2 `listPlans(productId?, ctx)`** — optional reconciliation read.
- [ ] **2.3 `createPlan(spec, ctx)`** — `POST /v1/billing/plans` (FR-8).
- [ ] **2.4 `updatePlanPricing(planId, amountMinor, ctx)`** — `update-pricing-schemes` (FR-9, FR-11).
- [ ] **2.5 `activatePlan` / `deactivatePlan(planId, ctx)`** (FR-7).
- [ ] **2.6 `reviseSubscriptionPricing(subId, amountMinor, ctx)`** — inline override per S1 (FR-16).
- [ ] **2.7 Export all** from the adapter `module.exports`.
- [ ] **2.8 `node --check paypal.js`** passes.

## Phase 3 — Callables (`payments/index.js`, all `assertAdmin`) (FR-5…FR-16, FR-18)

- [x] **3.1 `assertAdmin(req)` helper** (reuse existing admin check pattern) (FR-18). _(reused existing `assertAdmin(uid)` in payments/index.js — checks `admins/{uid}.role==='admin'`)_
- [x] **3.2 `listPaypalPlans`** — registry + active-sub counts from `users` (FR-5, FR-6).
- [x] **3.3 `createPaypalPlan`** — adapter `createPlan` → registry upsert (FR-8).
- [x] **3.4 `updatePaypalPlan`** — rename/`updatePlanPricing` → registry (FR-9).
- [x] **3.5 `setPaypalPlanActive`** — activate/deactivate → registry status (FR-7).
- [x] **3.6 `repricePlans({planIds, action, dryRun})`** — `computeNewPrice` ($1 floor);
  dryRun→preview; apply→loop `updatePlanPricing` + registry. _(base-constants sync deferred to Phase 5.3.)_
- [x] **3.7 `listPlanSubscriptions({planId})`** — from `users` (FR-10, FR-14).
- [x] **3.8 `getPaypalSubscriptionDetail({subscriptionId})`** — `getSubscription` + user merge (FR-15).
- [ ] **3.9 `repriceClientSubscription({targetUserId, newAmountMinor})`** — `reviseSubscriptionPricing`
  + optimistic `pendingPriceMinor`/`priceEffectiveAt` write (FR-16, FR-17). **DEFERRED — needs S1.**
- [ ] **3.10 admin pause/resume** — `adminPauseSubscription`/`adminResumeSubscription`
  if not already present (FR-15). _(client-portal pause/resume already exist in functions/index.js; admin variants TBD in Phase 4.8 if needed)_
- [x] **3.11 Export all** new callables from `firebase/functions/index.js` (7 exported; 3.9/3.10 deferred).
- [x] **3.12 `node --check`** on `payments/index.js` + `index.js` → PHASE3_OK.


## Phase 4 — Admin UI (FR-5…FR-15, FR-18)

- [x] **4.1 Sidebar link** — "Manage Subscriptions" under Financial in `AdminSidebar.tsx`.
- [x] **4.2 Client lib** — `app/src/lib/subscription-admin-api.ts` typed wrappers + types
  in `app/src/types/subscription-admin.ts`.
- [x] **4.3 Page `/dashboard/admin/subscriptions`** — admin-guard; two tabs.
- [x] **4.4 Tab A: Plans table** — status tabs, search, ON/OFF toggle, price, active-count
  (clickable), ⋯ menu (reprice/rename/de-activate) (FR-5…FR-10).
- [x] **4.5 Bulk reprice** — multi-select + All OC/All CT, action picker, **preview dialog**,
  confirm (FR-11, FR-12).
- [x] **4.6 Create Plan dialog** — product, name, tier, price, interval (FR-8).
- [x] **4.7 Tab B: Subscriptions table** — client/plan/status/next-billing; plan drill-down (FR-14).
- [x] **4.8 Subscription detail** — cancel + change-plan (revise). Pause/resume + change-price
  deferred (per-client price needs S1; admin pause/resume = Phase 3.10) (FR-15 partial).
- [ ] **4.9 Per-client "Change price"** on client-management detail page (FR-16). **DEFERRED — needs S1.**
- [x] **4.10 App `tsc --noEmit`** clean (new files: 0 errors).


## Phase 5 — Display sync + constants (FR-13, FR-17, FR-19)

- [ ] **5.1 Optimistic display** — membership/billing show "new price effective {date}"
  from `pendingPriceMinor`/`priceEffectiveAt` (FR-17, FR-19).
- [ ] **5.2 Webhook reconcile** — clear `pendingPriceMinor` once `amount` matches or
  `priceEffectiveAt` passed (UPDATED handler).
- [ ] **5.3 Base reprice → constants** — update `SUBSCRIPTION_PRICE_MINOR` + `constants.ts`
  (and/or a server-readable price doc) so new checkouts match (FR-13).

## Phase 6 — Verify

- [ ] **6.1 `node --check`** all touched functions/scripts.
- [ ] **6.2 App `tsc --noEmit`** clean.
- [ ] **6.3 Sandbox V-checks:**
  - V-A create a plan in-app → appears in registry + PayPal; a new sub on it resolves the
    correct tier on the activation webhook (no code deploy).
  - V-B bulk reprice "All OC" +10% → preview correct → applied to all OC plan ids;
    new checkout reflects new base price.
  - V-C per-client reprice → next-cycle price changes; membership shows effective date.
  - V-D deactivate a plan → new signups blocked; existing sub unaffected.
  - V-E subscription detail cancel/pause/resume work end-to-end.

## Deferred (not this iteration)
- **D1 (old T11)** automated time-boxed recurring promos (scheduled auto-revise).
- **D2** sync PayPal-portal price edits back into the app (NG-1).

## Notes / dependencies
- S1 must pass before 2.6/3.9/4.9 are enabled (per-client reprice).
- Phases 1–3 are backend-only and independently `node --check`-able.
- **T10 depends on this feature's foundation.** Because plan ids now live in the
  `paypalPlans` registry (not in code), the subscription-discounts feature (T10) cannot be
  completed/verified until **Phase 1 (registry + `resolvePlanTierAsync` + registry-backed
  discounted-plan lookup)** is built AND the catalog script has run + seeded the registry
  (Phase 1.5/1.6). So the cross-feature build order is:
  **Phase 1 (registry) → catalog run/seed → T10.4 resolution + T10 UI**.
  T10.4 must resolve discounted plans from the **registry**, not the in-code
  `DISCOUNTED_PLAN_INDEX`.


