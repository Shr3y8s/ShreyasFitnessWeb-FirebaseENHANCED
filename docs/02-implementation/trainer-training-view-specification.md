# Trainer Training View Specification

## Overview
This specification defines the Trainer Training View feature within the Client Hub, enabling trainers to monitor client workout performance, track progression, analyze trends, and identify areas needing attention.

## Core Requirements

### Purpose
- Enable trainers to monitor client training adherence and performance
- Provide actionable insights for coaching decisions
- Track strength progression and volume trends over time
- Identify completion patterns and potential issues
- Support data-driven program adjustments

### Key Principles
- **At-a-Glance Insights**: Performance snapshot cards for quick assessment
- **Detailed Drill-Down**: Master-detail view for workout-specific analysis
- **Progression Tracking**: Historical comparison of weight/reps/volume
- **Issue Detection**: Highlight incomplete sets, skipped workouts, and patterns
- **Actionable Alerts**: Surface concerns requiring trainer attention

---

## 🚀 Getting Started - Phase-Based Implementation

### ⚠️ Important: Build Phase-by-Phase, Not Section-by-Section

This feature should be implemented in **phases**, not by completing one section at a time. Here's why:

**❌ DON'T: Build Section 1 → Section 2 → Section 3**
- Won't see full layout until the end
- Hard to adjust spacing/proportions between sections
- Risk of integration issues
- Can't test complete user flow early

**✅ DO: Build skeleton of all sections, then add functionality iteratively**
- See full page layout immediately
- Test navigation flow early
- Get quick wins and early feedback
- Easier to adjust design as you build

---

### Implementation Roadmap (7-9 days total)

```
Week 1:
├─ Day 1-2: Phase 1 - Core Structure (all 3 sections visible)
├─ Day 3-4: Phase 2 - Real Data & Calculations
└─ Day 5: Phase 3 (start) - Charts & Analytics

Week 2:
├─ Day 6-7: Phase 3 (finish) - Complete Analytics
└─ Day 8: Phase 4 - Polish & Testing
```

---

### Phase 1 Quick Start ⭐ START HERE

**Goal**: Get the full page skeleton visible with placeholder data (1-2 days)

**What you'll build**:
1. Page route at `/dashboard/trainer/client-hub/[id]/training`
2. All 3 sections laid out (but with placeholder data)
3. Navigation to the page working
4. Basic data fetching structure

**Why this matters**: You'll immediately see the full layout, test navigation, and have a working foundation to build upon.

