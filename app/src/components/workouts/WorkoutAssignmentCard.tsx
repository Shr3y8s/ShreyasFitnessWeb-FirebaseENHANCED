'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp, CalendarDays, Play } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { 
  WorkoutAssignment, 
  WorkoutExecution, 
  WorkoutExecutionExercise,
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
import { saveWorkoutExecution } from '@/lib/workout-api';

interface WorkoutAssignmentCardProps {
  assignment: WorkoutAssignment;
  isCompleted?: boolean;
}

type DisplayMode = 'display' | 'track' | 'review';

export function WorkoutAssignmentCard({ assignment, isCompleted = false }: WorkoutAssignmentCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DisplayMode>('display');
  const [workoutExecution, setWorkoutExecution] = useState<WorkoutExecution | null>(null);
  const [completedExercises, setCompletedExercises] = useState<{ [key: number]: boolean }>({});
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing workout execution if it exists
  useEffect(() => {
    const loadExistingExecution = async () => {
      // Load execution for in_progress OR completed workouts
      if (assignment.status !== 'in_progress' && !isCompleted) return;

      try {
        // Query for existing execution for this assignment
        // IMPORTANT: Must include clientId filter to satisfy security rules
        const executionsQuery = query(
          collection(db, 'workoutExecutions'),
          where('workoutAssignmentId', '==', assignment.id),
          where('clientId', '==', assignment.clientId),
          limit(1)
        );

        const executionsSnapshot = await getDocs(executionsQuery);

        if (!executionsSnapshot.empty) {
          const executionDoc = executionsSnapshot.docs[0];
          const executionData = executionDoc.data();

          // Convert Firestore Timestamps to Dates
          const loadedExecution: WorkoutExecution = {
            ...executionData,
            id: executionDoc.id,
            completedAt: executionData.completedAt?.toDate ? executionData.completedAt.toDate() : executionData.completedAt ? new Date(executionData.completedAt) : undefined,
            createdAt: executionData.createdAt?.toDate ? executionData.createdAt.toDate() : new Date(executionData.createdAt),
            updatedAt: executionData.updatedAt?.toDate ? executionData.updatedAt.toDate() : new Date(executionData.updatedAt),
          } as WorkoutExecution;

          // Load the execution into state
          setWorkoutExecution(loadedExecution);
          console.log('Loaded workout execution:', loadedExecution.id);
        }
      } catch (error) {
        console.error('Error loading execution:', error);
      }
    };

    loadExistingExecution();
  }, [assignment.id, assignment.status, isCompleted]);

  // Reset mode to display when card is closed
  useEffect(() => {
    if (!isOpen && mode !== 'display') {
      setMode('display');
    }
  }, [isOpen, mode]);

  // Initialize workout execution when starting tracking
  const handleStartTracking = () => {
    // If we already have a loaded execution (from useEffect), just switch to track mode
    if (workoutExecution) {
      setMode('track');
      setIsOpen(true);
      return;
    }

    // Create initial WorkoutExecution with empty actual data
    const initialExecution: WorkoutExecution = {
      id: `temp-${Date.now()}`, // Temporary ID until saved
      workoutAssignmentId: assignment.id,
      clientId: assignment.clientId,
      trainerId: assignment.trainerId,
      durationMinutes: 0,
      completionStatus: 'in_progress',
      completionPercentage: 0,
      exercises: assignment.exercises.map((exercise, index) => {
        // Initialize empty actual data based on exercise type
        let actualData: ExerciseActualData;
        
        // Determine actual data structure based on configuration
        const config = exercise.configuration;
        
        if (config.exerciseType === 'strength') {
          actualData = {
            type: 'strength',
            completedSets: config.sets.map(set => ({
              setNumber: set.setNumber,
              completed: false,
            })),
          };
        } else if (config.exerciseType === 'cardio' && 'cardioSubType' in config) {
          if (config.cardioSubType === 'steady_state') {
            actualData = {
              type: 'cardio_steady_state',
              actualDurationSeconds: 0,
            };
          } else if (config.cardioSubType === 'intervals') {
            actualData = {
              type: 'cardio_intervals',
              completedRounds: 0,
            };
          } else if (config.cardioSubType === 'activity_based') {
            actualData = {
              type: 'cardio_activity',
              actualDurationSeconds: 0,
            };
          } else {
            // steps_based
            actualData = {
              type: 'cardio_steps',
              actualSteps: 0,
            };
          }
        } else if (config.exerciseType === 'core' && 'coreSubType' in config) {
          if (config.coreSubType === 'rep_based') {
            actualData = {
              type: 'core_rep_based',
              completedSets: config.sets.map(set => ({
                setNumber: set.setNumber,
                completed: false,
              })),
            };
          } else {
            // duration_based
            if (config.rounds) {
              actualData = {
                type: 'core_duration',
                completedRounds: config.rounds.map(round => ({
                  roundNumber: round.roundNumber,
                  completed: false,
                })),
              };
            } else {
              actualData = {
                type: 'core_duration',
                actualDurationSeconds: 0,
              };
            }
          }
        } else if (config.exerciseType === 'flexibility') {
          actualData = {
            type: 'flexibility',
            completedStretches: [],
          };
        } else if (config.exerciseType === 'balance') {
          actualData = {
            type: 'balance',
            completedRounds: config.rounds.map(round => ({
              roundNumber: round.roundNumber,
              completed: false,
            })),
          };
        } else if (config.exerciseType === 'mobility') {
          actualData = {
            type: 'mobility',
            completedAreas: [],
          };
        } else if (config.exerciseType === 'plyometric') {
          actualData = {
            type: 'plyometric',
            completedSets: config.sets.map(set => ({
              setNumber: set.setNumber,
              completed: false,
            })),
          };
        } else {
          // yoga_pilates
          actualData = {
            type: 'yoga_pilates',
            actualDurationSeconds: 0,
          };
        }

        return {
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          exerciseType: exercise.exerciseType,
          completionStatus: 'not_started',
          completionPercentage: 0,
          plannedConfiguration: exercise.configuration,
          actualData,
        };
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setWorkoutExecution(initialExecution);
    setMode('track');
    setIsOpen(true);
  };

  // Handle exercise actual data updates
  const handleExerciseUpdate = (exerciseIndex: number, actualData: ExerciseActualData) => {
    if (!workoutExecution) return;

    const updatedExercises = [...workoutExecution.exercises];
    const exercise = updatedExercises[exerciseIndex];
    
    // Update actual data
    exercise.actualData = actualData;
    
    // Recalculate completion percentage
    exercise.completionPercentage = calculateExerciseCompletionPercentage(
      exercise.plannedConfiguration,
      actualData
    );
    
    // Update completion status
    exercise.completionStatus = determineCompletionStatus(exercise.completionPercentage);

    // Calculate overall workout completion
    const overallPercentage = calculateWorkoutCompletionPercentage(updatedExercises);
    const overallStatus = determineCompletionStatus(overallPercentage);

    setWorkoutExecution({
      ...workoutExecution,
      exercises: updatedExercises,
      completionPercentage: overallPercentage,
      completionStatus: overallStatus === 'not_started' ? 'in_progress' : overallStatus === 'completed' ? 'completed' : 'in_progress',
      updatedAt: new Date(),
    });
  };

  // Count completed exercises for progress display
  const completedCount = workoutExecution?.exercises.filter(ex => ex.completionStatus === 'completed').length || 0;

  // Handle saving progress
  const handleSaveProgress = async () => {
    if (!workoutExecution) return;
    
    setIsSaving(true);
    try {
      const updatedExecution = {
        ...workoutExecution,
        updatedAt: new Date(),
      };
      
      // Call cloud function to save
      const result = await saveWorkoutExecution(assignment.id, updatedExecution);
      
      // Update local state with saved execution (includes generated ID)
      setWorkoutExecution(result.execution);
      
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
  const handleComplete = async (difficulty: 'easy' | 'moderate' | 'hard' | 'very_hard', completionDate: Date, durationMinutes: number, notes?: string) => {
    if (!workoutExecution) return;

    setIsSaving(true);
    try {
      // Update execution with final data
      const completedExecution: WorkoutExecution = {
        ...workoutExecution,
        completedAt: completionDate,
        durationMinutes,
        overallDifficulty: difficulty,
        overallNotes: notes,
        completionStatus: 'completed',
      };

      // Save to Firestore via cloud function
      const result = await saveWorkoutExecution(assignment.id, completedExecution);
      
      // Update local state
      setWorkoutExecution(result.execution);
      
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

  // Format the scheduled date - handle both Firestore Timestamp and ISO string
  const scheduledDate = assignment.scheduledDate as any;
  const startDate = scheduledDate?.toDate 
    ? scheduledDate.toDate()              // Firestore Timestamp
    : new Date(assignment.scheduledDate); // ISO 8601 string

  // Parse due date if exists
  const dueDateRaw = assignment.dueDate as any;
  const endDate = dueDateRaw 
    ? (dueDateRaw?.toDate ? dueDateRaw.toDate() : (assignment.dueDate ? new Date(assignment.dueDate) : null))
    : null;

  // Format date compactly: "Mon Dec 16"
  const formatCompact = (date: Date) => 
    date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });

  // Build display string
  let dateDisplay: string;
  if (isCompleted && workoutExecution?.completedAt) {
    // For completed workouts, show completion date
    dateDisplay = `Completed ${formatCompact(workoutExecution.completedAt)}`;
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
                {assignment.name}
              </h3>
            </div>
            {assignment.notes && (
              <p className="text-sm text-muted-foreground font-medium mt-1">{assignment.notes}</p>
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
                {assignment.status === 'in_progress' ? 'Continue Tracking' : 'Track Workout'}
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
                exercises={assignment.exercises}
                mode="input"
                completedExercises={completedExercises}
                onExerciseCompletedChange={setCompletedExercises}
                readOnly={false}
                showNotes={true}
              />
            )}

            {mode === 'display' && isCompleted && workoutExecution && (
              <WorkoutExecutionDetailView 
                execution={workoutExecution} 
                showClientNotes={true}
              />
            )}

            {mode === 'track' && workoutExecution && (
              <div className="space-y-6">
                {/* Overall Progress */}
                <WorkoutProgress
                  completionPercentage={workoutExecution.completionPercentage}
                  completionStatus={
                    workoutExecution.completionStatus === 'completed' ? 'completed' :
                    workoutExecution.completionPercentage === 0 ? 'not_started' : 'partial'
                  }
                  totalExercises={workoutExecution.exercises.length}
                  completedExercises={completedCount}
                />

                {/* Exercise Trackers */}
                <div className="space-y-4">
                  {workoutExecution.exercises.map((exercise, index) => (
                    <div key={exercise.exerciseId} className="border rounded-lg p-4 bg-card">
                      <ExerciseTracker
                        exerciseName={exercise.exerciseName}
                        exerciseType={exercise.exerciseType}
                        plannedConfiguration={exercise.plannedConfiguration}
                        actualData={exercise.actualData}
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
                  {workoutExecution.completionPercentage >= 80 && (
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
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Mark Complete Dialog */}
      {workoutExecution && (
        <MarkCompleteDialog
          open={showCompleteDialog}
          onOpenChange={setShowCompleteDialog}
          onComplete={handleComplete}
          workoutName={assignment.name}
          completionPercentage={workoutExecution.completionPercentage}
        />
      )}
    </Card>
  );
}
