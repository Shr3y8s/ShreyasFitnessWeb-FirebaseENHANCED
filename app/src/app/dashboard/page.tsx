'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { redirectToCheckoutForTier } from '@/lib/constants';


import { WelcomeScreen } from '@/components/dashboard/welcome-screen';

export default function DashboardWelcomePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [waitingForWebhook, setWaitingForWebhook] = useState(false);

  useEffect(() => {
    const checkUserPreference = async () => {
      // Handle unauthenticated users - redirect to login
      if (!authLoading && !user) {
        console.log('[Dashboard] No user detected - redirecting to login');
        router.push('/login');
        return;
      }
      
      if (!authLoading && user && userData) {
        try {
          // Check if returning from successful Stripe payment
          const urlParams = new URLSearchParams(window.location.search);
          const paymentSuccess = urlParams.get('payment') === 'success';
          
          // CRITICAL: If returning from Stripe, wait for webhook to update account activation
          if (paymentSuccess && userData.role === 'client' && !userData.accountActivated) {
            console.log('[Dashboard] Waiting for payment webhook to complete...');
            setWaitingForWebhook(true);
            setLoading(false);
            return;
          }
          
          // CRITICAL: Check account activation FIRST (but not if waiting for webhook).
          // Un-activated client (e.g. signup whose payment failed/was abandoned) →
          // resume payment via the unified checkout, keyed by their selected tier.
          if (userData.role === 'client' && !userData.accountActivated) {
            // Fallback to /dashboard/client (not /dashboard) to avoid a self-redirect loop.
            redirectToCheckoutForTier(router, userData.tier, '/dashboard', '/dashboard/client');
            return;
          }


          
          // Check user role and redirect appropriately
          if (userData.role === 'trainer' || userData.role === 'admin') {
            router.push('/dashboard/trainer');
            return;
          }
          
          // For clients: Only show welcome screen if coming from payment success
          // Otherwise, always redirect to client dashboard
          if (!paymentSuccess) {
            console.log('[Dashboard] Existing client - redirecting to client dashboard');
            router.push('/dashboard/client');
            return;
          }
          
          // Only show welcome screen for first-time users coming from payment
          console.log('[Dashboard] New client from payment - showing welcome screen');
          setLoading(false);
        } catch (error) {
          console.error('Error checking user preferences:', error);
          setLoading(false);
        }
      }
    };

    checkUserPreference();
  }, [user, userData, authLoading, router]);

  // Monitor payment status when waiting for webhook with real-time listener
  useEffect(() => {
    if (!waitingForWebhook || !user) return;

    console.log('[Dashboard] Setting up real-time listener for payment status...');
    
    // Set up real-time listener for user document
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('[Dashboard] Account activation update:', data.accountActivated);
        
        if (data.accountActivated) {
          console.log('[Dashboard] Payment confirmed! Proceeding...');
          // Just stop waiting — no reload. auth-context's own user-doc listener has
          // already updated userData.accountActivated in place, so clearing this
          // flag lets the component re-render straight into <WelcomeScreen> (URL
          // still has ?payment=success). A full reload here caused a visible
          // welcome → blank → welcome flicker (the page loading twice).
          setWaitingForWebhook(false);
        }


      }
    }, (error) => {
      console.error('[Dashboard] Error listening to payment status:', error);
    });

    // Timeout fallback: If webhook takes too long (15 seconds), proceed anyway
    const timeoutId = setTimeout(() => {
      console.log('[Dashboard] Webhook timeout - proceeding to welcome screen');
      setWaitingForWebhook(false);
      window.history.replaceState({}, '', '/dashboard');
      window.location.reload();
    }, 15000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [waitingForWebhook, user]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleContinueToDashboard = async () => {
    // ALWAYS set hideWelcomeDashboard to true after viewing welcome screen once
    // This prevents the duplicate welcome screen issue in /dashboard/client
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), 
          { hideWelcomeDashboard: true }, 
          { merge: true }
        );
      } catch (error) {
        console.error('Error saving user preference:', error);
      }
    }
    router.push('/dashboard/client');
  };

  // Show redirecting message for unauthenticated users (no loading flash)
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Redirecting to login...</div>
      </div>
    );
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  // Show waiting screen while webhook processes payment
  if (waitingForWebhook) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Your Payment</h2>
          <p className="text-gray-600">Please wait while we confirm your payment...</p>
          <p className="text-sm text-gray-500 mt-2">This usually takes just a few seconds</p>
        </div>
      </div>
    );
  }
  
  // Don't render anything if redirecting (user is trainer/admin or existing client)
  if (!user || !userData || userData.role !== 'client') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Redirecting...</div>
      </div>
    );
  }
  
  // Use the WelcomeScreen component (has coach intro and "don't show again" option)
  return <WelcomeScreen onContinue={handleContinueToDashboard} />;
}
