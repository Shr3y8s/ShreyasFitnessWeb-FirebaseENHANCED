"use client";

import { Button } from '@/components/ui/button';
import { CalendarCheck } from 'lucide-react';

export function WeeklyCheckin() {
  const handleSchedule = () => {
    window.open('https://calendly.com/shreyas-annapureddy/30min', '_blank');
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <CalendarCheck className="text-primary" />
          Weekly Check-in
        </h3>
        <p className="text-sm text-muted-foreground">
          Discuss progress and adjust your plan.
        </p>
      </div>
      <div className="flex items-center p-6 pt-0">
        <Button
          onClick={handleSchedule}
          className="w-full transition-transform hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        >
          Schedule Now
        </Button>
      </div>
    </div>
  );
}
