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
}

export function CardioProtocol({ frequency, duration, targetHeartRate, timing }: CardioProtocolProps) {
  // Show nothing if no cardio protocol is set
  if (!frequency || !duration || !targetHeartRate || !timing) {
    return null;
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
          <HeartPulse className="w-6 h-6 text-primary" />
          <span>LISS Cardio</span>
        </CardTitle>
        <CardDescription>
          Low Intensity Steady State prescription
        </CardDescription>
      </CardHeader>
      <CardContent>
         <div className="p-4 rounded-lg bg-secondary/50 border">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <p className="font-bold">{frequency}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="font-bold">{duration}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Target HR</p>
                    <p className="font-bold">{targetHeartRate}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Timing</p>
                    <p className="font-bold">{timing}</p>
                </div>
            </div>
         </div>
      </CardContent>
    </Card>
  );
}
