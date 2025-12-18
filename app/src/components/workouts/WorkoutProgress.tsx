'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import {
  getCompletionStatusIcon,
  getCompletionStatusColor,
  formatCompletionPercentage,
} from '@/lib/workout-utils';

interface WorkoutProgressProps {
  completionPercentage: number;
  completionStatus: 'not_started' | 'partial' | 'completed';
  totalExercises: number;
  completedExercises: number;
  className?: string;
}

/**
 * WorkoutProgress - Display overall workout completion with progress bar
 * Shows percentage, status icon, and exercise count
 */
export function WorkoutProgress({
  completionPercentage,
  completionStatus,
  totalExercises,
  completedExercises,
  className = '',
}: WorkoutProgressProps) {
  const statusIcon = getCompletionStatusIcon(completionStatus);
  const statusColor = getCompletionStatusColor(completionStatus);
  
  // Color scheme based on status
  const colorScheme = {
    completed: 'text-green-700 bg-green-50 border-green-200',
    partial: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    not_started: 'text-gray-700 bg-gray-50 border-gray-200',
  };

  const progressColor = {
    completed: 'bg-green-500',
    partial: 'bg-yellow-500',
    not_started: 'bg-gray-300',
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Status Header */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${colorScheme[completionStatus]}`}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{statusIcon}</span>
          <div>
            <div className="font-semibold text-sm">
              {completionStatus === 'completed' && 'Workout Complete!'}
              {completionStatus === 'partial' && 'In Progress'}
              {completionStatus === 'not_started' && 'Not Started'}
            </div>
            <div className="text-xs text-muted-foreground">
              {completedExercises} of {totalExercises} exercises
            </div>
          </div>
        </div>
        <div className="text-2xl font-bold">
          {formatCompletionPercentage(completionPercentage)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <Progress 
          value={completionPercentage} 
          className="h-3"
          indicatorClassName={progressColor[completionStatus]}
        />
        <p className="text-xs text-center text-muted-foreground">
          Overall Progress
        </p>
      </div>
    </div>
  );
}

interface ExerciseProgressItemProps {
  exerciseName: string;
  completionPercentage: number;
  completionStatus: 'not_started' | 'partial' | 'completed';
  summary?: string;
}

/**
 * ExerciseProgressItem - Display individual exercise completion
 * Compact view for list of exercises
 */
export function ExerciseProgressItem({
  exerciseName,
  completionPercentage,
  completionStatus,
  summary,
}: ExerciseProgressItemProps) {
  const statusIcon = getCompletionStatusIcon(completionStatus);
  
  const colorScheme = {
    completed: 'bg-green-50 border-green-200',
    partial: 'bg-yellow-50 border-yellow-200',
    not_started: 'bg-gray-50 border-gray-200',
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorScheme[completionStatus]}`}>
      <span className="text-xl">{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {exerciseName}
        </div>
        {summary && (
          <div className="text-xs text-muted-foreground">
            {summary}
          </div>
        )}
      </div>
      <div className="text-sm font-bold">
        {formatCompletionPercentage(completionPercentage)}
      </div>
    </div>
  );
}
