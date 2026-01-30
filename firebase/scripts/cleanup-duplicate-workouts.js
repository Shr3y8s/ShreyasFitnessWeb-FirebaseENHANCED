/**
 * Cleanup Duplicate Workouts Script
 * 
 * This script removes duplicate workout templates from Firestore,
 * keeping only the newest version of each workout by name.
 * 
 * Usage:
 * node firebase/scripts/cleanup-duplicate-workouts.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account-key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicates() {
  console.log('🧹 Starting duplicate workout cleanup...\n');
  
  try {
    // Fetch all workout templates
    console.log('📊 Fetching all workout templates...');
    const snapshot = await db.collection('workoutTemplates').get();
    
    console.log(`Found ${snapshot.size} total workout templates\n`);
    
    // Group workouts by name
    const workoutsByName = {};
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const name = data.name;
      
      if (!workoutsByName[name]) {
        workoutsByName[name] = [];
      }
      
      workoutsByName[name].push({
        id: doc.id,
        name: name,
        createdAt: data.createdAt?.toDate() || new Date(0), // Convert Firestore timestamp to Date
        data: data
      });
    });
    
    // Find and delete duplicates
    let totalDuplicates = 0;
    let deletedCount = 0;
    
    console.log('🔍 Checking for duplicates...\n');
    
    for (const [name, workouts] of Object.entries(workoutsByName)) {
      if (workouts.length > 1) {
        console.log(`📋 Found ${workouts.length} versions of: "${name}"`);
        totalDuplicates += workouts.length - 1;
        
        // Sort by createdAt descending (newest first)
        workouts.sort((a, b) => b.createdAt - a.createdAt);
        
        // Keep the first (newest), delete the rest
        const toKeep = workouts[0];
        const toDelete = workouts.slice(1);
        
        console.log(`   ✅ Keeping newest: ${toKeep.id} (created: ${toKeep.createdAt.toISOString()})`);
        
        for (const workout of toDelete) {
          try {
            await db.collection('workoutTemplates').doc(workout.id).delete();
            deletedCount++;
            console.log(`   🗑️  Deleted duplicate: ${workout.id} (created: ${workout.createdAt.toISOString()})`);
          } catch (error) {
            console.error(`   ❌ Failed to delete ${workout.id}:`, error.message);
          }
        }
        console.log('');
      }
    }
    
    console.log('🎉 Cleanup completed!');
    console.log(`📊 Summary:`);
    console.log(`   • Total workout templates found: ${snapshot.size}`);
    console.log(`   • Unique workouts: ${Object.keys(workoutsByName).length}`);
    console.log(`   • Duplicates found: ${totalDuplicates}`);
    console.log(`   • Duplicates deleted: ${deletedCount}`);
    console.log(`   • Final count: ${Object.keys(workoutsByName).length} workouts\n`);
    
    if (deletedCount > 0) {
      console.log('✨ Your workout library is now clean!');
      console.log('💡 Refresh your Workout Library page to see the updated list');
    } else {
      console.log('✨ No duplicates found - your library is already clean!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupDuplicates();