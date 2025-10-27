"use client";

import { Button } from '@/components/ui/button';
import { Goal, Calendar, Dumbbell, TrendingUp, ArrowRight } from 'lucide-react';

export function CurrentPlan() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-3">
          <Goal className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold leading-none tracking-tight">
            Current Plan: Hypertrophy Phase
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Your focus for the next 4 weeks is building muscle mass.
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center p-4 bg-secondary/50 rounded-lg border border-primary/50">
          <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="font-semibold text-lg">12 Weeks</p>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">Focus</p>
            <p className="font-semibold text-lg">Strength</p>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m17 2 4 4-4 4"></path>
                <path d="M3 11v-1a4 4 0 0 1 4-4h14"></path>
                <path d="m7 22-4-4 4-4"></path>
                <path d="M21 13v1a4 4 0 0 1-4 4H3"></path>
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">Frequency</p>
            <p className="font-semibold text-lg">4/week</p>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">Volume</p>
            <p className="font-semibold text-lg">High</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-4">
          <div className="w-full">
            <div className="flex justify-between w-full text-sm mb-1">
              <span>Progress</span>
              <span className="font-semibold">Week 8 of 12</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: '66%' }}></div>
            </div>
          </div>
          <Button variant="link" className="text-primary font-semibold self-end p-0">
            View Full Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
