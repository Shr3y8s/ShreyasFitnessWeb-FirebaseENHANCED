"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';

import { signOutUser } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, Share2, TrendingUp, BrainCircuit, Activity } from 'lucide-react';
import { KeyMetricsOverview } from '@/components/client-progress/key-metrics-overview';
import { ProgressCharts } from '@/components/client-progress/progress-charts';
import { HabitTracker } from '@/components/client-progress/habit-tracker';
import { Achievements } from '@/components/client-progress/achievements';
import { StrengthTrends } from '@/components/client-progress/strength-trends';
import { QualitativeTrends } from '@/components/client-progress/qualitative-trends';
import { ActivityWellnessTab } from '@/components/client-progress/activity-wellness-tab';

export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';

export default function ProgressPage() {
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

    if (!userData.accountActivated) {
      redirectToCheckoutForTier(router, userData.tier, '/dashboard/client/progress');
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

  // Tier gating: in-person clients don't have progress tracking.
  if (!authLoading && userData && !getClientFeatureAccess(userData.tier).progress) {
    return <FeatureLockedShell feature="progress" />;
  }

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
        <div className="client-surface p-4 sm:p-6 lg:p-8">

          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground animate-fade-in-up">
                  Your Progress Journey
                </h1>
                <p className="text-muted-foreground mt-1 animate-fade-in-up stagger-1">
                  Celebrating your consistency and the healthy habits you&apos;re building.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button>
                  <FileDown className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="mb-4 inline-flex items-center justify-center rounded-full bg-secondary p-1">
                <TabsTrigger value="performance">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Performance & Progress
                </TabsTrigger>
                <TabsTrigger value="wellbeing">
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  Well-being & Feedback
                </TabsTrigger>
                <TabsTrigger value="activity" className="relative">
                  <Activity className="mr-2 h-4 w-4" />
                  Activity & Wellness
                  <Badge variant="outline" className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs border-primary/50 text-primary bg-background">
                    Coming Soon
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="performance">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    Your measurable journey in numbers
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 space-y-6">
                    <KeyMetricsOverview />
                    <ProgressCharts />
                    <StrengthTrends />
                  </div>
                  <div className="lg:col-span-1 space-y-6">
                    <HabitTracker />
                    <Achievements />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wellbeing">
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground">
                    How you're feeling week-over-week
                  </p>
                </div>
                <div className="max-w-4xl mx-auto">
                  <QualitativeTrends />
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <ActivityWellnessTab timeRange={'30D' as TimeRange} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
