'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { useActivityFeed } from '@/context/ActivityFeedContext';

/**
 * NotificationBell — Bell icon with unread badge.
 * Click opens the ActivityFeedSheet slide-out panel.
 * Placed in the TrainerSidebar header.
 */
export default function NotificationBell() {
  const { unreadCount, openSheet } = useActivityFeed();

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <button
      onClick={openSheet}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      aria-label={`Activity feed - ${unreadCount} unread notifications`}
      title="Client Activity Feed"
    >
      <Bell className="w-5 h-5 text-gray-600" />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-sm animate-in fade-in zoom-in duration-200">
          {displayCount}
        </span>
      )}
    </button>
  );
}
