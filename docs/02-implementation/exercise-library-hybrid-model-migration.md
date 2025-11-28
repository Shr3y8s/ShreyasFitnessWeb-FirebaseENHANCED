# Exercise Library Hybrid Model - Migration Guide

## Overview

The exercise library has been upgraded from a single-trainer model to a **hybrid model** that supports both personal exercises (visible only to the creator) and company library exercises (visible to all trainers).

## What Changed

### New Exercise Fields

```typescript
interface Exercise {
  // ... existing fields ...
  
  // NEW FIELDS:
  createdByName: string;        // Display name - persists even if user deleted
  scope: 'personal' | 'company'; // Visibility scope
  isActive: boolean;             // False when trainer leaves or exercise deprecated
  lastEditedBy?: string;         // Track who last edited
  lastEditedByName?: string;     // Display name of editor
  lastEditedAt?: Date;           // When last edited
}
```

### Hybrid Query Logic

The `listenToExercises()` function now:
1. Fetches trainer's **personal** exercises (`scope: 'personal'`)
2. Fetches **all company** exercises (`scope: 'company'`)
3. Combines and returns both sets

## Migration Required for Existing Exercises

You currently have **4 exercises** in Firestore that need migration:

### Steps to Migrate

#### Option 1: Firestore Console (Recommended for Small Numbers)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Firestore Database**
4. Find the `exercises` collection
5. For each of the 4 existing exercises, add these fields:

```javascript
{
  createdByName: "Shreyas" // or appropriate trainer name
  scope: "company"  // Make them visible to all trainers
  isActive: true
  // Keep all existing fields unchanged
}
```

#### Option 2: Batch Update Script

Create and run this script from Firebase Functions or a local Node.js script:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

async function migrateExercises() {
  const exercisesRef = db.collection('exercises');
  const snapshot = await exercisesRef.get();
  
  const batch = db.batch();
  let count = 0;
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    
    // Only migrate if these fields don't exist
    if (!data.scope || !data.createdByName) {
      batch.update(doc.ref, {
        createdByName: data.createdByName || 'Shreyas', // Get from users collection if available
        scope: 'company', // Make existing exercises company-wide
        isActive: true,
        // Sync isPublic with scope for backward compatibility
        isPublic: true
      });
      count++;
    }
  });
  
  if (count > 0) {
    await batch.commit();
    console.log(`Successfully migrated ${count} exercises`);
  } else {
    console.log('No exercises need migration');
  }
}

migrateExercises().catch(console.error);
```

## Firestore Indexes Required

The new hybrid queries require composite indexes:

### Index 1: Personal Exercises Query
```
Collection: exercises
Fields:
  - createdBy (Ascending)
  - scope (Ascending)
  - isActive (Ascending)
  - name (Ascending)
```

### Index 2: Company Exercises Query
```
Collection: exercises
Fields:
  - scope (Ascending)
  - isActive (Ascending)
  - name (Ascending)
```

### Creating Indexes

Firebase will automatically prompt you to create these indexes when you first run the queries. Click the link in the console error to create them automatically, or add them manually:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database > Indexes**
3. Click "Add Index"
4. Add the above composite indexes

Alternatively, the indexes can be defined in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "exercises",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdBy", "order": "ASCENDING" },
        { "fieldPath": "scope", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "exercises",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scope", "order": "ASCENDING" },
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Testing the Migration

### 1. Test Exercise Creation

1. Log in as a trainer
2. Go to Exercise Library page
3. Create a new exercise with **Personal** scope
4. Create another exercise with **Company Library** scope
5. Verify both appear in the list

### 2. Test Multi-Trainer Visibility

1. Create an exercise with **Company Library** scope as Trainer A
2. Log in as Trainer B
3. Navigate to Exercise Library
4. Verify you can see:
   - Trainer B's personal exercises
   - The company exercise from Trainer A

### 3. Verify Attribution

1. Check that each exercise shows:
   - "Created by [Name]" with the trainer's name
   - Creation date
   - Scope badge (Personal or Company Library)

### 4. Test Existing Exercises

After migration:
1. Navigate to Exercise Library
2. Verify all 4 existing exercises appear
3. Verify they show "Company Library" badge
4. Verify "Created by Shreyas" (or appropriate name)

## Rollback Plan

If you need to rollback:

1. The old query logic is still compatible - just remove the `scope` and `isActive` filters
2. Existing exercises will still work since we kept `isPublic` field
3. New exercises created with the hybrid model will simply have extra fields that can be ignored

## Benefits of Hybrid Model

✅ **Trainer Independence**: Each trainer can create their own exercises
✅ **Knowledge Sharing**: Company library allows best practices to be shared
✅ **Quality Control**: Admins can curate company library
✅ **Attribution**: Always know who created what
✅ **Scalability**: Works for businesses with multiple trainers
✅ **Trainer Turnover**: Handles trainer departures gracefully

## Next Steps

1. ✅ Migrate existing 4 exercises (add new fields)
2. ✅ Create/verify Firestore indexes
3. ✅ Test exercise creation with both scopes
4. ✅ Test multi-trainer visibility
5. Document admin tools for managing company library (future enhancement)

## Questions?

For any issues or questions about the hybrid model:
- Check Firestore console for index creation prompts
- Verify exercise documents have all required fields
- Check browser console for any query errors
