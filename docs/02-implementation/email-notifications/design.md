# Email Notifications — Design

Status: Draft (for review)
Related: `./requirements.md`, `./tasks.md`

---

## 1. Overview

Add a thin, reusable **notification send layer** in Cloud Functions that:
1. Loads a client's email + `notificationPreferences`.
2. Applies the preference gate (per-type flag + global `frequency`).
3. Renders a branded template and sends via the existing **Resend** integration.

Then call this layer from the two v1 event sites that already run server-side:
**assignment creation** (`workouts.js`) and **trainer→client message creation**
(`client_messages`). No new provider, no new DNS (Resend already authorizes `shrey.fit`).

All sends are **fail-soft**: they never block or fail the triggering write.

---

## 2. Architecture

```
[assignment created] ──► workouts.js ─────┐
                                          ├─► sendNotification({ uid, type, data })
[trainer message created] ──► msg site ───┘        │
                                                   ├─ load users/{uid} (email + prefs)
                                                   ├─ gate: frequency !== 'paused'
                                                   │        && prefs[flagFor(type)] !== false
                                                   │        && valid email
                                                   ├─ render template (html + text)
                                                   └─ Resend.emails.send(...)  [fail-soft]
```

### New files
- `firebase/functions/notifications/send-notification.js` — the gate + send helper.
- `firebase/functions/notifications/templates.js` — per-type HTML/text builders + shared
  branded shell (header, footer, "Manage email preferences" link).

### Touched files
- `firebase/functions/workouts.js` — call helper after an assignment is created.
- Trainer→client message send path (Cloud Function that writes `client_messages`) — call
  helper after the message is created. (Exact function id confirmed during T4; if the
  message is currently written client-side only, see §7 "Trigger options".)
- `firebase/functions/index.js` (or the relevant function definitions) — ensure the
  functions that call the helper **bind `RESEND_API_KEY`**.
- `app/src/app/dashboard/client/profile/page.tsx` — update the status banner (FR-7).

---

## 3. The shared helper

`firebase/functions/notifications/send-notification.js`

```js
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { Resend } = require("resend");
const templates = require("./templates");

// type → the notificationPreferences flag that gates it.
const FLAG_FOR_TYPE = {
  new_assignment: "newAssignments",
  trainer_message: "trainerMessages",
  // deferred: workout_reminder: "workoutReminders", progress_update: "progressUpdates",
};

const FROM = "Shrey.Fit Notifications <notifications@shrey.fit>";
const REPLY_TO = "support@shrey.fit";

/**
 * Preference-gated, fail-soft notification email.
 * @param {object} p
 * @param {string} p.uid           recipient (client) user id
 * @param {string} p.type          one of FLAG_FOR_TYPE keys
 * @param {object} p.data          template data (names, links, etc.)
 * @param {string} p.resendApiKey  value from the bound RESEND_API_KEY secret
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
async function sendNotification({ uid, type, data, resendApiKey }) {
  try {
    const flag = FLAG_FOR_TYPE[type];
    if (!flag) return { sent: false, reason: "unknown_type" };

    if (!resendApiKey) {
      logger.error("Notification NOT sent: RESEND_API_KEY unavailable to runtime", { type, uid });
      return { sent: false, reason: "no_api_key" };
    }

    // Admin master switch (global kill-switch). Missing doc/field ⇒ enabled.
    const settingsSnap = await admin.firestore().collection("appSettings").doc("notifications").get();
    if (settingsSnap.exists && settingsSnap.data().emailEnabled === false) {
      return { sent: false, reason: "admin_disabled" };
    }

    const snap = await admin.firestore().collection("users").doc(uid).get();
    if (!snap.exists) return { sent: false, reason: "no_user" };
    const u = snap.data() || {};
    const email = u.email;
    if (!email) return { sent: false, reason: "no_email" };

    const prefs = u.notificationPreferences || {};

    // Global pause gate.
    if (prefs.frequency === "paused") return { sent: false, reason: "paused" };
    // Per-type gate (default ON when field missing).
    if (prefs[flag] === false) return { sent: false, reason: "opted_out" };

    const { subject, html, text } = templates.build(type, {
      ...data,
      firstName: (u.name || "").split(" ")[0] || "there",
    });

    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: FROM, to: email, replyTo: REPLY_TO, subject, html, text,
    });
    if (error) {
      logger.error("Notification Resend error", { type, uid, message: error.message });
      return { sent: false, reason: "resend_error" };
    }
    logger.info("Notification sent", { type, uid });
    return { sent: true };
  } catch (e) {
    // Fail-soft: never throw into the triggering flow.
    logger.error("sendNotification threw (non-fatal)", { type, uid, error: e.message });
    return { sent: false, reason: "exception" };
  }
}

module.exports = { sendNotification, FLAG_FOR_TYPE };
```

