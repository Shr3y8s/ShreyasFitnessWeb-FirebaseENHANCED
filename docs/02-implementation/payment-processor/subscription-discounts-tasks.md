# Subscription Discounts (PayPal discounted-plan fallback) — Tasks

Status: Draft. Implements `subscription-discounts-{requirements,design}.md`.
Supersedes the blocked T9/T10 first-cycle-override notes in `discount-codes-tasks.md`
(those remain for history; this is the live plan). Sandbox/dev only.

Legend: [ ] todo · [x] done · ⚙️ owner action (run script / deploy) · 🧪 verify

> **DEPENDENCY (added):** Per the Subscription Management decision, PayPal plan ids no
> longer live in source code (`PLAN_TIER_MAP`/`DISCOUNTED_PLAN_INDEX`) — they live in the
> Firestore **`paypalPlans`** registry. Therefore T10 cannot be completed/verified until:
> (1) the registry foundation exists (`subscription-management-tasks.md` Phase 1:
> `resolvePlanTierAsync` + a registry-backed discounted-plan lookup), and (2) the catalog
> script has run and **seeded the registry** with the 22 plan ids. T10's discounted-plan
> resolution (T10.4) must read the **registry**, not the in-code `DISCOUNTED_PLAN_INDEX`.
> Build order: **registry foundation → catalog run/seed → T10 resolution + UI**.

> **MODEL UPDATE (2026-06-27): SHIPPED as the 2-cycle override model.** The 22-plan tasks
> below (T10.1.2/T10.1.3 discounted-plan minting, T10.2.3 `DISCOUNTED_PLAN_INDEX`,
> T10.4.1/T10.4.2 "create against the discounted plan", T10.4.3 delete-`buildFirstCycleOverride`)
> are **SUPERSEDED**. What actually shipped: 2 base plans minted as 2-cycle (TRIAL+REGULAR);
> a server-computed create-time `buildPriceOverride({scope,discountedMinor,regularMinor,
> trialCycles})` applied in `resolveSubscriptionPlan`; any percentage 0–100 (no fixed
> 10/20/30/40/50 levels); no `DISCOUNTED_PLAN_INDEX`/`fallbackPlanIds`. T10.6 (re-enable
> checkout — DONE) + the N-month intro (`introCycles`) are the live behavior. Source of
> truth: `subscription-discounts-2cycle-handoff.md`. T10.5 (revise), T10.7 (CT rate, deferred),
> T10.8 (portal display) still stand.

---



## T0 — Standing safety fix (already coded; deploy pending)
- [x] **T0.1** Revert subscription Smart Button to client-side `actions.subscription.create`.
- [x] **T0.2** Re-gate checkout discount field to `mode === 'payment'`.
- [x] **T0.3** Server rejects `discountCode` on subscription create (both callables).
- [ ] **T0.4** ⚙️ Redeploy functions + rebuild app so plain subscriptions work in the interim.
  (This is reverted in T10.6 once discounted plans exist.)

## T10.1 — Catalog script (mint plans)
- [ ] **T10.1.1** In `firebase/scripts/paypal-setup-catalog.js`: OC monthly `200.00`,
  CT monthly `250.00`, **remove CT `setupFee`**.
- [ ] **T10.1.2** Add a discounted-plan generator: for each tier × level {10,20,30,40,50}
  × scope {recurring, first_cycle}, create the plan (recurring = single REGULAR cycle at
  discounted price; first_cycle = TRIAL cycle×1 at discounted price + REGULAR ∞ at base).
- [ ] **T10.1.3** Self-describing plan names + a paste-ready `constants.ts` block keyed by
  `TIER_SCOPE_LEVEL` (base + 20 discounted).
- [ ] **T10.1.4** Add a `--deactivate-old <planId,...>` (or sibling script) to deactivate
  retired base plans.
- [ ] **T10.1.5** ⚙️ Run against SANDBOX → record all 22 `P-` ids.

## T-cleanup — Sandbox cutover
- [ ] **TC.1** ⚙️ Cancel existing test subscriptions (cancel callable / dashboard).
- [ ] **TC.2** ⚙️ Deactivate old OC/CT base plans.
- [ ] **TC.3** ⚙️ Bulk-delete test users (`firebase/scripts/bulk-delete-test-accounts.js`).

## T10.2 — Constants & maps
- [ ] **T10.2.1** `constants.ts`: new base ids in SANDBOX_PLANS/LIVE_PLANS; add
  `SANDBOX_DISCOUNTED_PLANS`/`LIVE_DISCOUNTED_PLANS` → `PAYPAL_DISCOUNTED_PLANS`.
- [ ] **T10.2.3** `providers/paypal.js`: add all 20 discounted ids to `PLAN_TIER_MAP`;
  add `DISCOUNTED_PLAN_INDEX[tier][scope][level]`.


## T10.3 — Discount-code model
- [ ] **T10.3.1** Confirm `discount_codes` supports `discountScope`
  (`one_time|first_cycle|recurring`) + `value` (10/20/30/40/50) + optional
  `fallbackPlanIds`. (Schema mostly present from Feature 2.)
- [ ] **T10.3.2** `discounts.validateCode`: ensure subscription scopes validate against
  `appliesTo.modes` correctly.

