# Trainer Training Performance Dashboard - REVISED SPECIFICATION

## Overview
This specification defines the Training Performance Dashboard within the Client Hub, providing **analytics and trend insights** for client training progression. This dashboard complements (not duplicates) the Training tab's operational metrics.

## Purpose & Positioning

### Training Tab (Client Hub) - Operational
- **Purpose**: "What needs attention RIGHT NOW?"
- Completion rates, on-time metrics
- Upcoming workouts, recent sessions
- Quick operational overview

### Training Performance Dashboard - Analytics  
- **Purpose**: "How are things trending over time?"
- Historical patterns and progression
- Volume trends, strength gains
- Data-driven programming insights

**Key Distinction**: Training tab = operations, Performance Dashboard = analytics

---

## 🎯 Revised Dashboard Structure (2 Sections)

```
┌─────────────────────────────────────────────────────────────────┐
│ SECTION 1: Analytics Summary (4 Metric Cards)                   │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 2: Performance Metrics & Trends (4 Tabbed Analytics)    │
└─────────────────────────────────────────────────────────────────┘
```

**REMOVED**: Original Section 2 (Workout Master-Detail View) - Redundant with Workout Assignments page

---

## Section 1: Analytics Summary Cards

Four analytics-focused metrics displayed horizontally at the top.

### Card 1: Avg Workout Duration

```
┌────────────────────────────────┐
│ Avg Workout Duration           │
│ Last 4 Weeks                   │
│                                │
│        52 min                  │
│        🕐                      │
│                                │
│ Range: 35-68 min               │
│ Target: 45-60 min              │
│ ✓ Mostly within range         │
└────────────────────────────────┘
```

**Calculation**:
```typescript
const executions = // workoutExecutions for completed workouts in period
const avgDuration = executions.reduce((sum, e) => 
  sum + e.durationMinutes, 0
) / executions.length;

const minDuration = Math.min(...executions.map(e => e.durationMinutes));
const maxDuration = Math.max(...executions.map(e => e.durationMinutes));
```

**Data Source**: `workoutExecution.durationMinutes`

**Insights**:
- Average duration
- Range (min-max)
- Target range comparison (45-60 min typical)
- Trend vs previous period

---

### Card 2: Training Streak

```
┌────────────────────────────────┐
│ Current Streak                 │
│                                │
│        5 days 🔥               │
│                                │
│ Longest: 12 days               │
│ Last workout: Today            │
│ Next: Tomorrow                 │
└────────────────────────────────┘
```

**Calculation**:
```typescript
// Consecutive days with completed workouts
function calculateStreak(assignments: Assignment[]): {
  current: number;
  longest: number;
  lastWorkout: Date | null;
} {
  const completedDates = assignments
    .filter(a => a.status === 'completed')
    .map(a => a.completedAt)
    .sort((a, b) => b.getTime() - a.getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  // Check consecutive days from today backwards
  const today = new Date();
  for (let i = 0; i < 90; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const hasWorkout = completedDates.some(d => 
      isSameDay(d, checkDate)
    );
    
    if (hasWorkout) {
      if (i === 0 || tempStreak > 0) {
        tempStreak++;
        if (i === 0) currentStreak = tempStreak;
      }
    } else if (tempStreak > 0) {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 0;
    }
  }
  
  return {
    current: currentStreak,
    longest: Math.max(longestStreak, tempStreak),
    lastWorkout: completedDates[0] || null
  };
}
```

**Data Source**: `workoutAssignments` where `status === 'completed'` with `completedAt` dates

---

### Card 3: Volume Trend

```
┌────────────────────────────────┐
│ Volume Trend                   │
│ Last 4 Weeks                   │
│                                │
│        ↑ +12%                  │
│                                │
│ This period: 58,500 lbs        │
│ Last period: 52,000 lbs        │
│ Status: ✓ Increasing           │
└────────────────────────────────┘
```

**Calculation**:
```typescript
// Volume = Sets × Reps × Weight (strength exercises only)
function calculateVolumeForPeriod(
  startDate: Date,
  endDate: Date,
  executions: WorkoutExecution[]
): number {
  const periodExecutions = executions.filter(e =>
    e.completedAt >= startDate && e.completedAt <= endDate
  );
  
  let totalVolume = 0;
  
  periodExecutions.forEach(execution => {
    execution.exercises.forEach(exercise => {
      if (exercise.exerciseType === 'strength') {
        const actualData = exercise.actualData as StrengthActualData;
        actualData.completedSets.forEach(set => {
          if (set.completed && set.actualWeight && set.actualReps) {
            totalVolume += set.actualWeight * set.actualReps;
          }
        });
      }
    });
  });
  
  return totalVolume;
}

// Compare current 4 weeks vs previous 4 weeks
const now = new Date();
const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

const currentPeriodVolume = calculateVolumeForPeriod(fourWeeksAgo, now, executions);
const previousPeriodVolume = calculateVolumeForPeriod(eightWeeksAgo, fourWeeksAgo, executions);

const percentChange = ((currentPeriodVolume - previousPeriodVolume) / previousPeriodVolume) * 100;
```

