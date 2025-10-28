# Business Management Dashboard Implementation

**Date:** October 27, 2025  
**Status:** 🚧 In Progress  
**Architecture:** Firestore + Stripe Extension Integration

---

## 🎯 Overview

Comprehensive business management features for the trainer dashboard to monitor payments, subscriptions, pending accounts, and financial metrics. All data synced from Stripe via Firebase Extension.

---

## 📊 Data Architecture

### **Stripe → Firestore Sync (Automatic)**

The Stripe Firebase Extension automatically syncs:
- Customers → `stripe_customers/{userId}`
- Subscriptions → `stripe_customers/{userId}/subscriptions/{subscriptionId}`
- Payments → `stripe_customers/{userId}/payments/{paymentId}`
- Invoices → `stripe_customers/{userId}/invoices/{invoiceId}`

### **Dashboard Data Sources**

| Feature | Data Source | Query Type |
|---------|-------------|------------|
| MRR | Firestore `subscriptions` | collectionGroup |
| Active Subscriptions | Firestore `subscriptions` | where status='active' |
| Payment History | Firestore `payments` + `invoices` | orderBy created |
| Failed Payments | Firestore `invoices` | where status=failed |
| Pending Accounts | Firestore `users` | where paymentStatus='pending' |
| reCAPTCHA Scores | Firestore `users` | where recaptchaScore exists |

---

## 🎨 UI Structure

### **Sidebar Navigation Update**

```
├── Dashboard
│   └── Overview
├── Lead Management
│   └── Lead Inbox (5)
├── Client Management
│   ├── Clients (12)
│   ├── Client Inbox
│   └── Workout Assignments (15)
├── 💰 Business Management (NEW)
│   ├── Overview
│   ├── Pending Accounts (8) ⚠️
│   ├── Payment History
│   └── Analytics (Phase 3)
└── Workout Management
    ├── Exercise Library (45)
    └── Workout Library (12)
```

---

## 📋 Implementation Phases

### **Phase 1: Core Business Features** (Current)

**Priority Features:**
1. ✅ Add "Business Management" section to sidebar
2. ✅ Pending Accounts page (`/dashboard/trainer/pending-accounts`)
3. ✅ Financial Overview page (`/dashboard/trainer/business`)
4. ✅ Enhanced overview dashboard cards

**Components:**
- `app/src/app/dashboard/trainer/business/page.tsx` - Financial overview
- `app/src/app/dashboard/trainer/pending-accounts/page.tsx` - Pending accounts management
- `app/src/components/TrainerSidebar.tsx` - Updated navigation

---

### **Phase 2: Payment Management** (Next)

**Features:**
5. Payment history expansion in client details
6. Failed payments tracking
7. Subscription management actions

**Components:**
- `app/src/app/dashboard/trainer/failed-payments/page.tsx`
- Enhanced client details payment section

---

### **Phase 3: Analytics & Security** (Future)

**Features:**
8. Security/reCAPTCHA monitoring
9. Analytics dashboard with conversion funnel
10. Revenue charts & trends

**Components:**
- `app/src/app/dashboard/trainer/security/page.tsx`
- `app/src/app/dashboard/trainer/analytics/page.tsx`

---

## 🔧 Phase 1 Detailed Implementation

### **1. Pending Accounts Page**

**Purpose:** Manage accounts created but not yet paid (from delayed account creation flow)

**File:** `app/src/app/dashboard/trainer/pending-accounts/page.tsx`

**Features:**
```typescript
interface PendingAccount {
  id: string;
  name: string;
  email: string;
  tier: string;
  tierName: string;
  paymentStatus: 'pending';
  recaptchaScore?: number;
  recaptchaVerified?: boolean;
  createdAt: Timestamp;
  accountAge: string; // e.g., "2 hours ago"
}

// Filters
- Age: All / < 24hrs / 24-48hrs / > 48hrs
- Tier: All / Online / In-Person / Transform / 4-Pack
- reCAPTCHA: All / Low Score (<0.5) / Normal (>=0.5)

// Actions
- View Details
- Delete Account (with confirmation)
- Send Reminder Email (Phase 2)

// Bulk Actions
- Select All
- Delete Selected (with confirmation)
- Send Batch Reminders (Phase 2)

// Alert Banner
If > 10 pending accounts:
⚠️ Warning: 15 pending accounts detected. 8 are older than 48 hours.
```

**Queries:**
```javascript
// Get all pending accounts
const pendingQuery = query(
  collection(db, 'users'),
  where('paymentStatus', '==', 'pending'),
  orderBy('createdAt', 'desc')
);

// Delete account
await deleteDoc(doc(db, 'users', userId));
await deleteUser(auth, userId); // Firebase Auth
```

---

### **2. Financial Overview Page**

**Purpose:** Dashboard showing MRR, active subscriptions, recent transactions

**File:** `app/src/app/dashboard/trainer/business/page.tsx`

**Dashboard Cards:**

**A. Monthly Recurring Revenue (MRR)**
```typescript
interface MRRData {
  current: number;
  lastMonth: number;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
}

// Calculation
const calculateMRR = async () => {
  const subsQuery = query(
    collectionGroup(db, 'subscriptions'),
    where('status', '==', 'active')
  );
  
  const snapshot = await getDocs(subsQuery);
  let mrr = 0;
  
  snapshot.forEach(doc => {
    const sub = doc.data();
    sub.items?.forEach(item => {
      const amount = item.price.unit_amount / 100;
      // Normalize to monthly
      if (item.price.recurring?.interval === 'month') {
        mrr += amount;
      } else if (item.price.recurring?.interval === 'year') {
        mrr += amount / 12;
      }
    });
  });
  
  return mrr;
};
```

