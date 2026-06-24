'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getPaymentProvider } from '@/lib/payments';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { 
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  CreditCard,
  MapPin,
  Settings,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessAdminDashboard } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mrr, setMrr] = useState(0);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [totalTrainers, setTotalTrainers] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return;

      // Redirect if not admin
      if (!canAccessAdminDashboard) {
        router.push('/dashboard');
        return;
      }

      if (!userData) {
        router.push('/login');
        return;
      }

      try {
        // Load business metrics
        await loadBusinessMetrics();
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      }

      setLoading(false);
    };

    const loadBusinessMetrics = async () => {
      try {
        // MRR + active subscriptions come from the active payment provider via the
        // neutral interface (no provider-specific Firestore reads in the page).
        try {
          const provider = getPaymentProvider();
          if (provider.capabilities.adminAnalytics && provider.getRevenueMetrics) {
            const metrics = await provider.getRevenueMetrics();
            setMrr(metrics.mrr / 100); // minor units → dollars
            setActiveSubscriptions(metrics.activeSubscriptions);
          }
        } catch (subError) {
          console.log('Revenue metrics not available yet:', subError);
        }

        // Load pending accounts
        try {
          const pendingQuery = query(
            collection(db, 'users'),
            where('accountActivated', '==', false)
          );
          const pendingSnapshot = await getDocs(pendingQuery);
          setPendingAccounts(pendingSnapshot.size);
        } catch (pendingError) {
          console.log('Pending accounts data not available yet:', pendingError);
        }

        // Load total clients
        try {
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client')
          );
          const clientsSnapshot = await getDocs(clientsQuery);
          setTotalClients(clientsSnapshot.size);
        } catch (clientError) {
          console.log('Clients data not available yet:', clientError);
        }

        // Load total trainers (admins + staff)
        try {
          const adminsQuery = query(
            collection(db, 'admins'),
            where('canTrain', '==', true)
          );
          const trainersQuery = query(collection(db, 'trainers'));
          
          const [adminsSnapshot, trainersSnapshot] = await Promise.all([
            getDocs(adminsQuery),
            getDocs(trainersQuery)
          ]);
          
          setTotalTrainers(adminsSnapshot.size + trainersSnapshot.size);
        } catch (trainerError) {
          console.log('Trainers data not available yet:', trainerError);
        }

      } catch (error) {
        console.error('Error loading business metrics:', error);
      }
    };

    fetchData();
  }, [user, userData, authLoading, canAccessAdminDashboard, router]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="overview" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Business Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your fitness business operations
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/trainer')}
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Switch to Training Dashboard
          </Button>
        </div>

        {/* Financial Metrics */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Financial Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/admin/revenue">
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Monthly Recurring Revenue</p>
                    <p className="text-xl font-bold text-gray-900">${mrr.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/revenue">
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Active Subscriptions</p>
                    <p className="text-xl font-bold text-gray-900">{activeSubscriptions}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/pending-accounts">
              <div className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
                pendingAccounts > 10 ? 'border-orange-300 bg-orange-50' : ''
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    pendingAccounts > 10 ? 'bg-orange-100' : 'bg-yellow-100'
                  }`}>
                    <Clock className={`h-5 w-5 ${
                      pendingAccounts > 10 ? 'text-orange-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Pending Accounts</p>
                    <p className="text-xl font-bold text-gray-900">
                      {pendingAccounts}
                      {pendingAccounts > 10 && <span className="text-orange-600"> ⚠️</span>}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

          </div>
        </div>

        {/* Business Operations */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Business Operations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/admin/trainers">
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Trainers</p>
                    <p className="text-xl font-bold text-gray-900">{totalTrainers}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/client-assignment">
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Total Clients</p>
                    <p className="text-xl font-bold text-gray-900">{totalClients}</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/dashboard/admin/locations">
              <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Training Locations</p>
                    <p className="text-xl font-bold text-gray-900">Manage</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Link href="/dashboard/admin/revenue">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <DollarSign className="h-5 w-5 mr-2 text-emerald-600" />
                <span>View Revenue</span>
              </Button>
            </Link>

            <Link href="/dashboard/admin/trainers">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <Users className="h-5 w-5 mr-2 text-purple-600" />
                <span>Manage Trainers</span>
              </Button>
            </Link>

            <Link href="/dashboard/admin/client-assignment">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
                <span>Assign Clients</span>
              </Button>
            </Link>

            <Link href="/dashboard/admin/settings">
              <Button variant="outline" className="w-full justify-start h-auto p-4">
                <Settings className="h-5 w-5 mr-2 text-gray-600" />
                <span>System Settings</span>
              </Button>
            </Link>
          </div>
        </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
