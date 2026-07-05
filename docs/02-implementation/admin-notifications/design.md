# Admin Notifications — Design

Status: Draft (for review)
Related: `./requirements.md`, `./tasks.md`

---

## 1. Overview

Add an **admin-directed** notification layer that mirrors the shipped client-email layer
but routes to the **owner** instead of a client. Each qualifying event does up to two
things, both fail-soft:

1. **Email** `admin@shrey.fit` via a new `sendAdminNotification({ type, data })` helper
   (own templates, reusing Resend + the branded shell).
2. **Feed** an **admin-broadcast** row into the existing `activityFeed` collection via a
   new `writeAdminActivityEvent({ type, message, metadata })` helper, so it appears in the
   notification bell for admin users.

Both are gated by a single global switch `appSettings/adminNotifications.enabled`
(default ON). Trigger the layer from the event sites that already run server-side, plus
two new `onCreate` triggers for the sites that are currently client-side only (inquiry &
pending signup).

```
[contact form created]  ─► onContactSubmissionCreate ─┐
[user doc created, pending] ─► onUserPendingCreate ────┤
[first activation (paid)] ─► onFirstActivation hook ───┼─► notifyAdmin(type, data)
[session/4pack fulfilled] ─► fulfillSessionPackage ────┤        │
[subscription canceled] ─► handleEvent(canceled) ──────┘        ├─ read appSettings/adminNotifications.enabled
                                                                ├─ writeAdminActivityEvent(...)   [feed]
                                                                └─ sendAdminNotification(...)      [email, needs RESEND_API_KEY]
```

---

## 2. New / touched files

### New
- `firebase/functions/notifications/admin-notifications.js` — the gate + two entry points
  (`notifyAdmin`, and the lower-level `sendAdminNotification`). Reads the master switch,
  calls the feed writer + email sender, fail-soft.
- `firebase/functions/notifications/admin-templates.js` — per-type `build(type, data)` →
  `{ subject, html, text }`, reusing the branded shell (green accent, header/footer).

### Touched (Cloud Functions)
- `firebase/functions/activity-feed.js` — add `writeAdminActivityEvent(...)` +
  thread an optional `audience` field through `writeActivityEvent`.
- `firebase/functions/index.js` — register two new `onDocumentCreated` triggers
  (`onContactSubmissionCreate`, `onUserPendingCreate`); ensure they bind `RESEND_API_KEY`.
- `firebase/functions/payments/fulfillment.js` — call `notifyAdmin('new_session_purchase')`
  after a package is fulfilled (idempotent block), and `notifyAdmin('new_client_activated')`
  inside the first-activation branch (via the existing hook wiring).
- `firebase/functions/payments/index.js` — `notifyAdmin('subscription_canceled')` in the
  `subscription.canceled` branch; the `onFirstActivation` hook (defined in `index.js`)
  adds the `new_client_activated` admin call.

### Touched (frontend)
- `app/src/types/activity-feed.ts` — add the new admin event types + `audience` field +
  icons/labels.
- `app/src/lib/activity-feed-api.ts` — admin users additionally subscribe to
  `audience == 'admin'` events (see §6).
- `app/src/app/dashboard/admin/settings/page.tsx` — add the "Admin notifications" toggle.
- `firestore.rules` — allow admin read of `audience == 'admin'` feed docs + admin write of
  `appSettings/adminNotifications`.
- `firestore.indexes.json` — composite index for the admin-broadcast query if needed.

---

## 3. The admin notification helper

`firebase/functions/notifications/admin-notifications.js`

