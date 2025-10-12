# Stripe Integration Update Guide (August 2025)

This guide provides step-by-step instructions to update your existing payment implementation to use the latest Stripe, React, and Firebase features. Follow these instructions to ensure your payment system is secure, compliant, and uses modern best practices.

## Package Updates

First, update your dependencies:

```bash
npm install @stripe/stripe-js@latest @stripe/react-stripe-js@latest firebase@latest
```

## 1. Update Your index.js File

Your `src/react/signup/index.js` file has already been updated to wrap your SignupForm with the Stripe Elements provider. Be sure to replace the placeholder publishable key with your actual Stripe key.

```javascript
// Change this line:
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

// To use your actual key, preferably from environment variables:
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);
```

## 2. Update Your PaymentStep.jsx Component

Your current PaymentStep.jsx uses direct card input fields which isn't secure or PCI compliant. Here's how to update it to use Stripe's Payment Element:

### Step 1: Update Import Statements

```javascript
// src/react/signup/components/PaymentStep.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  PaymentElement,
  useStripe, 
  useElements 
} from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
```

### Step 2: Add New State Variables

```javascript
function PaymentStep({ formData, updateFormData, nextStep, prevStep, error }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' or 'installment'
  const [priceInfo, setPriceInfo] = useState(null);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;
  
  const auth = getAuth();
  const db = getFirestore();
```

### Step 3: Fetch Product Prices from Firestore

The Firebase Stripe Extension stores product and price information in Firestore. Add this code to fetch it:

```javascript
// Fetch product prices from Firestore (synced by Firebase extension)
useEffect(() => {
  const fetchPriceInfo = async () => {
    try {
      if (!formData.tier) return;
      
      let productId;
      switch(formData.tier) {
        case 'in-person-training':
          productId = 'in-person-training'; // Use your actual product ID
          break;
        case 'online-coaching':
          productId = 'online-coaching'; // Use your actual product ID
          break;
        case 'complete-transformation':
          productId = 'complete-transformation'; // Use your actual product ID
          break;
        default:
          return;
      }
      
      // Products collection from Invertase Firebase Extension (stripe_products)
      const productRef = doc(db, 'stripe_products', productId);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const productData = productSnap.data();
        // Get prices - the structure matches what Firebase Extension creates
        const prices = productData.prices;
        
        // Using correct comparison operators for all price lookups
        setPriceInfo({
          fullPrice: prices.find(p => !p.payment_schedule && p.recurring === getProductDetails().isSubscription)?.id,
          installmentPrice: prices.find(p => p.payment_schedule?.interval === 'month')?.id,
          sessionPrice: prices.find(p => p.type === 'one_time' && p.unit_amount === 6000)?.id,
        });
      }
    } catch (err) {
      console.error('Error fetching price info:', err);
    }
  };
  
  fetchPriceInfo();
}, [formData.tier, db]);
```

### Step 4: Create Payment Intent for One-Time Payments

```javascript
// Create payment intent when component mounts or payment plan changes
useEffect(() => {
  if (!stripe || !priceInfo || !auth.currentUser) return;

  const createPaymentIntent = async () => {
    try {
      const functions = getFunctions();
      const productDetails = getProductDetails();
      
      // For non-subscription products, create a Payment Intent
      if (!productDetails.isSubscription) {
        // Using the correct Invertase function name pattern
        const createPaymentFn = httpsCallable(
          functions, 
          'ext-firestore-stripe-payments-createPaymentIntent'
        );
        
        // Choose price ID based on payment plan
        const priceId = paymentPlan === 'full' ? 
          priceInfo.fullPrice : 
          priceInfo.installmentPrice;
          
        const result = await createPaymentFn({
          price: priceId,
          automatic_payment_methods: { enabled: true },
          currency: 'usd'
        });
        
        setClientSecret(result.data.clientSecret);
      } else {
        // For subscriptions we'll use checkout - set a placeholder to prevent loading state
        setClientSecret("subscription-checkout");
      }
    } catch (err) {
      console.error('Error creating payment intent:', err);
      setPaymentError(err.message);
    }
  };

  createPaymentIntent();
}, [stripe, priceInfo, paymentPlan, auth.currentUser]);
```

### Step 5: Update Product Details Function with useCallback for Better Performance

```javascript
// Get product details based on selected tier
const getProductDetails = useCallback(() => {
  switch(formData.tier) {
    case 'in-person-training':
      return {
        name: 'In-Person Training',
        amount: 7000, // $70.00 in cents
        installmentAmount: 1750, // $17.50 in cents
        isSubscription: false
      };
    case 'online-coaching':
      return {
        name: 'Online Coaching',
        amount: 19900, // $199.00 in cents
        installmentAmount: 4975, // $49.75 in cents
        isSubscription: true
      };
    case 'complete-transformation':
      return {
        name: 'Complete Transformation',
        amount: 19900, // $199.00 in cents
        sessionAmount: 6000, // $60.00 in cents
        installmentAmount: 4975, // $49.75 in cents
        isSubscription: true,
        hasAdditionalCharge: true
      };
    default:
      return { name: '', amount: 0, isSubscription: false };
  }
}, [formData.tier]);
```

