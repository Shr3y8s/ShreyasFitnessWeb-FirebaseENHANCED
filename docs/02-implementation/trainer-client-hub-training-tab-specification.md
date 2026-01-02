# Trainer Client Hub - Training Tab Specification

## Overview
This specification defines the redesigned Training Tab within the Trainer Client Hub, providing a simplified, at-a-glance view of client training activity across three categories: Workout Assignments, In-Person Training Sessions, and Weekly Check-ins.

## Core Requirements

### Purpose
- Provide quick visibility into client training activity
- Show recent completed activities and upcoming scheduled items
- Display key performance metrics at a glance
- Enable easy navigation to detailed management pages

### Key Principles
- **Simplicity First**: Fixed layout, no collapsible sections
- **Consistent Structure**: Same format for all three categories
- **Quick View Only**: Deep management happens on dedicated pages
- **Portal-Based**: All data accessible in-portal

---

## Visual Layout

### Page Structure
```
┌────────────────────────────────────────────────────┐
│ Training Tab Header                                │
│ Link to Training Performance Dashboard →          │
├────────────────────────────────────────────────────┤
│ METRICS CARDS (3 cards in a row)                  │
│ [Workouts] [In-Person Sessions] [Check-ins]       │
├────────────────────────────────────────────────────┤
│ SECTION 1: WORKOUT ASSIGNMENTS                     │
│ • Recently Completed (2 items)                     │
│ • Upcoming (3 items)                               │
│ [View All Assignments]                             │
├────────────────────────────────────────────────────┤
│ SECTION 2: IN-PERSON TRAINING SESSIONS            │
│ • Recently Completed (2 items)                     │
│ • Upcoming (3 items)                               │
│ [View In-person Sessions]                          │
├────────────────────────────────────────────────────┤
│ SECTION 3: WEEKLY CHECK-INS                        │
│ • Recently Completed (2 items)                     │
│ • Upcoming (3 items)                               │
│ [View Check-ins]                                   │
└────────────────────────────────────────────────────┘
```

---

## Metrics Cards Specification

### Card 1: Workout Assignments 💪

```
┌──────────────────────────────────────┐
│ 💪 Workout Assignments               │
│                                      │
│ Last Month                           │
│ • 12 assigned                        │
│ • 10 completed (83%)                 │
│ • 8 on-time (80% of completed)      │
│                                      │
│ Last 3 Months                        │
│ • 35 assigned                        │
│ • 28 completed (80%)                 │
│ • 22 on-time (79% of completed)     │
└──────────────────────────────────────┘
```

**Data Source**: `workoutAssignments` collection
- Filter: `clientId` matches, `trainerId` matches
- Status: All assignments regardless of status

**Calculations**:
```typescript
// Last Month
const lastMonth = {
  assigned: assignments.filter(a => isWithinLastMonth(a.assignedAt)).length,
  completed: assignments.filter(a => 
    isWithinLastMonth(a.assignedAt) && a.status === 'completed'
  ).length
};
lastMonth.completionRate = (lastMonth.completed / lastMonth.assigned) * 100;

// On-time: completed on or before dueDate
const onTimeCompleted = assignments.filter(a =>
  isWithinLastMonth(a.assignedAt) &&
  a.status === 'completed' &&
  a.completedAt <= a.dueDate
).length;
lastMonth.onTimeRate = (onTimeCompleted / lastMonth.completed) * 100;

// Same logic for Last 3 Months
```

---

### Card 2: In-Person Training Sessions 🗓️

```
┌──────────────────────────────────────┐
│ 🗓️ In-Person Training Sessions       │
│                                      │
│ Last Month                           │
│ • 8 scheduled                        │
│ • 7 completed (88%)                  │
│ • 7 on-time (100% of completed)     │
│                                      │
│ Last 3 Months                        │
│ • 24 scheduled                       │
│ • 22 completed (92%)                 │
│ • 20 on-time (91% of completed)     │
└──────────────────────────────────────┘
```