```js
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { Resend } = require("resend");
const templates = require("./admin-templates");
const { writeAdminActivityEvent } = require("../activity-feed");

const FROM = "Shrey.Fit <notifications@shrey.fit>";
const REPLY_TO = "support@shrey.fit";
const ADMIN_TO = "admin@shrey.fit"; // FR-7 — single constant, easy to change.

// Admin notification types → dashboard CTA + feed metadata.
const ADMIN_TYPES = {
  new_inquiry:            { cta: "/dashboard/admin/leads" },
  new_pending_signup:     { cta: "/dashboard/admin/pending-accounts" },
  new_client_activated:   { cta: "/dashboard/admin/client-management" },
  new_session_purchase:   { cta: "/dashboard/admin/revenue" },
  subscription_canceled:  { cta: "/dashboard/admin/subscriptions" },
};

/** Master switch (global kill-switch). Missing doc/field ⇒ enabled. */
async function adminNotificationsEnabled() {
  try {
    const snap = await admin.firestore().collection("appSettings").doc("adminNotifications").get();
    return !(snap.exists && snap.data().enabled === false);
  } catch (e) {
    logger.warn("[AdminNotify] settings read failed; defaulting enabled", { error: e.message });
    return true;
  }
}

/**
 * Fire-and-forget admin notification: writes an admin-broadcast feed row AND emails
 * admin@shrey.fit. NEVER throws. Both sub-steps are independently fail-soft, so a
 * missing RESEND_API_KEY still records the feed item.
 *
 * @param {object} p
 * @param {string} p.type          one of ADMIN_TYPES
 * @param {object} [p.data]        template + metadata data (name, amount, etc.)
 * @param {string} [p.resendApiKey] bound RESEND_API_KEY value (email skipped if absent)
 */
async function notifyAdmin({ type, data = {}, resendApiKey }) {
  const cfg = ADMIN_TYPES[type];
  if (!cfg) { logger.warn("[AdminNotify] unknown type", { type }); return; }

  if (!(await adminNotificationsEnabled())) {
    logger.info("[AdminNotify] skipped: admin_disabled", { type });
    return;
  }

  // 1) Dashboard feed (admin-broadcast). Fail-soft inside the helper.
  const { subject, html, text, feedMessage } = templates.build(type, data);
  await writeAdminActivityEvent({
    type,
    message: feedMessage,
    metadata: { ...data, ctaUrl: cfg.cta },
  });

  // 2) Email admin@shrey.fit.
  if (!resendApiKey) {
    logger.error("[AdminNotify] email NOT sent: RESEND_API_KEY unavailable", { type });
    return;
  }
  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: FROM, to: ADMIN_TO, replyTo: REPLY_TO, subject, html, text,
    });
    if (error) { logger.error("[AdminNotify] Resend error", { type, message: error.message }); return; }
    logger.info("[AdminNotify] sent", { type });
  } catch (e) {
    logger.error("[AdminNotify] send threw (non-fatal)", { type, error: e.message });
  }
}

module.exports = { notifyAdmin, ADMIN_TYPES, ADMIN_TO };
```

**Notes**
- Single global gate (`adminNotificationsEnabled`) — no per-type flags (FR-6).
- The feed write and the email are independent so email-outage ≠ feed-outage (NFR-1/AC-8).
- `resendApiKey` is passed in from the caller's bound secret (`resendKey.value()`),
  mirroring the client helper — no `process.env` reads inside the helper.

---

## 4. Templates

`firebase/functions/notifications/admin-templates.js` exports `build(type, data)` →
`{ subject, html, text, feedMessage }`. Reuses the branded shell (green `#059669` header,
footer). **No** "manage preferences" link — the admin controls the global switch in
Settings. Footer note: "You're receiving this as the Shrey.Fit account owner."

| Type | Subject | Feed message | CTA |
|---|---|---|---|
| `new_inquiry` | `New inquiry from {name}` | `New inquiry from {name}` | View in Lead Inbox → `/dashboard/admin/leads` |
| `new_pending_signup` | `New signup started (payment pending): {name}` | `{name} started signing up` | View pending accounts → `/dashboard/admin/pending-accounts` |
| `new_client_activated` | `New client: {name}{tier?}` | `{name} activated {tierName}` | View client → `/dashboard/admin/client-management` |
| `new_session_purchase` | `New purchase: {productName} — ${amount}` | `{name} bought {productName}` | View revenue → `/dashboard/admin/revenue` |
| `subscription_canceled` | `Subscription canceled: {name}` | `{name} canceled their subscription` | View subscriptions → `/dashboard/admin/subscriptions` |

Data contract (caller supplies; all optional beyond what the subject needs):
- `new_inquiry`: `{ name, email, service?, message? }`
- `new_pending_signup`: `{ name, email, tierName? }`
- `new_client_activated`: `{ name, tierName? }`
- `new_session_purchase`: `{ name?, productName, amountMinor }` (amount rendered ÷100)
- `subscription_canceled`: `{ name, tierName? }`

