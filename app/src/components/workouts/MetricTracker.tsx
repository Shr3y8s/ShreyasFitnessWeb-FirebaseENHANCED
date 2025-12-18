'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  CardioStepsBasedConfiguration,
  CardioStepsActualData,
} from '@/types/workout';

interface MetricTrackerProps {
  plannedConfig: CardioStepsBasedConfiguration;
  actualData: CardioStepsActualData;
  onUpdate: (actualData: CardioStepsActualData) => void;
  readOnly?: boolean;
}

/**
 * MetricTracker - UI component for tracking metric-based exercises
 * Used for: Cardio Steps
 */
export function MetricTracker({
  plannedConfig,
  actualData,
  onUpdate,
  readOnly = false,
}: MetricTrackerProps) {
  const handleStepsChange = (steps: number) => {
    onUpdate({
      ...actualData,
      actualSteps: steps,
    });
  };

  const completionPercentage = Math.round((actualData.actualSteps / plannedConfig.targetSteps) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-4 rounded-lg border bg-gray-50">
        <div className="flex-1">
          <Label htmlFor="steps-completed" className="text-sm font-semibold">
            Steps Completed
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {plannedConfig.targetSteps.toLocaleString()} steps
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            Pace: {plannedConfig.pace}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            id="steps-completed"
            type="number"
            min="0"
            value={actualData.actualSteps}
            onChange={(e) => handleStepsChange(parseInt(e.target.value) || 0)}
            disabled={readOnly}
            className="w-24 text-center text-lg font-semibold"
          />
          <span className="text-sm font-medium">steps</span>
        </div>
      </div>

      {/* Completion percentage indicator */}
      {actualData.actualSteps > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(completionPercentage, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {completionPercentage}%
          </span>
        </div>
      )}
    </div>
  );
}
