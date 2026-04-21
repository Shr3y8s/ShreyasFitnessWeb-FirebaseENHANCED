// Client Outreach API — Firestore CRUD for Tasks and Reminders
// Trainer-side only. Clients receive notifications via the existing clientNotifications system.

import { db } from './firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import type {
  ClientTask,
  ClientTaskDoc,
  ClientReminder,
  ClientReminderDoc,
  CreateTaskInput,
  CreateReminderInput,
  ClientAutoReminderSettings,
} from '@/types/outreach';
import { DEFAULT_AUTO_REMINDER_SETTINGS } from '@/types/outreach';

const TASKS_COLLECTION = 'clientTasks';
const REMINDERS_COLLECTION = 'clientReminders';

// ============================================================
// Timestamp conversion helpers
// ============================================================

function toDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  if (val instanceof Date) return val;
  const parsed = new Date(val as string | number);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function toOptionalDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  return toDate(val);
}

// ============================================================
// Auto-status computation
// A task is 'overdue' if its dueDate has passed and it's still 'pending'
// ============================================================

function computeTaskStatus(status: string, dueDate: Date): ClientTask['status'] {
  if (status === 'completed') return 'completed';
  if (new Date() > dueDate && status === 'pending') return 'overdue';
  return 'pending';
}

// ============================================================
// Document converters
// ============================================================

function taskDocToTask(id: string, data: ClientTaskDoc): ClientTask {
  const dueDate = toDate(data.dueDate);
  return {
    id,
    trainerId: data.trainerId,
    clientId: data.clientId,
    clientName: data.clientName,
    title: data.title,
    description: data.description,
    dueDate,
    priority: data.priority,
    status: computeTaskStatus(data.status, dueDate),
    completedAt: toOptionalDate(data.completedAt),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

function reminderDocToReminder(id: string, data: ClientReminderDoc): ClientReminder {
  return {
    id,
    trainerId: data.trainerId,
    clientId: data.clientId,
    clientName: data.clientName,
    message: data.message,
    category: data.category,
    scheduleType: data.scheduleType,
    scheduledAt: toOptionalDate(data.scheduledAt),
    status: data.status,
    sentAt: toOptionalDate(data.sentAt),
    createdAt: toDate(data.createdAt),
  };
}

// ============================================================
// TASKS — CRUD
// ============================================================

/**
 * Create a new task for a client and write it to Firestore.
 * Does NOT send the client notification — that is handled by the caller (or a Cloud Function).
 */
export async function createTask(
  trainerId: string,
  input: CreateTaskInput
): Promise<string> {
  const now = Timestamp.now();
  const docData: Omit<ClientTaskDoc, 'completedAt'> = {
    trainerId,
    clientId: input.clientId,
    clientName: input.clientName,
    title: input.title,
    description: input.description || '',
    dueDate: Timestamp.fromDate(input.dueDate),
    priority: input.priority,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, TASKS_COLLECTION), docData);
  return ref.id;
}

/**
 * Mark a task as completed.
 */
export async function completeTask(taskId: string): Promise<void> {
  const ref = doc(db, TASKS_COLLECTION, taskId);
  await updateDoc(ref, {
    status: 'completed',
    completedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string): Promise<void> {
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));
}

/**
 * Fetch all tasks for a trainer (one-time read).
 */
export async function getTrainerTasks(trainerId: string): Promise<ClientTask[]> {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('trainerId', '==', trainerId),
    orderBy('dueDate', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => taskDocToTask(d.id, d.data() as ClientTaskDoc));
}

/**
 * Real-time subscription to all tasks for a trainer.
 * Returns unsubscribe function.
 */
export function subscribeToTrainerTasks(
  trainerId: string,
  onUpdate: (tasks: ClientTask[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('trainerId', '==', trainerId),
    orderBy('dueDate', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => taskDocToTask(d.id, d.data() as ClientTaskDoc));
      onUpdate(tasks);
    },
    (error) => {
      console.error('[OutreachAPI] Tasks listener error:', error);
      if (onError) onError(error);
    }
  );
}

// ============================================================
// REMINDERS — CRUD
// ============================================================

/**
 * Create a new reminder record in Firestore.
 * For 'immediate' reminders the notification is sent by the caller right after this.
 * For 'scheduled' reminders a Cloud Function picks them up at the scheduled time.
 */
export async function createReminder(
  trainerId: string,
  input: CreateReminderInput
): Promise<string> {
  const now = Timestamp.now();
  // Build doc without undefined fields — Firestore rejects undefined values
  const docData: Record<string, unknown> = {
    trainerId,
    clientId: input.clientId,
    clientName: input.clientName,
    message: input.message,
    category: input.category,
    scheduleType: input.scheduleType,
    status: input.scheduleType === 'immediate' ? 'sent' : 'scheduled',
    createdAt: now,
  };

  if (input.scheduledAt) {
    docData.scheduledAt = Timestamp.fromDate(input.scheduledAt);
  }
  if (input.scheduleType === 'immediate') {
    docData.sentAt = now;
  }

  const ref = await addDoc(collection(db, REMINDERS_COLLECTION), docData);
  return ref.id;
}

/**
 * Cancel a scheduled reminder.
 */
export async function cancelReminder(reminderId: string): Promise<void> {
  const ref = doc(db, REMINDERS_COLLECTION, reminderId);
  await updateDoc(ref, { status: 'cancelled' });
}

/**
 * Real-time subscription to all reminders for a trainer.
 * Returns unsubscribe function.
 */
export function subscribeToTrainerReminders(
  trainerId: string,
  onUpdate: (reminders: ClientReminder[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, REMINDERS_COLLECTION),
    where('trainerId', '==', trainerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders = snapshot.docs.map((d) =>
        reminderDocToReminder(d.id, d.data() as ClientReminderDoc)
      );
      onUpdate(reminders);
    },
    (error) => {
      console.error('[OutreachAPI] Reminders listener error:', error);
      if (onError) onError(error);
    }
  );
}

// ============================================================
// AUTO-REMINDER SETTINGS
// Stored as a sub-field on the clientPlans/{clientId} document
// ============================================================

/**
 * Get auto-reminder settings for a client (from their plan doc).
 * Returns defaults if not configured.
 */
export async function getAutoReminderSettings(clientId: string): Promise<ClientAutoReminderSettings> {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      const data = planSnap.data();
      if (data.reminderSettings) {
        return { ...DEFAULT_AUTO_REMINDER_SETTINGS, ...data.reminderSettings };
      }
    }
    return { ...DEFAULT_AUTO_REMINDER_SETTINGS };
  } catch {
    return { ...DEFAULT_AUTO_REMINDER_SETTINGS };
  }
}

