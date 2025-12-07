/**
 * WORKOUT MANAGEMENT CLOUD FUNCTIONS
 * Handles business logic for the polymorphic workout system
 * 
 * Collections:
 * - exercises: Exercise library
 * - workoutTemplates: Workout blueprints
 * - workoutAssignments: Configured workouts assigned to clients
 * - workoutExecutions: Actual performance tracking
 */

const {onCall} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Load shared configuration
const sharedConfig = require("./firebase-config.json");

/**
 * Assign a workout template to a client with configured parameters
 * Creates a WorkoutAssignment with polymorphic exercise configurations
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutTemplateId - Required template reference
 * @param {string} request.data.clientId - Client to assign to
 * @param {Array} request.data.exercises - Configured exercises with polymorphic configs
 * @param {string} request.data.scheduledDate - ISO 8601 date (YYYY-MM-DD)
 * @param {string} request.data.dueDate - Optional due date
 * @param {string} request.data.notes - Optional trainer notes
 * @return {Object} Created assignment with ID
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
    if (!data.workoutTemplateId || !data.clientId || !data.exercises || !data.scheduledDate) {
      throw new Error("Missing required fields: workoutTemplateId, clientId, exercises, scheduledDate");
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

    // Validate each exercise has required fields
    for (let i = 0; i < data.exercises.length; i++) {
      const exercise = data.exercises[i];
      if (!exercise.exerciseId || !exercise.exerciseName || !exercise.exerciseType || !exercise.configuration) {
        throw new Error(`Exercise at index ${i} is missing required fields`);
      }

      // Validate configuration has exerciseType
      if (!exercise.configuration.exerciseType) {
        throw new Error(`Exercise at index ${i} configuration missing exerciseType`);
      }

      // Validate exerciseType matches between exercise and configuration
      if (exercise.exerciseType !== exercise.configuration.exerciseType) {
        throw new Error(`Exercise at index ${i} has mismatched exerciseType`);
      }
    }

    // Helper function to parse date string (YYYY-MM-DD) to Timestamp
    const parseDate = (dateStr) => {
      if (!dateStr) return null;
      const [year, month, day] = dateStr.split('-');
      // Create date at midnight UTC for the given date
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      return admin.firestore.Timestamp.fromDate(date);
    };

    // Create assignment document
    const assignmentRef = admin.firestore().collection("workoutAssignments").doc();
    const now = admin.firestore.Timestamp.now();

    const assignmentData = {
      id: assignmentRef.id,
      workoutTemplateId: data.workoutTemplateId,
      clientId: data.clientId,
      trainerId: trainerId,
      name: data.name || templateData.name,
      description: data.description || templateData.description || "",
      scheduledDate: parseDate(data.scheduledDate),
      assignedAt: now,
      dueDate: parseDate(data.dueDate),
      status: "scheduled",
      completionPercentage: 0,
      exercises: data.exercises,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    // Use transaction to increment template usage count and create assignment
    await admin.firestore().runTransaction(async (transaction) => {
      // Increment template usageCount
      transaction.update(templateRef, {
        usageCount: admin.firestore.FieldValue.increment(1),
        updatedAt: now,
      });

      // Create assignment
      transaction.set(assignmentRef, assignmentData);
    });

    logger.info("Workout assigned successfully", {
      assignmentId: assignmentRef.id,
      trainerId,
      clientId: data.clientId,
      templateId: data.workoutTemplateId,
    });

    return {
      success: true,
      assignmentId: assignmentRef.id,
      assignment: assignmentData,
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
 * Start a workout execution
 * Creates a WorkoutExecution document to track actual performance
 * 
 * @param {Object} request.data
 * @param {string} request.data.workoutAssignmentId - Assignment to execute
 * @return {Object} Created execution with ID
 */
