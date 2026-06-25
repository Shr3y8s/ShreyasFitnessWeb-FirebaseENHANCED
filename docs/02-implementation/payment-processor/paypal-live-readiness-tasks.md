# PayPal Live Readiness — Tasks

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 1 of 3 (PayPal live status & gaps)
> **Requirements:** `paypal-live-readiness-requirements.md`
> **Design:** `paypal-live-readiness-design.md`

---

## How to use

Tasks are grouped. Most are **verification/config** (no code). The ≈ $1 live smoke
test (T4) depends on Feature 2 (discount codes) phase 1 being deployed. Check each
box as completed; record the actual values (URLs, ids) inline where noted.

---

## T1 — Live config audit (no code)

- [ ] **T1.1** Confirm `PAYPAL_CLIENT_ID_LIVE` is set:
      `firebase functions:secrets:access PAYPAL_CLIENT_ID_LIVE`
- [ ] **T1.2** Confirm `PAYPAL_CLIENT_SECRET_LIVE` is set (access returns a value).
- [ ] **T1.3** Confirm `PAYPAL_WEBHOOK_ID_LIVE` is set (access returns a value).
- [ ] **T1.4** Confirm `apphosting.yaml` has `NEXT_PUBLIC_PAYPAL_ENV=production` and
      `NEXT_PUBLIC_PAYPAL_CLIENT_ID` = the **live** PayPal app client id
      (cross-check against the live PayPal Developer dashboard).
- [ ] **T1.5** Confirm `RESEND_API_KEY` secret is set (welcome email on activation).

## T2 — Live billing plans & mapping (no code unless mismatch)

- [ ] **T2.1** For each `LIVE_PLANS` id in `constants.ts`, call
      `GET /v1/billing/plans/{P-...}` against `api-m.paypal.com` (live creds) and
      confirm `status: ACTIVE` and the price ($250.00/mo; CT setup_fee $60.00).
- [ ] **T2.2** Confirm each live plan id is present in `PLAN_TIER_MAP`
      (`firebase/functions/payments/providers/paypal.js`) mapped to the correct tier.
- [ ] **T2.3** If any plan is missing/inactive/mispriced, re-run
      `firebase/scripts/paypal-setup-catalog.js` with `PAYPAL_ENV=production` + live
      creds, then paste the new ids into `LIVE_PLANS` and `PLAN_TIER_MAP`.

## T3 — Live webhook registration (config + verify)

- [ ] **T3.1** In Cloud Functions, confirm `paypalWebhookLive` is deployed
      (`us-west1`); record its trigger URL: `__________________________`.
- [ ] **T3.2** In the **live** PayPal dashboard (Apps & Credentials → live app →
      Webhooks), register (or confirm) a webhook at that URL.
- [ ] **T3.3** Subscribe the webhook to all FR-6 events (or "All events"):
      `BILLING.SUBSCRIPTION.ACTIVATED/UPDATED/CANCELLED/EXPIRED/SUSPENDED`,
      `PAYMENT.SALE.COMPLETED/REFUNDED`,
      `PAYMENT.CAPTURE.COMPLETED/REFUNDED`, `CHECKOUT.ORDER.APPROVED`.
- [ ] **T3.4** Confirm the registered webhook's **id** equals `PAYPAL_WEBHOOK_ID_LIVE`
      (the secret). If not, update the secret and redeploy `paypalWebhookLive`.
- [ ] **T3.5** Confirm the live PayPal app has wallet + guest/"Debit or Credit Card"
      funding enabled (and Vault if card-subscription paths are re-enabled later).

## T4 — Live smoke test (DEPENDS ON Feature 2 phase 1)

> Do not start until `discount-codes` phase 1 is deployed and an admin code that
> floors to $1.00 exists. The discount path must already be sandbox-proven.

- [ ] **T4.1** Create a disposable live test account on `shrey.fit`.
- [ ] **T4.2** Start a one-time checkout (single in-person session, $75).
- [ ] **T4.3** Apply the `SMOKETEST` code → total ≈ $1.00 (floored). Confirm the UI
      shows the discounted amount.
- [ ] **T4.4** Complete the live payment with a real funding source.
- [ ] **T4.5** Confirm fulfillment: success page resolves; `sessionPackages` has the
      package with the real capture id; a `transactions` doc (type `one_time`,
      ≈ $1.00) is written.
- [ ] **T4.6** Review Cloud Functions logs for `capturePaypalOrder` (synchronous
      fulfillment) and the `PAYMENT.CAPTURE.COMPLETED` webhook (idempotent no-op).
- [ ] **T4.7** Refund the $1.00 capture in the live PayPal dashboard.
- [ ] **T4.8** Confirm `PAYMENT.CAPTURE.REFUNDED` marks the neutral transaction
      `refunded`.
- [ ] **T4.9** Delete the disposable test account via the existing deletion flow;
      confirm clean removal.

## T5 — Live subscription verification (optional / may defer to discount phase 2)

- [ ] **T5.1** Decide approach: full-price first cycle (then cancel/refund) OR a
      discounted first cycle from discount phase 2.
- [ ] **T5.2** Complete a live subscription; confirm `accountActivated`, the neutral
      subscription record, and tier semantics (check-ins eligibility, `user.tier`).
- [ ] **T5.3** Confirm cancel works in-app (`cancelPaypalSubscription`) and the
      `BILLING.SUBSCRIPTION.CANCELLED` webhook reflects status.
- [ ] **T5.4** (If feasible) confirm a renewal `PAYMENT.SALE.COMPLETED` rolls billing
      fields forward.

## T6 — Neutral-interface compliance audit (code review)

- [ ] **T6.1** Grep the app for stray PayPal imports/identifiers outside the allowed
      files (design §6): e.g. search `@paypal`, `paypal`, `P-` outside
      `lib/payments/providers/paypal.ts`, `functions/payments/*`, `scripts/paypal-*`.
- [ ] **T6.2** Confirm pages/components only use `@/lib/payments` (`getPaymentProvider`,
      neutral types) — no direct SDK usage.
- [ ] **T6.3** Document any violation as a follow-up task (should be none).

## T7 — Go-live sign-off

- [ ] **T7.1** All of T1–T4 complete (T5 complete or explicitly deferred).
- [ ] **T7.2** Record the live webhook URL + id and the smoke-test transaction/refund
      ids in this doc for audit.
- [ ] **T7.3** Mark PayPal live in the launch plan
      (`docs/04-architecture/production-architecture-and-launch-plan.md`).

---

## Acceptance (maps to requirements §7)

- [ ] Live one-time purchase fulfilled + refunded with correct neutral records (FR-7).
- [ ] Live subscription activation verified or explicitly deferred (FR-8).
- [ ] Go-live checklist fully checked; webhook id matches; all FR-6 events subscribed.
- [ ] Neutral-interface audit clean (FR-9).
