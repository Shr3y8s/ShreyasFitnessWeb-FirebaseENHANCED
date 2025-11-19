'use client';

import { useState, useMemo, useEffect } from 'react';
import { WorkoutList } from '@/components/workouts/workout-list';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, Lightbulb, X } from 'lucide-react';
import { useCoachUpdates } from '@/context/CoachUpdatesContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const initialUpcomingWorkouts = [
  {
    id: 'wk-1',
    day: 'Monday',
    date: 'Sep 16',
    title: 'Full Body Strength',
    description: 'Focus on compound movements to build a strong foundation.',
    isNew: false,
    isUpdated: true,
    updateId: 1,
    exercises: [
      {
        name: 'Squats',
        target: '8-12 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Squat+Form',
        instructions: [
          'Keep your chest up and back straight.',
          'Go down until your thighs are parallel to the floor.',
          'Push through your heels to return to the starting position.',
        ],
        sets: [
          { id: 1, reps: '8-12', weight: '', targetWeight: '185' },
          { id: 2, reps: '8-12', weight: '', targetWeight: '185' },
          { id: 3, reps: '8-12', weight: '', targetWeight: '185' },
        ],
        rest: '60s',
      },
      {
        name: 'Bench Press',
        target: '8-12 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Bench+Press+Form',
        instructions: [
          'Keep your feet flat on the floor.',
          'Lower the bar to your mid-chest.',
          'Press the bar up until your arms are fully extended.',
        ],
        sets: [
          { id: 1, reps: '8-12', weight: '', targetWeight: '155' },
          { id: 2, reps: '8-12', weight: '', targetWeight: '155' },
          { id: 3, reps: '8-12', weight: '', targetWeight: '155' },
        ],
        rest: '60s',
      },
      {
        name: 'Bent-Over Rows',
        target: '8-12 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Bent-Over+Row+Form',
        instructions: [
          'Hinge at your hips with a slight bend in your knees.',
          'Pull the weight towards your lower chest.',
          'Squeeze your shoulder blades together at the top.',
        ],
        sets: [
          { id: 1, reps: '8-12', weight: '', targetWeight: '135' },
          { id: 2, reps: '8-12', weight: '', targetWeight: '135' },
          { id: 3, reps: '8-12', weight: '', targetWeight: '135' },
        ],
        rest: '60s',
      },
    ],
  },
  {
    id: 'wk-2',
    day: 'Wednesday',
    date: 'Sep 18',
    title: 'Cardio & Core',
    description: 'Improve cardiovascular health and strengthen your core.',
    exercises: [
      {
        name: 'Treadmill Run',
        target: '30 min',
        videoUrl: 'https://placehold.co/600x400.gif?text=Running+Form',
        instructions: [
          'Maintain a slight forward lean.',
          'Land midfoot, directly under your center of gravity.',
          'Keep your cadence high (around 170-180 steps per minute).',
        ],
        sets: [{ id: 1, reps: '30 min', weight: 'N/A', targetWeight: '' }],
        rest: 'N/A',
      },
      {
        name: 'Plank',
        target: '60s hold',
        videoUrl: 'https://placehold.co/600x400.gif?text=Plank+Form',
        instructions: [
          "Keep your body in a straight line from head to heels.",
          'Engage your core and glutes.',
          "Don't let your hips sag.",
        ],
        sets: [
          { id: 1, reps: '60s hold', weight: 'N/A', targetWeight: '' },
          { id: 2, reps: '60s hold', weight: 'N/A', targetWeight: '' },
          { id: 3, reps: '60s hold', weight: 'N/A', targetWeight: '' },
        ],
        rest: '30s',
      },
      {
        name: 'Leg Raises',
        target: '15-20 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Leg+Raise+Form',
        instructions: [
          'Press your lower back into the floor.',
          'Raise your legs until they are perpendicular to the floor.',
          'Lower your legs slowly and with control.',
        ],
        sets: [
          { id: 1, reps: '15-20', weight: '', targetWeight: '' },
          { id: 2, reps: '15-20', weight: '', targetWeight: '' },
          { id: 3, reps: '15-20', weight: '', targetWeight: '' },
        ],
        rest: '30s',
      },
    ],
  },
  {
    id: 'wk-3',
    day: 'Friday',
    date: 'Sep 20',
    title: 'Upper Body Focus',
    isNew: true,
    updateId: 3,
    description: 'Isolate and build muscle in your arms, chest, and back.',
    exercises: [
      {
        name: 'Pull-Ups',
        target: 'AMRAP',
        videoUrl: 'https://placehold.co/600x400.gif?text=Pull-Up+Form',
        instructions: [
          'Start from a dead hang with arms fully extended.',
          'Pull your chin over the bar.',
          'Lower yourself with control.',
        ],
        sets: [
          { id: 1, reps: 'AMRAP', weight: 'Body', targetWeight: '' },
          { id: 2, reps: 'AMRAP', weight: 'Body', targetWeight: '' },
          { id: 3, reps: 'AMRAP', weight: 'Body', targetWeight: '' },
        ],
        rest: '90s',
      },
      {
        name: 'Dumbbell Curls',
        target: '10-15 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Dumbbell+Curl+Form',
        instructions: [
          'Keep your elbows pinned to your sides.',
          'Curl the weights up to your shoulders.',
          'Avoid using momentum.',
        ],
        sets: [
          { id: 1, reps: '10-15', weight: '', targetWeight: '30' },
          { id: 2, reps: '10-15', weight: '', targetWeight: '30' },
          { id: 3, reps: '10-15', weight: '', targetWeight: '30' },
        ],
        rest: '45s',
      },
      {
        name: 'Tricep Dips',
        target: '10-15 reps',
        videoUrl: 'https://placehold.co/600x400.gif?text=Tricep+Dip+Form',
        instructions: [
          'Keep your back close to the bench.',
          'Lower your body until your elbows are at a 90-degree angle.',
          'Push through your palms to return to the start.',
        ],
        sets: [
          { id: 1, reps: '10-15', weight: 'Body', targetWeight: '' },
          { id: 2, reps: '10-15', weight: 'Body', targetWeight: '' },
          { id: 3, reps: '10-15', weight: 'Body', targetWeight: '' },
        ],
        rest: '45s',
      },
    ],
  },
];

