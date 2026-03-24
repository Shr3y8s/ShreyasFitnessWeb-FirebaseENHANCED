# Client Deletion Collection Checklist

## Complete List of Collections to Query/Delete

Based on actual database schema (as of Mar 2026):

### Storage Locations
1. ✅ `progressPhotos/{userId}/` (camelCase)
2. ✅ `nutritionScreenshots/{userId}/` (camelCase)
3. ✅ `profile-photos/{userId}/` (hyphenated)

### Firestore Collections (Top-Level)
4. ✅ `clientPlans` - Query by clientId
5. ✅ `clientStats` - Document ID = userId
6. ✅ `client_messages` - Query by clientId
7. ✅ `dailyActivities` - Query by documentId prefix (userId_date)
8. ✅ `goals` - Query by clientId
9. ✅ `notifications` - Query by userId
10. ✅ `nutritionLogs/{userId}/mealPlans` - Document/subcollection
11. ✅ `nutritionLogs/{userId}` - **Parent document** (must delete separately, Firestore doesn't cascade)
12. ✅ `progressPhotos` - Query by userId (Firestore metadata references)
13. ✅ `sessions` - Query by userId
14. ✅ `stripe_customers/{userId}` - Document ID
15. ✅ `stripe_customers/{userId}/subscriptions` - **Subcollection** (Firestore doesn't cascade-delete)
16. ✅ `stripe_customers/{userId}/payments` - **Subcollection**
17. ✅ `stripe_customers/{userId}/checkout_sessions` - **Subcollection**
18. ✅ `users/{userId}` - Document ID
19. ✅ `users/{userId}/activities` - Subcollection
20. ✅ `weeklySurveys` - Query by clientId
21. ✅ `workouts` - Query by clientId
22. ✅ `login_history` - Query by userId

### System Records
23. ✅ Firebase Auth - Deleted in both modes
24. ✅ Trainer client list references (admins.clients[] array) - arrayRemove

### Pre-Deletion Checks (NEW - Mar 2026)
25. ✅ **Stripe subscription cancellation**
    - `gdpr-clean`: Blocks if active subscription (admin must cancel first); auto-cancels if `cancelAtPeriodEnd`
    - `no-traces`: Auto-cancels any active subscription
26. ✅ **Session credit handling**
    - `gdpr-clean`: Blocks if `sessionBalance.available > 0` (admin must refund/acknowledge first)
    - `no-traces`: Zeros out remaining credits and reports in results

## Deletion Mode Behavior

### no-traces (test accounts)
- Deletes ALL data including financial records
- Auto-cancels active Stripe subscriptions
- Zeros out remaining session credits
- Deletes `stripe_customers` subcollections (subscriptions, payments, checkout_sessions)
- Deletes Stripe customer from Stripe API
- Deletes user document entirely

### gdpr-clean (real clients)
- **Blocks** if active subscription or remaining session credits
- Removes PII (photos, messages, login history, nutrition logs)
- Anonymizes user document (preserves for business records)
- Anonymizes Stripe customer (preserves for financial records)
- Sets `gdprDeleted: true` on user document (filtered from trainer queries)
- Deletes Firebase Auth

### mock (preview)
- No data modified
- Returns full inventory of what would be deleted
- Includes subscription and session credit info for admin review

## Collections NOT Deleted (by design)
- `activityFeed` - **Auto-expires (7-day TTL via scheduled cleanup). No cleanup action required during account deletion.**
- `admins` - Admin/trainer accounts
- `trainers` - Trainer accounts
- `exercises` - Shared exercise library
- `workoutTemplates` - Shared templates (not client-specific)
- `training_locations` - Shared locations
- `stripe_products` - Product catalog
- `deleted_accounts` - Audit trail (always preserved)
- `audit_logs` - Audit trail (always preserved)
- `contact_form_submissions` - Public form (not user-linked)
- `verifiedEmails` - Cleaned up by scheduled function

## Implementation Notes

- **clientPlans**: Top-level collection, query `where('clientId', '==', userId)`
- **clientStats**: Top-level collection, doc ID = `userId`
- **client_messages**: Top-level collection, query `where('clientId', '==', userId)`
- **notifications**: Top-level collection, query `where('userId', '==', userId)`
- **weeklySurveys**: Top-level collection, query `where('clientId', '==', userId)`
- **progressPhotos**: Firestore collection with photo metadata, separate from storage files
- **nutritionLogs**: Parent doc + `mealPlans` subcollection — must delete both
- **stripe_customers**: Parent doc + 3 subcollections — Firestore doesn't cascade-delete subcollections
- **dailyActivities**: Uses composite doc IDs `{userId}_{dateStr}` — queried by documentId prefix range
