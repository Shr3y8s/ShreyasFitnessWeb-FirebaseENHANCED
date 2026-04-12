// Client Notification System — TypeScript Types
// Notifications sent TO the client from trainer actions, system events, or scheduled triggers.

import { Timestamp } from 'firebase/firestore';

// ============================================================
// Notification Type Definitions
// ============================================================

export type ClientNotificationType =
  | 'plan_updated'          // Trainer updated training plan
  | 'new_workout'           // New workout assigned
  | 'nutrition_updated'     // Trainer updated nutrition/meal plan
  | 'task_reminder'         // Trainer sent a task/reminder (future feature)
  | 'activities_updated'    // Daily activity goals updated
  | 'upcoming_payment'      // Subscription renewal approaching
  | 'login_streak'          // Login streak milestone
  | 'goal_added'            // New goal added by trainer
  | 'goal_updated'          // Existing goal updated by trainer
  | 'new_message'           // Trainer sent a direct message
  // ── Automated daily reminders ──
  | 'workout_overdue'       // Assigned workout is past its due date
  | 'nutrition_reminder'    // Nutrition approach not completed today
  | 'steps_reminder'        // No steps logged today
  | 'habits_reminder'       // No daily habits checked off today
  | 'weight_reminder';      // No weight logged in the past 7 days

// ============================================================
// Core Notification Document
// ============================================================

export interface ClientNotification {
  id: string;                        // Firestore auto-generated document ID
  type: ClientNotificationType;      // Notification category
  clientId: string;                  // Recipient client's user ID
  message: string;                   // Human-readable summary
  timestamp: Date;                   // When the notification was created
  expiresAt: Date;                   // Auto-cleanup after 7 days
  read: boolean;                     // Has client seen this?
  actionUrl?: string;                // Optional deep link for "View" button
  metadata: ClientNotificationMetadata; // Type-specific extra data
}

// Raw Firestore document (before Date conversion)
export interface ClientNotificationDoc {
  type: ClientNotificationType;
  clientId: string;
  message: string;
  timestamp: Timestamp;
  expiresAt: Timestamp;
  read: boolean;
  actionUrl?: string;
  metadata: ClientNotificationMetadata;
}

// ============================================================
// Metadata Types (type-specific extra data)
// ============================================================

export type ClientNotificationMetadata =
  | PlanUpdatedMetadata
  | NewWorkoutMetadata
  | NutritionUpdatedMetadata
  | TaskReminderMetadata
  | ActivitiesUpdatedMetadata
  | UpcomingPaymentMetadata
  | LoginStreakMetadata
  | GoalAddedMetadata
  | GoalUpdatedMetadata
  | Record<string, never>; // Empty fallback

export interface PlanUpdatedMetadata {
  updatedSection?: string; // e.g., "Training Protocol", "Step Goal"
}

export interface NewWorkoutMetadata {
  workoutId: string;
  workoutName: string;
  dueDate?: string; // YYYY-MM-DD
}

export interface NutritionUpdatedMetadata {
  updatedSection?: string; // e.g., "Meal Plan", "Nutrition Protocol"
}

export interface TaskReminderMetadata {
  taskTitle: string;
  dueDate?: string; // YYYY-MM-DD
}

export interface ActivitiesUpdatedMetadata {
  updatedSection?: string; // e.g., "Step Goal", "Water Goal", "Daily Habits"
}

export interface UpcomingPaymentMetadata {
  renewalDate: string; // ISO date string
  amount?: number;
  currency?: string;
  daysUntilRenewal: number;
}

export interface LoginStreakMetadata {
  streakDays: number;
}

export interface GoalAddedMetadata {
  goalId: string;
  goalTitle: string;
  goalCategory: string;
}

export interface GoalUpdatedMetadata {
  goalId: string;
  goalTitle: string;
  goalCategory: string;
}

// ============================================================
// UI Display Configuration
// ============================================================

export const CLIENT_NOTIFICATION_CONFIG: Record<
  ClientNotificationType,
  { icon: string; title: string; defaultActionUrl: string }
> = {
  plan_updated: {
    icon: '📋',
    title: 'Plan Updated',
    defaultActionUrl: '/dashboard/client/plan',
  },
  new_workout: {
    icon: '💪',
    title: 'New Workout Available',
    defaultActionUrl: '/dashboard/client/workouts',
  },
  nutrition_updated: {
    icon: '🥗',
    title: 'Nutrition Plan Updated',
    defaultActionUrl: '/dashboard/client/nutrition',
  },
  task_reminder: {
    icon: '📌',
    title: 'New Task / Reminder',
    defaultActionUrl: '/dashboard/client',
  },
  activities_updated: {
    icon: '✅',
    title: 'Daily Activities Updated',
    defaultActionUrl: '/dashboard/client/activity',
  },
  upcoming_payment: {
    icon: '💳',
    title: 'Upcoming Payment',
    defaultActionUrl: '/dashboard/client/billing',
  },
  login_streak: {
    icon: '🔥',
    title: 'Login Streak',
    defaultActionUrl: '/dashboard/client',
  },
  goal_added: {
    icon: '🎯',
    title: 'New Goal Added',
    defaultActionUrl: '/dashboard/client/goals',
  },
  goal_updated: {
    icon: '🏆',
    title: 'Goal Updated',
    defaultActionUrl: '/dashboard/client/goals',
  },
  workout_overdue: {
    icon: '⚠️',
    title: 'Workout Overdue',
    defaultActionUrl: '/dashboard/client/workouts',
  },
  nutrition_reminder: {
    icon: '🥗',
    title: 'Nutrition Reminder',
    defaultActionUrl: '/dashboard/client/nutrition',
  },
  steps_reminder: {
    icon: '👟',
    title: 'Steps Reminder',
    defaultActionUrl: '/dashboard/client/activity',
  },
  habits_reminder: {
    icon: '📝',
    title: 'Habits Reminder',
    defaultActionUrl: '/dashboard/client/activity',
  },
  weight_reminder: {
    icon: '⚖️',
    title: 'Log Your Weight',
    defaultActionUrl: '/dashboard/client/activity',
  },
  new_message: {
    icon: '💬',
    title: 'New Message from Coach',
    defaultActionUrl: '/dashboard/client/messages',
  },
};
