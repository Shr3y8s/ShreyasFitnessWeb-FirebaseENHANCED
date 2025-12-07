// src/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

/**
 * Translates Firebase error codes to user-friendly messages
 * @param error - Firebase error object or error message string
 * @returns User-friendly error message
 */
export function getFirebaseErrorMessage(error: any): string {
  // Extract error code from Firebase error
  const errorCode = error?.code || error?.message || '';
  const errorString = String(errorCode).toLowerCase();

  // Map Firebase error codes to user-friendly messages
  if (errorString.includes('invalid-credential') || errorString.includes('invalid-login-credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (errorString.includes('user-not-found')) {
    return 'No account found with this email address. Please sign up first.';
  }
  if (errorString.includes('wrong-password')) {
    return 'Incorrect password. Please try again.';
  }
  if (errorString.includes('email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (errorString.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (errorString.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (errorString.includes('too-many-requests')) {
    return 'Too many failed login attempts. Please try again later or reset your password.';
  }
  if (errorString.includes('user-disabled')) {
    return 'This account has been disabled. Please contact support for assistance.';
  }
  if (errorString.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (errorString.includes('operation-not-allowed')) {
    return 'This sign-in method is not enabled. Please contact support.';
  }
  if (errorString.includes('popup-closed-by-user')) {
    return 'Sign-in cancelled. Please try again.';
  }
  if (errorString.includes('cancelled-popup-request')) {
    return 'Only one sign-in popup allowed at a time.';
  }

  // Default message for unknown errors
  return 'An error occurred. Please try again or contact support if the problem persists.';
}
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  collection,
  onSnapshot,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import type { Exercise, AssignedWorkout } from '@/types/workout';

// Types
interface ServiceTier {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface UserCreationResult {
  success: boolean;
  userId?: string;
  user?: User;
  error?: Error;
}

interface SignInResult {
  success: boolean;
  user?: User;
  error?: Error;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: number;
  items: {
    data: {
      price: {
        id: string;
        unit_amount: number;
      };
    }[];
  };
}

interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Get Functions instance with region from shared config file
// The region is read from firebase-config.json at build time via next.config.ts
// and exposed as an environment variable
const functionsRegion = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const functions = getFunctions(app, functionsRegion);

// Function to create a user with tier information
export async function createUserWithTier(email: string, password: string, name: string, phone: string, tier: ServiceTier): Promise<UserCreationResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    await setDoc(doc(db, 'users', userId), {
      name: name,
      email: email,
      phone: phone || null,
      tier: tier.id,
      tierName: tier.name,
      accountActivated: false, // Account created, payment not yet completed
      role: 'client',
      createdAt: serverTimestamp()
    });
    
    // CRITICAL: Create stripe_customers document for Stripe Extension
    // The Extension expects this document to exist for webhooks to work
    await setDoc(doc(db, 'stripe_customers', userId), {
      email: email,
      name: name,
      createdAt: serverTimestamp()
    });
    
    return { success: true, userId, user: userCredential.user };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error as Error
    };
  }
}

// Function to sign in a user
export async function signInUser(email: string, password: string): Promise<SignInResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { 
      success: true, 
      user: userCredential.user 
    };
  } catch (error) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: error as Error
    };
  }
}

// Helper for Google sign-in
export async function signInWithGoogleAuth() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

// Function to sign out user
export async function signOutUser() {
  try {
    // Clean up all Firestore listeners BEFORE signing out
    // This prevents permission-denied errors when listeners try to read after auth is lost
    const { cleanupAllListeners } = await import('./listener-registry');
    cleanupAllListeners();
    
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error as Error };
  }
}

// Function to listen to subscription status changes
export function listenToSubscriptionStatus(userId: string, callback: (subscriptions: Subscription[]) => void) {
  if (!userId) return null;
  
  const userSubscriptionsRef = collection(db, 'stripe_customers', userId, 'subscriptions');
  
  return onSnapshot(userSubscriptionsRef, (snapshot) => {
    const subscriptions: Subscription[] = [];
    snapshot.forEach((doc) => {
      subscriptions.push({
        id: doc.id,
        ...doc.data()
      } as Subscription);
    });
    callback(subscriptions);
  });
}

