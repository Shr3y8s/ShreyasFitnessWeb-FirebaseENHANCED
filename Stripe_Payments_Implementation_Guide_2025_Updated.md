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
   - Description: "Expert 1-on-1 coaching sessions focused on technique, form, and effective workouts tailored to your unique goals. Includes personalized attention, form correction, and equipment guidance throughout each session. Available in Seattle area only."
   - Price: $70.00 / one time (select "Flat rate" from the pricing model dropdown)
   - Click "Save product"
4. **For Online Coaching:**
   - Name: "Online Coaching Subscription"
   - Description: "Complete transformation system with monthly custom training programs, personalized nutrition coaching, unlimited messaging support, weekly progress check-ins, video form analysis, and habit & accountability coaching. Delivered remotely for clients worldwide."
   - Price: $199.00 / monthly recurring
   - Click "Save product"
5. **For Complete Transformation:**
   - Name: "Complete Transformation Package"
   - Description: "Premium fitness experience combining comprehensive online coaching with hands-on personal training. Includes all online coaching benefits plus in-person training sessions with expert guidance and form correction. Online coaching available worldwide, in-person sessions in Seattle area only."
   - Price: $199.00 / monthly recurring
   - Click "Save product"
   - Click **+ Add another price**
   - Add a second price: $60.00 / one time (for the session fee)
6. **For 4-Pack Training Sessions:**
   - Name: "4-Pack Training Sessions"
   - Description: "Discounted package of 4 in-person training sessions at $60 each ($240 total). Expert 1-on-1 coaching with personalized attention, form correction, and equipment guidance throughout each session. Available in Seattle area only."
   - Price: $240.00 / one time (select "Flat rate" from the pricing model dropdown)
   - Click "Save product"

### Step 3: Configuring Buy Now, Pay Later (BNPL) Options

Modern e-commerce benefits from offering flexible payment options:

1. **Ensure BNPL options are enabled in your Stripe Dashboard:**
   - Verify that Klarna, Affirm, and other BNPL providers are active in your Stripe Dashboard
   - These will automatically appear as payment options when appropriate for the transaction

2. **Benefits of Third-Party BNPL:**
   - **Immediate full payment to you**: You receive the full amount upfront
   - **Zero risk management**: The BNPL provider handles collection and assumes all risk
   - **Modern customer experience**: Customers recognize and trust these payment options
   - **No custom development**: These providers integrate automatically with the latest Stripe libraries

3. **BNPL Market Growth:**
   - The global BNPL market is expected to reach $560.1 billion by 2025
   - Different providers are available in different regions (e.g., Klarna in Europe, Afterpay in Australia/US)
   - Customer demand for flexible payment options continues to grow year-over-year

4. **Important Note**: To ensure BNPL options appear for your customers, make sure your frontend integration uses the latest Stripe libraries as shown in the client-side integration section of this guide.

### Step 4: Get Your API Keys
1. In the Stripe dashboard, click on **Developers** in the left sidebar
2. Click on **API keys**
3. Note down your **Publishable key** (starts with `pk_test_`)
4. Click **Reveal test key** to see your **Secret key** (starts with `sk_test_`)
5. Keep these keys for later steps
6. **SECURITY BEST PRACTICE**: Never hardcode these keys in your frontend code. Always use environment variables.
7. **API VERSION NOTE**: As of August 2025, Stripe is using the `2025-07-30.basil` API version, which includes support for:
   - Checkout enhancements for app-to-web purchases
   - Enhanced support for NZ BECS Direct Debit and other regional payment methods
   - Mixed intervals support for subscriptions
   - New billing threshold capabilities

## PART 2: FIREBASE EXTENSION SETUP

