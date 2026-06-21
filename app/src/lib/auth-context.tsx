'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import { trackSuccessfulLogin } from './login-tracking-api';

// Type definitions
interface UserData {
  name: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
  phone?: string | null;
  accountActivated?: boolean;
  emailVerified?: boolean;
  
  // Multi-collection architecture support
  userType?: 'admin' | 'trainer' | 'client';  // NEW: Identifies which collection user is from
  sourceCollection?: 'admins' | 'trainers' | 'users';  // NEW: Source Firestore collection
  canTrain?: boolean;  // NEW: For admin - whether they personally train clients
  
  // Profile photo fields (for both clients and trainers)
  profilePhotoSmall?: string | null;   // 150x150px
  profilePhotoLarge?: string | null;   // 500x500px
  
  // Trainer-specific profile fields (Education)
  educationDegree?: string | null;
  educationMajor?: string | null;
  educationMinor?: string | null;
  educationInstitution?: string | null;
  
  // Certifications
  fitnessCertifications?: string | null;
  nutritionCertifications?: string | null;
  specialtyCertifications?: string | null;
  
  // Certification Verification URLs
  fitnessCertificationUrls?: string[];
  nutritionCertificationUrls?: string[];
  specialtyCertificationUrls?: string[];
  
  // Social Media
  linkedinUrl?: string | null;
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  
  // Experience
  yearsExperience?: number | null;
  specializations?: string | null;  // Changed from string[] to string
  
  // Philosophy
  trainingPhilosophy?: string | null;
  areasOfExpertise?: string | null;
  
  // Legacy fields (for migration)
  bio?: string | null;
  professionalTitle?: string | null;
  
  // For clients - assigned trainer info
  assignedTrainerId?: string;
  assignedTrainerName?: string;
  assignedTrainerCollection?: 'admins' | 'trainers';  // NEW: Which collection the trainer is in
  
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  updateUserData: (updates: Partial<UserData>) => void;
  refreshUserData: () => Promise<void>;
  canAccessAdminDashboard: boolean;
  canAccessTrainerDashboard: boolean;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  updateUserData: () => {},
  refreshUserData: async () => {},
  canAccessAdminDashboard: false,
  canAccessTrainerDashboard: false,
});

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to update userData in context after database changes
  const updateUserData = (updates: Partial<UserData>) => {
    setUserData(prevData => prevData ? { ...prevData, ...updates } : null);
  };

  // Function to refresh userData from database
  const refreshUserData = async () => {
    // Check current auth state (not closure 'user' which may be stale)
    if (!auth.currentUser) {
      console.log('[AuthContext] No current user, skipping refresh');
      return;
    }

    const uid = auth.currentUser.uid;

    try {
      // Multi-collection waterfall lookup: admin → trainer → client
      
      // 1. Check admins collection first
      const adminDocRef = doc(db, 'admins', uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        setUserData({
          ...adminData,
          userType: 'admin',
          sourceCollection: 'admins',
          role: adminData.role || 'admin'
        } as UserData);
        return;
      }
      
      // 2. Check trainers collection
      const trainerDocRef = doc(db, 'trainers', uid);
      const trainerDoc = await getDoc(trainerDocRef);
      
      if (trainerDoc.exists()) {
        const trainerData = trainerDoc.data();
        setUserData({
          ...trainerData,
          userType: 'trainer',
          sourceCollection: 'trainers',
          role: 'trainer'
        } as UserData);
        return;
      }
      
      // 3. Check users collection (clients)
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const clientData = userDoc.data();
        setUserData({
          ...clientData,
          userType: 'client',
          sourceCollection: 'users',
          role: clientData.role || 'client'
        } as UserData);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Track if this is a new login session (not a page refresh)
    let firestoreUnsubscribe: (() => void) | null = null;
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (authUser) {
        const sessionKey = `login_tracked_${authUser.uid}`;
        
        // Track login if this is a new session
        const hasTrackedThisSession = sessionStorage.getItem(sessionKey);
        
        if (!hasTrackedThisSession) {
          trackSuccessfulLogin().catch(error => {
            console.error('Login tracking failed:', error);
          });
          sessionStorage.setItem(sessionKey, 'true');
        }
        
        try {
          // Initial fetch to determine user type
          let userType: 'admin' | 'trainer' | 'client' | null = null;
          let sourceCollection: 'admins' | 'trainers' | 'users' | null = null;
          
          // 1. Check admins collection
          const adminDoc = await getDoc(doc(db, 'admins', authUser.uid));
          if (adminDoc.exists()) {
            userType = 'admin';
            sourceCollection = 'admins';
          } else {
            // 2. Check trainers collection
            const trainerDoc = await getDoc(doc(db, 'trainers', authUser.uid));
            if (trainerDoc.exists()) {
              userType = 'trainer';
              sourceCollection = 'trainers';
            } else {
              // 3. Check users collection (clients)
              const userDoc = await getDoc(doc(db, 'users', authUser.uid));
              if (userDoc.exists()) {
                userType = 'client';
                sourceCollection = 'users';
              }
            }
          }
          
          if (sourceCollection) {
            // Setup real-time listener for this user's document.
            // On a fresh signup the account is created → onAuthStateChanged fires →
            // this listener attaches before the new ID token has propagated to the
            // Firestore Listen channel, so the first listen can be briefly denied
            // (permission-denied). We self-heal: force a token refresh and re-attach
            // a few times before surfacing the error. Capped so a genuine permission
            // error still logs (and never loops).
            const attachUserListener = (attempt = 0) => {
              firestoreUnsubscribe = onSnapshot(
                doc(db, sourceCollection!, authUser.uid),
                (snapshot) => {
                  if (snapshot.exists()) {
                    const data = snapshot.data();
                    setUserData({
                      ...data,
                      userType,
                      sourceCollection,
                      role: data.role || userType
                    } as UserData);
                  }
                  // Set loading false after first data fetch
                  setLoading(false);
                },
                (error) => {
                  if ((error as { code?: string })?.code === 'permission-denied' && attempt < 3) {
                    // Token race on fresh signup — refresh token, then re-attach.
                    authUser
                      .getIdToken(true)
                      .catch(() => { /* ignore; retry will still re-attach */ })
                      .finally(() => {
                        setTimeout(() => attachUserListener(attempt + 1), 300 * (attempt + 1));
                      });
                    return;
                  }
                  console.error('[AuthContext] Firestore listener error:', error);
                }
              );
            };
            attachUserListener();
          } else {

            setUserData(null);
            setLoading(false);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        // User logged out - cleanup Firestore listener first
        if (firestoreUnsubscribe) {
          firestoreUnsubscribe();
          firestoreUnsubscribe = null;
        }
        
        // Clear session tracking
        const allKeys = Object.keys(sessionStorage);
        allKeys.forEach(key => {
          if (key.startsWith('login_tracked_')) {
            sessionStorage.removeItem(key);
          }
        });
        
        setUserData(null);
        setLoading(false);
      }
    });

    // Cleanup auth subscription
    return () => {
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      unsubscribe();
    };
  }, []);

  // Compute permission flags
  const canAccessAdminDashboard = userData?.role === 'admin';
  const canAccessTrainerDashboard = 
    userData?.role === 'trainer' || 
    (userData?.role === 'admin' && userData?.canTrain === true);

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      updateUserData, 
      refreshUserData,
      canAccessAdminDashboard,
      canAccessTrainerDashboard,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
