"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HeartPulse, CheckCircle2 } from 'lucide-react';
import type { LissCardioData } from '@/types/plan';

interface LissCardioTrackerProps {
  lissCardio: LissCardioData;
  weeklyCount: number;
  loggedToday: boolean;
  onToggle: (completed: boolean) => Promise<void>;
  isLoading?: boolean;
}

/**
 * Parses "2x per week", "3x per week" etc. into a number.
 * Falls back to 1 if not parseable.
 */
function parseWeeklyTarget(frequency: string): number {
  const match = frequency.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export function LissCardioTracker({
  lissCardio,
  weeklyCount,
  loggedToday,
  onToggle,
  isLoading = false,
}: LissCardioTrackerProps) {
  const weeklyTarget = parseWeeklyTarget(lissCardio.frequency);
  const progressPct = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));
  const isComplete = weeklyCount >= weeklyTarget;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <HeartPulse className="w-5 h-5 text-red-500" />
            Cardio
          </CardTitle>
          {/* Weekly progress badge — abbreviated on phones, spelled out from sm+ */}
          <span
            className={`shrink-0 text-sm font-bold px-2.5 py-1 rounded-full tabular-nums ${
              isComplete
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {weeklyCount}/{weeklyTarget}
            <span className="hidden sm:inline"> this week</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Prescription details */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="bg-secondary/60 px-2 py-1 rounded">{lissCardio.duration}</span>
          <span className="bg-secondary/60 px-2 py-1 rounded">{lissCardio.targetHeartRate}</span>
          <span className="bg-secondary/60 px-2 py-1 rounded">{lissCardio.timing}</span>
          {lissCardio.equipment && (
            <span className="bg-secondary/60 px-2 py-1 rounded">{lissCardio.equipment}</span>
          )}
        </div>

        {/* Weekly progress bar */}
        <div className="space-y-1.5">
          <Progress value={progressPct} className="h-2" />
          <p className="text-xs text-muted-foreground text-right">
            {isComplete ? '✓ Weekly goal reached!' : `${weeklyTarget - weeklyCount} session${weeklyTarget - weeklyCount !== 1 ? 's' : ''} left this week`}
          </p>
        </div>

        {/* Today log/unlog button — labels shorten on narrow screens */}
        {loggedToday ? (
          <Button
            variant="outline"
            className="w-full min-h-11 border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 transition-transform active:scale-95"
            onClick={() => onToggle(false)}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2 shrink-0 text-green-600" />
            <span className="sm:hidden">Logged Today — Undo</span>
            <span className="hidden sm:inline">Session Logged Today — Undo</span>
          </Button>
        ) : (
          <Button
            className="w-full min-h-11 transition-transform active:scale-95"
            onClick={() => onToggle(true)}
            disabled={isLoading}
          >
            <HeartPulse className="w-4 h-4 mr-2 shrink-0" />
            <span className="sm:hidden">Log Session for Today</span>
            <span className="hidden sm:inline">Log Cardio Session for Today</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
