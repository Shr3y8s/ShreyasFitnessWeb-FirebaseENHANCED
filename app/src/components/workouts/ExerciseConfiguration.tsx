'use client';

import React, { useState } from 'react';
import { WorkoutAssignmentExercise, WorkoutExecutionExercise, ExerciseConfigurationType } from '@/types/workout';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dumbbell, Info, ChevronDown, ChevronUp, Clock, Plus, Minus, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Unified Exercise Configuration Component
 * 
 * Supports 4 modes:
 * - display: Read-only view (trainer previewing)
 * - configure: Interactive editing (trainer creating assignment)
 * - track: Comparison view (trainer monitoring planned vs actual)
 * - input: Client logging actual performance (beautiful emerald UI)
 */

type ExerciseConfigurationMode = 'display' | 'configure' | 'track' | 'input';

interface ExerciseConfigurationProps {
  exercises: WorkoutAssignmentExercise[];
  mode: ExerciseConfigurationMode;
  
  // For configure & input modes
  onUpdate?: (exercises: WorkoutAssignmentExercise[]) => void;
  
  // For track & input modes (actual performance data)
  executionExercises?: WorkoutExecutionExercise[];
  
  // For input mode - completion tracking
  completedExercises?: { [key: number]: boolean };
  onExerciseCompletedChange?: (completedExercises: { [key: number]: boolean }) => void;
  
  // Optional customization
  readOnly?: boolean;
  showNotes?: boolean;
  compact?: boolean;
  className?: string;
}

