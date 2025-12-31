'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
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
  ExternalLink,
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
  Calendar
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
import { TrainingProtocolEditor } from '@/components/trainer/plan/TrainingProtocolEditor';
import { NutritionProtocolEditor } from '@/components/trainer/plan/NutritionProtocolEditor';
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

type TabType = 'overview' | 'plan' | 'training' | 'nutrition' | 'progress' | 'support' | 'account';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();
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

  // Progress state for Progress tab
  const [latestWeight, setLatestWeight] = useState<any>(null);
  const [progressPhotosCount, setProgressPhotosCount] = useState(0);
  const [progressLoading, setProgressLoading] = useState(false);

  // Training state for Training tab
  const [workoutAssignments, setWorkoutAssignments] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([]);
  const [completedSessions, setCompletedSessions] = useState<TrainingSession[]>([]);
  const [sessionLocations, setSessionLocations] = useState<Map<string, string>>(new Map());
  const [trainingLoading, setTrainingLoading] = useState(false);
  
  // Collapsible section state for Training tab
  const [isThisWeekExpanded, setIsThisWeekExpanded] = useState(true);
  const [isRecentlyCompletedExpanded, setIsRecentlyCompletedExpanded] = useState(false);
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState(false);
  const [isSessionsExpanded, setIsSessionsExpanded] = useState(false);
  const [isRecentSessionsExpanded, setIsRecentSessionsExpanded] = useState(false);

  // Plan state for Plan tab
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [savingVision, setSavingVision] = useState(false);
  const [savingStepGoal, setSavingStepGoal] = useState(false);
  const [savingWaterGoal, setSavingWaterGoal] = useState(false);
  const [savingLissCardio, setSavingLissCardio] = useState(false);
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

  // Fetch progress data when on Progress tab
  useEffect(() => {
    if (!clientId || activeTab !== 'progress') {
      return;
    }

    const fetchProgressData = async () => {
      setProgressLoading(true);
      
      try {
        // Import functions dynamically
        const { getRecentWeightLogs } = await import('@/lib/activity-api');
        const { getUserProgressPhotos } = await import('@/lib/progress-photo-api');
        
        // Fetch latest weight
        const weightLogs = await getRecentWeightLogs(clientId, 1);
        if (weightLogs.length > 0) {
          setLatestWeight(weightLogs[0]);
        }
        
        // Fetch progress photos count
        const photos = await getUserProgressPhotos(clientId);
        setProgressPhotosCount(photos.length);
        
      } catch (error) {
        console.error('Error fetching progress data:', error);
      } finally {
        setProgressLoading(false);
      }
    };

    fetchProgressData();
  }, [activeTab, clientId]);

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

  // Fetch workout assignments and subscribe to sessions when on Training tab
  useEffect(() => {
    if (!user || !clientId || activeTab !== 'training') {
      setUpcomingSessions([]);
      return;
    }

    const fetchTrainingData = async () => {
      setTrainingLoading(true);
      
      try {
        // Fetch workout assignments for this client
        const assignmentsQuery = query(
          collection(db, 'workoutAssignments'),
          where('clientId', '==', clientId),
          where('trainerId', '==', user.uid),
          orderBy('dueDate', 'desc')
        );
        
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignments = assignmentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Workout',
            clientId: data.clientId,
            templateId: data.workoutTemplateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedAt?.toDate() || new Date(),
            dueDate: typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate?.toDate() || new Date(),
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes
          };
        });
        
        setWorkoutAssignments(assignments);
      } catch (error) {
        console.error('Error fetching training data:', error);
        setWorkoutAssignments([]);
      } finally {
        setTrainingLoading(false);
      }
    };

    fetchTrainingData();

    // Subscribe to upcoming sessions
    const unsubscribeSessions = subscribeToUpcomingSessions(
      clientId,
      (sessions) => {
        setUpcomingSessions(sessions);
      }
    );

    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribeSessions);

    return () => {
      unregisterListener(unsubscribeSessions);
      unsubscribeSessions();
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

  // Save handlers for Plan tab
  const handleSaveVision = async (visionData: VisionData) => {
    if (!user) return;
    
    setSavingVision(true);
    try {
      const result = await updateVision(clientId, user.uid, visionData);
      if (result.success) {
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('Vision saved successfully!');
      } else {
        alert('Failed to save vision. Please try again.');
      }
    } catch (error) {
      console.error('Error saving vision:', error);
      alert('An error occurred while saving.');
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
        alert('Step goal saved successfully!');
      } else {
        alert('Failed to save step goal. Please try again.');
      }
    } catch (error) {
      console.error('Error saving step goal:', error);
      alert('An error occurred while saving.');
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
        alert('Water goal saved successfully!');
      } else {
        alert('Failed to save water goal. Please try again.');
      }
    } catch (error) {
      console.error('Error saving water goal:', error);
      alert('An error occurred while saving.');
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
        alert('LISS Cardio saved successfully!');
      } else {
        alert('Failed to save LISS cardio. Please try again.');
      }
    } catch (error) {
      console.error('Error saving LISS cardio:', error);
      alert('An error occurred while saving.');
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
        alert('LISS Cardio removed successfully!');
      } else {
        alert('Failed to remove LISS cardio. Please try again.');
      }
    } catch (error) {
      console.error('Error removing LISS cardio:', error);
      alert('An error occurred while removing.');
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
        alert('Weekly Focus saved successfully!');
      } else {
        alert('Failed to save weekly focus. Please try again.');
      }
    } catch (error) {
      console.error('Error saving weekly focus:', error);
      alert('An error occurred while saving.');
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
        alert('Daily Habits saved successfully!');
      } else {
        alert('Failed to save daily habits. Please try again.');
      }
    } catch (error) {
      console.error('Error saving daily habits:', error);
      alert('An error occurred while saving.');
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
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
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
    { id: 'plan', label: 'Plan', icon: <ClipboardList className="h-4 w-4" /> },
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
                    <p className="text-2xl font-bold text-foreground">On Track</p>
                    <p className="text-sm text-muted-foreground mt-1">Last workout today</p>
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
                    <p className="text-2xl font-bold text-foreground">-</p>
                    <p className="text-sm text-muted-foreground mt-1">No upcoming sessions</p>
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
                      <p className="text-3xl font-bold text-foreground">-</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Workouts Completed</p>
                      <p className="text-3xl font-bold text-foreground">-</p>
                    </div>
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                      <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
                      <p className="text-3xl font-bold text-foreground">-%</p>
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
                      {!clientData.accountActivated && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-3 transition-all duration-300 hover:shadow-md">
                          <span className="text-amber-600 text-xl">⚠️</span>
                          <div>
                            <p className="font-medium text-amber-900">Account Not Activated</p>
                            <p className="text-sm text-amber-700">Client hasn't activated their account yet</p>
                          </div>
                        </div>
                      )}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-3 text-center transition-all duration-300">
                        <p className="text-sm text-muted-foreground">No critical alerts at this time</p>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-3 gap-3">
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
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 text-center transition-all duration-300 hover:shadow-glow">
                    <p className="text-foreground">Activity feed will show recent client actions</p>
                    <p className="text-sm text-muted-foreground mt-2">(Workout completions, weight logs, surveys, photos, messages)</p>
                  </div>
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
                        <TrainingProtocolEditor
                          clientId={clientId}
                          trainerId={user.uid}
                          keyPriorities={plan?.trainingProtocol?.keyPriorities || []}
                          onUpdate={async () => {
                            const updatedPlan = await getClientPlan(clientId);
                            setPlan(updatedPlan);
                          }}
                        />
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
                            macroTracking: plan?.nutritionProtocol?.macroTracking,
                            mealPlan: plan?.nutritionProtocol?.mealPlan
                          }}
                          onUpdate={async () => {
                            const updatedPlan = await getClientPlan(clientId);
                            setPlan(updatedPlan);
                          }}
                        />
                      )}
                    </TabsContent>

                    <TabsContent value="cardio">
                      <LissCardioEditor
                        initialData={plan?.lissCardio || null}
                        onSave={handleSaveLissCardio}
                        onRemove={handleRemoveLissCardio}
                        isSaving={savingLissCardio}
                      />
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
                <div>
                  <h2 className="text-2xl font-bold mb-1">💪 Training</h2>
                  <p className="text-gray-600">Workout assignments and in-person sessions</p>
                </div>

                {/* Training Summary Cards */}
                {trainingLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground mt-2">Loading workout data...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📋</span>
                        <h4 className="font-semibold">Total Assigned</h4>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{workoutStats.total}</p>
                      <p className="text-sm text-muted-foreground">workouts assigned</p>
                    </div>
                    
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">✅</span>
                        <h4 className="font-semibold">Completed</h4>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{workoutStats.completed}</p>
                      <p className="text-sm text-muted-foreground">workouts completed</p>
                    </div>
                    
                    <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">📊</span>
                        <h4 className="font-semibold">Completion Rate</h4>
                      </div>
                      <p className="text-3xl font-bold text-foreground">{workoutStats.completionRate}%</p>
                      <p className="text-sm text-muted-foreground">success rate</p>
                    </div>
                  </div>
                )}

                {/* SECTION 1: WORKOUT ASSIGNMENTS */}
                <div className="bg-white border-2 border-primary/20 rounded-xl p-6">
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

                  {/* This Week's Workouts - Collapsible */}
                <div>
                  <button
                    onClick={() => setIsThisWeekExpanded(!isThisWeekExpanded)}
                    className="flex items-center justify-between w-full text-left mb-3 group"
                  >
                    <h3 className="text-lg font-semibold">
                      This Week's Workouts {!isThisWeekExpanded && `(${thisWeek.length})`}
                    </h3>
                    {isThisWeekExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    )}
                  </button>
                  
                  {isThisWeekExpanded && (
                    <>
                      {thisWeek.length > 0 ? (
                        <div className="space-y-2">
                          {thisWeek.map((workout) => {
                            const isOverdue = new Date(workout.dueDate) < new Date() && workout.status !== 'completed';
                            return (
                              <div key={workout.id} className="bg-primary/5 border border-primary/50 rounded-lg p-4 hover:shadow-md transition-all">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-foreground">{workout.name}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      Due: {new Date(workout.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                    workout.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    isOverdue ? 'bg-red-100 text-red-700' :
                                    workout.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {workout.status === 'completed' ? '✓ Completed' :
                                     isOverdue ? '⚠ Overdue' :
                                     workout.status === 'in_progress' ? 'In Progress' :
                                     'Assigned'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 text-center">
                          <span className="text-4xl mb-2 block">💪</span>
                          <p className="font-semibold text-foreground mb-2">No workouts due this week</p>
                          <p className="text-sm text-muted-foreground">Assign workouts to appear here</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                  {/* Recently Completed - Collapsible */}
                <div>
                  <button
                    onClick={() => setIsRecentlyCompletedExpanded(!isRecentlyCompletedExpanded)}
                    className="flex items-center justify-between w-full text-left mb-3 group"
                  >
                    <h3 className="text-lg font-semibold">
                      Recently Completed Workouts {!isRecentlyCompletedExpanded && `(${recentlyCompleted.length})`}
                    </h3>
                    {isRecentlyCompletedExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    )}
                  </button>
                  
                  {isRecentlyCompletedExpanded && (
                    <>
                      {recentlyCompleted.length > 0 ? (
                        <div className="space-y-2">
                          {recentlyCompleted.map((workout) => (
                            <div key={workout.id} className="bg-green-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-900">{workout.name}</h4>
                                  <p className="text-sm text-gray-600">
                                    Completed: {new Date(workout.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 text-center">
                          <span className="text-4xl mb-2 block">✅</span>
                          <p className="font-semibold text-foreground mb-2">No completed workouts yet</p>
                          <p className="text-sm text-muted-foreground">Completed workouts will appear here</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                  {/* Upcoming Workouts - Collapsible */}
                <div>
                  <button
                    onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                    className="flex items-center justify-between w-full text-left mb-3 group"
                  >
                    <h3 className="text-lg font-semibold">
                      Upcoming Workouts (Beyond This Week) {!isUpcomingExpanded && `(${upcoming.length})`}
                    </h3>
                    {isUpcomingExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                    )}
                  </button>
                  
                  {isUpcomingExpanded && (
                    <>
                      {upcoming.length > 0 ? (
                        <div className="space-y-2">
                          {upcoming.map((workout) => (
                            <div key={workout.id} className="bg-primary/5 border border-primary/50 rounded-lg p-4 hover:shadow-md transition-all">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-foreground">{workout.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Due: {new Date(workout.dueDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  Scheduled
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 text-center">
                          <span className="text-4xl mb-2 block">📅</span>
                          <p className="font-semibold text-foreground mb-2">No upcoming workouts scheduled</p>
                          <p className="text-sm text-muted-foreground">Future workouts will appear here</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                </div>

                {/* SECTION 2: IN-PERSON TRAINING SESSIONS */}
                <div className="bg-white border-2 border-primary/20 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        In-Person Training Sessions
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">Scheduled appointments with trainer</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/trainer/training-sessions?clientId=${clientId}&dateRange=month`}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        View In-person Sessions
                      </Link>
                      <Link
                        href={`/dashboard/trainer/weekly-checkins?clientId=${clientId}&dateRange=month`}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        View Check-ins
                      </Link>
                    </div>
                  </div>

                  {/* Session Balance & Upcoming Sessions */}
                  <div className="space-y-4">
                    {/* Session Balance Summary */}
                    {sessionBalance && sessionBalance.available !== undefined && (
                    <div className="p-4 bg-primary/5 rounded-lg">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Total Purchased</p>
                          <p className="text-2xl font-bold text-blue-600">{sessionBalance.purchased || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Used</p>
                          <p className="text-2xl font-bold text-gray-600">{sessionBalance.used || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Available</p>
                          <p className="text-2xl font-bold text-green-600">{sessionBalance.available || 0}</p>
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Upcoming Sessions - Collapsible */}
                    <div>
                      <button
                        onClick={() => setIsSessionsExpanded(!isSessionsExpanded)}
                        className="flex items-center justify-between w-full text-left mb-3 group"
                      >
                        <h4 className="font-semibold">
                          Upcoming Sessions {!isSessionsExpanded && `(${upcomingSessions.length})`}
                        </h4>
                        {isSessionsExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500 group-hover:text-gray-700 transition-colors" />
                        )}
                      </button>
                      
                      {isSessionsExpanded && (
                        <>
                          {upcomingSessions.length > 0 ? (
                            <div className="space-y-2">
                              {upcomingSessions.slice(0, 5).map((session) => (
                              <div key={session.id} className="p-3 bg-gray-50 rounded-lg transition-all duration-200 hover:bg-gray-100 hover:shadow-md hover:-translate-y-0.5">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {formatSessionDate(session.scheduledDate)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {formatSessionTimeRange(session.scheduledDate, session.duration)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      📍 {sessionLocations.get(session.id) || 'Loading location...'}
                                    </p>
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
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg">
                              <span className="text-4xl mb-2 block">🗓️</span>
                              <p className="text-sm text-gray-600">No upcoming sessions scheduled</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Tip */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800">
                    💡 <strong>Tip:</strong> Track workout assignments and in-person sessions in one place. Sessions are scheduled by clients through their dashboard.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'nutrition' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">🍎 Nutrition</h2>
                    <p className="text-gray-600">Monitor client nutrition adherence and progress</p>
                  </div>
                  <Link
                    href={`/dashboard/trainer/client-hub/${clientId}/nutrition`}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    View Nutrition Dashboard
                  </Link>
                </div>

                {/* Quick Overview */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                  <h3 className="text-lg font-semibold mb-3">Nutrition Overview</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Track your client's nutrition adherence across their assigned approach:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>Macro Tracking:</strong> Daily calorie and macronutrient adherence with meal completion</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>Healthy Habits:</strong> Daily habit completion tracking with streak monitoring</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span><strong>Meal Plan:</strong> Weekly meal plan adherence with simplified tracking</span>
                    </li>
                  </ul>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                    <h4 className="font-semibold mb-2">📅 Calendar View</h4>
                    <p className="text-sm text-muted-foreground">
                      Visual calendar with color-coded adherence levels for quick assessment
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                    <h4 className="font-semibold mb-2">📊 Daily Inspector</h4>
                    <p className="text-sm text-muted-foreground">
                      Detailed breakdown of meals, habits, and water intake for any selected day
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                    <h4 className="font-semibold mb-2">💧 Water Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Monitor daily water intake against goals across all nutrition approaches
                    </p>
                  </div>
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-4 transition-all duration-300 hover:shadow-glow">
                    <h4 className="font-semibold mb-2">🔥 Habit Streaks</h4>
                    <p className="text-sm text-muted-foreground">
                      Track consecutive days of full habit completion to motivate consistency
                    </p>
                  </div>
                </div>

                {/* Call to Action */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Access the full nutrition dashboard to view detailed adherence data, 
                    analyze trends, and gain insights into your client's eating patterns. Configure the nutrition 
                    approach in the Plan tab if not already set.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">📈 Progress</h2>
                  <p className="text-gray-600">All progress tracking and measurements</p>
                </div>

                {progressLoading ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">Loading progress data...</p>
                  </div>
                ) : (
                  <>
                    {/* Progress Categories Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Body Metrics */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <span className="text-2xl">⚖️</span>
                          </div>
                          <h3 className="text-xl font-semibold">Body Metrics</h3>
                        </div>
                        {latestWeight ? (
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold text-foreground">
                                {latestWeight.weight}
                              </span>
                              <span className="text-sm text-muted-foreground">{latestWeight.unit}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Last logged: {new Date(latestWeight.date).toLocaleDateString()}
                            </p>
                            {latestWeight.bodyFat && (
                              <p className="text-sm text-muted-foreground">
                                Body Fat: {latestWeight.bodyFat}%
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No weight data logged yet</p>
                        )}
                      </div>

                      {/* Progress Photos */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <span className="text-2xl">📸</span>
                          </div>
                          <h3 className="text-xl font-semibold">Progress Photos</h3>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold text-foreground">
                              {progressPhotosCount}
                            </span>
                            <span className="text-sm text-muted-foreground">photos</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Visual transformation timeline
                          </p>
                        </div>
                      </div>

                      {/* Activity Tracking */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <span className="text-2xl">🚶</span>
                          </div>
                          <h3 className="text-xl font-semibold">Daily Activity</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Steps, water intake, and habits tracked daily
                        </p>
                        <button
                          onClick={() => router.push(`/dashboard/client/activity`)}
                          className="mt-3 text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          View Activity Logs →
                        </button>
                      </div>

                      {/* Surveys */}
                      <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <span className="text-2xl">📋</span>
                          </div>
                          <h3 className="text-xl font-semibold">Surveys & Feedback</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Qualitative progress assessments
                        </p>
                        <button
                          onClick={() => router.push(`/dashboard/client/survey`)}
                          className="mt-3 text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          View Surveys →
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'support' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">💬 Support</h2>
                  <p className="text-gray-600">Communication and check-ins</p>
                </div>

                {/* Support Categories */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Messages */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <span className="text-2xl">💬</span>
                      </div>
                      <h3 className="text-xl font-semibold">Messages</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">Direct communication history</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                        className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                      >
                        Send Message
                      </button>
                      <button
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                        className="text-primary hover:text-primary/80 text-sm font-medium px-4 py-2"
                      >
                        View All →
                      </button>
                    </div>
                  </div>

                  {/* Weekly Check-ins */}
                  <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-primary/10 rounded-full">
                        <span className="text-2xl">📝</span>
                      </div>
                      <h3 className="text-xl font-semibold">Weekly Check-ins</h3>
                    </div>
                    
                    {checkinsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading check-ins...</p>
                    ) : recentCheckins.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="text-center p-2 bg-background/50 rounded">
                            <p className="text-2xl font-bold text-foreground">{recentCheckins.length}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                          <div className="text-center p-2 bg-background/50 rounded">
                            <p className="text-2xl font-bold text-foreground">
                              {recentCheckins.filter(c => c.status === 'completed').length}
                            </p>
                            <p className="text-xs text-muted-foreground">Completed</p>
                          </div>
                        </div>
                        
                        {/* Most recent check-in */}
                        {recentCheckins[0] && (
                          <div className="p-3 bg-background/50 rounded-lg">
                            <div className="flex items-start justify-between mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {recentCheckins[0].status === 'scheduled' ? 'Upcoming' : 'Last Check-in'}
                              </span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                recentCheckins[0].status === 'completed' ? 'bg-green-100 text-green-700' :
                                recentCheckins[0].status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {recentCheckins[0].status}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {recentCheckins[0].scheduledDate.toLocaleDateString('en-US', { 
                                weekday: 'short',
                                month: 'short', 
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </p>
                            {recentCheckins[0].duration && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {recentCheckins[0].duration} minutes
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No check-ins scheduled yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Messages Preview */}
                <div className="bg-primary/5 border border-primary/50 rounded-lg p-6 transition-all duration-300 hover:shadow-glow">
                  <h3 className="text-lg font-semibold mb-3">Recent Messages</h3>
                  
                  {messagesLoading ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground">Loading messages...</p>
                    </div>
                  ) : recentMessages.length > 0 ? (
                    <div className="space-y-3">
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
                      <button
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                        className="w-full mt-2 text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        View All Messages →
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-muted-foreground mb-3">No messages yet</p>
                      <button
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${clientData.id}`)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        Start a Conversation →
                      </button>
                    </div>
                  )}
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
                                {clientBillingData.stripeCustomerId && (
                                  <div>
                                    <a
                                      href={`https://dashboard.stripe.com/customers/${clientBillingData.stripeCustomerId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
                                    >
                                      View in Stripe
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </div>
                                )}
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
                                        <td className="py-3 px-4 text-xs text-gray-900">{pkg.stripeProductName || 'Session Package'}</td>
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
