'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, Loader2 } from 'lucide-react';
import { WorkoutAssignment } from '@/types/workout';
import { WorkoutAssignmentCard } from '@/components/workouts/WorkoutAssignmentCard';

export default function ClientWorkoutsPage() {
  const router = useRouter();
  const { userData, user } = useAuth();
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutAssignment[]>([]);
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Fetch workout assignments in real-time
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const assignmentsRef = collection(db, 'workoutAssignments');
    const q = query(
      assignmentsRef,
      where('clientId', '==', user.uid),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const assignments: WorkoutAssignment[] = [];
        snapshot.forEach((doc) => {
          assignments.push({ id: doc.id, ...doc.data() } as WorkoutAssignment);
        });

        // Separate into upcoming and completed
        const now = new Date();
        const upcoming = assignments.filter(
          (a) => a.status === 'scheduled' || a.status === 'in_progress'
        );
        const completed = assignments.filter(
          (a) => a.status === 'completed'
        );

        setUpcomingWorkouts(upcoming);
        setCompletedWorkouts(completed);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching workout assignments:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall || undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading your workouts...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Mobile: Tabbed Layout */}
            <div className="lg:hidden">
              <Tabs defaultValue="upcoming">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Workouts</h1>
                    <p className="text-muted-foreground mt-1">
                      Your personalized training plan
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
                  {upcomingWorkouts.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No upcoming workouts assigned yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Your trainer will assign workouts to your plan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {upcomingWorkouts.map((workout) => (
                        <WorkoutAssignmentCard
                          key={workout.id}
                          assignment={workout}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="completed">
                  {completedWorkouts.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No completed workouts yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Complete your first workout to see it here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {completedWorkouts.map((workout) => (
                        <WorkoutAssignmentCard
                          key={workout.id}
                          assignment={workout}
                          isCompleted
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Desktop: Vertical Layout */}
            <div className="hidden lg:block">
              <div className="mb-6">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">My Workouts</h1>
                <p className="text-muted-foreground mt-1">
                  Your personalized training plan
                </p>
              </div>

              <div className="space-y-8">
                {/* Upcoming Workouts Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Upcoming Workouts</h2>
                    <span className="ml-auto bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium">
                      {upcomingWorkouts.length}
                    </span>
                  </div>
                  {upcomingWorkouts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No upcoming workouts assigned yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Your trainer will assign workouts to your plan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {upcomingWorkouts.map((workout) => (
                        <WorkoutAssignmentCard
                          key={workout.id}
                          assignment={workout}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-4 text-sm text-muted-foreground font-medium">
                      Completed
                    </span>
                  </div>
                </div>

                {/* Completed Workouts Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <h2 className="text-2xl font-bold text-foreground">Completed Workouts</h2>
                    <span className="ml-auto bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-sm font-medium">
                      {completedWorkouts.length}
                    </span>
                  </div>
                  {completedWorkouts.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                      <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No completed workouts yet.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Complete your first workout to see it here!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {completedWorkouts.map((workout) => (
                        <WorkoutAssignmentCard
                          key={workout.id}
                          assignment={workout}
                          isCompleted
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
