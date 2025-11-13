"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity, Dumbbell, UtensilsCrossed } from 'lucide-react';

interface FocusHabit {
    id: number;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
}

const focusHabits: FocusHabit[] = [
    {
        id: 1,
        title: "Walk 10K steps daily",
        description: "Building daily movement habit",
        icon: Activity,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/50",
    },
    {
        id: 2,
        title: "Complete scheduled workouts",
        description: "Following training program consistently",
        icon: Dumbbell,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/50",
    },
    {
        id: 3,
        title: "Follow meal plan & hit protein target",
        description: "Building nutrition consistency",
        icon: UtensilsCrossed,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/50",
    },
];

const FocusItem = ({ habit }: { habit: FocusHabit }) => {
    const Icon = habit.icon;
    return (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-green-500/50 bg-card hover:bg-accent/50 transition-colors">
            <div className={`p-3 rounded-full ${habit.bgColor} flex-shrink-0`}>
                <Icon className={`h-5 w-5 ${habit.color}`} />
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


export function CurrentFocus() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="text-xl">
          Current Focus
        </CardTitle>
        <CardDescription>
          Daily habits you&apos;re building consistency with
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {focusHabits.map((habit) => (
            <FocusItem key={habit.title} habit={habit} />
        ))}
      </CardContent>
    </Card>
  );
}
