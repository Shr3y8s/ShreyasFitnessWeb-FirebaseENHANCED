"use client";

import { Card } from '@/components/ui/card';
import { Dumbbell, Timer, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

const StatCard = ({ icon, title, value }: { icon: ReactNode; title: string; value: string | number }) => (
  <Card className="flex flex-col items-center justify-center p-3 bg-background/50 text-center border-primary/20">
    <div className="text-primary mb-1">{icon}</div>
    <p className="text-xl font-bold">{value}</p>
    <p className="text-xs text-muted-foreground">{title}</p>
  </Card>
);

interface Workout {
  id: string;
  day: string;
  date: string;
  title: string;
  description: string;
  exercises: unknown[];
}

interface WorkoutSummaryProps {
  workout: Workout;
  performanceData: { [key: string]: { weight?: string; reps?: string } };
}

export function WorkoutSummary({ performanceData }: WorkoutSummaryProps) {
  const totalVolume = Object.keys(performanceData).reduce((acc, setId) => {
    const set = performanceData[setId];
    const weight = parseFloat(set.weight || '0') || 0;
    const reps = parseInt(set.reps || '0', 10) || 0;
    return acc + weight * reps;
  }, 0);

  return (
    <div className="pt-4 pb-2">
      <h3 className="text-lg font-semibold text-center mb-4 text-primary">
        Workout Complete! Great Job!
      </h3>
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
