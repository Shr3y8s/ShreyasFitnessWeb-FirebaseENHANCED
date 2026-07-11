'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import ActivityFeedPanel from '@/components/trainer/activity-feed/ActivityFeedPanel';
import { Activity } from 'lucide-react';

/**
 * Full-page Activity Feed view.
 * Fallback/deep-link route — primary access is via the bell → slide-out panel.
 * Route: /dashboard/trainer/activity
 */
export default function TrainerActivityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessTrainerDashboard } = useAuth();

  if (authLoading) {
    return (
      <div className="client-surface flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>

    );
  }

  if (!canAccessTrainerDashboard) {
    router.push('/dashboard');
    return null;
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="activity" />
      <SidebarInset>
        <div className="client-surface p-8">

          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Activity className="w-6 h-6 text-emerald-600" />
                Client Activity Feed
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time log of all client activity (last 7 days)
              </p>
            </div>

            {/* Feed Panel */}
            <div className="dashboard-card rounded-xl border shadow-sm min-h-[600px]">

              <ActivityFeedPanel />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
