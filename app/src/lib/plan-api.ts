// API utilities for client plan CRUD operations

import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ClientPlan, VisionData, StepGoalData, LissCardioData, WeeklyFocusData, WeeklyFocusHistory, TrainingPhase, TrainingFocus, CardioType } from '@/types/plan';

// Collection reference
const PLANS_COLLECTION = 'clientPlans';

// Helper to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: any): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  // Handle ISO string dates
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  }
  // Handle Unix timestamps (numbers)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  return null;
};

// Helper to convert plan data from Firestore format
const convertPlanFromFirestore = (id: string, data: any): ClientPlan => {
  return {
    id,
    clientId: data.clientId,
    trainerId: data.trainerId,
    vision: data.vision ? {
      goals: data.vision.goals || [],
      lastUpdated: timestampToDate(data.vision.lastUpdated)
    } : null,
    stepGoal: data.stepGoal ? {
      target: data.stepGoal.target || 10000,
      tips: data.stepGoal.tips || [],
      lastUpdated: timestampToDate(data.stepGoal.lastUpdated)
    } : null,
    waterGoal: data.waterGoal ? {
      target: data.waterGoal.target || 100,
      unit: data.waterGoal.unit || 'oz',
      tips: data.waterGoal.tips || [],
      lastUpdated: timestampToDate(data.waterGoal.lastUpdated)
    } : null,
    lissCardio: data.lissCardio ? {
      frequency: data.lissCardio.frequency || '',
      duration: data.lissCardio.duration || '',
      targetHeartRate: data.lissCardio.targetHeartRate || '',
      timing: data.lissCardio.timing || '',
      equipment: data.lissCardio.equipment || undefined,
      lastUpdated: timestampToDate(data.lissCardio.lastUpdated)
    } : null,
    weeklyFocus: data.weeklyFocus ? {
      weeks: (data.weeklyFocus.weeks || []).map((week: any) => ({
        weekStartDate: week.weekStartDate || '',
        adjustments: week.adjustments || [],
        priorities: week.priorities || [],
        coachNotes: week.coachNotes || '',
        lastCallDate: timestampToDate(week.lastCallDate),
        createdAt: timestampToDate(week.createdAt),
        updatedAt: timestampToDate(week.updatedAt)
      })),
      lastUpdated: timestampToDate(data.weeklyFocus.lastUpdated)
    } : null,
    dailyHabits: data.dailyHabits ? {
      habits: (data.dailyHabits.habits || []).map((habit: any) => ({
        id: habit.id || '',
        title: habit.title || '',
        description: habit.description || '',
        iconType: habit.iconType || 'custom',
        customIconUrl: habit.customIconUrl,
        order: habit.order || 0
      })),
      lastUpdated: timestampToDate(data.dailyHabits.lastUpdated)
    } : null,
    trainingProtocol: data.trainingProtocol ? {
      keyPriorities: data.trainingProtocol.keyPriorities || [],
      trainingPhase: data.trainingProtocol.trainingPhase || undefined,
      trainingFocus: data.trainingProtocol.trainingFocus || undefined,
      assignedDate: data.trainingProtocol.assignedDate || undefined,
      planDurationWeeks: data.trainingProtocol.planDurationWeeks || undefined,
      workoutFrequency: data.trainingProtocol.workoutFrequency || undefined,
      cardioType: data.trainingProtocol.cardioType || undefined,
      cardioFrequency: data.trainingProtocol.cardioFrequency || undefined,
      stepsPerDay: data.trainingProtocol.stepsPerDay || undefined,
      lastUpdated: timestampToDate(data.trainingProtocol.lastUpdated)
    } : null,
    nutritionProtocol: data.nutritionProtocol ? {
      approach: data.nutritionProtocol.approach || 'healthy_habits',
      healthyHabits: data.nutritionProtocol.healthyHabits || undefined,
      macroTracking: data.nutritionProtocol.macroTracking || undefined,
      mealPlan: data.nutritionProtocol.mealPlan || undefined,
      lastUpdated: timestampToDate(data.nutritionProtocol.lastUpdated)
    } : null,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt)
  };
};

/**
 * Get a client's plan by client ID
 * Uses clientId as the document ID for direct access
 */
