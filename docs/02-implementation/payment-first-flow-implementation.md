# Payment-First Flow Implementation Plan

## Date: October 26, 2025

## Problem Statement
Users are being created in Firebase Auth before payment succeeds, resulting in "ghost accounts" that have no payment attached. This is a security and data integrity issue.

---

## Solution: Payment-First Flow

### Industry Standard Approach
Only create user accounts AFTER successful payment confirmation via Stripe webhook.

---

## Implementation Steps

### Phase 1: Modify Signup Flow (Frontend)

#### Changes to `app/src/app/signup/page.tsx`:

**Current Flow:**
1. Service Tier Step
2. Account Info Step (creates Firebase Auth account)
3. Payment Step

**New Flow:**
1. Service Tier Step
2. Account Info Step (NO account creation, just data collection)
3. Payment Step → Stripe Checkout
4. Webhook creates account on payment success
5. Redirect to account setup page

#### Key Changes:
- Remove `createUserWithEmailAndPassword` from AccountInfoStep
- Store user data temporarily (session storage)
- Pass user data as metadata to Stripe Checkout
- Handle account creation in webhook

---

### Phase 2: Update Payment Step

#### Changes to `app/src/app/signup/components/PaymentStep.tsx`:

**Add metadata to checkout session:**
```typescript
const result = await createCheckoutSession({
  line_items: [...],
  customer_email: formData.email,
  metadata: {
    userName: formData.name,
    userEmail: formData.email,
    tierName: formData.tier?.name,
    tierId: formData.tier?.id,
    createAccount: 'true'  // Signal to webhook
  },
  success_url: `${window.location.origin}/account-setup?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${window.location.origin}/signup`
});
```

---

### Phase 3: Implement Webhook Account Creation

#### Changes to `firebase/functions/index.js`:

**Add new webhook handler:**
```javascript
exports.stripeWebhook = onRequest(async (req, res) => {
  const event = stripe.webhooks.constructEvent(...);
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      
      // Only create account if metadata flag is set
      if (session.metadata?.createAccount === 'true') {
        try {
          // Create Firebase Auth account
          const user = await admin.auth().createUser({
            email: session.metadata.userEmail,
            displayName: session.metadata.userName,
          });
          
          // Create Firestore user profile
          await admin.firestore().collection('users').doc(user.uid).set({
            email: session.metadata.userEmail,
            name: session.metadata.userName,
            tier: session.metadata.tierId,
            tierName: session.metadata.tierName,
            stripeCustomerId: session.customer,
            subscriptionId: session.subscription,
            paymentStatus: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdViaWebhook: true
          });
          
          // Generate password reset link for account setup
          const passwordSetupLink = await admin.auth()
            .generatePasswordResetLink(session.metadata.userEmail);
          
          // TODO: Send welcome email with password setup link
          logger.info('Account created successfully', {
            userId: user.uid,
            email: user.email
          });
          
        } catch (error) {
          logger.error('Failed to create account', { error });
          // Handle error - maybe retry or alert admin
        }
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      // Handle subscription cancellation
      const subscription = event.data.object;
      // Update user status in Firestore
      break;
    }
  }
  
  res.json({received: true});
});
```

---

### Phase 4: Create Account Setup Page

#### New file: `app/src/app/account-setup/page.tsx`

**Purpose:** Allow user to set password after payment

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function AccountSetup() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  
  useEffect(() => {
    // Verify session and get user email
    // Send password reset email
  }, [sessionId]);
  
  return (
    <div>
      <h1>Welcome! Your Account is Ready</h1>
      <p>Check your email ({email}) for a link to set your password.</p>
    </div>
  );
}
```

---

### Phase 5: Update Firestore Rules

#### Changes to `firestore.rules`:

```javascript
match /users/{userId} {
  // Only authenticated users can read their own data
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Webhook can write (from Firebase Functions)
  allow write: if request.auth != null && request.auth.token.admin == true;
}
```

---

## Migration Strategy

### Handling Existing Ghost Accounts:

**Option A: Delete All Existing Accounts**
- Clean slate
- Re-signup required
- Simplest approach

**Option B: Mark as Inactive**
- Add `needsPayment: true` flag
- Block dashboard access
- Allow payment retry

**Option C: Manual Review**
- Export list of accounts
- Check Stripe for payments
- Delete unpaid accounts

---

## Testing Plan

### Test Scenarios:

1. **Happy Path:**
   - Complete signup
   - Make payment
   - Verify account created
   - Set password
   - Login successful

2. **Failed Payment:**
   - Complete signup form
   - Payment fails
   - Verify NO account created
   - Can retry signup

3. **Abandoned Checkout:**
   - Complete signup form
   - Open Stripe Checkout
   - Close without paying
   - Verify NO account created

4. **Subscription Webhooks:**
   - Subscription created ✅
   - Subscription updated ✅
   - Subscription canceled ✅

---

## Rollout Plan

### Phase 1: Backend (Non-Breaking)
1. ✅ Add webhook account creation logic
2. ✅ Test with test mode payments
3. ✅ Verify accounts created correctly

### Phase 2: Frontend (Breaking)
1. ⚠️ Update signup flow (removes auth creation)
2. ⚠️ Add account setup page
3. ⚠️ Test thoroughly in dev

### Phase 3: Migration
1. Handle existing accounts
2. Notify any affected users
3. Deploy to production

---

## Rollback Plan

If issues arise:
1. Revert frontend changes
2. Keep webhook logic (backward compatible)
3. Monitor for errors
4. Fix and re-deploy

---

## Success Metrics

- ✅ Zero ghost accounts created
- ✅ 100% of paid users have accounts
- ✅ 0% of unpaid users have accounts
- ✅ Smooth user experience
- ✅ No support tickets about access issues

---

## Notes

- This matches Stripe's recommended architecture
- Firebase Stripe Extension supports this pattern
- Professional, production-ready solution
- Scales well for growing business
