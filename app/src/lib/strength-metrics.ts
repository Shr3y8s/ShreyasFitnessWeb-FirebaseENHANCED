// Strength metrics — single source of truth for estimated-1RM based calculations.
//
// Used by the trainer Client-Hub Progress tab "Strength Gain" card and (later) the
// client-side Key Metrics "Strength Gain" + "Strength Trends" widgets, so the math can
// never drift apart.
//
// All inputs come from data already logged on completed `workouts`
// (StrengthActualData.completedSets[].{actualWeight, actualReps, actualWeightUnit, completed}).
// No schema change or new logging is required.

import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subWeeks } from 'date-fns';


// ── e1RM primitive (Epley) ────────────────────────────────────────────────

/**
 * Epley estimated 1-rep-max. Reps-aware: credits rep progression at the same weight.
 * e1RM = weight × (1 + reps / 30)
 */
export function computeE1RM(weight: number, reps: number): number {
  if (!weight || !reps || weight <= 0 || reps <= 0) return 0;
  return weight * (1 + reps / 30);
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface E1RMPoint {
  timestamp: Date;
  e1rm: number;
}

export interface ExerciseE1RMSeries {
  exerciseId: string;
  exerciseName: string;
  points: E1RMPoint[]; // chronological (oldest → newest)
}

export interface StrengthGainResult {
  value: number | null; // percentage, e.g. 8 means +8%
  label: string;         // e.g. "last 30 days" or "since you started"
  hasData: boolean;
}

// ── Data fetch: per-exercise best-e1RM series ────────────────────────────────

/**
 * Fetch completed workouts for a client over the last `weeksBack` weeks and build,
 * for each strength exercise, a chronological series of the best e1RM achieved per session.
 */
export async function getExerciseE1RMSeries(
  clientId: string,
  weeksBack: number = 26
): Promise<Record<string, ExerciseE1RMSeries>> {
  if (!clientId) return {};

  const startDate = subWeeks(new Date(), weeksBack);

  const workoutsRef = collection(db, 'workouts');
  const q = query(
    workoutsRef,
    where('clientId', '==', clientId),
    where('status', '==', 'completed'),
    where('completedAt', '>=', startDate),
    orderBy('completedAt', 'asc')
  );

  const snapshot = await getDocs(q);
  const series: Record<string, ExerciseE1RMSeries> = {};

  snapshot.docs.forEach((doc) => {
    const workout = doc.data();
    const completedAt = workout.completedAt?.toDate?.();
    if (!completedAt || !Array.isArray(workout.exercises)) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workout.exercises.forEach((exercise: any) => {
      if (exercise.exerciseType !== 'strength' || !exercise.actual) return;
      if (exercise.actual.type !== 'strength' || !Array.isArray(exercise.actual.completedSets)) return;

      // Best e1RM across this workout's completed sets for this exercise
      let bestE1RM = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exercise.actual.completedSets.forEach((set: any) => {
        if (set.completed && set.actualWeight && set.actualReps) {
          const e1rm = computeE1RM(set.actualWeight, set.actualReps);
          if (e1rm > bestE1RM) bestE1RM = e1rm;
        }
      });

      if (bestE1RM === 0) return;

      const exerciseId = exercise.exerciseId;
      if (!series[exerciseId]) {
        series[exerciseId] = {
          exerciseId,
          exerciseName: exercise.exerciseName,
          points: [],
        };
      }
      series[exerciseId].points.push({ timestamp: completedAt, e1rm: bestE1RM });
    });
  });

  // Ensure chronological order per exercise
  Object.values(series).forEach((s) =>
    s.points.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  );

  return series;
}

// ── M1: Strength Gain % (adaptive window) ────────────────────────────────────

function averageE1RMInWindow(points: E1RMPoint[], start: Date, end: Date): number | null {
  const inWindow = points.filter((p) => p.timestamp >= start && p.timestamp < end);
  if (inWindow.length === 0) return null;
  const sum = inWindow.reduce((acc, p) => acc + p.e1rm, 0);
  return sum / inWindow.length;
}

/**
 * M1 — Strength Gain %, using an adaptive window to minimize time-to-first-value:
 *  1. Mature (≥1 exercise with data in BOTH the last 30 days AND the prior 30 days):
 *     %Δ per exercise = (avg e1RM last 30d − avg e1RM prior 30d) / avg e1RM prior 30d,
 *     averaged across those exercises. Label: "last 30 days".
 *  2. Early (≥1 exercise logged in ≥2 sessions): %Δ = (latest e1RM − first e1RM) / first e1RM,
 *     averaged. Label: "since you started".
 *  3. Otherwise → { value: null, hasData: false }.
 */
export async function getStrengthGainPct(clientId: string): Promise<StrengthGainResult> {
  const emptyResult: StrengthGainResult = { value: null, label: '', hasData: false };
  if (!clientId) return emptyResult;

  let series: Record<string, ExerciseE1RMSeries>;
  try {
    series = await getExerciseE1RMSeries(clientId, 26);
  } catch (err) {
    console.error('Error computing strength gain:', err);
    return emptyResult;
  }

  const exercises = Object.values(series);
  if (exercises.length === 0) return emptyResult;

  const now = new Date();
  const window30 = new Date(now);
  window30.setDate(window30.getDate() - 30);
  const window60 = new Date(now);
  window60.setDate(window60.getDate() - 60);

  // ── Attempt mature (30d vs prior 30d) ──
  const maturePctChanges: number[] = [];
  for (const ex of exercises) {
    const recentAvg = averageE1RMInWindow(ex.points, window30, now);
    const priorAvg = averageE1RMInWindow(ex.points, window60, window30);
    if (recentAvg !== null && priorAvg !== null && priorAvg > 0) {
      maturePctChanges.push(((recentAvg - priorAvg) / priorAvg) * 100);
    }
  }
  if (maturePctChanges.length > 0) {
    const avg = maturePctChanges.reduce((a, b) => a + b, 0) / maturePctChanges.length;
    return { value: Math.round(avg), label: 'last 30 days', hasData: true };
  }

  // ── Fallback early (first vs latest) ──
  const earlyPctChanges: number[] = [];
  for (const ex of exercises) {
    if (ex.points.length >= 2) {
      const first = ex.points[0].e1rm;
      const latest = ex.points[ex.points.length - 1].e1rm;
      if (first > 0) {
        earlyPctChanges.push(((latest - first) / first) * 100);
      }
    }
  }
  if (earlyPctChanges.length > 0) {
    const avg = earlyPctChanges.reduce((a, b) => a + b, 0) / earlyPctChanges.length;
    return { value: Math.round(avg), label: 'since you started', hasData: true };
  }

  return emptyResult;
}

// ── M2: Strength Trends by category (Push / Pull / Legs) ─────────────────────

export type StrengthCategory = 'Push' | 'Pull' | 'Legs';

export interface CategoryTrend {
  category: StrengthCategory;
  value: number | null; // percentage
  label: string;
  hasData: boolean;
}

/**
 * Classify an exercise into Push / Pull / Legs using the exercise-library metadata.
 * Prefers movementPattern, falls back to muscleGroup / name heuristics. Returns null
 * when it can't be confidently categorized.
 */
function categorizeExercise(
  movementPattern?: string,
  muscleGroup?: string,
  exerciseName?: string
): StrengthCategory | null {
  const mp = (movementPattern || '').toLowerCase();
  const mg = (muscleGroup || '').toLowerCase();
  const name = (exerciseName || '').toLowerCase();

  // Movement pattern is the most reliable signal
  if (mp === 'push') return 'Push';
  if (mp === 'pull') return 'Pull';
  if (mp === 'squat' || mp === 'hinge' || mp === 'lunge') return 'Legs';

  // Muscle-group fallback
  if (mg.includes('lower') || mg.includes('leg') || mg.includes('glute') ||
      mg.includes('quad') || mg.includes('hamstring') || mg.includes('calf')) {
    return 'Legs';
  }
  if (mg.includes('back') || mg.includes('bicep')) return 'Pull';
  if (mg.includes('chest') || mg.includes('shoulder') || mg.includes('tricep')) return 'Push';

  // Name heuristics (last resort)
  if (/squat|deadlift|lunge|leg press|calf|hip thrust|rdl/.test(name)) return 'Legs';
  if (/row|pull|curl|chin|lat|face pull/.test(name)) return 'Pull';
  if (/press|push|dip|fly|extension|raise/.test(name)) return 'Push';

  return null;
}

function pctChangeAdaptive(points: E1RMPoint[]): number | null {
  const now = new Date();
  const window30 = new Date(now);
  window30.setDate(window30.getDate() - 30);
  const window60 = new Date(now);
  window60.setDate(window60.getDate() - 60);

  const recentAvg = averageE1RMInWindow(points, window30, now);
  const priorAvg = averageE1RMInWindow(points, window60, window30);
  if (recentAvg !== null && priorAvg !== null && priorAvg > 0) {
    return ((recentAvg - priorAvg) / priorAvg) * 100;
  }
  // Fallback: first vs latest
  if (points.length >= 2) {
    const first = points[0].e1rm;
    const latest = points[points.length - 1].e1rm;
    if (first > 0) return ((latest - first) / first) * 100;
  }
  return null;
}

/**
 * M2 — Strength Trends grouped into Push / Pull / Legs.
 * Reuses the e1RM series; classifies each exercise via the `exercises` library
 * (movementPattern / muscleGroup), then computes an adaptive %Δ per category.
 * Categories with insufficient data return hasData:false (empty state).
 */
export async function getStrengthTrendsByCategory(clientId: string): Promise<CategoryTrend[]> {
  const categories: StrengthCategory[] = ['Push', 'Pull', 'Legs'];
  const empty = (): CategoryTrend[] =>
    categories.map((category) => ({ category, value: null, label: '', hasData: false }));

  if (!clientId) return empty();

  let series: Record<string, ExerciseE1RMSeries>;
  try {
    series = await getExerciseE1RMSeries(clientId, 26);
  } catch (err) {
    console.error('Error computing strength trends:', err);
    return empty();
  }

  const exerciseIds = Object.keys(series);
  if (exerciseIds.length === 0) return empty();

  // Look up exercise-library metadata for classification (one read per exercise).
  const categoryChanges: Record<StrengthCategory, number[]> = { Push: [], Pull: [], Legs: [] };

  await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const ex = series[exerciseId];
      let movementPattern: string | undefined;
      let muscleGroup: string | undefined;
      try {
        const exDoc = await getDoc(doc(db, 'exercises', exerciseId));
        if (exDoc.exists()) {
          const d = exDoc.data();
          movementPattern = d.movementPattern;
          muscleGroup = d.muscleGroup;
        }
      } catch {
        // ignore — fall back to name heuristics
      }

      const category = categorizeExercise(movementPattern, muscleGroup, ex.exerciseName);
      if (!category) return;

      const pct = pctChangeAdaptive(ex.points);
      if (pct !== null) categoryChanges[category].push(pct);
    })
  );

  return categories.map((category) => {
    const changes = categoryChanges[category];
    if (changes.length === 0) {
      return { category, value: null, label: '', hasData: false };
    }
    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    return { category, value: Math.round(avg), label: 'last 30 days', hasData: true };
  });
}


