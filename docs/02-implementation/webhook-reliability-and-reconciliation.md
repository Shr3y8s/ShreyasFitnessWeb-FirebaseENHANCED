# Webhook Reliability & Data Reconciliation System

**Date**: November 6, 2025  
**Status**: Architecture Documented - Implementation Pending

---

## Problem Statement

Webhooks from external systems (Stripe, Calendly) can fail for various reasons:
- **Network issues**: Temporary connectivity problems
- **Firebase downtime**: Cloud Functions unavailable
- **Code bugs**: Logic errors in webhook handlers
- **Timeout**: Processing takes too long
- **Rate limiting**: Too many requests

**Result**: Payments exist in Stripe but not in Firestore, or bookings in Calendly but not in your database. This creates **data inconsistency** and poor user experience.

---

## Multi-Layer Defense Strategy

### Layer 1: External System Retry ✅ (Built-in)

**Stripe Automatic Retries:**
- Attempts webhook delivery for up to 3 days
- Exponential backoff between retries
- View failed deliveries in Stripe Dashboard

**Calendly Automatic Retries:**
- Multiple retry attempts
- Configurable retry behavior

**Your Responsibility:**
- Return proper HTTP status codes:
  - `200 OK` → Success, don't retry
  - `500/503` → Temporary failure, please retry
  - `400` → Bad request, don't retry

### Layer 2: Idempotency ✅ (Prevent Duplicates)

Always check if webhook was already processed:

```javascript
// Example: Check before processing
async function handleStripeWebhook(event) {
  const paymentIntentId = event.data.object.id;
  
  // Check if already processed
  const existingPackage = await db.collection('users')
    .doc(userId)
    .collection('sessionPackages')
    .where('stripePaymentIntentId', '==', paymentIntentId)
    .get();
  
  if (!existingPackage.empty) {
    console.log('Already processed, skipping');
    return res.sendStatus(200); // Safe to return success
  }
  
  // Process the webhook...
}
```

**Key Principle**: Use unique IDs from external systems (Stripe payment ID, Calendly event ID) to ensure idempotency.

### Layer 3: Dead Letter Queue (Capture Failures)

Store failed webhook attempts for manual review:

```javascript
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  try {
    // Process webhook
    await processWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    // Log to dead letter queue
    await db.collection('failed_webhooks').add({
      type: 'stripe',
      payload: req.body,
      error: error.message,
      stack: error.stack,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      retryCount: 0,
      status: 'pending'
    });
    
    // Return 503 so external system will retry
    res.sendStatus(503);
  }
});
```

**Benefits:**
- Audit trail of failures
- Can manually reprocess
- Alerts when failures occur

### Layer 4: Reconciliation Jobs ⭐ (Primary Recovery Mechanism)

Run scheduled Cloud Functions to sync with external systems.

---

## Solution 1: One-Time Retroactive Sync

**Use Case**: Fix current orphaned payments (payments in Stripe but not in Firestore)

### Implementation

