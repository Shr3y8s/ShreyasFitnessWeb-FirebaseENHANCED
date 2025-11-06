"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutritionHabit {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  streak: number;
}

const INITIAL_HABITS: NutritionHabit[] = [
  {
    id: '1',
    name: 'Drink 8 glasses of water',
    description: 'Stay hydrated throughout the day',
    completed: false,
    streak: 3
  },
  {
    id: '2',
    name: 'Eat 5 servings of vegetables',
    description: 'Include variety of colorful vegetables',
    completed: false,
    streak: 5
  },
  {
    id: '3',
    name: 'Hit protein target',
    description: 'Meet or exceed daily protein goal',
    completed: false,
    streak: 7
  },
  {
    id: '4',
    name: 'No late-night snacking',
    description: 'Stop eating 2 hours before bed',
    completed: false,
    streak: 2
  },
  {
    id: '5',
    name: 'Meal prep for tomorrow',
    description: 'Prepare at least one meal in advance',
    completed: false,
    streak: 4
  },
  {
    id: '6',
    name: 'Mindful eating',
    description: 'Eat without distractions for at least one meal',
    completed: false,
    streak: 1
  }
];

export function NutritionHabitTracker() {
  const [habits, setHabits] = useState<NutritionHabit[]>(INITIAL_HABITS);

  const toggleHabit = (id: string) => {
    setHabits(habits.map(habit =>
      habit.id === id
        ? { ...habit, completed: !habit.completed }
        : habit
    ));
  };

  const completedCount = habits.filter(h => h.completed).length;
  const completionPercentage = (completedCount / habits.length) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">Nutrition Habits</h2>
          <p className="text-sm text-muted-foreground">
            Build consistency with daily nutrition practices
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Today's Progress</h3>
              <Badge variant={completedCount === habits.length ? "default" : "secondary"}>
                {completedCount} / {habits.length} Complete
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <p className="text-sm text-muted-foreground">
              {completedCount === habits.length
                ? "🎉 All habits completed today! Amazing work!"
                : `Keep going! ${habits.length - completedCount} habit${habits.length - completedCount !== 1 ? 's' : ''} remaining.`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.map((habit) => (
          <Card
            key={habit.id}
            className={cn(
              "transition-all duration-200 hover:shadow-md cursor-pointer",
              habit.completed && "bg-primary/5 border-primary/30"
            )}
            onClick={() => toggleHabit(habit.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={habit.id}
                  checked={habit.completed}
                  onCheckedChange={() => toggleHabit(habit.id)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={habit.id}
                    className={cn(
                      "font-medium cursor-pointer",
                      habit.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {habit.name}
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {habit.description}
                  </p>
                  {habit.streak > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium text-primary">
                        {habit.streak} day streak
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Tips for Building Habits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
              1
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Start small:</strong> Focus on one or two habits at a time before adding more.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
              2
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Be consistent:</strong> Try to complete your habits at the same time each day.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-sm font-semibold text-primary">
              3
            </div>
            <p className="text-sm text-muted-foreground">
              <strong>Track your streaks:</strong> Seeing progress motivates you to keep going.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
