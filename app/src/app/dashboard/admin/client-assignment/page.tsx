'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { TrendingUp, UserPlus, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminClientAssignmentPage() {
  const router = useRouter();
  const { user, loading: authLoading, canAccessAdminDashboard } = useAuth();

  useEffect(() => {
    // Wait for auth to resolve before guarding — otherwise a hard reload (when
    // user/role are momentarily null) would bounce the admin to /dashboard/trainer.
    if (authLoading) return;
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
    }
  }, [user, authLoading, canAccessAdminDashboard, router]);

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="client-assignment" />
      <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Client Assignment</h1>
              <p className="text-gray-600 mt-2">
                Assign clients to trainers and manage workload distribution
              </p>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="max-w-md mx-auto">
                <TrendingUp className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                <p className="text-gray-600 mb-6">
                  Client assignment tools are under development. This page will allow you to:
                </p>
                <ul className="text-left text-gray-600 space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <UserPlus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Assign clients to specific trainers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>View and balance trainer workload</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Track client-trainer relationships</span>
                  </li>
                </ul>
                <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
