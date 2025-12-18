# Workout Execution Tracking System

## Overview
This document defines the comprehensive tracking system for workout execution in the Shreyas Method Fitness platform. The system enables granular tracking of exercise completion for online training scenarios where trainers need detailed performance data.

## Design Principles

1. **Granular When Needed**: Track at the appropriate level for each exercise type
2. **Low Friction**: Make logging quick and easy for clients
3. **Actionable Insights**: Provide trainers with data they can act on
4. **Partial Completion Support**: Allow and track partial workout completion

## Exercise Type Tracking Levels

### Level 1: Array-Based Tracking (Granular)
**Track per-item completion in arrays**

- **Strength** → Per-set completion + optional actual weight/reps
- **Core Rep-Based** → Per-set completion
- **Core Duration (rounds)** → Per-round completion
- **Cardio Intervals** → Per-interval or per-round completion
- **Balance** → Per-round completion
- **Plyometric** → Per-set completion

### Level 2: Duration Variance
**Track actual vs prescribed duration**

- **Cardio Steady State** → Actual minutes completed
- **Cardio Activity** → Actual minutes completed
- **Core Duration (simple)** → Actual seconds completed
- **Yoga/Pilates** → Actual minutes completed

### Level 3: Metric Variance
**Track actual vs prescribed metric**

- **Cardio Steps** → Actual steps count

### Level 4: Binary Tracking
**Simple done/not done**

- **Flexibility** → Per-stretch binary completion
- **Mobility** → Per-area binary completion

## Data Structures

### WorkoutExecution
```typescript
interface WorkoutExecution {
  id: string;
  workoutAssignmentId: string;
  clientId: string;
  trainerId: string;
  
  startedAt: Date;
  completedAt?: Date;
  durationMinutes: number;
  
  // Overall workout feedback
  overallDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  overallNotes?: string;
  
  // Completion tracking
  completionStatus: 'not_started' | 'in_progress' | 'partial' | 'completed';
  completionPercentage: number; // 0-100, calculated from exercises
  
  // Exercise-by-exercise tracking
  exercises: WorkoutExecutionExercise[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkoutExecutionExercise
```typescript
interface WorkoutExecutionExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  
  // Completion tracking
  completionStatus: 'not_started' | 'partial' | 'completed';
  completionPercentage: number; // 0-100
  
  // What was prescribed
  plannedConfiguration: ExerciseConfigurationType;
  
  // What was actually done
  actualData: ExerciseActualData;
  
  // Exercise-specific notes
  notes?: string;
  deviations?: string[]; // What differed from plan
}
```

### ExerciseActualData (Polymorphic)
```typescript
type ExerciseActualData = 
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

// Strength tracking
interface StrengthActualData {
  type: 'strength';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
    actualWeight?: number;
    actualWeightUnit?: 'lbs' | 'kg';
  }>;
}

// Cardio steady state tracking
interface CardioSteadyStateActualData {
  type: 'cardio_steady_state';
  actualDurationSeconds: number;
  actualPace?: string;
  actualHeartRate?: string;
}

// Cardio intervals tracking
interface CardioIntervalsActualData {
  type: 'cardio_intervals';
  completedRounds: number; // Out of totalRounds
  completedIntervals?: number[]; // Array of completed interval indices
}

// Cardio activity tracking
interface CardioActivityActualData {
  type: 'cardio_activity';
  actualDurationSeconds: number;
}

// Cardio steps tracking
interface CardioStepsActualData {
  type: 'cardio_steps';
  actualSteps: number;
}

// Core rep-based tracking
interface CoreRepBasedActualData {
  type: 'core_rep_based';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
  }>;
}

// Core duration tracking
interface CoreDurationActualData {
  type: 'core_duration';
  // Simple format
  actualDurationSeconds?: number;
  // Rounds format
  completedRounds?: Array<{
    roundNumber: number;
    completed: boolean;
    actualDurationSeconds?: number;
  }>;
}

// Flexibility tracking
interface FlexibilityActualData {
  type: 'flexibility';
  completedStretches: number[]; // Array of completed stretch indices
}

// Balance tracking
interface BalanceActualData {
  type: 'balance';
  completedRounds: Array<{
    roundNumber: number;
    completed: boolean;
  }>;
}

// Mobility tracking
interface MobilityActualData {
  type: 'mobility';
  completedAreas: number[]; // Array of completed area indices
}

// Plyometric tracking
interface PlyometricActualData {
  type: 'plyometric';
  completedSets: Array<{
    setNumber: number;
    completed: boolean;
    actualReps?: number;
  }>;
}

