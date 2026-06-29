# Subscription Discounts — 2-Cycle Override Model — HANDOFF NOTE

> Status: **BUILT (code complete, sandbox plans minted).** Remaining: seed registry,
> deactivate old sandbox plans, spec-doc updates, sandbox V-checks, T10 UI.
> Last validated/built in PayPal **sandbox** on 2026-06-27.
>
> ## Build progress (2026-06-27)
> - paypal.js: removed `DISCOUNTED_PLAN_INDEX`/`resolveDiscountedPlan`; added
>   `buildPriceOverride({scope,discountedMinor,regularMinor,trialCycles})`; wired into
>   `createSubscription` + `createSubscriptionWithCard`; exports fixed.
> - payments/index.js: `resolveSubscriptionPlan` now returns `{planToUse(base),
>   customId, override}`; both create call sites pass the override.
> - `paypal-setup-catalog.js` rewritten to mint 2-cycle TRIAL+REGULAR base plans (no
>   more 20-plan minting). RAN in sandbox 2026-06-27 → new ids:
>     - OC: `P-1UL86855135904642NJAFK4I` (product `PROD-51P94209CF452694B`) $200
>     - CT: `P-28C55086862794508NJAFK4I` (product `PROD-5D236001YV287835G`) $250
> - Threaded new ids into: `app/src/lib/constants.ts` SANDBOX_PLANS, paypal.js
>   PLAN_TIER_MAP, `seed-paypal-plans.js` BASE_PLANS.
> - `node --check` (all) + app `tsc --noEmit` PASS.
> - OLD sandbox base plans to deactivate: `P-98H09129JK640830CNI26BLQ` (OC),
>   `P-9YF75345BP118725ENI26GLI` (CT).
>
> ## Remaining commands / steps
> 1. Seed registry: `node firebase/scripts/seed-paypal-plans.js --commit`
> 2. Deactivate old sandbox plans:
>    `set PAYPAL_ENV=sandbox && set PAYPAL_CLIENT_ID=… && set PAYPAL_SECRET=… &&`
>    `node firebase/scripts/paypal-setup-catalog.js --deactivate-old P-98H09129JK640830CNI26BLQ,P-9YF75345BP118725ENI26GLI`
> 3. Update subscription-discounts-{requirements,design,tasks}.md to the override model.
> 4. Sandbox V-checks: recurring sub, intro auto-revert, per-client PATCH; finish T10 UI.
> 5. Cleanup throwaway plan `P-04S785998J181512ANJAEVHQ` + APPROVAL_PENDING test subs.
> 6. Live cutover: re-mint the 2 LIVE base plans as 2-cycle + update LIVE_PLANS/PLAN_TIER_MAP.


---

## 1. What was decided

Replace the old **22-plan model** (2 base + 20 pre-minted discounted plans) with a
**2-plan model**:

- Mint exactly **2 base plans** (Online Coaching, Complete Transformation), each as a
  **2-cycle plan**: `TRIAL` (seq 1) + `REGULAR` (seq 2), both initially at the regular price.
- Apply all signup discounts via a **create-time `plan` override** on the subscription
  (the base plan itself is never changed for other customers).
- Keep the already-shipped **per-client PATCH reprice** for after-signup price changes.

---

## 2. Why 2 cycles (the hard constraint)

A create-time `plan` override **and** a `PATCH /v1/billing/subscriptions/{id}` can only
**REPRICE cycles that already exist** on the base plan. **Neither can ADD a cycle.**

- On a **1-cycle** base plan, an intro override that references seq 2 → `422 INVALID_BILLING_CYCLE_SEQUENCE`.
- On a **2-cycle** base plan, both intro and recurring overrides succeed.

This is the root cause of the original `INVALID_BILLING_CYCLE_SEQUENCE` 422 (compounded by
the old `buildFirstCycleOverride` wrongly emitting **two REGULAR cycles** instead of TRIAL+REGULAR).

### Validation (sandbox, `firebase/scripts/paypal-validate-revise-pricing.js --mint2cycle`)
- Minted a throwaway 2-cycle TRIAL+REGULAR plan.
- INTRO override (seq 1 only) → **201** ✅
- RECURRING override (seq 1 + seq 2) → **201** ✅
- **2-plan model PROVEN.**

---

