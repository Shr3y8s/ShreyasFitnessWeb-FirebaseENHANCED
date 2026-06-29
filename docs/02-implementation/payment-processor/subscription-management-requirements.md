# Subscription Management Console — Requirements

> **Status:** Draft for review (authored in this session)
> **Supersedes:** the deferred T11 (automated time-boxed recurring) / T12 (global reprice)
> notes in `subscription-discounts-tasks.md`. Those are folded into this spec.
> **Owner decisions captured:** admin-only; price changes effective at next billing
> cycle; migrate the in-code plan→tier map to a Firestore registry; build the full
> console (including Create Plan) in one cohesive effort.

## 1. Purpose

Give the business owner an in-app **"Manage Subscriptions"** console that mirrors the
capability of the PayPal merchant dashboard, so day-to-day subscription operations
never require logging into PayPal:

- See all subscription **plans**, their status, price, and active-subscription counts.
- **Create**, **modify** (reprice / rename), and **deactivate / activate** plans.
- Drill into the **subscriptions** under a plan, then into a single subscription to
  **cancel**, **pause/resume**, **change its price**, or **change its plan**.
- **Reprice** either a single client's subscription or many plans at once (bulk /
  "global" price changes as the business grows).

This removes the current dependency on (a) hardcoding PayPal plan ids in source code
and (b) performing pricing/lifecycle operations in the PayPal portal.

## 1a. Relationship to Subscription Discounts (T10)

These are two **distinct, complementary** features that share the same PayPal plan
catalog but answer different questions:

- **T10 — Subscription Discounts** = *choosing the right one of the 22 plans at signup.*
  Customer-facing. A discount code at checkout makes the server resolve
  (tier + scope + level) → the correct pre-made discounted plan id and create the
  subscription against it. It **selects** among existing plans; it never changes a
  plan's price.
- **Subscription Management Console** (this doc) = *viewing and changing those plans and
  the subscriptions attached to them, after the fact.* Admin-facing. List / create /
  reprice / deactivate plans; drill into a plan's subscriptions; cancel / pause / reprice
  an individual subscription. It **operates on** the catalog and live subscriptions, and
  (unlike T10) can **change prices** — a whole plan (`update-pricing-schemes`) or one
  subscription (`revise` pricing override).

Shared layer: the catalog/`paypalPlans` registry. T10's catalog script mints + seeds the
plans; the console manages them. The remaining T10 UI tasks (checkout discount UI,
$60 CT member entry, discount-code editor + display) live in the public checkout /
client dashboard / discount-codes admin page and are **out of scope** for this console.

## 2. Background / current state


- Subscriptions run on PayPal. The webhook receives only a `plan_id` (`P-…`) +
  `custom_id`; tier identity (`tierId`/`tierName`) is resolved via a **hardcoded**
  `PLAN_TIER_MAP` in `firebase/functions/payments/providers/paypal.js` (4 entries:
  2 sandbox + 2 live base plans). Discounted plans use a separate hardcoded
  `DISCOUNTED_PLAN_INDEX` (currently empty placeholders).
- We already have: `cancelSubscription`, `suspendSubscription`,
  `activatePaypalSubscription`, `getSubscription`, and `reviseSubscription`
  (move a sub to a different `plan_id`) in the PayPal adapter, plus the
  `revisePaypalSubscription` admin callable.
- Cancellation is "cancel at period end" (local flag + scheduled finalizer);
  PayPal is only called at period end.

## 3. Functional requirements

### Plan registry (foundation)
- **FR-1** The plan→tier mapping MUST move from the in-code `PLAN_TIER_MAP` /
  `DISCOUNTED_PLAN_INDEX` to a Firestore collection **`paypalPlans/{planId}`** that is
  readable by Cloud Functions (webhook tier resolution) and writable by the admin
  console. The in-code maps remain only as a seed/fallback.
- **FR-2** Each registry doc MUST capture: `planId`, `productId`, neutral `tierId` +
  `tierName`, `kind` (`base` | `discount`), `scope` (`null` | `recurring` |
  `first_cycle`), `level` (`null` | 10..50), `amountMinor`, `currency`, `status`
  (`ACTIVE` | `INACTIVE`), `env` (`sandbox` | `live`), `name`, timestamps.
- **FR-3** `resolvePlanTier(planId)` MUST resolve via the registry (with the hardcoded
  base ids as a safety fallback), so plans created at runtime resolve their tier
  without a code change/redeploy.
- **FR-4** A seed/migration MUST populate the registry with the existing base plan ids
  and, after the discount catalog run, the discounted plan ids.

### Plans console (Level 1)
- **FR-5** Admin MUST see a list of all plans with: plan name + `P-…` id, product,
  status (ON/OFF), current price, and **active-subscription count**.
