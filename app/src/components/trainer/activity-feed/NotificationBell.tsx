'use client';

import React from 'react';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { useActivityFeed } from '@/context/ActivityFeedContext';

/**
 * NotificationBell — Bell icon with unread badge + sound mute toggle.
 * Click the bell to open the ActivityFeedSheet slide-out panel.
 * Click the speaker icon to mute/unmute activity feed sounds.
 * Placed in the TrainerSidebar header.
 */
export default function NotificationBell() {
  const { unreadCount, openSheet, soundEnabled, toggleSound } = useActivityFeed();

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <div className="flex items-center gap-1">
      {/* Sound mute/unmute toggle */}
      <button
        onClick={toggleSound}
        className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
        aria-label={soundEnabled ? 'Mute activity feed sounds' : 'Unmute activity feed sounds'}
        title={soundEnabled ? 'Sounds on — click to mute' : 'Sounds off — click to unmute'}
      >
        {soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : (
          <VolumeX className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Notification bell */}
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
    </div>
  );
}