**Data Source**: `workoutExecutions.exercises[].actualData` for strength exercises

**Color Coding**:
- 🟢 Green (↑): Increasing (positive %)
- 🟡 Yellow (→): Stable (-5% to +5%)
- 🔴 Red (↓): Decreasing (<-5%)

---

### Card 4: Personal Records (PRs)

```
┌────────────────────────────────┐
│ Personal Records               │
│ This Month                     │
│                                │
│        3 PRs 🎉                │
│                                │
│ Bench Press: 200 lbs (+5)      │
│ Deadlift: 315 lbs (+10)        │
│ Squat: 255 lbs (+5)            │
└────────────────────────────────┘
```

**Calculation**:
```typescript
// Track max weight per exercise over time
interface PersonalRecord {
  exerciseName: string;
  newMax: number;
  previousMax: number;
  gain: number;
  date: Date;
}

function findPersonalRecords(
  clientId: string,
  startDate: Date,
  endDate: Date
): PersonalRecord[] {
  const prs: PersonalRecord[] = [];
  
  // Get all strength exercises from exercises collection
  const strengthExercises = await getDocs(
    query(collection(db, 'exercises'), 
    where('category', '==', 'strength'))
  );
  
  for (const exerciseDoc of strengthExercises.docs) {
    const exerciseId = exerciseDoc.id;
    const exerciseName = exerciseDoc.data().name;
    
    // Get all executions for this exercise
    const executions = await getExecutionsWithExercise(clientId, exerciseId);
    
    // Find max weight before and during period
    const beforePeriod = executions
      .filter(e => e.completedAt < startDate)
      .map(e => getMaxWeightForExercise(e, exerciseId))
      .filter(w => w > 0);
    
    const duringPeriod = executions
      .filter(e => e.completedAt >= startDate && e.completedAt <= endDate)
      .map(e => ({ 
        weight: getMaxWeightForExercise(e, exerciseId),
        date: e.completedAt 
      }))
      .filter(w => w.weight > 0);
    
    const previousMax = beforePeriod.length > 0 ? Math.max(...beforePeriod) : 0;
    const newMax = duringPeriod.length > 0 
      ? Math.max(...duringPeriod.map(d => d.weight)) 
      : 0;
    
    if (newMax > previousMax) {
      prs.push({
        exerciseName,
        newMax,
        previousMax,
        gain: newMax - previousMax,
        date: duringPeriod.find(d => d.weight === newMax)!.date
      });
    }
  }
  
  return prs.sort((a, b) => b.date.getTime() - a.date.getTime());
}
```

**Data Source**: 
- `exercises` collection (where `category === 'strength'`)
- `workoutExecutions.exercises[].actualData` for weight tracking

---

## Section 2: Performance Metrics & Trends

### Tabbed Analytics View

Four tabs for different analytics perspectives:

