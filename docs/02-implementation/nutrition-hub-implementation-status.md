# Nutrition Hub Implementation Status

**Last Updated:** December 24, 2024  
**Status:** In Development  
**Completion:** ~75%

---

## 📖 Overview

The Nutrition Hub is a comprehensive nutrition tracking and management system for clients. It supports three distinct approaches assigned by trainers:

1. **healthy_habits** - Focus on building sustainable nutrition habits
2. **macro_tracking** - Detailed calorie and macronutrient tracking
3. **meal_plan** - Following trainer-created weekly meal plans

The hub dynamically shows relevant tabs and features based on the assigned approach.

---

## ✅ Completed Features

### 1. **Meal Plan View** ✅
- **Status:** Fully functional with real-time Firestore integration
- **Location:** `app/src/components/nutrition-hub/meal-plan-view.tsx`
- **Features:**
  - Loads weekly meal plans created by trainers
  - Today's plan displayed in 2x2 grid (Breakfast, Lunch, Dinner, Snacks)
  - Full weekly view with 7-day card layout
  - Real-time updates via `onSnapshot`
  - Loading states and empty states
  - "Send Note to Coach" integration
- **Data Source:** `clientPlans/{userId}/nutritionProtocol/mealPlan/weeklyPlan`
- **Trainer Tool:** `NutritionProtocolEditor.tsx` (grid-based meal planner)

### 2. **Habit Tracker** ✅
- **Status:** Fully functional with completion tracking
- **Location:** `app/src/components/nutrition-hub/nutrition-habit-tracker.tsx`
- **Features:**
  - Loads user's assigned habits from Firestore
  - Daily completion tracking with checkboxes
  - Saves to `habitCompletions/{userId}/daily/{date}`
  - Weekly 7-day progress grid visualization
  - Streak calculation (consecutive completion days)
  - Weekly completion percentage
  - Real-time updates
  - Progress badge when all habits complete
- **Data Source:** `clientPlans/{userId}/nutritionProtocol/healthyHabits/habits`
- **Security:** Firestore rules deployed for habit completions

### 3. **Active Streaks Card** ✅
- **Status:** Functional with real Firestore data
- **Location:** `app/src/components/nutrition-hub/nutrition-trends-card.tsx`
- **Features:**
  - **Protein Goal Streak:** Counts consecutive days hitting ≥90% of protein target
  - **Meal Logging Streak:** Counts consecutive days with meal data logged
  - **Water Intake Streak:** Counts consecutive days hitting ≥80% of water goal
  - Loads last 30 days of data for calculation
  - Updates on meal logging
  - Shows "Start today!" for zero streaks
  - Proper pluralization (1 day vs 2 days)
  - Prevents errors on logout with proper cleanup
- **Performance:** Client-side calculation (~500ms), candidates for optimization
- **Data Source:** `nutritionLogs/{userId}/daily/{date}`

### 4. **Daily Food Logging** ✅
- **Status:** Fully functional
- **Location:** `app/src/components/nutrition-hub/meal-accordion.tsx`
- **Features:**
  - Meal accordion UI for Breakfast, Lunch, Dinner, Snacks
  - Add/remove food items with macro calculations
  - Real-time macro totals (calories, protein, carbs, fat)
  - Saves to `nutritionLogs/{userId}/daily/{date}`
  - Auto-calculation of daily totals
- **Data Structure:**
  ```typescript
  {
    meals: {
      Breakfast: [{name, calories, protein, carbs, fat}],
      Lunch: [...],
      Dinner: [...],
      Snacks: [...]
    },
    waterIntake: number,
    dayComplete: boolean,
    lastUpdated: Timestamp
  }
  ```

### 5. **Nutrition Command Center** ✅
- **Status:** Fully functional
- **Location:** `app/src/components/nutrition-hub/nutrition-command-center.tsx`
- **Features:**
  - Circular progress rings for calories, protein, carbs, fat
  - Water intake tracker with +/- buttons (16oz increments)
  - Real-time calculation from meal data
  - Only visible for `macro_tracking` approach
  - Color-coded progress indicators
