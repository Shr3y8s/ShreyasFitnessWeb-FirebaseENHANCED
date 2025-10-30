# Account & Data Management - Technical Specification

**Last Updated:** October 29, 2025  
**Status:** Approved - Ready for Implementation  
**Estimated Implementation Time:** 3 hours

---

## 📋 Overview

This document specifies the requirements for the "Account & Data Management" section of the client profile page. This section allows users to manage their subscription, export their data, and delete their account.

---

## 🎯 Features (Option A - With Pause)

### **1. Download My Data**
Export all user data in JSON format for GDPR compliance.

### **2. Pause Subscription**
Temporarily pause subscription billing for 1-3 months (vacation, medical, etc.).

### **3. Cancel Subscription**
Stop subscription billing while keeping account and data intact.

### **4. Delete Account**
Permanently delete account and all associated data.

---

## 📐 Semantic Definitions

### **Pause Subscription**

**Purpose:** Temporary break from service with automatic resumption.

**What it does:**
- ✅ Temporarily stops billing (1-3 months)
- ✅ Pauses Stripe subscription via `pause_collection` API
- ✅ Account remains active (limited access)
- ✅ All data preserved
- ✅ Auto-resumes after pause period
- ✅ User can manually resume early

**Use Cases:**
- Going on vacation (1-2 months)
- Medical recovery (4-6 weeks)
- Busy work season (2-3 months)
- Traveling abroad

**Stripe Implementation:**
```javascript
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'void', // Don't bill during pause
    resumes_at: futureTimestamp // Unix timestamp
  }
});
```

**Limitations:**
- Max pause duration: 3 months
- Max pauses per year: 3
- Minimum subscription time before first pause: 1 month
- Cannot pause if subscription is already paused

**Database:**
```javascript
users/{uid}: {
  subscriptionStatus: 'paused',
  pausedAt: Timestamp,
  pauseResumeAt: Timestamp,
  pauseCount: number, // Track annual count
  lastPauseYear: number // Reset counter annually
}
```

---

### **Cancel Subscription**

**Purpose:** Stop billing permanently while keeping account for data access.

**What it does:**
- ✅ Stops subscription billing permanently
- ✅ Cancels Stripe subscription at period end
- ✅ Account remains ACTIVE
- ✅ Access continues until period end
- ✅ All data preserved
- ✅ User must re-subscribe to resume service

**Use Cases:**
- "Done with training but want to keep workout history"
- "Can't afford subscription right now"
- "Taking a long break (6+ months)"

**Stripe Implementation:**
```javascript
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
});
```

**Database:**
```javascript
users/{uid}: {
  subscriptionStatus: 'cancelled',
  cancelledAt: Timestamp,
  subscriptionExpiresAt: Timestamp, // Period end date
  cancellationReason: string | null
}
```

**After Period Ends:**
- User can still log in
- Can view historical data (read-only)
- Cannot access active features (workouts, messaging)
- Prompted to re-subscribe

---

### **Delete Account**

**Purpose:** Permanent account and data deletion (GDPR "right to be forgotten").

**What it does:**
- ✅ Cancels subscription immediately (no prorating)
- ✅ Deletes all user data permanently
- ✅ Removes account completely
- ✅ Cannot be undone
- ✅ No reactivation possible

**Use Cases:**
- "Never want to use service again"
- "Don't want my data stored"
- GDPR erasure request

**Stripe Implementation:**
```javascript
// Cancel subscription immediately
await stripe.subscriptions.cancel(subscriptionId, {
  prorate: false, // No refund
  invoice_now: false // No final invoice
});

// Optional: Delete customer (or keep for records)
// await stripe.customers.del(customerId);
```

**Data Deletion:**
```javascript
// 1. Delete from Firestore
await deleteDoc(doc(db, 'users', userId));
await deleteDoc(doc(db, 'workouts', userId)); // If separate collection
await deleteDoc(doc(db, 'progress', userId)); // If separate collection

// 2. Delete from Firebase Storage
await deleteObject(ref(storage, `profile-photos/${userId}/large.jpg`));
await deleteObject(ref(storage, `profile-photos/${userId}/small.jpg`));

// 3. Delete from Firebase Auth
await deleteUser(auth.currentUser);
```

