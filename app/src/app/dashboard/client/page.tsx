'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, setDoc, collection, query, where, orderBy, limit, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { TrainingSession } from '@/types/session';
import { TrainingLocation } from '@/types/location';
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
import { PrimaryObjectives } from '@/components/dashboard/primary-objectives';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';

// Mock data for calendar (will be replaced with real data in future)
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

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, userData: userDataFromAuth, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [nextSession, setNextSession] = useState<TrainingSession | null>(null);
  const [nextSessionLocation, setNextSessionLocation] = useState<string>('');
  const [loadingNextSession, setLoadingNextSession] = useState(true);

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

    // CRITICAL: Check account activation before allowing dashboard access
    if (!userDataFromAuth.accountActivated) {
      console.log('[ClientDashboard] Account not activated, redirecting to payment');
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

  // Fetch next upcoming session
  useEffect(() => {
    if (!user) {
      setLoadingNextSession(false);
      return;
    }

    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('clientId', '==', user.uid),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', Timestamp.now()),
      orderBy('scheduledDate', 'asc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setNextSession(null);
        setNextSessionLocation('');
        setLoadingNextSession(false);
        return;
      }

      const session = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      } as TrainingSession;

      setNextSession(session);

      // Fetch location based on locationType
      try {
        if (session.locationType === 'private') {
          const clientDoc = await getDoc(doc(db, 'users', session.clientId));
          if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            if (clientData.address) {
              // Handle address object - convert to string
              if (typeof clientData.address === 'string') {
                setNextSessionLocation(clientData.address);
              } else {
                // Address is an object {street, city, state, zipCode, country}
                const addr = clientData.address;
                const formattedAddress = [addr.street, addr.city, addr.state, addr.zipCode]
                  .filter(Boolean)
                  .join(', ');
                setNextSessionLocation(formattedAddress || 'Private location');
              }
            } else {
              setNextSessionLocation('Private location (address not set)');
            }
          }
        } else {
          const locationDoc = await getDoc(doc(db, 'training_locations', session.locationId));
          if (locationDoc.exists()) {
            const locationData = locationDoc.data() as TrainingLocation;
            setNextSessionLocation(locationData.address);
          } else {
            setNextSessionLocation('Location TBD');
          }
        }
      } catch (error) {
        console.error('Error fetching session location:', error);
        setNextSessionLocation('Location unavailable');
      }

      setLoadingNextSession(false);
    }, (error) => {
      console.error('Error fetching next session:', error);
      setLoadingNextSession(false);
    });

    return () => unsubscribe();
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

  const formatSessionDateTime = (timestamp: Timestamp) => {
    const date = new Date(timestamp.toMillis());
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get timezone abbreviation
    const tzAbbr = new Date().toLocaleTimeString('en-US', { 
      timeZoneName: 'short' 
    }).split(' ').pop();

    // Format date
    let dateStr;
    if (date.toDateString() === today.toDateString()) {
      dateStr = 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }

    // Format time
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${dateStr} at ${timeStr} ${tzAbbr}`;
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
        userProfilePhoto={userDataFromAuth?.profilePhotoSmall}
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
                {loadingNextSession ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-muted-foreground">Loading session...</p>
                  </div>
                ) : nextSession ? (
                  <UpcomingWorkoutReminder 
                    workout={{
                      type: '',
                      date: formatSessionDateTime(nextSession.scheduledDate),
                      time: '',
                      location: nextSessionLocation
                    }} 
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-3">📅</div>
                    <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
                    <p className="text-muted-foreground mb-4">Schedule your next training session</p>
                    <a 
                      href="/dashboard/client/sessions/schedule"
                      className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                    >
                      Book Session
                    </a>
                  </div>
                )}
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
                    <PrimaryObjectives />
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
