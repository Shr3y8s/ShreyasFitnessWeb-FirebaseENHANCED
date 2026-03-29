'use client';

import React from 'react';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { formatDistanceToNow } from 'date-fns';
import { ACTIVITY_EVENT_ICONS } from '@/types/activity-feed';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * DashboardActivityFeed — Compact activity feed for the trainer dashboard overview.
 * Shows the last 10 events across ALL clients (uses the global ActivityFeedContext).
 * Includes a "View All" button that opens the slide-out panel.
 */
export default function DashboardActivityFeed() {
  const { events, loading, openSheet } = useActivityFeed();
  const router = useRouter();

  // Take only the first 10 events
  const recentEvents = events.slice(0, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <div className="text-center">
          <div className="animate-pulse mb-2">
            <Activity className="w-8 h-8 mx-auto opacity-50" />
          </div>
          <p className="text-sm">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (recentEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Activity className="h-12 w-12 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">No recent activity</p>
        <p className="text-xs text-gray-400 mt-1">Client actions will appear here in real-time</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recentEvents.map((event) => {
        const icon = ACTIVITY_EVENT_ICONS[event.type] || '📌';
        const timeAgo = formatDistanceToNow(event.timestamp, { addSuffix: true });

        return (
          <div
            key={event.id}
            onClick={() => {
              if (event.clientId) {
                router.push(`/dashboard/trainer/client-hub/${event.clientId}`);
              }
            }}
            className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-lg flex-shrink-0">
              {icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{event.clientName}</p>
              <p className="text-sm text-gray-600 truncate">
                {event.message.startsWith(event.clientName)
                  ? event.message.slice(event.clientName.length).trim()
                  : event.message}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">{timeAgo}</span>
          </div>
        );
      })}
      
      {events.length > 10 && (
        <div className="text-center pt-2">
          <Link href="/dashboard/trainer/activity">
            <Button variant="ghost" size="sm" className="text-primary">
              View All Activity →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
