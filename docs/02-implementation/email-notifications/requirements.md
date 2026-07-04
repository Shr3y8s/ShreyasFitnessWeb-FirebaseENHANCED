# Email Notifications — Requirements

Status: Draft (for review)
Owner: Engineering
Related UI: Client dashboard → Profile → **Contact Preferences**

---

## 1. Background & Problem

The client Profile page already exposes a **Contact Preferences** card where clients
toggle which email notifications they want and pick a notification frequency. Those
choices are **persisted today** to Firestore at `users/{uid}.notificationPreferences`
and read back correctly in the UI.

However, **no delivery layer acts on those preferences** — nothing sends an email when
the underlying events (a workout is assigned, a trainer sends a message) occur. The card
currently shows a status banner:

> **Status:** Email notifications are not yet configured. Your preferences are saved and
> will be applied once the email service is set up (Phase 2).

Email sending itself is **already fully wired and production-proven** via **Resend**
(OTP verification emails, welcome emails on first activation, and the marketing
reply-email route). This feature connects the two: fire preference-gated Resend emails
from the server-side events that already exist.

---

## 2. Goal

When a qualifying event occurs, send the affected client a branded email **only if** their
saved preferences allow it. Flip the Profile banner from "not yet configured" to an active
state.

### In scope (v1)
- **New Assignments** — a workout/assignment is created for the client → email gated on
  `notificationPreferences.newAssignments`.
- **Trainer Messages** — a trainer sends the client a message → email gated on
  `notificationPreferences.trainerMessages`.
- **Admin global master switch** — an admin can turn ALL client notification emails
  off (and back on) platform-wide from the Admin UI (System Settings). This is a global
  kill-switch that overrides individual client preferences.


### Deferred (fast-follow, not v1)
- **Workout / Session Reminders** (`workoutReminders`) — requires a scheduled function.
- **Progress Updates** (`progressUpdates`) — weekly digest; requires a scheduled function.
- **Marketing & Promotions** (`marketing`) — explicitly out of scope for transactional
  triggers; opt-in only, handled separately if/when a marketing send exists.

---

## 3. Existing State (verified in code)

### 3.1 Preference schema
`users/{uid}.notificationPreferences`:

| Field | Type | Default | v1 use |
|---|---|---|---|
| `workoutReminders` | boolean | `true` | deferred |
| `newAssignments` | boolean | `true` | **v1** |
| `progressUpdates` | boolean | `true` | deferred |
| `trainerMessages` | boolean | `true` | **v1** |
| `marketing` | boolean | `false` | out of scope |
| `frequency` | `'real-time' \| 'paused'` | `'real-time'` | **v1 (global gate)** |

Written by `app/src/app/dashboard/client/profile/page.tsx` via `updateDoc(...,
{ notificationPreferences })` and mirrored into auth-context `userData`.

### 3.1a Admin global setting (new)
A single platform-wide document holds the admin master switch, e.g.
`appSettings/notifications`:

| Field | Type | Default | Meaning |
|---|---|---|---|
| `emailEnabled` | boolean | `true` | When `false`, suppress ALL client notification emails platform-wide (overrides every client preference). |
| `updatedAt` | timestamp | — | Last change. |
| `updatedBy` | string (uid) | — | Admin who last toggled. |

Read server-side by the send helper before any send. Admin-writable only.


### 3.2 Resend integration (already live)
- **Cloud Functions**: `firebase/functions/index.js` uses
  `const resendKey = defineSecret("RESEND_API_KEY")` then
  `new Resend(resendKey.value())` (OTP `verify@shrey.fit`, welcome email
  `support@shrey.fit`). Functions that send must **bind the `RESEND_API_KEY` secret**.
- **Next app route**: `app/src/app/api/send-reply-email/route.ts` uses
  `new Resend(process.env.RESEND_API_KEY)` (marketing reply, `info@shrey.fit`).

### 3.3 Event sites (already server-side)
- **New Assignment**: workout/assignment creation in `firebase/functions/workouts.js`.
- **Trainer Message**: client message creation (`client_messages` collection) — the
  trainer→client send path.

---

## 4. Functional Requirements

- **FR-1 (New Assignment email).** When an assignment is created for a client, send a
  "New workout assigned" email to that client **iff** `newAssignments === true` AND
  `frequency !== 'paused'` AND the client has a valid email.
- **FR-2 (Trainer Message email).** When a trainer sends a message to a client, send a
  "New message from your coach" email to that client **iff** `trainerMessages === true`
  AND `frequency !== 'paused'` AND the client has a valid email. Only messages authored
  by the trainer/coach trigger email — client→trainer messages never email the client.
- **FR-3 (Global pause).** If `frequency === 'paused'`, suppress **all** v1 emails
  regardless of individual flags.
