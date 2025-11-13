"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  MoreVertical,
  Edit,
  Trash,
  Flag,
  Calendar,
  Zap,
  Rocket,
  FlagTriangleRight,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useEffect, useState } from 'react';

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

interface GoalCardProps {
  goal: Goal;
}

const getProgress = (
  current: number,
  target: number,
  lowerIsBetter = false
) => {
  if (lowerIsBetter) {
    // Assuming a starting weight to calculate progress from
    const initialStart = 215;
    if (current <= target) return 100;
    if (current >= initialStart) return 0;
    // Calculate progress based on how much of the journey from start to target is complete
    return Math.max(0, ((initialStart - current) / (initialStart - target)) * 100);
  }
  if (target === 0) return 0;
  return Math.min(100, (current / target) * 100);
};

const getPoundsLost = (current: number) => {
  const initialStart = 215;
  if (current < initialStart) {
    return initialStart - current;
  }
  return 0;
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const config: { className: string } = {
    High: {
      className: 'bg-red-500/10 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-500/20'
    },
    Medium: {
      className: 'bg-amber-500/10 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-500/20'
    },
    Low: {
      className: 'bg-blue-500/10 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-500/20'
    },
  }[priority] || { className: '' };

  return (
    <Badge variant="outline" className={cn("capitalize gap-1", config.className)}>
      <Flag className="h-3 w-3" />
      {priority}
    </Badge>
  );
};

export function GoalCard({ goal }: GoalCardProps) {
  const [formattedDate, setFormattedDate] = useState('');

  useEffect(() => {
    // Dates are formatted on the client to avoid hydration mismatch
    setFormattedDate(new Date(goal.deadline).toLocaleDateString());
  }, [goal.deadline]);

  const progress = getProgress(
    goal.currentValue,
    goal.targetValue,
    goal.lowerIsBetter
  );
  const poundsLost = goal.lowerIsBetter ? getPoundsLost(goal.currentValue) : 0;

  const TermIcon = goal.term === 'long-term' ? Rocket : FlagTriangleRight;

  return (
    <Card
      className={cn(
        'transition-all duration-300 flex flex-col gap-0 pt-6 pb-0 bg-card w-full group relative',
        goal.isCompleted
          ? 'border-border'
          : 'hover:shadow-glow hover:-translate-y-1 hover:border-primary/50'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn('capitalize', goal.isCompleted ? 'border-border' : 'text-primary border-primary/50 font-medium')}
            >
              {goal.category}
            </Badge>
            <Badge
              variant="secondary"
              className="capitalize"
            >
              <TermIcon className="h-3 w-3 mr-1" />
              {goal.term}
            </Badge>
            {goal.isCompleted && (
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-500/50 capitalize"
              >
                <Check className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground -mt-2 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit Goal
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete Goal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="flex items-start gap-2 pt-2 text-base">
          <span className={cn(goal.isCompleted && 'text-muted-foreground line-through')}>{goal.title}</span>
          {goal.lowerIsBetter && poundsLost > 0 && (
            <Badge variant="outline" className="gap-1 py-0.5 px-2 text-xs bg-green-500/10 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-500/20">
              <ArrowDown className="h-3 w-3" />
              <span className="font-bold">
                -{poundsLost} lbs total
              </span>
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 pt-0 pb-2">
        <div className="space-y-2">
          <div className="flex justify-between items-baseline text-sm">
            <span className="font-semibold text-muted-foreground">
              {goal.lowerIsBetter ? 'Current' : 'Progress'}
            </span>
            <span className="font-bold text-primary">
              {goal.currentValue} / {goal.targetValue} {goal.unit}
            </span>
          </div>
          <Progress value={progress} />
        </div>
        {goal.milestones && goal.milestones.length > 0 && !goal.isCompleted && (
          <div className="pt-2">
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
              <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                <Zap className="h-4 w-4" /> 
                Milestones
              </h4>
              <ul className="space-y-2">
                {goal.milestones.map((milestone, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "h-5 w-5 rounded-full flex items-center justify-center border-2",
                      milestone.completed
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/50"
                    )}>
                      {milestone.completed && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className={cn(
                      milestone.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}>
                      {milestone.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col items-start px-4 py-4 border-t bg-secondary/50">
        <div className="flex w-full justify-between items-center text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Due: {formattedDate}
          </span>
          <PriorityBadge priority={goal.priority} />
        </div>
      </CardFooter>
    </Card>
  );
}
