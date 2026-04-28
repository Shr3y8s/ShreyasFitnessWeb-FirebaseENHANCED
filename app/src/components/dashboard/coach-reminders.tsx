'use client';

// CoachReminders — Right column widget showing all coach-initiated notifications grouped by type.
// Includes both manual reminders AND coach-action updates (plan changes, new workouts, goal updates, etc.)
// Each notification type is grouped into one row with an unread count badge.
// Dismiss-only (no View button) — collapses to null when all dismissed.

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, Timestamp, orderBy, limit,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, X } from 'lucide-react';
import { formatTimeAgo } from '@/lib/utils';

// ── Notification type config ──────────────────────────────────

type CoachType =
  | 'plan_updated'
  | 'nutrition_updated'
  | 'activities_updated'
  | 'new_workout'
  | 'goal_added'
  | 'goal_updated'
  | 'task_reminder';

interface CoachTypeConfig {
  label: string;
  icon: string;
  actionUrl: string;
}

const COACH_TYPE_CONFIG: Record<CoachType, CoachTypeConfig> = {
  plan_updated:        { label: 'My Plan Updated',         icon: '📋', actionUrl: '/dashboard/client/plan' },
  nutrition_updated:   { label: 'Nutrition Updated',       icon: '🥗', actionUrl: '/dashboard/client/nutrition' },
  activities_updated:  { label: 'Daily Activities Updated',icon: '⚡', actionUrl: '/dashboard/client/activity' },
  new_workout:         { label: 'New Workout Assigned',    icon: '💪', actionUrl: '/dashboard/client/workouts' },
  goal_added:          { label: 'New Goal Added',          icon: '🎯', actionUrl: '/dashboard/client/goals' },
  goal_updated:        { label: 'Goal Updated',            icon: '🏆', actionUrl: '/dashboard/client/goals' },
  task_reminder:       { label: 'Coach Reminder',          icon: '📌', actionUrl: '/dashboard/client' },
};

const COACH_TYPES = Object.keys(COACH_TYPE_CONFIG) as CoachType[];

// ── Types ─────────────────────────────────────────────────────

interface CoachGroup {
  type: CoachType;
  label: string;
  icon: string;
  actionUrl: string;
  latestMessage: string;
  latestTime: Date;
  count: number;
  ids: string[];
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

// ── Component ─────────────────────────────────────────────────

export function CoachReminders() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CoachGroup[]>([]);
  const [dismissedTypes, setDismissedTypes] = useState<Set<CoachType>>(new Set());

  useEffect(() => {
    if (!user) return;
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'clientNotifications'),
      where('clientId', '==', user.uid),
      where('type', 'in', COACH_TYPES),
      where('timestamp', '>=', sevenDaysAgo),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const groupMap = new Map<CoachType, CoachGroup>();

      for (const d of snap.docs) {
        const data = d.data();
        const type = data.type as CoachType;
        const config = COACH_TYPE_CONFIG[type];
        if (!config) continue;

        // Skip task-assignment notifications (they show as task cards in top row)
        if (type === 'task_reminder' && data.metadata?.taskId) continue;

        if (!groupMap.has(type)) {
          groupMap.set(type, {
            type,
            label: config.label,
            icon: config.icon,
            actionUrl: data.actionUrl || config.actionUrl,
            latestMessage: data.message,
            latestTime: toDate(data.timestamp),
            count: 1,
            ids: [d.id],
          });
        } else {
          const existing = groupMap.get(type)!;
          existing.count += 1;
          existing.ids.push(d.id);
          // onSnapshot returns desc order so first entry is already most recent
        }
      }

      // Sort groups: unread first, then by latest time
      const sorted = Array.from(groupMap.values()).sort(
        (a, b) => b.latestTime.getTime() - a.latestTime.getTime()
      );
      setGroups(sorted);
    }, () => {});

    return () => unsub();
  }, [user]);

  // Dismiss entire group — mark all its notifications as read
  const handleDismiss = async (type: CoachType, ids: string[]) => {
    setDismissedTypes(prev => new Set([...prev, type]));
    await Promise.allSettled(
      ids.map(id =>
        updateDoc(doc(db, 'clientNotifications', id), { read: true })
      )
    );
  };

  const visible = groups.filter(g => !dismissedTypes.has(g.type));
  if (visible.length === 0) return null;

  return (
    <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          Coach Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {visible.map(group => (
          <div
            key={group.type}
            className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-base shrink-0 mt-0.5">{group.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-foreground">{group.label}</span>
                  {group.count > 1 && (
                    <span className="text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">
                      {group.count} updates
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                  {group.latestMessage}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  {formatTimeAgo(group.latestTime)}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(group.type, group.ids)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                title={`Dismiss ${group.label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
