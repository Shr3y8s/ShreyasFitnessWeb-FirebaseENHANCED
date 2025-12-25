'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Loader2 } from 'lucide-react';
import { getTodayDateString } from '@/types/activity';
import { 
  getDailyActivity, 
  logSteps, 
  logWater, 
  toggleHabit, 
  logWeight,
  getRecentWeightLogs 
} from '@/lib/activity-api';
import { getClientPlan } from '@/lib/plan-api';
import { StepsLogger } from '@/components/activity/StepsLogger';
import { WaterLogger } from '@/components/activity/WaterLogger';
import { DailyHabitsChecklist } from '@/components/activity/DailyHabitsChecklist';
import { WeightLogger } from '@/components/activity/WeightLogger';
import type { DailyActivityData, WeightLog } from '@/types/activity';
import type { ClientPlan } from '@/types/plan';

export default function DailyActivityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  
  const [planData, setPlanData] = useState<ClientPlan | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityData | null>(null);
  const [recentWeights, setRecentWeights] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const today = getTodayDateString();

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
      router.push('/payment');
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
        
        // Load today's activity data
        const activity = await getDailyActivity(user.uid, today);
        setActivityData(activity);
        
        // Load recent weight logs
        const weights = await getRecentWeightLogs(user.uid, 10);
        setRecentWeights(weights);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, today, refreshKey]);

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
      date: today,
      steps: {
        date: today,
        steps,
        goal: stepGoal.target,
        timestamp: new Date()
      },
      habits: prev?.habits || [],
      updatedAt: new Date()
    }));
    
    // API call in background
    const result = await logSteps(user.uid, today, steps, stepGoal.target);
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
      date: today,
      water: {
        date: today,
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
      today, 
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
      if (!prev) return prev;
      
      const existingHabits = prev.habits || [];
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
            date: today,
            habitId,
            completed,
            timestamp: new Date()
          }
        ];
      }
      
      return {
        ...prev,
        habits: updatedHabits
      };
    });
    
    // Make API call in background
    const result = await toggleHabit(user.uid, today, habitId, completed);
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  const handleSaveWeight = async (weight: number, unit: 'lbs' | 'kg', notes?: string) => {
    if (!user) return;
    
    // Optimistic update for current weight
    setActivityData(prev => ({
      ...prev,
      date: today,
      weight: {
        date: today,
        weight,
        unit,
        notes,
        timestamp: new Date()
      },
      habits: prev?.habits || [],
      updatedAt: new Date()
    }));
    
    // Optimistic update for recent weights list
    const newWeightLog = {
      date: today,
      weight,
      unit,
      notes,
      timestamp: new Date()
    };
    setRecentWeights(prev => {
      // Remove existing entry for today if exists, then add new one at start
      const filtered = prev.filter(w => w.date !== today);
      return [newWeightLog, ...filtered].slice(0, 10);
    });
    
    // API call in background
    const result = await logWeight(user.uid, today, weight, unit, notes);
    if (!result.success) {
      // Revert on error
      setRefreshKey(prev => prev + 1);
    }
  };

  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format today's date for display
  const todayDisplay = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData.name}
        userTier={userData.tier}
        userProfilePhoto={userData.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Daily Activities</h1>
              <p className="text-muted-foreground mt-1">{todayDisplay}</p>
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
