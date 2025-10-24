// Workout system types

// Phase 2: Separate Exercise Library
export interface Exercise {
  id: string;
  name: string;
  instructions: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
  targetMuscleGroups: string[];
  equipment: string[];
  notes?: string;
  mediaUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
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
  createdBy: string; // trainer ID
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
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
  isPublic: boolean;
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

export const EQUIPMENT_OPTIONS = [
  'None (Bodyweight)',
  'Dumbbells',
  'Barbells',
  'Resistance Bands',
  'Kettlebells',
  'Pull-up Bar',
  'Bench',
  'Cable Machine',
  'Treadmill',
  'Stationary Bike',
  'Rowing Machine',
  'Medicine Ball',
  'Stability Ball',
  'Foam Roller',
  'Yoga Mat',
  'Other'
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
