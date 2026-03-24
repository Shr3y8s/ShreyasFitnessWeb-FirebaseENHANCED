'use client';

import React, { useMemo } from 'react';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { ACTIVITY_FILTER_CATEGORIES } from '@/types/activity-feed';
import ActivityFeedItem from './ActivityFeedItem';
import { Button } from '@/components/ui/button';
import { CheckCheck, Activity } from 'lucide-react';

/**
 * ActivityFeedPanel — The main feed list with filters and grouped events.
 * Used inside the Sheet slide-out and the fallback full-page route.
 */
export default function ActivityFeedPanel() {
  const {
    filteredEvents,
    unreadCount,
    loading,
    activeFilter,
    setActiveFilter,
    handleMarkAllAsRead,
  } = useActivityFeed();

  // Group events by day: "Today", "Yesterday", "This Week", "Older"
  const groupedEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups: { label: string; events: typeof filteredEvents }[] = [
      { label: 'Today', events: [] },
      { label: 'Yesterday', events: [] },
      { label: 'This Week', events: [] },
      { label: 'Older', events: [] },
    ];

    for (const event of filteredEvents) {
      const eventDate = event.timestamp;
      if (eventDate >= today) {
        groups[0].events.push(event);
      } else if (eventDate >= yesterday) {
        groups[1].events.push(event);
      } else if (eventDate >= weekAgo) {
        groups[2].events.push(event);
      } else {
        groups[3].events.push(event);
      }
    }

    // Filter out empty groups
    return groups.filter((g) => g.events.length > 0);
  }, [filteredEvents]);

  return (
    <div className="flex flex-col h-full">
      {/* Filter Pills */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveFilter(cat.key)}
              className={`px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                activeFilter === cat.key
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mark All Read */}
      {unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {unreadCount} unread
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs text-emerald-600 hover:text-emerald-700 h-7 px-2"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
      )}

      {/* Event List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-center">
              <div className="animate-pulse mb-2">
                <Activity className="w-8 h-8 mx-auto opacity-50" />
              </div>
              <p className="text-sm">Loading activity...</p>
            </div>
          </div>
        ) : groupedEvents.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <div className="text-center">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-500">No activity yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Client actions will appear here in real-time
              </p>
            </div>
          </div>
        ) : (
          <div className="px-2 py-2">
            {groupedEvents.map((group) => (
              <div key={group.label} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
                  {group.label}
                </h4>
                <div className="space-y-0.5">
                  {group.events.map((event) => (
                    <ActivityFeedItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
