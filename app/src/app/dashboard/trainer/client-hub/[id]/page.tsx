'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Dumbbell, 
  Apple, 
  TrendingUp, 
  MessageSquare, 
  User,
  ArrowLeft,
  Shield,

  CreditCard,
  Receipt,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Calendar,
  Target
} from 'lucide-react';
import Link from 'next/link';
import { LoginHistoryCard } from '@/components/security/LoginHistoryCard';
import { AdminOnlySection } from '@/components/dashboard/AdminOnlySection';
import PurchaseHistory from '@/components/sessions/PurchaseHistory';
import { VisionEditor } from '@/components/trainer/plan/VisionEditor';
import { StepGoalEditor } from '@/components/trainer/plan/StepGoalEditor';
import { WaterGoalEditor } from '@/components/trainer/plan/WaterGoalEditor';
import { LissCardioEditor } from '@/components/trainer/plan/LissCardioEditor';
import { WeeklyFocusEditor } from '@/components/trainer/plan/WeeklyFocusEditor';
import { DailyHabitsEditor } from '@/components/trainer/plan/DailyHabitsEditor';
import { TrainingPhaseEditor } from '@/components/trainer/plan/TrainingPhaseEditor';
import { TrainingProtocolEditor } from '@/components/trainer/plan/TrainingProtocolEditor';
import { NutritionProtocolEditor } from '@/components/trainer/plan/NutritionProtocolEditor';
import { GoalsManagementPanel } from '@/components/trainer/goals/GoalsManagementPanel';
import { OnboardingMilestoneManager } from '@/components/trainer/onboarding/OnboardingMilestoneManager';
import ClientActivityFeed from '@/components/trainer/activity-feed/ClientActivityFeed';
import { ClientProgressDashboard } from '@/components/trainer/client-progress/ClientProgressDashboard';
import { ClientNutritionDashboard } from '@/components/trainer/client-progress/ClientNutritionDashboard';
import {
  fetchClientBillingData, 
  formatCurrency, 
  formatDate,
  getPaymentMethodDisplay,
  type BillingData 
} from '@/lib/billing-utils';
import {
  subscribeToSessionBalance,
  subscribeToUpcomingSessions,
  getSessionLocation,
  formatSessionDate,
  formatSessionTimeRange
} from '@/lib/session-utils';
import { SessionPackage, TrainingSession } from '@/types/session';
import { 
  getClientPlan, 
  updateVision, 
  updateStepGoal, 
  updateWaterGoal, 
  updateLissCardio, 
  updateWeeklyFocus, 
  updateDailyHabits, 
  removeLissCardio 
} from '@/lib/plan-api';
import { 
  ClientPlan, 
  VisionData, 
  StepGoalData, 
  WaterGoalData, 
  LissCardioData, 
  WeeklyFocusData, 
  DailyHabitsData 
} from '@/types/plan';

