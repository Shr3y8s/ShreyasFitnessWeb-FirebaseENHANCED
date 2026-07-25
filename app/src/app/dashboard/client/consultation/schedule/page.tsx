'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/lib/auth-context';
import { CALENDLY_URLS } from '@/lib/constants';
import { ClientPageShell } from '@/components/dashboard/ClientPageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneCall, Calendar, CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { subscribeToConsultation } from '@/lib/consultation-api';
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
const CONSULTATION_CALENDLY_URL = CALENDLY_URLS.ONBOARDING_CONSULTATION;

export default function ConsultationSchedulePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState<CheckinSession | null>(null);

  useEffect(() => {
    if (!user || !userData) {
      setLoading(true);
      return;
    }

    const unsubscribe = subscribeToConsultation(user.uid, (consult) => {
      setConsultation(consult);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [user, userData]);

  // Initialize Calendly widget
  useEffect(() => {
    const shouldShowWidget = !consultation;
    
    if (!shouldShowWidget) return;

    let mounted = true;
    
    const initWidget = () => {
      if (!mounted) return;
      
      const widgetEl = document.querySelector('.calendly-inline-widget') as HTMLElement;
      
      if (window.Calendly && widgetEl) {
        widgetEl.innerHTML = '';
        
        window.Calendly.initInlineWidget({
          url: widgetEl.getAttribute('data-url'),
          parentElement: widgetEl
        });
      } else if (!window.Calendly && mounted) {
        setTimeout(initWidget, 100);
      }
    };

    initWidget();

    return () => {
      mounted = false;
      const widgetEl = document.querySelector('.calendly-inline-widget') as HTMLElement;
      if (widgetEl) {
        widgetEl.innerHTML = '';
      }
    };
  }, [consultation, loading]);

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
      <ClientPageShell>
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Onboarding Consultation</h1>
            <p className="text-muted-foreground">Loading your consultation status...</p>
          </div>
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </ClientPageShell>
    </>
  );
}

  return (
    <>
      <Script 
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <ClientPageShell>
        <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">30-Minute Planning Consultation</h1>
        <p className="text-muted-foreground">
          Schedule your personalized planning session with your coach
        </p>
      </div>

      {/* Consultation Status */}
      <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Your Consultation
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultation ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium">Consultation Scheduled</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(consultation.scheduledDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Duration: {consultation.duration} minutes
                  </p>
                </div>
                {getStatusBadge(consultation.status)}
              </div>

            {consultation.status === 'scheduled' && (() => {
              // Calculate grace period (1/4 duration, rounded UP to nearest minute)
              const sessionDate = consultation.scheduledDate.toDate();
              const gracePeriodMinutes = Math.ceil(consultation.duration / 4);
              const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
              const cancelCutoffTime = new Date(sessionDate.getTime() + gracePeriodMs);
              const canStillModify = new Date() < cancelCutoffTime;
              
              return canStillModify && (consultation.cancelUrl || consultation.rescheduleUrl) && (
                    <div className="flex gap-2">
                      {consultation.rescheduleUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(consultation.rescheduleUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Reschedule
                        </Button>
                      )}
                      {consultation.cancelUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(consultation.cancelUrl, '_blank')}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
              );
            })()}
            {consultation.status === 'scheduled' && !consultation.cancelUrl && !consultation.rescheduleUrl && (
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
              <p>No consultation scheduled yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendly Widget - Show if no consultation scheduled */}
      {!consultation && (
        <Card className="relative transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border border-primary/50">
            <CardHeader>
              <CardTitle>Schedule Your Consultation</CardTitle>
              <CardDescription>
                Choose a time that works best for you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="calendly-inline-widget"
                data-url={`${CONSULTATION_CALENDLY_URL}?hide_gdpr_banner=1${userData?.name ? `&name=${encodeURIComponent(userData.name)}` : ''}${user?.email ? `&email=${encodeURIComponent(user.email)}` : ''}`}
                style={{ width: '100%', height: '800px' }}
              ></div>
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
            <p className="font-medium">What should I prepare?</p>
            <p className="text-muted-foreground">
              Think about your fitness goals, current activity level, any injuries or limitations,
              and what success looks like to you. Be ready to discuss your schedule and commitment level.
            </p>
          </div>
          <div>
            <p className="font-medium">What if I need to reschedule?</p>
            <p className="text-muted-foreground">
              You can cancel and rebook anytime using the link in your Calendly confirmation email.
            </p>
          </div>
          <div>
            <p className="font-medium">What happens after the consultation?</p>
            <p className="text-muted-foreground">
              Your coach will create your personalized fitness plan and you'll receive it within 24-48 hours.
              Your dashboard will then be populated with workouts, nutrition guidance, and tracking tools.
            </p>
          </div>
        </CardContent>
      </Card>
        </div>
      </ClientPageShell>
    </>
  );
}
