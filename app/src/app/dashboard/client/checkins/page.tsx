'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';
import { CALENDLY_URLS } from '@/lib/constants';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneCall, Calendar, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import {
  getCurrentWeekIdentifier,
  subscribeToCurrentWeekCheckin,
  subscribeToUpcomingCheckins,
  subscribeToPastCheckins,
  formatWeekRange,
  isEligibleForCheckins,
} from '@/lib/checkin-api';
import { CheckinSession } from '@/types/session';

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

// Production check-in URL from centralized constants
const CHECKIN_CALENDLY_URL = CALENDLY_URLS.WEEKLY_CHECKIN;

export default function WeeklyCheckinsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentWeekCheckin, setCurrentWeekCheckin] = useState<CheckinSession | null>(null);
  const [upcomingCheckins, setUpcomingCheckins] = useState<CheckinSession[]>([]);
  const [pastCheckins, setPastCheckins] = useState<CheckinSession[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState('');
  const [isEligible, setIsEligible] = useState(false);
  const [showWidget, setShowWidget] = useState(false);

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

  useEffect(() => {
    if (!user || !userData) {
      // Don't show anything until we have both user and userData
      setLoading(true);
      return;
    }

    // Check eligibility first
    const eligible = isEligibleForCheckins(userData.subscriptionStatus);
    setIsEligible(eligible);
    
    // Get current week identifier
    const weekId = getCurrentWeekIdentifier();
    setCurrentWeekId(weekId);
    
    if (!eligible) {
      setLoading(false);
      return;
    }

    // Set up real-time listeners
    console.log('Setting up check-in listeners for user:', user.uid);
    
    const unsubscribeCurrent = subscribeToCurrentWeekCheckin(user.uid, (checkin) => {
      console.log('Current week check-in updated:', checkin);
      setCurrentWeekCheckin(checkin);
      setShowWidget(!checkin);
      setLoading(false);
    });
    
    const unsubscribeUpcoming = subscribeToUpcomingCheckins(user.uid, (checkins) => {
      console.log('Upcoming check-ins updated:', checkins.length);
      setUpcomingCheckins(checkins);
    });
    
    const unsubscribePast = subscribeToPastCheckins(user.uid, (checkins) => {
      console.log('Past check-ins updated:', checkins.length);
      setPastCheckins(checkins);
    }, 4);

    // Clean up listeners on unmount
    return () => {
      console.log('Cleaning up check-in listeners');
      unsubscribeCurrent();
      unsubscribeUpcoming();
      unsubscribePast();
    };
  }, [user, userData]);

  // Initialize Calendly widget - simplified single-state approach
  useEffect(() => {
    // Calculate if widget should be shown based on active sessions count
    const now = new Date();
    const activeSessions = [currentWeekCheckin, ...upcomingCheckins]
      .filter(session => session !== null)
      .filter(session => {
        const sessionStart = session.scheduledDate.toDate();
        const sessionEnd = new Date(sessionStart.getTime() + (session.duration * 60 * 1000));
        return sessionEnd > now;
      });
    
    const shouldShowWidget = activeSessions.length < 2;
    
    // Only init if widget should be shown
    if (!shouldShowWidget) return;

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
  }, [currentWeekCheckin, upcomingCheckins]);

  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'canceled':
        return <Badge variant="destructive">Canceled</Badge>;
      case 'no-show':
        return <Badge variant="secondary">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
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
          <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h1 className="text-3xl font-bold mb-2">Weekly Check-ins</h1>
                <p className="text-muted-foreground">Loading your check-in schedule...</p>
              </div>
              <Skeleton className="h-64" />
              <Skeleton className="h-96" />
          </div>
        </div>
      </SidebarInset>
      </SidebarProvider>
    </>
  );
}

  if (!isEligible) {
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Weekly Check-ins</h1>
          <p className="text-muted-foreground">
            Stay connected with your trainer through weekly check-in calls
          </p>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Weekly check-ins are included with Online Coaching and Complete Transformation subscriptions.
            Please upgrade your subscription to access this feature.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>What are Weekly Check-ins?</CardTitle>
            <CardDescription>
              15-30 minute calls to review your progress, adjust your plan, and stay on track
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Weekly Progress Reviews</p>
                  <p className="text-sm text-muted-foreground">
                    Discuss your wins, challenges, and adjustments needed
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Personalized Guidance</p>
                  <p className="text-sm text-muted-foreground">
                    Get expert advice tailored to your goals and progress
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Real-time Plan Adjustments</p>
                  <p className="text-sm text-muted-foreground">
                    Adapt your training and nutrition based on how your body responds
                  </p>
                </div>
              </div>
            </div>

            <Button className="w-full" onClick={() => window.location.href = '/dashboard/client/membership'}>
              View Subscription Options
            </Button>
          </CardContent>
        </Card>
          </div>
        </div>
      </SidebarInset>
      </SidebarProvider>
    </>
  );
}

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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Weekly Check-ins</h1>
        <p className="text-muted-foreground">
          Schedule your weekly call with your trainer to review progress and adjust your plan
        </p>
      </div>

      {/* Current Week Status */}
      <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Current Week ({formatWeekRange(currentWeekId)})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentWeekCheckin ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium">Check-in Scheduled</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(currentWeekCheckin.scheduledDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {currentWeekCheckin.duration} minutes
                  </p>
                </div>
                {getStatusBadge(currentWeekCheckin.status)}
              </div>

            {currentWeekCheckin.status === 'scheduled' && (() => {
              // Calculate grace period (1/4 duration, rounded UP to nearest minute)
              const sessionDate = currentWeekCheckin.scheduledDate.toDate();
              const gracePeriodMinutes = Math.ceil(currentWeekCheckin.duration / 4);
              const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
              const cancelCutoffTime = new Date(sessionDate.getTime() + gracePeriodMs);
              const canStillModify = new Date() < cancelCutoffTime;
              
              return canStillModify && (currentWeekCheckin.cancelUrl || currentWeekCheckin.rescheduleUrl) && (
                    <div className="flex gap-2">
                      {currentWeekCheckin.rescheduleUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(currentWeekCheckin.rescheduleUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Reschedule
                        </Button>
                      )}
                      {currentWeekCheckin.cancelUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(currentWeekCheckin.cancelUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
              );
            })()}
            {currentWeekCheckin.status === 'scheduled' && !currentWeekCheckin.cancelUrl && !currentWeekCheckin.rescheduleUrl && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        To cancel or reschedule, use the link in your Calendly confirmation email.
                      </AlertDescription>
                    </Alert>
            )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <XCircle className="h-6 w-6" />
              <p>No check-in scheduled for this week</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendly Widget - Show if less than 2 active sessions */}
      {(() => {
        // Calculate number of active sessions (those that haven't ended yet)
        const now = new Date();
        const activeSessions = [currentWeekCheckin, ...upcomingCheckins]
          .filter(session => session !== null)
          .filter(session => {
            const sessionStart = session.scheduledDate.toDate();
            const sessionEnd = new Date(sessionStart.getTime() + (session.duration * 60 * 1000));
            return sessionEnd > now;
          });
        
        const activeCount = activeSessions.length;
        
        return activeCount < 2 && (
        <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
            <CardHeader>
              <CardTitle>Schedule Your Check-in</CardTitle>
              <CardDescription>
                You can schedule up to 2 check-ins in advance. The scheduling widget will become available again once the next upcoming session ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="calendly-inline-widget"
                data-url={`${CHECKIN_CALENDLY_URL}?hide_gdpr_banner=1${userData?.name ? `&name=${encodeURIComponent(userData.name)}` : ''}${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}`}
                style={{ width: '100%', height: '800px' }}
              ></div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Upcoming Check-ins */}
      {upcomingCheckins.length > 0 && (
        <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
          <CardHeader>
            <CardTitle>Upcoming Check-ins</CardTitle>
            <CardDescription>Future weeks you've already scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-background/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/60 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <PhoneCall className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{formatDateTime(checkin.scheduledDate)}</p>
                      <p className="text-sm text-muted-foreground">
                        Week of {formatWeekRange(checkin.weekIdentifier)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(checkin.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Check-ins */}
      {pastCheckins.length > 0 && (
        <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
          <CardHeader>
            <CardTitle>Past Check-ins</CardTitle>
            <CardDescription>Your recent check-in history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastCheckins.map((checkin) => (
                <div
                  key={checkin.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-background/50 shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/60 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <PhoneCall className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{formatDateTime(checkin.scheduledDate)}</p>
                      <p className="text-sm text-muted-foreground">
                        Week of {formatWeekRange(checkin.weekIdentifier)}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(checkin.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Information */}
      <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">How do check-ins work?</p>
            <p className="text-muted-foreground">
              You can schedule one check-in per week (Sunday-Saturday). These calls help you stay on track
              and make adjustments to your plan as needed.
            </p>
          </div>
          <div>
            <p className="font-medium">What if I need to reschedule?</p>
            <p className="text-muted-foreground">
              You can cancel and rebook anytime using the link in your Calendly confirmation email.
              Just make sure to stay within the same week.
            </p>
          </div>
          <div>
            <p className="font-medium">What should I prepare?</p>
            <p className="text-muted-foreground">
              Review your progress for the week, note any challenges, and come with questions or topics
              you'd like to discuss.
            </p>
          </div>
        </CardContent>
      </Card>
          </div>
        </div>
      </SidebarInset>
      </SidebarProvider>
    </>
  );
}