### Step 1: Install the Firebase Stripe Extension
1. Go to your Firebase console at [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Click on **Extensions** in the left sidebar
4. Search for "Run Payments with Stripe"
5. **IMPORTANT**: Select the Invertase-maintained version of the extension (v0.3.12+)
   - Look for "Maintained by Invertase" in the extension details
   - The original Firebase-maintained version was deprecated in October 2023
   - The extension ID has changed from `stripe/firestore-stripe-payments` to `invertase/firestore-stripe-payments`
   - **If you have the old extension installed**, you must uninstall it completely before installing the Invertase version
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
6. **IMPORTANT**: For the best performance with Firebase Functions, use Firebase Functions 2nd gen:
   ```bash
   firebase init functions --gen2
   ```
   Benefits of Firebase Functions 2nd gen include:
   - Better cold start performance
   - Concurrent request handling (up to 1000 concurrent requests vs 1 in 1st gen)
   - Larger instance sizes (up to 16GiB RAM with 4 vCPU)
   - Built on Cloud Run for better scalability

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

For production deployments, create a separate `.env.production` file:

```
# .env.production
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Ensure all `.env` files are in `.gitignore`:
```bash
# Add all .env files to .gitignore
echo ".env*" >> .gitignore
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

# For production, use live keys
firebase functions:config:set stripe.key="sk_live_your_key" stripe.webhook="whsec_your_live_webhook" --project your-production-project

# Access in functions using:
# const stripe = require('stripe')(functions.config().stripe.key, {
#   apiVersion: '2025-07-30.basil'
# });
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

The latest versions as of August 2025 are:
- @stripe/react-stripe-js: v3.9.2 (published August 24, 2025)
- @stripe/stripe-js: Use @latest to ensure compatibility

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
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Note: Make sure to update to the latest Stripe library versions:
// npm install @stripe/stripe-js@latest @stripe/react-stripe-js@latest
// This ensures BNPL options like Affirm, Klarna, and Afterpay will appear when enabled

// Modern Stripe Elements appearance configuration
const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4caf50',
    colorBackground: '#ffffff',
    colorText: '#30313d',
    fontFamily: 'Roboto, system-ui, sans-serif',
    borderRadius: '8px',
    fontSizeBase: '16px',
    spacingUnit: '6px',
  },
  rules: {
    '.Input': {
      boxShadow: '0px 1px 1px rgba(0, 0, 0, 0.03)',
      border: '1px solid #e0e6eb',
    },
    '.Input:focus': {
      border: '1px solid #4f8cff',
    }
  }
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
          fullPrice: prices.find(
            p => !p.payment_schedule && p.recurring === getProductDetails().isSubscription
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
            
          const result = await createPaymentFn({
            price: priceInfo.fullPrice,
            automatic_payment_methods: { enabled: true },
            currency: 'usd'
          });
          
          setClientSecret(result.data.clientSecret);
        } catch (err) {
          setPaymentError('Could not create payment intent: ' + err.message);
        }
      })();
    }
  }, [stripe, priceInfo, auth.currentUser]);
  
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
    try {
      if (productDetails.isSubscription) {
        // SUBSCRIPTION FLOW: Use Stripe Checkout
        const functions = getFunctions();
        const createCheckoutSession = httpsCallable(
          functions, 
          'ext-firestore-stripe-payments-createCheckoutSession'
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
          client_reference_id: auth.currentUser.uid,
          customer_email: formData.email,
          // Do NOT specify payment_method_types to ensure all enabled payment methods appear
          // including BNPL options that are already active in your Stripe Dashboard
          allow_promotion_codes: true,
          metadata: {
            tier: formData.tier
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
   - Modern Payment Element with multiple payment options
   - Automatic appearance of any BNPL options you've enabled in your Stripe Dashboard
   - Appropriate UI based on the product type (subscription vs. one-time payment)

### Step 3: Test with Stripe Test Cards
Stripe's latest test cards for 2025:

| Card Number | Brand | Description |
|------------|-------|-------------|
| 4242 4242 4242 4242 | Visa | Succeeds |
| 4000 0000 0000 0002 | Visa | Declined (generic) |
| 4000 0000 0000 9995 | Visa | Declined (insufficient funds) |
| 5555 5555 5555 4444 | Mastercard | Succeeds |
| 3782 822463 10005 | American Express | Succeeds |
| 4000 0000 0000 3220 | Visa | 3D Secure authentication |

For all test cards:
- Use any valid future date for expiration
- Use any 3-digit CVC (4 digits for American Express)
- Use any 5-digit ZIP code

### Testing BNPL Payment Methods
When testing in development mode:
1. Use the Stripe test cards appropriate for each BNPL provider
2. For Affirm testing, use card 4500 0000 0000 0087
3. For Klarna testing, use details provided in the Stripe testing documentation
4. Verify that these options appear automatically in your Payment Element or Checkout
5. Note that some BNPL options may not appear for small transaction amounts

### Step 4: Verify Payment Processing
1. Complete a test payment
2. Check your Stripe dashboard under **Payments** to see the transaction
3. For subscriptions, verify the subscription was created under **Subscriptions**
4. Check Firebase Firestore to ensure customer and payment data was synced correctly

## PART 6: GOING LIVE

### Step 1: Switch to Live Mode
1. In your Stripe dashboard, toggle from **Test mode** to **Live mode**
2. Complete Stripe's account verification process
3. Get your live API keys (they start with `pk_live_` and `sk_live_`)

### Step 2: Update Environment Variables
1. Update your production environment variables with live keys
2. Update Firebase Functions configuration:
   ```bash
   firebase functions:config:set stripe.key="sk_live_..." --project your-production-project
   firebase functions:config:set stripe.webhook="whsec_live_..." --project your-production-project
   ```

### Step 3: Set Up Live Webhooks
1. Create new webhook endpoints for your production domain
2. Update webhook secrets in Firebase extension configuration
3. Test the live integration with small transactions

### Step 4: Security Checklist
- [ ] All API keys are in environment variables, never hardcoded
- [ ] Live webhook secrets are properly configured
- [ ] SSL certificates are valid for your domain
- [ ] Firestore security rules are properly configured
- [ ] Test all payment flows with real (small) transactions

## PART 7: TROUBLESHOOTING

### Common Issues and Solutions

#### Payment Element Not Loading
**Problem**: The Payment Element doesn't appear or shows an error
**Solutions**:
1. Check that your Stripe publishable key is correct
2. Verify you're using the latest Stripe libraries
3. Check browser console for JavaScript errors
4. Ensure your domain is added to your Stripe account settings

#### BNPL Options Not Appearing
**Problem**: Klarna, Affirm, or other BNPL options don't show up
**Solutions**:
1. Verify BNPL providers are enabled in your Stripe Dashboard
2. Ensure you're using the latest Stripe libraries (@stripe/react-stripe-js v3.9.2+)
3. Check that transaction amounts meet BNPL provider minimums
4. Verify customer location is supported by the BNPL provider
5. Don't restrict payment_method_types in your configuration

#### Subscription Creation Fails
**Problem**: Subscription payments fail or don't create properly
**Solutions**:
1. Check that your product and price IDs are correct
2. Verify the Firebase Stripe extension is properly configured
3. Check Firebase Functions logs for errors
4. Ensure webhook endpoints are receiving events

#### Firebase Extension Issues
**Problem**: The Stripe extension doesn't sync data properly
**Solutions**:
1. Verify you're using the Invertase-maintained version (v0.3.12+)
2. Check that webhook secrets match between Stripe and Firebase
3. Review Firebase Functions logs for extension errors
4. Ensure proper Firestore security rules

#### Environment Variable Issues
**Problem**: API keys or configuration not working
**Solutions**:
1. Verify all environment variables are properly set
2. Check that `.env` files are in the correct location
3. Restart your development server after changing environment variables
4. Ensure production environment variables are set on your hosting platform

### Debugging Tips
1. **Always check browser console** for JavaScript errors
2. **Monitor Stripe Dashboard** for payment events and webhooks
3. **Check Firebase Functions logs** for backend errors
4. **Use Stripe CLI** for local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/webhook
   ```

### Performance Optimization
1. **Lazy load Stripe**: Only load Stripe.js when needed
2. **Optimize Payment Element**: Use `appearance` options for faster loading
3. **Cache price data**: Store frequently accessed price information
4. **Use proper error boundaries**: Implement React error boundaries around payment components

### Security Best Practices
1. **Never log sensitive data**: Avoid logging payment method details
2. **Validate on server side**: Always validate payments server-side
3. **Use HTTPS everywhere**: Ensure all payment pages use SSL
4. **Regular security audits**: Keep dependencies updated and audit regularly

## Conclusion

You now have a complete, modern Stripe payment integration that:

- ✅ Supports multiple payment methods including BNPL options
- ✅ Uses the latest Stripe libraries and best practices
- ✅ Implements proper security measures
- ✅ Provides excellent user experience with modern UI
- ✅ Handles both subscription and one-time payments efficiently
- ✅ Is ready for production deployment

The integration automatically supports Klarna, Affirm, and other BNPL providers that are enabled in your Stripe Dashboard, giving your customers modern, flexible payment options while ensuring you receive full payment upfront with zero risk.

### Next Steps
1. Customize the styling to match your brand
2. Add additional payment confirmation emails
3. Implement customer dashboard for subscription management
4. Add analytics tracking for conversion optimization
5. Consider implementing promotional codes and discounts

For the most up-to-date information, always refer to the [official Stripe documentation](https://stripe.com/docs) and [Firebase Extensions documentation](https://firebase.google.com/docs/extensions).

---

*Last updated: August 2025 - Updated for latest Stripe API version 2025-07-30.basil and modern React patterns*