exports.startWorkoutExecution = onCall({
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
    if (!data.workoutAssignmentId) {
      throw new Error("Missing required field: workoutAssignmentId");
    }

    logger.info("Starting workout execution", {
      clientId,
      assignmentId: data.workoutAssignmentId,
    });

    // Get assignment
    const assignmentRef = admin.firestore().collection("workoutAssignments").doc(data.workoutAssignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      throw new Error("Workout assignment not found");
    }

    const assignmentData = assignmentDoc.data();

    // Verify client owns this assignment
    if (assignmentData.clientId !== clientId) {
      throw new Error("Unauthorized: You can only execute your own workouts");
    }

    // Check if already has an execution
    const existingExecutionsQuery = await admin.firestore()
        .collection("workoutExecutions")
        .where("workoutAssignmentId", "==", data.workoutAssignmentId)
        .where("clientId", "==", clientId)
        .limit(1)
        .get();

    if (!existingExecutionsQuery.empty) {
      const existingExecution = existingExecutionsQuery.docs[0];
      const existingData = existingExecution.data();

      // If existing execution is not completed, return it
      if (existingData.completionStatus !== "completed") {
        logger.info("Returning existing in-progress execution", {
          executionId: existingExecution.id,
        });

        return {
          success: true,
          executionId: existingExecution.id,
          execution: existingData,
          resumed: true,
        };
      }
    }

    // Create execution document
    const executionRef = admin.firestore().collection("workoutExecutions").doc();
    const now = admin.firestore.Timestamp.now();

    // Initialize exercises with planned configuration
    const exercises = assignmentData.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      exerciseType: exercise.exerciseType,
      completionStatus: "not_started",
      completionPercentage: 0,
      plannedConfiguration: exercise.configuration,
      actualConfiguration: null, // Will be filled as client performs
      notes: "",
      deviations: [],
    }));

    const executionData = {
      id: executionRef.id,
      workoutAssignmentId: data.workoutAssignmentId,
      clientId: clientId,
      trainerId: assignmentData.trainerId,
      startedAt: now,
      completedAt: null,
      durationMinutes: 0,
      overallNotes: "",
      completionStatus: "in_progress",
      exercises: exercises,
      createdAt: now,
    };

    // Use transaction to create execution and update assignment status
    await admin.firestore().runTransaction(async (transaction) => {
      // Update assignment status to in_progress
      transaction.update(assignmentRef, {
        status: "in_progress",
        updatedAt: now,
      });

      // Create execution
      transaction.set(executionRef, executionData);
    });

    logger.info("Workout execution started successfully", {
      executionId: executionRef.id,
      clientId,
      assignmentId: data.workoutAssignmentId,
    });

    return {
      success: true,
      executionId: executionRef.id,
      execution: executionData,
      resumed: false,
    };
  } catch (error) {
    logger.error("Error starting workout execution", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to start workout execution: ${error.message}`);
  }
});

/**
 * Update workout execution with actual performance data
 * Tracks exercise-by-exercise actual performance
 * 
 * @param {Object} request.data
 * @param {string} request.data.executionId - Execution to update
 * @param {Array} request.data.exercises - Updated exercises with actual data
 * @param {number} request.data.durationMinutes - Current duration
 * @param {string} request.data.overallNotes - Client notes
 * @return {Object} Success response
 */
exports.updateWorkoutExecution = onCall({
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
    if (!data.executionId) {
      throw new Error("Missing required field: executionId");
    }

    logger.info("Updating workout execution", {
      clientId,
      executionId: data.executionId,
    });

    // Get execution
    const executionRef = admin.firestore().collection("workoutExecutions").doc(data.executionId);
    const executionDoc = await executionRef.get();

    if (!executionDoc.exists) {
      throw new Error("Workout execution not found");
    }

    const executionData = executionDoc.data();

    // Verify client owns this execution
    if (executionData.clientId !== clientId) {
      throw new Error("Unauthorized: You can only update your own executions");
    }

    // Prepare update
    const updates = {
      updatedAt: admin.firestore.Timestamp.now(),
    };

    if (data.exercises) {
      updates.exercises = data.exercises;

      // Calculate overall completion percentage
      let totalCompletion = 0;
      data.exercises.forEach((exercise) => {
        totalCompletion += exercise.completionPercentage || 0;
      });
      updates.completionPercentage = Math.round(totalCompletion / data.exercises.length);
    }

    if (data.durationMinutes !== undefined) {
      updates.durationMinutes = data.durationMinutes;
    }

    if (data.overallNotes !== undefined) {
      updates.overallNotes = data.overallNotes;
    }

    // Update execution
    await executionRef.update(updates);

    logger.info("Workout execution updated successfully", {
      executionId: data.executionId,
      clientId,
    });

    return {
      success: true,
      executionId: data.executionId,
    };
  } catch (error) {
    logger.error("Error updating workout execution", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to update workout execution: ${error.message}`);
  }
});

