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

interface StreakMetrics {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: Date | null;
}

interface VolumeMetrics {
  currentVolume: number;
  previousVolume: number;
  percentChange: number;
  trend: 'up' | 'down' | 'stable';
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
  const [streakMetrics, setStreakMetrics] = useState<StreakMetrics | null>(null);
  const [streakLoading, setStreakLoading] = useState(true);
  const [volumeMetrics, setVolumeMetrics] = useState<VolumeMetrics | null>(null);
  const [volumeLoading, setVolumeLoading] = useState(true);

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

  // Helper: Extract unique workout dates from executions
  const getUniqueDates = (executions: any[]): string[] => {
    const dateSet = new Set<string>();
    
    for (const exec of executions) {
      if (exec.completedAt && typeof exec.completedAt.toDate === 'function') {
        const date = exec.completedAt.toDate();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        dateSet.add(dateStr);
      }
    }
    
    return Array.from(dateSet).sort();
  };

  // Helper: Calculate current streak
  const calculateCurrentStreak = (sortedDates: string[]): number => {
    if (sortedDates.length === 0) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if streak is active (last workout was today or yesterday)
    const latestDate = sortedDates[sortedDates.length - 1];
    if (latestDate !== todayStr && latestDate !== yesterdayStr) {
      return 0; // Streak is broken
    }
    
    // Count consecutive days backward
    let streak = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const currentDate = new Date(sortedDates[i + 1] + 'T00:00:00');
      const prevDate = new Date(sortedDates[i] + 'T00:00:00');
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === 1) {
        streak++;
      } else {
        break; // Streak broken
      }
    }
    
    return streak;
  };

  // Helper: Calculate longest streak in history
  const calculateLongestStreak = (sortedDates: string[]): number => {
    if (sortedDates.length === 0) return 0;
    
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i] + 'T00:00:00');
      const prevDate = new Date(sortedDates[i - 1] + 'T00:00:00');
      const daysDiff = Math.floor((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysDiff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1; // Reset streak
      }
    }
    
    return maxStreak;
  };

  // Helper: Calculate volume from a single exercise
  const calculateExerciseVolume = (exercise: any): number => {
    // Only calculate volume for strength exercises
    if (exercise.exerciseType !== 'strength') return 0;
    
    let totalVolume = 0;
    
    // Use plannedConfiguration.sets for volume calculation
    if (exercise.plannedConfiguration?.sets && Array.isArray(exercise.plannedConfiguration.sets)) {
      for (const set of exercise.plannedConfiguration.sets) {
        const weight = set.weight || 0;
        
        // Calculate reps as average of repsRange
        let reps = 0;
        if (set.repsRange?.min && set.repsRange?.max) {
          reps = (set.repsRange.min + set.repsRange.max) / 2;
        }
        
        // Volume = weight × reps
        totalVolume += weight * reps;
      }
    }
    
    return totalVolume;
  };

  // Helper: Calculate total volume from a workout execution
  const calculateWorkoutVolume = (execution: any): number => {
    if (!execution.exercises || !Array.isArray(execution.exercises)) {
      return 0;
    }
    
    let totalVolume = 0;
    for (const exercise of execution.exercises) {
      totalVolume += calculateExerciseVolume(exercise);
    }
    
    return totalVolume;
  };

  // Fetch volume metrics
  useEffect(() => {
    const fetchVolumeMetrics = async () => {
      if (!clientId) return;
      
      try {
        setVolumeLoading(true);
        
        // Calculate date ranges
        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const eightWeeksAgo = new Date(now);
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
        
        // Fetch last 8 weeks of completed workouts
        const executionsRef = collection(db, 'workoutExecutions');
        const q = query(
          executionsRef,
          where('clientId', '==', clientId),
          where('completionStatus', '==', 'completed'),
          where('completedAt', '>=', eightWeeksAgo)
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setVolumeMetrics({
            currentVolume: 0,
            previousVolume: 0,
            percentChange: 0,
            trend: 'stable'
          });
          return;
        }
        
        // Separate workouts into current and previous periods
        let currentPeriodVolume = 0;
        let previousPeriodVolume = 0;
        
        for (const doc of snapshot.docs) {
          const execution = doc.data();
          const completedAt = execution.completedAt?.toDate();
          
          if (!completedAt) continue;
          
          const volume = calculateWorkoutVolume(execution);
          
          if (completedAt >= fourWeeksAgo) {
            // Current period (last 4 weeks)
            currentPeriodVolume += volume;
          } else {
            // Previous period (weeks 5-8)
            previousPeriodVolume += volume;
          }
        }
        
        // Calculate percent change
        let percentChange = 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        
        if (previousPeriodVolume > 0) {
          percentChange = Math.round(
            ((currentPeriodVolume - previousPeriodVolume) / previousPeriodVolume) * 100
          );
          
          if (percentChange > 2) trend = 'up';
          else if (percentChange < -2) trend = 'down';
          else trend = 'stable';
        } else if (currentPeriodVolume > 0) {
          // No previous data but have current data
          percentChange = 100;
          trend = 'up';
        }
        
        setVolumeMetrics({
          currentVolume: Math.round(currentPeriodVolume),
          previousVolume: Math.round(previousPeriodVolume),
          percentChange,
          trend
        });
      } catch (error) {
        console.error('Error fetching volume metrics:', error);
        setVolumeMetrics({
          currentVolume: 0,
          previousVolume: 0,
          percentChange: 0,
          trend: 'stable'
        });
      } finally {
        setVolumeLoading(false);
      }
    };

    if (clientData) {
      fetchVolumeMetrics();
    }
  }, [clientId, clientData]);

  // Fetch streak metrics
  useEffect(() => {
    const fetchStreakMetrics = async () => {
      if (!clientId) return;
      
      try {
        setStreakLoading(true);
        
        // Fetch ALL completed workout executions (no date filter for longest streak)
        const executionsRef = collection(db, 'workoutExecutions');
        const q = query(
          executionsRef,
          where('clientId', '==', clientId),
          where('completionStatus', '==', 'completed'),
          orderBy('completedAt', 'asc')
        );
        
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setStreakMetrics({
            currentStreak: 0,
            longestStreak: 0,
            lastWorkoutDate: null
          });
          return;
        }
        
        // Extract execution data
        const executions = snapshot.docs.map(doc => doc.data());
        
        // Get unique workout dates
        const uniqueDates = getUniqueDates(executions);
        
        if (uniqueDates.length === 0) {
          setStreakMetrics({
            currentStreak: 0,
            longestStreak: 0,
            lastWorkoutDate: null
          });
          return;
        }
        
        // Calculate streaks
        const currentStreak = calculateCurrentStreak(uniqueDates);
        const longestStreak = calculateLongestStreak(uniqueDates);
        
        // Get last workout date
        const lastExecution = executions[executions.length - 1];
        const lastWorkoutDate = lastExecution.completedAt && typeof lastExecution.completedAt.toDate === 'function'
          ? lastExecution.completedAt.toDate()
          : null;
        
        setStreakMetrics({
          currentStreak,
          longestStreak,
          lastWorkoutDate
        });
      } catch (error) {
        console.error('Error fetching streak metrics:', error);
        setStreakMetrics({
          currentStreak: 0,
          longestStreak: 0,
          lastWorkoutDate: null
        });
      } finally {
        setStreakLoading(false);
      }
    };

    if (clientData) {
      fetchStreakMetrics();
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
                {streakLoading ? (
                  <div className="mb-3">
                    <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ) : streakMetrics ? (
                  <>
                    <div className="mb-3">
                      {streakMetrics.currentStreak > 0 ? (
                        <p className="text-4xl font-bold text-gray-900">
                          {streakMetrics.currentStreak} <span className="text-lg">day{streakMetrics.currentStreak !== 1 ? 's' : ''} 🔥</span>
                        </p>
                      ) : (
                        <p className="text-2xl font-bold text-gray-400">No Streak</p>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      Longest: {streakMetrics.longestStreak} day{streakMetrics.longestStreak !== 1 ? 's' : ''}
                    </p>
                    {streakMetrics.lastWorkoutDate ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Last workout: {(() => {
                          const lastWorkout = streakMetrics.lastWorkoutDate;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const workoutDate = new Date(lastWorkout);
                          workoutDate.setHours(0, 0, 0, 0);
                          
                          const daysDiff = Math.floor((today.getTime() - workoutDate.getTime()) / (24 * 60 * 60 * 1000));
                          
                          if (daysDiff === 0) return 'Today';
                          if (daysDiff === 1) return 'Yesterday';
                          return `${daysDiff} days ago`;
                        })()}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">No workouts yet</p>
                    )}
                  </>
                ) : (
                  <div className="mb-3">
                    <p className="text-2xl font-bold text-gray-400">No Data</p>
                  </div>
                )}
              </Card>

              {/* Card 3: Volume Trend */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Volume Trend</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                {volumeLoading ? (
                  <div className="mb-3">
                    <div className="h-12 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ) : volumeMetrics && (volumeMetrics.currentVolume > 0 || volumeMetrics.previousVolume > 0) ? (
                  <>
                    <div className="mb-3">
                      {volumeMetrics.trend === 'up' ? (
                        <p className="text-4xl font-bold text-green-600">
                          ↑ +{volumeMetrics.percentChange}%
                        </p>
                      ) : volumeMetrics.trend === 'down' ? (
                        <p className="text-4xl font-bold text-red-600">
                          ↓ {volumeMetrics.percentChange}%
                        </p>
                      ) : (
                        <p className="text-4xl font-bold text-gray-600">
                          → {volumeMetrics.percentChange}%
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      This: {volumeMetrics.currentVolume.toLocaleString()} lbs
                    </p>
                    {volumeMetrics.previousVolume > 0 ? (
                      <p className="text-xs text-gray-500 mt-1">
                        Prev: {volumeMetrics.previousVolume.toLocaleString()} lbs
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">
                        No previous period data
                      </p>
                    )}
                  </>
                ) : (
                  <div className="mb-3">
                    <p className="text-2xl font-bold text-gray-400">No Data</p>
                    <p className="text-xs text-gray-500 mt-2">
                      No strength training data in the last 8 weeks
                    </p>
                  </div>
                )}
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
                <p className="text-xs text-gray-400 italic mt-3 pt-2 border-t border-gray-200">
                  Mock data - Coming soon with performance tracking
                </p>
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
