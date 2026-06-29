# Pre-Pay (Multi-Month) Subscription Plans — Requirements

Status: Draft (2026-06-29)
Owner: Payments
Related: subscription-management-*, subscription-discounts-*, discount-codes-*, payment-processor-*

## 1. Summary

Offer subscription tiers (Online Coaching, Complete Transformation) on a **3-month
pre-pay** cadence that bills once every 3 months, in addition to the existing monthly
cadence. Same tier (same features), different billing period. The quarterly option is
priced at a configurable discount (default **10%**) versus paying monthly, to reward a
longer up-front commitment.

The work ships in **two independently deployable phases**:

- **Phase A — De-assume "monthly."** Refactor the codebase so billing cadence is a
  first-class variable (`period` / `intervalCount` = 1, 3, 12 …) instead of the
  hardcoded `"month"` assumption baked across the payment path. ZERO behavior change:
  production still only sells monthly (`intervalCount = 1`). Ship + verify first.
- **Phase B — Quarterly plans.** Mint the quarterly PayPal plans, expose a
  Monthly/Quarterly choice at signup/checkout, add admin discount configuration, and
  the no-refund messaging. Built only after Phase A is verified in production.

## 2. Goals / Non-Goals

### Goals
- Sell OC and CT as either **monthly** or **quarterly (3-month pre-pay)**.
- Quarterly billed once per quarter; renews automatically every 3 months.
- Quarterly price = `monthly × 3 × (1 − discountPct)`, **discountPct admin-configurable**
  (default 10%).
- No "monthly" assumption left in code: a single `period`/`intervalCount` drives PayPal
  plan creation, price overrides, fulfillment, MRR math, "next billing" dates, and UI.
- MRR / revenue analytics correctly **normalize** multi-month charges (a $540/quarter
  plan contributes $180 MRR, not $540).
- Clear, explicit **no-refund / access-until-period-end** messaging for quarterly.

### Non-Goals (this iteration)
- Annual (12-month) plans — the model must SUPPORT `intervalCount = 12`, but no annual
  plan is minted now.
- In-app **monthly ↔ quarterly switch** flow. Switching is handled operationally as
  "cancel at period end, then start a new subscription next period" (documented, no new
  code).
- Prorated / partial refunds on cancel.
- New tiers or feature-gating changes. `user.tier` stays `online_coaching` /
  `complete_transformation`; `FEATURE_MATRIX` and check-in eligibility are untouched.

## 3. Functional Requirements

### Phase A — Period as a first-class variable
- **FR-A1.** Introduce a `BillingPeriod` concept = `{ intervalUnit: 'MONTH',
  intervalCount: number }` with derived `months` and a human label
  (`monthly` | `quarterly` | `annual`). Single source of truth in `app/src/lib/constants.ts`.
- **FR-A2.** Each subscription `AppProduct` gains a `billingOptions: BillingOption[]`
  (each option = a period + its plan key + its price in minor units). In Phase A only the
  monthly option is populated.
- **FR-A3.** PayPal plan creation (`createPlan`) and the per-subscriber price override
  (`buildPriceOverride`) MUST accept `intervalCount` instead of hardcoding `1`. Existing
  monthly callers pass `1` → byte-for-byte identical PayPal bodies.
- **FR-A4.** Subscription activation/renewal neutral events MUST carry the real
  `intervalCount` (and/or `months`) rather than the literal string `"month"`.
- **FR-A5.** Fulfillment MUST persist the cadence (`intervalCount` + derived `months`) on
  the user doc and the `subscriptions` record alongside `amount`.
- **FR-A6.** Server-side original-price resolution (`SUBSCRIPTION_PRICE_MINOR`, used by
  the discount engine) MUST be keyed by **(tier, period)**, not tier alone.
- **FR-A7.** MRR / revenue calculations MUST normalize to a monthly figure:
  `mrr = amount ÷ months`.
- **FR-A8.** "Next billing date" derivation MUST add `months` (not a hardcoded 1 month)
  wherever PayPal's `next_billing_time` is unavailable and a fallback is computed.
- **FR-A9.** Membership / Billing / Admin subscription views MUST render the cadence
  ("billed monthly" / "billed every 3 months") from stored data.
- **FR-A10.** Phase A is behavior-preserving: with only monthly options configured, every
  user-visible value, PayPal request, and stored field is identical to today.

### Phase B — Quarterly plans
- **FR-B1.** Mint 2-cycle (TRIAL seq1 + REGULAR seq2) PayPal base plans at
  `interval_unit: MONTH, interval_count: 3` for OC and CT, in **both** sandbox and live.
- **FR-B2.** Register the 4 new plan ids (2 sandbox + 2 live) → same tier + their period,
  in `PLAN_TIER_MAP` and the `paypalPlans/{planId}` Firestore registry.
- **FR-B3.** Pricing + checkout surfaces expose a **Monthly / Quarterly** choice that
  resolves to the correct plan id and price; quarterly displays the savings
  ("Save 10%" / effective per-month price).
- **FR-B4.** Default quarterly price at 10%: OC **$540** ($180/mo), CT **$675** ($225/mo).
- **FR-B5.** Admin can configure the quarterly **discount %** (per tier or a single global
  value) from the admin dashboard. Saving reprices the quarterly PayPal plans
  (`updatePlanPricing`) and updates the displayed price — config drives price (one source
  of truth, no drift).
- **FR-B6.** Quarterly checkout MUST show explicit no-refund / access-until-period-end
  copy; ToS updated accordingly.
- **FR-B7.** Discount-code price overrides applied to a quarterly subscription MUST use
  the plan's `intervalCount` (3) so PayPal accepts the override.
- **FR-B8.** A change of `discountPct` reprices the plan for NEW/renewing subscribers
  only; existing quarterly subscribers keep their locked-in price until renewal
  (PayPal behavior — documented, not a bug).

## 4. Non-Functional Requirements
- **NFR-1.** Dual env (sandbox/live) parity — quarterly plans exist in both, selected by
  `NEXT_PUBLIC_PAYPAL_ENV` exactly like monthly.
- **NFR-2.** Server-authoritative pricing — the client never supplies an amount or chooses
  a price; only a plan/period key. All amounts resolved server-side.
- **NFR-3.** Phase A regression safety — existing jest suite stays green; `node --check`
  on changed JS; `tsc --noEmit` on the app.
- **NFR-4.** Backward compatibility — existing monthly subscribers and their stored docs
  continue to work; missing `intervalCount`/`months` defaults to monthly (1).

## 5. Acceptance Criteria
- **Phase A:** With only monthly options live, a fresh OC and CT purchase, a renewal, the
  membership/billing pages, the admin subscriptions list, and the revenue dashboard all
  show identical values to pre-refactor. MRR for a monthly plan unchanged. Build checks
  pass. Deployed and smoke-tested before Phase B starts.
- **Phase B:** In sandbox, a buyer can pick Quarterly for OC and CT, is charged the
  discounted quarterly amount once, `user.tier` is the same tier, feature access is
  identical to monthly, next billing is +3 months, MRR shows the normalized monthly
  figure, and the admin can change the discount % and see the plan reprice. No-refund copy
  present at checkout.

## 6. Open Questions
- Single global quarterly discount %, or per-tier? (Design assumes per-tier with a shared
  default; UI can expose one field that writes both.)
- Annual: confirm we only need the *model* to support `intervalCount = 12` now, with no
  annual plan minted. (Assumed yes.)