**Database:**
```javascript
// User document is DELETED
// No data remains

// Optional: Keep audit log (separate collection)
auditLogs/{logId}: {
  action: 'account_deleted',
  userId: uid,
  email: 'user@example.com', // For records
  deletedAt: Timestamp,
  deletedBy: 'user', // vs 'admin'
  reason: string | null
}
```

---

## 🎨 UI Design

### **Section Layout**

```
┌────────────────────────────────────────┐
│ Account & Data Management              │
├────────────────────────────────────────┤
│                                        │
│ 💾 Download My Data                    │
│ Export all your personal data          │
│ [Download Data]                        │
│                                        │
│ ⏸️ Pause Subscription                  │
│ Take a break for 1-3 months            │
│ [Pause Subscription]                   │
│                                        │
│ ⏹️ Cancel Subscription                 │
│ Stop billing, keep your account        │
│ [Cancel Subscription]                  │
│                                        │
│ 🗑️ Delete Account                      │
│ Permanently delete all data            │
│ [Delete Account] (red)                 │
│                                        │
└────────────────────────────────────────┘
```

---

## 🔄 User Flows

### **Flow 1: Download My Data**

```
Click "Download Data"
  ↓
Loading spinner (fetching data)
  ↓
Generate JSON file
  ↓
Browser downloads "my-data-2025-10-29.json"
  ↓
Success message
```

**Data Included:**
```json
{
  "exportDate": "2025-10-29T19:00:00Z",
  "profile": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "(555) 123-4567",
    "dateOfBirth": "1990-01-15",
    "gender": "male",
    "address": { "city": "San Francisco", "state": "CA" }
  },
  "emergencyContact": {
    "name": "Jane Doe",
    "phone": "(555) 987-6543",
    "relationship": "spouse"
  },
  "subscription": {
    "tier": "complete-transformation",
    "status": "active",
    "startDate": "2024-01-15",
    "billingHistory": []
  },
  "workouts": [],
  "progress": [],
  "messages": []
}
```

---

### **Flow 2: Pause Subscription**

```
Click "Pause Subscription"
  ↓
Modal: "Pause Your Subscription"
├─ Choose duration (1, 2, or 3 months)
├─ Show resume date
├─ Checkbox: "I understand billing will resume automatically"
└─ [Cancel] [Pause Subscription]
  ↓
If confirmed:
  ├─ Update Stripe (pause_collection)
  ├─ Update Firestore (status, dates)
  ├─ Send confirmation email
  └─ Show success message
  ↓
User dashboard shows: "Subscription Paused Until [Date]"
  ↓
On resume date:
  ├─ Stripe automatically resumes billing
  ├─ Firestore updates status to 'active'
  └─ Email notification sent
```

**Modal Design:**
```
┌─────────────────────────────────────────┐
│ ⏸️ Pause Your Subscription?             │
├─────────────────────────────────────────┤
│                                         │
│ Taking a break? No problem!             │
│                                         │
│ Choose pause duration:                  │
│ ⦿ 1 month (resumes Dec 29)             │
│ ○ 2 months (resumes Jan 29)            │
│ ○ 3 months (resumes Feb 29)            │
│                                         │
│ During your pause:                      │
│ • No billing                            │
│ • Limited account access                │
│ • All data preserved                    │
│ • Can resume anytime                    │
│                                         │
│ ☑️ I understand billing resumes         │
│    automatically on the selected date   │
│                                         │
│ [Cancel] [Pause Subscription]           │
└─────────────────────────────────────────┘
```

---

### **Flow 3: Cancel Subscription**

```
Click "Cancel Subscription"
  ↓
Modal: "Cancel Your Subscription"
├─ Explain consequences
├─ Optional: Collect reason (dropdown)
├─ Show what user will lose/keep
└─ [Keep Subscription] [Cancel Subscription]
  ↓
If confirmed:
  ├─ Update Stripe (cancel_at_period_end: true)
  ├─ Update Firestore (status, dates)
  ├─ Send confirmation email
  └─ Show success message
  ↓
User retains access until period end
  ↓
After period ends:
  └─ Dashboard shows: "Subscribe to Resume"
```

