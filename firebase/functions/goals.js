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

      const userId = activityData.userId;
      
      // Query all active goals for this client (steps + water categories)
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', userId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', 'in', ['steps', 'water'])
        .get();
      
      if (goalsSnapshot.empty) {
        console.log(`No active steps/water goals for user ${userId}`);
        return null;
      }

      const batch = db.batch();
      
      for (const goalDoc of goalsSnapshot.docs) {
        const goal = goalDoc.data();
        
        if (goal.category === 'steps') {
          // Calculate steps streak using goal's configured dailyTarget
          const stepsStreak = await calculateStreak(userId, async (dateStr) => {
            const actId = `${userId}_${dateStr}`;
            const actDoc = await db.collection('dailyActivities').doc(actId).get();
            if (!actDoc.exists) return false;
            const data = actDoc.data();
            // Access nested steps.steps field
            const stepsValue = data.steps?.steps || 0;
            return stepsValue >= (goal.dailyTarget || 10000); // Use configured target
          });
          
          logger.info(`[GOALS] Steps streak calculated for ${userId}`, { streak: stepsStreak, goalId: goalDoc.id, dailyTarget: goal.dailyTarget });
          
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
          const waterStreak = await calculateStreak(userId, async (dateStr) => {
            const actId = `${userId}_${dateStr}`;
            const actDoc = await db.collection('dailyActivities').doc(actId).get();
            if (!actDoc.exists) return false;
            const data = actDoc.data();
            // Access nested water.amount field
            const waterValue = data.water?.amount || 0;
            return waterValue >= (goal.dailyTarget || 64); // Use configured target
          });
          
          logger.info(`[GOALS] Water streak calculated for ${userId}`, { streak: waterStreak, goalId: goalDoc.id, dailyTarget: goal.dailyTarget });
          
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
      logger.info(`[GOALS] Batch committed successfully for user ${userId}`);
      console.log(`Updated goals for user ${userId} after activity log`);
      return null;
    } catch (error) {
      console.error('Error updating goals after activity:', error);
      return null;
    }
  });

/**
 * Helper: Calculate consecutive weeks workout streak
 * Checks if each week met the workout frequency target
 */
async function calculateWorkoutStreak(clientId, dailyTarget, maxWeeksToCheck = 12) {
  let streak = 0;
  const today = new Date();
  
  // Find most recent week with data
  let startWeek = -1;
  for (let weekOffset = 0; weekOffset < maxWeeksToCheck; weekOffset++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() + (weekOffset * 7))); // Sunday of that week
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekWorkouts = await db.collection('workouts')
      .where('clientId', '==', clientId)
      .where('status', '==', 'completed')
      .where('completedAt', '>=', admin.firestore.Timestamp.fromDate(weekStart))
      .where('completedAt', '<', admin.firestore.Timestamp.fromDate(weekEnd))
      .get();
    
    if (weekWorkouts.size >= dailyTarget) {
      startWeek = weekOffset;
      break;
    }
  }
  
  if (startWeek === -1) return 0; // No weeks meeting target
  
  // Count consecutive weeks from that point
  for (let weekOffset = startWeek; weekOffset < maxWeeksToCheck; weekOffset++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (today.getDay() + (weekOffset * 7)));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    
    const weekWorkouts = await db.collection('workouts')
      .where('clientId', '==', clientId)
      .where('status', '==', 'completed')
      .where('completedAt', '>=', admin.firestore.Timestamp.fromDate(weekStart))
      .where('completedAt', '<', admin.firestore.Timestamp.fromDate(weekEnd))
      .get();
    
    if (weekWorkouts.size >= dailyTarget) {
      streak++;
    } else {
      break; // Streak broken
    }
  }
  
  return streak;
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
        
        // Query workout consistency goals
        const goalsSnapshot = await db.collection('goals')
          .where('clientId', '==', clientId)
          .where('isActive', '==', true)
          .where('isConfigured', '==', true)
          .where('category', '==', 'workout_consistency')
          .get();
        
        if (goalsSnapshot.empty) return null;
        
        const batch = db.batch();
        
        for (const goalDoc of goalsSnapshot.docs) {
          const goal = goalDoc.data();
          
          // Calculate consecutive weeks meeting workout frequency target
          const workoutStreak = await calculateWorkoutStreak(
            clientId,
            goal.dailyTarget || 3
          );
          
          logger.info(`[GOALS] Workout streak calculated for ${clientId}`, {
            streak: workoutStreak,
            goalId: goalDoc.id,
            dailyTarget: goal.dailyTarget
          });
          
          // Prepare update data - write to currentStreak field
          const updateData = {
            currentStreak: workoutStreak,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };
          
          // Check and update milestones
          if (goal.milestones) {
            const updatedMilestones = goal.milestones.map(m => {
              if (!m.completed && m.autoTracked && workoutStreak >= m.targetValue) {
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

      const userId = activityData.userId;
      const latestWeight = activityData.weight.weight;
      
      // Query weight loss goals
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', userId)
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
        
        // Check milestones (weight milestones are progressive)
        if (goal.milestones) {
          const updatedMilestones = goal.milestones.map(m => {
            // For weight loss: milestone completed if current weight <= milestone weight
            if (!m.completed && m.autoTracked && latestWeight <= m.targetValue) {
              return {
                ...m,
                completed: true,
                completedAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
              };
            }
            return m;
          });
          
          batch.update(goalDoc.ref, {
            milestones: updatedMilestones
          });
        }
      }
      
      await batch.commit();
      console.log(`Updated weight loss goal for ${userId}`);
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
