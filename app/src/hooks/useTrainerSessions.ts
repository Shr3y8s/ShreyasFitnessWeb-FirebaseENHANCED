import { useState, useEffect } from 'react';
import { subscribeToTrainerSessions, calculateSessionStats } from '@/lib/session-management-api';
import type { Session, SessionFilters, SessionStats } from '@/lib/session-management-api';

interface UseTrainerSessionsResult {
  sessions: Session[];
  stats: SessionStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Custom hook to fetch and manage trainer sessions with REAL-TIME updates
 * 
 * @param trainerId - The trainer's user ID
 * @param filters - Optional filters for sessions
 * @returns Object containing sessions, stats, loading state, error, and refetch function
 */
export function useTrainerSessions(
  trainerId: string | null,
  filters: SessionFilters = {}
): UseTrainerSessionsResult {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up real-time listener for sessions (without date filters)
  useEffect(() => {
    if (!trainerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe without date filters (we apply them in memory)
    const { dateRange, dateFrom, dateTo, ...filtersWithoutDate } = filters;
    
    console.log('[useTrainerSessions] Setting up real-time listener');
    
    const unsubscribe = subscribeToTrainerSessions(
      trainerId,
      filtersWithoutDate,
      (fetchedSessions) => {
        // Update all sessions
        setAllSessions(fetchedSessions);
        
        // Calculate stats from ALL sessions
        const calculatedStats = calculateSessionStats(fetchedSessions);
        setStats(calculatedStats);
        
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('[useTrainerSessions] Real-time listener error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup listener on unmount or dependency change
    return () => {
      console.log('[useTrainerSessions] Cleaning up real-time listener');
      unsubscribe();
    };
  }, [trainerId, filters.sessionType, filters.clientId, filters.status]);

  // Apply date filters in memory (runs when filters or allSessions change)
  useEffect(() => {
    if (allSessions.length === 0) {
      setSessions([]);
      return;
    }

    let displaySessions = allSessions;
    
    // Apply date filters
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      displaySessions = allSessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        return sessionDate >= start && sessionDate <= end;
      });
    } else if (filters.dateFrom || filters.dateTo) {
      displaySessions = allSessions.filter(session => {
        const sessionDate = session.scheduledDate.toDate();
        if (filters.dateFrom && sessionDate < filters.dateFrom) return false;
        if (filters.dateTo && sessionDate > filters.dateTo) return false;
        return true;
      });
    }

    setSessions(displaySessions);
  }, [allSessions, filters.dateRange, filters.dateFrom, filters.dateTo]);

  // Refetch function (now just triggers a re-mount of the listener)
  const refetch = () => {
    // With real-time listeners, we don't need manual refetch
    // Data updates automatically. This is kept for API compatibility.
    console.log('[useTrainerSessions] Refetch called (real-time listener will auto-update)');
  };

  return {
    sessions,
    stats,
    loading,
    error,
    refetch
  };
}
