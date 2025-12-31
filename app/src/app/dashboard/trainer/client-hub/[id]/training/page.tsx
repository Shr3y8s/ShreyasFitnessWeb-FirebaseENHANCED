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

export default function ClientTrainingDashboard() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);

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
                <h1 className="text-2xl font-bold">{clientData.name} - Training Dashboard</h1>
                <p className="text-gray-600">Comprehensive workout performance and progress tracking</p>
              </div>
            </div>
          </div>

          {/* SECTION 1: Performance Snapshot Cards */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Performance Snapshot</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Completion Rate */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Completion Rate</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">85%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">17/20 workouts completed</p>
                <p className="text-xs text-green-600 mt-1">↑ +5% vs previous period</p>
              </Card>

              {/* Card 2: On-Time Completion */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-sm text-gray-600">On-Time Completion</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">70%</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </div>
                <p className="text-sm text-gray-600">12/17 within deadline</p>
                <div className="flex gap-2 mt-1 text-xs">
                  <span className="text-yellow-600">⚠️ 3 late</span>
                  <span className="text-red-600">🔴 2 overdue</span>
                </div>
              </Card>

              {/* Card 3: Avg Duration */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Avg Workout Duration</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">Last 4 Weeks</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">52<span className="text-lg"> min</span></p>
                  <p className="text-xs text-gray-500 mt-1">Range: 35-68 min</p>
                </div>
                <p className="text-sm text-gray-600">Target: 45-60 min</p>
                <p className="text-xs text-green-600 mt-1">✓ Mostly within range</p>
              </Card>

              {/* Card 4: Training Streak */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="h-5 w-5 text-orange-600" />
                  <h3 className="font-semibold text-sm text-gray-600">Current Streak</h3>
                </div>
                <p className="text-xs text-gray-500 mb-3">&nbsp;</p>
                <div className="mb-3">
                  <p className="text-4xl font-bold text-gray-900">5 <span className="text-lg">days 🔥</span></p>
                </div>
                <p className="text-sm text-gray-600">Longest: 12 days</p>
                <p className="text-xs text-gray-500 mt-1">Last workout: Today</p>
              </Card>
            </div>
          </div>

          {/* SECTION 2: Session Management Quick Links */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Session Management</h2>
            <div className="bg-white rounded-xl border p-6">
              <p className="text-sm text-gray-600 mb-4">
                Manage in-person training sessions and weekly check-ins with {clientData.name}
              </p>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Link 
                  href={`/dashboard/trainer/training-sessions?clientId=${clientId}&dateRange=month`}
                  className="block p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">View All In-person Sessions</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Manage scheduled training sessions, track attendance, and add session notes
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <span>Open Session Manager</span>
                    <span>→</span>
                  </div>
                </Link>

                <Link 
                  href={`/dashboard/trainer/weekly-checkins?clientId=${clientId}&dateRange=month`}
                  className="block p-6 border-2 border-gray-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">View All Check-ins</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Review weekly accountability check-ins and track progress discussions
                  </p>
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <span>Open Check-in Manager</span>
                    <span>→</span>
                  </div>
                </Link>
              </div>

              {/* Mini Stats */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-sm text-gray-700 mb-4">Session Summary (This Month)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Next Session</p>
                    <p className="font-semibold text-gray-900">Jan 2, 3:00 PM</p>
                    <p className="text-xs text-gray-500 mt-1">In-person Training</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Sessions This Month</p>
                    <p className="font-semibold text-gray-900">8 / 12</p>
                    <p className="text-xs text-gray-500 mt-1">67% completion rate</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 mb-1">Last Check-in</p>
                    <p className="font-semibold text-gray-900">Dec 28</p>
                    <p className="text-xs text-gray-500 mt-1">3 days ago</p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Session data is filtered to "This Month" by default. Use the date filters on the session pages to view different time ranges.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Performance Metrics & Trends */}
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
              <strong>📝 Phase 1 Complete:</strong> Page structure with all 3 sections visible. 
              Next: Phase 2 will add real data fetching and calculations.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
