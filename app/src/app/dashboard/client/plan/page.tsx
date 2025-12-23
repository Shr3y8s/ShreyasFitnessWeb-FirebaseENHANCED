'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { ClipboardList, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { YourVision } from '@/components/plan/your-vision';
import { StepGoalCard } from '@/components/plan/step-goal-card';
import { CardioProtocol } from '@/components/plan/cardio-protocol';
import { PlanSummary } from '@/components/plan/plan-summary';
import { DailyHabits } from '@/components/plan/current-focus';
import { ClientTrainingProtocol } from '@/components/plan/client-training-protocol';
import { ClientNutritionProtocol } from '@/components/plan/client-nutrition-protocol';
import { getClientPlan } from '@/lib/plan-api';
import { ClientPlan } from '@/types/plan';
import { Card, CardContent } from '@/components/ui/card';

export default function PlanPage() {
  const router = useRouter();
  const { userData, loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ClientPlan | null>(null);

  useEffect(() => {
    const loadPlan = async () => {
      if (authLoading) return;

      if (!userData || !user) {
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

      try {
        // Fetch plan data
        const planData = await getClientPlan(user.uid);
        setPlan(planData);
      } catch (error) {
        console.error('Error loading plan:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();
  }, [userData, authLoading, user, router]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
            <div className="flex items-center gap-2 text-stone-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your plan...
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Check if plan has any configured sections
  const hasPlanData = plan && (plan.vision || plan.stepGoal || plan.lissCardio || plan.weeklyFocus);

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                <ClipboardList className="h-8 w-8 text-primary" />
                My Training Plan
              </h1>
              <p className="text-muted-foreground mt-1">
                Your personalized training, nutrition, and cardio protocols
              </p>
            </div>

            {hasPlanData ? (
              <>
                {/* Status Badges & Quick Stats */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    Plan Active
                  </div>
                  {plan.updatedAt && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-green-500/50 rounded-full text-sm font-medium text-green-600 dark:text-green-400">
                      <Calendar className="h-3 w-3" />
                      Updated {new Date(plan.updatedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* 2-Column Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Main content (2/3 width) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Weekly Focus / Plan Summary */}
                    {plan?.weeklyFocus ? (
                      <PlanSummary weeklyFocus={plan.weeklyFocus} />
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="pt-6">
                          <div className="text-center py-8 text-muted-foreground">
                            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p className="font-medium">Weekly plan coming soon</p>
                            <p className="text-sm mt-1">Your trainer will add weekly focus, adjustments, and priorities</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Training Protocol */}
                    {user && (
                      <ClientTrainingProtocol 
                        clientId={user.uid}
                        keyPriorities={plan?.trainingProtocol?.keyPriorities || []}
                      />
                    )}

                    {/* Nutrition Protocol */}
          {plan?.nutritionProtocol && (
            <ClientNutritionProtocol 
              assignedApproach={plan.nutritionProtocol.approach}
              lastUpdated={plan.nutritionProtocol.lastUpdated}
              nutritionData={{
                healthyHabits: plan.nutritionProtocol.healthyHabits,
                macroTracking: plan.nutritionProtocol.macroTracking,
                mealPlan: plan.nutritionProtocol.mealPlan
              }}
            />
          )}
                  </div>

                  {/* Right Column: Vision, Daily Habits, Step Goal & Cardio (1/3 width) */}
                  <div className="space-y-6 lg:col-span-1">
                    {/* Your Vision Card */}
                    {plan?.vision && <YourVision goals={plan.vision.goals} />}

                    {/* Daily Habits Card */}
                    <DailyHabits habits={plan?.dailyHabits?.habits} />

                    {/* Step Goal Card */}
                    {plan?.stepGoal && (
                      <StepGoalCard 
                        target={plan.stepGoal.target} 
                        tips={plan.stepGoal.tips} 
                      />
                    )}

                    {/* Cardio Protocol Card */}
                    {plan?.lissCardio && (
                      <CardioProtocol 
                        frequency={plan.lissCardio.frequency}
                        duration={plan.lissCardio.duration}
                        targetHeartRate={plan.lissCardio.targetHeartRate}
                        timing={plan.lissCardio.timing}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Empty State - No plan configured yet */
              <Card className="border-dashed border-2">
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <ClipboardList className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h2 className="text-2xl font-semibold mb-2 text-foreground">No Plan Yet</h2>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Your trainer hasn't created your personalized training plan yet. 
                      They'll set up your vision, goals, and protocols soon!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check back later or reach out to your trainer for updates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
