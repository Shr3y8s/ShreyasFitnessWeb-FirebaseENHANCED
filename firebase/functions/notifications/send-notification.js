/**
 * Client Email Notifications — preference-gated, fail-soft send helper.
 *
 * Reads the admin master switch (appSettings/notifications.emailEnabled), then the
 * client's users/{uid}.notificationPreferences, applies the gate, and sends via Resend.
 * NEVER throws — errors are logged and swallowed so the triggering write is unaffected.
 *
 * See docs/02-implementation/email-notifications/design.md §3/§9a.
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { Resend } = require("resend");
const templates = require("./templates");

// notification type → the notificationPreferences flag that gates it.
const FLAG_FOR_TYPE = {
  new_assignment: "newAssignments",
  trainer_message: "trainerMessages",
  // deferred: workout_reminder: "workoutReminders", progress_update: "progressUpdates",
};

const FROM = "Shrey.Fit Notifications <notifications@shrey.fit>";
const REPLY_TO = "support@shrey.fit";

/**
 * @param {object} p
 * @param {string} p.uid           recipient (client) user id
 * @param {string} p.type          one of FLAG_FOR_TYPE keys
 * @param {object} [p.data]        template data (workoutName, trainerName, etc.)
 * @param {string} p.resendApiKey  value from the bound RESEND_API_KEY secret
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
async function sendNotification({ uid, type, data = {}, resendApiKey }) {
  try {
    const flag = FLAG_FOR_TYPE[type];
    if (!flag) return { sent: false, reason: "unknown_type" };
    if (!uid) return { sent: false, reason: "no_uid" };

    if (!resendApiKey) {
      logger.error("[Notifications] NOT sent: RESEND_API_KEY unavailable to runtime", { type, uid });
      return { sent: false, reason: "no_api_key" };
    }

    const db = admin.firestore();

    // 1) Admin master switch (global kill-switch). Missing doc/field ⇒ enabled.
    const settingsSnap = await db.collection("appSettings").doc("notifications").get();
    if (settingsSnap.exists && settingsSnap.data().emailEnabled === false) {
      logger.info("[Notifications] skipped: admin_disabled", { type, uid });
      return { sent: false, reason: "admin_disabled" };
    }

    // 2) Recipient + preferences.
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) return { sent: false, reason: "no_user" };
    const u = snap.data() || {};
    const email = u.email;
    if (!email) return { sent: false, reason: "no_email" };

    const prefs = u.notificationPreferences || {};
    // "off" is what the client profile radio saves; "paused" kept for back-compat.
    if (prefs.frequency === "off" || prefs.frequency === "paused") {
      return { sent: false, reason: "paused" };
    }

    if (prefs[flag] === false) return { sent: false, reason: "opted_out" };

    // 3) Render + send.
    const { subject, html, text } = templates.build(type, {
      ...data,
      firstName: (u.name || "").split(" ")[0] || "there",
    });

    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: FROM,
      to: email,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) {
      logger.error("[Notifications] Resend error", { type, uid, message: error.message });
      return { sent: false, reason: "resend_error" };
    }

    logger.info("[Notifications] sent", { type, uid });
    return { sent: true };
  } catch (e) {
    // Fail-soft: never throw into the triggering flow.
    logger.error("[Notifications] sendNotification threw (non-fatal)", { type, uid, error: e.message });
    return { sent: false, reason: "exception" };
  }
}

module.exports = { sendNotification, FLAG_FOR_TYPE };
