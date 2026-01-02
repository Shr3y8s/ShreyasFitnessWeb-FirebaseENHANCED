'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft,
  TrendingUp,
  Clock,
  Calendar,
  Flame,
  Dumbbell,
  BarChart3,
  Activity,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface ClientData {
  id: string;
  name: string;
  email: string;
  profilePhotoSmall?: string;
}

interface DurationMetrics {
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  workoutCount: number;
}

export default function ClientTrainingDashboard() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  
  // Analytics metrics state
  const [durationMetrics, setDurationMetrics] = useState<DurationMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      if (!clientId) {
        router.push('/dashboard/trainer/client-hub');
        return;
      }
      
      try {
        const clientRef = doc(db, 'users', clientId);
        const clientSnap = await getDoc(clientRef);
        
        if (!clientSnap.exists()) {
          console.error('Client not found');
          router.push('/dashboard/trainer/client-hub');
          return;
        }
        
        const data = clientSnap.data();
        setClientData({
          id: clientSnap.id,
          name: data.name,
          email: data.email,
          profilePhotoSmall: data.profilePhotoSmall
        });
      } catch (error) {
        console.error('Error fetching client:', error);
        router.push('/dashboard/trainer/client-hub');
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [user, router, authLoading, canAccessTrainerDashboard, clientId]);

  // Fetch duration metrics
  useEffect(() => {
    const fetchDurationMetrics = async () => {
      if (!clientId) return;
      
      try {
        setMetricsLoading(true);
        
        // Calculate date 4 weeks ago
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        
        // Fetch workout executions for last 4 weeks
        const executionsRef = collection(db, 'workoutExecutions');
        const q = query(
          executionsRef,
          where('clientId', '==', clientId),
          where('completionStatus', '==', 'completed'),
          where('completedAt', '>=', fourWeeksAgo)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setDurationMetrics({
            avgDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            workoutCount: 0
          });
          return;
        }
        
        // Extract durations
        const durations = snapshot.docs
          .map(doc => doc.data().durationMinutes)
          .filter(d => d > 0);
        
        if (durations.length === 0) {
          setDurationMetrics({
            avgDuration: 0,
            minDuration: 0,
            maxDuration: 0,
            workoutCount: 0
          });
          return;
        }
        
        // Calculate metrics
        const sum = durations.reduce((acc, dur) => acc + dur, 0);
        const avg = Math.round(sum / durations.length);
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        setDurationMetrics({
          avgDuration: avg,
          minDuration: min,
          maxDuration: max,
          workoutCount: durations.length
        });
      } catch (error) {
        console.error('Error fetching duration metrics:', error);
        setDurationMetrics({
          avgDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          workoutCount: 0
        });
      } finally {
        setMetricsLoading(false);
      }
    };

    if (clientData) {
      fetchDurationMetrics();
    }
  }, [clientId, clientData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading client data...</div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Client not found</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="client-hub" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-2">
            <Breadcrumb items={[
              { label: 'Client Management' },
              { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
              { label: clientData.name, href: `/dashboard/trainer/client-hub/${clientId}` },
              { label: 'Training Dashboard' }
            ]} />
          </div>
          
          {/* Back Button */}
          <Link 
            href={`/dashboard/trainer/client-hub/${clientId}`}
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client Hub
          </Link>

          {/* Client Header */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              {clientData.profilePhotoSmall ? (
                <img
                  src={clientData.profilePhotoSmall}
                  alt={clientData.name}
                  className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {clientData.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{clientData.name} - Training Analytics</h1>
                <p className="text-gray-600">Historical trends and progression insights for data-driven programming</p>
              </div>
            </div>
          </div>

          {/* SECTION 1: Analytics Summary Cards */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Analytics Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Avg Workout Duration */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Avg Workout Duration</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                {metricsLoading ? (
                  <div className="mb-3">
                    <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ) : durationMetrics && durationMetrics.workoutCount > 0 ? (
                  <>
                    <div className="mb-3">
                      <p className="text-4xl font-bold text-gray-900">
                        {durationMetrics.avgDuration}<span className="text-lg"> min</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Range: {durationMetrics.minDuration}-{durationMetrics.maxDuration} min
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">Target: 45-60 min</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {durationMetrics.workoutCount} workout{durationMetrics.workoutCount !== 1 ? 's' : ''}
                    </p>
                    {durationMetrics.avgDuration >= 45 && durationMetrics.avgDuration <= 60 ? (
                      <p className="text-xs text-green-600 mt-1">✓ Within target range</p>
                    ) : durationMetrics.avgDuration < 45 ? (
                      <p className="text-xs text-yellow-600 mt-1">⚠ Below target</p>
                    ) : (
                      <p className="text-xs text-blue-600 mt-1">ℹ Above target</p>
                    )}
                  </>
                ) : (
                  <div className="mb-3">
                    <p className="text-2xl font-bold text-gray-400">No Data</p>
                    <p className="text-xs text-gray-500 mt-2">
                      No completed workouts in the last 4 weeks
                    </p>
                  </div>
                )}
              </Card>

              {/* Card 2: Training Streak */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Training Streak</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">&nbsp;</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">5 <span className="text-lg">days 🔥</span></p>
                </div>
                <p className="text-sm text-gray-600">Longest: 12 days</p>
                <p className="text-xs text-gray-500 mt-1">Last workout: Today</p>
              </Card>

              {/* Card 3: Volume Trend */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Volume Trend</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-green-600">↑ +12%</p>
                </div>
                <p className="text-sm text-gray-600">This: 58,500 lbs</p>
                <p className="text-xs text-gray-500 mt-1">Prev: 52,000 lbs</p>
              </Card>

              {/* Card 4: Personal Records */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Personal Records</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">This Month</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">3 <span className="text-lg">PRs 🎉</span></p>
                </div>
                <p className="text-sm text-gray-600">Bench: 200 (+5)</p>
                <p className="text-xs text-gray-500 mt-1">Deadlift: 315 (+10)</p>
              </Card>
            </div>
          </div>

          {/* SECTION 2: Performance Metrics & Trends */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Performance Metrics & Trends</h2>
            <div className="bg-white rounded-xl border p-6">
              <Tabs defaultValue="strength" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="strength" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Strength
                  </TabsTrigger>
                  <TabsTrigger value="volume" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Volume
                  </TabsTrigger>
                  <TabsTrigger value="consistency" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Consistency
                  </TabsTrigger>
                  <TabsTrigger value="completion" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Completion
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="strength">
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-2">Strength Progression Chart</h3>
                    <p className="text-sm text-gray-600">Track weight progression for key exercises over time</p>
                    <p className="text-xs text-gray-500 mt-4">(Phase 3: Chart implementation)</p>
                  </div>
                </TabsContent>

                <TabsContent value="volume">
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-2">Weekly Training Volume</h3>
                    <p className="text-sm text-gray-600">Total training volume over time (Sets × Reps × Weight)</p>
                    <p className="text-xs text-gray-500 mt-4">(Phase 3: Chart implementation)</p>
                  </div>
                </TabsContent>

                <TabsContent value="consistency">
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-2">Workout Consistency Heatmap</h3>
                    <p className="text-sm text-gray-600">90-day calendar view with completion patterns</p>
                    <p className="text-xs text-gray-500 mt-4">(Phase 3: Heatmap implementation)</p>
                  </div>
                </TabsContent>

                <TabsContent value="completion">
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <h3 className="font-semibold text-gray-700 mb-2">Exercise Completion Rates</h3>
                    <p className="text-sm text-gray-600">Which exercises are completed vs frequently skipped</p>
                    <p className="text-xs text-gray-500 mt-4">(Phase 3: Bar chart implementation)</p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Development Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>📝 Phase 1:</strong> Core structure with placeholder data. Analytics cards show static values to demonstrate layout.
              <br />
              <strong>Next:</strong> Phase 2 will implement real data calculations for all metrics.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
