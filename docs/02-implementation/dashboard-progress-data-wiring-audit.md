# Dashboard & Progress Pages — Data Wiring Audit

**Scope:** Client Home (`/dashboard/client`, `app/src/app/dashboard/client/page.tsx`) and
Client Progress (`/dashboard/client/progress`, `app/src/app/dashboard/client/progress/page.tsx`).

**Purpose:** Document which UI components are wired to real Firestore data today versus
which still render mock/hardcoded data, and lay out a phased plan to finish the unwired pieces.

**Last updated:** 2026-06-29

---

## TL;DR

The large majority of both pages are genuinely wired to real Firestore data and correctly
show empty/zero states for a brand-new client. **Five** pieces are (or were) not wired:

| # | Item | Page | State after this session | Real data source exists? |
|---|------|------|---------------------------|--------------------------|
| 1 | Coach Note ("A Note from Coach") | Dashboard | Still hardcoded string | ✅ Yes — `clientPlans.weeklyFocus` |
| 2 | Metric Achievements | Progress | Empty state (was mock) | ⚠️ Partial — goals/milestones/streak |
| 3 | Personal Records | Dashboard | Empty state (was mock) | ✅ Yes — workout set logs |
| 4 | Strength Gain (Key Metrics card) | Dashboard + Progress | "—" placeholder (was +8%) | ✅ Yes — workout set logs |
| 5 | Strength Trends | Progress | Empty state (was mock) | ✅ Yes — workout set logs |

