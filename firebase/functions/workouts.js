/**
 * WORKOUT MANAGEMENT CLOUD FUNCTIONS (UNIFIED MODEL)
 * Handles business logic for the unified workout system
 * 
 * Collections:
 * - exercises: Exercise library
 * - workoutTemplates: Workout blueprints
 * - workouts: Unified workout documents (assignment + execution)
 * 
 * REFACTORED: January 2026
 * - Merged workoutAssignments and workoutExecutions into single 'workouts' collection
 * - Prescribed and actual data live side-by-side in same document
 * - Single source of truth for workout lifecycle
 */

const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Load shared configuration
const sharedConfig = require("./firebase-config.json");

/**
 * Assign a workout template to a client with configured parameters
 * Creates a unified Workout document with prescribed configuration
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutTemplateId - Required template reference
 * @param {string} request.data.clientId - Client to assign to
 * @param {string} request.data.name - Workout name
 * @param {string} request.data.description - Optional description
 * @param {Array} request.data.exercises - Configured exercises with polymorphic configs
 * @param {string} request.data.scheduledDate - ISO 8601 date (YYYY-MM-DD)
 * @param {string} request.data.dueDate - Optional due date
 * @param {string} request.data.notes - Optional trainer notes
 * @return {Object} Created workout with ID
 */
