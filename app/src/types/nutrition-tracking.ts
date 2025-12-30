// TypeScript types for trainer nutrition tracking views

import { Timestamp } from 'firebase/firestore';

// Daily macro log structure
export interface MealLog {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

export interface DailyMacroLog {
  date: string; // "YYYY-MM-DD"
  meals: {
    breakfast?: MealLog;
    lunch?: MealLog;
    snack?: MealLog;
    dinner?: MealLog;
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  adherencePercentage: number;
  mealsCompleted: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Daily habits log structure
export interface DailyHabitsLog {
  date: string; // "YYYY-MM-DD"
  habits: {
    [habitId: string]: boolean; // true if completed
  };
  completionCount: number;
  totalHabits: number;
  completionPercentage: number;
  streak: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Water intake from daily activities
export interface DailyWaterLog {
  date: string;
  water: number; // liters
}

// Nutrition goals from client plan
export interface NutritionGoals {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

// Date range types
export type DateRangePreset = 'today' | 'week' | 'month' | '30days' | 'custom';

export interface DateRange {
  start: string; // "YYYY-MM-DD"
  end: string; // "YYYY-MM-DD"
}

// Adherence color coding
export type AdherenceLevel = 'green' | 'yellow' | 'red';

export function getAdherenceLevel(percentage: number): AdherenceLevel {
  if (percentage >= 90) return 'green';
  if (percentage >= 70) return 'yellow';
  return 'red';
}

export function getAdherenceColor(level: AdherenceLevel): string {
  switch (level) {
    case 'green':
      return 'bg-green-500';
    case 'yellow':
      return 'bg-yellow-500';
    case 'red':
      return 'bg-red-500';
  }
}

export function getAdherenceTextColor(level: AdherenceLevel): string {
  switch (level) {
    case 'green':
      return 'text-green-700';
    case 'yellow':
      return 'text-yellow-700';
    case 'red':
      return 'text-red-700';
  }
}

export function getAdherenceBgColor(level: AdherenceLevel): string {
  switch (level) {
    case 'green':
      return 'bg-green-50';
    case 'yellow':
      return 'bg-yellow-50';
    case 'red':
      return 'bg-red-50';
  }
}

export function getAdherenceBorderColor(level: AdherenceLevel): string {
  switch (level) {
    case 'green':
      return 'border-green-300';
    case 'yellow':
      return 'border-yellow-300';
    case 'red':
      return 'border-red-300';
  }
}

// Calendar day data for display
export interface CalendarDayData {
  date: string; // "YYYY-MM-DD"
  adherencePercentage: number;
  level: AdherenceLevel;
  hasData: boolean;
  // For macro tracking
  mealsCompleted?: number;
  totalMeals?: number;
  // For habits
  habitsCompleted?: number;
  totalHabits?: number;
}

// Insights types
export type InsightType = 'success' | 'warning' | 'alert';

export interface NutritionInsight {
  type: InsightType;
  icon: string;
  title: string;
  description: string;
}

// Screenshot data
export interface NutritionScreenshot {
  id: string;
  url: string;
  uploadDate: Timestamp;
  captureDate?: string;
  source?: string; // e.g., "MyFitnessPal", "Cronometer"
  metadata?: {
    width: number;
    height: number;
    size: number;
  };
}
