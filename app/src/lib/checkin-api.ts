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
 * Calculate ISO week identifier from a date
 * Format: "YYYY-Www" (e.g., "2025-W01")
 */
export function getWeekIdentifier(date: Date): string {
  // Get the year
  const year = date.getFullYear();
  
  // Calculate week number (ISO 8601)
  // Week starts on Sunday
  const firstDayOfYear = new Date(year, 0, 1);
  const daysSinceFirstDay = Math.floor((date.getTime() - firstDayOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((daysSinceFirstDay + firstDayOfYear.getDay() + 1) / 7);
  
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Get week identifier for current week
 */
export function getCurrentWeekIdentifier(): string {
  return getWeekIdentifier(new Date());
}

/**
 * Get start and end dates for a week identifier
 */
export function getWeekBounds(weekIdentifier: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = weekIdentifier.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  
  // Calculate first day of year
  const firstDayOfYear = new Date(year, 0, 1);
  
  // Calculate start of the specified week (Sunday)
  const daysToWeekStart = (week - 1) * 7 - firstDayOfYear.getDay();
  const weekStart = new Date(year, 0, 1 + daysToWeekStart);
  weekStart.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Saturday)
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart, end: weekEnd };
}

/**
 * Format week identifier for display
 * "2025-W01" -> "Dec 29, 2024 - Jan 4, 2025"
 */
export function formatWeekRange(weekIdentifier: string): string {
  const { start, end } = getWeekBounds(weekIdentifier);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const startYear = start.getFullYear();
  
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const endDay = end.getDate();
  const endYear = end.getFullYear();
  
  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }
  
  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
}

/**
 * Get check-ins for a client
 */
export async function getClientCheckins(clientId: string): Promise<CheckinSession[]> {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      orderBy('scheduledDate', 'desc'),
      limit(10)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
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
    });
  } catch (error) {
    console.error('Error fetching client check-ins:', error);
    throw error;
  }
}

/**
 * Check if check-in scheduled for a specific week
 */
export async function hasCheckinForWeek(
  clientId: string,
  weekIdentifier: string
): Promise<CheckinSession | null> {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      where('weekIdentifier', '==', weekIdentifier),
      where('status', 'in', ['scheduled', 'completed'])
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
    console.error('Error checking for week check-in:', error);
    throw error;
  }
}

/**
 * Get check-in for current week
 */
export async function getCurrentWeekCheckin(clientId: string): Promise<CheckinSession | null> {
  const currentWeek = getCurrentWeekIdentifier();
  return hasCheckinForWeek(clientId, currentWeek);
}

/**
 * Get upcoming check-ins (future weeks only)
 */
export async function getUpcomingCheckins(clientId: string): Promise<CheckinSession[]> {
  try {
    const now = Timestamp.now();
    
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      where('scheduledDate', '>', now),
      where('status', '==', 'scheduled'),
      orderBy('scheduledDate', 'asc'),
      limit(5)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        scheduledDate: data.scheduledDate as Timestamp,
        createdAt: data.createdAt as Timestamp,
        updatedAt: data.updatedAt as Timestamp,
      } as CheckinSession;
    });
  } catch (error) {
    console.error('Error fetching upcoming check-ins:', error);
    throw error;
  }
}

/**
 * Get past check-ins (completed or canceled)
 */
export async function getPastCheckins(clientId: string, limitCount: number = 4): Promise<CheckinSession[]> {
  try {
    const now = Timestamp.now();
    
    const q = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      where('scheduledDate', '<', now),
      orderBy('scheduledDate', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
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
    });
  } catch (error) {
    console.error('Error fetching past check-ins:', error);
    throw error;
  }
}

/**
 * Check if user is eligible for check-ins
 * Based on subscription status
 */
export function isEligibleForCheckins(subscriptionStatus?: string): boolean {
  if (!subscriptionStatus) return false;
  
  // Check-ins included with online coaching and complete transformation
  const eligibleStatuses = ['active', 'trialing'];
  return eligibleStatuses.includes(subscriptionStatus);
}

/**
 * Helper function to map Firestore document to CheckinSession
 */
function mapDocToCheckin(doc: any): CheckinSession {
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
}

/**
 * Real-time listener: Subscribe to current week's check-in
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeToCurrentWeekCheckin(
  clientId: string,
  callback: (checkin: CheckinSession | null) => void
): Unsubscribe {
  const currentWeek = getCurrentWeekIdentifier();
  
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'checkin'),
    where('weekIdentifier', '==', currentWeek),
    where('status', 'in', ['scheduled', 'completed'])
  );
  
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
    } else {
      callback(mapDocToCheckin(snapshot.docs[0]));
    }
  }, (error) => {
    console.error('Error in current week check-in listener:', error);
    callback(null);
  });
}

/**
 * Real-time listener: Subscribe to upcoming check-ins
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeToUpcomingCheckins(
  clientId: string,
  callback: (checkins: CheckinSession[]) => void
): Unsubscribe {
  const now = Timestamp.now();
  
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'checkin'),
    where('scheduledDate', '>', now),
    where('status', '==', 'scheduled'),
    orderBy('scheduledDate', 'asc'),
    limit(5)
  );
  
  return onSnapshot(q, (snapshot) => {
    const checkins = snapshot.docs.map(mapDocToCheckin);
    callback(checkins);
  }, (error) => {
    console.error('Error in upcoming check-ins listener:', error);
    callback([]);
  });
}

/**
 * Real-time listener: Subscribe to past check-ins
 * @returns Unsubscribe function to clean up the listener
 */
export function subscribeToPastCheckins(
  clientId: string,
  callback: (checkins: CheckinSession[]) => void,
  limitCount: number = 4
): Unsubscribe {
  const now = Timestamp.now();
  
  const q = query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'checkin'),
    where('scheduledDate', '<', now),
    orderBy('scheduledDate', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(q, (snapshot) => {
    const checkins = snapshot.docs.map(mapDocToCheckin);
    callback(checkins);
  }, (error) => {
    console.error('Error in past check-ins listener:', error);
    callback([]);
  });
}
