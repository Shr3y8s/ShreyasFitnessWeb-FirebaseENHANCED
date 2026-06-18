'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Check, Loader2, CreditCard, Star, ArrowRight } from 'lucide-react';
import { createStripeCheckoutSession, formatCurrency, selectSignupPrice } from '@/lib/stripe';
import { StripeProduct, StripePrice } from '@/types/stripe';
import { useToast } from '@/hooks/use-toast';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';

interface SubscriptionOption {
  product: StripeProduct;
  price: StripePrice;
}

export default function UpgradePage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [subscriptionOptions, setSubscriptionOptions] = useState<SubscriptionOption[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

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

    // If already has an active subscription, redirect to membership
    // Allow canceled subscribers to access this page to re-subscribe
    if (userData.subscriptionId && userData.subscriptionStatus !== 'canceled') {
      router.push('/dashboard/client/membership');
      return;
    }

    loadSubscriptionOptions();
  }, [userData, authLoading, router]);

  const loadSubscriptionOptions = async () => {
    try {
      const productIds = [
        SUBSCRIPTION_TIERS.ONLINE_COACHING,
        SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION
      ];

      const options: SubscriptionOption[] = [];

      for (const productId of productIds) {
        const productRef = doc(db, 'stripe_products', productId);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists() || !productSnap.data().active) continue;

        const productInfo = productSnap.data();
        const pricesSnapshot = await getDocs(collection(db, 'stripe_products', productId, 'prices'));

        if (pricesSnapshot.empty) continue;

        const prices: StripePrice[] = [];
        pricesSnapshot.forEach(doc => {
          const priceData = doc.data();
          prices.push({
            id: doc.id,
            amount: priceData.unit_amount || 0,
            currency: priceData.currency || 'usd',
            type: priceData.type || 'one_time',
            active: priceData.active !== false,
            lookup_key: priceData.lookup_key ?? undefined
          });
        });


        const product: StripeProduct = {
          id: productId,
          name: productInfo.name || '',
          description: productInfo.description,
          active: productInfo.active || false,
          prices: prices
        };

        const price = selectSignupPrice(product);
        if (price) {
          options.push({ product, price });
        }
      }

      setSubscriptionOptions(options);
    } catch (error) {
      console.error('Error loading subscription options:', error);
      toast({
        title: "Error Loading Plans",
        description: "Failed to load subscription plans. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (option: SubscriptionOption) => {
    if (!user || !userData) return;

    setProcessingId(option.product.id);

    try {
      const checkoutUrl = await createStripeCheckoutSession({
        userId: user.uid,
        priceId: option.price.id,
        mode: 'subscription',
        successUrl: `${window.location.origin}/dashboard/client/membership?upgrade=success`,
        cancelUrl: `${window.location.origin}/dashboard/client/upgrade`,
        metadata: {
          userId: user.uid,
          userName: userData.name,
          userEmail: userData.email,
          tierName: option.product.name,
          tierId: option.product.id,
          type: 'subscription'
        }
      });

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Checkout Failed",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
      setProcessingId(null);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            <Breadcrumb items={[
              { label: 'Dashboard', href: '/dashboard/client' },
              { label: 'Membership', href: '/dashboard/client/membership' },
              { label: 'Upgrade' }
            ]} />

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Upgrade Your Membership</h1>
              <p className="text-muted-foreground">
                Add unlimited workouts, custom nutrition plans, and weekly check-ins
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {subscriptionOptions.map((option) => {
                const isProcessing = processingId === option.product.id;
                
                return (
                  <Card key={option.product.id} className="relative overflow-hidden transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                    {option.product.id === SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION && (
                      <div className="absolute top-4 right-4">
                        <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="h-5 w-5 text-primary" />
                        <CardTitle>{option.product.name}</CardTitle>
                      </div>
                      <CardDescription className="min-h-[3rem]">
                        {option.product.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div className="mb-6">
                        <div className="text-4xl font-bold text-primary">
                          {formatCurrency(option.price.amount)}
                        </div>
                        <div className="text-sm text-muted-foreground">per month</div>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Unlimited workout programs</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Custom nutrition plans</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Weekly coach check-ins</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span>Priority support</span>
                        </div>
                        {option.product.id === SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION && (
                          <div className="flex items-center gap-2 text-sm font-medium text-primary">
                            <Check className="h-4 w-4 text-primary" />
                            <span>Everything you need for transformation</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleSelectPlan(option)}
                        disabled={isProcessing}
                        className="w-full"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Select Plan
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground mb-4">
                🔒 Secure checkout powered by Stripe • Cancel anytime
              </p>
              <Button variant="ghost" onClick={() => router.push('/dashboard/client/membership')}>
                ← Back to Membership
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
