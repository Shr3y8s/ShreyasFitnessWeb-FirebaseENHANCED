const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const db = admin.firestore();

// Load shared configuration (copied from root by predeploy hook)
const sharedConfig = require("./firebase-config.json");

/**
 * PHASE 3: CLOUD FUNCTIONS FOR AUTO-TRACKING GOALS
 * 
 * These functions automatically update goal progress (currentValue) and milestone completion
 * when client activities occur.
 * 
 * Auto-tracked categories:
 * - Steps: Monitors dailyActivities for step streaks
 * - Water: Monitors dailyActivities for water intake streaks
 * - Nutrition: Monitors nutritionLogs for meal plan adherence
 * - Workout Consistency: Monitors workout completion frequency
 * - Weight Loss: Monitors weight logs
 * 
 * Manual categories (no auto-tracking):
 * - Strength: Trainer manually updates PRs
 * - Setup: Trainer manually checks off onboarding tasks
 */

/**
 * Helper: Calculate consecutive days streak (flexible)
 * Finds most recent day with data, then counts backwards
 * Returns the current streak length for a given metric
 */
async function calculateStreak(userId, metricChecker, maxDaysToCheck = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Find most recent day with data (within last 30 days)
  let startDay = -1;
  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const meetsTarget = await metricChecker(dateStr);
    
    if (meetsTarget) {
      startDay = i;
      break;  // Found most recent log
    }
  }
  
  if (startDay === -1) return 0;  // No data found
  
  // Count backwards from that day
  let streak = 0;
  for (let i = startDay; i < maxDaysToCheck; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const meetsTarget = await metricChecker(dateStr);
    
    if (meetsTarget) {
      streak++;
    } else {
      break;  // Streak broken
    }
  }
  
  return streak;
}

/**
 * Trigger: When daily activity is logged
 * Updates: Steps and Water goals
 */
