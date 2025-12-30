// API functions for trainer nutrition tracking

import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { 
  DailyMacroLog, 
  DailyHabitsLog, 
  DateRange,
  CalendarDayData,
  getAdherenceLevel,
  NutritionGoals
} from '@/types/nutrition-tracking';
import { NutritionApproach } from '@/types/plan';

/**
 * Fetch client's nutrition approach from their plan
 */
export async function getClientNutritionApproach(clientId: string): Promise<NutritionApproach | null> {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) {
      return null;
    }
    
    const data = planSnap.data();
    return data.nutritionProtocol?.approach || null;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching nutrition approach:', error);
    throw error;
  }
}

/**
 * Fetch client's nutrition goals from their plan
 */
export async function getClientNutritionGoals(clientId: string): Promise<NutritionGoals | null> {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) {
      return null;
    }
    
    const data = planSnap.data();
    const macroTracking = data.nutritionProtocol?.macroTracking;
    
    if (!macroTracking) {
      return null;
    }
    
    return {
      calories: macroTracking.calories,
      protein: macroTracking.protein,
      carbs: macroTracking.carbs,
      fats: macroTracking.fats
    };
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching nutrition goals:', error);
    throw error;
  }
}

/**
 * Fetch client's nutrition habits from their plan
 */
export async function getClientNutritionHabits(clientId: string) {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) {
      return null;
    }
    
    const data = planSnap.data();
    return data.nutritionProtocol?.healthyHabits?.habits || null;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching nutrition habits:', error);
    throw error;
  }
}

/**
 * Fetch daily macro logs for a date range
 */
export async function getDailyMacroLogs(
  clientId: string,
  dateRange: DateRange
): Promise<DailyMacroLog[]> {
  try {
    const logsRef = collection(db, 'nutritionLogs', clientId, 'meals');
    const q = query(
      logsRef,
      where('date', '>=', dateRange.start),
      where('date', '<=', dateRange.end),
      orderBy('date', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      createdAt: doc.data().createdAt,
      updatedAt: doc.data().updatedAt
    })) as DailyMacroLog[];
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily macro logs:', error);
    throw error;
  }
}

/**
 * Fetch a single daily macro log
 */
export async function getDailyMacroLog(
  clientId: string,
  date: string
): Promise<DailyMacroLog | null> {
  try {
    const logRef = doc(db, 'nutritionLogs', clientId, 'meals', date);
    const logSnap = await getDoc(logRef);
    
    if (!logSnap.exists()) {
      return null;
    }
    
    return {
      ...logSnap.data(),
      createdAt: logSnap.data().createdAt,
      updatedAt: logSnap.data().updatedAt
    } as DailyMacroLog;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily macro log:', error);
    throw error;
  }
}

/**
 * Fetch daily habit logs for a date range
 */
export async function getDailyHabitLogs(
  clientId: string,
  dateRange: DateRange
): Promise<DailyHabitsLog[]> {
  try {
    // First, get the client's habits to know the total count
    const habits = await getClientNutritionHabits(clientId);
    const totalHabits = habits ? habits.length : 0;
    
    // Fetch all habit documents in the date range
    // Note: The documents just contain {habitId: boolean} maps, not structured data
    const logsRef = collection(db, 'nutritionLogs', clientId, 'habits');
    
    // Get all documents (can't use where/orderBy on document IDs)
    const snapshot = await getDocs(logsRef);
    
    const logs: DailyHabitsLog[] = [];
    
    snapshot.docs.forEach(doc => {
      const date = doc.id; // Document ID is the date (YYYY-MM-DD)
      
      // Check if date is in range
      if (date >= dateRange.start && date <= dateRange.end) {
        const rawData = doc.data();
        
        // Count completed habits from the raw boolean map
        let completionCount = 0;
        const habitsMap: Record<string, boolean> = {};
        
        // rawData is just {habitId: boolean, habitId: boolean, ...}
        Object.keys(rawData).forEach(key => {
          // Filter out any non-habit fields (like timestamps if they exist)
          if (typeof rawData[key] === 'boolean') {
            habitsMap[key] = rawData[key];
            if (rawData[key] === true) {
              completionCount++;
            }
          }
        });
        
        const completionPercentage = totalHabits > 0 
          ? (completionCount / totalHabits) * 100 
          : 0;
        
        logs.push({
          date,
          habits: habitsMap,
          completionCount,
          totalHabits,
          completionPercentage,
          streak: 0, // Streak calculation would require sequential processing
          createdAt: rawData.createdAt,
          updatedAt: rawData.updatedAt
        });
      }
    });
    
    // Sort by date descending
    logs.sort((a, b) => b.date.localeCompare(a.date));
    
    return logs;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily habit logs:', error);
    throw error;
  }
}

