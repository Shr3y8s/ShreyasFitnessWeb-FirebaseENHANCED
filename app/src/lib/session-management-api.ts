import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  getDoc,
  doc, 
  updateDoc, 
  increment,
  Timestamp,
  QueryConstraint,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import type { Session, TrainingSession, CheckinSession, SessionStatus } from '@/types/session';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Re-export types from session types file for convenience
export type { Session, TrainingSession, CheckinSession, SessionStatus } from '@/types/session';

export interface SessionFilters {
  sessionType?: 'training' | 'checkin';
  clientId?: string;
  status?: SessionStatus | 'all';
  dateRange?: {
    start: Date;
    end: Date;
  };
  // Alternative date filter format (used by SessionFiltersCard component)
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SessionStats {
  today: number;
  week: number;
  month: number;
  noShows: number;
}

export type EnrichedSession = Session & {
  packageInfo?: {
    remaining: number;
    total: number;
    expirationDate: Date;
    daysUntilExpiration: number;
    isExpiringSoon: boolean;
    extended: boolean;
  };
  locationInfo?: {
    name: string;
    address: string;
  };
};

// ============================================================================
// SESSION FETCHING
// ============================================================================

/**
 * Fetch training sessions or check-ins for a trainer with optional filters
 */
export async function getTrainerSessions(
  trainerId: string,
  filters: SessionFilters = {}
): Promise<Session[]> {
  try {
    console.log('[getTrainerSessions] Starting fetch with trainerId:', trainerId);
    console.log('[getTrainerSessions] Filters:', filters);

    // For admin sessions, query for trainerId = "admin" OR the actual trainer ID
    // We'll make two queries and combine results
    const queries: Promise<Session[]>[] = [];
    
    // Query 1: Sessions with trainerId matching the user's ID
    const query1Constraints: QueryConstraint[] = [
      where('trainerId', '==', trainerId)
    ];
    
    // Add common filters to query 1
    if (filters.sessionType) {
      query1Constraints.push(where('sessionType', '==', filters.sessionType));
    }
    if (filters.clientId) {
      query1Constraints.push(where('clientId', '==', filters.clientId));
    }
    if (filters.status && filters.status !== 'all') {
      query1Constraints.push(where('status', '==', filters.status));
    }
    query1Constraints.push(orderBy('scheduledDate', 'desc'));
    
    const q1 = query(collection(db, 'sessions'), ...query1Constraints);
    queries.push(
      getDocs(q1).then(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Session[]
      )
    );
    
    // Query 2: Sessions with trainerId = "admin" (for admin users)
    const query2Constraints: QueryConstraint[] = [
      where('trainerId', '==', 'admin')
    ];
    
    // Add common filters to query 2
    if (filters.sessionType) {
      query2Constraints.push(where('sessionType', '==', filters.sessionType));
    }
    if (filters.clientId) {
      query2Constraints.push(where('clientId', '==', filters.clientId));
    }
    if (filters.status && filters.status !== 'all') {
      query2Constraints.push(where('status', '==', filters.status));
    }
    query2Constraints.push(orderBy('scheduledDate', 'desc'));
    
    const q2 = query(collection(db, 'sessions'), ...query2Constraints);
    queries.push(
      getDocs(q2).then(snapshot => 
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Session[]
      )
    );

    // Execute both queries in parallel
    const results = await Promise.all(queries);
    
    // Combine and deduplicate results
    const sessionsMap = new Map<string, Session>();
    results.forEach(sessionList => {
      sessionList.forEach(session => {
        sessionsMap.set(session.id, session);
      });
    });
    
    let sessions = Array.from(sessionsMap.values());
    
    console.log('[getTrainerSessions] Documents found:', sessions.length);

    // Apply date range filter in memory
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      sessions = sessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        return sessionDate >= start && sessionDate <= end;
      });
    }
    
    // Also handle dateFrom/dateTo format (alternative format)
    if (filters.dateFrom || filters.dateTo) {
      sessions = sessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        if (filters.dateFrom && sessionDate < filters.dateFrom) return false;
        if (filters.dateTo && sessionDate > filters.dateTo) return false;
        return true;
      });
    }
    
    // Sort by scheduled date (newest first)
    sessions.sort((a, b) => b.scheduledDate.toMillis() - a.scheduledDate.toMillis());

    console.log('[getTrainerSessions] Final sessions count:', sessions.length);
    return sessions;
  } catch (error) {
    console.error('[getTrainerSessions] Error:', error);
    throw new Error('Failed to fetch sessions');
  }
}

/**
 * Subscribe to real-time trainer session updates
 * Returns an unsubscribe function to clean up the listener
 */
