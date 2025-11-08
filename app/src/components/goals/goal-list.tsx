"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-500/10 text-red-700 border-red-500/50';
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/50';
      case 'Low':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/50';
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/50';
    }
  };

  const calculateProgress = (goal: Goal) => {
    if (goal.lowerIsBetter) {
      // For goals where lower is better (e.g., weight loss)
      const totalChange = goal.currentValue - goal.targetValue;
      const startValue = goal.currentValue; // Simplified - in real app, would track starting value
      const progress = ((startValue - goal.currentValue) / totalChange) * 100;
      return Math.max(0, Math.min(100, progress));
    } else {
      // For goals where higher is better
      return Math.round((goal.currentValue / goal.targetValue) * 100);
    }
  };

  const getStatusBadge = (goal: Goal) => {
    const progress = calculateProgress(goal);
    const daysUntilDeadline = Math.ceil(
      (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (progress >= 100) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/50">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    } else if (progress >= 75) {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/50">
          On Track
        </Badge>
      );
    } else if (daysUntilDeadline < 7) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/50">
          <AlertCircle className="h-3 w-3 mr-1" />
          Due Soon
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/50">
          In Progress
        </Badge>
      );
    }
  };

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No goals in this category yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Start by adding a new goal to track your progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {goals.length} active {goals.length === 1 ? 'goal' : 'goals'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {goals.map((goal) => {
          const progress = calculateProgress(goal);
          const completedMilestones = goal.milestones.filter(m => m.completed).length;
          
          return (
            <div
              key={goal.id}
              className="border rounded-lg p-5 hover:border-primary/50 transition-all hover:shadow-md"
            >
              {/* Goal Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{goal.title}</h3>
                    {getStatusBadge(goal)}
                    <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                      {goal.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                    <span className="bg-secondary px-2 py-1 rounded">{goal.category}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due: {new Date(goal.deadline).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-3xl font-bold">
                    {goal.currentValue}
                    <span className="text-lg text-muted-foreground">/{goal.targetValue}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{goal.unit}</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-semibold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              {/* Milestones */}
              {goal.milestones.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Milestones</span>
                    <span className="text-xs text-muted-foreground">
                      {completedMilestones}/{goal.milestones.length} completed
                    </span>
                  </div>
                  <div className="space-y-2">
                    {goal.milestones.map((milestone, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-2 rounded hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          checked={milestone.completed}
                          className="mt-0.5"
                          disabled
                        />
                        <span
                          className={`text-sm flex-1 ${
                            milestone.completed
                              ? 'line-through text-muted-foreground'
                              : 'text-foreground'
                          }`}
                        >
                          {milestone.text}
                        </span>
                        {milestone.completed && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
