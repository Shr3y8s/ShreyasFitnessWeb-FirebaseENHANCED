'use client';

// ClientNotificationsContext.tsx
// Replaces CoachUpdatesContext with a real-time Firestore-backed notification system.
// - Subscribes to `clientNotifications` collection for the logged-in client
// - Shows toast pop-ups when new notifications arrive
// - Exposes unread count, notifications list, and mark-as-read actions

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  subscribeToClientNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '@/lib/client-notifications-api';
import { useToast } from '@/hooks/use-toast';
import { CLIENT_NOTIFICATION_CONFIG } from '@/types/client-notifications';
import { playClientNotificationSound } from '@/lib/client-notification-sounds';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import type { ClientNotification } from '@/types/client-notifications';

// ============================================================
// Context Type
// ============================================================

interface ClientNotificationsContextType {
  // Data
  notifications: ClientNotification[];
  unreadCount: number;
  loading: boolean;

  // Actions
  handleMarkAsRead: (notifId: string) => Promise<void>;
  handleMarkAllAsRead: () => Promise<void>;
  handleDismiss: (notifId: string) => void;   // Local-only dismiss (marks read + hides)
  handleDismissAll: () => Promise<void>;
}

const ClientNotificationsContext = createContext<ClientNotificationsContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

interface ClientNotificationsProviderProps {
  children: ReactNode;
}

export function ClientNotificationsProvider({ children }: ClientNotificationsProviderProps) {
  const { user, userData } = useAuth();

  const [notifications, setNotifications] = useState<ClientNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Track previously seen notification IDs to detect genuinely new arrivals
  const previousIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const { toast } = useToast();
  const pathname = usePathname();
  // Keep a live ref to pathname so the Firestore listener closure
  // always reads the current route (avoids stale closure bug)
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Only set up listener for clients
  const isClient = userData?.role === 'client';
  const clientId = user?.uid || '';

  useEffect(() => {
    if (!isClient || !clientId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToClientNotifications(
      clientId,
      (newNotifications) => {
        // Detect truly new unread notifications (not on initial load)
        if (!isInitialLoadRef.current && newNotifications.length > 0) {
          for (const notif of newNotifications) {
            if (!previousIdsRef.current.has(notif.id) && !notif.read) {
              // New unread notification — always play sound
              playClientNotificationSound(notif.type);

              // Show toast unless client is already on the relevant page
              // (e.g. on Coach Chat when a new_message arrives — sound only)
              const config = CLIENT_NOTIFICATION_CONFIG[notif.type];
              const isOnTargetPage = notif.type === 'new_message' &&
                pathnameRef.current === '/dashboard/client/messages';
              if (!isOnTargetPage) {
                const icon = config?.icon || '🔔';
                toast({
                  title: `${icon} ${config?.title || 'Notification'}`,
                  description: notif.message,
                });
              }
              break; // Show one toast at a time
            }
          }
        }

        // Update previous IDs set
        previousIdsRef.current = new Set(newNotifications.map((n) => n.id));

        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
        }

        setNotifications(newNotifications);
        setLoading(false);
      },
      (error) => {
        console.error('[ClientNotifications] Subscription error:', error);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
    registerListener(unsubscribe);

    return () => {
      if (unsubscribeRef.current) {
        unregisterListener(unsubscribeRef.current);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isClient, clientId]);

  // Auto-mark notifications as read when the client visits the relevant section page.
  // Only applies to one-time "something changed" notifications — NOT to live counters
  // like active workouts, pending tasks, or session balance which should persist.
  useEffect(() => {
    // Map each route to the notification types it should clear on visit
    const routeTypesMap: Record<string, string[]> = {
      '/dashboard/client/messages': ['new_message'],
      '/dashboard/client/plan':     ['plan_updated'],
      '/dashboard/client/activity': ['activities_updated'],
      '/dashboard/client/nutrition':['nutrition_updated'],
      '/dashboard/client/goals':    ['goal_added', 'goal_updated'],
      '/dashboard/client/billing':  ['upcoming_payment'],
    };

    const typesToClear = routeTypesMap[pathname];
    if (!typesToClear) return;

    const unreadToClose = notifications.filter(
      (n) => typesToClear.includes(n.type) && !n.read
    );
    if (unreadToClose.length === 0) return;

    // Mark as read in background (fire-and-forget, UI updates via Firestore listener)
    unreadToClose.forEach((n) => {
      markNotificationAsRead(n.id).catch(() => {});
    });
  }, [pathname, notifications]);

  // Computed: unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Actions
  const handleMarkAsRead = useCallback(async (notifId: string) => {
    await markNotificationAsRead(notifId);
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllNotificationsAsRead(clientId);
  }, [clientId]);

  // Local-only dismiss: mark as read in Firestore + remove from local list immediately
  const handleDismiss = useCallback(
    (notifId: string) => {
      // Optimistically remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notifId));
      // Mark as read in background (fire-and-forget)
      markNotificationAsRead(notifId).catch(() => {
        // If it fails, the listener will restore the state on next snapshot
      });
    },
    []
  );

  const handleDismissAll = useCallback(async () => {
    // Optimistically clear local state
    setNotifications([]);
    await markAllNotificationsAsRead(clientId);
  }, [clientId]);

  return (
    <ClientNotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        handleMarkAsRead,
        handleMarkAllAsRead,
        handleDismiss,
        handleDismissAll,
      }}
    >
      {children}
    </ClientNotificationsContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

// Safe no-op defaults used when the hook is called outside the provider
// (e.g., components that are shared across trainer/client routes)
const EMPTY_CONTEXT: ClientNotificationsContextType = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  handleMarkAsRead: async () => {},
  handleMarkAllAsRead: async () => {},
  handleDismiss: () => {},
  handleDismissAll: async () => {},
};

export function useClientNotifications() {
  const context = useContext(ClientNotificationsContext);
  // Return safe defaults instead of throwing — allows components like ClientSidebar
  // to be rendered outside the ClientNotificationsProvider without crashing.
  return context ?? EMPTY_CONTEXT;
}
