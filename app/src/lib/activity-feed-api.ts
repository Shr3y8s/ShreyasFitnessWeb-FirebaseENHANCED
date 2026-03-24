// Client Activity Feed — Firestore API Layer
// Handles real-time subscriptions, queries, and mark-as-read operations.
// See: docs/02-implementation/client-activity-feed-architecture.md

import { db } from './firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import type { ActivityFeedEvent, ActivityFeedEventDoc } from '@/types/activity-feed';

const ACTIVITY_FEED_COLLECTION = 'activityFeed';
const FEED_LIMIT = 100;

/**
 * Convert a Firestore Timestamp to a JS Date, handling various input types.
 */
function toDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Convert a raw Firestore document to an ActivityFeedEvent.
 */
function docToEvent(id: string, data: any): ActivityFeedEvent {
  return {
    id,
    type: data.type,
    clientId: data.clientId,
    clientName: data.clientName,
    trainerId: data.trainerId,
    message: data.message,
    timestamp: toDate(data.timestamp),
    metadata: data.metadata || {},
    read: data.read ?? false,
    expiresAt: toDate(data.expiresAt),
  };
}

/**
 * Subscribe to the activity feed in real-time.
 * 
 * - Trainers see only their assigned clients' events.
 * - Admins see all events.
 * 
 * Returns an unsubscribe function.
 */
export function subscribeToActivityFeed(
  trainerId: string,
  isAdmin: boolean,
  onEventsUpdate: (events: ActivityFeedEvent[]) => void,
  onError?: (error: Error) => void
): () => void {
  const feedRef = collection(db, ACTIVITY_FEED_COLLECTION);

  const feedQuery = isAdmin
    ? query(feedRef, orderBy('timestamp', 'desc'), limit(FEED_LIMIT))
    : query(
        feedRef,
        where('trainerId', '==', trainerId),
        orderBy('timestamp', 'desc'),
        limit(FEED_LIMIT)
      );

  const unsubscribe = onSnapshot(
    feedQuery,
    (snapshot) => {
      const events: ActivityFeedEvent[] = snapshot.docs.map((d) =>
        docToEvent(d.id, d.data())
      );
      onEventsUpdate(events);
    },
    (error) => {
      console.error('[ActivityFeed] Listener error:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Mark a single activity feed event as read.
 */
export async function markEventAsRead(eventId: string): Promise<void> {
  try {
    const eventRef = doc(db, ACTIVITY_FEED_COLLECTION, eventId);
    await updateDoc(eventRef, { read: true });
  } catch (error) {
    console.error('[ActivityFeed] Failed to mark event as read:', error);
  }
}

/**
 * Mark all unread events as read for the current trainer (or all if admin).
 */
export async function markAllEventsAsRead(
  trainerId: string,
  isAdmin: boolean
): Promise<void> {
  try {
    const feedRef = collection(db, ACTIVITY_FEED_COLLECTION);
    const unreadQuery = isAdmin
      ? query(feedRef, where('read', '==', false))
      : query(
          feedRef,
          where('trainerId', '==', trainerId),
          where('read', '==', false)
        );

    const snapshot = await getDocs(unreadQuery);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('[ActivityFeed] Failed to mark all as read:', error);
  }
}