**Data Source**: `sessions` collection
- Filter: `clientId` matches, `sessionType === 'training'`

**Calculations**:
```typescript
// Last Month
const lastMonth = {
  scheduled: sessions.filter(s => 
    isWithinLastMonth(s.scheduledDate)
  ).length,
  completed: sessions.filter(s =>
    isWithinLastMonth(s.scheduledDate) && s.status === 'completed'
  ).length
};
lastMonth.completionRate = (lastMonth.completed / lastMonth.scheduled) * 100;

// On-time: completed on the scheduled date (not rescheduled)
const onTimeCompleted = sessions.filter(s =>
  isWithinLastMonth(s.scheduledDate) &&
  s.status === 'completed' &&
  isSameDay(s.completedAt, s.scheduledDate)
).length;
lastMonth.onTimeRate = (onTimeCompleted / lastMonth.completed) * 100;
```

**Note**: Trainer marks sessions as complete via dedicated pages

---

### Card 3: Weekly Check-ins 📝

```
┌──────────────────────────────────────┐
│ 📝 Weekly Check-ins                  │
│                                      │
│ Last Month                           │
│ • 4 scheduled                        │
│ • 4 completed (100%)                 │
│ • 4 on-time (100%)                   │
│                                      │
│ Last 3 Months                        │
│ • 12 scheduled                       │
│ • 11 completed (92%)                 │
│ • 10 on-time (91%)                   │
└──────────────────────────────────────┘
```

**Data Source**: `sessions` collection
- Filter: `clientId` matches, `sessionType === 'checkin'`

**Calculations**: Same as In-Person Sessions

**Note**: Trainer marks check-ins as complete via dedicated pages

---

## Section Layouts

### Section 1: Workout Assignments

```
┌────────────────────────────────────────────────┐
│ 💪 Workout Assignments                         │
│ [View All Assignments] [Assign Workout]        │
├────────────────────────────────────────────────┤
│                                                │
│ Recently Completed (2)                         │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Upper Body - Dec 30                    │  │
│ │   Completed: 98% • 55 min • 😰 Hard      │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Lower Body - Dec 28                    │  │
│ │   Completed: 100% • 48 min • 😊 Moderate │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Upcoming (3)                                   │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Full Body - Jan 2                     │  │
│ │   Due: In 2 days                         │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Upper Body - Jan 4                    │  │
│ │   Due: In 4 days                         │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 HIIT Cardio - Jan 6                   │  │
│ │   Due: In 6 days                         │  │
│ └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

**Data Queries**:
```typescript
// Recently Completed (2 most recent)
const recentlyCompleted = await getDocs(
  query(
    collection(db, 'workoutAssignments'),
    where('clientId', '==', clientId),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
    limit(2)
  )
);

// Upcoming (3 next by due date)
const upcoming = await getDocs(
  query(
    collection(db, 'workoutAssignments'),
    where('clientId', '==', clientId),
    where('status', 'in', ['assigned', 'in_progress']),
    orderBy('dueDate', 'asc'),
    limit(3)
  )
);
```

---

### Section 2: In-Person Training Sessions

```
┌────────────────────────────────────────────────┐
│ 🗓️ In-Person Training Sessions                 │
│ [View In-person Sessions]                      │
├────────────────────────────────────────────────┤
│                                                │
│ Recently Completed (2)                         │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Training Session - Dec 29              │  │
│ │   Completed: 60 min                      │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Training Session - Dec 26              │  │
│ │   Completed: 60 min                      │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Upcoming (3)                                   │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Training Session - Jan 2, 3:00 PM     │  │
│ │   60 min                                 │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Training Session - Jan 5, 10:00 AM    │  │
│ │   60 min                                 │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Training Session - Jan 8, 3:00 PM     │  │
│ │   60 min                                 │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

