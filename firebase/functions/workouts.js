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
      scheduledDate: data.scheduledDate,
      assignedAt: now,
      dueDate: data.dueDate || null,
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
