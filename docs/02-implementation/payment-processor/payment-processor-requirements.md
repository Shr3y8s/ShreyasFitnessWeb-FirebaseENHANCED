# Payment Processor Abstraction — Requirements

> **Status:** Draft → in implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-19
> **Related:** `payment-processor-design.md`, `payment-processor-tasks.md`,
> `docs/04-architecture/production-architecture-and-launch-plan.md`

---

## 1. Background & Problem

The app was built tightly coupled to **Stripe** (Stripe.js + `@stripe/react-stripe-js`
on the client, the invertase **`firestore-stripe-payments`** extension + custom
Cloud Functions on the server, and `stripe_*` Firestore collections).

On **2026-06-18**, after a full risk review, **Stripe rejected the account**.
Per Stripe support the decision is **final, with no appeal and no eligibility to
open a new account**. The most likely driver was the business profile (new solo
online-fitness business), not a fixable data error (a trivial middle-name
mismatch was ruled out).

**Consequence:** we must move to a different payment processor, and we must never
again be in a position where a processor rejection means a multi-day rewrite.

## 2. Vision

Introduce a **provider-agnostic payment layer** so the application depends on an
internal interface, never on a specific processor's SDK or data shapes. Swapping
or adding a processor becomes **one adapter file + one config change**, not a
cross-cutting rewrite.

We will also support **multiple concurrent providers** (e.g. subscriptions via a
Merchant-of-Record like Paddle, one-off/session payments via PayPal), because the
business has both online subscriptions and in-person session packages and no
single processor is ideal for both.

## 3. Provider Strategy (context for requirements)

- **Stripe** — current code; rejected; kept only as the reference adapter that
  proves the abstraction works. Not a launch option.
- **PayPal Business** — **CONFIRMED LAUNCH PROCESSOR (account approved 2026-06-19).**
  Fast approval; strong client trust; supports subscriptions + one-time. **No**
  hosted billing portal; **no** stored-card display; **no** seller protection for
  *services* (chargeback risk on us). Checkout uses **Smart Buttons** (PayPal /
  Venmo / card-via-popup) for BOTH subscription and one-time flows — see FR-2/FR-3.
- **Paddle** — Merchant of Record (handles sales tax + chargeback liability),
  built-in hosted customer portal, built-in subscriptions. Slow/iterative
  approval (1–6 weeks), SaaS-oriented AUP (fitness is "adjacent"). Preferred
  **long-term** processor for online subscriptions if approved.

Owner is applying to **PayPal and Paddle in parallel**; we launch on whoever
approves first.

## 4. Goals

- **G1** — The app talks only to an internal `PaymentProvider` interface; no
  page or component imports a processor SDK directly.
- **G2** — Adding a processor = implement one client adapter + one server adapter
  + map its webhooks; no changes to UI/business logic.
- **G3** — Support **per-purpose provider routing** (subscriptions vs one-time
  can use different providers) via configuration.
- **G4** — Keep **Stripe fully working** throughout the client-abstraction phase
  (zero functional regression, build stays green).
- **G5** — Webhook-driven fulfillment is **provider-neutral** business logic,
  written once and reused across providers.
- **G6** — Provider-neutral **Firestore data model** so UI never reads
  processor-specific document shapes.
- **G7** — Preserve existing GA4 conversion analytics (`begin_checkout`,
  `purchase`).

## 5. Functional Requirements

Each requirement is testable and provider-independent.

- **FR-1 Product catalog.** The app can fetch the list of sellable products and
  their prices (subscription + one-time) in a neutral shape, filtered to the
  active provider/mode.
- **FR-2 Subscription checkout.** A user can purchase a recurring plan
  (Online Coaching, Complete Transformation) and be charged monthly. On PayPal
  this uses **Smart Buttons** → `createSubscription({plan_id})` against a
  pre-created Billing Plan (`P-xxxx`); the PayPal approval popup (PayPal / Venmo /
  card) completes it. Activation is confirmed by webhook, not the client.
- **FR-3 One-time checkout.** A user can purchase a one-time item / session
  package (single in-person session, 4-pack). On PayPal this uses **Smart
  Buttons** → Orders API (`createOrder` → capture); same popup UX as FR-2.
  Embedded card-on-page fields (PayPal ACDC/hosted-fields) are **out of scope**
  (see §8).
- **FR-4 Fulfillment via webhook.** On a completed payment, the server updates
  the app: set `accountActivated`, write/refresh the subscription record, and
  create session packages — **driven by a signature-verified webhook**, which is
  the source of truth.
- **FR-5 Billing history.** A client can view their past payments
  (date, amount, status, product, receipt link) on the billing page.
- **FR-6 Payment-method / portal management.** A client can manage their billing
  (update payment method, view official invoices) — via a hosted portal where the
  provider offers one, or an in-app/redirect equivalent where it does not.
- **FR-7 Subscription cancellation.** A client can cancel their subscription
  (hosted portal where available; in-app cancel action otherwise).
