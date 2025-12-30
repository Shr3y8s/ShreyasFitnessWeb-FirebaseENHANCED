# Trainer Nutrition View Specification

## Overview
This specification defines the Trainer Nutrition View feature within the Client Hub, enabling trainers to monitor and analyze client nutrition adherence across three distinct approaches: Healthy Habits, Macro Tracking, and Meal Plan.

## Core Requirements

### Purpose
- Enable trainers to monitor client nutrition progress and adherence in a unified dashboard
- Provide actionable insights based on the client's assigned nutrition approach
- Support portal-based review without external notifications
- Facilitate data-driven coaching conversations

### Supported Nutrition Approaches
1. **Healthy Habits** (`healthy_habits`): Track daily habit completions (e.g., "Eat protein with meals", "3+ servings vegetables")
2. **Macro Tracking** (`macro_tracking`): Detailed calorie and macronutrient tracking with daily goals
3. **Meal Plan** (`meal_plan`): Trainer-created weekly meal plans with limited tracking

### Key Principles
- **Adaptive UI**: Dashboard dynamically changes based on client's assigned nutrition approach
- **Portal-Based Review**: No external notifications; trainers review data in-portal
- **Date Range Selection**: Today, Week, Month, 30 Days, Custom
- **Screenshot Gallery**: Separate view for uploaded nutrition app screenshots (not inline)
- **No Comparison View**: Single client focus (comparison is a future enhancement)
- **Fixed Approaches**: Three standardized approaches (no custom metrics)

## Visual Layout Specifications

