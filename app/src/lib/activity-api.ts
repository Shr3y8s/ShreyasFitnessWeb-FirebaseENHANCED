// API utilities for daily activity tracking CRUD operations

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
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import {
  DailyActivityData,
  DailyStepsLog,
  DailyWaterLog,
  DailyHabitLog,
  WeightLog,
  getTodayDateString
} from '@/types/activity';

// Top-level collection for consistency with nutritionLogs and workouts (unified model)
const ACTIVITIES_COLLECTION = 'dailyActivities';

// Helper to generate document ID: {userId}_{date}
const getActivityDocId = (userId: string, date: string): string => {
  return `${userId}_${date}`;
};

// Helper to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date();
};

/**
 * Get daily activity data for a specific date
 * Document ID format: {userId}_{date}
 */
export async function getDailyActivity(
  userId: string,
  date: string
): Promise<DailyActivityData | null> {
  try {
    const docId = getActivityDocId(userId, date);
    const docRef = doc(db, ACTIVITIES_COLLECTION, docId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      date: data.date,
      steps: data.steps ? {
        date: data.steps.date,
        steps: data.steps.steps,
        goal: data.steps.goal,
        timestamp: timestampToDate(data.steps.timestamp)
      } : undefined,
      water: data.water ? {
        date: data.water.date,
        amount: data.water.amount,
        unit: data.water.unit,
        goal: data.water.goal,
        timestamp: timestampToDate(data.water.timestamp)
      } : undefined,
      habits: (data.habits || []).map((habit: any) => ({
        date: habit.date,
        habitId: habit.habitId,
        completed: habit.completed,
        timestamp: timestampToDate(habit.timestamp)
      })),
      weight: data.weight ? {
        date: data.weight.date,
        weight: data.weight.weight,
        unit: data.weight.unit,
        bodyFat: data.weight.bodyFat,
        height: data.weight.height,
        heightUnit: data.weight.heightUnit,
        bmi: data.weight.bmi,
        notes: data.weight.notes,
        timestamp: timestampToDate(data.weight.timestamp)
      } : undefined,
      updatedAt: timestampToDate(data.updatedAt)
    };
  } catch (error) {
    console.error('Error getting daily activity:', error);
    throw error;
  }
}

/**
 * Log steps for a specific date
 */
