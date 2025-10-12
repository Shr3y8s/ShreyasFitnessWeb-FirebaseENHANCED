# Stripe Payment Step Fix Summary

## Issues Fixed

### 1. Payment Step Skipping Issue

When selecting in-person training and signing up, the application was skipping the payment step and redirecting directly to the dashboard. This happened because:

1. User account was created in Firebase Auth before the payment step
2. The authentication state change triggered an immediate redirect to the dashboard
3. There was no coordination between React components and vanilla JS auth code to prevent this redirect

### 2. Product ID Mismatch Issue

The application was looking for products in Firestore using slug-based IDs (e.g., 'in-person-training') instead of the actual Stripe product IDs (e.g., 'prod_SuWBS7DHgehCQf'). This caused the payment step to get stuck loading when products were synced from Stripe.

## Files Modified

### 1. src/react/signup/SignupForm.jsx

- Added coordination with global `isSigningUp` flag through `window.safelySetSigningUp`
- Created a new `handlePaymentComplete` function to properly track payment completion
- Updated to only dispatch the signup success event after payment confirmation
- Added state tracking for payment completion

### 2. js/auth.js

- Exposed `safelySetSigningUp` function globally for React components
- Increased safety timeout from 8 to 20 seconds to accommodate payment step
- Added special handling for React-based signup flow
- Improved logging for better debugging
- Enhanced auth state change handler to avoid redirects during signup

### 3. src/react/signup/components/PaymentStep.jsx

- Added special handling for in-person training payment flow
- Created a custom UI specifically for in-person training
- Added flag to identify in-person training products
- Fixed payment completion flow
- **Updated product IDs to use actual Stripe IDs instead of slug-based IDs**
- **Added support for 4-Pack Training Sessions option**

### 4. src/react/signup/components/ConfirmationStep.jsx

- Updated UI to show "In-person payment at first session" for in-person training
- Customized payment plan display based on the selected tier
- Updated disclaimer text based on payment method

### 5. src/react/signup/components/ServiceTierStep.jsx

- **Added 4-Pack Training Sessions option to the service tier selection**

## Stripe Product ID Mapping

Updated the product ID mapping to use actual Stripe IDs:

- In-Person Training: `prod_SuWBS7DHgehCQf` (was 'in-person-training')
- Online Coaching: `prod_SuWDmYz8EIn7t9` (was 'online-coaching')
- Complete Transformation: `prod_SuWFGfEXRdRVSl` (was 'complete-transformation')
- 4-Pack Training Sessions: `prod_SuWblEiNNG5VkA` (newly added)

## How the Fix Works

1. When a user creates an account, the `isSigningUp` flag is set to `true`
2. This flag prevents automatic redirects from the auth state change listener
3. For in-person training:
   - A simplified payment form is shown that explains payment will be collected in person
   - The user can review and confirm their signup
   - The success event is only dispatched after confirmation, allowing proper redirect

4. For subscription services:
   - The user is still directed to Stripe Checkout for payment
   - Upon return from Stripe Checkout, the signup completion is handled

5. For product syncing:
   - The application now uses the correct Stripe product IDs when looking up products in Firestore
   - This ensures that when products are synced from Stripe to Firestore, they can be found by the application

## Testing Instructions

To verify the fix:

1. Test in-person training signup flow:
   - Select "In-Person Training"
   - Enter account details
   - Verify you see the payment step (not redirected to dashboard)
   - Confirm the simplified payment form appears
   - Complete signup and verify redirect works correctly

2. Test subscription-based signup flow (Online Coaching or Complete Transformation):
   - Complete account creation step
   - Verify redirection to Stripe Checkout
   - Complete payment and verify return to the site works correctly

3. Test 4-Pack Training Sessions signup flow:
   - Select "4-Pack Training Sessions"
   - Verify the payment step shows the correct amount ($240)
   - Complete payment and verify redirect works correctly

## Debugging Tips

- Check browser console for logs with "isSigningUp" to track redirect prevention
- Watch for log messages indicating the auth state changes during signup
- If product lookup issues persist, check that the Stripe products are properly synced to Firestore
- Verify the Stripe webhook is properly configured and receiving events
