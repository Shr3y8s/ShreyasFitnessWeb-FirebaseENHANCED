import { doc, collection, query, where, orderBy, getDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SessionBalance, SessionPackage, TrainingSession } from '@/types/session';
import { TrainingLocation } from '@/types/location';

/**
 * Subscribe to real-time session balance updates for a user
 * @param userId - The user's ID
 * @param callback - Callback function to receive balance and packages
 * @returns Unsubscribe function
 */
export function subscribeToSessionBalance(
  userId: string,
  callback: (balance: SessionBalance, packages: SessionPackage[]) => void
) {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const balance: SessionBalance = data.sessionBalance || { 
        available: 0, 
        purchased: 0, 
        used: 0, 
        expired: 0,
        lastUpdated: Timestamp.now()
      };
      const packages: SessionPackage[] = data.sessionPackages || [];
      callback(balance, packages);
    } else {
      callback(
        { available: 0, purchased: 0, used: 0, expired: 0, lastUpdated: Timestamp.now() },
        []
      );
    }
  }, (error) => {
    console.error('Error subscribing to session balance:', error);
    callback(
      { available: 0, purchased: 0, used: 0, expired: 0, lastUpdated: Timestamp.now() },
      []
    );
  });
}

/**
 * Subscribe to real-time upcoming sessions for a client
 * @param clientId - The client's user ID
 * @param callback - Callback function to receive sessions
 * @returns Unsubscribe function
 */
export function subscribeToUpcomingSessions(
  clientId: string,
  callback: (sessions: TrainingSession[]) => void
) {
  const sessionsRef = collection(db, 'sessions');
  const q = query(
    sessionsRef,
    where('clientId', '==', clientId),
    where('status', '==', 'scheduled'),
    where('scheduledDate', '>=', Timestamp.now()),
    orderBy('scheduledDate', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TrainingSession[];
    callback(sessions);
  }, (error) => {
    console.error('Error subscribing to upcoming sessions:', error);
    callback([]);
  });
}

/**
 * Get the last completed session for a client
 * @param clientId - The client's user ID
 * @returns Promise resolving to the last session or null
 */
export async function getLastCompletedSession(clientId: string): Promise<TrainingSession | null> {
  try {
    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('clientId', '==', clientId),
      where('status', '==', 'completed'),
      orderBy('scheduledDate', 'desc')
    );
    
    return new Promise((resolve) => {
      const unsubscribe = onSnapshot(q, (snapshot) => {
        unsubscribe(); // Unsubscribe immediately after getting data
        if (!snapshot.empty) {
          const lastSession = {
            id: snapshot.docs[0].id,
            ...snapshot.docs[0].data()
          } as TrainingSession;
          resolve(lastSession);
        } else {
          resolve(null);
        }
      }, (error) => {
        console.error('Error fetching last completed session:', error);
        resolve(null);
      });
    });
  } catch (error) {
    console.error('Error in getLastCompletedSession:', error);
    return null;
  }
}

/**
 * Get location details for a training session
 * @param session - The training session
 * @returns Promise resolving to location string
 */
export async function getSessionLocation(
  session: TrainingSession
): Promise<string> {
  try {
    if (session.locationType === 'private') {
      const clientDoc = await getDoc(doc(db, 'users', session.clientId));
      if (clientDoc.exists()) {
        const clientData = clientDoc.data();
        return formatAddress(clientData.address);
      }
      return 'Private location (address not set)';
    } else {
      const locationDoc = await getDoc(doc(db, 'training_locations', session.locationId));
      if (locationDoc.exists()) {
        const locationData = locationDoc.data() as TrainingLocation;
        return locationData.address;
      }
      return 'Location TBD';
    }
  } catch (error) {
    console.error('Error fetching location:', error);
    return 'Location unavailable';
  }
}

/**
 * Format an address (handles both string and object formats)
 * @param address - Address as string or object
 * @returns Formatted address string
 */
function formatAddress(address: string | any): string {
  if (!address) return 'Private location (address not set)';
  
  if (typeof address === 'string') {
    return address;
  }
  
  if (address && typeof address === 'object') {
    const parts = [
      address.street,
      address.city,
      address.state,
      address.zipCode
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'Private location';
  }
  
  return 'Private location (address not set)';
}

/**
 * Format a session date with timezone
 * @param timestamp - Firestore timestamp
 * @returns Formatted date string
 */
export function formatSessionDate(timestamp: Timestamp): string {
  const date = new Date(timestamp.toMillis());
  const tzAbbr = new Date().toLocaleTimeString('en-US', { 
    timeZoneName: 'short' 
  }).split(' ').pop();
  
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${dateStr} (${tzAbbr})`;
}

/**
 * Format a session time range with duration
 * @param timestamp - Firestore timestamp for start time
 * @param duration - Duration in minutes
 * @returns Formatted time range string
 */
export function formatSessionTimeRange(timestamp: Timestamp, duration: number): string {
  const startDate = new Date(timestamp.toMillis());
  const endDate = new Date(startDate.getTime() + duration * 60000);
  
  const tzAbbr = new Date().toLocaleTimeString('en-US', { 
    timeZoneName: 'short' 
  }).split(' ').pop();
  
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return `${startTime} - ${endTime} ${tzAbbr}`;
}

/**
 * Get package type display name
 * @param packageData - Session package data
 * @returns Display name for package type
 */
export function getPackageTypeName(packageData: SessionPackage): string {
  if (packageData.type === 'single') return 'Single Session';
  if (packageData.type === '4-pack') return '4-Pack Sessions';
  return `${packageData.quantity}-Pack Sessions`;
}

/**
 * Get the earliest expiring package date
 * @param packages - Array of session packages
 * @returns Date of next expiration or null
 */
export function getNextExpirationDate(packages: SessionPackage[]): Date | null {
  const activePackages = packages
    .filter(pkg => !pkg.expired && pkg.remaining > 0)
    .sort((a, b) => {
      const aTime = typeof a.purchaseDate === 'number' 
        ? a.purchaseDate 
        : a.purchaseDate.toMillis();
      const bTime = typeof b.purchaseDate === 'number' 
        ? b.purchaseDate 
        : b.purchaseDate.toMillis();
      return aTime - bTime;
    });
  
  if (activePackages.length === 0) return null;
  
  const expirationDate = activePackages[0].expirationDate;
  return typeof expirationDate === 'number'
    ? new Date(expirationDate)
    : expirationDate.toDate();
}

/**
 * Format a simple date (for payment history, etc.)
 * @param timestamp - Firestore timestamp or Date
 * @returns Formatted date string
 */
export function formatSimpleDate(timestamp: Timestamp | Date): string {
  const date = timestamp instanceof Timestamp 
    ? new Date(timestamp.toMillis()) 
    : timestamp;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Format currency amount
 * @param amount - Amount in cents
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return `$${(amount / 100).toFixed(2)}`;
}
