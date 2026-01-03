'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp, CalendarDays, Play } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { 
  Workout, 
  WorkoutExercise,
  ExerciseActualData,
} from '@/types/workout';
import { 
  calculateExerciseCompletionPercentage,
  calculateWorkoutCompletionPercentage,
  determineCompletionStatus,
} from '@/lib/workout-utils';
import { ExerciseConfiguration } from './ExerciseConfiguration';
import { ExerciseTracker } from './ExerciseTracker';
import { WorkoutProgress } from './WorkoutProgress';
import { MarkCompleteDialog } from './MarkCompleteDialog';
import { WorkoutExecutionDetailView } from './WorkoutExecutionDetailView';
import { saveWorkout, completeWorkout } from '@/lib/workout-api';

interface WorkoutAssignmentCardProps {
  workout: Workout;
  isCompleted?: boolean;
}

type DisplayMode = 'display' | 'track' | 'review';

export function WorkoutAssignmentCard({ workout, isCompleted = false }: WorkoutAssignmentCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DisplayMode>('display');
  const [workoutState, setWorkoutState] = useState<Workout>(workout);
  const [completedExercises, setCompletedExercises] = useState<{ [key: number]: boolean }>({});
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setWorkoutState(workout);
  }, [workout]);

  // Reset mode to display when card is closed
  useEffect(() => {
    if (!isOpen && mode !== 'display') {
      setMode('display');
    }
  }, [isOpen, mode]);

  // Helper: Parse targetReps (string | number) to numeric actualReps
  const parseTargetRepsToNumber = (targetReps: string | number): number => {
    if (typeof targetReps === 'number') return targetReps;
    
    // Handle ranges like "8-12"
    if (targetReps.includes('-')) {
      const [min, max] = targetReps.split('-').map(n => parseInt(n.trim()));
      return Math.round((min + max) / 2); // Return midpoint
    }
    
    // Handle AMRAP or other strings
    if (targetReps.toUpperCase() === 'AMRAP') return 0; // Client will enter actual
    
    // Try to parse as number
    const parsed = parseInt(targetReps);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Initialize workout tracking when starting
  const handleStartTracking = () => {
    // Initialize actual data for each exercise from prescribed config
    const updatedExercises = workoutState.exercises.map(exercise => {
      if (!exercise.actual) {
        const prescribed = exercise.prescribed as any;
        let actualData: any = {};
        
        // Map prescribed exerciseType + subType to actual data type
        if (prescribed.exerciseType === 'strength') {
          actualData = {
            type: 'strength',
            completedSets: prescribed.sets.map((set: any) => ({
              setNumber: set.setNumber,
              completed: false,
              actualReps: parseTargetRepsToNumber(set.targetReps),
              actualWeight: set.weight,
              actualWeightUnit: set.weightUnit,
            }))
          };
        } else if (prescribed.exerciseType === 'cardio') {
          if (prescribed.cardioSubType === 'steady_state') {
            actualData = {
              type: 'cardio_steady_state',
              completed: false, // Explicit completion flag
              actualDurationSeconds: prescribed.durationSeconds,
              actualDistance: 0,
              actualPace: prescribed.targetPace || '',
              actualHeartRate: prescribed.targetHeartRate || '',
            };
          } else if (prescribed.cardioSubType === 'intervals') {
            actualData = {
              type: 'cardio_intervals',
              completedRounds: 0,
            };
          } else if (prescribed.cardioSubType === 'activity_based') {
            actualData = {
              type: 'cardio_activity',
              completed: false, // Explicit completion flag
              actualDurationSeconds: prescribed.durationSeconds,
            };
          } else if (prescribed.cardioSubType === 'steps_based') {
            actualData = {
              type: 'cardio_steps',
              actualSteps: prescribed.targetSteps,
            };
          }
        } else if (prescribed.exerciseType === 'core') {
          if (prescribed.coreSubType === 'rep_based') {
            actualData = {
              type: 'core_rep_based',
              completedSets: prescribed.sets.map((set: any) => ({
                setNumber: set.setNumber,
                completed: false,
                actualReps: set.targetReps,
              }))
            };
          } else if (prescribed.coreSubType === 'duration_based') {
            if (prescribed.rounds) {
              actualData = {
                type: 'core_duration',
                completedRounds: prescribed.rounds.map((round: any) => ({
                  roundNumber: round.roundNumber,
                  completed: false,
                  actualDurationSeconds: round.durationSeconds, // Pre-fill with prescribed
                }))
              };
            } else {
              actualData = {
                type: 'core_duration',
                completed: false, // Explicit completion flag for simple format
                actualDurationSeconds: prescribed.durationSeconds,
              };
            }
          }
        } else if (prescribed.exerciseType === 'flexibility') {
          actualData = {
            type: 'flexibility',
            completed: false,
            completedStretches: [],
          };
        } else if (prescribed.exerciseType === 'balance') {
          actualData = {
            type: 'balance',
            completedRounds: prescribed.rounds.map((round: any) => ({
              roundNumber: round.roundNumber,
              completed: false,
            }))
          };
        } else if (prescribed.exerciseType === 'mobility') {
          actualData = {
            type: 'mobility',
            completed: false,
            completedAreas: [],
          };
        } else if (prescribed.exerciseType === 'plyometric') {
          actualData = {
            type: 'plyometric',
            completedSets: prescribed.sets.map((set: any) => ({
              setNumber: set.setNumber,
              completed: false,
              actualReps: set.targetReps,
            }))
          };
        } else if (prescribed.exerciseType === 'yoga_pilates') {
          actualData = {
            type: 'yoga_pilates',
            completed: false, // Explicit completion flag
            actualDurationSeconds: prescribed.durationSeconds,
          };
        }
        
        return {
          ...exercise,
          actual: actualData as ExerciseActualData
        };
      }
      return exercise;
    });
    
    setWorkoutState({
      ...workoutState,
      exercises: updatedExercises
    });
    
    setMode('track');
    setIsOpen(true);
  };

  // Handle exercise actual data updates
  const handleExerciseUpdate = (exerciseIndex: number, actualData: ExerciseActualData) => {
    const updatedExercises = [...workoutState.exercises];
    const exercise = updatedExercises[exerciseIndex];
    
    // Update actual data
    exercise.actual = actualData;
    
    // Recalculate completion percentage for this exercise
    exercise.completionPercentage = calculateExerciseCompletionPercentage(
      exercise.prescribed,
      actualData
    );

    // Update workout state
    setWorkoutState({
      ...workoutState,
      exercises: updatedExercises,
      updatedAt: new Date(),
    });
  };

  // Count completed exercises for progress display
  const completedCount = workoutState.exercises.filter(ex => 
    ex.completionPercentage && ex.completionPercentage >= 80
  ).length;

  // Calculate overall completion percentage
  const overallCompletionPercentage = calculateWorkoutCompletionPercentage(workoutState.exercises);

  // Handle saving progress
  const handleSaveProgress = async () => {
    setIsSaving(true);
    try {
      // Update workout status to started if not already
      const updatedStatus = workoutState.status === 'scheduled' ? 'started' as const : workoutState.status;
      
      // Call cloud function to save
      await saveWorkout({
        workoutId: workoutState.id,
        exercises: workoutState.exercises,
        durationMinutes: workoutState.durationMinutes,
        overallDifficulty: workoutState.overallDifficulty,
        overallNotes: workoutState.overallNotes,
      });
      
      // Update local state
      setWorkoutState({
        ...workoutState,
        status: updatedStatus,
        updatedAt: new Date(),
      });
      
      // Show success toast
      toast({
        title: "✅ Progress Saved",
        description: "Your workout progress has been saved successfully.",
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle marking workout complete
  const handleComplete = async (
    difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard', 
    completionDate: Date, 
    durationMinutes: number, 
    notes?: string
  ) => {
    setIsSaving(true);
    try {
      // Complete workout via cloud function
      await completeWorkout({
        workoutId: workoutState.id,
        exercises: workoutState.exercises,
        durationMinutes,
        completedAt: completionDate, // Pass the completion timestamp
        overallDifficulty: difficulty,
        overallNotes: notes,
      });
      
      // Update local state
      setWorkoutState({
        ...workoutState,
        status: 'completed',
        completedAt: completionDate,
        updatedAt: new Date(),
      });
      
      // Close dialog and switch to review mode
      setShowCompleteDialog(false);
      setMode('review');
      
      // Show success toast
      toast({
        title: "🎉 Workout Complete!",
        description: `Great job! Duration: ${durationMinutes} minutes`,
      });
    } catch (error) {
      console.error('Failed to complete workout:', error);
      toast({
        title: "Error",
        description: "Failed to save completion. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format dates - already converted to Date objects from Timestamps
  const startDate = workout.scheduledDate || new Date();
  const endDate = workout.dueDate || null;

  // Format date compactly: "Mon Dec 16"
  const formatCompact = (date: Date) => 
    date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });

  // Build display string
  let dateDisplay: string;
  if (isCompleted && workoutState.completedAt) {
    // For completed workouts, show completion date
    const completedDate = workoutState.completedAt instanceof Date 
      ? workoutState.completedAt 
      : (workoutState.completedAt as any)?.toDate?.() || new Date(workoutState.completedAt);
    dateDisplay = `Completed ${formatCompact(completedDate)}`;
  } else if (endDate && startDate.toDateString() !== endDate.toDateString()) {
    // For upcoming workouts with different scheduled and due dates
    dateDisplay = `${formatCompact(startDate)} → ${formatCompact(endDate)}`;
  } else {
    // For upcoming workouts with same or no due date
    dateDisplay = formatCompact(startDate);
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300 overflow-hidden',
        !isOpen && 'h-[120px]',
        isCompleted ? 'bg-primary/5 border-primary/20' : 'hover:shadow-glow hover:-translate-y-1 border-primary'
      )}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex-1 h-[72px] flex flex-col justify-center pr-4">
            <div className="flex items-center gap-3">
              {isCompleted && <CheckCircle className="h-5 w-5 text-primary" />}
              <h3 className={cn(
                'text-xl font-bold leading-none tracking-tight',
                isCompleted && 'text-muted-foreground'
              )}>
                {workout.name}
              </h3>
            </div>
            {workout.notes && (
              <p className="text-sm text-muted-foreground font-medium mt-1">{workout.notes}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-primary">
              <CalendarDays className="h-4 w-4" />
              <span>{dateDisplay}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCompleted && !isOpen && mode === 'display' && (
              <Button 
                className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary transition-all gap-2 cursor-pointer"
                onClick={handleStartTracking}
              >
                <Play className="h-4 w-4" />
                {workout.status === 'started' ? 'Continue Tracking' : 'Track Workout'}
              </Button>
            )}
            {!isCompleted && isOpen && (
              <CollapsibleTrigger asChild>
                <Button variant="default" className="transition-all gap-2 cursor-pointer">
                  Hide Details
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            )}
            {isCompleted && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 text-primary hover:bg-primary/10 hover:text-primary border-primary/20 cursor-pointer"
                >
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  <span className="sr-only">Toggle details</span>
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <div className={cn('px-6 pb-6', isCompleted && 'bg-secondary/30')}>
            {mode === 'display' && !isCompleted && (
              <ExerciseConfiguration
                exercises={workout.exercises.map(ex => ({
                  exerciseId: ex.exerciseId,
                  exerciseName: ex.exerciseName,
                  exerciseType: ex.exerciseType,
                  configuration: ex.prescribed,
                  notes: ex.notes,
                }))}
                mode="input"
                completedExercises={completedExercises}
                onExerciseCompletedChange={setCompletedExercises}
                readOnly={false}
                showNotes={true}
              />
            )}

            {mode === 'display' && isCompleted && (
              <WorkoutExecutionDetailView 
                workout={workoutState} 
                showClientNotes={true}
              />
            )}

            {mode === 'track' && (
              <div className="space-y-6">
                {/* Overall Progress */}
                <WorkoutProgress
                  completionPercentage={overallCompletionPercentage}
                  completionStatus={
                    overallCompletionPercentage === 100 ? 'completed' :
                    overallCompletionPercentage === 0 ? 'not_started' : 'partial'
                  }
                  totalExercises={workoutState.exercises.length}
                  completedExercises={completedCount}
                />

                {/* Exercise Trackers */}
                <div className="space-y-4">
                  {workoutState.exercises.map((exercise, index) => (
                    <div key={exercise.exerciseId} className="border rounded-lg p-4 bg-card">
                      <ExerciseTracker
                        exerciseName={exercise.exerciseName}
                        exerciseType={exercise.exerciseType}
                        plannedConfiguration={exercise.prescribed}
                        actualData={exercise.actual || undefined}
                        onUpdate={(actualData) => handleExerciseUpdate(index, actualData)}
                        readOnly={false}
                      />
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-4 pt-4 border-t">
                  {/* Save Progress Button - Always visible */}
                  <Button 
                    size="lg"
                    onClick={handleSaveProgress}
                    disabled={isSaving}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSaving ? 'Saving...' : 'Save Progress'}
                  </Button>

                  {/* Mark Complete Button - Only at 80%+ */}
                  {overallCompletionPercentage >= 80 && (
                    <Button 
                      size="lg"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                      onClick={() => setShowCompleteDialog(true)}
                    >
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Mark Workout Complete
                    </Button>
                  )}
                </div>
              </div>
            )}

            {mode === 'review' && (
              <WorkoutExecutionDetailView 
                workout={workoutState} 
                showClientNotes={true}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Mark Complete Dialog */}
      <MarkCompleteDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onComplete={handleComplete}
        workoutName={workout.name}
        completionPercentage={overallCompletionPercentage}
      />
    </Card>
  );
}
