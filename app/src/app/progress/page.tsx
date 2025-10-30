"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BodyCompositionTab } from '@/components/progress/body-composition-tab';
import { ActivityWellnessTab } from '@/components/progress/activity-wellness-tab';
import { StrengthProgressTab } from '@/components/progress/strength-progress-tab';
import { WorkoutAnalyticsTab } from '@/components/progress/workout-analytics-tab';
import { TimeRangeSelector } from '@/components/progress/time-range-selector';
import { TrendingUp, Activity, Dumbbell, BarChart3 } from 'lucide-react';

export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';

export default function ProgressPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-primary" />
                  Progress & Analytics
                </h1>
                <p className="text-muted-foreground mt-1">
                  Track your fitness journey and celebrate your achievements
                </p>
              </div>
              <TimeRangeSelector
                value={timeRange}
                onChange={setTimeRange}
              />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="body" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto gap-2">
                <TabsTrigger value="body" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Body Comp</span>
                  <span className="sm:hidden">Body</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Activity className="h-4 w-4" />
                  <span className="hidden sm:inline">Activity</span>
                  <span className="sm:hidden">Activity</span>
                </TabsTrigger>
                <TabsTrigger value="strength" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Dumbbell className="h-4 w-4" />
                  <span className="hidden sm:inline">Strength</span>
                  <span className="sm:hidden">Strength</span>
                </TabsTrigger>
                <TabsTrigger value="workouts" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Workouts</span>
                  <span className="sm:hidden">Workouts</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="body" className="space-y-6">
                <BodyCompositionTab timeRange={timeRange} />
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <ActivityWellnessTab timeRange={timeRange} />
              </TabsContent>

              <TabsContent value="strength" className="space-y-6">
                <StrengthProgressTab timeRange={timeRange} />
              </TabsContent>

              <TabsContent value="workouts" className="space-y-6">
                <WorkoutAnalyticsTab timeRange={timeRange} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