## 3. Validated override shapes (2-cycle base plan)

Every cycle MUST include `frequency: { interval_unit: "MONTH", interval_count: 1 }`.

- **INTRO** (discount first N cycles, then auto-revert):
  reprice **seq 1 only** — `tenure_type:"TRIAL"`, `total_cycles:N`, `pricing_scheme.fixed_price = discounted`.
  Leave seq 2 (REGULAR, `total_cycles:0`) at full price; PayPal auto-reverts after N.
- **RECURRING** (permanent discount):
  reprice **seq 1 AND seq 2** to the discounted value.

(`total_cycles:0` is valid ONLY on the REGULAR/last cycle = bill forever.)

---

## 4. A vs B for applying the signup discount

Both work on a 2-cycle base plan; difference is minor:

- **A — override-at-create (DEFAULT):** bake the override into the create call.
  Discount is in place before the `APPROVAL_PENDING` first charge → **no approval-timing race.** One API call.
- **B — create-plain-then-PATCH:** reuses the shipped PATCH helper, but has a small
  first-charge race at approval.

→ Go with **A**. Keep PATCH for after-signup changes (already shipped/validated).

---

## 5. Build checklist (remaining)

1. **Re-mint OC + CT base plans as 2-cycle** TRIAL(seq1, total_cycles:1, regular price) +
   REGULAR(seq2, total_cycles:0, regular price). Update `paypalPlans` registry (2 base ids only),
   `SUBSCRIPTION_PRICE_MINOR` (`firebase/functions/payments/index.js`), and
   `app/src/lib/constants.ts`. **Reconcile OC sandbox $250 vs registry $200 here.**
2. **Adapter:** replace `buildFirstCycleOverride` in `firebase/functions/payments/providers/paypal.js`
   with `buildPriceOverride({ scope, discountedMinor, regularMinor, trialCycles })`:
   - `scope:"intro"` → reprice seq 1 (TRIAL, total_cycles:N) only.
   - `scope:"recurring"` → reprice seq 1 + seq 2.
   - both include `frequency`.
   Wire into `createSubscription` + `createSubscriptionWithCard` (path A: bake at create).
3. **Retire the 22-plan model:** delete `DISCOUNTED_PLAN_INDEX` + `resolveDiscountedPlan`
   from paypal.js; simplify `resolveSubscriptionPlan` in payments/index.js to keep the base
   plan id + attach the computed override (still thread uid/code in `custom_id`); drop the
   20-plan minting from `firebase/scripts/paypal-setup-catalog.js`.
4. **Update spec docs:** `subscription-discounts-{requirements,design,tasks}.md` → override model.
   (`subscription-management-{design,tasks}.md` already record the PATCH/per-client verdict.)
5. **Verify:** `node --check` (functions) + app `tsc --noEmit`; sandbox V-checks
   (recurring sub, intro auto-revert, per-client PATCH); finish T10 UI
   (T10.6 re-enable discount checkout, T10.7b CT $60 member session, T10.8 admin discount editor/display).
6. **Sandbox cleanup:** deactivate throwaway plan `P-04S785998J181512ANJAEVHQ` +
   APPROVAL_PENDING test subs `I-AP1AXW0UT5TB`, `I-KEU6WKP21XKP`.

---

## 6. Reference facts

- OC sandbox base plan: `P-98H09129JK640830CNI26BLQ`, product `PROD-2P670379WE121992A`,
  real PayPal price **$250** (registry has OC at **$200** — mismatch to reconcile).
- `SUBSCRIPTION_PRICE_MINOR = { online_coaching: 20000, complete_transformation: 25000 }`.
- Per-client PATCH (SHIPPED): `PATCH /v1/billing/subscriptions/{id}` body
  `[{op:"replace", path:"/plan/billing_cycles/@sequence==<regSeq>/pricing_scheme/fixed_price",
  value:{currency_code, value}}]` → 204. regSeq=1 for base/recurring, 2 for first_cycle/intro.
  Shallower paths (`/plan`, `…/pricing_scheme`) → `INVALID_PATCH_PATH`.
- `/revise` is ONLY for moving to a **different** plan_id (same-plan override →
  `422 OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED`).
- Script env: `PAYPAL_ENV` / `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` (sandbox, plain env vars).
- Checks: `node --check <file>`; `cd app && node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`.
