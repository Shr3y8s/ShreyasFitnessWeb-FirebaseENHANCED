'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Loader2 } from 'lucide-react';
import { QualitativeFeedback } from '@/components/client-progress/qualitative-feedback';

export default function WeeklySurveyPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();

  // Redirect if not authenticated or not a client
  useEffect(() => {
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData.name}
        userTier={userData.tier}
        userProfilePhoto={userData.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Weekly Survey</h1>
              <p className="text-muted-foreground mt-1">Share your weekly progress and feedback</p>
            </div>

            {/* Survey Content */}
            <div className="max-w-5xl mx-auto">
              <QualitativeFeedback />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