type TabType = 'overview' | 'onboarding' | 'plan' | 'training' | 'nutrition' | 'progress' | 'support' | 'account' | 'goals';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Billing state for Account tab
  const [clientBillingData, setClientBillingData] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  
  // Session state for Account tab
  const [sessionBalance, setSessionBalance] = useState<any | null>(null);
  const [sessionPackages, setSessionPackages] = useState<SessionPackage[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Messages state for Support tab
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Check-ins state for Support tab
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);

  // Training state for Training tab
  const [workoutAssignments, setWorkoutAssignments] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([]);
  const [upcomingCheckins, setUpcomingCheckins] = useState<TrainingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<TrainingSession[]>([]);
  const [completedCheckins, setCompletedCheckins] = useState<TrainingSession[]>([]);
  const [sessionLocations, setSessionLocations] = useState<Map<string, string>>(new Map());
  const [checkinLocations, setCheckinLocations] = useState<Map<string, string>>(new Map());
  const [completedSessionLocations, setCompletedSessionLocations] = useState<Map<string, string>>(new Map());
  const [completedCheckinLocations, setCompletedCheckinLocations] = useState<Map<string, string>>(new Map());
  const [trainingLoading, setTrainingLoading] = useState(false);

  // Metrics state for performance overview cards
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    workoutAssignments: {
      lastMonth: { completed: 0, total: 0, onTime: 0 },
      last3Months: { completed: 0, total: 0, onTime: 0 }
    },
    trainingSessions: {
      lastMonth: { completed: 0, total: 0, onTime: 0 },
      last3Months: { completed: 0, total: 0, onTime: 0 }
    },
    checkIns: {
      lastMonth: { completed: 0, total: 0, onTime: 0 },
      last3Months: { completed: 0, total: 0, onTime: 0 }
    }
  });

  // Plan state for Plan tab
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [savingVision, setSavingVision] = useState(false);
  const [savingStepGoal, setSavingStepGoal] = useState(false);
  const [savingWaterGoal, setSavingWaterGoal] = useState(false);
  const [savingLissCardio, setSavingLissCardio] = useState(false);
  // 4-week LISS cardio adherence (loaded when cardio tab is viewed)
  const [cardioAdherence, setCardioAdherence] = useState<{ weekLabel: string; start: string; end: string; count: number; target: number }[]>([]);
  const [cardioAdherenceLoading, setCardioAdherenceLoading] = useState(false);
  const [savingWeeklyFocus, setSavingWeeklyFocus] = useState(false);
  const [savingDailyHabits, setSavingDailyHabits] = useState(false);

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
          ...data
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

  // Fetch billing data when active client changes (for Account tab)
  useEffect(() => {
    if (!activeTab || activeTab !== 'account' || !clientId) {
      return;
    }

    const fetchBillingData = async () => {
      setBillingLoading(true);
      setBillingError(null);
      
      try {
        const billingData = await fetchClientBillingData(clientId);
        setClientBillingData(billingData);
      } catch (error) {
        console.error('[Client Hub] Error fetching billing data:', error);
        setBillingError('Failed to load billing information');
        setClientBillingData(null);
      } finally {
        setBillingLoading(false);
      }
    };

    fetchBillingData();
  }, [activeTab, clientId]);

  // Subscribe to session data when on Account tab
  useEffect(() => {
    if (!user || !clientId || activeTab !== 'account') {
      return;
    }

    setSessionLoading(true);

    const unsubscribeBalance = subscribeToSessionBalance(
      clientId,
      (balance, packages) => {
        setSessionBalance(balance);
        setSessionPackages(packages);
        setSessionLoading(false);
      }
    );

    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribeBalance);

    return () => {
      unregisterListener(unsubscribeBalance);
      unsubscribeBalance();
    };
  }, [activeTab, clientId, user]);

  // Subscribe to recent messages when on Support tab
  useEffect(() => {
    if (!user || !clientId || activeTab !== 'support') {
      return;
    }

    setMessagesLoading(true);

    const conversationId = [clientId, user.uid].sort().join('_');
    
    const messagesQuery = query(
      collection(db, 'client_messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      setRecentMessages(messages);
      setMessagesLoading(false);
    }, (error) => {
      console.error('Error fetching messages:', error);
      setRecentMessages([]);
      setMessagesLoading(false);
    });

    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [activeTab, clientId, user]);

  // Subscribe to recent check-ins when on Support tab
  useEffect(() => {
    if (!user || !clientId || activeTab !== 'support') {
      return;
    }

    setCheckinsLoading(true);
    
    const checkinsQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      orderBy('scheduledDate', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(checkinsQuery, (snapshot) => {
      const checkins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
      }));
      setRecentCheckins(checkins);
      setCheckinsLoading(false);
    }, (error) => {
      console.error('Error fetching check-ins:', error);
      setRecentCheckins([]);
      setCheckinsLoading(false);
    });

    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [activeTab, clientId, user]);

  // Fetch plan data when on Plan tab
  useEffect(() => {
    if (!clientId || activeTab !== 'plan') {
      return;
    }

    const loadPlanData = async () => {
      setPlanLoading(true);
      try {
        const planData = await getClientPlan(clientId);
        setPlan(planData);
      } catch (error) {
        console.error('Error loading plan data:', error);
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlanData();
  }, [activeTab, clientId]);

  // Load 4-week LISS cardio adherence when plan has lissCardio assigned
  useEffect(() => {
    if (!clientId || !plan?.lissCardio?.frequency) {
      setCardioAdherence([]);
      return;
    }

    const loadCardioAdherence = async () => {
      setCardioAdherenceLoading(true);
      try {
        const { getActivityLogsForDateRange } = await import('@/lib/activity-api');
        const today = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        // Parse weekly target
        const freqMatch = (plan.lissCardio?.frequency || '').match(/^(\d+)/);
        const target = freqMatch ? parseInt(freqMatch[1], 10) : 1;
        const weeks: { weekLabel: string; start: string; end: string; count: number; target: number }[] = [];
        for (let w = 0; w < 4; w++) {
          // For w=0: current week (Mon-Sun), w=1: last week, etc.
          const dayOfWeek = today.getDay(); // 0=Sun
          const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          const weekMon = new Date(today);
          weekMon.setDate(today.getDate() + diffToMon - w * 7);
          const weekSun = new Date(weekMon);
          weekSun.setDate(weekMon.getDate() + 6);
          const startStr = fmt(weekMon);
          const endStr = fmt(weekSun);
          const logs = await getActivityLogsForDateRange(clientId, startStr, endStr);
          const count = logs.filter(l => l.cardio === true).length;
          const label = w === 0 ? 'This week' : w === 1 ? 'Last week' :
            `${weekMon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
          weeks.push({ weekLabel: label, start: startStr, end: endStr, count, target });
        }
        setCardioAdherence(weeks);
      } catch {
        setCardioAdherence([]);
      } finally {
        setCardioAdherenceLoading(false);
      }
    };

    loadCardioAdherence();
  }, [clientId, plan?.lissCardio?.frequency]);

  // Fetch workout assignments and subscribe to sessions when on Training or Overview tab
  useEffect(() => {
    if (!user || !clientId || (activeTab !== 'training' && activeTab !== 'overview')) {
      if (activeTab !== 'overview') {
        setUpcomingSessions([]);
      }
      return;
    }

    const fetchTrainingData = async () => {
      setTrainingLoading(true);
      setMetricsLoading(true);
      
      try {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        
        // Helper to check if date is same day
        const isSameDay = (date1: Date, date2: Date) => {
          return date1.getFullYear() === date2.getFullYear() &&
                 date1.getMonth() === date2.getMonth() &&
                 date1.getDate() === date2.getDate();
        };

        // Query for Recently Completed workouts (use completedAt)
        const completedWorkoutsQuery = query(
          collection(db, 'workouts'),
          where('clientId', '==', clientId),
          where('trainerId', '==', user.uid),
          where('status', '==', 'completed'),
          orderBy('completedAt', 'desc'),
          limit(5)
        );
        
        // Query for Upcoming/Scheduled workouts (use dueDate for scheduling)
        const upcomingWorkoutsQuery = query(
          collection(db, 'workouts'),
          where('clientId', '==', clientId),
          where('trainerId', '==', user.uid),
          where('status', 'in', ['scheduled', 'started']),
          orderBy('dueDate', 'asc'),
          limit(10)
        );
        
        const trainingSessionsQuery = query(
          collection(db, 'sessions'),
          where('clientId', '==', clientId),
          where('sessionType', '==', 'training'),
          where('scheduledDate', '>=', Timestamp.fromDate(threeMonthsAgo))
        );

        const checkInSessionsQuery = query(
          collection(db, 'sessions'),
          where('clientId', '==', clientId),
          where('sessionType', '==', 'checkin'),
          where('scheduledDate', '>=', Timestamp.fromDate(threeMonthsAgo))
        );

        // Execute all queries in parallel
        const [completedSnapshot, upcomingSnapshot, trainingSnaps, checkInSnaps] = await Promise.all([
          getDocs(completedWorkoutsQuery),
          getDocs(upcomingWorkoutsQuery),
          getDocs(trainingSessionsQuery),
          getDocs(checkInSessionsQuery)
        ]);

        // Process completed workouts
        const completedWorkouts = completedSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Workout',
            clientId: data.clientId,
            templateId: data.workoutTemplateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes
          };
        });
        
        // Process upcoming workouts
        const upcomingWorkouts = upcomingSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Workout',
            clientId: data.clientId,
            templateId: data.workoutTemplateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedAt?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate() || null,
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes
          };
        });
        
        // Combine all workouts for state
        const allWorkouts = [...completedWorkouts, ...upcomingWorkouts];
        setWorkoutAssignments(allWorkouts);

        // Calculate workout metrics (use combined snapshots)
        let wo1mCompleted = 0, wo1mTotal = 0, wo1mOnTime = 0;
        let wo3mCompleted = 0, wo3mTotal = 0, wo3mOnTime = 0;
        
        // Process both completed and upcoming for metrics
        [...completedSnapshot.docs, ...upcomingSnapshot.docs].forEach((doc) => {
          const data = doc.data();
          const dueDate = data.dueDate?.toDate();
          const completedAt = data.completedAt?.toDate();
          const status = data.status;
          
          if (!dueDate) return;
          
          // Count for 3 months
          wo3mTotal++;
          if (status === 'completed') {
            wo3mCompleted++;
            if (completedAt && completedAt <= dueDate) {
              wo3mOnTime++;
            }
          }
          
          // Also count for 1 month if within range
          if (dueDate >= oneMonthAgo) {
            wo1mTotal++;
            if (status === 'completed') {
              wo1mCompleted++;
              if (completedAt && completedAt <= dueDate) {
                wo1mOnTime++;
              }
            }
          }
        });

        // Calculate training session metrics (data already filtered by Firestore)
        let ts1mCompleted = 0, ts1mTotal = 0, ts1mOnTime = 0;
        let ts3mCompleted = 0, ts3mTotal = 0, ts3mOnTime = 0;
        
        trainingSnaps.forEach((doc) => {
          const data = doc.data();
          const scheduledDate = data.scheduledDate?.toDate();
          const completedAt = data.completedAt?.toDate();
          const status = data.status;
          
          if (!scheduledDate) return;
          
          // Count for 3 months
          ts3mTotal++;
          if (status === 'completed') {
            ts3mCompleted++;
            if (completedAt && isSameDay(completedAt, scheduledDate)) {
              ts3mOnTime++;
            }
          }
          
          // Also count for 1 month if within range
          if (scheduledDate >= oneMonthAgo) {
            ts1mTotal++;
            if (status === 'completed') {
              ts1mCompleted++;
              if (completedAt && isSameDay(completedAt, scheduledDate)) {
                ts1mOnTime++;
              }
            }
          }
        });

        // Calculate check-in session metrics (data already filtered by Firestore)
        let ci1mCompleted = 0, ci1mTotal = 0, ci1mOnTime = 0;
        let ci3mCompleted = 0, ci3mTotal = 0, ci3mOnTime = 0;
        
        checkInSnaps.forEach((doc) => {
          const data = doc.data();
          const scheduledDate = data.scheduledDate?.toDate();
          const completedAt = data.completedAt?.toDate();
          const status = data.status;
          
          if (!scheduledDate) return;
          
          // Count for 3 months
          ci3mTotal++;
          if (status === 'completed') {
            ci3mCompleted++;
            if (completedAt && isSameDay(completedAt, scheduledDate)) {
              ci3mOnTime++;
            }
          }
          
          // Also count for 1 month if within range
          if (scheduledDate >= oneMonthAgo) {
            ci1mTotal++;
            if (status === 'completed') {
              ci1mCompleted++;
              if (completedAt && isSameDay(completedAt, scheduledDate)) {
                ci1mOnTime++;
              }
            }
          }
        });

        setMetrics({
          workoutAssignments: {
            lastMonth: { completed: wo1mCompleted, total: wo1mTotal, onTime: wo1mOnTime },
            last3Months: { completed: wo3mCompleted, total: wo3mTotal, onTime: wo3mOnTime }
          },
          trainingSessions: {
            lastMonth: { completed: ts1mCompleted, total: ts1mTotal, onTime: ts1mOnTime },
            last3Months: { completed: ts3mCompleted, total: ts3mTotal, onTime: ts3mOnTime }
          },
          checkIns: {
            lastMonth: { completed: ci1mCompleted, total: ci1mTotal, onTime: ci1mOnTime },
            last3Months: { completed: ci3mCompleted, total: ci3mTotal, onTime: ci3mOnTime }
          }
        });
      } catch (error) {
        console.error('Error fetching training data:', error);
        setWorkoutAssignments([]);
      } finally {
        setTrainingLoading(false);
        setMetricsLoading(false);
      }
    };

    fetchTrainingData();

    // Subscribe to upcoming training sessions (training type only)
    const sessionsQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'training'),
      where('status', '==', 'scheduled'),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribeSessions = onSnapshot(sessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
      })) as TrainingSession[];
      setUpcomingSessions(sessions);
    }, (error) => {
      console.error('Error fetching training sessions:', error);
      setUpcomingSessions([]);
    });

    // Subscribe to upcoming check-in sessions (checkin type only)
    const checkinsQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      where('status', '==', 'scheduled'),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribeCheckins = onSnapshot(checkinsQuery, (snapshot) => {
      const checkins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
      })) as TrainingSession[];
      setUpcomingCheckins(checkins);
    }, (error) => {
      console.error('Error fetching check-ins:', error);
      setUpcomingCheckins([]);
    });

    // Subscribe to completed training sessions (last 2)
    const completedSessionsQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'training'),
      where('status', '==', 'completed'),
      orderBy('scheduledDate', 'desc'),
      limit(2)
    );

    const unsubscribeCompletedSessions = onSnapshot(completedSessionsQuery, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
      })) as TrainingSession[];
      setCompletedSessions(sessions);
    }, (error) => {
      console.error('Error fetching completed training sessions:', error);
      setCompletedSessions([]);
    });

    // Subscribe to completed check-in sessions (last 2)
    const completedCheckinsQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'checkin'),
      where('status', '==', 'completed'),
      orderBy('scheduledDate', 'desc'),
      limit(2)
    );

    const unsubscribeCompletedCheckins = onSnapshot(completedCheckinsQuery, (snapshot) => {
      const checkins = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date()
      })) as TrainingSession[];
      setCompletedCheckins(checkins);
    }, (error) => {
      console.error('Error fetching completed check-ins:', error);
      setCompletedCheckins([]);
    });

    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribeSessions);
    registerListener(unsubscribeCheckins);
    registerListener(unsubscribeCompletedSessions);
    registerListener(unsubscribeCompletedCheckins);

    return () => {
      unregisterListener(unsubscribeSessions);
      unsubscribeSessions();
      unregisterListener(unsubscribeCheckins);
      unsubscribeCheckins();
      unregisterListener(unsubscribeCompletedSessions);
      unsubscribeCompletedSessions();
      unregisterListener(unsubscribeCompletedCheckins);
      unsubscribeCompletedCheckins();
    };
  }, [activeTab, clientId, user]);

  // Fetch locations for upcoming sessions (separate effect to keep snapshot callback synchronous)
  useEffect(() => {
    if (upcomingSessions.length === 0) {
      setSessionLocations(new Map());
      return;
    }

    const fetchLocations = async () => {
      const locationMap = new Map<string, string>();
      for (const session of upcomingSessions) {
        try {
          const location = await getSessionLocation(session);
          locationMap.set(session.id, location);
        } catch (error) {
          console.error(`Error fetching location for session ${session.id}:`, error);
          locationMap.set(session.id, 'Location unavailable');
        }
      }
      setSessionLocations(locationMap);
    };

    fetchLocations();
  }, [upcomingSessions]);

  // Fetch locations for upcoming check-ins
  useEffect(() => {
    if (upcomingCheckins.length === 0) {
      setCheckinLocations(new Map());
      return;
    }

    const fetchLocations = async () => {
      const locationMap = new Map<string, string>();
      for (const checkin of upcomingCheckins) {
        try {
          const location = await getSessionLocation(checkin);
          locationMap.set(checkin.id, location);
        } catch (error) {
          console.error(`Error fetching location for check-in ${checkin.id}:`, error);
          locationMap.set(checkin.id, 'Location unavailable');
        }
      }
      setCheckinLocations(locationMap);
    };

    fetchLocations();
  }, [upcomingCheckins]);

  // Fetch locations for completed sessions
  useEffect(() => {
    if (completedSessions.length === 0) {
      setCompletedSessionLocations(new Map());
      return;
    }

    const fetchLocations = async () => {
      const locationMap = new Map<string, string>();
      for (const session of completedSessions) {
        try {
          const location = await getSessionLocation(session);
          locationMap.set(session.id, location);
        } catch (error) {
          console.error(`Error fetching location for completed session ${session.id}:`, error);
          locationMap.set(session.id, 'Location unavailable');
        }
      }
      setCompletedSessionLocations(locationMap);
    };

    fetchLocations();
  }, [completedSessions]);

  // Fetch locations for completed check-ins
  useEffect(() => {
    if (completedCheckins.length === 0) {
      setCompletedCheckinLocations(new Map());
      return;
    }

    const fetchLocations = async () => {
      const locationMap = new Map<string, string>();
      for (const checkin of completedCheckins) {
        try {
          const location = await getSessionLocation(checkin);
          locationMap.set(checkin.id, location);
        } catch (error) {
          console.error(`Error fetching location for completed check-in ${checkin.id}:`, error);
          locationMap.set(checkin.id, 'Location unavailable');
        }
      }
      setCompletedCheckinLocations(locationMap);
    };

    fetchLocations();
  }, [completedCheckins]);

  // Save handlers for Plan tab
  const handleSaveVision = async (visionData: VisionData) => {
    if (!user) return;
    
    setSavingVision(true);
    try {
      const result = await updateVision(clientId, user.uid, visionData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "Vision Saved",
          description: "Vision saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save vision. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving vision:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingVision(false);
    }
  };

  const handleSaveStepGoal = async (stepGoalData: StepGoalData) => {
    if (!user) return;
    
    setSavingStepGoal(true);
    try {
      const result = await updateStepGoal(clientId, user.uid, stepGoalData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "Step Goal Saved",
          description: "Step goal saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save step goal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving step goal:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingStepGoal(false);
    }
  };

  const handleSaveWaterGoal = async (waterGoalData: WaterGoalData) => {
    if (!user) return;
    
    setSavingWaterGoal(true);
    try {
      const result = await updateWaterGoal(clientId, user.uid, waterGoalData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "Water Goal Saved",
          description: "Water goal saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save water goal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving water goal:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingWaterGoal(false);
    }
  };

  const handleSaveLissCardio = async (lissCardioData: LissCardioData) => {
    if (!user) return;
    
    setSavingLissCardio(true);
    try {
      const result = await updateLissCardio(clientId, user.uid, lissCardioData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "LISS Cardio Saved",
          description: "LISS Cardio saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save LISS cardio. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving LISS cardio:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingLissCardio(false);
    }
  };

  const handleRemoveLissCardio = async () => {
    setSavingLissCardio(true);
    try {
      const result = await removeLissCardio(clientId);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "LISS Cardio Removed",
          description: "LISS Cardio removed successfully!",
        });
      } else {
        toast({
          title: "Remove Failed",
          description: "Failed to remove LISS cardio. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error removing LISS cardio:', error);
      toast({
        title: "Error",
        description: "An error occurred while removing.",
        variant: "destructive",
      });
    } finally {
      setSavingLissCardio(false);
    }
  };

  const handleSaveWeeklyFocus = async (weeklyFocusData: WeeklyFocusData) => {
    if (!user) return;
    
    setSavingWeeklyFocus(true);
    try {
      const result = await updateWeeklyFocus(clientId, user.uid, weeklyFocusData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "Weekly Focus Saved",
          description: "Weekly Focus saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save weekly focus. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving weekly focus:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingWeeklyFocus(false);
    }
  };

  const handleSaveDailyHabits = async (dailyHabitsData: DailyHabitsData) => {
    if (!user) return;
    
    setSavingDailyHabits(true);
    try {
      const result = await updateDailyHabits(clientId, user.uid, dailyHabitsData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        toast({
          title: "Daily Habits Saved",
          description: "Daily Habits saved successfully!",
        });
      } else {
        toast({
          title: "Save Failed",
          description: "Failed to save daily habits. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving daily habits:', error);
      toast({
        title: "Error",
        description: "An error occurred while saving.",
        variant: "destructive",
      });
    } finally {
      setSavingDailyHabits(false);
    }
  };

  // Format time helper
  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Calculate workout statistics
  const getWorkoutStats = () => {
    const total = workoutAssignments.length;
    const completed = workoutAssignments.filter(w => w.status === 'completed').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, completionRate };
  };

  // Categorize workouts
  const categorizeWorkouts = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of this week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const thisWeek = workoutAssignments.filter(w => {
      const dueDate = new Date(w.dueDate);
      return dueDate >= startOfWeek && dueDate < endOfWeek;
    });

    const recentlyCompleted = workoutAssignments
      .filter(w => w.status === 'completed')
      .sort((a, b) => {
        // Sort by completedAt (most recent first)
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const upcoming = workoutAssignments
      .filter(w => {
        const dueDate = new Date(w.dueDate);
        return dueDate >= endOfWeek && w.status !== 'completed';
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);

    return { thisWeek, recentlyCompleted, upcoming };
  };

  const workoutStats = getWorkoutStats();
  const { thisWeek, recentlyCompleted, upcoming } = categorizeWorkouts();

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

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'onboarding', label: 'Onboarding', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'plan', label: 'Plan', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'goals', label: 'Goals & Milestones', icon: <Target className="h-4 w-4" /> },
    { id: 'training', label: 'Training', icon: <Dumbbell className="h-4 w-4" /> },
    { id: 'nutrition', label: 'Nutrition', icon: <Apple className="h-4 w-4" /> },
    { id: 'progress', label: 'Progress', icon: <TrendingUp className="h-4 w-4" /> },
    { id: 'support', label: 'Support', icon: <MessageSquare className="h-4 w-4" /> },
    { id: 'account', label: 'Account', icon: <User className="h-4 w-4" /> },
  ];

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="client-hub" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Breadcrumb items={[
              { label: 'Client Management' },
              { label: 'Client Hub', href: '/dashboard/trainer/client-hub' },
              { label: clientData.name }
            ]} />
          </div>

          {/* Client Header */}
          <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {clientData.profilePhotoSmall ? (
                <img
                  src={clientData.profilePhotoSmall}
                  alt={clientData.name}
                  className="w-20 h-20 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
                  {clientData.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Client Info */}
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{clientData.name}</h1>
                <p className="text-gray-600">{clientData.email}</p>
                {clientData.tierName && (
                  <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {clientData.tierName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border shadow-sm mb-6">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">📊 Overview</h2>
                  <p className="text-gray-600">At-a-glance dashboard with key information</p>
                </div>

                {/* Status Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Payment Status */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-sm">💳</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Payment Status</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {clientData.accountActivated ? 'Active' : 'Pending'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {clientData.tierName || 'No subscription'}
                    </p>
                  </div>

                  {/* Training Status */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-sm">💪</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Training Status</h3>
                    </div>
                    {trainingLoading ? (
                      <p className="text-xl font-bold text-foreground">Loading...</p>
                    ) : recentlyCompleted.length > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-green-600">Active</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Last: {new Date(recentlyCompleted[0].completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </>
                    ) : workoutAssignments.length > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-yellow-600">Pending</p>
                        <p className="text-sm text-muted-foreground mt-1">No completed workouts</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-600">Not Started</p>
                        <p className="text-sm text-muted-foreground mt-1">No workouts assigned</p>
                      </>
                    )}
                  </div>

                  {/* Upcoming Session */}
                  <div 
                    onClick={() => setActiveTab('training')}
                    className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-sm">🗓️</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Next Session</h3>
                    </div>
                    {trainingLoading ? (
                      <p className="text-xl font-bold text-foreground">Loading...</p>
                    ) : upcomingSessions.length > 0 || upcomingCheckins.length > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatSessionDate(upcomingSessions[0]?.scheduledDate || upcomingCheckins[0]?.scheduledDate)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {upcomingSessions.length > 0 ? 'Training' : 'Check-in'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-gray-600">-</p>
                        <p className="text-sm text-muted-foreground mt-1">No upcoming sessions</p>
                      </>
                    )}
                  </div>

                  {/* Session Balance */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-sm">📅</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Session Balance</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {clientData.sessionBalance?.available || 0}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">sessions available</p>
                  </div>

                  {/* Account Status */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary text-sm">✅</span>
                      </div>
                      <h3 className="font-semibold text-gray-900">Account Status</h3>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                      {clientData.accountActivated ? 'Activated' : 'Pending'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {clientData.accountActivated ? 'Active member' : 'Awaiting activation'}
                    </p>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Key Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Total Workouts Assigned</p>
                      <p className="text-3xl font-bold text-foreground">
                        {trainingLoading ? '...' : workoutStats.total}
                      </p>
                    </div>
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Workouts Completed</p>
                      <p className="text-3xl font-bold text-foreground">
                        {trainingLoading ? '...' : workoutStats.completed}
                      </p>
                    </div>
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                      <p className={`text-3xl font-bold ${
                        trainingLoading ? 'text-foreground' :
                        workoutStats.completionRate >= 80 ? 'text-green-600' :
                        workoutStats.completionRate >= 60 ? 'text-yellow-600' :
                        workoutStats.completionRate > 0 ? 'text-red-600' :
                        'text-foreground'
                      }`}>
                        {trainingLoading ? '...' : `${workoutStats.completionRate}%`}
                      </p>
                    </div>
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Days as Client</p>
                      <p className="text-3xl font-bold text-foreground">
                        {clientData.createdAt ? 
                          Math.floor((Date.now() - clientData.createdAt.toDate().getTime()) / (1000 * 60 * 60 * 24)) 
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alerts & Quick Actions Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Alerts */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Alerts & Notifications</h3>
                    <div className="space-y-2">
                      {/* Account Not Activated */}
                      {!clientData.accountActivated && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md">
                          <span className="text-amber-600 text-xl">⚠️</span>
                          <div className="flex-1">
                            <p className="font-medium text-amber-900">Account Not Activated</p>
                            <p className="text-sm text-amber-700">Client hasn't activated their account yet</p>
                          </div>
                        </div>
                      )}

                      {/* Overdue Workouts */}
                      {(() => {
                        const overdueWorkouts = workoutAssignments.filter(w => 
                          w.status !== 'completed' && 
                          w.dueDate && 
                          new Date(w.dueDate) < new Date()
                        );
                        return overdueWorkouts.length > 0 && (
                          <div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md cursor-pointer"
                               onClick={() => setActiveTab('training')}>
                            <span className="text-red-600 text-xl">🔴</span>
                            <div className="flex-1">
                              <p className="font-medium text-red-900">{overdueWorkouts.length} Overdue Workout{overdueWorkouts.length !== 1 ? 's' : ''}</p>
                              <p className="text-sm text-red-700">Past due date and not completed</p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Upcoming Session (24h warning) */}
                      {(() => {
                        const nextSession = upcomingSessions[0] || upcomingCheckins[0];
                        if (nextSession) {
                          const sessionDate = nextSession.scheduledDate instanceof Date 
                            ? nextSession.scheduledDate 
                            : (nextSession.scheduledDate as any).toDate ? (nextSession.scheduledDate as any).toDate() : new Date();
                          const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
                          return hoursUntil <= 24 && hoursUntil > 0 && (
                            <div className="bg-blue-50 border border-blue-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md cursor-pointer"
                                 onClick={() => setActiveTab('training')}>
                              <span className="text-blue-600 text-xl">📅</span>
                              <div className="flex-1">
                                <p className="font-medium text-blue-900">Upcoming Session</p>
                                <p className="text-sm text-blue-700">
                                  {hoursUntil < 1 ? 'In less than 1 hour' : 
                                   hoursUntil < 2 ? 'In 1 hour' :
                                   Math.floor(hoursUntil) < 24 ? `In ${Math.floor(hoursUntil)} hours` : 'Tomorrow'} - {formatSessionDate(sessionDate)}
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Session Balance Critical */}
                      {clientData.sessionBalance?.available > 0 && clientData.sessionBalance.available < 2 && (
                        <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md">
                          <span className="text-orange-600 text-xl">⚠️</span>
                          <div className="flex-1">
                            <p className="font-medium text-orange-900">Low Session Balance</p>
                            <p className="text-sm text-orange-700">
                              Only {clientData.sessionBalance.available} session{clientData.sessionBalance.available !== 1 ? 's' : ''} remaining
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Inactive Training */}
                      {recentlyCompleted.length > 0 && (() => {
                        const daysSinceLastWorkout = Math.floor(
                          (Date.now() - new Date(recentlyCompleted[0].completedAt).getTime()) / (1000 * 60 * 60 * 24)
                        );
                        return daysSinceLastWorkout > 14 && (
                          <div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md cursor-pointer"
                               onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}>
                            <span className="text-orange-600 text-xl">💤</span>
                            <div className="flex-1">
                              <p className="font-medium text-orange-900">Inactive Training</p>
                              <p className="text-sm text-orange-700">
                                No workouts completed in {daysSinceLastWorkout} days - Consider reaching out
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* No Alerts - Only show if truly none */}
                      {clientData.accountActivated && 
                       !trainingLoading &&
                       !workoutAssignments.some(w => w.status !== 'completed' && w.dueDate && new Date(w.dueDate) < new Date()) &&
                       (!clientData.sessionBalance || clientData.sessionBalance.available >= 2 || clientData.sessionBalance.available === 0) &&
                       !(recentlyCompleted.length > 0 && Math.floor((Date.now() - new Date(recentlyCompleted[0].completedAt).getTime()) / (1000 * 60 * 60 * 24)) > 14) &&
                       !(() => {
                         const nextSession = upcomingSessions[0] || upcomingCheckins[0];
                         if (!nextSession) return false;
                         const sessionDate = nextSession.scheduledDate instanceof Date 
                           ? nextSession.scheduledDate 
                           : (nextSession.scheduledDate as any).toDate ? (nextSession.scheduledDate as any).toDate() : new Date();
                         const hoursUntil = (sessionDate.getTime() - Date.now()) / (1000 * 60 * 60);
                         return hoursUntil <= 24 && hoursUntil > 0;
                       })() && (
                        <p className="text-sm text-muted-foreground text-center py-3">✅ No critical alerts at this time</p>
                      )}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-col h-full">
                    <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      <button 
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/50 text-foreground rounded-lg p-4 text-left transition-all duration-300 hover:shadow-glow hover:-translate-y-1"
                      >
                        <div className="text-2xl mb-2">💬</div>
                        <p className="font-medium">Send Message</p>
                      </button>
                      <button 
                        onClick={() => router.push(`/dashboard/trainer/assignments/create?clientId=${clientData.id}`)}
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/50 text-foreground rounded-lg p-4 text-left transition-all duration-300 hover:shadow-glow hover:-translate-y-1"
                      >
                        <div className="text-2xl mb-2">💪</div>
                        <p className="font-medium">Assign Workout</p>
                      </button>
                      <button 
                        onClick={() => setActiveTab('plan')}
                        className="bg-primary/10 hover:bg-primary/20 border border-primary/50 text-foreground rounded-lg p-4 text-left transition-all duration-300 hover:shadow-glow hover:-translate-y-1"
                      >
                        <div className="text-2xl mb-2">📋</div>
                        <p className="font-medium">Edit Plan</p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Activity Feed */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
                  <div className="bg-primary/5 border border-primary/50 rounded-lg transition-all duration-300 hover:shadow-glow">
                    <ClientActivityFeed clientId={clientId} maxEvents={10} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'onboarding' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">🎯 Client Onboarding</h2>
                  <p className="text-gray-600">Track and manage client onboarding progress</p>
                </div>

                <OnboardingMilestoneManager 
                  clientId={clientId}
                  clientName={clientData.name}
                  clientTier={clientData.tier}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Milestone #1 auto-completes when client schedules consultation. 
                    Mark milestones #2 and #3 complete after the consultation and plan delivery.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'plan' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">📋 Edit Plan: {clientData.name}</h2>
                  <p className="text-gray-600">Configure your client's training plan components</p>
                </div>

                {planLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading plan data...</p>
                  </div>
                ) : (
                  <Tabs defaultValue="weeklyfocus" className="w-full">
                    <TabsList className="grid w-full grid-cols-8 mb-6">
                      <TabsTrigger value="weeklyfocus">
                        Weekly Focus
                      </TabsTrigger>
                      <TabsTrigger value="vision">
                        Your Vision
                      </TabsTrigger>
                      <TabsTrigger value="dailyhabits">
                        Daily Habits
                      </TabsTrigger>
                      <TabsTrigger value="trainingprotocol">
                        Training Protocol
                      </TabsTrigger>
                      <TabsTrigger value="nutrition">
                        Nutrition Protocol
                      </TabsTrigger>
                      <TabsTrigger value="stepgoal">
                        Step Goal
                      </TabsTrigger>
                      <TabsTrigger value="watergoal">
                        Water Goal
                      </TabsTrigger>
                      <TabsTrigger value="cardio">
                        LISS Cardio
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="weeklyfocus">
                      <WeeklyFocusEditor
                        initialData={plan?.weeklyFocus || null}
                        onSave={handleSaveWeeklyFocus}
                        isSaving={savingWeeklyFocus}
                      />
                    </TabsContent>

                    <TabsContent value="vision">
                      <VisionEditor
                        initialData={plan?.vision || null}
                        onSave={handleSaveVision}
                        isSaving={savingVision}
                      />
                    </TabsContent>

                    <TabsContent value="dailyhabits">
                      <DailyHabitsEditor
                        initialData={plan?.dailyHabits || null}
                        onSave={handleSaveDailyHabits}
                        isSaving={savingDailyHabits}
                      />
                    </TabsContent>

                    <TabsContent value="stepgoal">
                      <StepGoalEditor
                        initialData={plan?.stepGoal || null}
                        onSave={handleSaveStepGoal}
                        isSaving={savingStepGoal}
                      />
                    </TabsContent>

                    <TabsContent value="watergoal">
                      <WaterGoalEditor
                        initialData={plan?.waterGoal || null}
                        onSave={handleSaveWaterGoal}
                        isSaving={savingWaterGoal}
                      />
                    </TabsContent>

                    <TabsContent value="trainingprotocol">
                      {user && (
                        <div className="space-y-6">
                          <TrainingPhaseEditor
                            clientId={clientId}
                            trainerId={user.uid}
                            currentData={{
                              trainingPhase: plan?.trainingProtocol?.trainingPhase,
                              trainingFocus: plan?.trainingProtocol?.trainingFocus,
                              assignedDate: plan?.trainingProtocol?.assignedDate,
                              planDurationWeeks: plan?.trainingProtocol?.planDurationWeeks,
                              workoutFrequency: plan?.trainingProtocol?.workoutFrequency,
                              cardioType: plan?.trainingProtocol?.cardioType,
                              cardioFrequency: plan?.trainingProtocol?.cardioFrequency,
                              stepsPerDay: plan?.trainingProtocol?.stepsPerDay,
                            }}
                            onUpdate={async () => {
                              const updatedPlan = await getClientPlan(clientId);
                              setPlan(updatedPlan);
                            }}
                          />
                          <TrainingProtocolEditor
                            clientId={clientId}
                            trainerId={user.uid}
                            keyPriorities={plan?.trainingProtocol?.keyPriorities || []}
                            onUpdate={async () => {
                              const updatedPlan = await getClientPlan(clientId);
                              setPlan(updatedPlan);
                            }}
                          />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="nutrition">
                      {user && (
                        <NutritionProtocolEditor
                          clientId={clientId}
                          trainerId={user.uid}
                          currentApproach={plan?.nutritionProtocol?.approach}
                          currentData={{
                            healthyHabits: plan?.nutritionProtocol?.healthyHabits,
                            // NutritionProtocolEditor uses its own local types (form-string
                            // fields) which diverge from the canonical `@/types/plan`
                            // numeric types. Values are runtime-compatible at this prop
                            // boundary; the two type systems should be unified post-launch.
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            macroTracking: plan?.nutritionProtocol?.macroTracking as any,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            mealPlan: plan?.nutritionProtocol?.mealPlan as any
                          }}

                          onUpdate={async () => {
                            const updatedPlan = await getClientPlan(clientId);
                            setPlan(updatedPlan);
                          }}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="cardio" className="space-y-4">
                      <LissCardioEditor
                        initialData={plan?.lissCardio || null}
                        onSave={handleSaveLissCardio}
                        onRemove={handleRemoveLissCardio}
                        isSaving={savingLissCardio}
                      />

                      {/* 4-Week LISS Cardio Adherence History — only shown when assigned */}
                      {plan?.lissCardio && (
                        <div className="bg-red-50/60 border border-red-200 rounded-xl p-5">
                          <div className="flex items-center gap-2 mb-4">
                            <span className="text-lg">💓</span>
                            <h3 className="text-sm font-semibold text-gray-900">LISS Cardio Adherence History</h3>
                            <span className="ml-auto text-xs text-muted-foreground bg-white/60 px-2 py-0.5 rounded-full">Last 4 weeks</span>
                          </div>
                          {cardioAdherenceLoading ? (
                            <div className="flex items-center gap-2 py-4 justify-center">
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                              <span className="text-sm text-muted-foreground">Loading adherence...</span>
                            </div>
                          ) : cardioAdherence.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No tracking data yet — client has not logged any cardio sessions.</p>
                          ) : (
                            <div className="space-y-2">
                              {cardioAdherence.map((week) => {
                                const pct = Math.min(100, Math.round((week.count / week.target) * 100));
                                const isComplete = week.count >= week.target;
                                return (
                                  <div key={week.start} className="flex items-center gap-3">
                                    <span className="w-24 text-xs font-medium text-gray-700 flex-shrink-0">{week.weekLabel}</span>
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all ${isComplete ? 'bg-green-500' : week.count > 0 ? 'bg-amber-400' : 'bg-red-300'}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className={`w-16 text-xs font-bold text-right flex-shrink-0 ${isComplete ? 'text-green-600' : week.count > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                      {week.count} / {week.target} {isComplete ? '✅' : ''}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Tip:</strong> Each section can be saved independently. Your changes 
                    will be visible to your client immediately on their plan page.
                  </p>
                  <p className="text-sm text-blue-800 mt-2">
                    <strong>Weekly Focus</strong> should be updated regularly to keep your client informed 
                    of adjustments and priorities for the current week.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'training' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">💪 Training</h2>
                    <p className="text-gray-600">Workout assignments and in-person sessions</p>
                  </div>
                  <Link
                    href={`/dashboard/trainer/client-hub/${clientId}/training`}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                  >
                    <TrendingUp className="h-4 w-4" />
                    Training Performance Dashboard
                  </Link>
                </div>

                {/* Performance Overview - Ultra-Compact Metrics */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Performance Overview</h3>
                  {metricsLoading ? (
                    <div className="bg-white rounded-xl border p-8 text-center">
                      <div className="animate-pulse text-gray-500">Loading metrics...</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Card 1: Workout Assignments */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-5 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Dumbbell className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold text-gray-900">Workout Assignments</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Last 30 Days */}
                          <div className="border-r pr-4">
                            <p className="text-xs text-gray-500 mb-2">Last 30 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.workoutAssignments.lastMonth.completed} / {metrics.workoutAssignments.lastMonth.total}
                                {metrics.workoutAssignments.lastMonth.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.workoutAssignments.lastMonth.completed / metrics.workoutAssignments.lastMonth.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.workoutAssignments.lastMonth.completed / metrics.workoutAssignments.lastMonth.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.workoutAssignments.lastMonth.completed / metrics.workoutAssignments.lastMonth.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.workoutAssignments.lastMonth.completed > 0 && (
                                  <span className={
                                    ((metrics.workoutAssignments.lastMonth.onTime / metrics.workoutAssignments.lastMonth.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.workoutAssignments.lastMonth.onTime / metrics.workoutAssignments.lastMonth.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.workoutAssignments.lastMonth.onTime / metrics.workoutAssignments.lastMonth.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.workoutAssignments.lastMonth.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Last 90 Days */}
                          <div className="pl-4">
                            <p className="text-xs text-gray-500 mb-2">Last 90 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.workoutAssignments.last3Months.completed} / {metrics.workoutAssignments.last3Months.total}
                                {metrics.workoutAssignments.last3Months.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.workoutAssignments.last3Months.completed / metrics.workoutAssignments.last3Months.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.workoutAssignments.last3Months.completed / metrics.workoutAssignments.last3Months.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.workoutAssignments.last3Months.completed / metrics.workoutAssignments.last3Months.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.workoutAssignments.last3Months.completed > 0 && (
                                  <span className={
                                    ((metrics.workoutAssignments.last3Months.onTime / metrics.workoutAssignments.last3Months.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.workoutAssignments.last3Months.onTime / metrics.workoutAssignments.last3Months.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.workoutAssignments.last3Months.onTime / metrics.workoutAssignments.last3Months.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.workoutAssignments.last3Months.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {metrics.workoutAssignments.lastMonth.total === 0 && metrics.workoutAssignments.last3Months.total === 0 && (
                          <p className="text-xs text-gray-400 mt-3 text-center">No assignments yet</p>
                        )}
                      </div>

                      {/* Card 2: In-Person Training Sessions */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-5 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <h3 className="font-semibold text-gray-900">In-Person Training</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Last 30 Days */}
                          <div className="border-r pr-4">
                            <p className="text-xs text-gray-500 mb-2">Last 30 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.trainingSessions.lastMonth.completed} / {metrics.trainingSessions.lastMonth.total}
                                {metrics.trainingSessions.lastMonth.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.trainingSessions.lastMonth.completed / metrics.trainingSessions.lastMonth.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.trainingSessions.lastMonth.completed / metrics.trainingSessions.lastMonth.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.trainingSessions.lastMonth.completed / metrics.trainingSessions.lastMonth.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.trainingSessions.lastMonth.completed > 0 && (
                                  <span className={
                                    ((metrics.trainingSessions.lastMonth.onTime / metrics.trainingSessions.lastMonth.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.trainingSessions.lastMonth.onTime / metrics.trainingSessions.lastMonth.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.trainingSessions.lastMonth.onTime / metrics.trainingSessions.lastMonth.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.trainingSessions.lastMonth.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Last 90 Days */}
                          <div className="pl-4">
                            <p className="text-xs text-gray-500 mb-2">Last 90 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.trainingSessions.last3Months.completed} / {metrics.trainingSessions.last3Months.total}
                                {metrics.trainingSessions.last3Months.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.trainingSessions.last3Months.completed / metrics.trainingSessions.last3Months.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.trainingSessions.last3Months.completed / metrics.trainingSessions.last3Months.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.trainingSessions.last3Months.completed / metrics.trainingSessions.last3Months.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.trainingSessions.last3Months.completed > 0 && (
                                  <span className={
                                    ((metrics.trainingSessions.last3Months.onTime / metrics.trainingSessions.last3Months.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.trainingSessions.last3Months.onTime / metrics.trainingSessions.last3Months.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.trainingSessions.last3Months.onTime / metrics.trainingSessions.last3Months.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.trainingSessions.last3Months.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {metrics.trainingSessions.lastMonth.total === 0 && metrics.trainingSessions.last3Months.total === 0 && (
                          <p className="text-xs text-gray-400 mt-3 text-center">No sessions yet</p>
                        )}
                      </div>

                      {/* Card 3: Weekly Check-ins */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-5 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <h3 className="font-semibold text-gray-900">Weekly Check-ins</h3>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Last 30 Days */}
                          <div className="border-r pr-4">
                            <p className="text-xs text-gray-500 mb-2">Last 30 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.checkIns.lastMonth.completed} / {metrics.checkIns.lastMonth.total}
                                {metrics.checkIns.lastMonth.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.checkIns.lastMonth.completed / metrics.checkIns.lastMonth.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.checkIns.lastMonth.completed / metrics.checkIns.lastMonth.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.checkIns.lastMonth.completed / metrics.checkIns.lastMonth.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.checkIns.lastMonth.completed > 0 && (
                                  <span className={
                                    ((metrics.checkIns.lastMonth.onTime / metrics.checkIns.lastMonth.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.checkIns.lastMonth.onTime / metrics.checkIns.lastMonth.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.checkIns.lastMonth.onTime / metrics.checkIns.lastMonth.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.checkIns.lastMonth.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                          
                          {/* Last 90 Days */}
                          <div className="pl-4">
                            <p className="text-xs text-gray-500 mb-2">Last 90 Days</p>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-gray-900">
                                {metrics.checkIns.last3Months.completed} / {metrics.checkIns.last3Months.total}
                                {metrics.checkIns.last3Months.total > 0 && (
                                  <span className={`ml-1 ${
                                    ((metrics.checkIns.last3Months.completed / metrics.checkIns.last3Months.total) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.checkIns.last3Months.completed / metrics.checkIns.last3Months.total) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }`}>
                                    ({Math.round((metrics.checkIns.last3Months.completed / metrics.checkIns.last3Months.total) * 100)}%)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {metrics.checkIns.last3Months.completed > 0 && (
                                  <span className={
                                    ((metrics.checkIns.last3Months.onTime / metrics.checkIns.last3Months.completed) * 100) >= 80
                                      ? 'text-green-600'
                                      : ((metrics.checkIns.last3Months.onTime / metrics.checkIns.last3Months.completed) * 100) >= 60
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                  }>
                                    {Math.round((metrics.checkIns.last3Months.onTime / metrics.checkIns.last3Months.completed) * 100)}% on-time
                                  </span>
                                )}
                                {metrics.checkIns.last3Months.completed === 0 && (
                                  <span className="text-gray-400">-</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {metrics.checkIns.lastMonth.total === 0 && metrics.checkIns.last3Months.total === 0 && (
                          <p className="text-xs text-gray-400 mt-3 text-center">No check-ins yet</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {trainingLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading training data...</p>
                  </div>
                ) : (
                  <>

                {/* SECTION 1: WORKOUT ASSIGNMENTS */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-primary" />
                        Workout Assignments
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Independent training workouts</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/trainer/assignments?client=${clientData.id}`}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        View All Assignments
                      </Link>
                      <button
                        onClick={() => router.push(`/dashboard/trainer/assignments/create?clientId=${clientData.id}`)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        Assign Workout
                      </button>
                    </div>
                  </div>

                  {/* Recently Completed */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Recently Completed</h4>
                    {recentlyCompleted.length > 0 ? (
                      <div className="space-y-2">
                        {recentlyCompleted.slice(0, 2).map((workout) => (
                          <div key={workout.id} className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{workout.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Completed: {workout.completedAt ? new Date(workout.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recently'}
                                </p>
                              </div>
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <span className="text-4xl mb-2 block">✅</span>
                        <p className="font-semibold text-gray-900 mb-2">No completed workouts yet</p>
                        <p className="text-sm text-gray-600">Completed workouts will appear here</p>
                      </div>
                    )}
                  </div>

                  {/* Upcoming - Blue Theme */}
                  <div>
                    <h4 className="font-semibold mb-3">Upcoming</h4>
                    {upcoming.length > 0 ? (
                      <div className="space-y-2">
                        {upcoming.slice(0, 3).map((workout) => (
                          <div key={workout.id} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900">{workout.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Due: {new Date(workout.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Scheduled
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <span className="text-4xl mb-2 block">📅</span>
                        <p className="font-semibold text-gray-900 mb-2">No upcoming workouts scheduled</p>
                        <p className="text-sm text-gray-600">Future workouts will appear here</p>
                      </div>
                    )}
                  </div>

                </div>

                {/* SECTION 2: IN-PERSON TRAINING SESSIONS */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        In-Person Training Sessions
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Scheduled appointments with trainer</p>
                    </div>
                    <Link
                      href={`/dashboard/trainer/training-sessions?clientId=${clientId}&dateRange=month`}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      View In-person Sessions
                    </Link>
                  </div>

                  {/* Recently Completed */}
                    <div className="mb-6">
                      <h4 className="font-semibold mb-3">Recently Completed</h4>
                      {completedSessions.length > 0 ? (
                        <div className="space-y-2">
                          {completedSessions.map((session) => {
                            const location = completedSessionLocations.get(session.id);
                            const hasValidLocation = location && 
                              !location.includes('TBD') && 
                              !location.includes('unavailable') && 
                              !location.includes('Loading');
                            
                            return (
                              <div key={session.id} className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatSessionDate(session.scheduledDate)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {formatSessionTimeRange(session.scheduledDate, session.duration)}
                                    </p>
                                    {hasValidLocation && (
                                      <p className="text-sm text-gray-600">
                                        📍 {location}
                                      </p>
                                    )}
                                  </div>
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                          <span className="text-4xl mb-2 block">✅</span>
                          <p className="font-semibold text-gray-900 mb-2">No completed sessions yet</p>
                          <p className="text-sm text-gray-600">Completed sessions will appear here</p>
                        </div>
                      )}
                    </div>

                    {/* Upcoming Sessions - Blue Theme */}
                    <div>
                      <h4 className="font-semibold mb-3">Upcoming</h4>
                      {upcomingSessions.length > 0 ? (
                        <div className="space-y-2">
                          {upcomingSessions.slice(0, 3).map((session) => {
                                const location = sessionLocations.get(session.id);
                                const hasValidLocation = location && 
                                  !location.includes('TBD') && 
                                  !location.includes('unavailable') && 
                                  !location.includes('Loading');
                                
                            return (
                              <div key={session.id} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium">
                                          {formatSessionDate(session.scheduledDate)}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {formatSessionTimeRange(session.scheduledDate, session.duration)}
                                        </p>
                                        {hasValidLocation && (
                                          <p className="text-sm text-gray-600">
                                            📍 {location}
                                          </p>
                                        )}
                                      </div>
                                      <span className={`px-2 py-1 rounded-full text-xs ${
                                        session.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                        session.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {session.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                          })}
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-6 text-center">
                          <span className="text-4xl mb-2 block">🗓️</span>
                          <p className="font-semibold text-gray-900 mb-2">No upcoming sessions scheduled</p>
                          <p className="text-sm text-gray-600">Future sessions will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>

                {/* SECTION 3: WEEKLY CHECK-INS */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        Weekly Check-ins
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Scheduled check-in appointments</p>
                    </div>
                    <Link
                      href={`/dashboard/trainer/weekly-checkins?clientId=${clientId}&dateRange=month`}
                      className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      View Check-ins
                    </Link>
                  </div>

                  {/* Recently Completed */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3">Recently Completed</h4>
                    {completedCheckins.length > 0 ? (
                      <div className="space-y-2">
                        {completedCheckins.map((checkin) => {
                          const location = completedCheckinLocations.get(checkin.id);
                          const hasValidLocation = location && 
                            !location.includes('TBD') && 
                            !location.includes('unavailable') && 
                            !location.includes('Loading');
                          
                          return (
                            <div key={checkin.id} className="bg-green-50 border border-green-200 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {formatSessionDate(checkin.scheduledDate)}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {formatSessionTimeRange(checkin.scheduledDate, checkin.duration)}
                                  </p>
                                  {hasValidLocation && (
                                    <p className="text-sm text-gray-600">
                                      📍 {location}
                                    </p>
                                  )}
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <span className="text-4xl mb-2 block">✅</span>
                        <p className="font-semibold text-gray-900 mb-2">No completed check-ins yet</p>
                        <p className="text-sm text-gray-600">Completed check-ins will appear here</p>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Check-ins - Blue Theme */}
                  <div>
                    <h4 className="font-semibold mb-3">Upcoming</h4>
                    {upcomingCheckins.length > 0 ? (
                      <div className="space-y-2">
                        {upcomingCheckins.slice(0, 3).map((checkin) => {
                              const location = checkinLocations.get(checkin.id);
                              const hasValidLocation = location && 
                                !location.includes('TBD') && 
                                !location.includes('unavailable') && 
                                !location.includes('Loading');
                              
                          return (
                            <div key={checkin.id} className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium">
                                        {formatSessionDate(checkin.scheduledDate)}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {formatSessionTimeRange(checkin.scheduledDate, checkin.duration)}
                                      </p>
                                      {hasValidLocation && (
                                        <p className="text-sm text-gray-600">
                                          📍 {location}
                                        </p>
                                      )}
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      checkin.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                      checkin.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      'bg-yellow-100 text-yellow-800'
                                    }`}>
                                      {checkin.status}
                                    </span>
                                  </div>
                                </div>
                              );
                        })}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <span className="text-4xl mb-2 block">📝</span>
                        <p className="font-semibold text-gray-900 mb-2">No upcoming check-ins scheduled</p>
                        <p className="text-sm text-gray-600">Future check-ins will appear here</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Tip */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Tip:</strong> Track workout assignments, in-person sessions, and check-ins in one place. Sessions and check-ins are scheduled by clients through their dashboard.
                  </p>
                </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">🍎 Nutrition</h2>
                  <p className="text-gray-600">Monitor client nutrition adherence and progress</p>
                </div>
                <ClientNutritionDashboard clientId={clientId} />
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-1">📈 Progress</h2>
                  <p className="text-gray-600">All progress tracking and measurements</p>
                </div>
                <ClientProgressDashboard
                  clientId={clientId}
                  clientName={clientData.name}
                />
              </div>
            )}

            {activeTab === 'goals' && (
              <GoalsManagementPanel 
                clientId={clientId} 
                clientName={clientData.name} 
              />
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">💬 Support</h2>
                  <p className="text-gray-600">Communication and support resources</p>
                </div>

                {/* Consolidated Messages Card */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <span className="text-2xl">💬</span>
                    </div>
                    <h3 className="text-xl font-semibold">Messages</h3>
                  </div>
                  
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                      <p className="text-sm text-muted-foreground mt-2">Loading messages...</p>
                    </div>
                  ) : recentMessages.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {recentMessages.map((message) => {
                        const isFromClient = message.senderId === clientId;
                        const preview = message.content.length > 80 
                          ? message.content.substring(0, 80) + '...' 
                          : message.content;
                        
                        return (
                          <div 
                            key={message.id}
                            className="p-3 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {isFromClient ? clientData.name : 'You'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(message.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {preview}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 mb-4">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No messages yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Start a conversation with your client</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Send Message
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                      className="px-4 py-2 text-primary hover:text-primary/80 text-sm font-medium hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      View All Messages
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'account' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">👤 Account</h2>
                  <p className="text-gray-600">Profile, security, and membership information</p>
                </div>

                {/* Account Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Profile Information - Visible to all trainers */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <span className="text-2xl">👤</span>
                      </div>
                      <h3 className="text-xl font-semibold">Profile</h3>
                    </div>
                    <div className="flex items-start gap-4">
                      {/* Profile Photo */}
                      {clientData.profilePhotoLarge ? (
                        <img
                          src={clientData.profilePhotoLarge}
                          alt={clientData.name}
                          className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-2 border-primary/20"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                          {clientData.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Profile Details */}
                      <div className="space-y-2 text-sm flex-1">
                        <p><span className="font-medium">Name:</span> {clientData.name}</p>
                        <p><span className="font-medium">Email:</span> {clientData.email}</p>
                        <p><span className="font-medium">Phone:</span> {clientData.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Membership - Visible to all trainers */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <span className="text-2xl">💳</span>
                      </div>
                      <h3 className="text-xl font-semibold">Membership</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Tier:</span> {clientData.tierName || 'None'}</p>
                      <p><span className="font-medium">Status:</span> {clientData.accountActivated ? 'Active' : 'Pending'}</p>
                      <p><span className="font-medium">Member Since:</span> {clientData.createdAt ? new Date(clientData.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                </div>

                {/* 5. Billing & Payments (Admin Only) */}
                {canAccessAdminDashboard && (
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <span className="text-2xl">💳</span>
                        </div>
                        <h3 className="text-xl font-semibold">Billing & Payments</h3>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium flex-shrink-0">
                        <Shield className="h-3 w-3" />
                        Admin Only
                      </span>
                    </div>

                    {(billingLoading || sessionLoading) && (
                      <div className="text-center py-4">
                        <span className="text-sm text-gray-500">Loading billing data...</span>
                      </div>
                    )}
                    
                    {billingError ? (
                      <div className="text-center py-4 text-red-600">
                        <p className="text-sm">{billingError}</p>
                      </div>
                    ) : (
                      <>
                        {/* Billing Summary */}
                        {clientBillingData && (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                              <div className="space-y-3">
                                {clientBillingData.transactions.length > 0 && (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-600">Last Payment Date</p>
                                      <p className="font-medium">
                                        {formatDate(clientBillingData.transactions[0].date)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Last Payment Amount</p>
                                      <p className="font-medium">
                                        {formatCurrency(clientBillingData.transactions[0].amount, clientBillingData.transactions[0].currency)}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div className="space-y-3">
                                {clientBillingData.nextPaymentDate && clientBillingData.nextPaymentAmount ? (
                                  <>
                                    <div>
                                      <p className="text-sm text-gray-600">Next Billing Date</p>
                                      <p className="font-medium">
                                        {formatDate(Math.floor(clientBillingData.nextPaymentDate.getTime() / 1000))}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Next Payment Amount</p>
                                      <p className="font-medium">
                                        {formatCurrency(clientBillingData.nextPaymentAmount)}
                                      </p>
                                    </div>
                                  </>
                                ) : null}
                                {/* External provider customer deep-links removed:
                                    the admin dashboard is provider-neutral and links
                                    only through the PaymentProvider interface (see the
                                    Revenue page's "Payments Dashboard"). */}
                              </div>
                            </div>

                            {/* Subscription Transaction History */}
                            <div className="mb-6">
                              <h4 className="text-lg font-semibold mb-4 text-foreground">Subscription Transactions</h4>
                              {clientBillingData.transactions.length > 0 ? (
                                <div className="overflow-x-auto bg-white rounded-lg border">
                                  <table className="w-full">
                                    <thead className="border-b bg-gray-50">
                                      <tr className="text-left">
                                        <th className="py-3 px-4 text-xs font-medium text-gray-600">Date</th>
                                        <th className="py-3 px-4 text-xs font-medium text-gray-600">Description</th>
                                        <th className="py-3 px-4 text-xs font-medium text-gray-600">Payment Method</th>
                                        <th className="py-3 px-4 text-xs font-medium text-gray-600">Amount</th>
                                        <th className="py-3 px-4 text-xs font-medium text-gray-600">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {clientBillingData.transactions.slice(0, 5).map((transaction) => {
                                        const date = new Date(transaction.date * 1000);
                                        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        
                                        return (
                                          <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="py-3 px-4 text-xs font-medium text-gray-900">{dateStr}</td>
                                            <td className="py-3 px-4 text-xs text-gray-900">{transaction.description || transaction.productName}</td>
                                            <td className="py-3 px-4 text-xs text-gray-900">
                                              {transaction.paymentMethod 
                                                ? typeof transaction.paymentMethod === 'string' 
                                                  ? transaction.paymentMethod 
                                                  : getPaymentMethodDisplay(transaction.paymentMethod)
                                                : 'N/A'}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-medium text-gray-900">
                                              {formatCurrency(transaction.amount, transaction.currency)}
                                            </td>
                                            <td className="py-3 px-4">
                                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                                transaction.status === 'paid' || transaction.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                              }`}>
                                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="text-center py-8 bg-white rounded-lg border">
                                  <p className="text-sm text-gray-500">No subscription transactions yet</p>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {/* Session Purchase History */}
                        <div>
                          <h4 className="text-lg font-semibold mb-4 text-foreground">In-Person Training Session Purchases</h4>
                          {sessionPackages.length > 0 ? (
                            <div className="overflow-x-auto bg-white rounded-lg border">
                              <table className="w-full">
                                <thead className="border-b bg-gray-50">
                                  <tr className="text-left">
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Purchase Date</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Package Type</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Sessions</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Used</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Remaining</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Amount Paid</th>
                                    <th className="py-3 px-4 text-xs font-medium text-gray-600">Expires</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {sessionPackages.map((pkg) => {
                                    // Handle Timestamp conversion properly
                                    const purchaseDate = typeof pkg.purchaseDate === 'number' 
                                      ? new Date(pkg.purchaseDate)
                                      : pkg.purchaseDate.toDate();
                                    const expirationDate = typeof pkg.expirationDate === 'number'
                                      ? new Date(pkg.expirationDate)
                                      : pkg.expirationDate.toDate();
                                    const isExpired = expirationDate < new Date();
                                    const sessionsUsed = pkg.quantity - pkg.remaining;
                                    
                                    return (
                                      <tr key={pkg.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 text-xs font-medium text-gray-900">
                                          {purchaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-900">{pkg.productName || pkg.stripeProductName || 'Session Package'}</td>

                                        <td className="py-3 px-4 text-xs text-gray-900">{pkg.quantity}</td>
                                        <td className="py-3 px-4 text-xs text-gray-900">{sessionsUsed}</td>
                                        <td className="py-3 px-4 text-xs font-medium text-gray-900">{pkg.remaining}</td>
                                        <td className="py-3 px-4 text-xs font-medium text-gray-900">
                                          {formatCurrency(pkg.amount || 0)}
                                        </td>
                                        <td className="py-3 px-4">
                                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                            isExpired ? 'bg-red-100 text-red-700' : 
                                            pkg.remaining === 0 ? 'bg-gray-100 text-gray-700' :
                                            'bg-green-100 text-green-700'
                                          }`}>
                                            {isExpired ? 'Expired' : pkg.remaining === 0 ? 'Used Up' : expirationDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-white rounded-lg border">
                              <p className="text-sm text-gray-500">No session packages purchased yet</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Session Balance & Purchase History - Visible to all trainers */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                  <h3 className="text-lg font-semibold mb-4">Session Balance & History</h3>
                  
                  {/* Balance Summary */}
                  {sessionBalance && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="text-center p-4 bg-background/50 rounded-lg">
                        <p className="text-3xl font-bold text-foreground">{sessionBalance.available || 0}</p>
                        <p className="text-sm text-muted-foreground">Available</p>
                      </div>
                      <div className="text-center p-4 bg-background/50 rounded-lg">
                        <p className="text-3xl font-bold text-foreground">{sessionBalance.used || 0}</p>
                        <p className="text-sm text-muted-foreground">Used</p>
                      </div>
                      <div className="text-center p-4 bg-background/50 rounded-lg">
                        <p className="text-3xl font-bold text-foreground">{sessionBalance.purchased || 0}</p>
                        <p className="text-sm text-muted-foreground">Total Purchased</p>
                      </div>
                    </div>
                  )}

                  {/* Purchase History */}
                  {sessionLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading session data...</p>
                  ) : sessionPackages.length > 0 ? (
                    <PurchaseHistory 
                      packages={sessionPackages}
                      loading={sessionLoading}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No session packages purchased</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
