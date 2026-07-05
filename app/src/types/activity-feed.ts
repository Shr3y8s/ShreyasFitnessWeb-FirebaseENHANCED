// Client Activity Feed — TypeScript Types
// See: docs/02-implementation/client-activity-feed-architecture.md

import { Timestamp } from 'firebase/firestore';

// ============================================================
// Event Type Definitions
// ============================================================

export type ActivityEventType =
  | 'client_login'
  | 'workout_completed'
  | 'nutrition_day_completed'
  | 'daily_activities_completed'
  | 'weight_logged'
  | 'goal_completed'
  | 'milestone_completed'
  | 'new_client_signup'
  | 'session_scheduled'
  | 'checkin_scheduled'
  | 'weekly_survey_submitted'
  | 'subscription_canceled'
  | 'session_purchased'
  | 'session_canceled'
  | 'session_rescheduled'
  | 'progress_photo_uploaded'
  | 'client_message_received'
  | 'daily_habits_completed'
  | 'cardio_session_logged'
  // Admin-broadcast (owner) events — see docs/02-implementation/admin-notifications/
  | 'new_inquiry'
  | 'new_pending_signup'
  | 'new_client_activated'
  | 'new_session_purchase';


// ============================================================
// Core Activity Feed Event
// ============================================================

export interface ActivityFeedEvent {
  id: string;                     // Firestore auto-generated document ID
  type: ActivityEventType;        // Event type key
  clientId: string;               // The client who performed the action
  clientName: string;             // Denormalized for display (avoids joins)
  trainerId: string;              // Client's assigned trainer at time of event

  // Display
  message: string;                // Human-readable summary
  timestamp: Date;                // When the event occurred (converted from Firestore Timestamp)

  // Event-specific data
  metadata: ActivityEventMetadata;

  // State
  read: boolean;                  // Has trainer seen this? (default: false)

  // Audience: 'trainer' (client-action events, default) | 'admin' (owner-directed
  // business events). See docs/02-implementation/admin-notifications/.
  audience?: 'trainer' | 'admin';

  // TTL
  expiresAt: Date;                // timestamp + 7 days (for scheduled cleanup)
}

// Raw Firestore document (before Date conversion)
export interface ActivityFeedEventDoc {
  type: ActivityEventType;
  audience?: 'trainer' | 'admin';
  clientId: string;
  clientName: string;
  trainerId: string;
  message: string;
  timestamp: Timestamp;
  metadata: ActivityEventMetadata;
  read: boolean;
  expiresAt: Timestamp;
}


// ============================================================
// Event-Specific Metadata Types
// ============================================================

export type ActivityEventMetadata =
  | ClientLoginMetadata
  | WorkoutCompletedMetadata
  | NutritionDayCompletedMetadata
  | DailyActivitiesCompletedMetadata
  | WeightLoggedMetadata
  | GoalCompletedMetadata
  | MilestoneCompletedMetadata
  | NewClientSignupMetadata
  | SessionScheduledMetadata
  | CheckinScheduledMetadata
  | WeeklySurveySubmittedMetadata
  | SubscriptionCanceledMetadata
  | SessionPurchasedMetadata
  | SessionCanceledMetadata
  | SessionRescheduledMetadata
  | Record<string, never>; // Empty metadata fallback

export interface ClientLoginMetadata {
  // No additional metadata needed — message is sufficient
}

export interface WorkoutCompletedMetadata {
  workoutId: string;
  workoutName: string;
}

export interface NutritionDayCompletedMetadata {
  date: string; // YYYY-MM-DD
}

export interface DailyActivitiesCompletedMetadata {
  date: string; // YYYY-MM-DD
  habitsCompleted: number;
}

export interface WeightLoggedMetadata {
  weight: number;
  unit: string;
  previousWeight?: number;
  changeAmount?: number;
}

export interface GoalCompletedMetadata {
  goalId: string;
  goalTitle: string;
  goalCategory: string;
}

export interface MilestoneCompletedMetadata {
  goalId: string;
  goalTitle: string;
  milestoneText: string;
}

export interface NewClientSignupMetadata {
  tierName?: string;
}

export interface SessionScheduledMetadata {
  sessionId: string;
  sessionDate: string;
  sessionType: string;
}

