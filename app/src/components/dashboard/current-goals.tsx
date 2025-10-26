"use client";

import { Goal } from 'lucide-react';

export function CurrentGoals() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Goal className="text-primary" />
          Current Goals
        </h3>
        <p className="text-sm text-muted-foreground">
          Your primary objectives. Let&apos;s work towards them together!
        </p>
      </div>
      <div className="p-6 pt-0">
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
            <div className="flex-1">
              <p className="font-semibold">Increase Cardio Endurance</p>
              <p className="text-sm text-muted-foreground">
                Complete 3 sessions of 30+ minutes of cardio each week.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
            <div className="flex-1">
              <p className="font-semibold">Build Full-Body Strength</p>
              <p className="text-sm text-muted-foreground">
                Focus on progressive overload in compound lifts like squats and deadlifts.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="mt-1 flex h-2 w-2 translate-y-1 rounded-full bg-primary"></div>
            <div className="flex-1">
              <p className="font-semibold">Improve Nutritional Habits</p>
              <p className="text-sm text-muted-foreground">
                Consistently hit daily protein and water intake targets.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
