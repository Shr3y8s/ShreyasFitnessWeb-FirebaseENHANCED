// src/lib/firebase.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
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

// Function to create a user with tier information
export async function createUserWithTier(email: string, password: string, name: string, phone: string, tier: ServiceTier): Promise<UserCreationResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    await setDoc(doc(db, 'users', userId), {
      name: name,
      email: email,
      phone: phone || null,
      tier: tier,
      role: 'client',
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

// Function to create a trainer/admin user
export async function createTrainerUser(email: string, password: string, name: string, phone: string): Promise<UserCreationResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const userId = userCredential.user.uid;
    
    await setDoc(doc(db, 'users', userId), {
      name: name,
      email: email,
      phone: phone || null,
      role: 'trainer',
      permissions: ['create_workouts', 'manage_clients', 'view_analytics', 'admin_access'],
      createdAt: serverTimestamp()
    });
    
    return { success: true, userId, user: userCredential.user };
  } catch (error) {
    console.error('Error creating trainer user:', error);
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
      isPublic: false, // Default to private for single trainer setup
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

export async function deleteExercise(exerciseId: string) {
  try {
    await deleteDoc(doc(db, 'exercises', exerciseId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting exercise:', error);
    return { success: false, error: error as Error };
  }
}

export function listenToExercises(trainerId: string, callback: (exercises: Exercise[]) => void) {
  const exercisesQuery = query(
    collection(db, 'exercises'),
    where('createdBy', '==', trainerId),
    orderBy('name')
  );
  
  return onSnapshot(exercisesQuery, (snapshot) => {
    const exercises: Exercise[] = [];
    snapshot.forEach((doc) => {
      exercises.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Exercise);
    });
    callback(exercises);
  });
}

export function listenToPublicExercises(callback: (exercises: Exercise[]) => void) {
  const exercisesQuery = query(
    collection(db, 'exercises'),
    where('isPublic', '==', true),
    orderBy('usageCount', 'desc')
  );
  
  return onSnapshot(exercisesQuery, (snapshot) => {
    const exercises: Exercise[] = [];
    snapshot.forEach((doc) => {
      exercises.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate()
      } as Exercise);
    });
    callback(exercises);
  });
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

    for (const clientId of assignment.clientIds) {
      const assignmentRef = doc(collection(db, 'assigned_workouts'));
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
    collection(db, 'assigned_workouts'),
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
    collection(db, 'assigned_workouts'),
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

export function listenToWorkoutTemplates(trainerId: string, callback: (templates: any[]) => void) {
  const templatesQuery = query(
    collection(db, 'workout_templates'),
    where('createdBy', '==', trainerId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(templatesQuery, (snapshot) => {
    const templates: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      templates.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      });
    });
    callback(templates);
  });
}

export async function getWorkoutTemplate(templateId: string) {
  try {
    const docRef = doc(db, 'workout_templates', templateId);
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
    await updateDoc(doc(db, 'workout_templates', templateId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating workout template:', error);
    return { success: false, error: error as Error };
  }
}

export async function deleteWorkoutTemplate(templateId: string) {
  try {
    await deleteDoc(doc(db, 'workout_templates', templateId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting workout template:', error);
    return { success: false, error: error as Error };
  }
}