export async function logSteps(
  userId: string,
  date: string,
  steps: number,
  goal: number
): Promise<{ success: boolean; error?: any }> {
  try {
    const docId = getActivityDocId(userId, date);
    const docRef = doc(db, ACTIVITIES_COLLECTION, docId);
    
    const stepsLog: DailyStepsLog = {
      date,
      steps,
      goal,
      timestamp: new Date()
    };
    
    const existingDoc = await getDoc(docRef);
    
    if (existingDoc.exists()) {
      // Update existing document
      await updateDoc(docRef, {
        steps: {
          ...stepsLog,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with userId for querying
      await setDoc(docRef, {
        userId,
        date,
        steps: {
          ...stepsLog,
          timestamp: serverTimestamp()
        },
        habits: [],
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error logging steps:', error);
    return { success: false, error };
  }
}

/**
 * Log water intake for a specific date
 */
export async function logWater(
  userId: string,
  date: string,
  amount: number,
  unit: 'oz' | 'liters' | 'cups',
  goal: number
): Promise<{ success: boolean; error?: any }> {
  try {
    const docId = getActivityDocId(userId, date);
    const docRef = doc(db, ACTIVITIES_COLLECTION, docId);
    
    const waterLog: DailyWaterLog = {
      date,
      amount,
      unit,
      goal,
      timestamp: new Date()
    };
    
    const existingDoc = await getDoc(docRef);
    
    if (existingDoc.exists()) {
      // Update existing document
      await updateDoc(docRef, {
        water: {
          ...waterLog,
          timestamp: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with userId for querying
      await setDoc(docRef, {
        userId,
        date,
        water: {
          ...waterLog,
          timestamp: serverTimestamp()
        },
        habits: [],
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error logging water:', error);
    return { success: false, error };
  }
}

/**
 * Toggle a daily habit completion
 */
export async function toggleHabit(
  userId: string,
  date: string,
  habitId: string,
  completed: boolean
): Promise<{ success: boolean; error?: any }> {
  try {
    const docId = getActivityDocId(userId, date);
    const docRef = doc(db, ACTIVITIES_COLLECTION, docId);
    
    const existingDoc = await getDoc(docRef);
    let habits: DailyHabitLog[] = [];
    
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      habits = data.habits || [];
    }
    
    // Find if habit already exists
    const habitIndex = habits.findIndex(h => h.habitId === habitId);
    
    if (habitIndex >= 0) {
      // Update existing habit
      habits[habitIndex] = {
        date,
        habitId,
        completed,
        timestamp: new Date()
      };
    } else {
      // Add new habit
      habits.push({
        date,
        habitId,
        completed,
        timestamp: new Date()
      });
    }
    
    // Convert timestamps for Firestore
    // Note: serverTimestamp() cannot be used inside arrays, so we use Date.now()
    const now = Date.now();
    const habitsForFirestore = habits.map(h => ({
      date: h.date,
      habitId: h.habitId,
      completed: h.completed,
      timestamp: now
    }));
    
    if (existingDoc.exists()) {
      await updateDoc(docRef, {
        habits: habitsForFirestore,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with userId for querying
      await setDoc(docRef, {
        userId,
        date,
        habits: habitsForFirestore,
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error toggling habit:', error);
    return { success: false, error };
  }
}

/**
 * Log weight for a specific date
 */
export async function logWeight(
  userId: string,
  date: string,
  weight: number,
  unit: 'lbs' | 'kg',
  bodyFat?: number,
  height?: number,
  heightUnit?: 'in' | 'cm',
  bmi?: number,
  notes?: string
): Promise<{ success: boolean; error?: any }> {
  try {
    const docId = getActivityDocId(userId, date);
    const docRef = doc(db, ACTIVITIES_COLLECTION, docId);
    
    // Build weight log object, only including optional fields if defined
    const weightLog: WeightLog = {
      date,
      weight,
      unit,
      ...(bodyFat !== undefined && { bodyFat }),
      ...(height !== undefined && { height }),
      ...(heightUnit !== undefined && { heightUnit }),
      ...(bmi !== undefined && { bmi }),
      ...(notes !== undefined && notes !== '' && { notes }),
      timestamp: new Date()
    };
    
    const existingDoc = await getDoc(docRef);
    
    if (existingDoc.exists()) {
      // Update existing document
      // Build update object without undefined values
      const weightUpdate: any = {
        date: weightLog.date,
        weight: weightLog.weight,
        unit: weightLog.unit,
        timestamp: serverTimestamp()
      };
      if (bodyFat !== undefined) weightUpdate.bodyFat = bodyFat;
      if (height !== undefined) weightUpdate.height = height;
      if (heightUnit !== undefined) weightUpdate.heightUnit = heightUnit;
      if (bmi !== undefined) weightUpdate.bmi = bmi;
      if (notes !== undefined && notes !== '') weightUpdate.notes = notes;
      
      await updateDoc(docRef, {
        weight: weightUpdate,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new document with userId for querying
      const weightForFirestore: any = {
        date: weightLog.date,
        weight: weightLog.weight,
        unit: weightLog.unit,
        timestamp: serverTimestamp()
      };
      if (bodyFat !== undefined) weightForFirestore.bodyFat = bodyFat;
      if (height !== undefined) weightForFirestore.height = height;
      if (heightUnit !== undefined) weightForFirestore.heightUnit = heightUnit;
      if (bmi !== undefined) weightForFirestore.bmi = bmi;
      if (notes !== undefined && notes !== '') weightForFirestore.notes = notes;
      
      await setDoc(docRef, {
        userId,
        date,
        weight: weightForFirestore,
        habits: [],
        updatedAt: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error logging weight:', error);
    return { success: false, error };
  }
}

/**
 * Get activity logs for a date range
 * Returns activity data for multiple dates
 */
export async function getActivityLogsForDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyActivityData[]> {
  try {
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    // Simplified query without orderBy to avoid permissions issues
    // We'll sort the results in JavaScript instead
    // Must include limit to match Firestore rules requirement (limit <= 100)
    const q = query(
      activitiesRef,
      where('userId', '==', userId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const activities: DailyActivityData[] = [];
    
    querySnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      activities.push({
        date: data.date,
        steps: data.steps ? {
          date: data.steps.date,
          steps: data.steps.steps,
          goal: data.steps.goal,
          timestamp: timestampToDate(data.steps.timestamp)
        } : undefined,
        water: data.water ? {
          date: data.water.date,
          amount: data.water.amount,
          unit: data.water.unit,
          goal: data.water.goal,
          timestamp: timestampToDate(data.water.timestamp)
        } : undefined,
        habits: (data.habits || []).map((habit: any) => ({
          date: habit.date,
          habitId: habit.habitId,
          completed: habit.completed,
          timestamp: timestampToDate(habit.timestamp)
        })),
        weight: data.weight ? {
          date: data.weight.date,
          weight: data.weight.weight,
          unit: data.weight.unit,
          bodyFat: data.weight.bodyFat,
          height: data.weight.height,
          heightUnit: data.weight.heightUnit,
          bmi: data.weight.bmi,
          notes: data.weight.notes,
          timestamp: timestampToDate(data.weight.timestamp)
        } : undefined,
        updatedAt: timestampToDate(data.updatedAt)
      });
    });
    
    // Sort by date descending in JavaScript
    return activities.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Error getting activity logs for date range:', error);
    return [];
  }
}

/**
 * Get recent weight logs for progress tracking
 * Returns the last N weight entries
 */
export async function getRecentWeightLogs(
  userId: string,
  limitCount: number = 10
): Promise<WeightLog[]> {
  try {
    // Query for documents that belong to this user and have weight data
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const q = query(
      activitiesRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount * 2) // Get more to filter for weight entries
    );
    
    const querySnapshot = await getDocs(q);
    const weightLogs: WeightLog[] = [];
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.weight) {
        weightLogs.push({
          date: data.weight.date,
          weight: data.weight.weight,
          unit: data.weight.unit,
          bodyFat: data.weight.bodyFat,
          height: data.weight.height,
          heightUnit: data.weight.heightUnit,
          bmi: data.weight.bmi,
          notes: data.weight.notes,
          timestamp: timestampToDate(data.weight.timestamp)
        });
      }
    });
    
    // Sort by date and return limited results
    return weightLogs
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error getting recent weight logs:', error);
    return [];
  }
}
