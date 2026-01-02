// Workout system types

// Phase 2: Separate Exercise Library (Hybrid Model)
export interface Exercise {
  id: string;
  name: string;
  aliases?: string[]; // Alternative names
  category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'balance' | 'mobility' | 'plyometric' | 'yoga_pilates';
  difficulty?: 'beginner' | 'intermediate' | 'advanced'; // NEW: Exercise difficulty level
  description?: string; // Overview of the exercise
  instructions?: string; // General instructions for the exercise
  videoUrl?: string; // Link to demonstration video
  imageUrl?: string; // Link to exercise image/thumbnail
  equipment: string[];
  posture?: string; // standing, seated, prone, supine, kneeling, plank
  primaryMuscles: string[]; // Main muscles worked
  secondaryMuscles?: string[]; // Stabilizer muscles
  muscleGroup: string; // upper_body, lower_body, core, full_body
  movementPattern?: string; // squat, hinge, push, pull, carry, rotation, lunge
  planeOfMotion?: string; // sagittal, frontal, transverse
  gripType?: string; // overhand, underhand, neutral, wide, narrow, mixed
  notes?: string;
  
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

// ============================================================================
// POLYMORPHIC EXERCISE CONFIGURATION SYSTEM (Phase 1: Strength + Cardio)
// ============================================================================

/**
 * Base configuration interface - all exercise configurations extend this
 * The exerciseType field acts as a discriminator for TypeScript type narrowing
 */
export interface ExerciseConfiguration {
  exerciseType: 'strength' | 'cardio' | 'core' | 'flexibility' | 'balance' | 'mobility' | 'plyometric' | 'yoga_pilates';
}

/**
 * Strength Exercise Configuration
 * For weight training exercises with sets, reps, and weight
 */
export interface StrengthConfiguration extends ExerciseConfiguration {
  exerciseType: 'strength';
  armLegType: 'single' | 'double' | 'alternate';
  strengthSubType: 'free_weight' | 'machine' | 'bodyweight' | 'cable' | 'resistance_band';
  sets: Array<{
    setNumber: number;
    setType: 'warm_up' | 'working' | 'drop_set' | 'rest_pause' | 'pyramid' | 'pre_exhaustion' | 'cluster' | 'to_failure';
    targetReps: number | string;  // Can be a number (8), string range ("8-12"), or "AMRAP"
    repsRange?: { min: number; max: number };
    weight: number;
    weightUnit: 'lbs' | 'kg';
    restSeconds: number;
    rpeTarget?: number;  // Rate of Perceived Exertion (1-10)
    rirTarget?: number;  // Reps In Reserve
    notes?: string;
  }>;
  trackableFields: string[];
  progressionScheme?: 'linear' | 'double_progression' | 'percentage_based';
}

/**
 * Cardio Steady State Configuration
 * For continuous cardio exercises at a steady pace
 */
export interface CardioSteadyStateConfiguration extends ExerciseConfiguration {
  exerciseType: 'cardio';
  cardioSubType: 'steady_state';
  machineType: 'treadmill' | 'stationary_bike' | 'recumbent_bike' | 'rowing_machine' | 
                'elliptical' | 'stair_climber' | 'air_bike' | 'skierg' | 'vertical_climber';
  durationSeconds: number;
  targetPace: string;  // e.g., "6.0 mph", "2:00 per 500m" - Optional, defaults to empty
  targetHeartRate?: string;  // e.g., "125", "120-130", "140-150" - Primary metric
  heartRateZone?: 'z1' | 'z2' | 'z3' | 'z4' | 'z5';
  notes?: string;
}

/**
 * Cardio Intervals Configuration
 * For HIIT and interval-based cardio training
 */
export interface CardioIntervalsConfiguration extends ExerciseConfiguration {
  exerciseType: 'cardio';
  cardioSubType: 'intervals';
  machineType: 'treadmill' | 'stationary_bike' | 'air_bike' | 'rowing_machine' | 'ski_erg' | 'none';
  intervals: Array<{
    intervalNumber: number;
    type: 'work' | 'rest' | 'recovery';
    durationSeconds: number;
    intensity: 'light' | 'moderate' | 'high';
    targetPace?: string;
    targetHeartRate?: number;
    notes?: string;
  }>;
  totalRounds: number;
  restBetweenRounds?: number;
  notes?: string;
}

/**
 * Core Rep-Based Configuration
 * For core exercises measured by reps (crunches, leg raises)
 */
export interface CoreRepBasedConfiguration extends ExerciseConfiguration {
  exerciseType: 'core';
  coreSubType: 'rep_based';
  sets: Array<{
    setNumber: number;
    targetReps: number;
    restSeconds: number;
    notes?: string;
  }>;
  trackableFields: string[];
}

/**
 * Core Duration-Based Configuration
 * For core exercises measured by time (plank, hollow hold)
 * Supports two formats: simple duration OR rounds array
 */
export interface CoreDurationBasedConfiguration extends ExerciseConfiguration {
  exerciseType: 'core';
  coreSubType: 'duration_based';
  // Simple format: just a single duration
  durationSeconds?: number;
  // Complex format: multiple rounds
  rounds?: Array<{
    roundNumber: number;
    durationSeconds: number;
    restSeconds?: number;
    intensity?: 'light' | 'moderate' | 'high';
    notes?: string;
  }>;
  trackableFields: string[];
}

/**
 * Cardio Activity-Based Configuration
 * For free-form activities (basketball, tennis, running outdoors, hiking)
 */
export interface CardioActivityBasedConfiguration extends ExerciseConfiguration {
  exerciseType: 'cardio';
  cardioSubType: 'activity_based';
  activity: 'walking' | 'running' | 'hiking' | 'basketball' | 'tennis' | 'soccer' | 'climbing' | 'swimming' | 'other';
  durationSeconds: number;
  intensity: 'light' | 'moderate' | 'high';
  targetHeartRate?: number;
  notes?: string;
}

/**
 * Cardio Steps-Based Configuration
 * For step/rep-counted cardio (stair climbing, step platform)
 */
export interface CardioStepsBasedConfiguration extends ExerciseConfiguration {
  exerciseType: 'cardio';
  cardioSubType: 'steps_based';
  machineType: 'none' | 'stair_climber' | 'step_platform';
  targetSteps: number;
  pace: 'slow' | 'moderate' | 'fast';
  durationTargetSeconds?: number;
  notes?: string;
}

/**
 * Flexibility Configuration
 * For stretching and flexibility work
 */
export interface FlexibilityConfiguration extends ExerciseConfiguration {
  exerciseType: 'flexibility';
  armLegType: 'single' | 'double' | 'alternate';
  flexibilitySubType: 'static_stretch' | 'dynamic_stretch' | 'pnf';
  stretches: Array<{
    stretchNumber: number;
    targetMuscles: string[];  // Multiple muscles per stretch (realistic!)
    primaryMuscle?: string;   // Optional: main focus muscle
    durationSeconds: number;
    reps?: number;  // For PNF
    notes?: string;
  }>;
  totalDurationSeconds: number;
  intensity: 'light' | 'moderate';
  notes?: string;
}

/**
 * Balance Configuration
 * For balance and proprioceptive training
 */
export interface BalanceConfiguration extends ExerciseConfiguration {
  exerciseType: 'balance';
  balanceSubType: 'bodyweight' | 'equipment_assisted' | 'unstable_surface';
  equipment?: string;
  rounds: Array<{
    roundNumber: number;
    durationSeconds?: number;
    reps?: number;
    restSeconds?: number;
    intensity?: 'light' | 'moderate' | 'high';
    notes?: string;
  }>;
  trackableFields: string[];
  notes?: string;
}

/**
 * Mobility Configuration
 * For myofascial release and mobility drills (foam rolling, trigger point work)
 */
export interface MobilityConfiguration extends ExerciseConfiguration {
  exerciseType: 'mobility';
  mobilitySubType: 'foam_roll' | 'trigger_point' | 'dynamic_drill';
  equipment: string;
  targetAreas: string[];
  areas: Array<{
    areaNumber: number;
    muscleGroup: string;
    durationSeconds: number;
    intensity?: 'light' | 'moderate' | 'high';
    notes?: string;
  }>;
  totalDurationSeconds: number;
  notes?: string;
}

/**
 * Plyometric Configuration
 * For explosive/ballistic movements (similar to strength but emphasizes power/speed)
 */
export interface PlyometricConfiguration extends ExerciseConfiguration {
  exerciseType: 'plyometric';
  plyometricSubType: 'jumping' | 'throwing' | 'bounding';
  sets: Array<{
    setNumber: number;
    setType: 'warm_up' | 'working' | 'to_failure';
    targetReps: number;
    restSeconds: number;
    intensity?: 'light' | 'moderate' | 'high';
    notes?: string;
  }>;
  trackableFields: string[];
  notes?: string;
}

/**
 * Yoga/Pilates Configuration
 * For yoga flows, Pilates sessions
 */
export interface YogaPilatesConfiguration extends ExerciseConfiguration {
  exerciseType: 'yoga_pilates';
  yogaSubType: 'yoga_flow' | 'yoga_poses' | 'pilates_mat' | 'pilates_reformer';
  style?: string;
  durationSeconds: number;
  intensity: 'light' | 'moderate' | 'high';
  focusAreas?: string[];
  notes?: string;
}

/**
 * Complete Configuration Union Type
 * Includes all 12 exercise configuration types
 */
export type ExerciseConfigurationType = 
  | StrengthConfiguration
  | CardioSteadyStateConfiguration
  | CardioIntervalsConfiguration
  | CardioActivityBasedConfiguration
  | CardioStepsBasedConfiguration
  | CoreRepBasedConfiguration
  | CoreDurationBasedConfiguration
  | FlexibilityConfiguration
  | BalanceConfiguration
  | MobilityConfiguration
  | PlyometricConfiguration
  | YogaPilatesConfiguration;

/**
 * Type guard to check if a configuration is for strength exercises
 */
export function isStrengthConfiguration(config: ExerciseConfiguration): config is StrengthConfiguration {
  return config.exerciseType === 'strength';
}

/**
 * Type guard to check if a configuration is for cardio exercises
 */
export function isCardioConfiguration(config: ExerciseConfiguration): config is CardioSteadyStateConfiguration | CardioIntervalsConfiguration {
  return config.exerciseType === 'cardio';
}

/**
 * Type guard to check if a configuration is for steady state cardio
 */
export function isSteadyStateCardio(config: ExerciseConfiguration): config is CardioSteadyStateConfiguration {
  return config.exerciseType === 'cardio' && 'cardioSubType' in config && config.cardioSubType === 'steady_state';
}

/**
 * Type guard to check if a configuration is for interval cardio
 */
export function isIntervalCardio(config: ExerciseConfiguration): config is CardioIntervalsConfiguration {
  return config.exerciseType === 'cardio' && 'cardioSubType' in config && config.cardioSubType === 'intervals';
}

// ============================================================================
// WORKOUT TEMPLATE STRUCTURES (Phase 2: Enhanced Set-Based Programming)
// ============================================================================

/**
 * WorkoutSet - Individual set prescription within an exercise
 * Defines the target parameters for a single set
 * Note: Renamed from "Set" to avoid conflict with JavaScript's built-in Set class
 */
export interface WorkoutSet {
  type: 'warmup' | 'working';  // Set category: warmup or working
  setNumber: number;           // Sequential set number (1, 2, 3, etc.)
  targetReps: string;          // Target reps - supports ranges ("8-12") or fixed ("10") or "AMRAP"
  targetWeight: string;        // Target weight - "Bodyweight", "185 lbs", or ranges "50-60 lbs"
  intensity: string;           // How hard: "warm-up", "normal", "drop set", "to failure", "heavy set"
  restSeconds: number;         // Rest period after this set in seconds
  rpeTarget?: number;          // Optional Rate of Perceived Exertion (1-10 scale) for auto-regulation
  duration?: number;           // Optional duration in seconds for time-based exercises (planks, cardio intervals, etc.)
}

/**
 * WorkoutTemplateExercise - Exercise reference in a workout template (Blueprint only)
 * Templates now just reference exercises without concrete configuration.
 * Configuration happens at assignment time per client.
 * Exercise order is determined by array position.
 * 
 * Note: Coaching cues should be added at the Exercise level (generic) or 
 * Assignment level (client-specific), not at the template level.
 */
export interface WorkoutTemplateExercise {
  exerciseId: string;          // Reference to Exercise in the exercise library
}

/**
 * WorkoutTemplate - Workout Blueprint (No concrete values)
 * A template is now just a collection of exercise references.
 * Trainers configure sets, reps, weights when assigning to clients.
 */
export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutTemplateExercise[];  // Array of exercise references only (no configuration)
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
  
