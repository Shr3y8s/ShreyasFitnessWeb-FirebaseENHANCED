'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Type definitions
interface UserData {
  name: string;
  email: string;
  role: 'client' | 'trainer' | 'admin';
  phone?: string | null;
  accountActivated?: boolean;
  emailVerified?: boolean;
  
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
  
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  updateUserData: (updates: Partial<UserData>) => void;
  refreshUserData: () => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  updateUserData: () => {},
  refreshUserData: async () => {}
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
      // Check admins collection first
      const adminDocRef = doc(db, 'admins', user.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        setUserData(adminDoc.data() as UserData);
        return;
      }
      
      // If not admin, check users collection
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      } else {
        setUserData(null);
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        try {
          // Check admins collection first
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDoc = await getDoc(adminDocRef);
          
          if (adminDoc.exists()) {
            setUserData(adminDoc.data() as UserData);
            setLoading(false);
            return;
          }
          
          // If not admin, check users collection
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            setUserData(userDoc.data() as UserData);
          } else {
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, updateUserData, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
