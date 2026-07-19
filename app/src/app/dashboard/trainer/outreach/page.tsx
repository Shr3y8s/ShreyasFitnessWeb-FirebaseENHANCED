'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  subscribeToTrainerTasks,
  subscribeToTrainerReminders,
  createTask,
  completeTask,
  deleteTask,
  createReminder,
  cancelReminder,
  getAutoReminderSettings,
  updateAutoReminderSettings,
} from '@/lib/outreach-api';
import { addDoc, Timestamp } from 'firebase/firestore';
import type {
  ClientTask,
  ClientReminder,
  CreateTaskInput,
  CreateReminderInput,
  ClientAutoReminderSettings,
} from '@/types/outreach';
import {
  REMINDER_TEMPLATES,
  AUTO_REMINDER_LABELS,
  DEFAULT_AUTO_REMINDER_SETTINGS,
} from '@/types/outreach';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Plus,
  CheckCircle2,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  Send,
  Bell,
  BellOff,
  ChevronDown,
  MessageSquare,
  CalendarClock,
  Zap,
  Settings2,
  Ban,
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';

// ============================================================
// Types
// ============================================================

interface ClientOption {
  id: string;
  name: string;
}

// ============================================================
// Helpers
// ============================================================

function statusBadge(status: ClientTask['status'], priority: ClientTask['priority']) {
  if (status === 'completed') return <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>;
  if (status === 'overdue')   return <Badge variant="destructive">Overdue</Badge>;
  if (priority === 'urgent')  return <Badge className="bg-orange-500 hover:bg-orange-600 text-white">Urgent</Badge>;
  return <Badge variant="secondary">Pending</Badge>;
}

function reminderStatusBadge(status: ClientReminder['status']) {
  if (status === 'sent')      return <Badge className="bg-green-500 hover:bg-green-600 text-white">Sent</Badge>;
  if (status === 'scheduled') return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Scheduled</Badge>;
  if (status === 'cancelled') return <Badge variant="secondary">Cancelled</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function categoryBadge(category: ClientReminder['category']) {
  const map: Record<string, string> = {
    behavioral:    'bg-purple-100 text-purple-700 border-purple-200',
    informational: 'bg-blue-100 text-blue-700 border-blue-200',
    promotional:   'bg-amber-100 text-amber-700 border-amber-200',
    motivational:  'bg-green-100 text-green-700 border-green-200',
  };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', map[category] || 'bg-gray-100 text-gray-700')}>
      {category.charAt(0).toUpperCase() + category.slice(1)}
    </span>
  );
}