  tags: string[];
}

// ============================================================================
// WORKOUT ASSIGNMENT (Where Configuration Happens!)
// ============================================================================

/**
 * WorkoutAssignmentExercise - Configured exercise within an assignment
 * This is where the trainer specifies concrete values (sets, reps, weights, etc.)
 * Exercise order is determined by array position (same as template).
 */
export interface WorkoutAssignmentExercise {
  exerciseId: string;
  exerciseName: string;      // Denormalized for display
  exerciseType: 'strength' | 'cardio' | 'core' | 'flexibility' | 'balance' | 'mobility' | 'plyometric' | 'yoga_pilates';
  configuration: ExerciseConfigurationType;  // Polymorphic configuration based on exercise type
  notes?: string;            // Assignment-specific coaching cues
}

/**
 * WorkoutAssignment - Instance of a workout assigned to a specific client
 * Contains actual configured parameters for that client (sets, reps, weights, etc.)
 * This is what gets saved to Firestore when a trainer assigns a workout.
 * Assignments ALWAYS reference a template - no custom workouts.
 */
export interface WorkoutAssignment {
  id: string;
  workoutTemplateId: string;  // Required - every assignment comes from a template
  clientId: string;
  trainerId: string;
  
  name: string;                // Can differ from template name
  // Note: Description comes from template, not stored here
  scheduledDate: string;       // ISO 8601 date (YYYY-MM-DD)
  assignedAt: Date;            // When trainer assigned this workout
  dueDate?: string;            // Optional due date (YYYY-MM-DD)
  
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  completionPercentage: number;  // 0-100, calculated based on exercises completed
  completedAt?: Date;          // When client marked assignment as complete
  