export interface CheckinScheduledMetadata {
  sessionId: string;
  checkinDate: string;
}

export interface WeeklySurveySubmittedMetadata {
  weekStartDate: string;
}

export interface SubscriptionCanceledMetadata {
  subscriptionId?: string;
  accessUntil?: string;
}

export interface SessionPurchasedMetadata {
  packageQuantity: number;
  amount: number;
}

export interface SessionCanceledMetadata {
  sessionId: string;
  sessionDate: string;
  cancelReason?: string;
}

export interface SessionRescheduledMetadata {
  sessionId: string;
  oldDate: string;
  newDate: string;
}

// ============================================================
// UI Display Constants
// ============================================================

export const ACTIVITY_EVENT_ICONS: Record<ActivityEventType, string> = {
  client_login: '🔵',
  workout_completed: '💪',
  nutrition_day_completed: '🥗',
  daily_activities_completed: '✅',
  weight_logged: '⚖️',
  goal_completed: '🏆',
  milestone_completed: '🎯',
  new_client_signup: '🎉',
  session_scheduled: '📅',
  checkin_scheduled: '📋',
  weekly_survey_submitted: '📝',
  subscription_canceled: '❌',
  session_purchased: '💳',
  session_canceled: '🚫',
  session_rescheduled: '🔄',
  progress_photo_uploaded: '📸',
  client_message_received: '💬',
  daily_habits_completed: '✅',
  cardio_session_logged: '❤️',
  // Admin-broadcast (owner) events
  new_inquiry: '📨',
  new_pending_signup: '📝',
  new_client_activated: '🎉',
  new_session_purchase: '💳',
};


export const ACTIVITY_EVENT_LABELS: Record<ActivityEventType, string> = {
  client_login: 'Logged In',
  workout_completed: 'Completed Workout',
  nutrition_day_completed: 'Completed Nutrition',
  daily_activities_completed: 'Completed Daily Activities',
  weight_logged: 'Logged Weight',
  goal_completed: 'Hit a Goal',
  milestone_completed: 'Reached Milestone',
  new_client_signup: 'New Client',
  session_scheduled: 'Scheduled Session',
  checkin_scheduled: 'Scheduled Check-in',
  weekly_survey_submitted: 'Submitted Check-in Survey',
  subscription_canceled: 'Canceled Subscription',
  session_purchased: 'Purchased Session Pack',
  session_canceled: 'Canceled Session',
  session_rescheduled: 'Rescheduled Session',
  progress_photo_uploaded: 'Uploaded Progress Photo',
  client_message_received: 'Sent Message',
  daily_habits_completed: 'Completed Daily Habits',
  cardio_session_logged: 'Logged Cardio Session',
  // Admin-broadcast (owner) events
  new_inquiry: 'New Inquiry',
  new_pending_signup: 'Pending Signup',
  new_client_activated: 'New Client',
  new_session_purchase: 'New Purchase',
};

// Filter categories for the UI filter pills
export const ACTIVITY_FILTER_CATEGORIES = [
  { key: 'all', label: 'All', types: null },
  { key: 'workouts', label: 'Workouts', types: ['workout_completed'] as ActivityEventType[] },
  { key: 'nutrition', label: 'Nutrition', types: ['nutrition_day_completed'] as ActivityEventType[] },
  { key: 'activities', label: 'Activities', types: ['daily_activities_completed', 'weight_logged'] as ActivityEventType[] },
  { key: 'goals', label: 'Goals', types: ['goal_completed', 'milestone_completed'] as ActivityEventType[] },
  { key: 'sessions', label: 'Sessions', types: ['session_scheduled', 'checkin_scheduled', 'session_canceled', 'session_rescheduled', 'session_purchased'] as ActivityEventType[] },
  { key: 'logins', label: 'Logins', types: ['client_login'] as ActivityEventType[] },
  { key: 'account', label: 'Account', types: ['new_client_signup', 'subscription_canceled', 'weekly_survey_submitted'] as ActivityEventType[] },
  { key: 'admin', label: 'Owner', types: ['new_inquiry', 'new_pending_signup', 'new_client_activated', 'new_session_purchase'] as ActivityEventType[] },
] as const;