// Yoga/Pilates tracking
interface YogaPilatesActualData {
  type: 'yoga_pilates';
  actualDurationSeconds: number;
}
```

## Completion Calculation Logic

### Exercise-Level Completion

```typescript
function calculateExerciseCompletion(
  planned: ExerciseConfigurationType,
  actual: ExerciseActualData
): number {
  switch (planned.exerciseType) {
    case 'strength':
      const strengthActual = actual as StrengthActualData;
      const totalSets = (planned as StrengthConfiguration).sets.length;
      const completedSets = strengthActual.completedSets.filter(s => s.completed).length;
      return (completedSets / totalSets) * 100;
      
    case 'cardio':
      if ('cardioSubType' in planned) {
        if (planned.cardioSubType === 'steady_state') {
          const steadyActual = actual as CardioSteadyStateActualData;
          const prescribed = (planned as CardioSteadyStateConfiguration).durationSeconds;
          return Math.min((steadyActual.actualDurationSeconds / prescribed) * 100, 100);
        }
        else if (planned.cardioSubType === 'intervals') {
          const intervalsActual = actual as CardioIntervalsActualData;
          const prescribed = (planned as CardioIntervalsConfiguration).totalRounds;
          return (intervalsActual.completedRounds / prescribed) * 100;
        }
        // ... other cardio types
      }
      return 0;
      
    // ... other exercise types
    
    default:
      return 0;
  }
}
```

### Workout-Level Completion

```typescript
function calculateWorkoutCompletion(exercises: WorkoutExecutionExercise[]): number {
  if (exercises.length === 0) return 0;
  
  const totalCompletion = exercises.reduce((sum, ex) => sum + ex.completionPercentage, 0);
  return Math.round(totalCompletion / exercises.length);
}
```

## UI Presentation

### Client View - Workout Card (Collapsed)

```
┌─────────────────────────────────────┐
│ 🏋️ Upper Body Strength             │
│ Mon Dec 16 → Fri Dec 20             │
│                                     │
│ ██████████░░░░ 79% Complete        │
│                                     │
│            [Start Workout ▼]        │
└─────────────────────────────────────┘
```

### Client View - Workout Card (Expanded)

```
┌─────────────────────────────────────────────┐
│ 🏋️ Upper Body Strength                     │
│ Mon Dec 16 → Fri Dec 20                     │
│ ██████████░░░░ 79% Complete                │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                             │
│ 1. Bench Press                        67%  │
│    ☑ Set 1: 185 lbs x 10 reps              │
│    ☑ Set 2: 185 lbs x 8 reps               │
│    ☐ Set 3: ___ lbs x ___ reps             │
│                                             │
│ 2. Squats                            100%  │
│    ☑ Set 1 ☑ Set 2 ☑ Set 3                │
│                                             │
│ 3. Running (30 min)                   50%  │
│    Completed: [15] minutes                  │
│                                             │
│           [Mark Workout Complete]           │
└─────────────────────────────────────────────┘
```

### Trainer View - Client Progress Dashboard

```
┌────────────────────────────────────────────┐
│ 👤 John Doe - This Week's Workouts        │
├────────────────────────────────────────────┤
│                                            │
│ Mon Dec 16: Upper Body        ⚠️ 79% ✓   │
│ Wed Dec 18: Lower Body        ✓ 100% ✓   │
│ Fri Dec 20: Cardio           ⏳ 0%        │
│                                            │
└────────────────────────────────────────────┘
```

### Trainer View - Exercise Detail

```
┌────────────────────────────────────────────┐
│ 👤 John Doe - Upper Body (Mon Dec 16)     │
│ Overall: ⚠️ 79% Complete                  │
├────────────────────────────────────────────┤
│                                            │
│ ⚠️ 1. Bench Press - 2/3 sets (67%)        │
│    ✓ Set 1: 185x10 reps                   │
│    ✓ Set 2: 185x8 reps                    │
│    ✗ Set 3: Skipped                       │
│    💬 "Too heavy, felt strain"            │
│                                            │
│ ✓ 2. Squats - 3/3 sets (100%)             │
│                                            │
│ ⚠️ 3. Running - 15/30 min (50%)           │
│                                            │
│ Workout Rating: 😰 Hard                    │
│                                            │
└────────────────────────────────────────────┘
```

## Status Indicators

- ✓ **100%** = Green checkmark (fully complete)
- ⚠️ **1-99%** = Yellow warning (partial completion)
- ⏳ **0%** = Gray hourglass (not started)

## Implementation Phases

### Phase 1: Core Data Structures
- Add WorkoutExecution and WorkoutExecutionExercise types
- Create completion calculation utilities
- Update Firestore schema

### Phase 2: Client UI - Input Mode
- Build set/round/duration tracker components
- Add real-time completion % calculation
- Implement progress bar display

### Phase 3: Client UI - Completion Flow
- Add "Mark Complete" dialog with difficulty/notes
- Save execution data to Firestore
- Handle partial completion gracefully

### Phase 4: Trainer UI - Progress View
- Build client progress dashboard
- Add drill-down exercise detail view
- Show completion status indicators

### Phase 5: Cloud Functions
- Atomic workout execution persistence
- Completion percentage calculations
- Notification triggers for trainers

## Industry Best Practices Applied

1. **Trainerize Pattern**: Set-by-set tracking with optional detailed inputs
2. **Future Pattern**: Real-time progress updates as client logs
3. **Hevy Pattern**: Visual progress bars and completion indicators
4. **TrueCoach Pattern**: Exercise-specific notes and deviations tracking

## Next Steps

1. Implement types in `app/src/types/workout.ts`
2. Create calculation utilities in `app/src/lib/workout-utils.ts`
3. Build tracker UI components in `app/src/components/workouts/`
4. Add Firestore cloud functions for persistence
5. Build trainer progress dashboard views
