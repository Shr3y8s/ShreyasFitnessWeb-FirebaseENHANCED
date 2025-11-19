"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ChevronDown, ChevronUp, CalendarDays, RotateCcw } from 'lucide-react';
import { ExerciseList } from './exercise-list';
import { WorkoutSummary } from './workout-summary';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { WorkoutCompleteDialog, type WorkoutDifficulty } from './workout-complete-dialog';

interface Set {
  id: number;
  reps: string;
  weight: string;
}

interface Exercise {
  name: string;
  target: string;
  videoUrl: string;
  instructions: string[];
  sets: Set[];
  rest: string;
}

interface Workout {
  id: string;
  day: string;
  date: string;
  title: string;
  description: string;
  isNew?: boolean;
  isUpdated?: boolean;
  updateId?: number;
  isCompleted?: boolean;
  exercises: Exercise[];
  performanceData?: Record<string, { weight?: string; reps?: string }>;
  difficulty?: WorkoutDifficulty;
  notes?: string;
}

interface WorkoutCardProps {
  workout: Workout;
  onDismissUpdate: (updateId: number | undefined) => void;
  onWorkoutComplete: (
    workoutId: string, 
    performanceData: Record<string, { weight?: string; reps?: string }>,
    difficulty?: WorkoutDifficulty,
    notes?: string
  ) => void;
  onWorkoutIncomplete?: (workoutId: string) => void;
}

export function WorkoutCard({
  workout,
  onDismissUpdate,
  onWorkoutComplete,
  onWorkoutIncomplete,
}: WorkoutCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(workout.isCompleted || false);
  const [completedExercises, setCompletedExercises] = useState<{ [key: number]: boolean }>({});
  const [performanceData, setPerformanceData] = useState(workout.performanceData || {});
  const [badgesVisible, setBadgesVisible] = useState(true);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  useEffect(() => {
    if (workout.isCompleted) {
      const allExercisesChecked: { [key: number]: boolean } = {};
      workout.exercises.forEach((_, index) => {
        allExercisesChecked[index] = true;
      });
      setCompletedExercises(allExercisesChecked);
      setIsOpen(false);
    } else {
      setCompletedExercises({});
      setIsOpen(false);
    }
    setIsCompleted(workout.isCompleted || false);
    setPerformanceData(workout.performanceData || {});
    setBadgesVisible(true);
  }, [workout.isCompleted, workout.id, workout.exercises, workout.performanceData]);

  const allExercisesCompleted = useMemo(
    () => workout.exercises.length > 0 && workout.exercises.every((_, index) => completedExercises[index]),
    [workout.exercises, completedExercises]
  );

  useEffect(() => {
    const wasCompleted = isCompleted;
    const nowCompleted = allExercisesCompleted;

    if (nowCompleted !== wasCompleted) {
      setIsCompleted(nowCompleted);
    }

    // Show completion dialog when all exercises are checked
    if (nowCompleted && !wasCompleted && !workout.isCompleted) {
      setShowCompleteDialog(true);
    }
  }, [allExercisesCompleted, isCompleted, workout.isCompleted]);

  const handleWorkoutCompleteToggle = (checked: boolean) => {
    const newCompletedExercises: { [key: number]: boolean } = {};
    if (checked) {
      workout.exercises.forEach((_, index) => {
        newCompletedExercises[index] = true;
      });
    }
    setCompletedExercises(newCompletedExercises);
  };

  const handleCompleteWorkout = (difficulty: WorkoutDifficulty, notes: string) => {
    setShowCompleteDialog(false);
    // Complete workout immediately with questionnaire data + any tracked performance data
    onWorkoutComplete(workout.id, performanceData, difficulty, notes);
  };

  const handleMouseEnter = () => {
    if ((workout.isNew || workout.isUpdated) && badgesVisible) {
      onDismissUpdate(workout.updateId);
      setBadgesVisible(false);
    }
  };

  return (
    <Card
      onMouseEnter={handleMouseEnter}
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
              <h3 className={cn('text-xl font-bold leading-none tracking-tight flex items-center gap-3', isCompleted && 'text-muted-foreground')}>
                {workout.title}
                {workout.isNew && badgesVisible && (
                  <Badge className="bg-primary text-primary-foreground animate-pulse text-xs">
                    New
                  </Badge>
                )}
                {workout.isUpdated && badgesVisible && (
                  <Badge variant="outline" className="border-primary text-primary bg-transparent animate-pulse text-xs">
                    Updated
                  </Badge>
                )}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground font-medium mt-1">{workout.description}</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-bold text-primary">
              <CalendarDays className="h-4 w-4" />
              <span>
                {workout.day} &middot; {workout.date}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCompleted && !isOpen && (
              <CollapsibleTrigger asChild>
                <Button className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary transition-all gap-2 cursor-pointer">
                  Start Workout
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            )}
            {!isCompleted && isOpen && (
              <CollapsibleTrigger asChild>
                <Button variant="default" className="transition-all gap-2 cursor-pointer">
                  Hide Details
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
            )}
            {isCompleted && onWorkoutIncomplete && (
              <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => onWorkoutIncomplete(workout.id)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Mark as Incomplete
              </Button>
            )}
            {isCompleted && (
              <CollapsibleTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-9 h-9 text-primary hover:bg-primary/10 hover:text-primary border-primary/20 dark:border-border cursor-pointer"
                >
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  <span className="sr-only">Toggle details</span>
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
        </div>

        <WorkoutCompleteDialog
          isOpen={showCompleteDialog}
          workoutTitle={workout.title}
          onClose={() => setShowCompleteDialog(false)}
          onComplete={handleCompleteWorkout}
        />
        <CollapsibleContent>
          <div className={cn('px-6 pb-6', isCompleted && 'bg-secondary/30')}>
            <div className="space-y-6">
              {isCompleted && <WorkoutSummary workout={workout} performanceData={performanceData} />}
              <ExerciseList
                exercises={workout.exercises}
                completedExercises={completedExercises}
                onExerciseCompletedChange={setCompletedExercises}
                performanceData={performanceData}
                onPerformanceChange={setPerformanceData}
                onWorkoutCompleteToggle={handleWorkoutCompleteToggle}
                isCompleted={isCompleted}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
