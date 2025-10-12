// src/react/signup/components/PaymentStep.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { PaymentElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { stripePromise, appearance } from '../index';

function PaymentStep({ formData, updateFormData, nextStep, prevStep, error, currentUser }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  // Create functions instance once with correct region
  const functions = getFunctions(undefined, 'us-west1');
  
  // Add debug logs to track component state
  console.log("PaymentStep component state:", {
    stripeLoaded: !!stripe,
    elementsLoaded: !!elements,
    userAuthenticated: !!currentUser,
    priceInfoLoaded: !!priceInfo,
    hasClientSecret: !!clientSecret,
    isPaymentElementReady
  });
  
  // Fetch product prices from Firestore (synced by Firebase extension)
  useEffect(() => {
    console.log("Starting price fetch for tier:", formData.tier);
    if (!formData.tier) return;
    let productId;
    switch (formData.tier) {
      case 'in-person-training':
        productId = 'prod_SwuHPYlY94VZyY';
        break;
      case 'online-coaching':
        productId = 'prod_SwvHrfi1C4k4pS';
        break;
      case 'complete-transformation':
        productId = 'prod_SwvI0SWs0J3DMQ';
        break;
      case '4-pack-training':
        productId = 'prod_SwvMUVeTqAnveu';
        break;
      default:
        return;
    }

    const fetchPrices = async () => {
      try {
        console.log("Fetching price data for product ID:", productId);
        // First get the product document
        const productRef = doc(db, 'stripe_products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) {
          console.warn("No product data found in Firestore for ID:", productId);
          return;
        }
        const productData = productSnap.data();
        console.log("Product data retrieved:", productData);
        
        // Query the prices subcollection instead of looking for a prices field
        const pricesCollection = collection(db, 'stripe_products', productId, 'prices');
        const pricesSnapshot = await getDocs(pricesCollection);
        
        if (pricesSnapshot.empty) {
          console.warn("No prices found in subcollection for product:", productId);
          return;
        }
        
        // Convert to array of price data
        const pricesArray = [];
        pricesSnapshot.forEach(doc => {
          pricesArray.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        console.log("Available prices from subcollection:", pricesArray);
        
        // Get product requirements to find the right price
        const productDetails = getProductDetails();
        const isSubscription = productDetails.isSubscription;
        
        setPriceInfo({
          fullPrice: pricesArray.find(
            p => (isSubscription ? p.type === 'recurring' : p.type === 'one_time')
          )?.id,
          sessionPrice: pricesArray.find(
            p => p.type === 'one_time' && p.unit_amount === 6000
          )?.id,
        });
      } catch (err) {
        console.error("Error fetching price info:", err);
        setPaymentError('Could not fetch price info: ' + err.message);
      }
    };
    fetchPrices();
  }, [formData.tier, db]);
  
  // Initialize PaymentIntent ONLY for one-time payments
  useEffect(() => {
    console.log("Payment intent initialization - conditions:", {
      stripeLoaded: !!stripe,
      priceInfoLoaded: !!priceInfo,
      userAuthenticated: !!currentUser
    });
    
    if (!stripe || !priceInfo || !currentUser) {
      console.warn("Cannot create payment intent, missing required data");
      return;
    }
    
    const productDetails = getProductDetails();
    
    // Only create PaymentIntent for one-time payments
    if (!productDetails.isSubscription) {
      console.log("Creating payment intent for one-time payment product:", productDetails.name);
      (async () => {
        try {
      // Initialize payment intent creation function
      const createPaymentFn = httpsCallable(
        functions,
        'createPaymentIntent'
      );
            
          const result = await createPaymentFn({
            price: priceInfo.fullPrice,
            automatic_payment_methods: { enabled: true },
            currency: 'usd'
          });
          
          console.log("Payment intent created successfully");
          setClientSecret(result.data.clientSecret);
        } catch (err) {
          console.error("Failed to create payment intent:", err);
          setPaymentError('Could not create payment intent: ' + err.message);
        }
      })();
    }
  }, [stripe, priceInfo, currentUser]);
  
  // Get product details based on selected tier
  const getProductDetails = useCallback(() => {
    switch(formData.tier) {
      case 'in-person-training':
        return {
          name: 'In-Person Training',
          amount: 7000, // $70.00 in cents
          isSubscription: false
        };
      case 'online-coaching':
        return {
          name: 'Online Coaching',
          amount: 19900, // $199.00 in cents
          isSubscription: true
        };
      case 'complete-transformation':
        return {
          name: 'Complete Transformation',
          amount: 19900, // $199.00 in cents
          sessionAmount: 6000, // $60.00 in cents
          isSubscription: true,
          hasAdditionalCharge: true
        };
      case '4-pack-training':
        return {
          name: '4-Pack Training Sessions',
          amount: 24000, // $240.00 in cents
          isSubscription: false
        };
      default:
        return { name: '', amount: 0, isSubscription: false };
    }
  }, [formData.tier]);
  
  const formatCurrency = (amount) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };
  
  
  // Submit handler with clean separation of payment flows
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    
    const productDetails = getProductDetails();
    
    console.log("Processing payment for:", productDetails.name);
    
    try {
      if (productDetails.isSubscription) {
    // SUBSCRIPTION FLOW: Use Stripe Checkout
    const createCheckoutSession = httpsCallable(
      functions,
      'createCheckoutSession'
    );
        
        // Build line items array for checkout
        const lineItems = [{ price: priceInfo.fullPrice, quantity: 1 }];
        
        // If complete transformation with additional session fee, add it to checkout
        if (productDetails.hasAdditionalCharge && priceInfo.sessionPrice) {
          lineItems.push({ price: priceInfo.sessionPrice, quantity: 1 });
        }
        
        // Create checkout session with multiple prices if needed
        const result = await createCheckoutSession({
          line_items: lineItems,
          success_url: `${window.location.origin}/signup-success.html?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/signup.html`,
          billing_address_collection: 'required',
          client_reference_id: currentUser.uid,
          customer_email: formData.email,
          // Do NOT specify payment_method_types to ensure all enabled payment methods appear
          // including BNPL options that are already active in your Stripe Dashboard
          allow_promotion_codes: true,
          metadata: {
            tier: formData.tier
          }
        });
        
        // Redirect to Stripe Checkout with error handling
        const { sessionId } = result.data;
        
        try {
          const { error } = await stripe.redirectToCheckout({ sessionId });
          
          if (error) {
            console.warn("Checkout redirect error:", error);
            setPaymentError(error.message || 'Unable to redirect to checkout');
            setProcessing(false);
            return; // Stop execution but don't throw
          }
        } catch (redirectError) {
          console.error("Checkout redirect exception:", redirectError);
          setPaymentError(redirectError.message || 'Failed to redirect to checkout page');
          setProcessing(false);
          return; // Stop execution but don't throw
        }
      } else {
        // ONE-TIME FLOW: Use Payment Element with confirmPayment
        if (!stripe || !elements || !clientSecret) {
          setPaymentError("Payment system not ready. Please try again.");
          return;
        }

        // Try to confirm payment without throwing exceptions
        let paymentResult;
        try {
          paymentResult = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/signup-success.html`,
              payment_method_data: {
                billing_details: {
                  name: formData.name,
                  email: formData.email
                }
              }
            },
            redirect: 'if_required' // Only redirect for 3D Secure or other auth flows
          });
        } catch (confirmError) {
          console.error('Payment confirmation error:', confirmError);
          setPaymentError(confirmError.message || 'Payment processing failed');
          setProcessing(false);
          return; // Stop execution but don't throw, so user can try again
        }
        
        // Handle normal error responses without throwing
        if (paymentResult?.error) {
          console.warn("Payment returned error:", paymentResult.error);
          setPaymentError(paymentResult.error.message || 'Payment failed');
          setProcessing(false);
          return; // Stop execution but don't throw, so user can try again
        }
        
        const { paymentIntent } = paymentResult;
        
        // Payment Intent Debugging
        console.log('Payment Intent:', paymentIntent);
        
        // Payment succeeded, update formData and continue
        updateFormData({
          paymentInfo: {
            paymentMethodId: paymentIntent.payment_method,
            last4: "****", // Will be updated on success page
            brand: "card",
            paymentComplete: true
          }
        });
        
        nextStep();
      }
      
      // All payment types, including in-person training, use the regular payment flow
    } catch (err) {
      console.error('Payment error:', err);
      if (!paymentError) {
        setPaymentError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Add debugging to trace clientSecret
  useEffect(() => {
    if (clientSecret) {
      console.log("ClientSecret available:", clientSecret.substring(0, 5) + "...");
    } else {
      console.log("Waiting for clientSecret...");
    }
  }, [clientSecret]);
  
  // Use different UI based on product type
  const productDetails = getProductDetails();
  
  // CLEAN SEPARATION: Show different UI based on product type
  
  // Improved loading state check - show loading state whenever the required elements aren't ready
  if ((!productDetails.isSubscription && !clientSecret) || !priceInfo) {
    console.log("Loading state triggered due to:", {
      isSubscription: productDetails.isSubscription,
      hasClientSecret: !!clientSecret,
      hasPriceInfo: !!priceInfo,
      productDetails: productDetails
    });
    return (
      <div className="signup-form loading" aria-live="polite">
        <h3>Payment Information</h3>
        <div className="loading-indicator" role="status">
          <div className="spinner"></div>
          <span>Loading payment system...</span>
        </div>
      </div>
    );
  }
  
  // For one-time payments, use Elements with clientSecret
  if (!productDetails.isSubscription && clientSecret) {
    // Configure Stripe Elements with clientSecret
    const elementsOptions = {
      clientSecret,
      appearance
    };
    
    // Wrap payment form with Stripe Elements
    return (
      <Elements stripe={stripePromise} options={elementsOptions}>
        <OneTimePaymentForm 
          formData={formData}
          productDetails={productDetails}
          nextStep={nextStep}
          prevStep={prevStep}
          paymentError={paymentError}
          setPaymentError={setPaymentError}
          processing={processing}
          setProcessing={setProcessing}
          updateFormData={updateFormData}
        />
      </Elements>
    );
  }
  
  // Subscription Flow UI
  if (productDetails.isSubscription) {
    return (
      <form className="signup-form" onSubmit={handleSubmit}>
        <h3>Subscription Payment</h3>
        
        {paymentError && (
          <div className="error-message" role="alert" aria-live="polite">
            <i className="fas fa-exclamation-circle"></i>
            {paymentError}
          </div>
        )}
        
        <div className="payment-summary">
          <h4>Order Summary</h4>
          <div className="summary-item">
            <span className="item-name">{productDetails.name}</span>
            <span className="item-price">{formatCurrency(productDetails.amount)}</span>
          </div>
          {productDetails.hasAdditionalCharge && (
            <div className="summary-item">
              <span className="item-name">Session Fee</span>
              <span className="item-price">{formatCurrency(productDetails.sessionAmount)}</span>
            </div>
          )}
          <p className="recurring-notice">
            You will be charged {formatCurrency(productDetails.amount)} monthly
          </p>
        </div>
        
        <div className="payment-security-notice">
          <i className="fas fa-lock"></i>
          <span>Secure payments processed through Stripe. Multiple payment options, including buy now, pay later services like Klarna and Affirm, may be available at checkout.</span>
        </div>
        
        <div className="button-row">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={prevStep}
            disabled={processing}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button 
            type="submit" 
            className="btn-primary-enhanced"
            disabled={processing}
            aria-busy={processing}
          >
            {processing ? 'Processing...' : 'Subscribe Now'} 
            {!processing && <i className="fas fa-arrow-right"></i>}
          </button>
        </div>
      </form>
    );
  }
  
}

// Separate component for one-time payments to use within Elements context
function OneTimePaymentForm({ formData, productDetails, nextStep, prevStep, paymentError, setPaymentError, processing, setProcessing, updateFormData }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
  
  const formatCurrency = (amount) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    
    if (!stripe || !elements) {
      setPaymentError("Payment system not ready. Please try again.");
      setProcessing(false);
      return;
    }

    // Try to confirm payment without throwing exceptions
    let paymentResult;
    try {
      paymentResult = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/signup-success.html`,
          payment_method_data: {
            billing_details: {
              name: formData.name,
              email: formData.email
            }
          }
        },
        redirect: 'if_required' // Only redirect for 3D Secure or other auth flows
      });
    } catch (confirmError) {
      console.error('Payment confirmation error:', confirmError);
      setPaymentError(confirmError.message || 'Payment processing failed');
      setProcessing(false);
      return; // Stop execution but don't throw, so user can try again
    }
    
    // Handle normal error responses without throwing
    if (paymentResult?.error) {
      console.warn("Payment returned error:", paymentResult.error);
      setPaymentError(paymentResult.error.message || 'Payment failed');
      setProcessing(false);
      return; // Stop execution but don't throw, so user can try again
    }
    
    const { paymentIntent } = paymentResult;
    
    // Payment Intent Debugging
    console.log('Payment Intent:', paymentIntent);
    
    // Payment succeeded, update formData and continue
    updateFormData({
      paymentInfo: {
        paymentMethodId: paymentIntent.payment_method,
        last4: "****", // Will be updated on success page
        brand: "card",
        paymentComplete: true
      }
    });
    
    nextStep();
  };
  
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <h3>Payment Information</h3>
      
      {paymentError && (
        <div className="error-message" role="alert" aria-live="polite">
          <i className="fas fa-exclamation-circle"></i>
          {paymentError}
        </div>
      )}
      
      <div className="payment-summary">
        <h4>Order Summary</h4>
        <div className="summary-item">
          <span className="item-name">{productDetails.name}</span>
          <span className="item-price">{formatCurrency(productDetails.amount)}</span>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="payment-element" className="sr-only">
          Payment details
        </label>
        <div className="payment-element-container">
          <PaymentElement 
            id="payment-element" 
            options={{
              layout: 'accordion', // New layout option that works well with BNPL
              paymentMethodOrder: ['card', 'apple_pay', 'google_pay', 'klarna', 'afterpay_clearpay', 'affirm'],
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
      
      <div className="payment-security-notice">
        <i className="fas fa-lock"></i>
        <span>Secure payments processed through Stripe. Multiple payment options, including buy now, pay later services like Klarna and Affirm, may be available at checkout.</span>
      </div>
      
      <div className="button-row">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={prevStep}
          disabled={processing}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <button 
          type="submit" 
          className="btn-primary-enhanced"
          disabled={!stripe || !isPaymentElementReady || processing}
          aria-busy={processing}
        >
          {processing ? 'Processing...' : 'Pay Now'} 
          {!processing && <i className="fas fa-arrow-right"></i>}
        </button>
      </div>
    </form>
  );
}

export default PaymentStep;
