'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Bell, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationSettings {
  emailEnabled: boolean;
  updatedAt?: any;
  updatedBy?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessAdminDashboard } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<{ at?: Date; by?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    // Wait for auth to resolve before guarding — otherwise a hard reload (when
    // user/role are momentarily null) would bounce the admin to /dashboard/trainer.
    if (authLoading) return;
    if (!user || !canAccessAdminDashboard) {
      router.push('/dashboard/trainer');
    }
  }, [user, authLoading, canAccessAdminDashboard, router]);

  // Load current notification settings
  useEffect(() => {
    if (authLoading || !user || !canAccessAdminDashboard) return;

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'appSettings', 'notifications'));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as NotificationSettings;
          // Missing field defaults to enabled
          setEmailEnabled(data.emailEnabled !== false);
          setLastUpdated({
            at: data.updatedAt?.toDate ? data.updatedAt.toDate() : undefined,
            by: data.updatedBy,
          });
        } else {
          // Missing doc defaults to enabled
          setEmailEnabled(true);
        }
      } catch (err: any) {
        if (!cancelled) setError('Failed to load notification settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, canAccessAdminDashboard]);

  const handleToggle = async () => {
    if (saving || !user) return;
    const next = !emailEnabled;
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      await setDoc(
        doc(db, 'appSettings', 'notifications'),
        {
          emailEnabled: next,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.name || user.email || user.uid,
        },
        { merge: true }
      );
      setEmailEnabled(next);
      setLastUpdated({ at: new Date(), by: userData?.name || user.email || user.uid });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (err: any) {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarProvider>
      <AdminSidebar currentPage="settings" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-600 mt-2">
                Configure platform-wide settings and preferences
              </p>
            </div>

            {/* Notification Settings Card */}
            <div className="bg-white rounded-xl border p-6 md:p-8">
              <div className="flex items-start gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <Bell className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Master control for all automated client notification emails
                    (new workout assignments and trainer messages).
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Loading settings…</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 rounded-lg border bg-gray-50 p-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        Client notification emails
                      </p>
                      <p className="text-sm text-gray-600 mt-0.5">
                        {emailEnabled
                          ? 'Enabled — clients receive emails according to their own preferences.'
                          : 'Disabled — no client notification emails are sent, regardless of individual preferences.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={emailEnabled}
                      aria-label="Toggle client notification emails"
                      disabled={saving}
                      onClick={handleToggle}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:opacity-50 ${
                        emailEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          emailEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Status row */}
                  <div className="mt-4 flex items-center gap-3 min-h-[24px]">
                    {saving && (
                      <span className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                      </span>
                    )}
                    {savedFlash && !saving && (
                      <span className="flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Saved
                      </span>
                    )}
                    {error && (
                      <span className="flex items-center gap-2 text-sm text-red-600">
                        <AlertTriangle className="h-4 w-4" /> {error}
                      </span>
                    )}
                  </div>

                  {lastUpdated?.at && (
                    <p className="mt-3 text-xs text-gray-400">
                      Last changed{lastUpdated.by ? ` by ${lastUpdated.by}` : ''} on{' '}
                      {lastUpdated.at.toLocaleString()}
                    </p>
                  )}

                  {!emailEnabled && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      <strong>Note:</strong> This is a global kill-switch. It does not
                      affect transactional emails (verification codes, welcome emails,
                      billing receipts).
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6">
              <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
