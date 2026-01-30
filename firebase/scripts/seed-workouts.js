/**
 * Workout Template Library Seed Script
 * 
 * This script populates the Firestore 'workout_templates' collection with 7 foundational
 * muscle-specific workout templates that reference exercises from the exercise library.
 * 
 * Prerequisites:
 * 1. Run seed-exercises.js first to populate the exercises collection
 * 2. Ensure service-account-key.json is in project root
 * 
 * Usage:
 * 1. Make sure you're in the project root directory
 * 2. Run: node firebase/scripts/seed-workouts.js YOUR_USER_ID
 * 
 * Example:
 * node firebase/scripts/seed-workouts.js uWdwR622tkOiShVzLBjFqvsOqPZ2
 * 
 * Note: The script will fetch the trainer's name from Firestore automatically.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../service-account-key.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Get command line arguments
const args = process.argv.slice(2);
const userId = args[0];

if (!userId) {
  console.error('❌ Error: Missing required argument');
  console.log('Usage: node firebase/scripts/seed-workouts.js YOUR_USER_ID');
  console.log('Example: node firebase/scripts/seed-workouts.js abc123xyz');
  console.log('\nNote: Trainer name will be fetched automatically from Firestore');
  process.exit(1);
}

/**
 * Query Firestore to get exercise ID by name
 * @param {string} exerciseName - Name of the exercise to find
 * @returns {Promise<string|null>} Exercise ID or null if not found
 */
async function getExerciseIdByName(exerciseName) {
  try {
    const snapshot = await db.collection('exercises')
      .where('name', '==', exerciseName)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.warn(`⚠️  Exercise not found: ${exerciseName}`);
      return null;
    }
    
    return snapshot.docs[0].id;
  } catch (error) {
    console.error(`❌ Error fetching exercise "${exerciseName}":`, error.message);
    return null;
  }
}

/**
 * Workout Template Definitions
 * Each workout references exercises by name (will be converted to IDs)
 */