// Function to get user's payment methods
export function listenToPaymentMethods(userId: string, callback: (paymentMethods: PaymentMethod[]) => void) {
  if (!userId) return null;
  
  const paymentMethodsRef = collection(db, 'stripe_customers', userId, 'payment_methods');
  
  return onSnapshot(paymentMethodsRef, (snapshot) => {
    const paymentMethods: PaymentMethod[] = [];
    snapshot.forEach((doc) => {
      paymentMethods.push({
        id: doc.id,
        ...doc.data()
      } as PaymentMethod);
    });
    callback(paymentMethods);
  });
}

// PHASE 2: Exercise Library Management Functions

export async function createExercise(exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, 'exercises'), {
      ...exercise,
      // Hybrid model defaults
      scope: exercise.scope || 'personal', // Default to personal
      isActive: true, // All new exercises are active
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      usageCount: 0
    });
    return { success: true, exerciseId: docRef.id };
  } catch (error) {
    console.error('Error creating exercise:', error);
    return { success: false, error: error as Error };
  }
}

export async function updateExercise(exerciseId: string, updates: Partial<Exercise>) {
  try {
    await updateDoc(doc(db, 'exercises', exerciseId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating exercise:', error);
    return { success: false, error: error as Error };
  }
}

export async function checkExerciseUsage(exerciseId: string): Promise<{
  isUsed: boolean;
  usedInWorkouts: number;
  usedInAssignments: number;
}> {
  try {
    // Check if exercise is used in workout templates
    const workoutsQuery = query(
      collection(db, 'workoutTemplates'),
      where('isActive', '==', true)
    );
    const workoutsSnapshot = await getDocs(workoutsQuery);
    
    // Count workouts that contain this exercise
    let workoutsCount = 0;
    workoutsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.exercises && data.exercises.some((ex: any) => ex.id === exerciseId)) {
        workoutsCount++;
      }
    });
    
    // Note: We could also check workoutAssignments if needed in the future
    // For now, checking workout templates is sufficient
    
    return {
      isUsed: workoutsCount > 0,
      usedInWorkouts: workoutsCount,
      usedInAssignments: 0 // Future: check workoutAssignments
    };
  } catch (error) {
    console.error('Error checking exercise usage:', error);
    return { isUsed: false, usedInWorkouts: 0, usedInAssignments: 0 };
  }
}

