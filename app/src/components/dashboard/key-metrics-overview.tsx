"use client";

import { TrendingUp, Scale, Dumbbell, Percent } from 'lucide-react';

export function KeyMetricsOverview() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Key Metrics Overview
        </h3>
        <p className="text-sm text-muted-foreground">
          A snapshot of your progress over time.
        </p>
      </div>
      <div className="p-6 pt-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
          <div className="mb-2">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Weight Change</p>
          <p className="text-2xl font-bold">-2 lbs</p>
        </div>
        <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
          <div className="mb-2">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Strength Gain</p>
          <p className="text-2xl font-bold">+15%</p>
        </div>
        <div className="rounded-xl border text-card-foreground shadow-sm text-center flex flex-col items-center justify-center p-4 bg-secondary/50 transition-colors hover:bg-primary/10 border-primary/50">
          <div className="mb-2">
            <Percent className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Body Fat</p>
          <p className="text-2xl font-bold">-1.5%</p>
        </div>
      </div>
    </div>
  );
}