**B. Subscription Breakdown**
```typescript
interface SubscriptionStats {
  activeCount: number;
  activeRevenue: number;
  oneTimeCount: number;
  oneTimeRevenue: number;
  failedCount: number;
}
```

**C. Recent Transactions**
```typescript
interface Transaction {
  type: 'subscription' | 'one-time';
  date: Date;
  clientName: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  tierName: string;
}

// Get last 10 transactions
// Combine invoices + payments, sort by date
```

**D. Revenue by Tier (Pie Chart)**
```typescript
interface RevenueByTier {
  tierName: string;
  revenue: number;
  percentage: number;
  color: string;
}
```

---

### **3. Enhanced Overview Dashboard**

**File:** `app/src/app/dashboard/trainer/page.tsx` (existing)

**Add Financial Stats Row:**
```typescript
// Current stats
[Total Clients]  [Active Workouts]  [Completed Today]  [Pending Assignments]

// Add below (new row):
[MRR: $2,400]  [Pending Accounts: 8 ⚠️]  [Failed Payments: 2]  [Active Subs: 12]
```

**Pending Accounts Alert:**
```typescript
{pendingCount > 10 && (
  <Alert variant="warning">
    ⚠️ You have {pendingCount} pending accounts.
    {oldAccountsCount > 5 && ` ${oldAccountsCount} are older than 48 hours.`}
    <Button onClick={() => router.push('/dashboard/trainer/pending-accounts')}>
      Review Now
    </Button>
  </Alert>
)}
```

---

## 🔐 Security & Permissions

### **Firestore Rules**

```javascript
// Only trainers/admins can access business data
match /stripe_customers/{customerId} {
  allow read: if request.auth != null && 
    (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer' ||
     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
}

// Trainers can delete pending accounts
match /users/{userId} {
  allow delete: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'trainer' &&
    resource.data.paymentStatus == 'pending';
}
```

---

## 📊 Key Metrics & Calculations

### **Monthly Recurring Revenue (MRR)**
```
MRR = Sum of all active subscription amounts (normalized to monthly)

Example:
- Online Coaching ($240/month) × 8 clients = $1,920
- Transformation ($300/month) × 2 clients = $600
Total MRR = $2,520
```

### **Account Age**
```
Age = Current Time - createdAt

Display:
- < 1 hour: "30 minutes ago"
- < 24 hours: "5 hours ago"
- < 48 hours: "1 day ago"
- > 48 hours: "3 days ago"
```

### **Revenue by Tier**
```
For each tier:
- Count active subscriptions/payments
- Sum revenue
- Calculate percentage of total
```

---

## 🎨 UI Components

### **Stat Card Component**
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number; // percentage
  trend?: 'up' | 'down';
  badge?: string;
}
```

### **Transaction Row Component**
```typescript
interface TransactionRowProps {
  date: Date;
  clientName: string;
  amount: number;
  status: 'paid' | 'failed' | 'pending';
  type: 'subscription' | 'one-time';
  tierName: string;
}
```

### **Pending Account Card**
```typescript
interface PendingAccountCardProps {
  account: PendingAccount;
  onDelete: (id: string) => void;
  onSendReminder: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}
```

---

## 🧪 Testing Checklist

### **Pending Accounts:**
- [ ] Page loads with all pending accounts
- [ ] Filters work correctly (age, tier, reCAPTCHA)
- [ ] Search filters by name/email
- [ ] Delete account removes from Firestore + Firebase Auth
- [ ] Bulk select all works
- [ ] Bulk delete works with confirmation
- [ ] Warning banner shows when > 10 accounts
- [ ] Account age displays correctly

### **Financial Overview:**
- [ ] MRR calculates correctly
- [ ] Active subscriptions count matches
- [ ] Recent transactions display correctly
- [ ] Revenue by tier pie chart displays
- [ ] Failed payments show correctly
- [ ] Real-time updates work (onSnapshot)

### **Overview Dashboard:**
- [ ] New financial stat cards display
- [ ] Pending accounts alert shows when needed
- [ ] Navigation to business pages works
- [ ] Stats update in real-time

---

## 🚀 Deployment

### **Files to Deploy:**
1. `app/src/app/dashboard/trainer/business/page.tsx` (new)
2. `app/src/app/dashboard/trainer/pending-accounts/page.tsx` (new)
3. `app/src/components/TrainerSidebar.tsx` (updated)
4. `app/src/app/dashboard/trainer/page.tsx` (enhanced)
5. `firestore.rules` (updated with new permissions)

### **Deploy Commands:**
```bash
# Deploy Next.js app
cd app
npm run build
firebase deploy --only hosting

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

## 📝 Future Enhancements (Phase 2 & 3)

### **Phase 2:**
- Send reminder emails to pending accounts
- Retry failed payments button
- Subscription management (pause, cancel, change tier)
- Detailed payment history per client
- Export transactions to CSV

### **Phase 3:**
- reCAPTCHA score dashboard
- Conversion funnel analytics
- Revenue trend charts (6 months)
- Customer lifetime value (CLV)
- Churn rate tracking
- Cohort analysis

---

## 🎉 Success Criteria

**Phase 1 Complete When:**
- ✅ Trainer can view all pending accounts
- ✅ Trainer can delete pending accounts manually
- ✅ Trainer sees MRR and subscription stats
- ✅ Trainer sees recent payment activity
- ✅ Warning alerts for old pending accounts
- ✅ Real-time data updates work
- ✅ Sidebar navigation includes Business Management

---

## 📚 Related Documentation

- [Delayed Account Creation Implementation](./delayed-account-creation-implementation.md)
- [Stripe Payment Fix Summary](./stripe-payment-fix-summary.md)
- [Client Management Design](./client-management-design.md)
