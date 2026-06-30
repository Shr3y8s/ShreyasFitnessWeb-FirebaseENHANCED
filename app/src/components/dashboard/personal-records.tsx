"use client";

import { Trophy } from 'lucide-react';

export function PersonalRecords() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="text-primary" />
          Personal Records
        </h3>
        <p className="text-sm text-muted-foreground">
          Celebrating your recent achievements and milestones.
        </p>
      </div>
      <div className="p-6 pt-0">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold">No personal records yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Keep training — your milestones will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