**Notes**
- Default-ON semantics via `prefs[flag] === false` (only an explicit `false` opts out),
  matching the UI's `?? true` reads → satisfies FR-4/AC-5.
- `resendApiKey` is passed in from the caller's bound secret (`resendKey.value()`),
  mirroring the welcome-email pattern rather than reading `process.env` in Functions.

---

## 4. Templates

`firebase/functions/notifications/templates.js` exports `build(type, data)` →
`{ subject, html, text }`.

Shared **branded shell** (reused by every type), matching the OTP/welcome look:
- Header with Shrey.Fit wordmark, green accent (`#059669`).
- Body slot (per-type content).
- Primary CTA button (per-type deep link).
- Footer: short "why you got this" line + **Manage email preferences** link to
  `https://shrey.fit/dashboard/client/profile` (FR-5, PR-1).

### v1 templates

**`new_assignment`**
- Subject: `New workout assigned: {workoutName}`
- Body: "{firstName}, your coach assigned a new workout." + workout name + due date (if any).
- CTA: "View workout" → `/dashboard/client/workouts` (or the specific assignment URL if
  available in `data`).

**`trainer_message`**
- Subject: `New message from your coach`
- Body: "{firstName}, {trainerName} sent you a message." + short preview (truncated, no
  sensitive content) OR a neutral "Open the app to read it" if we choose not to include
  the body.
- CTA: "Read message" → `/dashboard/client/messages`.

Data contract (caller supplies):
- `new_assignment`: `{ workoutName, dueDate?, ctaUrl? }`
- `trainer_message`: `{ trainerName, preview?, ctaUrl? }`

---

## 5. Preference gate — decision table

Evaluated in order; first matching row wins.

| admin `emailEnabled` | frequency | flag (type) | email valid | Result |
|---|---|---|---|---|
| `false` | any | any | any | **skip** (`admin_disabled`) |
| `true`/missing | `paused` | any | any | **skip** (`paused`) |
| `true`/missing | `real-time` | `false` | any | **skip** (`opted_out`) |
| `true`/missing | `real-time` | `true`/missing | missing | **skip** (`no_email`) |
| `true`/missing | `real-time` | `true`/missing | valid | **send** |
| `true`/missing | missing (defaults) | missing | valid | **send** (defaults real-time + on) |


---

## 6. Idempotency / duplicate-send avoidance (NFR-4)

v1 events are one-shot writes, but to stay safe if a trigger re-runs:
- **Preferred:** wire from a Firestore `onCreate` trigger keyed to the created doc id, so
  the platform's create semantics fire once per document. `onCreate` (not `onWrite`)
  avoids update re-fires.
- If instead we call the helper inline inside an existing callable that creates the doc,
  it already runs once per successful create — acceptable for v1.
- We deliberately avoid a separate "already emailed" ledger in v1 (adds writes/complexity);
  revisit if a chosen event site proves to re-fire.

---

## 7. Trigger options per event (resolved during tasks)

