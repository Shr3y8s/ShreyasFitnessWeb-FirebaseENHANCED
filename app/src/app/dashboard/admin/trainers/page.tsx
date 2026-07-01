'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Users, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminTrainersPage() {
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
      <AdminSidebar currentPage="trainers" />
      <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Trainer Management</h1>
              <p className="text-gray-600 mt-2">
                Manage staff trainers and permissions
              </p>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="max-w-md mx-auto">
                <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                <p className="text-gray-600 mb-6">
                  Trainer management features are under development. This page will allow you to:
                </p>
                <ul className="text-left text-gray-600 space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <Plus className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Add and remove staff trainers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Manage trainer permissions and access levels</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>View trainer workload and client assignments</span>
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
