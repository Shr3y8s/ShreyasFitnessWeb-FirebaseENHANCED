"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Goal, Route, FlagTriangleRight, Check, PlusCircle } from 'lucide-react';
import { AchievementLevelBanner } from './achievement-level-banner';

interface Milestone {
  text: string;
  completed: boolean;
}

interface GoalData {
  id: string;
  status: string;
  term: string;
  milestones?: Milestone[];
}

interface GoalSummaryProps {
  goals: GoalData[];
  onAddGoal?: () => void;
}

export function GoalSummary({ goals, onAddGoal }: GoalSummaryProps) {
  const completedGoals = goals.filter(g => g.status === 'completed').length;
  const shortTermGoals = goals.filter(g => g.term === 'short-term' && g.status !== 'completed').length;
  const longTermGoals = goals.filter(g => g.term === 'long-term' && g.status !== 'completed').length;

  return (
    <Card 
      className="border-primary/50" 
      style={{ boxShadow: '0 0 15px oklch(65% 0.16 151 / 0.25), 0 4px 20px oklch(65% 0.16 151 / 0.4)' }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Goal className="text-primary" />
          Goals Overview
        </CardTitle>
        {onAddGoal && (
          <Button onClick={onAddGoal} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Goal
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6 px-8">
        <div className="flex justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-fit justify-items-center">
          {/* Left side - Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
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
          
          {/* Right side - Achievement Banner */}
          <div className="flex items-center">
            <AchievementLevelBanner goals={goals} />
          </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