**New Assignment (T3).** Assignments are created in `workouts.js`. Options:
- (A) Inline call to `sendNotification` right after the assignment doc is created in the
  existing function (simplest; one send per create).
- (B) A dedicated `onDocumentCreated` trigger on the assignments/workouts collection.
Choose (A) if creation is centralized in one Cloud Function; else (B).

**Trainer Message (T4).** Confirm whether trainer→client messages are written by a Cloud
Function or directly client-side:
- If server-side: inline call or `onDocumentCreated` on `client_messages`.
- If client-side only: add a minimal `onDocumentCreated` trigger on `client_messages` that
  (a) verifies the author is the trainer/coach (not the client — FR-8), (b) resolves the
  recipient client uid, (c) calls the helper. This keeps gating + secrets server-side.

Both are finalized in tasks with the exact function ids before coding.

---

## 8. Secrets & config

- Functions that call the helper **must** include `RESEND_API_KEY` in their `secrets: [...]`
  binding (same as OTP/welcome). Pass `resendKey.value()` into `sendNotification`.
- Sender `notifications@shrey.fit`: **no new DNS** — `shrey.fit` is already a verified
  Resend sending domain. Create the mailbox in Porkbun for branding/replies; confirm in
  the Resend dashboard that domain-level sending covers the new address before go-live.

---

## 9. Frontend change

`app/src/app/dashboard/client/profile/page.tsx` — replace the amber "not yet configured
(Phase 2)" status banner with an active-state message, e.g.:

> **Status:** Email notifications are active for New Assignments and Trainer Messages.
> Reminders and progress updates are coming soon. Manage them anytime above.

(No change to the preference read/write logic — it already works.)

---

## 9a. Admin master switch (FR-9…FR-11)

**Storage.** `appSettings/notifications` = `{ emailEnabled: boolean, updatedAt, updatedBy }`.
Missing doc/field ⇒ treated as enabled (`true`).

**Enforcement.** The helper reads this doc first (see §3, `admin_disabled` reason). When
`emailEnabled === false`, no client notification email is sent for any type/client —
overriding all per-client prefs. It does NOT touch OTP/welcome/billing/marketing-reply
(those don't go through this helper).

**Admin UI.** The Admin System Settings page (`app/src/app/dashboard/admin/settings/page.tsx`)
is currently a "Coming Soon" placeholder that already lists "Manage notification
preferences" as a planned capability. Replace that item with a real **"Client email
notifications"** toggle:
- Reads `appSettings/notifications.emailEnabled` on load (default ON).
- Admin-only (page is already admin-guarded via `canAccessAdminDashboard`).
- On toggle, writes `{ emailEnabled, updatedAt: serverTimestamp(), updatedBy: uid }`.
- Shows current state + "last changed by {admin} on {date}" for auditability.
- Copy makes clear it's a global kill-switch for client notifications and does NOT affect
  account/billing emails.

**Write path options** (choose in tasks):
- (A) Direct Firestore write from the admin page, gated by a Firestore security rule that
  allows writes to `appSettings/notifications` only for admins. Simplest.
- (B) An admin-gated callable (`setNotificationsEnabled`) if we prefer server-side
  validation/audit. Use (A) unless rules can't express the admin check cleanly.

**Security rules.** Add a rule so `appSettings/{doc}` is readable as needed and writable
only by admins (mirrors existing admin-gated collections).

---

## 10. Testing strategy (see tasks for the matrix)


- Unit-ish: call `sendNotification` with mocked Firestore user docs across the §5 table.
- Integration: trigger a real assignment create + trainer message in a test project;
  verify one email each, correct gating when toggled off / paused, and no client→trainer
  email. Confirm the triggering write still succeeds when `RESEND_API_KEY` is unset
  (fail-soft).

---

## 11. Rollback

- The feature is additive and fail-soft. Rollback = revert the event-site calls (and, if
  used, remove the `onCreate` triggers) and restore the banner. Preferences data is
  untouched throughout.