- **FR-6** Status filter tabs: Active / Inactive / All. Search by plan id.
- **FR-7** Admin MUST be able to **deactivate** (PayPal `/deactivate`) and
  **activate** (`/activate`) a plan. Deactivation blocks NEW subscriptions only;
  existing subscribers are unaffected.
- **FR-8** Admin MUST be able to **create a plan** (PayPal `POST /v1/billing/plans`)
  under an existing product, specifying price + interval; the new plan id is written
  to the registry (with chosen tier).
- **FR-9** Admin MUST be able to **modify** a plan's price via PayPal
  `update-pricing-schemes` (and rename/description where supported).
- **FR-10** Clicking a plan's active-subscription count MUST open the filtered
  subscriptions list for that plan.

### Bulk / global reprice
- **FR-11** Admin MUST be able to select one or more plans (checkboxes) — or use a
  quick-select **"All OC" / "All CT"** that selects every plan in a tier category —
  and apply ONE pricing action to all selected plans: **increase/decrease by X%**,
  **increase/decrease by $Y**, or **set to exact $Z**.
- **FR-12** A bulk reprice MUST present a **preview** (old → new price per selected
  plan) for confirmation before applying. A $1.00 minimum-charge floor applies.
- **FR-13** After repricing **base** plans, the server-side price constants used for
  NEW checkouts (`SUBSCRIPTION_PRICE_MINOR` / `app/src/lib/constants.ts`) MUST be
  updated to match.

### Subscriptions list + detail (Levels 2–3)
- **FR-14** A "Subscriptions" view MUST list subscriptions (client, plan, status,
  next billing date, price), sourced from Firestore `users` docs (PayPal has no
  list-subscriptions API). Filterable by plan.
- **FR-15** A subscription detail view MUST show full info and offer actions:
  **Cancel** (existing cancel-at-period-end), **Pause/Resume** (existing
  suspend/activate), **Change price** (per-client reprice), **Change plan**
  (existing revise to another plan id).

### Per-client reprice
- **FR-16** Admin MUST be able to change a single subscription's monthly price WITHOUT
  switching its plan, via PayPal `revise` with an inline pricing override on the same
  `plan_id`. The change is effective at the **next billing cycle**.
- **FR-17** The new price + an **effective date** MUST be stored optimistically so the
  app's billing/membership UI is not stale before the next charge reconciles via the
  `BILLING.SUBSCRIPTION.UPDATED` webhook.

### Access control
- **FR-18** All console operations MUST be **admin-only** (`userData.role === 'admin'`).
  Trainers (employees) MUST NOT have access. (An owner may be `admin` with
  `canTrain: true`; access keys off `role === 'admin'`, not `canTrain`.)

### Client-facing display
- **FR-19** When a client's price changes (per-client or via a global reprice that
  affects their plan), their membership/billing page SHOULD show the new amount and a
  "new price effective {date}" note.

## 4. Non-goals (this iteration)
- **NG-1** Syncing price edits made directly in the **PayPal portal** back into the app
  (explicitly deferred; revisit post-launch).
- **NG-2** Automated time-boxed recurring promos (old T11 — scheduled auto-revise after
  N cycles). May be layered on later using the same `reviseSubscriptionPricing`.
- **NG-3** Multi-processor support (the registry is intentionally PayPal-specific and
  lives on the PayPal side of the provider seam).

## 5. Constraints & risks
- **C-1** PayPal has **no API to list subscriptions** (or by plan). Active-sub counts
  and lists come from our Firestore `users` data.
- **C-2** We previously hit `422 INVALID_BILLING_CYCLE_SEQUENCE` sending a
  `billing_cycles` override at subscription **create** time. The `revise` pricing
  override is a different, supported operation, but MUST be **validated in sandbox**
  before wiring UI.
- **C-3** Deployed Cloud Functions code is read-only/ephemeral and multi-instance, so
  the webhook cannot mutate an in-code map — hence the Firestore registry (FR-1).
- **C-4** PayPal applies consumer-notice/effective-date timing to existing subscribers
  on plan/price changes; "effective next cycle" reflects this.

## 6. Acceptance criteria (high level)
- An admin can, entirely in-app: create a plan, reprice it (singly or in bulk with a
  preview), deactivate/activate it, see how many active subs are on it, drill into a
  subscription, and cancel/pause/resume/reprice/change-plan it.
- A newly created plan's subscriptions resolve the correct tier on the activation
  webhook **without a code deploy** (registry-backed).
- A per-client reprice takes effect at the next billing cycle and the client's
  membership page reflects the new price + effective date.
- Trainers cannot access any of the above; only `role === 'admin'`.
