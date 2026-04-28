// TypeScript types for daily activity tracking

export interface DailyStepsLog {
  date: string; // YYYY-MM-DD format
  steps: number;
  goal: number; // From client's plan
  timestamp: Date;
}

export interface DailyWaterLog {
  date: string; // YYYY-MM-DD format
  amount: number; // Amount consumed
  unit: 'oz' | 'liters' | 'cups';
  goal: number; // From client's plan
  timestamp: Date;
}

export interface DailyHabitLog {
  date: string; // YYYY-MM-DD format
  habitId: string; // Reference to habit from plan
  completed: boolean;
  timestamp: Date;
}

export interface WeightLog {
  date: string; // YYYY-MM-DD format
  weight: number;
  unit: 'lbs' | 'kg';
  bodyFat?: number; // Body fat percentage (0-100)
  height?: number; // Height value
  heightUnit?: 'in' | 'cm'; // Height unit
  bmi?: number; // Calculated BMI
  notes?: string;
  timestamp: Date;
}

// Aggregated daily activity data
export interface DailyActivityData {
  date: string; // YYYY-MM-DD format
  steps?: DailyStepsLog;
  water?: DailyWaterLog;
  habits: DailyHabitLog[]; // Array of habit completions for the day
  weight?: WeightLog;
  cardio?: boolean; // Whether the client completed their LISS cardio session on this day
  updatedAt: Date;
}

// Helper to get today's date in YYYY-MM-DD format
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Helper to format date for display
export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