export async function getClientPlan(clientId: string): Promise<ClientPlan | null> {
  try {
    const docRef = doc(db, PLANS_COLLECTION, clientId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return convertPlanFromFirestore(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error getting client plan:', error);
    throw error;
  }
}

/**
 * Create or update a client's entire plan
 * Uses clientId as the document ID
 */
export async function saveClientPlan(plan: Partial<ClientPlan> & { clientId: string; trainerId: string }): Promise<{ success: boolean; planId?: string; error?: any }> {
  try {
    // Use clientId as document ID
    const planRef = doc(db, PLANS_COLLECTION, plan.clientId);
    const existingPlan = await getClientPlan(plan.clientId);
    
    const planData: any = {
      clientId: plan.clientId,
      trainerId: plan.trainerId,
      updatedAt: serverTimestamp()
    };
    
    // Add optional fields if provided
    if (plan.vision !== undefined) {
      planData.vision = plan.vision ? {
        goals: plan.vision.goals,
        lastUpdated: serverTimestamp()
      } : null;
    }
    
    if (plan.stepGoal !== undefined) {
      planData.stepGoal = plan.stepGoal ? {
        target: plan.stepGoal.target,
        tips: plan.stepGoal.tips,
        lastUpdated: serverTimestamp()
      } : null;
    }
    
    if (plan.lissCardio !== undefined) {
      planData.lissCardio = plan.lissCardio ? {
        frequency: plan.lissCardio.frequency,
        duration: plan.lissCardio.duration,
        targetHeartRate: plan.lissCardio.targetHeartRate,
        timing: plan.lissCardio.timing,
        lastUpdated: serverTimestamp()
      } : null;
    }
    
    if (plan.weeklyFocus !== undefined) {
      planData.weeklyFocus = plan.weeklyFocus ? {
        weeks: plan.weeklyFocus.weeks.map(week => ({
          weekStartDate: week.weekStartDate,
          adjustments: week.adjustments,
          priorities: week.priorities,
          coachNotes: week.coachNotes,
          createdAt: week.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp()
        })),
        lastUpdated: serverTimestamp()
      } : null;
    }
    
    if (existingPlan) {
      // Update existing plan
      await updateDoc(planRef, planData);
    } else {
      // Create new plan with clientId as document ID
      planData.createdAt = serverTimestamp();
      await setDoc(planRef, planData);
    }
    
    return { success: true, planId: plan.clientId };
  } catch (error) {
    console.error('Error saving client plan:', error);
    return { success: false, error };
  }
}

/**
 * Update only the vision section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateVision(
  clientId: string,
  trainerId: string,
  visionData: VisionData
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    const updateData: any = {
      vision: {
        goals: visionData.goals,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just vision, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        stepGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating vision:', error);
    return { success: false, error };
  }
}

/**
 * Update only the step goal section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateStepGoal(
  clientId: string,
  trainerId: string,
  stepGoalData: StepGoalData
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    const updateData: any = {
      stepGoal: {
        target: stepGoalData.target,
        tips: stepGoalData.tips,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just step goal, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating step goal:', error);
    return { success: false, error };
  }
}

/**
 * Update only the water goal section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateWaterGoal(
  clientId: string,
  trainerId: string,
  waterGoalData: any
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    const updateData: any = {
      waterGoal: {
        target: waterGoalData.target,
        unit: waterGoalData.unit,
        tips: waterGoalData.tips,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just water goal, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        stepGoal: null,
        waterGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating water goal:', error);
    return { success: false, error };
  }
}

/**
 * Update only the LISS cardio section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateLissCardio(
  clientId: string,
  trainerId: string,
  lissCardioData: LissCardioData
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    const lissData: Record<string, unknown> = {
      frequency: lissCardioData.frequency,
      duration: lissCardioData.duration,
      targetHeartRate: lissCardioData.targetHeartRate,
      timing: lissCardioData.timing,
      lastUpdated: serverTimestamp()
    };
    // Only include equipment if it has a value
    if (lissCardioData.equipment) {
      lissData.equipment = lissCardioData.equipment;
    }

    const updateData: any = {
      lissCardio: lissData,
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just LISS cardio, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        stepGoal: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating LISS cardio:', error);
    return { success: false, error };
  }
}

/**
 * Remove LISS cardio assignment from a client's plan
 * Sets lissCardio to null in Firestore
 * Uses clientId as the document ID
 */
export async function removeLissCardio(
  clientId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    if (!existingPlan) {
      // No plan exists, nothing to remove
      return { success: true };
    }
    
    const updateData: any = {
      lissCardio: null,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(planRef, updateData);
    
    return { success: true };
  } catch (error) {
    console.error('Error removing LISS cardio:', error);
    return { success: false, error };
  }
}

/**
 * Update or add a week to the weekly focus history
 * Maintains a sliding window of up to 4 weeks
 * Uses clientId as the document ID
 */
export async function updateWeeklyFocus(
  clientId: string,
  trainerId: string,
  weeklyFocusData: WeeklyFocusData
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    let weeks: any[] = [];
    
    if (existingPlan?.weeklyFocus?.weeks) {
      // Get existing weeks
      weeks = existingPlan.weeklyFocus.weeks.map(week => ({
        weekStartDate: week.weekStartDate,
        adjustments: week.adjustments,
        priorities: week.priorities,
        coachNotes: week.coachNotes,
        createdAt: week.createdAt,
        updatedAt: week.updatedAt
      }));
      
      // Find if this week already exists
      const existingIndex = weeks.findIndex(w => w.weekStartDate === weeklyFocusData.weekStartDate);
      
      if (existingIndex >= 0) {
        // Update existing week
        weeks[existingIndex] = {
          weekStartDate: weeklyFocusData.weekStartDate,
          adjustments: weeklyFocusData.adjustments,
          priorities: weeklyFocusData.priorities,
          coachNotes: weeklyFocusData.coachNotes,
          lastCallDate: weeklyFocusData.lastCallDate ? new Date(weeklyFocusData.lastCallDate).toISOString() : null,
          createdAt: weeks[existingIndex].createdAt, // Keep original creation time
          updatedAt: new Date().toISOString() // Use ISO string instead of serverTimestamp
        };
      } else {
        // Add new week
        const now = new Date().toISOString();
        weeks.push({
          weekStartDate: weeklyFocusData.weekStartDate,
          adjustments: weeklyFocusData.adjustments,
          priorities: weeklyFocusData.priorities,
          coachNotes: weeklyFocusData.coachNotes,
          lastCallDate: weeklyFocusData.lastCallDate ? new Date(weeklyFocusData.lastCallDate).toISOString() : null,
          createdAt: now, // Use ISO string instead of serverTimestamp
          updatedAt: now  // Use ISO string instead of serverTimestamp
        });
      }
      
      // Sort by week start date
      weeks.sort((a, b) => a.weekStartDate.localeCompare(b.weekStartDate));
      
      // Keep only the most recent 4 weeks
      if (weeks.length > 4) {
        weeks = weeks.slice(-4);
      }
    } else {
      // First week
      const now = new Date().toISOString();
      weeks = [{
        weekStartDate: weeklyFocusData.weekStartDate,
        adjustments: weeklyFocusData.adjustments,
        priorities: weeklyFocusData.priorities,
        coachNotes: weeklyFocusData.coachNotes,
        createdAt: now,  // Use ISO string instead of serverTimestamp
        updatedAt: now   // Use ISO string instead of serverTimestamp
      }];
    }
    
    const updateData: any = {
      weeklyFocus: {
        weeks,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just weekly focus, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        stepGoal: null,
        lissCardio: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating weekly focus:', error);
    return { success: false, error };
  }
}

/**
 * Update only the daily habits section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateDailyHabits(
  clientId: string,
  trainerId: string,
  dailyHabitsData: { habits: any[] }
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    // Filter out undefined values from each habit object
    const cleanHabits = dailyHabitsData.habits.map(habit => {
      const cleanHabit: any = {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        iconType: habit.iconType,
        order: habit.order
      };
      // Only include customIconUrl if it's defined
      if (habit.customIconUrl !== undefined) {
        cleanHabit.customIconUrl = habit.customIconUrl;
      }
      return cleanHabit;
    });
    
    const updateData: any = {
      dailyHabits: {
        habits: cleanHabits,
        lastUpdated: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just daily habits, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        stepGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating daily habits:', error);
    return { success: false, error };
  }
}

/**
 * Update only the training protocol section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateTrainingProtocol(
  clientId: string,
  trainerId: string,
  trainingProtocolData: { keyPriorities: string[] }
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    if (existingPlan) {
      // CRITICAL: Merge with existing trainingProtocol to preserve phase fields
      // (trainingPhase, trainingFocus, workoutFrequency, cardioType, etc.)
      const merged = {
        ...(existingPlan.trainingProtocol || {}),
        keyPriorities: trainingProtocolData.keyPriorities,
        lastUpdated: serverTimestamp()
      };
      // Strip undefined values (Firestore rejects them)
      const cleanMerged = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined)
      );
      await updateDoc(planRef, {
        trainingProtocol: cleanMerged,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new plan with just training protocol, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        vision: null,
        stepGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        trainingProtocol: {
          keyPriorities: trainingProtocolData.keyPriorities,
          lastUpdated: serverTimestamp()
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating training protocol:', error);
    return { success: false, error };
  }
}

/**
 * Update the training phase fields of a client's plan
 * (trainingPhase, trainingFocus, assignedDate, workoutFrequency, cardioType, cardioFrequency, stepsPerDay)
 * Merges into the existing trainingProtocol sub-document.
 */
export async function updateTrainingPhase(
  clientId: string,
  trainerId: string,
  data: {
    trainingPhase?: TrainingPhase;
    trainingFocus?: TrainingFocus;
    assignedDate?: string;
    planDurationWeeks?: number;
    workoutFrequency?: number;
    cardioType?: CardioType;
    cardioFrequency?: string;
    stepsPerDay?: string;
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);

    // Build a clean object — only include defined values
    const phaseFields: any = { lastUpdated: serverTimestamp() };
    if (data.trainingPhase !== undefined) phaseFields.trainingPhase = data.trainingPhase;
    if (data.trainingFocus !== undefined) phaseFields.trainingFocus = data.trainingFocus;
    if (data.assignedDate !== undefined) phaseFields.assignedDate = data.assignedDate;
    if (data.planDurationWeeks !== undefined) phaseFields.planDurationWeeks = data.planDurationWeeks;
    if (data.workoutFrequency !== undefined) phaseFields.workoutFrequency = data.workoutFrequency;
    if (data.cardioType !== undefined) phaseFields.cardioType = data.cardioType;
    if (data.cardioFrequency !== undefined) phaseFields.cardioFrequency = data.cardioFrequency;
    if (data.stepsPerDay !== undefined) phaseFields.stepsPerDay = data.stepsPerDay;

    if (existingPlan) {
      // Merge phase fields into existing trainingProtocol, then strip undefined values
      // (Firestore rejects undefined — optional fields on the TypeScript object may be undefined)
      const merged = { ...(existingPlan.trainingProtocol || {}), ...phaseFields };
      const cleanMerged = Object.fromEntries(
        Object.entries(merged).filter(([, v]) => v !== undefined)
      );
      await updateDoc(planRef, {
        trainingProtocol: cleanMerged,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new plan document
      await setDoc(planRef, {
        clientId,
        trainerId,
        trainingProtocol: {
          keyPriorities: [],
          ...phaseFields,
        },
        vision: null,
        stepGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        nutritionProtocol: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating training phase:', error);
    return { success: false, error };
  }
}

/**
 * Update only the nutrition protocol section of a client's plan
 * Uses clientId as the document ID
 */
export async function updateNutritionProtocol(
  clientId: string,
  trainerId: string,
  nutritionProtocolData: {
    approach: 'healthy_habits' | 'macro_tracking' | 'meal_plan';
    healthyHabits?: any;
    macroTracking?: any;
    mealPlan?: any;
  }
): Promise<{ success: boolean; error?: any }> {
  try {
    const planRef = doc(db, PLANS_COLLECTION, clientId);
    const existingPlan = await getClientPlan(clientId);
    
    const nutritionData: any = {
      approach: nutritionProtocolData.approach,
      lastUpdated: serverTimestamp()
    };
    
    // Add optional configuration data based on approach
    if (nutritionProtocolData.healthyHabits) {
      nutritionData.healthyHabits = nutritionProtocolData.healthyHabits;
    }
    if (nutritionProtocolData.macroTracking) {
      nutritionData.macroTracking = nutritionProtocolData.macroTracking;
    }
    if (nutritionProtocolData.mealPlan) {
      nutritionData.mealPlan = nutritionProtocolData.mealPlan;
    }
    
    const updateData: any = {
      nutritionProtocol: nutritionData,
      updatedAt: serverTimestamp()
    };
    
    if (existingPlan) {
      await updateDoc(planRef, updateData);
    } else {
      // Create new plan with just nutrition protocol, using clientId as document ID
      await setDoc(planRef, {
        clientId,
        trainerId,
        ...updateData,
        vision: null,
        stepGoal: null,
        lissCardio: null,
        weeklyFocus: null,
        dailyHabits: null,
        trainingProtocol: null,
        createdAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating nutrition protocol:', error);
    return { success: false, error };
  }
}

/**
 * Get all plans created by a specific trainer
 */
export async function getTrainerPlans(trainerId: string): Promise<ClientPlan[]> {
  try {
    const q = query(
      collection(db, PLANS_COLLECTION),
      where('trainerId', '==', trainerId)
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => 
      convertPlanFromFirestore(doc.id, doc.data())
    );
  } catch (error) {
    console.error('Error getting trainer plans:', error);
    throw error;
  }
}
