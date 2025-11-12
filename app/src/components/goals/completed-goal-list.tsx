"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Trophy } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Completed Goals
          </CardTitle>
          <CardDescription>Your achievements and completed objectives</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No completed goals yet. Keep working toward your objectives!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Completed Goals
        </CardTitle>
        <CardDescription>
          {goals.length} {goals.length === 1 ? 'goal' : 'goals'} completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="border border-green-500/30 bg-green-500/5 rounded-lg p-5 transition-all hover:shadow-md"
          >
            {/* Goal Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <h3 className="font-semibold text-lg">{goal.title}</h3>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">
                    Completed
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  <span className="bg-secondary px-2 py-1 rounded">{goal.category}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Completed: {new Date(goal.deadline).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-3xl font-bold text-green-600">
                  {goal.targetValue}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{goal.unit}</p>
              </div>
            </div>

            {/* Completed Milestones */}
            {goal.milestones.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-500/20">
                <div className="space-y-2">
                  {goal.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="line-through">{milestone.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Celebration message */}
            <div className="mt-4 pt-4 border-t border-green-500/20 text-center">
              <p className="text-sm font-medium text-green-700">
                🎉 Congratulations on achieving this goal!
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
