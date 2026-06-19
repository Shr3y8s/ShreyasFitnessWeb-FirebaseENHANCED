const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require('firebase-admin');
const db = admin.firestore();

// Load shared configuration (copied from root by predeploy hook)
const sharedConfig = require("./firebase-config.json");

// Activity Feed helper
const { writeActivityEvent, getClientInfoForActivityFeed } = require("./activity-feed");

// Client Notifications helper
const {writeClientNotification} = require("./client-notifications");

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

      // ACTIVITY FEED: Check if all daily habits are completed
      const habits = activityData.habits || [];
      if (habits.length > 0) {
        const completedHabits = habits.filter(h => h.completed === true || h.completed === 1);
        // Look up client plan to know total assigned habits — don't fire notification
        // unless ALL assigned habits are completed (not just all habits in the document)
        const planDoc = await db.collection('clientPlans').doc(clientId).get();
        const totalAssignedHabits = planDoc.exists ? (planDoc.data()?.dailyHabits?.habits?.length || 0) : 0;
        const allCompleted = totalAssignedHabits > 0 && completedHabits.length >= totalAssignedHabits;
        if (allCompleted) {
          // Check if it just became all-completed (wasn't before)
          const beforeData = change.before.exists ? change.before.data() : null;
          const beforeHabits = beforeData?.habits || [];
          const beforeCompletedCount = beforeHabits.filter(h => h.completed === true || h.completed === 1).length;
          const wasAllCompleted = totalAssignedHabits > 0 && beforeCompletedCount >= totalAssignedHabits;
          
          if (!wasAllCompleted) {
            const date = activityData.date || activityId.split('_')[1] || '';
            getClientInfoForActivityFeed(clientId).then(clientInfo => {
              writeActivityEvent({
                type: 'daily_habits_completed',
                clientId: clientId,
                clientName: clientInfo.clientName,
                trainerId: clientInfo.trainerId,
                message: `${clientInfo.clientName} completed all daily habits`,
                metadata: { date: date, habitsCompleted: habits.length },
              }).catch(err => {
                logger.warn("[ActivityFeed] Failed to write daily_habits_completed event", { clientId, error: err.message });
              });
            });
          }
        }
      }

      // ACTIVITY FEED: Check if step goal was just hit for the first time today
      const afterSteps = activityData.steps;
      if (afterSteps && afterSteps.steps != null && afterSteps.goal != null) {
        const stepsMet = afterSteps.steps >= afterSteps.goal;
        const beforeData = change.before.exists ? change.before.data() : null;
        const beforeSteps = beforeData?.steps;
        const wasStepsMet = beforeSteps && beforeSteps.steps != null && beforeSteps.goal != null
          ? beforeSteps.steps >= beforeSteps.goal
          : false;

        if (stepsMet && !wasStepsMet) {
          const date = activityData.date || activityId.split('_')[1] || '';
          getClientInfoForActivityFeed(clientId).then(clientInfo => {
            writeActivityEvent({
              type: 'daily_activities_completed',
              clientId: clientId,
              clientName: clientInfo.clientName,
              trainerId: clientInfo.trainerId,
              message: `${clientInfo.clientName} hit their step goal — ${afterSteps.steps.toLocaleString()} steps`,
              metadata: { date: date, habitsCompleted: 0 },
            }).catch(err => {
              logger.warn('[ActivityFeed] Failed to write step goal event', { clientId, error: err.message });
            });
          }).catch(err => {
            logger.warn('[ActivityFeed] Failed to get client info for step goal event', { clientId, error: err.message });
          });
        }
      }

      // ACTIVITY FEED: Check if water goal was just hit for the first time today
      const afterWater = activityData.water;
      if (afterWater && afterWater.amount != null && afterWater.goal != null) {
        const waterMet = afterWater.amount >= afterWater.goal;
        const beforeData2 = change.before.exists ? change.before.data() : null;
        const beforeWater = beforeData2?.water;
        const wasWaterMet = beforeWater && beforeWater.amount != null && beforeWater.goal != null
          ? beforeWater.amount >= beforeWater.goal
          : false;

        if (waterMet && !wasWaterMet) {
          const date = activityData.date || activityId.split('_')[1] || '';
          getClientInfoForActivityFeed(clientId).then(clientInfo => {
            writeActivityEvent({
              type: 'daily_activities_completed',
              clientId: clientId,
              clientName: clientInfo.clientName,
              trainerId: clientInfo.trainerId,
              message: `${clientInfo.clientName} hit their water goal — ${afterWater.amount} ${afterWater.unit || 'oz'}`,
              metadata: { date: date, habitsCompleted: 0 },
            }).catch(err => {
              logger.warn('[ActivityFeed] Failed to write water goal event', { clientId, error: err.message });
            });
          }).catch(err => {
            logger.warn('[ActivityFeed] Failed to get client info for water goal event', { clientId, error: err.message });
          });
        }
      }

      // Query all active goals for this client (steps + water categories)
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', clientId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', 'in', ['steps', 'water'])
        .get();
      
      if (goalsSnapshot.empty) {
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
      return null;
    } catch (error) {
      logger.error('Error updating goals after activity:', error);
      return null;
    }
  });

