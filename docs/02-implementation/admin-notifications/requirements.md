# Admin Notifications — Requirements

Status: Draft (for review)
Owner: Engineering
Related: `../email-notifications/*` (client-directed notifications, already shipped),
`../client-activity-feed-*` (trainer dashboard feed, already shipped)

---

## 1. Background & Problem

The platform already notifies two audiences:

- **Clients** — preference-gated Resend emails for New Assignments & Trainer Messages
  (`firebase/functions/notifications/send-notification.js`).
- **Trainers** — an in-dashboard **Activity Feed** (`activityFeed` collection →
  `NotificationBell`) that surfaces client actions to the client's *assigned trainer*.

There is **no notification path for the admin (owner)**. When business-critical events
happen — a new lead inquiry, a new signup, a payment — nobody is proactively told. The
owner has to log in and go looking. There is also no dashboard feed entry for events that
have **no assigned trainer yet** (a pending signup) or **no client at all** (a marketing
lead inquiry), so those never appear in the trainer bell either.

Email sending is already production-proven via **Resend** (`shrey.fit` is a verified
sending domain; `notifications@shrey.fit` is live). This feature adds an
**admin-directed** notification layer that (a) emails the admin and (b) writes to the
existing dashboard feed with an **admin-broadcast** audience.

---

## 2. Ownership Lens (business rule that drives routing)

- **Trainers are employees. Admin is the owner.** In a single-person operation the admin
  is *also* the trainer, so some events legitimately notify **both**.
- **All money-related and business-lifecycle events → the ADMIN.** (new revenue, new
  lead, new signup, cancellations, payment problems, account deletions.)
- **Coaching/operational events → the TRAINER.** (a new client was *assigned* to them; a
  session was *scheduled*; a client sent a message.)

| Event | Notify Admin? | Notify Trainer? | Rationale |
|---|---|---|---|
| New inquiry (lead inbox) | ✅ | ❌ | Business/sales — owner follows up |
| New pending signup (no payment yet) | ✅ | ❌ | Funnel/business signal; no trainer assigned yet |
| New client fully activated (paid) | ✅ | ✅ | New client = revenue (admin) **and** a client was assigned to the trainer |
| New session / 4-pack purchase (incl. repeat) | ✅ | ❌ | New revenue → admin. (Scheduling the session already notifies the trainer via existing `session_scheduled`.) |
| Subscription canceled | ✅ | ❌ | Revenue impact — owner |
| Subscription paused / payment failed (past_due) | ✅ | ❌ | Revenue / dunning — owner |
| Account deleted | ✅ | ❌ | Business/compliance — owner |

Events already handled elsewhere and **out of scope here**: session scheduled/canceled/
rescheduled and client-action feed items (already notify the trainer); client-directed
emails (already shipped).

---

## 3. Goal

When a qualifying event occurs:
1. Send a branded **email to `admin@shrey.fit`** (the owner), *unless* the global admin-
   notifications switch is off.
2. Write an **admin-broadcast** entry to the dashboard feed so it appears in the
   notification bell for admins (and, for dual-role single operators, is visible from the
   trainer dashboard they already use).
3. For the "new client activated" event only, **also** ensure the existing trainer feed
   entry fires (this already happens — we keep it and add the admin side).

### In scope (v1)
- `new_inquiry`
- `new_pending_signup`
- `new_client_activated` (admin email + admin feed; trainer feed already exists)
- `new_session_purchase` (session or 4-pack, including repeat purchases)
- `subscription_canceled`

### Fast-follow (designed for, not required in v1)
- `subscription_paused` / `payment_past_due`
- `account_deleted`

---

## 4. Existing State (verified in code)

### 4.1 Client email helper (reused pattern, NOT reused code path)
`firebase/functions/notifications/send-notification.js` — reads
`appSettings/notifications.emailEnabled`, gates on the **client's** prefs, sends via
Resend from `notifications@shrey.fit`, fail-soft. Admin notifications get their **own**
helper (`sendAdminNotification`) so the two concerns never entangle.

### 4.2 Activity feed (reused, extended)
`firebase/functions/activity-feed.js` → `writeActivityEvent({ type, clientId, clientName,
trainerId, message, metadata })` writes to `activityFeed`. Consumed by
`app/src/lib/activity-feed-api.ts` + `NotificationBell`. Today every event requires a
`trainerId`. We extend the shape with an optional **`audience`** field (`'trainer'` |
`'admin'`) and an `writeAdminActivityEvent` helper for events with no trainer/client.

### 4.3 Event sites
- **New inquiry** — `contact_form_submissions` collection, created client-side from the
  marketing contact form. No server trigger today.
- **Pending signup** — `app/src/app/signup/page.tsx` writes `users/{uid}` with
  `accountActivated: false`, `role: 'client'` (client-side `setDoc`). No server trigger.
- **Client activated / session purchase** — the `onFirstActivation` hook +
  `fulfillSessionPackage` in `firebase/functions/payments/fulfillment.js` (already
  server-side; already writes `new_client_signup` / `session_purchased` trainer-feed
  events on first activation).
- **Subscription canceled** — `handleEvent('subscription.canceled')` in
  `firebase/functions/payments/index.js`.

### 4.4 Resend
`shrey.fit` verified; `RESEND_API_KEY` secret bound on fulfilling functions. Admin email
sender: `Shrey.Fit <notifications@shrey.fit>`, **to** `admin@shrey.fit`, `reply-to`
`support@shrey.fit`.

---

## 5. Functional Requirements

- **FR-1 (New inquiry → admin).** When a `contact_form_submissions` doc is created, email
  the admin ("New inquiry from {name}") and write an admin-broadcast feed event
  `new_inquiry` with a CTA to `/dashboard/admin/leads`.
