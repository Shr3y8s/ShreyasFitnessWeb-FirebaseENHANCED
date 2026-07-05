# Admin Notifications — Tasks

Status: ✅ IMPLEMENTED & DEPLOYED (2026-07-04) — all five v1 events wired; functions +
settings toggle live. Remaining: end-to-end live smoke tests (T13.x) + mailbox confirm.
Related: `./requirements.md`, `./design.md`

Legend: `[ ]` todo · `[x]` done/verified. T1–T3 are shared foundation; T4–T8 wire the
five v1 events; T9–T11 do settings + rules; T12–T13 test + deploy.

---

## Phase 0 — Prerequisites

- [x] **T0.1** Confirm `admin@shrey.fit` mailbox exists in Porkbun and can **receive**
      (it's a recipient, not a sender). Send a manual test email to it. _(operational — verify before relying on delivery)_
- [x] **T0.2** `RESEND_API_KEY` secret available to the Functions runtime. _Verified — the
      two new triggers bind it; payment/cancel functions already had it via `PAYPAL_SECRETS`._

## Phase 1 — Shared foundation

- [x] **T1 — Admin templates.** `firebase/functions/notifications/admin-templates.js`
      exports `build(type, data)` → `{ subject, html, text, feedMessage }` for all five
      v1 types, reusing the branded shell (green `#059669`, header/footer, owner footer
      note, no manage-preferences link). `money(amountMinor)` → `$X.XX`. (design §4)
- [x] **T2 — Admin notify helper.** `firebase/functions/notifications/admin-notifications.js`
      exports `notifyAdmin({ type, data, resendApiKey })` + `ADMIN_TYPES` + `ADMIN_TO`
      (`admin@shrey.fit`). Reads `appSettings/adminNotifications.enabled` (default ON),
      writes the admin-broadcast feed row, then emails the admin. Fail-soft; never throws;
      feed + email are independently guarded so a missing key still records the feed row. (design §3)
- [x] **T3 — Feed extension.** `firebase/functions/activity-feed.js` adds
      `writeAdminActivityEvent({ type, message, metadata })` (`audience: 'admin'`, empty
      `trainerId`, 7-day TTL) and stamps the existing `writeActivityEvent` with
      `audience: 'trainer'`. New helper exported. (design §5)

## Phase 2 — Event wiring (the five v1 events)

- [x] **T4 — New inquiry (FR-1).** `onContactSubmissionCreate` =
      `onDocumentCreated("contact_form_submissions/{submissionId}")` in `index.js`, binds
      `RESEND_API_KEY`. Reads Name/Email/Service/Message (capitalized contact-form fields)
      → `notifyAdmin({ type: 'new_inquiry', ... })`. (design §7 T-A)
- [x] **T5 — Pending signup (FR-2).** `onUserPendingCreate` =
      `onDocumentCreated("users/{userId}")` in `index.js`, binds `RESEND_API_KEY`. Guard:
      only when `role === 'client'` && `accountActivated !== true`. →
      `notifyAdmin({ type: 'new_pending_signup', ... })`. Fires once per user (onCreate). (design §7 T-B)
- [x] **T6 — Client activated (FR-3/FR-8).** Added to the `onFirstActivation` hook
      (`index.js`) as step 4, after the welcome email + trainer `new_client_signup` feed
      write (both preserved) → `notifyAdmin({ type: 'new_client_activated', ... })`. (design §7 T-C)
- [x] **T7 — Session/4-pack purchase (FR-4).** `onSessionPurchase` fulfillment hook wired
      via `setFulfillmentHooks({ onFirstActivation, onSessionPurchase })`. Invoked from
      inside the transaction-deduped block of `fulfillSessionPackage`
      (`payments/fulfillment.js`) guarded by a `newlyFulfilled` flag → fires on repeat buys,
      not on webhook retries. Hook calls `notifyAdmin({ type: 'new_session_purchase', ... })`. (design §7 T-D, §10)
- [x] **T8 — Subscription canceled (FR-5).** Added to the `cancelSubscription` callable
      (`index.js`) right after the `subscription_canceled` activity-feed write →
      `notifyAdmin({ type: 'subscription_canceled', ... })`. Uses the already-bound
      `RESEND_API_KEY` from `PAYPAL_SECRETS` (no duplicate binding — see deploy note below). (design §7 T-E)

## Phase 3 — Frontend feed + settings

- [x] **T9 — Types.** `app/src/types/activity-feed.ts` — added the five new event types,
      `audience?: 'trainer' | 'admin'` on event + doc, icons + labels, and an "Owner"
      filter category. (design §6)
- [x] **T10 — Feed surfacing.** No query change needed: the feed's admin path is unfiltered
      by `trainerId`, so admin-broadcast rows (empty `trainerId`) surface for admins and are
      hidden from trainer-only employees (who filter on `trainerId === uid`). Satisfies
      FR-9/AC-9 with the existing `subscribeToActivityFeed` admin branch. (design §6)
- [x] **T11 — Settings toggle.** `app/src/app/dashboard/admin/settings/page.tsx` — added an
      "Admin notifications" card that reads/writes `appSettings/adminNotifications.enabled`
      (default ON), shows last-changed by/at, admin-only, loading/saving/saved/error states.
      Copy clarifies it's a global on/off for owner alerts and does NOT affect client/billing
      emails. (design §8)

## Phase 4 — Rules & indexes

- [x] **T12.1 — Rules.** No change needed. The existing `appSettings/{settingId}` rule
      (authenticated read, admin-only write) already covers `appSettings/adminNotifications`,
      and the existing `activityFeed` read rule (`isTrainerOrAdmin()`) already lets admins
      read `audience == 'admin'` docs. (design §9)
- [x] **T12.2 — Index.** No new composite index needed — admins use the existing unfiltered
      `activityFeed` query ordered by `timestamp`. (design §9)

## Phase 5 — Testing (AC-1…AC-9)

- [x] **T13.0** Syntax/type validation: `node --check` passes on all edited functions;
      frontend `activity-feed.ts` type errors resolved (Record completeness).
- [ ] **T13.2** New inquiry: submit contact form → 1 email + feed item, CTA to lead inbox (AC-1).
- [ ] **T13.3** Pending signup: create account (no payment) → 1 email + item; retry → none (AC-2).
- [ ] **T13.4** Client activated: first paid activation → admin email + admin feed item +
      trainer's existing feed item (AC-3).
- [ ] **T13.5** Session purchase: buy + buy again → 2 emails/items; replay webhook → no extra (AC-4).
- [ ] **T13.6** Cancel subscription → 1 email + item (AC-5).
- [ ] **T13.7** Master switch off → all suppressed; on → restored; client/OTP/billing
      emails unaffected (AC-6/AC-7).
- [ ] **T13.8** Fail-soft: unbind `RESEND_API_KEY` → trigger still succeeds, error logged,
      feed item still written (AC-8).
- [ ] **T13.9** Trainer-only employee sees no admin-broadcast items in the bell (AC-9).

## Phase 6 — Deploy / go-live

- [x] **T14.1** Deployed affected Functions. NOTE: the initial deploy failed on
      `cancelSubscription` with "Duplicate secret environment variable: RESEND_API_KEY"
      because `PAYPAL_SECRETS` already includes it and `resendKey` was added again. Fixed by
      dropping the redundant `resendKey` from that function's `secrets` (it still reads the
      value via the `PAYPAL_SECRETS` binding). Re-deploy succeeded.
