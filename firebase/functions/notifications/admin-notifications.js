/**
 * Admin (Owner) Notifications — global-switch-gated, fail-soft.
 *
 * For business/money/lifecycle events, `notifyAdmin` does two independent, fail-soft
 * things:
 *   1. Writes an admin-broadcast row to the activityFeed (surfaces in the notification
 *      bell for admin users).
 *   2. Emails admin@shrey.fit via Resend.
 *
 * Both are suppressed by a single global switch: appSettings/adminNotifications.enabled
 * (missing doc/field ⇒ enabled). NEVER throws — errors are logged and swallowed so the
 * triggering write is unaffected.
 *
 * See docs/02-implementation/admin-notifications/design.md §3.
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { Resend } = require("resend");
const templates = require("./admin-templates");
const { writeAdminActivityEvent } = require("../activity-feed");

const FROM = "Shrey.Fit <notifications@shrey.fit>";
const REPLY_TO = "support@shrey.fit";
const ADMIN_TO = "admin@shrey.fit"; // FR-7 — single constant, easy to change.

// Admin notification type → dashboard CTA (also written into feed metadata).
const ADMIN_TYPES = {
  new_inquiry: { cta: "/dashboard/admin/leads" },
  new_pending_signup: { cta: "/dashboard/admin/pending-accounts" },
  new_client_activated: { cta: "/dashboard/admin/client-management" },
  new_session_purchase: { cta: "/dashboard/admin/revenue" },
  subscription_canceled: { cta: "/dashboard/admin/subscriptions" },
};

/** Global master switch. Missing doc/field ⇒ enabled. Never throws. */
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
 * Fire-and-forget owner notification. NEVER throws.
 *
 * @param {object} p
 * @param {string} p.type            one of ADMIN_TYPES
 * @param {object} [p.data]          template + metadata data (name, amountMinor, etc.)
 * @param {string} [p.resendApiKey]  bound RESEND_API_KEY value (email skipped if absent)
 * @returns {Promise<{feedWritten:boolean, emailSent:boolean, reason?:string}>}
 */
async function notifyAdmin({ type, data = {}, resendApiKey }) {
  try {
    const cfg = ADMIN_TYPES[type];
    if (!cfg) {
      logger.warn("[AdminNotify] unknown type", { type });
      return { feedWritten: false, emailSent: false, reason: "unknown_type" };
    }

    if (!(await adminNotificationsEnabled())) {
      logger.info("[AdminNotify] skipped: admin_disabled", { type });
      return { feedWritten: false, emailSent: false, reason: "admin_disabled" };
    }

    const { subject, html, text, feedMessage } = templates.build(type, data);

    // 1) Dashboard feed (admin-broadcast). Fail-soft inside the helper.
    let feedWritten = false;
    try {
      await writeAdminActivityEvent({
        type,
        message: feedMessage,
        metadata: { ...data, ctaUrl: cfg.cta },
      });
      feedWritten = true;
    } catch (e) {
      logger.error("[AdminNotify] feed write threw (non-fatal)", { type, error: e.message });
    }

    // 2) Email admin@shrey.fit.
    if (!resendApiKey) {
      logger.error("[AdminNotify] email NOT sent: RESEND_API_KEY unavailable", { type });
      return { feedWritten, emailSent: false, reason: "no_api_key" };
    }
    try {
      const resend = new Resend(resendApiKey);
      const { error } = await resend.emails.send({
        from: FROM,
        to: ADMIN_TO,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
      });
      if (error) {
        logger.error("[AdminNotify] Resend error", { type, message: error.message });
        return { feedWritten, emailSent: false, reason: "resend_error" };
      }
      logger.info("[AdminNotify] sent", { type });
      return { feedWritten, emailSent: true };
    } catch (e) {
      logger.error("[AdminNotify] send threw (non-fatal)", { type, error: e.message });
      return { feedWritten, emailSent: false, reason: "exception" };
    }
  } catch (e) {
    logger.error("[AdminNotify] notifyAdmin threw (non-fatal)", { type, error: e.message });
    return { feedWritten: false, emailSent: false, reason: "exception" };
  }
}

module.exports = { notifyAdmin, ADMIN_TYPES, ADMIN_TO };
