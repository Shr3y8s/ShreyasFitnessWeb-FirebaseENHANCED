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
import { AlertCircle } from 'lucide-react';
import { SessionCard } from '@/components/sessions/SessionCard';
import { SessionFiltersCard } from '@/components/sessions/SessionFiltersCard';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Training Session Management Page
 * 
 * Allows trainers to view and manage all training sessions for their clients.
 * Features:
 * - View upcoming and completed sessions
 * - Filter by client, date range, and status
 * - Mark sessions as complete, no-show, or cancel them
 * - Add session notes
 * - Manage session package expirations
 */
export default function TrainingSessionsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Map<string, string>>(new Map());
  const [packageExpirations, setPackageExpirations] = useState<Map<string, Date>>(new Map());
  
  // Initialize filters from URL parameters
  const [filters, setFilters] = useState<SessionFilters>(() => {
    const clientId = searchParams.get('clientId');
    
    return {
      sessionType: 'training', // Only show training sessions
      ...(clientId && { clientId })
    };
  });
  
  // Fetch sessions using custom hook
  const { sessions, stats, loading: sessionsLoading, error: sessionsError } = useTrainerSessions(
    user?.uid || null,
    filters
  );

  // Fetch training locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const locationsRef = collection(db, 'training_locations');
        const snapshot = await getDocs(locationsRef);
        
        const locationMap = new Map<string, string>();
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          locationMap.set(doc.id, data.address || 'Unknown Location');
        });
        
        setLocations(locationMap);
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchLocations();
  }, []);

  // Fetch package expiration dates
  useEffect(() => {
    const fetchPackageExpirations = async () => {
      if (!sessions.length) return;

      try {
        // Get unique client/package combinations
        const clientPackages = new Map<string, Set<string>>();
        sessions.forEach(session => {
          if (session.sessionType === 'training' && 'packageId' in session) {
            if (!clientPackages.has(session.clientId)) {
              clientPackages.set(session.clientId, new Set());
            }
            clientPackages.get(session.clientId)!.add(session.packageId);
          }
        });

        const expirationMap = new Map<string, Date>();

        // Fetch each client's user document to access sessionPackages array
        for (const [clientId, packageIds] of clientPackages.entries()) {
          try {
            const userDocRef = doc(db, 'users', clientId);
            const userSnap = await getDoc(userDocRef);
            
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const sessionPackages = userData?.sessionPackages || [];
              
              sessionPackages.forEach((pkg: any) => {
                if (packageIds.has(pkg.id)) {
                  const expDate = pkg.expirationDate?.toDate?.() || 
                                  (typeof pkg.expirationDate === 'number' ? new Date(pkg.expirationDate) : null);
                  if (expDate) {
                    expirationMap.set(pkg.id, expDate);
                  }
                }
              });
            }
          } catch (error) {
            console.error(`Error fetching packages for client ${clientId}:`, error);
          }
        }

        setPackageExpirations(expirationMap);
      } catch (error) {
        console.error('Error fetching package expirations:', error);
      }
    };

    fetchPackageExpirations();
  }, [sessions]);

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
      <TrainerSidebar currentPage="training-sessions" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-2">
            <Breadcrumb items={[
              { label: 'Training' },
              { label: 'Training Sessions' }
            ]} />
          </div>

          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Training Session Management</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all your training sessions
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

          {/* Error Display */}
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
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Sessions ({sessions.length})
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
                    No sessions found. Sessions will appear here once you schedule training sessions or check-ins with your clients.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    locations={locations}
                    packageExpirations={packageExpirations}
                    onMarkComplete={(id) => console.log('Mark complete:', id)}
                    onMarkNoShow={(id) => console.log('Mark no-show:', id)}
                    onCancel={(id) => console.log('Cancel:', id)}
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
