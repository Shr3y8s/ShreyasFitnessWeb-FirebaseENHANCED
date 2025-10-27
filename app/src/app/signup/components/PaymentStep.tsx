'use client';

import { useState, useEffect } from 'react';
import { PaymentElement, Elements, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { AlertCircle, CreditCard, Shield } from 'lucide-react';
import { FormData } from '../page';
import { User } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { stripePromise, appearance, getProductDetails, formatCurrency, STRIPE_PRODUCT_IDS } from '@/lib/stripe';
import { Stripe } from '@stripe/stripe-js';

// Types for Firebase Functions responses
interface PaymentIntentResponse {
  clientSecret: string;
}

interface CheckoutSessionResponse {
  url: string;
}

interface PriceInfo {
  fullPrice: string;
}

interface PaymentStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  error: string;
  currentUser?: User | null;
}

// Extended Stripe type with redirectToCheckout method
interface StripeWithCheckout extends Stripe {
  redirectToCheckout(options: { sessionId: string }): Promise<{ error?: { message: string } }>;
}

// Subscription payment form (no Stripe hooks needed)
function SubscriptionPaymentForm({ 
  formData, 
  updateFormData, 
  nextStep, 
  prevStep, 
  error, 
  currentUser,
  priceInfo,
  productDetails
}: PaymentStepProps & { 
  priceInfo: PriceInfo; 
  productDetails: ReturnType<typeof getProductDetails>;
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const functions = getFunctions(undefined, 'us-west1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentError('');

    try {
      // Subscription flow: Create Stripe Checkout session via HTTP endpoint
      const response = await fetch('https://us-west1-shreyfitweb.cloudfunctions.net/createCheckoutSession', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_items: [{ price: priceInfo.fullPrice, quantity: 1 }],
          success_url: `${window.location.origin}/account-setup?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/signup`,
          billing_address_collection: 'required',
          customer_email: formData.email,
          allow_promotion_codes: true,
          metadata: {
            userName: formData.name,
            userEmail: formData.email,
            tierName: formData.tier?.name || 'Unknown',
            tierId: formData.tier?.id || 'unknown',
            createAccount: 'true'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();
      const { url } = data;
      
      // Redirect to Stripe Checkout using the URL from the session
      window.location.href = url;
      
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
      
      {/* Error Display */}
      {(error || paymentError) && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Payment Error</span>
          </div>
          <p>{error || paymentError}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Order Summary</h4>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(productDetails.amount)}
            <span className="text-base text-gray-600">/month</span>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{productDetails.name}</p>
            <p className="text-sm text-gray-600">Monthly subscription • Cancel anytime</p>
          </div>
        </div>
      </div>

      {/* Subscription notice */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">Subscription Payment</h4>
            <p className="text-sm text-blue-700 mt-1">
              You&apos;ll be redirected to Stripe Checkout to set up your subscription. 
              Multiple payment options including Buy Now, Pay Later services may be available.
            </p>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <Shield className="h-4 w-4 text-gray-500" />
        <span>Secure payment processing powered by Stripe. Your payment information is encrypted and secure.</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={prevStep}
          disabled={isProcessing}
          className="px-6"
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={isProcessing}
          className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            'Subscribe Now'
          )}
        </Button>
      </div>
    </form>
  );
}

// One-time payment form (uses Stripe hooks)
function OneTimePaymentForm({ 
  formData, 
  updateFormData, 
  nextStep, 
  prevStep, 
  error, 
  currentUser,
  priceInfo,
  productDetails,
  clientSecret 
}: PaymentStepProps & { 
  priceInfo: PriceInfo; 
  productDetails: ReturnType<typeof getProductDetails>;
  clientSecret?: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  const functions = getFunctions(undefined, 'us-west1');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setPaymentError('');

    // One-time payment flow: Use Payment Element with Stripe instance
    if (!stripe || !elements || !clientSecret || !currentUser) {
      setPaymentError('Payment system not ready. Please try again.');
      setIsProcessing(false);
      return;
    }

    try {
      const paymentResult = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              name: formData.name,
              email: formData.email
            }
          }
        },
        redirect: 'if_required'
      });

      if (paymentResult?.error) {
        setPaymentError(paymentResult.error.message || 'Payment failed');
        setIsProcessing(false);
        return;
      }

      const { paymentIntent } = paymentResult;
      
      // Update form data and continue to next step
      updateFormData({
        paymentInfo: {
          paymentMethodId: paymentIntent.payment_method,
          lastFour: "****", // Will be updated from Stripe response
          cardType: "card",
          completed: true
        }
      });

      nextStep();
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentError((err as Error).message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
      
      {/* Error Display */}
      {(error || paymentError) && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Payment Error</span>
          </div>
          <p>{error || paymentError}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900">Order Summary</h4>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(productDetails.amount)}
            {productDetails.isSubscription && <span className="text-base text-gray-600">/month</span>}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{productDetails.name}</p>
            <p className="text-sm text-gray-600">
              {productDetails.isSubscription ? 'Monthly subscription • Cancel anytime' : 'One-time payment'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Element */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Payment Details
        </label>
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <PaymentElement 
            options={{
              layout: 'accordion',
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
              defaultValues: {
                billingDetails: {
                  name: formData.name || '',
                  email: formData.email || ''
                }
              },
              wallets: {
                applePay: 'auto',
                googlePay: 'auto'
              }
            }}
            onReady={() => setIsPaymentElementReady(true)}
          />
        </div>
      </div>

      {/* Security Notice */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
        <Shield className="h-4 w-4 text-gray-500" />
        <span>Secure payment processing powered by Stripe. Your payment information is encrypted and secure.</span>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={prevStep}
          disabled={isProcessing}
          className="px-6"
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={isProcessing || !isPaymentElementReady}
          className="px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {isProcessing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </div>
          ) : (
            `Pay ${formatCurrency(productDetails.amount)}`
          )}
        </Button>
      </div>
    </form>
  );
}

// Main PaymentStep component with Elements provider
export default function PaymentStep(props: PaymentStepProps) {
  const [priceInfo, setPriceInfo] = useState<PriceInfo>({ fullPrice: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentSetupLoading, setPaymentSetupLoading] = useState(false);
  
  const db = getFirestore();
  const functions = getFunctions(undefined, 'us-west1');
  const productDetails = getProductDetails(props.formData.tier?.id || '');

  // Fetch product prices from Firestore (synced by Invertase extension)
  useEffect(() => {
    const fetchPrices = async () => {
      if (!props.formData.tier?.id) return;
      
      try {
        setLoading(true);
        const productId = STRIPE_PRODUCT_IDS[props.formData.tier.id as keyof typeof STRIPE_PRODUCT_IDS];
        
        if (!productId) {
          setError('Invalid product selected');
          return;
        }

        // Get product from Firestore
        const productRef = doc(db, 'stripe_products', productId);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
          setError('Product not found');
          return;
        }

        // Get prices from subcollection
        const pricesCollection = collection(db, 'stripe_products', productId, 'prices');
        const pricesSnapshot = await getDocs(pricesCollection);
        
        if (pricesSnapshot.empty) {
          setError('No prices available');
          return;
        }

        const prices: Array<{ id: string; type: string; [key: string]: unknown }> = [];
        pricesSnapshot.forEach(doc => {
          const data = doc.data();
          prices.push({ id: doc.id, type: data.type || '', ...data });
        });

        // Find the appropriate price based on subscription type
        const fullPrice = prices.find(p => 
          productDetails.isSubscription ? p.type === 'recurring' : p.type === 'one_time'
        )?.id;

        setPriceInfo({ fullPrice: fullPrice || '' });
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError('Could not load pricing information');
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [props.formData.tier, db, productDetails.isSubscription]);

  // Initialize PaymentIntent for one-time payments
  useEffect(() => {
    if (!priceInfo.fullPrice || !props.currentUser || productDetails.isSubscription || loading) return;

    const initializePaymentIntent = async () => {
      try {
        setPaymentSetupLoading(true);
        const createPaymentFn = httpsCallable(functions, 'createPaymentIntent');
        const result = await createPaymentFn({
          price: priceInfo.fullPrice,
          automatic_payment_methods: { enabled: true },
          currency: 'usd'
        });

        const data = result.data as PaymentIntentResponse;
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Failed to create payment intent:', err);
        setError('Could not initialize payment. Please try again.');
      } finally {
        setPaymentSetupLoading(false);
      }
    };

    initializePaymentIntent();
  }, [priceInfo.fullPrice, props.currentUser, productDetails.isSubscription, loading, functions]);

  // Loading state
  if (loading || (paymentSetupLoading && !productDetails.isSubscription)) {
    return (
      <div className="space-y-6 py-4">
        <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">
              {loading ? 'Loading payment options...' : 'Setting up secure payment...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 py-4">
        <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Payment Setup Error</span>
          </div>
          <p>{error}</p>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={props.prevStep}>Back</Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // For one-time payments, wrap with Elements that has client secret
  if (!productDetails.isSubscription) {
    // Only render Elements when we have the client secret
    if (!clientSecret) {
      return (
        <div className="space-y-6 py-4">
          <h3 className="text-xl font-semibold text-gray-900">Payment Information</h3>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Setting up secure payment...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Elements 
        stripe={stripePromise} 
        options={{ 
          clientSecret, 
          appearance,
          loader: 'auto' as const 
        }}
      >
        <OneTimePaymentForm 
          {...props}
          priceInfo={priceInfo}
          productDetails={productDetails}
          clientSecret={clientSecret}
        />
      </Elements>
    );
  }

  // For subscriptions, render directly (no Elements wrapper needed)
  return (
    <SubscriptionPaymentForm 
      {...props}
      priceInfo={priceInfo}
      productDetails={productDetails}
    />
  );
}