```
┌────────────────────────────────────────────────────┐
│ [📈 Strength] [📊 Volume] [🗓️ Consistency] [✓ Completion] │
├────────────────────────────────────────────────────┤
│                                                    │
│              [Tab Content Here]                    │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

### Tab 1: Strength Progression

Track weight progression for key exercises over time.

```
┌──────────────────────────────────────────────────────┐
│ 📈 Strength Progression (Last 12 Weeks)             │
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Exercise: Bench Press ▼]                           │
│                                                      │
│ 200 lbs ┤                               ●           │
│ 195 lbs ┤                         ●                 │
│ 190 lbs ┤                   ●                       │
│ 185 lbs ┤             ●                             │
│ 180 lbs ┤       ●                                   │
│ 175 lbs ┤ ●                                         │
│         └────────────────────────────────           │
│         W1  W3  W5  W7  W9  W11                    │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 📊 PROGRESS SUMMARY                                  │
│ • Starting: 175 lbs (Week 1)                        │
│ • Current: 200 lbs (Week 12)                        │
│ • Gain: +25 lbs (+14.3%)                            │
│ • Trend: ✓ Consistent upward progression            │
│                                                      │
│ 🎯 POTENTIAL INSIGHTS                                │
│ • Steady progression indicates good programming      │
│ • No plateaus detected                               │
│ • Consider increasing volume if rate slows           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Calculation**:
```typescript
interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  dataPoints: Array<{
    date: Date;
    maxWeight: number;
    avgReps: number;
  }>;
  startWeight: number;
  currentWeight: number;
  percentChange: number;
  trend: 'improving' | 'plateaued' | 'declining';
}

function calculateProgression(
  exerciseId: string,
  executions: WorkoutExecution[]
): ExerciseProgression {
  // Filter executions that include this exercise
  const relevantExecutions = executions.filter(e =>
    e.exercises.some(ex => ex.exerciseId === exerciseId)
  );
  
  // Extract weight data for each workout
  const dataPoints = relevantExecutions.map(e => {
    const exercise = e.exercises.find(ex => ex.exerciseId === exerciseId);
    const actualData = exercise?.actualData as StrengthActualData;
    
    const weights = actualData.completedSets
      .filter(s => s.completed && s.actualWeight)
      .map(s => s.actualWeight!);
    
    const reps = actualData.completedSets
      .filter(s => s.completed && s.actualReps)
      .map(s => s.actualReps!);
    
    return {
      date: e.completedAt,
      maxWeight: weights.length > 0 ? Math.max(...weights) : 0,
      avgReps: reps.length > 0 ? reps.reduce((a,b) => a+b) / reps.length : 0
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate metrics
  const startWeight = dataPoints[0]?.maxWeight || 0;
  const currentWeight = dataPoints[dataPoints.length - 1]?.maxWeight || 0;
  const percentChange = startWeight > 0 
    ? ((currentWeight - startWeight) / startWeight) * 100 
    : 0;
  
  // Determine trend (last 3 vs previous 3)
  const recent = dataPoints.slice(-3).map(d => d.maxWeight);
  const previous = dataPoints.slice(-6, -3).map(d => d.maxWeight);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  
  let trend: 'improving' | 'plateaued' | 'declining';
  if (recentAvg > previousAvg * 1.02) trend = 'improving';
  else if (recentAvg < previousAvg * 0.98) trend = 'declining';
  else trend = 'plateaued';
  
  // Get exercise name from exercises collection
  const exerciseName = await getExerciseName(exerciseId);
  
  return { 
    exerciseId, 
    exerciseName,
    dataPoints, 
    startWeight, 
    currentWeight, 
    percentChange, 
    trend 
  };
}
```

**Data Source**: 
- `exercises` collection (for exercise names, filtered by `category === 'strength'`)
- `workoutExecution.exercises[].actualData` for strength exercises

---

### Tab 2: Volume Trends

Track total training volume over time.

