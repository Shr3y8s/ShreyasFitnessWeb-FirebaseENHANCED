'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';
import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';

import { Loader2, ChevronLeft, ChevronRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  getDailyActivity, 
  logSteps, 
  logWater, 
  toggleHabit, 
  logWeight,
  logCardio,
  getWeeklyCardioCount,
  getRecentWeightLogs 
} from '@/lib/activity-api';
import { getClientPlan } from '@/lib/plan-api';
import { StepsLogger } from '@/components/activity/StepsLogger';
import { WaterLogger } from '@/components/activity/WaterLogger';
import { DailyHabitsChecklist } from '@/components/activity/DailyHabitsChecklist';
import { WeightLogger } from '@/components/activity/WeightLogger';
import { LissCardioTracker } from '@/components/activity/LissCardioTracker';
import { TodaysProgressHero, ACTIVITY_SECTION_IDS } from '@/components/activity/TodaysProgressHero';
import { useConfetti } from '@/hooks/use-confetti';
import type { DailyActivityData, WeightLog } from '@/types/activity';
import type { ClientPlan } from '@/types/plan';

import { getTodayLocal, getDaysAgo } from '@/lib/date-utils';

// Get today's date in YYYY-MM-DD format
const getTodayDate = getTodayLocal;

// Format date for display (desktop — full, spelled out)
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric' 
  });
};

// Compact variant for phones so the label never wraps to two lines
const formatDateDisplayShort = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Get 30 days ago
const getThirtyDaysAgo = () => getDaysAgo(30);