  exercises: WorkoutAssignmentExercise[];  // Configured exercises with concrete values (array position = order)
  
  notes?: string;              // Trainer notes for this assignment
  updatedAt: Date;             // Last modification timestamp
}

// ============================================================================
// WORKOUT EXECUTION TRACKING (Actual Performance Data)
// ============================================================================

/**
 * WorkoutExecution - Records actual client performance of an assigned workout
 * This is the "what actually happened" data structure
 */
export interface WorkoutExecution {
  id: string;
  workoutAssignmentId: string;  // Reference to the assignment
  clientId: string;
  trainerId: string;
  
  startedAt: Date;              // When client started the workout
  completedAt?: Date;           // When client completed (null if incomplete)
  durationMinutes: number;      // Actual duration
  
  // Overall workout feedback
  overallDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  overallNotes?: string;        // Client's overall workout notes
  
  // Completion tracking
  completionStatus: 'not_started' | 'in_progress' | 'partial' | 'completed';
  completionPercentage: number; // 0-100, calculated from exercises
  
  // Exercise-by-exercise actual performance
  exercises: WorkoutExecutionExercise[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * WorkoutExecutionExercise - Records actual performance for an exercise
 * Contains both planned configuration and actual results
 */
export interface WorkoutExecutionExercise {
  exerciseId: string;
  exerciseName: string;      // Denormalized for display
  exerciseType: 'strength' | 'cardio' | 'core' | 'flexibility' | 'balance' | 'mobility' | 'plyometric' | 'yoga_pilates';
  
  // Completion tracking
  completionStatus: 'not_started' | 'partial' | 'completed';
  completionPercentage: number;  // 0-100
  
  // What was prescribed
  plannedConfiguration: ExerciseConfigurationType;
  
  // What was actually done
  actualData: ExerciseActualData;
  
  // Exercise-specific notes
  notes?: string;
  deviations?: string[];     // Array of notes about what differed from plan
}

/**
 * ExerciseActualData - Polymorphic union of all actual performance data types
 */
export type ExerciseActualData = 
  | StrengthActualData
  | CardioSteadyStateActualData
  | CardioIntervalsActualData
  | CardioActivityActualData
  | CardioStepsActualData
  | CoreRepBasedActualData
  | CoreDurationActualData
  | FlexibilityActualData
  | BalanceActualData
  | MobilityActualData
  | PlyometricActualData
  | YogaPilatesActualData;

/**
 * Strength Exercise - Actual Performance
 * Tracks set-by-set completion with optional actual weight/reps
 */
export interface StrengthActualData {
  type: 'strength';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
    actualWeight?: number;
    actualWeightUnit?: 'lbs' | 'kg';
    notes?: string;
  }>;
}

/**
 * Cardio Steady State - Actual Performance
 * Tracks actual duration and metrics vs prescribed
 */
export interface CardioSteadyStateActualData {
  type: 'cardio_steady_state';
  actualDurationSeconds: number;
  actualPace?: string;
  actualHeartRate?: string;
}

/**
 * Cardio Intervals - Actual Performance
 * Tracks completed rounds and intervals
 */
export interface CardioIntervalsActualData {
  type: 'cardio_intervals';
  completedRounds: number;       // Out of totalRounds
  completedIntervals?: number[]; // Array of completed interval indices
}

/**
 * Cardio Activity - Actual Performance
 * Tracks actual time spent on activity
 */
export interface CardioActivityActualData {
  type: 'cardio_activity';
  actualDurationSeconds: number;
}

/**
 * Cardio Steps - Actual Performance
 * Tracks actual steps completed
 */
export interface CardioStepsActualData {
  type: 'cardio_steps';
  actualSteps: number;
  actualPace?: 'slow' | 'moderate' | 'fast';
}

/**
 * Core Rep-Based - Actual Performance
 * Tracks set-by-set completion
 */
export interface CoreRepBasedActualData {
  type: 'core_rep_based';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
  }>;
}

