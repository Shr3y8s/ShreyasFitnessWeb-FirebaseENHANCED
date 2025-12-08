import React from 'react';
import { WorkoutAssignmentExercise } from '@/types/workout';
import { Clock, Activity, Dumbbell, Heart, Target } from 'lucide-react';

interface ExerciseConfigurationDisplayProps {
  exercises: WorkoutAssignmentExercise[];
}

export function ExerciseConfigurationDisplay({ exercises }: ExerciseConfigurationDisplayProps) {
  if (!exercises || exercises.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No exercise configuration available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) => (
        <ExerciseCard key={index} exercise={exercise} index={index} />
      ))}
    </div>
  );
}

function ExerciseCard({ exercise, index }: { exercise: WorkoutAssignmentExercise; index: number }) {
  const config = exercise.configuration;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-50 p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
            {index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-lg">{exercise.exerciseName}</h3>
            <p className="text-sm text-gray-600 capitalize">{exercise.exerciseType.replace('_', ' ')}</p>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="p-4">
        {config.exerciseType === 'strength' && <StrengthDisplay config={config as any} />}
        {config.exerciseType === 'cardio' && <CardioDisplay config={config as any} />}
        {config.exerciseType === 'core' && <CoreDisplay config={config as any} />}
        {config.exerciseType === 'flexibility' && <FlexibilityDisplay config={config as any} />}
        {config.exerciseType === 'balance' && <BalanceDisplay config={config as any} />}
        {config.exerciseType === 'mobility' && <MobilityDisplay config={config as any} />}
        {config.exerciseType === 'plyometric' && <PlyometricDisplay config={config as any} />}
        {config.exerciseType === 'yoga_pilates' && <YogaPilatesDisplay config={config as any} />}

        {/* Exercise Notes */}
        {exercise.notes && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Notes:</strong> {exercise.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Strength Configuration Display
function StrengthDisplay({ config }: { config: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Dumbbell className="h-4 w-4" />
        <span className="capitalize">{config.strengthSubType?.replace('_', ' ') || 'Strength'}</span>
        <span className="text-gray-400">•</span>
        <span>{config.sets?.length || 0} sets</span>
      </div>

      {config.sets?.map((set: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Set {set.setNumber}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
              {set.setType?.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Reps:</span>
              <span className="ml-2 font-medium">{formatReps(set)}</span>
            </div>
            <div>
              <span className="text-gray-600">Weight:</span>
              <span className="ml-2 font-medium">{set.weight} {set.weightUnit}</span>
            </div>
            <div>
              <span className="text-gray-600">Rest:</span>
              <span className="ml-2 font-medium">{formatTime(set.restSeconds)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Cardio Configuration Display
function CardioDisplay({ config }: { config: any }) {
  const subType = config.cardioSubType;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Heart className="h-4 w-4" />
        <span className="capitalize">{subType?.replace('_', ' ')}</span>
      </div>

      {subType === 'steady_state' && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <InfoRow label="Machine" value={config.machineType?.replace('_', ' ')} />
          <InfoRow label="Duration" value={formatTime(config.durationSeconds)} />
          {/* Prioritize Heart Rate (Primary Metric) */}
          {config.targetHeartRate && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Target Heart Rate:</span>
              <span className="font-medium text-red-600">{config.targetHeartRate} bpm</span>
            </div>
          )}
          {/* Target Pace (Secondary/Optional) */}
          {config.targetPace && <InfoRow label="Target Pace (optional)" value={config.targetPace} />}
        </div>
      )}

      {subType === 'intervals' && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <InfoRow label="Machine" value={config.machineType?.replace('_', ' ')} />
          <InfoRow label="Total Rounds" value={config.totalRounds} />
          <div className="text-sm text-gray-600 mt-2">
            {config.intervals?.length || 0} intervals configured
          </div>
        </div>
      )}

      {subType === 'activity_based' && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <InfoRow label="Activity" value={config.activity} />
          <InfoRow label="Duration" value={formatTime(config.durationSeconds)} />
          <InfoRow label="Intensity" value={config.intensity} />
          {config.targetHeartRate && <InfoRow label="Target HR" value={`${config.targetHeartRate} bpm`} />}
        </div>
      )}

      {subType === 'steps_based' && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <InfoRow label="Machine" value={config.machineType?.replace('_', ' ') || 'None'} />
          <InfoRow label="Target Steps" value={config.targetSteps?.toLocaleString()} />
          <InfoRow label="Pace" value={config.pace} />
        </div>
      )}
    </div>
  );
}

// Core Configuration Display
function CoreDisplay({ config }: { config: any }) {
  const subType = config.coreSubType;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Target className="h-4 w-4" />
        <span className="capitalize">{subType?.replace('_', ' ')}</span>
      </div>

      {subType === 'rep_based' && config.sets?.map((set: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={`Set ${set.setNumber}`} value={`${set.targetReps} reps`} />
            <InfoRow label="Rest" value={formatTime(set.restSeconds)} />
          </div>
        </div>
      ))}

      {subType === 'duration_based' && config.rounds?.map((round: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={`Round ${round.roundNumber}`} value={formatTime(round.durationSeconds)} />
            <InfoRow label="Rest" value={formatTime(round.restSeconds)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Flexibility Configuration Display
function FlexibilityDisplay({ config }: { config: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <InfoRow label="Type" value={config.flexibilitySubType?.replace('_', ' ')} />
      <InfoRow label="Duration" value={formatTime(config.totalDurationSeconds)} />
    </div>
  );
}

// Balance Configuration Display
function BalanceDisplay({ config }: { config: any }) {
  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-lg p-4">
        <InfoRow label="Type" value={config.balanceSubType?.replace('_', ' ')} />
      </div>
      {config.rounds?.map((round: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label={`Round ${idx + 1}`} value={formatTime(round.durationSeconds)} />
            <InfoRow label="Rest" value={formatTime(round.restSeconds)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Mobility Configuration Display
function MobilityDisplay({ config }: { config: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <InfoRow label="Type" value={config.mobilitySubType?.replace('_', ' ')} />
      <InfoRow label="Equipment" value={config.equipment} />
      <InfoRow label="Duration" value={formatTime(config.totalDurationSeconds)} />
    </div>
  );
}

// Plyometric Configuration Display
function PlyometricDisplay({ config }: { config: any }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
        <Activity className="h-4 w-4" />
        <span className="capitalize">{config.plyometricSubType?.replace('_', ' ')}</span>
      </div>

      {config.sets?.map((set: any, idx: number) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Set {set.setNumber}</span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full capitalize">
              {set.setType?.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="Reps" value={set.targetReps} />
            <InfoRow label="Rest" value={formatTime(set.restSeconds)} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Yoga/Pilates Configuration Display
function YogaPilatesDisplay({ config }: { config: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
      <InfoRow label="Type" value={config.yogaSubType?.replace('_', ' ')} />
      <InfoRow label="Duration" value={formatTime(config.durationSeconds)} />
      <InfoRow label="Intensity" value={config.intensity} />
    </div>
  );
}

// Helper Components
function InfoRow({ label, value }: { label: string; value: any }) {
  if (!value) return null;
  
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

// Helper Functions
function formatTime(seconds: number | undefined): string {
  if (!seconds) return '0 sec';
  
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  
  return `${minutes} min ${remainingSeconds} sec`;
}

function formatReps(set: any): string {
  const targetReps = set.targetReps;
  
  if (!targetReps) return 'N/A';
  
  // Handle special cases
  if (targetReps === 'AMRAP') return 'AMRAP';
  if (typeof targetReps === 'string') return targetReps;
  
  // Handle range objects
  if (set.repsRange?.min && set.repsRange?.max) {
    return `${set.repsRange.min}-${set.repsRange.max}`;
  }
  
  // Handle direct number
  return String(targetReps);
}
