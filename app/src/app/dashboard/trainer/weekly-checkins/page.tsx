'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useTrainerSessions } from '@/hooks/useTrainerSessions';
import type { SessionFilters } from '@/lib/session-management-api';
import { markSessionComplete, markSessionIncomplete, cancelSession, updateSessionNotes } from '@/lib/session-management-api';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { SessionCard } from '@/components/sessions/SessionCard';
import { SessionFiltersCard } from '@/components/sessions/SessionFiltersCard';

/**
 * Weekly Check-ins Management Page
 * 
 * Allows trainers to view and manage all weekly check-in sessions for their clients.
 * Features:
 * - View upcoming and completed check-ins
 * - Filter by client, date range, and status
 * - Mark check-ins as complete, no-show, or cancel them
 * - Add session notes
 */
export default function WeeklyCheckinsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<SessionFilters>(() => {
    const clientId = searchParams.get('clientId');
    
    return {
      sessionType: 'checkin', // Only show check-in sessions
      ...(clientId && { clientId })
    };
  });
  
  // Fetch sessions using custom hook
  const { sessions, stats, loading: sessionsLoading, error: sessionsError, refetch } = useTrainerSessions(
    user?.uid || null,
    filters
  );

  useEffect(() => {
    // Wait for auth to complete
    if (authLoading) {
      return;
    }

    // Check if user is authenticated
    if (!user) {
      router.push('/login');
      return;
    }

    // Check if userData is loaded and user has proper role
    if (userData && userData.role !== 'trainer' && userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    // Only set loading to false if we have userData
    if (userData) {
      setLoading(false);
    }
  }, [user, userData, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="weekly-checkins" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-2">
            <Breadcrumb items={[
              { label: 'Training' },
              { label: 'Weekly Check-ins' }
            ]} />
          </div>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Weekly Check-ins Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your weekly check-in sessions
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {sessionsLoading ? '...' : stats?.today ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Today</p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {sessionsLoading ? '...' : stats?.week ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">This Week</p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {sessionsLoading ? '...' : stats?.month ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">This Month</p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-red-50 border border-red-500/50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {sessionsLoading ? '...' : stats?.noShows ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">No-Shows</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Section */}
          <SessionFiltersCard
            currentFilters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(prev => ({
                ...prev,
                ...newFilters
              }));
            }}
            trainerId={user?.uid || ''}
          />

          {/* Success Message */}
          {successMessage && (
            <Card className="mb-6 mt-6 bg-green-50 border border-green-500/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <p>{successMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Messages */}
          {errorMessage && (
            <Card className="mb-6 mt-6 bg-red-50 border border-red-500/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p>{errorMessage}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {sessionsError && (
            <Card className="mb-6 mt-6 bg-red-50 border border-red-500/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p>{sessionsError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sessions List */}
          <div>
            <div className="mt-8 mb-4">
              <h2 className="text-xl font-semibold">
                Check-ins ({sessions.length})
              </h2>
            </div>

            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : sessions.length === 0 ? (
              <Card className="bg-white border border-gray-200">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">
                    No check-ins found. Check-in sessions will appear here once you schedule them with your clients.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    locations={undefined}
                    packageExpirations={undefined}
                    onMarkComplete={async (sessionId, notes) => {
                      try {
                        await markSessionComplete(sessionId, notes, false);
                        setSuccessMessage('Check-in marked as complete successfully!');
                        setTimeout(() => setSuccessMessage(null), 3000);
                        // Refetch to update UI immediately
                        await refetch();
                      } catch (error) {
                        setErrorMessage('Failed to mark check-in as complete. Please try again.');
                        setTimeout(() => setErrorMessage(null), 5000);
                      }
                    }}
                    onMarkIncomplete={async (sessionId) => {
                      try {
                        await markSessionIncomplete(sessionId);
                        setSuccessMessage('Check-in reverted to scheduled successfully!');
                        setTimeout(() => setSuccessMessage(null), 3000);
                        // Refetch to update UI immediately
                        await refetch();
                      } catch (error) {
                        setErrorMessage('Failed to revert check-in. Please try again.');
                        setTimeout(() => setErrorMessage(null), 5000);
                      }
                    }}
                    onCancel={async (sessionId) => {
                      const reason = prompt('Please provide a reason for cancellation:');
                      if (!reason) return;
                      
                      try {
                        await cancelSession(sessionId, reason, false);
                        setSuccessMessage('Check-in cancelled successfully.');
                        setTimeout(() => setSuccessMessage(null), 3000);
                        // Refetch to update UI immediately
                        await refetch();
                      } catch (error) {
                        setErrorMessage('Failed to cancel check-in. Please try again.');
                        setTimeout(() => setErrorMessage(null), 5000);
                      }
                    }}
                    onNotesUpdate={async (sessionId, notes) => {
                      try {
                        await updateSessionNotes(sessionId, notes, false);
                      } catch (error) {
                        throw new Error('Failed to save notes');
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
