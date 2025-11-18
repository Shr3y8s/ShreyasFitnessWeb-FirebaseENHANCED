"use client";

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Timer, Trophy, MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';
import { type WorkoutDifficulty } from './workout-complete-dialog';

const StatCard = ({ icon, title, value }: { icon: ReactNode; title: string; value: string | number }) => (
  <Card className="flex flex-col items-center justify-center p-3 bg-background/50 text-center border-primary/20">
    <div className="text-primary mb-1">{icon}</div>
    <p className="text-xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{title}</p>
  </Card>
);

const getDifficultyDisplay = (difficulty?: WorkoutDifficulty) => {
  switch (difficulty) {
    case 'too-easy':
      return { emoji: '😊', text: 'Too Easy', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' };
    case 'just-right':
      return { emoji: '⭐', text: 'Just Right', color: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' };
    case 'challenging':
      return { emoji: '💪', text: 'Challenging', color: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' };
    case 'too-hard':
      return { emoji: '😓', text: 'Too Hard', color: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20' };
    default:
      return null;
  }
};

interface Workout {
  id: string;
  day: string;
  date: string;
  title: string;
  description: string;
  exercises: unknown[];
  difficulty?: WorkoutDifficulty;
  notes?: string;
}

interface WorkoutSummaryProps {
  workout: Workout;
  performanceData: { [key: string]: { weight?: string; reps?: string } };
}

export function WorkoutSummary({ workout, performanceData }: WorkoutSummaryProps) {
  const totalVolume = Object.keys(performanceData).reduce((acc, setId) => {
    const set = performanceData[setId];
    const weight = parseFloat(set.weight || '0') || 0;
    const reps = parseInt(set.reps || '0', 10) || 0;
    return acc + weight * reps;
  }, 0);

  const difficultyInfo = getDifficultyDisplay(workout.difficulty);

  return (
    <div className="pt-4 pb-2">
      <h3 className="text-lg font-semibold text-center mb-4 text-primary">
        Workout Complete! Great Job!
      </h3>
      
      {/* Difficulty and Notes */}
      {(difficultyInfo || workout.notes) && (
        <div className="mb-4 space-y-2">
          {difficultyInfo && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Difficulty:</span>
              <Badge className={difficultyInfo.color}>
                {difficultyInfo.emoji} {difficultyInfo.text}
              </Badge>
            </div>
          )}
          {workout.notes && (
            <Card className="p-3 bg-muted/50 border-primary/10">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your Notes:</p>
                  <p className="text-sm">{workout.notes}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Dumbbell className="h-7 w-7" />}
          title="Total Volume"
          value={`${totalVolume.toLocaleString()} lbs`}
        />
        <StatCard icon={<Timer className="h-7 w-7" />} title="Total Time" value="45:23" />
        <StatCard icon={<Trophy className="h-7 w-7" />} title="New PRs Achieved" value="2" />
      </div>
    </div>
  );
}
