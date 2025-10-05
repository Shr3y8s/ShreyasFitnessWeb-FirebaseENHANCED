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
  setDoc, 
  collection,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

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
