'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatDuration } from '@/lib/workout-utils';
import type {
  CardioSteadyStateConfiguration,
  CardioSteadyStateActualData,
  CardioActivityBasedConfiguration,
  CardioActivityActualData,
  CoreDurationBasedConfiguration,
  CoreDurationActualData,
  YogaPilatesConfiguration,
  YogaPilatesActualData,
} from '@/types/workout';

type DurationTrackerProps = {
  plannedConfig: 
    | CardioSteadyStateConfiguration 
    | CardioActivityBasedConfiguration 
    | CoreDurationBasedConfiguration 
    | YogaPilatesConfiguration;
  actualData: 
    | CardioSteadyStateActualData 
    | CardioActivityActualData 
    | CoreDurationActualData 
    | YogaPilatesActualData;
  onUpdate: (actualData: any) => void;
  readOnly?: boolean;
};

/**
 * DurationTracker - UI component for tracking duration-based exercises
 * Used for: Cardio Steady State, Cardio Activity, Core Duration (simple), Yoga/Pilates
 */
export function DurationTracker({
  plannedConfig,
  actualData,
  onUpdate,
  readOnly = false,
}: DurationTrackerProps) {
  // Get prescribed duration based on config type
  const getPrescribedDuration = (): number => {
    if ('cardioSubType' in plannedConfig) {
      return plannedConfig.durationSeconds;
    }
    if ('coreSubType' in plannedConfig && plannedConfig.durationSeconds) {
      return plannedConfig.durationSeconds;
    }
    if ('yogaSubType' in plannedConfig) {
      return plannedConfig.durationSeconds;
    }
    return 0;
  };

  // Get actual duration from actualData
  const getActualDuration = (): number => {
    if (actualData.type === 'cardio_steady_state' || 
        actualData.type === 'cardio_activity' ||
        actualData.type === 'yoga_pilates') {
      return actualData.actualDurationSeconds;
    }
    if (actualData.type === 'core_duration' && actualData.actualDurationSeconds) {
      return actualData.actualDurationSeconds;
    }
    return 0;
  };

  const prescribedSeconds = getPrescribedDuration();
  const actualSeconds = getActualDuration();
  const prescribedMinutes = Math.round(prescribedSeconds / 60);

  const handleDurationChange = (minutes: number) => {
    const seconds = minutes * 60;
    
    if (actualData.type === 'cardio_steady_state') {
      onUpdate({
        ...actualData,
        actualDurationSeconds: seconds,
      });
    } else if (actualData.type === 'cardio_activity') {
      onUpdate({
        ...actualData,
        actualDurationSeconds: seconds,
      });
    } else if (actualData.type === 'core_duration') {
      onUpdate({
        ...actualData,
        actualDurationSeconds: seconds,
      });
    } else if (actualData.type === 'yoga_pilates') {
      onUpdate({
        ...actualData,
        actualDurationSeconds: seconds,
      });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-gray-50">
        <div className="flex-1">
          <Label htmlFor="duration-completed" className="text-sm font-semibold">
            Duration Completed
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {formatDuration(prescribedSeconds)}
          </p>
          
          {/* Show additional info based on exercise type */}
          {'targetHeartRate' in plannedConfig && plannedConfig.targetHeartRate && (
            <p className="text-xs text-muted-foreground">
              Heart Rate: {plannedConfig.targetHeartRate} bpm
            </p>
          )}
          {'targetPace' in plannedConfig && plannedConfig.targetPace && (
            <p className="text-xs text-muted-foreground">
              Pace: {plannedConfig.targetPace}
            </p>
          )}
          {'intensity' in plannedConfig && (
            <p className="text-xs text-muted-foreground capitalize">
              Intensity: {plannedConfig.intensity}
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            id="duration-completed"
            type="number"
            min="0"
            value={Math.round(actualSeconds / 60)}
            onChange={(e) => handleDurationChange(parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="w-20 text-center text-lg font-semibold"
          />
          <span className="text-sm font-medium">min</span>
        </div>
      </div>

      {/* Completion percentage indicator */}
      {actualSeconds > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min((actualSeconds / prescribedSeconds) * 100, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round((actualSeconds / prescribedSeconds) * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}