```javascript
// firebase/functions/syncOrphanedPayments.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.syncOrphanedStripePayments = functions.https.onCall(async (data, context) => {
  // Require admin permission
  if (!context.auth || context.auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }
  
  const { daysBack = 30, dryRun = true } = data;
  const results = {
    found: [],
    fixed: [],
    errors: []
  };
  
  try {
    console.log(`Scanning Stripe payments from last ${daysBack} days...`);
    
    // 1. Get all successful payments from Stripe
    const startDate = Math.floor(Date.now() / 1000) - (daysBack * 24 * 60 * 60);
    let hasMore = true;
    let startingAfter = null;
    
    while (hasMore) {
      const params = {
        created: { gte: startDate },
        limit: 100
      };
      if (startingAfter) params.starting_after = startingAfter;
      
      const payments = await stripe.paymentIntents.list(params);
      
      for (const payment of payments.data) {
        // Only process successful session package purchases
        if (payment.status !== 'succeeded') continue;
        if (!payment.metadata?.type?.includes('session')) continue;
        
        // 2. Find the user by email
        const email = payment.receipt_email || payment.metadata.email;
        if (!email) {
          results.errors.push({
            paymentId: payment.id,
            error: 'No email found'
          });
          continue;
        }
        
        const userSnapshot = await admin.firestore()
          .collection('users')
          .where('email', '==', email.toLowerCase())
          .limit(1)
          .get();
        
        if (userSnapshot.empty) {
          results.errors.push({
            paymentId: payment.id,
            email,
            error: 'User not found'
          });
          continue;
        }
        
        const userId = userSnapshot.docs[0].id;
        const userData = userSnapshot.docs[0].data();
        
        // 3. Check if this payment is already in Firebase
        const packageExists = userData.sessionPackages?.some(
          pkg => pkg.stripePaymentIntentId === payment.id
        );
        
        if (!packageExists) {
          // ORPHANED PAYMENT FOUND!
          const orphanedPayment = {
            paymentId: payment.id,
            userId,
            email,
            amount: payment.amount / 100,
            created: new Date(payment.created * 1000),
            metadata: payment.metadata
          };
          
          results.found.push(orphanedPayment);
          
          // 4. Fix it (if not dry run)
          if (!dryRun) {
            try {
              await createMissingSessionPackage(userId, payment);
              results.fixed.push(orphanedPayment);
              console.log(`✅ Fixed payment ${payment.id} for ${email}`);
            } catch (error) {
              results.errors.push({
                ...orphanedPayment,
                error: error.message
              });
              console.error(`❌ Failed to fix ${payment.id}:`, error);
            }
          }
        }
      }
      
      hasMore = payments.has_more;
      if (hasMore) {
        startingAfter = payments.data[payments.data.length - 1].id;
      }
    }
    
    // 5. Return summary
    return {
      success: true,
      summary: {
        scanned: `Last ${daysBack} days`,
        found: results.found.length,
        fixed: results.fixed.length,
        errors: results.errors.length,
        dryRun
      },
      details: results
    };
    
  } catch (error) {
    console.error('Sync error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Helper function to create the missing package
async function createMissingSessionPackage(userId, payment) {
  const db = admin.firestore();
  const userRef = db.collection('users').doc(userId);
  
  // Determine package type from metadata or amount
  const amount = payment.amount / 100;
  let packageType, quantity;
  
  if (amount === 70) {
    packageType = 'single';
    quantity = 1;
  } else if (amount === 240) {
    packageType = '4-pack';
    quantity = 4;
  } else {
    throw new Error(`Unknown package amount: $${amount}`);
  }
  
  // Create the package
  const packageData = {
    id: `pkg_${Date.now()}`,
    type: packageType,
    quantity,
    remaining: quantity,
    purchaseDate: admin.firestore.Timestamp.fromDate(
      new Date(payment.created * 1000)
    ),
    expirationDate: admin.firestore.Timestamp.fromDate(
      new Date((payment.created + (60 * 24 * 60 * 60)) * 1000) // 60 days
    ),
    expired: false,
    stripePaymentIntentId: payment.id,
    stripePriceId: payment.metadata.priceId || 'unknown',
    syncedFromStripe: true, // Flag for audit trail
    syncedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  
  // Use transaction to ensure consistency
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentData = userDoc.data();
    
    // Add package to array
    const packages = currentData.sessionPackages || [];
    packages.push(packageData);
    
    // Recalculate balance
    const balance = {
      available: packages
        .filter(p => !p.expired)
        .reduce((sum, p) => sum + p.remaining, 0),
      purchased: packages.reduce((sum, p) => sum + p.quantity, 0),
      used: packages.reduce((sum, p) => sum + (p.quantity - p.remaining), 0),
      expired: packages
        .filter(p => p.expired)
        .reduce((sum, p) => sum + p.remaining, 0),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    };
    
    transaction.update(userRef, {
      sessionPackages: packages,
      sessionBalance: balance
    });
  });
  
  console.log(`Created missing package for user ${userId}`);
}
```

### Usage

#### Step 1: Deploy the Function
```bash
cd firebase/functions
npm install
firebase deploy --only functions:syncOrphanedStripePayments
```

#### Step 2: Run in Dry-Run Mode (Check Only)
```javascript
// In Firebase Console or admin dashboard
const functions = getFunctions();
const sync = httpsCallable(functions, 'syncOrphanedStripePayments');

// First, see what would be fixed (doesn't make changes)
const dryRunResult = await sync({
  daysBack: 60,  // Check last 60 days
  dryRun: true   // Don't make changes yet
});

console.log('Dry run results:', dryRunResult.data);
// Output: "Found 5 orphaned payments totaling $370"
```

#### Step 3: Review and Execute
```javascript
// After reviewing the dry run results, actually fix them
const actualResult = await sync({
  daysBack: 60,
  dryRun: false  // Actually make the changes
});

console.log('Fixed:', actualResult.data.summary.fixed);
console.log('Errors:', actualResult.data.summary.errors);
```

---

