# Daily Activities and Progress Tracking System

**Status:** Planning Complete - Ready for Implementation  
**Last Updated:** December 25, 2025  
**Version:** 1.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Navigation Structure](#navigation-structure)
3. [Data Architecture](#data-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Component Specifications](#component-specifications)
6. [User Workflows](#user-workflows)
7. [Integration Points](#integration-points)
8. [Technical Considerations](#technical-considerations)

---

## 🎯 Overview

### Purpose
Create a comprehensive system for clients to log daily activities (steps, water, habits, weight) and view their progress metrics, achievements, and trends.

### Goals
- ✅ Separate data INPUT (logging) from data OUTPUT (viewing)
- ✅ Create dedicated "Daily Activities" section for quick daily logging
- ✅ Enhance "Progress" view with real data from multiple sources
- ✅ Track workout streaks, habit adherence, weight journey, and strength gains
- ✅ Provide trainers with tools to set activity goals (steps, water)

### Key Principles
- **Speed:** Daily logging takes <1 minute
- **Clarity:** Clear separation between logging and viewing
- **Flexibility:** Habits can be customized by trainer, adapted over time
- **Motivation:** Visual progress, streaks, achievements

---

## 📂 Navigation Structure

### Current Structure (Before)
```
1. Planning (view plan)
2. Training (log workouts)
3. Nutrition (log nutrition)
4. Tracking (view progress) ← Ambiguous name
5. Support
6. Account
```

### New Structure (After)
```
1. 📋 Planning (view plan)
2. 📝 Daily Activities (NEW - log daily data)
3. 💪 Training (log workouts)
4. 🍽️ Nutrition (log nutrition)
5. 📊 Progress (renamed from "Tracking" - view metrics)
6. 💬 Support
7. ⚙️ Account
```

### Rationale for Changes

#### Adding "Daily Activities" Section
- Dedicated place for quick daily logging
- Mirrors Training/Nutrition pattern (action-oriented)
- Reduces clutter on dashboard
- Easy to find and use daily

#### Renaming "Tracking" → "Progress"
- **"Tracking"** is ambiguous: could mean logging OR viewing
- **"Progress"** is clear: viewing results, charts, achievements
- Eliminates confusion with new "Daily Activities" section
- More positive, motivating language

---

## 🗄️ Data Architecture

### Firestore Collections

#### 1. Daily Activity Logs
```typescript
Collection: dailyActivityLogs/{clientId}/logs/{YYYY-MM-DD}

Structure:
{
  date: "2025-12-25",              // ISO date string
  steps: 9500,                      // number
  waterIntake: 65,                  // oz (or convert based on unit preference)
  habitCheckins: {
    "habit-abc123": true,           // Binary: completed or not
    "habit-def456": false,
    "habit-ghi789": true
  },
  timestamp: Date,                  // Creation time
  updatedAt: Date                   // Last update (can update multiple times per day)
}
```

**Design Decisions:**
- ✅ Date as document ID for easy querying
- ✅ Allow updates throughout the day
- ✅ Habits stored by ID for flexibility (trainer can change habit text)
- ✅ Water in ounces (can display in cups/liters based on preference)

#### 2. Weight Logs
```typescript
Collection: weightLogs/{clientId}/entries/{entryId}

Structure:
{
  date: "2025-12-25",              // ISO date string
  weight: 202.5,                    // lbs
  bodyFat?: 22.3,                   // % (optional)
  notes?: string,                   // Client notes
  photos?: {                        // Progress photos (Phase 4)
    front?: string,                 // Firebase Storage URL
    side?: string,
    back?: string
  },
  measurements?: {                  // Body measurements (Future)
    chest?: number,
    waist?: number,
    hips?: number,
    arms?: number,
    thighs?: number
  },
  timestamp: Date
}
```

**Design Decisions:**
- ✅ Separate from daily logs (different frequency)
- ✅ Auto-generated ID (multiple entries per day possible)
- ✅ Optional fields for flexibility
- ✅ Photos prepared for Phase 4 implementation

#### 3. Enhanced Client Plan
```typescript
Collection: clientPlans/{clientId}

New/Updated Fields:
{
  stepGoal: {
    daily: 10000                    // Already exists
  },
  waterGoal: {                       // NEW
    daily: 100,                     // oz
    unit: 'oz' | 'liters' | 'cups'
  },
  dailyHabits: {                     // Already exists
    habits: [
      {
        id: string,
        title: string,
        description: string,
        iconType: 'activity' | 'dumbbell' | 'nutrition' | 'hydration' | 'sleep',
        order: number
      }
    ],
    lastUpdated: Date
  }
}
```

### Data Queries

#### Get Today's Activity Log
```typescript
const todayLog = await getDoc(
  doc(db, `dailyActivityLogs/${clientId}/logs/${todayDate}`)
);
```

#### Get Last 7 Days Activity
```typescript
const last7Days = await getDocs(
  query(
    collection(db, `dailyActivityLogs/${clientId}/logs`),
    where('date', '>=', sevenDaysAgo),
    orderBy('date', 'desc')
  )
);
```

#### Get Weight History
```typescript
const weightHistory = await getDocs(
  query(
    collection(db, `weightLogs/${clientId}/entries`),
    orderBy('date', 'desc'),
    limit(20)
  )
);
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1) - 12-14 hours

**Goals:** Set up structure, basic UI, navigation

#### Tasks:
1. ✅ Create `/dashboard/client/activity/page.tsx` (2 hrs)
2. ✅ Update `client-sidebar.tsx` with new section (1 hr)
3. ✅ Rename "Tracking" → "Progress" in sidebar (30 min)
4. ✅ Create basic activity form components (4 hrs)
   - Steps input
   - Water tracker
   - Habit checklist
5. ✅ Create Water Goal Editor for trainers (3 hrs)
6. ✅ Update plan data types (1 hr)

**Deliverable:** Navigation works, basic UI visible (no data yet)

---

### Phase 2: Daily Activity Logging (Week 2) - 12-14 hours

**Goals:** Full daily logging functionality with Firestore

#### Tasks:
1. ✅ Set up `dailyActivityLogs` Firestore collection (1 hr)
2. ✅ Create activity logging API functions (3 hrs)
   - `saveDailyActivity()`
   - `getTodayActivity()`
   - `getLast7DaysActivity()`
3. ✅ Wire up steps input to Firestore (2 hrs)
4. ✅ Wire up water tracker to Firestore (2 hrs)
5. ✅ Dynamic habit checklist from plan (3 hrs)
   - Pull habits from client plan
   - Display with checkboxes
   - Calculate adherence %
6. ✅ Quick stats component (7-day summary) (2 hrs)

**Deliverable:** Clients can log daily activities and see saved data

---

### Phase 3: Weight Tracking (Week 3) - 8-10 hours

**Goals:** Weight logging with photos

#### Tasks:
1. ✅ Set up `weightLogs` Firestore collection (1 hr)
2. ✅ Create weight log form component (2 hrs)
3. ✅ Weight log API functions (2 hrs)
   - `saveWeightLog()`
   - `getWeightHistory()`
4. ✅ Weight history view (2 hrs)
5. ✅ Photo upload integration (Phase 4 prep) (2 hrs)
   - Firebase Storage setup
   - Image upload component
6. ✅ Optional: Weight log sub-page `/activity/weight` (1 hr)

**Deliverable:** Clients can log weight with optional body fat % and notes

---

### Phase 4: Progress View Integration (Week 4) - 14-16 hours

**Goals:** Connect all data to Progress view metrics

#### Tasks:
1. ✅ Workout Streak calculator (4 hrs)
   - `lib/streak-utils.ts`
   - Query workout executions
   - Calculate current and longest streaks
2. ✅ Update KeyMetricsOverview with real data (4 hrs)
   - Connect to daily logs
   - Calculate habit score
   - Display actual streak
3. ✅ Weight journey chart with real data (3 hrs)
   - Query weight logs
   - Calculate trends
   - Display in ProgressCharts
4. ✅ Strength gain analysis (4 hrs)
   - Analyze workout executions
   - Calculate progressive overload
   - Display trends
5. ✅ Update HabitTracker with real data (2 hrs)

**Deliverable:** Progress view displays real metrics from all sources

---

### Phase 5: Enhancement & Polish (Week 5+) - 8-12 hours

**Goals:** Photos, dashboard widgets, trainer views

#### Tasks:
1. ✅ Progress photo upload and gallery (4 hrs)
2. ✅ Dashboard TodoList integration (2 hrs)
   - Read-only status display
   - Link to activity page
3. ✅ Trainer view of client activities (optional) (3 hrs)
4. ✅ Body measurements tracking (future) (3 hrs)
5. ✅ Device sync preparation (future)

**Deliverable:** Complete, polished tracking system

---

## 📦 Component Specifications

### Activity Page Components

#### 1. DailyActivityForm
**Location:** `components/activity/daily-activity-form.tsx`

```typescript
interface DailyActivityFormProps {
  clientId: string;
  stepGoal: number;
  waterGoal: number;
  waterUnit: 'oz' | 'liters' | 'cups';
  habits: DailyHabit[];
  existingLog?: DailyActivityLog;
  onSave: (log: DailyActivityLog) => Promise<void>;
}
```

**Features:**
- Steps input field with goal comparison
- Water tracker with +/- buttons
- Dynamic habit checklist
- Progress bars for each metric
- Save button with loading state

---

#### 2. WeightLogForm
**Location:** `components/activity/weight-log-form.tsx`

```typescript
interface WeightLogFormProps {
  clientId: string;
  onSave: (log: WeightLog) => Promise<void>;
  onPhotoUpload?: (file: File) => Promise<string>;
}
```

**Features:**
- Weight input (lbs)
- Optional body fat % input
- Notes text area
- Photo upload (3 angles)
- Last weigh-in display

---

#### 3. ActivityQuickStats
**Location:** `components/activity/activity-quick-stats.tsx`

```typescript
interface ActivityQuickStatsProps {
  last7Days: DailyActivityLog[];
  stepGoal: number;
  waterGoal: number;
}
```

**Features:**
- Average steps last 7 days
- Water adherence (days met goal)
- Habit score %
- Visual sparklines

---

### Progress Page Enhancements

#### 4. WorkoutStreakCard
**Location:** `components/progress/workout-streak-card.tsx`

**Displays:**
- Current streak (consecutive on-time completions)
- Longest streak (all-time record)
- Streak flame animation
- "Days in a row" subtext

---

#### 5. HabitAdherenceCard
**Location:** `components/progress/habit-adherence-card.tsx`

**Displays:**
- Overall habit score (7-day, 30-day)
- Per-habit breakdown
- Daily/weekly/monthly tabs
- Checklist visualization

---

## 👤 User Workflows

### Daily Morning Routine (Client)
```
1. Open app → Navigate to "Daily Activities"
2. See today's form (pre-filled with yesterday's defaults if any)
3. Enter steps: 0 (will update throughout day)
4. Water: 0 cups (will track as drinking)
5. Habits: Check off completed items
6. Click "Save" → Done! (<1 minute)
```

### Throughout the Day (Client)
```
1. Quick open "Daily Activities"
2. Update steps from phone/watch
3. Click "+1 cup" for each water serving
4. Check off habits as completed
5. Save
```

### Weekly Weigh-In (Client)
```
1. Navigate to "Daily Activities"
2. Scroll to "Weekly Weigh-In" section
3. Step on scale → Enter weight
4. Optional: Enter body fat %
5. Optional: Take/upload 3 progress photos
6. Optional: Add notes about how feeling
7. Click "Log Weigh-In"
8. View weight chart updated
```

### Setting Goals (Trainer)
```
1. Navigate to client's "Edit My Plan"
2. Click "Step Goal" tab → Set daily target
3. Click "Water Goal" tab → Set daily target (NEW)
4. Click "Daily Habits" tab → Customize 3-5 habits
5. Save → Client sees updated goals immediately
```

### Viewing Progress (Client)
```
1. Navigate to "Progress"
2. See all metrics updated:
   - Weight journey chart (from weight logs)
   - Workout streak (from workout completions)
   - Habit score (from daily activity logs)
   - Steps average (from daily activity logs)
   - Strength gains (from workout executions)
3. Filter by time range (7D, 30D, 90D, 1Y)
```

---

## 🔗 Integration Points

### Existing Systems

#### 1. Workout Tracking System
**File:** `types/workout.ts`, `lib/workout-api.ts`

**Integration:**
- Workout streak pulls from `workoutExecutions` collection
- On-time completion: `scheduledDate` === `completedAt` date
- Already implemented, just need calculation utility

#### 2. Nutrition Hub
**File:** `components/nutrition-hub/`

**Integration:**
- Command Center displays water goal (currently mock)
- Pull `waterGoal` from client plan instead
- Meal logging feeds habit adherence (future)

#### 3. Client Plan System
**File:** `types/plan.ts`, `lib/plan-api.ts`

**Additions Needed:**
```typescript
// Add to Plan type
interface Plan {
  // ... existing fields
  waterGoal?: {
    daily: number;
    unit: 'oz' | 'liters' | 'cups';
  };
}
```

#### 4. Dashboard System
**File:** `app/dashboard/client/page.tsx`

**Updates:**
- TodoList becomes read-only display
- Show actual completion status
- Add "Log Activity" button → redirect to `/activity`

---

## 🛠️ Technical Considerations

### Firestore Security Rules

```javascript
// Daily Activity Logs
match /dailyActivityLogs/{clientId}/logs/{logId} {
  allow read: if request.auth.uid == clientId || 
                 isTrainerForClient(request.auth.uid, clientId);
  allow write: if request.auth.uid == clientId;
}

// Weight Logs
match /weightLogs/{clientId}/entries/{entryId} {
  allow read: if request.auth.uid == clientId || 
                 isTrainerForClient(request.auth.uid, clientId);
  allow write: if request.auth.uid == clientId;
}

// Client Plan - Add waterGoal access
match /clientPlans/{clientId} {
  allow read: if request.auth.uid == clientId || 
                 isTrainerForClient(request.auth.uid, clientId);
  allow update: if isTrainerForClient(request.auth.uid, clientId);
}
```

### Performance Optimizations

1. **Caching:**
   - Cache today's activity log in component state
   - Only fetch on mount and after save
   - Use real-time listener for live updates

2. **Lazy Loading:**
   - Load weight history on-demand
   - Paginate weight logs (20 at a time)
   - Load quick stats in background

3. **Optimistic Updates:**
   - Update UI immediately on save
   - Show loading spinner briefly
   - Rollback if save fails

### Error Handling

```typescript
// Example error handling pattern
try {
  await saveDailyActivity(clientId, activityData);
  toast.success("Activity logged successfully!");
} catch (error) {
  console.error("Failed to save activity:", error);
  toast.error("Failed to save. Please try again.");
  // Rollback optimistic update
}
```

### Real-time Updates

```typescript
// Use onSnapshot for live data
useEffect(() => {
  const todayRef = doc(db, `dailyActivityLogs/${clientId}/logs/${todayDate}`);
  const unsubscribe = onSnapshot(todayRef, (snapshot) => {
    if (snapshot.exists()) {
      setTodayActivity(snapshot.data());
    }
  });
  
  registerListener(unsubscribe);
  return () => {
    unregisterListener(unsubscribe);
    unsubscribe();
  };
}, [clientId, todayDate]);
```

---

## 📊 Success Metrics

### User Engagement
- Daily activity logging rate (target: 80% of clients)
- Average time to log (target: <1 minute)
- Weight logging frequency (target: 1x per week)

### Data Quality
- Habit adherence completion rate
- Steps goal achievement rate
- Water goal achievement rate

### Feature Adoption
- % clients using activity page daily
- % clients who have logged weight
- % trainers who set custom habits

---

## 🎯 Future Enhancements

### Phase 6: Advanced Features
1. **Device Sync**
   - Apple Health integration
   - Google Fit integration
   - Automatic step/weight sync

2. **Meal Logging**
   - Full macro tracking
   - Food database
   - Photo-based meal logging

3. **Body Measurements**
   - Chest, waist, hips, arms, thighs
   - Progress photos with overlay comparison
   - Measurement history charts

4. **Social Features**
   - Share achievements
   - Challenge friends
   - Leaderboards (optional)

5. **Smart Insights**
   - AI-powered trend analysis
   - Personalized recommendations
   - Correlation discovery (sleep vs performance)

---

## 📝 Implementation Checklist

### Phase 1: Foundation ✅
- [ ] Create activity page route
- [ ] Update sidebar navigation
- [ ] Rename "Tracking" to "Progress"
- [ ] Create Water Goal Editor
- [ ] Update plan types

### Phase 2: Daily Logging ✅
- [ ] Set up Firestore collections
- [ ] Create activity API functions
- [ ] Build daily activity form
- [ ] Implement habit checklist
- [ ] Add quick stats display

### Phase 3: Weight Tracking ✅
- [ ] Weight log Firestore setup
- [ ] Weight log form component
- [ ] Weight history view
- [ ] Photo upload prep

### Phase 4: Progress Integration ✅
- [ ] Workout streak calculator
- [ ] Update KeyMetricsOverview
- [ ] Connect weight chart
- [ ] Strength gain analysis
- [ ] Update HabitTracker

### Phase 5: Polish ✅
- [ ] Progress photo gallery
- [ ] Dashboard widget updates
- [ ] Trainer activity views
- [ ] Testing and bug fixes

---

## 📚 Related Documentation

- [Workout Execution Tracking System](./workout-execution-tracking-system.md)
- [Nutrition Hub Implementation](./nutrition-hub-implementation-status.md)
- [Fitness Data Model](../04-architecture/fitness-data-model.md)
- [Client Plan System](../04-architecture/client-plan-system.md)

---

**Document maintained by:** Development Team  
**For questions:** See project documentation or contact team lead
