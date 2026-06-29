# Subscription Discounts (PayPal discounted-plan fallback) — Requirements

Status: Draft (spec-driven). Supersedes the blocked first-cycle-override approach in
`discount-codes-tasks.md` (T9). Sandbox/dev only — no production clients exist, so no
backward compatibility is required.

## 1. Background & problem

Feature 2 (discount codes) shipped working for ONE-TIME purchases. Subscription
discounts were attempted via a PayPal subscription-create `plan.billing_cycles`
override (T9). That approach is **fundamentally unsupported**: PayPal's create-time
plan override can only RE-PRICE billing cycles that already exist in the plan. Our
plans have a single cycle, so any discounted subscription returns:

```
422 UNPROCESSABLE_ENTITY  INVALID_BILLING_CYCLE_SEQUENCE
field: /plan/billing_cycles/1/sequence  value: "2"
```

> **MODEL UPDATE (2026-06-27): 2-cycle override, NOT pre-created discounted plans.**
> The shipped solution is NOT the "22 pre-created discounted plans" approach this doc
> originally described. Instead each tier has a SINGLE base plan minted as **2 billing
> cycles** (TRIAL seq 1 + REGULAR seq 2, both at the regular price). A discount is
> applied as a **create-time `plan.billing_cycles` override** computed server-side from
> the code — the override REPRICES the existing cycles (PayPal can reprice existing
> cycles, it just can't ADD one, which is why the base plan is 2-cycle). Intro =
> reprice seq 1 (TRIAL, `total_cycles:N`) only → auto-reverts after N; recurring =
> reprice both. See `subscription-discounts-2cycle-handoff.md` (source of truth) +
> design §1. The FRs below are kept for history; where they say "pre-created discounted
> plan / 22 plans / DISCOUNTED_PLAN_INDEX", read "2-cycle base plan + create-time override".

A safety fix is already in place (subscription checkout reverted to the known-good
client-side create; the discount field is hidden for subscription mode; the server
rejects a `discountCode` on subscription create). This feature replaces that stop-gap
with the supported pattern: a **2-cycle base plan + a server-computed create-time
billing-cycles override** selected when a code is applied.


## 2. Pricing model (new, fresh catalog)

| Item | Type | Price |
|------|------|-------|
| Online Coaching (OC) | subscription | **$200.00/mo** |
| Complete Transformation (CT) | subscription | **$250.00/mo** |
| In-person session (public) | one-time | $75.00 |
| In-person 4-pack (public) | one-time | $240.00 |
| In-person session (CT member) | one-time | **$60.00** |

- Neither subscription has a setup fee (CT's old $60 setup fee is removed).
- CT's distinguishing feature is access to the **$60 member in-person session**.

## 3. Functional requirements

### Discount codes (subscriptions)
- **FR-1** Discount codes carry a `discountScope` of `first_cycle` (intro: discounted
  first month, then base price) or `recurring` (discounted every month) — in addition
  to the existing `one_time` scope for session purchases.
- **FR-2** Supported discount levels are **10%, 20%, 30%, 40%, 50%** off the monthly
  base (straight percentage, to the cent). A `$1.00` minimum-charge floor applies
  (PayPal rejects $0).
- **FR-3** For a subscription-scoped code, the server resolves
  **(buyer tier) + (code scope) + (code level) → a specific pre-created discounted
  Billing Plan id** and creates the subscription against that plan id. NO billing-cycle
  override is ever sent.
- **FR-4** The client never sets price. The server is the sole authority on which plan
  (and therefore which amount) is used.
- **FR-5** A redemption is recorded once per subscription (idempotent on the
  subscription id), as today.
- **FR-6** Subscription discount codes are entered at checkout in the same discount
  field used for one-time purchases (re-enabled for subscription mode).

### Catalog / plans
- **FR-7** PayPal holds **22 subscription Billing Plans**: 2 base (OC $200, CT $250) +
  20 discounted (OC & CT × 5 levels × {first_cycle, recurring}).
- **FR-8** Only the **2 base subscriptions + 2 public one-time items** are surfaced in
  the signup/checkout UI (exactly as today). The 20 discounted plans are never shown in
  a picker; they are selected server-side by discount code.
- **FR-9** App tier ids (`online_coaching`, `complete_transformation`) are UNCHANGED.
  Every base AND discounted plan id maps back to its tier id via `PLAN_TIER_MAP`, so
  `user.tier` semantics, check-in eligibility, and all tier logic are unaffected.

### CT member $60 session
- **FR-10** A `$60` in-person session item, **available to CT members only**
  (server validates the buyer's active tier is CT), **unlimited** quantity.
- **FR-11** OC members do NOT get the $60 rate; the public $75 single / $240 4-pack
  remain. The $60 session is purchased post-signup from the client dashboard and
  credits a session via the existing one-time fulfillment path.

### Admin / lifecycle
- **FR-12** Admin can **change a subscriber's plan** (PayPal `revise`) to any plan id —
  to end a promo (move to base), move tier, or reprice an individual. The
  `BILLING.SUBSCRIPTION.UPDATED` webhook keeps the neutral record + tier in sync.
- **FR-13** Admin discount-code editor can set/edit `discountScope` and level for
  subscription codes.
- **FR-14 (later, T11)** Time-boxed recurring discounts: a per-code "duration in
  months" after which the subscription is automatically revised to the base plan.
- **FR-15 (optional, later, T12)** Global price change via PayPal
  `update-pricing-schemes` on a base plan (affects all subscribers on that plan).
- **FR-18 (deferred — Case B, T13)** Temporary discount on an EXISTING active
  subscription with **auto-revert**: an admin applies an N-month discount to a
  subscriber who is ALREADY subscribed (not a signup/checkout discount), and the price
  automatically returns to full after N months. This is distinct from the signup intro
  discount (FR-1 `first_cycle`), which is baked in at create time.
  - **Constraint:** the per-client PATCH (`PATCH /v1/billing/subscriptions/{id}` on the
    REGULAR cycle's `pricing_scheme`) has **no `total_cycles`** — it cannot self-expire,
    so PayPal will NOT auto-revert a PATCHed price. Auto-revert must be orchestrated by us.
  - **Approach:** (1) PATCH the REGULAR cycle down to the discounted price; (2) store
    `{ revertAfterCycles: N, revertToMinor, cyclesSeen: 0 }` on the subscriber's neutral
    record; (3) on each `PAYMENT.SALE.COMPLETED` renewal webhook, increment `cyclesSeen`
    and, once it reaches N, PATCH the price back to `revertToMinor` and clear the markers.
  - Out of scope for this phase (see §6).


### Portal display
- **FR-16** Billing and Membership sections display the **actual charged amount**
  (post-discount) and tier, read from the neutral Firestore subscription record written
  by the webhook. Intro state is represented (e.g. "intro $200 first month, then $250/mo").

## 4. Cleanup (sandbox cutover)
- **FR-17** Cancel existing test subscriptions, then **deactivate** the old OC/CT base
  plans (PayPal plans cannot be hard-deleted), then bulk-delete test user accounts. The
  one-time session items have no PayPal plan to delete (Orders API only).

## 5. Non-functional requirements
- **NFR-1** Server-authoritative amounts; no chargeable value trusted from the client/URL.
- **NFR-2** Portal history/amounts come from the neutral Firestore store, not live PayPal reads.
- **NFR-3** Idempotent fulfillment + redemption (dedupe on subscription/capture id).
- **NFR-4** Provider-neutral seam preserved: PayPal specifics stay in
  `providers/paypal.{js,ts}` + `payments/*`; the app uses the neutral interface.
- **NFR-5** Dual-env (sandbox/live) parity: the catalog script and plan maps support both.

## 6. Out of scope (this feature)
- Stripe (dormant/retired).
- Apple Pay / Google Pay (deferred).
- Automated time-boxed recurring (T11) and global reprice (T12) — specified but
  scheduled after the core discounted-plan flow.
