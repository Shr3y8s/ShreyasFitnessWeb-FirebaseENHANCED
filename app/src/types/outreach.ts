// Client Outreach System — TypeScript Types
// Two distinct types: Tasks (actionable, completable) and Reminders (informational, fire-and-forget)
// Trainer creates both; clients receive them via the clientNotifications bell system.

import { Timestamp } from 'firebase/firestore';

// ============================================================
// CLIENT TASKS
// ============================================================

export type TaskPriority = 'normal' | 'urgent';
export type TaskStatus = 'pending' | 'completed' | 'overdue';

export interface ClientTask {
  id: string;
  trainerId: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Raw Firestore document (before Date conversion)
export interface ClientTaskDoc {
  trainerId: string;
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  dueDate: Timestamp;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Form data for creating a task
export interface CreateTaskInput {
  clientId: string;
  clientName: string;
  title: string;
  description?: string;
  dueDate: Date;
  priority: TaskPriority;
}

// ============================================================
// CLIENT REMINDERS
// ============================================================

export type ReminderCategory = 'informational' | 'behavioral' | 'promotional' | 'motivational';
export type ReminderScheduleType = 'immediate' | 'scheduled';
export type ReminderStatus = 'sent' | 'scheduled' | 'cancelled';

export interface ClientReminder {
  id: string;
  trainerId: string;
  clientId: string;           // specific clientId OR 'all' for broadcast
  clientName: string;         // client display name OR 'All Clients'
  message: string;
  category: ReminderCategory;
  scheduleType: ReminderScheduleType;
  scheduledAt?: Date;         // only set when scheduleType === 'scheduled'
  status: ReminderStatus;
  sentAt?: Date;
  createdAt: Date;
}

// Raw Firestore document (before Date conversion)
export interface ClientReminderDoc {
  trainerId: string;
  clientId: string;
  clientName: string;
  message: string;
  category: ReminderCategory;
  scheduleType: ReminderScheduleType;
  scheduledAt?: Timestamp;
  status: ReminderStatus;
  sentAt?: Timestamp;
  createdAt: Timestamp;
}

// Form data for creating a reminder
export interface CreateReminderInput {
  clientId: string;           // 'all' for broadcast
  clientName: string;
  message: string;
  category: ReminderCategory;
  scheduleType: ReminderScheduleType;
  scheduledAt?: Date;
}

// ============================================================
// MESSAGE TEMPLATES
// ============================================================

export interface ReminderTemplate {
  id: string;
  category: ReminderCategory;
  label: string;              // Short display name
  message: string;            // Pre-written message body
}

export const REMINDER_TEMPLATES: ReminderTemplate[] = [
  // Behavioral
  { id: 'b1', category: 'behavioral', label: 'Log Your Weight', message: 'Don\'t forget to hop on the scale and log your weight today — it helps us track your progress! ⚖️' },
  { id: 'b2', category: 'behavioral', label: 'Complete Daily Activities', message: 'Make sure you\'re completing your daily activities — steps, water, and habits all count toward your goals! 💪' },
  { id: 'b3', category: 'behavioral', label: 'Check Your Plan', message: 'Make sure to check your updated plan every Monday so you\'re set up for a great week! 📋' },
  { id: 'b4', category: 'behavioral', label: 'Schedule Your Workout', message: 'Remember to schedule your workout before the end of the week — consistency is key! 🏋️' },
  { id: 'b5', category: 'behavioral', label: 'Submit Weekly Check-In', message: 'Your weekly check-in survey is due — a few minutes of reflection goes a long way toward your goals! 📝' },
  { id: 'b6', category: 'behavioral', label: 'Take Progress Photos', message: 'Time to take your progress photos! These are valuable for tracking your transformation. 📸' },

  // Motivational
  { id: 'm1', category: 'motivational', label: 'Keep Going', message: 'You\'re doing amazing — keep up the great work and stay consistent! The results are coming. 🔥' },
  { id: 'm2', category: 'motivational', label: 'Proud of You', message: 'Just wanted to check in and say I\'m proud of the effort you\'re putting in. Keep pushing! 🙌' },
  { id: 'm3', category: 'motivational', label: 'Trust the Process', message: 'Trust the process — every small action adds up. You\'re closer to your goals than you think! ⚡' },

  // Informational
  { id: 'i1', category: 'informational', label: 'Plan Updated', message: 'Your training plan has been updated — check it out in your dashboard and let me know if you have any questions! 📋' },
  { id: 'i2', category: 'informational', label: 'New Workout Available', message: 'A new workout has been assigned to you — head to your workouts page to check it out! 💪' },
  { id: 'i3', category: 'informational', label: 'Nutrition Plan Updated', message: 'Your nutrition plan has been updated — take a look when you get a chance! 🥗' },

  // Promotional
  { id: 'p1', category: 'promotional', label: 'Monthly Sale', message: '🎉 Special offer this month — reach out for details on how to take advantage!' },
  { id: 'p2', category: 'promotional', label: 'In-Person Training Sale', message: 'Limited-time offer on in-person training sessions this month! Reply to learn more. 🏋️' },
  { id: 'p3', category: 'promotional', label: 'Referral Program', message: 'Did you know you can earn rewards for referring friends? Ask me about the referral program! 🤝' },
];

// ============================================================
// AUTO-REMINDER SETTINGS (per client, stored on clientPlans)
// ============================================================

export interface ClientAutoReminderSettings {
  workoutOverdue: boolean;
  nutritionReminder: boolean;
  stepsReminder: boolean;
  habitsReminder: boolean;
  weightReminder: boolean;
}

export const DEFAULT_AUTO_REMINDER_SETTINGS: ClientAutoReminderSettings = {
  workoutOverdue: true,
  nutritionReminder: true,
  stepsReminder: true,
  habitsReminder: true,
  weightReminder: true,
};

export const AUTO_REMINDER_LABELS: Record<keyof ClientAutoReminderSettings, { label: string; description: string; icon: string }> = {
  workoutOverdue:     { label: 'Workout Overdue',     description: 'Notify when an assigned workout passes its due date',      icon: '⚠️' },
  nutritionReminder:  { label: 'Nutrition Reminder',  description: 'Daily nudge to complete their nutrition approach',           icon: '🥗' },
  stepsReminder:      { label: 'Steps Reminder',      description: 'Daily nudge if no steps have been logged',                  icon: '👟' },
  habitsReminder:     { label: 'Habits Reminder',     description: 'Daily nudge if no daily habits have been checked off',      icon: '📝' },
  weightReminder:     { label: 'Weight Reminder',     description: 'Weekly nudge if no weight has been logged in 7 days',       icon: '⚖️' },
};
