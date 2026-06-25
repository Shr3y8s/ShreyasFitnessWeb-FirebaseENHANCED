# PayPal Live Readiness — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 1 of 3 (PayPal live status & gaps)
> **Requirements:** `paypal-live-readiness-requirements.md`

---

## 1. Overview

This feature is **verification + configuration**, not new application code. The
live PayPal path is already implemented; the design below describes how the
existing components behave in `production`, the exact config that must be in place,
and the procedure to prove the path works before relying on it.

The only *code* that may change here is incidental: ensuring the live webhook
subscribes to every event the parser handles, and (optionally) small log/diagnostic
clarity. The discount-code dependency for the ≈ $1 smoke test is delivered by
Feature 2.

## 2. Current live architecture (as built)

### 2.1 Environment selection (design §7.1 of the parent spec)
- **Client:** `NEXT_PUBLIC_PAYPAL_ENV` selects sandbox vs live. In prod
  (`apphosting.yaml`) it is `production`, so `app/src/lib/constants.ts`
  `PAYPAL_LIVE === true` → `PAYPAL_PLANS = LIVE_PLANS`, and the browser SDK loads
  with the **live** `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
- **Server:** ONE deployed Functions backend serves both envs. Each PayPal callable
  receives `paypalEnv` from the client (`PAYPAL_ENV`) and resolves credentials via
  `paypalEnvConfig(env)` in `firebase/functions/payments/index.js`. Webhooks use two
  dedicated functions — `paypalWebhookSandbox` and `paypalWebhookLive` — each bound
  to only its env's secret set.

### 2.2 Live secrets (Secret Manager)
`paypalEnvConfig("production")` reads:
- `PAYPAL_CLIENT_ID_LIVE`
- `PAYPAL_CLIENT_SECRET_LIVE`
- `PAYPAL_WEBHOOK_ID_LIVE`

These are declared via `defineSecret(...)` and bound to `paypalWebhookLive`, the
PayPal callables (`PAYPAL_SECRETS` includes both env sets so a single callable can
serve either env), and `RESEND_API_KEY` (welcome email on first activation).

### 2.3 Live plan → tier mapping
`firebase/functions/payments/providers/paypal.js` `PLAN_TIER_MAP` already includes
the live plan ids:
```
"P-96194639LX633004DNI4ANSI" → online_coaching
"P-3S168526T8851291KNI4ANSI" → complete_transformation
```
and the matching `LIVE_PLANS` are in `constants.ts`. Because plan ids are globally
unique, one merged map serves both envs.

### 2.4 Fulfillment (unchanged, idempotent)
- **One-time:** `capturePaypalOrder` callable captures server-side and fulfills
  synchronously (dedupes on capture id); `PAYMENT.CAPTURE.COMPLETED` is the
  idempotent webhook backup.
- **Subscription:** `createSubscriptionWithCard` / Smart Button `createSubscription`
  → synchronous `getSubscription` confirmation gates fulfillment on `ACTIVE`;
  `BILLING.SUBSCRIPTION.ACTIVATED` is the idempotent webhook backup.
- **Renewals/refunds:** `PAYMENT.SALE.COMPLETED` rolls billing fields forward;
  `PAYMENT.SALE.REFUNDED` / `PAYMENT.CAPTURE.REFUNDED` mark transactions refunded.

## 3. Gap audit (what must be verified/closed)

| # | Item | Where | How to verify |
|---|------|-------|---------------|
| 1 | Live secrets set | Secret Manager | `firebase functions:secrets:access PAYPAL_CLIENT_ID_LIVE` (and SECRET, WEBHOOK_ID) returns a value |
| 2 | Live client id published | `apphosting.yaml` | `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is a `live` app id; `NEXT_PUBLIC_PAYPAL_ENV=production` |
| 3 | Live plans ACTIVE | live PayPal dashboard / API | `GET /v1/billing/plans/{P-...}` → `status: ACTIVE`, correct price |
| 4 | `paypalWebhookLive` deployed | Cloud Functions | function exists in `us-west1`; note its URL |
| 5 | Live webhook registered | live PayPal dashboard | webhook points at the `paypalWebhookLive` URL |
| 6 | `PAYPAL_WEBHOOK_ID_LIVE` matches | dashboard vs secret | the registered webhook's id equals the secret value |
| 7 | Event subscription complete | dashboard | all FR-6 events are checked |
| 8 | Live app capabilities | live PayPal app settings | wallet + guest card enabled; Vault as needed |
| 9 | Neutral-interface audit | source | no PayPal import outside `lib/payments/providers/*` and `functions/payments/providers/*` |