## Solution 2: Daily Automated Reconciliation

**Use Case**: Prevent future inconsistencies by automatically checking daily

### Stripe Payment Reconciliation

```javascript
// firebase/functions/index.js

exports.dailyStripeReconciliation = functions.pubsub
  .schedule('0 2 * * *')  // Run at 2 AM daily
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('🔄 Starting daily Stripe reconciliation...');
    
    const results = {
      checked: 0,
      foundMissing: 0,
      fixed: 0,
      errors: []
    };
    
    try {
      // Check last 7 days of payments
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
      
      const payments = await stripe.paymentIntents.list({
        created: { gte: sevenDaysAgo },
        limit: 100
      });
      
      results.checked = payments.data.length;
      
      for (const payment of payments.data) {
        if (payment.status !== 'succeeded') continue;
        
        const email = payment.receipt_email || payment.metadata?.email;
        if (!email) continue;
        
        // Find user
        const userSnapshot = await admin.firestore()
          .collection('users')
          .where('email', '==', email.toLowerCase())
          .limit(1)
          .get();
        
        if (userSnapshot.empty) continue;
        
        const userId = userSnapshot.docs[0].id;
        const userData = userSnapshot.docs[0].data();
        
        // Check if payment exists in Firestore
        const exists = userData.sessionPackages?.some(
          pkg => pkg.stripePaymentIntentId === payment.id
        );
        
        if (!exists) {
          // Found missing payment!
          results.foundMissing++;
          
          try {
            await createMissingSessionPackage(userId, payment);
            results.fixed++;
            
            // Alert admin
            await sendAdminAlert({
              type: 'auto_reconciled_payment',
              userId,
              email,
              paymentId: payment.id,
              amount: payment.amount / 100,
              timestamp: new Date()
            });
            
            console.log(`✅ Auto-reconciled payment ${payment.id}`);
          } catch (error) {
            results.errors.push({
              paymentId: payment.id,
              error: error.message
            });
            console.error(`❌ Failed to reconcile ${payment.id}:`, error);
          }
        }
      }
      
      // Log results
      console.log('Reconciliation complete:', results);
      
      // Alert if issues found
      if (results.foundMissing > 0) {
        await sendAdminAlert({
          type: 'daily_reconciliation_report',
          results,
          timestamp: new Date()
        });
      }
      
      return results;
    } catch (error) {
      console.error('Reconciliation failed:', error);
      await sendAdminAlert({
        type: 'reconciliation_error',
        error: error.message
      });
      throw error;
    }
  });
```

### Calendly Booking Reconciliation

```javascript
exports.dailyCalendlyReconciliation = functions.pubsub
  .schedule('0 3 * * *')  // Run at 3 AM daily
  .timeZone('America/Los_Angeles')
  .onRun(async (context) => {
    console.log('🔄 Starting daily Calendly reconciliation...');
    
    const results = {
      checked: 0,
      foundMissing: 0,
      fixed: 0,
      errors: []
    };
    
    try {
      // Fetch all scheduled events from Calendly API
      const axios = require('axios');
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const response = await axios.get(
        'https://api.calendly.com/scheduled_events',
        {
          headers: {
            'Authorization': `Bearer ${process.env.CALENDLY_PAT}`
          },
          params: {
            min_start_time: sevenDaysAgo.toISOString(),
            status: 'active'
          }
        }
      );
      
      results.checked = response.data.collection.length;
      
      // Check each event against Firestore
      for (const event of response.data.collection) {
        const inviteeEmail = event.event_memberships[0].user_email;
        
        // Find user by email
        const userSnapshot = await admin.firestore()
          .collection('users')
          .where('email', '==', inviteeEmail.toLowerCase())
          .limit(1)
          .get();
        
        if (userSnapshot.empty) continue;
        
        const userId = userSnapshot.docs[0].id;
        
        // Check if session exists in Firestore
        const sessionSnapshot = await admin.firestore()
          .collection('sessions')
          .where('calendlyEventId', '==', event.uri)
          .limit(1)
          .get();
        
        if (sessionSnapshot.empty) {
          // FOUND MISSING BOOKING!
          results.foundMissing++;
          
          try {
            const scheduledDate = admin.firestore.Timestamp.fromDate(
              new Date(event.start_time)
            );
            
            await scheduleSession({
              userId,
              calendlyEventId: event.uri,
              eventDetails: {
                scheduledDate,
                duration: 60,
                eventUri: event.uri
              }
            });
            
            results.fixed++;
            
            // Alert admin
            await sendAdminAlert({
              type: 'auto_reconciled_booking',
              userId,
              eventId: event.uri,
              scheduledDate: event.start_time
            });
            
            console.log(`✅ Auto-reconciled booking ${event.uri}`);
          } catch (error) {
            results.errors.push({
              eventId: event.uri,
              error: error.message
            });
            console.error(`❌ Failed to reconcile ${event.uri}:`, error);
          }
        }
      }
      
      console.log('Calendly reconciliation complete:', results);
      
      // Alert if issues found
      if (results.foundMissing > 0) {
        await sendAdminAlert({
          type: 'daily_calendly_reconciliation_report',
          results,
          timestamp: new Date()
        });
      }
      
      return results;
    } catch (error) {
      console.error('Calendly reconciliation failed:', error);
      await sendAdminAlert({
        type: 'calendly_reconciliation_error',
        error: error.message
      });
      throw error;
    }
  });
```

