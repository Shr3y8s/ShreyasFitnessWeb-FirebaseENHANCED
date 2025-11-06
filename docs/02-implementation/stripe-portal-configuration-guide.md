# Stripe Customer Portal Configuration Guide

This guide explains how to configure a restricted Stripe Customer Portal that only allows payment method updates (not subscription cancellations).

## Overview

The billing page uses a specialized Stripe Customer Portal configuration that restricts what customers can do. This prevents them from canceling subscriptions directly from the billing page while still allowing them to update their payment methods.

## Why Two Portal Configurations?

1. **Payment-Method-Only Portal** (Billing Page)
   - Used from: `/dashboard/client/billing`
   - Allows: Payment method updates only
   - Blocks: Subscription cancellation, plan changes, etc.
   - Purpose: Safe self-service for payment updates

2. **Full Portal** (Settings/Account Management)
   - Used from: Other pages (if needed)
   - Allows: Everything (subscriptions, payment methods, invoices)
   - Purpose: Complete account control

## Setup Instructions

### Step 1: Create Restricted Portal Configuration

1. Go to Stripe Dashboard: https://dashboard.stripe.com/test/settings/billing/portal

2. Click **"New configuration"** button

3. Configure the settings:

#### Customer Information
- ✅ Allow customers to update email address: **ON** (optional)

#### Payment Methods
- ✅ Allow customers to update payment methods: **ON** ✓
- Payment method types: Select the payment methods you accept

#### Subscriptions
- ❌ Allow customers to switch plans: **OFF** ✗
- ❌ Allow customers to cancel subscriptions: **OFF** ✗
- ❌ Allow customers to pause subscriptions: **OFF** ✗
- ❌ Allow customers to update quantities: **OFF** ✗

#### Invoices
- ✅ Provide customers with their invoice history: **ON** (optional)

4. Click **"Save configuration"**

5. **Copy the Configuration ID** - it will look like: `bpc_1ABC123...`

### Step 2: Add Configuration ID to Environment Variables

1. Open `firebase/functions/.env`

2. Add the configuration ID:
   ```bash
   STRIPE_PAYMENT_METHOD_PORTAL_CONFIG_ID=bpc_1ABC123...
   ```

3. Save the file

### Step 3: Deploy the Functions

Deploy the updated Cloud Functions with the new environment variable:

```bash
firebase deploy --only functions
```

Or deploy specific functions:
```bash
firebase deploy --only functions:createPaymentMethodPortalSession
```

## How It Works

### Code Flow

1. **Client clicks "Update Payment Method"** on billing page
2. **Frontend calls** `createPaymentMethodPortalSession` Cloud Function
3. **Function creates portal session** with restricted configuration:
   ```javascript
   const session = await stripe.billingPortal.sessions.create({
     customer: customerId,
     return_url: returnUrl,
     configuration: process.env.STRIPE_PAYMENT_METHOD_PORTAL_CONFIG_ID
   });
   ```
4. **Customer is redirected** to Stripe portal with limited access
5. **Customer updates payment method** and is returned to billing page
6. **Billing page refreshes** and shows updated payment method

### Fallback Behavior

If `STRIPE_PAYMENT_METHOD_PORTAL_CONFIG_ID` is not set:
- Portal opens with **default configuration** (full access)
- Customer can cancel subscriptions (not ideal for billing page)
- Still functional but less controlled

## Testing

### Test in Stripe Test Mode

1. Log in as a test customer
2. Go to billing page: `/dashboard/client/billing`
3. Click **"Update Payment Method"**
4. Verify you can:
   - ✅ Add new payment method
   - ✅ Update existing payment method
   - ✅ Remove old payment methods
5. Verify you CANNOT:
   - ❌ Cancel subscription
   - ❌ Change subscription plan
   - ❌ Pause subscription

### Test Different Configurations

Create multiple portal configurations for different use cases:

1. **Billing Page Configuration** (restricted)
   - ID: `bpc_billing_...`
   - Payment methods only

2. **Settings Page Configuration** (full access - if needed)
   - ID: `bpc_settings_...`
   - All features enabled

3. Switch between them by using different environment variables or function parameters

## Security Considerations

### Why Restrict Portal Access?

1. **Prevent Accidental Cancellations**
   - Customers might cancel thinking they're just updating payment
   - Reduces support tickets and confusion

2. **Controlled User Flow**
   - Billing page = payment updates only
   - Settings page = subscription management
   - Clear separation of concerns

3. **Business Logic Control**
   - You may want cancellations to go through your support team
   - Can offer retention incentives before cancellation

### Alternative: Full Access Portal

If you prefer to give customers full control:

1. Remove the `configuration` parameter from portal session creation
2. Portal will use your account's default configuration
3. Customers can manage everything themselves

## Troubleshooting

### Portal Opens But Can't Update Payment Method

**Cause**: Wrong configuration ID or configuration not saved properly

**Solution**: 
1. Verify configuration ID in Stripe Dashboard
2. Check it matches the ID in `.env` file
3. Redeploy functions: `firebase deploy --only functions`

### Portal Shows Subscription Cancellation Option

**Cause**: Configuration ID not being used (env variable not set)

**Solution**:
1. Check `firebase/functions/.env` has the correct ID
2. Verify environment variable is loaded in Cloud Function
3. Check Firebase Functions logs for configuration ID being used

### Portal Doesn't Open

**Cause**: Customer ID not found or function error

**Solution**:
1. Check browser console for errors
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify Stripe customer exists for the user

## Monitoring

### Check Portal Sessions

View portal sessions in Stripe Dashboard:
- https://dashboard.stripe.com/test/billing/portal/sessions

This shows:
- Which customers opened the portal
- What configuration was used
- What actions they took

### Firebase Function Logs

Monitor portal session creation:
```bash
firebase functions:log --only createPaymentMethodPortalSession
```

Look for log entries showing:
- Customer ID
- Configuration ID being used
- Portal URL generated
- Any errors

## Production Deployment

### Before Going Live

1. ✅ Create portal configuration in **live mode**: https://dashboard.stripe.com/settings/billing/portal
2. ✅ Copy live mode configuration ID
3. ✅ Add to production environment variables
4. ✅ Test with live mode customer
5. ✅ Verify restricted access works correctly

### Environment Variable Management

For multiple environments:

```bash
# firebase/functions/.env.development
STRIPE_PAYMENT_METHOD_PORTAL_CONFIG_ID=bpc_test_...

# firebase/functions/.env.production  
STRIPE_PAYMENT_METHOD_PORTAL_CONFIG_ID=bpc_...
```

Switch based on your deployment process.

## Additional Resources

- [Stripe Customer Portal Documentation](https://stripe.com/docs/billing/subscriptions/integrating-customer-portal)
- [Portal Configuration API](https://stripe.com/docs/api/customer_portal/configuration)
- [Customer Portal Sessions](https://stripe.com/docs/api/customer_portal/sessions)

## Summary

The restricted portal configuration ensures customers can safely update payment methods without risking accidental subscription cancellations. This provides a better user experience and reduces support overhead.

**Key Points:**
- ✅ One configuration ID for billing page (payment methods only)
- ✅ Add ID to `firebase/functions/.env`
- ✅ Deploy functions with updated environment
- ✅ Test thoroughly before going live
- ✅ Monitor portal sessions in Stripe Dashboard
