'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { formatDistanceToNow } from 'date-fns';
import { ACTIVITY_EVENT_ICONS } from '@/types/activity-feed';
import type { ActivityFeedEvent } from '@/types/activity-feed';
import { Activity } from 'lucide-react';

interface ClientActivityFeedProps {
  clientId: string;
  maxEvents?: number;
}

/**
 * ClientActivityFeed — Standalone activity feed filtered for a specific client.
 * Used in the Client Hub overview tab to show that client's recent activity.
 * Has its own onSnapshot listener (independent of the global ActivityFeedContext).
 */
export default function ClientActivityFeed({ clientId, maxEvents = 10 }: ClientActivityFeedProps) {
  const [events, setEvents] = useState<ActivityFeedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!clientId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const feedQuery = query(
      collection(db, 'activityFeed'),
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc'),
      limit(maxEvents)
    );

    const unsub = onSnapshot(
      feedQuery,
      (snapshot) => {
        const newEvents: ActivityFeedEvent[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type,
            clientId: data.clientId,
            clientName: data.clientName,
            trainerId: data.trainerId,
            message: data.message,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp),
            metadata: data.metadata || {},
            read: data.read ?? false,
            expiresAt: data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : new Date(data.expiresAt),
          };
        });
        setEvents(newEvents);
        setLoading(false);
      },
      (error) => {
        console.error('[ClientActivityFeed] Listener error:', error);
        setLoading(false);
      }
    );

    unsubRef.current = unsub;
    registerListener(unsub);

    return () => {
      if (unsubRef.current) {
        unregisterListener(unsubRef.current);
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [clientId, maxEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <div className="text-center">
          <div className="animate-pulse mb-2">
            <Activity className="w-6 h-6 mx-auto opacity-50" />
          </div>
          <p className="text-sm">Loading activity...</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-400">
        <div className="text-center">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium text-gray-500">No recent activity</p>
          <p className="text-xs text-gray-400 mt-1">
            Client actions will appear here in real-time
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event) => {
        const icon = ACTIVITY_EVENT_ICONS[event.type] || '📌';
        const timeAgo = formatDistanceToNow(event.timestamp, { addSuffix: true });

        // Extract action text (remove client name prefix from message)
        let actionText = event.message;
        if (event.message && event.clientName && event.message.startsWith(event.clientName)) {
          actionText = event.message.slice(event.clientName.length).trim();
        }

        return (
          <div
            key={event.id}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-base flex-shrink-0 mt-0.5" role="img" aria-label={event.type}>
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700 leading-snug">
                {actionText}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
