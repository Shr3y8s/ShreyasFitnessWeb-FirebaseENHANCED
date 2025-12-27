"use client";

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { signOutUser, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  Zap,
  Pause,
  XCircle,
  Play,
  Trash2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useState, useEffect } from 'react';
import { CancelSubscriptionDialog } from '@/components/membership/CancelSubscriptionDialog';
import { PauseSubscriptionDialog } from '@/components/membership/PauseSubscriptionDialog';
import { resumeSubscription, reactivateSubscription } from '@/lib/subscription-api';
import { useToast } from '@/hooks/use-toast';

export default function MembershipPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [membershipType, setMembershipType] = useState<'subscription' | 'session-only'>('session-only');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'active' | 'paused' | 'canceled' | 'past_due'>('active');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // REAL-TIME FIRESTORE LISTENER: Watch for subscription changes
  // This is the KEY fix - auth context only fetches once, so we need a local listener
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          refreshUserData();
        }
      },
      (error) => {
        console.error('[Membership] Firestore listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user, refreshUserData]);

  // Check auth and role
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userData) {
      console.log('[Membership] No user data, redirecting to login');
      router.push('/login');
      return;
    }

    // CRITICAL: Only clients should access membership
    if (userData.role !== 'client') {
      console.log('[Membership] User is not a client, redirecting');
      if (userData.role === 'trainer' || userData.role === 'admin') {
        router.push('/dashboard/trainer');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    // CRITICAL: Check account activation
    if (!userData.accountActivated) {
      console.log('[Membership] Account not activated, redirecting to payment');
      router.push('/payment');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  // UNIFIED EFFECT: Update subscription status AND reset loading states atomically
  // This ensures status updates BEFORE states reset, preventing UI race conditions
  useEffect(() => {
    if (!userData) return;

    // STEP 1: Update subscription status and membership type
    if (userData.subscriptionId) {
      let status = 'active';  // Default status
      
      // CRITICAL: Check OUR flags, not Stripe's subscriptionStatus
      // Stripe keeps status as "active" for both paused and canceled subscriptions
      if (userData.subscriptionPaused === true) {
        status = 'paused';
      } else if (userData.cancelAtPeriodEnd === true) {
        status = 'canceled';
      }
      
      setSubscriptionStatus(status as any);
      
      // If canceled, check if still within access period
      if (status === 'canceled' && userData.currentPeriodEnd) {
        const now = new Date();
        const periodEnd = userData.currentPeriodEnd.toDate();
        if (periodEnd > now) {
          setMembershipType('subscription');
        } else {
          setMembershipType('session-only');
        }
      } else if (status === 'active' || status === 'paused') {
        setMembershipType('subscription');
      } else {
        setMembershipType('session-only');
      }
    } else {
      setMembershipType('session-only');
    }

    // STEP 2: Reset loading states when Firestore confirms changes
    // Detect pause completion: subscriptionPaused becomes true
    if (pausing && userData.subscriptionPaused === true) {
      console.log('[Membership] Pause detected in Firestore, resetting state');
      setPausing(false);
      setShowPauseDialog(false);
    }

    // Detect resume completion: subscriptionPaused becomes false
    if (resuming && userData.subscriptionPaused === false) {
      console.log('[Membership] Resume detected in Firestore, resetting state');
      setResuming(false);
    }

    // Detect cancel completion: cancelAtPeriodEnd becomes true
    if (canceling && userData.cancelAtPeriodEnd === true) {
      console.log('[Membership] Cancel detected in Firestore, resetting state');
      setCanceling(false);
      setShowCancelDialog(false);
    }

    // Detect reactivation completion: cancelAtPeriodEnd becomes false
    if (reactivating && userData.cancelAtPeriodEnd === false) {
      console.log('[Membership] Reactivation detected in Firestore, resetting state');
      setReactivating(false);
    }
  }, [userData, pausing, resuming, canceling, reactivating]);

  // Format date
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Calculate next billing date (lastPaymentDate + 1 month)
  const getNextBillingDate = () => {
    if (!userData?.lastPaymentDate) return 'N/A';
    
    const lastPayment = userData.lastPaymentDate.toDate();
    const nextBilling = new Date(lastPayment);
    nextBilling.setMonth(nextBilling.getMonth() + 1);
    
    return formatDate(nextBilling);
  };

  // Handle successful cancellation - set loading state, let Firestore update UI
  const handleCancelSuccess = (accessUntil: string) => {
    setCanceling(true);
    toast({
      title: "Subscription Canceled",
      description: `You'll have access until ${new Date(accessUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    });
    // Don't refresh or close dialog - let useEffect handle it when Firestore updates
  };

  // Handle successful pause - set loading state, let Firestore update UI
  const handlePauseSuccess = (resumeDate: string) => {
    setPausing(true);
    toast({
      title: "Subscription Paused",
      description: `Your subscription will resume on ${new Date(resumeDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    });
    // Don't refresh or close dialog - let useEffect handle it when Firestore updates
  };

  // Handle resume subscription
  const handleResume = async () => {
    setResuming(true);
    try {
      const result = await resumeSubscription();
      
      if (result.success) {
        toast({
          title: "Subscription Resumed",
          description: "Your subscription is now active. Welcome back!",
        });
        // Don't reset resuming here - let useEffect handle it when Firestore updates
      } else {
        toast({
          title: "Resume Failed",
          description: result.error || "Failed to resume subscription",
          variant: "destructive",
        });
        setResuming(false); // Only reset on error
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setResuming(false); // Only reset on error
    }
  };

  // Handle reactivate canceled subscription
  const handleReactivate = async () => {
    setReactivating(true);
    try {
      const result = await reactivateSubscription();
      
      if (result.success) {
        toast({
          title: "Subscription Reactivated",
          description: "Your subscription will continue as normal. Welcome back!",
        });
        // Don't reset reactivating here - let useEffect handle it when Firestore updates
      } else {
        toast({
          title: "Reactivation Failed",
          description: result.error || "Failed to reactivate subscription",
          variant: "destructive",
        });
        setReactivating(false); // Only reset on error
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
      setReactivating(false); // Only reset on error
    }
  };


  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading membership...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userTierName={userData?.tierName}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Breadcrumb */}
            <Breadcrumb 
              items={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Membership', href: '/dashboard/client/membership' }
              ]} 
            />

            {/* Page Title */}
            <div className="mt-6 mb-8">
              <h1 className="text-3xl font-bold text-foreground">Your Membership</h1>
              <p className="text-muted-foreground mt-2">Manage your membership, subscription, and account settings</p>
            </div>

            {/* Membership Overview */}
            <Card className="mb-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle>Membership Status</CardTitle>
                      <CardDescription>Your current membership details</CardDescription>
                    </div>
                  </div>
                  {membershipType === 'subscription' ? (
                    <Badge variant={subscriptionStatus === 'active' ? 'default' : subscriptionStatus === 'paused' ? 'secondary' : 'destructive'} className="text-sm px-3 py-1">
                      {subscriptionStatus === 'active' && 'Active Subscription'}
                      {subscriptionStatus === 'paused' && 'Paused'}
                      {subscriptionStatus === 'canceled' && 'Canceled'}
                      {subscriptionStatus === 'past_due' && 'Past Due'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm px-3 py-1">
                      Session-Only
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {membershipType === 'subscription' ? (
                  <div className="space-y-4">
                    {/* Subscription Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Plan</p>
                        <p className="text-lg font-semibold">{userData?.tierName || 'Subscription'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="text-lg font-semibold">{formatDate(userData?.lastPaymentDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <p className="text-lg font-semibold capitalize">{subscriptionStatus}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Next Billing</p>
                        <p className="text-lg font-semibold">
                          {getNextBillingDate()}
                        </p>
                      </div>
                    </div>

                    {/* Benefits */}
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-semibold text-foreground mb-3">Your Benefits:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Unlimited workout programs
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Custom nutrition plans
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Weekly coach check-ins
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          Priority scheduling
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Session-Only Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Membership Type</p>
                        <p className="text-lg font-semibold">Session-Only</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Member Since</p>
                        <p className="text-lg font-semibold">{formatDate(userData?.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Session Credits</p>
                        <p className="text-lg font-semibold">{userData?.sessionBalance?.available || 0} Available</p>
                      </div>
                    </div>

                    {/* Session-Only Benefits */}
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-semibold text-foreground mb-3">Your Plan:</p>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Pay-as-you-go 1:1 training sessions
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          Purchase sessions anytime
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-blue-600" />
                          No monthly commitment
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subscription Management - Conditional */}
            {membershipType === 'subscription' && (
              <Card className="mb-6 transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
                <CardHeader>
                  <CardTitle>Manage Subscription</CardTitle>
                  <CardDescription>Pause, cancel, or resume your subscription</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {subscriptionStatus === 'active' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowPauseDialog(true)}
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Subscription
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowCancelDialog(true)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </div>
                  )}

                  {subscriptionStatus === 'paused' && (
                    <div>
                      <Alert className="mb-4">
                        <AlertDescription>
                          Your subscription is paused. It will automatically resume on {userData?.pauseResumesAt ? formatDate(userData.pauseResumesAt) : 'the scheduled date'}.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={handleResume}
                        disabled={resuming}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {resuming ? 'Resuming...' : 'Resume Subscription Early'}
                      </Button>
                    </div>
                  )}

                  {subscriptionStatus === 'canceled' && userData?.cancelAtPeriodEnd && (
                    <div>
                      <Alert className="mb-4">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>
                          Your subscription has been canceled. You'll have access until {userData?.currentPeriodEnd ? formatDate(userData.currentPeriodEnd) : 'the end of your billing period'}.
                        </AlertDescription>
                      </Alert>
                      <Button 
                        variant="default" 
                        className="w-full"
                        onClick={handleReactivate}
                        disabled={reactivating}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                      </Button>
                    </div>
                  )}

                  {/* Recent Activity */}
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold text-foreground mb-3">Recent Activity</p>
                    {(() => {
                      // Collect all subscription events from userData
                      const events = [];
                      
                      if (userData?.reactivatedAt) {
                        events.push({
                          type: 'reactivated',
                          timestamp: userData.reactivatedAt,
                          icon: <CheckCircle className="w-4 h-4 text-green-600" />,
                          label: 'Subscription reactivated'
                        });
                      }
                      
                      if (userData?.canceledAt) {
                        events.push({
                          type: 'canceled',
                          timestamp: userData.canceledAt,
                          icon: <XCircle className="w-4 h-4 text-red-600" />,
                          label: 'Subscription canceled'
                        });
                      }
                      
                      if (userData?.resumedAt) {
                        events.push({
                          type: 'resumed',
                          timestamp: userData.resumedAt,
                          icon: <Play className="w-4 h-4 text-blue-600" />,
                          label: 'Subscription resumed'
                        });
                      }
                      
                      if (userData?.pausedAt) {
                        events.push({
                          type: 'paused',
                          timestamp: userData.pausedAt,
                          icon: <Pause className="w-4 h-4 text-orange-600" />,
                          label: 'Subscription paused'
                        });
                      }
                      
                      if (userData?.lastPaymentDate && membershipType === 'subscription') {
                        events.push({
                          type: 'started',
                          timestamp: userData.lastPaymentDate,
                          icon: <Star className="w-4 h-4 text-purple-600" />,
                          label: 'Subscription started'
                        });
                      }
                      
                      // Sort by timestamp (most recent first)
                      events.sort((a, b) => {
                        const timeA = a.timestamp.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime();
                        const timeB = b.timestamp.toMillis ? b.timestamp.toMillis() : new Date(b.timestamp).getTime();
                        return timeB - timeA;
                      });
                      
                      // Display events or empty state
                      if (events.length === 0) {
                        return (
                          <p className="text-sm text-muted-foreground">No recent activity</p>
                        );
                      }
                      
                      return (
                        <div className="space-y-2">
                          {events.slice(0, 5).map((event, index) => (
                            <div key={`${event.type}-${index}`} className="flex items-center gap-3 text-sm py-1">
                              {event.icon}
                              <span className="flex-1">{event.label}</span>
                              <span className="text-muted-foreground text-xs">
                                {formatDate(event.timestamp)}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upgrade Prompt - For Session-Only Clients */}
            {membershipType === 'session-only' && (
              <Card className="mb-6 border-primary/50 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Want More?
                  </CardTitle>
                  <CardDescription>Upgrade to a subscription for unlimited access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-foreground">
                      Get unlimited workouts, custom nutrition plans, and priority support with a monthly subscription.
                    </p>
                    <Button className="w-full sm:w-auto" disabled>
                      Contact Trainer to Upgrade
                      <span className="ml-2 text-xs">(Coming Soon)</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone - Account Deletion */}
            <Card className="border-red-200 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <CardTitle className="text-red-900">Danger Zone</CardTitle>
                    <CardDescription>Permanent account actions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <AlertDescription>
                    Deleting your account will permanently remove all your data. This action cannot be undone.
                  </AlertDescription>
                </Alert>
                
                {membershipType === 'subscription' && subscriptionStatus === 'active' && (
                  <Alert className="mb-4 border-orange-200 bg-orange-50">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      You must cancel your subscription before deleting your account.
                    </AlertDescription>
                  </Alert>
                )}

                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto border-red-600 text-red-600 hover:bg-red-50"
                  disabled
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                  <span className="ml-2 text-xs">(Coming Soon)</span>
                </Button>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>

      {/* Dialogs */}
      <CancelSubscriptionDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onSuccess={handleCancelSuccess}
      />
      <PauseSubscriptionDialog
        open={showPauseDialog}
        onOpenChange={setShowPauseDialog}
        onSuccess={handlePauseSuccess}
      />
    </SidebarProvider>
  );
}
