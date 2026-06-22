# Account Deletion — de-Stripe + provider-neutral hardening (implementation plan)

> Status: PLANNED (reviewed, approved by owner). Pick this up in a **fresh task**.
> Owner decision on file: there are **no live Stripe subscriptions** in prod — only
> ONE Stripe **test-mode** customer, which is fine to `no-traces` delete. Therefore
> we **fully strip the Stripe SDK** from the deletion path (no thin Stripe fallback
> needed). PayPal is the live processor.

## Context / current state (verified Jun 2026)

`exports.deleteAccount` lives in `firebase/functions/index.js` (~lines 1663–3050+,
a ~700-line callable inside a 5,088-line file). Three modes already exist and are
admin-gated + audit-logged (`deleted_accounts`, `audit_logs`):

- **mock** (= "simulate-delete") — discovery only, returns inventory; no writes.
- **no-traces** (= "full-delete") — wipes everything incl. financials; auto-cancels
  subscription; zeros credits; deletes Auth + customer.
- **gdpr-clean** (= "gdpr-delete") — removes PII, anonymizes + preserves financial
  records, sets `gdprDeleted:true`, deletes Auth. Blocks on active sub / unused
  credits unless `adminOverride`.

### The two gaps to fix
1. **Fully Stripe-coupled.** `deleteAccount` declares `secrets:[stripeKey]`, does
   `const stripe = require("stripe")(stripeKey.value(), {apiVersion:"2024-09-30.acacia"})`,
   and calls: `stripe.subscriptions.cancel()` (both real modes), `stripe.refunds.create()`
   (gdpr credit refund), `stripe.customers.del()` (no-traces), `stripe.customers.update()`
   (gdpr anonymize). Reads `userData.stripeCustomerId`.
2. **Zero coverage of neutral `billing_customers`.** Post-migration, PayPal billing
   lives in `billing_customers/{uid}` + subcollections `subscriptions/` and
   `transactions/` (written by `firebase/functions/payments/fulfillment.js`).
   `deleteAccount` never touches it → orphaned on delete. Also, the gdpr credit
   refund keys on `pkg.stripePaymentIntentId` and silently skips PayPal packages
   (whose id is `pkg.providerTransactionId`, a capture id).

### Provider seam available (use it)
`firebase/functions/payments/index.js` exports `PROVIDERS` (`{stripe, paypal}`) and
helpers `paypalEnvConfig(env)` → `cfg {base,clientId,clientSecret,paypalWebhookId}`
and `normalizePaypalEnv(v)`. The PayPal adapter
(`firebase/functions/payments/providers/paypal.js`) exports:
- `cancelSubscription(subscriptionId, cfg)`
- `refundCapture(captureId, opts = {amountMinorUnits?, currency?}, ctx = cfg)`

PayPal env: callables pass `paypalEnv` from `NEXT_PUBLIC_PAYPAL_ENV`. For the
deletion path (admin/script, no client env), default to
`process.env.NEXT_PUBLIC_PAYPAL_ENV` → else `'production'` in prod. Bind PayPal
secrets to the function (see Phase 2).

### Neutral session-package shape (post-migration)
`users/{uid}.sessionPackages[]` now carries: `provider` ('paypal'|'stripe'),
`providerTransactionId`, `priceId`, `productName`, `productId` (app id), plus the
legacy `stripe*` fields still in place. `amount` (minor units) + `quantity` +
`remaining` + `expired` unchanged.

## Phase 1 — Make `deleteAccount` provider-agnostic + add `billing_customers`

In the deletion logic (after extraction, see Phase 1b — edit the extracted file):

1. **Billing identity:** read `billing_customers/{uid}` →
   `{ provider, providerCustomerId }`. Keep legacy `userData.stripeCustomerId` for
   the audit record + inventory display only.
2. **Subscription cancel** (both real modes):
   - If `userData.subscriptionId` and (no-traces, OR gdpr-clean with active/cancelAtPeriodEnd):
     call `PROVIDERS.paypal.cancelSubscription(userData.subscriptionId, cfg)` inside
     try/catch — **fail-soft** (log warn, continue; may already be canceled).
   - Drop the Stripe cancel entirely (no live Stripe subs).
3. **Credit refund** (gdpr-clean, honoring existing `creditsToRefund` clamp logic):
   - Branch per active package on `pkg.provider`:
     - `'paypal'` → `refundCapture(pkg.providerTransactionId, {amountMinorUnits: refundAmount, currency:'USD'}, cfg)`.
     - legacy `'stripe'` (or missing provider) → **skip with logged note**
       (`logger.info('Skipping legacy Stripe package refund (no live Stripe money)', …)`).
   - Keep the existing pro-rata `refundAmount = round(creditsFromThisPkg/quantity * amount)` math.
4. **`billing_customers` coverage in ALL THREE modes:**
   - **mock** → inventory: the doc (`itemsFound: exists?1:0`) + counts for
     `subscriptions/` and `transactions/` subcollections. Add as new step(s).
   - **no-traces** → delete subcollections (`subscriptions`, `transactions`) via
     batch, then the parent `billing_customers/{uid}` doc. Mirror the existing
     `stripe_customers` subcollection-delete pattern.
   - **gdpr-clean** → anonymize the parent doc: set `email` → `anonymizedEmail`,
     remove/blank any name; keep the doc for financial records (merge update).
