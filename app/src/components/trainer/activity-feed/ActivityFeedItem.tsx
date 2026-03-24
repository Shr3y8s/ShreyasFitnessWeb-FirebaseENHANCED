'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useActivityFeed } from '@/context/ActivityFeedContext';
import { ACTIVITY_EVENT_ICONS } from '@/types/activity-feed';
import type { ActivityFeedEvent } from '@/types/activity-feed';

interface ActivityFeedItemProps {
  event: ActivityFeedEvent;
}

export default function ActivityFeedItem({ event }: ActivityFeedItemProps) {
  const router = useRouter();
  const { handleMarkAsRead, closeSheet } = useActivityFeed();

  const icon = ACTIVITY_EVENT_ICONS[event.type] || '📌';

  const handleClick = async () => {
    // Mark as read
    if (!event.read) {
      await handleMarkAsRead(event.id);
    }

    // Navigate to client hub if we have a clientId
    if (event.clientId) {
      closeSheet();
      router.push(`/dashboard/trainer/client-hub/${event.clientId}`);
    }
  };

  const timeAgo = formatDistanceToNow(event.timestamp, { addSuffix: true });

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-gray-50 ${
        !event.read
          ? 'bg-emerald-50/50 border-l-2 border-l-emerald-500'
          : 'border-l-2 border-l-transparent'
      }`}
    >
      {/* Icon */}
      <span className="text-lg flex-shrink-0 mt-0.5" role="img" aria-label={event.type}>
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${!event.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
          <span className="font-semibold">{event.clientName}</span>{' '}
          <span className="text-gray-600">{getActionText(event)}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
      </div>

      {/* Unread dot */}
      {!event.read && (
        <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-2" />
      )}
    </button>
  );
}

/**
 * Get the action text portion of the event message (everything after the client name).
 * Falls back to the full message if we can't parse it.
 */
function getActionText(event: ActivityFeedEvent): string {
  // Try to extract action from message by removing client name prefix
  if (event.message && event.clientName && event.message.startsWith(event.clientName)) {
    return event.message.slice(event.clientName.length).trim();
  }
  // Fallback: use the full message
  return event.message || '';
}
