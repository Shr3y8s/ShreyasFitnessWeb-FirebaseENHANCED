'use client';

// ActivityAlerts — Right column widget showing auto system reminders grouped by type.
// Each category (habits, steps, nutrition, etc.) shows as ONE card with a "missed X days" count.
// Max 5 items (one per category). Collapses to null when all dismissed / empty.

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, Timestamp, orderBy,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TriangleAlert, X } from 'lucide-react';

// ── Auto-reminder type metadata ──────────────────────────────

type AutoType =
  | 'workout_overdue'
  | 'nutrition_reminder'
  | 'steps_reminder'
  | 'habits_reminder'
  | 'weight_reminder';

const AUTO_TYPE_CONFIG: Record<AutoType, { label: string; icon: string }> = {
  workout_overdue:   { label: 'Workout',   icon: '🏋️' },
  nutrition_reminder:{ label: 'Nutrition', icon: '🥗' },
  steps_reminder:   { label: 'Steps',     icon: '👟' },
  habits_reminder:  { label: 'Habits',    icon: '📋' },
  weight_reminder:  { label: 'Weight Log',icon: '⚖️' },
};

const AUTO_TYPES = Object.keys(AUTO_TYPE_CONFIG) as AutoType[];

// ── Types ────────────────────────────────────────────────────

interface AlertGroup {
  type: AutoType;
  label: string;
  icon: string;
  latestMessage: string;
  count: number; // number of times fired in the past 7 days
  // All notification IDs in this group (needed to bulk-dismiss)
  ids: string[];
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

// ── Component ────────────────────────────────────────────────

export function ActivityAlerts() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [dismissedTypes, setDismissedTypes] = useState<Set<AutoType>>(new Set());

  useEffect(() => {
    if (!user) return;
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'clientNotifications'),
      where('clientId', '==', user.uid),
      where('type', 'in', AUTO_TYPES),
      where('timestamp', '>=', sevenDaysAgo),
      orderBy('timestamp', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      // Group by type, keep most recent message per type
      const groupMap = new Map<AutoType, AlertGroup>();

      for (const d of snap.docs) {
        const data = d.data();
        const type = data.type as AutoType;
        const config = AUTO_TYPE_CONFIG[type];
        if (!config) continue;

        if (!groupMap.has(type)) {
          groupMap.set(type, {
            type,
            label: config.label,
            icon: config.icon,
            latestMessage: data.message,
            count: 1,
            ids: [d.id],
          });
        } else {
          const existing = groupMap.get(type)!;
          existing.count += 1;
          existing.ids.push(d.id);
          // onSnapshot returns desc order so first entry is already most recent — no update needed
        }
      }

      setGroups(Array.from(groupMap.values()));
    }, () => {});

    return () => unsub();
  }, [user]);

  // Dismiss entire category — mark all its notifications as read
  const handleDismiss = async (type: AutoType, ids: string[]) => {
    setDismissedTypes(prev => new Set([...prev, type]));
    // Mark all notifications in group as read (in parallel, silent failures ok)
    await Promise.allSettled(
      ids.map(id =>
        updateDoc(doc(db, 'clientNotifications', id), { read: true })
      )
    );
  };

  const visible = groups.filter(g => !dismissedTypes.has(g.type));
  if (visible.length === 0) return null;

  return (
    <Card className="rounded-xl border bg-amber-50/30 border-amber-200 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-amber-500" />
          Activity Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {visible.map(group => (
          <div
            key={group.type}
            className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">{group.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{group.label}</span>
                  {group.count > 1 && (
                    <span className="text-xs text-amber-700 bg-amber-100 rounded px-1 py-0.5 font-medium">
                      {group.count}d missed
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                  {group.latestMessage}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(group.type, group.ids)}
                className="text-amber-400 hover:text-amber-700 transition-colors shrink-0"
                title={`Dismiss ${group.label} alerts`}
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