exports.assignWorkout = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.workoutTemplateId || !data.clientId || !data.exercises || !data.scheduledDate || !data.dueDate) {
      throw new Error("Missing required fields: workoutTemplateId, clientId, exercises, scheduledDate, dueDate");
    }

    logger.info("Assigning workout to client", {
      trainerId,
      clientId: data.clientId,
      templateId: data.workoutTemplateId,
      exerciseCount: data.exercises.length,
    });

    // Verify template exists
    const templateRef = admin.firestore().collection("workoutTemplates").doc(data.workoutTemplateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      throw new Error("Workout template not found");
    }

    const templateData = templateDoc.data();

    // Verify client exists
    const clientRef = admin.firestore().collection("users").doc(data.clientId);
    const clientDoc = await clientRef.get();

    if (!clientDoc.exists) {
      throw new Error("Client not found");
    }

    // Validate exercises array structure
    if (!Array.isArray(data.exercises) || data.exercises.length === 0) {
      throw new Error("Exercises must be a non-empty array");
    }

    // Validate and transform exercises for unified model
    const workoutExercises = [];
    for (let i = 0; i < data.exercises.length; i++) {
      const exercise = data.exercises[i];
      
      if (!exercise.exerciseId || !exercise.exerciseName || !exercise.exerciseType || !exercise.configuration) {
        throw new Error(`Exercise at index ${i} is missing required fields`);
      }

      // Validate configuration has exerciseType
      if (!exercise.configuration.exerciseType) {
        throw new Error(`Exercise at index ${i} configuration missing exerciseType`);
      }

      // Validate exerciseType matches
      if (exercise.exerciseType !== exercise.configuration.exerciseType) {
        throw new Error(`Exercise at index ${i} has mismatched exerciseType`);
      }

      // Transform to unified model: prescribed + actual (initially null)
      workoutExercises.push({
        exerciseId: exercise.exerciseId,
        exerciseName: exercise.exerciseName,
        exerciseType: exercise.exerciseType,
        prescribed: exercise.configuration, // What trainer prescribed
        actual: null, // What client actually did (null until they start)
        completionStatus: 'not_started',
        completionPercentage: 0,
        notes: exercise.notes || "",
      });
    }

    const now = admin.firestore.Timestamp.now();
    const workoutRef = admin.firestore().collection("workouts").doc();

    const workoutData = {
      workoutTemplateId: data.workoutTemplateId,
      clientId: data.clientId,
      trainerId: trainerId,
      name: data.name || templateData.name,
      description: data.description || templateData.description || "",
      assignedAt: now,
      scheduledDate: admin.firestore.Timestamp.fromDate(new Date(data.scheduledDate)),
      dueDate: admin.firestore.Timestamp.fromDate(new Date(data.dueDate)),
      notes: data.notes || "",
      
      // Lifecycle tracking
      status: "scheduled",
      startedAt: null,
      completedAt: null,
      durationMinutes: null,
      
      // Exercise data (prescribed + actual side-by-side)
      exercises: workoutExercises,
      
      // Overall feedback
      overallDifficulty: null,
      overallNotes: null,
      
      // Timestamps
      createdAt: now,
      updatedAt: now,
    };

    // Use transaction to increment template usage count and create workout
    await admin.firestore().runTransaction(async (transaction) => {
      // Increment template usageCount
      transaction.update(templateRef, {
        usageCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

      // Create unified workout
      transaction.set(workoutRef, workoutData);
    });

    logger.info("Workout assigned successfully (unified model)", {
      workoutId: workoutRef.id,
      trainerId,
      clientId: data.clientId,
      templateId: data.workoutTemplateId,
    });

    return {
      success: true,
      workoutId: workoutRef.id,
      workout: workoutData,
    };
  } catch (error) {
    logger.error("Error assigning workout", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Workout assignment failed: ${error.message}`);
  }
});

/**
 * Save workout progress (unified create/update)
 * Updates the workout document with client's actual performance data
 * Handles both initial save and subsequent updates
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutId - Workout to update
 * @param {Array} request.data.exercises - Updated exercises with actual data
 * @param {number} request.data.durationMinutes - Current duration
 * @param {string} request.data.overallDifficulty - Optional difficulty rating
 * @param {string} request.data.overallNotes - Optional client notes
 * @return {Object} Success response
 */
exports.saveWorkout = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const clientId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.workoutId) {
      throw new Error("Missing required field: workoutId");
    }

    logger.info("Saving workout progress", {
      clientId,
      workoutId: data.workoutId,
    });

    // Get workout
    const workoutRef = admin.firestore().collection("workouts").doc(data.workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      throw new Error("Workout not found");
    }

    const workoutData = workoutDoc.data();

    // Verify client owns this workout
    if (workoutData.clientId !== clientId) {
      throw new Error("Unauthorized: You can only save your own workouts");
    }

    const now = admin.firestore.Timestamp.now();
    
    // Prepare update
    const updates = {
      updatedAt: now,
    };

    // Update status to 'started' if it was 'scheduled'
    if (workoutData.status === 'scheduled') {
      updates.status = 'started';
      updates.startedAt = now;
    }

    // Update exercises with actual data
    if (data.exercises) {
      updates.exercises = data.exercises;

      // Calculate overall completion percentage
      let totalCompletion = 0;
      data.exercises.forEach((exercise) => {
        totalCompletion += exercise.completionPercentage || 0;
      });
      
      // Update completion status based on exercises
      const completedCount = data.exercises.filter(ex => ex.completionStatus === 'completed').length;
      if (completedCount === data.exercises.length) {
        updates.status = 'completed';
        updates.completedAt = now;
      } else if (completedCount > 0) {
        updates.status = 'started';
      }
    }

    if (data.durationMinutes !== undefined) {
      updates.durationMinutes = data.durationMinutes;
    }

    if (data.overallDifficulty !== undefined) {
      updates.overallDifficulty = data.overallDifficulty;
    }

    if (data.overallNotes !== undefined) {
      updates.overallNotes = data.overallNotes;
    }

    // Update workout
    await workoutRef.update(updates);

    logger.info("Workout progress saved successfully", {
      workoutId: data.workoutId,
      clientId,
      status: updates.status || workoutData.status,
    });

    return {
      success: true,
      workoutId: data.workoutId,
      status: updates.status || workoutData.status,
    };
  } catch (error) {
    logger.error("Error saving workout progress", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to save workout progress: ${error.message}`);
  }
});

/**
 * Complete a workout
 * Finalizes the workout and marks it as completed
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutId - Workout to complete
 * @param {Array} request.data.exercises - Final exercises with actual data
 * @param {number} request.data.durationMinutes - Final duration
 * @param {string} request.data.overallDifficulty - Difficulty rating
 * @param {string} request.data.overallNotes - Final client notes
 * @return {Object} Success response with stats
 */
