"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CircleCheckBig, MoreHorizontal } from 'lucide-react';

interface Session {
  id: number;
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

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight">Workout Calendar</h3>
      </div>
      <div className="p-6 pt-0">
        {/* Tab Navigation */}
        <div className="grid grid-cols-2 h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground mb-4">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'upcoming'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-primary/10'
            }`}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Upcoming
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'completed'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-primary/10'
            }`}
          >
            <CircleCheckBig className="mr-2 h-4 w-4" />
            Completed
          </button>
        </div>

        {/* Workout List */}
        <ul className="space-y-3">
          {activeTab === 'upcoming' ? (
            <>
              {upcomingSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5"
                >
                  <div>
                    <p className="font-semibold">{session.type}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.date} at {session.time}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-primary">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </>
          ) : (
            <>
              {completedSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-green-500/10 to-green-500/5 opacity-75"
                >
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <CircleCheckBig className="h-4 w-4 text-green-600" />
                      {session.type}
                    </p>
                    <p className="text-sm text-muted-foreground">{session.date}</p>
                  </div>
                  <span className="text-sm text-green-600 font-medium">Completed</span>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