/**
 * Complete a workout execution
 * Finalizes the execution and updates assignment status
 * 
 * @param {Object} request.data
 * @param {string} request.data.executionId - Execution to complete
 * @param {Array} request.data.exercises - Final exercises with actual data
 * @param {number} request.data.durationMinutes - Final duration
 * @param {string} request.data.overallNotes - Final client notes
 * @return {Object} Success response with stats
 */
exports.completeWorkoutExecution = onCall({
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
    if (!data.executionId) {
      throw new Error("Missing required field: executionId");
    }

    logger.info("Completing workout execution", {
      clientId,
      executionId: data.executionId,
    });

    // Get execution
    const executionRef = admin.firestore().collection("workoutExecutions").doc(data.executionId);
    const executionDoc = await executionRef.get();

    if (!executionDoc.exists) {
      throw new Error("Workout execution not found");
    }

    const executionData = executionDoc.data();

    // Verify client owns this execution
    if (executionData.clientId !== clientId) {
      throw new Error("Unauthorized: You can only complete your own executions");
    }

    // Calculate completion status based on exercises
    let completedCount = 0;
    let partialCount = 0;
    const exercises = data.exercises || executionData.exercises;

    exercises.forEach((exercise) => {
      if (exercise.completionStatus === "completed") {
        completedCount++;
      } else if (exercise.completionStatus === "partial") {
        partialCount++;
      }
    });

    const totalExercises = exercises.length;
    let overallStatus = "completed";
    if (completedCount === 0) {
      overallStatus = "not_started";
    } else if (completedCount < totalExercises) {
      overallStatus = "partial";
    }

    const completionPercentage = Math.round((completedCount / totalExercises) * 100);

    const now = admin.firestore.Timestamp.now();

    // Use transaction to update both execution and assignment
    await admin.firestore().runTransaction(async (transaction) => {
      // Update execution
      transaction.update(executionRef, {
        exercises: exercises,
        completedAt: now,
        durationMinutes: data.durationMinutes || executionData.durationMinutes,
        overallNotes: data.overallNotes || executionData.overallNotes || "",
        completionStatus: overallStatus,
        completionPercentage: completionPercentage,
        updatedAt: now,
      });

      // Update assignment
      const assignmentRef = admin.firestore()
          .collection("workoutAssignments")
          .doc(executionData.workoutAssignmentId);

      const assignmentDoc = await transaction.get(assignmentRef);
      if (assignmentDoc.exists) {
        transaction.update(assignmentRef, {
          status: overallStatus === "completed" ? "completed" : "in_progress",
          completionPercentage: completionPercentage,
          updatedAt: now,
        });
      }
    });

    logger.info("Workout execution completed successfully", {
      executionId: data.executionId,
      clientId,
      completionStatus: overallStatus,
      completionPercentage,
      completedExercises: completedCount,
      totalExercises,
    });

    return {
      success: true,
      executionId: data.executionId,
      completionStatus: overallStatus,
      completionPercentage,
      stats: {
        completedExercises: completedCount,
        partialExercises: partialCount,
        totalExercises,
      },
    };
  } catch (error) {
    logger.error("Error completing workout execution", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Failed to complete workout execution: ${error.message}`);
  }
});

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
      id: templateRef.id,
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

    // Check for active assignments unless force is true
    if (!data.force) {
      const activeAssignmentsQuery = await admin.firestore()
          .collection("workoutAssignments")
          .where("workoutTemplateId", "==", data.templateId)
          .where("status", "in", ["scheduled", "in_progress"])
          .limit(1)
          .get();

      if (!activeAssignmentsQuery.empty) {
        throw new Error(
            "Cannot delete template: It has active assignments. " +
        "Please complete or cancel those assignments first, or use force=true to delete anyway."
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