/**
 * Update auto-reminder settings for a client.
 */
export async function updateAutoReminderSettings(
  clientId: string,
  settings: Partial<ClientAutoReminderSettings>,
  trainerId: string
): Promise<void> {
  const planRef = doc(db, 'clientPlans', clientId);
  await updateDoc(planRef, {
    reminderSettings: settings,
    reminderSettingsUpdatedAt: Timestamp.now(),
    reminderSettingsUpdatedBy: trainerId,
  });
}

/**
 * Bulk-fetch auto-reminder settings for multiple clients.
 * Returns a map of clientId → settings.
 */
export async function getBulkAutoReminderSettings(
  clientIds: string[]
): Promise<Record<string, ClientAutoReminderSettings>> {
  const result: Record<string, ClientAutoReminderSettings> = {};
  // Fetch in parallel (up to 10 at a time to avoid overwhelming Firestore)
  const chunkSize = 10;
  for (let i = 0; i < clientIds.length; i += chunkSize) {
    const chunk = clientIds.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (clientId) => {
        result[clientId] = await getAutoReminderSettings(clientId);
      })
    );
  }
  return result;
}

/**
 * Bulk-update auto-reminder settings for all clients (global toggle).
 */
export async function bulkUpdateAutoReminderSettings(
  clientIds: string[],
  settings: Partial<ClientAutoReminderSettings>,
  trainerId: string
): Promise<void> {
  const batch = writeBatch(db);
  for (const clientId of clientIds) {
    const ref = doc(db, 'clientPlans', clientId);
    batch.update(ref, {
      reminderSettings: settings,
      reminderSettingsUpdatedAt: Timestamp.now(),
      reminderSettingsUpdatedBy: trainerId,
    });
  }
  await batch.commit();
}
