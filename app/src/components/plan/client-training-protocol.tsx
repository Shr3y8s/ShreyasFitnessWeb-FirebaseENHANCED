"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Dumbbell, Calendar, Check, Loader2 } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Workout } from '@/types/workout';
import { formatWeekRange, getCurrentWeekISO } from '@/lib/week-utils';

interface ClientTrainingProtocolProps {
  clientId: string;
  keyPriorities: string[];
}

/** Firestore Timestamp-ish value: may already be a Date, or expose `toDate()`. */
type DateLike = Date | { toDate: () => Date } | string | number | null | undefined;

/**
 * Firestore `workouts` docs carry a denormalised `progress` summary that isn't
 * part of the `Workout` type (it's written by Cloud Functions, not the client),
 * so we widen locally instead of reaching for `any`.
 */
type ScheduledWorkout = Workout & {
  progress?: { completionPercentage?: number };
};

/** Normalise a Firestore Timestamp / Date / string into a Date, or null. */
function toDate(value: DateLike): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string') return new Date(`${value}T00:00:00`);
  if (typeof value === 'number') return new Date(value);
  return null;
}

export function ClientTrainingProtocol({ clientId, keyPriorities }: ClientTrainingProtocolProps) {
  const [assignments, setAssignments] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScheduledWorkouts = async () => {
      try {
        setLoading(true);
        
        // Query all scheduled workouts for this client (same pattern as dashboard WorkoutCalendar)
        const assignmentsRef = collection(db, 'workouts');
        const q = query(
          assignmentsRef,
          where('clientId', '==', clientId),
          where('status', '==', 'scheduled'),
          orderBy('dueDate', 'asc'),
          limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedAssignments: ScheduledWorkout[] = [];
        
        querySnapshot.forEach((docSnap) => {
          fetchedAssignments.push({
            id: docSnap.id,
            ...docSnap.data()
          } as unknown as ScheduledWorkout);
        });
        
        setAssignments(fetchedAssignments);
      } catch (error) {
        console.error('Error fetching scheduled workouts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchScheduledWorkouts();
    }
  }, [clientId]);


  // Get the most recent update date from assignments
  const getLastUpdatedDate = (): string => {
    if (assignments.length === 0) return 'Not updated';
    
    // Find the most recent updatedAt date
    const mostRecent = assignments.reduce<Date | null>((latest, assignment) => {
      const date = toDate(assignment.updatedAt as DateLike);
      if (!date) return latest;
      return !latest || date > latest ? date : latest;
    }, null);

    if (!mostRecent) return 'Not updated';
    
    return `Last updated: ${mostRecent.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Format date to "Mon, Dec 23"
  const formatDueDate = (dueDate: DateLike) => {
    const date = toDate(dueDate);
    if (!date) return 'Not scheduled';

    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dayOfWeek}, ${monthDay}`;
  };

  if (loading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Dumbbell className="w-6 h-6 text-primary" />
            <span>Training Protocol</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      {/* "Last updated" is a normal flex sibling rather than absolutely
          positioned — as an absolute element it reserved no space and physically
          overlapped the title on narrow screens. */}
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl min-w-0">
            <Dumbbell className="w-6 h-6 shrink-0 text-primary" />
            <span>Training Protocol</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {getLastUpdatedDate()}
          </span>
        </div>
        <CardDescription>
          Your current workout program and guidelines for this week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Workouts */}
        {assignments.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <h3 className="font-bold">Scheduled Workouts:</h3>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {formatWeekRange(new Date(getCurrentWeekISO()))}
              </span>
            </div>
            {/* 1-col on the narrowest phones: a date + truncated name + 44px
                progress ring does not fit in ~150px. */}
            <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-3 sm:p-4 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-semibold text-primary">
                        {assignment.dueDate ? formatDueDate(assignment.dueDate as DateLike) : 'Not scheduled'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{assignment.name}</p>
                    </div>
                    <CircularProgress 
                      percentage={assignment.progress?.completionPercentage ?? 0}
                      size={44}
                      strokeWidth={4}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No workouts scheduled</p>
            <p className="text-sm mt-1">Check back later or reach out to your trainer</p>
          </div>
        )}

        {/* Key Priorities */}
            {keyPriorities && keyPriorities.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 text-sm">Key Priorities:</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                  {keyPriorities.map((priority: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
