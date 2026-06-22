# Client Deletion Collection Checklist

> **Single source of truth:** all simple client-owned data locations are listed in
> the `CLIENT_DATA_REGISTRY` array at the top of
> `firebase/functions/account-deletion.js`. All three deletion modes (mock /
> no-traces / gdpr-clean) AND the orphan scan iterate that one list. This document
> mirrors the registry for human reference — **the code is authoritative.**
>
> ⚠️ **DRIFT RULE:** when you add a feature that writes client-owned data to a NEW
> collection / subcollection / storage prefix, add ONE entry to
> `CLIENT_DATA_REGISTRY`. Do not hand-add per-mode delete code. Then run the orphan
> scan (below) against a test account to confirm coverage.

## Complete List of Collections to Query/Delete

Provider-neutral / PayPal (as of Jun 2026).

### Storage Locations (registry: `storagePrefix`)
1. ✅ `progressPhotos/{uid}/`
2. ✅ `nutritionScreenshots/{uid}/`
3. ✅ `profile-photos/{uid}/`

### Firestore — registry-driven
4. ✅ `users/{uid}/activities` — subcollection (gdpr: preserve)
5. ✅ `workouts` — query `clientId == uid` (gdpr: preserve)
6. ✅ `clientPlans` — query `clientId == uid` (gdpr: preserve)
7. ✅ `clientStats` — docId == uid (gdpr: preserve)
8. ✅ `goals` — query `clientId == uid` (gdpr: preserve)
9. ✅ `sessions` — query `userId == uid` (gdpr: preserve)
10. ✅ `dailyActivities` — docId starts-with `{uid}_` (gdpr: preserve)
11. ✅ `client_messages` — query `clientId == uid` (gdpr: delete — PII)
12. ✅ `notifications` — query `userId == uid` (gdpr: preserve)
13. ✅ `progressPhotos` — query `userId == uid` (gdpr: delete — PII metadata)
14. ✅ `login_history` — query `userId == uid` (gdpr: delete — PII)
15. ✅ `clientNotifications` — query `clientId == uid` (gdpr: delete) **[NEW]** — excludes broadcast `clientId:"all"`
16. ✅ `clientTasks` — query `clientId == uid` (gdpr: delete) **[NEW]** — excludes `"all"`
17. ✅ `clientReminders` — query `clientId == uid` (gdpr: delete) **[NEW]** — excludes `"all"`
18. ✅ `weeklySurveys/{uid}/responses` — subcollection (gdpr: delete) **[FIXED — was wrongly queried as a top-level collection]**
19. ✅ `weeklySurveys/{uid}` — parent doc (gdpr: delete)
20. ✅ `nutritionLogs/{uid}/mealPlans` — subcollection (gdpr: delete)
21. ✅ `nutritionLogs/{uid}/meals` — subcollection (gdpr: delete) **[NEW]**
22. ✅ `nutritionLogs/{uid}/habits` — subcollection (gdpr: delete) **[NEW]**
23. ✅ `nutritionLogs/{uid}/coachNotes` — subcollection (gdpr: delete) **[NEW]**
24. ✅ `nutritionLogs/{uid}` — parent doc (gdpr: delete)
25. ✅ `users/{uid}/sessionPackages` — subcollection, vestigial/read-only safe no-op (gdpr: preserve) **[NEW]**

### Firestore — bespoke (not simple registry wipes)
26. ✅ `billing_customers/{uid}` (+ `subscriptions`/`transactions` subcollections) — neutral PayPal billing. no-traces: delete; gdpr-clean: anonymize + preserve (financial records).
27. ✅ `stripe_customers/{uid}` (+ `subscriptions`/`payments`/`checkout_sessions`) — **legacy**, Firestore-only delete (no Stripe API).
28. ✅ `users/{uid}` — anonymized in gdpr-clean, deleted in no-traces.
29. ✅ Firebase Auth — deleted in both real modes.
30. ✅ Trainer client list reference (`admins.clients[]` arrayRemove).

## Deletion Mode Behavior

### no-traces (test accounts)
- Deletes every registry entry flagged `noTraces:'delete'` (everything except the
  read-only sessionPackages subcollection, which is also deleted as a safe no-op).
- Auto-cancels active subscription via the provider seam (fail-soft).
- Zeros out remaining session credits.
- Deletes `billing_customers` (+ subcollections) and the legacy `stripe_customers`
  Firestore footprint (no Stripe API), removes the trainer-list reference, deletes
  the user doc + Firebase Auth.

### gdpr-clean (real clients)
- Blocks on upcoming scheduled sessions unless `adminOverride`.
- Deletes every registry entry flagged `gdpr:'delete'` (PII: photos, messages,
  login history, nutrition logs, weekly surveys, client notifications/tasks/reminders).
- **Preserves** business/financial records flagged `gdpr:'preserve'` (workouts,
  plans, stats, goals, sessions, daily activities, notifications, activity logs).
- Anonymizes `billing_customers` (email→anonymized, blank name, `gdprDeleted:true`).
- Anonymizes the user doc (`gdprDeleted:true`) and deletes Firebase Auth.

### mock (preview)
- No writes. Iterates the registry + billing footprint and returns a full inventory
  (per-entry counts + sample ids + each entry's gdpr disposition).

## Collections NOT Deleted (by design)
- `activityFeed` — self-expires (7-day TTL scheduled cleanup).
- `admins`, `trainers` — staff accounts.
- `exercises`, `workoutTemplates`, `training_locations`, `stripe_products` — shared/catalog.
- `deleted_accounts`, `audit_logs` — audit trail (always preserved).
- `contact_form_submissions` — public form (not user-linked).
- `verifiedEmails` — cleaned up by a scheduled function.

## Orphan-Scan Verification (read-only)

`firebase/scripts/bulk-delete-test-accounts.js --scan-uid=<uid>` iterates the SAME
`CLIENT_DATA_REGISTRY` (+ billing/identity footprint + user doc) and reports any
location with leftover data. It makes NO writes.

- Run AFTER a **no-traces** deletion → expect ZERO findings.
- Run AFTER a **gdpr-clean** deletion → business records (preserved) WILL show up;
  that's expected. The user doc shows `gdprDeleted: true`.
- Run against any live account to sanity-check coverage.

```
node firebase/scripts/bulk-delete-test-accounts.js --scan-uid=abc123
```

## Implementation Notes

- **Shared implementation:** `firebase/functions/account-deletion.js`
  (`performAccountDeletion()` + `scanClientData()` + `CLIENT_DATA_REGISTRY`), reused
  by the `deleteAccount` callable (admin UI) and the `bulk-delete-test-accounts.js`
  script. One source of truth across deletion + verification.
- **Provider is RECORD-level, never customer-level:** a client can run, e.g., a
  Stripe subscription AND PayPal one-time sessions, so provider is owned per record:
  `billing_customers/{uid}/subscriptions/{id}.provider` (subscription cancel) and
  `billing_customers/{uid}/transactions/{id}.provider` (per-purchase refund). The
  deletion path resolves the cancel/refund provider from those records and dispatches
  via `PROVIDERS[provider]` with a capability check; zero Stripe SDK. It does NOT read
  a parent `billing_customers/{uid}.provider` (that field is stale/removed by Phase 5).

- **Bulk script:** dry-run by default; `--commit` to act; refuses with no filter;
  `--email-regex` / `--unactivated` / `--created-before`; `--mode`, `--limit`,
  `--paypal-env`; `--scan-uid` for read-only verification.
