/**
 * Cloud Function: Fix Exercise Creator Names
 * 
 * HTTP endpoint to update createdByName for exercises with incorrect names
 * Fetches correct name from admins/trainers collections
 * 
 * Usage:
 *   POST https://us-west1-shreyfitweb.cloudfunctions.net/fixExerciseNames
 *   Body: { "dryRun": true }  // or false to actually migrate
 *   Optional: { "userId": "specific-user-id" } // to filter by creator
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.fixExerciseNames = onRequest({
  region: 'us-west1',
  cors: true,
}, async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const isDryRun = req.body?.dryRun !== false; // Default to dry-run for safety
  const filterUserId = req.body?.userId; // Optional: only fix exercises for specific user
  
  try {
    const db = admin.firestore();
    
    console.log('Starting exercise name fix...');
    console.log(`Mode: ${isDryRun ? 'DRY RUN (preview)' : 'LIVE UPDATE'}`);
    if (filterUserId) {
      console.log(`Filtering for user: ${filterUserId}`);
    }

    // Step 1: Query exercises
    let exercisesQuery = db.collection('exercises');
    if (filterUserId) {
      exercisesQuery = exercisesQuery.where('createdBy', '==', filterUserId);
    }
    
    const exercisesSnapshot = await exercisesQuery.get();
    
    if (exercisesSnapshot.empty) {
      res.json({
        success: true,
        message: 'No exercises found',
        exercisesChecked: 0
      });
      return;
    }

    console.log(`Found ${exercisesSnapshot.size} exercises to check`);

    // Step 2: Check each exercise and determine if update needed
    const updates = [];
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of exercisesSnapshot.docs) {
      const exercise = doc.data();
      const creatorId = exercise.createdBy;
      const currentName = exercise.createdByName;

      // Fetch correct name from Firestore
      let correctName = null;
      
      try {
        // Check admins collection first
        const adminDoc = await db.collection('admins').doc(creatorId).get();
        if (adminDoc.exists) {
          correctName = adminDoc.data().name;
          console.log(`✅ Found in admins: ${correctName} for ${exercise.name}`);
        } else {
          console.log(`❌ Admin doc does not exist for ${creatorId}`);
        }
      } catch (error) {
        console.log(`⚠️  Error fetching from admins for ${creatorId}:`, error.message);
      }

      // Fallback to trainers collection
      if (!correctName) {
        try {
          const trainerDoc = await db.collection('trainers').doc(creatorId).get();
          if (trainerDoc.exists) {
            correctName = trainerDoc.data().name;
            console.log(`✅ Found in trainers: ${correctName} for ${exercise.name}`);
          } else {
            console.log(`❌ Trainer doc does not exist for ${creatorId}`);
          }
        } catch (error) {
          console.log(`⚠️  Error fetching from trainers for ${creatorId}:`, error.message);
        }
      }

      // If we couldn't find the creator, skip this exercise
      if (!correctName) {
        console.log(`⚠️  Could not find creator ${creatorId} for exercise: ${exercise.name}`);
        errorCount++;
        continue;
      }

      // Check if update needed
      if (currentName === correctName) {
        skippedCount++;
        continue;
      }

      // Update needed
      updates.push({
        id: doc.id,
        name: exercise.name,
        creatorId: creatorId,
        oldName: currentName || 'NOT SET',
        newName: correctName
      });
    }

    console.log(`Updates needed: ${updates.length}`);
    console.log(`Already correct: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Step 3: Preview or apply updates
    if (isDryRun) {
      res.json({
        success: true,
        dryRun: true,
        message: `Would update ${updates.length} exercise(s)`,
        updates: updates.map(u => ({
          exercise: u.name,
          change: `"${u.oldName}" → "${u.newName}"`
        })),
        summary: {
          totalExercises: exercisesSnapshot.size,
          needsUpdate: updates.length,
          alreadyCorrect: skippedCount,
          errors: errorCount
        }
      });
    } else {
      console.log('Applying updates...');
      
      // Use batch operations
      const batchSize = 500;
      let updatedCount = 0;
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = db.batch();
        const batchUpdates = updates.slice(i, i + batchSize);
        
        batchUpdates.forEach(update => {
          const exerciseRef = db.collection('exercises').doc(update.id);
          batch.update(exerciseRef, {
            createdByName: update.newName,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        updatedCount += batchUpdates.length;
        console.log(`Progress: ${updatedCount}/${updates.length}`);
      }
      
      console.log('Migration completed successfully');
      
      res.json({
        success: true,
        dryRun: false,
        message: 'Exercise names updated successfully',
        summary: {
          totalExercises: exercisesSnapshot.size,
          updated: updatedCount,
          alreadyCorrect: skippedCount,
          errors: errorCount
        },
        changes: updates.map(u => ({
          exercise: u.name,
          change: `"${u.oldName}" → "${u.newName}"`
        }))
      });
    }

  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({
      error: 'Migration failed',
      message: error.message,
      stack: error.stack
    });
  }
});
