"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Pin, Calendar, Check, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

const adjustments = [
    'Increased calories by 100 (2300 → 2400)',
    'Added third cardio session on Wednesday',
    'Reduced deadlift volume (fatigue management)',
];

const focusPoints = [
    'Hit all 4 training sessions',
    'Prioritize sleep (7-8 hours nightly)',
    'Check in mid-week if energy levels drop',
];

interface PlanSummaryProps {
    coachNote: {
        coachName: string;
        message: string;
    }
}

const InfoSection = ({ title, icon, children }: { title: string, icon: ReactNode, children: ReactNode }) => (
    <div>
        <h3 className="font-bold mb-3 flex items-center gap-2 text-foreground">
            {icon}
            {title}
        </h3>
        {children}
    </div>
);

export function PlanSummary({ coachNote }: PlanSummaryProps) {
  return (
    <Card className="transition-all duration-300 border-2 border-green-500/30 shadow-[0_4px_12px_rgba(34,197,94,0.25)] bg-green-50/50 dark:bg-green-950/20">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
            <Pin className="w-6 h-6 text-green-600" />
            <span>This Week&apos;s Focus</span>
        </CardTitle>
        <CardDescription>
            Your key adjustments and priorities for the week.
        </CardDescription>
        <div className="absolute top-4 right-4 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Week of Oct 21-27, 2025
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InfoSection title="Adjustments Made" icon={<TrendingUp className="h-5 w-5 text-green-600" />}>
                <ul className="space-y-2">
                    {adjustments.map((item, index) => (
                        <li key={index} className="flex items-center gap-3 p-3 bg-green-100/60 dark:bg-green-900/20 rounded-md">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">{item}</span>
                        </li>
                    ))}
                </ul>
            </InfoSection>

            <InfoSection title="Priorities" icon={<Check className="h-5 w-5 text-green-600" />}>
                 <ul className="space-y-2">
                    {focusPoints.map((item, index) => (
                        <li key={index} className="flex items-center gap-3 p-3 bg-background rounded-md">
                           <div className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />
                           <span className="text-sm font-medium text-foreground">{item}</span>
                       </li>
                   ))}
                </ul>
            </InfoSection>
        </div>
        <div>
            <h3 className="text-xs uppercase text-green-600 dark:text-green-500 mb-2 font-bold tracking-wide">Notes from Last Call:</h3>
            <div className="p-4 bg-background/50 rounded-lg">
                <p className="text-sm font-medium italic text-foreground/90">&quot;{coachNote.message}&quot;</p>
                <p className="text-xs font-medium text-muted-foreground text-right mt-2">- Coach {coachNote.coachName}</p>
            </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm font-semibold flex items-center gap-2 text-green-600 dark:text-green-500">
            <Calendar className="h-4 w-4" />
            Next Check-in: Oct 28, 2025
        </p>
      </CardFooter>
    </Card>
  );
}