- **Data Source:** Calculated from daily log + `clientPlans/{userId}/nutritionProtocol/macroTracking`

### 6. **Approach Display** ✅
- **Status:** Fully functional
- **Location:** `app/src/components/nutrition-hub/nutrition-approach-display.tsx`
- **Features:**
  - Shows assigned approach with icon and explanation
  - Educational content about all 3 approaches
  - Displays coach name and assignment date
  - Conditional rendering based on approach type
- **Data Source:** `clientPlans/{userId}/nutritionProtocol/approach`

### 7. **Dynamic Tab Visibility** ✅
- **Status:** Fully functional
- **Location:** `app/src/app/dashboard/client/nutrition/page.tsx`
- **Logic:**
  - `healthy_habits` → Habits + Resources tabs
  - `macro_tracking` → Daily Tracking + Resources tabs
  - `meal_plan` → Meal Plan + Resources tabs
- **Features:**
  - Correct default tab on load
  - No tab flash (waits for approach to load)
  - Keyed tabs for proper re-rendering

### 8. **UI Polish** ✅
- Hover effects on all cards (shadow-glow, translate-y)
- Border effects (border-primary/50)
- Consistent styling across components
- Loading spinners with proper messaging
- Empty states with helpful prompts
- Responsive design (mobile-friendly)

---

## ⚠️ Partially Implemented Features

### 1. **Screenshot Upload** 🟡
- **Status:** UI exists, functionality incomplete
- **What Works:**
  - File selection dialog
  - File name display
  - Image preview for selected files
- **What's Missing:**
  - Firebase Storage upload implementation
  - Save screenshot URL reference to Firestore
  - Display uploaded screenshots
  - Delete functionality
- **Location:** `app/src/app/dashboard/client/nutrition/page.tsx` (Screenshot tab)
- **Estimated Effort:** 2-3 hours
- **Data Structure Needed:**
  ```typescript
  nutritionLogs/{userId}/daily/{date}
    - screenshotUrl: string
    - screenshotUploadedAt: Timestamp
  ```

### 2. **Mark Day Complete** 🟡
- **Status:** Backend works, visual feedback missing
- **What Works:**
  - Button saves `dayComplete: true` to Firestore
  - Data persists correctly
- **What's Missing:**
  - Visual indicator showing day is complete
  - Badge or checkmark in UI
  - Prevent re-clicking when already complete
  - Show completion status in weekly/monthly views
  - Success animation
- **Location:** `app/src/app/dashboard/client/nutrition/page.tsx`
- **Estimated Effort:** 1-2 hours

### 3. **This Week Card** 🟡
- **Status:** Shows hardcoded mock data
- **Current Display:**
  - "Avg Calories: 2,450/day"
  - "Avg Protein: 175g/day"
  - "Consistency Score: 92%"
- **What's Needed:**
  - Query last 7 days from `nutritionLogs`
  - Calculate actual averages for calories/protein
  - Count days with data for consistency
  - Real-time updates
- **Location:** `app/src/components/nutrition-hub/nutrition-trends-card.tsx`
- **Estimated Effort:** 2-3 hours

### 4. **Trends Summary Card** 🟡
- **Status:** Shows hardcoded mock data
- **Current Display:**
  - "Longest Streak: 21 days"
  - "Best Week: Week of Oct 20"
  - "Days This Month: 18/30 goals hit"
- **What's Needed:**
  - Calculate actual longest streak from history
  - Identify best week based on consistency
  - Count monthly goal achievements
  - Comparison to previous periods
- **Location:** `app/src/components/nutrition-hub/nutrition-trends-card.tsx`
- **Estimated Effort:** 3-4 hours

---

## 📊 Data Structure

### Firestore Collections

