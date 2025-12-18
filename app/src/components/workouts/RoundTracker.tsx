'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  CardioIntervalsConfiguration,
  CardioIntervalsActualData,
  CoreDurationBasedConfiguration,
  CoreDurationActualData,
  BalanceConfiguration,
  BalanceActualData,
} from '@/types/workout';

type RoundTrackerProps = {
  plannedConfig: CardioIntervalsConfiguration | CoreDurationBasedConfiguration | BalanceConfiguration;
  actualData: CardioIntervalsActualData | CoreDurationActualData | BalanceActualData;
  onUpdate: (actualData: any) => void;
  readOnly?: boolean;
};

/**
 * RoundTracker - UI component for tracking round-by-round completion
 * Used for: Cardio Intervals, Core Duration (rounds), Balance exercises
 */
export function RoundTracker({
  plannedConfig,
  actualData,
  onUpdate,
  readOnly = false,
}: RoundTrackerProps) {
  // Handle Cardio Intervals (simple round count)
  if ('cardioSubType' in plannedConfig && plannedConfig.cardioSubType === 'intervals') {
    const intervalsConfig = plannedConfig as CardioIntervalsConfiguration;
    const intervalsData = actualData as CardioIntervalsActualData;

    const handleRoundChange = (rounds: number) => {
      onUpdate({
        ...intervalsData,
        completedRounds: rounds,
      });
    };

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-gray-50">
          <div className="flex-1">
            <Label htmlFor="rounds-completed" className="text-sm font-semibold">
              Rounds Completed
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {intervalsConfig.totalRounds} rounds
            </p>
          </div>
          <div className="w-24">
            <Input
              id="rounds-completed"
              type="number"
              min="0"
              max={intervalsConfig.totalRounds}
              value={intervalsData.completedRounds}
              onChange={(e) => handleRoundChange(parseInt(e.target.value) || 0)}
              disabled={readOnly}
              className="text-center text-lg font-semibold"
            />
          </div>
        </div>

        {/* Interval Details */}
        <div className="text-xs text-muted-foreground space-y-1">
          {intervalsConfig.intervals.map((interval) => (
            <div key={interval.intervalNumber} className="flex justify-between">
              <span>Interval {interval.intervalNumber} ({interval.type})</span>
              <span>{interval.durationSeconds}s @ {interval.intensity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle Core Duration with rounds
  if ('coreSubType' in plannedConfig && plannedConfig.coreSubType === 'duration_based' && plannedConfig.rounds) {
    const coreConfig = plannedConfig as CoreDurationBasedConfiguration;
    const coreData = actualData as CoreDurationActualData;

    const handleRoundCompletion = (roundNumber: number, completed: boolean) => {
      const updatedRounds = coreData.completedRounds?.map(round =>
        round.roundNumber === roundNumber ? { ...round, completed } : round
      ) || [];
      
      onUpdate({
        ...coreData,
        completedRounds: updatedRounds,
      });
    };

    return (
      <div className="space-y-2">
        {coreConfig.rounds?.map((plannedRound) => {
          const actualRound = coreData.completedRounds?.find(r => r.roundNumber === plannedRound.roundNumber);
          const isCompleted = actualRound?.completed || false;

          return (
            <div
              key={plannedRound.roundNumber}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCompleted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Checkbox
                  id={`round-${plannedRound.roundNumber}`}
                  checked={isCompleted}
                  onCheckedChange={(checked) => 
                    handleRoundCompletion(plannedRound.roundNumber, checked as boolean)
                  }
                  disabled={readOnly}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-sm">
                  Round {plannedRound.roundNumber}
                </div>
                <div className="text-sm text-muted-foreground">
                  {plannedRound.durationSeconds}s
                  {plannedRound.restSeconds && ` • ${plannedRound.restSeconds}s rest`}
                </div>
              </div>

              {isCompleted && (
                <div className="text-sm font-medium text-green-700">
                  ✓ Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Handle Balance rounds
  if ('balanceSubType' in plannedConfig) {
    const balanceConfig = plannedConfig as BalanceConfiguration;
    const balanceData = actualData as BalanceActualData;

    const handleRoundCompletion = (roundNumber: number, completed: boolean) => {
      const updatedRounds = balanceData.completedRounds.map(round =>
        round.roundNumber === roundNumber ? { ...round, completed } : round
      );
      
      onUpdate({
        ...balanceData,
        completedRounds: updatedRounds,
      });
    };

    return (
      <div className="space-y-2">
        {balanceConfig.rounds.map((plannedRound) => {
          const actualRound = balanceData.completedRounds.find(r => r.roundNumber === plannedRound.roundNumber);
          const isCompleted = actualRound?.completed || false;

          return (
            <div
              key={plannedRound.roundNumber}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCompleted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Checkbox
                  id={`balance-round-${plannedRound.roundNumber}`}
                  checked={isCompleted}
                  onCheckedChange={(checked) => 
                    handleRoundCompletion(plannedRound.roundNumber, checked as boolean)
                  }
                  disabled={readOnly}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-sm">
                  Round {plannedRound.roundNumber}
                </div>
                <div className="text-sm text-muted-foreground">
                  {plannedRound.durationSeconds && `${plannedRound.durationSeconds}s`}
                  {plannedRound.reps && ` • ${plannedRound.reps} reps`}
                  {plannedRound.restSeconds && ` • ${plannedRound.restSeconds}s rest`}
                </div>
              </div>

              {isCompleted && (
                <div className="text-sm font-medium text-green-700">
                  ✓ Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
