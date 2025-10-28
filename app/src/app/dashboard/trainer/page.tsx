'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import { 
  Users,
  Dumbbell,
  Plus,
  Calendar,
  TrendingUp,
  Bell,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
  lastWorkout?: Date;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
}

export default function TrainerDashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) {
        return;
      }

      if (!userData) {
        router.push('/login');
        return;
      }

      if (userData.role !== 'trainer' && userData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      if (user) {
        try {
          
          // Fetch clients
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            orderBy('createdAt', 'desc')
          );
          
          const clientsSnapshot = await getDocs(clientsQuery);
          
          // Fetch assignments for stats
          const assignmentsQuery = query(
            collection(db, 'assigned_workouts'),
            where('trainerId', '==', user.uid)
          );
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const allAssignments: any[] = [];
          assignmentsSnapshot.forEach((doc) => {
            const data = doc.data();
            allAssignments.push({
              id: doc.id,
              ...data,
              completedAt: data.completedAt?.toDate(),
              assignedDate: data.assignedDate?.toDate(),
              dueDate: data.dueDate?.toDate()
            });
          });
          
          // Store assignments in state
          setAssignments(allAssignments);
          
          const clientsData: ClientData[] = [];
          
          clientsSnapshot.forEach((doc) => {
            const clientInfo = doc.data();
            const clientId = doc.id;
            
            const clientAssignments = allAssignments.filter(a => a.clientId === clientId);
            const completedAssignments = clientAssignments.filter(a => a.status === 'completed');
            const lastCompletedWorkout = completedAssignments
              .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];
            
            let status: 'active' | 'inactive' | 'pending' = 'active';
            if (clientAssignments.length === 0) {
              status = 'pending';
            } else if (lastCompletedWorkout) {
              const daysSinceLastWorkout = Math.floor((Date.now() - lastCompletedWorkout.completedAt.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceLastWorkout > 14) {
                status = 'inactive';
              }
            }
            
            clientsData.push({
              id: clientId,
              name: clientInfo.name,
              email: clientInfo.email,
              tier: clientInfo.tier,
              lastWorkout: lastCompletedWorkout?.completedAt || null,
              workoutsCompleted: completedAssignments.length,
              status: status
            });
          });
          
          setClients(clientsData);

          // Fetch workout templates
          const workoutsQuery = query(
            collection(db, 'workout_templates'),
            where('createdBy', '==', user.uid)
          );
          const workoutsSnapshot = await getDocs(workoutsQuery);
          const workoutsData: any[] = [];
          workoutsSnapshot.forEach((doc) => {
            workoutsData.push({ id: doc.id, ...doc.data() });
          });
          setWorkoutTemplates(workoutsData);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading trainer dashboard...</div>
      </div>
    );
  }

  const dashboardStats = {
    totalClients: clients.length,
    activeWorkouts: 12,
    completedToday: 8,
    pendingAssignments: 3
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="overview" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Trainer Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">Manage your clients, workouts, and track progress</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="relative text-primary hover:bg-primary/10"
            >
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
                2
              </div>
            </Button>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold">{dashboardStats.totalClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Dumbbell className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Workouts</p>
                  <p className="text-2xl font-bold">{dashboardStats.activeWorkouts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold">{dashboardStats.completedToday}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Assignments</p>
                  <p className="text-2xl font-bold">{dashboardStats.pendingAssignments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/trainer/workouts/create">
                <Button className="w-full justify-start h-auto p-4 flex-col items-start">
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Create New Workout</span>
                  <span className="text-sm opacity-80">Build a custom workout template</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/trainer/clients">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 flex-col items-start"
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Manage Clients</span>
                  <span className="text-sm opacity-80">View and manage your clients</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/trainer/assignments">
                <Button variant="outline" className="w-full justify-start h-auto p-4 flex-col items-start">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="font-semibold">View Progress</span>
                  <span className="text-sm opacity-80">Check client workout completion</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Client Activity */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Recent Client Activity</h3>
                <Link href="/dashboard/trainer/clients">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div key={client.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {client.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-gray-600">Completed workout 2 hours ago</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No clients yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">Upcoming Deadlines</h3>
                <Link href="/dashboard/trainer/assignments">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {(() => {
                  // Filter for upcoming assignments (not completed, has due date in future or near future)
                  const upcomingAssignments = assignments
                    .filter(assignment => {
                      if (assignment.status === 'completed') return false;
                      if (!assignment.dueDate) return false;
                      return true; // Include all non-completed with due dates
                    })
                    .sort((a, b) => {
                      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                      return dateA - dateB;
                    })
                    .slice(0, 3); // Show top 3

                  if (upcomingAssignments.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No upcoming deadlines</p>
                      </div>
                    );
                  }

                  return upcomingAssignments.map((assignment) => {
                    const client = clients.find(c => c.id === assignment.clientId);
                    const workout = workoutTemplates.find(w => w.id === assignment.templateId);
                    const dueDate = assignment.dueDate ? new Date(assignment.dueDate) : null;
                    const now = new Date();
                    
                    // Calculate days until due
                    let daysUntil = 0;
                    let dueDateText = '';
                    let urgencyColor = 'blue';
                    let UrgencyIcon = Calendar;
                    
                    if (dueDate) {
                      const timeDiff = dueDate.getTime() - now.getTime();
                      daysUntil = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                      
                      if (daysUntil < 0) {
                        dueDateText = `Overdue by ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''}`;
                        urgencyColor = 'red';
                        UrgencyIcon = AlertCircle;
                      } else if (daysUntil === 0) {
                        dueDateText = 'Due today';
                        urgencyColor = 'red';
                        UrgencyIcon = AlertCircle;
                      } else if (daysUntil === 1) {
                        dueDateText = 'Due tomorrow';
                        urgencyColor = 'orange';
                        UrgencyIcon = AlertCircle;
                      } else if (daysUntil <= 3) {
                        dueDateText = `Due in ${daysUntil} days`;
                        urgencyColor = 'yellow';
                        UrgencyIcon = Clock;
                      } else if (daysUntil <= 7) {
                        dueDateText = `Due in ${daysUntil} days`;
                        urgencyColor = 'blue';
                        UrgencyIcon = Calendar;
                      } else {
                        dueDateText = `Due ${dueDate.toLocaleDateString()}`;
                        urgencyColor = 'blue';
                        UrgencyIcon = Calendar;
                      }
                    }

                    const bgColor = urgencyColor === 'red' ? 'bg-red-50 border-red-200' :
                                   urgencyColor === 'orange' ? 'bg-orange-50 border-orange-200' :
                                   urgencyColor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                   'bg-blue-50 border-blue-200';
                    
                    const iconColor = urgencyColor === 'red' ? 'text-red-500' :
                                     urgencyColor === 'orange' ? 'text-orange-500' :
                                     urgencyColor === 'yellow' ? 'text-yellow-500' :
                                     'text-blue-500';

                    return (
                      <div key={assignment.id} className={`flex items-center gap-4 p-3 rounded-lg border ${bgColor}`}>
                        <UrgencyIcon className={`h-5 w-5 ${iconColor}`} />
                        <div className="flex-1">
                          <p className="font-medium">
                            {workout?.name || 'Unknown Workout'} - {client?.name || 'Unknown Client'}
                          </p>
                          <p className="text-sm text-gray-600">{dueDateText}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
