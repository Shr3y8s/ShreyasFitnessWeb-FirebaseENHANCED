'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
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
  const { user, userData: userDataFromAuth, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userDataFromAuth) {
      console.log('[ClientDashboard] No user data, redirecting to login');
      router.push('/login');
      return;
    }

    // CRITICAL: Only clients should access client dashboard
    if (userDataFromAuth.role !== 'client') {
      console.log('[ClientDashboard] User is not a client, redirecting to appropriate dashboard');
      if (userDataFromAuth.role === 'trainer' || userDataFromAuth.role === 'admin') {
        router.push('/dashboard/trainer');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // CRITICAL: Check payment status before allowing dashboard access
    if (userDataFromAuth.paymentStatus !== 'active') {
      console.log('[ClientDashboard] Payment not complete, redirecting to payment');
      router.push('/payment');
      return;
    }

    console.log('[ClientDashboard] User data loaded:', { 
      name: userDataFromAuth?.name, 
      email: userDataFromAuth?.email, 
      role: userDataFromAuth?.role
    });

    setLoading(false);
  }, [userDataFromAuth, authLoading, router]);

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

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  // Button handlers
  const handleLogMeal = () => {
    console.log('Log Meal clicked');
    alert('Meal logging feature coming soon!');
  };

  const handleAddWater = () => {
    console.log('Add Water clicked');
    alert('Water tracking feature coming soon!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading your dashboard...</div>
      </div>
    );
  }

  const coachNote = {
    coachName: 'Shreyas',
    message: `Amazing job on your last deadlift session, ${userDataFromAuth?.name || 'Alex'}! Your form is looking solid. Let's focus on adding a bit more weight next week. Keep up the fantastic work!`,
  };

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userDataFromAuth?.name}
        userTier={userDataFromAuth?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <WelcomeHeader
              name={userDataFromAuth?.name || 'Alex'}
              isDarkMode={isDarkMode}
              onToggleTheme={toggleTheme}
            />

            {/* First Row - Upcoming Session & Onboarding/(Coach Notes + Current Goals) */}
            <div
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              style={{ perspective: '1000px' }}
            >
              <InteractiveCard>
                <UpcomingWorkoutReminder workout={nextWorkout} />
              </InteractiveCard>
              {showOnboarding ? (
                <InteractiveCard>
                  <OnboardingChecklist
                    onDismiss={() => setShowOnboarding(false)}
                  />
                </InteractiveCard>
              ) : (
                <div className="space-y-6">
                  <InteractiveCard>
                    <CoachNotes
                      coachName={coachNote.coachName}
                      message={coachNote.message}
                    />
                  </InteractiveCard>
                  <InteractiveCard>
                    <CurrentGoals />
                  </InteractiveCard>
                </div>
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
                  <WeeklyCheckin />
                </InteractiveCard>
                <InteractiveCard>
                  <WorkoutCalendar
                    upcomingSessions={upcomingSessions}
                    completedSessions={completedSessions}
                  />
                </InteractiveCard>
                <InteractiveCard>
                  <TodoList />
                </InteractiveCard>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