```
┌──────────────────────────────────────────────────────┐
│ 📊 Weekly Training Volume (Last 12 Weeks)           │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 60k ┤                                         ●     │
│ 50k ┤                               ●               │
│ 40k ┤                     ●                         │
│ 30k ┤           ●                                   │
│ 20k ┤     ●                                         │
│ 10k ┤ ●                                             │
│     └────────────────────────────────              │
│     W1  W3  W5  W7  W9  W11                       │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 📈 VOLUME METRICS                                    │
│ • This week: 58,500 lbs                             │
│ • Last week: 52,000 lbs (+12.5%)                    │
│ • 4-week avg: 48,750 lbs                            │
│ • All-time high: 60,000 lbs (Week 11)              │
│                                                      │
│ 🎯 INSIGHTS                                          │
│ • Steady upward trend indicates progressive overload │
│ • Volume increasing faster than weight - good!      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Volume Formula**: Sets × Reps × Weight (strength exercises only)

**Future Enhancement**: Breakdown by muscle group (requires exercise categorization)

---

### Tab 3: Consistency Heatmap

Visual calendar showing workout completion patterns.

```
┌──────────────────────────────────────────────────────┐
│ 🗓️ Workout Consistency (Last 90 Days)               │
├──────────────────────────────────────────────────────┤
│                                                      │
│ December 2024                                        │
│ M   T   W   T   F   S   S                          │
│ 🟢 🟢 ⚪ 🟢 🟢 ⚪ ⚪  Week 1                        │
│ 🟢 ⚪ 🟢 🟢 ⚪ 🟢 ⚪  Week 2                        │
│ 🟢 🟢 🔴 🟢 🟢 ⚪ 🟢  Week 3                        │
│ 🟢 🟢 🟢 🟢 ⏳ ⏳ ⏳  Week 4                        │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ November 2024                                        │
│ M   T   W   T   F   S   S                          │
│ 🟢 ⚪ 🟢 🟢 🟢 ⚪ ⚪  Week 1                        │
│ 🟢 🟢 ⚪ 🟢 🟢 ⚪ 🟢  Week 2                        │
│ 🟢 🟢 🟢 ⚪ 🟢 🔴 ⚪  Week 3                        │
│ 🟢 🟢 🟢 🟢 ⚪ 🟢 ⚪  Week 4                        │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 📊 CONSISTENCY METRICS                               │
│ • Workouts per week: Avg 4.2 (Target: 4)            │
│ • Adherence rate: 87%                                │
│ • Best day: Monday (95% completion)                  │
│ • Challenging day: Friday (65% completion)           │
│ • Current streak: 5 days 🔥                         │
│ • Longest streak: 12 days                            │
│                                                      │
│ 🟢 Completed  ⚪ Rest Day  🔴 Missed  ⏳ Upcoming   │
└──────────────────────────────────────────────────────┘
```

**Legend**:
- 🟢 **Green**: Workout completed (`status === 'completed'`)
- ⚪ **White**: Rest day (no workout assigned)
- 🔴 **Red**: Workout assigned but not completed (missed)
- ⏳ **Gray**: Upcoming workout (not yet due)

**Data Source**: `workoutAssignments` with date filtering

---

### Tab 4: Exercise Completion Rates

Shows which exercises are completed consistently vs frequently skipped.

```
┌──────────────────────────────────────────────────────┐
│ ✓ Exercise Completion Rates (Last 30 Days)          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ Bench Press        ██████████░░ 95% (19/20)         │
│ Deadlifts          ████████████ 100% (15/15)        │
│ Pull-ups           █████████░░░ 92% (11/12)         │
│ Squats             ████████░░░░ 78% (14/18) ⚠️      │
│ Rows               ████████░░░░ 88% (14/16)         │
│ Overhead Press     ███████░░░░░ 67% (10/15) ⚠️      │
│ Lunges             █████░░░░░░░ 53% (8/15) 🔴       │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 🎯 FOCUS AREAS                                       │
│ ⚠️ Squats: Often skipped on set 3                   │
│    → Review form/weight prescription                 │
│                                                      │
│ ⚠️ Overhead Press: 33% incomplete                    │
│    → Consider reducing weight or swapping exercise   │
│                                                      │
│ 🔴 Lunges: Frequently skipped                        │
│    → Consider alternative leg exercise                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Calculation**:
```typescript
function calculateExerciseCompletionRates(
  executions: WorkoutExecution[],
  days: number = 30
): Map<string, { completed: number; total: number; rate: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const recentExecutions = executions.filter(e => e.completedAt >= cutoffDate);
  const exerciseStats = new Map<string, { completed: number; total: number }>();
  
  recentExecutions.forEach(execution => {
    execution.exercises.forEach(exercise => {
      const name = exercise.exerciseName;
      const current = exerciseStats.get(name) || { completed: 0, total: 0 };
      
      current.total++;
      if (exercise.completionPercentage === 100) {
        current.completed++;
      }
      
      exerciseStats.set(name, current);
    });
  });
  
  // Convert to rate
  const rates = new Map<string, { completed: number; total: number; rate: number }>();
  exerciseStats.forEach((stats, name) => {
    rates.set(name, {
      ...stats,
      rate: (stats.completed / stats.total) * 100
    });
  });
  
  return rates;
}
```

**Alert Thresholds**:
- 🟢 Green: ≥90% completion
- 🟡 Yellow (⚠️): 70-89% completion
- 🔴 Red: <70% completion (focus area)

---

## Data Structure Reference

### Firestore Collections Used

#### `workoutAssignments`
```typescript
{
  id: string;
  clientId: string;
  trainerId: string;
  workoutTemplateId: string;
  name: string;
  assignedAt: Timestamp;
  scheduledDate: Timestamp;
  dueDate: Timestamp;
  status: 'scheduled' | 'in_progress' | 'completed';
  completionPercentage: number; // 0-100
  completedAt?: Timestamp; // When status changed to 'completed'
  exercises: ExerciseConfiguration[];
  notes?: string;
}
```

#### `workoutExecutions`
```typescript
{
  id: string;
  workoutAssignmentId: string;
  clientId: string;
  trainerId: string;
  startedAt: Timestamp;
  completedAt?: Timestamp;
  durationMinutes: number;
  overallDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  overallNotes?: string;
  completionStatus: 'not_started' | 'in_progress' | 'partial' | 'completed';
  completionPercentage: number;
  exercises: WorkoutExecutionExercise[];
}
```

