'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, functions } from '@/lib/firebase';
import { getSessionPricing, calculateSessionSavings, createStripeCheckoutSession } from '@/lib/stripe';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import SessionBalanceCard from '@/components/sessions/SessionBalanceCard';
import PricingCard from '@/components/sessions/PricingCard';
import PurchaseHistory from '@/components/sessions/PurchaseHistory';
import { SessionBalance, SessionPackage } from '@/types/session';

export default function BuySessionsPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessionOptions, setSessionOptions] = useState<any[]>([]);
  const [balance, setBalance] = useState<any>(null);
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  
  // Load session data on mount
  useEffect(() => {
    if (user) {
      loadSessionData();
    }
  }, [user]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      
      // Load session pricing from Stripe
      const pricing = await getSessionPricing();
      const pricingWithSavings = calculateSessionSavings(pricing);
      setSessionOptions(pricingWithSavings);
      
      // Load balance and packages from Cloud Function
      const getSessionBalance = httpsCallable(functions, 'getSessionBalance');
      const result = await getSessionBalance();
      const data = result.data as any;
      
      setBalance({
        available: data.available || 0,
        purchased: data.packages?.reduce((sum: number, pkg: any) => sum + pkg.quantity, 0) || 0,
        used: data.packages?.reduce((sum: number, pkg: any) => sum + (pkg.quantity - pkg.remaining), 0) || 0,
        expired: data.packages?.filter((pkg: any) => pkg.expired).reduce((sum: number, pkg: any) => sum + pkg.remaining, 0) || 0,
        lastUpdated: Timestamp.now(),
      });
      
      setPackages(data.packages || []);
    } catch (error) {
      console.error('Error loading session data:', error);
      // Set empty state on error
      setSessionOptions([]);
      setBalance({ available: 0, purchased: 0, used: 0, expired: 0, lastUpdated: Timestamp.now() });
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePurchase = async (priceId: string) => {
    try {
      setLoading(true);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const baseUrl = window.location.origin;
      
      // Use reusable helper function
      const checkoutUrl = await createStripeCheckoutSession({
        userId: user.uid,
        priceId,
        mode: 'payment',
        successUrl: `${baseUrl}/dashboard/client/sessions/buy?success=true`,
        cancelUrl: `${baseUrl}/dashboard/client/sessions/buy?canceled=true`,
        metadata: {
          type: 'session_package',
          userId: user.uid,
        },
      });

      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert(`Failed to create checkout session: ${(error as Error).message}`);
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
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
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Buy Training Sessions</h1>
              <p className="text-muted-foreground">
                Purchase session packages to train with your coach. Sessions expire 60 days after purchase.
              </p>
            </div>

            {/* Session Balance Card */}
            <div className="mb-8">
              <SessionBalanceCard 
                balance={balance} 
                packages={packages}
                loading={loading}
              />
            </div>

            {/* Pricing Cards */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">Choose Your Package</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {sessionOptions.map((option, index) => (
                  <PricingCard
                    key={option.priceId}
                    type={option.type}
                    price={option.amount}
                    sessionsIncluded={option.quantity}
                    pricePerSession={option.pricePerSession}
                    savings={option.savings}
                    stripePriceId={option.priceId}
                    onPurchase={handlePurchase}
                    loading={loading}
                    featured={option.quantity > 1}
                  />
                ))}
              </div>
            </div>

            {/* Purchase History */}
            <div className="mb-8">
              <PurchaseHistory 
                packages={packages}
                loading={loading}
              />
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Important Information</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All sessions expire <strong>60 days</strong> after purchase</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Sessions are deducted when you book an appointment</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Cancel <strong>24+ hours</strong> before your appointment for a credit refund</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Late cancellations (&lt;24 hours) will not be refunded</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Subscription members receive the same 4-pack discount pricing</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
