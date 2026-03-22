'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, collectionGroup, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { AdminOnlySection } from '@/components/dashboard/AdminOnlySection';
import UpcomingSessionsCard from '@/components/trainer/UpcomingSessionsCard';
import { formatDistanceToNow } from 'date-fns';
import { 
  Users,
  Dumbbell,
  Plus,
  Calendar,
  TrendingUp,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  CreditCard,
  Activity
} from 'lucide-react';
import { SUBSCRIPTION_TIERS } from '@/lib/constants';
import { formatDateISO } from '@/lib/date-utils';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
  lastWorkout?: Date;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
  accountActivated?: boolean;
  subscriptionStatus?: string;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export default function TrainerDashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [mrr, setMrr] = useState(0);
  const [pendingAccountsCount, setPendingAccountsCount] = useState(0);
  const [failedPaymentsCount, setFailedPaymentsCount] = useState(0);
  const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0);

  // Helper function to convert Firestore Timestamp or Date to milliseconds
  const getTimestamp = (dateOrTimestamp: any): number => {
    if (!dateOrTimestamp) return Date.now();
    
    // Check if it's a Date object
    if (dateOrTimestamp instanceof Date) {
      return dateOrTimestamp.getTime();
    }
    
    // Check if it's a Firestore Timestamp (has toDate method)
    if (dateOrTimestamp?.toDate && typeof dateOrTimestamp.toDate === 'function') {
      return dateOrTimestamp.toDate().getTime();
    }
    
    // Try to parse as string/number
    const parsed = new Date(dateOrTimestamp).getTime();
    return isNaN(parsed) ? Date.now() : parsed;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) {
        return;
      }

      if (!userData) {
        router.push('/login');
        return;
      }

      // Check if user can access trainer dashboard (trainer or admin with canTrain=true)
      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      if (user) {
        try {
          
          // Fetch clients (exclude GDPR-deleted accounts)
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            where('gdprDeleted', '!=', true),
            orderBy('createdAt', 'desc')
          );
          
          const clientsSnapshot = await getDocs(clientsQuery);
          
          // Fetch assignments for stats
          const assignmentsQuery = query(
            collection(db, 'workouts'),
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
              assignedAt: data.assignedAt?.toDate(),
              scheduledDate: data.scheduledDate?.toDate ? data.scheduledDate.toDate() : data.scheduledDate,
              dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : data.dueDate,
              name: data.name || 'Workout',
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
            } else if (lastCompletedWorkout && lastCompletedWorkout.completedAt) {
              const completedAtTime = getTimestamp(lastCompletedWorkout.completedAt);
              const daysSinceLastWorkout = Math.floor((Date.now() - completedAtTime) / (1000 * 60 * 60 * 24));
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
              status: status,
              createdAt: clientInfo.createdAt?.toDate ? clientInfo.createdAt.toDate() : (clientInfo.createdAt ? new Date(clientInfo.createdAt) : undefined),
              lastLoginAt: clientInfo.lastLoginAt?.toDate ? clientInfo.lastLoginAt.toDate() : (clientInfo.lastLoginAt ? new Date(clientInfo.lastLoginAt) : undefined),
            });
          });
          
          setClients(clientsData);

          // Fetch workout templates
          const workoutsQuery = query(
            collection(db, 'workoutTemplates'),
            where('createdBy', '==', user.uid)
          );
          const workoutsSnapshot = await getDocs(workoutsQuery);
          const workoutsData: any[] = [];
          workoutsSnapshot.forEach((doc) => {
            workoutsData.push({ id: doc.id, ...doc.data() });
          });
          setWorkoutTemplates(workoutsData);

          // Load financial metrics
          await loadFinancialMetrics();
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
      setLoading(false);
    };

    const loadFinancialMetrics = async () => {
      try {
        // Load MRR from active subscriptions
        try {
          const subsQuery = query(
            collectionGroup(db, 'subscriptions'),
            where('status', '==', 'active')
          );
          const subsSnapshot = await getDocs(subsQuery);
          let totalMrr = 0;
          let activeSubsCount = 0;
          
          subsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.items && data.items.length > 0) {
              data.items.forEach((item: any) => {
                const amount = (item.price?.unit_amount || 0) / 100;
                const interval = item.price?.recurring?.interval || 'month';
                
                let monthlyAmount = amount;
                if (interval === 'year') {
                  monthlyAmount = amount / 12;
                }
                
                totalMrr += monthlyAmount;
                activeSubsCount++;
              });
            }
          });
          
          setMrr(totalMrr);
          setActiveSubscriptionsCount(activeSubsCount);
        } catch (subError) {
          console.log('Subscriptions data not available yet (indexes may still be building):', subError);
        }

        // Load pending accounts count
        try {
          const pendingQuery = query(
            collection(db, 'users'),
            where('accountActivated', '==', false)
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          setPendingAccountsCount(pendingSnapshot.size);
        } catch (pendingError) {
          console.log('Pending accounts data not available yet (indexes may still be building):', pendingError);
        }

        // Load failed payments count
        try {
          const failedInvoicesQuery = query(
            collectionGroup(db, 'invoices'),
            where('status', 'in', ['open', 'uncollectible']),
            limit(50)
          );
          const failedSnapshot = await getDocs(failedInvoicesQuery);
          setFailedPaymentsCount(failedSnapshot.size);
        } catch (invoiceError) {
          console.log('Invoice data not available yet (indexes may still be building):', invoiceError);
        }

      } catch (error) {
        console.error('Error loading financial metrics:', error);
        // Don't throw - allow dashboard to load even if financial metrics fail
      }
    };

    fetchData();
  }, [user, userData, authLoading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading trainer dashboard...</div>
      </div>
    );
  }

  // Compute real client metrics from loaded data
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = formatDateISO(sevenDaysAgo);

  // Tier breakdown
  const tierCounts = {
    inPerson: clients.filter(c => c.tier === SUBSCRIPTION_TIERS.IN_PERSON_4PACK).length,
    online: clients.filter(c => c.tier === SUBSCRIPTION_TIERS.ONLINE_COACHING).length,
    complete: clients.filter(c => c.tier === SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION).length,
    noTier: clients.filter(c => !c.tier).length,
  };

  // New clients: added last week and last month
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const newClientsLastWeek = clients.filter(c => c.createdAt && c.createdAt >= sevenDaysAgo).length;
  const newClientsLastMonth = clients.filter(c => c.createdAt && c.createdAt >= thirtyDaysAgo).length;

  // Logged in last 7 days: clients with lastLoginAt within 7 days
  const loggedInLast7Days = clients.filter(c => c.lastLoginAt && c.lastLoginAt >= sevenDaysAgo).length;

  // Needs attention: clients with overdue workouts (dueDate < now && status still 'scheduled')
  const overdueWorkouts = assignments.filter(a => {
    if (a.status !== 'scheduled') return false;
    if (!a.dueDate) return false;
    const dueDate = a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate);
    return dueDate < now;
  });
  // Get unique clients with overdue workouts
  const clientsWithOverdueWorkouts = new Set(overdueWorkouts.map(a => a.clientId));

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="overview" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Trainer Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Manage your clients, workouts, and track progress</p>
          </div>

          {/* Upcoming Sessions & Meetings */}
          {user && <UpcomingSessionsCard trainerId={user.uid} />}

          {/* Dashboard Stats */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Client Metrics</h3>
              <Link href="/dashboard/trainer/client-hub">
                <Button variant="outline" size="sm">
                  View All Clients
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Clients with tier breakdown */}
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Clients</p>
                    <p className="text-xl font-bold text-gray-900">{clients.length}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {tierCounts.inPerson} IPT
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {tierCounts.online} OC
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    {tierCounts.complete} CT
                  </span>
                </div>
              </div>

              {/* Card 2: New Clients */}
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">New Clients</p>
                    <p className="text-xl font-bold text-gray-900">+{newClientsLastMonth}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    {newClientsLastWeek} this week
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">
                    {newClientsLastMonth} this month
                  </span>
                </div>
              </div>

              {/* Card 3: Logged In (7d) */}
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Logged In (7d)</p>
                    <p className="text-xl font-bold text-gray-900">
                      {loggedInLast7Days}
                      <span className="text-sm font-normal text-gray-500"> / {clients.length}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {clients.length > 0 ? Math.round((loggedInLast7Days / clients.length) * 100) : 0}% engagement
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Needs Attention (overdue workouts) */}
              <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow ${
                clientsWithOverdueWorkouts.size > 0 ? 'border-orange-300 bg-orange-50' : ''
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    clientsWithOverdueWorkouts.size > 0 ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <AlertCircle className={`h-5 w-5 ${
                      clientsWithOverdueWorkouts.size > 0 ? 'text-orange-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Needs Attention</p>
                    <p className="text-xl font-bold text-gray-900">
                      {clientsWithOverdueWorkouts.size} {clientsWithOverdueWorkouts.size === 1 ? 'client' : 'clients'}
                    </p>
                    <p className="text-xs text-gray-500">behind on workouts</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Stats Row - Admin Only */}
          <AdminOnlySection 
            title="Business Metrics" 
            canAccessAdminDashboard={canAccessAdminDashboard || false}
          >
            <div className="flex justify-end mb-4">
              <Link href="/dashboard/trainer/business">
                <Button variant="outline" size="sm">
                  View All Metrics
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/trainer/business">
                <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">MRR</p>
                      <p className="text-xl font-bold text-gray-900">${mrr.toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/trainer/pending-accounts">
                <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  pendingAccountsCount > 10 ? 'border-orange-300 bg-orange-50' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      pendingAccountsCount > 10 ? 'bg-orange-100' : 'bg-yellow-100'
                    }`}>
                      <Clock className={`h-5 w-5 ${
                        pendingAccountsCount > 10 ? 'text-orange-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pending Accounts</p>
                      <p className="text-xl font-bold text-gray-900">
                        {pendingAccountsCount}
                        {pendingAccountsCount > 10 && <span className="text-orange-600"> ⚠️</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/trainer/business">
                <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                  failedPaymentsCount > 0 ? 'border-red-300 bg-red-50' : ''
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      failedPaymentsCount > 0 ? 'bg-red-100' : 'bg-gray-100'
                    }`}>
                      <AlertCircle className={`h-5 w-5 ${
                        failedPaymentsCount > 0 ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Failed Payments</p>
                      <p className="text-xl font-bold text-gray-900">{failedPaymentsCount}</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/trainer/business">
                <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Active Subscriptions</p>
                      <p className="text-xl font-bold text-gray-900">{activeSubscriptionsCount}</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </AdminOnlySection>

          {/* Pending Accounts Alert - Admin Only */}
          {canAccessAdminDashboard && pendingAccountsCount > 10 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">
                    High Number of Pending Accounts
                  </h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    You have <strong>{pendingAccountsCount}</strong> pending accounts that haven't completed payment.
                  </p>
                  <Link href="/dashboard/trainer/pending-accounts">
                    <Button variant="outline" size="sm" className="mt-2 border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                      Review Pending Accounts
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/trainer/workouts/create">
                <Button className="w-full justify-start h-auto p-4 flex-col items-start bg-white hover:bg-gray-50 text-gray-900 border border-gray-200">
                  <Plus className="h-5 w-5 mb-2 text-purple-600" />
                  <span className="font-semibold">Create New Workout</span>
                  <span className="text-sm text-gray-600 mt-1">Build a custom workout template</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/trainer/client-hub">
                <Button
                  variant="outline" 
                  className="w-full justify-start h-auto p-4 flex-col items-start bg-white hover:bg-gray-50"
                >
                  <Users className="h-5 w-5 mb-2 text-blue-600" />
                  <span className="font-semibold">Manage Clients</span>
                  <span className="text-sm text-gray-600 mt-1">View and manage your clients</span>
                </Button>
              </Link>
              
              <Link href="/dashboard/trainer/assignments">
                <Button variant="outline" className="w-full justify-start h-auto p-4 flex-col items-start bg-white hover:bg-gray-50">
                  <TrendingUp className="h-5 w-5 mb-2 text-green-600" />
                  <span className="font-semibold">View Progress</span>
                  <span className="text-sm text-gray-600 mt-1">Check client workout completion</span>
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
                <Link href="/dashboard/trainer/client-hub">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </div>
              <div className="space-y-4">
                {(() => {
                  const activeClients = clients
                    .filter(client => client.lastWorkout) // Only clients with completed workouts
                    .sort((a, b) => (b.lastWorkout?.getTime() || 0) - (a.lastWorkout?.getTime() || 0)) // Sort by most recent
                    .slice(0, 5); // Show top 5

                  if (activeClients.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No recent workout activity</p>
                      </div>
                    );
                  }

                  return activeClients.map((client) => (
                    <div key={client.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                        {client.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-gray-600">
                          Completed workout {formatDistanceToNow(client.lastWorkout!, { addSuffix: true })}
                        </p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                  ));
                })()}
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
                    const dueDate = assignment.dueDate instanceof Date ? assignment.dueDate : 
                                   (assignment.dueDate ? new Date(assignment.dueDate) : null);
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
                            {assignment.name || 'Workout'} - {client?.name || 'Unknown Client'}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
