// src/firebase-config.js

// Use modern modular Firebase SDK - imports first
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

// Hardcoded Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADF9yuram-pvlzjg6kBtdCk7LuK0M65tk",
  authDomain: "shreyfitweb.firebaseapp.com",
  projectId: "shreyfitweb",
  storageBucket: "shreyfitweb.firebasestorage.app",
  messagingSenderId: "1076359633281",
  appId: "1:1076359633281:web:3687e1675c9e185f0ab080",
  measurementId: "G-5GBP19SXBW"
};

// Initialize Firebase for React components - proper initialization pattern
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp(); // Use existing app instance
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Function to create a user with tier information (modern approach)
export async function createUserWithTier(email, password, name, phone, tier) {
  try {
    // Use modern Firebase SDK
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
      error: error
    };
  }
}

// Function to sign in a user (modern approach)
export async function signInUser(email, password) {
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
      error: error
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

// Function to listen to subscription status changes
export function listenToSubscriptionStatus(userId, callback) {
  if (!userId) return null;
  
  // Note the collection path uses stripe_customers per Invertase extension
  const userSubscriptionsRef = collection(db, 'stripe_customers', userId, 'subscriptions');
  
  return onSnapshot(userSubscriptionsRef, (snapshot) => {
    const subscriptions = [];
    snapshot.forEach((doc) => {
      subscriptions.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(subscriptions);
  });
}

// Function to get user's payment methods
export function listenToPaymentMethods(userId, callback) {
  if (!userId) return null;
  
  // Note the collection path uses stripe_customers per Invertase extension
  const paymentMethodsRef = collection(db, 'stripe_customers', userId, 'payment_methods');
  
  return onSnapshot(paymentMethodsRef, (snapshot) => {
    const paymentMethods = [];
    snapshot.forEach((doc) => {
      paymentMethods.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(paymentMethods);
  });
}
