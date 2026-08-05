"use client";

/**
 * WorkoutCalendar — dashboard card listing upcoming + completed workouts.
 *
 * These are self-directed workouts the coach assigns within a date range, so
 * there is deliberately no "Reschedule"/"Cancel" affordance: the client simply
 * completes the work on any day inside the assigned window. (Those two actions
 * previously existed as no-op `console.log` stubs and implied a scheduling
 * contract that doesn't apply to this content type.)
 *
 * Every row is a link into the full My Workouts page, deep-linked to the
 * matching tab — which also makes the whole row one large, easy tap target
 * instead of a small trailing button.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, CircleCheckBig, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  type: string;
  date: string;
  time?: string;
  duration?: string;
}

interface WorkoutCalendarProps {
  upcomingSessions: Session[];
  completedSessions: Session[];
}

export function WorkoutCalendar({ upcomingSessions, completedSessions }: WorkoutCalendarProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed'>('upcoming');

  const tabClass = (isActive: boolean) =>
    cn(
      'inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3',
      'text-sm font-medium transition-all cursor-pointer active:scale-95',
      isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-primary/10'
    );

  return (
    <div className="rounded-xl border bg-primary/5 text-card-foreground shadow-sm transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold leading-none tracking-tight">Workout Calendar</h3>
      </div>

      <div className="p-4 sm:p-6 pt-0">
        {/* Tab Navigation — min-h-11 container keeps both tabs at a comfortable
            touch size on phones. */}
        <div
          className="grid grid-cols-2 min-h-11 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'upcoming'}
            onClick={() => setActiveTab('upcoming')}
            className={tabClass(activeTab === 'upcoming')}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            Upcoming
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'completed'}
            onClick={() => setActiveTab('completed')}
            className={tabClass(activeTab === 'completed')}
          >
            <CircleCheckBig className="h-4 w-4 shrink-0" />
            Completed
          </button>
        </div>

        {/* Workout List */}
        <ul className="space-y-3">
          {activeTab === 'upcoming' ? (
            upcomingSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">No Upcoming Workouts</p>
                <p className="text-sm">Your trainer will assign workouts soon</p>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <li key={session.id}>
                  {/* Entire row is the tap target → My Workouts (Upcoming) */}
                  <Link
                    href="/dashboard/client/workouts?tab=upcoming"
                    className="flex min-h-14 items-center justify-between gap-3 p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-primary/10 active:scale-[0.99]"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{session.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.date}
                        {session.time ? ` at ${session.time}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-primary" />
                  </Link>
                </li>
              ))
            )
          ) : completedSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CircleCheckBig className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No Completed Workouts Yet</p>
              <p className="text-sm">Complete your first workout to see it here!</p>
            </div>
          ) : (
            completedSessions.map((session) => (
              <li key={session.id}>
                {/* Entire row is the tap target → My Workouts (Completed),
                    where the client can review that workout's details. */}
                <Link
                  href="/dashboard/client/workouts?tab=completed"
                  className="flex min-h-14 items-center justify-between gap-3 p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-green-500/10 active:scale-[0.99]"
                >
                  <div className="min-w-0">
                    <p className="font-semibold flex items-center gap-2">
                      <CircleCheckBig className="h-4 w-4 shrink-0 text-green-600" />
                      <span className="truncate">{session.type}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {session.date}
                      {session.duration ? ` · ${session.duration}` : ''}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                    <span className="hidden sm:inline">Details</span>
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
