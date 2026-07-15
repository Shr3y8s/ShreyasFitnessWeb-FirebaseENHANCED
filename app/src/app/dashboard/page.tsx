'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, userHasProfile } from '@/lib/firebase';
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

      // SAFETY-NET: authenticated but NO profile doc in any collection.
      // auth-context sets userData=null + loading=false in this case. This is an
      // "orphaned" Firebase Auth user — e.g. a Google sign-in that never completed
      // the email/password signup that writes the users/{uid} doc.
      //
      // IMPORTANT: userData=null is ALSO a transient state on a fresh sign-in — the
      // new ID token can take a moment to propagate to Firestore, so auth-context's
      // profile lookup may not have populated userData yet. Signing out on that race
      // bounced legitimate users back to login (production-only latency race). So
      // before treating this as a true orphan, do an AUTHORITATIVE re-check: force a
      // token refresh and look the profile up directly. Only sign out if the profile
      // genuinely does not exist; otherwise keep showing "Loading..." and let
      // auth-context's listener catch up.
      if (!authLoading && user && !userData) {
        try {
          await user.getIdToken(true);
          const hasProfile = await userHasProfile(user.uid);
          if (hasProfile) {
            console.log('[Dashboard] Profile exists but userData not yet loaded - waiting for auth-context');
            return; // stay on "Loading..."; auth-context will populate userData
          }
        } catch (verifyError) {
          // Verification itself failed (e.g. still a token race). Do NOT sign out on
          // an inconclusive check — wait and let a later effect run resolve it.
          console.warn('[Dashboard] Orphan verification inconclusive - waiting:', verifyError);
          return;
        }

        console.log('[Dashboard] Authenticated user has no profile - signing out');
        await signOutUser();
        router.push('/login?error=no-account');
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
            // return='/signup?step=plan' so checkout Back shows the 4-package step to
            // re-pick (account exists → Continue updates tier + returns to checkout);
            // next='/dashboard?payment=success' (Welcome landing after payment).
            // Fallback to /dashboard/client (not /dashboard) to avoid a self-redirect loop.
            redirectToCheckoutForTier(router, userData.tier, '/signup?step=plan', '/dashboard/client', '/dashboard?payment=success');


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

    // Timeout fallback: if the webhook hasn't confirmed activation in time, we must
    // NOT assume success / fall through to the Welcome screen for an un-activated
    // account. Re-read the latest user doc; if STILL not activated, send them through
    // the activation guard (resume checkout). Only proceed to Welcome once the
    // payment is actually confirmed (accountActivated === true).
    const timeoutId = setTimeout(async () => {
      console.log('[Dashboard] Webhook timeout - verifying activation before proceeding');
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() || {};
        if (data.accountActivated === true) {
          // Confirmed after all — drop the waiting flag; auth-context's listener has
          // updated userData in place, so we render the Welcome screen.
          setWaitingForWebhook(false);
          return;
        }
        // Unconfirmed → do not grant access. Resume payment via the unified checkout,
        // keyed by their selected tier (same guard the page uses on initial load).
        console.log('[Dashboard] Still not activated after timeout - redirecting to checkout');
        redirectToCheckoutForTier(router, data.tier, '/signup?step=plan', '/dashboard/client', '/dashboard?payment=success');
      } catch (e) {
        console.error('[Dashboard] Timeout activation check failed:', e);
        // On error, fail safe: keep them OUT of the dashboard (back to checkout).
        redirectToCheckoutForTier(router, userData?.tier, '/signup?step=plan', '/dashboard/client', '/dashboard?payment=success');
      }
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

  // DEFENSE-IN-DEPTH: the Welcome screen is a post-payment, authenticated surface —
  // it must NEVER render for an un-activated account, even for a render frame. If we
  // somehow reach here un-activated (e.g. a timing window where the waiter cleared
  // before activation), don't show Welcome; the effect's guard is redirecting to
  // checkout, so render a neutral "Redirecting…" placeholder instead.
  if (!userData.accountActivated) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Redirecting...</div>
      </div>
    );
  }

  // Use the WelcomeScreen component (has coach intro and "don't show again" option)
  return <WelcomeScreen onContinue={handleContinueToDashboard} />;

}
