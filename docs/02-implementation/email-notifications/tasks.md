# Email Notifications — Tasks

Status: ✅ v1 SHIPPED & VERIFIED (2026-07-03) — New Assignment + Trainer Message
emails live in production. Deferred items (D1–D3) remain out of scope for v1.
Related: `./requirements.md`, `./design.md`

Legend: `[ ]` todo · `[x]` done/verified. Tasks are ordered; T1–T2 are shared
foundation, T3–T4 are the two v1 notification types, T5–T7 finish + verify.

---

## Phase 0 — Prerequisites / setup

- [x] **T0.1** Create `notifications@shrey.fit` mailbox in Porkbun (branding + receive).
      _Verified — live emails arrive from this sender._
- [x] **T0.2** Confirm in the Resend dashboard that `shrey.fit` is a verified sending
      domain and that domain-level sending authorizes `notifications@shrey.fit`.
      _Verified — sends succeed with no new DNS._
- [x] **T0.3** Confirm `RESEND_API_KEY` secret is available to Functions runtime.
      _Verified — bound on assignWorkout + onClientMessageWrite; sends succeed._

## Phase 1 — Shared foundation

- [x] **T1 — Send helper.** `firebase/functions/notifications/send-notification.js`
      exports `sendNotification({ uid, type, data, resendApiKey })` with the admin
      master-switch check + preference gate (frequency pause + per-type flag,
      default-ON), valid-email check, Resend send, and fail-soft try/catch. Includes
      `FLAG_FOR_TYPE`. (design §3) _Note: the client UI saves `frequency: "off"`; the
      gate accepts both `"off"` and `"paused"`._
- [x] **T2 — Templates.** `firebase/functions/notifications/templates.js` exports
      `build(type, data)` → `{ subject, html, text }` with a shared branded shell
      (header/footer + "Manage email preferences" link) and the `new_assignment` +
      `trainer_message` templates. (design §4, FR-5/PR-1)

## Phase 2 — New Assignments (FR-1)

- [x] **T3.1** Assignment creation confirmed centralized in `assignWorkout`
      (`firebase/functions/workouts.js`); recipient uid + workout name/due date available.
- [x] **T3.2** Implemented inline `sendNotification({ type: 'new_assignment' })` after
      the workout doc write (per design §7).
- [x] **T3.3** `assignWorkout` binds `RESEND_API_KEY` and passes `resendKey.value()`.
- [x] **T3.4** Passes `{ workoutName, dueDate }`; CTA defaults to `/dashboard/client/workouts`.

## Phase 3 — Trainer Messages (FR-2, FR-8)

- [x] **T4.1** Trainer→client messages handled server-side by the existing
      `onClientMessageWrite` trigger (`client_messages/{messageId}`).
- [x] **T4.2** Implemented as an inline call within the existing trigger's trainer/admin branch.
- [x] **T4.3** Author = trainer/admin enforced (client-sender branch returns earlier);
      emails the recipient client uid only (FR-8 — no client→trainer email).
- [x] **T4.4** Binds `RESEND_API_KEY`; calls `sendNotification({ type: 'trainer_message' })`
      with `{ trainerName }`; CTA defaults to `/dashboard/client/messages`. _Verified: "Read
      message" CTA opens the client messages page._
- [x] **T4.5** Preview policy: neutral ("new message from your coach") — no message body
      in the email.

## Phase 4 — Frontend banner (FR-7)

- [x] **T5** `app/src/app/dashboard/client/profile/page.tsx` — replaced the amber
      "not yet configured (Phase 2)" banner (both edit + view modes) with the active-state
      message (New Assignments + Trainer Messages active; reminders/progress "coming soon").
      Preference read/write logic unchanged.

## Phase 4b — Admin master switch (FR-9…FR-11)

- [x] **T5b.1** `emailEnabled` global kill-switch checked in the send helper before
      per-client gating. (design §3/§9a)
- [x] **T5b.2** Admin toggle built in `app/src/app/dashboard/admin/settings/page.tsx`
      (replaced "Coming Soon" placeholder). Reads/writes `appSettings/notifications.emailEnabled`;
      shows last-changed-by/at; admin-only; loading/saving/saved/error states.
- [x] **T5b.3** Write path (A): direct Firestore write + admin-only security rule.
- [x] **T5b.4** Firestore rule added: `appSettings/{settingId}` — authenticated read,
      admin-only write. _Deployed; admin settings page loads without error._

## Phase 5 — Testing (AC-1…AC-9)

- [x] **T6.1** Helper matrix (design §5): send vs skip + reason
      (paused; opted_out; no_email; send; defaults-applied) — verified via live testing.
- [x] **T6.2** New Assignment integration: flag on + real-time → one email (AC-1);
      flag off → none (AC-2); paused/off → none (AC-3); no `notificationPreferences` →
      email sent (AC-5). _Verified._
- [x] **T6.3** Trainer Message integration: trainer→client + flag on → one email (AC-4);
      client→trainer → none (FR-8); paused/off → none (AC-3). _Verified._
- [x] **T6.3b** Admin master switch (AC-8/AC-9): `emailEnabled = false` suppresses both
      New Assignment + Trainer Message client emails; toggling back to `true` restores
      sending; OTP/welcome still send while disabled. _Verified._
- [x] **T6.4** Fail-soft: with `RESEND_API_KEY` unbound/empty, the create/message writes
      still succeed and a specific error is logged; no email (AC-6, NFR-1/5). _Verified
      (fail-soft try/catch + `no_api_key` reason path)._
- [x] **T6.5** Email rendering (HTML + text), working CTA, manage-preferences link,
      `notifications@` sender + `support@` reply-to — verified in a real inbox.

## Phase 6 — Deploy / go-live

- [x] **T7.1** Deployed affected Functions with `RESEND_API_KEY` bound; smoke-tested one
      of each notification in live.
- [x] **T7.2** Confirmed no regression to OTP/welcome/reply emails (shared Resend usage).
- [x] **T7.3** Shipped the banner change.

---

## Deferred (fast-follow — separate effort, not this SDD's v1)

- [ ] **D1 — Workout/Session Reminders** (`workoutReminders`): scheduled function scanning
      upcoming assignments/sessions; add `workout_reminder` type + template; idempotency
      key so a reminder sends once per item/day.
- [ ] **D2 — Progress Updates** (`progressUpdates`): scheduled weekly digest; add
      `progress_update` type + template.
- [ ] **D3 — Frequency digests**: extend `frequency` beyond `real-time`/`off`
      (e.g., `daily`/`weekly`) if desired; batch + schedule accordingly.

---

## Resolved open items (answered during implementation)

- **Q1 (T4.1).** Trainer→client messages are written server-side and handled by the
  existing `onClientMessageWrite` trigger → inline call (no new trigger).
- **Q2 (T3.1).** Assignment creation is centralized in the single `assignWorkout`
  callable → inline call (no separate `onDocumentCreated` trigger).
- **Q3 (T4.5).** Neutral email (no message body preview) — privacy over preview.
