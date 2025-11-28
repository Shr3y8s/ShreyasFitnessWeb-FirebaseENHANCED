'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Settings, Shield, Bell, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, canAccessAdminDashboard } = useAuth();

  useEffect(() => {
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
    }
  }, [user, canAccessAdminDashboard, router]);

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="settings" />
      <SidebarInset>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600 mt-2">
                Configure platform settings and preferences
              </p>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="max-w-md mx-auto">
                <Settings className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                <p className="text-gray-600 mb-6">
                  System settings are under development. This page will allow you to:
                </p>
                <ul className="text-left text-gray-600 space-y-2 mb-6">
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Configure security and access policies</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Manage notification preferences</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>System maintenance and data management</span>
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