/** Parses "2x per week" → 2. Mirrors LissCardioTracker's own parsing. */
const parseWeeklyTarget = (frequency: string): number => {
  const match = frequency.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

export default function DailyActivityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { schoolPride } = useConfetti();
  
  const [planData, setPlanData] = useState<ClientPlan | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityData | null>(null);
  const [recentWeights, setRecentWeights] = useState<WeightLog[]>([]);
  const [weeklyCardioCount, setWeeklyCardioCount] = useState(0);
  const [cardioLoggedToday, setCardioLoggedToday] = useState(false);
  const [cardioLoading, setCardioLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());

  // Redirect if not authenticated or not a client
  useEffect(() => {
    if (authLoading) return;
    
    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.role !== 'client') {
      router.push('/dashboard');
      return;
    }

    if (!userData.accountActivated) {
      redirectToCheckoutForTier(router, userData.tier, '/dashboard/client/activity');
      return;
    }
  }, [userData, authLoading, router]);

  // Load plan data and activity data
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load client plan for goals
        const plan = await getClientPlan(user.uid);
        setPlanData(plan);
        
        // Load activity data for selected date
        const activity = await getDailyActivity(user.uid, selectedDate);
        setActivityData(activity);
        
        // Load recent weight logs
        const weights = await getRecentWeightLogs(user.uid, 10);
        setRecentWeights(weights);

        // Load weekly cardio count (always based on current calendar week Mon-Sun)
        if (plan?.lissCardio) {
          const today = getTodayDate();
          const todayObj = new Date(today + 'T00:00:00');
          const dayOfWeek = todayObj.getDay(); // 0=Sun,1=Mon,...
          const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
          const weekStart = new Date(todayObj);
          weekStart.setDate(todayObj.getDate() + diffToMon);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          const weekStartStr = weekStart.toISOString().split('T')[0];
          const weekEndStr = weekEnd.toISOString().split('T')[0];
          const cardioResult = await getWeeklyCardioCount(user.uid, weekStartStr, weekEndStr, today);
          setWeeklyCardioCount(cardioResult.count);
          setCardioLoggedToday(cardioResult.loggedToday);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, selectedDate, refreshKey]);

  // Handler functions with optimistic updates
  const handleSaveSteps = async (steps: number) => {
    if (!user || !planData?.stepGoal) return;
    
    const stepGoal = planData.stepGoal; // Type guard
    
    // Optimistic update
    setActivityData(prev => ({
      ...prev,
      date: selectedDate,
      steps: {
        date: selectedDate,
        steps,
        goal: stepGoal.target,
        timestamp: new Date()
      },
      habits: prev?.habits || [],
      updatedAt: new Date()
    }));
    
    // API call in background
    const result = await logSteps(user.uid, selectedDate, steps, stepGoal.target);
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleSaveWater = async (amount: number) => {
    if (!user || !planData?.waterGoal) return;
    
    const waterGoal = planData.waterGoal; // Type guard
    
    // Optimistic update
    setActivityData(prev => ({
      ...prev,
      date: selectedDate,
      water: {
        date: selectedDate,
        amount,
        unit: waterGoal.unit,
        goal: waterGoal.target,
        timestamp: new Date()
      },
      habits: prev?.habits || [],
      updatedAt: new Date()
    }));
    
    // API call in background
    const result = await logWater(
      user.uid, 
      selectedDate, 
      amount, 
      waterGoal.unit, 
      waterGoal.target
    );
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleToggleHabit = async (habitId: string, completed: boolean) => {
    if (!user) return;
    
    // Optimistic update - update UI immediately
    setActivityData(prev => {
      const base = prev || { date: selectedDate, habits: [], updatedAt: new Date() };
      const existingHabits = base.habits || [];
      const habitIndex = existingHabits.findIndex(h => h.habitId === habitId);
      
      let updatedHabits;
      if (habitIndex >= 0) {
        // Update existing habit
        updatedHabits = [...existingHabits];
        updatedHabits[habitIndex] = {
          ...updatedHabits[habitIndex],
          completed,
          timestamp: new Date()
        };
      } else {
        // Add new habit
        updatedHabits = [
          ...existingHabits,
          {
            date: selectedDate,
            habitId,
            completed,
            timestamp: new Date()
          }
        ];
      }
      
      return {
        ...base,
        habits: updatedHabits,
        updatedAt: new Date()
      };
    });
    
    // Make API call in background
    const result = await toggleHabit(user.uid, selectedDate, habitId, completed);
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleSaveWeight = async (
    weight: number,
    unit: 'lbs' | 'kg',
    bodyFat?: number,
    height?: number,
    heightUnit?: 'in' | 'cm',
    notes?: string
  ) => {
    if (!user) return;
    
    // Calculate BMI if height is provided
    let bmi: number | undefined;
    if (height && height > 0) {
      // Convert to kg and meters
      const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;
      const heightM = heightUnit === 'in' ? height * 0.0254 : height / 100;
      bmi = weightKg / (heightM * heightM);
    }
    
    // Optimistic update for current weight
    setActivityData(prev => ({
      ...prev,
      date: selectedDate,
      weight: {
        date: selectedDate,
        weight,
        unit,
        bodyFat,
        height,
        heightUnit,
        bmi,
        notes,
        timestamp: new Date()
      },
      habits: prev?.habits || [],
      updatedAt: new Date()
    }));
    
    // Optimistic update for recent weights list
    const newWeightLog = {
      date: selectedDate,
      weight,
      unit,
      bodyFat,
      height,
      heightUnit,
      bmi,
      notes,
      timestamp: new Date()
    };
    setRecentWeights(prev => {
      // Remove existing entry for selected date if exists, then add new one at start
      const filtered = prev.filter(w => w.date !== selectedDate);
      return [newWeightLog, ...filtered].slice(0, 10);
    });
    
    // API call in background
    const result = await logWeight(user.uid, selectedDate, weight, unit, bodyFat, height, heightUnit, bmi, notes);
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleToggleCardio = async (completed: boolean) => {
    if (!user) return;
    setCardioLoading(true);
    // Optimistic update
    const prev = cardioLoggedToday;
    const prevCount = weeklyCardioCount;
    setCardioLoggedToday(completed);
    setWeeklyCardioCount(completed ? prevCount + 1 : Math.max(0, prevCount - 1));
    const result = await logCardio(user.uid, getTodayDate(), completed);
    if (!result.success) {
      // Revert on error
      setCardioLoggedToday(prev);
      setWeeklyCardioCount(prevCount);
    }
    setCardioLoading(false);
  };

  // Tier gating: in-person clients don't have daily activity logging.
  if (userData && !getClientFeatureAccess(userData.tier).logging) {
    return <FeatureLockedShell feature="logging" />;
  }

  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---- Derived summary state for TodaysProgressHero ----
     All values come from data already fetched above — no extra reads. A module
     counts as "assigned" only if the coach configured it, so the master ring
     never penalizes a client for a goal they were never given. */
  const stepsTarget = planData?.stepGoal?.target ?? 0;
  const stepsLogged = activityData?.steps?.steps ?? 0;
  const waterTarget = planData?.waterGoal?.target ?? 0;
  const waterLogged = activityData?.water?.amount ?? 0;
  const habitList = planData?.dailyHabits?.habits ?? [];
  const habitsDone = habitList.filter((h) =>
    activityData?.habits?.some((log) => log.habitId === h.id && log.completed)
  ).length;
  const cardioTarget = planData?.lissCardio
    ? parseWeeklyTarget(planData.lissCardio.frequency)
    : 0;

  const heroModules = {
    steps: {
      assigned: !!planData?.stepGoal,
      percentage: stepsTarget > 0 ? Math.min(100, (stepsLogged / stepsTarget) * 100) : 0,
      label: stepsLogged >= stepsTarget && stepsTarget > 0 ? '✓' : `${stepsLogged.toLocaleString()}`,
    },
    water: {
      assigned: !!planData?.waterGoal,
      percentage: waterTarget > 0 ? Math.min(100, (waterLogged / waterTarget) * 100) : 0,
      label: waterLogged >= waterTarget && waterTarget > 0 ? '✓' : `${waterLogged}/${waterTarget}`,
    },
    habits: {
      assigned: habitList.length > 0,
      percentage: habitList.length > 0 ? (habitsDone / habitList.length) * 100 : 0,
      label: habitsDone === habitList.length && habitList.length > 0 ? '✓' : `${habitsDone}/${habitList.length}`,
    },
    cardio: {
      assigned: !!planData?.lissCardio,
      percentage: cardioTarget > 0 ? Math.min(100, (weeklyCardioCount / cardioTarget) * 100) : 0,
      label:
        weeklyCardioCount >= cardioTarget && cardioTarget > 0
          ? '✓'
          : `${weeklyCardioCount}/${cardioTarget}`,
    },
  };


  return (
    <ClientPageShell>
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Log Daily Activities</h1>
              <p className="text-muted-foreground text-sm mt-1">Track your daily progress</p>
            </div>

            {/* Date Navigation — sticks below the mobile top bar (which is h-[57px])
                so the day you're logging is always visible while scrolling the
                stack of logger cards. Static on md+ where the sidebar is shown. */}
            <div className="dashboard-card rounded-lg p-3 sm:p-4 sticky top-[57px] z-20 md:static md:z-auto backdrop-blur-md">
              <div className="mb-2 sm:mb-3 text-center">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  <span className="hidden sm:inline">Logging activity data for: </span>
                  <span className="text-primary">
                    <span className="sm:hidden">{formatDateDisplayShort(selectedDate)}</span>
                    <span className="hidden sm:inline">{formatDateDisplay(selectedDate)}</span>
                  </span>
                </p>
              </div>

              {/* Single row at every width: [◀] [ date ] [▶] */}
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {/* Previous Day Arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() - 1);
                    const newDate = date.toISOString().split('T')[0];
                    if (newDate >= getThirtyDaysAgo()) {
                      setSelectedDate(newDate);
                    }
                  }}
                  disabled={selectedDate <= getThirtyDaysAgo()}
                  className="h-11 w-11 shrink-0 rounded-full transition-transform active:scale-95"
                  title="Previous Day"
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Date Picker — flexes to fill the space between the arrows */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayDate()}
                  min={getThirtyDaysAgo()}
                  aria-label="Select date to log"
                  className="flex-1 min-w-0 sm:flex-none min-h-11 px-3 sm:px-4 py-2 border-2 border-primary/30 rounded-md bg-background text-foreground text-base font-medium text-center focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />

                {/* Next Day Arrow */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() + 1);
                    const newDate = date.toISOString().split('T')[0];
                    if (newDate <= getTodayDate()) {
                      setSelectedDate(newDate);
                    }
                  }}
                  disabled={selectedDate >= getTodayDate()}
                  className="h-11 w-11 shrink-0 rounded-full transition-transform active:scale-95"
                  title="Next Day"
                  aria-label="Next day"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Jump to Today — inline on desktop only */}
                {selectedDate !== getTodayDate() && (
                  <Button
                    variant="default"
                    onClick={() => setSelectedDate(getTodayDate())}
                    className="hidden sm:inline-flex min-h-11 font-semibold px-4 transition-transform active:scale-95"
                  >
                    Jump to Today
                  </Button>
                )}
              </div>

              {/* Jump to Today — full-width row on phones for an easy tap */}
              {selectedDate !== getTodayDate() && (
                <Button
                  variant="default"
                  onClick={() => setSelectedDate(getTodayDate())}
                  className="sm:hidden w-full min-h-11 mt-2 font-semibold transition-transform active:scale-95"
                >
                  Jump to Today
                </Button>
              )}
            </div>

            {loading ? (
              /* Card-shaped skeletons instead of a bare spinner — on a slow mobile
                 connection a blank page with a spinner reads as "broken", whereas
                 skeletons communicate the shape of what's arriving. */
              <div className="space-y-4" aria-busy="true" aria-label="Loading your activity">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="dashboard-card rounded-lg p-4 sm:p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-5 w-32 rounded bg-muted" />
                      <div className="flex items-center gap-4">
                        <div className="h-[72px] w-[72px] shrink-0 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-7 w-24 rounded bg-muted" />
                          <div className="h-4 w-32 rounded bg-muted" />
                        </div>
                      </div>
                      <div className="h-11 w-full rounded-lg bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Day-at-a-glance summary — master ring + tap-to-jump chips */}
                <TodaysProgressHero
                  steps={heroModules.steps}
                  water={heroModules.water}
                  habits={heroModules.habits}
                  cardio={heroModules.cardio}
                  isToday={selectedDate === getTodayDate()}
                  onAllComplete={schoolPride}
                />

                {/* Today's Activity Section. Each card carries a scroll-target id
                    so the hero chips can jump straight to it. scroll-mt clears the
                    sticky date bar on mobile. */}
                <div className="space-y-4">
                  {/* Steps Logger */}
                  {planData?.stepGoal && (
                    <div id={ACTIVITY_SECTION_IDS.steps} className="scroll-mt-32 md:scroll-mt-6">
                      <StepsLogger
                        currentLog={activityData?.steps}
                        goal={planData.stepGoal.target}
                        onSave={handleSaveSteps}
                      />
                    </div>
                  )}

                  {/* Water Logger */}
                  {planData?.waterGoal && (
                    <div id={ACTIVITY_SECTION_IDS.water} className="scroll-mt-32 md:scroll-mt-6">
                      <WaterLogger
                        currentLog={activityData?.water}
                        goal={planData.waterGoal.target}
                        unit={planData.waterGoal.unit}
                        onSave={handleSaveWater}
                      />
                    </div>
                  )}

                  {/* Daily Habits Checklist */}
                  {planData?.dailyHabits?.habits && planData.dailyHabits.habits.length > 0 && (
                    <div id={ACTIVITY_SECTION_IDS.habits} className="scroll-mt-32 md:scroll-mt-6">
                      <DailyHabitsChecklist
                        habits={planData.dailyHabits.habits}
                        completedHabits={activityData?.habits || []}
                        onToggle={handleToggleHabit}
                      />
                    </div>
                  )}

                  {/* LISS Cardio Tracker — only shown when coach has assigned LISS cardio */}
                  {planData?.lissCardio && (
                    <div id={ACTIVITY_SECTION_IDS.cardio} className="scroll-mt-32 md:scroll-mt-6">
                      <LissCardioTracker
                        lissCardio={planData.lissCardio}
                        weeklyCount={weeklyCardioCount}
                        loggedToday={cardioLoggedToday}
                        onToggle={handleToggleCardio}
                        isLoading={cardioLoading}
                      />
                    </div>
                  )}
                </div>

                {/* Weight Log Section */}
                <WeightLogger
                  currentLog={activityData?.weight}
                  recentLogs={recentWeights}
                  onSave={handleSaveWeight}
                />

                {/* Info Message if no goals set */}
                {!planData?.stepGoal && !planData?.waterGoal && !planData?.dailyHabits && (
                  <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-6 text-center">
                    <Target className="mx-auto mb-3 h-10 w-10 text-primary/50" />
                    <p className="font-medium text-foreground">No daily goals yet</p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                      Your trainer hasn&apos;t set up daily activity goals yet. Once they do, you&apos;ll be able to track your steps, water intake, and daily habits right here.
                    </p>
                  </div>
                )}
              </>
            )}
      </div>
    </ClientPageShell>
  );
}
