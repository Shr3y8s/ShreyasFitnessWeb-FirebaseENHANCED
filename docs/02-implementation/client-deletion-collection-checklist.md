# Client Deletion Collection Checklist

## Complete List of Collections to Query/Delete

Based on actual database schema (as of Jan 2026):

### Storage Locations
1. ✅ `progress-photos/{userId}/`
2. ✅ `nutritionScreenshots/{userId}/`
3. ✅ `profile-photos/{userId}/`

### Firestore Collections (Top-Level)
4. ✅ `clientPlans` - Query by clientId
5. ✅ `clientStats` - Query by clientId
6. ✅ `client_messages` - Query by clientId or userId
7. ✅ `dailyActivities` - Query by documentId prefix (userId_date)
8. ✅ `goals` - Query by clientId
9. ✅ `notifications` - Query by userId
10. ✅ `nutritionLogs/{userId}/mealPlans` - Document/subcollection
11. ✅ `progressPhotos` - Query by userId (Firestore references)
12. ✅ `sessions` - Query by userId
13. ✅ `stripe_customers/{userId}` - Document ID
14. ✅ `users/{userId}` - Document ID
15. ✅ `users/{userId}/activities` - Subcollection
16. ✅ `weeklySurveys` - Query by clientId or userId
17. ✅ `workouts` - Query by clientId
18. ✅ `login_history` - Query by userId

### System Records
19. Firebase Auth
20. Trainer client list references (admins.clients[] array)

## Collections to REMOVE from Current Code:
- ❌ users/{userId}/plans (doesn't exist - should be clientPlans)
- ❌ messages (doesn't exist - should be client_messages)
- ❌ users/{userId}/surveys (doesn't exist - should be weeklySurveys)

## Implementation Notes:

- **clientPlans**: Top-level collection, query `where('clientId', '==', userId)`
- **clientStats**: Top-level collection, doc ID likely `userId`
- **client_messages**: Top-level collection, query `where('clientId', '==', userId)` or `where('userId', '==', userId)`
- **notifications**: Top-level collection, query `where('userId', '==', userId)`
- **weeklySurveys**: Top-level collection, query `where('clientId', '==', userId)`
- **progressPhotos**: Firestore collection with photo metadata, separate from storage files
