import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc,
  query,
  where,
  Timestamp 
} from 'firebase/firestore';
import { Goal, GoalCategory, Milestone } from '@/types/goals';

// Default deadline for setup/onboarding goals
export const ONBOARDING_DEADLINE_DAYS = 15;

/**
 * Fetch all goal slots for a client (7 documents max)
 * Document IDs: {clientId}_{category}
 */
export async function getClientGoals(clientId: string): Promise<Map<GoalCategory, Goal | null>> {
  const goalSlots = new Map<GoalCategory, Goal | null>();
  
  // Query all goal documents for this client
  const goalsQuery = query(
    collection(db, 'goals'),
    where('clientId', '==', clientId)
  );
  
  const snapshot = await getDocs(goalsQuery);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const goal: Goal = {
      id: doc.id,
      clientId: data.clientId,
      trainerId: data.trainerId,
      title: data.title,
      category: data.category as GoalCategory,
      term: data.term,
      priority: data.priority,
      isActive: data.isActive ?? false,
      isConfigured: data.isConfigured ?? false,
      dailyTarget: data.dailyTarget,
      targetStreak: data.targetStreak,
      currentStreak: data.currentStreak,
      targetValue: data.targetValue,
      currentValue: data.currentValue,
      unit: data.unit,
      lowerIsBetter: data.lowerIsBetter ?? false,
      exerciseId: data.exerciseId,
      exerciseName: data.exerciseName,
      status: data.status,
      deadline: data.deadline?.toDate() || new Date(),
      completedAt: data.completedAt?.toDate(),
      milestones: (data.milestones || []).map((m: any) => ({
        id: m.id,
        goalId: doc.id,
        order: m.order,
        text: m.text,
        targetValue: m.targetValue,
        completed: m.completed ?? false,
        completedAt: m.completedAt?.toDate(),
        autoTracked: m.autoTracked ?? true,
        createdAt: m.createdAt?.toDate() || new Date(),
        updatedAt: m.updatedAt?.toDate() || new Date()
      })),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy
    };
    
    goalSlots.set(data.category as GoalCategory, goal);
  });
  
  return goalSlots;
}

/**
 * Save or update a goal configuration for a specific category slot
 */
export async function saveGoalConfig(
  clientId: string,
  category: GoalCategory,
  goalData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const goalId = `${clientId}_${category}`;
    const goalRef = doc(db, 'goals', goalId);
    
    const now = Timestamp.now();
    
    // Check if goal already exists
    const existingDoc = await getDoc(goalRef);
    const isUpdate = existingDoc.exists();
    
    const goalDoc: any = {
      clientId,
      trainerId: goalData.trainerId,
      category,
      title: goalData.title,
      term: goalData.term,
      priority: goalData.priority,
      isActive: goalData.isActive ?? true,
      isConfigured: true,
      unit: goalData.unit,
      lowerIsBetter: goalData.lowerIsBetter ?? false,
      status: 'active',
      deadline: Timestamp.fromDate(goalData.deadline),
      completedAt: null,
      milestones: goalData.milestones.map((m: any, idx: number) => ({
        id: `${goalId}_m${idx}`,
        order: idx + 1,
        text: m.text,
        targetValue: m.targetValue,
        completed: false,
        completedAt: null,
        autoTracked: m.autoTracked,
        createdAt: now,
        updatedAt: now
      })),
      createdAt: isUpdate ? existingDoc.data()?.createdAt : now,
      updatedAt: now,
      createdBy: goalData.trainerId
    };
    
    // Only add defined fields - Firestore rejects undefined values
    if (goalData.dailyTarget !== undefined) goalDoc.dailyTarget = goalData.dailyTarget;
    if (goalData.targetStreak !== undefined) goalDoc.targetStreak = goalData.targetStreak;
    if (goalData.currentStreak !== undefined) goalDoc.currentStreak = goalData.currentStreak;
    if (goalData.targetValue !== undefined) goalDoc.targetValue = goalData.targetValue;
    if (goalData.currentValue !== undefined) goalDoc.currentValue = goalData.currentValue;
    if (goalData.exerciseId) goalDoc.exerciseId = goalData.exerciseId;
    if (goalData.exerciseName) goalDoc.exerciseName = goalData.exerciseName;
    
    await setDoc(goalRef, goalDoc);
    
    return { success: true };
  } catch (error) {
    console.error('Error saving goal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save goal' 
    };
  }
}

/**
 * Toggle goal active/inactive status
 */
export async function toggleGoalActive(
  clientId: string,
  category: GoalCategory,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const goalId = `${clientId}_${category}`;
    const goalRef = doc(db, 'goals', goalId);
    
    await updateDoc(goalRef, {
      isActive,
      updatedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling goal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to toggle goal' 
    };
  }
}

/**
 * Update milestone completion status (manual tracking)
 */
export async function updateMilestoneCompletion(
  clientId: string,
  category: GoalCategory,
  milestoneIndex: number,
  completed: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const goalId = `${clientId}_${category}`;
    const goalRef = doc(db, 'goals', goalId);
    const goalDoc = await getDoc(goalRef);
    
    if (!goalDoc.exists()) {
      return { success: false, error: 'Goal not found' };
    }
    
    const milestones = goalDoc.data().milestones || [];
    if (milestoneIndex >= milestones.length) {
      return { success: false, error: 'Milestone not found' };
    }
    
    milestones[milestoneIndex].completed = completed;
    milestones[milestoneIndex].completedAt = completed ? Timestamp.now() : null;
    milestones[milestoneIndex].updatedAt = Timestamp.now();
    
    await updateDoc(goalRef, {
      milestones,
      updatedAt: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating milestone:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update milestone' 
    };
  }
}

/**
 * Auto-create setup/onboarding goal for new clients
 * Called on first dashboard load for clients with online coaching
 */
export async function createSetupGoal(
  clientId: string,
  trainerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const goalId = `${clientId}_setup`;
    const goalRef = doc(db, 'goals', goalId);
    
    // Check if already exists
    const existing = await getDoc(goalRef);
    if (existing.exists()) {
      return { success: true }; // Already exists
    }
    
    const now = Timestamp.now();
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + ONBOARDING_DEADLINE_DAYS);
    
    const goalDoc = {
      clientId,
      trainerId,
      category: 'setup',
      title: 'Complete Your Onboarding',
      term: 'short-term',
      priority: 'high',
      isActive: true,
      isConfigured: true,
      targetValue: 3,
      currentValue: 0,
      unit: 'tasks',
      lowerIsBetter: false,
      status: 'active',
      deadline: Timestamp.fromDate(deadline),
      completedAt: null,
      milestones: [
        {
          id: `${goalId}_m0`,
          order: 1,
          text: 'Schedule your 30-minute planning consultation',
          targetValue: 1,
          completed: false,
          completedAt: null,
          autoTracked: false,
          createdAt: now,
          updatedAt: now
        },
        {
          id: `${goalId}_m1`,
          order: 2,
          text: 'Complete your consultation',
          targetValue: 2,
          completed: false,
          completedAt: null,
          autoTracked: false,
          createdAt: now,
          updatedAt: now
        },
        {
          id: `${goalId}_m2`,
          order: 3,
          text: 'Receive your personalized fitness plan',
          targetValue: 3,
          completed: false,
          completedAt: null,
          autoTracked: false,
          createdAt: now,
          updatedAt: now
        }
      ],
      createdAt: now,
      updatedAt: now,
      createdBy: trainerId
    };
    
    await setDoc(goalRef, goalDoc);
    
    return { success: true };
  } catch (error) {
    console.error('Error creating setup goal:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create setup goal' 
    };
  }
}
