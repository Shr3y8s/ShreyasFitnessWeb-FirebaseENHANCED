"use client";

import { useState, useEffect } from 'react';
import { User, Calendar, CreditCard, CircleCheckBig, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getPaymentProvider } from '@/lib/payments';


interface AccountSummaryProps {
  userId: string;
  accountCreatedAt?: { toDate: () => Date } | Date | string | null;
}

export function AccountSummary({ userId, accountCreatedAt }: AccountSummaryProps) {
  const [sessionsCompleted, setSessionsCompleted] = useState<number>(0);
  const [weeksActive, setWeeksActive] = useState<number>(0);
  const [nextPayment, setNextPayment] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Calculate weeks active
  useEffect(() => {
    if (accountCreatedAt) {
      let createdDate: Date;
      if (typeof accountCreatedAt === 'object' && 'toDate' in accountCreatedAt) {
        createdDate = accountCreatedAt.toDate();
      } else if (accountCreatedAt instanceof Date) {
        createdDate = accountCreatedAt;
      } else {
        createdDate = new Date(accountCreatedAt);
      }
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

  // Fetch next payment date via the provider-neutral PaymentProvider interface.
  // The page never reads provider-specific subscription data directly; the active
  // provider's adapter (PayPal) resolves the neutral active-subscription record.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const fetchNextPayment = async () => {
      try {
        const provider = getPaymentProvider({ mode: 'subscription' });
        const sub = await provider.getActiveSubscription?.(userId);

        if (cancelled) return;

        if (sub?.currentPeriodEnd) {
          const date = new Date(sub.currentPeriodEnd * 1000);
          const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          setNextPayment(formatted);
        } else {
          setNextPayment('N/A');
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
        if (!cancelled) setNextPayment('N/A');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNextPayment();

    return () => {
      cancelled = true;
    };
  }, [userId]);


  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-primary/5 flex flex-col h-full transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">

      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Account Summary
        </h3>
      </div>
      <div className="p-4 sm:p-6 pt-0 flex-1 flex items-center justify-around">

        {loading ? (
          <div className="flex items-center justify-center w-full py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          /* 3-up works even on a 360px phone because two of the three values are
             short integers; the date value steps down to text-lg so "Nov 15"
             can't overflow its ~100px column. */
          <div className="grid grid-cols-3 gap-1.5 sm:gap-4 text-center w-full">
            <div className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <CircleCheckBig className="h-5 w-5 shrink-0 text-primary" />
              <p className="font-bold text-xl sm:text-2xl tabular-nums">{sessionsCompleted}</p>
              <p className="text-xs leading-tight text-muted-foreground">Sessions Completed</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <Calendar className="h-5 w-5 shrink-0 text-primary" />
              <p className="font-bold text-xl sm:text-2xl tabular-nums">{weeksActive}</p>
              <p className="text-xs leading-tight text-muted-foreground">Weeks Active</p>
            </div>
            <div className="flex flex-col items-center gap-1 p-1.5 sm:p-2 rounded-lg transition-colors hover:bg-primary/10 cursor-default">
              <CreditCard className="h-5 w-5 shrink-0 text-primary" />
              <p className="font-bold text-lg sm:text-2xl tabular-nums">{nextPayment}</p>
              <p className="text-xs leading-tight text-muted-foreground">Next Payment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