### Step 6: Add Safari-Compatible Class Toggling

```javascript
// Handle plan selection with proper class toggling (Safari compatibility fix)
const handlePlanSelection = (plan) => {
  setPaymentPlan(plan);
  
  // Add selected class for Safari compatibility (instead of :has selector)
  setTimeout(() => {
    document.querySelectorAll('.plan-option').forEach(el => {
      if (el.querySelector(`#${plan}-payment`)) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }, 0);
};
```

### Step 7: Add Detailed Error Handling Function

```javascript
// Handle payment errors with specific error codes
const handlePaymentError = useCallback((error) => {
  let message;
  
  switch (error.code) {
    case 'card_declined':
      message = 'Your card was declined. Please try a different payment method.';
      break;
    case 'insufficient_funds':
      message = 'Your card has insufficient funds. Please try a different card.';
      break;
    case 'processing_error':
      message = 'An error occurred while processing your card. Please try again.';
      break;
    case 'authentication_required':
      message = 'Your payment requires authentication. Please complete the verification.';
      break;
    case 'expired_card':
      message = 'Your card is expired. Please try a different card.';
      break;
    case 'incorrect_cvc':
      message = 'Your card\'s security code is incorrect. Please check and try again.';
      break;
    case 'incomplete_number':
      message = 'Your card number is incomplete. Please check and try again.';
      break;
    default:
      message = error.message || 'An unexpected error occurred. Please try again.';
  }
  
  setPaymentError(message);
}, []);
```

### Step 8: Create Payment Processing Function

This function handles both subscriptions and one-time payments correctly:

```javascript
// Extract payment processing logic to a separate function for reuse
const processPayment = async () => {
  if (!stripe || !elements || !auth.currentUser) {
    setPaymentError("Payment system not ready or user not logged in.");
    return;
  }
  
  setProcessing(true);
  setPaymentError(null);
  
  try {
    const functions = getFunctions();
    const productDetails = getProductDetails();
    
    // Choose price ID based on payment plan
    const priceId = paymentPlan === 'full' ? 
      priceInfo.fullPrice : 
      priceInfo.installmentPrice;
      
    if (productDetails.isSubscription) {
      // Use createCheckoutSession for subscriptions
      const createCheckoutSession = httpsCallable(
        functions, 
        'ext-firestore-stripe-payments-createCheckoutSession'
      );
      
      // Build line items array for checkout
      const lineItems = [{ price: priceId, quantity: 1 }];
      
      // If complete transformation with additional session fee, add it to the same checkout
      if (productDetails.hasAdditionalCharge && paymentPlan === 'full' && priceInfo.sessionPrice) {
        lineItems.push({ price: priceInfo.sessionPrice, quantity: 1 });
      }
      
      // Create checkout session with multiple prices if needed
      const result = await createCheckoutSession({
        line_items: lineItems,
        success_url: `${window.location.origin}/signup-success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/signup.html`,
        billing_address_collection: 'required',
        client_reference_id: auth.currentUser.uid,
        customer_email: formData.email,
        metadata: {
          tier: formData.tier,
          paymentPlan
        }
      });
      
      // Redirect to Stripe Checkout
      const { sessionId } = result.data;
      const { error } = await stripe.redirectToCheckout({ sessionId });
      
      if (error) {
        throw new Error(error.message);
      }
    } else {
      // For one-time payments, use Payment Element with confirmPayment
      const { error, paymentIntent } = await stripe.confirmPayment({
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
      
      if (error) {
        // Handle payment errors with detailed messages
        handlePaymentError(error);
        throw error;
      }
      
      // Payment succeeded, update formData and continue
      updateFormData({
        paymentInfo: {
          paymentMethodId: paymentIntent.payment_method,
          // We'll need to fetch details differently since we're using Payment Element
          last4: "****", // Will be updated on success page
          brand: "card",
          paymentPlan,
          paymentComplete: true
        }
      });
      
      nextStep();
    }
  } catch (err) {
    console.error('Payment error:', err);
    if (!paymentError) { // Only set error if not already set by handlePaymentError
      setPaymentError(err.message || 'An unexpected error occurred');
    }
  } finally {
    setProcessing(false);
  }
};
```

### Step 9: Update handleSubmit to Use processPayment Function

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  await processPayment();
};
```

### Step 10: Add Payment Plan Selector UI Component

```javascript
// Payment plan selector UI
const renderPaymentPlanSelector = () => {
  const productDetails = getProductDetails();
  
  return (
    <div className="payment-plan-options">
      <h4>Payment Options</h4>
      
      <div className={`plan-option ${paymentPlan === 'full' ? 'selected' : ''}`}>
        <input 
          type="radio" 
          id="full-payment" 
          name="payment-plan"
          checked={paymentPlan === 'full'}
          onChange={() => handlePlanSelection('full')}
        />
        <label htmlFor="full-payment">
          <div className="plan-option-details">
            <strong>Pay in Full</strong>
            <span>{formatCurrency(productDetails.amount)}</span>
          </div>
          <div className="plan-option-description">
            One-time payment, get started immediately
          </div>
        </label>
      </div>
      
      <div className={`plan-option ${paymentPlan === 'installment' ? 'selected' : ''}`}>
        <input 
          type="radio" 
          id="installment-payment" 
          name="payment-plan"
          checked={paymentPlan === 'installment'}
          onChange={() => handlePlanSelection('installment')}
        />
        <label htmlFor="installment-payment">
          <div className="plan-option-details">
            <strong>4 Monthly Payments</strong>
            <span>{formatCurrency(productDetails.installmentAmount)}/month</span>
          </div>
          <div className="plan-option-description">
            Split into 4 easy payments, same great service
          </div>
        </label>
      </div>
    </div>
  );
};
```

### Step 11: Add Payment Element UI Component

```javascript
// Modern Payment Element implementation with controlled layout
const renderPaymentForm = () => (
  <div className="payment-form">
    <div className="form-group">
      <label htmlFor="payment-element" className="sr-only">
        Payment details
      </label>
      <div className="payment-element-container">
        <PaymentElement 
          id="payment-element" 
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
            defaultValues: {
              billingDetails: {
                name: formData.name || '',
                email: formData.email || ''
              }
            }
          }}
          onReady={() => setIsPaymentElementReady(true)}
        />
      </div>
    </div>
  </div>
);
```

### Step 12: Update getPricingInfo Function

```javascript
// Get pricing info for the summary
const getPricingInfo = () => {
  const productDetails = getProductDetails();
  switch(formData.tier) {
    case 'in-person-training':
      return {
        name: 'In-Person Training',
        price: formatCurrency(productDetails.amount),
        recurring: false,
        frequency: 'per session',
        installmentPrice: formatCurrency(productDetails.installmentAmount),
        installments: 4
      };
    case 'online-coaching':
      return {
        name: 'Online Coaching',
        price: formatCurrency(productDetails.amount),
        recurring: true,
        frequency: 'monthly',
        installmentPrice: formatCurrency(productDetails.installmentAmount),
        installments: 4
      };
    case 'complete-transformation':
      return {
        name: 'Complete Transformation',
        price: formatCurrency(productDetails.amount),
        sessionPrice: productDetails.sessionAmount ? formatCurrency(productDetails.sessionAmount) : '',
        recurring: true,
        frequency: 'monthly + $60 per session',
        installmentPrice: formatCurrency(productDetails.installmentAmount),
        installments: 4
      };
    default:
      return {
        name: 'Selected Plan',
        price: '$0.00',
        recurring: false,
        frequency: ''
      };
  }
};

const pricingInfo = getPricingInfo();
```

### Step 13: Replace the Return Statement with Modern Loading State and Error Handling

```javascript
// Show loading state if Stripe or Elements isn't ready
if (!stripe || !elements || !clientSecret) {
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

return (
  <form className="signup-form" onSubmit={handleSubmit}>
    <h3>Payment Information</h3>
    
    {paymentError && (
      <div className="error-message" role="alert" aria-live="polite">
        <i className="fas fa-exclamation-circle"></i>
        {paymentError}
        {retryCount < MAX_RETRIES && (
          <button 
            type="button"
            className="retry-button"
            onClick={() => {
              setRetryCount(prev => prev + 1);
              processPayment();
            }}
          >
            Try Again
          </button>
        )}
      </div>
    )}
    
    {error && (
      <div className="error-message" role="alert">
        <i className="fas fa-exclamation-circle"></i>
        {error}
      </div>
    )}
    
    <div className="payment-summary">
      <h4>Order Summary</h4>
      <div className="summary-item">
        <span className="item-name">{pricingInfo.name}</span>
        <span className="item-price">{pricingInfo.price}</span>
      </div>
      {pricingInfo.recurring && (
        <p className="recurring-notice">
          You will be charged {pricingInfo.price} {pricingInfo.frequency}
        </p>
      )}
    </div>
    
    {renderPaymentPlanSelector()}
    {renderPaymentForm()}
    
    <div className="payment-security-notice">
      <i className="fas fa-lock"></i>
      <span>Payments are securely processed through Stripe.</span>
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
        {processing ? 'Processing...' : 'Review Order'} 
        {!processing && <i className="fas fa-arrow-right"></i>}
      </button>
    </div>
  </form>
);
```

## 3. Update Your Signup CSS for Modern Payment Elements

Add the following to your `src/react/signup/signup.css` file:

```css
/* Payment form styling */
.payment-element-container {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
  transition: all 0.3s;
}

.payment-element-container:focus-within {
  border-color: var(--primary, #4caf50);
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

/* Payment plan options */
.payment-plan-options {
  margin: 1.5rem 0;
}

.plan-option {
  display: flex;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.3s;
}

.plan-option input[type="radio"] {
  margin-top: 0.3rem;
  margin-right: 1rem;
}

.plan-option label {
  flex: 1;
  display: flex;
  flex-direction: column;
  cursor: pointer;
}

.plan-option-details {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.plan-option-description {
  font-size: 0.9rem;
  color: #666;
}

/* Safari-compatible selected state (instead of :has pseudo-class) */
.plan-option.selected {
  border-color: var(--primary, #4caf50);
  background-color: rgba(76, 175, 80, 0.05);
}

/* Loading state */
.signup-form.loading {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loading-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
  color: #666;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(76, 175, 80, 0.2);
  border-top-color: var(--primary, #4caf50);
  border-radius: 50%;
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  to {transform: rotate(360deg);}
}

/* Error message styling */
.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #d32f2f;
  background-color: rgba(211, 47, 47, 0.1);
  border-left: 3px solid #d32f2f;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0 4px 4px 0;
}

/* Retry button */
.retry-button {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background-color: transparent;
  border: 1px solid #d32f2f;
  color: #d32f2f;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-button:hover {
  background-color: rgba(211, 47, 47, 0.1);
}

/* Security notice */
.payment-security-notice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  margin: 1.5rem 0;
}

.payment-security-notice i {
  color: var(--primary, #4caf50);
}

/* Accessibility improvements */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}

/* Button state styles */
button[aria-busy=true] {
  position: relative;
  color: transparent;
}

button[aria-busy=true]::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1rem;
  height: 1rem;
  margin-top: -0.5rem;
  margin-left: -0.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  border-top-color: white;
  animation: spinner 1s linear infinite;
}
```

## 4. Update Your Firebase Configuration

Ensure your firebase-config.js file is updated to use the latest best practices:

```javascript
// src/firebase-config.js

// Use environment variables for Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Use modern modular Firebase SDK
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

// Initialize Firebase for React components - proper initialization pattern
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use existing app instance
}

export const auth = getAuth(app);
export const db = getFirestore(app);
```

## 5. Update ConfirmationStep.jsx for Accessibility

Add these accessibility improvements to your ConfirmationStep.jsx:

```jsx
<div className="error-message" role="alert">{error}</div>

<button 
  type="button" 
  className="btn-primary-enhanced"
  onClick={handleSubmit}
  disabled={isSubmitting}
  aria-busy={isSubmitting}
>
  {isSubmitting ? 'Processing...' : 'Complete Sign Up'}
  {!isSubmitting && <i className="fas fa-check-circle"></i>}
</button>
```

## 6. Testing Stripe Integration

### Test Card Numbers

| Card Number | Brand | Description |
|------------|-------|-------------|
| 4242 4242 4242 4242 | Visa | Succeeds and immediately processes the payment |
| 4000 0025 0000 3155 | Visa | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Visa | Always fails with a decline |
| 4000 0000 0000 0077 | Visa | Failed fraud check |
| 5555 5555 5555 4444 | Mastercard | Succeeds and immediately processes the payment |
| 3782 8224 6310 005 | American Express | Succeeds and immediately processes the payment |

For all cards:
- Any future expiry date (e.g., 12/28)
- Any 3-digit CVC code (4-digits for American Express)
- Any billing postal code (e.g., 12345)

## 7. Implementing Environment Variables

Create a `.env` file in your project root:

```
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_MEASUREMENT_ID=your_measurement_id
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Add `.env` to your `.gitignore` file:

```
# .gitignore
.env
.env.local
.env.development
.env.test
.env.production
```

## Security Checklist

- [ ] Never hardcode API keys in client-side code
- [ ] Use Stripe Elements for secure card collection
- [ ] Set up proper webhook handling for payment events
- [ ] Implement proper Firebase security rules
- [ ] Use HTTPS in production
- [ ] Enable 3D Secure for European transactions (SCA compliance)
- [ ] Test payment flows thoroughly with test cards
- [ ] Implement proper error handling and retry logic
