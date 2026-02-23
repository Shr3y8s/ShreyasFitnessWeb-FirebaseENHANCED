"use client";

import { useMemo } from 'react';
import { Goal, Dumbbell, RefreshCw, Flame, Footprints } from 'lucide-react';
import { TrainingProtocolData } from '@/types/plan';

interface CurrentPlanProps {
  trainingProtocol?: TrainingProtocolData | null;
}

// Convert snake_case / single-word values to Title Case
const toTitleCase = (str: string): string =>
  str
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Compute elapsed weeks from an ISO date string to today (local tz)
const computeElapsedWeeks = (assignedDate: string): number => {
  const start = new Date(assignedDate + 'T00:00:00'); // treat as local date
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7)));
};

export function CurrentPlan({ trainingProtocol }: CurrentPlanProps) {
  const phase = trainingProtocol?.trainingPhase;
  const focus = trainingProtocol?.trainingFocus;
  const frequency = trainingProtocol?.workoutFrequency;
  const cardioType = trainingProtocol?.cardioType;
  const cardioFrequency = trainingProtocol?.cardioFrequency;
  const stepsPerDay = trainingProtocol?.stepsPerDay;
  const assignedDate = trainingProtocol?.assignedDate;
  const planDurationWeeks = trainingProtocol?.planDurationWeeks;

  const elapsedWeeks = useMemo(() => {
    if (!assignedDate) return null;
    return computeElapsedWeeks(assignedDate);
  }, [assignedDate]);

  const progressPercent = useMemo(() => {
    if (elapsedWeeks === null || !planDurationWeeks) return null;
    return Math.min(100, Math.round((elapsedWeeks / planDurationWeeks) * 100));
  }, [elapsedWeeks, planDurationWeeks]);

  // Extra activities display value
  const extraActivitiesValue = useMemo(() => {
    if (!cardioType) return null;
    if (cardioType === 'cardio') return cardioFrequency ? `${cardioFrequency}×/wk` : '—';
    if (cardioType === 'steps') return stepsPerDay ? `${Number(stepsPerDay).toLocaleString()}/day` : '—';
    return null;
  }, [cardioType, cardioFrequency, stepsPerDay]);

  const title = phase ? `Current Phase: ${toTitleCase(phase)}` : 'Current Phase';

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6">
        <div className="flex items-center gap-3">
          <Goal className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold leading-none tracking-tight">
            {title}
          </h3>
        </div>
      </div>

      <div className="p-6 pt-0 space-y-4">
        {/* 3-column stat grid */}
        <div className="grid grid-cols-3 gap-3 text-center p-4 bg-secondary/50 rounded-lg border border-primary/50">
          {/* Focus */}
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Focus</p>
            <p className="font-semibold text-sm">
              {focus ? toTitleCase(focus) : '—'}
            </p>
          </div>

          {/* Frequency */}
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <p className="text-xs text-muted-foreground">Frequency</p>
            <p className="font-semibold text-sm">
              {frequency ? `${frequency}×/week` : '—'}
            </p>
          </div>

          {/* Extra Activities */}
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors hover:bg-primary/10">
            <div className="text-primary">
              {cardioType === 'steps' ? (
                <Footprints className="h-5 w-5" />
              ) : (
                <Flame className="h-5 w-5" />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {cardioType === 'steps' ? 'Steps' : 'Cardio'}
            </p>
            <p className="font-semibold text-sm">
              {extraActivitiesValue ?? '—'}
            </p>
          </div>
        </div>

        {/* Progress bar — only shown when assignedDate + planDurationWeeks are set */}
        {progressPercent !== null && elapsedWeeks !== null && planDurationWeeks && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-foreground">
                {elapsedWeeks} / {planDurationWeeks} weeks
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