**Detailed steps**: See [Phase 1: Core Dashboard Structure](#phase-1-core-dashboard-structure-2-3-days) below

---

## Visual Layout Specifications

### Three-Section Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ SECTION 1: Performance Snapshot (4 Metric Cards)                │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 2: Workout Schedule & Status (Master-Detail Split View) │
├─────────────────────────────────────────────────────────────────┤
│ SECTION 3: Performance Metrics & Trends (Tabbed Analytics)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 1: Performance Snapshot Cards

Four key metric cards displayed horizontally at the top of the page.

### Card 1: Completion Rate (Last 4 Weeks)

```
┌────────────────────────────────┐
│ Completion Rate                │
│ Last 4 Weeks                   │
│                                │
│        85%                     │
│   ████████████░░░              │
│                                │
│ 17/20 workouts completed       │
│ ↑ +5% vs previous 4 weeks     │
└────────────────────────────────┘
```

**Calculation**:
```typescript
const completionRate = (completedWorkouts / totalAssigned) * 100;
const previousPeriodRate = // Compare to previous 4 weeks
const trend = completionRate - previousPeriodRate;
```

**Data Source**: `workoutAssignments` where `status === 'completed'`

**Color Coding**:
- 🟢 Green: ≥80%
- 🟡 Yellow: 60-79%
- 🔴 Red: <60%

---

### Card 2: On-Time Completion

```
┌────────────────────────────────┐
│ On-Time Completion             │
│ Last 4 Weeks                   │
│                                │
│        70%                     │
│   ██████████░░░░               │
│                                │
│ 12/17 within deadline          │
│ ⚠️ 3 completed late            │
│ 🔴 2 not started               │
└────────────────────────────────┘
```

**Calculation**:
```typescript
const completedWorkouts = assignments.filter(a => a.status === 'completed');
const onTime = completedWorkouts.filter(a => a.completedAt <= a.dueDate).length;
const late = completedWorkouts.filter(a => a.completedAt > a.dueDate).length;
const notStarted = assignments.filter(a => 
  a.status !== 'completed' && new Date(a.dueDate) < new Date()
).length;

const onTimeRate = (onTime / completedWorkouts.length) * 100;
```

**Data Source**: `workoutAssignments` with `completedAt` timestamp comparison

**Status Breakdown**:
- ✓ On-time completions
- ⚠️ Late completions (completed after due date)
- 🔴 Overdue (not started past due date)

---

### Card 3: Avg Workout Duration

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
- Target range comparison
- Trend (increasing/decreasing vs previous period)

---

### Card 4: Training Streak

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

## Section 2: Workout Schedule & Status (Master-Detail View)

### Layout: 35% List | 65% Detail

```
┌──────────────────────┬──────────────────────────────────────┐
│                      │                                      │
│   WORKOUT LIST       │      WORKOUT DETAIL PANEL           │
│   (35% width)        │      (65% width)                    │
│                      │                                      │
│   [Filter Controls]  │  [Selected Workout Info]            │
│                      │                                      │
│   📅 UPCOMING (3)    │  📊 Workout Summary                 │
│   ⏳ Workout 1       │  💪 Exercise Performance            │
│   ⏳ Workout 2       │  💭 Client Feedback                 │
│   ⏳ Workout 3       │  🏃 Quick Actions                   │
│                      │                                      │
│   ━━━━━━━━━━━━━━━━  │                                      │
│                      │                                      │
│   ✅ COMPLETED (2)   │                                      │
│   ✓ Workout A        │                                      │
│   ✓ Workout B        │                                      │
│                      │                                      │
│   ━━━━━━━━━━━━━━━━  │                                      │
│                      │                                      │
│   ⚠️ OVERDUE (1)     │                                      │
│   ❌ Workout X       │                                      │
│                      │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

---

### Left Panel: Workout List (35% Width)

```
┌─────────────────────────────────────────┐
│ [This Week ▼] [All Status ▼]           │
├─────────────────────────────────────────┤
│                                         │
│ 📅 UPCOMING (3)                         │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⏳ Mon Dec 30 - Upper Body          │ │
│ │    Not Started                      │ │
│ │    Due: Today                       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⏳ Wed Jan 1 - Lower Body           │ │
│ │    Not Started                      │ │
│ │    Due: In 2 days                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ ✅ COMPLETED (2)                        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Sun Dec 29 - Full Body            │ │
│ │   98% • 55 min • 😰 Hard            │ │
│ │   Completed 1 day ago               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ Fri Dec 27 - Cardio HIIT          │ │
│ │   100% • 35 min • 😊 Moderate       │ │
│ │   Completed 3 days ago              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                         │
│ ⚠️ OVERDUE (1)                          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ❌ Thu Dec 26 - Core Workout        │ │
│ │    Not Started                      │ │
│ │    🔴 Overdue by 4 days             │ │
│ └─────────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

**Filter Controls**:
- Time Period: This Week, Last 7 Days, Last 30 Days, Custom
- Status: All, Upcoming, Completed, Overdue, In Progress

**Status Indicators**:
- ⏳ Not Started (gray)
- 🔵 In Progress (blue) - `completionPercentage > 0 && < 100`
- ✓ Completed (green) - `status === 'completed'`
- ❌ Overdue (red) - `status !== 'completed' && dueDate < now`

**List Item Display**:
- Date + Workout Name
- Status indicator
- Completion % (if in progress or completed)
- Duration (if completed)
- Difficulty rating (if completed)
- Relative time (e.g., "Due today", "Completed 2 days ago")

---

### Right Panel: Workout Detail (65% Width)

When a workout is selected:

```
┌──────────────────────────────────────────────────────┐
│ Upper Body Strength - Mon Dec 30                     │
│ Status: ✓ Completed 98% • 55 min • 😰 Hard          │
├──────────────────────────────────────────────────────┤
│                                                      │
│ 📊 WORKOUT SUMMARY                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ Assigned: Fri Dec 27                                 │
│ Scheduled: Mon Dec 30                                │
│ Started: 6:30 AM                                     │
│ Finished: 7:25 AM (55 minutes)                       │
│ Difficulty: 😰 Hard                                  │
│ Completion: 98%                                      │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 💪 EXERCISE PERFORMANCE                              │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ✓ 1. Bench Press - 3/3 sets (100%)           │   │
│ │    Set 1: 185 lbs × 10 reps ✓                │   │
│ │    Set 2: 185 lbs × 8 reps ✓                 │   │
│ │    Set 3: 185 lbs × 6 reps ✓                 │   │
│ │    📈 +5 lbs from last workout               │   │
│ │    ✨ Personal best: 185 lbs                 │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ⚠️ 2. Squats - 2/3 sets (67%)                │   │
│ │    Set 1: 225 lbs × 10 reps ✓                │   │
│ │    Set 2: 225 lbs × 8 reps ✓                 │   │
│ │    Set 3: SKIPPED ✗                          │   │
│ │    💬 "Knee felt unstable"                    │   │
│ │    ⚠️ TRAINER ALERT: Form concern            │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ ✓ 3. Dumbbell Rows - 3/3 sets (100%)         │   │
│ │    Set 1: 135 lbs × 12 reps ✓                │   │
│ │    Set 2: 135 lbs × 10 reps ✓                │   │
│ │    Set 3: 135 lbs × 8 reps ✓                 │   │
│ │    ➡️ Same as last workout                   │   │
│ └──────────────────────────────────────────────┘   │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 💭 CLIENT FEEDBACK                                   │
│ Overall Notes: "Great workout overall, but knee     │
│ issue during squats. Will ice tonight."             │
│                                                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                      │
│ 🏃 QUICK ACTIONS                                     │
│ [💬 Message Client] [📝 Add Note]                   │
│ [📅 Extend Deadline] [🚩 Mark for Follow-up]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Progression Indicators**:
- 📈 **Increased**: Weight or reps improved vs last time
- ➡️ **Same**: No change from last workout
- 📉 **Decreased**: Lower weight or reps (with alert if significant)
- ✨ **Personal Best**: New PR for this exercise

**Trainer Alerts** (highlighted in yellow/orange):
- ⚠️ Incomplete sets with client notes
- 🔴 Significant weight drops (>15%)
- 🟡 Difficulty rating "Very Hard" consistently
- 🔵 Exercise skipped multiple times

---

## Section 3: Performance Metrics & Trends

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
│ 🎯 GOALS & TARGETS                                   │
│ • Target: 225 lbs by Feb 1                          │
│ • Needed: +25 lbs in 4 weeks                        │
│ • Status: ✓ On track (avg +2 lbs/week)             │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Calculation**:
```typescript
interface ExerciseProgression {
  exerciseName: string;
  dataPoints: Array<{
    date: Date;
    maxWeight: number; // Highest weight used in that workout
    avgReps: number;
  }>;
  startWeight: number;
  currentWeight: number;
  percentChange: number;
  trend: 'improving' | 'plateaued' | 'declining';
}

function calculateProgression(
  exerciseName: string,
  executions: WorkoutExecution[]
): ExerciseProgression {
  // Filter executions that include this exercise
  const relevantExecutions = executions.filter(e =>
    e.exercises.some(ex => ex.exerciseName === exerciseName)
  );
  
  // Extract weight data for each workout
  const dataPoints = relevantExecutions.map(e => {
    const exercise = e.exercises.find(ex => ex.exerciseName === exerciseName);
    const actualData = exercise?.actualData as StrengthActualData;
    
    const weights = actualData.completedSets
      .filter(s => s.completed && s.actualWeight)
      .map(s => s.actualWeight!);
    
    return {
      date: e.completedAt,
      maxWeight: Math.max(...weights),
      avgReps: // Calculate average reps
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Calculate metrics
  const startWeight = dataPoints[0]?.maxWeight || 0;
  const currentWeight = dataPoints[dataPoints.length - 1]?.maxWeight || 0;
  const percentChange = ((currentWeight - startWeight) / startWeight) * 100;
  
  // Determine trend (last 3 vs previous 3)
  const recent = dataPoints.slice(-3).map(d => d.maxWeight);
  const previous = dataPoints.slice(-6, -3).map(d => d.maxWeight);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
  
  let trend: 'improving' | 'plateaued' | 'declining';
  if (recentAvg > previousAvg * 1.02) trend = 'improving';
  else if (recentAvg < previousAvg * 0.98) trend = 'declining';
  else trend = 'plateaued';
  
  return { exerciseName, dataPoints, startWeight, currentWeight, percentChange, trend };
}
```

**Data Source**: `workoutExecution.exercises[].actualData` for strength exercises

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
│ 💪 BY MUSCLE GROUP                                   │
│ • Chest/Triceps: 18,500 lbs (32%)                   │
│ • Back/Biceps: 22,000 lbs (38%)                     │
│ • Legs: 15,000 lbs (26%)                            │
│ • Shoulders: 3,000 lbs (5%)                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Volume Formula**:
```typescript
Volume = Sets × Reps × Weight

function calculateWeeklyVolume(
  startDate: Date,
  endDate: Date,
  executions: WorkoutExecution[]
): number {
  const weekExecutions = executions.filter(e =>
    e.completedAt >= startDate && e.completedAt <= endDate
  );
  
  let totalVolume = 0;
  
  weekExecutions.forEach(execution => {
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
```

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
- 🟢 **Green**: Workout completed
- ⚪ **White**: Rest day (no workout assigned)
- 🔴 **Red**: Workout assigned but not completed (missed)
- ⏳ **Gray**: Upcoming workout (not yet due)

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
- 🟡 Yellow: 70-89% completion
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
  exerciseId: string;
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

---

## Component Architecture

### Page Structure
```
/dashboard/trainer/client-hub/[id]/training
├── TrainerTrainingView (Main Page Component)
│   ├── PerformanceSnapshotCards
│   │   ├── CompletionRateCard
│   │   ├── OnTimeCompletionCard
│   │   ├── AvgDurationCard
│   │   └── TrainingStreakCard
│   ├── WorkoutMasterDetailView
│   │   ├── WorkoutList (Left 35%)
│   │   │   ├── FilterControls
│   │   │   ├── UpcomingSection
│   │   │   ├── CompletedSection
│   │   │   └── OverdueSection
│   │   └── WorkoutDetailPanel (Right 65%)
│   │       ├── WorkoutSummary
│   │       ├── ExercisePerformanceList
│   │       │   └── ExercisePerformanceCard
│   │       ├── ClientFeedback
│   │       └── QuickActions
│   └── PerformanceMetricsTabs
│       ├── StrengthProgressionTab
│       ├── VolumeTrendsTab
│       ├── ConsistencyHeatmapTab
│       └── ExerciseCompletionRatesTab
└── Utility Components
    ├── ProgressionIndicator
    ├── TrainerAlert
    ├── DifficultyBadge
    └── StatusBadge
```

---

## Implementation Phases

### Phase 1: Core Dashboard Structure (2-3 days)
**Goal**: Basic layout and data fetching

- [ ] Create route: `/dashboard/trainer/client-hub/[id]/training`
- [ ] Set up page layout with 3 sections
- [ ] Fetch workout assignments for client
- [ ] Fetch workout executions for completed workouts
- [ ] Build basic performance snapshot cards (static data)
- [ ] Implement master-detail workout list
- [ ] Display workout detail panel with execution data

**Dependencies**:
- Read access to `workoutAssignments` collection
- Read access to `workoutExecutions` collection
- Existing `WorkoutExecutionDetailView` component

**Acceptance Criteria**:
- Dashboard loads with all 3 sections visible
- Performance cards display with placeholder/static metrics
- Workout list shows upcoming, completed, and overdue workouts
- Clicking workout shows detail in right panel
- Workout execution data displays correctly

---

### Phase 2: Metrics & Calculations (2 days)
**Goal**: Live data for all metric cards and calculations

- [ ] Implement completion rate calculation
- [ ] Implement on-time completion tracking
- [ ] Implement average duration calculation
- [ ] Implement training streak algorithm
- [ ] Add progression indicators (weight comparison)
- [ ] Build trainer alert system
- [ ] Calculate exercise completion rates

**Dependencies**:
- Utility functions in `app/src/lib/workout-utils.ts`
- Historical workout execution data

**Acceptance Criteria**:
- All 4 performance cards show live calculated data
- Progression indicators (📈 ➡️ 📉) display correctly
- Trainer alerts highlight issues
- Exercise completion percentages accurate

---

### Phase 3: Analytics & Trends (2-3 days)
**Goal**: Charts and trend visualization

- [ ] Implement strength progression chart
  - Exercise dropdown selector
  - Line chart with data points
  - Progress summary calculations
- [ ] Implement volume trends chart
  - Weekly volume calculation
  - Muscle group breakdown
- [ ] Implement consistency heatmap
  - Calendar grid component
  - Day status coloring
  - Consistency metrics
- [ ] Implement exercise completion rates
  - Bar chart visualization
  - Focus area detection

**Dependencies**:
- Charting library (Recharts recommended)
- Date utilities for calendar generation
- Historical data aggregation

**Acceptance Criteria**:
- All 4 tabs render correctly
- Charts display accurate historical data
- Heatmap shows 90-day history
- Exercise completion rates sort by performance

---

### Phase 4: Polish & UX (1 day)
**Goal**: Refinements and user experience improvements

- [ ] Add loading states for all sections
- [ ] Implement error handling
- [ ] Add empty states (no workouts assigned)
- [ ] Optimize performance (memoization, lazy loading)
- [ ] Add responsive design considerations
- [ ] Implement quick actions functionality
- [ ] Add tooltips and help text

**Acceptance Criteria**:
- Loading states display appropriately
- Errors handled gracefully
- Empty states provide clear guidance
- Page loads quickly even with large datasets
- All quick actions functional

---

## Key Calculations Summary

### 1. Completion Rate
```typescript
(completedWorkouts / totalAssigned) * 100
```

### 2. On-Time Rate
```typescript
(onTimeCompletions / totalCompletions) * 100
```

### 3. Average Duration
```typescript
sum(durations) / count(durations)
```

### 4. Training Streak
Consecutive days with completed workouts (check day-by-day)

### 5. Weight Progression
```typescript
maxWeight(currentWorkout) - maxWeight(previousWorkout)
```

### 6. Training Volume
```typescript
sum(sets * reps * weight) for all strength exercises
```

### 7. Exercise Completion Rate
```typescript
(completedSets / totalSets) * 100 per exercise
```

---

## Design Guidelines

### Color Palette
- **Success**: Green (#10b981) - ≥90%
- **Warning**: Yellow/Orange (#f59e0b) - 70-89%
- **Danger**: Red (#ef4444) - <70%
- **Neutral**: Gray (#6b7280) - Not started
- **Info**: Blue (#3b82f6) - In progress

### Typography
- **Metric Values**: Large, bold (text-3xl, font-bold)
- **Labels**: Small, medium weight (text-sm, font-medium)
- **Body Text**: Regular (text-base)
- **Subtext**: Small, muted (text-sm, text-muted-foreground)

### Spacing
- **Card Padding**: p-6
- **Section Gaps**: gap-6
- **List Items**: py-4, px-4
- **Button Spacing**: gap-2, gap-3

### Icons
- 📊 Charts/Analytics
- 💪 Exercise/Strength
- 🔥 Streaks/Fire
- ⏳ Pending/Waiting
- ✓ Complete
- ❌ Missed/Overdue
- 📈 Increasing
- 📉 Decreasing
- ➡️ Same/Unchanged
- ⚠️ Warning/Alert

---

## Acceptance Criteria

### Functional Requirements
- [ ] Trainer can view training dashboard for any assigned client
- [ ] Performance snapshot cards display accurate, real-time metrics
- [ ] Workout list filters work correctly (time period, status)
- [ ] Master-detail view updates on workout selection
- [ ] Exercise performance shows progression indicators
- [ ] Trainer alerts highlight issues requiring attention
- [ ] All 4 analytics tabs render with correct data
- [ ] Charts display historical trends accurately
- [ ] Quick actions link to appropriate destinations

### Data Accuracy
- [ ] Completion percentages match workout execution data
- [ ] On-time calculations account for time zones correctly
- [ ] Streak calculations handle gaps correctly
- [ ] Volume calculations sum all strength exercises
- [ ] Progression comparisons match correct previous workout

### User Experience
- [ ] Page loads within 2 seconds for typical dataset
- [ ] Loading states prevent layout shift
- [ ] Empty states provide clear guidance
- [ ] Responsive design works on tablet+ (1024px+)
- [ ] Tooltips explain complex metrics
- [ ] Error messages are user-friendly

### Performance
- [ ] Firestore reads optimized (max 50 reads on initial load)
- [ ] Large datasets (100+ workouts) don't cause lag
- [ ] Charts render smoothly with 50+ data points
- [ ] Calculations cached where appropriate

---

## Related Documentation

- [Workout Execution Tracking System](./workout-execution-tracking-system.md) - Data structures and tracking levels
- [Client Hub Implementation Spec](./client-hub-implementation-spec.md) - Overall Client Hub architecture
- [Polymorphic Workout System](./polymorphic-workout-system-implementation.md) - Exercise type configurations

---

## Notes

- **Portal-Based Review**: All data accessible in-portal; no external notifications
- **Single Client Focus**: Dashboard shows one client at a time (accessed via Client Hub)
- **Historical Data**: Requires at least 2-3 completed workouts for meaningful trends
- **Exercise Matching**: Progression tracking requires consistent exercise names across workouts
- **Time Zones**: All timestamps should be handled with client's local timezone
- **Data Privacy**: Only show data for clients assigned to the authenticated trainer

---

## Future Enhancements (Post-MVP)

- **Comparison Mode**: Compare multiple clients side-by-side
- **Goal Setting**: Set specific strength goals with progress tracking
- **Exercise Library Integration**: Link exercises to form videos/instructions
- **Export Functionality**: PDF reports for client review meetings
- **Push Notifications**: Alert trainers to missed workouts or concerning patterns
- **AI Insights**: ML-powered pattern detection and recommendations
- **Custom Metrics**: Trainer-defined KPIs beyond standard metrics
- **Integration**: Sync with wearables for heart rate, sleep data
