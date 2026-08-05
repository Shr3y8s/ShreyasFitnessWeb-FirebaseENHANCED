'use client';

// CoachOutreach — Top row col 2 card combining:
//   1. Pending tasks from coach (with inline Mark Done)
//   2. A Note from Coach (personal motivational note)
//   3. Recent unread coach chat messages (with unread badge, syncs with sidebar)

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, addDoc, Timestamp, orderBy, limit,
} from 'firebase/firestore';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Pin, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ── Types ────────────────────────────────────────────────────

interface ClientTask {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'overdue';
  trainerId: string;
}

interface CoachOutreachProps {
  coachName: string;
  coachNote: string;
}

// ── Helpers ──────────────────────────────────────────────────

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

function formatDue(date: Date): { label: string; isOverdue: boolean } {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, isOverdue: true };
  if (days === 0) return { label: 'Due today', isOverdue: false };
  if (days === 1) return { label: 'Due tomorrow', isOverdue: false };
  return { label: `Due in ${days}d`, isOverdue: false };
}

// ── Component ────────────────────────────────────────────────

export function CoachOutreach({ coachName, coachNote }: CoachOutreachProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Pending tasks ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'clientTasks'),
      where('clientId', '==', user.uid),
      where('status', '==', 'pending'),
      orderBy('dueDate', 'asc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      setTasks(snap.docs.map(d => {
        const data = d.data();
        const dueDate = toDate(data.dueDate);
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          dueDate,
          priority: data.priority,
          status: dueDate < now ? 'overdue' : 'pending',
          trainerId: data.trainerId,
        };
      }));
    }, () => {});
    return () => unsub();
  }, [user]);

  // ── Coach chat: unread count only (no message preview, no composite index) ──
  useEffect(() => {
    if (!user || !userData?.assignedTrainerId) return;
    const trainerId = userData.assignedTrainerId as string;
    const conversationId = [user.uid, trainerId].sort().join('_');
    const countQ = query(
      collection(db, 'client_messages'),
      where('conversationId', '==', conversationId),
      where('senderId', '==', trainerId),
      where('read', '==', false)
    );
    const unsub = onSnapshot(countQ, (snap) => setUnreadCount(snap.size), () => {});
    return () => unsub();
  }, [user, userData]);

  // ── Mark task complete ────────────────────────────────────
  const handleMarkDone = async (task: ClientTask) => {
    if (!user || !userData) return;
    setCompletingId(task.id);
    try {
      const now = Timestamp.now();
      await updateDoc(doc(db, 'clientTasks', task.id), {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      });
      await addDoc(collection(db, 'activityFeed'), {
        type: 'task_completed',
        clientId: user.uid,
        clientName: userData.name || 'Client',
        trainerId: task.trainerId,
        message: `${userData.name || 'Client'} completed task: "${task.title}"`,
        metadata: { taskId: task.id, taskTitle: task.title },
        timestamp: now,
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
        read: false,
      });
      toast({ title: '✅ Task completed!', description: `"${task.title}" marked as done.` });
    } catch {
      toast({ title: 'Error', description: 'Could not mark task complete.', variant: 'destructive' });
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm hover:shadow-glow transition-shadow h-full">
      <CardContent className="p-4 space-y-4">

        {/* ── 1. Tasks ── */}
        {tasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Tasks ({tasks.length})
              </p>
              <Link href="/dashboard/client/tasks">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-11 gap-1 px-2 text-xs text-primary hover:text-primary/80 transition-transform active:scale-95"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {tasks.map(task => {
              const { label, isOverdue } = formatDue(task.dueDate);
              return (
                <div
                  key={task.id}
                  className={cn(
                    'rounded-lg border p-2.5',
                    isOverdue ? 'border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/30' :
                    task.priority === 'urgent' ? 'border-orange-200 bg-orange-50/60 dark:border-orange-900/40 dark:bg-orange-950/30' :
                    'border-border bg-card/60'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">
                      {isOverdue
                        ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        : <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm font-medium">{task.title}</span>
                        {task.priority === 'urgent' && !isOverdue && (
                          <Badge className="bg-orange-500 text-white text-xs px-1 py-0 h-4">Urgent</Badge>
                        )}
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs px-1 py-0 h-4 text-white">Overdue</Badge>

                        )}
                      </div>
                      <p className={cn('text-xs mt-0.5', isOverdue ? 'text-red-500 font-medium' : 'text-muted-foreground')}>
                        {label}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="min-h-11 sm:min-h-8 px-3 sm:px-2 text-xs shrink-0 gap-1 transition-transform active:scale-95"
                      variant={isOverdue ? 'destructive' : 'default'}
                      disabled={completingId === task.id}
                      onClick={() => handleMarkDone(task)}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {completingId === task.id ? '…' : 'Done'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tasks.length > 0 && <div className="border-t border-border/50" />}

        {/* ── 2. Coach's personal note ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {coachName.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">A Note from {coachName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Your weekly check-in & motivation</p>
              </div>
            </div>
            <Pin className="h-4 w-4 text-primary/50 shrink-0" />
          </div>
          <p className="text-xs italic text-foreground/90 leading-relaxed">&quot;{coachNote}&quot;</p>
        </div>

        {/* ── 3. Coach Chat — always shows when trainer assigned ── */}
        {userData?.assignedTrainerId && (
          <>
            <div className="border-t border-border/50" />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Coach Chat
                  </p>
                  {unreadCount > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs rounded-full h-4 min-w-4 px-1 flex items-center justify-center font-bold leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <Link href="/dashboard/client/messages">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-11 gap-1 px-2 text-xs text-primary hover:text-primary/80 transition-transform active:scale-95"
                  >
                    Open chat <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-muted-foreground pl-1">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''} from your coach.`
                  : 'No unread messages right now.'}
              </p>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}
