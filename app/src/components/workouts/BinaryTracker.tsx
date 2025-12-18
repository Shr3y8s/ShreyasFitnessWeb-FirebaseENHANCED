'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  FlexibilityConfiguration,
  FlexibilityActualData,
  MobilityConfiguration,
  MobilityActualData,
} from '@/types/workout';

type BinaryTrackerProps = {
  plannedConfig: FlexibilityConfiguration | MobilityConfiguration;
  actualData: FlexibilityActualData | MobilityActualData;
  onUpdate: (actualData: any) => void;
  readOnly?: boolean;
};

/**
 * BinaryTracker - UI component for binary (done/not done) tracking
 * Used for: Flexibility, Mobility exercises
 */
export function BinaryTracker({
  plannedConfig,
  actualData,
  onUpdate,
  readOnly = false,
}: BinaryTrackerProps) {
  // Handle Flexibility
  if ('flexibilitySubType' in plannedConfig) {
    const flexConfig = plannedConfig as FlexibilityConfiguration;
    const flexData = actualData as FlexibilityActualData;

    const handleStretchToggle = (stretchNumber: number, checked: boolean) => {
      let updatedStretches: number[];
      
      if (checked) {
        // Add to completed stretches if not already there
        updatedStretches = [...flexData.completedStretches, stretchNumber].sort((a, b) => a - b);
      } else {
        // Remove from completed stretches
        updatedStretches = flexData.completedStretches.filter(n => n !== stretchNumber);
      }
      
      onUpdate({
        ...flexData,
        completedStretches: updatedStretches,
      });
    };

    return (
      <div className="space-y-2">
        {flexConfig.stretches.map((stretch) => {
          const isCompleted = flexData.completedStretches.includes(stretch.stretchNumber);

          return (
            <div
              key={stretch.stretchNumber}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCompleted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Checkbox
                  id={`stretch-${stretch.stretchNumber}`}
                  checked={isCompleted}
                  onCheckedChange={(checked) => 
                    handleStretchToggle(stretch.stretchNumber, checked as boolean)
                  }
                  disabled={readOnly}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-sm">
                  {stretch.targetMuscles?.join(', ') || stretch.primaryMuscle || `Stretch ${stretch.stretchNumber}`}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stretch.durationSeconds}s hold
                </div>
              </div>

              {isCompleted && (
                <div className="text-sm font-medium text-green-700">
                  ✓ Done
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Handle Mobility
  if ('mobilitySubType' in plannedConfig) {
    const mobilityConfig = plannedConfig as MobilityConfiguration;
    const mobilityData = actualData as MobilityActualData;

    const handleAreaToggle = (areaNumber: number, checked: boolean) => {
      let updatedAreas: number[];
      
      if (checked) {
        // Add to completed areas if not already there
        updatedAreas = [...mobilityData.completedAreas, areaNumber].sort((a, b) => a - b);
      } else {
        // Remove from completed areas
        updatedAreas = mobilityData.completedAreas.filter(n => n !== areaNumber);
      }
      
      onUpdate({
        ...mobilityData,
        completedAreas: updatedAreas,
      });
    };

    return (
      <div className="space-y-2">
        {mobilityConfig.areas.map((area) => {
          const isCompleted = mobilityData.completedAreas.includes(area.areaNumber);

          return (
            <div
              key={area.areaNumber}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                isCompleted 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center">
                <Checkbox
                  id={`area-${area.areaNumber}`}
                  checked={isCompleted}
                  onCheckedChange={(checked) => 
                    handleAreaToggle(area.areaNumber, checked as boolean)
                  }
                  disabled={readOnly}
                  className="h-5 w-5"
                />
              </div>

              <div className="flex-1">
                <div className="font-semibold text-sm capitalize">
                  {area.muscleGroup}
                </div>
                <div className="text-sm text-muted-foreground">
                  {area.durationSeconds}s
                  {area.intensity && ` • ${area.intensity} intensity`}
                </div>
              </div>

              {isCompleted && (
                <div className="text-sm font-medium text-green-700">
                  ✓ Done
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
