"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Goal, Route, FlagTriangleRight, Check } from 'lucide-react';

interface GoalData {
  id: string;
  status: string;
  term: string;
}

interface GoalSummaryProps {
  goals: GoalData[];
}

export function GoalSummary({ goals }: GoalSummaryProps) {
  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  
  const shortTermGoals = goals.filter(g => g.term === 'short-term' && g.status !== 'completed').length;
  const longTermGoals = goals.filter(g => g.term === 'long-term' && g.status !== 'completed').length;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Goal className="text-primary" />
          Goals Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <p className="text-sm font-medium text-muted-foreground">Overall Progress</p>
            <p className="text-sm font-bold text-primary">{completedGoals} / {totalGoals} Completed</p>
          </div>
          <Progress value={completionRate} />
        </div>
        <div className="flex justify-around">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-primary/10 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <FlagTriangleRight className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{shortTermGoals}</p>
              <p className="text-xs text-muted-foreground">Short-Term</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <Route className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{longTermGoals}</p>
              <p className="text-xs text-muted-foreground">Long-Term</p>
            </div>
            <div className="p-4 bg-primary/10 rounded-lg transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer">
              <Check className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{completedGoals}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
