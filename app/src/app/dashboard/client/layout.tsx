import { ClientNotificationsProvider } from '@/context/ClientNotificationsContext';
import { CoachUpdatesProvider } from '@/context/CoachUpdatesContext';
import type { ReactNode } from 'react';

/**
 * Client Dashboard Layout
 *
 * Wraps all /dashboard/client/* pages with:
 * - ClientNotificationsProvider: Real-time Firestore listener for client notifications
 *   (bell icon, toast pop-ups, sidebar badges)
 * - CoachUpdatesProvider: Kept for backward compatibility with any remaining
 *   components that may still reference useCoachUpdates
 */
export default function ClientDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CoachUpdatesProvider>
      <ClientNotificationsProvider>
        {children}
      </ClientNotificationsProvider>
    </CoachUpdatesProvider>
  );
}