/**
 * Fetch a single daily habit log
 */
export async function getDailyHabitLog(
  clientId: string,
  date: string
): Promise<DailyHabitsLog | null> {
  try {
    // Get the client's habits to know the total count
    const habits = await getClientNutritionHabits(clientId);
    const totalHabits = habits ? habits.length : 0;
    
    const logRef = doc(db, 'nutritionLogs', clientId, 'habits', date);
    const logSnap = await getDoc(logRef);
    
    if (!logSnap.exists()) {
      return null;
    }
    
    const rawData = logSnap.data();
    
    // Count completed habits from the raw boolean map
    let completionCount = 0;
    const habitsMap: Record<string, boolean> = {};
    
    // rawData is just {habitId: boolean, habitId: boolean, ...}
    Object.keys(rawData).forEach(key => {
      // Filter out any non-habit fields (like timestamps if they exist)
      if (typeof rawData[key] === 'boolean') {
        habitsMap[key] = rawData[key];
        if (rawData[key] === true) {
          completionCount++;
        }
      }
    });
    
    const completionPercentage = totalHabits > 0 
      ? (completionCount / totalHabits) * 100 
      : 0;
    
    return {
      date,
      habits: habitsMap,
      completionCount,
      totalHabits,
      completionPercentage,
      streak: 0, // Streak calculation would require checking previous days
      createdAt: rawData.createdAt,
      updatedAt: rawData.updatedAt
    };
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily habit log:', error);
    throw error;
  }
}

/**
 * Fetch daily meal plan logs for a date range
 */
export async function getDailyMealPlanLogs(
  clientId: string,
  dateRange: DateRange
): Promise<Array<{date: string, completedMeals: string[], dayComplete: boolean}>> {
  try {
    const logsRef = collection(db, 'nutritionLogs', clientId, 'mealPlans');
    
    // Get all documents (can't use where/orderBy on document IDs efficiently)
    const snapshot = await getDocs(logsRef);
    
    const logs: Array<{date: string, completedMeals: string[], dayComplete: boolean}> = [];
    
    snapshot.docs.forEach(doc => {
      const date = doc.id; // Document ID is the date (YYYY-MM-DD)
      
      // Check if date is in range
      if (date >= dateRange.start && date <= dateRange.end) {
        const data = doc.data();
        logs.push({
          date,
          completedMeals: data.completedMeals || [],
          dayComplete: data.dayComplete || false
        });
      }
    });
    
    // Sort by date descending
    logs.sort((a, b) => b.date.localeCompare(a.date));
    
    return logs;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily meal plan logs:', error);
    throw error;
  }
}

/**
 * Fetch a single daily meal plan log
 */
export async function getDailyMealPlanLog(
  clientId: string,
  date: string
): Promise<{date: string, completedMeals: string[], dayComplete: boolean} | null> {
  try {
    const logRef = doc(db, 'nutritionLogs', clientId, 'mealPlans', date);
    const logSnap = await getDoc(logRef);
    
    if (!logSnap.exists()) {
      return null;
    }
    
    const data = logSnap.data();
    return {
      date,
      completedMeals: data.completedMeals || [],
      dayComplete: data.dayComplete || false
    };
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching daily meal plan log:', error);
    throw error;
  }
}

/**
 * Fetch client's weekly meal plan to know total meals per day
 */
export async function getClientWeeklyMealPlan(clientId: string) {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) {
      return null;
    }
    
    const data = planSnap.data();
    return data.nutritionProtocol?.mealPlan?.weeklyPlan || null;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching weekly meal plan:', error);
    throw error;
  }
}

/**
 * Build calendar data for meal plan approach
 */