exports.completeWorkout = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const clientId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.workoutId) {
      throw new Error("Missing required field: workoutId");
    }

    logger.info("Completing workout", {
      clientId,
      workoutId: data.workoutId,
    });

    // Get workout
    const workoutRef = admin.firestore().collection("workouts").doc(data.workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      throw new Error("Workout not found");
    }

    const workoutData = workoutDoc.data();

    // Verify client owns this workout
    if (workoutData.clientId !== clientId) {
      throw new Error("Unauthorized: You can only complete your own workouts");
    }

    const exercises = data.exercises || workoutData.exercises;

    // Update completionStatus for each exercise based on completionPercentage
    exercises.forEach((exercise) => {
      const percentage = exercise.completionPercentage || 0;
      if (percentage >= 80) {
        exercise.completionStatus = 'completed';
      } else if (percentage > 0) {
        exercise.completionStatus = 'partial';
      } else {
        exercise.completionStatus = 'not_started';
      }
    });

    // Calculate completion stats
    let completedCount = 0;
    let partialCount = 0;
    exercises.forEach((exercise) => {
      if (exercise.completionStatus === 'completed') {
        completedCount++;
      } else if (exercise.completionStatus === 'partial') {
        partialCount++;
      }
    });

    const totalExercises = exercises.length;
    
    // Use provided completedAt timestamp (from client) or default to now
    const completedAt = data.completedAt 
      ? admin.firestore.Timestamp.fromDate(new Date(data.completedAt))
      : admin.firestore.Timestamp.now();
    
    // Calculate startedAt: completedAt - durationMinutes
    const durationMinutes = data.durationMinutes || workoutData.durationMinutes || 45;
    const startedAtMillis = completedAt.toMillis() - (durationMinutes * 60 * 1000);
    const startedAt = admin.firestore.Timestamp.fromMillis(startedAtMillis);

    // ============================================================================
    // PERSONAL RECORDS DETECTION & STORAGE
    // ============================================================================
    
    const now = admin.firestore.Timestamp.now();
    const personalRecords = {}; // Track PRs detected in this workout
    
    // Get client stats document
    const clientStatsRef = admin.firestore().collection('clientStats').doc(clientId);
    const clientStatsDoc = await clientStatsRef.get();
    
    let clientStats = clientStatsDoc.exists ? clientStatsDoc.data() : {
      strengthRecords: {},
      updatedAt: now
    };
    
    if (!clientStats.strengthRecords) {
      clientStats.strengthRecords = {};
    }
    
    // Process each exercise to detect PRs
    for (const exercise of exercises) {
      // Only process strength exercises with actual data
      if (exercise.exerciseType !== 'strength' || !exercise.actual || exercise.actual.type !== 'strength') {
        continue;
      }
      
      // Find max weight lifted in this workout
      let maxWeight = 0;
      let weightUnit = 'lbs';
      
      if (exercise.actual.completedSets && Array.isArray(exercise.actual.completedSets)) {
        for (const set of exercise.actual.completedSets) {
          if (set.completed && set.actualWeight) {
            if (set.actualWeight > maxWeight) {
              maxWeight = set.actualWeight;
              weightUnit = set.actualWeightUnit || 'lbs';
            }
          }
        }
      }
      
      // Skip if no weight was lifted
      if (maxWeight === 0) continue;
      
      // Check if this is a new PR
      const exerciseId = exercise.exerciseId;
      const existingRecord = clientStats.strengthRecords[exerciseId];
      
      if (!existingRecord || maxWeight > existingRecord.maxWeight) {
        // New PR detected!
        const oldMax = existingRecord ? existingRecord.maxWeight : 0;
        
        // Update clientStats
        clientStats.strengthRecords[exerciseId] = {
          exerciseName: exercise.exerciseName,
          maxWeight: maxWeight,
          weightUnit: weightUnit,
          date: completedAt,
          workoutId: data.workoutId
        };
        
        // Store PR in workout doc for display
        personalRecords[exerciseId] = {
          exerciseName: exercise.exerciseName,
          newMax: maxWeight,
          oldMax: oldMax,
          improvement: maxWeight - oldMax,
          weightUnit: weightUnit,
          isNewPR: true
        };
        
        logger.info('Personal Record detected', {
          clientId,
          workoutId: data.workoutId,
          exerciseId,
          exerciseName: exercise.exerciseName,
          newMax: maxWeight,
          oldMax: oldMax
        });
      }
    }
    
    // Update clientStats document if there were any PRs
    if (Object.keys(personalRecords).length > 0) {
      clientStats.updatedAt = now;
      await clientStatsRef.set(clientStats, { merge: true });
    }

    // Update workout with PR data
    await workoutRef.update({
      status: 'completed',
      startedAt: startedAt,
      completedAt: completedAt,
      exercises: exercises,
      durationMinutes: durationMinutes,
      overallDifficulty: data.overallDifficulty || workoutData.overallDifficulty,
      overallNotes: data.overallNotes || workoutData.overallNotes || "",
      personalRecords: personalRecords, // Store detected PRs
      updatedAt: now,
    });

    logger.info("Workout completed successfully", {
      workoutId: data.workoutId,
      clientId,
      completedExercises: completedCount,
      totalExercises,
    });

    return {
      success: true,
      workoutId: data.workoutId,
      stats: {
        completedExercises: completedCount,
        partialExercises: partialCount,
        totalExercises,
        completionPercentage: Math.round((completedCount / totalExercises) * 100),
      },
    };
  } catch (error) {
    logger.error("Error completing workout", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to complete workout: ${error.message}`);
  }
});

// ============================================================================
// WORKOUT TEMPLATE FUNCTIONS (Unchanged - still work with templates)
// ============================================================================

/**
 * Create a new workout template with atomic exercise usage count updates
 * Ensures data integrity by using transactions
 * 
 * @param {Object} request.data
 * @param {string} request.data.name - Template name
 * @param {string} request.data.description - Template description
 * @param {string} request.data.difficulty - beginner | intermediate | advanced
 * @param {string} request.data.category - strength | cardio | hiit | flexibility | mixed
 * @param {number} request.data.estimatedDuration - Duration in minutes
 * @param {string} request.data.scope - personal | company
 * @param {Array} request.data.tags - Tags array
 * @param {Array} request.data.exercises - Array of {exerciseId: string}
 * @param {Array} request.data.targetMuscleGroups - Muscle groups array
 * @param {Array} request.data.equipment - Equipment array
 * @return {Object} Created template with ID
 */
exports.createWorkoutTemplate = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.name || !data.exercises || !Array.isArray(data.exercises) || data.exercises.length === 0) {
      throw new Error("Missing required fields: name and exercises array");
    }

    logger.info("Creating workout template", {
      trainerId,
      name: data.name,
      exerciseCount: data.exercises.length,
    });

    // Extract unique exercise IDs
    const exerciseIds = [...new Set(data.exercises.map((ex) => ex.exerciseId))];

    // Validate all exercises exist
    const exerciseRefs = exerciseIds.map((id) => admin.firestore().collection("exercises").doc(id));
    const exerciseDocs = await admin.firestore().getAll(...exerciseRefs);

    const missingExercises = exerciseDocs
        .map((doc, index) => ({doc, id: exerciseIds[index]}))
        .filter(({doc}) => !doc.exists)
        .map(({id}) => id);

    if (missingExercises.length > 0) {
      throw new Error(`Exercise(s) not found: ${missingExercises.join(", ")}`);
    }

    // Get trainer's name
    let trainerName = "Unknown Trainer";
    try {
      const adminDoc = await admin.firestore().collection("admins").doc(trainerId).get();
      if (adminDoc.exists) {
        trainerName = adminDoc.data().name;
      } else {
        const trainerDoc = await admin.firestore().collection("trainers").doc(trainerId).get();
        if (trainerDoc.exists) {
          trainerName = trainerDoc.data().name;
        }
      }
    } catch (error) {
      logger.warn("Could not fetch trainer name", {trainerId, error: error.message});
    }

    const now = admin.firestore.Timestamp.now();
    const templateRef = admin.firestore().collection("workoutTemplates").doc();

    const templateData = {
      name: data.name,
      description: data.description || "",
      difficulty: data.difficulty || "beginner",
      category: data.category || "strength",
      estimatedDuration: data.estimatedDuration || 45,
      scope: data.scope || "personal",
      tags: data.tags || [],
      targetMuscleGroups: data.targetMuscleGroups || [],
      equipment: data.equipment || [],
      exercises: data.exercises,
      isActive: true,
      usageCount: 0,
      createdBy: trainerId,
      createdByName: trainerName,
      createdAt: now,
      updatedAt: now,
    };

    // Use transaction to create template and increment exercise usage counts atomically
    await admin.firestore().runTransaction(async (transaction) => {
      // Create template
      transaction.set(templateRef, templateData);

      // Increment usageCount for each exercise
      for (const exerciseId of exerciseIds) {
        const exerciseRef = admin.firestore().collection("exercises").doc(exerciseId);
        transaction.update(exerciseRef, {
          usageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        });
      }
    });

    logger.info("Workout template created successfully", {
      templateId: templateRef.id,
      trainerId,
      name: data.name,
      exerciseCount: exerciseIds.length,
    });

    return {
      success: true,
      templateId: templateRef.id,
      template: templateData,
    };
  } catch (error) {
    logger.error("Error creating workout template", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to create workout template: ${error.message}`);
  }
});

