"use client";

import { useState } from 'react';
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
import { Dumbbell, Info, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExerciseInfoDialog } from './exercise-info-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Set {
  id: number;
  reps: string;
  weight: string;
  targetWeight?: string;
}

interface Exercise {
  name: string;
  target: string;
  videoUrl: string;
  instructions: string[];
  sets: Set[];
  rest: string;
}

interface ExerciseListProps {
  exercises: Exercise[];
  completedExercises: { [key: number]: boolean };
  onExerciseCompletedChange: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
  performanceData: { [key: string]: { weight?: string; reps?: string } };
  onPerformanceChange: React.Dispatch<React.SetStateAction<{ [key: string]: { weight?: string; reps?: string } }>>;
  onWorkoutCompleteToggle: (checked: boolean) => void;
  isCompleted: boolean;
}

export function ExerciseList({
  exercises,
  completedExercises,
  onExerciseCompletedChange,
  performanceData,
  onPerformanceChange,
  onWorkoutCompleteToggle,
  isCompleted,
}: ExerciseListProps) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [openExercises, setOpenExercises] = useState<{ [key: number]: boolean }>({});

  const areAllExercisesComplete = exercises.length > 0 && exercises.every((_, index) => completedExercises[index]);
  const completedCount = exercises.filter((_, index) => completedExercises[index]).length;
  const progressPercentage = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;

  const handleAllCheckedChange = (checked: boolean | 'indeterminate') => {
    onWorkoutCompleteToggle(!!checked);
  };

  const handleExerciseCheckedChange = (exIndex: number, checked: boolean | 'indeterminate') => {
    onExerciseCompletedChange((prev: { [key: number]: boolean }) => ({ ...prev, [exIndex]: !!checked }));
  };

  const handleInputChange = (id: string, field: 'weight' | 'reps', value: string) => {
    onPerformanceChange((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  };

  const openDialog = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  const toggleExercise = (index: number) => {
    setOpenExercises((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <>
      <div className="pt-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Exercises
          </h4>
          {!isCompleted && (
            <div className="flex items-center space-x-4 w-1/3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="mark-all-exercises" 
                  checked={areAllExercisesComplete}
                  onCheckedChange={handleAllCheckedChange}
                  disabled={isCompleted}
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
          )}
        </div>

        {/* Collapsible Exercise Sections */}
        <div className="space-y-3">
          {exercises.map((exercise, exIndex) => {
            const isOpen = openExercises[exIndex] || false;
            const isExerciseComplete = completedExercises[exIndex] || false;
            const hasTargetWeight = exercise.sets[0]?.targetWeight;

            return (
              <Collapsible
                key={exIndex}
                open={isOpen}
                onOpenChange={() => toggleExercise(exIndex)}
                className="border rounded-lg border-primary/20 overflow-hidden"
              >
                <CollapsibleTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-between p-4 w-full hover:bg-accent/50 transition-colors cursor-pointer",
                    isExerciseComplete && "bg-primary/5"
                  )}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full border-2",
                        isExerciseComplete ? "border-primary bg-primary/10" : "border-muted"
                      )}>
                        {isExerciseComplete ? (
                          <Dumbbell className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-sm font-semibold">{exIndex + 1}</span>
                        )}
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-base">{exercise.name}</h5>
                          <button
                            className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-primary rounded-md hover:bg-accent transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDialog(exercise);
                            }}
                            type="button"
                          >
                            <Info className="h-4 w-4" />
                            <span className="sr-only">View exercise info</span>
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {hasTargetWeight && (
                            <span className="font-medium text-primary">
                              {exercise.sets[0].targetWeight} lbs
                            </span>
                          )}
                          {hasTargetWeight && <span>×</span>}
                          <span>{exercise.target}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {exercise.rest} rest
                          </span>
                          <span>•</span>
                          <span className="font-medium">
                            {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                          </span>
                        </div>
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

                <CollapsibleContent>
                  <div className={cn(
                    "border-t border-primary/20 p-4",
                    isExerciseComplete && "bg-primary/5"
                  )}>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-primary/20">
                          <TableHead className="w-16 text-center">Set</TableHead>
                          <TableHead className="text-center">Target</TableHead>
                          <TableHead className="w-32 text-center">Weight (lbs)</TableHead>
                          <TableHead className="w-32 text-center">Actual Reps</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exercise.sets.map((set, setIndex) => {
                          const setId = `${exIndex}-${setIndex}`;
                          const setData = performanceData[setId] || {};

                          return (
                            <TableRow
                              key={setId}
                              className="border-primary/20"
                            >
                              <TableCell className="text-center font-medium">
                                <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center">
                                  {set.id}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  {set.targetWeight && (
                                    <span className="text-xs font-semibold text-primary">
                                      {set.targetWeight} lbs
                                    </span>
                                  )}
                                  <Badge variant="outline" className="border-primary text-primary">
                                    {set.reps} reps
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder={set.targetWeight || "0"}
                                  className="text-center border-primary/20"
                                  value={setData.weight || ''}
                                  onChange={(e) => handleInputChange(setId, 'weight', e.target.value)}
                                  disabled={isCompleted}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="text-center border-primary/20"
                                  value={setData.reps || ''}
                                  onChange={(e) => handleInputChange(setId, 'reps', e.target.value)}
                                  disabled={isCompleted}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    
                    {/* Exercise Complete Button */}
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant={isExerciseComplete ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleExerciseCheckedChange(exIndex, !isExerciseComplete)}
                        disabled={isCompleted}
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
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
      <ExerciseInfoDialog
        exercise={selectedExercise}
        isOpen={!!selectedExercise}
        onClose={() => setSelectedExercise(null)}
      />
    </>
  );
}