/**
 * Core Duration - Actual Performance
 * Handles both simple duration and rounds-based format
 */
export interface CoreDurationActualData {
  type: 'core_duration';
  // Simple format: just a single duration
  actualDurationSeconds?: number;
  // Rounds format: multiple rounds
  completedRounds?: Array<{
    roundNumber: number;
    completed: boolean;
    actualDurationSeconds?: number;
  }>;
}

/**
 * Flexibility - Actual Performance
 * Tracks which stretches were completed
 */
export interface FlexibilityActualData {
  type: 'flexibility';
  completedStretches: number[]; // Array of completed stretch indices
}

/**
 * Balance - Actual Performance
 * Tracks round-by-round completion
 */
export interface BalanceActualData {
  type: 'balance';
  completedRounds: Array<{
    roundNumber: number;
    completed: boolean;
    actualDurationSeconds?: number;
    actualReps?: number;
  }>;
}

/**
 * Mobility - Actual Performance
 * Tracks which areas were worked
 */
export interface MobilityActualData {
  type: 'mobility';
  completedAreas: number[]; // Array of completed area indices
}

/**
 * Plyometric - Actual Performance
 * Tracks set-by-set completion
 */
export interface PlyometricActualData {
  type: 'plyometric';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
  }>;
}

/**
 * Yoga/Pilates - Actual Performance
 * Tracks actual session duration
 */
