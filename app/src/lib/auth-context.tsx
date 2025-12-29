'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
    if (!user) return;

    try {
      // Multi-collection waterfall lookup: admin → trainer → client
      
      // 1. Check admins collection first
      const adminDocRef = doc(db, 'admins', user.uid);
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
      const trainerDocRef = doc(db, 'trainers', user.uid);
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
      const userDocRef = doc(db, 'users', user.uid);
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
    const sessionKey = `login_tracked_${user?.uid}`;
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const wasLoggedOut = !user;
      setUser(user);
      
      if (user) {
        // Track login if this is a new session
        // Use sessionStorage to prevent tracking on page refreshes
        const hasTrackedThisSession = sessionStorage.getItem(sessionKey);
        
        if (!hasTrackedThisSession) {
          // Track the login asynchronously (don't block auth flow)
          trackSuccessfulLogin().catch(error => {
            console.error('Login tracking failed:', error);
          });
          
          // Mark as tracked for this session
          sessionStorage.setItem(sessionKey, 'true');
        }
        try {
          // Multi-collection waterfall lookup: admin → trainer → client
          
          // 1. Check admins collection first
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDoc = await getDoc(adminDocRef);
          
          if (adminDoc.exists()) {
            const adminData = adminDoc.data();
            setUserData({
              ...adminData,
              userType: 'admin',
              sourceCollection: 'admins',
              role: adminData.role || 'admin'
            } as UserData);
            setLoading(false);
            return;
          }
          
          // 2. Check trainers collection
          const trainerDocRef = doc(db, 'trainers', user.uid);
          const trainerDoc = await getDoc(trainerDocRef);
          
          if (trainerDoc.exists()) {
            const trainerData = trainerDoc.data();
            setUserData({
              ...trainerData,
              userType: 'trainer',
              sourceCollection: 'trainers',
              role: 'trainer'
            } as UserData);
            setLoading(false);
            return;
          }
          
          // 3. Check users collection (clients)
          const userDocRef = doc(db, 'users', user.uid);
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
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        // Clear tracking flag when user logs out
        if (sessionKey) {
          sessionStorage.removeItem(sessionKey);
        }
        setUserData(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
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