**Modal Design:**
```
┌─────────────────────────────────────────┐
│ Cancel Your Subscription?               │
├─────────────────────────────────────────┤
│                                         │
│ We're sorry to see you go! 😢           │
│                                         │
│ What happens next:                      │
│ ✓ Access until Jan 29, 2026            │
│ ✓ No future charges                    │
│ ✓ Keep all your data                   │
│ ✓ Can re-subscribe anytime             │
│                                         │
│ Why are you leaving? (optional)         │
│ [Dropdown: Cost, Time, Results, etc.]   │
│                                         │
│ Need a break instead?                   │
│ [Pause for 1-3 months] (link)          │
│                                         │
│ Enter password to confirm:              │
│ [______________]                        │
│                                         │
│ [Keep Subscription] [Cancel]            │
└─────────────────────────────────────────┘
```

---

### **Flow 4: Delete Account**

```
Click "Delete Account"
  ↓
Modal: "Delete Account Permanently"
├─ Show what will be deleted
├─ Warning: Cannot be undone
├─ Type "DELETE" to confirm
├─ Enter password
└─ [Cancel] [Delete My Account]
  ↓
If confirmed:
  ├─ Verify password
  ├─ Verify "DELETE" typed correctly
  ├─ Cancel Stripe subscription
  ├─ Delete from Firestore
  ├─ Delete from Storage
  ├─ Delete from Auth
  ├─ Send confirmation email
  └─ Redirect to goodbye page
```

**Modal Design:**
```
┌─────────────────────────────────────────┐
│ ⚠️ Delete Account Permanently?          │
├─────────────────────────────────────────┤
│                                         │
│ THIS WILL DELETE:                       │
│ • All workout history & progress        │
│ • Messages with your trainer            │
│ • Profile photos & personal info        │
│ • Payment history                       │
│                                         │
│ ⚠️ This action CANNOT be undone         │
│ ❌ NO refunds will be provided          │
│                                         │
│ You currently have:                     │
│ • 15 days left on subscription          │
│ • 3 unused training sessions            │
│                                         │
│ For refund requests, contact:           │
│ support@shreyasmethod.com               │
│                                         │
│ Type DELETE to confirm:                 │
│ [______________]                        │
│                                         │
│ Enter your password:                    │
│ [______________]                        │
│                                         │
│ [Cancel] [Delete My Account] (red)      │
└─────────────────────────────────────────┘
```

---

## 💾 Data Structures

### **Firestore Schema**

```typescript
users/{uid}: {
  // Account
  accountStatus: 'active' | 'deleted',
  
  // Subscription
  subscriptionStatus: 'active' | 'paused' | 'cancelled' | 'expired',
  stripeCustomerId: string,
  stripeSubscriptionId: string,
  
  // Pause details
  pausedAt: Timestamp | null,
  pauseResumeAt: Timestamp | null,
  pauseCount: number,
  lastPauseYear: number,
  
  // Cancellation
  cancelledAt: Timestamp | null,
  cancellationReason: string | null,
  subscriptionExpiresAt: Timestamp | null,
  
  // Deletion
  deletedAt: Timestamp | null,
  deletionRequested: boolean,
  
  // Profile data
  name: string,
  email: string,
  // ... rest of profile
}
```

---

## 🔧 Implementation Checklist

### **Phase 1: Download My Data (30 min)**
- [ ] Create data export function
- [ ] Fetch user data from Firestore
- [ ] Generate JSON file
- [ ] Trigger browser download
- [ ] Add success message
- [ ] Test with real data

### **Phase 2: Pause Subscription (1 hour)**
- [ ] Create pause modal component
- [ ] Add duration selection (1-3 months)
- [ ] Implement Stripe pause API
- [ ] Update Firestore status
- [ ] Add pause counter (max 3/year)
- [ ] Add manual resume option
- [ ] Test pause and resume flow
- [ ] Add email notifications

