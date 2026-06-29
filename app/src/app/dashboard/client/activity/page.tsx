'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';

import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayDateString } from '@/types/activity';
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
import type { DailyActivityData, WeightLog } from '@/types/activity';
import type { ClientPlan } from '@/types/plan';

import { getTodayLocal, getDaysAgo } from '@/lib/date-utils';

// Get today's date in YYYY-MM-DD format
const getTodayDate = getTodayLocal;

// Format date for display
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric' 
  });
};

// Get 30 days ago
const getThirtyDaysAgo = () => getDaysAgo(30);

export default function DailyActivityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  
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

  const handleLogout = async () => {
    const { signOutUser } = await import('@/lib/firebase');
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

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


  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData.name}
        userTier={userData.tier}
        userProfilePhoto={userData.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Log Daily Activities</h1>
              <p className="text-muted-foreground mt-1">Track your daily progress</p>
            </div>

            {/* Date Navigation */}
            <div className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/5 to-primary/10 rounded-lg p-4 shadow-lg">
              <div className="mb-3 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Logging activity data for:{' '}
                  <span className="text-primary">{formatDateDisplay(selectedDate)}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
                  className="h-10 w-10 rounded-full transition-all hover:scale-110"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Date Picker */}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayDate()}
                  min={getThirtyDaysAgo()}
                  className="px-4 py-2 border-2 border-primary/30 rounded-md bg-background text-foreground text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
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
                  className="h-10 w-10 rounded-full transition-all hover:scale-110"
                  title="Next Day"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>

                {/* Jump to Today Button - only shown when not on today */}
                {selectedDate !== getTodayDate() && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSelectedDate(getTodayDate())}
                    className="font-semibold px-4"
                  >
                    Jump to Today
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Today's Activity Section */}
                <div className="space-y-4">
                  {/* Steps Logger */}
                  {planData?.stepGoal && (
                    <StepsLogger
                      currentLog={activityData?.steps}
                      goal={planData.stepGoal.target}
                      onSave={handleSaveSteps}
                    />
                  )}

                  {/* Water Logger */}
                  {planData?.waterGoal && (
                    <WaterLogger
                      currentLog={activityData?.water}
                      goal={planData.waterGoal.target}
                      unit={planData.waterGoal.unit}
                      onSave={handleSaveWater}
                    />
                  )}

                  {/* Daily Habits Checklist */}
                  {planData?.dailyHabits?.habits && planData.dailyHabits.habits.length > 0 && (
                    <DailyHabitsChecklist
                      habits={planData.dailyHabits.habits}
                      completedHabits={activityData?.habits || []}
                      onToggle={handleToggleHabit}
                    />
                  )}

                  {/* LISS Cardio Tracker — only shown when coach has assigned LISS cardio */}
                  {planData?.lissCardio && (
                    <LissCardioTracker
                      lissCardio={planData.lissCardio}
                      weeklyCount={weeklyCardioCount}
                      loggedToday={cardioLoggedToday}
                      onToggle={handleToggleCardio}
                      isLoading={cardioLoading}
                    />
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-blue-800">
                      Your trainer hasn't set up daily activity goals yet. Once they do, you'll be able to track your steps, water intake, and daily habits here!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