`amountMinor` is formatted to `$X.XX` in the template (minor units → dollars).

---

## 5. Activity-feed extension (admin-broadcast)

`firebase/functions/activity-feed.js` gains:

```js
/**
 * Admin-broadcast feed event — no client/trainer required. Surfaces to admins via the
 * audience field. Reuses the same activityFeed collection + 7-day TTL.
 */
async function writeAdminActivityEvent({ type, message, metadata = {} }) {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + SEVEN_DAYS_MS);
    await admin.firestore().collection("activityFeed").add({
      type,
      audience: "admin",         // NEW — distinguishes owner-directed events
      clientId: metadata.clientId || "",
      clientName: metadata.name || "",
      trainerId: "",             // not trainer-scoped
      message,
      metadata,
      read: false,
      timestamp: now,
      expiresAt,
    });
    logger.info("[ActivityFeed] admin event written", { type });
  } catch (error) {
    logger.error("[ActivityFeed] Failed to write admin event", { type, error: error.message });
  }
}
```

Existing `writeActivityEvent` gets a defaulted `audience: "trainer"` field so old queries
are unaffected and rows are explicitly labeled.

---

## 6. Frontend surfacing

`app/src/types/activity-feed.ts`
- Add `'new_inquiry' | 'new_pending_signup' | 'new_client_activated' |
  'new_session_purchase' | 'subscription_canceled'` to `ActivityEventType`.
- Add `audience?: 'trainer' | 'admin'` to `ActivityFeedEvent` / `...Doc`.
- Add icons/labels (💬 New Inquiry, 📝 Pending Signup, 🎉 New Client, 💳 New Purchase,
  ❌ Subscription Canceled) + an "Admin" filter category.

`app/src/lib/activity-feed-api.ts`
- Today the feed subscription queries `where('trainerId', '==', uid)`. For **admin** users
  we add a second subscription: `where('audience', '==', 'admin')`, merged into the same
  feed state. Non-admin trainers keep only the `trainerId` query, so they never see
  admin-broadcast rows (FR-9/AC-9).
- The owner (admin who also uses the trainer dashboard) sees both their trainer-scoped
  rows and the admin-broadcast rows in one bell.

Admin-ness is already known client-side (`useAuth().canAccessAdminDashboard`); pass it
into the feed subscriber (or branch inside `ActivityFeedContext`).

---

## 7. Trigger wiring per event

**T-A New inquiry.** New `onDocumentCreated("contact_form_submissions/{id}")` in
`index.js`, binds `RESEND_API_KEY`. Reads the doc (Name/Email/Service/Message) → calls
`notifyAdmin({ type: 'new_inquiry', data, resendApiKey })`. Once per created doc (NFR-2).

**T-B Pending signup.** New `onDocumentCreated("users/{uid}")`. Guard: only fire when
`role === 'client'` AND `accountActivated === false` (and not a re-created doc for an
existing paid user). Calls `notifyAdmin({ type: 'new_pending_signup', ... })`. onCreate ⇒
once per user (AC-2).

**T-C Client activated.** In the existing `onFirstActivation` hook (`index.js`), after the
welcome-email / trainer-feed `new_client_signup` writes, add
`notifyAdmin({ type: 'new_client_activated', data: { name, tierName }, resendApiKey })`.
The trainer feed item is untouched (FR-8/AC-3).