export function subscribeToTrainerSessions(
  trainerId: string,
  filters: SessionFilters = {},
  onUpdate: (sessions: Session[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  console.log('[subscribeToTrainerSessions] Setting up real-time listener');
  console.log('[subscribeToTrainerSessions] Filters:', filters);

  // Store sessions from both queries
  let query1Sessions: Session[] = [];
  let query2Sessions: Session[] = [];
  
  // Function to merge and process sessions from both queries
  const mergeSessions = () => {
    // Combine and deduplicate
    const sessionsMap = new Map<string, Session>();
    [...query1Sessions, ...query2Sessions].forEach(session => {
      sessionsMap.set(session.id, session);
    });
    
    let sessions = Array.from(sessionsMap.values());
    
    // Apply date filters in memory
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      sessions = sessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        return sessionDate >= start && sessionDate <= end;
      });
    }
    
    if (filters.dateFrom || filters.dateTo) {
      sessions = sessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        if (filters.dateFrom && sessionDate < filters.dateFrom) return false;
        if (filters.dateTo && sessionDate > filters.dateTo) return false;
        return true;
      });
    }
    
    // Sort by scheduled date
    sessions.sort((a, b) => b.scheduledDate.toMillis() - a.scheduledDate.toMillis());
    
    onUpdate(sessions);
  };

  // Query 1: Sessions with trainerId matching the user's ID
  const query1Constraints: QueryConstraint[] = [where('trainerId', '==', trainerId)];
  if (filters.sessionType) {
    query1Constraints.push(where('sessionType', '==', filters.sessionType));
  }
  if (filters.clientId) {
    query1Constraints.push(where('clientId', '==', filters.clientId));
  }
  if (filters.status && filters.status !== 'all') {
    query1Constraints.push(where('status', '==', filters.status));
  }
  query1Constraints.push(orderBy('scheduledDate', 'desc'));
  
  const q1 = query(collection(db, 'sessions'), ...query1Constraints);
  const unsubscribe1 = onSnapshot(
    q1,
    (snapshot) => {
      query1Sessions = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Session[];
      mergeSessions();
    },
    (error) => {
      console.error('[subscribeToTrainerSessions] Query 1 error:', error);
      onError(error as Error);
    }
  );

  // Query 2: Sessions with trainerId = "admin"
  const query2Constraints: QueryConstraint[] = [where('trainerId', '==', 'admin')];
  if (filters.sessionType) {
    query2Constraints.push(where('sessionType', '==', filters.sessionType));
  }
  if (filters.clientId) {
    query2Constraints.push(where('clientId', '==', filters.clientId));
  }
  if (filters.status && filters.status !== 'all') {
    query2Constraints.push(where('status', '==', filters.status));
  }
  query2Constraints.push(orderBy('scheduledDate', 'desc'));
  
  const q2 = query(collection(db, 'sessions'), ...query2Constraints);
  const unsubscribe2 = onSnapshot(
    q2,
    (snapshot) => {
      query2Sessions = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as Session[];
      mergeSessions();
    },
    (error) => {
      console.error('[subscribeToTrainerSessions] Query 2 error:', error);
      onError(error as Error);
    }
  );

  // Return combined unsubscribe function
  return () => {
    console.log('[subscribeToTrainerSessions] Cleaning up listeners');
    unsubscribe1();
    unsubscribe2();
  };
}

// ============================================================================
// SESSION ACTIONS
// ============================================================================

/**
 * Mark a session as complete with optional notes
 */
export async function markSessionComplete(
  sessionId: string,
  notes?: string,
  notesVisibleToClient: boolean = true
): Promise<{ success: boolean }> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      notes: notes || '',
      notesVisibleToClient,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking session complete:', error);
    throw new Error('Failed to mark session complete');
  }
}

/**
 * Mark a session as incomplete (revert from completed to scheduled)
 */
export async function markSessionIncomplete(
  sessionId: string
): Promise<{ success: boolean }> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      status: 'scheduled',
      completedAt: null,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error marking session incomplete:', error);
    throw new Error('Failed to mark session incomplete');
  }
}

/**
 * Mark a session as no-show with optional credit return
 */
export async function markSessionNoShow(
  sessionId: string,
  returnCredit: boolean,
  notes?: string
): Promise<{ success: boolean }> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionSnap.data() as Session;

    // Update session status
    await updateDoc(sessionRef, {
      status: 'no-show',
      creditReturned: returnCredit,
      notes: notes || '',
      updatedAt: Timestamp.now()
    });

    // If returning credit and it's a training session, increment package remaining
    if (returnCredit && sessionData.sessionType === 'training') {
      const trainingSession = sessionData as TrainingSession;
      const packageRef = doc(
        db, 
        'users', 
        sessionData.clientId, 
        'sessionPackages', 
        trainingSession.packageId
      );

      await updateDoc(packageRef, {
        remaining: increment(1),
        updatedAt: Timestamp.now()
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error marking session no-show:', error);
    throw new Error('Failed to mark session as no-show');
  }
}

/**
 * Cancel a session (trainer-initiated) - automatically returns credit
 */
export async function cancelSession(
  sessionId: string,
  cancelReason: string,
  notifyClient: boolean = false
): Promise<{ success: boolean }> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    
    if (!sessionSnap.exists()) {
      throw new Error('Session not found');
    }

    const sessionData = sessionSnap.data() as Session;

    // Update session status
    await updateDoc(sessionRef, {
      status: 'canceled',
      canceledBy: 'trainer',
      canceledAt: Timestamp.now(),
      cancelReason,
      creditReturned: sessionData.sessionType === 'training',
      updatedAt: Timestamp.now()
    });

    // If training session, return credit
    if (sessionData.sessionType === 'training') {
      const trainingSession = sessionData as TrainingSession;
      const packageRef = doc(
        db, 
        'users', 
        sessionData.clientId, 
        'sessionPackages', 
        trainingSession.packageId
      );

      await updateDoc(packageRef, {
        remaining: increment(1),
        updatedAt: Timestamp.now()
      });
    }

    // TODO: Implement email notification if notifyClient is true

    return { success: true };
  } catch (error) {
    console.error('Error canceling session:', error);
    throw new Error('Failed to cancel session');
  }
}