- **FR-2 (Pending signup → admin).** When a `users/{uid}` doc is created with
  `role === 'client'` and `accountActivated === false`, email the admin ("New signup
  started — payment pending") and write an admin-broadcast `new_pending_signup` event with
  a CTA to `/dashboard/admin/pending-accounts`. Fires once per user (onCreate).
- **FR-3 (Client activated → admin + trainer).** On first activation (paid), email the
  admin ("New client: {name} ({tier})") and write an admin-broadcast
  `new_client_activated` event (CTA `/dashboard/admin/client-management`). The **existing**
  trainer-feed `new_client_signup` event is preserved unchanged (FR-8 dual-notify).
- **FR-4 (Session/4-pack purchase → admin).** On any session-package fulfillment
  (`fulfillSessionPackage`), including repeat purchases, email the admin ("New purchase:
  {productName} — ${amount}") and write an admin-broadcast `new_session_purchase` event
  (CTA `/dashboard/admin/revenue`). Idempotent on the provider transaction id so a webhook
  retry never double-notifies.
- **FR-5 (Subscription canceled → admin).** When a subscription transitions to `canceled`,
  email the admin and write an admin-broadcast `subscription_canceled` event
  (CTA `/dashboard/admin/subscriptions`).
- **FR-6 (Global master switch).** A single `appSettings/adminNotifications.enabled`
  boolean gates **all** admin notifications (email **and** admin-broadcast feed writes).
  Missing doc/field ⇒ treated as `true` (enabled). No per-event toggles in v1.
- **FR-7 (Admin recipient).** All admin emails go to the fixed address `admin@shrey.fit`.
  (Configurable via a single constant so it can change without a schema change.)
- **FR-8 (Dual-notify without duplication).** For `new_client_activated`, the admin gets an
  admin email + admin-broadcast feed item AND the trainer keeps their existing
  `new_client_signup` trainer-feed item. These are distinct rows; neither is suppressed by
  the other.
- **FR-9 (Admin feed surfacing).** Admin-broadcast events (`audience: 'admin'`) surface in
  the notification bell for admin users regardless of `trainerId`. Because the owner
  operates the trainer dashboard too, admin-broadcast events are visible there when the
  signed-in user is an admin. Trainer-only employees do NOT see admin-broadcast events.
- **FR-10 (Settings UI).** The Admin System Settings page
  (`/dashboard/admin/settings`) exposes a single toggle, "Admin notifications", that
  reads/writes `appSettings/adminNotifications.enabled`. Shows current state + last-changed
  by/at. Admin-only. Sits alongside the existing "Client email notifications" toggle.
- **FR-11 (Content).** Each admin email is branded (matches the existing shell), has an
  HTML body + plain-text fallback, a clear subject, and a CTA deep link into the relevant
  admin dashboard page. No "manage preferences" link (admin controls the global switch in
  Settings instead).

---

## 6. Non-Functional Requirements

- **NFR-1 (Fail-soft).** Admin notification sends/writes must NEVER block or fail the
  triggering operation (form submit, signup, payment fulfillment, cancellation). All logic
  is wrapped so errors are logged and swallowed.
- **NFR-2 (Idempotency).** Payment-driven events dedupe on the provider transaction id;
  onCreate triggers fire once per created doc. No duplicate emails on webhook retries.
- **NFR-3 (No PII in logs).** Log event type + subject id + outcome only.
- **NFR-4 (Secret binding).** Any function that emails must bind `RESEND_API_KEY`; a
  missing key logs a specific error and skips (never a silent failure).
- **NFR-5 (Reuse).** Reuse Resend + the branded shell + the activity-feed collection. No
  new email provider, no new client-facing collection.
- **NFR-6 (Isolation).** The admin master switch is independent of the client
  `emailEnabled` switch. Toggling one never affects the other, nor OTP/welcome/billing
  emails.

---

## 7. Out of Scope (v1)

- Per-event admin toggles (single global switch only).
- Multiple admin recipients / querying the `admins` collection (fixed `admin@shrey.fit`).
- SMS/push channels.
- Notifying trainers of money/business events (owner-only by design).
- Scheduled digests / batching.

---

## 8. Acceptance Criteria

- **AC-1.** Submitting the marketing contact form creates a `new_inquiry` admin email to
  `admin@shrey.fit` and an admin-broadcast feed item with a working CTA to the lead inbox.
- **AC-2.** Completing signup step (account created, no payment) sends exactly one
  `new_pending_signup` admin email + feed item; refreshing/retrying does not re-send.
- **AC-3.** First paid activation sends a `new_client_activated` admin email + admin feed
  item AND the trainer still receives their existing `new_client_signup` feed item.
- **AC-4.** Buying a session or 4-pack (first OR repeat) sends a `new_session_purchase`
  admin email + feed item with the correct product name & amount; a webhook retry for the
  same transaction sends nothing extra.
- **AC-5.** Canceling a subscription sends a `subscription_canceled` admin email + feed
  item.
- **AC-6.** With `appSettings/adminNotifications.enabled = false`, NONE of the above send
  any email or write any admin-broadcast feed item. Setting it back to `true` restores all.
- **AC-7.** The admin master switch never affects client notification emails, OTP/welcome/
  billing emails, or the trainer's existing client-action feed items.
- **AC-8.** If `RESEND_API_KEY` is unavailable, the triggering operation still succeeds, a
  specific error is logged, and no email is sent (feed write still attempted).
- **AC-9.** A trainer-only employee (non-admin) does not see admin-broadcast feed items in
  their notification bell.
