"use client";

import { Calendar, MapPin, Info } from 'lucide-react';

interface Workout {
  type: string;
  date: string;
  time: string;
  location: string;
}

interface UpcomingWorkoutReminderProps {
  workout: Workout;
}

export function UpcomingWorkoutReminder({ workout }: UpcomingWorkoutReminderProps) {
  return (
    <div className="rounded-xl border text-card-foreground shadow-sm bg-primary/10 border-primary/50 flex flex-col hover:shadow-lg">
      <div className="flex p-6 flex-row gap-4 items-center">
        <div className="p-3 bg-primary/20 rounded-full">
          <Calendar className="text-primary w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight">
            Upcoming In-Person Session
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Don&apos;t forget your next session is just around the corner.
          </p>
        </div>
      </div>
      <div className="p-6 pt-0 space-y-4 pl-20 pb-4 flex-1 flex flex-col justify-center">
        <div className="space-y-2">
          <p className="font-bold text-lg">{workout.type}</p>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{workout.date} at {workout.time}</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{workout.location}</span>
          </div>
        </div>
        <div className="h-[1px] w-full my-2 bg-primary/30"></div>
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2 text-sm text-primary">
            <Info className="h-4 w-4" />
            Don&apos;t Forget
          </h4>
          <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
            <li>Water bottle to stay hydrated</li>
            <li>Towel for your workout</li>
            <li>Proper workout shoes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