export function ExerciseConfiguration({
  exercises,
  mode,
  onUpdate,
  executionExercises,
  completedExercises = {},
  onExerciseCompletedChange,
  readOnly = false,
  showNotes = true,
  compact = false,
  className,
}: ExerciseConfigurationProps) {
  const [openExercises, setOpenExercises] = useState<{ [key: number]: boolean }>({});
  const [performanceData, setPerformanceData] = useState<{ [key: string]: any }>({});
  
  const isInteractive = (mode === 'configure' || mode === 'input') && !readOnly;
  
  // Calculate progress for input mode
  const completedCount = exercises.filter((_, index) => completedExercises[index]).length;
  const progressPercentage = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;
  const areAllExercisesComplete = exercises.length > 0 && exercises.every((_, index) => completedExercises[index]);
  
  const toggleExercise = (index: number) => {
    setOpenExercises((prev) => ({ ...prev, [index]: !prev[index] }));
  };
  
  const handleAllCheckedChange = (checked: boolean | 'indeterminate') => {
    if (onExerciseCompletedChange) {
      const newCompleted: { [key: number]: boolean } = {};
      if (checked) {
        exercises.forEach((_, index) => {
          newCompleted[index] = true;
        });
      }
      onExerciseCompletedChange(newCompleted);
    }
  };
  
  const handleExerciseCheckedChange = (exIndex: number, checked: boolean | 'indeterminate') => {
    if (onExerciseCompletedChange) {
      onExerciseCompletedChange({
        ...completedExercises,
        [exIndex]: !!checked,
      });
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with progress (input mode only) */}
      {mode === 'input' && (
        <div className="flex justify-between items-center pb-4 border-b">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Exercises
          </h4>
          <div className="flex items-center space-x-4 w-1/3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="mark-all-exercises" 
                checked={areAllExercisesComplete}
                onCheckedChange={handleAllCheckedChange}
                disabled={readOnly}
                className="cursor-pointer"
              />
              <label
                htmlFor="mark-all-exercises"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 whitespace-nowrap"
              >
                Mark all complete
              </label>
            </div>
            <div className="w-full flex items-center gap-2">
              <Progress value={progressPercentage} className="h-2" />
              <span className="text-xs text-muted-foreground font-semibold w-12 text-right">
                {Math.round(progressPercentage)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Exercise List */}
      <div className="space-y-3">
        {exercises.map((exercise, exIndex) => {
          const isOpen = openExercises[exIndex] || false;
          const isExerciseComplete = completedExercises[exIndex] || false;
          const config = exercise.configuration;

          return (
            <Collapsible
              key={exIndex}
              open={isOpen}
              onOpenChange={() => toggleExercise(exIndex)}
              className="border rounded-lg border-primary/20 overflow-hidden"
            >
              {/* Exercise Header (Collapsed State) */}
              <CollapsibleTrigger asChild>
                <div className={cn(
                  "flex items-center justify-between p-4 w-full hover:bg-accent/50 transition-colors cursor-pointer",
                  mode === 'input' && isExerciseComplete && "bg-primary/5"
                )}>
                  <div className="flex items-center gap-3 flex-1">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full border-2",
                      mode === 'input' && isExerciseComplete ? "border-primary bg-primary/10" : "border-muted"
                    )}>
                      {mode === 'input' && isExerciseComplete ? (
                        <Dumbbell className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-sm font-semibold">{exIndex + 1}</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-base">{exercise.exerciseName}</h5>
                      </div>
                      <ExerciseSummaryLine exercise={exercise} />
                    </div>
                  </div>

                  <div className="text-primary">
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              {/* Exercise Details (Expanded State) */}
              <CollapsibleContent>
                <div className={cn(
                  "border-t border-primary/20 p-4",
                  mode === 'input' && isExerciseComplete && "bg-primary/5"
                )}>
                  {/* Render based on exercise type */}
                  {config.exerciseType === 'strength' && (
                    <StrengthExerciseView
                      exercise={exercise}
                      exIndex={exIndex}
                      mode={mode}
                      readOnly={readOnly}
                      performanceData={performanceData}
                      onPerformanceChange={setPerformanceData}
                    />
                  )}
                  
                  {config.exerciseType === 'cardio' && (
                    <CardioExerciseView
                      exercise={exercise}
                      exIndex={exIndex}
                      mode={mode}
                      readOnly={readOnly}
                    />
                  )}
                  
                  {config.exerciseType === 'core' && (
                    <CoreExerciseView
                      exercise={exercise}
                      mode={mode}
                    />
                  )}
                  
                  {config.exerciseType === 'flexibility' && (
                    <FlexibilityExerciseView
                      exercise={exercise}
                    />
                  )}
                  
                  {config.exerciseType === 'balance' && (
                    <BalanceExerciseView
                      exercise={exercise}
                    />
                  )}
                  
                  {config.exerciseType === 'mobility' && (
                    <MobilityExerciseView
                      exercise={exercise}
                    />
                  )}
                  
                  {config.exerciseType === 'plyometric' && (
                    <PlyometricExerciseView
                      exercise={exercise}
                    />
                  )}
                  
                  {config.exerciseType === 'yoga_pilates' && (
                    <YogaPilatesExerciseView
                      exercise={exercise}
                    />
                  )}
                  
                  {/* Exercise Complete Button (input mode only) */}
                  {mode === 'input' && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant={isExerciseComplete ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleExerciseCheckedChange(exIndex, !isExerciseComplete)}
                        disabled={readOnly}
                        className="w-full sm:w-auto"
                      >
                        {isExerciseComplete ? (
                          <>
                            <Dumbbell className="h-4 w-4 mr-2" />
                            Exercise Complete
                          </>
                        ) : (
                          'Mark Exercise Complete'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}

// Helper: Exercise Summary Line
function ExerciseSummaryLine({ exercise }: { exercise: WorkoutAssignmentExercise }) {
  const config = exercise.configuration;
  
  if (config.exerciseType === 'strength') {
    const sets = (config as any).sets || [];
    const hasWeight = sets[0]?.weight;
    const targetReps = sets[0]?.targetReps;
    
    return (
      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
        {hasWeight && (
          <span className="font-medium text-primary">{sets[0].weight} {sets[0].weightUnit}</span>
        )}
        {hasWeight && <span>×</span>}
        <span>{targetReps}</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {sets[0]?.restSeconds}s rest
        </span>
        <span>•</span>
        <span className="font-medium">{sets.length} {sets.length === 1 ? 'set' : 'sets'}</span>
      </div>
    );
  }
  
  if (config.exerciseType === 'cardio') {
    const cardioConfig = config as any;
    
    // Format subtype for display
    const subtypeMap: { [key: string]: string } = {
      'steady_state': 'Steady State',
      'intervals': 'Intervals',
      'activity_based': 'Activity Based',
      'steps_based': 'Steps Based'
    };
    const subtypeLabel = subtypeMap[cardioConfig.cardioSubType] || cardioConfig.cardioSubType;
    
    return (
      <div className="text-sm text-muted-foreground mt-1">
        {subtypeLabel}
      </div>
    );
  }
  
  return <div className="text-sm text-muted-foreground mt-1 capitalize">{config.exerciseType}</div>;
}

// Strength Exercise View
function StrengthExerciseView({
  exercise,
  exIndex,
  mode,
  readOnly,
  performanceData,
  onPerformanceChange,
}: {
  exercise: WorkoutAssignmentExercise;
  exIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
  performanceData: { [key: string]: any };
  onPerformanceChange: (data: { [key: string]: any }) => void;
}) {
  const config = exercise.configuration as any;
  const sets = config.sets || [];

  const handleInputChange = (setId: string, field: 'weight' | 'reps', value: string) => {
    onPerformanceChange({
      ...performanceData,
      [setId]: {
        ...(performanceData[setId] || {}),
        [field]: value,
      },
    });
  };

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          <TableHead className="w-16 text-center">Set</TableHead>
          <TableHead className="text-center">Target</TableHead>
          {mode === 'input' && (
            <>
              <TableHead className="w-32 text-center">Weight (lbs)</TableHead>
              <TableHead className="w-32 text-center">Actual Reps</TableHead>
            </>
          )}
          {mode === 'display' && (
            <TableHead className="text-center">Parameters</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sets.map((set: any, setIndex: number) => {
          const setId = `${exIndex}-${setIndex}`;
          const setData = performanceData[setId] || {};

          return (
            <TableRow key={setId} className="border-primary/20">
              <TableCell className="text-center font-medium">
                <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                  {set.setNumber}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  {set.weight && (
                    <span className="text-xs font-semibold text-primary">
                      {set.weight} {set.weightUnit}
                    </span>
                  )}
                  <Badge variant="outline" className="border-primary text-primary">
                    {set.targetReps} reps
                  </Badge>
                </div>
              </TableCell>
              {mode === 'input' && (
                <>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder={set.weight?.toString() || "0"}
                      className="text-center border-primary/20"
                      value={setData.weight || ''}
                      onChange={(e) => handleInputChange(setId, 'weight', e.target.value)}
                      disabled={readOnly}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0"
                      className="text-center border-primary/20"
                      value={setData.reps || ''}
                      onChange={(e) => handleInputChange(setId, 'reps', e.target.value)}
                      disabled={readOnly}
                    />
                  </TableCell>
                </>
              )}
              {mode === 'display' && (
                <TableCell className="text-center text-sm">
                  {set.weight} {set.weightUnit} × {set.targetReps} reps ({set.restSeconds}s rest)
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// Cardio Exercise View
function CardioExerciseView({
  exercise,
  exIndex,
  mode,
  readOnly,
}: {
  exercise: WorkoutAssignmentExercise;
  exIndex: number;
  mode: ExerciseConfigurationMode;
  readOnly: boolean;
}) {
  const config = exercise.configuration as any;
  
  // Render as compact table
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-primary/20">
          {config.cardioSubType === 'steady_state' && (
            <>
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Duration</TableHead>
              <TableHead className="text-center">Target HR</TableHead>
              {config.targetPace && <TableHead className="text-center">Target Pace</TableHead>}
            </>
          )}
          {config.cardioSubType === 'intervals' && (
            <>
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Total Rounds</TableHead>
              <TableHead className="text-center">Intervals</TableHead>
            </>
          )}
          {config.cardioSubType === 'activity_based' && (
            <>
              <TableHead className="text-center">Activity</TableHead>
              <TableHead className="text-center">Intensity</TableHead>
              <TableHead className="text-center">Duration</TableHead>
              {config.targetHeartRate && <TableHead className="text-center">Target HR</TableHead>}
            </>
          )}
          {config.cardioSubType === 'steps_based' && (
            <>
              <TableHead className="text-center">Machine</TableHead>
              <TableHead className="text-center">Target Steps</TableHead>
              <TableHead className="text-center">Pace</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow className="border-primary/20">
          {config.cardioSubType === 'steady_state' && (
            <>
              <TableCell className="text-center capitalize">
                {config.machineType?.replace('_', ' ')}
              </TableCell>
              <TableCell className="text-center font-medium">
                {Math.round(config.durationSeconds / 60)} min
              </TableCell>
              <TableCell className="text-center">
                {config.targetHeartRate ? `${config.targetHeartRate} bpm` : '-'}
              </TableCell>
              {config.targetPace && (
                <TableCell className="text-center">
                  {config.targetPace}
                </TableCell>
              )}
            </>
          )}
          {config.cardioSubType === 'intervals' && (
            <>
              <TableCell className="text-center capitalize">
                {config.machineType?.replace('_', ' ')}
              </TableCell>
              <TableCell className="text-center font-medium">
                {config.totalRounds}
              </TableCell>
              <TableCell className="text-center">
                {config.intervals?.length || 0} configured
              </TableCell>
            </>
          )}
          {config.cardioSubType === 'activity_based' && (
            <>
              <TableCell className="text-center capitalize font-medium">
                {config.activity}
              </TableCell>
              <TableCell className="text-center capitalize">
                {config.intensity}
              </TableCell>
              <TableCell className="text-center font-medium">
                {Math.round(config.durationSeconds / 60)} min
              </TableCell>
              {config.targetHeartRate && (
                <TableCell className="text-center">
                  {config.targetHeartRate} bpm
                </TableCell>
              )}
            </>
          )}
          {config.cardioSubType === 'steps_based' && (
            <>
              <TableCell className="text-center capitalize">
                {config.machineType?.replace('_', ' ') || 'None'}
              </TableCell>
              <TableCell className="text-center font-medium">
                {config.targetSteps?.toLocaleString()}
              </TableCell>
              <TableCell className="text-center capitalize">
                {config.pace}
              </TableCell>
            </>
          )}
        </TableRow>
      </TableBody>
    </Table>
  );
}

// Core Exercise View
function CoreExerciseView({
  exercise,
  mode,
}: {
  exercise: WorkoutAssignmentExercise;
  mode: ExerciseConfigurationMode;
}) {
  const config = exercise.configuration as any;
  
  if (config.coreSubType === 'rep_based') {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-3">Rep-Based Core Exercise</p>
        <div className="space-y-2">
          {config.sets?.map((set: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">Set {set.setNumber}:</span>
              <span className="font-medium">{set.targetReps} reps • {set.restSeconds}s rest</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (config.coreSubType === 'duration_based') {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-3">Duration-Based Core Exercise (Planks, Holds)</p>
        <div className="space-y-2">
          {config.rounds?.map((round: any, idx: number) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700">Round {round.roundNumber}:</span>
              <span className="font-medium">{round.durationSeconds}s hold • {round.restSeconds}s rest</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  return <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">Core exercise configuration</div>;
}

// Flexibility Exercise View
function FlexibilityExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Type" value={config.flexibilitySubType?.replace('_', ' ')} />
        <InfoRow label="Duration" value={`${config.totalDurationSeconds}s`} />
      </div>
    </div>
  );
}

// Balance Exercise View
function BalanceExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-3">{config.balanceSubType?.replace('_', ' ')}</p>
      <div className="space-y-2">
        {config.rounds?.map((round: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-700">Round {idx + 1}:</span>
            <span className="font-medium">{round.durationSeconds}s • {round.restSeconds}s rest</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobility Exercise View
function MobilityExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Type" value={config.mobilitySubType?.replace('_', ' ')} />
        <InfoRow label="Duration" value={`${config.totalDurationSeconds}s`} />
        {config.equipment && (
          <InfoRow label="Equipment" value={config.equipment} className="col-span-2" />
        )}
      </div>
    </div>
  );
}

// Plyometric Exercise View
function PlyometricExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-600 mb-3">{config.plyometricSubType}</p>
      <div className="space-y-2">
        {config.sets?.map((set: any, idx: number) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-700">Set {set.setNumber} ({set.setType}):</span>
            <span className="font-medium">{set.targetReps} reps • {set.restSeconds}s rest</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Yoga/Pilates Exercise View
function YogaPilatesExerciseView({
  exercise,
}: {
  exercise: WorkoutAssignmentExercise;
}) {
  const config = exercise.configuration as any;
  
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <InfoRow label="Type" value={config.yogaSubType?.replace('_', ' ')} />
        <InfoRow label="Duration" value={`${Math.round(config.durationSeconds / 60)} min`} />
        <InfoRow label="Intensity" value={config.intensity} />
      </div>
    </div>
  );
}

// Helper Components
function InfoRow({ label, value, className }: { label: string; value: any; className?: string }) {
  if (!value) return null;
  
  return (
    <div className={cn("flex justify-between items-center", className)}>
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
