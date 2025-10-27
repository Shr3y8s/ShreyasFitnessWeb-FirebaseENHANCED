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
import { Dumbbell, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ExerciseInfoDialog } from './exercise-info-dialog';

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

interface ExerciseListProps {
  exercises: Exercise[];
  completedSets: { [key: string]: boolean };
  onCompletedChange: React.Dispatch<React.SetStateAction<{ [key: string]: boolean }>>;
  performanceData: { [key: string]: { weight?: string; reps?: string } };
  onPerformanceChange: React.Dispatch<React.SetStateAction<{ [key: string]: { weight?: string; reps?: string } }>>;
  onWorkoutCompleteToggle: (checked: boolean) => void;
  isCompleted: boolean;
}

export function ExerciseList({
  exercises,
  completedSets,
  onCompletedChange,
  performanceData,
  onPerformanceChange,
  onWorkoutCompleteToggle,
  isCompleted,
}: ExerciseListProps) {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const allSetIds = exercises.flatMap((ex, exIndex) =>
    ex.sets.map((_, setIndex) => `${exIndex}-${setIndex}`)
  );
  const areAllChecked = allSetIds.length > 0 && allSetIds.every((id) => completedSets[id]);
  const completedCount = allSetIds.filter((id) => completedSets[id]).length;
  const progressPercentage = allSetIds.length > 0 ? (completedCount / allSetIds.length) * 100 : 0;

  const handleAllCheckedChange = (checked: boolean | 'indeterminate') => {
    onWorkoutCompleteToggle(!!checked);
  };

  const handleSetCheckedChange = (id: string, checked: boolean | 'indeterminate') => {
    onCompletedChange((prev) => ({ ...prev, [id]: !!checked }));
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
                    id="mark-all-sets" 
                    checked={areAllChecked}
                    onCheckedChange={handleAllCheckedChange}
                    disabled={isCompleted}
                    className="cursor-pointer"
                  />
                <label
                  htmlFor="mark-all-sets"
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
        <div className="border rounded-lg overflow-hidden border-primary/20">
          <Table>
            <TableHeader>
              <TableRow className="border-primary/20">
                <TableHead className="w-12 text-center">Set</TableHead>
                <TableHead>Exercise</TableHead>
                <TableHead className="text-center">Target Reps</TableHead>
                <TableHead className="w-32 text-center">Weight (lbs)</TableHead>
                <TableHead className="w-32 text-center">Actual Reps</TableHead>
                <TableHead className="w-16 text-center">Done</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exercises.flatMap((exercise, exIndex) =>
                exercise.sets.map((set, setIndex) => {
                  const setId = `${exIndex}-${setIndex}`;
                  const isChecked = completedSets[setId] || false;
                  const setData = performanceData[setId] || {};
                  const isFirstSet = setIndex === 0;

                  return (
                    <TableRow
                      key={setId}
                      data-state={isChecked ? 'selected' : ''}
                      className="data-[state=selected]:bg-primary/10 border-primary/20"
                    >
                      <TableCell className="text-center font-medium">
                        <Badge variant="secondary" className="w-8 h-8 flex items-center justify-center text-base">
                          {set.id}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {isFirstSet && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-base">{exercise.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => openDialog(exercise)}
                            >
                              <Info className="h-4 w-4" />
                              <span className="sr-only">View exercise info</span>
                            </Button>
                          </div>
                        )}
                        {!isFirstSet && <div className="sr-only">{exercise.name}</div>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="border-primary text-primary">
                          {set.reps}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          placeholder="0"
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
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleSetCheckedChange(setId, checked)}
                          aria-label={`Mark set ${set.id} of ${exercise.name} as complete`}
                          disabled={isCompleted}
                          className="cursor-pointer rounded-full"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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