function formatDueDate(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

// ============================================================
// Main Page
// ============================================================

export default function OutreachPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const trainerId = user?.uid || '';

  // Data state
  const [tasks, setTasks]         = useState<ClientTask[]>([]);
  const [reminders, setReminders] = useState<ClientReminder[]>([]);
  const [clients, setClients]     = useState<ClientOption[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // Auto-reminder settings state (per selected client)
  const [autoReminderClient, setAutoReminderClient] = useState<string>('');
  const [autoSettings, setAutoSettings] = useState<ClientAutoReminderSettings>(DEFAULT_AUTO_REMINDER_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Dialog state
  const [taskDialogOpen, setTaskDialogOpen]         = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [submitting, setSubmitting]                 = useState(false);

  // Task form
  const [taskForm, setTaskForm] = useState<{
    clientId: string; title: string; description: string;
    dueDate: string; priority: 'normal' | 'urgent';
  }>({ clientId: '', title: '', description: '', dueDate: '', priority: 'normal' });

  // Reminder form
  const [reminderForm, setReminderForm] = useState<{
    clientId: string; message: string; category: ClientReminder['category'];
    scheduleType: 'immediate' | 'scheduled'; scheduledAt: string;
  }>({ clientId: '', message: '', category: 'behavioral', scheduleType: 'immediate', scheduledAt: '' });

  const [selectedTemplate, setSelectedTemplate] = useState('');

  // ── Load clients ────────────────────────────────────────────
  useEffect(() => {
    if (!trainerId) return;
    const load = async () => {
      setLoadingClients(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'client'), where('accountActivated', '==', true))
        );
        const list: ClientOption[] = snap.docs.map(d => ({ id: d.id, name: d.data().name || 'Unknown' }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setClients(list);
      } finally {
        setLoadingClients(false);
      }
    };
    load();
  }, [trainerId]);

  // ── Real-time subscriptions ─────────────────────────────────
  useEffect(() => {
    if (!trainerId) return;
    const unsub1 = subscribeToTrainerTasks(trainerId, setTasks);
    const unsub2 = subscribeToTrainerReminders(trainerId, setReminders);
    return () => { unsub1(); unsub2(); };
  }, [trainerId]);

  // ── Auto-reminder settings load ─────────────────────────────
  useEffect(() => {
    if (!autoReminderClient) return;
    getAutoReminderSettings(autoReminderClient).then(setAutoSettings);
  }, [autoReminderClient]);

  // ── Computed stats ──────────────────────────────────────────
  const openTasks     = tasks.filter(t => t.status !== 'completed');
  const overdueTasks  = tasks.filter(t => t.status === 'overdue');
  const dueTodayTasks = tasks.filter(t => {
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return t.status !== 'completed' && t.dueDate >= start && t.dueDate <= today;
  });
  const completedThisWeek = tasks.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return t.completedAt >= weekAgo;
  });

  const sentToday      = reminders.filter(r => {
    if (!r.sentAt) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return r.sentAt >= today;
  });
  const scheduledCount = reminders.filter(r => r.status === 'scheduled').length;

  // ── Task submit ─────────────────────────────────────────────
  const handleCreateTask = useCallback(async () => {
    if (!taskForm.clientId || !taskForm.title || !taskForm.dueDate) {
      toast({ title: 'Missing fields', description: 'Client, title, and due date are required.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const client = clients.find(c => c.id === taskForm.clientId);
      const input: CreateTaskInput = {
        clientId: taskForm.clientId,
        clientName: client?.name || 'Client',
        title: taskForm.title,
        description: taskForm.description || undefined,
        dueDate: new Date(taskForm.dueDate),
        priority: taskForm.priority,
      };
      const taskId = await createTask(trainerId, input);

      // Also send a client notification via Firestore (clientNotifications collection)
      await addDoc(collection(db, 'clientNotifications'), {
        type: 'task_reminder',
        clientId: taskForm.clientId,
        message: `Your trainer assigned you a new task: "${taskForm.title}"`,
        actionUrl: '/dashboard/client/tasks',
        read: false,
        metadata: { taskId, taskTitle: taskForm.title },
        timestamp: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      toast({ title: '✅ Task assigned', description: `"${taskForm.title}" sent to ${client?.name}.` });
      setTaskDialogOpen(false);
      setTaskForm({ clientId: '', title: '', description: '', dueDate: '', priority: 'normal' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [taskForm, clients, trainerId, toast]);

  // ── Reminder submit ─────────────────────────────────────────
  const handleCreateReminder = useCallback(async () => {
    if (!reminderForm.clientId || !reminderForm.message) {
      toast({ title: 'Missing fields', description: 'Client and message are required.', variant: 'destructive' });
      return;
    }
    if (reminderForm.scheduleType === 'scheduled' && !reminderForm.scheduledAt) {
      toast({ title: 'Missing schedule time', description: 'Please pick a date and time.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const isAll = reminderForm.clientId === 'all';
      const targetClients = isAll ? clients : clients.filter(c => c.id === reminderForm.clientId);
      const clientName = isAll ? 'All Clients' : (clients.find(c => c.id === reminderForm.clientId)?.name || 'Client');

      const input: CreateReminderInput = {
        clientId: reminderForm.clientId,
        clientName,
        message: reminderForm.message,
        category: reminderForm.category,
        scheduleType: reminderForm.scheduleType,
        scheduledAt: reminderForm.scheduleType === 'scheduled' ? new Date(reminderForm.scheduledAt) : undefined,
      };
      await createReminder(trainerId, input);

      // For immediate reminders, push clientNotification to each target client
      if (reminderForm.scheduleType === 'immediate') {
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
        for (const client of targetClients) {
          await addDoc(collection(db, 'clientNotifications'), {
            type: 'task_reminder',
            clientId: client.id,
            message: reminderForm.message,
            actionUrl: '/dashboard/client/tasks',
            read: false,
            metadata: { category: reminderForm.category },
            timestamp: now,
            expiresAt,
          });
        }
        toast({ title: '📬 Reminder sent', description: isAll ? `Sent to all ${targetClients.length} clients.` : `Sent to ${clientName}.` });
      } else {
        toast({ title: '📅 Reminder scheduled', description: `Will be sent at ${new Date(reminderForm.scheduledAt).toLocaleString()}.` });
      }

      setReminderDialogOpen(false);
      setReminderForm({ clientId: '', message: '', category: 'behavioral', scheduleType: 'immediate', scheduledAt: '' });
      setSelectedTemplate('');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to send reminder.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [reminderForm, clients, trainerId, toast]);

  // ── Auto-reminder toggle save ────────────────────────────────
  const handleAutoSettingToggle = useCallback(async (key: keyof ClientAutoReminderSettings, value: boolean) => {
    if (!autoReminderClient) return;
    const updated = { ...autoSettings, [key]: value };
    setAutoSettings(updated);
    setSavingSettings(true);
    try {
      await updateAutoReminderSettings(autoReminderClient, updated, trainerId);
    } catch {
      toast({ title: 'Error', description: 'Failed to save reminder settings.', variant: 'destructive' });
      setAutoSettings(autoSettings); // revert
    } finally {
      setSavingSettings(false);
    }
  }, [autoReminderClient, autoSettings, trainerId, toast]);

  // ── Template picker ─────────────────────────────────────────
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = REMINDER_TEMPLATES.find(t => t.id === templateId);
    if (tmpl) {
      setReminderForm(f => ({ ...f, message: tmpl.message, category: tmpl.category }));
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="outreach" />
      <SidebarInset>
    <div className="client-surface p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks &amp; Reminders</h1>

          <p className="text-muted-foreground text-sm mt-1">Assign tasks and send reminders to your clients</p>
        </div>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="mb-6">
          <TabsTrigger value="tasks" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Tasks
            {openTasks.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{openTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reminders" className="gap-2">
            <Bell className="h-4 w-4" />
            Reminders
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════
            TASKS TAB
        ════════════════════════════════════════════════════ */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{openTasks.length}</div>
                <div className="text-sm text-muted-foreground">Open Tasks</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-orange-500">{dueTodayTasks.length}</div>
                <div className="text-sm text-muted-foreground">Due Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-red-500">{overdueTasks.length}</div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{completedThisWeek.length}</div>
                <div className="text-sm text-muted-foreground">Completed This Week</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">All Tasks</h2>
            <Button onClick={() => setTaskDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Assign Task
            </Button>
          </div>

          {/* Task table */}
          {tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No tasks yet</p>
                <p className="text-sm text-muted-foreground mt-1">Assign a task to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-4 p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('font-medium text-sm', task.status === 'completed' && 'line-through text-muted-foreground')}>
                            {task.title}
                          </span>
                          {statusBadge(task.status, task.priority)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{task.clientName}
                          </span>
                          <span className={cn('flex items-center gap-1', task.status === 'overdue' && 'text-red-500 font-medium')}>
                            <Clock className="h-3 w-3" />{formatDueDate(task.dueDate)}
                          </span>
                          {task.status === 'completed' && task.completedAt && (
                            <span className="text-green-600">Completed {formatTimeAgo(task.completedAt)}</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {task.status !== 'completed' && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              await completeTask(task.id);
                              toast({ title: '✅ Task marked complete' });
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            await deleteTask(task.id);
                            toast({ title: 'Task deleted' });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════
            REMINDERS TAB
        ════════════════════════════════════════════════════ */}
        <TabsContent value="reminders" className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{sentToday.length}</div>
                <div className="text-sm text-muted-foreground">Sent Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-500">{scheduledCount}</div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{reminders.length}</div>
                <div className="text-sm text-muted-foreground">Total Sent</div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Reminder History</h2>
            <Button onClick={() => setReminderDialogOpen(true)} className="gap-2">
              <Send className="h-4 w-4" /> Send Reminder
            </Button>
          </div>

          {/* Reminder table */}
          {reminders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-muted-foreground font-medium">No reminders yet</p>
                <p className="text-sm text-muted-foreground mt-1">Send a reminder to get started</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-start gap-4 p-4 hover:bg-accent/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium flex items-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            {reminder.clientName}
                          </span>
                          {categoryBadge(reminder.category)}
                          {reminderStatusBadge(reminder.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{reminder.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {reminder.status === 'scheduled' && reminder.scheduledAt
                            ? `Scheduled: ${reminder.scheduledAt.toLocaleString()}`
                            : `Sent ${formatTimeAgo(reminder.sentAt || reminder.createdAt)}`}
                        </p>
                      </div>
                      {reminder.status === 'scheduled' && (
                        <Button
                          variant="ghost" size="sm"
                          className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                          onClick={async () => {
                            await cancelReminder(reminder.id);
                            toast({ title: 'Reminder cancelled' });
                          }}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Auto-Reminder Settings */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Auto-Reminder Settings
                </span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', settingsOpen && 'rotate-180')} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card className="mt-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Per-Client Auto-Reminder Controls</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Choose which daily automatic reminders are active for each client.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Select Client</label>
                    <Select value={autoReminderClient} onValueChange={setAutoReminderClient}>
                      <SelectTrigger className="w-full sm:w-72">
                        <SelectValue placeholder="Choose a client…" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {autoReminderClient && (
                    <div className="space-y-3">
                      <Separator />
                      {(Object.keys(AUTO_REMINDER_LABELS) as Array<keyof typeof AUTO_REMINDER_LABELS>).map(key => {
                        const info = AUTO_REMINDER_LABELS[key];
                        const isOn = autoSettings[key];
                        return (
                          <div key={key} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{info.icon}</span>
                              <div>
                                <p className="text-sm font-medium">{info.label}</p>
                                <p className="text-xs text-muted-foreground">{info.description}</p>
                              </div>
                            </div>
                            <Switch
                              checked={isOn}
                              disabled={savingSettings}
                              onCheckedChange={(val: boolean) => handleAutoSettingToggle(key, val)}
                            />
                          </div>
                        );
                      })}
                      {savingSettings && (
                        <p className="text-xs text-muted-foreground text-right">Saving…</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════
          CREATE TASK DIALOG
      ════════════════════════════════════════════════════ */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Assign Task to Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Client */}
            <div>
              <label className="text-sm font-medium block mb-1">Client *</label>
              <Select value={taskForm.clientId} onValueChange={v => setTaskForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingClients ? 'Loading…' : 'Select a client…'} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Title */}
            <div>
              <label className="text-sm font-medium block mb-1">Task Title *</label>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g. Log your weight tomorrow morning"
                value={taskForm.title}
                onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            {/* Description */}
            <div>
              <label className="text-sm font-medium block mb-1">Description (optional)</label>
              <Textarea
                placeholder="Additional details for the client…"
                value={taskForm.description}
                onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            {/* Due date */}
            <div>
              <label className="text-sm font-medium block mb-1">Due Date *</label>
              <input
                type="datetime-local"
                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                value={taskForm.dueDate}
                onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
            {/* Priority */}
            <div>
              <label className="text-sm font-medium block mb-1">Priority</label>
              <div className="flex gap-2">
                {(['normal', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setTaskForm(f => ({ ...f, priority: p }))}
                    className={cn(
                      'px-4 py-2 rounded-md text-sm font-medium border transition-colors',
                      taskForm.priority === p
                        ? p === 'urgent' ? 'bg-orange-500 text-white border-orange-500' : 'bg-primary text-white border-primary'
                        : 'bg-background hover:bg-accent'
                    )}
                  >
                    {p === 'urgent' ? '🔴 Urgent' : '⚪ Normal'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={submitting} className="gap-2">
              <Send className="h-4 w-4" />
              {submitting ? 'Sending…' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════
          CREATE REMINDER DIALOG
      ════════════════════════════════════════════════════ */}
      <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Send Client Reminder
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Client */}
            <div>
              <label className="text-sm font-medium block mb-1">Send To *</label>
              <Select value={reminderForm.clientId} onValueChange={v => setReminderForm(f => ({ ...f, clientId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client or broadcast…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" /> All Clients
                    </span>
                  </SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-medium block mb-1">Category</label>
              <div className="flex gap-2 flex-wrap">
                {(['behavioral', 'motivational', 'informational', 'promotional'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setReminderForm(f => ({ ...f, category: cat }))}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      reminderForm.category === cat
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background hover:bg-accent'
                    )}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Template picker */}
            <div>
              <label className="text-sm font-medium block mb-1">Use a Template (optional)</label>
              <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Browse templates…" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_TEMPLATES.filter(t => !reminderForm.category || t.category === reminderForm.category).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium block mb-1">Message *</label>
              <Textarea
                placeholder="Type your reminder message…"
                value={reminderForm.message}
                onChange={e => setReminderForm(f => ({ ...f, message: e.target.value }))}
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{reminderForm.message.length}/500</p>
            </div>

            {/* Schedule */}
            <div>
              <label className="text-sm font-medium block mb-1">When to Send</label>
              <div className="flex gap-2">
                {([
                  { v: 'immediate', label: '⚡ Send Now', icon: Zap },
                  { v: 'scheduled', label: '📅 Schedule', icon: CalendarClock },
                ] as const).map(({ v, label }) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setReminderForm(f => ({ ...f, scheduleType: v }))}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors',
                      reminderForm.scheduleType === v
                        ? 'bg-primary text-white border-primary'
                        : 'bg-background hover:bg-accent'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {reminderForm.scheduleType === 'scheduled' && (
                <input
                  type="datetime-local"
                  className="mt-2 w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  value={reminderForm.scheduledAt}
                  onChange={e => setReminderForm(f => ({ ...f, scheduledAt: e.target.value }))}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReminderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateReminder} disabled={submitting} className="gap-2">
              {reminderForm.scheduleType === 'immediate'
                ? <><Send className="h-4 w-4" />{submitting ? 'Sending…' : 'Send Now'}</>
                : <><CalendarClock className="h-4 w-4" />{submitting ? 'Scheduling…' : 'Schedule'}</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
