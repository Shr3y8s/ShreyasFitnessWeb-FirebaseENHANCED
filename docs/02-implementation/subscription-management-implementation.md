# Subscription Management Implementation Specification
**Date:** December 27, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

---

## Executive Summary

This document specifies the implementation of custom subscription management functions (cancel, pause, resume) for the fitness app. We are building custom Cloud Functions instead of using Stripe's Customer Portal to provide consistent UX and better retention opportunities.

**Key Decisions:**
- ✅ All custom functions (no Stripe Portal for subscription management)
- ✅ Cancel: At period end only (keeps access until billing date)
- ✅ Pause: 1, 2, or 3 month options (blocks app access during pause)
- ✅ Resume: Manual before scheduled date
- ❌ Delete Account: Not at launch (handle manually via email for GDPR/CCPA compliance)

**Estimated Implementation Time:** ~2 hours
- Cancel: 30 minutes
- Pause: 45 minutes  
- Resume: 20 minutes
- UI Integration: 25 minutes

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Data Structure](#2-data-structure)
3. [Business Logic Rules](#3-business-logic-rules)
4. [Cloud Functions Specifications](#4-cloud-functions-specifications)
5. [Frontend Integration](#5-frontend-integration)
6. [Security & Validation](#6-security--validation)
7. [Error Handling](#7-error-handling)
8. [Legal Compliance](#8-legal-compliance)
9. [Testing Strategy](#9-testing-strategy)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Architecture Overview

### 1.1 System Flow

```
User Action (Frontend)
    ↓
Firebase Callable Function
    ↓
Validate User & Subscription
    ↓
Update Stripe (via API)
    ↓
Update Firestore
    ↓
Trigger Stripe Webhook
    ↓
Sync via syncSubscriptionToUser
    ↓
Return Success to Frontend
    ↓
Update UI
```

### 1.2 Components

**Cloud Functions (firebase/functions/index.js):**
- `cancelSubscription` - Cancel at period end
- `pauseSubscription` - Pause for 1-3 months
- `resumeSubscription` - Resume early from pause

**Existing Triggers (already working):**
- `syncSubscriptionToUser` - Syncs Stripe Extension updates to users collection

**Frontend (app/src/):**
- `lib/subscription-api.ts` - API wrapper functions
- `app/dashboard/client/membership/page.tsx` - UI
- Dialog components for each action

**Firestore Collections:**
- `users/{userId}` - User subscription data
- `stripe_customers/{userId}` - Stripe Extension managed
- `stripe_customers/{userId}/subscriptions/{subId}` - Stripe Extension managed

---

## 2. Data Structure

### 2.1 Firestore Schema

#### users/{userId}

**Existing Fields:**
```typescript
{
  // Basic
  name: string;
  email: string;
  createdAt: Timestamp;
  
  // Subscription (existing)
  subscriptionId: string;              // "sub_1ABC..."
  subscriptionStatus: string;          // "active" | "paused" | "canceled"
  tier: string;                        // "prod_123..." (product ID)
  tierName: string;                    // "Online Coaching"
}
```

**New Fields to Add:**
```typescript
{
  // Pause tracking
  pausedAt: Timestamp | null;          // When pause was initiated
  pausedUntil: Timestamp | null;       // When to auto-resume
  
  // Cancellation tracking  
  canceledAt: Timestamp | null;        // When cancellation was requested
  cancelAtPeriodEnd: boolean | null;   // Stripe subscription flag
}
```

### 2.2 stripe_customers/{userId}

**Fields (Managed by Stripe Extension):**
```typescript
{
  stripeId: string;                    // "cus_123..."
  email: string;
  stripeLink: string;                  // Dashboard link
}
```

### 2.3 stripe_customers/{userId}/subscriptions/{subscriptionId}

**Fields (Managed by Stripe Extension):**
```typescript
{
  // Stripe subscription object
  // Auto-updated by webhooks
  // Triggers syncSubscriptionToUser when changed
}
```

---

## 3. Business Logic Rules

### 3.1 Cancel Subscription

**Behavior:**
- Cancel at period end ONLY (not immediate)
- User keeps access until `current_period_end`
- Billing stops after current period
- Can reactivate anytime before period ends

**Allowed States:**
- ✅ Can cancel from: `active`
- ✅ Can cancel from: `paused` (also cancels at period end)
- ❌ Cannot cancel: Already `canceled`

**After Cancellation:**
- `subscriptionStatus` → stays "active" until period end, then "canceled"
- `cancelAtPeriodEnd` → true
- `canceledAt` → current timestamp
- Access continues until `current_period_end`

### 3.2 Pause Subscription

**Behavior:**
- Pause for fixed duration: 1, 2, or 3 months
- Block app access immediately
- Auto-resume on scheduled date
- Billing stops during pause
- Can resume early manually

**Allowed States:**
- ✅ Can pause from: `active`
- ❌ Cannot pause: Already `paused`
- ❌ Cannot pause: `canceled`

**Duration Rules:**
- Minimum: 1 month
- Maximum: 3 months
- No longer durations (fitness psychology: >3 months = churned)

**After Pause:**
- `subscriptionStatus` → "paused"
- `pausedAt` → current timestamp
- `pausedUntil` → calculated resume date
- Access blocked immediately
- Stripe: `pause_collection.behavior = 'mark_uncollectible'`

### 3.3 Resume Subscription

**Behavior:**
- Resume before scheduled date
- Billing restarts immediately
- Full access restored
- Clears pause timestamps

**Allowed States:**
- ✅ Can resume from: `paused`
- ❌ Cannot resume: `active` (already active)
- ❌ Cannot resume: `canceled`

**After Resume:**
- `subscriptionStatus` → "active"
- `pausedAt` → deleted
- `pausedUntil` → deleted
- Billing starts on resume date
- Stripe: `pause_collection = null`

### 3.4 Delete Account (Future)

**Not Implemented at Launch:**
- Handle manually via email initially
- GDPR/CCPA: 30-45 day window to comply
- Privacy Policy states: "Email us to delete"

**When Implemented:**
- Must cancel subscription first (or auto-cancel)
- Anonymize Stripe customer (not delete)
- Delete Firebase Auth + Firestore
- Delete Storage (progress photos)
- Keep transaction records (legal requirement)

---

## 4. Cloud Functions Specifications

### 4.1 cancelSubscription

**Location:** `firebase/functions/index.js`

**Function Signature:**
```javascript
exports.cancelSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  // Implementation
});
```

**Input Parameters:**
```typescript
{
  reason?: string;  // Optional cancellation reason
}
```

**Implementation Steps:**
1. Verify authentication (`request.auth`)
2. Get user document from Firestore
3. Verify subscription exists (`subscriptionId`)
4. Update Stripe subscription:
   ```javascript
   await stripe.subscriptions.update(subscriptionId, {
     cancel_at_period_end: true
   });
   ```
5. Update Firestore users document:
   ```javascript
   await admin.firestore().collection('users').doc(userId).update({
     cancelAtPeriodEnd: true,
     canceledAt: admin.firestore.FieldValue.serverTimestamp()
   });
   ```
6. Log action
7. Return success with `accessUntil` date

**Return Value:**
```typescript
{
  success: true,
  message: "Subscription canceled successfully",
  accessUntil: "2025-01-31T00:00:00.000Z"
}
```

**Error Cases:**
- `unauthenticated` - Not logged in
- `not-found` - User not found
- `failed-precondition` - No active subscription
- `internal` - Stripe API error

### 4.2 pauseSubscription

**Function Signature:**
```javascript
exports.pauseSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  // Implementation
});
```

**Input Parameters:**
```typescript
{
  duration: 1 | 2 | 3;  // Months
  reason?: string;       // Optional reason
}
```

**Implementation Steps:**
1. Verify authentication
2. Validate duration (must be 1, 2, or 3)
3. Get user document
4. Verify subscription exists and is `active`
5. Calculate resume date:
   ```javascript
   const pauseUntil = new Date();
   pauseUntil.setMonth(pauseUntil.getMonth() + duration);
   const resumeTimestamp = Math.floor(pauseUntil.getTime() / 1000);
   ```
6. Update Stripe subscription:
   ```javascript
   await stripe.subscriptions.update(subscriptionId, {
     pause_collection: {
       behavior: 'mark_uncollectible',
       resumes_at: resumeTimestamp
     }
   });
   ```
7. Update Firestore:
   ```javascript
   await admin.firestore().collection('users').doc(userId).update({
     subscriptionStatus: 'paused',
     pausedAt: admin.firestore.FieldValue.serverTimestamp(),
     pausedUntil: admin.firestore.Timestamp.fromDate(pauseUntil)
   });
   ```
8. Return success with resume date

**Return Value:**
```typescript
{
  success: true,
  message: "Subscription paused successfully",
  resumesAt: "2025-03-27T00:00:00.000Z"
}
```

**Error Cases:**
- `invalid-argument` - Duration not 1, 2, or 3
- `failed-precondition` - Already paused or no subscription
- `internal` - Stripe API error

### 4.3 resumeSubscription

**Function Signature:**
```javascript
exports.resumeSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  // Implementation
});
```

**Input Parameters:**
```typescript
{} // No parameters needed
```

**Implementation Steps:**
1. Verify authentication
2. Get user document
3. Verify subscription is `paused`
4. Update Stripe subscription:
   ```javascript
   await stripe.subscriptions.update(subscriptionId, {
     pause_collection: null
   });
   ```
5. Update Firestore:
   ```javascript
   await admin.firestore().collection('users').doc(userId).update({
     subscriptionStatus: 'active',
     pausedAt: admin.firestore.FieldValue.delete(),
     pausedUntil: admin.firestore.FieldValue.delete()
   });
   ```
6. Return success

**Return Value:**
```typescript
{
  success: true,
  message: "Subscription resumed successfully"
}
```

**Error Cases:**
- `failed-precondition` - Not paused or no subscription
- `internal` - Stripe API error

---

## 5. Frontend Integration

### 5.1 API Wrapper (lib/subscription-api.ts)

**Create New File:**
```typescript
// app/src/lib/subscription-api.ts

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface CancelSubscriptionData {
  reason?: string;
}

export interface PauseSubscriptionData {
  duration: 1 | 2 | 3;
  reason?: string;
}

export const cancelSubscription = async (data: CancelSubscriptionData) => {
  const cancelFn = httpsCallable(functions, 'cancelSubscription');
  try {
    const result = await cancelFn(data);
    return { success: true, data: result.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to cancel subscription' 
    };
  }
};

export const pauseSubscription = async (data: PauseSubscriptionData) => {
  const pauseFn = httpsCallable(functions, 'pauseSubscription');
  try {
    const result = await pauseFn(data);
    return { success: true, data: result.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to pause subscription' 
    };
  }
};

export const resumeSubscription = async () => {
  const resumeFn = httpsCallable(functions, 'resumeSubscription');
  try {
    const result = await resumeFn({});
    return { success: true, data: result.data };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to resume subscription' 
    };
  }
};
```

### 5.2 Usage in Membership Page

**Button Handlers:**
```typescript
// In app/src/app/dashboard/client/membership/page.tsx

const handleCancelSubscription = async (reason?: string) => {
  setIsLoading(true);
  
  const result = await cancelSubscription({ reason });
  
  if (result.success) {
    toast.success('Subscription canceled successfully');
    // Refresh user data
    await refreshUserData();
  } else {
    toast.error(result.error);
  }
  
  setIsLoading(false);
  setShowCancelDialog(false);
};

const handlePauseSubscription = async (duration: 1 | 2 | 3, reason?: string) => {
  setIsLoading(true);
  
  const result = await pauseSubscription({ duration, reason });
  
  if (result.success) {
    toast.success(`Subscription paused for ${duration} month(s)`);
    await refreshUserData();
  } else {
    toast.error(result.error);
  }
  
  setIsLoading(false);
  setShowPauseDialog(false);
};

const handleResumeSubscription = async () => {
  setIsLoading(true);
  
  const result = await resumeSubscription();
  
  if (result.success) {
    toast.success('Subscription resumed successfully');
    await refreshUserData();
  } else {
    toast.error(result.error);
  }
  
  setIsLoading(false);
  setShowResumeDialog(false);
};
```

---

## 6. Security & Validation

### 6.1 Authentication

**All functions must verify:**
```javascript
if (!request.auth) {
  throw new functions.https.HttpsError(
    'unauthenticated', 
    'User must be authenticated'
  );
}
```

### 6.2 Ownership Validation

**Verify user owns the subscription:**
```javascript
const userDoc = await admin.firestore()
  .collection('users')
  .doc(request.auth.uid)
  .get();

if (!userDoc.exists) {
  throw new functions.https.HttpsError('not-found', 'User not found');
}

const userData = userDoc.data();
if (!userData.subscriptionId) {
  throw new functions.https.HttpsError(
    'failed-precondition', 
    'No active subscription'
  );
}
```

### 6.3 State Validation

**Pause - Can only pause from active:**
```javascript
if (userData.subscriptionStatus !== 'active') {
  throw new functions.https.HttpsError(
    'failed-precondition',
    `Cannot pause subscription with status: ${userData.subscriptionStatus}`
  );
}
```

**Resume - Can only resume from paused:**
```javascript
if (userData.subscriptionStatus !== 'paused') {
  throw new functions.https.HttpsError(
    'failed-precondition',
    'Subscription is not paused'
  );
}
```

### 6.4 Input Validation

**Pause duration:**
```javascript
if (![1, 2, 3].includes(duration)) {
  throw new functions.https.HttpsError(
    'invalid-argument',
    'Duration must be 1, 2, or 3 months'
  );
}
```

---

## 7. Error Handling

### 7.1 Error Code Mapping

| Stripe Error | Function Error | User Message |
|--------------|----------------|--------------|
| `resource_missing` | `not-found` | "Subscription not found" |
| `invalid_request` | `invalid-argument` | "Invalid request. Please try again" |
| `authentication_error` | `internal` | "Payment system error. Contact support" |
| `rate_limit` | `resource-exhausted` | "Too many requests. Wait a moment" |

### 7.2 Logging Strategy

**Log all operations:**
```javascript
logger.info('Subscription action', {
  userId: userId,
  action: 'pause',
  subscriptionId: subscriptionId,
  duration: duration,
  timestamp: new Date().toISOString()
});
```

**Log errors with context:**
```javascript
logger.error('Failed to pause subscription', {
  error: error.message,
  stack: error.stack,
  userId: userId,
  subscriptionId: subscriptionId
});
```

### 7.3 Retry Logic

**Firestore updates:**
- Use transactions for critical updates
- Automatic retry by Firebase SDK

**Stripe API calls:**
- Stripe SDK handles retries automatically
- Exponential backoff built-in

---

## 8. Legal Compliance

### 8.1 GDPR/CCPA Requirements

**What We Must Allow:**
- ✅ Data deletion requests
- ✅ Data export (future)
- ✅ Account closure

**Timeline:**
- GDPR: 30 days to comply
- CCPA: 45 days to comply

### 8.2 Launch Strategy (Account Deletion)

**Phase 1: Manual Handling (Launch)**
- Privacy Policy states: "Email support@shrey.fit to delete account"
- Handle requests manually
- Process: Cancel subscription + delete manually
- Estimated: <1% of users request deletion

**Phase 2: Automated (Month 3-6)**
- Build automated deletion function
- 7-day grace period
- Email confirmation flow
- Complete anonymization

### 8.3 Data Retention

**Must Keep (Legal):**
- ✅ Transaction records (7+ years for tax)
- ✅ Invoice data
- ✅ Payment amounts
- ✅ Anonymized analytics

**Must Delete:**
- ❌ Email, name, phone (PII)
- ❌ Progress photos
- ❌ Workout history
- ❌ Messages

**Stripe Customer Handling:**
```javascript
// Don't delete, anonymize:
await stripe.customers.update(customerId, {
  email: `deleted-${Date.now()}@example.com`,
  name: 'Deleted User',
  phone: '',
  address: null,
  description: `Account deleted on ${new Date().toISOString()}`
});
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Test Each Function:**
```javascript
// Test cancel
describe('cancelSubscription', () => {
  test('cancels active subscription', async () => {
    // Mock Stripe
    // Mock Firestore
    // Call function
    // Verify updates
  });
  
  test('rejects if not authenticated', async () => {
    // Call without auth
    // Expect error
  });
  
  test('rejects if no subscription', async () => {
    // Mock user without subscription
    // Expect error
  });
});
```

### 9.2 Integration Tests

**Test Complete Flows:**
1. **Happy Path:**
   - Active → Pause → Resume → Cancel
   - Verify all state transitions
   - Verify Firestore updates
   - Verify Stripe updates

2. **Error Cases:**
   - Pause when already paused
   - Resume when not paused
   - Cancel when already canceled

3. **Webhook Sync:**
   - Trigger action
   - Wait for webhook
   - Verify syncSubscriptionToUser fires
   - Verify final state matches

### 9.3 E2E Tests

**User Journey Tests:**
```typescript
test('User pauses subscription for 2 months', async () => {
  // 1. Login as test user
  // 2. Navigate to membership page
  // 3. Click "Pause Subscription"
  // 4. Select 2 months
  // 5. Confirm
  // 6. Verify success message
  // 7. Verify status shows "Paused"
  // 8. Verify resume date displayed
  // 9. Try to access restricted feature
  // 10. Verify blocked
});
```

### 9.4 Test Data

**Stripe Test Mode:**
- Use test credit card: `4242 4242 4242 4242`
- Test subscription: Create via Stripe Dashboard
- Test webhooks: Use Stripe CLI for local testing

**Firebase Emulators:**
```bash
firebase emulators:start --only functions,firestore,auth
```

---

## 10. Future Enhancements

### 10.1 Phase 2 Features (Post-Launch)

**1. Retention Offers:**
- Show discount before cancellation
- "Stay for 50% off next 3 months"
- A/B test different offers

**2. Cancellation Surveys:**
- "Why are you leaving?" form
- Track cancellation reasons
- Analytics for churn analysis

**3. Win-back Campaigns:**
- Email 30 days after cancellation
- "We miss you" offers
- Re-engagement discounts

**4. Automated Account Deletion:**
- Self-service deletion flow
- 7-day grace period
- Email confirmation
- Data export before deletion

**5. Custom Domain for Portal:**
- `portal.shrey.fit` instead of `billing.stripe.com`
- Better branding
- DNS setup via Stripe Dashboard

### 10.2 Analytics to Track

**Metrics:**
- Cancellation rate by month
- Pause rate by duration (1 vs 2 vs 3 months)
- Resume rate (before scheduled date)
- Cancellation reasons distribution
- Time to churn after cancellation
- Reactivation rate

**Dashboards:**
- Subscription health overview
- Churn funnel
- Retention campaign effectiveness

### 10.3 Performance Optimization

**1. Caching:**
- Cache subscription status in frontend
- Reduce Firestore reads
- Update on action only

**2. Batch Operations:**
- If implementing for multiple users (admin tools)
- Use Firestore batch writes
- Use Stripe bulk API

**3. Webhook Processing:**
- Add idempotency keys
- Handle duplicate events
- Queue for retry on failure

---

## Appendix A: Stripe API Reference

### Subscription Update (Pause)
```javascript
stripe.subscriptions.update('sub_123', {
  pause_collection: {
    behavior: 'mark_uncollectible',  // Don't retry failed payments
    resumes_at: 1704067200           // Unix timestamp
  }
});
```

### Subscription Update (Resume)
```javascript
stripe.subscriptions.update('sub_123', {
  pause_collection: null  // Clear pause
});
```

### Subscription Update (Cancel)
```javascript
stripe.subscriptions.update('sub_123', {
  cancel_at_period_end: true
});
```

---

## Appendix B: Firestore Security Rules

**Ensure users can only read their own data:**
```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false;  // Only Cloud Functions can write
}
```

**Stripe collections (managed by extension):**
```javascript
match /stripe_customers/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false;  // Only Stripe Extension
}
```

---

## Appendix C: Environment Variables

**Required Secrets:**
```bash
firebase functions:secrets:set STRIPE_KEY
# Paste secret key when prompted
```

**Required Config:**
```javascript
// firebase/functions/firebase-config.json
{
  "region": "us-east4"
}
```

---

## Implementation Checklist

- [ ] Create `cancelSubscription` Cloud Function
- [ ] Create `pauseSubscription` Cloud Function
- [ ] Create `resumeSubscription` Cloud Function
- [ ] Add new Firestore fields to users collection
- [ ] Create `lib/subscription-api.ts` wrapper
- [ ] Add cancel dialog to membership page
- [ ] Add pause dialog to membership page
- [ ] Add resume button for paused state
- [ ] Test cancel flow end-to-end
- [ ] Test pause flow end-to-end
- [ ] Test resume flow end-to-end
- [ ] Verify webhook sync works
- [ ] Test error cases
- [ ] Update Privacy Policy (manual deletion option)
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Track metrics in Analytics

---

**Document Version:** 1.0  
**Last Updated:** December 27, 2025  
**Next Review:** After implementation testing
