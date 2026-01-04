// Goals and Milestones System Types

export type GoalCategory = 
  | 'steps'
  | 'water' 
  | 'nutrition'
  | 'workout_consistency'
  | 'weight_loss'
  | 'strength'
  | 'setup';

export type GoalTerm = 'short-term' | 'long-term';
export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Milestone {
  id: string;
  goalId: string;
  order: number; // Display order: 1, 2, 3...
  text: string;
  targetValue: number; // Numeric threshold for auto-completion
  completed: boolean;
  completedAt?: Date;
  autoTracked: boolean; // true = auto-tracked, false = manual
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  clientId: string;
  trainerId: string;
  
  // Goal Configuration
  title: string;
  category: GoalCategory;
  term: GoalTerm;
  priority: GoalPriority;
  
  // Slot-based flags
  isActive: boolean; // Trainer toggle - only active goals visible to client
  isConfigured: boolean; // Whether this slot has been set up
  
  // Streak-based goals (steps, water, nutrition, workouts)
  dailyTarget?: number; // Daily requirement (10,000 steps, 64 oz, 7 days/week, 3 workouts/week)
  targetStreak?: number; // Consecutive days/weeks goal (3, 5, 7)
  currentStreak?: number; // Current streak progress
  
  // Value-based goals (weight, strength, setup)
  targetValue?: number; // Final target (180 lbs, 225 lbs, 3 tasks)
  currentValue?: number; // Current progress (185 lbs, 200 lbs, 1 task)
  
  unit: string; // "consecutive days", "lbs", "tasks", etc.
  lowerIsBetter: boolean; // true for weight loss goals
  
  // Strength-specific fields
  exerciseId?: string; // For strength goals
  exerciseName?: string;
  
  // Status & Dates
  status: GoalStatus;
  deadline: Date;
  completedAt?: Date;
  
  // Milestones
  milestones?: Milestone[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // trainerId
}

// Category metadata for UI
export const GOAL_CATEGORIES = [
  { 
    value: 'steps' as GoalCategory, 
    label: 'Steps/Activity Habit',
    icon: '👟',
    description: 'Track daily step goals and activity consistency',
    defaultUnit: 'consecutive days',
    autoTracked: true
  },
  { 
    value: 'water' as GoalCategory, 
    label: 'Water/Hydration Habit',
    icon: '💧',
    description: 'Monitor daily water intake goals',
    defaultUnit: 'consecutive days',
    autoTracked: true
  },
  { 
    value: 'nutrition' as GoalCategory, 
    label: 'Nutrition Habit',
    icon: '🥗',
    description: 'Track meal plan adherence and consistency',
    defaultUnit: 'days per week',
    autoTracked: true
  },
  { 
    value: 'workout_consistency' as GoalCategory, 
    label: 'Workout Consistency',
    icon: '💪',
    description: 'Monitor workout completion and frequency',
    defaultUnit: 'consecutive weeks',
    autoTracked: true
  },
  { 
    value: 'weight_loss' as GoalCategory, 
    label: 'Weight Loss',
    icon: '⚖️',
    description: 'Track progress toward target weight',
    defaultUnit: 'lbs',
    autoTracked: true
  },
  { 
    value: 'strength' as GoalCategory, 
    label: 'Strength Goal',
    icon: '🏋️',
    description: 'Track strength progression for specific exercise',
    defaultUnit: 'lbs',
    autoTracked: false // Manually updated by trainer
  },
  { 
    value: 'setup' as GoalCategory, 
    label: 'Setup/Onboarding',
    icon: '📋',
    description: 'Initial setup and onboarding tasks',
    defaultUnit: 'task',
    autoTracked: false
  },
] as const;

// Helper to get category metadata
export function getCategoryMetadata(category: GoalCategory) {
  return GOAL_CATEGORIES.find(c => c.value === category) || GOAL_CATEGORIES[0];
}

// Helper to format progress display
export function formatGoalProgress(goal: Goal): string {
  // Streak-based goals
  if (goal.currentStreak !== undefined && goal.targetStreak !== undefined) {
    return `${goal.currentStreak} / ${goal.targetStreak} ${goal.unit}`;
  }
  
  // Value-based goals
  if (goal.currentValue !== undefined && goal.targetValue !== undefined) {
    if (goal.lowerIsBetter) {
      return `${goal.currentValue} → ${goal.targetValue} ${goal.unit}`;
    }
    return `${goal.currentValue} / ${goal.targetValue} ${goal.unit}`;
  }
  
  return `0 / 0 ${goal.unit}`;
}

// Helper to calculate completion percentage
export function calculateGoalCompletion(goal: Goal): number {
  // Streak-based goals
  if (goal.currentStreak !== undefined && goal.targetStreak !== undefined) {
    if (goal.targetStreak === 0) return 0;
    return Math.min(100, (goal.currentStreak / goal.targetStreak) * 100);
  }
  
  // Value-based goals
  if (goal.currentValue !== undefined && goal.targetValue !== undefined) {
    if (goal.targetValue === 0) return 0;
    
    if (goal.lowerIsBetter) {
      // For weight loss: progress = how much weight lost
      const totalToLose = goal.currentValue - goal.targetValue;
      if (totalToLose <= 0) return 100;
      const progress = ((totalToLose - (goal.currentValue - goal.targetValue)) / totalToLose) * 100;
      return Math.min(100, Math.max(0, progress));
    }
    
    // Normal: higher is better
    return Math.min(100, (goal.currentValue / goal.targetValue) * 100);
  }
  
  return 0;
}
