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
import { selectSignupPrice } from '@/lib/stripe';
import { formatCurrency } from '@/lib/payments';
import { trackEvent } from '@/lib/firebase';
import { StripeProduct, StripePrice } from '@/types/stripe';
import { loadRecaptcha, executeRecaptcha } from '@/lib/recaptcha';
import { getCheckoutKeyForProduct } from '@/lib/constants';
import { Footer } from '@/components/Footer';



interface UserData {
  name: string;
  email: string;
  tier: string;
  tierName: string;
  accountActivated?: boolean;
  phone?: string;
}

interface PendingSignupData {
  name: string;
  email: string;
  phone: string;
  password: string;
  tier: string;
  tierName: string;
  emailVerified?: boolean;
}

export default function PaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [pendingSignup, setPendingSignup] = useState<PendingSignupData | null>(null);
  const [productData, setProductData] = useState<StripeProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');



  useEffect(() => {
    const loadPaymentData = async () => {
      // Check if there's a pending signup (from signup page)
      const pendingData = sessionStorage.getItem('pendingSignup');
      
      if (pendingData) {
        // New signup - not yet created account
        console.log("Loading pending signup data");
        const signup = JSON.parse(pendingData) as PendingSignupData;
        
        // Check if email was verified
        if (!signup.emailVerified) {
          console.log("Email not verified, redirecting to signup");
          setError('Please complete email verification first');
          setTimeout(() => router.push('/signup'), 2000);
          return;
        }
        
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
      
      // Load reCAPTCHA script
      try {
        await loadRecaptcha();
        console.log("reCAPTCHA loaded successfully");
      } catch (err) {
        console.error("Failed to load reCAPTCHA:", err);
        // Continue without reCAPTCHA - it's not critical for existing users
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
      
      // Check if account is already activated (already completed payment)
      if (data.accountActivated) {
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

  const loadPriceForTier = async (productId: string) => {
    try {
      // productId should be the actual Stripe product ID (e.g., "prod_SwuHPYlY94VZyY")
      if (!productId || !productId.startsWith('prod_')) {
        setError('Invalid product ID format');
        return;
      }

      const productRef = doc(db, 'stripe_products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        setError('Product not found');
        return;
      }

      const productInfo = productSnap.data();

      // Fetch ALL prices for this product from Firestore
      const pricesCollection = collection(db, 'stripe_products', productId, 'prices');
      const pricesSnapshot = await getDocs(pricesCollection);
      
      if (pricesSnapshot.empty) {
        setError('No prices available');
        return;
      }

      // Collect ALL price documents - maintaining full product structure
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


      // Store complete product data with ALL prices
      const product: StripeProduct = {
        id: productId,
        name: productInfo.name || '',
        description: productInfo.description,
        active: productInfo.active || false,
        prices: prices
      };

      setProductData(product);

    } catch (err) {
      console.error('Error loading price:', err);
      setError('Failed to load pricing information');
    }
  };


  /**
   * Signup-specific step: create the Firebase account (reCAPTCHA + auth + users doc)
   * BEFORE handing off to the GENERIC, reusable /checkout page. Per the owner's
   * reusability rule, /checkout assumes an authenticated user and contains NO
   * account-creation logic — that scenario-specific work lives here. On success we
   * route to /checkout?item=<tier key>&return=/dashboard.
   */
  const handleContinueToCheckout = async () => {
    if (!productData) {
      setError('No product loaded');
      return;
    }
    const selectedPrice = selectSignupPrice(productData);
    if (!selectedPrice) {
      setError('No valid price available for this product');
      return;
    }

    setSubmitting(true);
    try {
      // GA4 begin_checkout
      trackEvent('begin_checkout', {
        currency: (selectedPrice.currency || 'usd').toUpperCase(),
        value: selectedPrice.amount / 100,
        tier: (userData || pendingSignup)?.tierName,
        price_type: selectedPrice.type,
      });

      let tierId: string;

      // Create account if this is a pending signup (before the generic checkout).
      if (pendingSignup) {
        const recaptchaToken = await executeRecaptcha('create_account');

        let userCredential;
        try {
          userCredential = await createUserWithEmailAndPassword(
            firebaseAuth,
            pendingSignup.email,
            pendingSignup.password
          );
        } catch (authError: any) {
          console.error('Firebase Auth error:', authError);
          if (authError.code === 'auth/email-already-in-use') {
            setError('This email is already registered. Redirecting to login page...');
            setTimeout(() => router.push('/login'), 3000);
          } else {
            setError(authError?.message || 'Failed to create your account.');
          }
          setSubmitting(false);
          return;
        }

        const newUserId = userCredential.user.uid;
        tierId = pendingSignup.tier;

        await setDoc(doc(db, 'users', newUserId), {
          name: pendingSignup.name,
          email: pendingSignup.email,
          phone: pendingSignup.phone,
          tier: pendingSignup.tier,
          tierName: pendingSignup.tierName,
          emailVerified: pendingSignup.emailVerified || false,
          accountActivated: false,
          gdprDeleted: false,
          role: 'client',
          recaptchaToken: recaptchaToken || null,
          recaptchaVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        sessionStorage.removeItem('pendingSignup');
      } else if (user && userData) {
        tierId = userData.tier;
      } else {
        setError('No user data available');
        setSubmitting(false);
        return;
      }

      // Hand off to the generic checkout (auth now guaranteed).
      const itemKey = getCheckoutKeyForProduct(tierId);
      if (!itemKey) {
        setError('This plan is not available for checkout.');
        setSubmitting(false);
        return;
      }
      router.push(`/checkout?item=${itemKey}&return=${encodeURIComponent('/dashboard')}`);
    } catch (e) {
      setError((e as Error)?.message || 'An unexpected error occurred');
      setSubmitting(false);
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

  if (!productData || (!userData && !pendingSignup)) return null;

  const displayData = userData || pendingSignup!;
  
  // Select the appropriate price for display (signup flow uses recurring if available)
  const displayPrice = selectSignupPrice(productData);
  if (!displayPrice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardContent className="p-12">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">No valid price found for this product</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                      {formatCurrency(displayPrice.amount)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {displayPrice.type === 'recurring' ? 'per month' : 'one-time'}
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
                      {displayPrice.type === 'recurring'
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

              {/* Continue button — creates the account (signup-specific work), then
                  hands off to the GENERIC /checkout page (design §2.7). Account
                  creation happens here, NOT inside /checkout. */}
              <Button
                disabled={submitting}
                onClick={handleContinueToCheckout}
                className="w-full py-6 text-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              >
                {submitting
                  ? 'Setting up your account…'
                  : displayPrice.type === 'recurring'
                    ? `Continue to Payment • ${formatCurrency(displayPrice.amount)}/month`
                    : `Continue to Payment • ${formatCurrency(displayPrice.amount)}`}
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
      <Footer />
    </div>
  );
}
