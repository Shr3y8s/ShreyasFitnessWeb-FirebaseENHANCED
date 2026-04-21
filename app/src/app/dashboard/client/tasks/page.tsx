'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, signOutUser } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';

interface ClientTask {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'completed' | 'overdue';
  completedAt?: Date;
  createdAt: Date;
  trainerId: string;
}

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate();
  }
  return new Date(val as string | number);
}

function computeStatus(status: string, dueDate: Date): ClientTask['status'] {
  if (status === 'completed') return 'completed';
  if (new Date() > dueDate) return 'overdue';
  return 'pending';
}

function formatDueDate(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

export default function ClientTasksPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<ClientTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) router.push('/login');
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'clientTasks'),
      where('clientId', '==', user.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: ClientTask[] = snap.docs.map(d => {
        const data = d.data();
        const dueDate = toDate(data.dueDate);
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          dueDate,
          priority: data.priority,
          status: computeStatus(data.status, dueDate),
          completedAt: data.completedAt ? toDate(data.completedAt) : undefined,
          createdAt: toDate(data.createdAt),
          trainerId: data.trainerId,
        };
      });
      list.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (a.status !== 'completed' && b.status === 'completed') return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
      setTasks(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [user]);

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const handleMarkComplete = async (task: ClientTask) => {
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

  const TaskCard = ({ task }: { task: ClientTask }) => (
    <div className={cn(
      'p-4 rounded-lg border transition-colors',
      task.status === 'overdue' ? 'border-red-200 bg-red-50/50' :
      task.priority === 'urgent' ? 'border-orange-200 bg-orange-50/50' :
      task.status === 'completed' ? 'border-green-200 bg-green-50/30 opacity-75' :
      'border-border bg-card'
    )}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {task.status === 'completed'
            ? <CheckCircle2 className="h-5 w-5 text-green-500" />
            : task.status === 'overdue'
            ? <AlertTriangle className="h-5 w-5 text-red-500" />
            : <Clock className="h-5 w-5 text-muted-foreground" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('font-medium text-sm', task.status === 'completed' && 'line-through text-muted-foreground')}>
              {task.title}
            </span>
            {task.status === 'overdue' && <Badge variant="destructive" className="text-xs">Overdue</Badge>}
            {task.status === 'pending' && task.priority === 'urgent' && (
              <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">Urgent</Badge>
            )}
          </div>
          {task.description && (
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
          )}
          <p className={cn(
            'text-xs mt-1',
            task.status === 'overdue' ? 'text-red-500 font-medium' :
            task.status === 'completed' ? 'text-green-600' :
            'text-muted-foreground'
          )}>
            {task.status === 'completed' && task.completedAt
              ? `Completed ${formatTimeAgo(task.completedAt)}`
              : formatDueDate(task.dueDate)
            }
          </p>
        </div>
        {task.status !== 'completed' && (
          <Button
            size="sm"
            variant={task.status === 'overdue' ? 'destructive' : 'default'}
            className="shrink-0 gap-1"
            disabled={completingId === task.id}
            onClick={() => handleMarkComplete(task)}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {completingId === task.id ? '…' : 'Done'}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">My Tasks</h1>
            <p className="text-muted-foreground text-sm mt-1">Tasks assigned by your coach</p>
          </div>

          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending" className="gap-2">
                Pending
                {pendingTasks.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{pendingTasks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed
                {completedTasks.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{completedTasks.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4 space-y-3">
              {loading ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Loading…</CardContent></Card>
              ) : pendingTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-400" />
                    <p className="font-medium text-muted-foreground">All caught up!</p>
                    <p className="text-sm text-muted-foreground mt-1">No pending tasks right now.</p>
                  </CardContent>
                </Card>
              ) : (
                pendingTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-4 space-y-3">
              {completedTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No completed tasks yet.
                  </CardContent>
                </Card>
              ) : (
                completedTasks.map(task => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
