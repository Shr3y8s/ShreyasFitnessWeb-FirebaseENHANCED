import { db } from './firebase';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  limit,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { CheckinSession } from '@/types/session';

/**
 * Consultation API
 * Handles onboarding consultation scheduling (one-time 30-min session)
 * Simpler than check-ins (no weekly logic, just single session tracking)
 */

/**
 * Get consultation for a client (if exists)
 */
export async function getClientConsultation(clientId: string): Promise<CheckinSession | null> {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'onboarding'),
      where('status', 'in', ['scheduled', 'completed']),
      orderBy('scheduledDate', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      scheduledDate: data.scheduledDate as Timestamp,
      createdAt: data.createdAt as Timestamp,
      updatedAt: data.updatedAt as Timestamp,
      completedAt: data.completedAt as Timestamp | undefined,
      canceledAt: data.canceledAt as Timestamp | undefined,
    } as CheckinSession;
  } catch (error) {
    console.error('Error fetching consultation:', error);
    throw error;
  }
}

/**
 * Check if consultation already scheduled or completed
 */
export async function hasScheduledConsultation(clientId: string): Promise<boolean> {
  const consultation = await getClientConsultation(clientId);
  return consultation !== null;
}

/**
 * Real-time listener: Subscribe to consultation status
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeToConsultation(
  clientId: string,
  callback: (consultation: CheckinSession | null) => void
): Unsubscribe {
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'onboarding'),
    where('status', 'in', ['scheduled', 'completed']),
    orderBy('scheduledDate', 'desc'),
    limit(1)
  );
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      const doc = snapshot.docs[0];
      const data = doc.data();
      callback({
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate as Timestamp,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
        completedAt: data.completedAt as Timestamp | undefined,
        canceledAt: data.canceledAt as Timestamp | undefined,
      } as CheckinSession);
    }
  }, (error) => {
    console.error('Error in consultation listener:', error);
    callback(null);
  });
}
