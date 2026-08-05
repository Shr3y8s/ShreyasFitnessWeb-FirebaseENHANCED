"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Trophy, Award, Loader2 } from 'lucide-react';

interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  weightUnit: string;
  date: Date | null;
}

export function PersonalRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadRecords = async () => {

      try {
        setLoading(true);
        // clientStats.strengthRecords is maintained by firebase/functions/workouts.js:
        // each strength PR is detected at workout completion and stored per exercise.
        const statsDoc = await getDoc(doc(db, 'clientStats', user.uid));
        if (!statsDoc.exists()) {
          setRecords([]);
          return;
        }

        const strengthRecords = statsDoc.data().strengthRecords || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsed: PersonalRecord[] = Object.entries(strengthRecords).map(([exerciseId, record]: [string, any]) => ({
          exerciseId,
          exerciseName: record.exerciseName || 'Exercise',
          maxWeight: record.maxWeight || 0,
          weightUnit: record.weightUnit || 'lbs',
          date: record.date?.toDate?.() || null,
        }));

        // Top records by heaviest weight (all-time)
        parsed.sort((a, b) => b.maxWeight - a.maxWeight);
        setRecords(parsed.slice(0, 5));
      } catch (error) {
        console.error('Error loading personal records:', error);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [user]);


  return (
    <div className="rounded-xl border bg-primary/5 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">

      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="text-primary" />
          Personal Records
        </h3>
        <p className="text-sm text-muted-foreground">
          Celebrating your recent achievements and milestones.
        </p>
      </div>
      <div className="p-4 sm:p-6 pt-0">

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-semibold">No personal records yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Keep training — your milestones will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((pr) => (
              <div
                key={pr.exerciseId}
                className="flex min-h-14 items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-400/15 text-amber-600 shrink-0">
                    <Award className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{pr.exerciseName}</p>
                    {pr.date && (
                      <p className="text-xs text-muted-foreground">
                        {pr.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm font-bold text-primary whitespace-nowrap shrink-0 tabular-nums">
                  {pr.maxWeight} {pr.weightUnit}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