export interface YogaPilatesActualData {
  type: 'yoga_pilates';
  actualDurationSeconds: number;
  actualIntensity?: 'light' | 'moderate' | 'high';
}

// ============================================================================
// DEPRECATED INTERFACES (Legacy - To Be Removed)
// ============================================================================

/**
 * DEPRECATED: Old interfaces kept for reference during migration
 * These will be removed once UI is updated
 */
export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  order: number;
  notes?: string;
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

// Flat list of all equipment items
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
  { value: 'core', label: 'Core', color: 'purple' },
  { value: 'flexibility', label: 'Flexibility', color: 'green' },
  { value: 'balance', label: 'Balance', color: 'orange' },
  { value: 'mobility', label: 'Mobility', color: 'cyan' },
  { value: 'plyometric', label: 'Plyometric', color: 'yellow' },
  { value: 'yoga_pilates', label: 'Yoga/Pilates', color: 'pink' }
] as const;

// Set defaults and options
export const DEFAULT_SET_VALUES = {
  targetReps: '8-12',
  targetWeight: 'AHAP',
  restSeconds: 60
} as const;

export const INTENSITY_OPTIONS = [
  { value: 'warm-up', label: 'Warm-up' },
  { value: 'normal', label: 'Normal' },
  { value: 'drop set', label: 'Drop Set' },
  { value: 'to failure', label: 'To Failure' },
  { value: 'heavy set', label: 'Heavy Set' },
  { value: 'custom', label: 'Custom...' }
] as const;