## T10.4 — Subscription create against discounted plan
- [ ] **T10.4.1** `payments/index.js` `createPaypalSubscription`: when a subscription code
  applies, resolve `targetPlanId = fallbackPlanIds[tier] ?? DISCOUNTED_PLAN_INDEX[tier][scope][level]`
  and create against it. Remove the interim reject guard. Thread custom_id token.
- [ ] **T10.4.2** Same for `createPaypalSubscriptionWithCard`.
- [ ] **T10.4.3** Delete `buildFirstCycleOverride` + `subOpts.firstCycleDiscountMinor`
  override path from `providers/paypal.js` (no longer used).
- [ ] **T10.4.4** On activation, persist `discountScope` + `basePriceMinor` to the neutral
  subscription record (for portal "intro then base" rendering).

## T10.5 — Admin "Change plan" (revise)
- [ ] **T10.5.1** Adapter `reviseSubscription(id, planId, cfg)` →
  `POST /v1/billing/subscriptions/{id}/revise`.
- [ ] **T10.5.2** Callable `revisePaypalSubscription` (admin-only).
- [ ] **T10.5.3** Admin UI: "Change plan" action + plan picker (base + discounted, labeled)
  in client-management subscription panel.

## T10.6 — Re-enable subscription discounts (reverse T0)
- [ ] **T10.6.1** `ProviderCheckout.tsx`: `discountsSupported = !!capabilities.discounts`
  (drop `&& mode === 'payment'`).
- [ ] **T10.6.2** Re-point subscription Smart Button to server `createPaypalSubscription`
  (pass `discountCode`).
- [ ] **T10.6.3** `previewDiscount`: use new base prices ($200/$250); scope-aware preview
  (intro vs recurring text).
- [ ] **T10.6.4** Checkout Order Summary: discounted monthly (recurring) / intro breakdown
  ("Today $X, then $base/mo").

## T10.7 — CT member in-person rate (FUTURE — a discount, NOT a product)
> The $60 CT-member rate is **20% off the existing `in_person` product** ($75), gated to
> active CT members — NOT a separate product/tier/plan. The earlier `IN_PERSON_MEMBER`
> product model was wrong and has been fully removed (constants, paypal.ts catalog,
> `ONETIME_AMOUNTS`, the `createPaypalOrder` CT-gate, and the catalog-script log line).
> Deferred — when built, reuse the `in_person` product + `fulfillSessionPackage` path and
> apply the member rate via the same percentage-discount machinery (no new product/tier/plan).
- [ ] **T10.7.1** (deferred) Member-rate discount on the `in_person` product, gated to
  `tier === 'complete_transformation'`; reuse existing one-time fulfillment.


## T10.8 — Billing/Membership + admin editor
- [ ] **T10.8.1** Billing + Membership read neutral record; show discounted amount + tier;
  render intro state.
- [ ] **T10.8.2** Admin discount editor: edit `discountScope` + `value`/level for
  subscription codes.

## T11 — Automated time-boxed recurring (SUPERSEDED → see subscription-management)
> Moved to `subscription-management-tasks.md` as **Deferred D1** (post-launch). Tracked there, not here.
- [ ] **T11.1** Per-code `recurringDurationMonths`.
- [ ] **T11.2** Scheduled job: after N cycles, `revise` subscriber to base plan; record.


## T12 — Global reprice (SUPERSEDED → see subscription-management)
> Absorbed into `subscription-management-*` as a LAUNCH feature: bulk reprice
> (multi-select plans / All-OC / All-CT → %/$/set → preview → apply) via
> `update-pricing-schemes`. Build/track it there, not here.
- [ ] **T12.1** Admin tool → `update-pricing-schemes` on a base plan (all subscribers).


## T13 — Case B: timed discount on an EXISTING subscription (DEFERRED — FR-18)
> A discount applied AFTER signup to an already-active subscriber, with auto-revert
> after N months. NOT the signup intro discount (that's `first_cycle`, baked in at
> create). PayPal's PATCH has no `total_cycles`, so it can't self-expire — we must
> orchestrate the revert ourselves. Deferred; out of scope for the current phase.
- [ ] **T13.1** Admin action: apply an N-month discount to a live subscription → PATCH
  the REGULAR cycle's `pricing_scheme` down (reuse `reviseSubscriptionPricing`).
- [ ] **T13.2** Persist `{ revertAfterCycles: N, revertToMinor, cyclesSeen: 0 }` on the
  subscriber's neutral record.
- [ ] **T13.3** On each `PAYMENT.SALE.COMPLETED` renewal: increment `cyclesSeen`; when it
  reaches N, PATCH the price back to `revertToMinor` and clear the markers.
- [ ] **T13.4** Portal display: show "discount until <date>, then $base/mo".


## 🧪 Sandbox verification

- [ ] **V1** Recurring discount: subscription bills discounted every month; tier resolves;
  redemption recorded once.
- [ ] **V2** First-cycle discount: month 1 discounted, month 2 = base; tier resolves.
- [ ] **V3** No-code subscription: bills base, unchanged.
- [ ] **V4** Revise: move a discounted sub → base plan; `UPDATED` webhook syncs record.

- [ ] **V6** Billing + Membership show the correct discounted amounts + intro state.
- [ ] **V7** Admin can create/edit a subscription code (scope + level) and it applies.

## Deploy
- [ ] ⚙️ Redeploy functions; rebuild + deploy app. Verify in sandbox, then repeat catalog
  script with LIVE creds at go-live (record live ids; update LIVE maps).
