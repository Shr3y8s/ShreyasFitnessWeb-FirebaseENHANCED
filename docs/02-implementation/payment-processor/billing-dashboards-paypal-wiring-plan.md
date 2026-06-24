# Billing Dashboards — PayPal Wiring Plan

Status: in progress. Owner: Shreyas. Author: assistant.

## Problem

After the PayPal cutover, **checkout + activation** work, but the **post-purchase
subscription lifecycle + billing display** were never re-pointed from Stripe to the
provider-neutral / PayPal path:

1. **`/dashboard/client/membership` "Recent Activity" is empty and "Next Billing"
   shows N/A for Online Coaching.** The page derives these from `userData`
   fields (`lastPaymentDate`, `currentPeriodEnd`, `canceledAt`, `pausedAt`,
   `resumedAt`, `reactivatedAt`), but the PayPal fulfillment path
   (`payments/fulfillment.js → activateSubscription`) only writes
   `subscriptionStatus`, `subscriptionId`, `tier`/`tierName`, `accountActivated`,
   trainer fields. It never writes `lastPaymentDate` or `currentPeriodEnd` onto the
   USER doc (those live only in the `billing_customers/{uid}/subscriptions`
   subcollection).
2. **Cancel / Pause / Resume / Reactivate are still Stripe-only.** The membership
   UI calls `subscription-api.ts` → callables `cancelSubscription` /
   `pauseSubscription` / `resumeSubscription` / `reactivateSubscription`, all of
   which are defined in `firebase/functions/index.js` and call
   `stripe.subscriptions.update(...)`. They will fail for a PayPal subscriber.
   (A separate `cancelPaypalSubscription` exists but the UI doesn't call it.)
3. **Upgrade page** routes through the neutral `/checkout` correctly; only a
   cosmetic "powered by Stripe" caption needs updating.

## PayPal subscription feature-support matrix

| Action | Current (Stripe) | PayPal native? | Plan |
|---|---|---|---|
| Cancel (at period end) | `cancel_at_period_end=true`, access until period end | NO — PayPal `/cancel` is immediate | Workaround: set local `cancelAtPeriodEnd=true` + `canceledAt`, keep access until `currentPeriodEnd`; scheduled fn performs real PayPal `/cancel` at period end |
| Reactivate (undo cancel) | clear `cancel_at_period_end` | YES (we never called PayPal) | Clear local flag + `reactivatedAt` |
| Pause | `pause_collection` + local `subscriptionPaused` + auto-resume date | PARTIAL — `/suspend` works, no native auto-resume | Workaround: PayPal `/suspend`, set `subscriptionPaused=true` + `pausedAt` + `pauseResumesAt`; scheduled fn auto-resumes (`/activate`) on that date |
| Resume (early) | remove `pause_collection` | YES — `/activate` | Call `/activate`, set `subscriptionPaused=false` + `resumedAt` |

Conclusion: **all current features are achievable on PayPal** (cancel + pause need
a local-flag + scheduled-resume workaround). No feature needs to be hidden. A
`provider.capabilities`-style guard is still added so a future provider lacking a
feature hides it cleanly.

## Task list

### Phase 1 — Write the data the dashboards read (fixes the visible bug)
- [x] P1.1 `payments/fulfillment.js activateSubscription`: on activation, also set
  USER doc `lastPaymentDate` (serverTimestamp) + mirror `currentPeriodEnd`
  (from `next_billing_time`).
- [x] P1.2 `payments/providers/paypal.js parseEvent` `PAYMENT.SALE.COMPLETED`
  (recurring renewal): emit data so dispatcher sets `user.lastPaymentDate`,
  `lastPaymentAmount`, and rolls `currentPeriodEnd` forward (dereference the
  subscription for `next_billing_time`).
- [x] P1.3 `payments/index.js handleEvent`: on the renewal `payment.completed`
  (subscription, not session), update the user doc fields above.

### Phase 2 — Provider-neutral subscription management
- [x] P2.1 `payments/providers/paypal.js`: add `suspendSubscription` (`POST
  /v1/billing/subscriptions/{id}/suspend`) and reuse `activatePaypalSubscription`
  (`/activate`) for resume. (`cancelSubscription` already exists.)
- [x] P2.2 Make `cancelSubscription` / `pauseSubscription` / `resumeSubscription` /
  `reactivateSubscription` callables provider-aware (dispatch on `user.provider`):
  Stripe path unchanged; PayPal path does the matrix workarounds and writes the
  SAME UI fields (`canceledAt`, `pausedAt`, `resumedAt`, `reactivatedAt`,
  `cancelAtPeriodEnd`, `subscriptionPaused`, `pauseResumesAt`, `currentPeriodEnd`).
  Also persists `paypalEnv` on the user doc for the scheduled finalizer.
- [x] P2.3 Scheduled function `processScheduledPaypalSubscriptionActions` (hourly):
  (a) executes real PayPal `/cancel` at `currentPeriodEnd` for cancel-at-period-end
  subs; (b) auto-resumes (`/activate`) paused subs at `pauseResumesAt`. Uses each
  user's stored `paypalEnv`. Two composite indexes added to `firestore.indexes.json`.
- [x] P2.4 Sync PayPal webhooks: `BILLING.SUBSCRIPTION.SUSPENDED` now maps to a
  distinct neutral `subscription.paused` event (status `paused`, keeps
  `subscriptionId`) instead of being hard-canceled; `ACTIVATED` / `CANCELLED`
  unchanged.
- [x] P2.5 Frontend `subscription-api.ts`: callable names kept; all four wrappers now
  pass `paypalEnv` (from `NEXT_PUBLIC_PAYPAL_ENV`) so the PayPal callable branches hit
  the correct env.

### Phase 3 — Dashboard sweep
- [ ] P3.1 Upgrade page: replace "powered by Stripe" caption with neutral wording.
- [ ] P3.2 Enumerate trainer/admin revenue + client-count + billing-history data
  sources; confirm each reads the neutral store (`billing_customers/*`) or the
  now-populated user fields, not Stripe. Fix any Stripe-bound reads.

### Verify
- [x] V.1 `node --check` on changed Functions files (index.js, payments/index.js,
  payments/providers/paypal.js, payments/fulfillment.js — all pass).
- [ ] V.2 (Owner) `firebase deploy --only functions` + sandbox test
  cancel/pause/resume/reactivate on a PayPal sub; read logs.

## Notes
- The scheduled function (P2.3) is the only genuinely new infra. It faithfully
  replicates "cancel at period end" + "auto-resume after N months" on PayPal.
- Functions changes here require `firebase deploy --only functions`.
