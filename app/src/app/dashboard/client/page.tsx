'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { 
  House,
  User, 
  Dumbbell, 
  TrendingUp,
  Calendar, 
  HeartPulse,
  Goal,
  MessageSquare, 
  BookOpen,
  CreditCard,
  Settings,
  Plug,
  Smartphone,
  LogOut,
  ArrowLeft
} from 'lucide-react';

interface ServiceTier {
  id: string;
  name: string;
  price: number;
  features: string[];
}

interface UserData {
  name: string;
  email: string;
  phone?: string;
  tier?: ServiceTier;
  role: string;
  createdAt: Timestamp | Date;
  hideWelcomeDashboard?: boolean;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          setUserData(data as UserData || null);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleBackToWelcome = async () => {
    if (user) {
      try {
        // Reset the welcome screen preference so it shows again
        await setDoc(doc(db, 'users', user.uid), 
          { hideWelcomeDashboard: false }, 
          { merge: true }
        );
        router.push('/dashboard');
      } catch (error) {
        console.error('Error updating user preference:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading your dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Simplified Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">SF</div>
            <span className="font-semibold text-lg">SHREY.FIT</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-6 overflow-auto">
          {/* General Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">General</p>
            <Link href="/">
              <button className="w-full flex items-center gap-2 p-2 bg-primary text-white rounded-md font-medium text-sm">
                <House className="w-4 h-4" />
                Dashboard
              </button>
            </Link>
          </div>
          
          {/* Tracking Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Tracking</p>
            <div className="space-y-1">
              <Link href="/workouts">
                <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 text-sm">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    My Workouts
                  </div>
                  <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">2</span>
                </button>
              </Link>
              
              <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Progress & Analytics
                </div>
                <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">1</span>
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <Calendar className="w-4 h-4" />
                Sessions & Schedule
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <HeartPulse className="w-4 h-4" />
                Nutrition Hub
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <Goal className="w-4 h-4" />
                Goals & Milestones
              </button>
            </div>
          </div>

          {/* Support Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Support</p>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <MessageSquare className="w-4 h-4" />
                Communication
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <BookOpen className="w-4 h-4" />
                Resources
              </button>
            </div>
          </div>

          {/* Account Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Account</p>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <User className="w-4 h-4" />
                Profile
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <CreditCard className="w-4 h-4" />
                Billing
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              
              <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 text-sm">
                <div className="flex items-center gap-2">
                  <Plug className="w-4 h-4" />
                  Integrations
                </div>
                <span className="border border-primary/50 text-primary text-xs px-2 py-0.5 rounded-full">Coming Soon</span>
              </button>
              
              <button className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100 text-sm">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Mobile App
                </div>
                <span className="border border-primary/50 text-primary text-xs px-2 py-0.5 rounded-full">Coming Soon</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0">SA</div>
              <div>
                <p className="font-semibold">{userData?.name || 'Shreyas Annapureddy'}</p>
                <p className="text-sm text-primary font-semibold">in-person-training</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <LogOut className="w-5 h-5 text-primary" />
            </button>
          </div>
          
          {/* Back to Welcome Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToWelcome}
            className="w-full justify-start mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Welcome
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <header>
            <h1 className="text-3xl font-bold text-stone-900 mb-2">
              Welcome back{userData?.name ? `, ${userData.name}` : ''}!
            </h1>
            <p className="text-stone-600">
              Your personalized fitness dashboard is being prepared by your coach.
            </p>
          </header>

          {/* Content Area - Ready for components */}
          <div className="min-h-[400px] flex items-center justify-center">
            <div className="text-center text-stone-500">
              <p className="text-lg">Ready for dashboard components</p>
              <p className="text-sm mt-2">Add your components here one by one</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