/**
 * Update an existing workout template with atomic exercise usage count updates
 * Handles the diff of added/removed exercises to maintain accurate counts
 * 
 * @param {Object} request.data
 * @param {string} request.data.templateId - Template to update
 * @param {string} request.data.name - Updated name
 * @param {string} request.data.description - Updated description
 * @param {string} request.data.difficulty - Updated difficulty
 * @param {string} request.data.category - Updated category
 * @param {number} request.data.estimatedDuration - Updated duration
 * @param {string} request.data.scope - Updated scope
 * @param {Array} request.data.tags - Updated tags
 * @param {Array} request.data.exercises - Updated exercises array
 * @param {Array} request.data.targetMuscleGroups - Updated muscle groups
 * @param {Array} request.data.equipment - Updated equipment
 * @return {Object} Success response
 */
exports.updateWorkoutTemplate = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.templateId) {
      throw new Error("Missing required field: templateId");
    }

    if (!data.exercises || !Array.isArray(data.exercises) || data.exercises.length === 0) {
      throw new Error("Exercises array is required and must not be empty");
    }

    logger.info("Updating workout template", {
      trainerId,
      templateId: data.templateId,
      exerciseCount: data.exercises.length,
    });

    const templateRef = admin.firestore().collection("workoutTemplates").doc(data.templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      throw new Error("Workout template not found");
    }

    const oldTemplateData = templateDoc.data();

    // Verify ownership (trainers can only edit their own templates)
    if (oldTemplateData.createdBy !== trainerId) {
      throw new Error("Unauthorized: You can only edit your own templates");
    }

    // Extract old and new exercise IDs
    const oldExerciseIds = [...new Set((oldTemplateData.exercises || []).map((ex) => ex.exerciseId))];
    const newExerciseIds = [...new Set(data.exercises.map((ex) => ex.exerciseId))];

    // Calculate diff
    const addedExerciseIds = newExerciseIds.filter((id) => !oldExerciseIds.includes(id));
    const removedExerciseIds = oldExerciseIds.filter((id) => !newExerciseIds.includes(id));

    // Validate all new exercises exist
    if (addedExerciseIds.length > 0) {
      const exerciseRefs = addedExerciseIds.map((id) => admin.firestore().collection("exercises").doc(id));
      const exerciseDocs = await admin.firestore().getAll(...exerciseRefs);

      const missingExercises = exerciseDocs
          .map((doc, index) => ({doc, id: addedExerciseIds[index]}))
          .filter(({doc}) => !doc.exists)
          .map(({id}) => id);

      if (missingExercises.length > 0) {
        throw new Error(`Exercise(s) not found: ${missingExercises.join(", ")}`);
      }
    }

    // Get trainer's name for lastEditedBy
    let trainerName = "Unknown Trainer";
    try {
      const adminDoc = await admin.firestore().collection("admins").doc(trainerId).get();
      if (adminDoc.exists) {
        trainerName = adminDoc.data().name;
      } else {
        const trainerDoc = await admin.firestore().collection("trainers").doc(trainerId).get();
        if (trainerDoc.exists) {
          trainerName = trainerDoc.data().name;
        }
      }
    } catch (error) {
      logger.warn("Could not fetch trainer name", {trainerId, error: error.message});
    }

    const now = admin.firestore.Timestamp.now();

    const updatedTemplateData = {
      name: data.name,
      description: data.description || "",
      difficulty: data.difficulty || oldTemplateData.difficulty,
      category: data.category || oldTemplateData.category,
      estimatedDuration: data.estimatedDuration || oldTemplateData.estimatedDuration,
      scope: data.scope || oldTemplateData.scope,
      tags: data.tags || [],
      targetMuscleGroups: data.targetMuscleGroups || [],
      equipment: data.equipment || [],
      exercises: data.exercises,
      lastEditedBy: trainerId,
      lastEditedByName: trainerName,
      lastEditedAt: now,
      updatedAt: now,
    };

    // Use transaction to update template and adjust exercise usage counts atomically
    await admin.firestore().runTransaction(async (transaction) => {
      // Update template
      transaction.update(templateRef, updatedTemplateData);

      // Increment usageCount for newly added exercises
      for (const exerciseId of addedExerciseIds) {
        const exerciseRef = admin.firestore().collection("exercises").doc(exerciseId);
        transaction.update(exerciseRef, {
          usageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: now,
        });
      }

      // Decrement usageCount for removed exercises
      for (const exerciseId of removedExerciseIds) {
        const exerciseRef = admin.firestore().collection("exercises").doc(exerciseId);
        transaction.update(exerciseRef, {
          usageCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: now,
        });
      }
    });

    logger.info("Workout template updated successfully", {
      templateId: data.templateId,
      trainerId,
      addedExercises: addedExerciseIds.length,
      removedExercises: removedExerciseIds.length,
    });

    return {
      success: true,
      templateId: data.templateId,
      changes: {
        addedExercises: addedExerciseIds.length,
        removedExercises: removedExerciseIds.length,
      },
    };
  } catch (error) {
    logger.error("Error updating workout template", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to update workout template: ${error.message}`);
  }
});

/**
 * Update a workout assignment (scheduled only)
 * Allows editing due date, notes, and exercise configurations
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutId - Workout to update
 * @param {string} request.data.dueDate - Optional new due date (ISO string)
 * @param {string} request.data.notes - Optional new notes
 * @param {Array} request.data.exercises - Optional new exercise configurations
 * @param {string} request.data.name - Optional new assignment name
 * @return {Object} Success response
 */
exports.updateWorkoutAssignment = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.workoutId) {
      throw new Error("Missing required field: workoutId");
    }

    logger.info("Updating workout assignment", {
      trainerId,
      workoutId: data.workoutId,
    });

    // Get workout document
    const workoutRef = admin.firestore().collection("workouts").doc(data.workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      throw new Error("Workout not found");
    }

    const workoutData = workoutDoc.data();

    // Verify trainer owns this workout
    if (workoutData.trainerId !== trainerId) {
      throw new Error("Unauthorized: You can only edit your own assignments");
    }

    // CRITICAL: Only allow editing of scheduled workouts
    if (workoutData.status !== "scheduled") {
      throw new Error(
          `Cannot edit: Workout is ${workoutData.status}. ` +
          `Only scheduled workouts can be edited.`
      );
    }

    const now = admin.firestore.Timestamp.now();
    
    // Prepare update object
    const updates = {
      updatedAt: now,
    };

    // Update due date if provided
    if (data.dueDate) {
      updates.dueDate = admin.firestore.Timestamp.fromDate(new Date(data.dueDate));
    }

    // Update notes if provided
    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }

    // Update name if provided
    if (data.name) {
      updates.name = data.name;
    }

    // Update exercises if provided
    if (data.exercises) {
      // Transform exercises to workout document structure
      updates.exercises = data.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseType: ex.exerciseType,
        prescribed: ex.configuration,  // Transform configuration → prescribed
        actual: ex.actual || null,
        completionStatus: ex.completionStatus || 'not_started',
        completionPercentage: ex.completionPercentage || 0,
        notes: ex.notes || ''
      }));
    }

    // Perform update
    await workoutRef.update(updates);

    logger.info("Workout assignment updated successfully", {
      workoutId: data.workoutId,
      trainerId,
    });

    return {
      success: true,
      workoutId: data.workoutId,
      message: "Workout assignment updated successfully",
    };
  } catch (error) {
    logger.error("Error updating workout assignment", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to update workout assignment: ${error.message}`);
  }
});

