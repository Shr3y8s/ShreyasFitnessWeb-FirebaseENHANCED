'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeToActivityFeed, markEventAsRead, markAllEventsAsRead } from '@/lib/activity-feed-api';
import { useToast } from '@/hooks/use-toast';
import { useActivitySound } from '@/hooks/use-activity-sound';
import { ACTIVITY_EVENT_ICONS, ACTIVITY_FILTER_CATEGORIES } from '@/types/activity-feed';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import type { ActivityFeedEvent } from '@/types/activity-feed';

// ============================================================
// Context Type
// ============================================================

interface ActivityFeedContextType {
  // Data
  events: ActivityFeedEvent[];
  unreadCount: number;
  loading: boolean;

  // Sheet state
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;

  // Actions
  handleMarkAsRead: (eventId: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;

  // Filter state
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  clientFilter: string;
  setClientFilter: (clientId: string) => void;

  // Filtered events (based on current filters)
  filteredEvents: ActivityFeedEvent[];

  // Sound controls
  soundEnabled: boolean;
  toggleSound: () => void;
}

const ActivityFeedContext = createContext<ActivityFeedContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

interface ActivityFeedProviderProps {
  children: ReactNode;
}

export function ActivityFeedProvider({ children }: ActivityFeedProviderProps) {
  const { user, userData, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();

  // Core state
  const [events, setEvents] = useState<ActivityFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Sheet state
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');

  // Track listener for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isInitialLoadRef = useRef(true);
  const previousEventIdsRef = useRef<Set<string>>(new Set());

  // Toast hook
  const { toast } = useToast();

  // Sound hook
  const { soundEnabled, playSound, toggleSound } = useActivitySound();

  // Determine if user should see the feed
  const isTrainerOrAdmin = canAccessTrainerDashboard || canAccessAdminDashboard;
  const trainerId = user?.uid || '';
  const isAdmin = canAccessAdminDashboard || false;

  // Set up real-time listener
  useEffect(() => {
    // Only set up listener for trainers/admins
    if (!isTrainerOrAdmin || !trainerId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToActivityFeed(
      trainerId,
      isAdmin,
      (newEvents) => {
        // Detect truly NEW events (not initial load)
        if (!isInitialLoadRef.current && newEvents.length > 0) {
          for (const event of newEvents) {
            if (!previousEventIdsRef.current.has(event.id) && !event.read) {
              // This is a genuinely new event — show toast + play sound
              const icon = ACTIVITY_EVENT_ICONS[event.type] || '📌';
              toast({
                title: `${icon} ${event.clientName}`,
                description: event.message.replace(event.clientName, '').trim() || event.message,
              });
              playSound(event.type);
              break; // Only show one toast at a time to avoid flooding
            }
          }
        }
        
        // Update previous event IDs for next comparison
        previousEventIdsRef.current = new Set(newEvents.map(e => e.id));
        
        // Mark initial load complete after first callback
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        }
        
        setEvents(newEvents);
        setLoading(false);
      },
      (error) => {
        console.error('[ActivityFeed] Subscription error:', error);
        setLoading(false);
      }
    );

    // Store ref and register for cleanup
    unsubscribeRef.current = unsubscribe;
    registerListener(unsubscribe);

    return () => {
      if (unsubscribeRef.current) {
        unregisterListener(unsubscribeRef.current);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isTrainerOrAdmin, trainerId, isAdmin]);

  // Computed: unread count
  const unreadCount = events.filter((e) => !e.read).length;

  // Computed: filtered events
  const filteredEvents = events.filter((event) => {
    // Client filter
    if (clientFilter && event.clientId !== clientFilter) return false;

    // Type filter
    if (activeFilter === 'all') return true;

    const category = ACTIVITY_FILTER_CATEGORIES.find((c) => c.key === activeFilter);
    if (!category || !category.types) return true;
    return (category.types as readonly string[]).includes(event.type);
  });

  // Actions
  const openSheet = useCallback(() => setIsSheetOpen(true), []);
  const closeSheet = useCallback(() => setIsSheetOpen(false), []);

  const handleMarkAsRead = useCallback(async (eventId: string) => {
    await markEventAsRead(eventId);
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllEventsAsRead(trainerId, isAdmin);
  }, [trainerId, isAdmin]);

  return (
    <ActivityFeedContext.Provider
      value={{
        events,
        unreadCount,
        loading,
        isSheetOpen,
        openSheet,
        closeSheet,
        handleMarkAsRead,
        handleMarkAllAsRead,
        activeFilter,
        setActiveFilter,
        clientFilter,
        setClientFilter,
        filteredEvents,
        soundEnabled,
        toggleSound,
      }}
    >
      {children}
    </ActivityFeedContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useActivityFeed() {
  const context = useContext(ActivityFeedContext);
  if (context === undefined) {
    throw new Error('useActivityFeed must be used within an ActivityFeedProvider');
  }
  return context;
}