### **Phase 3: Cancel Subscription (45 min)**
- [ ] Create cancel modal component
- [ ] Add reason collection (optional)
- [ ] Implement Stripe cancel API
- [ ] Update Firestore status
- [ ] Handle access until period end
- [ ] Add re-subscribe prompt
- [ ] Test cancellation flow
- [ ] Add email notifications

### **Phase 4: Delete Account (45 min)**
- [ ] Create delete modal component
- [ ] Add "DELETE" text confirmation
- [ ] Add password verification
- [ ] Implement Stripe cancellation
- [ ] Delete from Firestore
- [ ] Delete from Storage
- [ ] Delete from Auth
- [ ] Create goodbye page
- [ ] Test deletion flow
- [ ] Add email confirmation

---

## 🧪 Testing Checklist

### **Pause Subscription**
- [ ] Pause for 1 month
- [ ] Pause for 3 months
- [ ] Verify billing stops
- [ ] Verify auto-resume works
- [ ] Test manual resume
- [ ] Test pause limits (max 3/year)
- [ ] Test with active subscription
- [ ] Test edge cases

### **Cancel Subscription**
- [ ] Cancel subscription
- [ ] Verify access until period end
- [ ] Verify billing stops after period
- [ ] Test re-subscribe flow
- [ ] Test with different subscription types

### **Delete Account**
- [ ] Delete with active subscription
- [ ] Verify all data deleted
- [ ] Verify cannot log in
- [ ] Test with profile photos
- [ ] Test with workout data
- [ ] Verify Stripe cancellation

---

## 📧 Email Notifications

### **Pause Confirmation:**
```
Subject: Your subscription has been paused

Hi [Name],

Your subscription has been paused until [Resume Date].

What this means:
• No billing until [Resume Date]
• Limited account access
• All your data is safe
• You can resume anytime

To resume early, visit your profile page.

Questions? Reply to this email.

Best,
The Shreyas Method Team
```

### **Cancel Confirmation:**
```
Subject: Subscription cancelled

Hi [Name],

Your subscription has been cancelled.

What happens next:
• Access until [Period End Date]
• No future charges
• All data preserved
• Re-subscribe anytime at shreyasmethod.com

We'd love to have you back!

Best,
The Shreyas Method Team
```

### **Delete Confirmation:**
```
Subject: Account deleted

Hi [Name],

Your account has been permanently deleted.

What was deleted:
• All personal information
• Workout history
• Progress records
• Messages

We're sorry to see you go!

For questions, contact support@shreyasmethod.com

Best,
The Shreyas Method Team
```

---

## 🚨 Error Handling

### **Stripe Errors**
- Subscription not found
- Payment method required for resume
- Already paused
- Cannot pause (minimum period not met)

### **Validation Errors**
- Missing password
- Incorrect password
- "DELETE" not typed correctly
- Pause duration invalid

### **Network Errors**
- Stripe API timeout
- Firestore write failure
- Storage deletion failure

**All errors should:**
- Show user-friendly message
- Log to console for debugging
- Retry if appropriate
- Provide support contact

---

## 🔒 Security Considerations

1. **Password verification required for:**
   - Cancel subscription
   - Delete account

2. **Rate limiting:**
   - Max 3 pause/unpause per hour
   - Max 1 delete attempt per minute

3. **Audit logging:**
   - Log all subscription changes
   - Log account deletions
   - Store for compliance

4. **Data retention:**
   - Stripe customer data: Keep for accounting
   - Deleted user data: Purge immediately
   - Audit logs: Keep for 7 years

---

## 📊 Success Metrics

**Track:**
- Pause rate (% of users who pause vs cancel)
- Resume rate after pause
- Cancellation reasons
- Time to deletion after cancellation
- Support tickets related to refunds

**Goals:**
- Pause-to-resume rate > 60%
- Clear cancellation process (< 5 support tickets/month)
- GDPR compliance (100% data deletion within 30 days)

---

## ✅ Definition of Done

- [ ] All 4 features implemented
- [ ] All UI modals functional
- [ ] Stripe integration tested
- [ ] Data deletion verified
- [ ] Email notifications sent
- [ ] Error handling complete
- [ ] Documentation updated
- [ ] Terms of Service updated
- [ ] Tested in production

---

**End of Specification**
