# Deletion Coverage Fixes + Retire Stripe Extension

Consolidated task covering (A) deletion-engine coverage bugs found during the
test-account cleanup, (B) an orphaned-data sweep, (C) full retirement of the
Invertase Stripe extension, and (D) doc updates.

Status legend: [ ] todo · [x] done

---

## Background / findings (all confirmed against live data)

1. **`client_messages` matched on the WRONG field.** The deletion registry queried
   `client_messages where clientId == uid`, but message docs have **`senderId`,
   `recipientId`, `conversationId`** and **no `clientId`**. Result: a user's messages
   were never matched by deletion OR the orphan scan (both share the registry). This
   affected the admin portal too, not just the bulk script.
   - **Fix:** match `senderId == uid` OR `recipientId == uid` (union of two queries).

2. **`stripe_customers` skipped for migrated accounts.** The no-traces block gated the
   `stripe_customers/{uid}` delete on `userData.stripeCustomerId` being truthy. Migrated
   accounts carry the Stripe id in `billing_customers.providerCustomerId` instead, so the
   gate was false and the legacy Stripe footprint was left behind.
   - **Fix:** delete `stripe_customers/{uid}` (+ subcollections) whenever the doc EXISTS,
     independent of `userData.stripeCustomerId`.

3. **Orphans from users removed outside the engine.** Per-user deletion only visits uids
   that still have a `users/{uid}` doc. Users removed via the Firebase console (or earlier
   passes) left their side-collection data unreferenced and unvisited.
   - **Fix:** a collection-sweep that deletes client data whose owning id has no matching
     `users/{uid}`.

4. **Stripe extension still installed.** `firebase.json` → `firestore-stripe-payments@0.3.12`.
   It re-creates `stripe_customers/{uid}` on every new Auth signup, so deleting the
   collection is whack-a-mole until the extension is uninstalled. The dormant Stripe client
   adapter (`app/src/lib/stripe.ts`, `payments/providers/stripe.ts`) is still registered but
   unreachable in the live PayPal config.

`audit_logs` and `deleted_accounts` are intentionally PRESERVED (audit trail) — not bugs.

---

## Part A — Fix the deletion engine (`firebase/functions/account-deletion.js`) ✅ DONE + DEPLOYED

- [x] **A1. `client_messages` multi-field.** Added a registry kind `queryOr` (runs a query
  per field, unions by doc id) + `queryOrDocs` helper; entry now uses
  `fields: ["senderId", "recipientId"]`. Wired into `describeEntry`, `countEntry`, `deleteEntry`.
- [x] **A2. `stripe_customers` gate.** No-traces deletes `stripe_customers/{uid}` (+
  subcollections) whenever the footprint exists — `if (stripeCustomerId)` gate removed
  (migrated accounts hold the id in `billing_customers.providerCustomerId`).
- [x] **A3. Field audit.** Found + fixed `sessions` (keyed by `clientId`, not `userId`) in
  the registry AND both bespoke guards (upcoming-scheduled block + completed-sessions
  audit count). Other fields verified correct.
- [x] Verified `node --check`; functions deployed by owner.

## Part B — Orphan sweep (`firebase/scripts/cleanup-orphaned-client-data.js`) ✅ DONE

- [x] New script: scans each client-owned collection and deletes docs whose owning id has
  no matching `users/{uid}`. Covers client_messages (senderId|recipientId), sessions,
  workouts, clientPlans, goals, notifications, login_history, progressPhotos,
  clientNotifications/Tasks/Reminders (exclude "all"), clientStats, weeklySurveys,
  nutritionLogs, dailyActivities (docId prefix), billing_customers, stripe_customers.
- [x] Dry-run default; `--commit`; `--collection=` scope; `--limit`; cached users lookup;
  shared firebase-admin + storageBucket. Verified `node --check`.
  Run: `node firebase/scripts/cleanup-orphaned-client-data.js` (dry run) → `--commit`.


## Part C — Disable/disconnect the Stripe extension (NO code removal)

Owner decision: just **uninstall the extension** so it stops re-creating
`stripe_customers/{uid}` on new signups. Leave ALL app + functions code in place
(the dormant Stripe adapter stays available in case Stripe is ever reinstated).

- [ ] **C1. Uninstall the extension** (stops the Auth trigger + webhook sync):
  - CLI: `firebase ext:uninstall firestore-stripe-payments --project shreyfitweb`
  - or Firebase console → Extensions → "Run Payments with Stripe" → Uninstall.
- [ ] **C2. firebase.json:** remove the `"extensions"` block (lines 28-30) so a later
  `firebase deploy` doesn't reinstall it. Optionally delete
  `firebase/extensions/firestore-stripe-payments-qscq.env` (no longer referenced).
- [ ] **C3. Delete data (optional, after uninstall):** delete `stripe_customers` +
  `stripe_products` via console or `cleanup-stripe-data.js`. Safe to do anytime
  post-uninstall — they won't repopulate. (App code keeps working: `stripe.ts` only
  reads these, and the live PayPal path never touches them.)

NOTE: NO code is removed — `app/src/lib/stripe.ts`, `payments/providers/stripe.ts`,
`types/stripe.ts`, the REGISTRY entry, and any Stripe functions stay as-is (dormant).


## Part D — Docs

- [ ] Update `docs/02-implementation/client-deletion-collection-checklist.md`: correct
  `client_messages` to senderId/recipientId, note the `stripe_customers` gate fix, document
  the orphan sweep, reaffirm `audit_logs` is intentionally preserved.

---

## Execution order
A (fix engine) → B (sweep historical orphans) → C (retire extension + delete Stripe
collections) → D (docs). Owner deploys functions + runs `firebase ext:uninstall` + the
collection deletes. `node --check` after each JS change.