export function buildMealPlanCalendarData(
  logs: Array<{date: string, completedMeals: string[], dayComplete: boolean}>,
  dateRange: DateRange,
  totalMealsPerDay: number = 4
): CalendarDayData[] {
  const calendarData: CalendarDayData[] = [];
  const logMap = new Map(logs.map(log => [log.date, log]));
  
  // Generate all dates in range
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logMap.get(dateStr);
    
    if (log) {
      const mealsCompleted = log.completedMeals.length;
      const adherencePercentage = totalMealsPerDay > 0 
        ? (mealsCompleted / totalMealsPerDay) * 100 
        : 0;
      
      calendarData.push({
        date: dateStr,
        adherencePercentage,
        level: getAdherenceLevel(adherencePercentage),
        hasData: true,
        mealsCompleted,
        totalMeals: totalMealsPerDay
      });
    } else {
      calendarData.push({
        date: dateStr,
        adherencePercentage: 0,
        level: 'red',
        hasData: false,
        mealsCompleted: 0,
        totalMeals: totalMealsPerDay
      });
    }
  }
  
  return calendarData;
}

/**
 * Fetch water intake data for a date range from daily activities
 */
export async function getWaterIntakeData(
  clientId: string,
  dateRange: DateRange
): Promise<Map<string, number>> {
  try {
    // Query the dailyActivities collection for documents matching userId and date range
    // Document IDs are in format: {userId}_{date}
    const activitiesRef = collection(db, 'dailyActivities');
    const q = query(
      activitiesRef,
      where('userId', '==', clientId),
      where('date', '>=', dateRange.start),
      where('date', '<=', dateRange.end),
      limit(100)
    );
    
    const snapshot = await getDocs(q);
    const waterMap = new Map<string, number>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.water && data.water.amount) {
        waterMap.set(data.date, data.water.amount);
      }
    });
    
    return waterMap;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching water intake:', error);
    throw error;
  }
}

/**
 * Fetch water goal from client plan
 */
export async function getWaterGoal(clientId: string): Promise<number | null> {
  try {
    const planRef = doc(db, 'clientPlans', clientId);
    const planSnap = await getDoc(planRef);
    
    if (!planSnap.exists()) {
      return null;
    }
    
    const data = planSnap.data();
    return data.waterGoal?.target || null;
  } catch (error) {
    console.error('[Nutrition Tracking API] Error fetching water goal:', error);
    throw error;
  }
}

/**
 * Build calendar data for macro tracking approach
 */
export function buildMacroCalendarData(
  logs: DailyMacroLog[],
  dateRange: DateRange
): CalendarDayData[] {
  const calendarData: CalendarDayData[] = [];
  const logMap = new Map(logs.map(log => [log.date, log]));
  
  // Generate all dates in range
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logMap.get(dateStr);
    
    if (log) {
      calendarData.push({
        date: dateStr,
        adherencePercentage: log.adherencePercentage,
        level: getAdherenceLevel(log.adherencePercentage),
        hasData: true,
        mealsCompleted: log.mealsCompleted,
        totalMeals: 4
      });
    } else {
      calendarData.push({
        date: dateStr,
        adherencePercentage: 0,
        level: 'red',
        hasData: false,
        mealsCompleted: 0,
        totalMeals: 4
      });
    }
  }
  
  return calendarData;
}

/**
 * Build calendar data for healthy habits approach
 */
export function buildHabitsCalendarData(
  logs: DailyHabitsLog[],
  dateRange: DateRange
): CalendarDayData[] {
  const calendarData: CalendarDayData[] = [];
  const logMap = new Map(logs.map(log => [log.date, log]));
  
  // Generate all dates in range
  const start = new Date(dateRange.start);
  const end = new Date(dateRange.end);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logMap.get(dateStr);
    
    if (log) {
      calendarData.push({
        date: dateStr,
        adherencePercentage: log.completionPercentage,
        level: getAdherenceLevel(log.completionPercentage),
        hasData: true,
        habitsCompleted: log.completionCount,
        totalHabits: log.totalHabits
      });
    } else {
      calendarData.push({
        date: dateStr,
        adherencePercentage: 0,
        level: 'red',
        hasData: false,
        habitsCompleted: 0,
        totalHabits: 0
      });
    }
  }
  
  return calendarData;
}

/**
 * Calculate date range based on preset
 */
export function getDateRangeFromPreset(preset: string): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let start: Date;
  let end: Date = new Date(today);
  
  switch (preset) {
    case 'today':
      start = new Date(today);
      break;
    case 'week':
      // Get start of week (Sunday)
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      break;
    case 'month':
      // Get start of month
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case '30days':
      // 30 days ago
      start = new Date(today);
      start.setDate(today.getDate() - 30);
      break;
    default:
      start = new Date(today);
  }
  
  // Format dates in local timezone (YYYY-MM-DD)
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end)
  };
}

/**
 * Format date for display
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  }
}