**T-D Session/4-pack purchase.** In `fulfillSessionPackage` (`fulfillment.js`), after the
idempotent package write (inside the "not already fulfilled for this transactionId" path,
so retries don't re-notify), invoke a fulfillment hook `onSessionPurchase({ userId,
productName, amount })` that calls `notifyAdmin('new_session_purchase')`. Uses the same
injected-hooks pattern as `onFirstActivation` to avoid a circular require. Fires on repeat
purchases too (AC-4).

**T-E Subscription canceled.** In `handleEvent`'s `subscription.canceled` branch
(`index.js`/`payments/index.js`), after fulfillment, call
`notifyAdmin({ type: 'subscription_canceled', data: { name, tierName } })`. Bind
`RESEND_API_KEY` on the webhook functions (already bound).

All admin calls are wrapped in try/catch at the call site too (defense in depth) so they
never fail the payment/trigger flow.

---

## 8. Master switch (FR-6/FR-10)

**Storage.** `appSettings/adminNotifications = { enabled: boolean, updatedAt, updatedBy }`.
Missing doc/field ⇒ enabled.

**Enforcement.** `notifyAdmin` reads it first; when `enabled === false`, neither the email
nor the admin-broadcast feed row is written (AC-6). Independent of the client
`appSettings/notifications.emailEnabled` switch (NFR-6/AC-7).

**Admin UI.** `app/src/app/dashboard/admin/settings/page.tsx` already hosts the client
"Client email notifications" toggle. Add a second card "Admin notifications" that:
- Reads `appSettings/adminNotifications.enabled` (default ON).
- Writes `{ enabled, updatedAt: serverTimestamp(), updatedBy: uid }` on toggle.
- Shows current state + "last changed by {admin} on {date}".
- Copy: global on/off for all owner notifications (inquiries, signups, purchases,
  cancellations). Does NOT affect client or account/billing emails.

**Write path.** Direct Firestore write from the admin page, gated by a security rule
allowing writes to `appSettings/adminNotifications` only for admins (mirrors the existing
`appSettings/notifications` rule).

---

## 9. Security rules & indexes

**Rules** (`firestore.rules`):
- `appSettings/adminNotifications` — authenticated read, admin-only write (mirror the
  existing `appSettings/{settingId}` rule; confirm it already covers this doc id).
- `activityFeed` — extend read access so an admin can read `audience == 'admin'` docs.
  Existing trainer rule (`trainerId == request.auth.uid`) stays; add an OR for
  `resource.data.audience == 'admin'` when the requester is an admin.

**Indexes** (`firestore.indexes.json`): add a composite index for
`activityFeed` on `(audience ASC, timestamp DESC)` to back the admin-broadcast query.

---

## 10. Idempotency / duplicate-send avoidance (NFR-2)

- `new_inquiry`, `new_pending_signup` — `onDocumentCreated` fires once per doc creation.
- `new_session_purchase` — invoked only inside the transaction-deduped block of
  `fulfillSessionPackage` (keyed on `providerTransactionId`), so a webhook retry for the
  same capture is a no-op and sends no second email.
- `new_client_activated` — invoked from the write-once `firstActivation` branch, so repeat
  webhooks for the same buyer don't re-notify.
- `subscription_canceled` — cancellation webhooks are idempotent on the subscription id in
  fulfillment; the notify call rides that path.

---

## 11. Secrets & config

- Functions that email must include `RESEND_API_KEY` in their `secrets: [...]`. The payment
  functions already bind it; the two new `onDocumentCreated` triggers must add it.
- Sender `notifications@shrey.fit` is already verified — no new DNS. `admin@shrey.fit` is a
  **recipient**, not a sender, so it needs a mailbox that can receive (confirm in Porkbun).

---

## 12. Testing strategy

- **Unit-ish:** call `notifyAdmin` with the master switch on/off across each type; assert
  feed write + email attempt vs. skip.
- **Integration (test project):**
  - Submit the contact form → one admin email + feed item (AC-1).
  - Create a pending signup → one email + item; retry → none (AC-2).
  - First paid activation → admin email + admin feed item + trainer's existing feed item
    all present (AC-3).
  - Buy session then buy again → two emails/items; replay a webhook → no extra (AC-4).
  - Cancel a subscription → one email + item (AC-5).
  - Flip `enabled=false` → all suppressed; flip back → restored; confirm client/OTP/billing
    emails unaffected (AC-6/AC-7).
  - Unbind `RESEND_API_KEY` → trigger still succeeds, error logged, feed item still written
    (AC-8).
  - Sign in as a trainer-only employee → no admin-broadcast items in the bell (AC-9).

---

## 13. Rollback

Additive + fail-soft. Rollback = revert the event-site `notifyAdmin` calls and the two new
triggers, and restore the settings page. The `audience` field and existing feed data are
untouched (defaults to `trainer`). Preferences/data intact throughout.