**Data Queries**:
```typescript
// Recently Completed (2 most recent)
const recentlyCompleted = await getDocs(
  query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'training'),
    where('status', '==', 'completed'),
    orderBy('completedAt', 'desc'),
    limit(2)
  )
);

// Upcoming (3 next by scheduled date)
const upcoming = await getDocs(
  query(
    collection(db, 'sessions'),
    where('clientId', '==', clientId),
    where('sessionType', '==', 'training'),
    where('status', '==', 'scheduled'),
    orderBy('scheduledDate', 'asc'),
    limit(3)
  )
);
```

---

### Section 3: Weekly Check-ins

```
┌────────────────────────────────────────────────┐
│ 📝 Weekly Check-ins                            │
│ [View Check-ins]                               │
├────────────────────────────────────────────────┤
│                                                │
│ Recently Completed (2)                         │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Weekly Check-in - Dec 28               │  │
│ │   Completed: 30 min                      │  │
│ │   📍 Video Call                          │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ ✓ Weekly Check-in - Dec 21               │  │
│ │   Completed: 30 min                      │  │
│ │   📍 Downtown Gym                        │  │
│ └──────────────────────────────────────────┘  │
│                                                │
│ Upcoming (3)                                   │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Weekly Check-in - Jan 4, 11:00 AM     │  │
│ │   30 min                                 │  │
│ │   📍 Video Call                          │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Weekly Check-in - Jan 11, 11:00 AM    │  │
│ │   30 min                                 │  │
│ │   📍 Video Call                          │  │
│ └──────────────────────────────────────────┘  │
│ ┌──────────────────────────────────────────┐  │
│ │ 📅 Weekly Check-in - Jan 18, 11:00 AM    │  │
│ │   30 min                                 │  │
│ │   📍 Video Call                          │  │
│ └──────────────────────────────────────────┘  │
│                                                │
└────────────────────────────────────────────────┘
```

**Data Queries**: Same structure as In-Person Sessions, filtered by `sessionType === 'checkin'`

---

## Implementation Plan

### Phase 1: UI Simplification (Quick Win - 1-2 hours)
**Goal**: Clean, simplified UI with placeholder data

- [ ] Remove all collapsible sections
- [ ] Remove "This Week" categorization
- [ ] Remove session balance display from Training tab
- [ ] Remove Next Session highlight card
- [ ] Implement fixed 3-section layout (Recent + Upcoming)
- [ ] Add placeholder metrics cards (static data for now)
- [ ] Test responsive layout

**Result**: Clean UI that's ready for real data

---

### Phase 2: Real Data Integration (2-3 hours)
**Goal**: Wire up all queries and calculations

- [ ] Implement metrics card calculations
  - Last Month stats
  - Last 3 Months stats
  - Completion rates
  - On-time rates
- [ ] Implement Recently Completed queries (all 3 sections)
- [ ] Implement Upcoming queries (all 3 sections)
- [ ] Add loading states
- [ ] Handle empty states

**Result**: Fully functional Training Tab with live data

---

### Phase 3: Future Enhancement (Separate Task)
**Goal**: Mark complete + notes functionality

- [ ] Add mark complete button to in-person sessions page
- [ ] Add mark complete button to check-ins page
- [ ] Build notes dialog for trainers
- [ ] Update Firestore with completion status + notes
- [ ] Ensure metrics update after marking complete

**Note**: This happens on dedicated pages, NOT in the Training Tab

---

## Data Requirements

### Firestore Collections

#### `workoutAssignments`
```typescript
{
  clientId: string;
  trainerId: string;
  assignedAt: Timestamp;
  dueDate: Timestamp;
  status: 'assigned' | 'in_progress' | 'completed';
  completedAt?: Timestamp;
  name: string;
  // ... other fields
}
```

#### `sessions`
```typescript
{
  clientId: string;
  sessionType: 'training' | 'checkin';
  scheduledDate: Timestamp;
  completedAt?: Timestamp;
  status: 'scheduled' | 'completed' | 'cancelled';
  duration: number; // minutes
  location?: string;
  locationId?: string;
  trainerNotes?: string; // Added when marked complete
  // ... other fields
}
```