exports.onDailyActivityWrite = onDocumentWritten({
  document: 'dailyActivities/{activityId}',
  region: sharedConfig.region,
}, async (event) => {
  const change = event.data;
    try {
      const activityData = change.after.exists ? change.after.data() : null;
      if (!activityData) return null; // Deleted

      // Extract clientId from document ID: {clientId}_{date}
      const activityId = event.params.activityId;
      const clientId = activityId.split('_')[0];
      
      // Query all active goals for this client (steps + water categories)
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', clientId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', 'in', ['steps', 'water'])
        .get();
      
      if (goalsSnapshot.empty) {
        console.log(`No active steps/water goals for user ${clientId}`);
        return null;
      }

      const batch = db.batch();
      
      for (const goalDoc of goalsSnapshot.docs) {
        const goal = goalDoc.data();
        
        if (goal.category === 'steps') {
          // Calculate steps streak using goal's configured dailyTarget
          const stepsStreak = await calculateStreak(clientId, async (dateStr) => {
            const actId = `${clientId}_${dateStr}`;
            const actDoc = await db.collection('dailyActivities').doc(actId).get();
            if (!actDoc.exists) return false;
            const data = actDoc.data();
            // Access nested steps.steps field
            const stepsValue = data.steps?.steps || 0;
            return stepsValue >= (goal.dailyTarget || 10000); // Use configured target
          });
          
          logger.info(`[GOALS] Steps streak calculated for ${clientId}`, { streak: stepsStreak, goalId: goalDoc.id, dailyTarget: goal.dailyTarget });
          
          // Prepare update data - write to currentStreak field
          const updateData = {
            currentStreak: stepsStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Check and update milestones
          if (goal.milestones) {
            const updatedMilestones = goal.milestones.map((m, idx) => {
              const shouldComplete = !m.completed && m.autoTracked && stepsStreak >= m.targetValue;
              if (shouldComplete) {
                logger.info(`[GOALS] Completing milestone ${idx}`, { 
                  text: m.text, 
                  targetValue: m.targetValue, 
                  currentStreak: stepsStreak 
                });
                return {
                  ...m,
                  completed: true,
                  completedAt: admin.firestore.Timestamp.now(),
                  updatedAt: admin.firestore.Timestamp.now()
                };
              }
              return m;
            });
            
            updateData.milestones = updatedMilestones;
            logger.info(`[GOALS] Milestones update prepared`, { 
              goalId: goalDoc.id,
              milestonesCount: updatedMilestones.length 
            });
          }
          
          // Single batch update with both currentValue and milestones
          batch.update(goalDoc.ref, updateData);
          logger.info(`[GOALS] Batch update queued for goal`, { goalId: goalDoc.id, currentValue: stepsStreak });
        }
        
        if (goal.category === 'water') {
          // Calculate water intake streak using goal's configured dailyTarget
          const waterStreak = await calculateStreak(clientId, async (dateStr) => {
            const actId = `${clientId}_${dateStr}`;
            const actDoc = await db.collection('dailyActivities').doc(actId).get();
            if (!actDoc.exists) return false;
            const data = actDoc.data();
            // Access nested water.amount field
            const waterValue = data.water?.amount || 0;
            return waterValue >= (goal.dailyTarget || 64); // Use configured target
          });
          
          logger.info(`[GOALS] Water streak calculated for ${clientId}`, { streak: waterStreak, goalId: goalDoc.id, dailyTarget: goal.dailyTarget });
          
          // Prepare update data - write to currentStreak field
          const updateData = {
            currentStreak: waterStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Check and update milestones
          if (goal.milestones) {
            const updatedMilestones = goal.milestones.map(m => {
              if (!m.completed && m.autoTracked && waterStreak >= m.targetValue) {
                return {
                  ...m,
                  completed: true,
                  completedAt: admin.firestore.Timestamp.now(),
                  updatedAt: admin.firestore.Timestamp.now()
                };
              }
              return m;
            });
            
            updateData.milestones = updatedMilestones;
          }
          
          // Single batch update with both currentValue and milestones
          batch.update(goalDoc.ref, updateData);
        }
      }
      
      await batch.commit();
      logger.info(`[GOALS] Batch committed successfully for user ${clientId}`);
      console.log(`Updated goals for user ${clientId} after activity log`);
      return null;
    } catch (error) {
      console.error('Error updating goals after activity:', error);
      return null;
    }
  });

/**
 * Helper: Calculate on-time workout completion streak (incremental with gap checking)
 * Counts consecutive workouts completed on or before their due date
 * Checks for missed/late workouts in the gap between last and current
 */
async function calculateWorkoutStreak(clientId, currentWorkout, goalData) {
  try {
    const currentStreak = goalData?.currentStreak || 0;
    const lastWorkout = goalData?.lastStreakWorkout;
    
    // If no previous workout, start streak
    if (!lastWorkout) {
      const isOnTime = currentWorkout.completedAt.toMillis() <= currentWorkout.dueDate.toMillis();
      return {
        streak: isOnTime ? 1 : 0,
        lastWorkout: isOnTime ? {
          workoutId: currentWorkout.id,
          dueDate: currentWorkout.dueDate,
          completedAt: currentWorkout.completedAt
        } : null
      };
    }
    
    // Check if current workout is on time
    const currentIsOnTime = currentWorkout.completedAt.toMillis() <= currentWorkout.dueDate.toMillis();
    
    if (!currentIsOnTime) {
      // Late completion resets streak
      return { streak: 0, lastWorkout: null };
    }
    
    // Query for workouts in the gap (dueDate between last and current)
    const gapWorkouts = await db.collection('workouts')
      .where('clientId', '==', clientId)
      .where('dueDate', '>', lastWorkout.dueDate)
      .where('dueDate', '<', currentWorkout.dueDate)
      .get();
    
    // Check if any gap workouts were missed or late
    for (const doc of gapWorkouts.docs) {
      const workout = doc.data();
      
      // If not completed, streak broken
      if (workout.status !== 'completed') {
        return { streak: 0, lastWorkout: null };
      }
      
      // If completed late, streak broken
      if (workout.completedAt && workout.completedAt.toMillis() > workout.dueDate.toMillis()) {
        return { streak: 0, lastWorkout: null };
      }
    }
    
    // All gap workouts completed on time + current is on time
    // Increment streak by 1 (gap workouts don't add to streak, they just don't break it)
    const newStreak = currentStreak + 1;
    
    return {
      streak: newStreak,
      lastWorkout: {
        workoutId: currentWorkout.id,
        dueDate: currentWorkout.dueDate,
        completedAt: currentWorkout.completedAt
      }
    };
  } catch (error) {
    logger.error('Error calculating workout streak:', error);
    return { streak: 0, lastWorkout: null };
  }
}

/**
 * Trigger: When workout is completed
 * Updates: Workout Consistency goals
 */
exports.onWorkoutComplete = onDocumentWritten({
  document: 'workouts/{workoutId}',
  region: sharedConfig.region,
}, async (event) => {
    const change = event.data;
    if (!change.before.exists || !change.after.exists) return null;
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      // Only trigger when workout becomes completed
      if (before.status !== 'completed' && after.status === 'completed') {
        const clientId = after.clientId;
        
        // Query workout consistency goals (always track, regardless of isActive status)
        const goalsSnapshot = await db.collection('goals')
          .where('clientId', '==', clientId)
          .where('isConfigured', '==', true)
          .where('category', '==', 'workout_consistency')
          .get();
        
        if (goalsSnapshot.empty) return null;
        
        const batch = db.batch();
        
        for (const goalDoc of goalsSnapshot.docs) {
          const goal = goalDoc.data();
          
          // Prepare current workout data for streak calculation
          const currentWorkoutData = {
            id: event.params.workoutId,
            completedAt: after.completedAt,
            dueDate: after.dueDate
          };
          
          // Calculate on-time completion streak with gap checking
          const streakResult = await calculateWorkoutStreak(
            clientId,
            currentWorkoutData,
            goal
          );
          
          logger.info(`[GOALS] Workout streak calculated for ${clientId}`, {
            streak: streakResult.streak,
            goalId: goalDoc.id,
            hasGap: !!streakResult.lastWorkout
          });
          
          // Prepare update data with streak and metadata
          const updateData = {
            currentStreak: streakResult.streak,
            lastStreakWorkout: streakResult.lastWorkout || null,
            lastStreakUpdated: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Check and update milestones
          if (goal.milestones) {
            const updatedMilestones = goal.milestones.map(m => {
              if (!m.completed && m.autoTracked && streakResult.streak >= m.targetValue) {
                return {
                  ...m,
                  completed: true,
                  completedAt: admin.firestore.Timestamp.now(),
                  updatedAt: admin.firestore.Timestamp.now()
                };
              }
              return m;
            });
            
            updateData.milestones = updatedMilestones;
          }
          
          batch.update(goalDoc.ref, updateData);
        }
        
        await batch.commit();
        logger.info(`[GOALS] Workout consistency goals updated for ${clientId}`);
        console.log(`Updated workout consistency goal for ${clientId}`);
        
        // Also check for Strength PRs in this workout
        await checkForStrengthPRs(clientId, after);
      }
      
      return null;
    } catch (error) {
      console.error('Error updating workout consistency goal:', error);
      return null;
    }
  });

/**
 * Trigger: When weight is logged
 * Updates: Weight Loss goals
 */
exports.onWeightLog = onDocumentWritten({
  document: 'dailyActivities/{activityId}',
  region: sharedConfig.region,
}, async (event) => {
    const change = event.data;
    try {
      const activityData = change.after.exists ? change.after.data() : null;
      if (!activityData || !activityData.weight || !activityData.weight.weight) {
        return null;
      }

      // Extract clientId from document ID: {clientId}_{date}
      const activityId = event.params.activityId;
      const clientId = activityId.split('_')[0];
      
      logger.info(`[GOALS] Weight function triggered for ${clientId}`);
      
      // Find most recent weight using flexible date iteration (same as steps/water)
      let latestWeight = null;
      let latestWeightDate = null;
      const today = new Date();
      
      for (let i = 0; i < 90; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        const actId = `${clientId}_${dateStr}`;
        
        const actDoc = await db.collection('dailyActivities').doc(actId).get();
        if (actDoc.exists && actDoc.data().weight?.weight) {
          latestWeight = actDoc.data().weight.weight;
          latestWeightDate = dateStr;
          break;
        }
      }
      
      if (!latestWeight) {
        logger.info(`[GOALS] No weight data found for ${clientId} in last 90 days`);
        return null;
      }
      
      logger.info(`[GOALS] Using weight from most recent date`, {
        clientId,
        date: latestWeightDate,
        weight: latestWeight
      });
      
      // Query weight loss goals
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', clientId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', '==', 'weight_loss')
        .get();
      
      if (goalsSnapshot.empty) return null;
      
      const batch = db.batch();
      
      for (const goalDoc of goalsSnapshot.docs) {
        const goal = goalDoc.data();
        
        batch.update(goalDoc.ref, {
          currentValue: latestWeight,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Check milestones (weight milestones reflect current state, not historical)
        if (goal.milestones) {
          const updatedMilestones = goal.milestones.map(m => {
            // For weight loss: Always update based on current weight
            // Milestone is checked if current weight <= target, unchecked if above
            if (m.autoTracked) {
              const shouldBeCompleted = latestWeight <= m.targetValue;
              
              // Update milestone based on current weight
              if (shouldBeCompleted && !m.completed) {
                // Complete milestone
                return {
                  ...m,
                  completed: true,
                  completedAt: admin.firestore.Timestamp.now(),
                  updatedAt: admin.firestore.Timestamp.now()
                };
              } else if (!shouldBeCompleted && m.completed) {
                // Uncomplete milestone (weight went back up)
                return {
                  ...m,
                  completed: false,
                  completedAt: null,
                  updatedAt: admin.firestore.Timestamp.now()
                };
              } else if (shouldBeCompleted && m.completed) {
                // Already completed and still valid - update timestamp
                return {
                  ...m,
                  updatedAt: admin.firestore.Timestamp.now()
                };
              }
            }
            return m;
          });
          
          batch.update(goalDoc.ref, {
            milestones: updatedMilestones
          });
        }
      }
      
      await batch.commit();
      logger.info(`[GOALS] Weight loss goal updated for ${clientId}`);
      console.log(`Updated weight loss goal for ${clientId}`);
      return null;
    } catch (error) {
      console.error('Error updating weight loss goal:', error);
      return null;
    }
  });

/**
 * Trigger: When nutrition log is written
 * Updates: Nutrition adherence goals
 */
exports.onNutritionLogWrite = onDocumentWritten({
  document: 'nutritionLogs/{userId}/mealPlans/{date}',
  region: sharedConfig.region,
}, async (event) => {
    const change = event.data;
    try {
      const mealPlanData = change.after.exists ? change.after.data() : null;
      if (!mealPlanData) return null;

      const userId = event.params.userId;
      
      // Query nutrition goals for this client
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', userId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', '==', 'nutrition')
        .get();
      
      if (goalsSnapshot.empty) {
        console.log(`No active nutrition goals for user ${userId}`);
        return null;
      }

      const batch = db.batch();
      
      for (const goalDoc of goalsSnapshot.docs) {
        const goal = goalDoc.data();
        
        // Calculate nutrition adherence streak (consecutive days with dayComplete)
        const nutritionStreak = await calculateStreak(userId, async (dateStr) => {
          const mealPlanRef = db.collection('nutritionLogs').doc(userId).collection('mealPlans').doc(dateStr);
          const mealPlanDoc = await mealPlanRef.get();
          if (!mealPlanDoc.exists) return false;
          const data = mealPlanDoc.data();
          return data.dayComplete === true;
        });
        
        logger.info(`[GOALS] Nutrition streak calculated for ${userId}`, { streak: nutritionStreak, goalId: goalDoc.id });
        
        // Prepare update data - write to currentStreak field
        const updateData = {
          currentStreak: nutritionStreak,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Check and update milestones
        if (goal.milestones) {
          const updatedMilestones = goal.milestones.map(m => {
            if (!m.completed && m.autoTracked && nutritionStreak >= m.targetValue) {
              return {
                ...m,
                completed: true,
                completedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
              };
            }
            return m;
          });
          
          updateData.milestones = updatedMilestones;
        }
        
        batch.update(goalDoc.ref, updateData);
      }
      
      await batch.commit();
      logger.info(`[GOALS] Nutrition goals updated for user ${userId}`);
      console.log(`Updated nutrition goals for user ${userId}`);
      return null;
    } catch (error) {
      console.error('Error updating nutrition goals:', error);
      return null;
    }
  });

module.exports = {
  onDailyActivityWrite: exports.onDailyActivityWrite,
  onWorkoutComplete: exports.onWorkoutComplete,
  onWeightLog: exports.onWeightLog,
  onNutritionLogWrite: exports.onNutritionLogWrite
};
