# Stripe Integration Testing Guide

This guide provides detailed instructions for testing the Stripe integration in the Shreyas Fitness Web application, with a special focus on the Buy Now Pay Later (BNPL) options.

## Prerequisites

Before testing, ensure the following is set up:

1. The Firebase Stripe extension is installed and properly configured
2. Stripe webhook endpoints are correctly set up
3. Environment variables are properly set in `.env.local` (for development) or via Firebase Config (for production)

## Testing Environment

All tests should first be performed in the Stripe test mode using test cards and credentials. Never test with real credit cards in development.

## Test Cases

### 1. One-time Payment Flow

Test the one-time payment flow for in-person training:

1. Navigate to the signup form
2. Fill in account information
3. Select "In-Person Training" tier
4. In the payment step, you should see the Payment Element with multiple payment options
5. Test with the following Stripe test cards:

   | Card Number | Description | Expected Result |
   |------------|-------------|-----------------|
   | 4242 4242 4242 4242 | Successful payment | Payment completes, user proceeds to confirmation step |
   | 4000 0000 0000 0002 | Generic decline | Error message displayed |
   | 4000 0000 0000 9995 | Insufficient funds | Error message displayed |
   | 4000 0000 0000 3220 | 3D Secure required | 3D Secure authentication prompt appears, then succeeds |

6. Verify in the Stripe Dashboard that payments are recorded correctly
7. Check that the user status in Firebase is updated correctly

### 2. Subscription Flow

Test the subscription flow for online coaching:

1. Navigate to the signup form
2. Fill in account information
3. Select "Online Coaching" tier
4. In the payment step, click "Subscribe Now"
5. Verify you are redirected to the Stripe Checkout page
6. Test with Stripe test cards (same as above)
7. After successful payment, verify you're redirected back to the success page
8. Check that the subscription is created in the Stripe Dashboard
9. Verify the user's subscription status is synced to Firebase

### 3. BNPL Options Testing

To test Buy Now, Pay Later options:

1. Ensure BNPL providers are enabled in your Stripe Dashboard
2. Test with higher-value products (BNPL options often only appear for transactions above certain amounts)
3. Use the following test credentials:

   #### Affirm
   - Use card number: 4500 0000 0000 0087
   - Any future expiry date
   - Any 3-digit CVC
   - Any 5-digit ZIP code

   #### Klarna
   - When redirected to Klarna:
     - Use phone number: 0000000000
     - Use OTP code: 123456
     - Complete the test

   #### Afterpay/Clearpay
   - Use the standard 4242 4242 4242 4242 test card
   - Any future expiry date
   - Any 3-digit CVC

4. Verify that the transaction completes successfully
5. Check that the payment is marked as completed in Stripe Dashboard
6. Confirm the user's status is updated correctly in Firebase

### 4. Combined Product Testing

Test the complete transformation package which includes both subscription and one-time fee components:

1. Navigate to the signup form
2. Fill in account information
3. Select "Complete Transformation" tier
4. Verify that both the monthly subscription amount and session fee are displayed
5. Click "Subscribe Now" and complete the checkout process
6. Verify both charges appear correctly in the Stripe Dashboard
7. Check that the user status in Firebase reflects the subscription

## Verifying Backend Integration

To ensure the backend Cloud Functions are working correctly:

1. Open your browser developer tools
2. Watch the network requests during the payment process
3. Check for successful API calls to the Cloud Functions
4. Examine any errors in the console logs
5. Verify webhook events are being received and processed

## BNPL Troubleshooting

If BNPL options don't appear as expected:

1. Use the `testBNPLAvailability()` utility function in the browser console:
   ```javascript
   import { testBNPLAvailability } from './src/react/signup/utils/stripeUtils';
   testBNPLAvailability();
   ```

2. Check that the transaction amount is above the minimum threshold for BNPL providers
   - Affirm: Typically $50+
   - Klarna: Typically $35+
   - Afterpay/Clearpay: Typically $35+

3. Verify your Stripe account is correctly configured for these payment methods

4. Check your Stripe Dashboard > Settings > Payment methods to ensure BNPL methods are enabled

## Database Verification

After successful payments, verify the following collections in Firebase:

1. `users` collection: User document should be updated with payment status
2. `stripe_customers/{userId}/subscriptions`: Should contain subscription data
3. `stripe_customers/{userId}/payment_methods`: Should list saved payment methods

## Going Live Checklist

Before moving to production:

- [ ] Replace test API keys with live keys
- [ ] Update webhook endpoints to production URLs
- [ ] Test the entire flow with small real transactions
- [ ] Verify webhook signatures are correctly validated
- [ ] Enable proper error logging and monitoring
