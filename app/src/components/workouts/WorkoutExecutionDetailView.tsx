'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Clock,
  MessageSquare,
} from 'lucide-react';
import { Workout, ExerciseActualData } from '@/types/workout';
import { cn } from '@/lib/utils';
import { calculateWorkoutCompletionPercentage } from '@/lib/workout-utils';

interface WorkoutExecutionDetailViewProps {
  workout: Workout;
  showClientNotes?: boolean;
}

export function WorkoutExecutionDetailView({ 
  workout, 
  showClientNotes = true 
}: WorkoutExecutionDetailViewProps) {
  
  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
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

  const difficultyDisplay = workout.overallDifficulty 
    ? difficultyConfig[workout.overallDifficulty] 
    : null;

  // Calculate overall completion percentage
  const overallCompletionPercentage = calculateWorkoutCompletionPercentage(workout.exercises);

  // Compare planned vs actual for strength exercises
  const compareStrength = (planned: any, actual?: ExerciseActualData) => {
    if (!actual || actual.type !== 'strength') return null;
    
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
  const compareCardio = (planned: any, actual?: ExerciseActualData) => {
    if (!actual || !actual.type.startsWith('cardio')) return null;
    
    let deviations = [];
    let status = 'complete';
    
    if (actual.type === 'cardio_steady_state') {
      const plannedDuration = planned.durationSeconds || 0;
      const actualDuration = actual.actualDurationSeconds || 0;
      const percentComplete = plannedDuration > 0 ? (actualDuration / plannedDuration) * 100 : 0;
      
      if (actualDuration < plannedDuration) {
        deviations.push(`${Math.round(percentComplete)}% of target duration`);
        status = actualDuration > 0 ? 'partial' : 'not_started';
      }
    } else if (actual.type === 'cardio_intervals') {
      const plannedRounds = planned.totalRounds || 0;
      const actualRounds = actual.completedRounds || 0;
      
      if (actualRounds < plannedRounds) {
        deviations.push(`${actualRounds}/${plannedRounds} rounds`);
        status = actualRounds > 0 ? 'partial' : 'not_started';
      }
    }
    
    return { deviations, status };
  };

  // Determine completion status for an exercise
  const getExerciseCompletionStatus = (completionPercentage?: number): 'completed' | 'partial' | 'not_started' => {
    if (!completionPercentage) return 'not_started';
    if (completionPercentage >= 80) return 'completed';
    if (completionPercentage > 0) return 'partial';
    return 'not_started';
  };

  return (
    <div className="space-y-6">
      {/* Execution Summary */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Workout Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          {workout.startedAt && (
            <div>
              <span className="text-sm text-gray-600">Started At</span>
              <p className="font-medium">
                {workout.startedAt instanceof Date 
                  ? workout.startedAt.toLocaleString() 
                  : new Date(workout.startedAt).toLocaleString()}
              </p>
            </div>
          )}
          
          {workout.completedAt && (
            <div>
              <span className="text-sm text-gray-600">Completed At</span>
              <p className="font-medium">
                {workout.completedAt instanceof Date 
                  ? workout.completedAt.toLocaleString() 
                  : new Date(workout.completedAt).toLocaleString()}
              </p>
            </div>
          )}
          
          <div>
            <span className="text-sm text-gray-600">Duration</span>
            <p className="font-medium">{formatDuration(workout.durationMinutes)}</p>
          </div>
          
          <div>
            <span className="text-sm text-gray-600">Completion</span>
            <p className="font-medium">{overallCompletionPercentage}%</p>
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
              workout.status === 'completed' ? 'bg-green-50 text-green-600' :
              workout.status === 'started' ? 'bg-blue-50 text-blue-600' :
              workout.status === 'skipped' ? 'bg-gray-50 text-gray-600' :
              'bg-yellow-50 text-yellow-600'
            )}>
              {workout.status === 'started' ? 'In Progress' :
               workout.status === 'completed' ? 'Completed' :
               workout.status === 'skipped' ? 'Skipped' : 'Scheduled'}
            </p>
          </div>
        </div>
        
        {showClientNotes && workout.overallNotes && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                <span className="text-sm font-medium text-gray-600">Client Notes:</span>
                <p className="text-sm mt-1">{workout.overallNotes}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Exercise-by-Exercise Breakdown */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="font-semibold mb-4">Exercise Performance</h3>
        
        <div className="space-y-4">
          {workout.exercises.map((exercise, index) => {
            const completionStatus = getExerciseCompletionStatus(exercise.completionPercentage);
            const comparison = exercise.exerciseType === 'strength' 
              ? compareStrength(exercise.prescribed, exercise.actual)
              : exercise.exerciseType === 'cardio'
              ? compareCardio(exercise.prescribed, exercise.actual)
              : null;
            
            const statusIcon = 
              completionStatus === 'completed' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
              completionStatus === 'partial' ? <AlertCircle className="h-5 w-5 text-orange-600" /> :
              <X className="h-5 w-5 text-gray-400" />;
            
            const statusBg = 
              completionStatus === 'completed' ? 'bg-green-50 border-green-200' :
              completionStatus === 'partial' ? 'bg-orange-50 border-orange-200' :
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
                    {exercise.completionPercentage || 0}%
                  </span>
                </div>
                
                {/* Strength Exercise Details */}
                {exercise.exerciseType === 'strength' && 
                 exercise.prescribed.exerciseType === 'strength' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Trainer Prescribed */}
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          {exercise.prescribed.sets.map((set: any, setIdx: number) => (
                            <div key={setIdx} className="text-gray-700">
                              Set {set.setNumber}: {set.targetReps} reps @ {set.weight || 0} {set.weightUnit || 'lbs'}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Client Actuals */}
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'strength' ? (
                            exercise.actual.completedSets.map((set: any, setIdx: number) => (
                              <div key={setIdx} className="flex items-center gap-2 text-gray-700">
                                {set.completed ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                ) : (
                                  <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                )}
                                <span>
                                  Set {set.setNumber}: {set.actualReps || '-'} reps @ {set.actualWeight || '-'} {set.actualWeightUnit || 'lbs'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {comparison && comparison.deviations.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded mt-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{comparison.deviations.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Cardio Exercise Details */}
                {exercise.exerciseType === 'cardio' && 
                 exercise.prescribed.exerciseType === 'cardio' &&
                 'cardioSubType' in exercise.prescribed && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Trainer Prescribed */}
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          {exercise.prescribed.cardioSubType === 'steady_state' && (
                            <>
                              <div className="text-gray-700">Duration: {Math.floor((exercise.prescribed.durationSeconds || 0) / 60)} min</div>
                              {exercise.prescribed.targetPace && <div className="text-gray-700">Pace: {exercise.prescribed.targetPace}</div>}
                              {exercise.prescribed.targetHeartRate && <div className="text-gray-700">Heart Rate: {exercise.prescribed.targetHeartRate}</div>}
                            </>
                          )}
                          {exercise.prescribed.cardioSubType === 'intervals' && (
                            <>
                              <div className="text-gray-700">Rounds: {exercise.prescribed.totalRounds || 0}</div>
                              <div className="text-gray-700">Intervals: {exercise.prescribed.intervals?.length || 0} per round</div>
                            </>
                          )}
                          {exercise.prescribed.cardioSubType === 'activity_based' && (
                            <>
                              <div className="text-gray-700">Activity: {exercise.prescribed.activity}</div>
                              <div className="text-gray-700">Duration: {Math.floor((exercise.prescribed.durationSeconds || 0) / 60)} min</div>
                              <div className="text-gray-700">Intensity: {exercise.prescribed.intensity}</div>
                            </>
                          )}
                          {exercise.prescribed.cardioSubType === 'steps_based' && (
                            <>
                              <div className="text-gray-700">Target Steps: {exercise.prescribed.targetSteps}</div>
                              <div className="text-gray-700">Pace: {exercise.prescribed.pace}</div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Client Actuals */}
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type.startsWith('cardio') ? (
                            <>
                              {exercise.actual.type === 'cardio_steady_state' && (
                                <>
                                  <div className="text-gray-700">Duration: {Math.floor((exercise.actual.actualDurationSeconds || 0) / 60)} min</div>
                                  {exercise.actual.actualPace && <div className="text-gray-700">Pace: {exercise.actual.actualPace}</div>}
                                  {exercise.actual.actualHeartRate && <div className="text-gray-700">Heart Rate: {exercise.actual.actualHeartRate}</div>}
                                </>
                              )}
                              {exercise.actual.type === 'cardio_intervals' && (
                                <>
                                  <div className="text-gray-700">Completed Rounds: {exercise.actual.completedRounds || 0}</div>
                                  {exercise.actual.completedIntervals && (
                                    <div className="text-gray-700">Intervals Completed: {exercise.actual.completedIntervals.length}</div>
                                  )}
                                </>
                              )}
                              {exercise.actual.type === 'cardio_activity' && (
                                <div className="text-gray-700">Duration: {Math.floor((exercise.actual.actualDurationSeconds || 0) / 60)} min</div>
                              )}
                              {exercise.actual.type === 'cardio_steps' && (
                                <>
                                  <div className="text-gray-700">Steps: {exercise.actual.actualSteps || 0}</div>
                                  {exercise.actual.actualPace && <div className="text-gray-700">Pace: {exercise.actual.actualPace}</div>}
                                </>
                              )}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {comparison && comparison.deviations.length > 0 && (
                      <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-100 p-2 rounded mt-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{comparison.deviations.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Core Rep-Based Exercise Details */}
                {exercise.exerciseType === 'core' && 
                 exercise.prescribed.exerciseType === 'core' &&
                 'coreSubType' in exercise.prescribed &&
                 exercise.prescribed.coreSubType === 'rep_based' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          {exercise.prescribed.sets.map((set: any, setIdx: number) => (
                            <div key={setIdx} className="text-gray-700">
                              Set {set.setNumber}: {set.targetReps} reps
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'core_rep_based' ? (
                            exercise.actual.completedSets.map((set: any, setIdx: number) => (
                              <div key={setIdx} className="flex items-center gap-2 text-gray-700">
                                {set.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <X className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                <span>Set {set.setNumber}: {set.actualReps || '-'} reps</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Core Duration-Based Exercise Details */}
                {exercise.exerciseType === 'core' && 
                 exercise.prescribed.exerciseType === 'core' &&
                 'coreSubType' in exercise.prescribed &&
                 exercise.prescribed.coreSubType === 'duration_based' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          {exercise.prescribed.durationSeconds && (
                            <div className="text-gray-700">Duration: {exercise.prescribed.durationSeconds} sec</div>
                          )}
                          {exercise.prescribed.rounds && exercise.prescribed.rounds.map((round: any, roundIdx: number) => (
                            <div key={roundIdx} className="text-gray-700">
                              Round {round.roundNumber}: {round.durationSeconds} sec
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'core_duration' ? (
                            <>
                              {exercise.actual.actualDurationSeconds !== undefined && (
                                <div className="text-gray-700">Duration: {exercise.actual.actualDurationSeconds} sec</div>
                              )}
                              {exercise.actual.completedRounds && exercise.actual.completedRounds.map((round: any, roundIdx: number) => (
                                <div key={roundIdx} className="flex items-center gap-2 text-gray-700">
                                  {round.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <X className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                  <span>Round {round.roundNumber}: {round.actualDurationSeconds || '-'} sec</span>
                                </div>
                              ))}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Flexibility Exercise Details */}
                {exercise.exerciseType === 'flexibility' && 
                 exercise.prescribed.exerciseType === 'flexibility' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          <div className="text-gray-700">Type: {exercise.prescribed.flexibilitySubType}</div>
                          <div className="text-gray-700">Total Duration: {exercise.prescribed.totalDurationSeconds} sec</div>
                          <div className="text-gray-700">Stretches: {exercise.prescribed.stretches?.length || 0}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'flexibility' ? (
                            <div className="text-gray-700">Completed: {exercise.actual.completedStretches?.length || 0} stretches</div>
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Balance Exercise Details */}
                {exercise.exerciseType === 'balance' && 
                 exercise.prescribed.exerciseType === 'balance' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          <div className="text-gray-700">Type: {exercise.prescribed.balanceSubType}</div>
                          <div className="text-gray-700">Rounds: {exercise.prescribed.rounds?.length || 0}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'balance' ? (
                            exercise.actual.completedRounds.map((round: any, roundIdx: number) => (
                              <div key={roundIdx} className="flex items-center gap-2 text-gray-700">
                                {round.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <X className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                <span>Round {round.roundNumber}: {round.actualDurationSeconds || round.actualReps || 'completed'}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Mobility Exercise Details */}
                {exercise.exerciseType === 'mobility' && 
                 exercise.prescribed.exerciseType === 'mobility' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          <div className="text-gray-700">Type: {exercise.prescribed.mobilitySubType}</div>
                          <div className="text-gray-700">Total Duration: {exercise.prescribed.totalDurationSeconds} sec</div>
                          <div className="text-gray-700">Areas: {exercise.prescribed.targetAreas?.join(', ')}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'mobility' ? (
                            <div className="text-gray-700">Completed: {exercise.actual.completedAreas?.length || 0} areas</div>
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Plyometric Exercise Details */}
                {exercise.exerciseType === 'plyometric' && 
                 exercise.prescribed.exerciseType === 'plyometric' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          {exercise.prescribed.sets.map((set: any, setIdx: number) => (
                            <div key={setIdx} className="text-gray-700">
                              Set {set.setNumber}: {set.targetReps} reps
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'plyometric' ? (
                            exercise.actual.completedSets.map((set: any, setIdx: number) => (
                              <div key={setIdx} className="flex items-center gap-2 text-gray-700">
                                {set.completed ? <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" /> : <X className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                                <span>Set {set.setNumber}: {set.actualReps || '-'} reps</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Yoga/Pilates Exercise Details */}
                {exercise.exerciseType === 'yoga_pilates' && 
                 exercise.prescribed.exerciseType === 'yoga_pilates' && (
                  <div className="ml-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-blue-700">📋 Trainer Prescribed</span>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          <div className="text-gray-700">Type: {exercise.prescribed.yogaSubType}</div>
                          <div className="text-gray-700">Duration: {Math.floor((exercise.prescribed.durationSeconds || 0) / 60)} min</div>
                          <div className="text-gray-700">Intensity: {exercise.prescribed.intensity}</div>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-green-700">💪 Client Actuals</span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                          {exercise.actual?.type === 'yoga_pilates' ? (
                            <>
                              <div className="text-gray-700">Duration: {Math.floor((exercise.actual.actualDurationSeconds || 0) / 60)} min</div>
                              {exercise.actual.actualIntensity && (
                                <div className="text-gray-700">Intensity: {exercise.actual.actualIntensity}</div>
                              )}
                            </>
                          ) : (
                            <div className="text-gray-500 italic">Not yet tracked</div>
                          )}
                        </div>
                      </div>
                    </div>
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
              {workout.exercises.filter(e => getExerciseCompletionStatus(e.completionPercentage) === 'completed').length}
            </p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <AlertCircle className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-orange-600">
              {workout.exercises.filter(e => getExerciseCompletionStatus(e.completionPercentage) === 'partial').length}
            </p>
            <p className="text-sm text-gray-600">Partial</p>
          </div>
          
          <div className="bg-white rounded-lg p-4 text-center">
            <X className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-600">
              {workout.exercises.filter(e => getExerciseCompletionStatus(e.completionPercentage) === 'not_started').length}
            </p>
            <p className="text-sm text-gray-600">Skipped</p>
          </div>
        </div>
      </div>
    </div>
  );
}