## 4. Webhook event coverage (FR-6)

The live webhook subscription must include every event the parser switches on
(`firebase/functions/payments/providers/paypal.js` `parseEvent`):

- `BILLING.SUBSCRIPTION.ACTIVATED`, `…UPDATED`, `…CANCELLED`, `…EXPIRED`,
  `…SUSPENDED`
- `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`
- `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`
- `CHECKOUT.ORDER.APPROVED` (logged-only, but subscribe so logs are complete)

> If "all events" is selected in the dashboard, that's acceptable — the parser
> ignores unknown event types (logs "Unhandled PayPal event_type").

## 5. Smoke-test procedure (FR-7 / FR-8)

> **Prerequisite:** Feature 2 (discount codes) phase 1 deployed, with an
> admin-created code (e.g. `SMOKETEST`) that floors the price at $1.00. The discount
> path is itself sandbox-proven before this step.

### 5.1 One-time (primary smoke test)
1. On `shrey.fit`, sign in as a disposable test user.
2. Start a one-time checkout (e.g. single in-person session, $75).
3. Apply `SMOKETEST` → total shows ≈ $1.00 (floored).
4. Complete payment with a real funding source (owner's PayPal/card).
5. Confirm: success page resolves; `sessionPackages` gets the new package with the
   real capture id; a `transactions` doc (type `one_time`, ≈ $1.00) is written.
6. In the **live** PayPal dashboard, **refund** the $1.00 capture.
7. Confirm the `PAYMENT.CAPTURE.REFUNDED` webhook marks the neutral transaction
   `refunded`.
8. Delete the disposable test user (existing account-deletion flow).

### 5.2 Subscription (verification)
- Either subscribe to a real tier (and immediately cancel/refund the first cycle),
  or — if a discounted first cycle is available from Feature 2 phase 2 — use a code
  to floor the first cycle. Confirm `accountActivated`, the neutral subscription
  record, and a renewal/cancel reflect correctly. (May be deferred until discount
  phase 2 if a full-price first cycle is undesirable.)

## 6. Neutral-interface compliance (FR-9)

Audit rule (also enforced for Features 2 & 3): the only files permitted to import a
PayPal SDK or reference PayPal-specific identifiers are:
- `app/src/lib/payments/providers/paypal.ts`
- `firebase/functions/payments/providers/paypal.js`
- `firebase/functions/payments/index.js` (callable/webhook wiring + `paypalEnvConfig`)
- `firebase/scripts/paypal-*.js` (catalog/setup scripts)

Everything else (pages, components, other functions) uses `@/lib/payments`
(`getPaymentProvider`, neutral types) only. A grep-based check is part of the tasks.

## 7. Risks & mitigations

- **Risk:** First live charge fails fulfillment (money taken, no activation).
  **Mitigation:** Smoke test with a refundable ≈ $1 charge first; logs reviewed
  before any real customer.
- **Risk:** Webhook id mismatch → all webhooks fail signature verification.
  **Mitigation:** Explicit gap-audit item (#6); synchronous fulfillment path still
  activates the happy path even if the webhook is momentarily misconfigured.
- **Risk:** Live plan priced wrong. **Mitigation:** Verify plan price via API before
  smoke test (gap #3).

## 8. Rollback

No schema or interface changes, so "rollback" = revert any webhook-subscription
change in the dashboard. The app already runs live; if a blocking issue is found,
checkout can be temporarily disabled at the page level (out of scope here) while the
config is fixed — no code rollback needed.
