'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, collection, query, where, orderBy, limit, onSnapshot, getDoc, Timestamp } from 'firebase/firestore';
import { Session, TrainingSession } from '@/types/session';
import { TrainingLocation } from '@/types/location';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { InteractiveCard } from '@/components/dashboard/interactive-card';
import { Card, CardContent } from '@/components/ui/card';
import { WelcomeHeader } from '@/components/dashboard/welcome-header';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { UpcomingWorkoutReminder } from '@/components/dashboard/upcoming-workout-reminder';
import { OnboardingChecklist } from '@/components/dashboard/onboarding-checklist';
import { KeyMetricsOverview } from '@/components/client-progress/key-metrics-overview';
import { CurrentPlan } from '@/components/dashboard/current-plan';
import { ProgressCharts } from '@/components/client-progress/progress-charts';
import { WorkoutCalendar } from '@/components/dashboard/workout-calendar';
import { PersonalRecords } from '@/components/dashboard/personal-records';
import { NutritionSummary } from '@/components/dashboard/nutrition-summary';
import { AccountSummary } from '@/components/dashboard/account-summary';
import { CoachOutreach } from '@/components/dashboard/coach-outreach';
import { CoachReminders } from '@/components/dashboard/coach-reminders';
import { ActivityAlerts } from '@/components/dashboard/activity-alerts';
import { WeeklyCheckin } from '@/components/dashboard/weekly-checkin';
import { DailyHabitsChecklist } from '@/components/activity/DailyHabitsChecklist';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { getClientPlan } from '@/lib/plan-api';
import { getDailyActivity, toggleHabit } from '@/lib/activity-api';
import { getTodayLocal } from '@/lib/date-utils';
import { redirectToCheckoutForTier, getClientFeatureAccess } from '@/lib/constants';



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
  const [loading, setLoading] = useState(true);
  const [setupGoal, setSetupGoal] = useState<Record<string, unknown> | null>(null);
  const [setupGoalLoading, setSetupGoalLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark' | 'forest'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('dashboardTheme') as 'light' | 'dark' | 'forest') || 'forest';
    }
    return 'light';
  });
  const [nextSession, setNextSession] = useState<Session | null>(null);
  const [nextSessionLocation, setNextSessionLocation] = useState<string>('');
  const [loadingNextSession, setLoadingNextSession] = useState(true);
  const [planData, setPlanData] = useState<ClientPlan | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityData | null>(null);
  const [habitsRefreshKey, setHabitsRefreshKey] = useState(0);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutSession[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutSession[]>([]);
  const [trainerName, setTrainerName] = useState<string>('');


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

    // CRITICAL: Check account activation before allowing dashboard access.
    // Un-activated client → resume payment via the unified checkout, keyed by tier
    // (matches /dashboard root guard). Falls back to /dashboard if tier unmapped.
    if (!userDataFromAuth.accountActivated) {
      console.log('[ClientDashboard] Account not activated, redirecting to checkout');
      // return='/signup?step=plan' so checkout Back shows the 4-package step to re-pick
      // (account exists → Continue updates tier + returns to checkout);
      // next='/dashboard?payment=success' (Welcome landing after payment).
      redirectToCheckoutForTier(router, userDataFromAuth.tier, '/signup?step=plan', '/dashboard', '/dashboard?payment=success');


      return;
    }



    setLoading(false);
  }, [userDataFromAuth, authLoading, router]);

  // Subscribe to setup goal to control onboarding checklist visibility
  useEffect(() => {
    if (!user) {
      setSetupGoalLoading(false);
      return;
    }

    const setupGoalRef = doc(db, 'goals', `${user.uid}_setup`);
    
    const unsubscribe = onSnapshot(setupGoalRef, (docSnap) => {
      if (docSnap.exists()) {
        setSetupGoal(docSnap.data());
      } else {
        setSetupGoal(null);
      }
      setSetupGoalLoading(false);
    }, (error) => {
      console.error('Error fetching setup goal:', error);
      setSetupGoal(null);
      setSetupGoalLoading(false);
    });

    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  // NOTE: Only depend on `user` — adding `userDataFromAuth` causes re-render
  // loops because the auth context creates a new object reference each render.
  // The guard `if (!user || !userDataFromAuth) return;` is sufficient.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // Resolve assigned trainer's name for the Coach Note attribution
        const trainerId = (userDataFromAuth?.assignedTrainerId as string | undefined) || plan?.trainerId;
        if (trainerId) {
          try {
            const trainerDoc = await getDoc(doc(db, 'users', trainerId));
            if (trainerDoc.exists()) {
              setTrainerName((trainerDoc.data().name as string) || '');
            }
          } catch {
            // Non-fatal — fall back to generic "Coach" in the note.
          }
        }

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

    // Query for upcoming (scheduled) workouts
    const upcomingQuery = query(
      collection(db, 'workouts'),
      where('clientId', '==', user.uid),
      where('status', '==', 'scheduled'),
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
        
        // Get workout name from the document itself (name is stored on assignment)
        const workoutName = data.name || 'Workout';

        const dueDate = data.dueDate?.toDate();
        workouts.push({
          id: workoutDoc.id,
          type: workoutName,
          date: dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD',
          time: dueDate ? dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : undefined,
        });
      }
      
      setUpcomingWorkouts(workouts);
    }, (error) => {
      console.error('[WorkoutCalendar] Error fetching upcoming workouts:', error);
    });

    // Listen to completed workouts
    const unsubCompleted = onSnapshot(completedQuery, async (snapshot) => {
      const workouts: WorkoutSession[] = [];
      
      for (const workoutDoc of snapshot.docs) {
        const data = workoutDoc.data();
        
        // Get workout name from the document itself (name is stored on assignment)
        const workoutName = data.name || 'Workout';

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
    }, (error) => {
      console.error('[WorkoutCalendar] Error fetching completed workouts:', error);
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

  const cycleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'forest' : 'light';
      localStorage.setItem('dashboardTheme', next);
      if (next === 'dark' || prev === 'forest') {
        document.documentElement.classList.add('dark');
      }
      if (next === 'light' || next === 'forest') {
        document.documentElement.classList.remove('dark');
      }
      return next;
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

  // Coach Note — real data from the trainer's "Notes from Last Call" (Plan tab).
  // Pick the most recent weekly-focus entry that actually has a note; fall back to
  // a friendly default so a brand-new client sees something honest (not fabricated).
  const coachName = trainerName || 'your Coach';
  const weeklyFocusWeeks = planData?.weeklyFocus?.weeks ?? [];
  const latestNoteWeek = [...weeklyFocusWeeks]
    .filter((w) => w.coachNotes && w.coachNotes.trim() !== '')
    .sort((a, b) => (b.weekStartDate || '').localeCompare(a.weekStartDate || ''))[0];
  const coachNote = {
    coachName,
    message: latestNoteWeek?.coachNotes?.trim()
      || `${coachName} will leave you a note here after your check-ins. Keep up the great work!`,
  };


  // Show onboarding if setup goal exists, is active, and not complete
  const milestones = setupGoal?.milestones as { completed: boolean }[] | undefined;
  const allMilestonesComplete = milestones?.every((m) => m.completed) ?? false;
  const showOnboarding = 
    setupGoal !== null && 
    setupGoal.isActive && 
    !allMilestonesComplete;

  // Tier-based feature access (see docs/02-implementation/tier-feature-gating/).
  // In-person clients (single session + 4-pack) get a simplified home with only
  // the pieces meaningful to them; coaching clients keep the full layout.
  const access = getClientFeatureAccess(userDataFromAuth?.tier);

  if (!access.fullDashboard) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userDataFromAuth?.name}
          userTier={userDataFromAuth?.tier}
          userProfilePhoto={userDataFromAuth?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
          theme={theme}
        />
        <SidebarInset>
          <div className={`${theme === 'forest' ? 'client-dashboard' : 'min-h-screen bg-background text-foreground'} p-4 sm:p-6 lg:p-8`}>
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <WelcomeHeader
                name={userDataFromAuth?.name || 'there'}
                theme={theme}
                onCycleTheme={cycleTheme}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ perspective: '1000px' }}>
                {/* Upcoming session card */}
                <InteractiveCard>
                  <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm hover:shadow-glow transition-shadow">
                    {loadingNextSession ? (
                      <CardContent className="text-center py-12">
                        <div className="text-4xl mb-3">⏳</div>
                        <p className="text-muted-foreground">Loading session...</p>
                      </CardContent>
                    ) : nextSession ? (
                      <UpcomingWorkoutReminder
                        workout={{
                          sessionType: nextSession.sessionType as 'training' | 'checkin' | 'onboarding',
                          date: formatSessionDateTime(nextSession.scheduledDate),
                          time: '',
                          location: nextSessionLocation,
                        }}
                      />
                    ) : (
                      <CardContent className="text-center py-12">
                        <div className="text-4xl mb-3">📅</div>
                        <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
                        <p className="text-muted-foreground mb-4">Schedule your next training session</p>
                        <a
                          href="/dashboard/client/sessions/schedule"
                          className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Book Session
                        </a>
                      </CardContent>
                    )}
                  </Card>
                </InteractiveCard>

                {/* Buy + Schedule CTAs */}
                <InteractiveCard>
                  <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm h-full">
                    <CardContent className="py-8 space-y-4">
                      <h3 className="text-lg font-semibold">Your Sessions</h3>
                      <p className="text-sm text-muted-foreground">
                        Buy 1-on-1 training sessions and schedule your next workout with your trainer.
                      </p>
                      <div className="flex flex-col gap-3">
                        <a
                          href="/dashboard/client/sessions/buy"
                          className="inline-block text-center bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Buy Sessions
                        </a>
                        <a
                          href="/dashboard/client/sessions/schedule"
                          className="inline-block text-center border border-primary text-primary px-6 py-2 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
                        >
                          Schedule 1-on-1
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </InteractiveCard>

                {/* Support / trainer */}
                <InteractiveCard>
                  <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm h-full">
                    <CardContent className="py-8 space-y-4">
                      <h3 className="text-lg font-semibold">Need a hand?</h3>
                      <p className="text-sm text-muted-foreground">
                        Message your trainer or explore upgrading to Online Coaching for a full plan,
                        nutrition, and progress tracking.
                      </p>
                      <div className="flex flex-col gap-3">
                        <a
                          href="/dashboard/client/messages"
                          className="inline-block text-center bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                        >
                          Message Your Coach
                        </a>
                        <a
                          href="/dashboard/client/upgrade"
                          className="inline-block text-center border border-primary text-primary px-6 py-2 rounded-lg font-semibold hover:bg-primary/10 transition-colors"
                        >
                          Explore Online Coaching
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </InteractiveCard>
              </div>

              {/* Account summary */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <InteractiveCard>
                  <AccountSummary
                    userId={user?.uid || ''}
                    accountCreatedAt={userDataFromAuth?.createdAt}
                  />
                </InteractiveCard>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (

    <SidebarProvider>
      <ClientSidebar
        userName={userDataFromAuth?.name}
        userTier={userDataFromAuth?.tier}
        userProfilePhoto={userDataFromAuth?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
        theme={theme}
      />
      <SidebarInset>
        <div className={`${theme === 'forest' ? 'client-dashboard' : 'min-h-screen bg-background text-foreground'} p-4 sm:p-6 lg:p-8`}>
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <WelcomeHeader
              name={userDataFromAuth?.name || 'Alex'}
              theme={theme}
              onCycleTheme={cycleTheme}
            />

            {/* First Row - Upcoming Session | From Your Coach (when active) | Daily Habits / Onboarding */}
            <div
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
              style={{ perspective: '1000px' }}
            >
              <div className="space-y-6">
                <InteractiveCard>
                <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm hover:shadow-glow transition-shadow">
                  {loadingNextSession ? (
                    <CardContent className="text-center py-12">
                      <div className="text-4xl mb-3">⏳</div>
                      <p className="text-muted-foreground">Loading session...</p>
                    </CardContent>
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
                    <CardContent className="text-center py-12">
                      <div className="text-4xl mb-3">📅</div>
                      <h3 className="text-lg font-semibold mb-2">No Upcoming Sessions</h3>
                      <p className="text-muted-foreground mb-4">Schedule your next training session</p>
                      <a 
                        href="/dashboard/client/sessions/schedule"
                        className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Book Session
                      </a>
                    </CardContent>
                  )}
                </Card>
              </InteractiveCard>
              <InteractiveCard>
                <WeeklyCheckin />
              </InteractiveCard>
              </div>
              {/* Column 2: Tasks + Coach Note (always renders since note is always present) */}
              <CoachOutreach
                coachName={coachNote.coachName}
                coachNote={coachNote.message}
              />

              {/* Column 3: Onboarding checklist → Daily Habits once complete */}
              {setupGoalLoading ? (
                <InteractiveCard>
                  <Card className="rounded-xl border bg-primary/5 border-primary/50 shadow-sm">
                    <CardContent className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-3 text-sm">Loading...</p>
                    </CardContent>
                  </Card>
                </InteractiveCard>
              ) : showOnboarding ? (
                <InteractiveCard>
                  <OnboardingChecklist />
                </InteractiveCard>
              ) : (
                <InteractiveCard>
                  <DailyHabitsChecklist
                    habits={planData?.dailyHabits?.habits || []}
                    completedHabits={activityData?.habits || []}
                    onToggle={handleToggleHabit}
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
                  <NutritionSummary />
                </InteractiveCard>
                <InteractiveCard>
                  <CurrentPlan trainingProtocol={planData?.trainingProtocol} />
                </InteractiveCard>
                <InteractiveCard>
                  <ProgressCharts />
                </InteractiveCard>
              </div>

              {/* Right Column - Sidebar */}
              <div className="lg:col-span-1 space-y-6">
                <CoachReminders />
                <ActivityAlerts />
                <InteractiveCard>
                  <WorkoutCalendar
                    upcomingSessions={upcomingWorkouts}
                    completedSessions={completedWorkouts}
                  />
                </InteractiveCard>
                <InteractiveCard>
                  <PersonalRecords />
                </InteractiveCard>
                <InteractiveCard>
                  <AccountSummary 
                    userId={user?.uid || ''}
                    accountCreatedAt={userDataFromAuth?.createdAt}
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

