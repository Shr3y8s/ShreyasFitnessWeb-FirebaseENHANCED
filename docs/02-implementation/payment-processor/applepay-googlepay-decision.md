# Apple Pay & Google Pay via PayPal — Architecture Decision Record (ADR)

> **Status:** Accepted
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-04
> **Decision:** Add Apple Pay + Google Pay as **one-time** wallet buttons via PayPal's
> Orders v2 (Advanced/Expanded Checkout) — **Option A** — now; **defer** wallet-funded
> **recurring** (Orders v2 + Vault + a self-managed billing engine — **Option B**) as a
> data-gated future phase.
> **Supersedes/expands:** the "Phase 2" stub in `paypal-payment-methods-{requirements,design,tasks}.md`.
> **Feeds:** `applepay-googlepay-requirements.md`, `applepay-googlepay-design.md`,
> `applepay-googlepay-tasks.md`.

---

## 1. Purpose

This ADR records **two** decisions and the reasoning behind them, so future
contributors understand *why* the code is shaped the way it is:

1. **Why our subscriptions use PayPal's Billing Plans / Subscriptions API today —
   NOT the newer Orders v2 + Vault ("Save Payment Methods") approach.**
2. **Given that, which of the two Apple Pay / Google Pay integration options we chose,
   and why we deferred the other.**

---

## 2. Background — the two PayPal server models

PayPal exposes two fundamentally different ways to charge a buyer more than once:

### 2a. Billing Plans / Subscriptions API (what we use today)
- You mint a **billing plan** (`P-xxxx`) with a price + cadence; you create a
  **subscription** (`POST /v1/billing/subscriptions`) against it.
- **PayPal runs the billing clock**: it schedules renewals, retries failed payments
  (dunning), handles proration, and emits lifecycle webhooks
  (`BILLING.SUBSCRIPTION.ACTIVATED`, `PAYMENT.SALE.COMPLETED`,
  `BILLING.SUBSCRIPTION.CANCELLED/SUSPENDED/EXPIRED`).
- Cancel / pause / resume are single REST calls
  (`/v1/billing/subscriptions/{id}/cancel|suspend|activate`).

### 2b. Orders v2 + Vault ("Save Payment Methods")
- You create a **one-time order** (`/v2/checkout/orders`) and, during that first
  purchase, **vault** the payment instrument (you get back a `customer.id` +
  `vault_id`).
- For every subsequent charge, **your server** creates + captures a new order against
  the stored `vault_id` — **you own the billing schedule, retries, and state**. PayPal
  does **not** run a clock and does **not** emit `BILLING.SUBSCRIPTION.*` events.
- This is the model PayPal's modern Apple Pay / Google Pay JS SDK integration is built
  around (Advanced/Expanded Checkout).

---

## 3. Decision 1 — why Billing Plans, not Orders v2 + Vault, for subscriptions

We deliberately built our recurring memberships (Online Coaching, Complete
Transformation) on the **Billing Plans / Subscriptions API**. Rationale:

- **PayPal operates the recurring engine for us.** Renewals, dunning/retries,
  proration, and next-billing math are handled by PayPal and delivered idempotently
  via webhooks. With Orders v2 + Vault we would have had to **build and operate our own
  subscription engine** — a scheduled charge job, retry/dunning logic, failure
  handling, and self-managed next-billing state — from day one.
- **Our discount model depends on it.** App-managed discount codes reprice a
  subscription via a per-subscriber **`billing_cycles` override** on the 2-cycle base
  plans (`buildPriceOverride`, see `subscription-discounts-2cycle-handoff.md`). That
  mechanism is intrinsic to the Billing Plans model; Vault+Orders has no equivalent —
  we would have had to compute and apply every discounted charge ourselves.
- **Cancel / pause / resume are first-class.** Our neutral
  cancel/pause/resume flows map directly to PayPal subscription endpoints. Under
  Vault+Orders, "cancel" becomes "stop scheduling," which we would have to implement
  and reconcile ourselves.
- **Our analytics + dashboards read managed state.** MRR, active-subscription counts,
  "Next Billing," and renewal history are driven by the subscription lifecycle webhooks
  we already consume. A self-managed engine would have to write all of that.

**Net:** For a plan-priced membership, the Billing Plans API gives us managed recurring
billing with far less code and far fewer failure modes. Orders v2 + Vault would have
meant re-implementing a payment processor's subscription engine with no offsetting
benefit. This remains the right choice for our subscriptions.

> **Note on ACDC card subscriptions.** Our in-page ACDC hosted card fields are disabled
> for `mode === 'subscription'` because headless vaulted-card subscriptions need
> PayPal's **Reference Transactions** capability (the older Billing-Agreements
> approval), which is not enabled on the account. Card-paying subscribers use PayPal's
> hosted guest-card Smart Button instead. This is a separate constraint from the
> vaulting toggle discussed below, but it's the same *theme*: our subscription path is
> the managed Billing-Plans path.

---

## 4. Decision 2 — the two Apple Pay / Google Pay integration options

Both wallets can, in principle, fund **one-time** *and* **recurring** payments via
PayPal. But the recurring path is a different engine (see §2). That gives us two
concrete options.

