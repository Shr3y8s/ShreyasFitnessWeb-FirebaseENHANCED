"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity, Dumbbell, UtensilsCrossed, Droplet, Moon, ListChecks } from 'lucide-react';
import { DailyHabit } from '@/types/plan';

interface DailyHabitsProps {
  habits?: DailyHabit[];
}

// Icon map
const ICON_MAP = {
  activity: Activity,
  dumbbell: Dumbbell,
  nutrition: UtensilsCrossed,
  hydration: Droplet,
  sleep: Moon,
  custom: Activity,
};

const HabitItem = ({ habit }: { habit: DailyHabit }) => {
    const Icon = ICON_MAP[habit.iconType] || Activity;
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/50 bg-card hover:bg-accent/50 transition-colors">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50 flex-shrink-0">
                <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{habit.title}</h4>
                <p className="text-xs text-muted-foreground leading-tight">
                    {habit.description}
                </p>
            </div>
        </div>
    );
};

export function DailyHabits({ habits }: DailyHabitsProps) {
  if (!habits || habits.length === 0) {
    return null;
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <ListChecks className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Daily Habits</CardTitle>
            <CardDescription>
              Daily habits you&apos;re building consistency with
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {habits.map((habit) => (
            <HabitItem key={habit.id} habit={habit} />
        ))}
      </CardContent>
    </Card>
  );
}

// Export with old name for backwards compatibility
export { DailyHabits as CurrentFocus };
