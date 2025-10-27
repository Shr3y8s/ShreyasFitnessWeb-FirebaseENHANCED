# Account-First Signup Flow Implementation

## Overview
Implementing a reliable account-first signup flow where users create accounts before payment, with proper handling of pending payment states.

## Architecture

### Flow
```
1. User visits /signup
   ↓
2. Creates account (email, password, name, tier)
   ↓
3. Firebase Auth account created
   ↓
4. User document created with paymentStatus: "pending"
   ↓
5. Redirect to /payment
   ↓
6. User completes Stripe Checkout
   ↓
7. Extension webhook updates paymentStatus: "active"
   ↓
8. User can access full dashboard
```

### User States

#### Pending Payment
- **Status**: `paymentStatus: "pending"`
- **Access**: Limited - redirected to "Complete Payment" screen
- **Actions**: Can complete payment, view account info
- **Cleanup**: Auto-deleted after 7 days if no payment

#### Active Payment
- **Status**: `paymentStatus: "active"`
- **Access**: Full dashboard access
- **Actions**: All features available
- **Cleanup**: None needed

#### Cancelled Payment
- **Status**: `paymentStatus: "cancelled"`
- **Access**: Limited - can restart subscription
- **Actions**: Can re-subscribe
- **Cleanup**: Kept for historical records

## Database Schema

### User Document Structure
```typescript
{
  email: string                    // User email
  name: string                     // User name
  tier: string                     // "online" | "complete"
  tierName: string                 // "Online Coaching" | "Complete Transformation"
  paymentStatus: string            // "pending" | "active" | "cancelled"
  role: string                     // "client" | "trainer" | "admin"
  createdAt: Timestamp             // Account creation time
  
  // Added by Stripe Extension after payment:
  stripeCustomerId?: string        // Stripe customer ID
  subscriptionId?: string          // Stripe subscription ID
  updatedAt?: Timestamp            // Last update time
}
```

## Implementation Files

### New Files
1. `app/src/app/payment/page.tsx` - Payment page
2. `app/src/app/complete-payment/page.tsx` - Pending payment screen
3. `firebase/functions/lib/cleanup.js` - Cleanup scheduled function

### Modified Files
1. `app/src/app/signup/page.tsx` - Remove payment step
2. `app/src/app/dashboard/page.tsx` - Add payment status check
3. `app/src/app/dashboard/client/page.tsx` - Check payment status
4. `firebase/functions/index.js` - Add cleanup function
5. `firestore.rules` - Update security rules

## Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can read their own data
      allow read: if request.auth.uid == userId;
      
      // Users can update their own data but not paymentStatus
      // (only extension webhook can update paymentStatus)
      allow write: if request.auth.uid == userId 
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['paymentStatus']));
    }
    
    // Other collections...
  }
}
```

## Cleanup Strategy

### Scheduled Function
- **Schedule**: Daily at 2:00 AM UTC
- **Target**: Users with `paymentStatus: "pending"` AND `createdAt > 7 days ago`
- **Action**: Delete Firebase Auth account + Firestore document
- **Logging**: Log all deletions for audit

### Manual Override
Admin dashboard feature to:
- View all pending users
- Manually delete or send reminder emails
- Adjust cleanup threshold

## Extension Configuration

The Stripe Firebase Extension handles:
- ✅ Webhook events from Stripe
- ✅ Updating `paymentStatus` to "active" on successful payment
- ✅ Creating `stripeCustomerId` and `subscriptionId`
- ✅ Syncing subscription status changes

We handle:
- ✅ Creating Firebase Auth accounts
- ✅ Creating user documents with initial `paymentStatus: "pending"`
- ✅ Redirecting users based on payment status
- ✅ Cleanup of abandoned accounts

## Testing Checklist

### Happy Path
- [ ] User creates account successfully
- [ ] Redirected to payment page
- [ ] Completes Stripe Checkout
- [ ] Extension updates paymentStatus to "active"
- [ ] User can access full dashboard

### Abandoned Payment Path
- [ ] User creates account
- [ ] Navigates to payment page
- [ ] Abandons checkout
- [ ] Cannot access full dashboard
- [ ] Sees "Complete Payment" screen
- [ ] Can click link to resume payment

### Cleanup Path
- [ ] Create test account
- [ ] Don't complete payment
- [ ] Wait 7+ days (or manually trigger cleanup)
- [ ] Account automatically deleted
- [ ] No orphaned data in Firestore

## Benefits

### Reliability
- ✅ Uses battle-tested Stripe Extension
- ✅ Automatic webhook retries
- ✅ 99.9%+ success rate
- ✅ No custom webhook race conditions

### Maintainability
- ✅ Standard industry approach
- ✅ Simple to understand and debug
- ✅ Clear state management
- ✅ Easy to add features

### User Experience
- ✅ Clear account creation process
- ✅ Can return later to complete payment
- ✅ Professional "Complete Payment" screen
- ✅ No confusing error states

### Database Health
- ✅ Automatic cleanup of abandoned accounts
- ✅ No manual intervention needed
- ✅ Clean, minimal data
- ✅ Easy to audit and monitor

## Migration from Payment-First

If migrating from payment-first implementation:
1. Keep existing custom webhook for backward compatibility
2. Update signup flow to new account-first approach
3. Add paymentStatus field to existing users (default: "active")
4. Deploy and test
5. Monitor for 2 weeks
6. Remove old payment-first code if stable

## Monitoring

### Metrics to Track
- Signup completion rate
- Payment completion rate (signups → active)
- Time between signup and payment
- Abandoned account count
- Cleanup function success rate

### Alerts to Set
- Payment completion rate < 70%
- Cleanup function failures
- Pending users > 100
- Extension webhook failures

## Status

- **Created**: 2025-10-26
- **Status**: In Implementation
- **Last Updated**: 2025-10-26