- **FR-8 Admin/trainer billing view.** Trainer/admin views that reference billing
  (revenue page, client-hub billing summary) keep working against neutral data.
- **FR-9 Multi-provider routing.** Configuration can route subscription checkouts
  to one provider and one-time checkouts to another, simultaneously.
- **FR-10 Refunds (admin).** Admin can issue refunds through the active provider
  (parity with the current Stripe refund capability).

## 6. Provider Capability Matrix

| Capability | Stripe | PayPal | Paddle |
|---|---|---|---|
| Subscriptions | ✅ | ✅ | ✅ |
| One-time / packages | ✅ | ✅ | ✅ |
| Button checkout (`buttonCheckout`) | ❌ (redirect) | ✅ (Smart Buttons) | ❌ (overlay) |
| Hosted billing portal (`hostedPortal`) | ✅ | ❌ | ✅ |
| Stored-card display (`showsStoredCard`) | ✅ | ❌ (wallet) | ✅ |
| In-app cancel API (`inAppCancel`) | ✅ | ✅ | ✅ |
| Merchant of Record (tax + chargeback) | ❌ | ❌ | ✅ |
| In-person / POS | ✅ (Terminal) | ✅ (Zettle) | ❌ |
| Hosted invoices | ✅ | partial | ✅ |

The named flags (`buttonCheckout`, `hostedPortal`, `showsStoredCard`,
`inAppCancel`) are the literal fields on `ProviderCapabilities` (design §2.2) the
UI branches on.

The abstraction exposes these as **capability flags** so one billing UI adapts to
any provider without per-processor branching in the page.

## 7. Non-Functional Requirements

- **NFR-1 Security.** Webhook signatures verified server-side; secret keys never
  reach the client; only publishable/client tokens are `NEXT_PUBLIC_*`.
- **NFR-2 Reliability.** Billing history is primarily read from our own
  `billing_*` Firestore records (written by webhooks), not a live provider API
  call per page load; the provider API is fallback/enrichment for receipt URLs.
- **NFR-3 Least disruption.** Stripe remains the live, working path until a
  replacement is verified end-to-end in sandbox.
- **NFR-4 Build integrity.** `npm --prefix app run build` stays green at every
  committed step.
- **NFR-5 Testability.** Every provider integrates against a **sandbox** before
  any production cutover.
- **NFR-6 Observability.** Webhook handlers use structured `logger.*` (no
  `console.log`), consistent with the Phase 6 cleanup.
- **NFR-7 Environment isolation (test vs live).** Dev runs the provider's
  **sandbox** end-to-end (fake money, test buyers); prod runs **live**. Selected by
  `NEXT_PUBLIC_PAYPAL_ENV` (`sandbox`|`production`) + the matching credentials,
  Billing Plan IDs (`P-xxxx`), API base, and webhook ID per environment. Unlike the
  Stripe setup — where test and live products shared the `stripe_products` Firestore
  collection and had to be filtered by mode — PayPal environments are fully isolated
  by credentials + API base, so there is **no shared catalog to filter**. This
  enables what we could not do cleanly with Stripe: confidently use test mode in dev
  and live mode in prod with no cross-contamination.

## 8. Out of Scope (this effort)

- In-person POS card-reader hardware (Stripe Terminal / PayPal Zettle / Square).
  Clients prepay online; informal in-person can use PayPal/Venmo links.
- **Embedded card-on-page fields (PayPal ACDC / Advanced hosted-fields).** Needs
  extra PayPal underwriting and only applies to one-time card entry (subscriptions
  always use the PayPal approval popup), so it cannot unify the UX anyway. Smart
  Buttons (PayPal / Venmo / card-via-popup) are used for both flows at launch. May
  be revisited post-launch as an enhancement behind the same adapter.
- Migrating historical Stripe customers/subscriptions to a new processor (there
  are none live yet — pre-launch).

## 9. Acceptance Criteria (summary)

- **AC-1** No file under `app/src/app/**` or `app/src/components/**` imports
  `@stripe/*` directly; all go through `@/lib/payments`.
- **AC-2** Switching the active provider for a purpose is a config/env change, not
  a code change to pages.
- **AC-3** With provider = Stripe, the full signup → checkout → activation →
  billing-history → portal flow behaves exactly as before this work.
- **AC-4** A new provider can be added by implementing the client + server adapter
  and webhook mapping only.
- **AC-5** The billing page renders correctly for a provider with **no** hosted
  portal (PayPal) and one **with** a hosted portal (Stripe/Paddle), driven by
  capability flags.
- **AC-6** GA4 `begin_checkout` / `purchase` events still fire.

## 10. Risks

- **R-1** Provider approval delay (Paddle) — mitigated by PayPal parallel launch.
- **R-2** PayPal services chargeback exposure — accepted risk for launch; prefer
  Paddle (MoR) for recurring once approved.
- **R-3** Webhook fulfillment is the highest-risk server work — mitigated by
  porting the proven Stripe fulfillment logic into provider-neutral functions and
  testing in sandbox before cutover.
