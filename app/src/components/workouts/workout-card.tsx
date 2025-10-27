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
}

interface WorkoutCardProps {
  workout: Workout;
  onDismissUpdate: (updateId: number | undefined) => void;
  onWorkoutComplete: (workoutId: string, performanceData: Record<string, { weight?: string; reps?: string }>) => void;
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
  const [completedSets, setCompletedSets] = useState<{ [key: string]: boolean }>({});
  const [performanceData, setPerformanceData] = useState(workout.performanceData || {});
  const [badgesVisible, setBadgesVisible] = useState(true);

  const allSetIds = useMemo(
    () =>
      workout.exercises.flatMap((ex, exIndex) =>
        ex.sets.map((_, setIndex) => `${exIndex}-${setIndex}`)
      ),
    [workout.exercises]
  );

  useEffect(() => {
    if (workout.isCompleted) {
      const allSetsChecked: { [key: string]: boolean } = {};
      allSetIds.forEach((id) => {
        allSetsChecked[id] = true;
      });
      setCompletedSets(allSetsChecked);
      setIsOpen(false);
    } else {
      setCompletedSets({});
      setIsOpen(false);
    }
    setIsCompleted(workout.isCompleted || false);
    setPerformanceData(workout.performanceData || {});
    setBadgesVisible(true);
  }, [workout.isCompleted, workout.id, allSetIds, workout.performanceData]);

  const allSetsCompleted = useMemo(
    () => allSetIds.length > 0 && allSetIds.every((id) => completedSets[id]),
    [allSetIds, completedSets]
  );

  useEffect(() => {
    const wasCompleted = isCompleted;
    const nowCompleted = allSetsCompleted;

    if (nowCompleted !== wasCompleted) {
      setIsCompleted(nowCompleted);
    }

    if (nowCompleted && !wasCompleted && onWorkoutComplete) {
      onWorkoutComplete(workout.id, performanceData);
    }
  }, [allSetsCompleted, isCompleted, onWorkoutComplete, workout.id, performanceData]);

  const handleWorkoutCompleteToggle = (checked: boolean) => {
    const newCompletedSets: { [key: string]: boolean } = {};
    if (checked) {
      allSetIds.forEach((id) => {
        newCompletedSets[id] = true;
      });
    }
    setCompletedSets(newCompletedSets);
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
        <CollapsibleContent>
          <div className={cn('px-6 pb-6', isCompleted && 'bg-secondary/30')}>
            <div className="space-y-6">
              {isCompleted && <WorkoutSummary workout={workout} performanceData={performanceData} />}
              <ExerciseList
                exercises={workout.exercises}
                completedSets={completedSets}
                onCompletedChange={setCompletedSets}
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
