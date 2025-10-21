'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  LucideIcon
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
      {/* Sidebar */}
      <div data-sidebar="sidebar" className="flex h-full w-64 flex-col bg-white shadow-lg fixed inset-y-0 left-0 z-50">
        <div data-sidebar="content" className="min-h-0 flex-1 gap-2 overflow-auto flex flex-col">
          {/* Header */}
          <div data-sidebar="header" className="flex flex-col gap-2 p-2">
            <div className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                  SF
                </span>
              </span>
              <span className="font-semibold text-lg">SHREY.FIT</span>
            </div>
          </div>

          {/* Navigation Menu */}
          <ul data-sidebar="menu" className="flex w-full min-w-0 flex-col gap-1 flex-1">
            
            {/* General Section */}
            <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
              <div data-sidebar="group-label" className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2">
                General
              </div>
              <li data-sidebar="menu-item" className="group/menu-item relative">
                <Link href="/">
                  <button data-sidebar="menu-button" data-size="default" data-active="true" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house">
                      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
                      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    Dashboard
                  </button>
                </Link>
              </li>
            </div>

            {/* Tracking Section */}
            <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
              <div data-sidebar="group-label" className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2">
                Tracking
              </div>
              
              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Dumbbell className="h-4 w-4" />
                  My Workouts
                  <div data-sidebar="menu-badge" className="ml-auto min-w-5 rounded-full font-medium tabular-nums select-none pointer-events-none border-transparent bg-sidebar-primary text-sidebar-primary-foreground flex h-5 w-5 items-center justify-center p-0 text-xs">
                    2
                  </div>
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Progress & Analytics
                  <div data-sidebar="menu-badge" className="ml-auto min-w-5 rounded-full font-medium tabular-nums select-none pointer-events-none border-transparent bg-sidebar-primary text-sidebar-primary-foreground flex h-5 w-5 items-center justify-center p-0 text-xs">
                    1
                  </div>
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Calendar className="h-4 w-4" />
                  Sessions & Schedule
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <HeartPulse className="h-4 w-4" />
                  Nutrition Hub
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Goal className="h-4 w-4" />
                  Goals & Milestones
                </button>
              </li>
            </div>

            {/* Support Section */}
            <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
              <div data-sidebar="group-label" className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2">
                Support
              </div>
              
              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <MessageSquare className="h-4 w-4" />
                  Communication
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <BookOpen className="h-4 w-4" />
                  Resources
                </button>
              </li>
            </div>

            {/* Account Section */}
            <div data-sidebar="group" className="relative flex w-full min-w-0 flex-col p-2">
              <div data-sidebar="group-label" className="duration-200 flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opa] ease-linear focus-visible:ring-2">
                Account
              </div>
              
              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <User className="h-4 w-4" />
                  Profile
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <CreditCard className="h-4 w-4" />
                  Billing
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Plug className="h-4 w-4" />
                  Integrations
                  <div data-sidebar="menu-badge" className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums select-none pointer-events-none border border-primary/50 text-primary">
                    Coming Soon
                  </div>
                </button>
              </li>

              <li data-sidebar="menu-item" className="group/menu-item relative">
                <button data-sidebar="menu-button" data-size="default" data-active="false" className="peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left outline-none ring-sidebar-ring transition-[width,height,padding] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-primary data-[active=true]:font-medium data-[active=true]:text-sidebar-primary-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground h-8 text-sm">
                  <Smartphone className="h-4 w-4" />
                  Mobile App
                  <div data-sidebar="menu-badge" className="ml-auto h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-medium tabular-nums select-none pointer-events-none border border-primary/50 text-primary">
                    Coming Soon
                  </div>
                </button>
              </li>
            </div>

          </ul>

          {/* Footer */}
          <div data-sidebar="footer" className="flex flex-col gap-2 p-2">
            <div className="shrink-0 h-[1px] w-full my-2 bg-sidebar-border"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
                    SA
                  </span>
                </span>
                <div>
                  <p className="font-semibold">{userData?.name || 'Shreyas Annapureddy'}</p>
                  <p className="text-sm font-semibold text-primary">in-person-training</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 w-10 text-primary hover:bg-primary/10 hover:text-primary"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            
            {/* Back to Welcome Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleBackToWelcome}
              className="w-full justify-start mt-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Welcome
            </Button>
          </div>
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
