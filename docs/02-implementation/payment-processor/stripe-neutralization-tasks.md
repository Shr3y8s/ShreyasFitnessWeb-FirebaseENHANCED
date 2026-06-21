# Stripe → Neutral Firestore Migration — Task List

Goal: **no Stripe-shaped ids/fields persisted in Firestore.** Everything stored is
provider-neutral; provider↔app-id mapping happens JIT inside the payment adapters.
The Stripe adapter/SDK is KEPT (dormant). We migrate (copy) all existing docs first
so readers keep working, then flip writers and readers to neutral, validate, and
finally delete the old Stripe data.

Decisions (locked):
- Keep Stripe adapter + `@stripe/*`; only neutralize Firestore data.
- `billing-utils` reads the neutral `billing_customers/{uid}/transactions` (drops the
  Stripe `getBillingHistory` call).
- Leave `stripe_customers` SUBcollections (PayPal uses neutral `billing_customers`).
- Remove `stripe*` field names from `sessionPackages` (no aliases) + migrate.
- Repoint `payment/page` + `client-hub` product reads off `stripe_products`.
- Delete old pre-migration Stripe data LAST, only after prod validation.

Neutral schema:
- `billing_customers/{uid}` = `{ provider, providerCustomerId, email }`
- `sessionPackages[]` neutral fields: `provider`, `providerTransactionId`, `priceId`,
  `productId` (= app id), `productName`, `amount`, `quantity`, dates.

---

## Phase 0 — Plan
- [x] Decisions locked
- [x] Save this checklist

## Phase 1 — Migration script (copy only; NO deletes)
- [ ] `firebase/scripts/migrate-stripe-to-neutral.js` (idempotent, dry-run default, `--commit`)
  - [ ] `stripe_customers/{uid}` → `billing_customers/{uid}` (merge; provider inferred)
  - [ ] `users/{uid}.sessionPackages[]`: copy `stripe*` → neutral (leave old fields intact)
- [ ] (owner) run dev (dry-run → --commit) → verify → prod

## Phase 2 — Writers → neutral
- [ ] `app/src/lib/firebase.ts`: stop writing `stripe_customers` at signup
- [ ] `firebase/functions/payments/fulfillment.js`: neutral `sessionPackages` (productId=app id)
- [ ] `firebase/functions/payments/providers/paypal.js` `parseEvent`: resolve one-time item → app id
- [ ] `node --check`

## Phase 3 — Readers → neutral
- [ ] `app/src/types/session.ts` (neutral package fields)
- [ ] `app/src/lib/session-utils.ts`
- [ ] `app/src/components/sessions/PurchaseHistory.tsx`
- [ ] `app/src/app/dashboard/trainer/client-hub/page.tsx` (+ `stripeProductId` filter → `productId`)
- [ ] `app/src/app/dashboard/trainer/client-hub/[id]/page.tsx`
- [ ] `app/src/lib/billing-utils.ts` → `billing_customers/{uid}/transactions` + `users/{uid}`
- [ ] `app/src/components/dashboard/account-summary.tsx` → `billing_customers/{uid}/subscriptions`
- [ ] `app/src/app/dashboard/client/billing/page.tsx` → `billing_customers`
- [ ] `firebase/functions/index.js` refund + `deleteAccount` → `providerTransactionId` (fallback to `stripePaymentIntentId`)
- [ ] `app/src/app/payment/page.tsx` + `client-hub/page.tsx` product fetch → `getPaymentProvider()`

## Phase 4 — Verify & ship
- [ ] `tsc --noEmit` (app) + `node --check` (functions)
- [ ] (owner) deploy app + functions
- [ ] (owner) smoke: buy session (PayPal) → neutral package fields; billing page; account-summary; client-hub filter; refund path

## Phase 5 — Cleanup (LAST, after prod validated)
- [ ] `firebase/scripts/cleanup-stripe-data.js` (dry-run default, `--commit`): delete
      `stripe_customers/{uid}` (+ subcollections) + old `sessionPackages[].stripe*` fields
- [ ] (owner) run dev → verify → prod
- [ ] (optional) leave `stripe_products` intact for the dormant Stripe adapter
