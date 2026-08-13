"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { HeartPulse } from 'lucide-react';

interface CardioProtocolProps {
  frequency?: string;
  duration?: string;
  targetHeartRate?: string;
  timing?: string;
  equipment?: string;
}

export function CardioProtocol({ frequency, duration, targetHeartRate, timing, equipment }: CardioProtocolProps) {
  // Show nothing if no cardio protocol is set
  if (!frequency || !duration || !targetHeartRate || !timing) {
    return null;
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
          <HeartPulse className="w-6 h-6 shrink-0 text-primary" />
          <span>Cardio</span>
        </CardTitle>
        <CardDescription>
          Low Intensity Steady State prescription
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="p-3 sm:p-4 rounded-lg bg-secondary/50 border">
            {/* Tighter column gap on mobile — gap-x-6 wasted ~24px of a ~300px
                content width, squeezing the value text. */}
            <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-3">
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <p className="font-bold tabular-nums">{frequency}</p>
                </div>
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="font-bold tabular-nums">{duration}</p>
                </div>
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Target HR</p>
                    <p className="font-bold tabular-nums">{targetHeartRate}</p>
                </div>
                <div className="space-y-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">Timing</p>
                    <p className="font-bold">{timing}</p>
                </div>
                {equipment && (
                  <div className="space-y-1 col-span-2 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground">Equipment / Activity</p>
                      <p className="font-bold">{equipment}</p>
                  </div>
                )}
            </div>
         </div>
      </CardContent>
    </Card>
  );
}
