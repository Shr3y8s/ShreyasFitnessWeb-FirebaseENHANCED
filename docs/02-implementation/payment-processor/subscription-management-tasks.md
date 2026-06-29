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

- [x] **1.1 Define `paypalPlans` schema** (FR-2) — documented in design; JSDoc typedef in
  `paypal.js` + TS type in `app/src/types/subscription-admin.ts`.
- [x] **1.2 `resolvePlanTierAsync(planId)`** in `paypal.js` (FR-3): in-code map → Firestore
  `paypalPlans/{planId}`; fail-soft to the sync `resolvePlanTier` fallback.
- [x] **1.3 Wire webhook tier resolution** to use the async registry lookup in the
  `BILLING.SUBSCRIPTION.ACTIVATED/UPDATED` path (so runtime plans resolve tiers).
- [x] **1.4 Persist `subscriptionPlanId` on user doc** in fulfillment (FR-5/FR-14 source).
- [x] **1.5 Seed script `firebase/scripts/seed-paypal-plans.js`** (FR-4): upserts the base
  ids (sandbox + production) from `BASE_PLANS`; idempotent merge; `--commit` to write.
      _(Prod registry seeded 2026-06-28 with the new 2-cycle LIVE ids.)_
- [x] **1.6 Catalog script upserts registry** — `paypal-setup-catalog.js` mints the **2
  base plans (2-cycle TRIAL+REGULAR)** per env (the old "base + 20 discounted" 22-plan
  model is RETIRED — discounts are per-subscriber billing-cycle overrides). Re-minting
  prints a paste-ready `LIVE_PLANS`/`SANDBOX_PLANS` block + registry rows.
- [x] **1.7 `firestore.rules`** — `paypalPlans`: admin read, no client write.
- [ ] **1.8 `firestore.indexes.json`** — add index for `users` by `subscriptionPlanId` +
  active status if needed for count queries. _(Not needed yet — count query uses a simple
  `where subscriptionId != null` scan; revisit if subscriber volume grows.)_

## Phase 2 — PayPal adapter (`paypal.js`) (FR-7…FR-9, FR-16)

- [x] **2.1 `getPlan(planId, ctx)`** — `GET /v1/billing/plans/{id}`.
- [x] **2.2 `listPlans(productId?, ctx)`** — optional reconciliation read.
- [x] **2.3 `createPlan(spec, ctx)`** — `POST /v1/billing/plans` (FR-8). _(mints 2-cycle
  TRIAL+REGULAR so admin-created plans match the base shape for overrides.)_
- [x] **2.4 `updatePlanPricing(planId, amountMinor, ctx)`** — `update-pricing-schemes` (FR-9,
  FR-11). _(GETs the plan + reprices only cycles whose price differs, avoiding 422
  PRICING_SCHEME_INVALID_AMOUNT; supports `billingCycleSequences` for whole-plan reprice.)_
- [x] **2.5 `activatePlan` / `deactivatePlan(planId, ctx)`** (FR-7).
- [x] **2.6 `reviseSubscriptionPricing(subId, amountMinor, ctx)`** — inline same-plan PATCH
  override per S1 (FR-16).
- [x] **2.7 Export all** from the adapter `module.exports`.
- [x] **2.8 `node --check paypal.js`** passes.

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
- [x] **3.9 `repriceClientSubscription({targetUserId, newAmountMinor})`** — `reviseSubscriptionPricing`
  + optimistic `pendingPriceMinor`/`priceEffectiveAt` write (FR-16, FR-17). _(S1 passed →
  built; $1.00 floor enforced server-side.)_
- [x] **3.10 admin pause/resume** — `adminPauseSubscription`/`adminResumeSubscription` built;
  each also writes the neutral subscription record immediately (status paused/active) so the
  console list/detail stay in sync without waiting on the slow SUSPENDED/ACTIVATED webhook (FR-15).
- [x] **3.11 Export all** new callables from `firebase/functions/index.js`.
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
- [x] **4.8 Subscription detail** — cancel-at-period-end, change-plan (revise), **pause/resume**,
  and **change-price** all wired in the detail modal. In-place button state (statusOverride),
  per-action spinners (busyAction), and a silent background list refresh so the modal doesn't
  close/reopen on pause/resume (FR-15). `adminCancelSubscription` handles PayPal `I-` ids
  (local cancelAtPeriodEnd + currentPeriodEnd; hourly scheduled action does the real
  /cancel|/activate). _(2026-06-28.)_
- [x] **4.9 Per-client "Change price"** — exposed via the subscription detail modal
  (`repriceClientSubscription`); S1 passed so the inline PATCH override is live (FR-16).
- [x] **4.10 App `tsc --noEmit`** clean (new files: 0 errors).


## Phase 5 — Display sync + constants (FR-13, FR-17, FR-19)

- [x] **5.1 Optimistic display** — `repriceClientSubscription` writes `pendingPriceMinor`/
  `priceEffectiveAt` on the user doc; subscription-discount DISPLAY state (intro/recurring,
  base vs discounted) persisted via `persistSubscriptionDiscountState` for Billing/Membership
  (FR-17, FR-19).
- [ ] **5.2 Webhook reconcile** — clear `pendingPriceMinor` once `amount` matches or
  `priceEffectiveAt` passed (UPDATED handler). _(Renewal path rolls billing fields forward;
  explicit pending-price clear still TODO.)_
- [ ] **5.3 Base reprice → constants** — update `SUBSCRIPTION_PRICE_MINOR` + `constants.ts`
  (and/or a server-readable price doc) so new checkouts match (FR-13).

## Phase 6 — Verify

- [x] **6.1 `node --check`** all touched functions/scripts → JS_OK.
- [x] **6.2 App `tsc --noEmit`** clean → TS_OK.
- [ ] **6.3 Sandbox V-checks (owner-run, code complete + pending):**
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


