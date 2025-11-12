/**
 * Migration Script: Backfill locationId and locationType to Existing Sessions
 * 
 * This script adds the default location ID and locationType='public' to all 
 * sessions that are missing these fields. This is needed after adding these
 * as required fields to the TrainingSession interface.
 * 
 * Usage:
 *   node firebase/scripts/backfill-session-locations.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Preview changes without actually updating the database
 */

// Use firebase-admin from functions directory
const admin = require('../functions/node_modules/firebase-admin');
const config = require('../../firebase-config.json');

// Initialize Firebase Admin using Firebase CLI authentication
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: config.projectId
});

const db = admin.firestore();

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');

async function backfillSessionLocations() {
  console.log('='.repeat(60));
  console.log('Session Location Backfill Migration');
  console.log('='.repeat(60));
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`);
  console.log('');

  try {
    // Step 1: Get the default location
    console.log('Step 1: Finding default location...');
    const locationsSnapshot = await db.collection('training_locations')
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (locationsSnapshot.empty) {
      console.error('❌ ERROR: No default location found!');
      console.error('   Please create a default location first.');
      process.exit(1);
    }

    const defaultLocation = locationsSnapshot.docs[0];
    const defaultLocationId = defaultLocation.id;
    const defaultLocationData = defaultLocation.data();
    
    console.log(`✓ Found default location: ${defaultLocationData.displayName}`);
    console.log(`  ID: ${defaultLocationId}`);
    console.log(`  Address: ${defaultLocationData.address}`);
    console.log('');

    // Step 2: Query all sessions
    console.log('Step 2: Querying all sessions...');
    const sessionsSnapshot = await db.collection('sessions').get();
    console.log(`✓ Found ${sessionsSnapshot.size} total sessions`);
    console.log('');

    // Step 3: Filter sessions missing locationId or locationType
    console.log('Step 3: Identifying sessions missing locationId or locationType...');
    const sessionsToUpdate = [];
    
    sessionsSnapshot.forEach(doc => {
      const data = doc.data();
      if (!data.locationId || !data.locationType) {
        sessionsToUpdate.push({
          id: doc.id,
          data: data
        });
      }
    });

    console.log(`✓ Found ${sessionsToUpdate.length} sessions missing locationId or locationType`);
    
    if (sessionsToUpdate.length === 0) {
      console.log('');
      console.log('✓ All sessions already have locationId and locationType. No migration needed!');
      process.exit(0);
    }

    console.log('');
    console.log('Sessions to update:');
    sessionsToUpdate.forEach((session, index) => {
      const scheduledDate = session.data.scheduledDate?.toDate?.() || 'Unknown';
      const status = session.data.status || 'Unknown';
      console.log(`  ${index + 1}. ${session.id} - ${status} - ${scheduledDate}`);
    });
    console.log('');

    // Step 4: Update sessions (or preview in dry-run)
    if (isDryRun) {
      console.log('DRY RUN: Would add locationId and locationType to these sessions');
      console.log(`Would set locationId = "${defaultLocationId}" and locationType = "public" for ${sessionsToUpdate.length} sessions`);
      console.log('');
      console.log('To actually perform the migration, run without --dry-run flag:');
      console.log('  node firebase/scripts/backfill-session-locations.js');
    } else {
      console.log('Step 4: Updating sessions...');
      
      // Use batch operations for efficiency (max 500 per batch)
      const batchSize = 500;
      let updatedCount = 0;
      
      for (let i = 0; i < sessionsToUpdate.length; i += batchSize) {
        const batch = db.batch();
        const batchSessions = sessionsToUpdate.slice(i, i + batchSize);
        
        batchSessions.forEach(session => {
          const sessionRef = db.collection('sessions').doc(session.id);
          batch.update(sessionRef, {
            locationId: defaultLocationId,
            locationType: 'public',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        await batch.commit();
        updatedCount += batchSessions.length;
        
        const progress = Math.round((updatedCount / sessionsToUpdate.length) * 100);
        console.log(`  Progress: ${updatedCount}/${sessionsToUpdate.length} (${progress}%)`);
      }
      
      console.log('');
      console.log('✓ Migration completed successfully!');
      console.log(`  Updated ${updatedCount} sessions`);
      console.log(`  locationId set to: ${defaultLocationId}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('Migration Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Migration failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
backfillSessionLocations()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