#### `clientPlans/{userId}`
```typescript
{
  nutritionProtocol: {
    approach: "healthy_habits" | "macro_tracking" | "meal_plan",
    lastUpdated: Timestamp,
    
    // For macro_tracking approach
    macroTracking: {
      calories: number,
      protein: number,
      carbs: number,
      fats: number
    },
    
    // For meal_plan approach
    mealPlan: {
      weeklyPlan: [
        {
          day: "Monday",
          meals: [
            { name: "Breakfast", items: ["item1", "item2"] }
          ]
        }
      ]
    },
    
    // For healthy_habits approach
    healthyHabits: {
      habits: [
        {
          id: string,
          title: string,
          description: string,
          icon: string,
          category: string
        }
      ]
    }
  },
  trainerId: string
}
```

#### `nutritionLogs/{userId}/daily/{date}`
```typescript
{
  meals: {
    Breakfast: [
      {
        name: string,
        calories: number,
        protein: number,
        carbs: number,
        fat: number
      }
    ],
    Lunch: [...],
    Dinner: [...],
    Snacks: [...]
  },
  waterIntake: number, // in oz
  dayComplete: boolean,
  lastUpdated: Timestamp
}
```

#### `habitCompletions/{userId}/daily/{date}`
```typescript
{
  [habitId: string]: boolean
}
```

---

## 🚀 Remaining Work (Prioritized)

### High Priority (Next Sprint)

1. **This Week Card Implementation** ⏱️ 2-3 hours
   - Query last 7 days of nutrition logs
   - Calculate average calories and protein
   - Compute consistency score
   - Add real-time updates

2. **Mark Day Complete Visual Feedback** ⏱️ 1-2 hours
   - Add visual indicator (badge/checkmark)
   - Disable button when complete
   - Success toast notification
   - Show completion in calendar view

3. **Trends Summary Card Implementation** ⏱️ 3-4 hours
   - Calculate longest streak from all history
   - Identify best performing week
   - Count monthly goal achievements
   - Add comparison metrics

### Medium Priority (Future Sprint)

4. **Screenshot Upload to Firebase Storage** ⏱️ 2-3 hours
   - Implement Storage upload
   - Save URL to Firestore
   - Display uploaded images
   - Add delete functionality
   - Handle storage security rules

5. **Cloud Functions for Streak Optimization** ⏱️ 4-6 hours
   - Set up Cloud Functions
   - Create `updateStreaks` function triggered on log write
   - Pre-calculate and store streaks in Firestore
   - Update client to read pre-calculated streaks
   - Handle edge cases (retroactive edits, race conditions)
   - Benefits: 97% reduction in reads, instant load times

### Low Priority (Nice to Have)

6. **Resources Tab Enhancement** ⏱️ Variable
   - Add dynamic content management
   - Upload PDFs, videos, articles
   - Categorize resources by topic
   - Or keep as static educational content

---

## 🔧 Optimization Opportunities

### 1. **Streak Calculation Optimization**

**Current Implementation:**
```typescript
// Client-side, on every page load
for (let i = 0; i < 30; i++) {
  const logSnap = await getDoc(logRef); // 30 reads
}
// ~500ms latency
```

**Proposed: Cloud Functions Pre-Calculation**
```javascript
// Firebase function triggers on write
exports.updateStreaks = functions.firestore
  .document('nutritionLogs/{userId}/daily/{date}')
  .onWrite(async (change, context) => {
    const streaks = await calculateStreaks(userId);
    await setDoc(doc(db, 'nutritionLogs', userId, 'streaks'), streaks);
  });
```

**Benefits:**
- Instant load time (~50ms vs ~500ms)
- 1 read instead of 30 reads (97% reduction)
- Scales to millions of users
- Costs: ~$5/month for 100K users (negligible)

**Edge Cases Handled:**
- Function failures → Client fallback
- Retroactive edits → Recalculates full history
- Race conditions → Debouncing strategy
- Cold starts → Keep-alive pings
- Timezones → User timezone support

**Status:** Designed, ready for implementation

### 2. **Daily Totals Caching**

