# Remaining Old Collection References - Cleanup Guide

**Date**: January 3, 2026  
**Status**: 47 references found across 8 files

---

## Files Requiring Updates

### Priority 1: CRITICAL - Blocking Functionality

#### 1. `app/src/lib/firebase.ts` (5 references)
**Lines**: Comments + `assignWorkoutToClients` function
- Line ~720: `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`
- Line ~740: `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`  
- Line ~755: `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`
- Line ~770: `doc(db, 'workoutAssignments', assignmentId)` → `doc(db, 'workouts', assignmentId)`
- Line ~780: `doc(db, 'workoutAssignments', assignmentId)` → `doc(db, 'workouts', assignmentId)`

**Impact**: Workout assignment creation fails

#### 2. `app/src/app/dashboard/trainer/page.tsx` (1 reference)
**Line**: ~200
- `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`

**Impact**: Trainer dashboard shows empty workout stats

#### 3. `app/src/app/dashboard/trainer/client-hub/[id]/page.tsx` (30+ references)
**Multiple lines**: Variable names + queries
- Line ~150: `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`
- Variable: `workoutAssignments` → `workouts` (state variable)
- All metric calculations using old variable name

**Impact**: Individual client detail page fails

#### 4. `app/src/app/dashboard/trainer/clients/page.tsx` (2 references)
**Lines**: 686, 772 (in modal reload functions)
- Both: `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`

**Impact**: Modal workout assignments don't reload after saving

---

### Priority 2: ANALYTICS - workoutExecutions

#### 5. `app/src/components/client-progress/key-metrics-overview.tsx` (1 reference)
**Line**: ~100
- `collection(db, 'workoutExecutions')` → `collection(db, 'workouts')`
- Add filter: `where('status', '==', 'completed')`

**Impact**: Client progress metrics empty

#### 6. `app/src/components/client-progress/habit-tracker.tsx` (3 references)
**Lines**: Multiple
- All: `collection(db, 'workoutExecutions')` → `collection(db, 'workouts')`
- Add filters: `where('status', '==', 'completed')` and `where('clientId', '==', userId)`

**Impact**: Habit tracking shows no workout data

#### 7. `app/src/components/plan/client-training-protocol.tsx` (1 reference)
**Line**: ~50
- `collection(db, 'workoutAssignments')` → `collection(db, 'workouts')`

**Impact**: Training protocol view empty

---

### Priority 3: COMMENTS ONLY

#### 8. `app/src/lib/activity-api.ts` (1 reference)
**Line**: Comment only
- Update comment for accuracy

**Impact**: None (just documentation)

---

## Quick Reference: Find-Replace Patterns

### Pattern 1: Collection Queries
```typescript
// OLD
collection(db, 'workoutAssignments')
collection(db, 'workoutExecutions')

// NEW  
collection(db, 'workouts')
```

### Pattern 2: Document References
```typescript
// OLD
doc(db, 'workoutAssignments', id)
doc(db, 'workoutExecutions', id)

// NEW
doc(db, 'workouts', id)
```

### Pattern 3: Execution Queries Need Filter
```typescript
// OLD
collection(db, 'workoutExecutions'),
where('clientId', '==', userId)

// NEW
collection(db, 'workouts'),
where('clientId', '==', userId),
where('status', '==', 'completed')  // ← ADD THIS
```

---

## Automated Fix Script (Optional)

If doing manual find-replace in VS Code:

1. **Find**: `'workoutAssignments'`  
   **Replace**: `'workouts'`
   **Files**: `app/src/**/*.{ts,tsx}`

2. **Find**: `'workoutExecutions'`  
   **Replace**: `'workouts'` (but check each - may need status filter)
   **Files**: `app/src/**/*.{ts,tsx}`

---

## Testing After Fixes

- [ ] Trainer dashboard shows workout stats
- [ ] Client hub individual pages load
- [ ] Workout assignment modals work
- [ ] Client progress metrics populate
- [ ] Habit tracker shows workout history
- [ ] Training protocol view works

---

## Estimated Time

- **Priority 1** (blocking): 15 minutes
- **Priority 2** (analytics): 10 minutes  
- **Priority 3** (comments): 2 minutes
- **Total**: ~30 minutes

Once complete, the migration will be 100% finished!