export const SET_TYPE_OPTIONS = [
  { value: 'warmup', label: 'Warmup' },
  { value: 'working', label: 'Working' }
] as const;

/**
 * Create default sets for a new exercise
 * Returns: 1 warmup set + 2 working sets with default values
 */
export const createDefaultSets = (): WorkoutSet[] => [
  {
    type: 'warmup',
    setNumber: 1,
    targetReps: DEFAULT_SET_VALUES.targetReps,
    targetWeight: DEFAULT_SET_VALUES.targetWeight,
    intensity: 'warm-up',
    restSeconds: DEFAULT_SET_VALUES.restSeconds
  },
  {
    type: 'working',
    setNumber: 2,
    targetReps: DEFAULT_SET_VALUES.targetReps,
    targetWeight: DEFAULT_SET_VALUES.targetWeight,
    intensity: 'normal',
    restSeconds: DEFAULT_SET_VALUES.restSeconds
  },
  {
    type: 'working',
    setNumber: 3,
    targetReps: DEFAULT_SET_VALUES.targetReps,
    targetWeight: DEFAULT_SET_VALUES.targetWeight,
    intensity: 'normal',
    restSeconds: DEFAULT_SET_VALUES.restSeconds
  }
];

/**
 * Create a new empty set with default values
 * @param setNumber - The sequential number for this set
 * @param type - 'warmup' or 'working'
 * @returns A new WorkoutSet object with default values
 */
export const createEmptySet = (setNumber: number, type: 'warmup' | 'working' = 'working'): WorkoutSet => ({
  type,
  setNumber,
  targetReps: DEFAULT_SET_VALUES.targetReps,
  targetWeight: DEFAULT_SET_VALUES.targetWeight,
  intensity: type === 'warmup' ? 'warm-up' : 'normal',
  restSeconds: DEFAULT_SET_VALUES.restSeconds
});

/**
 * Check if a set is time-based (uses duration instead of reps)
 * @param set - The WorkoutSet to check
 * @returns true if the set uses duration, false if it uses reps
 */
export const isTimeBased = (set: WorkoutSet): boolean => {
  return set.duration !== undefined && set.duration > 0;
};

/**
 * Format the set prescription for display
 * Shows either duration or reps based on what's set
 * @param set - The WorkoutSet to format
 * @returns Formatted string like "60 sec" or "8-12 reps"
 */
export const formatSetPrescription = (set: WorkoutSet): string => {
  if (isTimeBased(set)) {
    return `${set.duration} sec`;
  }
  return `${set.targetReps} reps`;
};

/**
 * Format duration in seconds to a human-readable string
 * @param seconds - Duration in seconds
 * @returns Formatted string like "60 sec" or "2 min" or "1:30"
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} sec`;
  } else if (seconds % 60 === 0) {
    return `${seconds / 60} min`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};
