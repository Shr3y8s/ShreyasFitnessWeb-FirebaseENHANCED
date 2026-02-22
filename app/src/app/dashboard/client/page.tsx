'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, collection, query, where, orderBy, limit, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { Session, TrainingSession } from '@/types/session';
import { TrainingLocation } from '@/types/location';
import { useToast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { InteractiveCard } from '@/components/dashboard/interactive-card';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { UpcomingWorkoutReminder } from '@/components/dashboard/upcoming-workout-reminder';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { KeyMetricsOverview } from '@/components/dashboard/key-metrics-overview';
import { CurrentPlan } from '@/components/dashboard/current-plan';
import { ProgressCharts } from '@/components/client-progress/progress-charts';
import { WorkoutCalendar } from '@/components/dashboard/workout-calendar';
import { PersonalRecords } from '@/components/dashboard/personal-records';
import { NutritionSummary } from '@/components/dashboard/nutrition-summary';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { CoachNotes } from '@/components/dashboard/coach-notes';
import { WeeklyCheckin } from '@/components/dashboard/weekly-checkin';
import { DailyHabitsChecklist } from '@/components/activity/DailyHabitsChecklist';
import { PrimaryObjectives } from '@/components/dashboard/primary-objectives';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { hasOnlineCoaching } from '@/lib/constants';
import { getClientPlan } from '@/lib/plan-api';
import { getDailyActivity, toggleHabit } from '@/lib/activity-api';
import { getTodayLocal } from '@/lib/date-utils';
import type { DailyActivityData } from '@/types/activity';
import type { ClientPlan } from '@/types/plan';

interface WorkoutSession {
  id: string;
  type: string;
  date: string;
  time?: string;
  duration?: string;
}

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, userData: userDataFromAuth, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [setupGoal, setSetupGoal] = useState<any>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [nextSessionLocation, setNextSessionLocation] = useState<string>('');
  const [loadingNextSession, setLoadingNextSession] = useState(true);
  const [planData, setPlanData] = useState<ClientPlan | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityData | null>(null);
  const [habitsRefreshKey, setHabitsRefreshKey] = useState(0);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutSession[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutSession[]>([]);

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

    setLoading(false);
  }, [userDataFromAuth, authLoading, router]);

  // Subscribe to setup goal to control onboarding checklist visibility
  useEffect(() => {
    if (!user || !userDataFromAuth) return;

    const setupGoalRef = doc(db, 'goals', `${user.uid}_setup`);
    
    const unsubscribe = onSnapshot(setupGoalRef, (docSnap) => {
      if (docSnap.exists()) {
        setSetupGoal(docSnap.data());
      } else {
        setSetupGoal(null);
      }
    }, (error) => {
      console.error('Error fetching setup goal:', error);
      setSetupGoal(null);
    });

    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

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

      // Fetch location based on sessionType and locationType
      try {
        // Check-ins and onboarding consultations are virtual calls, no physical location
        // @ts-expect-error - sessionType may include 'checkin' or 'onboarding' at runtime
        if (session.sessionType === 'checkin') {
          setNextSessionLocation('Virtual check-in call');
          // @ts-expect-error - sessionType may include 'onboarding' at runtime
        } else if (session.sessionType === 'onboarding') {
          setNextSessionLocation('Virtual consultation call');
        } else if (session.locationType === 'private') {
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

    // Register with centralized registry
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Fetch plan data and today's activity data for habits
  useEffect(() => {
    if (!user) return;

    const loadHabitsData = async () => {
      try {
        // Get today's date in YYYY-MM-DD format (local timezone)
        const today = getTodayLocal();
        
        // Load client plan for habits configuration
        const plan = await getClientPlan(user.uid);
        setPlanData(plan);
        
        // Load today's activity data for habit completion status
        const activity = await getDailyActivity(user.uid, today);
        setActivityData(activity);
      } catch (error) {
        console.error('Error loading habits data:', error);
      }
    };

    loadHabitsData();
  }, [user, habitsRefreshKey]);

  // Fetch upcoming and completed workouts
  useEffect(() => {
    if (!user) return;

    // Query for upcoming (assigned) workouts
    const upcomingQuery = query(
      collection(db, 'workouts'),
      where('clientId', '==', user.uid),
      where('status', '==', 'assigned'),
      orderBy('dueDate', 'asc'),
      limit(5)
    );

    // Query for completed workouts
    const completedQuery = query(
      collection(db, 'workouts'),
      where('clientId', '==', user.uid),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc'),
      limit(5)
    );

    // Listen to upcoming workouts
    const unsubUpcoming = onSnapshot(upcomingQuery, async (snapshot) => {
      const workouts: WorkoutSession[] = [];
      
      for (const workoutDoc of snapshot.docs) {
        const data = workoutDoc.data();
        
        // Get workout template to get the name
        let workoutName = 'Workout';
        if (data.templateId) {
          try {
            const templateRef = doc(db, 'workoutTemplates', data.templateId);
            const templateDoc = await getDoc(templateRef);
            if (templateDoc.exists()) {
              workoutName = templateDoc.data()?.name || 'Workout';
            }
          } catch (error) {
            console.error('Error fetching template:', error);
          }
        }

        const dueDate = data.dueDate?.toDate();
        workouts.push({
          id: workoutDoc.id,
          type: workoutName,
          date: dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
          time: dueDate ? dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : undefined,
        });
      }
      
      setUpcomingWorkouts(workouts);
    });

    // Listen to completed workouts
    const unsubCompleted = onSnapshot(completedQuery, async (snapshot) => {
      const workouts: WorkoutSession[] = [];
      
      for (const workoutDoc of snapshot.docs) {
        const data = workoutDoc.data();
        
        // Get workout template to get the name
        let workoutName = 'Workout';
        if (data.templateId) {
          try {
            const templateRef = doc(db, 'workoutTemplates', data.templateId);
            const templateDoc = await getDoc(templateRef);
            if (templateDoc.exists()) {
              workoutName = templateDoc.data()?.name || 'Workout';
            }
          } catch (error) {
            console.error('Error fetching template:', error);
          }
        }

        const completedDate = data.completedAt?.toDate();
        const assignedDate = data.assignedDate?.toDate();
        
        // Calculate duration if both dates exist
        let duration = 'N/A';
        if (completedDate && assignedDate) {
          const diffMs = completedDate.getTime() - assignedDate.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          duration = diffDays === 0 ? 'Same day' : `${diffDays} day${diffDays > 1 ? 's' : ''}`;
        }

        workouts.push({
          id: workoutDoc.id,
          type: workoutName,
          date: completedDate ? completedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
          duration: duration,
        });
      }
      
      setCompletedWorkouts(workouts);
    });

    registerListener(unsubUpcoming);
    registerListener(unsubCompleted);

    return () => {
      unregisterListener(unsubUpcoming);
      unregisterListener(unsubCompleted);
      unsubUpcoming();
      unsubCompleted();
    };
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
    toast({
      title: "Coming Soon",
      description: "Meal logging feature is coming soon!",
    });
  };

  const handleAddWater = () => {
    console.log('Add Water clicked');
    toast({
      title: "Coming Soon",
      description: "Water tracking feature is coming soon!",
    });
  };

  const handleToggleHabit = async (habitId: string, completed: boolean) => {
    if (!user) return;
    
    // Get today's date (local timezone)
    const today = getTodayLocal();
    
    // Optimistic update - update UI immediately
    setActivityData(prev => {
      if (!prev) {
        return {
          date: today,
          habits: [{
            date: today,
            habitId,
            completed,
            timestamp: new Date()
          }],
          updatedAt: new Date()
        };
      }
      
      const existingHabits = prev.habits || [];
      const habitIndex = existingHabits.findIndex(h => h.habitId === habitId);
      
      let updatedHabits;
      if (habitIndex >= 0) {
        // Update existing habit
        updatedHabits = [...existingHabits];
        updatedHabits[habitIndex] = {
          ...updatedHabits[habitIndex],
          completed,
          timestamp: new Date()
        };
      } else {
        // Add new habit
        updatedHabits = [
          ...existingHabits,
          {
            date: today,
            habitId,
            completed,
            timestamp: new Date()
          }
        ];
      }
      
      return {
        ...prev,
        habits: updatedHabits
      };
    });
    
    // Make API call in background
    const result = await toggleHabit(user.uid, today, habitId, completed);
    if (!result.success) {
      // Revert on error by refreshing
      setHabitsRefreshKey(prev => prev + 1);
    }
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

  // Show onboarding if setup goal exists, is active, and not complete
  const allMilestonesComplete = setupGoal?.milestones?.every((m: any) => m.completed) ?? false;
  const showOnboarding = 
    setupGoal !== null && 
    setupGoal.isActive && 
    !allMilestonesComplete;

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userDataFromAuth?.name}
        userTier={userDataFromAuth?.tier}
        userProfilePhoto={userDataFromAuth?.profilePhotoSmall || undefined}
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
                      sessionType: nextSession.sessionType as 'training' | 'checkin' | 'onboarding',
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
                  <OnboardingChecklist />
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
                  <AccountSummary 
                    userId={user?.uid || ''}
                    accountCreatedAt={userDataFromAuth?.createdAt}
                  />
                </InteractiveCard>
                <InteractiveCard>
                  <WeeklyCheckin />
                </InteractiveCard>
                <InteractiveCard>
                  <WorkoutCalendar
                    upcomingSessions={upcomingWorkouts}
                    completedSessions={completedWorkouts}
                  />
                </InteractiveCard>
                <InteractiveCard>
                  <DailyHabitsChecklist
                    habits={planData?.dailyHabits?.habits || []}
                    completedHabits={activityData?.habits || []}
                    onToggle={handleToggleHabit}
                  />
                </InteractiveCard>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
