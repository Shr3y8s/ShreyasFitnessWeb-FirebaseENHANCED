/**
 * Client Activity Feed — Shared Helper
 * 
 * Writes activity events to the `activityFeed` Firestore collection.
 * Called by various Cloud Function triggers when client actions occur.
 * 
 * All writes are non-blocking (wrapped in try/catch) so they never
 * disrupt the primary function's operation.
 * 
 * See: docs/02-implementation/client-activity-feed-architecture.md
 */

const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Write an activity event to the activityFeed collection.
 *
 * @param {Object} params
 * @param {string} params.type - Event type key (e.g., 'workout_completed')
 * @param {string} params.clientId - The client's user ID
 * @param {string} params.clientName - The client's display name (denormalized)
 * @param {string} params.trainerId - The client's assigned trainer ID
 * @param {string} params.message - Human-readable event summary
 * @param {Object} [params.metadata={}] - Event-specific data (varies by event type)
 */
async function writeActivityEvent({ type, clientId, clientName, trainerId, message, metadata = {} }) {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + SEVEN_DAYS_MS
    );

    await admin.firestore().collection('activityFeed').add({
      type,
      clientId,
      clientName: clientName || 'Unknown Client',
      trainerId: trainerId || '',
      message,
      metadata,
      read: false,
      timestamp: now,
      expiresAt,
    });

    logger.info('[ActivityFeed] Event written', { type, clientId, trainerId });
  } catch (error) {
    // Activity feed writes are non-blocking — log and continue
    // Never throw: the calling function should not fail because of activity feed
    logger.error('[ActivityFeed] Failed to write event', {
      type,
      clientId,
      error: error.message,
    });
  }
}

/**
 * Helper to get client info (name + trainerId) from the users collection.
 * Useful when the calling function doesn't already have this data.
 *
 * @param {string} clientId - The client's user ID
 * @returns {Object} { clientName, trainerId } or defaults if not found
 */
async function getClientInfoForActivityFeed(clientId) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(clientId).get();
    if (!userDoc.exists) {
      return { clientName: 'Unknown Client', trainerId: '' };
    }
    const data = userDoc.data();
    return {
      clientName: data.name || 'Unknown Client',
      trainerId: data.assignedTrainerId || '',
    };
  } catch (error) {
    logger.warn('[ActivityFeed] Failed to get client info', {
      clientId,
      error: error.message,
    });
    return { clientName: 'Unknown Client', trainerId: '' };
  }
}

module.exports = { writeActivityEvent, getClientInfoForActivityFeed };
