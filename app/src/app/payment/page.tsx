'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, addDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CreditCard, Shield, Check, ArrowLeft, AlertCircle } from 'lucide-react';
import { getProductDetails, formatCurrency, STRIPE_PRODUCT_IDS } from '@/lib/stripe';

interface UserData {
  name: string;
  email: string;
  tier: string;
  tierName: string;
  paymentStatus?: string;
  phone?: string;
}

interface PendingSignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  tier: string;
  tierName: string;
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
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
  const [priceInfo, setPriceInfo] = useState<PriceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadPaymentData = async () => {
      // Check if there's a pending signup (from signup page)
      const pendingData = sessionStorage.getItem('pendingSignup');
      
      if (pendingData) {
        // New signup - not yet created account
        console.log("Loading pending signup data");
        const signup = JSON.parse(pendingData) as PendingSignupData;
        setPendingSignup(signup);
        
        // Load price for the selected tier
        await loadPriceForTier(signup.tier);
        
      } else if (user) {
        // Existing user changing package
        console.log("Loading existing user data");
        await loadExistingUserData();
        
      } else {
        // No data - redirect to signup
        console.log("No data found, redirecting to signup");
        router.push('/signup');
        return;
      }
      
      setLoading(false);
    };

    loadPaymentData();
  }, [user, router]);

  const loadExistingUserData = async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        setError('User profile not found');
        return;
      }

      const data = userDoc.data() as UserData;
      
      // Check if already paid
      if (data.paymentStatus === 'active') {
        router.push('/dashboard');
        return;
      }

      setUserData(data);
      await loadPriceForTier(data.tier);
      
    } catch (err) {
      console.error('Error loading user data:', err);
      setError('Failed to load user information');
    }
  };

  const loadPriceForTier = async (tierId: string) => {
    try {
      const productId = STRIPE_PRODUCT_IDS[tierId as keyof typeof STRIPE_PRODUCT_IDS];
      
      if (!productId) {
        setError('Invalid product selected');
        return;
      }

      const productRef = doc(db, 'stripe_products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        setError('Product not found');
        return;
      }

      // Get prices
      const pricesCollection = collection(db, 'stripe_products', productId, 'prices');
      const pricesSnapshot = await getDocs(pricesCollection);
      
      if (pricesSnapshot.empty) {
        setError('No prices available');
        return;
      }

      // Determine price type
      const productDetails = getProductDetails(tierId);
      const expectedPriceType = productDetails.isSubscription ? 'recurring' : 'one_time';

      // Find the appropriate price
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
        setError(`Price not available for this package`);
        return;
      }

      setPriceInfo(selectedPrice);
      
    } catch (err) {
      console.error('Error loading price:', err);
      setError('Failed to load pricing information');
    }
  };

  const handlePayment = async () => {
    if (!priceInfo) return;

    setIsProcessing(true);
    setError('');

    try {
      let userId: string;
      let userEmail: string;
      let userName: string;
      let tierName: string;
      let tierId: string;

      // Step 1: Create account if this is a pending signup
      if (pendingSignup) {
        console.log("Creating new account before payment...");
        
        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(
          firebaseAuth,
          pendingSignup.email,
          pendingSignup.password
        );
        
        userId = userCredential.user.uid;
        userEmail = pendingSignup.email;
        userName = pendingSignup.name;
        tierName = pendingSignup.tierName;
        tierId = pendingSignup.tier;
        
        // Create Firestore user document
        await setDoc(doc(db, 'users', userId), {
          name: pendingSignup.name,
          email: pendingSignup.email,
          phone: pendingSignup.phone,
          tier: pendingSignup.tier,
          tierName: pendingSignup.tierName,
          paymentStatus: 'pending',
          role: 'client',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log("Account created successfully:", userId);
        
        // Clear pending signup data
        sessionStorage.removeItem('pendingSignup');
        
      } else if (user && userData) {
        // Existing user
        userId = user.uid;
        userEmail = userData.email;
        userName = userData.name;
        tierName = userData.tierName;
        tierId = userData.tier;
        
      } else {
        throw new Error('No user data available');
      }

      // Step 2: Create Stripe checkout session
      console.log("Creating Stripe checkout session...");
      
      const productDetails = getProductDetails(tierId);
      const checkoutMode = productDetails.isSubscription ? 'subscription' : 'payment';
      
      const checkoutSessionData: any = {
        price: priceInfo.id,
        success_url: `${window.location.origin}/dashboard?payment=success`,
        cancel_url: `${window.location.origin}/payment`,
        mode: checkoutMode,
        allow_promotion_codes: true,
        metadata: {
          userId,
          userName,
          userEmail,
          tierName,
          tierId
        }
      };

      // Write to Extension's checkout_sessions collection
      const checkoutSessionRef = await addDoc(
        collection(db, 'stripe_customers', userId, 'checkout_sessions'),
        checkoutSessionData
      );

      console.log('Checkout session document created:', checkoutSessionRef.id);

      // Step 3: Listen for checkout URL from Extension
      const unsubscribe = onSnapshot(checkoutSessionRef, (snap) => {
        const data = snap.data();
        
        if (data?.error) {
          console.error('Checkout session error:', data.error);
          setError(data.error.message || 'Failed to create checkout session');
          setIsProcessing(false);
          unsubscribe();
        } else if (data?.url) {
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
                onClick={() => router.push('/signup')}
                className="bg-gradient-to-r from-emerald-600 to-teal-600"
              >
                Back to Signup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!priceInfo || (!userData && !pendingSignup)) return null;

  const displayData = userData || pendingSignup!;
  const productDetails = getProductDetails(displayData.tier);

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
                <div className="flex gap-2">
                  {userData && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push('/signup?step=2')}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      Change Package
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/signup?step=2')}
                    className="text-gray-600"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                </div>
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
                    <p className="font-semibold text-gray-900 text-lg">{displayData.tierName}</p>
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
                  <p><span className="font-medium text-gray-700">Name:</span> {displayData.name}</p>
                  <p><span className="font-medium text-gray-700">Email:</span> {displayData.email}</p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="flex items-start space-x-3 bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Secure Payment</h4>
                  <p className="text-sm text-blue-700">
                    {pendingSignup 
                      ? "Your account will be created and you'll be redirected to Stripe Checkout to complete your payment securely."
                      : "You'll be redirected to Stripe Checkout to complete your payment securely."
                    } Your payment information is encrypted and never stored on our servers.
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
                    {pendingSignup ? 'Creating Account...' : 'Processing...'}
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
