'use client';

import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { 
  StrengthConfiguration, 
  StrengthActualData,
  CoreRepBasedConfiguration,
  CoreRepBasedActualData,
  PlyometricConfiguration,
  PlyometricActualData,
} from '@/types/workout';

type SetBasedConfiguration = StrengthConfiguration | CoreRepBasedConfiguration | PlyometricConfiguration;
type SetBasedActualData = StrengthActualData | CoreRepBasedActualData | PlyometricActualData;

interface SetTrackerProps {
  plannedConfig: SetBasedConfiguration;
  actualData: SetBasedActualData;
  onUpdate: (actualData: any) => void;
  readOnly?: boolean;
}

/**
 * SetTracker - UI component for tracking set-by-set completion
 * Used for: Strength, Core Rep-Based, Plyometric exercises
 */
export function SetTracker({
  plannedConfig,
  actualData,
  onUpdate,
  readOnly = false,
}: SetTrackerProps) {
  const handleSetCompletion = (setNumber: number, completed: boolean) => {
    const updatedSets = actualData.completedSets.map(set =>
      set.setNumber === setNumber ? { ...set, completed } : set
    );
    
    onUpdate({
      ...actualData,
      completedSets: updatedSets,
    });
  };

  const handleActualReps = (setNumber: number, reps: number) => {
    const updatedSets = actualData.completedSets.map(set =>
      set.setNumber === setNumber ? { ...set, actualReps: reps } : set
    );
    
    onUpdate({
      ...actualData,
      completedSets: updatedSets,
    });
  };

  const handleActualWeight = (setNumber: number, weight: number) => {
    const updatedSets = actualData.completedSets.map(set =>
      set.setNumber === setNumber ? { ...set, actualWeight: weight } : set
    );
    
    onUpdate({
      ...actualData,
      completedSets: updatedSets,
    });
  };

  return (
    <div className="space-y-2">
      {plannedConfig.sets.map((plannedSet, index) => {
        const actualSet = actualData.completedSets.find(s => s.setNumber === plannedSet.setNumber);
        const isCompleted = actualSet?.completed || false;

        return (
          <div
            key={plannedSet.setNumber}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              isCompleted 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            {/* Checkbox */}
            <div className="flex items-center">
              <Checkbox
                id={`set-${plannedSet.setNumber}`}
                checked={isCompleted}
                onCheckedChange={(checked) => 
                  handleSetCompletion(plannedSet.setNumber, checked as boolean)
                }
                disabled={readOnly}
                className="h-5 w-5"
              />
            </div>

            {/* Set Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">
                  Set {plannedSet.setNumber}
                </span>
                {'setType' in plannedSet && (
                  <span className="text-xs text-muted-foreground">
                    {plannedSet.setType === 'warm_up' ? '(Warmup)' : '(Working)'}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">
                Target: {plannedSet.targetReps} reps
                {'weight' in plannedSet && plannedSet.weight && ` @ ${plannedSet.weight} ${plannedSet.weightUnit}`}
              </div>
            </div>

            {/* Actual Performance Inputs */}
            {!readOnly && isCompleted && (
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`reps-${plannedSet.setNumber}`} className="text-xs">
                    Reps
                  </Label>
                  <Input
                    id={`reps-${plannedSet.setNumber}`}
                    type="number"
                    min="0"
                    value={actualSet?.actualReps || ''}
                    onChange={(e) => handleActualReps(plannedSet.setNumber, parseInt(e.target.value))}
                    placeholder={String(plannedSet.targetReps)}
                    className="w-16 h-8 text-sm"
                  />
                </div>
                {'weight' in plannedSet && (
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`weight-${plannedSet.setNumber}`} className="text-xs">
                      Weight
                    </Label>
                    <Input
                      id={`weight-${plannedSet.setNumber}`}
                      type="number"
                      min="0"
                      value={(actualSet as any)?.actualWeight || ''}
                      onChange={(e) => handleActualWeight(plannedSet.setNumber, parseFloat(e.target.value))}
                      placeholder={String(plannedSet.weight)}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Display Actual Performance (Read-Only) */}
            {readOnly && isCompleted && actualSet && (
              <div className="text-sm font-medium text-green-700">
                {actualSet.actualReps && 'actualWeight' in actualSet && (actualSet as any).actualWeight ? (
                  <>
                    {actualSet.actualReps} reps @ {(actualSet as any).actualWeight} {(actualSet as any).actualWeightUnit || ('weight' in plannedSet ? plannedSet.weightUnit : '')}
                  </>
                ) : actualSet.actualReps ? (
                  `${actualSet.actualReps} reps`
                ) : (
                  'Completed'
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