export async function deactivateExercise(
  exerciseId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get exercise to check ownership
    const exerciseDoc = await getDoc(doc(db, 'exercises', exerciseId));
    if (!exerciseDoc.exists()) {
      return { success: false, error: 'Exercise not found' };
    }
    
    const exercise = exerciseDoc.data();
    
    // Permission check: only creator or admin can deactivate
    if (!isAdmin && exercise.createdBy !== userId) {
      return { success: false, error: 'Permission denied: You can only deactivate your own exercises' };
    }
    
    await updateDoc(doc(db, 'exercises', exerciseId), {
      isActive: false,
      deactivatedAt: serverTimestamp(),
      deactivatedBy: userId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deactivating exercise:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteExercise(
  exerciseId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get exercise to check ownership
    const exerciseDoc = await getDoc(doc(db, 'exercises', exerciseId));
    if (!exerciseDoc.exists()) {
      return { success: false, error: 'Exercise not found' };
    }
    
    const exercise = exerciseDoc.data();
    
    // Permission check: only creator or admin can delete
    if (!isAdmin && exercise.createdBy !== userId) {
      return { success: false, error: 'Permission denied: You can only delete your own exercises' };
    }
    
    // Usage check: prevent deletion if exercise is used
    const usage = await checkExerciseUsage(exerciseId);
    if (usage.isUsed) {
      return {
        success: false,
        error: `Cannot delete: Exercise is used in ${usage.usedInWorkouts} workout template(s). Deactivate instead to hide it from your library.`
      };
    }
    
    // Permanently delete
    await deleteDoc(doc(db, 'exercises', exerciseId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function reactivateExercise(exerciseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'exercises', exerciseId), {
      isActive: true,
      reactivatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error reactivating exercise:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Hybrid Model: Get trainer's personal exercises + all company exercises
// includeInactive: if true, shows both active and inactive exercises
export function listenToExercises(trainerId: string, callback: (exercises: Exercise[]) => void, includeInactive: boolean = false) {
  // We need two queries: personal exercises and company exercises
  // Since Firestore doesn't support OR queries easily, we'll combine results
  
  const personalQuery = includeInactive 
    ? query(
        collection(db, 'exercises'),
        where('createdBy', '==', trainerId),
        where('scope', '==', 'personal'),
        orderBy('name')
      )
    : query(
        collection(db, 'exercises'),
        where('createdBy', '==', trainerId),
        where('scope', '==', 'personal'),
        where('isActive', '==', true),
        orderBy('name')
      );
  
  const companyQuery = includeInactive
    ? query(
        collection(db, 'exercises'),
        where('scope', '==', 'company'),
        orderBy('name')
      )
    : query(
        collection(db, 'exercises'),
        where('scope', '==', 'company'),
        where('isActive', '==', true),
        orderBy('name')
      );
  
  let personalExercises: Exercise[] = [];
  let companyExercises: Exercise[] = [];
  
  const unsubPersonal = onSnapshot(personalQuery, (snapshot) => {
    personalExercises = [];
    snapshot.forEach((doc) => {
      personalExercises.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Exercise);
    });
    // Combine and sort
    const combined = [...personalExercises, ...companyExercises].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    callback(combined);
  });
  
  const unsubCompany = onSnapshot(companyQuery, (snapshot) => {
    companyExercises = [];
    snapshot.forEach((doc) => {
      companyExercises.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Exercise);
    });
    // Combine and sort
    const combined = [...personalExercises, ...companyExercises].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    callback(combined);
  });
  
  // Return combined unsubscribe function
  return () => {
    unsubPersonal();
    unsubCompany();
  };
}

export async function incrementExerciseUsage(exerciseId: string) {
  try {
    const exerciseRef = doc(db, 'exercises', exerciseId);
    await updateDoc(exerciseRef, {
      usageCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing exercise usage:', error);
  }
}

// PHASE 2: Workout Assignment Functions

export async function assignWorkoutToClients(assignment: {
  templateId: string;
  clientIds: string[];
  trainerId: string;
  dueDate: Date;
  notes?: string;
}) {
  try {
    const batch = writeBatch(db);
    const assignments: string[] = [];

    // Increment usage count for the workout template
    const templateRef = doc(db, 'workoutTemplates', assignment.templateId);
    batch.update(templateRef, {
      usageCount: increment(assignment.clientIds.length)
    });

    for (const clientId of assignment.clientIds) {
      const assignmentRef = doc(collection(db, 'workoutAssignments'));
      batch.set(assignmentRef, {
        templateId: assignment.templateId,
        clientId,
        trainerId: assignment.trainerId,
        assignedDate: serverTimestamp(),
        dueDate: Timestamp.fromDate(assignment.dueDate),
        status: 'assigned',
        notes: assignment.notes || '',
        progress: {
          exercisesCompleted: [],
          totalExercises: 0,
          completionPercentage: 0,
          exerciseDetails: [],
          lastUpdatedAt: serverTimestamp()
        }
      });
      assignments.push(assignmentRef.id);
    }

    await batch.commit();
    return { success: true, assignmentIds: assignments };
  } catch (error) {
    console.error('Error assigning workout:', error);
    return { success: false, error: error as Error };
  }
}

export function listenToTrainerAssignments(trainerId: string, callback: (assignments: AssignedWorkout[]) => void) {
  const assignmentsQuery = query(
    collection(db, 'workoutAssignments'),
    where('trainerId', '==', trainerId),
    orderBy('assignedDate', 'desc')
  );
  
  return onSnapshot(assignmentsQuery, (snapshot) => {
    const assignments: AssignedWorkout[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      assignments.push({
        id: doc.id,
        ...data,
        assignedDate: data.assignedDate?.toDate(),
        dueDate: data.dueDate?.toDate(),
        completedAt: data.completedAt?.toDate(),
        progress: {
          ...data.progress,
          lastUpdatedAt: data.progress?.lastUpdatedAt?.toDate()
        }
      } as AssignedWorkout);
    });
    callback(assignments);
  });
}

export function listenToClientAssignments(clientId: string, callback: (assignments: AssignedWorkout[]) => void) {
  const assignmentsQuery = query(
    collection(db, 'workoutAssignments'),
    where('clientId', '==', clientId),
    orderBy('assignedDate', 'desc')
  );
  
  return onSnapshot(assignmentsQuery, (snapshot) => {
    const assignments: AssignedWorkout[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      assignments.push({
        id: doc.id,
        ...data,
        assignedDate: data.assignedDate?.toDate(),
        dueDate: data.dueDate?.toDate(),
        completedAt: data.completedAt?.toDate(),
        progress: {
          ...data.progress,
          lastUpdatedAt: data.progress?.lastUpdatedAt?.toDate()
        }
      } as AssignedWorkout);
    });
    callback(assignments);
  });
}

// PHASE 2: Workout Template Management Functions

// Hybrid Model: Get trainer's personal templates + all company templates
// includeInactive: if true, shows both active and inactive templates
export function listenToWorkoutTemplates(trainerId: string, callback: (templates: any[]) => void, includeInactive: boolean = false) {
  // Query personal templates
  const personalQuery = includeInactive 
    ? query(
        collection(db, 'workoutTemplates'),
        where('createdBy', '==', trainerId),
        where('scope', '==', 'personal'),
        orderBy('createdAt', 'desc')
      )
    : query(
        collection(db, 'workoutTemplates'),
        where('createdBy', '==', trainerId),
        where('scope', '==', 'personal'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
  
  // Query company-wide templates
  const companyQuery = includeInactive
    ? query(
        collection(db, 'workoutTemplates'),
        where('scope', '==', 'company'),
        orderBy('createdAt', 'desc')
      )
    : query(
        collection(db, 'workoutTemplates'),
        where('scope', '==', 'company'),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
  
  let personalTemplates: any[] = [];
  let companyTemplates: any[] = [];
  
  const unsubPersonal = onSnapshot(personalQuery, (snapshot) => {
    personalTemplates = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      personalTemplates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      });
    });
    // Combine and sort by creation date
    const combined = [...personalTemplates, ...companyTemplates].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(combined);
  });
  
  const unsubCompany = onSnapshot(companyQuery, (snapshot) => {
    companyTemplates = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      companyTemplates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      });
    });
    // Combine and sort by creation date
    const combined = [...personalTemplates, ...companyTemplates].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    callback(combined);
  });
  
  // Return combined unsubscribe function
  return () => {
    unsubPersonal();
    unsubCompany();
  };
}

