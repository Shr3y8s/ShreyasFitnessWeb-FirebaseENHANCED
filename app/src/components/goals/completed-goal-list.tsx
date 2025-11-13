"use client";

import { Trophy } from 'lucide-react';
import { GoalCard } from './goal-card';

interface Milestone {
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  title: string;
  category: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline: string;
  priority: 'High' | 'Medium' | 'Low';
  term: 'short-term' | 'long-term';
  status: string;
  milestones: Milestone[];
  isCompleted: boolean;
  lowerIsBetter?: boolean;
}

interface CompletedGoalListProps {
  goals: Goal[];
}

export function CompletedGoalList({ goals }: CompletedGoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-card border-2 border-dashed rounded-lg">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground">No completed goals yet</h3>
        <p className="text-muted-foreground mt-2">Keep working toward your objectives!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        Completed Goals
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
