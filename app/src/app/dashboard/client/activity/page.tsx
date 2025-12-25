'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Droplets, CheckSquare, Scale } from 'lucide-react';

export default function DailyActivityPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();

  // Redirect if not authenticated or not a client
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
  }, [userData, authLoading, router]);

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

  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Get today's date for display
  const today = new Date().toLocaleDateString('en-US', {
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
              <p className="text-muted-foreground mt-1">{today}</p>
            </div>

            {/* Today's Activity Section - Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Today's Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Steps Placeholder */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Steps</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Steps tracking coming soon...
                    </p>
                  </div>

                  {/* Water Placeholder */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Water Intake</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Water tracking coming soon...
                    </p>
                  </div>

                  {/* Habits Placeholder */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Daily Habits</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Habit tracking coming soon...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weight Log Section - Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Weekly Weigh-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Weight logging coming soon...
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
