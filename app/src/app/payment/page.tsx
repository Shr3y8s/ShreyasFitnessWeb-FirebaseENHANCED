'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs, addDoc, onSnapshot } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CreditCard, Shield, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import { getProductDetails, formatCurrency, STRIPE_PRODUCT_IDS } from '@/lib/stripe';

interface UserData {
  name: string;
  email: string;
  tier: string;
  tierName: string;
  paymentStatus: string;
}

interface StripeCustomerData {
  stripeId?: string;
  email?: string;
}

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadUserAndPrice = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Load user document
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          setError('User profile not found. Please contact support.');
          setLoading(false);
          return;
        }

        const data = userDoc.data() as UserData;
        setUserData(data);

        // Check if already paid
        if (data.paymentStatus === 'active') {
          router.push('/dashboard');
          return;
        }

        // CRITICAL FIX: Load existing Stripe customer ID from stripe_customers collection
        const stripeCustomerDoc = await getDoc(doc(db, 'stripe_customers', user.uid));
        if (stripeCustomerDoc.exists()) {
          const customerData = stripeCustomerDoc.data() as StripeCustomerData;
          if (customerData.stripeId) {
            setStripeCustomerId(customerData.stripeId);
            console.log('Found existing Stripe customer:', customerData.stripeId);
          }
        }

        // Load price from Stripe products in Firestore
        const productId = STRIPE_PRODUCT_IDS[data.tier as keyof typeof STRIPE_PRODUCT_IDS];
        
        if (!productId) {
          setError('Invalid product selected');
          setLoading(false);
          return;
        }

        const productRef = doc(db, 'stripe_products', productId);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          setError('Product not found');
          setLoading(false);
          return;
        }

        // Get prices
        const pricesCollection = collection(db, 'stripe_products', productId, 'prices');
        const pricesSnapshot = await getDocs(pricesCollection);
        
        if (pricesSnapshot.empty) {
          setError('No prices available');
          setLoading(false);
          return;
        }

        // Determine if this tier is a subscription or one-time payment
        const productDetails = getProductDetails(data.tier);
        const isSubscription = productDetails.isSubscription;
        const expectedPriceType = isSubscription ? 'recurring' : 'one_time';

        // Find the appropriate price based on payment type
        let selectedPrice: PriceInfo | null = null;
        pricesSnapshot.forEach(doc => {
          const priceData = doc.data();
          if (priceData.type === expectedPriceType) {
            selectedPrice = {
              id: doc.id,
              amount: priceData.unit_amount || 0,
              currency: priceData.currency || 'usd'
            };
          }
        });

        if (!selectedPrice) {
          setError(`Price information not available for ${isSubscription ? 'subscription' : 'one-time payment'}`);
          setLoading(false);
          return;
        }

        setPriceInfo(selectedPrice);
        setLoading(false);

      } catch (err) {
        console.error('Error loading payment info:', err);
        setError('Failed to load payment information');
        setLoading(false);
      }
    };

    loadUserAndPrice();
  }, [user, router]);

  const handlePayment = async () => {
    if (!priceInfo || !userData || !user) return;

    setIsProcessing(true);
    setError('');

    try {
      console.log('Creating checkout session via Extension...');
      
      // Determine checkout mode based on product type
      const productDetails = getProductDetails(userData.tier);
      const checkoutMode = productDetails.isSubscription ? 'subscription' : 'payment';
      
      console.log(`Creating ${checkoutMode} checkout for ${userData.tierName}`);
      
      // PROPER APPROACH: Use Extension's checkout_sessions collection
      // The Extension watches this collection and creates the Stripe session
      const checkoutSessionData: any = {
        price: priceInfo.id,
        success_url: `${window.location.origin}/dashboard?payment=success`,
        cancel_url: `${window.location.origin}/payment`,
        mode: checkoutMode,
        allow_promotion_codes: true,
        metadata: {
          userId: user.uid,
          userName: userData.name,
          userEmail: userData.email,
          tierName: userData.tierName,
          tierId: userData.tier
        }
      };

      // CRITICAL: If customer exists, pass customer ID to use existing customer
      if (stripeCustomerId) {
        checkoutSessionData.customer = stripeCustomerId;
        console.log('Using existing Stripe customer:', stripeCustomerId);
      }

      // Write to Extension's checkout_sessions collection
      const checkoutSessionRef = await addDoc(
        collection(db, 'stripe_customers', user.uid, 'checkout_sessions'),
        checkoutSessionData
      );

      console.log('Checkout session document created:', checkoutSessionRef.id);

      // Listen for the Extension to add the checkout URL
      const unsubscribe = onSnapshot(checkoutSessionRef, (snap) => {
        const data = snap.data();
        
        if (data?.error) {
          // Extension encountered an error
          console.error('Checkout session error:', data.error);
          setError(data.error.message || 'Failed to create checkout session');
          setIsProcessing(false);
          unsubscribe();
        } else if (data?.url) {
          // Extension created the session and added the URL
          console.log('Checkout URL received, redirecting...');
          unsubscribe();
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        }
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (isProcessing) {
          unsubscribe();
          setError('Checkout session creation timed out. Please try again.');
          setIsProcessing(false);
        }
      }, 10000);
      
    } catch (err) {
      console.error('Payment error:', err);
      setError((err as Error).message || 'An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment information...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userData || !priceInfo) return null;

  const productDetails = getProductDetails(userData.tier);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Payment</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            You're one step away from starting your transformation journey
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Order Summary</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="text-gray-600"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              
              {/* Selected Plan */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Plan</h3>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(priceInfo.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {productDetails.isSubscription ? 'per month' : 'one-time'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">{userData.tierName}</p>
                    <p className="text-sm text-gray-600">
                      {productDetails.isSubscription 
                        ? 'Monthly subscription • Cancel anytime'
                        : 'One-time payment • No recurring charges'
                      }
                    </p>
                  </div>
                </div>

              </div>

              {/* Account Info */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium text-gray-700">Name:</span> {userData.name}</p>
                  <p><span className="font-medium text-gray-700">Email:</span> {userData.email}</p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start space-x-3 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Secure Payment</h4>
                  <p className="text-sm text-blue-700">
                    You'll be redirected to Stripe Checkout to complete your payment securely. 
                    Your payment information is encrypted and never stored on our servers.
                  </p>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full py-6 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  productDetails.isSubscription
                    ? `Complete Payment • ${formatCurrency(priceInfo.amount)}/month`
                    : `Complete Payment • ${formatCurrency(priceInfo.amount)}`
                )}
              </Button>

              {/* Money Back Guarantee */}
              <div className="text-center pt-4">
                <p className="text-sm text-gray-600">
                  🔒 30-Day Money-Back Guarantee
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