### Option A — Orders v2, one-time (no vault) ✅ CHOSEN (build now)
- Render dedicated **Apple Pay** / **Google Pay** buttons (separate PayPal SDK
  components — `applepay` / `googlepay` — plus Google's `pay.js`), eligibility-gated.
- On tap: server `createPaypalOrder` → device wallet sheet → `confirmOrder` → server
  `capturePaypalOrder` → the **existing** idempotent `PAYMENT.CAPTURE.COMPLETED`
  webhook fulfills.
- **Zero new fulfillment code.** Discounts apply automatically (amount is set
  server-side on the order). Prereqs: Advanced/Expanded Checkout (already have it —
  ACDC works), Apple Pay **domain registration** (file already obtained), Google Pay
  **production approval**.
- **Covers:** our one-time items — in-person session ($75) and 4-pack ($240).

### Option B — Orders v2 + Vault, recurring (deferred) ⏸️
- First charge vaults the wallet token (`payment_source.apple_pay.attributes.vault` +
  `customer.id`); store `customer.id` + `vault_id`. A **self-managed scheduled job**
  then charges the `vault_id` each period via Orders v2 — a **second subscription
  engine running beside** the Billing-Plans one (two renewal mechanisms, two cancel
  paths, two discount mechanisms, two sources of "next billing").
- **Prerequisite is lighter than first assumed:** the modern JS SDK + Orders v2 path
  needs **"Save Payment Methods" (Vaulting)** toggled on in Developer Dashboard → REST
  App → Features → Payment Capabilities — often **self-serve**, **NOT** the heavyweight
  **Reference Transactions** underwriting (credit checks, business plan) associated with
  the older Billing-Agreements flow. Some accounts may still be prompted to apply;
  verify which your account shows. Also requires **MPAN** (merchant token) config for
  **Visa** recurring, and honoring Apple's rule that a vaulted Apple Pay instrument is
  charged **silently server-side** (no "pay with saved Apple Pay" button for returning
  buyers).

### Why we chose A and deferred B — the value/effort case
- **Where wallets actually win: one-time, in-the-moment purchases.** The gym crowd
  buying a session or 4-pack is phone-in-hand and wants to tap-and-pay in seconds. That
  is exactly our **one-time** products — the highest-ROI, lowest-risk slice.
- **Where wallets matter least: the monthly membership signup.** Members subscribe
  deliberately, typically on a laptop/desktop at home or the office. In that considered
  decision, entering a card or using PayPal is completely acceptable; the one-tap
  convenience adds little.
- **B is a large, higher-risk build** (a parallel self-managed billing engine) for the
  scenario where wallets add the least value. That is the textbook case to ship the
  high-ROI slice now and not pay for the expensive slice until there's evidence.
- **A gives us that evidence cheaply.** Once A is live we can watch how often buyers
  pick Apple/Google Pay for session packages. High share → justifies revisiting B for
  memberships. Low share → we've avoided building a second billing engine for nothing.

**For subscriptions today:** wallet buttons simply **don't render** in `mode ===
'subscription'` (eligibility-guarded, non-fatal); buyers use the existing PayPal button
/ guest-card path — the same fallback that already exists.

---

## 5. Consequences

- **Positive:** high-value wallet convenience on one-time checkout; no new fulfillment;
  discounts unaffected; subscriptions untouched (no risk to the managed billing engine);
  a usage signal to decide B later.
- **Negative / accepted:** no wallet option for membership signup (judged low value);
  Apple Pay requires a registered domain + real-device verification on live; Google Pay
  requires Google production approval.
- **Revisit B when:** one-time wallet adoption is high AND we confirm the self-serve
  vaulting toggle, at which point we open a dedicated Option-B spec (Vault + Orders +
  scheduled-charge engine, MPAN, dunning, cancel-as-stop-scheduling, and how it
  reconciles with — or replaces — the Billing-Plans model).

---

## 6. References (buyer research, 2026-07-04)

- PayPal — Apple Pay integration options: https://dev.to/paypaldeveloper/apple-pay-integration-options-with-paypal-41k7
- PayPal — Save payment methods during purchase (Apple Pay, JS SDK): https://developer.paypal.com/docs/checkout/save-payment-methods/during-purchase/js-sdk/applepay/
- PayPal (multiparty) — Save Apple Pay during purchase: https://developer.paypal.com/docs/multiparty/checkout/save-payment-methods/during-purchase/js-sdk/applepay/
- PayPal — What is Expanded/Advanced Checkout: https://www.paypal.com/us/cshelp/article/what-is-paypal-expanded-checkout-and-how-do-i-get-started-help953
- PayPal — Save payment methods (Orders API, PayPal): https://developer.paypal.com/docs/checkout/save-payment-methods/during-purchase/orders-api/paypal/
- PayPal (Braintree) — Google Pay guide (vault/recurring card-type matrix): https://developer.paypal.com/braintree/articles/guides/payment-methods/google-pay
- PayPal (Braintree) — Apple Pay client-side (MPAN / recurringPaymentRequest): https://developer.paypal.com/braintree/docs/guides/apple-pay/client-side/ios/v5
- PayPal — Save payment methods for recurring (multiparty standard): https://developer.paypal.com/docs/multiparty/checkout/standard/customize/save-payment-methods-for-recurring-payments/
- WooCommerce — PayPal Standard Reference Transactions (older approval path): https://woocommerce.com/document/subscriptions/payment-gateways/paypal-standard-subscriptions-guide/paypal-standard-reference-transactions/
- StackOverflow — JS SDK + Billing Agreement context: https://stackoverflow.com/questions/73975024/paypal-javascript-sdk-and-billing-agreement
