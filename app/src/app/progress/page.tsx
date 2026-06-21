"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirectToCheckoutForTier } from '@/lib/constants';

import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileDown, Share2, TrendingUp, ClipboardList, Activity } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { KeyMetricsOverview } from '@/components/progress/key-metrics-overview';
import { ProgressCharts } from '@/components/dashboard/progress-charts';
import { HabitTracker } from '@/components/progress/habit-tracker';
import { Achievements } from '@/components/progress/achievements';
import { StrengthTrends } from '@/components/progress/strength-trends';
import { QualitativeFeedback } from '@/components/progress/qualitative-feedback';
import { QualitativeTrends } from '@/components/progress/qualitative-trends';
import { ActivityWellnessTab } from '@/components/progress/activity-wellness-tab';

export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';

export default function ProgressPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('90');

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
      redirectToCheckoutForTier(router, userData.tier, '/progress');
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
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Last 30 Days</SelectItem>
                    <SelectItem value="90">Last 90 Days</SelectItem>
                    <SelectItem value="180">Last 6 Months</SelectItem>
                    <SelectItem value="365">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
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
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="mb-4 inline-flex items-center justify-center rounded-full bg-secondary p-1">
                <TabsTrigger value="overview">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Journey Overview
                </TabsTrigger>
                <TabsTrigger value="qualitative">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Weekly Survey
                </TabsTrigger>
                <TabsTrigger value="activity" className="relative">
                  <Activity className="mr-2 h-4 w-4" />
                  Activity
                  <Badge variant="outline" className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs border-primary/50 text-primary bg-background">
                    Coming Soon
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
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

              <TabsContent value="qualitative">
                <div className="grid grid-cols-1 lg:grid-cols-8 gap-8 items-start">
                  <div className="lg:col-span-5">
                    <QualitativeFeedback />
                  </div>
                  <div className="lg:col-span-3">
                    <QualitativeTrends />
                  </div>
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
