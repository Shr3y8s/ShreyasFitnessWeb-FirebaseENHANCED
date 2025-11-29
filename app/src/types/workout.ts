// Workout system types

// Phase 2: Separate Exercise Library (Hybrid Model)
export interface Exercise {
  id: string;
  name: string;
  aliases?: string[]; // Alternative names
  category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
  description?: string; // Overview of the exercise
  instructions?: string; // General instructions for the exercise
  videoUrl?: string; // Link to demonstration video
  equipment: string[];
  posture?: string; // standing, seated, prone, supine, kneeling, plank
  primaryMuscles: string[]; // Main muscles worked
  secondaryMuscles?: string[]; // Stabilizer muscles
  muscleGroup: string; // upper_body, lower_body, core, full_body
  movementPattern?: string; // squat, hinge, push, pull, carry, rotation, lunge
  planeOfMotion?: string; // sagittal, frontal, transverse
  armLegType: 'single' | 'double'; // Single or double arm/leg movement
  gripType?: string; // overhand, underhand, neutral, wide, narrow, mixed
  notes?: string;
  mediaUrl?: string;
  
  // Ownership & Attribution (persists even if user deleted)
  createdBy: string; // User ID
  createdByName: string; // Display name - persists forever
  createdAt: Date;
  updatedAt: Date;
  
  // Hybrid Model: Scope determines visibility
  scope: 'personal' | 'company'; // personal = only creator sees, company = all trainers see
  isActive: boolean; // False when trainer leaves or exercise deprecated
  
  // Edit tracking
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedAt?: Date;
  
  // Usage analytics
  usageCount?: number; // Track how often this exercise is used
}

// Exercise reference in workouts (Phase 2)
export interface ExerciseReference {
  exerciseId: string; // Reference to exercise in library
  sets?: number;
  reps?: number;
  duration?: number; // in seconds
  restTime?: number; // in seconds
  weight?: number;
  notes?: string; // Workout-specific notes
  order: number; // Position in workout
}

// For backward compatibility and custom exercises
export interface EmbeddedExercise {
  id: string;
  name: string;
  instructions: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  weight?: number;
  notes?: string;
  mediaUrl?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
  targetMuscleGroups: string[];
  equipment: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: Exercise[];
  estimatedDuration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed';
  targetMuscleGroups: string[];
  equipment: string[];
  
  // Ownership & Attribution (persists even if user deleted)
  createdBy: string; // trainer ID
  createdByName: string; // Display name - persists forever
  createdAt: Date;
  updatedAt: Date;
  
  // Hybrid Model: Scope determines visibility
  scope: 'personal' | 'company'; // personal = only creator sees, company = all trainers see
  isActive: boolean; // False when archived or deprecated
  
  // Edit tracking
  lastEditedBy?: string;
  lastEditedByName?: string;
  lastEditedAt?: Date;
  
  // Usage analytics
  usageCount?: number; // Track how many times this template is assigned
  
  // Legacy field (deprecated - use scope instead)
  isPublic?: boolean;
  tags: string[];
}

export interface AssignedWorkout {
  id: string;
  templateId: string;
  clientId: string;
  trainerId: string;
  assignedDate: Date;
  dueDate: Date;
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue';
  progress: WorkoutProgress;
  notes?: string;
  completedAt?: Date;
}

export interface WorkoutProgress {
  exercisesCompleted: string[]; // Exercise IDs
  totalExercises: number;
  completionPercentage: number;
  timeSpent?: number; // in minutes
  exerciseDetails: ExerciseProgress[];
  startedAt?: Date;
  lastUpdatedAt: Date;
}

export interface ExerciseProgress {
  exerciseId: string;
  completed: boolean;
  setsCompleted: number;
  actualReps?: number[];
  actualWeight?: number[];
  actualDuration?: number;
  notes?: string;
  completedAt?: Date;
}

export interface WorkoutSession {
  id: string;
  assignedWorkoutId: string;
  clientId: string;
  startedAt: Date;
  completedAt?: Date;
  totalDuration?: number; // in minutes
  exercisesSessions: ExerciseSession[];
  notes?: string;
  rating?: number; // 1-5 scale
}

export interface ExerciseSession {
  exerciseId: string;
  sets: SetData[];
  duration?: number;
  notes?: string;
}

export interface SetData {
  reps: number;
  weight?: number;
  duration?: number;
  restTime?: number;
  completedAt: Date;
}

// Client-specific data
export interface ClientWorkoutStats {
  clientId: string;
  totalWorkoutsCompleted: number;
  totalWorkoutsAssigned: number;
  averageCompletionRate: number;
  currentStreak: number;
  longestStreak: number;
  totalTimeSpent: number; // in minutes
  lastWorkoutDate?: Date;
  preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
  preferredCategories: string[];
}

// Form types for UI
export interface CreateWorkoutForm {
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed';
  estimatedDuration: number;
  exercises: CreateExerciseForm[];
  tags: string[];
  scope: 'personal' | 'company'; // Replaced isPublic field
}

export interface CreateExerciseForm {
  name: string;
  instructions: string;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
  targetMuscleGroups: string[];
  equipment: string[];
  notes?: string;
}

export interface AssignWorkoutForm {
  templateId: string;
  clientIds: string[];
  dueDate: Date;
  notes?: string;
}

// Constants
export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Arms',
  'Biceps',
  'Triceps',
  'Core',
  'Abs',
  'Legs',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body'
] as const;

