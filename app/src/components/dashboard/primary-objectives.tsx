"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Footprints, Dumbbell, Utensils, Target } from 'lucide-react';
import type { ReactNode } from 'react';

interface FocusHabit {
    title: string;
    description: string;
    icon: ReactNode;
    color: string;
}

const focusHabits: FocusHabit[] = [
    {
        title: "Walk 10K steps daily",
        description: "Building daily movement habit",
        icon: <Footprints className="h-6 w-6" />,
        color: "text-blue-500 bg-blue-100 dark:bg-blue-900/50",
    },
    {
        title: "Complete scheduled workouts",
        description: "Following training program consistently",
        icon: <Dumbbell className="h-6 w-6" />,
        color: "text-green-500 bg-green-100 dark:bg-green-900/50",
    },
    {
        title: "Follow meal plan & hit protein target",
        description: "Building nutrition consistency",
        icon: <Utensils className="h-6 w-6" />,
        color: "text-orange-500 bg-orange-100 dark:bg-orange-900/50",
    },
];

const FocusItem = ({ habit }: { habit: FocusHabit }) => (
    <div className="flex items-center gap-4 rounded-lg p-4 bg-secondary/50">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full ${habit.color}`}>
            {habit.icon}
        </div>
        <div>
            <p className="font-semibold">{habit.title}</p>
            <p className="text-sm text-muted-foreground">{habit.description}</p>
        </div>
    </div>
);


export function PrimaryObjectives({ title = "Primary Objectives" }: { title?: string }) {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Target className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription>
              Daily habits you&apos;re building consistency with
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {focusHabits.map((habit) => (
            <FocusItem key={habit.title} habit={habit} />
        ))}
      </CardContent>
    </Card>
  );
}
