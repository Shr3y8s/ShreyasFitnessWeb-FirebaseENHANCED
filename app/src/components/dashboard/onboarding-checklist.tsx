"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ClipboardList, X, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, collection, query, where, orderBy, limit } from 'firebase/firestore';

const onboardingSteps = [
  { id: 'schedule', label: 'Schedule your 30-minute planning consultation' },
  { id: 'complete', label: 'Complete your consultation' },
  { id: 'receive', label: 'Receive your personalized fitness plan' },
];

interface OnboardingChecklistProps {
  onDismiss?: () => void;
}

export function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [consultation, setConsultation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch setup goal milestones from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const setupGoalRef = doc(db, 'goals', `${user.uid}_setup`);
    
    // Real-time listener for milestone updates
    const unsubscribe = onSnapshot(setupGoalRef, (docSnap) => {
      if (docSnap.exists()) {
        const goalData = docSnap.data();
        setMilestones(goalData.milestones || []);
      } else {
        // No setup goal yet - show all unchecked
        setMilestones([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching setup goal:', error);
      setMilestones([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to consultation session (query by clientId and sessionType)
  useEffect(() => {
    if (!user) return;

    const consultationQuery = query(
      collection(db, 'sessions'),
      where('clientId', '==', user.uid),
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
  }, [user]);

  const handleSchedule = () => {
    window.location.href = '/dashboard/client/consultation/schedule';
  };
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm relative bg-primary/10 border-primary/50 hover:shadow-glow">
      <div className="flex p-6 flex-row gap-4 items-start pb-4">
        <div className="bg-primary/10 p-3 rounded-full mt-1">
          <ClipboardList className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight">
            Welcome to Your Fitness Journey!
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            The next step is to schedule your 30-minute planning consultation. During this session,
            we&apos;ll create your personalized fitness plan and set you up for success.
          </p>
          <Button
            onClick={handleSchedule}
            className="mt-4 transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer"
          >
            Manage Consultation
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-3">
          {onboardingSteps.map((step, index) => {
            const milestone = milestones[index];
            const isCompleted = milestone?.completed || false;
            
            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                      isCompleted
                        ? "bg-primary border-primary"
                        : "border-primary bg-transparent"
                    )}
                  >
                    {isCompleted && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                  <div className="flex-1">
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors select-text",
                        isCompleted ? "text-muted-foreground line-through" : "text-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                    {index === 1 && consultation && (
                      <p className="text-xs text-blue-700 mt-0.5">
                        (Scheduled: {consultation.scheduledDate.toDate().toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
