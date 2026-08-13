'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2, XCircle, Droplets, Clock, Link as LinkIcon, TrendingUp, TrendingDown, Minus, MessageSquare, Camera, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { db, storage } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, orderBy, limit, query, updateDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
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
import {
  getAdherenceLevel,
  getAdherenceTextColor,
  getAdherenceBgColor,
  getAdherenceBorderColor,
} from '@/types/nutrition-tracking';
import type { NutritionApproach, NutritionHabit } from '@/types/plan';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function todayStr(): string {
  return fmt(new Date());
}

function getSunday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function weekDates(sunday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return fmt(d);
  });
}

function currentWeekRange() {
  const sunday = getSunday(new Date());
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return { start: fmt(sunday), end: fmt(saturday) };
}

function lastWeekRange() {
  const thisSunday = getSunday(new Date());
  const lastSunday = new Date(thisSunday);
  lastSunday.setDate(thisSunday.getDate() - 7);
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  return { start: fmt(lastSunday), end: fmt(lastSaturday) };
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

async function buildWeekAdherence(
  clientId: string,
  approach: NutritionApproach,
  weekRange: { start: string; end: string },
  totalMeals: number,
  habitsCount: number
): Promise<{ date: string; hasData: boolean; pct: number; completed: number; total: number }[]> {
  const sunday = new Date(weekRange.start + 'T00:00:00');
  const dates = weekDates(sunday);

  if (approach === 'macro_tracking') {
    const logs = await getDailyMacroLogs(clientId, weekRange);
    const logMap = new Map(logs.map(l => [l.date, l]));
    return dates.map(d => {
      const l = logMap.get(d);
      return l
        ? { date: d, hasData: true, pct: Math.round(l.adherencePercentage), completed: l.mealsCompleted, total: 4 }
        : { date: d, hasData: false, pct: 0, completed: 0, total: 4 };
    });
  } else if (approach === 'meal_plan') {
    const logs = await getDailyMealPlanLogs(clientId, weekRange);
    const logMap = new Map(logs.map(l => [l.date, l]));
    return dates.map(d => {
      const l = logMap.get(d);
      return l
        ? { date: d, hasData: true, pct: Math.round((l.completedMeals.length / totalMeals) * 100), completed: l.completedMeals.length, total: totalMeals }
        : { date: d, hasData: false, pct: 0, completed: 0, total: totalMeals };
    });
  } else {
    const logs = await getDailyHabitLogs(clientId, weekRange);
    const logMap = new Map(logs.map(l => [l.date, l]));
    return dates.map(d => {
      const l = logMap.get(d);
      return l
        ? { date: d, hasData: true, pct: Math.round(l.completionPercentage), completed: l.completionCount, total: l.totalHabits }
        : { date: d, hasData: false, pct: 0, completed: 0, total: habitsCount };
    });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function weekAvg(days: { hasData: boolean; pct: number }[]): number | null {
  const withData = days.filter(d => d.hasData);
  if (withData.length === 0) return null;
  return Math.round(withData.reduce((s, d) => s + d.pct, 0) / withData.length);
}

type AdherenceDay = { date: string; hasData: boolean; pct: number; completed: number; total: number };
type MealPlanDay = { day: string; meals: Array<{ name: string; items?: string[] }> };
type Screenshot = { date: string; url: string; storagePath: string | null };

// ── Component ─────────────────────────────────────────────────────────────────

interface ClientNutritionDashboardProps {
  clientId: string;
}

export function ClientNutritionDashboard({ clientId }: ClientNutritionDashboardProps) {
  const [loading, setLoading] = useState(true);

  const [approach, setApproach] = useState<NutritionApproach | null>(null);
  const [goals, setGoals] = useState<any>(null);
  const [habits, setHabits] = useState<NutritionHabit[] | null>(null);
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<MealPlanDay[] | null>(null);
  const [waterGoal, setWaterGoal] = useState<number | null>(null);
  const [protocolLastUpdated, setProtocolLastUpdated] = useState<Date | null>(null);
  const [macroGuidelines, setMacroGuidelines] = useState<string[]>([]);
  const [mealTimings, setMealTimings] = useState<string[]>([]);

  const [currentWeekDays, setCurrentWeekDays] = useState<AdherenceDay[]>([]);
  const [lastWeekDays, setLastWeekDays] = useState<AdherenceDay[]>([]);

  const [todayLog, setTodayLog] = useState<any>(null);
  const [todayWater, setTodayWater] = useState<number | null>(null);
  const [avgWater7d, setAvgWater7d] = useState<number | null>(null);

  const [latestCoachNote, setLatestCoachNote] = useState<{ note: string; day: string; sentAt: Date } | null>(null);
  const [nutritionScreenshots, setNutritionScreenshots] = useState<Screenshot[]>([]);
  const [dismissingDate, setDismissingDate] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        const today = todayStr();
        const currRange = currentWeekRange();
        const lastRange = lastWeekRange();

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

        if (!approachData) { setLoading(false); return; }

        const [waterData, todayLogData] = await Promise.all([
          getWaterIntakeData(clientId, currRange),
          (async () => {
            if (approachData === 'macro_tracking') return getDailyMacroLog(clientId, today);
            if (approachData === 'meal_plan') return getDailyMealPlanLog(clientId, today);
            return getDailyHabitLog(clientId, today);
          })(),
        ]);

        setTodayLog(todayLogData);
        setTodayWater(waterData.get(today) ?? null);

        const currWeekDates = weekDates(new Date(currRange.start + 'T00:00:00'));
        const waterDaysWithData = currWeekDates.map(d => waterData.get(d) ?? 0).filter(v => v > 0);
        setAvgWater7d(waterDaysWithData.length > 0
          ? Math.round(waterDaysWithData.reduce((a, b) => a + b, 0) / waterDaysWithData.length)
          : null);

        if (approachData === 'meal_plan') {
          try {
            const notesSnap = await getDocs(
              query(collection(db, 'nutritionLogs', clientId, 'coachNotes'), orderBy('sentAt', 'desc'), limit(1))
            );
            if (!notesSnap.empty) {
              const d = notesSnap.docs[0].data();
              setLatestCoachNote({
                note: d.note,
                day: d.day || '',
                sentAt: d.sentAt?.toDate ? d.sentAt.toDate() : new Date(),
              });
            }
          } catch { /* optional */ }
        }

        if (approachData === 'macro_tracking') {
          try {
            const mealsSnap = await getDocs(collection(db, 'nutritionLogs', clientId, 'meals'));
            const screenshots: Screenshot[] = [];
            mealsSnap.docs.forEach(docSnap => {
              const date = docSnap.id;
              const data = docSnap.data();
              if (date >= currRange.start && date <= currRange.end && data.screenshotUrl) {
                let storagePath: string | null = null;
                try {
                  const url = new URL(data.screenshotUrl);
                  const match = url.pathname.match(/\/o\/(.+?)(\?|$)/);
                  if (match) storagePath = decodeURIComponent(match[1]);
                } catch { /* ignore */ }
                screenshots.push({ date, url: data.screenshotUrl, storagePath });
              }
            });
            screenshots.sort((a, b) => b.date.localeCompare(a.date));
            setNutritionScreenshots(screenshots);
          } catch { /* optional */ }
        }

        const totalMeals = mealPlanData?.[0]?.meals?.length || 4;
        const habitsCount = habitsData?.length || 0;

        const [currDays, lastDays] = await Promise.all([
          buildWeekAdherence(clientId, approachData, currRange, totalMeals, habitsCount),
          buildWeekAdherence(clientId, approachData, lastRange, totalMeals, habitsCount),
        ]);

        setCurrentWeekDays(currDays);
        setLastWeekDays(lastDays);

      } catch (err) {
        console.error('[ClientNutritionDashboard] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [clientId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
        <p className="text-sm text-stone-600">Loading nutrition data...</p>
      </div>
    );
  }

  if (!approach) {
    return (
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
    );
  }

  const today = todayStr();
  const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayMealPlan = weeklyMealPlan?.find(d => d.day === todayDayName) ?? null;

  return (
    <div className="space-y-4">

      {/* ── ROW 1: Protocol Card ── */}
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
          <div className="flex items-center gap-3">
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
                <span className="text-xs text-muted-foreground">this week avg</span>
              </div>
            )}
            <Link
              href={`/dashboard/trainer/client-hub/${clientId}/nutrition`}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon className="h-3 w-3" /> Full view
            </Link>
          </div>
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
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Weekly Meal Plan</p>
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
            {latestCoachNote ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-800 mb-0.5">
                    📝 Client note
                    {latestCoachNote.day && <span className="font-normal text-amber-600 ml-1">— {latestCoachNote.day}</span>}
                    <span className="font-normal text-amber-500 ml-1">· {relativeDate(latestCoachNote.sentAt)}</span>
                  </p>
                  <p className="text-xs text-amber-900 leading-snug">{latestCoachNote.note}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> No notes from client yet
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── ROW 2: Adherence | Today ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Adherence Card */}
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className="text-sm font-semibold text-gray-900">📅 Weekly Adherence</h3>
            <div className="flex items-end gap-3">
              {lastWeekDays.length > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">Last week</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full block ${
                    (() => { const n = lastWeekDays.filter(d => d.hasData).length; return n >= 6 ? 'bg-green-100 text-green-700' : n >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'; })()
                  }`}>
                    {lastWeekDays.filter(d => d.hasData).length}/7 days
                  </span>
                </div>
              )}
              {currentWeekDays.length > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-0.5">This week</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full block ${
                    (() => { const n = currentWeekDays.filter(d => d.hasData).length; return n >= 6 ? 'bg-green-100 text-green-700' : n >= 4 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'; })()
                  }`}>
                    {currentWeekDays.filter(d => d.hasData).length}/7 days
                  </span>
                </div>
              )}
            </div>
          </div>
          {currentWeekDays.length > 0 && (() => {
            const todayDate = todayStr();
            const daysElapsed = currentWeekDays.filter(d => d.date <= todayDate).length;
            const thisWeekSoFar = currentWeekDays.filter(d => d.date <= todayDate && d.hasData).length;
            const lastWeekSamePeriod = lastWeekDays.slice(0, daysElapsed).filter(d => d.hasData).length;
            const diff = thisWeekSoFar - lastWeekSamePeriod;
            const hasBothWeeks = lastWeekDays.length > 0 && daysElapsed > 0;
            return (
              <p className={`text-xs mb-2 flex items-center gap-1 ${hasBothWeeks ? (diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-muted-foreground') : 'text-muted-foreground'}`}>
                <span className="text-muted-foreground">🔄 In progress</span>
                {hasBothWeeks && (
                  <>
                    <span className="text-muted-foreground mx-0.5">·</span>
                    {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {diff > 0 ? `Ahead of last week's pace (+${diff} day${diff !== 1 ? 's' : ''})` : diff < 0 ? `Behind last week's pace (${diff} day${Math.abs(diff) !== 1 ? 's' : ''})` : `On pace with last week`}
                  </>
                )}
              </p>
            );
          })()}

          {currentWeekDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-1.5">Current week (Sun–Sat)</p>
              <div className="grid grid-cols-7 gap-1.5">
                {currentWeekDays.map(day => {
                  const isToday = day.date === today;
                  const isFuture = day.date > today;
                  const level = day.hasData ? getAdherenceLevel(day.pct) : 'red';
                  return (
                    <div key={day.date} className={`rounded-lg p-2 text-center border ${isToday ? 'border-primary bg-primary/10' : isFuture ? 'border-gray-100 bg-gray-50 opacity-40' : day.hasData ? `${getAdherenceBorderColor(level)} ${getAdherenceBgColor(level)}` : 'border-gray-200 bg-gray-50'}`}>
                      <p className={`text-xs font-medium mb-0.5 ${isToday ? 'text-primary' : 'text-gray-500'}`}>{dayLabel(day.date)}</p>
                      <p className={`text-xs font-bold leading-none mb-0.5 ${isToday ? 'text-primary' : 'text-gray-600'}`}>{dayNum(day.date)}</p>
                      {isFuture ? <p className="text-xs text-gray-300">—</p> : day.hasData ? (
                        <>
                          <p className={`text-sm font-bold ${getAdherenceTextColor(level)}`}>{day.pct}%</p>
                          <p className="text-xs text-muted-foreground">{day.completed}/{day.total}</p>
                        </>
                      ) : <p className="text-xs text-gray-300 mt-1">—</p>}
                    </div>
                  );
                })}
              </div>
              {lastWeekDays.some(d => d.hasData) && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Last week</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {lastWeekDays.map(day => {
                      const level = day.hasData ? getAdherenceLevel(day.pct) : 'red';
                      return (
                        <div key={day.date} className={`rounded-lg p-1.5 text-center border opacity-70 ${day.hasData ? `${getAdherenceBorderColor(level)} ${getAdherenceBgColor(level)}` : 'border-gray-200 bg-gray-50'}`}>
                          <p className="text-xs text-gray-500">{dayLabel(day.date)}</p>
                          {day.hasData ? <p className={`text-xs font-bold ${getAdherenceTextColor(level)}`}>{day.pct}%</p> : <p className="text-xs text-gray-300">—</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
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

          {approach === 'macro_tracking' && (
            todayLog ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${Number(todayLog.adherencePercentage) >= 80 ? 'text-green-600' : Number(todayLog.adherencePercentage) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {Math.round(Number(todayLog.adherencePercentage))}%
                  </span>
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
                            <div className={`h-1.5 rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
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
                      <span key={meal} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${logged ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
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

          {approach === 'meal_plan' && (
            todayMealPlan ? (
              <div className="space-y-2">
                {todayMealPlan.meals.map(meal => {
                  const completedMeals: string[] = Array.isArray(todayLog?.completedMeals) ? todayLog.completedMeals : [];
                  const done = completedMeals.includes(meal.name);
                  return (
                    <div key={meal.name} className={`rounded-lg p-3 ${done ? 'bg-green-50 border border-green-200' : 'bg-white/60 border border-gray-200'}`}>
                      <div className="flex items-start gap-2">
                        {done ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />}
                        <div className="min-w-0">
                          <p className={`text-xs font-semibold ${done ? 'text-green-800' : 'text-gray-700'}`}>{meal.name}</p>
                          {meal.items && meal.items.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">{meal.items.slice(0, 2).join(', ')}{meal.items.length > 2 ? '...' : ''}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!todayLog && <p className="text-xs text-muted-foreground italic text-center mt-1">Client hasn&apos;t logged anything today</p>}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">No meal plan for today</p>
              </div>
            )
          )}

          {approach === 'healthy_habits' && habits && habits.length > 0 && (
            <div className="space-y-1.5">
              {todayLog && (
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-bold ${Number(todayLog.completionPercentage) >= 80 ? 'text-green-600' : Number(todayLog.completionPercentage) >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {todayLog.completionCount}/{todayLog.totalHabits}
                  </span>
                  <span className="text-xs text-muted-foreground">habits completed today</span>
                </div>
              )}
              {!todayLog && <p className="text-xs text-muted-foreground mb-2 text-center">No habits logged today yet</p>}
              {habits.map(habit => {
                const done = todayLog?.habits && typeof todayLog.habits === 'object'
                  ? (todayLog.habits as Record<string, boolean>)[habit.id] === true
                  : false;
                return (
                  <div key={habit.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${done ? 'bg-green-50 border border-green-200' : 'bg-white/50 border border-gray-200'}`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />}
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

      {/* ── ROW 3: Screenshots (macro_tracking only) ── */}
      {approach === 'macro_tracking' && (
        <div className="bg-primary/5 border border-primary/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              📸 Submitted Screenshots — This Week
            </h3>
            {nutritionScreenshots.length > 0 && (
              <span className="text-xs text-muted-foreground">{nutritionScreenshots.length} photo{nutritionScreenshots.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {nutritionScreenshots.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No screenshots submitted this week</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {nutritionScreenshots.map((ss, idx) => {
                const isLatest = idx === 0;
                const dateDisplay = new Date(ss.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                return (
                  <div key={ss.date} className={`relative rounded-xl overflow-hidden border ${isLatest ? 'border-primary/50 ring-2 ring-primary/20' : 'border-gray-200'}`}>
                    {isLatest && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <span className="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded-full">Latest</span>
                      </div>
                    )}
                    <a href={ss.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-square bg-gray-100 hover:opacity-90 transition-opacity">
                      <Image src={ss.url} alt={`Nutrition screenshot ${ss.date}`} fill className="object-cover" sizes="200px" unoptimized />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </a>
                    <div className="p-2 bg-white flex items-center justify-between gap-1">
                      <p className="text-xs font-medium text-gray-700 truncate">{dateDisplay}</p>
                      <button
                        onClick={async () => {
                          setDismissingDate(ss.date);
                          try {
                            if (ss.storagePath) {
                              try { await deleteObject(ref(storage, ss.storagePath)); } catch { /* already gone */ }
                            }
                            await updateDoc(doc(db, 'nutritionLogs', clientId, 'meals', ss.date), {
                              screenshotUrl: null,
                              screenshotUploadedAt: null,
                            });
                            setNutritionScreenshots(prev => prev.filter(s => s.date !== ss.date));
                          } catch (e) {
                            console.error('Dismiss screenshot error:', e);
                          } finally {
                            setDismissingDate(null);
                          }
                        }}
                        disabled={dismissingDate === ss.date}
                        className="flex-shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Dismiss (delete screenshot)"
                      >
                        {dismissingDate === ss.date ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
