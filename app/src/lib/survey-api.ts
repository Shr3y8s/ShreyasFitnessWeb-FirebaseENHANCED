import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';

export interface WeeklySurveyRatings {
  energy: number;  // 1-5
  sleep: number;   // 1-5
  mood: number;    // 1-5
}

export interface WeeklySurveyAdherence {
  workouts: number;   // 1-5 (difficulty)
  nutrition: number;  // 1-5 (difficulty)
}

export interface WeeklySurveyData {
  userId: string;
  weekStartDate: string;  // "2024-01-15" (Monday)
  weekEndDate: string;    // "2024-01-21" (Sunday)
  ratings: WeeklySurveyRatings;
  adherence: WeeklySurveyAdherence;
  wins: string;
  challenges: string;
  submittedAt: Date;
  lastUpdated: Date;
}

/**
 * Get the current week's date range (Monday to Sunday)
 * Returns { startDate: "2024-01-15", endDate: "2024-01-21" }
 */
export function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
  
  // Calculate days to Monday (start of week)
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0]
  };
}

/**
 * Get week range for a specific date
 */
export function getWeekRangeForDate(date: Date): { startDate: string; endDate: string } {
  const dayOfWeek = date.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(date);
  monday.setDate(date.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    startDate: monday.toISOString().split('T')[0],
    endDate: sunday.toISOString().split('T')[0]
  };
}

/**
 * Submit or update weekly survey
 */
export async function submitWeeklySurvey(
  userId: string,
  ratings: WeeklySurveyRatings,
  adherence: WeeklySurveyAdherence,
  wins: string,
  challenges: string
): Promise<{ success: boolean; error?: string; weekStartDate?: string }> {
  try {
    const { startDate, endDate } = getCurrentWeekRange();
    
    const surveyData: WeeklySurveyData = {
      userId,
      weekStartDate: startDate,
      weekEndDate: endDate,
      ratings,
      adherence,
      wins: wins.trim(),
      challenges: challenges.trim(),
      submittedAt: new Date(),
      lastUpdated: new Date()
    };
    
    const docRef = doc(db, 'weeklySurveys', userId, 'responses', startDate);
    
    // Check if already exists to preserve submittedAt
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      surveyData.submittedAt = existingDoc.data().submittedAt.toDate();
    }
    
    await setDoc(docRef, {
      ...surveyData,
      submittedAt: Timestamp.fromDate(surveyData.submittedAt),
      lastUpdated: Timestamp.fromDate(surveyData.lastUpdated)
    });
    
    return { success: true, weekStartDate: startDate };
  } catch (error) {
    console.error('Error submitting weekly survey:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit survey'
    };
  }
}

/**
 * Get weekly survey for a specific week
 */
export async function getWeeklySurvey(
  userId: string, 
  weekStartDate: string
): Promise<WeeklySurveyData | null> {
  try {
    const docRef = doc(db, 'weeklySurveys', userId, 'responses', weekStartDate);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      ...data,
      submittedAt: data.submittedAt.toDate(),
      lastUpdated: data.lastUpdated.toDate()
    } as WeeklySurveyData;
  } catch (error) {
    console.error('Error fetching weekly survey:', error);
    return null;
  }
}

/**
 * Get current week's survey if it exists
 */
export async function getCurrentWeekSurvey(userId: string): Promise<WeeklySurveyData | null> {
  const { startDate } = getCurrentWeekRange();
  return getWeeklySurvey(userId, startDate);
}

/**
 * Get recent surveys for trends (last N weeks)
 */
export async function getRecentSurveys(
  userId: string, 
  count: number = 8
): Promise<WeeklySurveyData[]> {
  try {
    const surveysRef = collection(db, 'weeklySurveys', userId, 'responses');
    const q = query(surveysRef, orderBy('weekStartDate', 'desc'), limit(count));
    
    const querySnapshot = await getDocs(q);
    const surveys: WeeklySurveyData[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      surveys.push({
        ...data,
        submittedAt: data.submittedAt.toDate(),
        lastUpdated: data.lastUpdated.toDate()
      } as WeeklySurveyData);
    });
    
    return surveys;
  } catch (error) {
    console.error('Error fetching recent surveys:', error);
    return [];
  }
}

/**
 * Format week range for display
 * e.g., "Jan 15 - Jan 21, 2024"
 */
export function formatWeekRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', options);
  const endStr = end.toLocaleDateString('en-US', { ...options, year: 'numeric' });
  
  return `${startStr} - ${endStr}`;
}

/**
 * Get the Monday of the previous week
 */
export function getPreviousWeekStart(weekStartDate: string): string {
  const date = new Date(weekStartDate + 'T00:00:00');
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

/**
 * Get the Monday of the next week
 */
export function getNextWeekStart(weekStartDate: string): string {
  const date = new Date(weekStartDate + 'T00:00:00');
  date.setDate(date.getDate() + 7);
  return date.toISOString().split('T')[0];
}

/**
 * Get the Monday of 2 weeks ago (oldest selectable week)
 */
export function getTwoWeeksAgo(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() + daysToMonday);
  thisMonday.setDate(thisMonday.getDate() - 14); // Go back 2 weeks
  
  return thisMonday.toISOString().split('T')[0];
}

/**
 * Submit or update weekly survey for a specific week
 */
export async function submitWeeklySurveyForWeek(
  userId: string,
  weekStartDate: string,
  ratings: WeeklySurveyRatings,
  adherence: WeeklySurveyAdherence,
  wins: string,
  challenges: string
): Promise<{ success: boolean; error?: string; weekStartDate?: string }> {
  try {
    // Calculate end date from start date
    const startDate = new Date(weekStartDate + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const surveyData: WeeklySurveyData = {
      userId,
      weekStartDate,
      weekEndDate: endDate.toISOString().split('T')[0],
      ratings,
      adherence,
      wins: wins.trim(),
      challenges: challenges.trim(),
      submittedAt: new Date(),
      lastUpdated: new Date()
    };
    
    const docRef = doc(db, 'weeklySurveys', userId, 'responses', weekStartDate);
    
    // Check if already exists to preserve submittedAt
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      surveyData.submittedAt = existingDoc.data().submittedAt.toDate();
    }
    
    await setDoc(docRef, {
      ...surveyData,
      submittedAt: Timestamp.fromDate(surveyData.submittedAt),
      lastUpdated: Timestamp.fromDate(surveyData.lastUpdated)
    });
    
    return { success: true, weekStartDate };
  } catch (error) {
    console.error('Error submitting weekly survey:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to submit survey'
    };
  }
}