/**
 * Delete a workout assignment (scheduled only)
 * Uses transaction to atomically delete workout and decrement template usageCount
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutId - Workout to delete
 * @return {Object} Success response
 */
exports.deleteWorkoutAssignment = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const {workoutId} = request.data;

    // Validate required fields
    if (!workoutId) {
      throw new Error("Missing required field: workoutId");
    }

    logger.info("Deleting workout assignment", {
      trainerId,
      workoutId,
    });

    // Get workout document
    const workoutRef = admin.firestore().collection("workouts").doc(workoutId);
    const workoutDoc = await workoutRef.get();

    if (!workoutDoc.exists) {
      throw new Error("Workout not found");
    }

    const workoutData = workoutDoc.data();

    // Verify trainer owns this workout
    if (workoutData.trainerId !== trainerId) {
      throw new Error("Unauthorized: You can only delete your own assignments");
    }

    // CRITICAL: Only allow deletion of scheduled workouts
    if (workoutData.status !== "scheduled") {
      throw new Error(
          `Cannot delete: Workout is ${workoutData.status}. ` +
          `Only scheduled workouts can be deleted.`
      );
    }

    const now = admin.firestore.Timestamp.now();
    const templateRef = admin.firestore()
        .collection("workoutTemplates")
        .doc(workoutData.workoutTemplateId);

    // Use transaction to atomically delete workout and decrement template usageCount
    await admin.firestore().runTransaction(async (transaction) => {
      // Delete workout document
      transaction.delete(workoutRef);

      // Decrement template usageCount
      transaction.update(templateRef, {
        usageCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: now,
      });
    });

    logger.info("Workout assignment deleted successfully", {
      workoutId,
      trainerId,
      templateId: workoutData.workoutTemplateId,
    });

    return {
      success: true,
      workoutId: workoutId,
      message: "Workout assignment deleted successfully",
    };
  } catch (error) {
    logger.error("Error deleting workout assignment", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to delete workout assignment: ${error.message}`);
  }
});

/**
 * Delete a workout template with atomic exercise usage count updates
 * Checks for active assignments and decrements exercise usage counts
 * 
 * @param {Object} request.data
 * @param {string} request.data.templateId - Template to delete
 * @param {boolean} request.data.force - Force delete even if assigned (defaults to false)
 * @return {Object} Success response
 */
exports.deleteWorkoutTemplate = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const trainerId = request.auth.uid;
    const data = request.data;

    // Validate required fields
    if (!data.templateId) {
      throw new Error("Missing required field: templateId");
    }

    logger.info("Deleting workout template", {
      trainerId,
      templateId: data.templateId,
      force: data.force || false,
    });

    const templateRef = admin.firestore().collection("workoutTemplates").doc(data.templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      throw new Error("Workout template not found");
    }

    const templateData = templateDoc.data();

    // Verify ownership
    if (templateData.createdBy !== trainerId) {
      throw new Error("Unauthorized: You can only delete your own templates");
    }

    // Check for active workouts unless force is true
    if (!data.force) {
      const activeWorkoutsQuery = await admin.firestore()
          .collection("workouts")
          .where("workoutTemplateId", "==", data.templateId)
          .where("status", "in", ["scheduled", "started"])
          .limit(1)
          .get();

      if (!activeWorkoutsQuery.empty) {
        throw new Error(
            "Cannot delete template: It has active workouts. " +
        "Please complete or cancel those workouts first, or use force=true to delete anyway."
        );
      }
    }

    // Extract exercise IDs to decrement their usage counts
    const exerciseIds = [...new Set((templateData.exercises || []).map((ex) => ex.exerciseId))];

    const now = admin.firestore.Timestamp.now();

    // Use transaction to delete template and decrement exercise usage counts atomically
    await admin.firestore().runTransaction(async (transaction) => {
      // Mark template as inactive (soft delete) or hard delete
      if (data.force) {
        transaction.delete(templateRef);
      } else {
        transaction.update(templateRef, {
          isActive: false,
          updatedAt: now,
        });
      }

      // Decrement usageCount for all exercises
      for (const exerciseId of exerciseIds) {
        const exerciseRef = admin.firestore().collection("exercises").doc(exerciseId);
        // Get the exercise to check if it exists before updating
        const exerciseDoc = await transaction.get(exerciseRef);
        if (exerciseDoc.exists) {
          transaction.update(exerciseRef, {
            usageCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: now,
          });
        }
      }
    });

    logger.info("Workout template deleted successfully", {
      templateId: data.templateId,
      trainerId,
      exerciseCount: exerciseIds.length,
      hardDelete: data.force || false,
    });

    return {
      success: true,
      templateId: data.templateId,
      deleted: data.force ? "hard" : "soft",
      exercisesUpdated: exerciseIds.length,
    };
  } catch (error) {
    logger.error("Error deleting workout template", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to delete workout template: ${error.message}`);
  }
});
