/**
 * Client Notifications — Shared Helper
 *
 * Writes notification events to the `clientNotifications` Firestore collection.
 * Called by Cloud Functions when trainer actions or system events should notify a client.
 *
 * All writes are non-blocking (wrapped in try/catch) so they never disrupt
 * the primary function's operation.
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Write a notification event to the clientNotifications collection.
 *
 * @param {Object} params
 * @param {string} params.type            - Notification type key (e.g., 'new_workout')
 * @param {string} params.clientId        - The recipient client's user ID
 * @param {string} params.message         - Human-readable notification summary
 * @param {string} [params.actionUrl]     - Optional deep link for "View" button
 * @param {Object} [params.metadata={}]   - Type-specific extra data
 */
async function writeClientNotification({type, clientId, message, actionUrl, metadata = {}}) {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + SEVEN_DAYS_MS,
    );

    const doc = {
      type,
      clientId,
      message,
      read: false,
      timestamp: now,
      expiresAt,
      metadata,
    };

    if (actionUrl) {
      doc.actionUrl = actionUrl;
    }

    await admin.firestore().collection("clientNotifications").add(doc);

    logger.info("[ClientNotifications] Notification written", {type, clientId});
  } catch (error) {
    // Non-blocking — log and continue. Never throw.
    logger.error("[ClientNotifications] Failed to write notification", {
      type,
      clientId,
      error: error.message,
    });
  }
}

module.exports = {writeClientNotification};