/**
 * Helper: Get week start (Sunday) for a date (local timezone)
 */
function getWeekStart(date) {
  const d = new Date(date.toDate ? date.toDate() : date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Subtract days to get to Sunday
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  // Use local timezone formatting to avoid UTC shift
  const year = sunday.getFullYear();
  const month = String(sunday.getMonth() + 1).padStart(2, '0');
  const dayStr = String(sunday.getDate()).padStart(2, '0');
  return `${year}-${month}-${dayStr}`; // "YYYY-MM-DD" in local timezone
}

/**
 * Helper: Get month start (first day) for a date (local timezone)
 */
function getMonthStart(date) {
  const d = new Date(date.toDate ? date.toDate() : date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  firstDay.setHours(0, 0, 0, 0);
  // Use local timezone formatting to avoid UTC shift
  const year = firstDay.getFullYear();
  const month = String(firstDay.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`; // "YYYY-MM-DD" in local timezone
}

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
 * Trigger: When workout is assigned or completed
 * Updates: Workout Consistency goals and stats
 */
exports.onWorkoutChange = onDocumentWritten({
  document: 'workouts/{workoutId}',
  region: sharedConfig.region,
}, async (event) => {
    const change = event.data;
    try {
      const before = change.before.exists ? change.before.data() : null;
      const after = change.after.exists ? change.after.data() : null;
      
      if (!after) return null; // Deleted
      
      const clientId = after.clientId;
      
      // Handle workout assignment (new document created)
      if (!before && after.dueDate) {
        logger.info(`[GOALS] Workout assigned for ${clientId}`);
        
        const goalDoc = await db.collection('goals').doc(`${clientId}_workout_consistency`).get();
        if (!goalDoc.exists) return null;
        
        const goal = goalDoc.data();
        const currentWeek = getWeekStart(after.dueDate);
        const currentMonth = getMonthStart(after.dueDate);
        
        // Initialize or get existing stats
        let stats = goal.workoutStats || {
          thisWeek: { weekStart: currentWeek, assigned: 0, completed: 0 },
          thisMonth: { monthStart: currentMonth, assigned: 0, completed: 0 }
        };
        
        // Check if week changed → reset
        if (stats.thisWeek.weekStart !== currentWeek) {
          stats.thisWeek = { weekStart: currentWeek, assigned: 0, completed: 0 };
        }
        
        // Check if month changed → reset
        if (stats.thisMonth.monthStart !== currentMonth) {
          stats.thisMonth = { monthStart: currentMonth, assigned: 0, completed: 0 };
        }
        
        // Increment assigned counts
        stats.thisWeek.assigned++;
        stats.thisMonth.assigned++;
        
        await goalDoc.ref.update({
          workoutStats: stats,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`[GOALS] Workout assignment counted`, {
          clientId,
          week: `${stats.thisWeek.assigned} assigned`,
          month: `${stats.thisMonth.assigned} assigned`
        });
        
        return null;
      }
      
      // Handle workout completion (status changed to completed)
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
          
          // Update workout completion counts
          if (after.dueDate) {
            const currentWeek = getWeekStart(after.dueDate);
            const currentMonth = getMonthStart(after.dueDate);
            
            let stats = goal.workoutStats || {
              thisWeek: { weekStart: currentWeek, assigned: 0, completed: 0 },
              thisMonth: { monthStart: currentMonth, assigned: 0, completed: 0 }
            };
            
            // Check if week changed → reset
            if (stats.thisWeek.weekStart !== currentWeek) {
              stats.thisWeek = { weekStart: currentWeek, assigned: 0, completed: 0 };
            }
            
            // Check if month changed → reset
            if (stats.thisMonth.monthStart !== currentMonth) {
              stats.thisMonth = { monthStart: currentMonth, assigned: 0, completed: 0 };
            }
            
            // Increment completed counts
            stats.thisWeek.completed++;
            stats.thisMonth.completed++;
            
            // Add to update data
            updateData.workoutStats = stats;
          }
          
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
      
        // Also check for Strength PRs in this workout
        await checkForStrengthPRs(clientId, after);
      }
      
      return null;
    } catch (error) {
      logger.error('Error updating workout consistency goal:', error);
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
      
      // Query weight loss goals (both long-term and short-term)
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', clientId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', 'in', ['weight_loss', 'weight_loss_st'])
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

      // ACTIVITY FEED: Write weight_logged event
      const beforeData = change.before.exists ? change.before.data() : null;
      const isNewWeightEntry = !beforeData?.weight?.weight || 
        beforeData.weight.weight !== activityData.weight.weight;
      
      if (isNewWeightEntry) {
        getClientInfoForActivityFeed(clientId).then(clientInfo => {
          const weightVal = activityData.weight.weight;
          const weightUnit = activityData.weight.unit || 'lbs';
          const prevWeight = beforeData?.weight?.weight;
          const changeAmt = prevWeight ? Math.round((weightVal - prevWeight) * 10) / 10 : null;
          const changeStr = changeAmt !== null 
            ? (changeAmt > 0 ? `+${changeAmt}` : `${changeAmt}`)
            : '';
          
          writeActivityEvent({
            type: 'weight_logged',
            clientId: clientId,
            clientName: clientInfo.clientName,
            trainerId: clientInfo.trainerId,
            message: changeStr
              ? `${clientInfo.clientName} logged weight: ${weightVal} ${weightUnit} (${changeStr} ${weightUnit})`
              : `${clientInfo.clientName} logged weight: ${weightVal} ${weightUnit}`,
            metadata: {
              weight: weightVal,
              unit: weightUnit,
              previousWeight: prevWeight || null,
              changeAmount: changeAmt,
            },
          }).catch(err => {
            logger.warn("[ActivityFeed] Failed to write weight_logged event", { clientId, error: err.message });
          });
        });
      }

      return null;
    } catch (error) {
      logger.error('Error updating weight loss goal:', error);
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

      // ACTIVITY FEED: Write nutrition_day_completed event when dayComplete is true
      // This runs BEFORE goals processing so it fires even if no nutrition goals are configured
      if (mealPlanData.dayComplete === true) {
        const beforeData = change.before.exists ? change.before.data() : null;
        // Only fire if dayComplete just flipped to true (not on re-saves)
        if (!beforeData || beforeData.dayComplete !== true) {
          getClientInfoForActivityFeed(userId).then(clientInfo => {
            writeActivityEvent({
              type: 'nutrition_day_completed',
              clientId: userId,
              clientName: clientInfo.clientName,
              trainerId: clientInfo.trainerId,
              message: `${clientInfo.clientName} completed nutrition plan for today`,
              metadata: { date: event.params.date },
            }).catch(err => {
              logger.warn("[ActivityFeed] Failed to write nutrition_day_completed event", { userId, error: err.message });
            });
          });
        }
      }

      // Query nutrition goals for this client
      const goalsSnapshot = await db.collection('goals')
        .where('clientId', '==', userId)
        .where('isActive', '==', true)
        .where('isConfigured', '==', true)
        .where('category', '==', 'nutrition')
        .get();
      
      if (goalsSnapshot.empty) {
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

      return null;
    } catch (error) {
      logger.error('Error updating nutrition goals:', error);
      return null;
    }
  });

/**
 * Trigger: When a goal document is written
 * Detects: goal_completed (status → completed) and milestone_completed (milestone flips to true)
 * Writes activity feed events for both.
 */
exports.onGoalWrite = onDocumentWritten({
  document: 'goals/{goalId}',
  region: sharedConfig.region,
}, async (event) => {
  try {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    
    // DETECT: New goal created by trainer → notify client
    if (!before && after) {
      const clientId = after.clientId;
      if (clientId && after.category !== 'setup') {
        writeClientNotification({
          type: "goal_added",
          clientId: clientId,
          message: `Your trainer added a new goal: ${after.title || 'New Goal'}`,
          actionUrl: "/dashboard/client/goals",
          metadata: {
            goalId: event.params.goalId,
            goalTitle: after.title || "",
            goalCategory: after.category || "",
          },
        }).catch((err) => {
          logger.warn("[ClientNotifications] Failed to write goal_added notification", {clientId, error: err.message});
        });
      }
      return null;
    }

    if (!after || !before) return null; // Only handle updates (not creates/deletes)

    const clientId = after.clientId;
    const trainerId = after.trainerId;

    // DETECT: Goal title/configuration updated by trainer → notify client
    const titleChanged = before.title !== after.title;
    const targetChanged = before.targetValue !== after.targetValue;
    const termChanged = before.term !== after.term;
    if ((titleChanged || targetChanged || termChanged) && after.category !== 'setup') {
      writeClientNotification({
        type: "goal_updated",
        clientId: clientId,
        message: `Your trainer updated your goal: ${after.title || 'Goal'}`,
        actionUrl: "/dashboard/client/goals",
        metadata: {
          goalId: event.params.goalId,
          goalTitle: after.title || "",
          goalCategory: after.category || "",
        },
      }).catch((err) => {
        logger.warn("[ClientNotifications] Failed to write goal_updated notification", {clientId, error: err.message});
      });
    }

    // DETECT: Goal status changed to 'completed'
    if (before.status !== 'completed' && after.status === 'completed') {
      getClientInfoForActivityFeed(clientId).then(clientInfo => {
        writeActivityEvent({
          type: 'goal_completed',
          clientId: clientId,
          clientName: clientInfo.clientName,
          trainerId: clientInfo.trainerId || trainerId || '',
          message: `${clientInfo.clientName} reached goal: ${after.title || 'Goal'} 🏆`,
          metadata: {
            goalId: event.params.goalId,
            goalTitle: after.title || '',
            goalCategory: after.category || '',
          },
        }).catch(err => {
          logger.warn("[ActivityFeed] Failed to write goal_completed event", { clientId, error: err.message });
        });
      });
    }

    // DETECT: Milestone(s) newly completed
    if (before.milestones && after.milestones) {
      for (let i = 0; i < after.milestones.length; i++) {
        const beforeM = before.milestones[i];
        const afterM = after.milestones[i];
        
        if (beforeM && afterM && !beforeM.completed && afterM.completed) {
          // This milestone just flipped to completed
          getClientInfoForActivityFeed(clientId).then(clientInfo => {
            writeActivityEvent({
              type: 'milestone_completed',
              clientId: clientId,
              clientName: clientInfo.clientName,
              trainerId: clientInfo.trainerId || trainerId || '',
              message: `${clientInfo.clientName} reached milestone: ${afterM.text || 'Milestone'} 🎯`,
              metadata: {
                goalId: event.params.goalId,
                goalTitle: after.title || '',
                milestoneText: afterM.text || '',
              },
            }).catch(err => {
              logger.warn("[ActivityFeed] Failed to write milestone_completed event", { clientId, error: err.message });
            });
          });
        }
      }
    }

    return null;
  } catch (error) {
    logger.error('[ActivityFeed] Error in onGoalWrite trigger:', error);
    return null;
  }
});

module.exports = {
  onDailyActivityWrite: exports.onDailyActivityWrite,
  onWorkoutChange: exports.onWorkoutChange,
  onWeightLog: exports.onWeightLog,
  onNutritionLogWrite: exports.onNutritionLogWrite,
  onGoalWrite: exports.onGoalWrite,
};