---

## Solution 3: Admin Dashboard Tools

Create a simple UI for manual reconciliation when needed.

### Admin Sync Page

```typescript
// app/src/app/dashboard/admin/sync/page.tsx

'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function SyncToolPage() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [syncType, setSyncType] = useState<'stripe' | 'calendly'>('stripe');
  
  const handleSync = async (dryRun: boolean) => {
    setSyncing(true);
    setResults(null);
    
    try {
      const functions = getFunctions();
      const sync = httpsCallable(functions, 
        syncType === 'stripe' 
          ? 'syncOrphanedStripePayments'
          : 'syncOrphanedCalendlyBookings'
      );
      
      const result = await sync({
        daysBack: 60,
        dryRun
      });
      
      setResults(result.data);
    } catch (error: any) {
      console.error('Sync error:', error);
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">Data Reconciliation Tool</h1>
      <p className="text-muted-foreground mb-8">
        Sync data between external systems and Firestore
      </p>
      
      {/* Sync Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">System to Sync</label>
        <div className="flex gap-4">
          <button
            onClick={() => setSyncType('stripe')}
            className={`px-4 py-2 rounded ${
              syncType === 'stripe' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200'
            }`}
          >
            Stripe Payments
          </button>
          <button
            onClick={() => setSyncType('calendly')}
            className={`px-4 py-2 rounded ${
              syncType === 'calendly' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200'
            }`}
          >
            Calendly Bookings
          </button>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => handleSync(true)}
          disabled={syncing}
          className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600 disabled:opacity-50"
        >
          {syncing ? 'Checking...' : '🔍 Dry Run (Check Only)'}
        </button>
        
        <button
          onClick={() => handleSync(false)}
          disabled={syncing}
          className="bg-red-500 text-white px-6 py-3 rounded font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {syncing ? 'Fixing...' : '⚠️ Actually Fix Issues'}
        </button>
      </div>
      
      {/* Results Display */}
      {results && (
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Results</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-4 rounded">
              <div className="text-sm text-gray-600">Found Issues</div>
              <div className="text-3xl font-bold text-red-600">
                {results.summary.found}
              </div>
            </div>
            
            <div className="bg-white p-4 rounded">
              <div className="text-sm text-gray-600">Fixed</div>
              <div className="text-3xl font-bold text-green-600">
                {results.summary.fixed}
              </div>
            </div>
          </div>
          
          {results.summary.dryRun && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-4 rounded mb-4">
              ⚠️ Dry run only - no changes were made
            </div>
          )}
          
          <details className="mt-4">
            <summary className="cursor-pointer font-semibold">
              View Details (JSON)
            </summary>
            <pre className="mt-2 p-4 bg-white rounded overflow-auto text-xs">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
```

---

## Solution 4: Monitoring & Alerts

Detect inconsistencies proactively.