/**
 * Update session notes
 */
export async function updateSessionNotes(
  sessionId: string,
  notes: string,
  notesVisibleToClient: boolean
): Promise<{ success: boolean }> {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
    
    await updateDoc(sessionRef, {
      notes,
      notesVisibleToClient,
      updatedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating session notes:', error);
    throw new Error('Failed to update session notes');
  }
}

// ============================================================================
// PACKAGE MANAGEMENT
// ============================================================================

/**
 * Extend package expiration (one-time only)
 */
export async function extendPackageExpiration(
  userId: string,
  packageId: string,
  daysToAdd: number,
  reason: string,
  trainerId: string
): Promise<{ success: boolean; newExpirationDate: Date }> {
  try {
    const packageRef = doc(db, 'users', userId, 'sessionPackages', packageId);
    const packageSnap = await getDoc(packageRef);
    
    if (!packageSnap.exists()) {
      throw new Error('Package not found');
    }

    const packageData = packageSnap.data();

    // Check if already extended
    if (packageData.extendedBy) {
      throw new Error('Package has already been extended once');
    }

    // Calculate new expiration date
    const currentExpiration = packageData.expirationDate.toDate();
    const newExpiration = new Date(currentExpiration);
    newExpiration.setDate(newExpiration.getDate() + daysToAdd);

    // Update package
    await updateDoc(packageRef, {
      expirationDate: Timestamp.fromDate(newExpiration),
      extendedBy: {
        trainerId,
        date: Timestamp.now(),
        daysAdded: daysToAdd,
        reason
      },
      updatedAt: Timestamp.now()
    });

    return { success: true, newExpirationDate: newExpiration };
  } catch (error) {
    console.error('Error extending package expiration:', error);
    throw error;
  }
}

/**
 * Get expiring packages for a trainer's clients
 */
export async function getExpiringPackages(
  trainerId: string,
  daysUntilExpiration: number = 14
) {
  try {
    // First, get all training sessions for this trainer to find clients
    const sessions = await getTrainerSessions(trainerId, { 
      sessionType: 'training' 
    });

    // Get unique client IDs
    const clientIds = [...new Set(sessions.map(s => s.clientId))];

    const expiringPackages = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysUntilExpiration);

    // For each client, check their packages
    for (const clientId of clientIds) {
      const packagesRef = collection(db, 'users', clientId, 'sessionPackages');
      const packagesSnap = await getDocs(packagesRef);

      for (const packageDoc of packagesSnap.docs) {
        const packageData = packageDoc.data();
        const expirationDate = packageData.expirationDate.toDate();

        // Check if package is expiring soon and has remaining sessions
        if (
          !packageData.expired &&
          packageData.remaining > 0 &&
          expirationDate <= cutoffDate
        ) {
          const daysUntil = Math.ceil(
            (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          // Get client data
          const clientRef = doc(db, 'users', clientId);
          const clientSnap = await getDoc(clientRef);
          const clientData = clientSnap.data();

          expiringPackages.push({
            userId: clientId,
            packageId: packageDoc.id,
            package: {
              id: packageDoc.id,
              ...packageData
            },
            client: {
              name: clientData?.displayName || clientData?.email || 'Unknown',
              email: clientData?.email || ''
            },
            sessionsRemaining: packageData.remaining,
            daysUntilExpiration: daysUntil
          });
        }
      }
    }

    // Sort by days until expiration (most urgent first)
    expiringPackages.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

    return expiringPackages;
  } catch (error) {
    console.error('Error getting expiring packages:', error);
    throw new Error('Failed to get expiring packages');
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Calculate session statistics for dashboard
 */
export function calculateSessionStats(sessions: Session[]): SessionStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  return {
    today: sessions.filter(s => {
      const sessionDate = s.scheduledDate.toDate();
      return sessionDate >= today && sessionDate < new Date(today.getTime() + 86400000);
    }).length,
    week: sessions.filter(s => {
      const sessionDate = s.scheduledDate.toDate();
      return sessionDate >= weekAgo;
    }).length,
    month: sessions.filter(s => {
      const sessionDate = s.scheduledDate.toDate();
      return sessionDate >= monthAgo;
    }).length,
    noShows: sessions.filter(s => s.status === 'no-show').length
  };
}
