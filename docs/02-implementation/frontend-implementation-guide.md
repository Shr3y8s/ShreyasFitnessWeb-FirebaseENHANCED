# Frontend Implementation Guide - Polymorphic Workout System

**Date:** December 4, 2025  
**Status:** Backend Complete - Frontend Implementation Ready  
**Estimated Time:** 14-18 hours

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Priority](#implementation-priority)
3. [Trainer Dashboard](#trainer-dashboard)
4. [Client Dashboard](#client-dashboard)
5. [Shared Components](#shared-components)
6. [API Integration](#api-integration)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### What's Already Complete ✅

**Backend (100%)**
- Type system in `app/src/types/workout.ts`
- Firebase security rules deployed
- Firestore indexes deployed
- 4 Cloud Functions ready to deploy

**What Needs Frontend Work**

**Trainer Dashboard:**
1. Workout template creation (blueprint mode)
2. Workout assignment flow (configure per client)
3. Assignment management dashboard

**Client Dashboard:**
1. View assigned workouts
2. Workout execution UI
3. Progress tracking/history

---

## Implementation Priority

### Phase 1: Core Trainer Flow (Priority 1)
**Time: ~6-8 hours**

1. **Template Creation** (2-3 hours)
   - Update existing workout creation page
   - Remove configuration from template creation
   - Save as blueprint only

2. **Assignment Flow** (3-4 hours)
   - Create assignment wizard
   - Polymorphic exercise configurator
   - Client selection
   - Schedule & assign

3. **Assignment List** (1 hour)
   - View assignments by client
   - Filter by status
   - Quick actions

### Phase 2: Client Execution (Priority 2)
**Time: ~4-6 hours**

1. **View Assigned Workouts** (1 hour)
   - List view with details
   - Exercise preview

2. **Workout Execution** (2-3 hours)
   - Start workout flow
   - Exercise-by-exercise tracker
   - Polymorphic input forms

3. **Complete Workout** (1-2 hours)
   - Summary view
   - Planned vs actual comparison

### Phase 3: Progress & Analytics (Priority 3)
**Time: ~4 hours**

1. **Execution History** (2 hours)
   - Client workout history
   - Trainer analytics dashboard

2. **Progress Charts** (2 hours)
   - Visual progress tracking
   - Performance trends

---

## Trainer Dashboard

### 1. Template Creation (`/dashboard/trainer/workouts/create`)

**Current File:** `app/src/app/dashboard/trainer/workouts/create/page.tsx`

**Changes Needed:**

```typescript
// BEFORE: Configures sets, reps, weights during creation
interface CreateWorkoutForm {
  exercises: {
    exerciseId: string;
    sets: WorkoutSet[];  // ❌ Remove this
  }[];
}

// AFTER: Just references exercises (blueprint)
interface CreateWorkoutTemplateForm {
  name: string;
  description: string;
  exercises: {
    exerciseId: string;  // Reference only
    notes?: string;      // Template notes
    // NO sets, reps, weights
  }[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed';
  estimatedDuration: number;
  scope: 'personal' | 'company';
}
```

**UI Changes:**
1. Remove set configuration UI from template creation
2. Simplify to exercise selection + ordering
3. Add scope selector (personal/company)
4. Save to `workoutTemplates` collection

**Code Example:**
```typescript
const handleSaveTemplate = async () => {
  const templateData = {
    name: formData.name,
    description: formData.description,
    exercises: selectedExercises.map((ex, index) => ({
      exerciseId: ex.id,
      notes: ex.templateNotes || '',
    })),
    difficulty: formData.difficulty,
    category: formData.category,
    estimatedDuration: formData.estimatedDuration,
    scope: formData.scope,
    createdBy: auth.currentUser.uid,
    createdByName: auth.currentUser.displayName,
    createdAt: serverTimestamp(),
    isActive: true,
    usageCount: 0,
  };

  await addDoc(collection(db, 'workoutTemplates'), templateData);
};
```

### 2. Assignment Flow (NEW)

**Create:** `app/src/app/dashboard/trainer/assignments/create/page.tsx`

**Flow:**
```
Step 1: Select Template
  └─> Browse personal/company templates
  └─> Preview template structure

Step 2: Select Client
  └─> Choose from client list
  └─> View client profile

Step 3: Configure Exercises (MAIN WORK)
  └─> For each exercise in template:
      ├─> Show exercise details
      └─> Render type-specific configurator:
          ├─> [Strength] → StrengthConfigForm
          ├─> [Cardio Steady] → CardioSteadyConfigForm
          ├─> [Cardio Intervals] → CardioIntervalsConfigForm
          └─> [...] → Type-specific forms

Step 4: Schedule & Assign
  └─> Set scheduled date
  └─> Add trainer notes
  └─> Call assignWorkout Cloud Function
```

**Component Structure:**
```typescript
// Main assignment wizard
<AssignmentWizard>
  <Step1_SelectTemplate />
  <Step2_SelectClient />
  <Step3_ConfigureExercises>
    {exercises.map(ex => (
      <ExerciseConfigurator
        exercise={ex}
        exerciseType={ex.exerciseType}
        onConfigChange={handleConfigChange}
      />
    ))}
  </Step3_ConfigureExercises>
  <Step4_Review />
</AssignmentWizard>

// Polymorphic configurator
function ExerciseConfigurator({ exercise, exerciseType, onConfigChange }) {
  switch(exerciseType) {
    case 'strength':
      return <StrengthConfigForm exercise={exercise} onChange={onConfigChange} />;
    case 'cardio':
      return <CardioConfigForm exercise={exercise} onChange={onConfigChange} />;
    // ... other types
  }
}
```

**StrengthConfigForm Component:**
```typescript
interface StrengthConfigFormProps {
  exercise: Exercise;
  onChange: (config: StrengthConfiguration) => void;
}

function StrengthConfigForm({ exercise, onChange }: StrengthConfigFormProps) {
  const [sets, setSets] = useState<StrengthSet[]>([
    { setNumber: 1, setType: 'warm_up', targetReps: 5, weight: 0, weightUnit: 'lbs', restSeconds: 180 }
  ]);

  return (
    <div className="space-y-4">
      <h3>{exercise.name}</h3>
      
      <select onChange={(e) => setSubType(e.target.value)}>
        <option value="free_weight">Free Weight</option>
        <option value="machine">Machine</option>
        <option value="bodyweight">Bodyweight</option>
        <option value="cable">Cable</option>
        <option value="resistance_band">Resistance Band</option>
      </select>

      {sets.map((set, index) => (
        <SetRow
          key={index}
          set={set}
          onChange={(updated) => handleSetChange(index, updated)}
        />
      ))}

      <button onClick={addSet}>Add Set</button>
    </div>
  );
}

function SetRow({ set, onChange }) {
  return (
    <div className="flex gap-4">
      <select value={set.setType} onChange={(e) => onChange({...set, setType: e.target.value})}>
        <option value="warm_up">Warm-up</option>
        <option value="working">Working</option>
        <option value="drop_set">Drop Set</option>
        <option value="to_failure">To Failure</option>
        <option value="amrap">AMRAP</option>
      </select>
      
      <input
        type="number"
        value={set.targetReps}
        onChange={(e) => onChange({...set, targetReps: parseInt(e.target.value)})}
        placeholder="Reps"
      />
      
      <input
        type="number"
        value={set.weight}
        onChange={(e) => onChange({...set, weight: parseFloat(e.target.value)})}
        placeholder="Weight"
      />
      
      <select value={set.weightUnit} onChange={(e) => onChange({...set, weightUnit: e.target.value})}>
        <option value="lbs">lbs</option>
        <option value="kg">kg</option>
      </select>
      
      <input
        type="number"
        value={set.restSeconds}
        onChange={(e) => onChange({...set, restSeconds: parseInt(e.target.value)})}
        placeholder="Rest (seconds)"
      />
      
      <input
        type="number"
        value={set.rpeTarget || ''}
        onChange={(e) => onChange({...set, rpeTarget: parseInt(e.target.value)})}
        placeholder="RPE (1-10)"
        min="1"
        max="10"
      />
    </div>
  );
}
```

**CardioSteadyConfigForm Component:**
```typescript
function CardioSteadyConfigForm({ exercise, onChange }) {
  const [config, setConfig] = useState<CardioSteadyStateConfiguration>({
    exerciseType: 'cardio',
    cardioSubType: 'steady_state',
    machineType: 'treadmill',
    durationSeconds: 1800,
    targetPace: '6.0 mph',
    intensity: 'moderate',
  });

  return (
    <div className="space-y-4">
      <h3>{exercise.name}</h3>
      
      <select value={config.machineType} onChange={(e) => setConfig({...config, machineType: e.target.value})}>
        <option value="treadmill">Treadmill</option>
        <option value="stationary_bike">Stationary Bike</option>
        <option value="rowing_machine">Rowing Machine</option>
        <option value="elliptical">Elliptical</option>
        <option value="stair_climber">Stair Climber</option>
      </select>

      <input
        type="number"
        value={config.durationSeconds}
        onChange={(e) => setConfig({...config, durationSeconds: parseInt(e.target.value)})}
        placeholder="Duration (seconds)"
      />
      
      <input
        type="text"
        value={config.targetPace}
        onChange={(e) => setConfig({...config, targetPace: e.target.value})}
        placeholder="Target Pace (e.g., 6.0 mph)"
      />
      
      <select value={config.intensity} onChange={(e) => setConfig({...config, intensity: e.target.value})}>
        <option value="light">Light</option>
        <option value="moderate">Moderate</option>
        <option value="high">High</option>
      </select>
      
      <input
        type="number"
        value={config.targetHeartRate || ''}
        onChange={(e) => setConfig({...config, targetHeartRate: parseInt(e.target.value)})}
        placeholder="Target HR (optional)"
      />
    </div>
  );
}
```

**API Call:**
```typescript
const handleAssign = async () => {
  try {
    const assignWorkout = httpsCallable(functions, 'assignWorkout');
    
    const result = await assignWorkout({
      workoutTemplateId: selectedTemplate.id,
      clientId: selectedClient.id,
      exercises: configuredExercises, // Array of WorkoutAssignmentExercise
      scheduledDate: formData.scheduledDate, // YYYY-MM-DD
      dueDate: formData.dueDate,
      notes: formData.notes,
    });

    console.log('Assignment created:', result.data.assignmentId);
    router.push('/dashboard/trainer/assignments');
  } catch (error) {
    console.error('Error assigning workout:', error);
  }
};
```

### 3. Assignment Management

**Update:** `app/src/app/dashboard/trainer/assignments/page.tsx`

**Features:**
- List all assignments
- Filter by client, status, date
- Quick view assignment details
- Edit/delete assignments

**UI:**
```typescript
function AssignmentsPage() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [filter, setFilter] = useState({ client: 'all', status: 'all' });

  useEffect(() => {
    const q = query(
      collection(db, 'workoutAssignments'),
      where('trainerId', '==', auth.currentUser.uid),
      orderBy('scheduledDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssignments(data);
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      <h1>Workout Assignments</h1>
      
      <div className="filters">
        <select onChange={(e) => setFilter({...filter, status: e.target.value})}>
          <option value="all">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="assignments-grid">
        {assignments.map(assignment => (
          <AssignmentCard key={assignment.id} assignment={assignment} />
        ))}
      </div>
    </div>
  );
}
```

---

## Client Dashboard

### 1. View Assigned Workouts

**Update:** `app/src/app/dashboard/client/workouts/page.tsx`

**Features:**
- List upcoming workouts
- View workout details with configured parameters
- Start workout button

**UI:**
```typescript
function ClientWorkoutsPage() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'workoutAssignments'),
      where('clientId', '==', auth.currentUser.uid),
      orderBy('scheduledDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAssignments(data);
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      <h1>My Workouts</h1>
      
      <div className="workouts-list">
        {assignments.map(assignment => (
          <WorkoutCard
            key={assignment.id}
            assignment={assignment}
            onStart={() => router.push(`/dashboard/client/workouts/execute/${assignment.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function WorkoutCard({ assignment, onStart }) {
  return (
    <div className="card">
      <h3>{assignment.name}</h3>
      <p>Scheduled: {formatDate(assignment.scheduledDate)}</p>
      <p>Status: {assignment.status}</p>
      <p>Exercises: {assignment.exercises.length}</p>
      
      {assignment.status === 'scheduled' && (
        <button onClick={onStart}>Start Workout</button>
      )}
      
      <button onClick={() => viewDetails(assignment.id)}>View Details</button>
    </div>
  );
}
```

### 2. Workout Execution (MAIN WORK)

**Create:** `app/src/app/dashboard/client/workouts/execute/[assignmentId]/page.tsx`

**Flow:**
```
1. Start Button
   └─> Call startWorkoutExecution Cloud Function
   └─> Get executionId

2. Exercise Loop
   For each exercise:
     ├─> Show planned configuration
     ├─> Render type-specific tracker:
     │   ├─> [Strength] → StrengthSetTracker
     │   ├─> [Cardio] → CardioTracker
     │   └─> [...] → Type-specific trackers
     ├─> Input actual performance
     └─> Call updateWorkoutExecution after each exercise

3. Complete
   └─> Call completeWorkoutExecution
   └─> Show summary (planned vs actual)
```

**Component:**
```typescript
function WorkoutExecutionPage({ params }: { params: { assignmentId: string } }) {
  const [execution, setExecution] = useState<WorkoutExecution | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Start workout
  const handleStart = async () => {
    try {
      const startWorkoutExecution = httpsCallable(functions, 'startWorkoutExecution');
      const result = await startWorkoutExecution({
        workoutAssignmentId: params.assignmentId
      });

      setExecution(result.data.execution);
      setStartTime(new Date());
    } catch (error) {
      console.error('Error starting workout:', error);
    }
  };

  // Update exercise actual
  const handleExerciseComplete = async (exerciseIndex: number, actualConfig: ExerciseConfigurationType) => {
    const updatedExercises = [...execution.exercises];
    updatedExercises[exerciseIndex].actualConfiguration = actualConfig;
    updatedExercises[exerciseIndex].completionStatus = 'completed';
    updatedExercises[exerciseIndex].completionPercentage = 100;

    try {
      const updateWorkoutExecution = httpsCallable(functions, 'updateWorkoutExecution');
      await updateWorkoutExecution({
        executionId: execution.id,
        exercises: updatedExercises,
        durationMinutes: Math.round((Date.now() - startTime.getTime()) / 60000),
      });

      setExecution({...execution, exercises: updatedExercises});
      setCurrentExerciseIndex(exerciseIndex + 1);
    } catch (error) {
      console.error('Error updating execution:', error);
    }
  };

  // Complete workout
  const handleComplete = async () => {
    try {
      const completeWorkoutExecution = httpsCallable(functions, 'completeWorkoutExecution');
      const result = await completeWorkoutExecution({
        executionId: execution.id,
        exercises: execution.exercises,
        durationMinutes: Math.round((Date.now() - startTime.getTime()) / 60000),
        overallNotes: notes,
      });

      router.push(`/dashboard/client/workouts/summary/${execution.id}`);
    } catch (error) {
      console.error('Error completing workout:', error);
    }
  };

  if (!execution) {
    return <button onClick={handleStart}>Start Workout</button>;
  }

  const currentExercise = execution.exercises[currentExerciseIndex];

  return (
    <div>
      <Timer startTime={startTime} />
      
      <h2>Exercise {currentExerciseIndex + 1} of {execution.exercises.length}</h2>
      <h3>{currentExercise.exerciseName}</h3>

      <ExerciseTracker
        exercise={currentExercise}
        onComplete={(actualConfig) => handleExerciseComplete(currentExerciseIndex, actualConfig)}
      />
    </div>
  );
}
```

**StrengthSetTracker:**
```typescript
function StrengthSetTracker({ exercise, onComplete }) {
  const plannedConfig = exercise.plannedConfiguration as StrengthConfiguration;
  const [actualSets, setActualSets] = useState(
    plannedConfig.sets.map(set => ({
      setNumber: set.setNumber,
      actualReps: set.targetReps,
      actualWeight: set.weight,
      actualRestSeconds: set.restSeconds,
      actualRpe: set.rpeTarget || null,
    }))
  );

  const handleComplete = () => {
    const actualConfig: StrengthConfiguration = {
      exerciseType: 'strength',
      strengthSubType: plannedConfig.strengthSubType,
      sets: actualSets,
      trackableFields: plannedConfig.trackableFields,
    };
    
    onComplete(actualConfig);
  };

  return (
    <div>
      <h4>Planned Sets:</h4>
      {plannedConfig.sets.map((set, index) => (
        <div key={index} className="planned-set">
          <span>Set {set.setNumber}: {set.targetReps} reps @ {set.weight} {set.weightUnit}</span>
        </div>
      ))}

      <h4>Actual Performance:</h4>
      {actualSets.map((set, index) => (
        <div key={index} className="actual-set-input">
          <label>Set {set.setNumber}</label>
          <input
            type="number"
            value={set.actualReps}
            onChange={(e) => {
              const updated = [...actualSets];
              updated[index].actualReps = parseInt(e.target.value);
              setActualSets(updated);
            }}
            placeholder="Reps"
          />
          <input
            type="number"
            value={set.actualWeight}
            onChange={(e) => {
              const updated = [...actualSets];
              updated[index].actualWeight = parseFloat(e.target.value);
              setActualSets(updated);
            }}
            placeholder="Weight"
          />
          <input
            type="number"
            value={set.actualRpe || ''}
            onChange={(e) => {
              const updated = [...actualSets];
              updated[index].actualRpe = parseInt(e.target.value);
              setActualSets(updated);
            }}
            placeholder="RPE"
            min="1"
            max="10"
          />
        </div>
      ))}

      <button onClick={handleComplete}>Complete Exercise</button>
    </div>
  );
}
```

### 3. Progress Tracking

**Create:** `app/src/app/dashboard/client/progress/page.tsx`

**Features:**
- Execution history list
- Planned vs actual charts
- Performance trends

**UI:**
```typescript
function ProgressPage() {
  const [executions, setExecutions] = useState<WorkoutExecution[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'workoutExecutions'),
      where('clientId', '==', auth.currentUser.uid),
      orderBy('startedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExecutions(data);
    });

    return unsubscribe;
  }, []);

  return (
    <div>
      <h1>My Progress</h1>
      
      <div className="stats-overview">
        <StatCard title="Workouts Completed" value={executions.filter(e => e.completionStatus === 'completed').length} />
        <StatCard title="Avg Completion" value={`${calculateAvgCompletion(executions)}%`} />
      </div>

      <h2>Recent Workouts</h2>
      <div className="executions-list">
        {executions.map(execution => (
          <ExecutionCard key={execution.id} execution={execution} />
        ))}
      </div>
    </div>
  );
}
```

---

## Shared Components

### Type Guard Utilities

**Create:** `app/src/lib/workout-utils.ts`

```typescript
import {
  ExerciseConfiguration,
  StrengthConfiguration,
  CardioSteadyStateConfiguration,
  CardioIntervalsConfiguration,
  isStrengthConfiguration,
  isSteadyStateCardio,
  isIntervalCardio,
} from '@/types/workout';

export function getConfiguratorComponent(exerciseType: string) {
  switch(exerciseType) {
    case 'strength':
      return StrengthConfigForm;
    case 'cardio':
      return CardioConfigForm; // Will branch to Steady/Intervals
    default:
      return null;
  }
}

export function getTrackerComponent(exerciseType: string) {
  switch(exerciseType) {
    case 'strength':
      return StrengthSetTracker;
    case 'cardio':
      return CardioTracker;
    default:
      return null;
  }
}

export function formatConfiguration(config: ExerciseConfiguration): string {
  if (isStrengthConfiguration(config)) {
    return `${config.sets.length} sets`;
  } else if (isSteadyStateCardio(config)) {
    return `${Math.round(config.durationSeconds / 60)} min @ ${config.targetPace}`;
  } else if (isIntervalCardio(config)) {
    return `${config.totalRounds} rounds of ${config.intervals.length} intervals`;
  }
  return 'Unknown configuration';
}
```

---

## API Integration

### Firebase Functions Setup

**Create:** `app/src/lib/workout-api.ts`

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  WorkoutAssignment,
  WorkoutExecution,
} from '@/types/workout';

// Assign workout to client
export async function assignWorkout(data: {
  workoutTemplateId: string;
  clientId: string;
  exercises: any[];
  scheduledDate: string;
  dueDate?: string;
  notes?: string;
}) {
  const assignWorkoutFn = httpsCallable<typeof data, { success: boolean; assignmentId: string }>(
    functions,
    'assignWorkout'
  );
  
  return await assignWorkoutFn(data);
}

// Start workout execution
export async function startWorkoutExecution(workoutAssignmentId: string) {
  const startFn = httpsCallable<
    { workoutAssignmentId: string },
    { success: boolean; executionId: string; execution: WorkoutExecution; resumed: boolean }
  >(functions, 'startWorkoutExecution');
  
  return await startFn({ workoutAssignmentId });
}

// Update workout execution
export async function updateWorkoutExecution(data: {
  executionId: string;
  exercises: any[];
  durationMinutes: number;
  overallNotes?: string;
}) {
  const updateFn = httpsCallable<typeof data, { success: boolean }>(
    functions,
    'updateWorkoutExecution'
  );
  
  return await updateFn(data);
}

// Complete workout execution
export async function completeWorkoutExecution(data: {
  executionId: string;
  exercises: any[];
  durationMinutes: number;
  overallNotes?: string;
}) {
  const completeFn = httpsCallable<
    typeof data,
    { success: boolean; completionStatus: string; completionPercentage: number; stats: any }
  >(functions, 'completeWorkoutExecution');
  
  return await completeFn(data);
}
```

---

## Testing Strategy

### Unit Tests

**Test Configurators:**
```typescript
// StrengthConfigForm.test.tsx
describe('StrengthConfigForm', () => {
  it('should render all set inputs', () => {
    const exercise = mockExercise;
    render(<StrengthConfigForm exercise={exercise} onChange={jest.fn()} />);
    
    expect(screen.getByPlaceholderText('Reps')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Weight')).toBeInTheDocument();
  });

  it('should call onChange with valid configuration', () => {
    const onChange = jest.fn();
    render(<StrengthConfigForm exercise={mockExercise} onChange={onChange} />);
    
    fireEvent.change(screen.getByPlaceholderText('Reps'), { target: { value: '10' } });
    
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        exerciseType: 'strength',
        sets: expect.arrayContaining([
          expect.objectContaining({ targetReps: 10 })
        ])
      })
    );
  });
});
```

### Integration Tests

**Test Assignment Flow:**
```typescript
describe('Assignment Flow', () => {
  it('should create assignment with configured exercises', async () => {
    // 1. Select template
    render(<AssignmentWizard />);
    fireEvent.click(screen.getByText('Select Template'));
    fireEvent.click(screen.getByText('Upper Body Strength A'));
    
    // 2. Select client
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('John Doe'));
    
    // 3. Configure exercises
    fireEvent.click(screen.getByText('Next'));
    fireEvent.change(screen.getByPlaceholderText('Reps'), { target: { value: '8' } });
    fireEvent.change(screen.getByPlaceholderText('Weight'), { target: { value: '225' } });
    
    // 4. Assign
    fireEvent.click(screen.getByText('Assign Workout'));
    
    await waitFor(() => {
      expect(assignWorkout).toHaveBeenCalledWith(
        expect.objectContaining({
          workoutTemplateId: expect.any(String),
          clientId: expect.any(String),
          exercises: expect.arrayContaining([
            expect.objectContaining({
              configuration: expect.objectContaining({
                exerciseType: 'strength'
              })
            })
          ])
        })
      );
    });
  });
});
```

### E2E Tests (Cypress)

**Test Complete Workout Flow:**
```typescript
describe('Complete Workout Flow', () => {
  it('should execute workout and track progress', () => {
    cy.login('client@example.com', 'password');
    
    // View workouts
    cy.visit('/dashboard/client/workouts');
    cy.contains('Upper Body Strength A').should('be.visible');
    
    // Start workout
    cy.contains('Start Workout').click();
    
    // Complete first exercise
    cy.get('[data-testid="exercise-1"]').within(() => {
      cy.get('input[placeholder="Reps"]').first().type('8');
      cy.