---

## Acceptance Criteria

### UI/UX
- [ ] Training Tab displays 3 metrics cards in a row
- [ ] Each metrics card shows Last Month and Last 3 Months stats
- [ ] All 3 sections (Workouts, Sessions, Check-ins) follow same layout
- [ ] "Recently Completed" shows 2 most recent items per section
- [ ] "Upcoming" shows 3 next items per section
- [ ] Empty states display helpful messages
- [ ] Loading states prevent layout shift

### Data Accuracy
- [ ] Metrics calculations match Firestore query results
- [ ] Completion rates calculate correctly
- [ ] On-time rates calculate correctly (on or before due/scheduled date)
- [ ] Recently Completed sorted by completion date (desc)
- [ ] Upcoming sorted by due/scheduled date (asc)

### Performance
- [ ] Page loads within 2 seconds
- [ ] Firestore reads optimized (use limits, efficient queries)
- [ ] No unnecessary re-renders

---

## Notes

- **Client marks workouts complete** (remote workouts)
- **Trainer marks sessions/check-ins complete** (in-person activities)
- **Mark complete functionality** is on dedicated pages, not in Training Tab
- **Training Performance Dashboard** remains separate for detailed analytics
- **Session balance** moved to Account tab only

---

## Training Performance Dashboard - Volume Calculation Implementation

### Current Implementation (Phase 1)

The Volume Trend card calculates training volume using **planned configuration data**:

**Data Source**: `workoutExecutions.exercises[i].plannedConfiguration.sets`

**Formula**: Volume = Weight × Reps (averaged from repsRange)

**Example Calculation**:
```typescript
// For a Bench Press exercise with 3 sets:
// Set 1: 135 lbs, 8-12 reps → 135 × 10 = 1,350 lbs
// Set 2: 150 lbs, 8-12 reps → 150 × 10 = 1,500 lbs
// Set 3: 150 lbs, 8-12 reps → 150 × 10 = 1,500 lbs
// Total Volume: 4,350 lbs
```

**Current Data Structure**:
- `exerciseType`: Field used to identify strength exercises
- `plannedConfiguration.sets[]`: Contains prescribed weights and rep ranges
- `actualData.completedSets[]`: Only tracks completion status (true/false), not actual performance values

**Rationale**:
- Shows **prescribed volume** from trainer's programming
- Provides meaningful volume tracking with existing data structure
- Works immediately without UI/data structure changes

### Future Enhancement (Phase 2)

**Goal**: Track actual performance for more accurate progression analysis

**Proposed Changes**:

1. **UI Enhancement**: Add weight/reps input when clients check off sets
   ```
   ✓ Set 1: [135] lbs × [10] reps ← Input fields
   ✓ Set 2: [150] lbs × [12] reps
   ✓ Set 3: [150] lbs × [10] reps
   ```

2. **Data Structure Update**:
   ```typescript
   actualData.completedSets[i] = {
     completed: true,
     setNumber: 1,
     actualWeight: 135,    // NEW: Client input
     actualReps: 10,       // NEW: Client input
     actualRPE: 7          // NEW: Optional RPE rating
   }
   ```

3. **Volume Calculation Priority**:
   ```typescript
   // Prioritize actual data when available
   if (set.actualWeight && set.actualReps) {
     volume = set.actualWeight × set.actualReps;
   } else {
     // Fallback to planned configuration
     volume = plannedConfig.weight × avgReps;
   }
   ```

**Benefits**:
- **Progressive Overload Tracking**: See real strength gains
- **Accurate Volume Calculations**: Based on actual performance
- **Program Adjustments**: Trainers see if prescribed weights are appropriate
- **Client Accountability**: Clients record what they actually lifted

**Implementation Considerations**:
- Backward compatible with existing workout executions
- Optional feature: defaults to planned config if not entered
- Client can choose to skip input for faster completion
- Trainer dashboard shows both planned vs actual when available

**Priority**: Medium - Can be implemented based on trainer/client feedback
