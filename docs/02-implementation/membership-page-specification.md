# Membership Page Specification
**Date:** December 27, 2025  
**Version:** 1.0  
**Route:** `/dashboard/client/membership`

---

## Overview

The Membership page consolidates membership status, subscription management, and account deletion into a single unified interface. It dynamically adapts to display relevant content based on whether the client has a subscription or is session-only.

---

## Table of Contents

1. [Page Structure](#page-structure)
2. [Component Breakdown](#component-breakdown)
3. [Conditional Rendering Logic](#conditional-rendering-logic)
4. [Data Requirements](#data-requirements)
5. [User Interactions](#user-interactions)
6. [Technical Implementation](#technical-implementation)
7. [UI/UX Specifications](#uiux-specifications)
8. [Error Handling](#error-handling)
9. [Testing Requirements](#testing-requirements)

---

## 1. Page Structure

### Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Breadcrumb: Dashboard > Membership                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Page Title: Your Membership]                       │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ SECTION 1: Membership Overview              │   │
│ │ (Always shown - content varies by type)     │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ SECTION 2: Subscription Management          │   │
│ │ (Conditional - subscription clients only)   │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ SECTION 3: Upgrade Prompt                   │   │
│ │ (Conditional - session-only clients)        │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ SECTION 4: Danger Zone (Account Deletion)   │   │
│ │ (Always shown at bottom)                    │   │
│ └─────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 MembershipOverview Component

**Purpose:** Display current membership status and benefits

**Props:**
```typescript
interface MembershipOverviewProps {
  membershipType: 'subscription' | 'session-only';
  userData: {
    name: string;
    email: string;
    subscriptionTier?: string;
    subscriptionStatus?: 'active' | 'paused' | 'canceled' | 'past_due';
    currentPeriodEnd?: Timestamp;
    memberSince?: Timestamp;
    sessionBalance?: {
      available: number;
      purchased: number;
      used: number;
    };
  };
  subscription?: {
    planName: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    benefits: string[];
  };
}
```

**Rendering Logic:**
- If `membershipType === 'subscription'`: Show subscription card
- If `membershipType === 'session-only'`: Show session-only card

---

### 2.2 SubscriptionManagement Component

**Purpose:** Manage subscription (pause/cancel/resume)

**Props:**
```typescript
interface SubscriptionManagementProps {
  subscriptionStatus: 'active' | 'paused' | 'canceled' | 'past_due';
  subscription: {
    id: string;
    planName: string;
    currentPeriodEnd: Timestamp;
    cancelAtPeriodEnd: boolean;
    pausedUntil?: Timestamp;
  };
  onPause: (duration: 1 | 2 | 3, reason?: string) => Promise<void>;
  onCancel: (reason?: string) => Promise<void>;
  onResume: () => Promise<void>;
}
```

**Display States:**
1. **Active Subscription:**
   - Show "Pause Subscription" button
   - Show "Cancel Subscription" button
   - Display next billing date

2. **Paused Subscription:**
   - Show "Resume Subscription" button
   - Display resume date
   - Show paused badge

3. **Canceled Subscription:**
   - Show "Subscription Canceled" message
   - Display access end date
   - Show "Reactivate" button (if within grace period)

---

### 2.3 SubscriptionHistory Component

**Purpose:** Display subscription timeline

**Props:**
```typescript
interface SubscriptionHistoryProps {
  history: Array<{
    action: 'created' | 'upgraded' | 'downgraded' | 'paused' | 'resumed' | 'canceled';
    date: Timestamp;
    reason?: string;
    by: 'client' | 'admin' | 'system';
    details?: any;
  }>;
}
```

**Display:**
- Timeline view (most recent first)
- Icon for each action type
- Formatted date
- Action description
- Optional reason

---

### 2.4 UpgradePrompt Component

**Purpose:** Encourage session-only clients to upgrade

**Props:**
```typescript
interface UpgradePromptProps {
  currentSessionBalance: number;
  onContactTrainer: () => void;
}
```

**Content:**
- Benefits comparison table (session-only vs subscription)
- "Upgrade to Subscription" CTA
- Link to contact trainer

---

### 2.5 DangerZone Component

**Purpose:** Account deletion workflow

**Props:**
```typescript
interface DangerZoneProps {
  hasActiveSubscription: boolean;
  onDeleteAccount: (password: string) => Promise<void>;
}
```

**States:**
1. **Initial:** Show "Delete Account" button
2. **Confirmation Modal:** Password verification + type "DELETE"
3. **Pre-deletion checks:** Active subscription warning
4. **Processing:** Loading state
5. **Success:** Confirmation message before redirect

---

## 3. Conditional Rendering Logic

### Membership Type Determination

```typescript
function determineMembershipType(userData: any): 'subscription' | 'session-only' {
  // Has active, paused, or recently canceled subscription
  if (userData?.stripeSubscriptionId) {
    const status = userData.subscriptionStatus;
    if (status === 'active' || status === 'paused') {
      return 'subscription';
    }
    
    // If canceled, check if still within access period
    if (status === 'canceled' && userData.currentPeriodEnd) {
      const now = new Date();
      const periodEnd = userData.currentPeriodEnd.toDate();
      if (periodEnd > now) {
        return 'subscription'; // Still has access
      }
    }
  }
  
  // Default to session-only
  return 'session-only';
}
```

### Section Visibility Matrix

| Section | Subscription Client | Session-Only Client |
|---------|-------------------|-------------------|
| Membership Overview | ✅ Show subscription card | ✅ Show session-only card |
| Subscription Management | ✅ Show | ❌ Hide |
| Subscription History | ✅ Show (if has history) | ❌ Hide |
| Upgrade Prompt | ❌ Hide | ✅ Show |
| Danger Zone | ✅ Show (with subscription warning) | ✅ Show (direct deletion) |

---

## 4. Data Requirements

### Firestore Data Structure

```typescript
// Required fields in users/{userId}
interface UserMembershipData {
  // Basic Info
  name: string;
  email: string;
  createdAt: Timestamp;
  
  // Subscription Info (if applicable)
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'paused' | 'canceled' | 'past_due';
  subscriptionTier?: string;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  cancelAtPeriodEnd?: boolean;
  pausedUntil?: Timestamp;
  
  // Subscription History
  subscription?: {
    history: Array<{
      action: string;
      date: Timestamp;
      reason?: string;
      by: string;
      details?: any;
    }>;
  };
  
  // Session Balance
  sessionBalance?: {
    available: number;
    purchased: number;
    used: number;
    expired: number;
  };
}
```

### Stripe Data Fetch

**Required Stripe Data:**
- Subscription details (plan, price, interval)
- Next invoice date and amount
- Payment method (for validation)
- Subscription benefits (from product metadata)

**Cloud Function:** `getSubscriptionDetails`
```typescript
exports.getSubscriptionDetails = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Get Stripe customer ID
  // 3. Fetch subscription from Stripe
  // 4. Fetch upcoming invoice
  // 5. Return combined data
});
```

---

## 5. User Interactions

### 5.1 Pause Subscription Flow

**Trigger:** User clicks "Pause Subscription" button

**Steps:**
1. Open pause modal
2. Display pause duration options (1, 2, or 3 months)
3. Optional: Select reason (dropdown)
4. Show confirmation with dates
5. User confirms
6. Call Cloud Function `pauseSubscription`
7. Show success message
8. Update UI with paused state
9. Send confirmation email

**Modal UI:**
```
┌─────────────────────────────────────────┐
│ Pause Your Subscription                 │
│                                          │
│ How long would you like to pause?       │
│                                          │
│ ○ 1 month (resumes Feb 27, 2025)       │
│ ○ 2 months (resumes Mar 27, 2025)      │
│ ○ 3 months (resumes Apr 27, 2025)      │
│                                          │
│ Reason (optional):                       │
│ [Dropdown: Vacation, Medical, etc.]     │
│                                          │
│ During pause:                            │
│ • No charges will be made                │
│ • Access continues until Jan 31          │
│ • Resumes automatically on selected date │
│                                          │
│ [Cancel] [Confirm Pause]                │
└─────────────────────────────────────────┘
```

---

### 5.2 Cancel Subscription Flow

**Trigger:** User clicks "Cancel Subscription" button

**Steps:**
1. Open retention modal ("Are you sure?")
2. Show benefits of staying
3. Offer pause as alternative
4. User confirms they want to cancel
5. Open consequences modal
6. Display what happens (access until period end, no refund)
7. Require typing "CANCEL" to confirm
8. Call Cloud Function `cancelSubscription`
9. Show success message
10. Update UI with canceled state
11. Send confirmation email

**Retention Modal:**
```
┌─────────────────────────────────────────┐
│ Before you go...                         │
│                                          │
│ You'll lose access to:                   │
│ ✗ Unlimited workout programs             │
│ ✗ Custom nutrition plans                 │
│ ✗ Weekly coach check-ins                 │
│ ✗ Priority scheduling                    │
│                                          │
│ Consider pausing instead?                │
│ Take a break without losing your plan.   │
│                                          │
│ [Pause Subscription]                     │
│ [No, Cancel My Subscription]            │
└─────────────────────────────────────────┘
```

**Consequences Modal:**
```
┌─────────────────────────────────────────┐
│ Cancel Subscription                      │
│                                          │
│ Your subscription will be canceled at    │
│ the end of your current billing period:  │
│                                          │
│ Access Until: January 31, 2025           │
│                                          │
│ Important:                               │
│ • No refunds for partial months          │
│ • Your data will be retained             │
│ • Session credits remain valid           │
│ • You can resubscribe anytime            │
│                                          │
│ Type CANCEL to confirm:                  │
│ [Text Input]                             │
│                                          │
│ [Go Back] [Cancel Subscription]         │
└─────────────────────────────────────────┘
```

---

### 5.3 Resume Subscription Flow

**Trigger:** User clicks "Resume Subscription" button (on paused subscription)

**Steps:**
1. Open confirmation modal
2. Show resume details (billing restarts immediately)
3. User confirms
4. Call Cloud Function `resumeSubscription`
5. Show success message
6. Update UI with active state
7. Send confirmation email

**Modal UI:**
```
┌─────────────────────────────────────────┐
│ Resume Your Subscription                 │
│                                          │
│ Your subscription will resume            │
│ immediately with billing on:             │
│                                          │
│ Next Charge: Today - $297                │
│ Billing Cycle: Monthly                   │
│                                          │
│ You'll regain full access to:            │
│ ✓ Unlimited workout programs             │
│ ✓ Custom nutrition plans                 │
│ ✓ Weekly coach check-ins                 │
│                                          │
│ [Cancel] [Resume Subscription]          │
└─────────────────────────────────────────┘
```

---

### 5.4 Delete Account Flow

**Trigger:** User clicks "Delete My Account" button in Danger Zone

**Steps:**
1. Check for active subscription → Must cancel first
2. Open warning modal (consequences)
3. User confirms to proceed
4. Open password verification modal
5. User enters password
6. Require typing "DELETE" to confirm
7. Call Cloud Function `requestAccountDeletion`
8. Show 7-day grace period message
9. Send confirmation email with cancellation link
10. After 7 days → Auto-execute deletion

**Pre-deletion Check (if has subscription):**
```
┌─────────────────────────────────────────┐
│ ⚠️ Active Subscription Detected          │
│                                          │
│ You must cancel your subscription before │
│ deleting your account.                   │
│                                          │
│ [Cancel Subscription First]              │
└─────────────────────────────────────────┘
```

**Warning Modal:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Delete Account                        │
│                                          │
│ This action cannot be undone.            │
│                                          │
│ What will be deleted:                    │
│ ✗ Your profile and personal data         │
│ ✗ Progress photos and logs               │
│ ✗ Messages with your trainer             │
│ ✗ Workout history                        │
│                                          │
│ What will be retained:                   │
│ ✓ Financial records (7 years - legal)   │
│                                          │
│ 7-Day Grace Period:                      │
│ You can cancel the deletion anytime      │
│ within 7 days by clicking the link in    │
│ your confirmation email.                 │
│                                          │
│ [Cancel] [Continue to Delete]           │
└─────────────────────────────────────────┘
```

**Password Verification Modal:**
```
┌─────────────────────────────────────────┐
│ Verify Your Identity                     │
│                                          │
│ Enter your password:                     │
│ [Password Input]                         │
│                                          │
│ Type DELETE to confirm:                  │
│ [Text Input]                             │
│                                          │
│ [Cancel] [Delete My Account]            │
└─────────────────────────────────────────┘
```

---

## 6. Technical Implementation

### 6.1 Cloud Functions

#### cancelSubscription

```javascript
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { reason, cancelAtPeriodEnd = true } = data;
  
  try {
    // 1. Get user document
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    const subscriptionId = userData.stripeSubscriptionId;
    
    if (!subscriptionId) {
      throw new functions.https.HttpsError('failed-precondition', 'No active subscription');
    }
    
    // 2. Cancel in Stripe
    const stripe = require('stripe')(functions.config().stripe.secret_key);
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
      cancellation_details: {
        comment: reason || 'User requested cancellation',
        feedback: 'other'
      }
    });
    
    // 3. Update Firestore
    await userRef.update({
      'subscription.cancelAtPeriodEnd': cancelAtPeriodEnd,
      'subscription.canceledAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.cancelReason': reason,
      'subscription.history': admin.firestore.FieldValue.arrayUnion({
        action: 'canceled',
        date: admin.firestore.FieldValue.serverTimestamp(),
        reason: reason,
        by: 'client',
        details: {
          cancelAtPeriodEnd: cancelAtPeriodEnd,
          currentPeriodEnd: subscription.current_period_end
        }
      })
    });
    
    // 4. Send confirmation email
    await sendCancellationEmail(userData.email, subscription);
    
    // 5. Log to subscription history collection
    await admin.firestore().collection('subscription_history').add({
      userId: userId,
      action: 'canceled',
      subscriptionId: subscriptionId,
      previousStatus: userData.subscriptionStatus,
      newStatus: 'canceled',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      reason: reason,
      initiatedBy: 'client'
    });
    
    return {
      success: true,
      message: 'Subscription canceled successfully',
      accessUntil: new Date(subscription.current_period_end * 1000).toISOString()
    };
    
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### pauseSubscription

```javascript
exports.pauseSubscription = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { duration, reason } = data; // duration in months (1, 2, or 3)
  
  // Validate duration
  if (![1, 2, 3].includes(duration)) {
    throw new functions.https.HttpsError('invalid-argument', 'Duration must be 1, 2, or 3 months');
  }
  
  try {
    // 1. Get user document
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    const subscriptionId = userData.stripeSubscriptionId;
    
    if (!subscriptionId) {
      throw new functions.https.HttpsError('failed-precondition', 'No active subscription');
    }
    
    // 2. Calculate resume date
    const pauseUntil = new Date();
    pauseUntil.setMonth(pauseUntil.getMonth() + duration);
    const resumeTimestamp = Math.floor(pauseUntil.getTime() / 1000);
    
    // 3. Pause in Stripe
    const stripe = require('stripe')(functions.config().stripe.secret_key);
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeTimestamp
      }
    });
    
    // 4. Update Firestore
    await userRef.update({
      subscriptionStatus: 'paused',
      'subscription.pausedAt': admin.firestore.FieldValue.serverTimestamp(),
      'subscription.pausedUntil': admin.firestore.Timestamp.fromDate(pauseUntil),
      'subscription.pauseReason': reason,
      'subscription.history': admin.firestore.FieldValue.arrayUnion({
        action: 'paused',
        date: admin.firestore.FieldValue.serverTimestamp(),
        reason: reason,
        by: 'client',
        details: {
          duration: duration,
          resumesAt: pauseUntil.toISOString()
        }
      })
    });
    
    // 5. Send confirmation email
    await sendPauseConfirmationEmail(userData.email, pauseUntil);
    
    return {
      success: true,
      message: 'Subscription paused successfully',
      resumesAt: pauseUntil.toISOString()
    };
    
  } catch (error) {
    console.error('Error pausing subscription:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### resumeSubscription

```javascript
exports.resumeSubscription = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    // 1. Get user document
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data();
    const subscriptionId = userData.stripeSubscriptionId;
    
    if (!subscriptionId) {
      throw new functions.https.HttpsError('failed-precondition', 'No subscription found');
    }
    
    if (userData.subscriptionStatus !== 'paused') {
      throw new functions.https.HttpsError('failed-precondition', 'Subscription is not paused');
    }
    
    // 2. Resume in Stripe
    const stripe = require('stripe')(functions.config().stripe.secret_key);
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: null
    });
    
    // 3. Update Firestore
    await userRef.update({
      subscriptionStatus: 'active',
      'subscription.pausedAt': admin.firestore.FieldValue.delete(),
      'subscription.pausedUntil': admin.firestore.FieldValue.delete(),
      'subscription.pauseReason': admin.firestore.FieldValue.delete(),
      'subscription.history': admin.firestore.FieldValue.arrayUnion({
        action: 'resumed',
        date: admin.firestore.FieldValue.serverTimestamp(),
        by: 'client',
        details: {
          resumedEarly: true
        }
      })
    });
    
    // 4. Send confirmation email
    await sendResumeConfirmationEmail(userData.email);
    
    return {
      success: true,
      message: 'Subscription resumed successfully'
    };
    
  } catch (error) {
    console.error('Error resuming subscription:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

### 6.2 Frontend API Calls

```typescript
// lib/subscription-api.ts

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface CancelSubscriptionData {
  reason?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface PauseSubscriptionData {
  duration: 1 | 2 | 3;
  reason?: string;
}

export const cancelSubscription = async (data: CancelSubscriptionData) => {
  const cancelFn = httpsCallable(functions, 'cancelSubscription');
  return await cancelFn(data);
};

export const pauseSubscription = async (data: PauseSubscriptionData) => {
  const pauseFn = httpsCallable(functions, 'pauseSubscription');
  return await pauseFn(data);
};

export const resumeSubscription = async () => {
  const resumeFn = httpsCallable(functions, 'resumeSubscription');
  return await resumeFn({});
};

export const getSubscriptionDetails = async () => {
  const detailsFn = httpsCallable(functions, 'getSubscriptionDetails');
  return await detailsFn({});
};
```

---

## 7. UI/UX Specifications

### 7.1 Color Coding

**Status Badges:**
- Active: Green (`bg-green-100 text-green-800`)
- Paused: Yellow (`bg-yellow-100 text-yellow-800`)
- Canceled: Red (`bg-red-100 text-red-800`)
- Session-Only: Blue (`bg-blue-100 text-blue-800`)

**Buttons:**
- Primary Actions: Blue (`bg-primary text-white`)
- Pause: Yellow (`bg-yellow-500 text-white`)
- Cancel: Red (`bg-red-600 text-white`)
- Delete Account: Red with outline (`border-red-600 text-red-600`)

### 7.2 Responsive Design

**Breakpoints:**
- Mobile: < 640px (stack cards vertically)
- Tablet: 640px - 1024px (2-column layout where appropriate)
- Desktop: > 1024px (full layout)

**Mobile Considerations:**
- Full-width buttons
- Simplified modals (bottom sheet on mobile)
- Reduce padding/margins
- Stack action buttons vertically

### 7.3 Loading States

**Page Load:**
- Skeleton loaders for cards
- Shimmer effect while fetching data

**Action Processing:**
- Button shows spinner
- Disable all form inputs
- Show progress message

**Success/Error:**
- Toast notifications
- Checkmark/X icon animations
- Auto-dismiss after 5 seconds (success) or persist (error)

---

## 8. Error Handling

### 8.1 Error Types and Messages

**Authentication Errors:**
```typescript
{
  code: 'unauthenticated',
  message: 'Please sign in to manage your subscription',
  action: 'Redirect to login'
}
```

**Subscription Not Found:**
```typescript
{
  code: 'not-found',
  message: 'No active subscription found',
  action: 'Show upgrade prompt'
}
```

**Payment Method Required:**
```typescript
{
  code: 'payment-required',
  message: 'Please add a payment method before resuming',
  action: 'Redirect to billing page'
}
```

**Network Errors:**
```typescript
{
  code: 'unavailable',
  message: 'Unable to connect. Please check your internet connection',
  action: 'Retry button'
}
```

### 8.2 Validation Rules

**Pause Duration:**
- Must be 1, 2, or 3 months
- Cannot pause if already paused
- Cannot pause if canceled

**Cancel Confirmation:**
- Must type exactly "CANCEL" (case-insensitive)
- Must have active subscription

**Delete Account:**
- Must enter correct password
- Must type exactly "DELETE" (case-insensitive)
- Must cancel subscription first (if active)

---

## 9. Testing Requirements

### 9.1 Unit Tests

**Component Tests:**
- MembershipOverview renders correctly for both types
- SubscriptionManagement shows correct buttons based on status
- DangerZone validates password correctly
- Modal confirmations work as expected

**Function Tests:**
- determineMembershipType returns correct type
- Date calculations for pause/resume are accurate
- Validation functions work correctly

### 9.2 Integration Tests

**Subscription Flow:**
1. Active → Pause → Verify status updated
2. Paused → Resume → Verify billing restarts
3. Active → Cancel → Verify access until period end
4. Canceled → Reactivate → Verify restoration

**Account Deletion:**
1. With subscription → Block deletion
2. Cancel subscription → Allow deletion
3. Session-only → Direct deletion
4. Verify grace period works
5. Verify data export before deletion

### 9.3 E2E Tests

**Complete User Journeys:**
1. Subscription client pauses for 2 months
2. Subscription client cancels and downloads data
3. Session-only client views upgrade prompt
4. Session-only client deletes account
5. Paused subscription auto-resumes after period

---

## 10. Sidebar Integration

### Update client-sidebar.tsx

Replace the current Account section with:

```typescript
{/* Account Section */}
<SidebarGroup>
  <SidebarGroupLabel>Account</SidebarGroupLabel>
  <SidebarGroupContent>
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild className={pathname === '/dashboard/client/profile' ? 'bg-primary text-white' : ''}>
          <Link href="/dashboard/client/profile">
            <User className="w-4 h-4" />
            <span>Profile</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      
      <SidebarMenuItem>
        <SidebarMenuButton asChild className={pathname === '/dashboard/client/membership' ? 'bg-primary text-white' : ''}>
          <Link href="/dashboard/client/membership">
            <CreditCard className="w-4 h-4" />
            <span>Membership</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      
      <SidebarMenuItem>
        <SidebarMenuButton asChild className={pathname === '/dashboard/client/billing' ? 'bg-primary text-white' : ''}>
          <Link href="/dashboard/client/billing">
            <Receipt className="w-4 h-4" />
            <span>
