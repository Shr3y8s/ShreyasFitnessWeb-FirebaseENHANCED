'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { Timestamp, collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { TrainingSession, SessionBalance } from '@/types/session';
import { TrainingLocation } from '@/types/location';
import { Calendar, MapPin } from 'lucide-react';

// Declare Calendly types
declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (config: {
        url: string | null;
        parentElement: HTMLElement;
      }) => void;
    };
  }
}

export default function ScheduleSessionsPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [sessionToCancel, setSessionToCancel] = useState<TrainingSession | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([]);
  const [sessionLocations, setSessionLocations] = useState<Map<string, string>>(new Map());
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionBalance, setSessionBalance] = useState<SessionBalance>({
    available: 0,
    purchased: 0,
    used: 0,
    expired: 0,
    lastUpdated: Timestamp.now()
  });
  const [nextExpirationDate, setNextExpirationDate] = useState<Date | null>(null);

  // Listen to user document for real-time session balance
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const packages = data.sessionPackages || [];
        
        setSessionBalance(data.sessionBalance || {
          available: 0,
          purchased: 0,
          used: 0,
          expired: 0,
          lastUpdated: Timestamp.now()
        });

        // Calculate earliest expiration date from active packages (FIFO)
        const activePackages = packages
          .filter((pkg: any) => !pkg.expired && pkg.remaining > 0)
          .sort((a: any, b: any) => a.purchaseDate.toMillis() - b.purchaseDate.toMillis());

        if (activePackages.length > 0) {
          const earliestPackage = activePackages[0];
          setNextExpirationDate(earliestPackage.expirationDate.toDate());
        } else {
          setNextExpirationDate(null);
        }
      }
    }, (error) => {
      console.error('Error listening to session balance:', error);
    });

    // Register with centralized registry
    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Fetch real upcoming sessions from Firestore
  useEffect(() => {
    if (!user) {
      setLoadingSessions(false);
      return;
    }

    const sessionsRef = collection(db, 'sessions');
    const q = query(
      sessionsRef,
      where('clientId', '==', user.uid),
      where('status', '==', 'scheduled'),
      where('scheduledDate', '>=', Timestamp.now()),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Filter out check-in sessions (they don't have location data)
      const allSessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      const sessions = allSessions.filter(session => 
        session.sessionType !== 'checkin'
      ) as TrainingSession[];
      
      // Fetch locations for all training sessions
      const locationMap = new Map<string, string>();
      
      for (const session of sessions) {
        try {
          if (session.locationType === 'private') {
            // Fetch client's address
            const clientDoc = await getDoc(doc(db, 'users', session.clientId));
            if (clientDoc.exists()) {
              const clientData = clientDoc.data();
              if (clientData.address) {
                // Handle address object - convert to string
                if (typeof clientData.address === 'string') {
                  locationMap.set(session.id, clientData.address);
                } else {
                  // Address is an object {street, city, state, zipCode, country}
                  const addr = clientData.address;
                  const formattedAddress = [addr.street, addr.city, addr.state, addr.zipCode]
                    .filter(Boolean)
                    .join(', ');
                  locationMap.set(session.id, formattedAddress || 'Private location');
                }
              } else {
                locationMap.set(session.id, 'Private location (address not set)');
              }
            }
          } else {
            // Fetch training location
            const locationDoc = await getDoc(doc(db, 'training_locations', session.locationId));
            if (locationDoc.exists()) {
              const locationData = locationDoc.data() as TrainingLocation;
              locationMap.set(session.id, locationData.address);
            } else {
              locationMap.set(session.id, 'Location TBD');
            }
          }
        } catch (error) {
          console.error(`Error fetching location for session ${session.id}:`, error);
          locationMap.set(session.id, 'Location unavailable');
        }
      }
      
      setSessionLocations(locationMap);
      setUpcomingSessions(sessions);
      setLoadingSessions(false);
    }, (error) => {
      console.error('Error fetching sessions:', error);
      setLoadingSessions(false);
    });

    // Register with centralized registry
    const { registerListener, unregisterListener } = require('@/lib/listener-registry');
    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  // Initialize Calendly widget on component mount
  useEffect(() => {
    // Only init if we have session credits available (widget is rendered)
    if (sessionBalance.available <= 0) return;

    let mounted = true;
    
    const initWidget = () => {
      if (!mounted) return;
      
      const widgetEl = document.querySelector('.calendly-inline-widget') as HTMLElement;
      
      if (window.Calendly && widgetEl) {
        // Clear any existing content first to prevent duplicates
        widgetEl.innerHTML = '';
        
        // Initialize the widget
        window.Calendly.initInlineWidget({
          url: widgetEl.getAttribute('data-url'),
          parentElement: widgetEl
        });
      } else if (!window.Calendly && mounted) {
        // Calendly script not loaded yet, retry after a short delay
        setTimeout(initWidget, 100);
      }
    };

    initWidget();

    return () => {
      mounted = false;
      // Clean up widget on unmount
      const widgetEl = document.querySelector('.calendly-inline-widget') as HTMLElement;
      if (widgetEl) {
        widgetEl.innerHTML = '';
      }
    };
  }, [sessionBalance.available]); // Re-init when session balance changes

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const confirmCancelSession = async () => {
    if (!sessionToCancel) return;
    
    setCancelling(sessionToCancel.id);
    
    try {
      const cancelSession = httpsCallable(functions, 'cancelSession');
      const result = await cancelSession({ 
        sessionId: sessionToCancel.id,
        reason: '' 
      });
      
      const data = result.data as { success: boolean; creditReturned: boolean };
      
      if (data.success) {
        // Show success message
        if (data.creditReturned) {
          alert('✅ Session canceled successfully! Credit returned to your balance.');
        } else {
          alert('✅ Session canceled. No credit returned (less than 24 hours notice).');
        }
      }
    } catch (error) {
      console.error('Error canceling session:', error);
      alert('Failed to cancel session. Please try again.');
    } finally {
      setCancelling(null);
      setSessionToCancel(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    const date = new Date(timestamp.toMillis());
    
    // Get timezone abbreviation
    const tzAbbr = new Date().toLocaleTimeString('en-US', { 
      timeZoneName: 'short' 
    }).split(' ').pop();
    
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${dateStr} (${tzAbbr})`;
  };

  const formatTimeRange = (timestamp: Timestamp, duration: number) => {
    const startDate = new Date(timestamp.toMillis());
    const endDate = new Date(startDate.getTime() + duration * 60000); // duration is in minutes
    
    // Get timezone abbreviation
    const tzAbbr = new Date().toLocaleTimeString('en-US', { 
      timeZoneName: 'short' 
    }).split(' ').pop();
    
    const startTime = startDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const endTime = endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${startTime} - ${endTime} ${tzAbbr}`;
  };

  const getHoursUntilSession = (timestamp: Timestamp) => {
    const now = Date.now();
    const sessionTime = timestamp.toMillis();
    const hoursUntil = (sessionTime - now) / (1000 * 60 * 60);
    return hoursUntil;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // No sessions available state
  if (sessionBalance.available === 0) {
    return (
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall ?? undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Schedule Training Sessions</h1>
                <p className="text-muted-foreground">
                  Book your one-on-one training sessions with your coach
                </p>
              </div>

              <div className="bg-card rounded-lg shadow-md p-12 text-center border border-border">
                <div className="text-6xl mb-4">📅</div>
                <h2 className="text-2xl font-bold text-foreground mb-3">No Sessions Available</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  You need to purchase session credits before you can schedule appointments with your trainer.
                </p>
                <Link
                  href="/dashboard/client/sessions/buy"
                  className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Buy Session Packages
                </Link>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // Has sessions available state
  return (
    <>
      <Script 
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <SidebarProvider>
        <ClientSidebar
          userName={userData?.name}
          userTier={userData?.tier}
          userProfilePhoto={userData?.profilePhotoSmall ?? undefined}
          onLogout={handleLogout}
        />
        <SidebarInset>
          <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Schedule 1-on-1 Training Sessions</h1>
              <p className="text-muted-foreground">
                Book your sessions and manage upcoming appointments.
              </p>
            </div>

            {/* Session Balance Banner */}
            <div className="bg-primary/10 border border-primary/50 rounded-lg p-6 mb-8 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium mb-1 text-foreground">Available Sessions</div>
                  <div className="text-4xl font-bold text-primary">{sessionBalance.available}</div>
                </div>
                <Link
                  href="/dashboard/client/sessions/buy"
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Buy More
                </Link>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Calendly Widget */}
              <div className="bg-card rounded-lg shadow-md p-6 border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Book a Session</h2>
                
                {/* Calendly Inline Widget */}
                <div className="calendly-container">
                  <div 
                    className="calendly-inline-widget"
                    data-url={`https://calendly.com/shreyas-annapureddy/1-1-training-session?hide_gdpr_banner=1&primary_color=4caf50${userData?.name ? `&name=${encodeURIComponent(userData.name)}` : ''}${userData?.email ? `&email=${encodeURIComponent(userData.email)}` : ''}${nextExpirationDate ? `&date_range_end=${nextExpirationDate.toISOString().split('T')[0]}` : ''}`}
                    style={{ minWidth: '320px', height: '700px' }}
                  ></div>
                </div>

                <div className="mt-6 space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>One session credit will be deducted when you book</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Cancel 24+ hours before for a full credit refund</span>
                  </div>
                  <div className="flex items-start">
                    <span className="text-green-600 mr-2">✓</span>
                    <span>Receive email confirmation after booking</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Sessions */}
              <div className="bg-card rounded-lg shadow-md p-6 border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Sessions</h2>
                
                {loadingSessions ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">⏳</div>
                    <p>Loading sessions...</p>
                  </div>
                ) : upcomingSessions.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="text-4xl mb-3">📅</div>
                    <p>No upcoming sessions scheduled</p>
                    <p className="text-sm mt-2">Book your first session to get started!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map((session) => {
                      const hoursUntil = getHoursUntilSession(session.scheduledDate);
                      const canCancel = hoursUntil > 24;

                      return (
                        <div
                          key={session.id}
                          className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="font-semibold text-foreground">
                              {formatDate(session.scheduledDate)}
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Confirmed
                            </span>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatTimeRange(session.scheduledDate, session.duration)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{sessionLocations.get(session.id) || 'Loading location...'}</span>
                            </div>
                          </div>

                          {hoursUntil <= 48 && hoursUntil > 24 && (
                            <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 mb-2">
                              ⚠️ Less than 48 hours away
                            </div>
                          )}

                          {hoursUntil <= 24 && (
                            <div className="text-xs text-red-600 bg-red-50 rounded px-2 py-1 mb-2">
                              ⚠️ Too late to cancel for refund
                            </div>
                          )}

                          <button
                            onClick={() => setSessionToCancel(session)}
                            disabled={cancelling === session.id}
                            className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
                              canCancel
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            {cancelling === session.id ? 'Cancelling...' : 'Cancel Session'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cancellation Policy */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-8">
              <h3 className="text-lg font-semibold text-amber-900 mb-3">⏰ Cancellation Policy</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-amber-800">
                <div>
                  <div className="font-semibold mb-2">Full Credit Refund</div>
                  <ul className="space-y-1">
                    <li>• Cancel <strong>24+ hours</strong> before session</li>
                    <li>• Credit returned to your balance immediately</li>
                    <li>• No questions asked</li>
                  </ul>
                </div>
                <div>
                  <div className="font-semibold mb-2">No Refund</div>
                  <ul className="space-y-1">
                    <li>• Cancel <strong>less than 24 hours</strong> before</li>
                    <li>• No-shows (missed sessions)</li>
                    <li>• Session credit will be lost</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cancel Confirmation Dialog */}
            {sessionToCancel && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6 border border-border">
                  <h3 className="text-xl font-bold text-foreground mb-4">⚠️ Cancel This Session?</h3>
                  
                  <div className="mb-4 p-4 bg-muted rounded-lg">
                    <div className="font-semibold text-foreground mb-1">
                      {formatDate(sessionToCancel.scheduledDate)}
                    </div>
                    <div className="text-primary font-medium">
                      {formatTimeRange(sessionToCancel.scheduledDate, sessionToCancel.duration)}
                    </div>
                  </div>

                  <div className="mb-6 space-y-3 text-sm">
                    {getHoursUntilSession(sessionToCancel.scheduledDate) > 24 ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="font-semibold text-green-800 mb-1">✓ Session Credit Will Be Returned</div>
                        <div className="text-green-700">You're canceling with more than 24 hours notice. Your session credit will be returned to your balance immediately.</div>
                      </div>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="font-semibold text-red-800 mb-1">⚠️ No Credit Refund</div>
                        <div className="text-red-700">Less than 24 hours notice - your session credit will not be returned per our cancellation policy.</div>
                      </div>
                    )}
                    
                    <div className="text-muted-foreground">
                      Need to reschedule? Use the "Reschedule" button instead to pick a new time without losing your credit.
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setSessionToCancel(null)}
                      disabled={cancelling !== null}
                      className="flex-1 px-4 py-2 rounded-lg font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      Go Back
                    </button>
                    <button
                      onClick={confirmCancelSession}
                      disabled={cancelling !== null}
                      className="flex-1 px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {cancelling ? 'Canceling...' : 'Confirm Cancellation'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    </>
  );
}