5. **Legacy `stripe_customers` cleanup stays** but becomes **pure Firestore deletes**
   (doc + `subscriptions`/`payments`/`checkout_sessions` subcollections). This is
   what wipes the one Stripe test-mode customer's Firestore footprint. **Remove the
   `stripe.customers.del()` / `.update()` API calls** — the test-mode Stripe object
   itself can be left in Stripe (harmless) or deleted manually in the dashboard.

## Phase 1b — Extract a shared helper (one source of truth)

Create `firebase/functions/account-deletion.js` exporting:
```js
async function performAccountDeletion({ targetUserId, mode, adminOverride,
  performedBy, reason, creditsToRefund, paypalEnv })  // returns the same result object
```
Move the entire body (mock discovery + no-traces + gdpr-clean) here. Keep using
`admin` (firebase-admin) and `logger`. Import `PROVIDERS` + `paypalEnvConfig` from
`./payments/index` (or factor those into a small shared module if a circular
require appears — `payments/index.js` requires `./fulfillment` which requires
`firebase-admin`, so a plain require of payments/index from a non-trigger module
should be fine; verify with `node --check`).

`exports.deleteAccount` in `index.js` becomes: auth check → admin-role check →
`return performAccountDeletion({ ...request.data, performedBy: adminId })`.
This lets the bulk script (Phase 3) reuse the exact same path.

## Phase 2 — Remove Stripe SDK from the deletion path

- In `index.js`, drop `secrets:[stripeKey]` from the `deleteAccount` onCall options
  (keep `stripeKey` defined for the OTHER functions that still use it — createPaymentIntent,
  syncPaymentToUser, billing portal, etc. Those are separate Phase 5 cleanup, NOT this task).
- In `account-deletion.js`, do **not** `require("stripe")` at all.
- Bind PayPal secrets so `cancelSubscription`/`refundCapture` work: add the PayPal
  secret set to whatever onCall now invokes `performAccountDeletion`. Import the
  secret handles from `payments/index.js` (export `PAYPAL_SECRETS` there if not
  already) OR re-declare via `defineSecret` in index.js and pass through. Simplest:
  export `PAYPAL_SECRETS` from `payments/index.js` and spread into `deleteAccount`'s
  `secrets:[...]`.
- Net: deletion path imports zero Stripe; it's PayPal-via-seam + Firestore/Auth/Storage.

## Phase 3 — Bulk test-account cleanup script

Create `firebase/scripts/bulk-delete-test-accounts.js`:
- Auth: optional `require("../../service-account-key.json")` else ADC (same pattern
  as `migrate-stripe-to-neutral.js` / `migrate-tier-ids.js`).
- **Dry-run by default**; `--commit` required to act. Refuses to run with NO filter.
- Filters (combinable): `--email-regex=<re>`, `--unactivated` (`accountActivated:false`),
  `--created-before=YYYY-MM-DD`. Prints the matched uid+email list first.
- `--mode=no-traces` (default) | `gdpr-clean`. Per uid calls the SAME
  `performAccountDeletion(...)` from `firebase/functions/account-deletion.js`
  (require across dirs — the script runs in Node with firebase-admin initialized;
  ensure the helper doesn't depend on `firebase-functions` runtime-only APIs at
  module load — guard any `defineSecret`/onCall imports out of the helper).
  - NOTE: PayPal cfg in the script must come from env (`PAYPAL_CLIENT_ID_LIVE` etc.)
    or be passed `--paypal-env`; for pure test accounts with no PayPal sub/credits
    the cancel/refund calls no-op, so the script can run without PayPal secrets in
    the common test-account case. Make cancel/refund fail-soft so a missing cfg
    never blocks a test-account wipe.
- Safety: cap batch (e.g. `--limit`, default 50), log each uid to console; the
  helper already writes `deleted_accounts` + `audit_logs`.

## Phase 4 — Docs

Update `docs/02-implementation/client-deletion-collection-checklist.md`:
- Add `billing_customers/{uid}` + `billing_customers/{uid}/subscriptions` +
  `billing_customers/{uid}/transactions` to the collection list.
- Reword the "Stripe subscription cancellation" / "Stripe Customer" pre-deletion
  notes to provider-neutral (PayPal cancel via seam; legacy Stripe Firestore docs
  deleted, no Stripe API).
- Note the new `bulk-delete-test-accounts.js` script + its dry-run default.

## Verify
- `node --check firebase/functions/index.js`
- `node --check firebase/functions/account-deletion.js`
- `node --check firebase/scripts/bulk-delete-test-accounts.js`
- Owner deploys Functions; runs the bulk script with `--dry-run` first to review the
  matched list before `--commit`. Then `no-traces` deletes the one Stripe test-mode
  customer as the first real exercise.

## Out of scope (Phase 5, later)
- Removing Stripe from the OTHER functions (createPaymentIntent, syncPaymentToUser,
  billing portal, email-change customer sync, etc.).
- `cleanup-stripe-data.js` (delete old `stripe_customers` docs + `sessionPackages.stripe*`
  fields fleet-wide) — after prod validated.
- `dashboard.stripe.com/payments` external link in `admin/revenue/page.tsx`.