**Proposal:** Store calculated macro totals when saving meals
```typescript
nutritionLogs/{userId}/daily/{date}
  - meals: {...}
  - dailyTotals: {  // ← New field
      calories: 2450,
      protein: 185,
      carbs: 245,
      fat: 68
    }
```

**Benefits:**
- No need to loop through meals for calculations
- Faster trend calculations
- Easier queries for aggregations

**Effort:** 1 hour

### 3. **localStorage Caching (Alternative)**

**Proposal:** Cache calculated streaks in browser
```typescript
localStorage.setItem('nutritionStreaks', {
  streaks: {...},
  timestamp: Date.now(),
  lastLogDate: "2024-12-24"
});
```

**Benefits:**
- 0ms load time on repeat visits
- 70% reduction in calculations
- No infrastructure changes needed

**Trade-offs:**
- Per-device (not synced across devices)
- Requires cache invalidation on meal logging
- Good stepping stone to Cloud Functions

**Effort:** 2 hours

---

## 📝 Technical Notes

### Security Rules Applied

```javascript
// Firestore Rules
match /habitCompletions/{userId}/daily/{date} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /nutritionLogs/{userId}/daily/{date} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /clientPlans/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  // Write only by trainers (handled separately)
}
```

### Listener Cleanup

All real-time listeners properly registered for cleanup on sign out:
```typescript
const unsubscribe = onSnapshot(...);
registerListener(unsubscribe);

return () => {
  unregisterListener(unsubscribe);
  unsubscribe();
};
```

### Performance Considerations

- **Current Load Time:** ~500-800ms (includes 30 document reads for streaks)
- **Target Load Time:** <200ms (with optimizations)
- **Firestore Reads/Day (1000 users):** ~150,000 reads (~$10/month)
- **Optimized Reads/Day:** ~10,000 reads (~$0.60/month)

### Known Issues

1. ✅ **RESOLVED:** Tab flash on load - fixed by waiting for approach to load
2. ✅ **RESOLVED:** Permissions error on logout - added proper cleanup
3. ✅ **RESOLVED:** Habits tab not showing by default - added key to Tabs component
4. ⚠️ **OPEN:** Streak calculation happens on every page load (optimization pending)

---

## 🎯 Next Steps

### Immediate (This Week)
1. Implement This Week Card with real data
2. Add Mark Day Complete visual feedback
3. Implement Trends Summary Card

### Short-term (Next 2 Weeks)
4. Screenshot Upload to Firebase Storage
5. Consider Cloud Functions for streak optimization

### Long-term (Future)
6. Advanced analytics and insights
7. Weekly/monthly reports
8. Goal setting and tracking
9. Integration with wearables/apps
10. Meal photo recognition (AI)

---

## 📚 Related Documentation

- [Fitness Data Model](../04-architecture/fitness-data-model.md)
- [Frontend Implementation Guide](./frontend-implementation-guide.md)
- [Firestore Rules](../../firestore.rules)

---

## 🔗 Key Files

### Client Components
- `app/src/app/dashboard/client/nutrition/page.tsx` - Main nutrition hub page
- `app/src/components/nutrition-hub/meal-plan-view.tsx` - Meal plan display
- `app/src/components/nutrition-hub/nutrition-habit-tracker.tsx` - Habit tracking
- `app/src/components/nutrition-hub/meal-accordion.tsx` - Food logging
- `app/src/components/nutrition-hub/nutrition-command-center.tsx` - Macro rings
- `app/src/components/nutrition-hub/nutrition-trends-card.tsx` - Stats cards
- `app/src/components/nutrition-hub/nutrition-approach-display.tsx` - Approach info

### Trainer Components
- `app/src/components/trainer/plan/NutritionProtocolEditor.tsx` - Meal plan creator
- `app/src/components/trainer/plan/DailyHabitsEditor.tsx` - Habit assignment

### API
- `app/src/lib/plan-api.ts` - Plan update functions
- `app/src/lib/listener-registry.ts` - Cleanup management

---

**Document Version:** 1.0  
**Author:** Development Team  
**Last Review:** December 24, 2024
