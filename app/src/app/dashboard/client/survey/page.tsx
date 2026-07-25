'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';

import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
import { FeatureLockedShell } from '@/components/dashboard/FeatureLockedShell';
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
      redirectToCheckoutForTier(router, userData.tier, '/dashboard/client/survey');
      return;
    }

  }, [userData, authLoading, router]);

  // Tier gating: in-person clients don't have weekly surveys.
  if (userData && !getClientFeatureAccess(userData.tier).logging) {
    return <FeatureLockedShell feature="logging" />;
  }

  if (authLoading || !userData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <ClientPageShell>
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
    </ClientPageShell>
  );
}
