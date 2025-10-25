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
  ArrowLeft,
  Sun,
  Moon
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
  
  // Interactive state management
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [checklistItems, setChecklistItems] = useState({
    workout: false,
    steps: false,
    nutrition: false,
    weight: false,
    checkin: false
  });
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');
  
  // Mock chart data for 6-month weight progress
  const chartData = [
    { month: 'Jan', weight: 195 },
    { month: 'Feb', weight: 197 },
    { month: 'Mar', weight: 198 },
    { month: 'Apr', weight: 201 },
    { month: 'May', weight: 206 },
    { month: 'Jun', weight: 193 }
  ];

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

  // Interactive handlers
  const toggleChecklistItem = (item: keyof typeof checklistItems) => {
    setChecklistItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const checklistProgress = () => {
    const completed = Object.values(checklistItems).filter(Boolean).length;
    const total = Object.keys(checklistItems).length;
    return Math.round((completed / total) * 100);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In a full implementation, this would toggle CSS classes on the root element
    document.documentElement.classList.toggle('dark');
  };

  // Button click handlers
  const handleScheduleConsultation = () => {
    console.log('Schedule Consultation clicked');
    alert('Scheduling feature coming soon!');
  };

  const handleLogMeal = () => {
    console.log('Log Meal clicked');
    alert('Meal logging feature coming soon!');
  };

  const handleAddWater = () => {
    console.log('Add Water clicked');
    alert('Water tracking feature coming soon!');
  };

  const handleScheduleWeeklyCheckin = () => {
    console.log('Schedule Weekly Check-in clicked');
    alert('Weekly check-in scheduling coming soon!');
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
          {/* Dashboard Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Good afternoon, <span className="text-primary transition-all duration-300 hover:drop-shadow-[0_0_8px_hsl(var(--primary))] hover:-translate-y-1 inline-block">{userData?.name || 'Alex'}</span>
                </h1>
                <p className="text-muted-foreground mt-2">Ready to crush your goals today? Let&apos;s get started.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="text-primary hover:bg-primary/10 hover:text-primary border-primary/50"
              >
                {isDarkMode ? (
                  <Moon className="h-[1.2rem] w-[1.2rem] transition-all" />
                ) : (
                  <Sun className="h-[1.2rem] w-[1.2rem] transition-all" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="relative text-primary hover:bg-primary/10 hover:text-primary border-primary/50 animate-pulse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell h-5 w-5">
                  <path d="M10.268 21a2 2 0 0 0 3.464 0"></path>
                  <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
                </svg>
                <div className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <span className="sr-only">Open notifications</span>
              </Button>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="space-y-6">
            {/* Top Row - 2 cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upcoming Session Card */}
              <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                <div className="rounded-xl border text-card-foreground shadow-sm bg-primary/10 border-primary/50 flex flex-col hover:shadow-lg">
                  <div className="flex p-6 flex-row gap-4 items-center">
                    <div className="p-3 bg-primary/20 rounded-full">
                      <Calendar className="text-primary w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold leading-none tracking-tight">Upcoming In-Person Session</h3>
                      <p className="text-sm text-muted-foreground mt-1">Don&apos;t forget your next session is just around the corner.</p>
                    </div>
                  </div>
                  <div className="p-6 pt-0 space-y-4 pl-20 pb-4 flex-1 flex flex-col justify-center">
                    <div className="space-y-2">
                      <p className="font-bold text-lg">In-Person Strength Training</p>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Tomorrow, August 15th at 9:00 AM</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin h-4 w-4">
                          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                          <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        <span>City Gym, 123 Fitness St.</span>
                      </div>
                    </div>
                    <div className="h-[1px] w-full my-2 bg-primary/30"></div>
                    <div className="space-y-2">
                      <h4 className="font-semibold flex items-center gap-2 text-sm text-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info h-4 w-4">
                          <circle cx="12" cy="12" r="10"></circle>
                          <path d="M12 16v-4"></path>
                          <path d="M12 8h.01"></path>
                        </svg>
                        Don&apos;t Forget
                      </h4>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>Water bottle to stay hydrated</li>
                        <li>Towel for your workout</li>
                        <li>Proper workout shoes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Welcome/Consultation Card */}
              <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                <div className="rounded-xl border text-card-foreground shadow-sm relative bg-primary/10 border-primary/50 hover:shadow-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:bg-primary/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4">
                      <path d="M18 6 6 18"></path>
                      <path d="m6 6 12 12"></path>
                    </svg>
                    <span className="sr-only">Dismiss</span>
                  </Button>
                  <div className="flex p-6 flex-row gap-4 items-start pb-4">
                    <div className="bg-primary/10 p-3 rounded-full mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-list w-6 h-6 text-primary">
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                        <path d="M12 11h4"></path>
                        <path d="M12 16h4"></path>
                        <path d="M8 11h.01"></path>
                        <path d="M8 16h.01"></path>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold leading-none tracking-tight">Welcome to Your Fitness Journey!</h3>
                      <p className="text-sm text-muted-foreground mt-1">The next step is to schedule your 30-minute planning consultation. During this session, we&apos;ll create your personalized fitness plan and set you up for success.</p>
                      <Button 
                        onClick={handleScheduleConsultation}
                        className="mt-4 transition-transform hover:-translate-y-1 hover:shadow-lg"
                      >
                        Schedule Your Consultation
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-2 h-4 w-4">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </Button>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-sm border border-primary"></div>
                        <label className="text-sm font-medium cursor-pointer">Schedule your 30-minute planning consultation</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-sm border border-primary"></div>
                        <label className="text-sm font-medium cursor-pointer">Complete your consultation</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-sm border border-primary"></div>
                        <label className="text-sm font-medium cursor-pointer">Receive your personalized fitness plan</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Second Row - Key Metrics & Current Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* Key Metrics Overview */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Key Metrics Overview
                      </h3>
                      <p className="text-sm text-muted-foreground">A snapshot of your progress over time.</p>
                    </div>
                    <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
                        <div className="mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scale h-6 w-6 text-primary">
                            <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                            <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                            <path d="M7 21h10"></path>
                            <path d="M12 3v18"></path>
                            <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Weight Change</p>
                        <p className="text-2xl font-bold">-2 lbs</p>
                      </div>
                      <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
                        <div className="mb-2">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Strength Gain</p>
                        <p className="text-2xl font-bold">+15%</p>
                      </div>
                      <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
                        <div className="mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-percent h-6 w-6 text-primary">
                            <line x1="19" x2="5" y1="5" y2="19"></line>
                            <circle cx="6.5" cy="6.5" r="2.5"></circle>
                            <circle cx="17.5" cy="17.5" r="2.5"></circle>
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">Body Fat</p>
                        <p className="text-2xl font-bold">-1.5%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Plan */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <div className="flex items-center gap-3">
                        <Goal className="w-6 h-6 text-primary" />
                        <h3 className="text-xl font-semibold leading-none tracking-tight">Current Plan: Hypertrophy Phase</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Your focus for the next 4 weeks is building muscle mass.</p>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center p-4 bg-secondary/50 rounded-lg border border-primary/50">
                        <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
                          <div className="text-primary">
                            <Calendar className="h-5 w-5" />
                          </div>
                          <p className="text-sm text-muted-foreground">Duration</p>
                          <p className="font-semibold text-lg">12 Weeks</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
                          <div className="text-primary">
                            <Dumbbell className="h-5 w-5" />
                          </div>
                          <p className="text-sm text-muted-foreground">Focus</p>
                          <p className="font-semibold text-lg">Strength</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-repeat h-5 w-5">
                              <path d="m17 2 4 4-4 4"></path>
                              <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                              <path d="m7 22-4-4 4-4"></path>
                              <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
                            </svg>
                          </div>
                          <p className="text-sm text-muted-foreground">Frequency</p>
                          <p className="font-semibold text-lg">4/week</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
                          <div className="text-primary">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <p className="text-sm text-muted-foreground">Volume</p>
                          <p className="font-semibold text-lg">High</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-start gap-4">
                        <div className="w-full">
                          <div className="flex justify-between w-full text-sm mb-1">
                            <span>Progress</span>
                            <span className="font-semibold">Week 8 of 12</span>
                          </div>
                          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div className="h-full bg-primary transition-all" style={{width: "66%"}}></div>
                          </div>
                        </div>
                        <Button variant="link" className="text-primary font-semibold self-end p-0">
                          View Full Plan 
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right ml-2 h-4 w-4">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-activity w-6 h-6 text-primary">
                          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
                        </svg>
                        <h3 className="text-xl font-semibold leading-none tracking-tight">Progress Overview</h3>
                      </div>
                      <p className="text-sm text-muted-foreground">Your body composition changes over the last 6 months.</p>
                    </div>
                    <div className="p-6 pt-0">
                      <div className="w-full h-[300px] rounded-lg border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartData}
                            margin={{
                              top: 20,
                              right: 30,
                              left: 20,
                              bottom: 20,
                            }}
                          >
                            <defs>
                              <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--primary))" opacity={0.2} />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                              domain={['dataMin - 5', 'dataMax + 5']}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--primary))',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                              }}
                              labelStyle={{ 
                                color: 'hsl(var(--foreground))',
                                fontWeight: 'bold'
                              }}
                              formatter={(value: number, name: string) => [
                                `${value} lbs`,
                                'Weight'
                              ]}
                              labelFormatter={(label) => `${label} 2024`}
                            />
                            <Area
                              type="monotone"
                              dataKey="weight"
                              stroke="hsl(var(--primary))"
                              strokeWidth={3}
                              fill="url(#weightGradient)"
                              dot={{ 
                                fill: 'hsl(var(--primary))', 
                                strokeWidth: 2, 
                                stroke: 'hsl(var(--background))',
                                r: 4
                              }}
                              activeDot={{ 
                                r: 6, 
                                fill: 'hsl(var(--primary))',
                                stroke: 'hsl(var(--background))',
                                strokeWidth: 2,
                                style: { 
                                  filter: 'drop-shadow(0 2px 4px rgb(0 0 0 / 0.1))',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                }
                              }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workout Calendar */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight">Workout Calendar</h3>
                    </div>
                    <div className="p-6 pt-0">
                      {/* Tab Navigation */}
                      <div className="grid grid-cols-2 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4">
                        <button 
                          onClick={() => setActiveTab('upcoming')}
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                            activeTab === 'upcoming' 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          Upcoming
                        </button>
                        <button 
                          onClick={() => setActiveTab('completed')}
                          className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
                            activeTab === 'completed' 
                              ? 'bg-primary text-primary-foreground shadow-sm' 
                              : 'hover:bg-primary/10'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check-big mr-2 h-4 w-4">
                            <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                            <path d="m9 11 3 3L22 4"></path>
                          </svg>
                          Completed
                        </button>
                      </div>
                      
                      {/* Workout List */}
                      <ul className="space-y-3">
                        {activeTab === 'upcoming' ? (
                          <>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5">
                              <div>
                                <p className="font-semibold">Full Body Strength</p>
                                <p className="text-sm text-muted-foreground">2024-08-15 at 09:00 AM</p>
                              </div>
                              <Button variant="ghost" size="icon" className="text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis h-4 w-4">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="19" cy="12" r="1"></circle>
                                  <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                              </Button>
                            </li>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5">
                              <div>
                                <p className="font-semibold">Cardio & Core</p>
                                <p className="text-sm text-muted-foreground">2024-08-17 at 10:00 AM</p>
                              </div>
                              <Button variant="ghost" size="icon" className="text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis h-4 w-4">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="19" cy="12" r="1"></circle>
                                  <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                              </Button>
                            </li>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5">
                              <div>
                                <p className="font-semibold">Upper Body Focus</p>
                                <p className="text-sm text-muted-foreground">2024-08-19 at 09:00 AM</p>
                              </div>
                              <Button variant="ghost" size="icon" className="text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis h-4 w-4">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="19" cy="12" r="1"></circle>
                                  <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                              </Button>
                            </li>
                          </>
                        ) : (
                          <>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-green-500/10 to-green-500/5 opacity-75">
                              <div>
                                <p className="font-semibold flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                                    <path d="m9 11 3 3L22 4"></path>
                                  </svg>
                                  Lower Body Power
                                </p>
                                <p className="text-sm text-muted-foreground">2024-08-12 at 09:00 AM</p>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Completed</span>
                            </li>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-green-500/10 to-green-500/5 opacity-75">
                              <div>
                                <p className="font-semibold flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                                    <path d="m9 11 3 3L22 4"></path>
                                  </svg>
                                  HIIT Cardio Session
                                </p>
                                <p className="text-sm text-muted-foreground">2024-08-10 at 06:00 AM</p>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Completed</span>
                            </li>
                            <li className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-green-500/10 to-green-500/5 opacity-75">
                              <div>
                                <p className="font-semibold flex items-center gap-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                                    <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                                    <path d="m9 11 3 3L22 4"></path>
                                  </svg>
                                  Push Day Workout
                                </p>
                                <p className="text-sm text-muted-foreground">2024-08-08 at 07:30 AM</p>
                              </div>
                              <span className="text-sm text-green-600 font-medium">Completed</span>
                            </li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                {/* Account Summary */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border text-card-foreground shadow-sm bg-secondary/30 flex flex-col h-full hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Account Summary
                      </h3>
                    </div>
                    <div className="p-6 pt-0 flex-1 flex items-center justify-around">
                      <div className="grid grid-cols-3 gap-4 text-center w-full">
                        <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check-big h-5 w-5 text-primary">
                              <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                              <path d="m9 11 3 3L22 4"></path>
                            </svg>
                          </div>
                          <p className="font-bold text-2xl">12</p>
                          <p className="text-xs text-muted-foreground">Sessions Completed</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
                          <div className="text-primary">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <p className="font-bold text-2xl">8</p>
                          <p className="text-xs text-muted-foreground">Weeks Active</p>
                        </div>
                        <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
                          <div className="text-primary">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <p className="font-bold text-2xl">Aug 28</p>
                          <p className="text-xs text-muted-foreground">Next Payment</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Coach's Note */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border text-card-foreground shadow-sm bg-primary/5 border-primary/50 hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                            <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">S</div>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold leading-none tracking-tight">A Note From Shreyas</h3>
                            <p className="text-sm text-muted-foreground">Your weekly check-in & motivation</p>
                          </div>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pin h-5 w-5 text-primary/50">
                          <path d="M12 17v5"></path>
                          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"></path>
                        </svg>
                      </div>
                    </div>
                    <div className="p-6 pt-0">
                      <p className="text-sm italic text-foreground/90">&quot;Amazing job on your last deadlift session, {userData?.name || 'Alex'}! Your form is looking solid. Let&apos;s focus on adding a bit more weight next week. Keep up the fantastic work!&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Weekly Check-in */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-check text-primary">
                          <path d="M8 2v4"></path>
                          <path d="M16 2v4"></path>
                          <rect width="18" height="18" x="3" y="4" rx="2"></rect>
                          <path d="M3 10h18"></path>
                          <path d="m9 16 2 2 4-4"></path>
                        </svg>
                        Weekly Check-in
                      </h3>
                      <p className="text-sm text-muted-foreground">Discuss progress and adjust your plan.</p>
                    </div>
                    <div className="flex items-center p-6 pt-0">
                      <Button 
                        onClick={handleScheduleWeeklyCheckin}
                        className="w-full transition-transform hover:-translate-y-1 hover:shadow-lg"
                      >
                        Schedule Now
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Daily Checklist */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list-todo text-primary">
                          <rect x="3" y="5" width="6" height="6" rx="1"></rect>
                          <path d="m3 17 2 2 4-4"></path>
                          <path d="M13 6h8"></path>
                          <path d="M13 12h8"></path>
                          <path d="M13 18h8"></path>
                        </svg>
                        Daily Checklist
                      </h3>
                      <p className="text-sm text-muted-foreground">Stay on track with your daily and weekly goals.</p>
                    </div>
                    <div className="p-6 pt-0 space-y-4">
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
                          <div className="text-primary">
                            <Dumbbell className="h-5 w-5" />
                          </div>
                          <span className="flex-1 text-sm font-medium transition-colors">Complete today&apos;s workout</span>
                          <input
                            type="checkbox"
                            checked={checklistItems.workout}
                            onChange={() => toggleChecklistItem('workout')}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                          />
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-footprints h-5 w-5">
                              <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"></path>
                              <path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"></path>
                              <path d="M16 17h4"></path>
                              <path d="M4 13h4"></path>
                            </svg>
                          </div>
                          <span className="flex-1 text-sm font-medium transition-colors">Hit 8k-10k steps</span>
                          <input
                            type="checkbox"
                            checked={checklistItems.steps}
                            onChange={() => toggleChecklistItem('steps')}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                          />
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-salad h-5 w-5">
                              <path d="M7 21h10"></path>
                              <path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"></path>
                              <path d="M11.38 12a2.4 2.4 0 0 1-.4-4.77 2.4 2.4 0 0 1 3.2-2.77 2.4 2.4 0 0 1 3.47-.63 2.4 2.4 0 0 1 3.37 3.37 2.4 2.4 0 0 1-1.1 3.7 2.51 2.51 0 0 1 .03 1.1"></path>
                              <path d="m13 12 4-4"></path>
                              <path d="M10.9 7.25A3.99 3.99 0 0 0 4 10c0 .73.2 1.41.54 2"></path>
                            </svg>
                          </div>
                          <span className="flex-1 text-sm font-medium transition-colors">Follow nutrition plan</span>
                          <input
                            type="checkbox"
                            checked={checklistItems.nutrition}
                            onChange={() => toggleChecklistItem('nutrition')}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                          />
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-scale h-5 w-5">
                              <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                              <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
                              <path d="M7 21h10"></path>
                              <path d="M12 3v18"></path>
                              <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
                            </svg>
                          </div>
                          <span className="flex-1 text-sm font-medium transition-colors">Log your weight</span>
                          <input
                            type="checkbox"
                            checked={checklistItems.weight}
                            onChange={() => toggleChecklistItem('weight')}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                          />
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
                          <div className="text-primary">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar-plus h-5 w-5">
                              <path d="M8 2v4"></path>
                              <path d="M16 2v4"></path>
                              <path d="M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path>
                              <path d="M3 10h18"></path>
                              <path d="M16 19h6"></path>
                              <path d="M19 16v6"></path>
                            </svg>
                          </div>
                          <span className="flex-1 text-sm font-medium transition-colors">Schedule weekly check-in</span>
                          <input
                            type="checkbox"
                            checked={checklistItems.checkin}
                            onChange={() => toggleChecklistItem('checkin')}
                            className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
                          />
                        </label>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm font-medium text-muted-foreground">
                          <span>Progress</span>
                          <span>{checklistProgress()}%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div 
                            className="h-full bg-primary transition-all duration-300 ease-in-out" 
                            style={{width: `${checklistProgress()}%`}}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Goals */}
                <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                  <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <Goal className="text-primary" />
                        Current Goals
                      </h3>
                      <p className="text-sm text-muted-foreground">Your primary objectives. Let&apos;s work towards them together!</p>
                    </div>
                    <div className="p-6 pt-0">
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                          <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
                          <div className="flex-1">
                            <p className="font-semibold">Increase Cardio Endurance</p>
                            <p className="text-sm text-muted-foreground">Complete 3 sessions of 30+ minutes of cardio each week.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
                          <div className="flex-1">
                            <p className="font-semibold">Build Full-Body Strength</p>
                            <p className="text-sm text-muted-foreground">Focus on progressive overload in compound lifts like squats and deadlifts.</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
                          <div className="flex-1">
                            <p className="font-semibold">Improve Nutritional Habits</p>
                            <p className="text-sm text-muted-foreground">Consistently hit daily protein and water intake targets.</p>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Third Row - Personal Records & Nutrition Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Records */}
              <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                  <div className="flex flex-col space-y-1.5 p-6">
                    <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy text-primary">
                        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                        <path d="M4 22h16"></path>
                        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                      </svg>
                      Personal Records
                    </h3>
                    <p className="text-sm text-muted-foreground">Celebrating your recent achievements and milestones.</p>
                  </div>
                  <div className="p-6 pt-0 space-y-4">
                    <ul className="space-y-4">
                      <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                        <div className="text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy text-amber-500">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                            <path d="M4 22h16"></path>
                            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">New Deadlift PR</p>
                          <p className="text-sm text-muted-foreground">Aug 12, 2024</p>
                        </div>
                        <p className="font-bold text-lg text-primary">315 lbs</p>
                      </li>
                      <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                        <div className="text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-award text-sky-500">
                            <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"></path>
                            <circle cx="12" cy="8" r="6"></circle>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Fastest 5k Run</p>
                          <p className="text-sm text-muted-foreground">Aug 10, 2024</p>
                        </div>
                        <p className="font-bold text-lg text-primary">24:32</p>
                      </li>
                      <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
                        <div className="text-primary">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star text-rose-500">
                            <path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Workout Streak</p>
                          <p className="text-sm text-muted-foreground">Ongoing</p>
                        </div>
                        <p className="font-bold text-lg text-primary">14 Days</p>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Nutrition Summary */}
              <div className="transition-transform duration-300 ease-out hover:-translate-y-1">
                <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
                  <div className="flex p-6 flex-row items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-flame text-primary">
                          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                        </svg>
                        Nutrition Summary
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">Your daily intake at a glance.</p>
                    </div>
                    <Button variant="link" className="text-primary -mt-2">
                      View Nutrition <span aria-hidden="true">→</span>
                    </Button>
                  </div>
                  <div className="p-6 pt-0 space-y-8">
                    {/* Calorie Overview */}
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 divide-x text-center items-center">
                        <div>
                          <p className="font-bold text-lg">2200</p>
                          <p className="text-xs text-muted-foreground">Consumed</p>
                        </div>
                        <div>
                          <p className="font-bold text-lg">2200</p>
                          <p className="text-xs text-muted-foreground">Target</p>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check-big h-6 w-6 text-primary">
                            <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                            <path d="m9 11 3 3L22 4"></path>
                          </svg>
                          <p className="text-xs text-muted-foreground">Target Met</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm text-muted-foreground mb-1">
                          <span>Calories</span>
                          <span>100%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div className="h-full bg-primary transition-all" style={{width: "100%"}}></div>
                        </div>
                      </div>
                    </div>

                    {/* Macros Distribution */}
                    <div className="space-y-2">
                      <h4 className="font-semibold">Macros Distribution</h4>
                      <div className="w-full flex h-3 rounded-full overflow-hidden bg-secondary">
                        <div className="bg-sky-500" style={{width: "40%"}}></div>
                        <div className="bg-amber-500" style={{width: "35%"}}></div>
                        <div className="bg-rose-500" style={{width: "25%"}}></div>
                      </div>
                      <div className="grid grid-cols-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-sky-500"></span>
                          <span>Protein 40%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Carbs 35%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                          <span>Fat 25%</span>
                        </div>
                      </div>
                    </div>

                    {/* Water Intake */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-droplets h-5 w-5 text-blue-500">
                            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"></path>
                            <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"></path>
                          </svg>
                          Water Intake
                        </h4>
                        <span className="text-sm text-muted-foreground">64 / 128 oz</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="h-full bg-blue-500 transition-all" style={{width: "50%"}}></div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4 p-6 pt-0">
                    <Button 
                      onClick={handleLogMeal}
                      className="transition-transform hover:-translate-y-1 hover:shadow-lg"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-utensils-crossed mr-2">
                        <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"></path>
                        <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"></path>
                        <path d="m2.1 21.8 6.4-6.3"></path>
                        <path d="m19 5-7 7"></path>
                      </svg>
                      Log Meal
                    </Button>
                    <Button 
                      onClick={handleAddWater}
                      variant="outline" 
                      className="transition-transform hover:-translate-y-1 hover:shadow-lg hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-2">
                        <path d="M5 12h14"></path>
                        <path d="M12 5v14"></path>
                      </svg>
                      Add Water
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
