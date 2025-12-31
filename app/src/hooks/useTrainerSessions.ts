import { useState, useEffect } from 'react';
import { getTrainerSessions, calculateSessionStats } from '@/lib/session-management-api';
import type { Session, SessionFilters, SessionStats } from '@/lib/session-management-api';

interface UseTrainerSessionsResult {
  sessions: Session[];
  stats: SessionStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch and manage trainer sessions
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

  // Fetch ALL sessions and calculate stats (only when trainerId or base filters change, NOT date filters)
  useEffect(() => {
    const fetchAllSessions = async () => {
      if (!trainerId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch ALL sessions without date filters
        const { dateRange, dateFrom, dateTo, ...filtersWithoutDate } = filters;
        const fetchedSessions = await getTrainerSessions(trainerId, filtersWithoutDate);
        
        // Calculate stats from ALL sessions (never changes with date filters)
        const calculatedStats = calculateSessionStats(fetchedSessions);

        setAllSessions(fetchedSessions);
        setStats(calculatedStats);
      } catch (err) {
        console.error('Error fetching trainer sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
        setAllSessions([]);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAllSessions();
  }, [trainerId, filters.sessionType, filters.clientId, filters.status]); // Only refetch on base filters, NOT date filters

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

  const refetch = async () => {
    // Force refetch of all data
    const { dateRange, dateFrom, dateTo, ...filtersWithoutDate } = filters;
    try {
      setLoading(true);
      const fetchedSessions = await getTrainerSessions(trainerId!, filtersWithoutDate);
      const calculatedStats = calculateSessionStats(fetchedSessions);
      setAllSessions(fetchedSessions);
      setStats(calculatedStats);
    } catch (err) {
      console.error('Error refetching sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    stats,
    loading,
    error,
    refetch
  };
}