```javascript
exports.detectInconsistencies = functions.pubsub
  .schedule('0 4 * * *')  // Run at 4 AM daily
  .onRun(async (context) => {
    const issues = [];
    
    // Check 1: Users with negative balances
    const negativeBalances = await admin.firestore()
      .collection('users')
      .where('sessionBalance.available', '<', 0)
      .get();
    
    if (!negativeBalances.empty) {
      issues.push({
        type: 'negative_balance',
        severity: 'high',
        count: negativeBalances.size,
        users: negativeBalances.docs.map(d => ({
          id: d.id,
          email: d.data().email,
          balance: d.data().sessionBalance.available
        }))
      });
    }
    
    // Check 2: Sessions without Calendly event IDs
    const orphanedSessions = await admin.firestore()
      .collection('sessions')
      .where('calendlyEventId', '==', null)
      .where('status', '==', 'scheduled')
      .get();
    
    if (!orphanedSessions.empty) {
      issues.push({
        type: 'orphaned_sessions',
        severity: 'medium',
        count: orphanedSessions.size
      });
    }
    
    // Check 3: Packages that should be expired
    const now = admin.firestore.Timestamp.now();
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .get();
    
    let expiredButActive = 0;
    for (const userDoc of usersSnapshot.docs) {
      const packages = userDoc.data().sessionPackages || [];
      for (const pkg of packages) {
        if (!pkg.expired && pkg.expirationDate.toMillis() < now.toMillis()) {
          expiredButActive++;
        }
      }
    }
    
    if (expiredButActive > 0) {
      issues.push({
        type: 'expired_packages_not_marked',
        severity: 'low',
        count: expiredButActive
      });
    }
    
    // Send alert if issues found
    if (issues.length > 0) {
      await sendAdminAlert({
        type: 'data_inconsistencies_detected',
        issues,
        timestamp: new Date()
      });
      
      console.warn('⚠️ Data inconsistencies found:', issues);
    } else {
      console.log('✅ No data inconsistencies detected');
    }
    
    return { issues };
  });
```

---

## Best Practices

### 1. **Stripe is Source of Truth**
- Always trust Stripe for payment data
- Reconciliation should sync Stripe → Firebase
- Never delete payment records without checking Stripe first

### 2. **Audit Trail**
- Mark auto-synced records: `syncedFromStripe: true`
- Include timestamp: `syncedAt: serverTimestamp()`
- Log all reconciliation activities

### 3. **Idempotency**
- Always check if already processed
- Use external system IDs as keys
- Safe to run multiple times

### 4. **Monitoring**
- Set up alerts for inconsistencies
- Track reconciliation success rate
- Monitor webhook failure rates

### 5. **Regular Reconciliation**
- Run daily for recent data (7 days)
- Run weekly for longer periods (30 days)
- Manual sync tool for edge cases

---

## Implementation Timeline

### Phase 1: Immediate (Fix Current Issues)
1. Deploy one-time sync function
2. Run dry-run to see issues
3. Execute actual sync
4. Verify all payments reconciled

### Phase 2: Short-term (Within 1 Week)
1. Implement daily reconciliation jobs
2. Set up monitoring alerts
3. Create admin dashboard tool
4. Test end-to-end

### Phase 3: Ongoing (Maintenance)
1. Monitor reconciliation reports
2. Investigate any failures
3. Tune alert thresholds
4. Document edge cases

---

## Testing Strategy

### Test 1: Simulate Webhook Failure
1. Temporarily break webhook handler
2. Make test purchase in Stripe
3. Verify payment not in Firebase
4. Run reconciliation
5. Verify payment now in Firebase

### Test 2: Daily Job Testing
1. Deploy reconciliation job
2. Force run (don't wait for schedule)
3. Check logs for success
4. Verify no false positives

### Test 3: Admin Tool Testing
1. Create test orphaned payment
2. Use admin tool to detect
3. Run dry-run
4. Execute actual fix
5. Verify fixed correctly

---

## Deployment Checklist

- [ ] Add Stripe API key to `.env`
- [ ] Add Calendly PAT to `.env`
- [ ] Deploy reconciliation functions
- [ ] Set up scheduled jobs
- [ ] Configure alerts
- [ ] Create admin dashboard
- [ ] Document procedures
- [ ] Train team on tools

---

## Support & Troubleshooting

### Issue: Reconciliation job not running
**Check:**
- Cloud Scheduler enabled in Firebase
- Function deployed successfully
- Check function logs for errors

### Issue: False positives in detection
**Solution:**
- Adjust matching logic
- Add more checks (email + amount)
- Review edge cases

### Issue: Performance with large datasets
**Solution:**
- Batch process in chunks
- Use pagination for API calls
- Add timeouts and retries

---

## Conclusion

This multi-layer approach ensures data consistency even when webhooks fail:

1. **Layer 1**: External retry (automatic)
2. **Layer 2**: Idempotency (prevent duplicates)
3. **Layer 3**: Dead letter queue (capture failures)
4. **Layer 4**: Daily reconciliation (auto-recovery)
5. **Layer 5**: Admin tools (manual fixes)
6. **Layer 6**: Monitoring (early detection)

**Result**: Reliable system that self-heals and alerts when issues occur.