const initialCompletedWorkouts = [
  {
    id: 'wk-4',
    day: 'Last Saturday',
    date: 'Sep 14',
    title: 'Active Recovery',
    description: 'Light activity to promote recovery and reduce soreness.',
    isCompleted: true,
    exercises: [
      {
        name: 'Foam Rolling',
        target: '15 min',
        videoUrl: 'https://placehold.co/600x400.gif?text=Foam+Rolling',
        instructions: [
          'Roll slowly over sore muscles.',
          'Pause on tender spots for 20-30 seconds.',
        ],
        sets: [{ id: 1, reps: '15 min', weight: 'N/A', targetWeight: '' }],
        rest: 'N/A',
      },
      {
        name: 'Stretching',
        target: '15 min',
        videoUrl: 'https://placehold.co/600x400.gif?text=Stretching',
        instructions: [
          'Hold each stretch for 30 seconds.',
          'Breathe deeply and avoid bouncing.',
        ],
        sets: [{ id: 1, reps: '15 min', weight: 'N/A', targetWeight: '' }],
        rest: 'N/A',
      },
    ],
  },
];

export default function WorkoutsPage() {
  const [upcomingWorkouts, setUpcomingWorkouts] = useState(initialUpcomingWorkouts);
  const [completedWorkouts, setCompletedWorkouts] = useState(initialCompletedWorkouts);
  const { setCoachUpdates } = useCoachUpdates();
  const [showInfoBanner, setShowInfoBanner] = useState(true);

  // Check localStorage for banner dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem('workout-info-banner-dismissed');
    if (dismissed === 'true') {
      setShowInfoBanner(false);
    }
  }, []);

  const handleDismissBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('workout-info-banner-dismissed', 'true');
  };

  const sortedUpcomingWorkouts = useMemo(() => {
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split(' ');
      const monthIndex = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ].indexOf(parts[0]);
      const day = parseInt(parts[1], 10);
      return new Date(new Date().getFullYear(), monthIndex, day);
    };
    return [...upcomingWorkouts].sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    );
  }, [upcomingWorkouts]);

  const handleWorkoutComplete = (
    workoutId: string,
    performanceData: Record<string, { weight?: string; reps?: string }>,
    difficulty?: string,
    notes?: string
  ) => {
    const workoutToMove = upcomingWorkouts.find((w) => w.id === workoutId);
    if (workoutToMove) {
      setUpcomingWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
      setCompletedWorkouts((prev) => [
        { 
          ...workoutToMove, 
          isCompleted: true, 
          isNew: false, 
          performanceData,
          difficulty,
          notes
        },
        ...prev,
      ]);
    }
  };

  const handleWorkoutIncomplete = (workoutId: string) => {
    const workoutToMove = completedWorkouts.find((w) => w.id === workoutId);
    if (workoutToMove) {
      setCompletedWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
      setUpcomingWorkouts((prev) => [{ ...workoutToMove, isCompleted: false }, ...prev]);
    }
  };

  const handleDismissUpdate = (updateId: number | undefined) => {
    if (!updateId) return;
    setCoachUpdates((prev) => prev.filter((u) => u.id !== updateId));
    setUpcomingWorkouts((prev) =>
      prev.map((w) => (w.updateId === updateId ? { ...w, isNew: false, isUpdated: false } : w))
    );
  };

  return (
    <SidebarProvider>
      <ClientSidebar />
      <SidebarInset>
        <div className="min-h-screen text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {showInfoBanner && (
              <Alert className="mb-6 border-primary/20 bg-primary/5">
                <Lightbulb className="h-5 w-5 text-primary" />
                <AlertDescription className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <span className="font-semibold text-primary">How to Log Your Workouts:</span> After your session, click <strong>Mark as Complete</strong> to quickly log your workout and how it felt—this helps me adjust your next workout. For detailed tracking, expand the workout to enter weights and reps for each set (optional).
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleDismissBanner}
                    className="shrink-0 hover:bg-primary/10"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Dismiss</span>
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {/* Mobile: Tabbed Layout */}
            <div className="lg:hidden">
              <Tabs defaultValue="upcoming">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Workouts</h1>
                    <p className="text-muted-foreground mt-1">
                      Your weekly plan is ready. Let&apos;s get to work.
                    </p>
                  </div>
                  <TabsList className="bg-transparent gap-2 p-0">
                    <TabsTrigger 
                      value="upcoming"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:border data-[state=inactive]:border-input rounded-md px-4"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Upcoming
                    </TabsTrigger>
                    <TabsTrigger 
                      value="completed"
                      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:border data-[state=inactive]:border-input hover:bg-primary/10 hover:text-primary rounded-md px-4"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Completed
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="upcoming">
                  <WorkoutList
                    workouts={sortedUpcomingWorkouts}
                    onWorkoutComplete={handleWorkoutComplete}
                    onDismissUpdate={handleDismissUpdate}
                  />
                </TabsContent>
                <TabsContent value="completed">
                  <WorkoutList
                    workouts={completedWorkouts}
                    onWorkoutComplete={handleWorkoutComplete}
                    onWorkoutIncomplete={handleWorkoutIncomplete}
                    onDismissUpdate={handleDismissUpdate}
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: Two-Column Layout */}
            <div className="hidden lg:block">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Workouts</h1>
                <p className="text-muted-foreground mt-1">
                  Your weekly plan is ready. Let&apos;s get to work.
                </p>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Workouts Column */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Upcoming Workouts</h2>
                    <span className="ml-auto bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium">
                      {sortedUpcomingWorkouts.length}
                    </span>
                  </div>
                  <WorkoutList
                    workouts={sortedUpcomingWorkouts}
                    onWorkoutComplete={handleWorkoutComplete}
                    onDismissUpdate={handleDismissUpdate}
                  />
                </div>

                {/* Completed Workouts Column */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Completed Workouts</h2>
                    <span className="ml-auto bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium">
                      {completedWorkouts.length}
                    </span>
                  </div>
                  <WorkoutList
                    workouts={completedWorkouts}
                    onWorkoutComplete={handleWorkoutComplete}
                    onWorkoutIncomplete={handleWorkoutIncomplete}
                    onDismissUpdate={handleDismissUpdate}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
