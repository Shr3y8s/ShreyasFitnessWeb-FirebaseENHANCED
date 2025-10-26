"use client";

import { Trophy, Award, Star } from 'lucide-react';

export function PersonalRecords() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="text-primary" />
          Personal Records
        </h3>
        <p className="text-sm text-muted-foreground">
          Celebrating your recent achievements and milestones.
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <ul className="space-y-4">
          <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
            <div className="text-primary">
              <Trophy className="text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">New Deadlift PR</p>
              <p className="text-sm text-muted-foreground">Aug 12, 2024</p>
            </div>
            <p className="font-bold text-lg text-primary">315 lbs</p>
          </li>
          <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
            <div className="text-primary">
              <Award className="text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Fastest 5k Run</p>
              <p className="text-sm text-muted-foreground">Aug 10, 2024</p>
            </div>
            <p className="font-bold text-lg text-primary">24:32</p>
          </li>
          <li className="flex items-center gap-4 p-3 bg-secondary/50 rounded-lg">
            <div className="text-primary">
              <Star className="text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Workout Streak</p>
              <p className="text-sm text-muted-foreground">Ongoing</p>
            </div>
            <p className="font-bold text-lg text-primary">14 Days</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
