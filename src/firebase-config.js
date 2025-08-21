// src/firebase-config.js

// Your Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyADF9yuram-pvlzjg6kBtdCk7LuK0M65tk",
  authDomain: "shreyfitweb.firebaseapp.com",
  projectId: "shreyfitweb",
  storageBucket: "shreyfitweb.firebasestorage.app",
  messagingSenderId: "1076359633281",
  appId: "1:1076359633281:web:3687e1675c9e185f0ab080",
  measurementId: "G-5GBP19SXBW"
};

// Use modern modular Firebase SDK
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

// Initialize Firebase for React components
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  // Handle the duplicate app initialization
  if (error.code === 'app/duplicate-app') {
    console.info('Firebase already initialized, using existing instance');
    app = initializeApp(undefined, 'default');
  } else {
    console.error("Firebase initialization error:", error);
  }
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
