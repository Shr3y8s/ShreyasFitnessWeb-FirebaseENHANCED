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
import { ClientPlan, VisionData, StepGoalData, LissCardioData } from '@/types/plan';

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
    lissCardio: data.lissCardio ? {
      frequency: data.lissCardio.frequency || '',
      duration: data.lissCardio.duration || '',
      targetHeartRate: data.lissCardio.targetHeartRate || '',
      timing: data.lissCardio.timing || '',
      lastUpdated: timestampToDate(data.lissCardio.lastUpdated)
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
    
    const updateData: any = {
      lissCardio: {
        frequency: lissCardioData.frequency,
        duration: lissCardioData.duration,
        targetHeartRate: lissCardioData.targetHeartRate,
        timing: lissCardioData.timing,
        lastUpdated: serverTimestamp()
      },
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
