'use client';

// ActivityAlerts — Right column widget showing auto system reminders grouped by type.
// Reactively clears each alert once the client has engaged with that activity today.
// Shows a positive green empty state when all alerts are cleared.

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, getDoc, Timestamp, orderBy,
} from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TriangleAlert, X, CheckCircle2 } from 'lucide-react';

// ── Auto-reminder type metadata ──────────────────────────────

type AutoType =
  | 'workout_overdue'
  | 'nutrition_reminder'
  | 'steps_reminder'
  | 'habits_reminder'
  | 'weight_reminder';

const AUTO_TYPE_CONFIG: Record<AutoType, { label: string; icon: string }> = {
  workout_overdue:   { label: 'Workout',    icon: '🏋️' },
  nutrition_reminder:{ label: 'Nutrition',  icon: '🥗' },
  steps_reminder:    { label: 'Steps',      icon: '👟' },
  habits_reminder:   { label: 'Habits',     icon: '📋' },
  weight_reminder:   { label: 'Weight Log', icon: '⚖️' },
};

const AUTO_TYPES = Object.keys(AUTO_TYPE_CONFIG) as AutoType[];

// ── Types ────────────────────────────────────────────────────

interface AlertGroup {
  type: AutoType;
  label: string;
  icon: string;
  latestMessage: string;
  count: number;
  ids: string[];
  /** workout ID to watch for overdue type */
  workoutId?: string;
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

function getTodayStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── Component ────────────────────────────────────────────────

export function ActivityAlerts() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [dismissedTypes, setDismissedTypes] = useState<Set<AutoType>>(new Set());
  // Tracks which alert types are reactively cleared by today's engagement
  const [engagedTypes, setEngagedTypes] = useState<Set<AutoType>>(new Set());

  // ── 1. Load notification groups ──────────────────────────
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
            workoutId: data.metadata?.workoutId,
          });
        } else {
          const existing = groupMap.get(type)!;
          existing.count += 1;
          existing.ids.push(d.id);
        }
      }
      setGroups(Array.from(groupMap.values()));
    }, () => {});

    return () => unsub();
  }, [user]);

  // ── 2. Live engagement check on today's daily activities ──
  useEffect(() => {
    if (!user) return;
    const todayStr = getTodayStr();
    const docId = `${user.uid}_${todayStr}`;
    const docRef = doc(db, 'dailyActivities', docId);

    const unsub = onSnapshot(docRef, (snap) => {
      const data = snap.exists() ? snap.data() : null;
      const cleared = new Set<AutoType>();

      if (data) {
        // steps_reminder: any steps object saved
        if (data.steps && typeof data.steps === 'object') {
          cleared.add('steps_reminder');
        }
        // habits_reminder: any habits entry exists (even unchecked)
        if (Array.isArray(data.habits) && data.habits.length > 0) {
          cleared.add('habits_reminder');
        }
        // weight_reminder: any weight entry today counts
        if (data.weight && typeof data.weight === 'object') {
          cleared.add('weight_reminder');
        }
      }

      setEngagedTypes(prev => {
        // Merge: once cleared, stays cleared
        const next = new Set(prev);
        cleared.forEach(t => next.add(t));
        return next;
      });
    }, () => {});

    return () => unsub();
  }, [user]);

  // ── 3. Live engagement check: weight in last 7 days ──────
  useEffect(() => {
    if (!user) return;
    // Check if weight_reminder should be cleared — scan last 7 daily activity docs
    const checkWeightHistory = async () => {
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const docRef = doc(db, 'dailyActivities', `${user.uid}_${dateStr}`);
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data()?.weight?.weight) {
          setEngagedTypes(prev => {
            const next = new Set(prev);
            next.add('weight_reminder');
            return next;
          });
          return;
        }
      }
    };
    checkWeightHistory();
  }, [user]);

  // ── 4. Live engagement check: nutrition log today ────────
  useEffect(() => {
    if (!user) return;
    const todayStr = getTodayStr();

    // Check all three nutrition subcollections:
    // mealPlans = Meal Plan approach, habits = Healthy Habits approach, meals = Macro/App tracking approach
    const mealPlanRef = doc(db, 'nutritionLogs', user.uid, 'mealPlans', todayStr);
    const habitsRef   = doc(db, 'nutritionLogs', user.uid, 'habits', todayStr);
    const mealsRef    = doc(db, 'nutritionLogs', user.uid, 'meals', todayStr);

    const clearNutrition = (snap: { exists: () => boolean }) => {
      if (snap.exists()) {
        setEngagedTypes(prev => {
          const next = new Set(prev);
          next.add('nutrition_reminder');
          return next;
        });
      }
    };

    const unsubMealPlan = onSnapshot(mealPlanRef, clearNutrition, () => {});
    const unsubHabits   = onSnapshot(habitsRef,   clearNutrition, () => {});
    const unsubMeals    = onSnapshot(mealsRef,    clearNutrition, () => {});

    return () => {
      unsubMealPlan();
      unsubHabits();
      unsubMeals();
    };
  }, [user]);

  // ── 5. Live check: workout overdue cleared when completed ─
  useEffect(() => {
    if (!user || !groups.length) return;
    const overdueGroup = groups.find(g => g.type === 'workout_overdue');
    if (!overdueGroup?.workoutId) return;

    const workoutRef = doc(db, 'workouts', overdueGroup.workoutId);
    const unsub = onSnapshot(workoutRef, (snap) => {
      if (snap.exists() && snap.data()?.status === 'completed') {
        setEngagedTypes(prev => {
          const next = new Set(prev);
          next.add('workout_overdue');
          return next;
        });
      }
    }, () => {});

    return () => unsub();
  }, [user, groups]);

  // ── Dismiss ───────────────────────────────────────────────
  const handleDismiss = async (type: AutoType, ids: string[]) => {
    setDismissedTypes(prev => new Set([...prev, type]));
    await Promise.allSettled(
      ids.map(id =>
        updateDoc(doc(db, 'clientNotifications', id), { read: true })
      )
    );
  };

  // ── Compute visible alerts ────────────────────────────────
  const visible = groups.filter(g =>
    !dismissedTypes.has(g.type) && !engagedTypes.has(g.type)
  );

  // ── Render ────────────────────────────────────────────────

  // All-clear state: show positive message
  if (visible.length === 0) {
    return (
      <Card className="rounded-xl border bg-green-50/40 border-green-200 shadow-sm">
        <CardContent className="px-4 py-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">You&apos;re on top of everything today! 🎉</p>
              <p className="text-xs text-green-700 mt-0.5">No activity reminders — keep up the great work!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                      {group.count >= 7 ? '7d+ missed' : `${group.count}d missed`}
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
