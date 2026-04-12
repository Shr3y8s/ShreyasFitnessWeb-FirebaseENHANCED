// Client Notifications — Firestore API Layer
// Handles real-time subscriptions and mark-as-read operations.

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
import type { ClientNotification, ClientNotificationDoc } from '@/types/client-notifications';

const CLIENT_NOTIFICATIONS_COLLECTION = 'clientNotifications';
const NOTIFICATIONS_LIMIT = 50;

/**
 * Convert a Firestore Timestamp to a JS Date.
 */
function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  const parsed = new Date(val as string | number);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Convert a raw Firestore document to a ClientNotification.
 */
function docToNotification(id: string, data: ClientNotificationDoc): ClientNotification {
  return {
    id,
    type: data.type,
    clientId: data.clientId,
    message: data.message,
    timestamp: toDate(data.timestamp),
    expiresAt: toDate(data.expiresAt),
    read: data.read ?? false,
    actionUrl: data.actionUrl,
    metadata: data.metadata || {},
  };
}

/**
 * Subscribe to a client's notifications in real-time.
 * Returns unread notifications first, then sorted by timestamp descending.
 * Returns an unsubscribe function.
 */
export function subscribeToClientNotifications(
  clientId: string,
  onUpdate: (notifications: ClientNotification[]) => void,
  onError?: (error: Error) => void
): () => void {
  const notifRef = collection(db, CLIENT_NOTIFICATIONS_COLLECTION);

  const notifQuery = query(
    notifRef,
    where('clientId', '==', clientId),
    orderBy('timestamp', 'desc'),
    limit(NOTIFICATIONS_LIMIT)
  );

  const unsubscribe = onSnapshot(
    notifQuery,
    (snapshot) => {
      const notifications: ClientNotification[] = snapshot.docs.map((d) =>
        docToNotification(d.id, d.data() as ClientNotificationDoc)
      );
      onUpdate(notifications);
    },
    (error) => {
      console.error('[ClientNotifications] Listener error:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notifId: string): Promise<void> {
  try {
    const notifRef = doc(db, CLIENT_NOTIFICATIONS_COLLECTION, notifId);
    await updateDoc(notifRef, { read: true });
  } catch (error) {
    console.error('[ClientNotifications] Failed to mark as read:', error);
  }
}

/**
 * Mark all unread notifications as read for a given client.
 */
export async function markAllNotificationsAsRead(clientId: string): Promise<void> {
  try {
    const notifRef = collection(db, CLIENT_NOTIFICATIONS_COLLECTION);
    const unreadQuery = query(
      notifRef,
      where('clientId', '==', clientId),
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
    console.error('[ClientNotifications] Failed to mark all as read:', error);
  }
}
