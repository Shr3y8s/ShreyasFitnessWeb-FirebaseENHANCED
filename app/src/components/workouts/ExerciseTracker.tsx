'use client';

import React from 'react';
import { SetTracker } from './SetTracker';
import { RoundTracker } from './RoundTracker';
import { DurationTracker } from './DurationTracker';
import { MetricTracker } from './MetricTracker';
import { BinaryTracker } from './BinaryTracker';
import type {
  ExerciseConfigurationType,
  ExerciseActualData,
  StrengthConfiguration,
  StrengthActualData,
  CardioIntervalsConfiguration,
  CardioIntervalsActualData,
  CardioSteadyStateConfiguration,
  CardioSteadyStateActualData,
  CardioActivityBasedConfiguration,
  CardioActivityActualData,
  CardioStepsBasedConfiguration,
  CardioStepsActualData,
  CoreRepBasedConfiguration,
  CoreRepBasedActualData,
  CoreDurationBasedConfiguration,
  CoreDurationActualData,
  FlexibilityConfiguration,
  FlexibilityActualData,
  BalanceConfiguration,
  BalanceActualData,
  MobilityConfiguration,
  MobilityActualData,
  PlyometricConfiguration,
  PlyometricActualData,
  YogaPilatesConfiguration,
  YogaPilatesActualData,
} from '@/types/workout';

interface ExerciseTrackerProps {
  exerciseName: string;
  exerciseType: string;
  plannedConfiguration: ExerciseConfigurationType;
  actualData?: ExerciseActualData;
  onUpdate: (actualData: ExerciseActualData) => void;
  readOnly?: boolean;
}

/**
 * ExerciseTracker - Orchestrator component that routes to appropriate tracker
 * Based on exercise type and configuration
 */
export function ExerciseTracker({
  exerciseName,
  exerciseType,
  plannedConfiguration,
  actualData,
  onUpdate,
  readOnly = false,
}: ExerciseTrackerProps) {
  // If no actual data yet, show placeholder
  if (!actualData) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">{exerciseName}</h3>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-600">
          <p>Start tracking to record your performance</p>
        </div>
      </div>
    );
  }

  // Route to appropriate tracker based on actual data type
  switch (actualData.type) {
    case 'strength':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <SetTracker
            plannedConfig={plannedConfiguration as StrengthConfiguration}
            actualData={actualData as StrengthActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'cardio_steady_state':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <DurationTracker
            plannedConfig={plannedConfiguration as CardioSteadyStateConfiguration}
            actualData={actualData as CardioSteadyStateActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'cardio_intervals':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <RoundTracker
            plannedConfig={plannedConfiguration as CardioIntervalsConfiguration}
            actualData={actualData as CardioIntervalsActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'cardio_activity':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <DurationTracker
            plannedConfig={plannedConfiguration as CardioActivityBasedConfiguration}
            actualData={actualData as CardioActivityActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'cardio_steps':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <MetricTracker
            plannedConfig={plannedConfiguration as CardioStepsBasedConfiguration}
            actualData={actualData as CardioStepsActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'core_rep_based':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <SetTracker
            plannedConfig={plannedConfiguration as CoreRepBasedConfiguration}
            actualData={actualData as CoreRepBasedActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'core_duration':
      // Check if it's rounds-based or simple duration
      const coreConfig = plannedConfiguration as CoreDurationBasedConfiguration;
      if (coreConfig.rounds) {
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{exerciseName}</h3>
            <RoundTracker
              plannedConfig={coreConfig}
              actualData={actualData as CoreDurationActualData}
              onUpdate={onUpdate}
              readOnly={readOnly}
            />
          </div>
        );
      } else {
        return (
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{exerciseName}</h3>
            <DurationTracker
              plannedConfig={coreConfig}
              actualData={actualData as CoreDurationActualData}
              onUpdate={onUpdate}
              readOnly={readOnly}
            />
          </div>
        );
      }

    case 'flexibility':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <BinaryTracker
            plannedConfig={plannedConfiguration as FlexibilityConfiguration}
            actualData={actualData as FlexibilityActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'balance':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <RoundTracker
            plannedConfig={plannedConfiguration as BalanceConfiguration}
            actualData={actualData as BalanceActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'mobility':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <BinaryTracker
            plannedConfig={plannedConfiguration as MobilityConfiguration}
            actualData={actualData as MobilityActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'plyometric':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <SetTracker
            plannedConfig={plannedConfiguration as PlyometricConfiguration}
            actualData={actualData as PlyometricActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    case 'yoga_pilates':
      return (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{exerciseName}</h3>
          <DurationTracker
            plannedConfig={plannedConfiguration as YogaPilatesConfiguration}
            actualData={actualData as YogaPilatesActualData}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        </div>
      );

    default:
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">
            Unknown exercise type: {(actualData as ExerciseActualData).type}
          </p>
        </div>
      );
  }
}
