"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { ClipboardList } from 'lucide-react';
import { PlanSummary } from '@/components/plan/plan-summary';
import { TrainingProtocol } from '@/components/plan/training-protocol';
import { NutritionProtocol } from '@/components/plan/nutrition-protocol';
import { StepGoalCard } from '@/components/plan/step-goal-card';
import { CardioProtocol } from '@/components/plan/cardio-protocol';

export default function MyPlanPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

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

    if (userData.paymentStatus !== 'active') {
      router.push('/payment');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

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

            {/* Status Badges & Metric Cards */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 rounded-full text-sm font-semibold">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  Active
                </div>
                <div className="inline-flex items-center px-3 py-1.5 border border-green-500/50 rounded-full text-sm font-medium text-green-600 dark:text-green-400">
                  Updated 7 days ago
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2">
                <div className="text-center px-4 py-2 bg-card border border-green-500/50 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5">
                  <p className="font-bold text-lg">2,400 cal</p>
                  <p className="text-xs font-medium text-muted-foreground">Calories</p>
                </div>
                <div className="text-center px-4 py-2 bg-card border border-green-500/50 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5">
                  <p className="font-bold text-lg">180g</p>
                  <p className="text-xs font-medium text-muted-foreground">Protein</p>
                </div>
                <div className="text-center px-4 py-2 bg-card border border-green-500/50 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5">
                  <p className="font-bold text-lg">4x</p>
                  <p className="text-xs font-medium text-muted-foreground">Workouts</p>
                </div>
                <div className="text-center px-4 py-2 bg-card border border-green-500/50 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5">
                  <p className="font-bold text-lg">3x</p>
                  <p className="text-xs font-medium text-muted-foreground">Cardio</p>
                </div>
              </div>
            </div>

            {/* 3-Column Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* This Week's Focus - Full Width */}
              <div className="lg:col-span-3">
                <PlanSummary
                  coachNote={{
                    coachName: "Shreyas",
                    message: "Weight down 2.5lbs this week, feeling good overall. Energy slightly low on leg days - added 100 calories and will watch for improvements. Keep pushing on upper body lifts, form is looking solid!"
                  }}
                />
              </div>

            {/* Left Column: Training & Nutrition (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Training Protocol Card */}
              <TrainingProtocol />

              {/* Nutrition Protocol Card */}
              <NutritionProtocol />
            </div>

            {/* Right Column: Step Goal & Cardio (1/3 width) */}
            <div className="space-y-6 lg:col-span-1">
              {/* Step Goal Card */}
              <StepGoalCard />

              {/* Cardio Protocol Card */}
              <CardioProtocol />
            </div>
          </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