### 1. Macro Tracking Approach Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Name - Nutrition Overview                                │
│ [Today ▼] [Week] [Month] [30 Days] [Custom]                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DAILY ADHERENCE CALENDAR (7-day week or 30-day month view)     │
│                                                                  │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                              │
│ [95%][88%][92%][70%][0%] [85%][90%]                            │
│  🟢   🟡   🟢   🟡   🔴   🟡   🟢                                │
│                                                                  │
│ Color Coding:                                                    │
│ 🟢 Green ≥90% | 🟡 Yellow 70-89% | 🔴 Red <70% (or no data)    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DAILY DATA INSPECTOR (Click any day above)                      │
│                                                                  │
│ Date: Monday, Dec 23, 2024                                      │
│ Overall Adherence: 95% 🟢                                       │
│                                                                  │
│ Macros Breakdown:                                               │
│ Calories: 1,950 / 2,000 (97.5%) [Progress Bar] ✓               │
│ Protein:  165g / 170g (97%) [Progress Bar] ✓                    │
│ Carbs:    180g / 200g (90%) [Progress Bar] ✓                    │
│ Fat:      65g / 70g (93%) [Progress Bar] ✓                      │
│                                                                  │
│ Meal Completion: 4/4 meals logged ✓                             │
│ ├─ Breakfast (7:30 AM): 450 cal, 35g P, 40g C, 18g F          │
│ ├─ Lunch (12:30 PM): 550 cal, 45g P, 60g C, 20g F             │
│ ├─ Snack (3:00 PM): 200 cal, 20g P, 15g C, 8g F               │
│ └─ Dinner (7:00 PM): 750 cal, 65g P, 65g C, 19g F             │
│                                                                  │
│ Water Intake: 2.5L / 3.0L (83%) [Tracked separately]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TREND CHARTS (Weekly/Monthly)                                   │
│                                                                  │
│ [Line Chart: Daily Adherence % over time]                       │
│ [Bar Chart: Macro accuracy by nutrient]                         │
│ [Line Chart: Meal completion rate]                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INSIGHTS PANEL (Rule-based alerts)                              │
│                                                                  │
│ 🔴 Missing Data: No logs for 2 days this week                   │
│ 🟡 Protein Trend: Consistently 10-15% below target              │
│ 🟢 Consistency Win: 5-day logging streak!                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCREENSHOT GALLERY                                               │
│ [View Screenshots] → Opens separate gallery view                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ EXPORT OPTIONS                                                   │
│ [Export to CSV] [Generate PDF Report]                           │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Healthy Habits Approach Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Name - Nutrition Overview                                │
│ [Today ▼] [Week] [Month] [30 Days] [Custom]                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HABIT COMPLETION CALENDAR (7-day or 30-day view)                │
│                                                                  │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                              │
│ [5/5][4/5][5/5][3/5][0/5][5/5][5/5]                            │
│  🟢   🟡   🟢   🟡   🔴   🟢   🟢                                │
│                                                                  │
│ Legend: Habits completed / Total habits                         │
│ 🟢 All complete | 🟡 Partial | 🔴 None/low completion           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DAILY HABIT DETAILS (Click any day above)                       │
│                                                                  │
│ Date: Monday, Dec 23, 2024                                      │
│ Completion: 5/5 habits 🟢                                       │
│                                                                  │
│ ✓ Eat protein with every meal                                   │
│ ✓ 3+ servings of vegetables                                     │
│ ✓ Limit processed foods                                         │
│ ✓ No eating after 8 PM                                          │
│ ✓ Drink water before meals                                      │
│                                                                  │
│ Current Streak: 12 days 🔥                                      │
│ Longest Streak: 18 days                                         │
│                                                                  │
│ Water Intake: 2.8L / 3.0L (93%) [Tracked separately]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HABIT TRENDS                                                     │
│                                                                  │
│ [Heatmap: Daily habit completion over 30 days]                  │
│ [Bar Chart: Individual habit success rates]                     │
│ [Line Chart: Streak progression]                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INSIGHTS PANEL                                                   │
│                                                                  │
│ 🟢 Strong Consistency: 85% weekly completion                     │
│ 🟡 Habit Alert: "Limit processed foods" missed 3x this week     │
│ 🔥 Milestone: 12-day streak (personal best: 18 days)            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCREENSHOT GALLERY                                               │
│ [View Screenshots] → Opens separate gallery view                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Meal Plan Approach Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Client Name - Nutrition Overview                                │
│ [Today ▼] [Week] [Month] [30 Days] [Custom]                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ MEAL PLAN ADHERENCE CALENDAR                                     │
│                                                                  │
│ Mon  Tue  Wed  Thu  Fri  Sat  Sun                              │
│ [4/4][4/4][3/4][4/4][0/4][4/4][4/4]                            │
│  ✓    ✓    ⚠    ✓    ✗    ✓    ✓                              │
│                                                                  │
│ Legend: Meals logged / Planned meals                            │
│ ✓ All logged | ⚠ Partial | ✗ None/low tracking                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DAILY MEAL TRACKING (Click any day above)                       │
│                                                                  │
│ Date: Monday, Dec 23, 2024                                      │
│ Meal Plan Adherence: 4/4 meals ✓                                │
│                                                                  │
│ Planned Meals (from trainer's weekly meal plan):                │
│ ✓ Breakfast: Greek yogurt bowl with berries                     │
│ ✓ Lunch: Grilled chicken salad                                  │
│ ✓ Snack: Apple with almond butter                               │
│ ✓ Dinner: Salmon with roasted vegetables                        │
│                                                                  │
│ Note: Minimal tracking - focus is on plan adherence, not macros │
│                                                                  │
│ Water Intake: 2.5L / 3.0L (83%) [Tracked separately]           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ADHERENCE TRENDS                                                 │
│                                                                  │
│ [Line Chart: Daily meal completion rate]                        │
│ [Bar Chart: Weekly adherence summary]                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ INSIGHTS PANEL                                                   │
│                                                                  │
│ 🟢 Good Adherence: 6/7 days with full meal logging              │
│ 🔴 Gap Alert: No data for Friday                                │
│ 💡 Tip: Client following plan consistently                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCREENSHOT GALLERY                                               │
│ [View Screenshots] → Opens separate gallery view                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CURRENT MEAL PLAN                                                │
│ [View Full Weekly Meal Plan] → Links to meal plan editor        │
└─────────────────────────────────────────────────────────────────┘
```

## Screenshot Gallery Design

The screenshot gallery is a separate view (not inline) accessed via a button in each approach's main view.

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Nutrition Overview]  Screenshot Gallery              │
│                                                                  │
│ Filter: [All Days ▼] [This Week] [This Month]                  │
│ Sort: [Newest First ▼]                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCREENSHOT GRID (3-4 columns, responsive)                        │
│                                                                  │
│ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                 │
│ │[Image] │  │[Image] │  │[Image] │  │[Image] │                 │
│ │Dec 23  │  │Dec 22  │  │Dec 21  │  │Dec 20  │                 │
│ │8:30 AM │  │7:45 PM │  │12:15PM │  │6:00 PM │                 │
│ │MyFit...|  │Cronome.│  │MyFit...|  │Photo   │                 │
│ └────────┘  └────────┘  └────────┘  └────────┘                 │
│                                                                  │
│ [Click any screenshot to open lightbox view]                    │
│                                                                  │
│ Lightbox features:                                               │
│ - Full-size image display                                        │
│ - Date/time metadata                                             │
│ - Navigation arrows (prev/next)                                  │
│ - Download option                                                │
│ - Delete option (trainer only)                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Structure Reference

### Firestore Collections

#### `nutritionLogs/{userId}/daily/{date}`
```typescript
{
  date: string,           // "2024-12-23"
  meals: {
    breakfast?: {
      name: string,
      calories: number,
      protein: number,
      carbs: number,
      fat: number,
      time: string
    },
    lunch?: { /* same structure */ },
    snack?: { /* same structure */ },
    dinner?: { /* same structure */ }
  },
  totalCalories: number,
  totalProtein: number,
  totalCarbs: number,
  totalFat: number,
  adherencePercentage: number,  // Calculated based on goals
  mealsCompleted: number,       // Must be 4 for full completion
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

**Key Rule**: All 4 meal categories (breakfast, lunch, snack, dinner) must have entries for the day to be considered complete. This matches the client-side implementation in `app/src/app/dashboard/client/nutrition/page.tsx`.

#### `nutritionLogs/{userId}/habits/{date}`
```typescript
{
  date: string,           // "2024-12-23"
  habits: {
    [habitId: string]: boolean  // true if completed
  },
  completionCount: number,
  totalHabits: number,
  completionPercentage: number,
  streak: number,         // Consecutive days of full completion
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### `clientPlans/{userId}`
```typescript
{
  nutritionApproach: "healthy_habits" | "macro_tracking" | "meal_plan",
  nutritionGoals?: {
    calories: number,
    protein: number,
    carbs: number,
    fat: number
  },
  habitsList?: string[],  // For healthy_habits approach
  mealPlan?: {
    [day: string]: {
      breakfast: string,
      lunch: string,
      snack: string,
      dinner: string
    }
  },
  waterGoal?: number,     // Liters per day
  // ... other plan fields
}
```

#### `dailyActivities/{userId}`
```typescript
{
  [date: string]: {
    water?: number,       // Liters consumed (separate from macro approach)
    steps?: number,
    weight?: number,
    habits?: { [habitId: string]: boolean },
    // ... other daily activity fields
  }
}
```

**Important**: Water intake is tracked separately in the `dailyActivities` collection, NOT within the macro tracking approach. This applies to all three nutrition approaches.

#### `nutritionScreenshots/{userId}/{screenshotId}`
```typescript
{
  url: string,
  uploadDate: Timestamp,
  captureDate?: string,   // Optional: when the screenshot was taken
  source?: string,        // e.g., "MyFitnessPal", "Cronometer"
  metadata?: {
    width: number,
    height: number,
    size: number
  }
}
```

## Calculations & Rules

### Macro Tracking Adherence
```typescript
// Per-nutrient adherence
const calorieAdherence = (actual / goal) * 100;
const proteinAdherence = (actual / goal) * 100;
const carbsAdherence = (actual / goal) * 100;
const fatAdherence = (actual / goal) * 100;

// Overall adherence (average of all nutrients)
const overallAdherence = (
  calorieAdherence + 
  proteinAdherence + 
  carbsAdherence + 
  fatAdherence
) / 4;

// Color coding
if (overallAdherence >= 90) return "green";    // 🟢
if (overallAdherence >= 70) return "yellow";   // 🟡
return "red";                                  // 🔴
```

### Healthy Habits Completion
```typescript
const completionPercentage = (completedHabits / totalHabits) * 100;

// Streak calculation (consecutive days with 100% completion)
// See: app/src/components/nutrition-hub/nutrition-habit-tracker.tsx
```

### Meal Plan Adherence
```typescript
const adherenceRate = (mealsLogged / plannedMeals) * 100;

// Simple tracking: focus on meal completion, not macros
```

## Implementation Phases

### Phase 1: MVP Dashboard (2-3 days)
**Goal**: Basic nutrition monitoring for trainers

- [ ] Create trainer nutrition view route: `/dashboard/trainer/client-hub/[id]/nutrition`
- [ ] Implement approach detection from `clientPlans/{userId}`
- [ ] Build macro tracking view with daily calendar and data inspector
- [ ] Build healthy habits view with completion calendar
- [ ] Build meal plan view with adherence tracking
- [ ] Add date range selector (Today, Week, Month, 30 Days, Custom)
- [ ] Implement color-coded adherence indicators
- [ ] Add water intake display (from `dailyActivities` collection)

**Dependencies**:
- Read access to `nutritionLogs/{userId}/daily/{date}`
- Read access to `nutritionLogs/{userId}/habits/{date}`
- Read access to `clientPlans/{userId}`
- Read access to `dailyActivities/{userId}`

### Phase 2: Analytics & Trends (2 days)
**Goal**: Data visualization and insights

- [ ] Implement trend charts for macro tracking (line & bar charts)
- [ ] Implement habit heatmap and success rate charts
- [ ] Implement meal plan adherence trends
- [ ] Build insights panel with rule-based alerts
  - Missing data detection
  - Nutrient trends (consistently above/below target)
  - Streak milestones
  - Consistency patterns
- [ ] Add screenshot gallery view
  - Grid layout with date/time metadata
  - Lightbox for full-size viewing
  - Filter and sort options
  - Download functionality

**Dependencies**:
- Charting library (e.g., Recharts, Chart.js)
- Read access to `nutritionScreenshots/{userId}/{screenshotId}`

### Phase 3: Intelligence & Export (1-2 days)
**Goal**: Advanced features and reporting

- [ ] CSV export functionality
  - Daily macro logs
  - Habit completion history
  - Meal plan adherence
- [ ] PDF report generation
  - Weekly/monthly summary
  - Charts and insights
  - Screenshot compilation
- [ ] Advanced insights algorithms
  - Adherence patterns
  - Day-of-week trends
  - Habit correlation analysis

**Dependencies**:
- CSV export utility
- PDF generation library (e.g., jsPDF)

## Design Elements

### Color Coding System
- **Green (🟢)**: ≥90% adherence/completion
- **Yellow (🟡)**: 70-89% adherence/completion
- **Red (🔴)**: <70% adherence/completion or no data

### Typography & Spacing
- Follow existing Client Hub design patterns
- Use consistent card layouts with subtle shadows
- Responsive grid for calendar views (7 columns for week, 5-6 columns for month)

### Interactive Elements
- Clickable calendar dates to show daily details
- Collapsible meal accordions in daily inspector
- Hover states for all interactive elements
- Loading states for data fetches

## Acceptance Criteria

- [ ] Trainer can view nutrition data for any client with an assigned nutrition approach
- [ ] Dashboard adapts to show appropriate view based on client's approach (macro_tracking, healthy_habits, meal_plan)
- [ ] Date range selection works correctly (Today, Week, Month, 30 Days, Custom)
- [ ] Color-coded adherence indicators display accurately
- [ ] Daily data inspector shows complete meal/habit details when clicking calendar dates
- [ ] Water intake displays correctly from `dailyActivities` collection (separate from macros)
- [ ] Trend charts render correctly with real data
- [ ] Insights panel shows relevant, rule-based alerts
- [ ] Screenshot gallery opens in separate view with grid layout
- [ ] Export to CSV and PDF functions generate correct reports
- [ ] All 4 meal categories must be logged for macro tracking day completion
- [ ] Habit streaks calculate correctly based on consecutive full-completion days
- [ ] Meal plan adherence shows meals logged vs. planned meals

## Related Documentation

- [Nutrition Hub Implementation Status](./nutrition-hub-implementation-status.md) - Client-side nutrition features (~92% complete)
- [Client Hub Implementation Spec](./client-hub-implementation-spec.md) - Overall Client Hub architecture
- [Daily Activities and Progress Tracking](./daily-activities-and-progress-tracking.md) - Water and habit tracking

## Notes

- **No Notifications**: Trainers review data in-portal; no push notifications or emails for nutrition updates
- **No Comparison View**: Single client focus; comparison across multiple clients is a future enhancement
- **Fixed Approaches**: Three standardized approaches only; no custom metrics or hybrid approaches
- **Water Tracking**: Always separate from macro approach, stored in `dailyActivities` collection
- **Screenshot Organization**: Separate gallery view to avoid cluttering main dashboard
- **Portal-First Design**: All interactions happen within the web application