#### `workoutExecutionExercise`
```typescript
{
  exerciseId: string; // References exercises collection
  exerciseName: string;
  exerciseType: ExerciseType;
  completionStatus: 'not_started' | 'partial' | 'completed';
  completionPercentage: number;
  plannedConfiguration: ExerciseConfigurationType;
  actualData: ExerciseActualData; // Polymorphic based on exercise type
  notes?: string;
  deviations?: string[];
}
```

#### `exercises` (Reference)
```typescript
{
  id: string;
  name: string;
  category: 'strength' | 'cardio' | 'core' | 'flexibility'; // Use for filtering
  // ... other fields
}
```

---

## Implementation Phases

### Phase 1: Core Structure with Placeholder Data (1-2 days)
**Goal**: Basic 2-section layout visible

- [ ] Remove old Section 2 (session management) from page
- [ ] Update Section 1 with 4 new metric cards (placeholder data)
- [ ] Keep Section 2 (analytics tabs) with placeholders
- [ ] Update page title and description

**Acceptance Criteria**:
- Dashboard shows revised 2-section layout
- All 4 metric cards visible (can show static data)
- All 4 analytics tabs render (can show placeholders)
- No session management section

---

### Phase 2: Real Data for Metrics (2-3 days)
**Goal**: Live calculations for all Section 1 cards

- [ ] Implement avg duration calculation
- [ ] Implement training streak algorithm
- [ ] Implement volume trend calculation
- [ ] Implement PR detection and tracking
- [ ] Add loading states
- [ ] Add error handling

**Acceptance Criteria**:
- All 4 metric cards show real calculated data
- Calculations match specifications
- Loading states display appropriately
- Errors handled gracefully

---

### Phase 3: Analytics Tabs - No Charts (2 days)
**Goal**: Implement data-only tabs (3 & 4)

- [ ] Implement consistency heatmap (90-day calendar)
- [ ] Implement exercise completion rates (bar display)
- [ ] Add empty states for no data
- [ ] Optimize queries for performance

**Acceptance Criteria**:
- Tab 3 (Consistency) shows 90-day heatmap with correct coloring
- Tab 4 (Completion Rates) shows sorted exercise list with percentages
- Empty states guide user when no data exists

---

### Phase 4: Analytics Tabs - Charts (3-4 days)
**Goal**: Implement chart visualizations (tabs 1 & 2)

- [ ] Integrate charting library (Recharts recommended)
- [ ] Implement strength progression chart (Tab 1)
  - Exercise dropdown selector
  - Line chart with data points
  - Progress summary
- [ ] Implement volume trends chart (Tab 2)
  - Weekly bar chart
  - Trend metrics
- [ ] Add chart interactions (tooltips, zoom if needed)

**Acceptance Criteria**:
- Charts render correctly with historical data
- Exercise dropdown filters strength progression
- Volume chart shows weekly totals
- Charts responsive and performant

---

### Phase 5: Polish & Optimization (1 day)
**Goal**: Final refinements

- [ ] Performance optimization (memoization, lazy loading)
- [ ] Responsive design checks
- [ ] Add tooltips for complex metrics
- [ ] Final UX polish
- [ ] Testing with various data scenarios

**Acceptance Criteria**:
- Page loads quickly (<2 sec for typical dataset)
- Works well on tablet+ (1024px+)
- All tooltips functional
- No console errors

---

## Key Calculations Summary

### 1. Average Duration
```typescript
sum(durationMinutes) / count(completedWorkouts)
```

### 2. Training Streak
Consecutive days with completed workouts (check day-by-day)

### 3. Volume Trend
```typescript
currentPeriodVolume = sum(sets * reps * weight) for last 4 weeks
previousPeriodVolume = sum(sets * reps * weight) for weeks 5-8
percentChange = ((current - previous) / previous) * 100
```

### 4. Personal Records
```typescript
For each strength exercise:
  newMax = max weight in current period
  previousMax = max weight before current period
  if newMax > previousMax: count as PR
```

### 5. Strength Progression
```typescript
maxWeight(currentWorkout) - maxWeight(previousWorkout)
```

### 6. Exercise Completion Rate
```typescript
(completedOccurrences / totalOccurrences) * 100 per exercise
```

---

## Design Guidelines

### Color Palette
- **Success**: Green (#10b981) - ≥90%, improving trends
- **Warning**: Yellow/Orange (#f59e0b) - 70-89%, plateaus
- **Danger**: Red (#ef4444) - <70%, declining trends
- **Neutral**: Gray (#6b7280) - Rest days, not started
- **Info**: Blue (#3b82f6) - Stable trends

### Typography
- **Metric Values**: Large, bold (text-4xl, font
