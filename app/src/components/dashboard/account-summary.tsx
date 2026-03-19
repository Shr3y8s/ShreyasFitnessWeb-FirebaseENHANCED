"use client";

import { useState, useEffect } from 'react';
import { User, Calendar, CreditCard, CircleCheckBig, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, Timestamp } from 'firebase/firestore';

interface AccountSummaryProps {
  userId: string;
  accountCreatedAt?: any;
}

export function AccountSummary({ userId, accountCreatedAt }: AccountSummaryProps) {
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  const [weeksActive, setWeeksActive] = useState<number>(0);
  const [nextPayment, setNextPayment] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Calculate weeks active
  useEffect(() => {
    if (accountCreatedAt) {
      const createdDate = accountCreatedAt.toDate ? accountCreatedAt.toDate() : new Date(accountCreatedAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
      setWeeksActive(diffWeeks);
    }
  }, [accountCreatedAt]);

  // Fetch sessions completed count
  useEffect(() => {
    if (!userId) return;

    const fetchSessions = async () => {
      try {
        const sessionsQuery = query(
          collection(db, 'sessions'),
          where('clientId', '==', userId),
          where('status', '==', 'completed')
        );
        const snapshot = await getDocs(sessionsQuery);
        setSessionsCompleted(snapshot.size);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        setSessionsCompleted(0);
      }
    };

    fetchSessions();
  }, [userId]);

  // Listen to subscription for next payment date
  useEffect(() => {
    if (!userId) return;

    const subsRef = collection(db, 'stripe_customers', userId, 'subscriptions');
    
    const unsubscribe = onSnapshot(subsRef, (snapshot) => {
      if (snapshot.empty) {
        setNextPayment('N/A');
        setLoading(false);
        return;
      }

      // Find active subscription
      const activeSub = snapshot.docs.find(doc => doc.data().status === 'active');
      
      if (activeSub) {
        const subData = activeSub.data();
        const periodEnd = subData.current_period_end;
        
        if (periodEnd) {
          const date = new Date(periodEnd * 1000);
          const formatted = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          setNextPayment(formatted);
        } else {
          setNextPayment('N/A');
        }
      } else {
        setNextPayment('N/A');
      }
      
      setLoading(false);
    }, (error) => {
      console.error('Error fetching subscription:', error);
      setNextPayment('N/A');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-secondary/30 flex flex-col h-full transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Account Summary
        </h3>
      </div>
      <div className="p-6 pt-0 flex-1 flex items-center justify-around">
        {loading ? (
          <div className="flex items-center justify-center w-full py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 text-center w-full">
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <div className="text-primary">
                <CircleCheckBig className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-2xl">{sessionsCompleted}</p>
              <p className="text-xs text-muted-foreground">Sessions Completed</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <div className="text-primary">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-2xl">{weeksActive}</p>
              <p className="text-xs text-muted-foreground">Weeks Active</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <div className="text-primary">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-2xl">{nextPayment}</p>
              <p className="text-xs text-muted-foreground">Next Payment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
