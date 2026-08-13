'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  Loader2, AlertCircle, CheckCircle2, XCircle, Droplets, Clock, Link as LinkIcon
} from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  getClientNutritionApproach,
  getClientNutritionGoals,
  getClientNutritionHabits,
  getDailyMacroLog,
  getDailyHabitLog,
  getDailyMealPlanLog,
  getDailyMealPlanLogs,
  getDailyMacroLogs,
  getDailyHabitLogs,
  getClientWeeklyMealPlan,
  getWaterIntakeData,
  getWaterGoal,
} from '@/lib/nutrition-tracking-api';
import { getAdherenceLevel, getAdherenceTextColor, getAdherenceBgColor, getAdherenceBorderColor } from '@/types/nutrition-tracking';
import type { NutritionApproach, NutritionHabit } from '@/types/plan';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function last7DayRange() {
  const today = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  return { start: fmt(start), end: fmt(today) };
}

function last7Dates(): string[] {
  const dates: string[] = [];
  const today = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  }
  return dates;
}

function dayLabel(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function dayNum(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDate();
}

function relativeDate(date: Date | null): string {
  if (!date) return 'Unknown';
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return '1 day ago';
  if (diff < 7) return `${diff} days ago`;
  if (diff < 14) return '1 week ago';
  if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
  return `${Math.floor(diff / 30)} months ago`;
}

function approachLabel(a: NutritionApproach): string {
  if (a === 'macro_tracking') return '📊 Macro Tracking';
  if (a === 'meal_plan') return '🍽️ Meal Plan';
  return '✅ Healthy Habits';
}

function approachColor(a: NutritionApproach): string {
  if (a === 'macro_tracking') return 'bg-blue-100 text-blue-800';
  if (a === 'meal_plan') return 'bg-purple-100 text-purple-800';
  return 'bg-green-100 text-green-800';
}

type AdherenceDay = { date: string; hasData: boolean; pct: number; completed: number; total: number };
type MealPlanDay = { day: string; meals: Array<{ name: string; items?: string[] }> };

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TrainerNutritionViewPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);

  // Protocol
  const [approach, setApproach] = useState<NutritionApproach | null>(null);
  const [goals, setGoals] = useState<any>(null);
  const [habits, setHabits] = useState<NutritionHabit[] | null>(null);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<MealPlanDay[] | null>(null);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [protocolLastUpdated, setProtocolLastUpdated] = useState<Date | null>(null);
  const [macroGuidelines, setMacroGuidelines] = useState<string[]>([]);
  const [mealTimings, setMealTimings] = useState<string[]>([]);

  // 7-day adherence
  const [adherenceDays, setAdherenceDays] = useState<AdherenceDay[]>([]);
  const [weekAvgPct, setWeekAvgPct] = useState<number | null>(null);

  // Today
  const [todayLog, setTodayLog] = useState<any>(null);
  const [todayWater, setTodayWater] = useState<number | null>(null);
  const [avgWater7d, setAvgWater7d] = useState<number | null>(null);

  // ── Auth guard + client fetch ──
  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/login'); return; }
    if (!canAccessTrainerDashboard) { router.push('/dashboard'); return; }
    if (!clientId) { router.push('/dashboard/trainer/client-hub'); return; }

    const fetchClient = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', clientId));
        if (!snap.exists()) { router.push('/dashboard/trainer/client-hub'); return; }
        setClientData({ id: snap.id, ...snap.data() });
      } catch {
        router.push('/dashboard/trainer/client-hub');
      }
    };
    fetchClient();
  }, [user, authLoading, canAccessTrainerDashboard, clientId, router]);

  // ── Fetch all nutrition data ──
  useEffect(() => {
    if (!clientData) return;

    const fetchAll = async () => {
      setPageLoading(true);
      try {
        const today = todayStr();
        const range7 = last7DayRange();
        const dates = last7Dates();

        // Phase 1: plan-level data (all from one doc + helpers)
        const [approachData, goalsData, habitsData, mealPlanData, waterGoalData, planSnap] = await Promise.all([
          getClientNutritionApproach(clientId),
          getClientNutritionGoals(clientId),
          getClientNutritionHabits(clientId),
          getClientWeeklyMealPlan(clientId),
          getWaterGoal(clientId),
          getDoc(doc(db, 'clientPlans', clientId)),
        ]);

        setApproach(approachData);
        setGoals(goalsData);
        setHabits(habitsData);
        setWeeklyMealPlan(mealPlanData);
        setWaterGoal(waterGoalData);

        if (planSnap.exists()) {
          const pd = planSnap.data();
          const lu = pd.nutritionProtocol?.lastUpdated;
          setProtocolLastUpdated(lu?.toDate ? lu.toDate() : lu ? new Date(lu) : null);
          setMacroGuidelines(pd.nutritionProtocol?.macroTracking?.guidelines || []);
          // The editor saves these under `timing`; `mealTiming` is the legacy
          // field name kept as a fallback for older records. Reading only
          // `mealTiming` meant this panel always rendered empty.
          setMealTimings(
            pd.nutritionProtocol?.macroTracking?.timing ||
            pd.nutritionProtocol?.macroTracking?.mealTiming ||
            []
          );
        }

        if (!approachData) { setPageLoading(false); return; }

        // Phase 2: today's log + water
        const [waterData, todayLogData] = await Promise.all([
          getWaterIntakeData(clientId, range7),
          (async () => {
            if (approachData === 'macro_tracking') return getDailyMacroLog(clientId, today);
            if (approachData === 'meal_plan') return getDailyMealPlanLog(clientId, today);
            return getDailyHabitLog(clientId, today);
          })(),
        ]);

        setTodayLog(todayLogData);
        setTodayWater(waterData.get(today) ?? null);

        // Water 7-day avg (only days with data)
        const waterDaysWithData = dates.map(d => waterData.get(d) ?? 0).filter(v => v > 0);
        setAvgWater7d(waterDaysWithData.length > 0
          ? Math.round(waterDaysWithData.reduce((a, b) => a + b, 0) / waterDaysWithData.length)
          : null);

        // Phase 3: 7-day adherence tiles
        let days: AdherenceDay[] = [];

        if (approachData === 'macro_tracking') {
          const logs = await getDailyMacroLogs(clientId, range7);
          const logMap = new Map(logs.map(l => [l.date, l]));
          days = dates.map(d => {
            const l = logMap.get(d);
            return l
              ? { date: d, hasData: true, pct: Math.round(l.adherencePercentage), completed: l.mealsCompleted, total: 4 }
              : { date: d, hasData: false, pct: 0, completed: 0, total: 4 };
          });
        } else if (approachData === 'meal_plan') {
          const totalM = mealPlanData?.[0]?.meals?.length || 4;
          const logs = await getDailyMealPlanLogs(clientId, range7);
          const logMap = new Map(logs.map(l => [l.date, l]));
          days = dates.map(d => {
            const l = logMap.get(d);
            return l
              ? { date: d, hasData: true, pct: Math.round((l.completedMeals.length / totalM) * 100), completed: l.completedMeals.length, total: totalM }
              : { date: d, hasData: false, pct: 0, completed: 0, total: totalM };
          });
        } else {
          const logs = await getDailyHabitLogs(clientId, range7);
          const logMap = new Map(logs.map(l => [l.date, l]));
          const totalH = habitsData?.length || 0;
          days = dates.map(d => {
            const l = logMap.get(d);
            return l
              ? { date: d, hasData: true, pct: Math.round(l.completionPercentage), completed: l.completionCount, total: l.totalHabits }
              : { date: d, hasData: false, pct: 0, completed: 0, total: totalH };
          });
        }

        setAdherenceDays(days);
        const withData = days.filter(d => d.hasData);
        setWeekAvgPct(withData.length > 0
          ? Math.round(withData.reduce((s, d) => s + d.pct, 0) / withData.length)
          : null);

      } catch (err) {
        console.error('[Trainer Nutrition] Error:', err);
      } finally {
        setPageLoading(false);
      }
    };

    fetchAll();
  }, [clientData, clientId]);

  // ── Loading ──
  if (pageLoading || !clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-stone-600 text-sm">Loading nutrition data...</p>
        </div>
      </div>
    );
  }

  // ── No approach ──
  if (!approach) {
    return (
      <SidebarProvider>
        <TrainerSidebar currentPage="client-hub" />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
            <div className="mb-6">
              <Breadcrumb items={[
                { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
                { label: clientData.name, href: `/dashboard/trainer/client-hub/${clientId}` },
                { label: 'Nutrition' }
              ]} />
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
              <h1 className="text-2xl font-bold">🍎 Nutrition</h1>
              <p className="text-gray-600">{clientData.name}</p>
            </div>
            <div className="bg-white rounded-xl border shadow-sm p-12 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Nutrition Protocol Assigned</h3>
              <p className="text-muted-foreground mb-4">Assign a nutrition approach in the Plan section first.</p>
              <Link
                href={`/dashboard/trainer/client-hub/${clientId}?tab=plan`}
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Plan
              </Link>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  const today = todayStr();
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayMealPlan = weeklyMealPlan?.find(d => d.day === todayDayName) ?? null;

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="client-hub" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6">

          {/* Breadcrumb */}
          <div className="mb-5">
            <Breadcrumb items={[
              { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
              { label: clientData.name, href: `/dashboard/trainer/client-hub/${clientId}` },
              { label: 'Nutrition' }
            ]} />
          </div>

          {/* Header */}
          <div className="bg-white rounded-xl border shadow-sm px-6 py-4 mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">🍎 Nutrition Overview</h1>
              <p className="text-sm text-gray-600">{clientData.name}</p>
            </div>
            <Link
              href={`/dashboard/trainer/client-hub/${clientId}?tab=plan`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon className="h-3 w-3" /> Edit Protocol
            </Link>
          </div>

          <div className="space-y-4">

            {/* ── ROW 1: Protocol Card (full width) ── */}
            <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${approachColor(approach)}`}>
                    {approachLabel(approach)}
                  </span>
                  {protocolLastUpdated && (
                    <span className="text-xs text-muted-foreground">Updated {relativeDate(protocolLastUpdated)}</span>
                  )}
                </div>
                {(avgWater7d !== null || waterGoal) && (
                  <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <Droplets className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-semibold text-blue-700">
                      {avgWater7d !== null ? `${avgWater7d} oz` : '—'}
                    </span>
                    {waterGoal && avgWater7d !== null && (
                      <span className="text-xs text-blue-500">({Math.round((avgWater7d / waterGoal) * 100)}% of {waterGoal} oz)</span>
                    )}
                    {waterGoal && avgWater7d === null && (
                      <span className="text-xs text-blue-500">/ {waterGoal} oz goal</span>
                    )}
                    <span className="text-xs text-muted-foreground">7d avg water</span>
                  </div>
                )}
              </div>

              {/* MACRO TRACKING */}
              {approach === 'macro_tracking' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Assigned Targets</p>
                  {goals ? (
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: 'Calories', val: goals.calories, unit: 'kcal', color: 'bg-orange-50 border-orange-200 text-orange-700' },
                        { label: 'Protein', val: goals.protein, unit: 'g', color: 'bg-red-50 border-red-200 text-red-700' },
                        { label: 'Carbs', val: goals.carbs, unit: 'g', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
                        { label: 'Fats', val: goals.fats, unit: 'g', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                      ].map(({ label, val, unit, color }) => (
                        <div key={label} className={`rounded-lg border px-4 py-3 text-center ${color}`}>
                          <p className="text-xs font-medium opacity-70">{label}</p>
                          <p className="text-xl font-bold">{val ?? '—'}</p>
                          <p className="text-xs opacity-70">{unit}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No macro targets set</p>
                  )}
                  {(mealTimings.length > 0 || macroGuidelines.length > 0) && (
                    <div className="flex gap-6 flex-wrap">
                      {mealTimings.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-0.5">Meal Timing</p>
                            <div className="flex flex-wrap gap-1">
                              {mealTimings.map((t, i) => <span key={i} className="text-xs bg-white/70 border rounded px-2 py-0.5">{t}</span>)}
                            </div>
                          </div>
                        </div>
                      )}
                      {macroGuidelines.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">Guidelines</p>
                          <ul className="space-y-0.5">
                            {macroGuidelines.map((g, i) => (
                              <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="text-muted-foreground">•</span>{g}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* HEALTHY HABITS */}
              {approach === 'healthy_habits' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Assigned Habits</p>
                  {habits && habits.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {habits.map(habit => (
                        <div key={habit.id} className="bg-white/60 rounded-lg px-3 py-2 flex items-start gap-2">
                          <span className="text-base mt-0.5">✅</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-900">{habit.title}</p>
                            {habit.description && <p className="text-xs text-muted-foreground leading-tight">{habit.description}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No habits configured</p>
                  )}
                </div>
              )}

              {/* MEAL PLAN */}
              {approach === 'meal_plan' && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Current Weekly Meal Plan</p>
                  {weeklyMealPlan && weeklyMealPlan.length > 0 ? (
                    <div className="grid grid-cols-7 gap-2">
                      {weeklyMealPlan.map(dayPlan => (
                        <div key={dayPlan.day} className={`rounded-lg p-2 text-center ${dayPlan.day === todayDayName ? 'bg-primary/10 border border-primary/30' : 'bg-white/60'}`}>
                          <p className={`text-xs font-bold mb-1 ${dayPlan.day === todayDayName ? 'text-primary' : 'text-gray-700'}`}>
                            {dayPlan.day.slice(0, 3)}
                          </p>
                          <div className="space-y-0.5">
                            {dayPlan.meals.map((meal, i) => (
                              <p key={i} className="text-xs text-gray-600 leading-tight">{meal.name}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No meal plan configured</p>
                  )}
                </div>
              )}
            </div>

            {/* ── ROW 2: 7-Day Adherence (left) | Today's Status (right) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* 7-Day Adherence */}
              <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">📅 7-Day Adherence</h3>
                  {weekAvgPct !== null && (
                    <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                      weekAvgPct >= 80 ? 'bg-green-100 text-green-700' :
                      weekAvgPct >= 60 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{weekAvgPct}% avg</span>
                  )}
                </div>

                {adherenceDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {adherenceDays.map(day => {
                      const isToday = day.date === today;
                      const level = day.hasData ? getAdherenceLevel(day.pct) : 'red';
                      return (
                        <div
                          key={day.date}
                          className={`rounded-lg p-2 text-center border ${
                            isToday ? 'border-primary bg-primary/10' :
                            day.hasData ? `${getAdherenceBorderColor(level)} ${getAdherenceBgColor(level)}` :
                            'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <p className={`text-xs font-medium mb-0.5 ${isToday ? 'text-primary' : 'text-gray-500'}`}>{dayLabel(day.date)}</p>
                          <p className={`text-xs font-bold leading-none mb-0.5 ${isToday ? 'text-primary' : 'text-gray-600'}`}>{dayNum(day.date)}</p>
                          {day.hasData ? (
                            <>
                              <p className={`text-sm font-bold ${getAdherenceTextColor(level)}`}>{day.pct}%</p>
                              <p className="text-xs text-muted-foreground">{day.completed}/{day.total}</p>
                            </>
                          ) : (
                            <p className="text-xs text-gray-300 mt-1">—</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-green-400" /><span>≥80%</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-yellow-400" /><span>60–79%</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-red-400" /><span>&lt;60%</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded bg-gray-200" /><span>No data</span></div>
                </div>
              </div>

              {/* Today's Status */}
              <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    📋 Today — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h3>
                  {todayWater !== null && (
                    <span className="text-xs text-blue-600 flex items-center gap-0.5">
                      <Droplets className="h-3 w-3" /> {todayWater} oz
                    </span>
                  )}
                </div>

                {/* MACRO TRACKING today */}
                {approach === 'macro_tracking' && (
                  todayLog ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          Number(todayLog.adherencePercentage) >= 80 ? 'text-green-600' :
                          Number(todayLog.adherencePercentage) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{Math.round(Number(todayLog.adherencePercentage))}%</span>
                        <span className="text-xs text-muted-foreground">adherence · {todayLog.mealsCompleted}/4 meals logged</span>
                      </div>
                      {goals && (
                        <div className="space-y-1.5">
                          {[
                            { label: 'Calories', logged: Number(todayLog.totalCalories ?? 0), target: goals.calories as number, unit: 'kcal' },
                            { label: 'Protein', logged: Number(todayLog.totalProtein ?? 0), target: goals.protein as number, unit: 'g' },
                            { label: 'Carbs', logged: Number(todayLog.totalCarbs ?? 0), target: goals.carbs as number, unit: 'g' },
                            { label: 'Fat', logged: Number(todayLog.totalFat ?? 0), target: goals.fats as number, unit: 'g' },
                          ].map(({ label, logged, target, unit }) => {
                            const pct = target ? Math.min((logged / target) * 100, 100) : 0;
                            return (
                              <div key={label}>
                                <div className="flex justify-between text-xs mb-0.5">
                                  <span className="text-muted-foreground">{label}</span>
                                  <span className="font-medium">{logged} / {target ?? '—'} {unit}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex gap-2 flex-wrap mt-1">
                        {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map(meal => {
                          const logged = todayLog.meals && typeof todayLog.meals === 'object' && todayLog.meals[meal];
                          return (
                            <span key={meal} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              logged ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'
                            }`}>
                              {logged ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {meal.charAt(0).toUpperCase() + meal.slice(1)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <XCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No macros logged today yet</p>
                    </div>
                  )
                )}

                {/* MEAL PLAN today */}
                {approach === 'meal_plan' && (
                  todayMealPlan ? (
                    <div className="space-y-2">
                      {todayMealPlan.meals.map(meal => {
                        const completedMeals: string[] = Array.isArray(todayLog?.completedMeals) ? todayLog.completedMeals : [];
                        const done = completedMeals.includes(meal.name);
                        return (
                          <div key={meal.name} className={`rounded-lg p-3 ${done ? 'bg-green-50 border border-green-200' : 'bg-white/60 border border-gray-200'}`}>
                            <div className="flex items-start gap-2">
                              {done
                                ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                : <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                              }
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold ${done ? 'text-green-800' : 'text-gray-700'}`}>{meal.name}</p>
                                {meal.items && meal.items.length > 0 && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {meal.items.slice(0, 2).join(', ')}{meal.items.length > 2 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {!todayLog && (
                        <p className="text-xs text-muted-foreground italic text-center mt-1">Client hasn&apos;t logged anything today</p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-muted-foreground">No meal plan for today</p>
                    </div>
                  )
                )}

                {/* HEALTHY HABITS today */}
                {approach === 'healthy_habits' && habits && habits.length > 0 && (
                  <div className="space-y-1.5">
                    {todayLog && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-sm font-bold ${
                          Number(todayLog.completionPercentage) >= 80 ? 'text-green-600' :
                          Number(todayLog.completionPercentage) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>{todayLog.completionCount}/{todayLog.totalHabits}</span>
                        <span className="text-xs text-muted-foreground">habits completed today</span>
                      </div>
                    )}
                    {!todayLog && (
                      <p className="text-xs text-muted-foreground mb-2 text-center">No habits logged today yet</p>
                    )}
                    {habits.map(habit => {
                      const done = todayLog?.habits && typeof todayLog.habits === 'object'
                        ? (todayLog.habits as Record<string, boolean>)[habit.id] === true
                        : false;
                      return (
                        <div key={habit.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${done ? 'bg-green-50 border border-green-200' : 'bg-white/50 border border-gray-200'}`}>
                          {done
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                            : <XCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                          }
                          <span className={done ? 'text-green-800 font-medium' : 'text-gray-600'}>{habit.title}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {approach === 'healthy_habits' && (!habits || habits.length === 0) && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No habits configured</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
