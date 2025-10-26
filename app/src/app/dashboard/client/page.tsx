'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { InteractiveCard } from '@/components/dashboard/interactive-card';
import { WelcomeScreen } from '@/components/dashboard/welcome-screen';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { UpcomingWorkoutReminder } from '@/components/dashboard/upcoming-workout-reminder';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { KeyMetricsOverview } from '@/components/dashboard/key-metrics-overview';
import { CurrentPlan } from '@/components/dashboard/current-plan';
import { ProgressCharts } from '@/components/dashboard/progress-charts';
import { WorkoutCalendar } from '@/components/dashboard/workout-calendar';
import { PersonalRecords } from '@/components/dashboard/personal-records';
import { NutritionSummary } from '@/components/dashboard/nutrition-summary';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { CoachNotes } from '@/components/dashboard/coach-notes';
import { WeeklyCheckin } from '@/components/dashboard/weekly-checkin';
import { TodoList } from '@/components/dashboard/todo-list';
import { CurrentGoals } from '@/components/dashboard/current-goals';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { cn } from '@/lib/utils';

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

// Mock data for sessions
const upcomingSessions = [
  { id: 1, type: 'Full Body Strength', date: '2024-08-15', time: '09:00 AM' },
  { id: 2, type: 'Cardio & Core', date: '2024-08-17', time: '10:00 AM' },
  { id: 3, type: 'Upper Body Focus', date: '2024-08-19', time: '09:00 AM' },
];

const completedSessions = [
  { id: 1, type: 'Lower Body Power', date: '2024-08-12', duration: '60 min' },
  { id: 2, type: 'HIIT Cardio Session', date: '2024-08-10', duration: '45 min' },
  { id: 3, type: 'Push Day Workout', date: '2024-08-08', duration: '55 min' },
];

const nextWorkout = {
  type: 'In-Person Strength Training',
  date: 'Tomorrow, August 15th',
  time: '9:00 AM',
  location: 'City Gym, 123 Fitness St.',
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data() as UserData;
          setUserData(data || null);
          // Check if we should show welcome screen
          if (!data?.hideWelcomeDashboard) {
            setShowWelcomeScreen(true);
          }
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

  const handleContinueFromWelcome = async (dontShowAgain?: boolean) => {
    if (user && dontShowAgain) {
      try {
        await setDoc(
          doc(db, 'users', user.uid),
          { hideWelcomeDashboard: true },
          { merge: true }
        );
      } catch (error) {
        console.error('Error updating user preference:', error);
      }
    }
    setShowWelcomeScreen(false);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Button handlers
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

  if (showWelcomeScreen) {
    return <WelcomeScreen onContinue={handleContinueFromWelcome} />;
  }

  const coachNote = {
    coachName: 'Shreyas',
    message: `Amazing job on your last deadlift session, ${userData?.name || 'Alex'}! Your form is looking solid. Let's focus on adding a bit more weight next week. Keep up the fantastic work!`,
  };

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier?.name}
        onLogout={handleLogout}
        onShowWelcome={() => setShowWelcomeScreen(true)}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <WelcomeHeader
              name={userData?.name || 'Alex'}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />

            {/* First Row - Upcoming Session & Onboarding */}
            <div
              className={cn(
                'grid grid-cols-1 gap-6',
                showOnboarding ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
              )}
              style={{ perspective: '1000px' }}
            >
              <InteractiveCard className={cn(!showOnboarding && 'lg:col-span-1')}>
                <UpcomingWorkoutReminder workout={nextWorkout} />
              </InteractiveCard>
              {showOnboarding && (
                <InteractiveCard>
                  <OnboardingChecklist
                    onDismiss={() => setShowOnboarding(false)}
                    onSchedule={handleScheduleConsultation}
                  />
                </InteractiveCard>
              )}
            </div>

            {/* Main Dashboard Grid */}
            <div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
              style={{ perspective: '1000px' }}
            >
              {/* Left Column - Main Content */}
              <div className="lg:col-span-2 space-y-6">
                <InteractiveCard>
                  <KeyMetricsOverview />
                </InteractiveCard>
                <InteractiveCard>
                  <CurrentPlan />
                </InteractiveCard>
                <InteractiveCard>
                  <ProgressCharts />
                </InteractiveCard>
                <InteractiveCard>
                  <WorkoutCalendar
                    upcomingSessions={upcomingSessions}
                    completedSessions={completedSessions}
                  />
                </InteractiveCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InteractiveCard>
                    <PersonalRecords />
                  </InteractiveCard>
                  <InteractiveCard>
                    <NutritionSummary
                      onLogMeal={handleLogMeal}
                      onAddWater={handleAddWater}
                    />
                  </InteractiveCard>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <InteractiveCard>
                  <AccountSummary />
                </InteractiveCard>
                <InteractiveCard>
                  <CoachNotes
                    coachName={coachNote.coachName}
                    message={coachNote.message}
                  />
                </InteractiveCard>
                <InteractiveCard>
                  <WeeklyCheckin onSchedule={handleScheduleWeeklyCheckin} />
                </InteractiveCard>
                <InteractiveCard>
                  <TodoList />
                </InteractiveCard>
                <InteractiveCard>
                  <CurrentGoals />
                </InteractiveCard>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