export async function getWorkoutTemplate(templateId: string) {
  try {
    const docRef = doc(db, 'workoutTemplates', templateId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        success: true,
        template: {
          id: docSnap.id,
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate(),
          updatedAt: docSnap.data().updatedAt?.toDate()
        }
      };
    } else {
      return { success: false, error: new Error('Workout template not found') };
    }
  } catch (error) {
    console.error('Error getting workout template:', error);
    return { success: false, error: error as Error };
  }
}

export async function updateWorkoutTemplate(templateId: string, updates: any) {
  try {
    await updateDoc(doc(db, 'workoutTemplates', templateId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating workout template:', error);
    return { success: false, error: error as Error };
  }
}

export async function checkWorkoutUsage(templateId: string): Promise<{
  isUsed: boolean;
  usedInAssignments: number;
  activeAssignments: number;
}> {
  try {
    // Get the workout template to check usageCount
    const templateDoc = await getDoc(doc(db, 'workoutTemplates', templateId));
    if (!templateDoc.exists()) {
      return { isUsed: false, usedInAssignments: 0, activeAssignments: 0 };
    }
    
    const usageCount = templateDoc.data().usageCount || 0;
    
    return {
      isUsed: usageCount > 0,
      usedInAssignments: usageCount,
      activeAssignments: usageCount
    };
  } catch (error) {
    console.error('Error checking workout usage:', error);
    // FAIL-SAFE: If we can't verify usage, assume it's in use to prevent accidental deletion
    // This protects against permission errors, network issues, etc.
    throw new Error('Unable to verify workout usage. Please try again or contact support if this persists.');
  }
}

export async function deactivateWorkoutTemplate(
  templateId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get template to check ownership
    const templateDoc = await getDoc(doc(db, 'workoutTemplates', templateId));
    if (!templateDoc.exists()) {
      return { success: false, error: 'Workout template not found' };
    }
    
    const template = templateDoc.data();
    
    // Permission check: only creator or admin can deactivate
    if (!isAdmin && template.createdBy !== userId) {
      return { success: false, error: 'Permission denied: You can only archive your own workout templates' };
    }
    
    await updateDoc(doc(db, 'workoutTemplates', templateId), {
      isActive: false,
      deactivatedAt: serverTimestamp(),
      deactivatedBy: userId
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error deactivating workout template:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function reactivateWorkoutTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'workoutTemplates', templateId), {
      isActive: true,
      reactivatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error reactivating workout template:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function deleteWorkoutTemplate(
  templateId: string,
  userId?: string,
  isAdmin?: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // If userId provided, check permissions
    if (userId) {
      const templateDoc = await getDoc(doc(db, 'workoutTemplates', templateId));
      if (!templateDoc.exists()) {
        return { success: false, error: 'Workout template not found' };
      }
      
      const template = templateDoc.data();
      
      // Permission check: only creator or admin can delete
      if (!isAdmin && template.createdBy !== userId) {
        return { success: false, error: 'Permission denied: You can only delete your own workout templates' };
      }
    }
    
    // Usage check: prevent deletion if template is actively assigned
    const usage = await checkWorkoutUsage(templateId);
    if (usage.activeAssignments > 0) {
      return {
        success: false,
        error: `Cannot delete: This workout is assigned to ${usage.activeAssignments} client(s). Archive it instead to hide it from your library.`
      };
    }
    
    // Permanently delete
    await deleteDoc(doc(db, 'workoutTemplates', templateId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting workout template:', error);
    return { success: false, error: (error as Error).message };
  }
}

export async function incrementWorkoutUsage(templateId: string) {
  try {
    const templateRef = doc(db, 'workoutTemplates', templateId);
    await updateDoc(templateRef, {
      usageCount: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing workout usage:', error);
  }
}

export async function decrementWorkoutUsage(templateId: string) {
  try {
    const templateRef = doc(db, 'workoutTemplates', templateId);
    await updateDoc(templateRef, {
      usageCount: increment(-1)
    });
  } catch (error) {
    console.error('Error decrementing workout usage:', error);
  }
}

export async function unassignWorkout(assignmentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the assignment to find the templateId
    const assignmentDoc = await getDoc(doc(db, 'workoutAssignments', assignmentId));
    if (!assignmentDoc.exists()) {
      return { success: false, error: 'Assignment not found' };
    }
    
    const templateId = assignmentDoc.data().templateId;
    
    // Delete the assignment and decrement usage count in a batch
    const batch = writeBatch(db);
    batch.delete(doc(db, 'workoutAssignments', assignmentId));
    batch.update(doc(db, 'workoutTemplates', templateId), {
      usageCount: increment(-1)
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error unassigning workout:', error);
    return { success: false, error: (error as Error).message };
  }
}
