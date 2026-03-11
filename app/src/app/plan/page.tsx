"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { ClipboardList } from 'lucide-react';
import { PlanSummary } from '@/components/plan/plan-summary';
import { YourVision } from '@/components/plan/your-vision';
import { CurrentPlan } from '@/components/dashboard/current-plan';
import { CurrentFocus } from '@/components/plan/current-focus';
import { TrainingProtocol } from '@/components/plan/training-protocol';
import { NutritionProtocol } from '@/components/plan/nutrition-protocol';
import { StepGoalCard } from '@/components/plan/step-goal-card';
import { CardioProtocol } from '@/components/plan/cardio-protocol';
import { getCurrentWeekISO } from '@/lib/week-utils';
import { getClientPlan } from '@/lib/plan-api';
import { NutritionHabit, HealthyHabitsPreset } from '@/types/plan';

export default function MyPlanPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nutritionHabits, setNutritionHabits] = useState<NutritionHabit[]>([]);
  const [nutritionPreset, setNutritionPreset] = useState<HealthyHabitsPreset>(null);
  const [nutritionApproach, setNutritionApproach] = useState<string>('healthy_habits');

  React.useEffect(() => {
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

    setLoading(false);
  }, [userData, authLoading, router]);

  // Fetch nutrition protocol data from Firestore
  useEffect(() => {
    if (!userData?.uid) return;
    getClientPlan(userData.uid).then((plan) => {
      if (plan?.nutritionProtocol) {
        const np = plan.nutritionProtocol;
        setNutritionApproach(np.approach || 'healthy_habits');
        if (np.healthyHabits?.habits) {
          setNutritionHabits(np.healthyHabits.habits);
        }
        const preset = (np.healthyHabits as { habits: NutritionHabit[]; preset?: HealthyHabitsPreset })?.preset;
        if (preset) {
          setNutritionPreset(preset);
        }
      }
    }).catch((err) => console.error('Failed to load plan:', err));
  }, [userData?.uid]);

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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-primary" />
                My Plan
              </h1>
              <p className="text-muted-foreground mt-1">
                Your personalized training, nutrition, and cardio protocols
              </p>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                Active
              </div>
              <div className="inline-flex items-center px-3 py-1.5 border border-green-500/50 rounded-full text-sm font-medium text-green-600 dark:text-green-400">
                Updated 7 days ago
              </div>
            </div>

            {/* 2-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Plan Summary, Training & Nutrition (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <PlanSummary 
                  weeklyFocus={{
                    lastUpdated: new Date(),
                    weeks: [{
                      weekStartDate: getCurrentWeekISO(),
                      adjustments: [
                        "Added 100 calories to support energy levels",
                        "Increased protein to 180g daily"
                      ],
                      priorities: [
                        "Focus on progressive overload in upper body lifts",
                        "Maintain consistency with 4x weekly training",
                        "Track energy levels on leg days"
                      ],
                      coachNotes: "Weight down 2.5lbs this week, feeling good overall. Energy slightly low on leg days - added 100 calories and will watch for improvements. Keep pushing on upper body lifts, form is looking solid!",
                      lastCallDate: new Date('2024-12-15'),
                      createdAt: new Date(),
                      updatedAt: new Date()
                    }]
                  }}
                  coachName="Shreyas"
                />
                
                {/* Training Protocol Card */}
                <TrainingProtocol />

                {/* Nutrition Protocol Card */}
                <NutritionProtocol
                  habits={nutritionHabits}
                  preset={nutritionPreset}
                  approach={nutritionApproach}
                />
              </div>

              {/* Right Column: Current Plan, Vision, Focus, Step Goal & Cardio (1/3 width) */}
              <div className="space-y-6 lg:col-span-1">
                {/* Current Plan Card */}
                <CurrentPlan />

                {/* Your Vision Card */}
                <YourVision 
                  goals={[
                    { text: "Lose 20 pounds and feel confident in my own skin" },
                    { text: "Build strength to keep up with my kids" },
                    { text: "Establish healthy habits that last a lifetime" }
                  ]}
                />

                {/* Daily Habits Card */}
                <CurrentFocus 
                  habits={[
                    {
                      id: "1",
                      title: "Protein at Every Meal",
                      description: "Aim for 30-40g protein at each main meal",
                      iconType: "nutrition",
                      order: 1
                    },
                    {
                      id: "2", 
                      title: "Hydration Check-ins",
                      description: "Drink water with each meal and snack",
                      iconType: "hydration",
                      order: 2
                    },
                    {
                      id: "3",
                      title: "Quality Sleep",
                      description: "7-8 hours per night, consistent schedule",
                      iconType: "sleep",
                      order: 3
                    }
                  ]}
                />

                {/* Step Goal Card */}
                <StepGoalCard 
                  target={10000}
                  tips={[
                    "Take a 10-min walk after meals",
                    "Park farther away from entrances",
                    "Take stairs when possible"
                  ]}
                />

                {/* Cardio Protocol Card */}
                <CardioProtocol 
                  frequency="3-4x per week"
                  duration="30-45 min"
                  targetHeartRate="120-140 BPM"
                  timing="Post-workout or fasted AM"
                />
              </div>
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