- **FR-4 (Default-on).** A missing preference field is treated as its documented default
  (`newAssignments`/`trainerMessages` default `true`; `frequency` defaults `'real-time'`).
  Existing clients with no `notificationPreferences` object still receive v1 emails.
- **FR-5 (Content).** Each email is branded (matches the OTP/welcome look), has an HTML
  body + plain-text fallback, a clear subject, a CTA deep link into the relevant dashboard
  page, and a "Manage email preferences" link to the Profile page.
- **FR-6 (Sender).** Send from `Shrey.Fit Notifications <notifications@shrey.fit>` with
  `reply-to: support@shrey.fit`.
- **FR-7 (Banner state).** Update the Contact Preferences status banner to reflect that
  notifications are active (v1: New Assignments + Trainer Messages). Deferred types may be
  labeled "coming soon" until shipped.
- **FR-8 (No self-notify).** Do not email a user for their own action (e.g., a trainer
  who is also the message author does not get emailed).
- **FR-9 (Admin master switch — UI).** The Admin System Settings page
  (`/dashboard/admin/settings`) exposes a single toggle, "Client email notifications",
  that reads/writes `appSettings/notifications.emailEnabled`. Admin-only; shows current
  state, who last changed it, and when. (The page is currently a "Coming Soon" placeholder
  that already lists "Manage notification preferences" as planned — this fulfills it.)
- **FR-10 (Admin master switch — enforcement).** The send helper reads
  `appSettings/notifications.emailEnabled` before every send. When `false`, **no** client
  notification email is sent for ANY type or client, overriding all individual
  preferences. Default `true` (and treated as `true` if the doc/field is missing).
- **FR-11 (Scope of the switch).** The master switch governs **client notification
  emails only** (this feature's types). It does NOT affect transactional account emails
  (OTP verification, welcome, billing, marketing reply) — those remain independent.


---

## 5. Non-Functional Requirements

- **NFR-1 (Fail-soft).** Email sending must NEVER block or fail the triggering operation
  (assignment creation, message send). All send logic is wrapped so errors are logged and
  swallowed — mirrors the existing welcome-email pattern.
- **NFR-2 (No PII in logs).** Log the event type, uid, and outcome (sent/skipped/failed
  reason). Do NOT log email bodies or full addresses beyond what existing code does.
- **NFR-3 (Deliverability isolation).** Use a dedicated `notifications@` sender so a
  complaint/bounce on transactional notifications cannot degrade the reputation of
  critical senders (`verify@` OTP, `billing@`).
- **NFR-4 (Idempotency-aware).** v1 real-time sends fire once per event. The design must
  avoid duplicate sends when an event site can run more than once (e.g., retries) — see
  design for the guard approach.
- **NFR-5 (Secret binding).** Any function that sends must bind `RESEND_API_KEY`; a
  missing key logs a loud, specific error and skips (never a silent failure).
- **NFR-6 (Reuse).** Reuse the established Resend patterns and branding; no new email
  provider, no new infra beyond the shared helper + templates.

---

## 6. Privacy & Compliance

- **PR-1.** Every notification email includes a "Manage email preferences" link to the
  Profile page so users can opt out — satisfies the "give the user control" expectation.
- **PR-2.** Preferences are the source of truth; a `false` flag or `paused` frequency is
  always honored server-side before any send.
- **PR-3.** Marketing is excluded from this transactional feature and remains opt-in.

---

## 7. Out of Scope (v1)

- Scheduled reminders (workout/session) and progress-update digests.
- Marketing/promotional sends.
- Digest frequencies beyond `real-time` / `paused` (e.g., `daily`, `weekly`).
- SMS/push channels.
- Trainer-facing notification emails (this feature is client-directed).

---

## 8. Acceptance Criteria

- **AC-1.** With `newAssignments = true` and `frequency = real-time`, creating an
  assignment sends exactly one branded email to the client with a working CTA + manage-
  preferences link.
- **AC-2.** With `newAssignments = false`, creating an assignment sends **no** email.
- **AC-3.** With `frequency = paused`, neither New Assignment nor Trainer Message emails
  are sent, regardless of individual flags.
- **AC-4.** A trainer→client message with `trainerMessages = true` sends one email; a
  client→trainer message sends none.
- **AC-5.** A client with no `notificationPreferences` object still receives v1 emails
  (defaults applied).
- **AC-6.** If `RESEND_API_KEY` is unavailable, the triggering operation still succeeds
  and a specific error is logged; no email is sent.
- **AC-7.** The Profile Contact Preferences banner no longer says "not yet configured"
  for the shipped v1 types.
- **AC-8.** With the admin master switch `emailEnabled = false`, no client notification
  email of any type is sent to any client, even when their individual flags are on and
  `frequency = real-time`.
- **AC-9.** Toggling the admin switch back to `true` restores sending; the switch itself
  never affects OTP/welcome/billing/marketing-reply emails (they still send when
  `emailEnabled = false`).


