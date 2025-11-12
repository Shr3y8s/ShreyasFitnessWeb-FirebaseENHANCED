/**
 * Cloud Function: Migrate Session Locations
 * 
 * HTTP endpoint to backfill locationId to existing sessions
 * 
 * Usage:
 *   POST https://us-west1-shreyfitweb.cloudfunctions.net/migrateSessionLocations
 *   Body: { "dryRun": true }  // or false to actually migrate
 */

const {onRequest} = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

exports.migrateSessionLocations = onRequest({
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

    const isDryRun = req.body?.dryRun === true;
    
    try {
      const db = admin.firestore();
      
      // Step 1: Get the default location
      console.log('Finding default location...');
      const locationsSnapshot = await db.collection('training_locations')
        .where('isDefault', '==', true)
        .limit(1)
        .get();

      if (locationsSnapshot.empty) {
        res.status(400).json({
          error: 'No default location found',
          message: 'Please create a default location first'
        });
        return;
      }

      const defaultLocation = locationsSnapshot.docs[0];
      const defaultLocationId = defaultLocation.id;
      const defaultLocationData = defaultLocation.data();
      
      console.log(`Found default location: ${defaultLocationData.displayName}`);

      // Step 2: Query all sessions
      console.log('Querying sessions...');
      const sessionsSnapshot = await db.collection('sessions').get();
      
      // Step 3: Filter sessions missing locationId OR locationType
      const sessionsToUpdate = [];
      sessionsSnapshot.forEach(doc => {
        const data = doc.data();
        if (!data.locationId || !data.locationType) {
          sessionsToUpdate.push({
            id: doc.id,
            clientName: data.clientName || 'Unknown',
            scheduledDate: data.scheduledDate?.toDate?.() || null,
            status: data.status || 'Unknown'
          });
        }
      });

      console.log(`Found ${sessionsToUpdate.length} sessions to update`);
      
      if (sessionsToUpdate.length === 0) {
        res.json({
          success: true,
          message: 'All sessions already have locationId and locationType',
          defaultLocation: {
            id: defaultLocationId,
            name: defaultLocationData.displayName
          },
          sessionsUpdated: 0,
          totalSessions: sessionsSnapshot.size
        });
        return;
      }

      // Step 4: Update sessions (or preview in dry-run)
      if (isDryRun) {
        res.json({
          success: true,
          dryRun: true,
          message: `Would update ${sessionsToUpdate.length} sessions`,
          defaultLocation: {
            id: defaultLocationId,
            name: defaultLocationData.displayName,
            address: defaultLocationData.address
          },
          sessionsToUpdate: sessionsToUpdate.slice(0, 10), // Show first 10
          totalSessionsToUpdate: sessionsToUpdate.length,
          totalSessions: sessionsSnapshot.size
        });
      } else {
        console.log('Updating sessions...');
        
        // Use batch operations (max 500 per batch)
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
          console.log(`Progress: ${updatedCount}/${sessionsToUpdate.length}`);
        }
        
        console.log('Migration completed successfully');
        
        res.json({
          success: true,
          dryRun: false,
          message: 'Migration completed successfully',
          defaultLocation: {
            id: defaultLocationId,
            name: defaultLocationData.displayName,
            address: defaultLocationData.address
          },
          sessionsUpdated: updatedCount,
          totalSessions: sessionsSnapshot.size
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
