"use client";

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

interface GoalListProps {
  goals: Goal[];
  title: string;
}

export function GoalList({ goals, title }: GoalListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-16 px-6 bg-card border-2 border-dashed rounded-lg">
        <h3 className="text-xl font-semibold text-foreground">No goals here!</h3>
        <p className="text-muted-foreground mt-2">Looks like this section is empty. Time to set some new objectives!</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
