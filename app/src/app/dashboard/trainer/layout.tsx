'use client';

import { ActivityFeedProvider } from '@/context/ActivityFeedContext';
import ActivityFeedSheet from '@/components/trainer/activity-feed/ActivityFeedSheet';

/**
 * Trainer Dashboard Layout
 * 
 * Wraps all /dashboard/trainer/* pages with:
 * - ActivityFeedProvider: Real-time listener for activity feed events
 * - ActivityFeedSheet: Right-side slide-out panel (rendered globally, triggered by NotificationBell)
 */
export default function TrainerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ActivityFeedProvider>
      {children}
      <ActivityFeedSheet />
    </ActivityFeedProvider>
  );
}
