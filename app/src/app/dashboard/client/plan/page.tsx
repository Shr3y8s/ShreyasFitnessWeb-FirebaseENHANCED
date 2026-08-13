'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';

import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';

import { ClipboardList, Calendar, TrendingUp, Dumbbell, Apple } from 'lucide-react';
import { CurrentPlan } from '@/components/dashboard/current-plan';
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
        redirectToCheckoutForTier(router, userData.tier, '/dashboard/client/plan');
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

  // Tier gating: in-person clients don't have a coach-built plan.
  if (!authLoading && userData && !getClientFeatureAccess(userData.tier).plan) {
    return <FeatureLockedShell feature="plan" />;
  }

  if (loading || authLoading) {
    return (
      <ClientPageShell>
        {/* Skeleton rather than a spinner, matching the client dashboard. */}
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6" aria-busy="true">
          <div className="animate-pulse space-y-2">
            <div className="h-8 w-56 rounded bg-muted" />
            <div className="h-4 w-72 rounded bg-muted" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <div className="animate-pulse h-48 rounded-xl bg-muted" />
              <div className="animate-pulse h-64 rounded-xl bg-muted" />
            </div>
            <div className="space-y-4 sm:space-y-6 lg:col-span-1">
              <div className="animate-pulse h-40 rounded-xl bg-muted" />
              <div className="animate-pulse h-40 rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      </ClientPageShell>
    );
  }


  // Check if plan has any configured sections
  const hasPlanData = plan && (plan.vision || plan.stepGoal || plan.lissCardio || plan.weeklyFocus);

  return (
    <ClientPageShell>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3 text-foreground">
                <ClipboardList className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {/* Left Column: Main content (2/3 width).
                      space-y matches the page-level rhythm (16px mobile / 24px
                      desktop) so inner spacing never exceeds outer. */}
                  <div className="lg:col-span-2 space-y-4 sm:space-y-6">
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

                    {/* Training Section */}
                    <div className="space-y-3 sm:space-y-4">
                      {/* Training Section Header */}
                      <div className="flex items-center gap-3 pt-2">
                        <Dumbbell className="h-6 w-6 shrink-0 text-primary" />
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">Training</h2>
                        <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                      </div>
                      
                      {user && (
                        <ClientTrainingProtocol 
                          clientId={user.uid}
                          keyPriorities={plan?.trainingProtocol?.keyPriorities || []}
                        />
                      )}
                    </div>

                    {/* Nutrition Section */}
                    {plan?.nutritionProtocol && (
                      <div className="space-y-3 sm:space-y-4">
                        {/* Nutrition Section Header */}
                        <div className="flex items-center gap-3 pt-2">
                          <Apple className="h-6 w-6 shrink-0 text-primary" />
                          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Nutrition</h2>
                          <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                        </div>
                        
                        <ClientNutritionProtocol 
                          assignedApproach={plan.nutritionProtocol.approach}
                          lastUpdated={plan.nutritionProtocol.lastUpdated}
                          nutritionData={{
                            healthyHabits: plan.nutritionProtocol.healthyHabits,
                            macroTracking: plan.nutritionProtocol.macroTracking,
                            mealPlan: plan.nutritionProtocol.mealPlan
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Current Phase, Vision, Daily Habits, Step Goal & Cardio (1/3 width) */}
                  <div className="space-y-4 sm:space-y-6 lg:col-span-1">
                    {/* Current Phase Card */}
                    <CurrentPlan trainingProtocol={plan?.trainingProtocol} />

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
                        equipment={plan.lissCardio.equipment}
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
                      Your trainer hasn&apos;t created your personalized training plan yet. 
                      They&apos;ll set up your vision, goals, and protocols soon!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Check back later or reach out to your trainer for updates.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
      </div>
    </ClientPageShell>
  );
}
