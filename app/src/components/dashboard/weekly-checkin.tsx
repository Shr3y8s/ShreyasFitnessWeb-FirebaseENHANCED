"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CalendarCheck } from 'lucide-react';

export function WeeklyCheckin() {
  const router = useRouter();
  
  const handleSchedule = () => {
    router.push('/dashboard/client/checkins');
  };

  return (
    <div className="dashboard-card rounded-xl text-card-foreground">

      <div className="flex flex-col space-y-1.5 p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <CalendarCheck className="text-primary" />
          Weekly Check-in
        </h3>
        <p className="text-sm text-muted-foreground">
          Discuss progress and adjust your plan.
        </p>
      </div>
      <div className="flex items-center p-4 sm:p-6 pt-0">

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
