"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { GoalsMilestonesTab } from '@/components/progress/goals-milestones-tab';
import { TimeRangeSelector } from '@/components/progress/time-range-selector';
import { Goal } from 'lucide-react';

export type TimeRange = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL';

export default function GoalsPage() {
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
                  <Goal className="h-8 w-8 text-primary" />
                  Goals & Milestones
                </h1>
                <p className="text-muted-foreground mt-1">
                  Set, track, and celebrate your fitness achievements
                </p>
              </div>
              <TimeRangeSelector
                value={timeRange}
                onChange={setTimeRange}
              />
            </div>

            {/* Goals Content */}
            <GoalsMilestonesTab timeRange={timeRange} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
