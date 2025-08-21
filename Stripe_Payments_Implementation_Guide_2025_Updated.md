# Complete Beginner's Guide to Implementing Stripe Payments in Your React Signup Form (August 2025 Edition)

This comprehensive guide will help you add secure, professional payment processing to your fitness signup form using the latest Stripe, React, and Firebase technologies.

## Table of Contents

1. [Stripe Account Setup](#part-1-stripe-account-setup)
2. [Firebase Extension Setup](#part-2-firebase-extension-setup)
3. [Environment Variables Configuration](#part-3-environment-variables-configuration)
4. [Client-Side Integration](#part-4-client-side-integration)
5. [Testing the Integration](#part-5-testing-the-integration)
6. [Going Live](#part-6-going-live)
7. [Troubleshooting](#part-7-troubleshooting)

## PART 1: STRIPE ACCOUNT SETUP

### Step 1: Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and click "Start now"
2. Enter your email address and create a password
3. Fill in your business details
4. You'll automatically be in TEST MODE (indicated by a "Test" badge in the dashboard)

### Step 2: Set Up Your Products in Stripe
1. In your Stripe dashboard, go to **Products** in the left sidebar
2. Click **+ Create product** button (note: the UI has been updated from "+ Add Product" to "+ Create product")
3. **For In-Person Training:**
   - Name: "In-Person Training Session"
   - Price: $70.00 / one time
   - Click "Save product"
4. **For Online Coaching:**
   - Name: "Online Coaching Subscription"
   - Price: $199.00 / monthly recurring
   - Click "Save product"
5. **For Complete Transformation:**
   - Name: "Complete Transformation Package"
   - Price: $199.00 / monthly recurring
   - Click "Save product"
   - Click **+ Add another price**
   - Add a second price: $60.00 / one time (for the session fee)

### Step 3: Set Up Payment Schedules (for Installments)
1. For each product, create a payment schedule:
   - Click on your product
   - Click **+ Add price**
   - Select "Payment schedule"
   - Set "Number of payments" to 4
   - "Interval between payments" to 1 month
   - For In-Person Training: $17.50 per installment (total $70)
   - For Online Coaching: $49.75 per installment (total $199)
   - Click "Save price"

### Step 4: Get Your API Keys
1. In the Stripe dashboard, click on **Developers** in the left sidebar
2. Click on **API keys**
3. Note down your **Publishable key** (starts with `pk_test_`)
4. Click **Reveal test key** to see your **Secret key** (starts with `sk_test_`)
5. Keep these keys for later steps
6. **SECURITY BEST PRACTICE**: Never hardcode these keys in your frontend code. Always use environment variables.

## PART 2: FIREBASE EXTENSION SETUP

### Step 1: Install the Firebase Stripe Extension
1. Go to your Firebase console at [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Click on **Extensions** in the left sidebar
4. Search for "Run Payments with Stripe"
5. **IMPORTANT**: Select the Invertase-maintained version of the extension (v0.3.12+)
   - Look for "Maintained by Invertase" in the extension details
   - The original Firebase-maintained version is now deprecated
6. Click **Install** button
7. Configure the extension:
   - **Cloud Functions location**: Choose the location closest to your users
   - **Collection path for customers**: `stripe_customers` (default for Invertase extension)
   - **Collection path for products and prices**: `stripe_products` (default for Invertase extension)
   - **Stripe API key**: Enter your Stripe Secret key from Step 4 above
   - **Sync mode options**: Select "Serverless" (modern approach)
   - **Automatic user provisioning**: Set to "Enabled" to automatically create Stripe customers
   - **Default currency**: Set to "USD" (or your preferred currency)
   - Click **Install extension**

### Step 2: Set Up Stripe Webhooks
1. After installation, click on "Manage extension"
2. Look for the **Set up webhooks** section
3. Copy the webhook URL provided by Firebase
4. Go to your Stripe dashboard > Developers > Webhooks
5. Click **+ Add endpoint**
6. Paste the webhook URL
7. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
8. Click **Add endpoint**
9. Copy the **Signing secret** (starts with `whsec_`)
10. Return to Firebase extension settings and update the webhook secret field with this value
11. Click **Update configuration**

### Step 3: Set Up Firebase CLI
1. Open your command prompt/terminal
2. Install Firebase CLI if you haven't already:
   ```bash
   npm install -g firebase-tools@latest
   ```
3. Login to Firebase:
   ```bash
   firebase login
   ```
4. Initialize Firebase in your project:
   ```bash
   cd your-project-directory
   firebase init
   ```
5. Select:
   - Firestore
   - Functions
   - When asked about Functions, select JavaScript or TypeScript
   - Set up ESLint
   - Choose to set up dependencies now

## PART 3: ENVIRONMENT VARIABLES CONFIGURATION

### Setting Up Environment Variables

Create a `.env` file in your project root with your API keys and configuration:

```
# .env - DO NOT COMMIT THIS FILE TO VERSION CONTROL
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_MEASUREMENT_ID=your_measurement_id
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

Add `.env` to your `.gitignore` file to prevent accidental commits:

```
# .gitignore
.env
.env.local
.env.development
.env.test
.env.production
```

### Environment Variables for Different Deployment Platforms

#### Development
- Create a `.env.local` file in your project root with your development variables
- Add this file to `.gitignore`

#### Firebase Hosting
```bash
# Set environment variables for Firebase Functions
firebase functions:config:set stripe.key="sk_test_your_key" stripe.webhook="whsec_your_webhook"
firebase functions:config:set stripe.publishable="pk_test_your_key"

# Access in functions using:
# const stripe = require('stripe')(functions.config().stripe.key);
```

#### Vercel
- Add environment variables in the Vercel dashboard under Project Settings
- Prefix client-side variables with `NEXT_PUBLIC_` if using Next.js

#### Netlify
- Add environment variables in the Netlify dashboard under Site Settings > Build & Deploy > Environment
- Use `.env` variables in `netlify.toml` for build-time variables

## PART 4: CLIENT-SIDE INTEGRATION

### Step 1: Install Required Packages
```bash
npm install @stripe/stripe-js@latest @stripe/react-stripe-js@latest
```

### Step 2: Update Your index.js File

```javascript
// src/react/signup/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SignupForm } from './SignupForm';
import './signup.css';

// Load Stripe with your publishable key
// In production, use environment variables: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

// Modern Stripe Elements appearance configuration
const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4caf50',
    colorBackground: '#ffffff',
    colorText: '#30313d',
    fontFamily: 'Roboto, system-ui, sans-serif',
    borderRadius: '8px',
  },
};

const options = {
  appearance,
  loader: 'auto'
};

// Wait for DOM to be ready, then mount React
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-signup-form');
  if (container) {
    const root = createRoot(container);
    root.render(
      <Elements stripe={stripePromise} options={options}>
        <SignupForm />
      </Elements>
    );
  } else {
    console.error('Could not find react-signup-form container element');
  }
});
```

### Step 3: Update firebase-config.js with Security Best Practices

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

// Function to create a user with tier information (modern approach)
export async function createUserWithTier(email, password, name, phone, tier) {
  try {
    // Use modern Firebase SDK
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    await setDoc(doc(db, 'users', userId), {
      name: name,
      email: email,
      phone: phone || null,
      tier: tier,
      role: 'client',
      createdAt: serverTimestamp()
    });
    
    return { success: true, userId, user: userCredential.user };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error
    };
  }
}

// Function to listen to subscription status changes
export function listenToSubscriptionStatus(userId, callback) {
  if (!userId) return null;
  
  // Note the collection path uses stripe_customers per Invertase extension
  const userSubscriptionsRef = collection(db, 'stripe_customers', userId, 'subscriptions');
  
  return onSnapshot(userSubscriptionsRef, (snapshot) => {
    const subscriptions = [];
    snapshot.forEach((doc) => {
      subscriptions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(subscriptions);
  });
}

// Function to get user's payment methods
export function listenToPaymentMethods(userId, callback) {
  if (!userId) return null;
  
  // Note the collection path uses stripe_customers per Invertase extension
  const paymentMethodsRef = collection(db, 'stripe_customers', userId, 'payment_methods');
  
  return onSnapshot(paymentMethodsRef, (snapshot) => {
    const paymentMethods = [];
    snapshot.forEach((doc) => {
      paymentMethods.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(paymentMethods);
  });
}
```

### Step 4: Create the PaymentStep Component with Clean Flow Separation

When implementing payments for both subscription and one-time purchase products, it's important to follow Stripe's best practice of using separate payment flows:

1. **For Subscription Products**: Use Stripe Checkout to handle the subscription creation
2. **For One-Time Payments**: Use Stripe Payment Element in your React UI

This separation provides the best user experience and developer experience. Here's how to implement this pattern:

```jsx
// src/react/signup/components/PaymentStep.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

function PaymentStep({ formData, updateFormData, nextStep, prevStep, error }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [priceInfo, setPriceInfo] = useState(null);
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' or 'installment'

  const auth = getAuth();
  const db = getFirestore();
  
  // Fetch product prices from Firestore (synced by Firebase extension)
  useEffect(() => {
    if (!formData.tier) return;
    let productId;
    switch (formData.tier) {
      case 'in-person-training':
        productId = 'in-person-training';
        break;
      case 'online-coaching':
        productId = 'online-coaching';
        break;
      case 'complete-transformation':
        productId = 'complete-transformation';
        break;
      default:
        return;
    }

    const fetchPrices = async () => {
      try {
        const productRef = doc(db, 'stripe_products', productId);
        const productSnap = await getDoc(productRef);
        if (!productSnap.exists()) return;
        const productData = productSnap.data();
        const prices = productData.prices;

        setPriceInfo({
          // FIXED: Using correct comparison operators (=== instead of =)
          fullPrice: prices.find(
            p => !p.payment_schedule && p.recurring === getProductDetails().isSubscription
          )?.id,
          installmentPrice: prices.find(
            p => p.payment_schedule?.interval === 'month'
          )?.id,
          sessionPrice: prices.find(
            p => p.type === 'one_time' && p.unit_amount === 6000
          )?.id,
        });
      } catch (err) {
        setPaymentError('Could not fetch price info: ' + err.message);
      }
    };
    fetchPrices();
  }, [formData.tier, db]);
  
  // Initialize PaymentIntent ONLY for one-time payments
  useEffect(() => {
    if (!stripe || !priceInfo || !auth.currentUser) return;
    const productDetails = getProductDetails();
    
    // Only create PaymentIntent for one-time payments
    if (!productDetails.isSubscription) {
      (async () => {
        try {
          const functions = getFunctions();
          const createPaymentFn = httpsCallable(
            functions, 
            'ext-firestore-stripe-payments-createPaymentIntent'
          );
          const priceId = paymentPlan === 'full' ? 
            priceInfo.fullPrice : 
            priceInfo.installmentPrice;
            
          const result = await createPaymentFn({
            price: priceId,
            automatic_payment_methods: { enabled: true },
            currency: 'usd'
          });
          
          setClientSecret(result.data.clientSecret);
        } catch (err) {
          setPaymentError('Could not create payment intent: ' + err.message);
        }
      })();
    }
  }, [stripe, priceInfo, paymentPlan, auth.currentUser]);
  
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
  
  const formatCurrency = (amount) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };
  
  const handlePlanSelection = (plan) => {
    setPaymentPlan(plan);
  };
  
  // Submit handler with clean separation of payment flows
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    
    const productDetails = getProductDetails();
    try {
      if (productDetails.isSubscription) {
        // SUBSCRIPTION FLOW: Use Stripe Checkout
        const functions = getFunctions();
        const createCheckoutSession = httpsCallable(
          functions, 
          'ext-firestore-stripe-payments-createCheckoutSession'
        );
        
        // Build line items array for checkout
        const priceId = paymentPlan === 'full' ? 
          priceInfo.fullPrice : 
          priceInfo.installmentPrice;
          
        const lineItems = [{ price: priceId, quantity: 1 }];
        
        // If complete transformation with additional session fee, add it to checkout
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
        // ONE-TIME FLOW: Use Payment Element with confirmPayment
        if (!stripe || !elements || !clientSecret) {
          setPaymentError("Payment system not ready. Please try again.");
          return;
        }
        
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
          setPaymentError(error.message || 'Payment failed');
          throw error;
        }
        
        // Payment succeeded, update formData and continue
        updateFormData({
          paymentInfo: {
            paymentMethodId: paymentIntent.payment_method,
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
      if (!paymentError) {
        setPaymentError(err.message || 'An unexpected error occurred');
      }
    } finally {
      setProcessing(false);
    }
  };

  // Use different UI based on product type
  const productDetails = getProductDetails();
  
  // CLEAN SEPARATION: Show different UI based on product type
  
  // Loading state
  if ((!productDetails.isSubscription && (!stripe || !elements || !clientSecret)) || !priceInfo) {
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
  
  // Subscription Flow UI (No Payment Element, just payment plan selection)
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
                Monthly subscription, cancel anytime
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
                Split into 4 easy payments
              </div>
            </label>
          </div>
        </div>
        
        <div className="payment-security-notice">
          <i className="fas fa-lock"></i>
          <span>You'll be securely redirected to Stripe to complete your subscription.</span>
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
  
  // One-time Payment Flow UI (Uses Payment Element)
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
          {processing ? 'Processing...' : 'Pay Now'} 
          {!processing && <i className="fas fa-arrow-right"></i>}
        </button>
      </div>
    </form>
  );
}

export default PaymentStep;
```

#### Key Best Practices in This Implementation:

1. **Flow Separation**: Subscription products use Stripe Checkout, while one-time purchases use Payment Element. This provides the optimal experience for each payment type.

2. **Conditional UI**: The component renders completely different UIs based on product type - no PaymentElement for subscriptions, only for one-time purchases.

3. **Error Handling**: Robust error handling with clear user-friendly messages.

4. **Accessibility**: ARIA attributes and proper loading states provide an accessible experience.

5. **Performance**: Using React hooks like useCallback and useMemo for optimal rendering performance.

6. **Clean Code Structure**: Clear separation between data fetching, UI rendering, and payment processing logic.
### Step 5: Add Enhanced CSS Styling

Add these styles to your `src/react/signup/signup.css` file:

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

### Step 6: Update ConfirmationStep Component

Modify your ConfirmationStep.jsx to show payment details:

```jsx
// src/react/signup/components/ConfirmationStep.jsx
import React from 'react';

function ConfirmationStep({ formData, handleSubmit, prevStep, isSubmitting, error }) {
  return (
    <div className="signup-form">
      <h3>Review Your Information</h3>
      
      {error && <div className="error-message" role="alert">{error}</div>}
      
      <div className="review-section">
        <h4>Account Information</h4>
        <div className="review-item">
          <span className="item-label">Name:</span>
          <span className="item-value">{formData.name}</span>
        </div>
        <div className="review-item">
          <span className="item-label">Email:</span>
          <span className="item-value">{formData.email}</span>
        </div>
        <div className="review-item">
          <span className="item-label">Phone:</span>
          <span className="item-value">{formData.phone || 'Not provided'}</span>
        </div>
      </div>
      
      <div className="review-section">
        <h4>Selected Plan</h4>
        <div className="review-item">
          <span className="item-label">Plan:</span>
          <span className="item-value">
            {formData.tier === 'in-person-training' && 'In-Person Training'}
            {formData.tier === 'online-coaching' && 'Online Coaching'}
            {formData.tier === 'complete-transformation' && 'Complete Transformation'}
          </span>
        </div>
      </div>
      
      <div className="review-section">
        <h4>Payment Information</h4>
        <div className="review-item">
          <span className="item-label">Payment Method:</span>
          <span className="item-value">
            {formData.paymentInfo?.brand 
              ? `${formData.paymentInfo.brand.toUpperCase()} •••• ${formData.paymentInfo.last4}` 
              : 'Not provided'}
          </span>
        </div>
        <div className="review-item">
          <span className="item-label">Payment Plan:</span>
          <span className="item-value">
            {formData.paymentInfo?.paymentPlan === 'installment' 
              ? '4 Monthly Payments' 
              : 'Pay in Full'}
          </span>
        </div>
      </div>
      
      <p className="disclaimer">
        By clicking "Complete Sign Up", you agree to our Terms of Service and Privacy Policy.
        Your payment will be processed securely by Stripe.
      </p>
      
      <div className="button-row">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
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
      </div>
    </div>
  );
}

export default ConfirmationStep;
```

## PART 5: TESTING THE INTEGRATION

### Step 1: Build Your React Components
```bash
npm run dev
```

### Step 2: Test the Payment Flow
1. Open signup.html in your browser
2. Fill out the account info step
3. Select a service tier
4. In the payment step, you should see:
   - Payment plan options (full or installment)
   - Modern Payment Element with multiple payment options
   - Credit card input form with built-in validation

### Step 3: Test with Stripe Test Cards
Stripe's latest test cards for 2025:

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

### Step 4: Testing Subscription Products
For subscription products, test the following scenarios:
1. **New subscription creation**: Use card 4242 4242 4242 4242
2. **Authentication flow**: Use card 4000 0025 0000 3155 to test 3D Secure
3. **Failed subscription**: Use card 4000 0000 0000 9995
4. **Checkout with multiple products**: Test the Complete Transformation package with both subscription and one-time fee

### Step 5: Check Firebase and Stripe Dashboards
1. Go to your Firebase console
   - Check Firestore for customer records in the `stripe_customers` collection
   - Check Functions logs for payment processing events
   - Verify webhook events are being processed correctly
2. Go to the Stripe dashboard
   - Click on "Payments" to see your test payments
   - Check "Customers" to see created customer profiles
   - Check "Subscriptions" for subscription records

## PART 6: GOING LIVE

### Step 1: Complete Stripe Account Setup
1. Complete your Stripe account verification
   - Add business information
   - Connect a bank account
   - Complete identity verification
   - Provide required legal documents

### Step 2: Update API Keys for Production
1. In Stripe, switch to Live mode
2. Get your live Publishable key and Secret key
3. Update your environment variables with the live keys:
   ```
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_KEY
   ```
4. Update the Firebase extension with your live Stripe Secret key

### Step 3: Update Webhook Configuration for Production
1. Set up a new webhook endpoint in Stripe's Live mode
2. Use the same webhook URL from your Firebase extension
3. Update the webhook secret in your Firebase extension with the live webhook signing secret
4. Test your webhook with real events using Stripe's webhook testing tool

### Step 4: Production Security Checklist
1. **PCI Compliance**:
   - Ensure you're using the Payment Element (not collecting raw card data)
   - Configure CSP headers to allow only Stripe domains for payment processing
   - Add proper HTTPS for your production domain

2. **API Key Security**:
   - Verify no API keys are hardcoded in client-side code
   - Set restricted API keys with appropriate permissions in Stripe
   - Use environment variables for all sensitive credentials

3. **Data Protection**:
   - Implement proper user authentication before payment processing
   - Set up Firestore security rules to protect customer payment data
   - Configure Firebase Functions to validate authentication

### Step 5: Deploy Your Application
1. Build your application for production:
   ```bash
   npm run build
   ```
2. Deploy Firebase functions and hosting:
   ```bash
   firebase deploy
   ```
3. Verify your production environment with a small test payment

### Step 6: Monitor Transactions
1. Set up Stripe notifications for important payment events:
   - Failed payments
   - Disputed charges
   - Successful subscriptions
2. Configure monitoring for Firebase Functions:
   - Set up error alerting
   - Monitor function execution times and failures
3. Implement proper logging for troubleshooting

## PART 7: TROUBLESHOOTING

### Common Issues and Solutions

#### 1. Payment Element Not Appearing
**Problem**: Payment Element fails to load or doesn't display.
**Solutions**:
- Verify you've wrapped your app with the Stripe Elements provider
- Check the browser console for JavaScript errors
- Ensure your Stripe publishable key is correct
- Verify Stripe.js is loading (check network tab)
- Try setting `loader="always"` in Elements options

#### 2. Payment Method Creation Error
**Problem**: Payment fails with "Payment method creation failed" error.
**Solutions**:
- Check that you're using a valid test card number
- Verify card details are formatted correctly
- Look for validation errors in the Stripe Dashboard
- Check browser console for detailed error messages
- Verify your account isn't in test mode with live keys (or vice versa)

#### 3. Firebase Functions Not Working
**Problem**: Firebase functions fail to execute or return errors.
**Solutions**:
- Verify the Stripe extension is properly installed
- Check Firebase Functions logs for errors
- Ensure the Firebase region matches your extension configuration
- Verify function permissions (IAM roles)
- Check if function timeout is adequate for processing payments

#### 4. Webhook Issues
**Problem**: Webhooks are not being received or processed.
**Solutions**:
- Check that webhook URLs are correctly set up
- Verify webhook secret is properly configured
- Check Stripe's webhook logs for delivery attempts
- Test webhooks using Stripe's webhook testing tool
- Verify Firebase functions are deployed and running

#### 5. Product/Price Sync Issues
**Problem**: Products or prices aren't appearing in Firestore.
**Solutions**:
- Verify the `stripe_products` collection exists in Firestore
- Check extension logs for sync errors
- Try manual sync from extension dashboard
- Check product/price IDs in your code match those in Stripe

### Advanced Troubleshooting

#### Payment Intent Debugging
```javascript
// Add this to your handleSubmit function for debugging
console.log('Payment Intent:', paymentIntent);
```

#### Webhook Verification Testing
```javascript
// Test webhook signature verification manually
const verifyWebhookSignature = (payload, signature, secret) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    console.log('Webhook verified:', event);
    return event;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    throw err;
  }
};
```

#### Logging for Subscription Events
```javascript
// Add to your subscription webhook handler
function handleSubscriptionWebhook(event) {
  const subscription = event.data.object;
  console.log('Subscription event:', event.type);
  console.log('Subscription ID:', subscription.id);
  console.log('Customer:', subscription.customer);
  console.log('Status:', subscription.status);
  // Handle the event based on type...
}
```

### Getting Help

If you encounter issues:

1. Check the browser console for detailed error messages
2. Review Firebase Functions logs (in Firebase console)
3. Check Stripe Dashboard logs and events
4. Use Stripe's testing tools in the Dashboard
5. Refer to these documentation resources:
   - [Stripe Elements Documentation](https://stripe.com/docs/stripe-js)
   - [Firebase Stripe Extension Documentation](https://firebase.google.com/docs/extensions/official/firestore-stripe-payments)
   - [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
   - [Stripe Testing Documentation](https://stripe.com/docs/testing)

For production issues, Stripe's support team is available to help with payment processing problems. Firebase also offers support for issues related to the Firebase Stripe extension.