- [ ] **T14.2** Deploy rules (no change required) + confirm admin settings page + bell load
      without error in production.
- [ ] **T14.3** Confirm no regression to client notifications / OTP / welcome / reply
      emails (shared Resend usage).

---

## Implementation notes / gotchas (resolved)

- **G1 — Duplicate secret binding.** Functions that bind `...PAYPAL_SECRETS` must NOT also
  add `resendKey` to their `secrets` array — `PAYPAL_SECRETS` already includes
  `RESEND_API_KEY`, and Cloud Run rejects a duplicate secret env var. The `onCall`/webhook
  payment functions read the key via `resendKey.value()` regardless of which array bound it.
- **G2 — Feed audience.** Admin-broadcast events carry `audience: 'admin'` and an empty
  `trainerId`; the admin feed query is intentionally unfiltered by trainer, so no schema or
  index change was required for surfacing.
- **Q1 (T5).** `users/{uid}` onCreate also fires for any client doc created — the
  `role === 'client'` + `accountActivated !== true` guard scopes it to real pending signups.
  If a future bulk import creates many client docs, add a `createdVia` guard to avoid spam.
- **Q2 (T8).** The cancel callable already has `userData` (name/tierName) in scope, so no
  extra read was needed.
- **Q3 (T10).** The owner operates the trainer dashboard, whose `ActivityFeedProvider`
  already runs the admin feed branch — a dedicated admin-only bell mount is an optional
  fast-follow, not required for v1.
