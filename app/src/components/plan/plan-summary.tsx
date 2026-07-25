"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Pin, Calendar, Check, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { WeeklyFocusHistory } from '@/types/plan';
import { getCurrentWeekISO, formatWeekRange } from '@/lib/week-utils';

interface PlanSummaryProps {
  weeklyFocus: WeeklyFocusHistory | null;
  coachName?: string;
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

export function PlanSummary({ weeklyFocus, coachName = "Your Coach" }: PlanSummaryProps) {
  // Get current week's data
  const currentWeekISO = getCurrentWeekISO();
  const currentWeekData = weeklyFocus?.weeks?.find(w => w.weekStartDate === currentWeekISO);
  
  // If no weekly focus data or no data for current week, show empty state
  if (!weeklyFocus || !currentWeekData) {
    return (
      <Card className="transition-all duration-300 border-2 border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Pin className="w-6 h-6 text-muted-foreground" />
            <span>This Week&apos;s Focus</span>
          </CardTitle>
          <CardDescription>
            Your trainer hasn&apos;t set up this week&apos;s focus yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Check back soon for your weekly adjustments, priorities, and coach notes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 border-2 border-green-500/30 shadow-[0_4px_12px_rgba(34,197,94,0.25)] bg-green-50/50 dark:bg-green-950/20 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(34,197,94,0.35)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center gap-3 text-xl">
              <Pin className="w-6 h-6 text-green-600" />
              <span>This Week&apos;s Focus</span>
          </CardTitle>
          <div className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 shrink-0">
            <Calendar className="h-3 w-3" />
            {formatWeekRange(new Date(currentWeekData.weekStartDate))}
          </div>
        </div>
        <CardDescription>
            Your key adjustments and priorities for the week.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentWeekData.adjustments.length > 0 && (
              <InfoSection title="Adjustments Made" icon={<TrendingUp className="h-5 w-5 text-green-600" />}>
                  <ul className="space-y-2">
                      {currentWeekData.adjustments.map((item, index) => (
                          <li key={index} className="flex items-center gap-3 p-3 bg-green-100/60 dark:bg-green-900/20 rounded-md">
                              <div className="h-2 w-2 rounded-full bg-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">{item}</span>
                          </li>
                      ))}
                  </ul>
              </InfoSection>
            )}

            {currentWeekData.priorities.length > 0 && (
              <InfoSection title="Priorities" icon={<Check className="h-5 w-5 text-green-600" />}>
                   <ul className="space-y-2">
                      {currentWeekData.priorities.map((item, index) => (
                          <li key={index} className="flex items-center gap-3 p-3 bg-background rounded-md">
                             <div className="h-2 w-2 rounded-full bg-green-600 flex-shrink-0" />
                             <span className="text-sm font-medium text-foreground">{item}</span>
                         </li>
                     ))}
                  </ul>
              </InfoSection>
            )}
        </div>
        {currentWeekData.coachNotes && (
          <div>
              <h3 className="text-xs uppercase text-green-600 dark:text-green-500 mb-2 font-bold tracking-wide">
                Notes from Last Call
                {currentWeekData.lastCallDate && (
                  <span className="text-muted-foreground font-normal ml-1">
                    ({new Date(currentWeekData.lastCallDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})
                  </span>
                )}:
              </h3>
              <div className="p-4 bg-background/50 rounded-lg">
                  <p className="text-sm font-medium italic text-foreground/90">&quot;{currentWeekData.coachNotes}&quot;</p>
              </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
