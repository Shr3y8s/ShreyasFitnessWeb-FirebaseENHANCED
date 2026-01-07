'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, Timestamp, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Circle, Loader2, Calendar, CheckSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { hasOnlineCoaching } from '@/lib/constants';

interface OnboardingMilestoneManagerProps {
  clientId: string;
  clientName: string;
  clientTier?: string;
}

export function OnboardingMilestoneManager({ clientId, clientName, clientTier }: OnboardingMilestoneManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [setupGoal, setSetupGoal] = useState<any>(null);
  const [consultation, setConsultation] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Subscribe to setup goal
  useEffect(() => {
    const setupGoalRef = doc(db, 'goals', `${clientId}_setup`);
    
    const unsubscribe = onSnapshot(setupGoalRef, (docSnap) => {
      if (docSnap.exists()) {
        setSetupGoal(docSnap.data());
      } else {
        setSetupGoal(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching setup goal:', error);
      setSetupGoal(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  // Subscribe to consultation session (query by clientId and sessionType)
  useEffect(() => {
    const consultationQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', clientId),
      where('sessionType', '==', 'onboarding'),
      orderBy('scheduledDate', 'desc'),
      limit(1)
    );
    
    const unsubscribe = onSnapshot(consultationQuery, (snapshot) => {
      if (!snapshot.empty) {
        setConsultation(snapshot.docs[0].data());
      } else {
        setConsultation(null);
      }
    }, (error) => {
      console.error('Error fetching consultation:', error);
      setConsultation(null);
    });

    return () => unsubscribe();
  }, [clientId]);

  const handleToggleMilestone = async (index: number) => {
    if (!setupGoal || index === 0) return; // Can't toggle milestone #1 (auto)
    
    setSaving(true);
    
    try {
      const setupGoalRef = doc(db, 'goals', `${clientId}_setup`);
      const milestones = [...setupGoal.milestones];
      const milestone = milestones[index];
      
      // Capture the NEW state before update
      const willBeCompleted = !milestone.completed;
      
      if (milestone.completed) {
        // Uncompleting
        milestones[index] = {
          ...milestone,
          completed: false,
          completedAt: null,
          updatedAt: Timestamp.now()
        };
      } else {
        // Completing
        milestones[index] = {
          ...milestone,
          completed: true,
          completedAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
      }
      
      await updateDoc(setupGoalRef, {
        milestones: milestones,
        updatedAt: Timestamp.now()
      });
      
      // Milestones use 'text' field, not 'title'
      const milestoneText = milestone.title || milestone.text || milestone.description || 'Milestone';
      
      toast({
        title: willBeCompleted ? "Milestone Completed" : "Milestone Uncompleted",
        description: `${milestoneText} has been ${willBeCompleted ? 'marked complete' : 'marked incomplete'}.`,
      });
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update milestone. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Loading onboarding data...</p>
      </div>
    );
  }

  // Check if setup goal exists first, then check tier
  if (!setupGoal) {
    // If no setup goal AND client doesn't have online coaching, show tier message
    if (!hasOnlineCoaching(clientTier)) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <span className="text-4xl mb-2 block">ℹ️</span>
          <p className="font-semibold text-blue-900 mb-2">Onboarding Not Applicable</p>
          <p className="text-sm text-blue-700">
            This client has an in-person only plan. Onboarding consultation is only required 
            for online coaching and complete transformation plans.
          </p>
        </div>
      );
    }
    
    // Has online coaching but no setup goal
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <span className="text-4xl mb-2 block">⚠️</span>
        <p className="font-semibold text-amber-900 mb-2">No Setup Goal Found</p>
        <p className="text-sm text-amber-700">
          This client doesn't have a setup goal yet. It should be created automatically when they activate their account.
        </p>
        <p className="text-xs text-gray-600 mt-2">
          Tier: {clientTier || 'Unknown'}
        </p>
      </div>
    );
  }

  const allComplete = setupGoal.milestones.every((m: any) => m.completed);

  // Calculate if consultation has ended
  const consultationEndTime = consultation 
    ? new Date(consultation.scheduledDate.toMillis() + (consultation.duration * 60 * 1000))
    : null;
  const now = new Date();
  const consultationHasEnded = consultationEndTime ? now >= consultationEndTime : false;

  // Use goal's configured deadline (set by trainer)
  const deadlineDate = setupGoal.deadline?.toDate() || new Date();
  const daysRemaining = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysRemaining < 0;
  const isWarning = daysRemaining >= 0 && daysRemaining <= 7;

  return (
    <div className="space-y-6">
      {/* Deadline Alert */}
      {!allComplete && (
        <div className={cn(
          "rounded-lg p-4 border-2",
          isOverdue && "bg-red-50 border-red-300",
          isWarning && "bg-yellow-50 border-yellow-300",
          !isWarning && !isOverdue && "bg-green-50 border-green-300"
        )}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {isOverdue ? '🔴' : isWarning ? '🟡' : '🟢'}
            </span>
            <div>
              <p className={cn(
                "font-semibold",
                isOverdue && "text-red-900",
                isWarning && "text-yellow-900",
                !isWarning && !isOverdue && "text-green-900"
              )}>
                {isOverdue ? 'Onboarding Overdue' : isWarning ? 'Onboarding Deadline Approaching' : 'On Track'}
              </p>
              <p className={cn(
                "text-sm",
                isOverdue && "text-red-700",
                isWarning && "text-yellow-700",
                !isWarning && !isOverdue && "text-green-700"
              )}>
                {isOverdue 
                  ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} - Complete onboarding ASAP`
                  : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining to complete onboarding (Due: ${deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Milestones Card */}
      <Card className="border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Onboarding Milestones
          </CardTitle>
          <CardDescription>
            Track {clientName}'s progress through the onboarding process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setupGoal.milestones.map((milestone: any, index: number) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border-2 transition-all",
                  milestone.completed 
                    ? "bg-green-50 border-green-200" 
                    : "bg-gray-50 border-gray-200"
                )}
              >
                <button
                  onClick={() => handleToggleMilestone(index)}
                  disabled={index === 0 || saving || (index > 0 && !consultationHasEnded)}
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                    (index === 0 || (index > 0 && !consultationHasEnded)) && "cursor-not-allowed",
                    index !== 0 && !saving && consultationHasEnded && "cursor-pointer hover:scale-110",
                    milestone.completed 
                      ? "bg-primary border-primary" 
                      : "border-gray-400 bg-white"
                  )}
                >
                  {milestone.completed && (
                    <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={3} />
                  )}
                </button>
                
                <div className="flex-1">
                  <h4 className={cn(
                    "font-semibold mb-1",
                    milestone.completed && "text-muted-foreground line-through"
                  )}>
                    {milestone.title}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {milestone.description}
                  </p>
                  
                  {milestone.completed && milestone.completedAt && (
                    <p className="text-xs text-green-700">
                      ✓ Completed {milestone.completedAt.toDate().toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  
                  {index === 0 && (
                    <p className="text-xs text-blue-700 mt-1">
                      🔒 Auto-completes when client schedules consultation
                    </p>
                  )}
                  
                  {index > 0 && !milestone.completed && !consultationHasEnded && consultation && (
                    <p className="text-xs text-amber-700 mt-1">
                      ⏰ Available after consultation ends ({consultation.scheduledDate.toDate().toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })} at {consultationEndTime?.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })})
                    </p>
                  )}
                  
                  {index > 0 && !milestone.completed && !consultation && (
                    <p className="text-xs text-gray-500 mt-1">
                      ⏰ Available after consultation is scheduled and completes
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {allComplete && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <span className="text-4xl mb-2 block">🎉</span>
              <p className="font-semibold text-green-900 mb-1">Onboarding Complete!</p>
              <p className="text-sm text-green-700">
                All milestones have been completed. The onboarding checklist will auto-hide from the client's dashboard.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Consultation Session Info */}
      {consultation && (
        <Card className="border-blue-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Consultation Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled Date</p>
                <p className="font-medium">{formatDateTime(consultation.scheduledDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-medium">{consultation.duration} minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={cn(
                  "inline-block px-2 py-1 rounded-full text-xs font-medium",
                  consultation.status === 'scheduled' && "bg-blue-100 text-blue-700",
                  consultation.status === 'completed' && "bg-green-100 text-green-700",
                  consultation.status === 'canceled' && "bg-red-100 text-red-700"
                )}>
                  {consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
