# How to Create New Products & Plans (Marketing → Code → PayPal)

**Audience:** developers adding or changing a subscription tier, plan, cadence, or price.

**Read this first if:** you want a new price/plan/tier to actually show up on the
marketing + signup pages AND charge the right amount in PayPal. Doing only part of
this list produces a **price mismatch** (customer sees one price, gets charged
another) or an **orphaned plan** (exists in PayPal but can't be selected at signup).

---

## 1. Mental model — three sources of truth

Pricing/plan data lives in **three** places that are updated by **different**
mechanisms and are NOT auto-synced:

| Source of truth | What it controls | How it's updated |
| --- | --- | --- |
| **PayPal** (Catalog Products + Billing Plans) | What the customer is actually **charged** | Seed scripts (`paypal-setup-catalog.js`) or the admin console's **Reprice** |
| **`app/src/lib/constants.ts`** (`APP_PRODUCTS`, `PAYPAL_PLANS`, `CHECKOUT_ITEMS`) | What the signup/checkout flow **displays** and which PayPal plan it **routes** the buyer to | **Hand-edited by a developer**, then redeployed |
| **Firestore `paypalPlans` registry** | What the **admin console** (this Subscriptions page) + the **webhook** (`resolvePlanTier`) see | Seed script (`seed-paypal-plans.js`) or the admin console's Reprice |
| **Marketing copy** (signup tier cards, any static pages) | The prices a prospect reads before signing up | Mostly reads `APP_PRODUCTS`; verify static HTML too |

**Key rule:** the customer-facing price comes from `constants.ts` (`APP_PRODUCTS`).
The charged price comes from the PayPal plan. **These must be kept equal by hand.**

### Why the admin UI does NOT create signup-usable plans
The admin **Subscriptions** console can reprice PayPal plans and (previously) create
them, but it can **not** edit `constants.ts` (a deployed app can't rewrite its own
source, and no script does it either). So:
- **Reprice** in the admin UI changes only PayPal + the registry. The Reprice dialog
  now shows a warning + requires an "I understand" checkbox reminding you to also
  update `constants.ts` and marketing.
- **Create Plan was removed** from the admin UI: a plan created there is orphaned for
  signup (not wired into `constants.ts`) and could only be used for admin
  "Change plan" actions. New plans are created via the scripts below instead.

---

## 2. Current catalog (reference)

Two subscription tiers, each with a monthly + quarterly (3‑month pre‑pay at 10% off)
plan. Prices in `constants.ts` (`APP_PRODUCTS`), minor units (cents):

| Tier (`tierId`) | Monthly | Quarterly (10% off) |
| --- | --- | --- |
| Online Coaching (`online_coaching`) | `20000` ($200/mo) | `54000` ($540/qtr = $180/mo) |
| Complete Transformation (`complete_transformation`) | `25000` ($250/mo) | `67500` ($675/qtr = $225/mo) |

One-time items (in‑person session $75, 4‑pack $240) are charged via the Orders API and
live only as amounts in `PAYPAL_ONETIME` — they do **not** need a Catalog Product/Plan.

Plans are minted **2‑cycle** (TRIAL seq 1 + REGULAR seq 2, both at the regular price)
so per‑subscriber discount overrides can reprice existing cycles without adding one.
See `subscription-discounts-2cycle-handoff.md`.

---

## 3. Add a new subscription plan / tier — step by step

Do this in **sandbox first**, verify end‑to‑end, then repeat for **live**.

### Step 1 — Create the Product + Plan in PayPal (script)
Run the catalog script with the target env's credentials. It creates the Catalog
Product (if new) + the 2‑cycle Billing Plan and **prints** the resulting
`PROD-…` / `P-…` ids.

```bash
# sandbox
set PAYPAL_ENV=sandbox
set PAYPAL_CLIENT_ID=...        # sandbox client id
set PAYPAL_SECRET=...           # sandbox secret
node firebase/scripts/paypal-setup-catalog.js

# add a QUARTERLY plan to an EXISTING tier product (reuses the product):
set OC_PRODUCT_ID=PROD-...      # from the monthly run
set CT_PRODUCT_ID=PROD-...
node firebase/scripts/paypal-setup-catalog.js --quarterly

# only one tier (avoid duplicating a tier that already succeeded):
set ONLY=COMPLETE_TRANSFORMATION
node firebase/scripts/paypal-setup-catalog.js
```

- To add a genuinely **new tier**, first add it to the `TIERS` array in
  `paypal-setup-catalog.js` (key, short, name, `tierId`, description, `monthly`,
  `quarterly`), then run the script.
- **Record the printed `PROD-…` and `P-…` ids** — you need them below.
- The script is NOT idempotent (PayPal doesn't dedupe by name). Run once per env and
  save the ids. To retire old base plans after a re‑mint:
  `node firebase/scripts/paypal-setup-catalog.js --deactivate-old P-OLD1,P-OLD2`

### Step 2 — Wire it into `app/src/lib/constants.ts` (the customer-facing config)
This is the step that makes the plan **visible and selectable** at signup. Update:

1. **`PAYPAL_PLANS`** (sandbox) and/or **`PAYPAL_PLANS_LIVE`** — add the new plan key →
   `P-…` id (e.g. `ONLINE_COACHING_QUARTERLY: 'P-…'`).
2. **`APP_PRODUCTS[tier]`** — set the display `amount` (monthly anchor) and, for a
   cadence variant, add/adjust the `billingOptions` entry (`period`, `planKey`,
   `amount` in minor units). This is what the signup tier cards + checkout display.
3. **`CHECKOUT_ITEMS`** — ensure there's an entry whose `productId` = the tier id and,
   for a cadence variant, `planKey` + `intervalCount` (1 monthly / 3 quarterly). This
   is what signup/checkout routing (`getCheckoutKeyForProductCadence`) uses to pick
   the right PayPal plan for the selected billing option.

> ⚠️ Prices appear in **two spots** in `constants.ts`: `APP_PRODUCTS[tier].amount`
> (monthly anchor) and each `billingOptions[].amount`. Update both so the displayed
> price matches what PayPal will charge.

### Step 3 — Map the plan → tier for the webhook (`providers/paypal.js`)
Add the new plan id to **`PLAN_TIER_MAP`** in
`firebase/functions/payments/providers/paypal.js` with its `tierId`, `tierName`, and
`intervalCount` (1 monthly / 3 quarterly). Without this the activation webhook can't
resolve which tier a subscription belongs to.

### Step 4 — Seed the `paypalPlans` registry (admin console + webhook lookup)
Add the plan to the `BASE_PLANS` array in `firebase/scripts/seed-paypal-plans.js`
(planId, productId, tierId, tierName, env, amountMinor, `intervalCount`, name), then:

```bash
node firebase/scripts/seed-paypal-plans.js            # DRY RUN (prints, writes nothing)
node firebase/scripts/seed-paypal-plans.js --commit   # write to Firestore
```

The catalog script also upserts each plan it mints, so after a fresh catalog run the
registry is usually already populated — this step backfills / re‑seeds without
re‑minting. This is what makes the plan appear in the admin **Subscriptions** table.

### Step 5 — Update marketing copy
- **Signup tier cards** (`app/src/app/signup/components/ServiceTierStep.tsx`) read
  `APP_PRODUCTS`, so they update automatically once Step 2 is done — **verify** the
  displayed prices.
- Check `app/src/lib/product-marketing.ts` and any **static marketing pages** (e.g.
  `static/services.html`) for hardcoded prices and update them to match.

### Step 6 — Deploy & verify
1. Deploy functions (`firebase deploy --only functions`) so `PLAN_TIER_MAP` is live.
2. Deploy the app so the new `constants.ts` ships.
3. In **sandbox**, run a full signup for the new plan/cadence and confirm:
   - the price shown on signup/checkout == the price PayPal charges,
   - the subscription activates and shows the correct tier + cadence in the admin
     Subscriptions console.
4. Repeat Steps 1–6 for **live** with live credentials/ids.

---

## 4. Change a price (no new plan)

You have two paths; both still require updating `constants.ts` + marketing by hand:

- **Preferred (in sync by construction):** edit `APP_PRODUCTS`/`billingOptions` in
  `constants.ts`, and reprice the PayPal plan — either via the admin **Reprice**
  dialog (fast) or by re‑running the catalog/reprice tooling. Update marketing.
- The admin **Reprice** dialog reprices PayPal + the registry only and now **warns**
  you (with a required checkbox) that you must also update the **marketing pages** and
  **`constants.ts`** or the customer will see a different price than they're charged.

Existing subscribers keep their locked‑in price until renewal (standard PayPal
behavior); a reprice affects the plan for new subscribers and future renewals per
PayPal's consumer‑notice timing.

---

## 5. Gotchas

- **Env matters:** sandbox and live have **different** `PROD-…`/`P-…` ids. Keep the
  sandbox ids in `PAYPAL_PLANS` and live ids in `PAYPAL_PLANS_LIVE`; seed the registry
  per env.
- **2‑cycle shape:** always mint plans as TRIAL(seq 1)+REGULAR(seq 2). A price change
  must update **both** cycles (the tooling does this) so the first month isn't left at
  the old price.
- **One‑time items** don't use Catalog Plans — change them in `PAYPAL_ONETIME`.
- **Quarterly = 10% off monthly × 3**, floored at $1. If you change the monthly price,
  recompute and update the quarterly `amount` too.

---

## 6. Checklist (copy/paste)

Adding or changing a subscription plan/price? You updated **all** of these:

- [ ] Ran `paypal-setup-catalog.js` for the env; recorded `PROD-…` / `P-…` ids
- [ ] `constants.ts` → `PAYPAL_PLANS` (sandbox) and/or `PAYPAL_PLANS_LIVE` (plan id)
- [ ] `constants.ts` → `APP_PRODUCTS[tier].amount` (monthly anchor)
- [ ] `constants.ts` → `APP_PRODUCTS[tier].billingOptions[].amount` (per cadence)
- [ ] `constants.ts` → `CHECKOUT_ITEMS` entry (productId + planKey + intervalCount)
- [ ] `providers/paypal.js` → `PLAN_TIER_MAP` (plan id → tier/cadence)
- [ ] `seed-paypal-plans.js` → `BASE_PLANS` + ran `--commit`
- [ ] Marketing copy verified (signup tier cards; `product-marketing.ts`; static pages)
- [ ] Deployed functions + app
- [ ] Verified in **sandbox**: displayed price == charged price; correct tier/cadence
- [ ] Repeated for **live**

---

## References
- `firebase/scripts/paypal-setup-catalog.js` — create products + 2‑cycle plans
- `firebase/scripts/seed-paypal-plans.js` — seed the `paypalPlans` registry
- `app/src/lib/constants.ts` — `APP_PRODUCTS`, `PAYPAL_PLANS`, `CHECKOUT_ITEMS`
- `firebase/functions/payments/providers/paypal.js` — `PLAN_TIER_MAP`
- `docs/02-implementation/payment-processor/subscription-discounts-2cycle-handoff.md` — 2‑cycle plan model
- `docs/02-implementation/payment-processor/prepay-plans-design.md` — quarterly cadence
