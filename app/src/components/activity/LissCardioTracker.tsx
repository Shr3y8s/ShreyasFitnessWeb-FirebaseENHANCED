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
    <Card className="transition-all duration-300 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <HeartPulse className="w-5 h-5 text-red-500" />
            Cardio
          </CardTitle>
          {/* Weekly progress badge */}
          <span
            className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
              isComplete
                ? 'bg-green-100 text-green-700'
                : 'bg-primary/10 text-primary'
            }`}
          >
            {weeklyCount} / {weeklyTarget} this week
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

        {/* Today log/unlog button */}
        {loggedToday ? (
          <Button
            variant="outline"
            className="w-full border-green-500 text-green-700 hover:bg-green-50"
            onClick={() => onToggle(false)}
            disabled={isLoading}
          >
            <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
            Session Logged Today — Undo
          </Button>
        ) : (
          <Button
            className="w-full"
            onClick={() => onToggle(true)}
            disabled={isLoading}
          >
            <HeartPulse className="w-4 h-4 mr-2" />
            Log Cardio Session for Today
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
