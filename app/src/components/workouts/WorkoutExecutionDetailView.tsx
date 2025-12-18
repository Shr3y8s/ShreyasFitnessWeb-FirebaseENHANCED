'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Clock,
  Calendar,
  Flame,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { WorkoutExecution, ExerciseActualData } from '@/types/workout';
import { cn } from '@/lib/utils';

interface WorkoutExecutionDetailViewProps {
  execution: WorkoutExecution;
  showClientNotes?: boolean;
}

export function WorkoutExecutionDetailView({ 
  execution, 
  showClientNotes = true 
}: WorkoutExecutionDetailViewProps) {
  
  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
  };

  // Format difficulty
  const difficultyConfig = {
    'easy': { label: 'Easy', color: 'text-green-600', bg: 'bg-green-50' },
    'moderate': { label: 'Moderate', color: 'text-blue-600', bg: 'bg-blue-50' },
    'hard': { label: 'Hard', color: 'text-orange-600', bg: 'bg-orange-50' },
    'very_hard': { label: 'Very Hard', color: 'text-red-600', bg: 'bg-red-50' },
  };

  const difficultyDisplay = execution.overallDifficulty 
    ? difficultyConfig[execution.overallDifficulty] 
    : null;

  // Compare planned vs actual for strength exercises
  const compareStrength = (planned: any, actual: ExerciseActualData) => {
    if (actual.type !== 'strength') return null;
    
    const plannedSets = planned.sets || [];
    const actualSets = actual.completedSets || [];
    
    let deviations = [];
    
    // Check completion
    const completedCount = actualSets.filter((s: any) => s.completed).length;
    const totalCount = plannedSets.length;
    
    if (completedCount < totalCount) {
      deviations.push(`Completed ${completedCount}/${totalCount} sets`);
    }
    
    return {
      completed: completedCount,
      total: totalCount,
      deviations,
      status: completedCount === totalCount ? 'complete' : completedCount > 0 ? 'partial' : 'not_started'
    };
  };

  // Compare planned vs actual for cardio exercises
  const compareCardio = (planned: any, actual: ExerciseActualData) => {
    if (!actual.type.startsWith('cardio')) return null;
    
    let deviations = [];
    let status = 'complete';
    
    if (actual.type === 'cardio_steady_state') {
      const plannedDuration = planned.targetDurationSeconds || 0;
      const actualDuration = actual.actualDurationSeconds || 0;
      const percentComplete = plannedDuration > 0 ? (actualDuration / plannedDuration) * 100 : 0;
      
      if (actualDuration < plannedDuration) {
        deviations.push(`${Math.round(percentComplete)}% of target duration`);
        status = actualDuration > 0 ? 'partial' : 'not_started';
      }
    } else if (actual.type === 'cardio_intervals') {
      const plannedRounds = planned.rounds || 0;
      const actualRounds = actual.completedRounds || 0;
      
      if (actualRounds < plannedRounds) {
        deviations.push(`${actualRounds}/${plannedRounds} rounds`);
        status = actualRounds > 0 ? 'partial' : 'not_started';
      }
    }
    
    return { deviations, status };
  };

  return (
    <div className="space-y-6">
      {/* Execution Summary */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Execution Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-600">Started At</span>
            <p className="font-medium">
              {execution.startedAt instanceof Date 
                ? execution.startedAt.toLocaleString() 
                : new Date(execution.startedAt).toLocaleString()}
            </p>
          </div>
          
          {execution.completedAt && (
            <div>
              <span className="text-sm text-gray-600">Completed At</span>
              <p className="font-medium">
                {execution.completedAt instanceof Date 
                  ? execution.completedAt.toLocaleString() 
                  : new Date(execution.completedAt).toLocaleString()}
              </p>
            </div>
          )}
          
          <div>
            <span className="text-sm text-gray-600">Duration</span>
            <p className="font-medium">{formatDuration(execution.durationMinutes)}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-600">Completion</span>
            <p className="font-medium">{execution.completionPercentage}%</p>
          </div>
          
          {difficultyDisplay && (
            <div>
              <span className="text-sm text-gray-600">Difficulty Rating</span>
              <p className={cn("font-medium px-3 py-1 rounded-full inline-block", 
                difficultyDisplay.bg, difficultyDisplay.color)}>
                {difficultyDisplay.label}
              </p>
            </div>
          )}
          
          <div>
            <span className="text-sm text-gray-600">Status</span>
            <p className={cn("font-medium px-3 py-1 rounded-full inline-block", 
              execution.completionStatus === 'completed' ? 'bg-green-50 text-green-600' :
              execution.completionStatus === 'partial' ? 'bg-orange-50 text-orange-600' :
              execution.completionStatus === 'in_progress' ? 'bg-blue-50 text-blue-600' :
              'bg-gray-50 text-gray-600'
            )}>
              {execution.completionStatus === 'in_progress' ? 'In Progress' :
               execution.completionStatus === 'completed' ? 'Completed' :
               execution.completionStatus === 'partial' ? 'Partial' : 'Not Started'}
            </p>
          </div>
        </div>
        
        {showClientNotes && execution.overallNotes && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <span className="text-sm font-medium text-gray-600">Client Notes:</span>
                <p className="text-sm mt-1">{execution.overallNotes}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exercise-by-Exercise Breakdown */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Exercise Performance</h3>
        
        <div className="space-y-4">
          {execution.exercises.map((exercise, index) => {
            const comparison = exercise.exerciseType === 'strength' 
              ? compareStrength(exercise.plannedConfiguration, exercise.actualData)
              : exercise.exerciseType === 'cardio'
              ? compareCardio(exercise.plannedConfiguration, exercise.actualData)
              : null;
            
            const statusIcon = 
              exercise.completionStatus === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
              exercise.completionStatus === 'partial' ? <AlertCircle className="h-5 w-5 text-orange-600" /> :
              <X className="h-5 w-5 text-gray-400" />;
            
            const statusBg = 
              exercise.completionStatus === 'completed' ? 'bg-green-50 border-green-200' :
              exercise.completionStatus === 'partial' ? 'bg-orange-50 border-orange-200' :
              'bg-gray-50 border-gray-200';
            
            return (
              <div key={index} className={cn("border rounded-lg p-4", statusBg)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    {statusIcon}
                    <div>
                      <h4 className="font-medium">{exercise.exerciseName}</h4>
                      <p className="text-sm text-gray-600 capitalize">{exercise.exerciseType}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium px-2 py-1 bg-white rounded-md">
                    {exercise.completionPercentage}%
                  </span>
                </div>
                
                {/* Strength Exercise Details */}
                {exercise.exerciseType === 'strength' && 
                 exercise.actualData.type === 'strength' && 
                 exercise.plannedConfiguration.exerciseType === 'strength' && (
                  <div className="ml-8 space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Planned Configuration:</span>
                      <div className="mt-1 space-y-1">
                        {exercise.plannedConfiguration.sets.map((set: any, setIdx: number) => (
                          <div key={setIdx} className="flex items-center gap-2 text-gray-600">
                            <span>Set {set.setNumber}:</span>
                            <span>{set.targetReps} reps @ {set.targetWeight || 0} lbs</span>
                            {exercise.actualData.type === 'strength' && exercise.actualData.completedSets?.[setIdx]?.completed && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {comparison && comparison.deviations.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{comparison.deviations.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Cardio Exercise Details */}
                {exercise.exerciseType === 'cardio' && 
                 exercise.actualData.type.startsWith('cardio') &&
                 exercise.plannedConfiguration.exerciseType === 'cardio' &&
                 'cardioSubType' in exercise.plannedConfiguration && (
                  <div className="ml-8 space-y-2">
                    <div className="text-sm">
                      {exercise.actualData.type === 'cardio_steady_state' && 
                       exercise.plannedConfiguration.cardioSubType === 'steady_state' && (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Target Duration:</span>
                            <span className="font-medium">
                              {Math.floor((exercise.plannedConfiguration.durationSeconds || 0) / 60)} min
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Actual Duration:</span>
                            <span className="font-medium">
                              {Math.floor((exercise.actualData.actualDurationSeconds || 0) / 60)} min
                            </span>
                          </div>
                        </>
                      )}
                      
                      {exercise.actualData.type === 'cardio_intervals' && 
                       exercise.plannedConfiguration.cardioSubType === 'intervals' && (
                        <>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Target Intervals:</span>
                            <span className="font-medium">{exercise.plannedConfiguration.intervals?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-600">Completed Rounds:</span>
                            <span className="font-medium">{exercise.actualData.completedRounds || 0}</span>
                          </div>
                        </>
                      )}
                    </div>
                    
                    {comparison && comparison.deviations.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{comparison.deviations.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Exercise Notes */}
                {showClientNotes && exercise.notes && (
                  <div className="ml-8 mt-2 text-sm bg-white p-2 rounded border">
                    <span className="font-medium text-gray-600">Note:</span> {exercise.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold mb-4">Performance Summary</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 text-center">
            <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">
              {execution.exercises.filter(e => e.completionStatus === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              {execution.exercises.filter(e => e.completionStatus === 'partial').length}
            </p>
            <p className="text-sm text-gray-600">Partial</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <X className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-600">
              {execution.exercises.filter(e => e.completionStatus === 'not_started').length}
            </p>
            <p className="text-sm text-gray-600">Skipped</p>
          </div>
        </div>
      </div>
    </div>
  );
}
