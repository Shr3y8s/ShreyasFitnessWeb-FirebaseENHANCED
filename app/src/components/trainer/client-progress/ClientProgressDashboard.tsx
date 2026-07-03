'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Scale, ArrowDown, ArrowUp, Footprints, Flame, Target, Dumbbell, ChevronDown, ChevronUp, Camera, HeartPulse } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { ProgressPhotoWithId } from '@/types/progress-photo';
import type { WeightLog } from '@/types/activity';
import type { WeeklySurveyData } from '@/lib/survey-api';
import type { DailyActivityData } from '@/types/activity';
import { getStrengthGainPct } from '@/lib/strength-metrics';


interface ClientProgressDashboardProps {
  clientId: string;
  clientName?: string;
}

// Helper: calculate Sun–Sat week date strings
function getCurrentWeekRange(): { sundayStr: string; todayStr: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { sundayStr: fmt(sunday), todayStr: fmt(today) };
}

function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
}

export function ClientProgressDashboard({ clientId }: ClientProgressDashboardProps) {
  const [loading, setLoading] = useState(true);

  // ── Weight state ──
  const [allWeightLogs, setAllWeightLogs] = useState<WeightLog[]>([]);
  const [recentWeightLogs, setRecentWeightLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<{ value: number; unit: string } | null>(null);
  const [goalWeightLT, setGoalWeightLT] = useState<{ value: number; unit: string } | null>(null);

  // ── Adherence metrics ──
  const [todaySteps, setTodaySteps] = useState<number | null>(null);
  const [stepsGoal, setStepsGoal] = useState<number | null>(null);
  const [avgSteps7d, setAvgSteps7d] = useState<number | null>(null);
  const [workoutStreak, setWorkoutStreak] = useState<number | null>(null);
  const [habitScore, setHabitScore] = useState<number | null>(null);
  const [strengthGain, setStrengthGain] = useState<{ value: number | null; label: string; hasData: boolean }>({ value: null, label: '', hasData: false });


  // ── Survey state ──
  const [surveys, setSurveys] = useState<WeeklySurveyData[]>([]);

  // ── Activity state (last 7 days) ──
  const [activityLogs, setActivityLogs] = useState<DailyActivityData[]>([]);

  // ── LISS Cardio adherence ──
  const [lissCardioWeekly, setLissCardioWeekly] = useState<{ count: number; target: number; frequency: string; equipment?: string } | null>(null);

  // ── Photos state ──
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoWithId[]>([]);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; date: string; angle: string } | null>(null);

  // ── Fetch ALL data on mount ──
  useEffect(() => {
    if (!clientId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const { getRecentWeightLogs, getActivityLogsForDateRange } = await import('@/lib/activity-api');
        const { getUserProgressPhotos } = await import('@/lib/progress-photo-api');
        const { getRecentSurveys } = await import('@/lib/survey-api');

        const { sundayStr, todayStr } = getCurrentWeekRange();

        // Last 7 days for activity
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        const activityStart = fmt(sevenDaysAgo);

        const [allLogs, photos, weeklyActivities, activity7d, weightGoalDocLT, weightGoalDocST, surveysData] = await Promise.all([
          getRecentWeightLogs(clientId, 100),
          getUserProgressPhotos(clientId),
          getActivityLogsForDateRange(clientId, sundayStr, todayStr),
          getActivityLogsForDateRange(clientId, activityStart, todayStr),
          getDoc(doc(db, 'goals', `${clientId}_weight_loss`)),
          getDoc(doc(db, 'goals', `${clientId}_weight_loss_st`)),
          getRecentSurveys(clientId, 2),
        ]);

        // Weight
        const sortedAsc = [...allLogs].sort((a, b) => a.date.localeCompare(b.date));
        const sortedDesc = [...allLogs].sort((a, b) => b.date.localeCompare(a.date));
        setAllWeightLogs(sortedAsc);
        setRecentWeightLogs(sortedDesc.slice(0, 5));
        setProgressPhotos(photos);
        setSurveys(surveysData);
        setActivityLogs(activity7d.sort((a, b) => b.date.localeCompare(a.date)));

        // Goal weights
        if (weightGoalDocST.exists()) {
          const gd = weightGoalDocST.data();
          if (gd.targetValue && gd.unit) setGoalWeight({ value: Number(gd.targetValue), unit: gd.unit });
        } else if (weightGoalDocLT.exists()) {
          const gd = weightGoalDocLT.data();
          if (gd.targetValue && gd.unit) setGoalWeight({ value: Number(gd.targetValue), unit: gd.unit });
        }
        if (weightGoalDocLT.exists()) {
          const gd = weightGoalDocLT.data();
          if (gd.targetValue && gd.unit) setGoalWeightLT({ value: Number(gd.targetValue), unit: gd.unit });
        }

        // Steps
        const todayActivity = weeklyActivities.find(a => a.date === todayStr);
        setTodaySteps(todayActivity?.steps?.steps ?? null);
        setStepsGoal(todayActivity?.steps?.goal ?? null);
        const allStepsValues = weeklyActivities.map(a => a.steps?.steps ?? 0);
        setAvgSteps7d(allStepsValues.length > 0 ? calculateAverage(allStepsValues) : null);

        // Workout streak
        try {
          const goalDoc = await getDoc(doc(db, 'goals', `${clientId}_workout_consistency`));
          setWorkoutStreak(goalDoc.exists() ? (goalDoc.data().currentStreak ?? 0) : 0);
        } catch { setWorkoutStreak(0); }

        // LISS Cardio adherence — current week sessions count
        try {
          const planSnap2 = await getDoc(doc(db, 'clientPlans', clientId));
          const lissCardio = planSnap2.data()?.lissCardio;
          if (lissCardio?.frequency) {
            const freqMatch = lissCardio.frequency.match(/^(\d+)/);
            const target = freqMatch ? parseInt(freqMatch[1], 10) : 1;
            // Count daily activity docs in current week that have cardio: true
            const { getActivityLogsForDateRange: getRange } = await import('@/lib/activity-api');
            const weekLogs = await getRange(clientId, sundayStr, todayStr);
            const count = weekLogs.filter(l => l.cardio === true).length;
            setLissCardioWeekly({ count, target, frequency: lissCardio.frequency, equipment: lissCardio.equipment });
          } else {
            setLissCardioWeekly(null);
          }
        } catch {
          setLissCardioWeekly(null);
        }

        // Habit score — 4-factor formula
        try {
          const planSnap = await getDoc(doc(db, 'clientPlans', clientId));
          const nutritionApproach = planSnap.data()?.nutritionProtocol?.approach || 'macro_tracking';
          const nutritionSubcollection = nutritionApproach === 'macro_tracking' ? 'meals' : nutritionApproach === 'meal_plan' ? 'mealPlans' : 'habits';
          const [nutritionSnap, workoutGoalDoc] = await Promise.all([
            getDocs(query(collection(db, 'nutritionLogs', clientId, nutritionSubcollection), where('__name__', '>=', sundayStr), where('__name__', '<=', todayStr), limit(10))),
            getDoc(doc(db, 'goals', `${clientId}_workout_consistency`)),
          ]);
          const workoutStats = workoutGoalDoc.exists() ? workoutGoalDoc.data()?.workoutStats : null;
          const workoutCompleted = workoutStats?.thisWeek?.completed || 0;
          const workoutAssigned = workoutStats?.thisWeek?.assigned || 0;
          let nc = 0, sc = 0, wc = 0;
          for (let i = 0; i <= 6; i++) {
            const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay() + i);
            const ds = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
            if (nutritionSnap.docs.find(x => x.id === ds)?.data().dayComplete) nc++;
            const act = weeklyActivities.find(a => a.date === ds);
            if (act?.steps && act.steps.steps >= (act.steps.goal || 8000)) sc++;
            if (act?.water && act.water.amount >= (act.water.goal || 64)) wc++;
          }
          const total = nc + workoutCompleted + sc + wc;
          const possible = 7 + workoutAssigned + 7 + 7;
          setHabitScore(possible > 0 ? Math.round((total / possible) * 100) : 0);
        } catch {
          setHabitScore(0);
        }

        // Strength Gain % — adaptive e1RM window (shared util)
        try {
          const result = await getStrengthGainPct(clientId);
          setStrengthGain(result);
        } catch {
          setStrengthGain({ value: null, label: '', hasData: false });
        }

      } catch (err) {

        console.error('Error loading progress data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [clientId]);

  // Derived stats
  const currentWeight = recentWeightLogs[0] ?? null;
  const startWeight = allWeightLogs.length > 0 ? allWeightLogs[0] : null;
  const totalWeightChange = currentWeight && startWeight ? Number((currentWeight.weight - startWeight.weight).toFixed(1)) : null;
  const totalWeightChangePct = totalWeightChange !== null && startWeight ? Number(((totalWeightChange / startWeight.weight) * 100).toFixed(1)) : null;
  const sinceLastLog = recentWeightLogs.length >= 2 ? Number((recentWeightLogs[0].weight - recentWeightLogs[1].weight).toFixed(1)) : null;
  const avgPerWeighIn = totalWeightChange !== null && allWeightLogs.length > 1 ? Number((totalWeightChange / (allWeightLogs.length - 1)).toFixed(2)) : null;
  const distanceToGoal = currentWeight && goalWeight ? Number((currentWeight.weight - goalWeight.value).toFixed(1)) : null;
  const distanceToGoalLT = currentWeight && goalWeightLT ? Number((currentWeight.weight - goalWeightLT.value).toFixed(1)) : null;
  const totalPhotos = progressPhotos.reduce((acc, d) => acc + Object.keys(d.photos || {}).length, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-3" />
        <p className="text-sm text-muted-foreground">Loading progress data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── ROW 1: Body Metrics (left) | Adherence (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Body Metrics */}
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Scale className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">📊 Body Metrics</h3>
          </div>

          {currentWeight ? (
            <div className="space-y-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{currentWeight.weight}</span>
                <span className="text-sm text-muted-foreground">{currentWeight.unit}</span>
                {totalWeightChange !== null && (
                  <span className={`flex items-center gap-0.5 text-xs font-medium ml-1 ${totalWeightChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {totalWeightChange <= 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                    {Math.abs(totalWeightChange)} {currentWeight.unit}
                    {totalWeightChangePct !== null && <span className="ml-0.5">({totalWeightChangePct > 0 ? '+' : ''}{totalWeightChangePct}%)</span>}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Last logged: {new Date(currentWeight.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>

              {/* 2-col: stat tiles left, recent entries right */}
              <div className="flex gap-3">
                <div className="w-1/2 grid grid-cols-2 gap-1.5">
                  {startWeight && (
                    <div className="bg-white/60 rounded-lg px-2 py-1.5">
                      <p className="text-xs text-muted-foreground leading-tight">Start</p>
                      <p className="text-xs font-bold leading-tight">{startWeight.weight} {startWeight.unit}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{new Date(startWeight.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</p>
                    </div>
                  )}
                  {totalWeightChange !== null && (
                    <div className="bg-white/60 rounded-lg px-2 py-1.5">
                      <p className="text-xs text-muted-foreground leading-tight">Total Lost</p>
                      <p className={`text-xs font-bold leading-tight ${totalWeightChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>{totalWeightChange <= 0 ? '' : '+'}{totalWeightChange} {currentWeight.unit}</p>
                      {totalWeightChangePct !== null && <p className={`text-xs leading-tight ${totalWeightChange <= 0 ? 'text-green-600' : 'text-red-500'}`}>{totalWeightChangePct > 0 ? '+' : ''}{totalWeightChangePct}%</p>}
                    </div>
                  )}
                  {sinceLastLog !== null && (
                    <div className="bg-white/60 rounded-lg px-2 py-1.5">
                      <p className="text-xs text-muted-foreground leading-tight">Since Last</p>
                      <p className={`text-xs font-bold flex items-center gap-0.5 leading-tight ${sinceLastLog <= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {sinceLastLog <= 0 ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
                        {sinceLastLog > 0 ? '+' : ''}{sinceLastLog} {currentWeight.unit}
                      </p>
                    </div>
                  )}
                  {avgPerWeighIn !== null && allWeightLogs.length > 1 && (
                    <div className="bg-white/60 rounded-lg px-2 py-1.5">
                      <p className="text-xs text-muted-foreground leading-tight">Avg/Log</p>
                      <p className={`text-xs font-bold leading-tight ${avgPerWeighIn <= 0 ? 'text-green-600' : 'text-red-500'}`}>{avgPerWeighIn > 0 ? '+' : ''}{avgPerWeighIn} {currentWeight.unit}</p>
                      <p className="text-xs text-muted-foreground leading-tight">{allWeightLogs.length} logs</p>
                    </div>
                  )}
                  <div className="bg-white/60 rounded-lg px-2 py-1.5">
                    <p className="text-xs text-muted-foreground leading-tight">ST Goal</p>
                    {goalWeight ? (
                      <>
                        <p className="text-xs font-bold leading-tight">{goalWeight.value} {goalWeight.unit}</p>
                        {distanceToGoal !== null && <p className={`text-xs leading-tight ${distanceToGoal <= 0 ? 'text-green-600' : 'text-amber-600'}`}>{distanceToGoal <= 0 ? '✅ Done' : `${distanceToGoal} to go`}</p>}
                      </>
                    ) : <p className="text-xs text-muted-foreground italic leading-tight">Not set</p>}
                  </div>
                  <div className="bg-white/60 rounded-lg px-2 py-1.5">
                    <p className="text-xs text-muted-foreground leading-tight">LT Goal</p>
                    {goalWeightLT ? (
                      <>
                        <p className="text-xs font-bold leading-tight">{goalWeightLT.value} {goalWeightLT.unit}</p>
                        {distanceToGoalLT !== null && <p className={`text-xs leading-tight ${distanceToGoalLT <= 0 ? 'text-green-600' : 'text-blue-600'}`}>{distanceToGoalLT <= 0 ? '✅ Done' : `${distanceToGoalLT} to go`}</p>}
                      </>
                    ) : <p className="text-xs text-muted-foreground italic leading-tight">Not set</p>}
                  </div>
                </div>
                {recentWeightLogs.length > 0 && (
                  <div className="w-1/2 bg-white/40 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Recent entries</p>
                    <div className="space-y-1">
                      {recentWeightLogs.map((log, i) => (
                        <div key={log.date} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className={`text-xs font-semibold ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{log.weight} {log.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Scale className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No weight data logged yet</p>
            </div>
          )}
        </div>

        {/* Adherence — 2×2 metric cards */}
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">💪 Adherence</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 h-[calc(100%-2rem)]">
            {/* Steps */}
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Footprints className="h-3.5 w-3.5 text-primary" />
                <p className="text-xs font-semibold text-gray-700">Today&apos;s Steps</p>
              </div>
              {todaySteps !== null ? (
                <>
                  <p className={`text-xl font-bold ${stepsGoal && todaySteps >= stepsGoal ? 'text-green-600' : 'text-foreground'}`}>{todaySteps.toLocaleString()}</p>
                  {stepsGoal && (
                    <div className="mt-1">
                      <div className="w-full bg-gray-200 rounded-full h-1">
                        <div className={`h-1 rounded-full ${todaySteps >= stepsGoal ? 'bg-green-500' : 'bg-primary'}`} style={{ width: `${Math.min((todaySteps / stepsGoal) * 100, 100)}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Goal: {stepsGoal.toLocaleString()}</p>
                    </div>
                  )}
                  {avgSteps7d !== null && <p className="text-xs text-muted-foreground">7d avg: {avgSteps7d.toLocaleString()}</p>}
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">No steps today</p>
                  {avgSteps7d !== null && <p className="text-xs text-muted-foreground">7d avg: {avgSteps7d.toLocaleString()}</p>}
                </>
              )}
            </div>

            {/* Workout Streak */}
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <p className="text-xs font-semibold text-gray-700">Workout Streak</p>
              </div>
              {workoutStreak !== null ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <p className={`text-xl font-bold ${workoutStreak >= 7 ? 'text-orange-500' : workoutStreak >= 3 ? 'text-yellow-500' : 'text-foreground'}`}>{workoutStreak}</p>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{workoutStreak === 0 ? 'No streak' : workoutStreak >= 7 ? '🔥 On fire!' : workoutStreak >= 3 ? '💪 Momentum' : '🌱 Starting'}</p>
                </>
              ) : <p className="text-xs text-muted-foreground">Loading...</p>}
            </div>

            {/* Habit Score */}
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Target className="h-3.5 w-3.5 text-green-600" />
                <p className="text-xs font-semibold text-gray-700">Habit Score</p>
              </div>
              {habitScore !== null ? (
                <>
                  <p className={`text-xl font-bold ${habitScore >= 80 ? 'text-green-600' : habitScore >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{habitScore}%</p>
                  <div className="mt-1">
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div className={`h-1 rounded-full ${habitScore >= 80 ? 'bg-green-500' : habitScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${habitScore}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{habitScore >= 80 ? '⭐ Excellent' : habitScore >= 60 ? '👍 Good' : '📈 Needs work'}</p>
                </>
              ) : <p className="text-xs text-muted-foreground">No data this week</p>}
            </div>

            {/* Strength Gain */}
            <div className="bg-white/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-blue-600" />
                <p className="text-xs font-semibold text-gray-700">Strength Gain</p>
              </div>
              {strengthGain.hasData && strengthGain.value !== null ? (
                <>
                  <p className="text-xl font-bold text-blue-600">{strengthGain.value > 0 ? '+' : ''}{strengthGain.value}%</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{strengthGain.label}</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-gray-400">—</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Not enough data yet</p>
                </>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Weekly Check-in (left) | Daily Activity (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Weekly Check-in — latest 2 surveys */}
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">📋</span>
            <h3 className="text-sm font-semibold text-gray-900">Weekly Check-in</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Last 2 weeks</span>
          </div>

          {surveys.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No surveys submitted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map((survey, idx) => {
                const weekLabel = new Date(survey.weekStartDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const avgRating = Math.round((survey.ratings.energy + survey.ratings.sleep + survey.ratings.mood) / 3);
                const isCurrent = idx === 0;
                return (
                  <div key={survey.weekStartDate} className={`rounded-lg p-3 ${isCurrent ? 'bg-white/70 border border-primary/20' : 'bg-white/40'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-gray-900">
                          {isCurrent ? '🟢 This week' : '⬜ Last week'} — {weekLabel}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <span key={n} className={`text-xs ${n <= avgRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    </div>
                    {/* Compact ratings row */}
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {[
                        { label: 'Energy', val: survey.ratings.energy },
                        { label: 'Sleep', val: survey.ratings.sleep },
                        { label: 'Mood', val: survey.ratings.mood },
                        { label: 'Workout', val: survey.adherence.workouts },
                        { label: 'Nutrition', val: survey.adherence.nutrition },
                      ].map(({ label, val }) => (
                        <div key={label} className="text-center">
                          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                          <p className={`text-xs font-bold ${val >= 4 ? 'text-green-600' : val >= 3 ? 'text-yellow-600' : 'text-red-500'}`}>{val}/5</p>
                        </div>
                      ))}
                    </div>
                    {/* Wins / Challenges compact */}
                    {(survey.wins || survey.challenges) && (
                      <div className="space-y-1">
                        {survey.wins && (
                          <p className="text-xs text-gray-700 leading-snug">
                            <span className="font-semibold text-green-700">🏆 </span>{survey.wins.length > 80 ? survey.wins.slice(0, 80) + '…' : survey.wins}
                          </p>
                        )}
                        {survey.challenges && (
                          <p className="text-xs text-gray-700 leading-snug">
                            <span className="font-semibold text-amber-700">⚠️ </span>{survey.challenges.length > 80 ? survey.challenges.slice(0, 80) + '…' : survey.challenges}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Daily Activity — last 7 days compact */}
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🚶</span>
            <h3 className="text-sm font-semibold text-gray-900">Daily Activity</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">Last 7 days</span>
          </div>

          {activityLogs.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No activity logged this week</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* 7-day summary stats */}
              {(() => {
                const logsWithWater = activityLogs.filter(l => l.water?.amount);
                const allHabits = activityLogs.flatMap(l => l.habits || []);
                const avgWaterSummary = logsWithWater.length > 0
                  ? Math.round(logsWithWater.reduce((s, l) => s + (l.water?.amount ?? 0), 0) / logsWithWater.length)
                  : null;
                const waterUnit = logsWithWater[0]?.water?.unit ?? 'oz';
                const habitsCompleted = allHabits.filter(h => h.completed).length;
                const habitsPossible = allHabits.length;
                const habitsRate = habitsPossible > 0 ? Math.round((habitsCompleted / habitsPossible) * 100) : null;
                return (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="bg-white/60 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-muted-foreground leading-tight">Avg Steps</p>
                      {/* Use same avgSteps7d as Adherence card for consistency */}
                      <p className="text-xs font-bold leading-tight">{avgSteps7d !== null ? avgSteps7d.toLocaleString() : '—'}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-muted-foreground leading-tight">Avg Water</p>
                      <p className="text-xs font-bold leading-tight">{avgWaterSummary !== null ? `${avgWaterSummary} ${waterUnit}` : '—'}</p>
                    </div>
                    <div className="bg-white/60 rounded-lg px-2 py-1.5 text-center">
                      <p className="text-xs text-muted-foreground leading-tight">Habits</p>
                      <p className={`text-xs font-bold leading-tight ${habitsRate !== null ? (habitsRate >= 80 ? 'text-green-600' : habitsRate >= 60 ? 'text-yellow-600' : 'text-red-500') : ''}`}>
                        {habitsRate !== null ? `${habitsRate}%` : '—'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Header row */}
              <div className="grid grid-cols-4 gap-1 px-1 mb-1">
                <p className="text-xs font-medium text-muted-foreground">Date</p>
                <p className="text-xs font-medium text-muted-foreground text-center">👟</p>
                <p className="text-xs font-medium text-muted-foreground text-center">💧</p>
                <p className="text-xs font-medium text-muted-foreground text-center">🎯</p>
              </div>
              {activityLogs.slice(0, 7).map((log) => {
                const completedHabits = (log.habits || []).filter(h => h.completed).length;
                const totalHabits = (log.habits || []).length;
                const stepsOk = log.steps && log.steps.goal && log.steps.steps >= log.steps.goal;
                const waterOk = log.water && log.water.goal && log.water.amount >= log.water.goal;
                const isToday = log.date === (() => { const d = new Date(); const p = (n: number) => String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; })();
                return (
                  <div key={log.date} className={`grid grid-cols-4 gap-1 px-2 py-1.5 rounded-lg ${isToday ? 'bg-primary/10 border border-primary/20' : 'bg-white/40'}`}>
                    <p className={`text-xs ${isToday ? 'font-semibold text-primary' : 'text-gray-700'}`}>
                      {new Date(log.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                    <p className={`text-xs text-center font-medium ${stepsOk ? 'text-green-600' : log.steps ? 'text-gray-600' : 'text-gray-300'}`}>
                      {log.steps ? (stepsOk ? `✅ ${(log.steps.steps / 1000).toFixed(1)}k` : `${(log.steps.steps / 1000).toFixed(1)}k`) : '—'}
                    </p>
                    <p className={`text-xs text-center font-medium ${waterOk ? 'text-blue-600' : log.water ? 'text-gray-600' : 'text-gray-300'}`}>
                      {log.water ? (waterOk ? `✅ ${log.water.amount}` : `${log.water.amount}`) : '—'}
                    </p>
                    <p className={`text-xs text-center font-medium ${totalHabits > 0 ? (completedHabits === totalHabits ? 'text-green-600' : completedHabits > 0 ? 'text-yellow-600' : 'text-red-500') : 'text-gray-300'}`}>
                      {totalHabits > 0 ? `${completedHabits}/${totalHabits}` : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── LISS Cardio Adherence (only shown when assigned) ── */}
      {lissCardioWeekly && (
        <div className="bg-red-50/60 border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <HeartPulse className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-900">💓 LISS Cardio Adherence</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-white/60 px-2 py-0.5 rounded-full">This week</span>
          </div>
          <div className="flex items-center gap-4">
            {/* Session count */}
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-bold ${lissCardioWeekly.count >= lissCardioWeekly.target ? 'text-green-600' : lissCardioWeekly.count > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                {lissCardioWeekly.count}
              </span>
              <span className="text-sm text-muted-foreground">/ {lissCardioWeekly.target} sessions</span>
            </div>
            {/* Progress bar */}
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${lissCardioWeekly.count >= lissCardioWeekly.target ? 'bg-green-500' : lissCardioWeekly.count > 0 ? 'bg-amber-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min((lissCardioWeekly.count / lissCardioWeekly.target) * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs text-muted-foreground">{lissCardioWeekly.frequency}{lissCardioWeekly.equipment ? ` · ${lissCardioWeekly.equipment}` : ''}</p>
                <p className={`text-xs font-medium ${lissCardioWeekly.count >= lissCardioWeekly.target ? 'text-green-600' : lissCardioWeekly.count > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                  {lissCardioWeekly.count >= lissCardioWeekly.target ? '✅ Goal met!' : lissCardioWeekly.count > 0 ? `${lissCardioWeekly.target - lissCardioWeekly.count} left` : 'Not started'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ROW 3: Collapsible Progress Photos ── */}
      <div className="bg-primary/5 border border-primary/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setPhotosExpanded(prev => !prev)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-900">📸 Progress Photos</h3>
            <span className="text-xs text-muted-foreground bg-white/60 px-2 py-0.5 rounded-full">{totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}</span>
          </div>
          {photosExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {photosExpanded && (
          <div className="px-5 pb-5 border-t border-primary/20 pt-4">
            {progressPhotos.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-3xl block mb-2">📷</span>
                <p className="text-sm text-muted-foreground">No photos uploaded yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {progressPhotos.flatMap((photoDoc) =>
                    Object.entries(photoDoc.photos || {}).map(([angle, photoData]) => {
                      const pd = photoData as { thumbnailUrl?: string; url?: string };
                      const thumbUrl = pd.thumbnailUrl || pd.url;
                      const fullUrl = pd.url || thumbUrl;
                      if (!thumbUrl) return null;
                      return (
                        <button
                          key={`${photoDoc.id}-${angle}`}
                          onClick={() => setLightboxPhoto({ url: fullUrl || thumbUrl, date: photoDoc.date, angle })}
                          className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all group relative"
                        >
                          <img src={thumbUrl} alt={`${angle} - ${photoDoc.date}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity capitalize">{angle}</div>
                        </button>
                      );
                    })
                  ).filter(Boolean).slice(0, 20)}
                </div>
                {totalPhotos > 20 && <p className="text-xs text-muted-foreground text-center mt-2">Showing 20 of {totalPhotos} photos</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── LIGHTBOX ── */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-w-3xl w-full bg-white rounded-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold text-gray-900 capitalize">{lightboxPhoto.angle} view</p>
                <p className="text-sm text-muted-foreground">{new Date(lightboxPhoto.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setLightboxPhoto(null)} className="text-gray-500 hover:text-gray-900 text-2xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            <img src={lightboxPhoto.url} alt={`${lightboxPhoto.angle} - ${lightboxPhoto.date}`} className="w-full max-h-[70vh] object-contain bg-gray-50" />
          </div>
        </div>
      )}
    </div>
  );
}
