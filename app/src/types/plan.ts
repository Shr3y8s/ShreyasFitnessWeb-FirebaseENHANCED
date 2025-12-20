// TypeScript types for client training plans

export interface VisionGoal {
  text: string;
}

export interface VisionData {
  goals: VisionGoal[];
  lastUpdated: Date | null;
}

export interface StepGoalData {
  target: number;
  tips: string[];
  lastUpdated: Date | null;
}

export interface LissCardioData {
  frequency: string;
  duration: string;
  targetHeartRate: string;
  timing: string;
  lastUpdated: Date | null;
}

export interface WeeklyFocusData {
  weekStartDate: string; // ISO date string for the Sunday (YYYY-MM-DD)
  adjustments: string[];
  priorities: string[];
  coachNotes: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface WeeklyFocusHistory {
  weeks: WeeklyFocusData[]; // Array of up to 4 weeks
  lastUpdated: Date | null;
}

export interface DailyHabit {
  id: string;
  title: string;
  description: string;
  iconType: 'activity' | 'dumbbell' | 'nutrition' | 'hydration' | 'sleep' | 'custom';
  customIconUrl?: string;
  order: number;
}

export interface DailyHabitsData {
  habits: DailyHabit[];
  lastUpdated: Date | null;
}

export interface ClientPlan {
  id?: string;
  clientId: string;
  trainerId: string;
  
  vision: VisionData | null;
  stepGoal: StepGoalData | null;
  lissCardio: LissCardioData | null;
  weeklyFocus: WeeklyFocusHistory | null;
  dailyHabits: DailyHabitsData | null;
  
  createdAt: Date | null;
  updatedAt: Date | null;
}

// Template types for vision goals
export interface VisionTemplate {
  id: string;
  name: string;
  description: string;
  defaultGoals: string[];
}

export const VISION_TEMPLATES: VisionTemplate[] = [
  {
    id: 'weight-loss',
    name: 'Weight Loss',
    description: 'Goals focused on losing weight and building confidence',
    defaultGoals: [
      'Lose [X] pounds and feel confident in my body',
      'Build sustainable, lifelong fitness habits',
      'Have more energy throughout the day'
    ]
  },
  {
    id: 'muscle-building',
    name: 'Muscle Building',
    description: 'Goals focused on building strength and muscle mass',
    defaultGoals: [
      'Build [X] pounds of lean muscle',
      'Increase strength on all major lifts',
      'Develop a more athletic, muscular physique'
    ]
  },
  {
    id: 'athletic-performance',
    name: 'Athletic Performance',
    description: 'Goals focused on improving sports performance',
    defaultGoals: [
      'Improve performance in [sport/activity]',
      'Increase speed, power, and agility',
      'Stay injury-free and train consistently'
    ]
  },
  {
    id: 'health-wellness',
    name: 'Health & Wellness',
    description: 'Goals focused on overall health and well-being',
    defaultGoals: [
      'Improve overall health and reduce health risks',
      'Build consistent exercise habits',
      'Feel better physically and mentally'
    ]
  },
  {
    id: 'energy-vitality',
    name: 'Energy & Vitality',
    description: 'Goals focused on increasing energy and vitality',
    defaultGoals: [
      'Have energy to keep up with my kids/family',
      'Wake up feeling refreshed and energized',
      'Reduce stress and improve mental clarity'
    ]
  },
  {
    id: 'custom',
    name: 'Custom Goals',
    description: 'Create your own personalized goals',
    defaultGoals: [
      '',
      '',
      ''
    ]
  }
];

// Default tips for step goal
export const DEFAULT_STEP_TIPS = [
  'Break it up throughout the day',
  'Post-meal walks are great for digestion',
  'Try walking meetings or taking the stairs'
];

// Options for LISS Cardio frequency
export const CARDIO_FREQUENCY_OPTIONS = [
  '1x per week',
  '2x per week',
  '3x per week',
  '4x per week',
  '5x per week',
  '6x per week',
  '7x per week'
];

// Options for LISS Cardio timing
export const CARDIO_TIMING_OPTIONS = [
  'Post-workout',
  'Pre-workout',
  'Morning (fasted)',
  'Evening',
  'Flexible'
];
