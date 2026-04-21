'use client';

// CoachReminders — Right column widget showing manual reminders sent by the coach.
// Styled as broadcast announcements (distinct from personal CoachNote).
// Collapses to null when empty / all dismissed.

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

interface CoachReminder {
  id: string;
  message: string;
  sentAt: Date;
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

// Manual reminder types (NOT auto-system types)
const MANUAL_TYPES = ['task_reminder'];

export function CoachReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<CoachReminder[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'clientNotifications'),
      where('clientId', '==', user.uid),
      where('type', 'in', MANUAL_TYPES),
      where('timestamp', '>=', sevenDaysAgo),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: CoachReminder[] = snap.docs
        // Skip task-assignment notifications (they show as task cards in top row)
        .filter(d => {
          const data = d.data();
          if (data.type === 'task_reminder' && data.metadata?.taskId) return false;
          return true;
        })
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            message: data.message,
            sentAt: toDate(data.timestamp),
          };
        });
      setReminders(list);
    }, () => {});
    return () => unsub();
  }, [user]);

  const handleDismiss = async (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    try {
      await updateDoc(doc(db, 'clientNotifications', id), { read: true });
    } catch { /* silent */ }
  };

  const visible = reminders.filter(r => !dismissedIds.has(r.id));
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
        {visible.map(r => (
          <div
            key={r.id}
            className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
          >
            <div className="flex items-start gap-2">
              <p className="text-xs text-foreground flex-1 leading-snug">{r.message}</p>
              <button
                onClick={() => handleDismiss(r.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(r.sentAt)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