> Note on history: Items 2, 4 (Strength Trends), and Personal Records were **born as mock
> components** (first introduced in commit `f7ffc60`, "implement comprehensive progress
> tracking dashboard"). They were never wired to data. They were **not** broken by the
> launch-prep sidebar cleanup — the live progress route already imports the real
> `components/client-progress/` folder; these specific widgets simply never had a real
> implementation in either the `progress/` or `client-progress/` folder.

---

## ✅ Wired correctly today (no work needed)

### Client Home (`/dashboard/client`)

| Component | File | Firestore source |
|-----------|------|------------------|
| Upcoming Session reminder | `dashboard/client/page.tsx` → `UpcomingWorkoutReminder` | `sessions` (clientId, scheduled, next) + `training_locations` / client address |
| Daily Habits checklist | `activity/DailyHabitsChecklist` | `clientPlans.dailyHabits` + `dailyActivities/{uid}_{date}` |
| Onboarding checklist | `dashboard/onboarding-checklist` | `goals/{uid}_setup` (milestones) |
| Coach Outreach — Tasks | `dashboard/coach-outreach` | `clientTasks` (status=pending) |
| Coach Outreach — Chat unread | `dashboard/coach-outreach` | `client_messages` (unread from trainer) |
| Coach Reminders / Announcements | `dashboard/coach-reminders` | `clientNotifications` (coach-action types) |
| Activity Alerts | `dashboard/activity-alerts` | `clientNotifications` (auto types) + live engagement on `dailyActivities` / `nutritionLogs` / `workouts` |
| Workout Calendar | `dashboard/workout-calendar` | `workouts` (scheduled + completed) |
| Nutrition Summary | `dashboard/nutrition-summary` | `clientPlans.nutritionProtocol` + `nutritionLogs/{uid}/meals/{date}` + `dailyActivities` (water) |
| Current Plan | `dashboard/current-plan` | `clientPlans.trainingProtocol` |
| Key Metrics — Weight Journey | `client-progress/key-metrics-overview` | `weightLogs` via `getRecentWeightLogs` |
| Key Metrics — Workout Streak | same | `goals/{uid}_workout_consistency.currentStreak` |
| Key Metrics — Steps | same | `dailyActivities` (today + 7-day avg) |
| Key Metrics — Habit Score | same | computed from `nutritionLogs` + `dailyActivities` + workout stats |
| Account Summary | `dashboard/account-summary` | `users/{uid}` (createdAt, etc.) |
| Weekly Check-in scheduling | `dashboard/client/checkins/page.tsx` | Calendly + `sessions` (checkin) via `checkin-api` |

### Client Progress (`/dashboard/client/progress`)

| Component | File | Firestore source |
|-----------|------|------------------|
| Key Metrics Overview | `client-progress/key-metrics-overview` | same as dashboard (weight/steps/streak/habit-score) |
| Progress Charts (weight + photos) | `client-progress/progress-charts` | `weightLogs` + progress photos via `getUserProgressPhotos` |
| Habit Tracker (Today/Weekly/Monthly) | `client-progress/habit-tracker` | `clientPlans` + `dailyActivities` + `nutritionLogs` + `workouts` + `goals` workoutStats |
| Qualitative Trends (Well-being) | `client-progress/qualitative-trends` | weekly surveys via `getRecentSurveys` |

---

## ❌ Not wired (current state + fix path)

### 1. Coach Note — "A Note from Coach"
- **UI:** `dashboard/client/page.tsx` builds a hardcoded `coachNote` object (lines ~479–482)
  and passes it to `CoachOutreach`.
- **Real data EXISTS:** Trainers write "Notes from Last Call" in the client-hub **Plan tab**
  via `WeeklyFocusEditor`, persisted to `clientPlans.weeklyFocus.weeks[]` as
  `{ coachNotes, lastCallDate, adjustments, priorities, weekStartDate }`
  (type `WeeklyFocusData` in `types/plan.ts`).
- **Why it's easy:** The dashboard already loads the plan (`getClientPlan(user.uid)` → `planData`),
  so `planData.weeklyFocus.weeks` is already in memory. No new data model, no new trainer UI.
- **Fix:** Select the latest week's `coachNotes` (+ optional `lastCallDate`) and pass to
  `CoachOutreach`; show a friendly default/empty state when none set.

### 2. Metric Achievements
- **UI:** `client-progress/achievements.tsx` — now an empty state ("No achievements yet").
  Previously a hardcoded `mockAchievements` array.
- **Real data:** Partial — a real Goals & Milestones engine exists
  (`firebase/functions/goals.js` auto-computes streaks/weight/milestone completion;
  `lib/goals-api.ts`; `components/goals/achievement-level.tsx` belt levels).
- **Fix:** Define an achievements catalog (e.g., First Weigh-In, 7/30-Day Workout Streak,
  First PR, weight-loss milestones) and compute earned/locked from existing data
  (`goals/{uid}_workout_consistency`, weight logs, goal milestones). Render real states;
  keep empty state when none earned.

### 3. Personal Records
- **UI:** `dashboard/personal-records.tsx` — now an empty state ("No personal records yet").
  Previously fully hardcoded (315 lb deadlift, etc.).
- **Real data EXISTS:** Workout completion logs set-level performance —
  `StrengthActualData.completedSets[].actualWeight / actualReps / actualWeightUnit`
  (`types/workout.ts`). There is also a defined-but-unwritten `Workout.personalRecords` field
  ("detected at completion time") and an existing hook `useStrengthProgressionData.ts` that
  already computes max weight per exercise over time.
- **Fix options:**
  - (a) Derive PRs on read from completed `workouts` (max `actualWeight` per key lift,
    best estimated 1RM), reusing `useStrengthProgressionData` logic; or
  - (b) Populate `Workout.personalRecords` at completion time (Cloud Function in
    `firebase/functions/workouts.js`) and a `personalRecords/{uid}` doc for fast reads.
- **Dependency:** Confirmed present — set-level weight/reps ARE logged.

### 4. Strength Gain (Key Metrics card)
- **UI:** `client-progress/key-metrics-overview.tsx` — `strength-gain` metric now shows "—"
  / "Not enough data yet". Previously hardcoded "+8%". No effect ever updated it.
- **Real data:** No precomputed value, but the raw inputs exist (set logs) and
  `useStrengthProgressionData.ts` / `useVolumeData.ts` already compute progression/volume.
- **Fix:** Compute an estimated strength change % over a trailing window (e.g., 30 days)
  from estimated-1RM (Epley) of key lifts; feed the card. Shared with item 5.

### 5. Strength Trends
- **UI:** `client-progress/strength-trends.tsx` — now an empty state. Previously hardcoded
  Push +15% / Pull +12% / Legs +20%.
- **Real data:** Same as item 4 — derivable from set logs; no engine wired yet.
- **Fix:** Build estimated-1RM trend grouped into Push/Pull/Legs with % change over 30 days
  (shared calc util with item 4; optionally precomputed via Cloud Function like workout streaks).

---

## Recently fixed this session (empty states, no fake data)

These were changed from mock/placeholder to honest empty states so a new client sees no
fabricated numbers:

- **Personal Records** → "No personal records yet" empty state.
- **Weight Journey** (Key Metrics) → "Log your first weigh-in" when no weight logs
  (previously left fake 202/215 defaults on screen).
- **Strength Gain** (Key Metrics) → "—" / "Not enough data yet" (was hardcoded +8%).
- **Nutrition goals** (Nutrition Summary, macro tracking) → "Nutrition targets not set yet"
  when no `clientPlans` macro protocol (was 2400/180/240/80 fallback).
- **Strength Trends** → "Not enough data yet" empty state (was +15/+12/+20%).
- **Metric Achievements** → "No achievements yet" empty state (was `mockAchievements`).

---

## Implementation plan (phased)

### Phase 1 — Coach Note (small, data already exists) ⭐ quick win
- Read latest `clientPlans.weeklyFocus.weeks[]` entry in `dashboard/client/page.tsx`.
- Pass real `coachNotes` (+ `lastCallDate`) to `CoachOutreach`; default/empty when unset.
- No backend or trainer-UI changes.

### Phase 2 — Metric Achievements (medium, data largely exists)
- Define achievements catalog + earned-state logic from streak/weight/milestone data.
- Wire `achievements.tsx` to real earned/locked; keep empty state when none.

### Phase 3 — Personal Records (medium; set-data confirmed present)
- Choose derive-on-read (reuse `useStrengthProgressionData`) vs. precompute-on-completion.
- Wire `personal-records.tsx` to real PRs; keep empty state when none.

### Phase 4 — Strength Gain + Strength Trends (largest; shared engine)
- Build estimated-1RM (Epley) calc util grouped into Push/Pull/Legs over a trailing window.
- Feed both the Key Metrics "Strength Gain" card and the Strength Trends component.
- Optionally precompute via Cloud Function (mirrors workout-streak precompute in `goals.js`).

**Recommended order:** Phase 1 → Phase 2 → Phase 3 → Phase 4
(Phases 1–2 are quick wins on existing data; Phase 4 is the biggest as it needs a new
calculation engine.)

---

# Trainer-Side (Client Hub) Data Wiring

**Scope:** Trainer → Client Hub → `[id]` tabs (Progress, Training) and the linked
Training Performance Dashboard (`[id]/training`).

**Last reviewed:** 2026-07-03

## TL;DR (trainer side)

Almost everything on the trainer side is genuinely wired to Firestore. Only **two**
issues exist:

| # | Location | Item | Issue |
|---|----------|------|-------|
| T1 | Client Hub → Progress tab (`ClientProgressDashboard`) | **Strength Gain** card | Hardcoded `useState('+8')` — never computed (same fake metric as the client side) |
| T2 | Training → Performance Dashboard (`[id]/training/page.tsx`) | **Dev note** ("📝 Phase 1… placeholder data") | Stale/false — the cards ARE real now; note misleads and should be deleted |

## A. Client Hub → Progress tab (`components/trainer/client-progress/ClientProgressDashboard.tsx`)

✅ **Wired to real data:**
- Body Metrics (current/start weight, total change, since-last, avg/log, ST & LT goals) →
  `weightLogs` + `goals/{id}_weight_loss(_st)`.
- Adherence: Steps, Workout Streak, Habit Score → `dailyActivities`,
  `goals/{id}_workout_consistency`, computed habit score.
- Weekly Check-in (last 2 surveys) → `getRecentSurveys`.
- Daily Activity (7-day steps/water/habits) → `dailyActivities`.
- LISS Cardio adherence → `clientPlans.lissCardio` + activity logs.
- Progress Photos → `getUserProgressPhotos`.

❌ **Not wired:** **Strength Gain** card — `const [strengthGain] = useState('+8')` (line ~48).
Always shows "+8%" for every client.

## B. Client Hub → Training tab (`app/.../client-hub/[id]/page.tsx`, `activeTab === 'training'`)

✅ **Fully real.** Workout Assignments / Training Sessions / Check-ins metrics
(last-month & last-3-months completed / total / on-time) are computed from live
`workouts` + `sessions` queries. Upcoming/completed sessions & check-ins, locations, and
workout assignment lists are all real listeners. No mock data.

## C. Client Hub → Training → Performance Dashboard (`app/.../client-hub/[id]/training/page.tsx`)

✅ **Fully real** (4 summary cards + 4 charts):
- **Avg Workout Duration** — mean of `workouts.durationMinutes` (last 4 weeks).
- **Training Streak** (current + longest) — consecutive-day streak from completed-workout dates.
- **Volume Trend** — Σ(`actualWeight × actualReps`) over completed sets, last 4 wks vs prior 4 wks.
- **Personal Records** (this month) — reads `clientStats.strengthRecords`, which
  `firebase/functions/workouts.js` writes at workout completion (compares each set's
  `actualWeight` to the stored per-exercise max). PR detection is implemented end-to-end.
- **Charts** — Strength Progression, Volume, Consistency Heatmap, Exercise Completion, each
  backed by real hooks over `workouts` (`useStrengthProgressionData`, `useVolumeData`,
  `useConsistencyData`, exercise-completion hook).

❌ **Only issue:** stale dev note at the bottom (lines ~867–874):
> "📝 Phase 1: Core structure with placeholder data. Analytics cards show static values…
> Phase 2 will implement real data calculations."

This is **false now** — the cards are fully wired. Delete the note.

## D. Reference: how the existing real engines calculate

- **Strength Progression** (`useStrengthProgressionData.ts`): for each completed workout,
  per strength exercise, take **max `actualWeight` across completed sets** = one data point;
  group by `exerciseId`; show top 6 by frequency over 12 weeks. (Top-set weight; ignores reps.)
- **Volume** (`useVolumeData` + Performance page inline calc): Σ(`actualWeight × actualReps`)
  over completed sets (reps-aware). Proves both `actualWeight` and `actualReps` are logged.
- **PRs** (`firebase/functions/workouts.js`): on completion, compare each set's `actualWeight`
  to `clientStats.strengthRecords[exerciseId].maxWeight`; update the record + write
  `workout.personalRecords` if exceeded.

---

# Finalized Calculation Methods (the "right way")

All methods below use **only data already logged** in `workouts`
(`StrengthActualData.completedSets[].{actualWeight, actualReps, actualWeightUnit, completed}`,
`exercise.exerciseId/exerciseName/exerciseType`, `workout.completedAt/status`). No schema
change or new logging is required. Defensive rule everywhere: **only count a set when
`set.completed && set.actualWeight && set.actualReps`** (matches `useVolumeData`).

## Estimated 1-Rep-Max (e1RM) — shared primitive

Use the **Epley formula** (reps-aware, standard):

```
e1RM = weight × (1 + reps / 30)
```

Per exercise per workout, take the **best e1RM across that day's completed sets**.
Rationale for e1RM over raw top-set weight: it credits rep progression (185×3 → 185×10 is
real progress) and normalizes across set/rep schemes.

## M1 — Strength Gain % (single number)

Used by: trainer Progress-tab **Strength Gain** card (T1) AND the client-side Key Metrics
"Strength Gain" card.

**Method: adaptive window** (finalized — chosen to minimize time-to-first-value):
1. Build each exercise's chronological e1RM series (best e1RM per session).
2. **If** the client has enough history for two non-overlapping 30-day windows with at least
   one exercise appearing in both → compute **mature** value:
   - For each such exercise: `%Δ = (avg e1RM last 30d − avg e1RM prior 30d) / avg e1RM prior 30d`.
   - Strength Gain % = equal-weighted average of per-exercise %Δ. Label: "last 30 days".
3. **Else if** any exercise has **≥2 logged sessions** → compute **early** value:
   - For each such exercise: `%Δ = (latest e1RM − first e1RM) / first e1RM`.
   - Strength Gain % = equal-weighted average. Label: "since you started".
4. **Else** (0–1 sessions, or missing weight/reps) → render **"—" / "Not enough data yet."**

Effect: a real value appears after the **2nd logged strength session** (days, not months)
and automatically upgrades to the stable 30-day comparison once the client has ~60 days of
history. Only compares like-for-like exercises (robust to program changes).

## M2 — Strength Trends by category (Push / Pull / Legs)

Used by: client progress page **Strength Trends** component.

- Same e1RM engine + same **adaptive window** as M1, but group exercises into
  **Push / Pull / Legs** using the Exercise library (`exercises/{id}.muscleGroup` /
  `movementPattern`), joined by `exerciseId` (one extra read/lookup).
- Category %Δ = equal-weighted average of per-exercise e1RM %Δ within that category.
- Empty-state any category with insufficient data ("Not enough data yet").

## M3 — Personal Records (client dashboard card)

- **Reuse the existing** `clientStats.strengthRecords` (already maintained by `workouts.js`).
- Show top N by weight (or most recent), mirroring the trainer Performance Dashboard PR card.
- Appears on the **very first PR** (no window needed). Empty-state when none.

## M4 — Metric Achievements (client progress page)

- Compute earned/locked from existing data:
  - Streak milestones → `goals/{uid}_workout_consistency`.
  - First weigh-in / weight-loss milestones → `weightLogs` + `goals/{uid}_weight_loss(_st)`.
  - PR count → `clientStats.strengthRecords`.
  - Goal-milestone completions → `goals`.
- Belt/level logic already partially exists in `components/goals/achievement-level.tsx`.
- Empty-state when nothing earned yet.

## Shared implementation note

Create a single util — `app/src/lib/strength-metrics.ts` — as the one source of truth:
- `computeE1RM(weight, reps)` — Epley.
- `getExerciseE1RMSeries(clientId, weeksBack)` — per-exercise chronological best-e1RM series.
- `getStrengthGainPct(clientId)` — M1 adaptive window; returns `{ value, label, hasData }`.
- `getStrengthTrendsByCategory(clientId)` — M2 (Push/Pull/Legs), returns per-category `{ value, label, hasData }`.

Both the trainer Progress-tab card and the client-side cards consume this util so their math
can never drift apart. (Optionally precompute into `clientStats` via a Cloud Function later,
mirroring how workout streaks are precomputed in `goals.js`, but on-read is fine to start.)

## Data-availability confirmation

All inputs verified present in `types/workout.ts` and already consumed by
`useVolumeData` / `useStrengthProgressionData`:
`actualWeight`, `actualReps`, `actualWeightUnit`, `completed`, `exerciseId`, `exerciseName`,
`exerciseType`, `workout.completedAt`, `workout.status`. Category data for M2 lives on the
`exercises` library docs (`muscleGroup` / `movementPattern`).

## Trainer-side implementation plan

- **TP1** — Wire the Progress-tab **Strength Gain** card to `getStrengthGainPct` (M1); show
  "—" empty state until the 2nd session. (Small.)
- **TP2** — Delete the stale "Phase 1 placeholder data" dev note on the Performance Dashboard. (Trivial.)
- **TP3** — (Client-side, shared) Implement `strength-metrics.ts` and wire the client Key
  Metrics "Strength Gain" + "Strength Trends" via M1/M2; wire Personal Records via M3 and
  Metric Achievements via M4.