// Categorized equipment for easier selection
export const EQUIPMENT_CATEGORIES = {
  none: {
    label: 'No Equipment',
    items: ['None / Bodyweight']
  },
  freeWeights: {
    label: 'Free Weights',
    items: [
      'Barbell', 'Dumbbell', 'Kettlebell', 'Weight Plates',
      'EZ Curl Bar', 'Trap Bar / Hex Bar', 'Safety Squat Bar',
      'Swiss Bar', 'Medicine Ball', 'Slam Ball', 'Sandbag', 'D-Ball'
    ]
  },
  machinesStrength: {
    label: 'Machines - Strength',
    items: [
      'Cable Machine', 'Cable Crossover Machine', 'Functional Trainer',
      'Smith Machine', 'Lat Pulldown Machine', 'Seated Row Machine',
      'Chest Press Machine', 'Shoulder Press Machine', 'Leg Press Machine',
      'Hack Squat Machine', 'Leg Extension Machine', 'Leg Curl Machine',
      'Calf Raise Machine', 'Hip Abduction Machine', 'Hip Adduction Machine',
      'Glute Machine', 'Pec Deck / Fly Machine', 'Rear Delt Machine',
      'Preacher Curl Bench', 'Tricep Dip Machine', 'Ab Crunch Machine',
      'Rotary Torso Machine', 'Multi-Gym / Home Gym'
    ]
  },
  machinesCardio: {
    label: 'Machines - Cardio',
    items: [
      'Treadmill', 'Elliptical Trainer', 'Stationary Bike',
      'Recumbent Bike', 'Spin Bike / Indoor Cycle', 'Air Bike / Fan Bike',
      'Rowing Machine', 'Stair Climber / Stepmill', 'Stepper',
      'SkiErg', 'Vertical Climber / VersaClimber', 'Arc Trainer / Cross Trainer',
      "Jacob's Ladder"
    ]
  },
  racksBenches: {
    label: 'Racks & Benches',
    items: [
      'Power Rack / Squat Rack', 'Half Rack', 'Squat Stand',
      'Bench (Flat)', 'Bench (Adjustable)', 'Incline Bench',
      'Decline Bench', 'Preacher Curl Bench',
      'Roman Chair / Hyperextension Bench', 'Glute Ham Developer (GHD)',
      'Ab Bench', 'Dumbbell Rack', 'Weight Tree / Plate Rack'
    ]
  },
  bodyweightCalisthenics: {
    label: 'Bodyweight & Calisthenics',
    items: [
      'Pull-Up Bar', 'Dip Station / Dip Bars', 'Push-Up Bars / Handles',
      'Parallettes', 'Gymnastic Rings', 'Suspension Trainer (TRX)',
      'Ab Wheel / Roller', "Captain's Chair"
    ]
  },
  functionalHIIT: {
    label: 'Functional & HIIT',
    items: [
      'Battle Ropes', 'Plyo Box / Jump Box', 'Resistance Bands',
      'Mini Bands / Hip Circle', 'Sled / Prowler', 'Tire',
      'Landmine', 'Agility Ladder', 'Cones', 'Speed Parachute',
      'Weighted Vest', 'Ankle Weights', 'Wrist Weights', 'Weighted Belt / Dip Belt'
    ]
  },
  flexibilityRecovery: {
    label: 'Flexibility & Recovery',
    items: [
      'Yoga Mat', 'Foam Roller', 'Massage Ball / Lacrosse Ball',
      'Stretching Strap', 'Stability Ball / Swiss Ball', 'BOSU Ball',
      'Balance Board / Wobble Board', 'Massage Gun'
    ]
  },
  sportSpecific: {
    label: 'Sport-Specific',
    items: [
      'Boxing Bag / Heavy Bag', 'Speed Bag', 'Jump Rope / Speed Rope',
      'Climbing Wall / Pegboard', 'Finger Trainer / Grip Strengthener',
      'Pilates Reformer', 'Barre', 'Step Platform'
    ]
  }
} as const;

// Flat list of all equipment for backward compatibility
export const EQUIPMENT_OPTIONS = Object.values(EQUIPMENT_CATEGORIES).flatMap(category => category.items);

export const POSTURE_OPTIONS = [
  'Standing',
  'Seated',
  'Prone',
  'Supine',
  'Kneeling',
  'Plank'
] as const;

export const MOVEMENT_PATTERNS = [
  'Squat',
  'Hinge',
  'Push',
  'Pull',
  'Carry',
  'Rotation',
  'Lunge'
] as const;

export const PLANE_OF_MOTION = [
  'Sagittal',
  'Frontal',
  'Transverse'
] as const;

export const MUSCLE_GROUPS_CATEGORIES = [
  'Upper Body',
  'Lower Body',
  'Core',
  'Full Body'
] as const;

export const GRIP_TYPES = [
  'Overhand',
  'Underhand',
  'Neutral',
  'Wide',
  'Narrow',
  'Mixed'
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', color: 'green' },
  { value: 'intermediate', label: 'Intermediate', color: 'yellow' },
  { value: 'advanced', label: 'Advanced', color: 'red' }
] as const;

export const WORKOUT_CATEGORIES = [
  { value: 'strength', label: 'Strength Training', icon: 'dumbbell' },
  { value: 'cardio', label: 'Cardio', icon: 'heart' },
  { value: 'hiit', label: 'HIIT', icon: 'zap' },
  { value: 'flexibility', label: 'Flexibility', icon: 'wind' },
  { value: 'mixed', label: 'Mixed Training', icon: 'activity' }
] as const;

export const EXERCISE_CATEGORIES = [
  { value: 'strength', label: 'Strength', color: 'blue' },
  { value: 'cardio', label: 'Cardio', color: 'red' },
  { value: 'flexibility', label: 'Flexibility', color: 'green' },
  { value: 'core', label: 'Core', color: 'purple' },
  { value: 'other', label: 'Other', color: 'gray' }
] as const;
