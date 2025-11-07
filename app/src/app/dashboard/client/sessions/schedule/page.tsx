'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Timestamp, collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { TrainingSession, SessionBalance } from '@/types/session';

const mockUpcomingSessions: TrainingSession[] = [
  {
    id: 'sess_1',
    clientId: 'user_123',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    trainerId: 'trainer_1',
    packageId: 'pkg_1',
    calendlyEventId: 'evt_123',
    calendlyEventUri: 'https://calendly.com/...',
    scheduledDate: Timestamp.fromDate(new Date('2024-11-20T14:00:00')),
    duration: 60,
    status: 'scheduled',
    creditReturned: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  },
  {
    id: 'sess_2',
    clientId: 'user_123',
    clientName: 'John Doe',
    clientEmail: 'john@example.com',
    trainerId: 'trainer_1',
    packageId: 'pkg_2',
    calendlyEventId: 'evt_456',
    calendlyEventUri: 'https://calendly.com/...',
    scheduledDate: Timestamp.fromDate(new Date('2024-11-27T10:00:00')),
    duration: 60,
    status: 'scheduled',
    creditReturned: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }
];

export default function ScheduleSessionsPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading } = useAuth();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionBalance, setSessionBalance] = useState<SessionBalance>({
    available: 0,
    purchased: 0,
    used: 0,
    expired: 0,
    lastUpdated: Timestamp.now()
  });

  // Load Calendly script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Listen to user document for real-time session balance
  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessionBalance(data.sessionBalance || {
          available: 0,
          purchased: 0,
          used: 0,
          expired: 0,
          lastUpdated: Timestamp.now()
        });
      }
    }, (error) => {
      console.error('Error listening to session balance:', error);
    });

    return () => unsubscribe();
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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TrainingSession[];
      setUpcomingSessions(sessions);
      setLoadingSessions(false);
    }, (error) => {
      console.error('Error fetching sessions:', error);
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [user]);

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

  const handleCancelSession = async (sessionId: string) => {
    setCancelling(sessionId);
    
    try {
      // TODO: Implement actual cancellation via Cloud Function
      // const cancelSession = httpsCallable(functions, 'cancelSession');
      // await cancelSession({ sessionId, canceledBy: 'client' });
      
      // For now, show demo message
      alert('🎉 This is a UI demo! In production, this will cancel the session and refund the credit if >24h notice.');
    } catch (error) {
      console.error('Error canceling session:', error);
      alert('Failed to cancel session. Please try again.');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (timestamp: Timestamp) => {
    return new Date(timestamp.toMillis()).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: Timestamp) => {
    return new Date(timestamp.toMillis()).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Schedule Training Sessions</h1>
              <p className="text-muted-foreground">
                Book your one-on-one training sessions with your coach
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
                    data-url={`https://calendly.com/shreyas-annapureddy/1-1-training-session?hide_gdpr_banner=1&primary_color=4caf50${userData?.name ? `&name=${encodeURIComponent(userData.name)}` : ''}${userData?.email ? `&email=${encodeURIComponent(userData.email)}` : ''}`}
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
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-semibold text-foreground">
                                {formatDate(session.scheduledDate)}
                              </div>
                              <div className="text-primary font-medium">
                                {formatTime(session.scheduledDate)}
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              Confirmed
                            </span>
                          </div>

                          <div className="text-sm text-muted-foreground mb-3">
                            Duration: {session.duration} minutes
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
                            onClick={() => handleCancelSession(session.id)}
                            disabled={cancelling === session.id}
                            className={`w-full text-sm py-2 rounded-lg font-medium transition-colors ${
                              canCancel
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-muted text-muted-foreground cursor-not-allowed'
                            }`}
                          >
                            {cancelling === session.id ? 'Cancelling...' : 
                             canCancel ? 'Cancel Session (Get Refund)' : 'Cancel Session (No Refund)'}
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
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
