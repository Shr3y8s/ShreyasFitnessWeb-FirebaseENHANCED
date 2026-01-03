'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDuration } from '@/lib/workout-utils';
import { cn } from '@/lib/utils';
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
  
  // Get completion status
  const isCompleted = (() => {
    if (actualData.type === 'cardio_steady_state' || 
        actualData.type === 'cardio_activity' ||
        actualData.type === 'yoga_pilates') {
      return actualData.completed;
    }
    if (actualData.type === 'core_duration' && actualData.actualDurationSeconds !== undefined) {
      return actualData.completed || false;
    }
    return false;
  })();

  const handleCompletedChange = (checked: boolean) => {
    if (actualData.type === 'cardio_steady_state') {
      onUpdate({
        ...actualData,
        completed: checked,
      });
    } else if (actualData.type === 'cardio_activity') {
      onUpdate({
        ...actualData,
        completed: checked,
      });
    } else if (actualData.type === 'core_duration' && actualData.actualDurationSeconds !== undefined) {
      onUpdate({
        ...actualData,
        completed: checked,
      });
    } else if (actualData.type === 'yoga_pilates') {
      onUpdate({
        ...actualData,
        completed: checked,
      });
    }
  };

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
    <div className={cn(
      "flex flex-col gap-3 p-4 rounded-lg border transition-colors",
      isCompleted ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
    )}>
      {/* Main Row: Checkbox + Info + Input */}
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="flex items-center pt-1">
          <Checkbox
            id="activity-completed"
            checked={isCompleted}
            onCheckedChange={handleCompletedChange}
            disabled={readOnly}
            className="h-5 w-5"
          />
        </div>
        
        {/* Middle: Target Info */}
        <div className="flex-1">
          <Label 
            htmlFor="activity-completed" 
            className="text-sm font-semibold cursor-pointer block mb-1"
          >
            Completed
          </Label>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
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
        </div>
        
        {/* Right: Duration Input */}
        <div className="flex flex-col items-end gap-1">
          <Label htmlFor="duration-input" className="text-sm font-medium text-foreground">
            Duration
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="duration-input"
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
      </div>

      {/* Progress Bar at Bottom */}
      {isCompleted && actualSeconds > 0 && (
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
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
