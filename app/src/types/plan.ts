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

export interface WaterGoalData {
  target: number;
  unit: 'oz' | 'liters' | 'cups';
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
  lastCallDate: Date | null; // Date of the last check-in call with client
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

export type TrainingPhase = 'strength' | 'weight_loss' | 'muscle_building';
export type TrainingFocus = 'weekly_split' | 'daily_split' | 'push' | 'pull' | 'legs';
export type CardioType = 'cardio' | 'steps';

export interface TrainingProtocolData {
  keyPriorities: string[];
  trainingPhase?: TrainingPhase;
  trainingFocus?: TrainingFocus;
  assignedDate?: string;        // ISO date string (past or today only)
  planDurationWeeks?: number;   // e.g. 12 — trainer-specified duration
  workoutFrequency?: number;    // e.g. 4 (per week)
  cardioType?: CardioType;
  cardioFrequency?: string;     // e.g. "3" — used when cardioType === 'cardio'
  stepsPerDay?: string;         // e.g. "10000" — used when cardioType === 'steps'
  lastUpdated: Date | null;
}

export type NutritionApproach = 'healthy_habits' | 'macro_tracking' | 'meal_plan';

export type NutritionHabitCategory = 'meals' | 'protein' | 'vegetables' | 'hydration' | 'timing' | 'quality';

export interface NutritionHabit {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide-react icon name
  category: NutritionHabitCategory;
}

export interface NutritionHabitTemplate {
  id: string;
  category: NutritionHabitCategory;
  title: string;
  description: string;
  icon: string;
}

// Predefined nutrition habit templates
export const NUTRITION_HABIT_TEMPLATES: NutritionHabitTemplate[] = [
  // Meal Frequency
  {
    id: 'meals-3-balanced',
    category: 'meals',
    title: 'Eat 3 balanced meals daily',
    description: 'Breakfast, lunch, and dinner at consistent times',
    icon: 'Utensils'
  },
  {
    id: 'meals-4-5-small',
    category: 'meals',
    title: 'Eat 4-5 smaller meals',
    description: 'Spread throughout the day to boost metabolism',
    icon: 'Utensils'
  },
  {
    id: 'meals-flexible',
    category: 'meals',
    title: '2-3 main meals + healthy snacks',
    description: 'Flexible eating schedule with nutrient-dense snacks',
    icon: 'Utensils'
  },
  
  // Protein
  {
    id: 'protein-30g-meal',
    category: 'protein',
    title: '30g protein per meal',
    description: 'Aim for at least 30 grams of protein at each main meal',
    icon: 'Drumstick'
  },
  {
    id: 'protein-palm-size',
    category: 'protein',
    title: 'Palm-sized protein portion',
    description: 'Use your palm as a guide for protein serving size',
    icon: 'Drumstick'
  },
  {
    id: 'protein-every-meal',
    category: 'protein',
    title: 'Protein with every meal',
    description: 'Include a quality protein source in every meal and snack',
    icon: 'Drumstick'
  },
  {
    id: 'protein-post-workout',
    category: 'protein',
    title: 'Protein shake after training',
    description: '20-30g protein within 2 hours post-workout',
    icon: 'Drumstick'
  },
  
  // Vegetables
  {
    id: 'veggies-half-plate',
    category: 'vegetables',
    title: 'Fill half your plate with vegetables',
    description: 'At lunch and dinner, make veggies 50% of your plate',
    icon: 'Salad'
  },
  {
    id: 'veggies-rainbow',
    category: 'vegetables',
    title: 'Eat the rainbow daily',
    description: 'Include vegetables of different colors each day',
    icon: 'Salad'
  },
  {
    id: 'veggies-two-servings',
    category: 'vegetables',
    title: '2 servings vegetables per meal',
    description: 'Aim for at least 2 servings of vegetables at main meals',
    icon: 'Salad'
  },
  {
    id: 'veggies-green',
    category: 'vegetables',
    title: 'Green vegetable with every meal',
    description: 'Include leafy greens or green vegetables daily',
    icon: 'Salad'
  },
  
  // Hydration
  {
    id: 'water-8-glasses',
    category: 'hydration',
    title: 'Drink 8 glasses of water daily',
    description: 'Aim for 64oz (8 cups) of water throughout the day',
    icon: 'Droplet'
  },
  {
    id: 'water-before-meals',
    category: 'hydration',
    title: 'Drink water before each meal',
    description: '16oz of water 10-15 minutes before eating',
    icon: 'Droplet'
  },
  {
    id: 'water-gallon',
    category: 'hydration',
    title: '1 gallon of water daily',
    description: 'Target 128oz (1 gallon) for optimal hydration',
    icon: 'Droplet'
  },
  {
    id: 'water-morning',
    category: 'hydration',
    title: 'Water first thing in morning',
    description: 'Start your day with 16oz of water upon waking',
    icon: 'Droplet'
  },
  
  // Meal Timing
  {
    id: 'timing-breakfast-hour',
    category: 'timing',
    title: 'Eat within 1 hour of waking',
    description: 'Kickstart your metabolism with an early breakfast',
    icon: 'Clock'
  },
  {
    id: 'timing-stop-before-bed',
    category: 'timing',
    title: 'Stop eating 3 hours before bed',
    description: 'Allow time for digestion before sleep',
    icon: 'Clock'
  },
  {
    id: 'timing-pre-workout',
    category: 'timing',
    title: 'Pre-workout meal 1-2 hours before',
    description: 'Fuel your training with proper timing',
    icon: 'Clock'
  },
  {
    id: 'timing-post-workout',
    category: 'timing',
    title: 'Post-workout meal within 2 hours',
    description: 'Optimize recovery with timely nutrition',
    icon: 'Clock'
  },
  
  // Food Quality
  {
    id: 'quality-whole-foods',
    category: 'quality',
    title: 'Choose whole foods over processed',
    description: 'Prioritize minimally processed, nutrient-dense foods',
    icon: 'Leaf'
  },
  {
    id: 'quality-home-cooked',
    category: 'quality',
    title: 'Cook meals at home 80% of time',
    description: 'Control ingredients and portion sizes by cooking',
    icon: 'Leaf'
  },
  {
    id: 'quality-read-labels',
    category: 'quality',
    title: 'Read ingredient labels',
    description: 'Be aware of what goes into your food',
    icon: 'Leaf'
  },
  {
    id: 'quality-minimize-sugar',
    category: 'quality',
    title: 'Minimize added sugars',
    description: 'Limit foods with added sugars and sweeteners',
    icon: 'Leaf'
  }
];

// Category metadata for UI display
export const HABIT_CATEGORY_INFO = {
  meals: { label: 'Meal Frequency', color: 'bg-blue-500', icon: 'Utensils' },
  protein: { label: 'Protein', color: 'bg-red-500', icon: 'Drumstick' },
  vegetables: { label: 'Vegetables', color: 'bg-green-500', icon: 'Salad' },
  hydration: { label: 'Hydration', color: 'bg-cyan-500', icon: 'Droplet' },
  timing: { label: 'Meal Timing', color: 'bg-purple-500', icon: 'Clock' },
  quality: { label: 'Food Quality', color: 'bg-emerald-500', icon: 'Leaf' }
};

export interface HealthyHabitsData {
  habits: NutritionHabit[];
}

export interface MacroTrackingData {
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  mealTiming?: string[];
  guidelines?: string[];
}

export interface MealPlanData {
  // Future: meal plan structure
  notes?: string;
}

export interface NutritionProtocolData {
  approach: NutritionApproach;
  healthyHabits?: HealthyHabitsData;
  macroTracking?: MacroTrackingData;
  mealPlan?: MealPlanData;
  lastUpdated: Date | null;
}

export interface ClientPlan {
  id?: string;
  clientId: string;
  trainerId: string;
  
  vision: VisionData | null;
  stepGoal: StepGoalData | null;
  waterGoal: WaterGoalData | null;
  lissCardio: LissCardioData | null;
  weeklyFocus: WeeklyFocusHistory | null;
  dailyHabits: DailyHabitsData | null;
  trainingProtocol: TrainingProtocolData | null;
  nutritionProtocol: NutritionProtocolData | null;
  
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

// Default tips for water goal
export const DEFAULT_WATER_TIPS = [
  'Carry a reusable water bottle with you',
  'Drink a glass of water before each meal',
  'Set reminders on your phone throughout the day',
  'Add lemon or cucumber for flavor',
  'Start your morning with a glass of water'
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