const workoutTemplates = [
  // 1. CHEST DAY
  {
    name: 'Chest Development',
    description: 'Comprehensive chest workout focusing on mass and strength. Includes compound movements followed by isolation work for complete chest development.',
    exercises: [
      'Barbell Bench Press',
      'Incline Barbell Bench Press', 
      'Dumbbell Bench Press',
      'Incline Dumbbell Press',
      'Dumbbell Chest Flyes',
      'Cable Chest Flyes'
    ],
    estimatedDuration: 50,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbells', 'Bench', 'Cable Machine'],
    tags: ['chest', 'upper body', 'push', 'mass building']
  },

  // 2. ARMS DAY
  {
    name: 'Arms (Biceps & Triceps)',
    description: 'Complete arm workout targeting both biceps and triceps with variety of angles and grips for maximum development.',
    exercises: [
      'Barbell Curl',
      'Hammer Curl',
      'Cable Curl',
      'Close-Grip Bench Press',
      'Tricep Pushdown',
      'Overhead Tricep Extension',
      'Skull Crushers'
    ],
    estimatedDuration: 45,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Biceps', 'Triceps', 'Arms'],
    equipment: ['Barbell', 'Dumbbells', 'Cable Machine', 'Bench', 'EZ Bar'],
    tags: ['arms', 'biceps', 'triceps', 'upper body']
  },

  // 3. SHOULDERS DAY
  {
    name: 'Shoulder Development',
    description: 'Complete shoulder workout targeting all three deltoid heads (front, side, rear) for balanced shoulder development and strength.',
    exercises: [
      'Overhead Press',
      'Dumbbell Shoulder Press',
      'Lateral Raises',
      'Front Raises',
      'Rear Delt Flyes',
      'Cable Lateral Raises',
      'Face Pulls'
    ],
    estimatedDuration: 50,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbells', 'Cable Machine', 'Bench'],
    tags: ['shoulders', 'delts', 'upper body', 'overhead pressing']
  },

  // 4. BACK DAY (LATS FOCUSED)
  {
    name: 'Back - Lats & Width',
    description: 'Lat-focused back workout emphasizing vertical pulling and back width development. Builds V-taper and overall back size.',
    exercises: [
      'Deadlift',
      'Pull-ups',
      'Lat Pulldown',
      'Dumbbell Row',
      'Seated Cable Row',
      'Face Pulls'
    ],
    estimatedDuration: 55,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Back', 'Lats', 'Biceps'],
    equipment: ['Barbell', 'Pull-up Bar', 'Dumbbells', 'Cable Machine', 'Bench'],
    tags: ['back', 'lats', 'pull', 'width', 'vertical pulling']
  },

  // 5. BACK DAY (UPPER/DENSITY)
  {
    name: 'Back - Upper & Thickness',
    description: 'Upper back and thickness focused workout. Emphasizes horizontal pulling, rhomboids, traps, and back density for posture and strength.',
    exercises: [
      'Barbell Row',
      'T-Bar Row',
      'Seated Cable Row',
      'Face Pulls',
      'Barbell Shrugs',
      'Reverse Flyes'
    ],
    estimatedDuration: 50,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Back', 'Traps', 'Rear Delts'],
    equipment: ['Barbell', 'T-Bar', 'Cable Machine', 'Dumbbells'],
    tags: ['back', 'upper back', 'thickness', 'horizontal pulling', 'traps']
  },

  // 6. LEG DAY
  {
    name: 'Lower Body Development',
    description: 'Complete leg workout targeting quads, hamstrings, glutes, and calves. Includes compound movements and isolation work for balanced lower body development.',
    exercises: [
      'Barbell Back Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Walking Lunges',
      'Leg Curl',
      'Leg Extension',
      'Hip Thrust',
      'Standing Calf Raises'
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
    equipment: ['Barbell', 'Dumbbells', 'Leg Press Machine', 'Leg Curl Machine', 'Leg Extension Machine', 'Squat Rack', 'Bench', 'Calf Raise Machine'],
    tags: ['legs', 'lower body', 'quads', 'hamstrings', 'glutes', 'squat', 'mass building']
  },

  // 7. CORE/ABS DAY
  {
    name: 'Core & Abs',
    description: 'Comprehensive core workout targeting abs, obliques, and overall core stability. Includes both dynamic movements and isometric holds.',
    exercises: [
      'Plank',
      'Side Plank',
      'Crunches',
      'Russian Twists',
      'Hanging Leg Raises',
      'Ab Wheel Rollout'
    ],
    estimatedDuration: 30,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Core', 'Abs'],
    equipment: ['Bodyweight', 'Pull-up Bar', 'Ab Wheel', 'Medicine Ball'],
    tags: ['core', 'abs', 'obliques', 'stability', 'bodyweight']
  },

  // ========== PUSH PULL LEGS SPLIT ==========
  
  // 8. PUSH DAY (Chest, Shoulders, Triceps)
  {
    name: 'Push (Chest, Shoulders, Triceps)',
    description: 'Complete push day workout targeting all pressing muscles: chest, shoulders, and triceps. Perfect for Push/Pull/Legs training split.',
    exercises: [
      'Barbell Bench Press',
      'Incline Dumbbell Press',
      'Overhead Press',
      'Dumbbell Shoulder Press',
      'Lateral Raises',
      'Cable Chest Flyes',
      'Tricep Pushdown',
      'Overhead Tricep Extension'
    ],
    estimatedDuration: 55,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    equipment: ['Barbell', 'Dumbbells', 'Cable Machine', 'Bench'],
    tags: ['push', 'ppl', 'chest', 'shoulders', 'triceps', 'upper body', 'compound']
  },

  // 9. PULL DAY (Back, Biceps)
  {
    name: 'Pull (Back & Biceps)',
    description: 'Complete pull day workout targeting all pulling muscles: lats, upper back, and biceps. Perfect for Push/Pull/Legs training split.',
    exercises: [
      'Deadlift',
      'Pull-ups',
      'Barbell Row',
      'Lat Pulldown',
      'Seated Cable Row',
      'Face Pulls',
      'Barbell Curl',
      'Hammer Curl'
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Back', 'Lats', 'Biceps', 'Traps'],
    equipment: ['Barbell', 'Pull-up Bar', 'Dumbbells', 'Cable Machine', 'Bench'],
    tags: ['pull', 'ppl', 'back', 'lats', 'biceps', 'compound', 'vertical pulling', 'horizontal pulling']
  },

  // 10. LEGS DAY (PPL Version)
  {
    name: 'Legs (Quads, Hamstrings, Glutes)',
    description: 'Complete leg day for Push/Pull/Legs split. Targets quads, hamstrings, glutes, and calves with compound movements and isolation work.',
    exercises: [
      'Barbell Back Squat',
      'Romanian Deadlift',
      'Leg Press',
      'Walking Lunges',
      'Leg Curl',
      'Leg Extension',
      'Hip Thrust',
      'Standing Calf Raises'
    ],
    estimatedDuration: 60,
    difficulty: 'intermediate',
    category: 'strength',
    targetMuscleGroups: ['Legs', 'Quadriceps', 'Hamstrings', 'Glutes', 'Calves'],
    equipment: ['Barbell', 'Dumbbells', 'Leg Press Machine', 'Leg Curl Machine', 'Leg Extension Machine', 'Squat Rack', 'Bench', 'Calf Raise Machine'],
    tags: ['legs', 'ppl', 'lower body', 'quads', 'hamstrings', 'glutes', 'squat', 'compound']
  }
];

// Main execution function
async function seedWorkouts() {
  console.log('🏋️ Starting workout template library seed...\n');
  console.log(`📝 User ID: ${userId}`);
  
  // Fetch trainer name from Firestore (check admins first, then trainers)
  console.log('🔍 Fetching trainer name from Firestore...');
  let userName = null;
  
  try {
    const adminDoc = await db.collection('admins').doc(userId).get();
    if (adminDoc.exists) {
      userName = adminDoc.data().name;
      console.log(`✅ Found in admins collection: ${userName}`);
    }
  } catch (error) {
    console.log('⚠️  Not found in admins collection');
  }
  
  // Fallback to trainers collection if not found in admins
  if (!userName) {
    try {
      const trainerDoc = await db.collection('trainers').doc(userId).get();
      if (trainerDoc.exists) {
        userName = trainerDoc.data().name;
        console.log(`✅ Found in trainers collection: ${userName}`);
      }
    } catch (error) {
      console.log('⚠️  Not found in trainers collection');
    }
  }
  
  // Final fallback
  if (!userName) {
    console.error('❌ Error: Could not find trainer with ID:', userId);
    console.log('Make sure the user exists in either admins or trainers collection');
    process.exit(1);
  }
  
  console.log(`👤 User Name: ${userName}`);
  console.log(`📊 Total workout templates to create: ${workoutTemplates.length}\n`);
  console.log('🔍 Fetching exercise IDs from Firestore...\n');

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < workoutTemplates.length; i++) {
    const template = workoutTemplates[i];
    
    try {
      // Fetch exercise IDs by name
      console.log(`\n📋 Processing workout ${i + 1}/${workoutTemplates.length}: ${template.name}`);
      console.log(`   Fetching ${template.exercises.length} exercises...`);
      
      const exerciseIds = [];
      for (const exerciseName of template.exercises) {
        const exerciseId = await getExerciseIdByName(exerciseName);
        if (exerciseId) {
          exerciseIds.push({ exerciseId });
          console.log(`   ✓ Found: ${exerciseName}`);
        } else {
          console.log(`   ✗ Missing: ${exerciseName}`);
        }
      }

      if (exerciseIds.length === 0) {
        throw new Error('No exercises found - cannot create workout template');
      }

      if (exerciseIds.length < template.exercises.length) {
        console.warn(`   ⚠️  Only found ${exerciseIds.length}/${template.exercises.length} exercises`);
      }

      // Create workout template document
      const workoutData = {
        name: template.name,
        description: template.description,
        exercises: exerciseIds, // Array of {exerciseId: "xxx"}
        estimatedDuration: template.estimatedDuration,
        difficulty: template.difficulty,
        category: template.category,
        targetMuscleGroups: template.targetMuscleGroups,
        equipment: template.equipment,
        tags: template.tags,
        scope: 'company',
        isActive: true,
        usageCount: 0,
        createdBy: userId,
        createdByName: userName,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      await db.collection('workoutTemplates').add(workoutData);
      successCount++;
      console.log(`✅ [${i + 1}/${workoutTemplates.length}] Created: ${template.name} (${exerciseIds.length} exercises)`);
      
    } catch (error) {
      errorCount++;
      console.error(`❌ [${i + 1}/${workoutTemplates.length}] Failed: ${template.name}`, error.message);
    }
  }

  console.log('\n🎉 Seed completed!');
  console.log(`✅ Successfully created: ${successCount} workout templates`);
  if (errorCount > 0) {
    console.log(`❌ Failed: ${errorCount} workout templates`);
  }
  console.log('\n📚 Your workout template library is now ready to use!');
  console.log('💡 Next step: Go to your trainer dashboard → Workouts tab to view and assign workouts');
  
  process.exit(0);
}

// Run the seed
seedWorkouts().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});