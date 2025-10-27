"use client";

import { WorkoutCard } from './workout-card';

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

interface WorkoutListProps {
  workouts: Workout[];
  onWorkoutComplete: (workoutId: string, performanceData: Record<string, { weight?: string; reps?: string }>) => void;
  onWorkoutIncomplete?: (workoutId: string) => void;
  onDismissUpdate: (updateId: number | undefined) => void;
}

export function WorkoutList({
  workouts,
  onWorkoutComplete,
  onWorkoutIncomplete,
  onDismissUpdate,
}: WorkoutListProps) {
  return (
    <div className="space-y-6">
      {workouts.map((workout, index) => (
        <WorkoutCard
          key={workout.id || index}
          workout={workout}
          onWorkoutComplete={onWorkoutComplete}
          onWorkoutIncomplete={onWorkoutIncomplete}
          onDismissUpdate={onDismissUpdate}
        />
      ))}
    </div>
  );
}
