"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dumbbell, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

const strengthCategories = [
    {
        category: "Push Strength",
        trend: "+15%",
        lifts: "Bench Press, Shoulder Press",
        icon: <Dumbbell className="h-6 w-6" />,
    },
    {
        category: "Pull Strength",
        trend: "+12%",
        lifts: "Deadlift, Bent-over Row",
        icon: <Dumbbell className="h-6 w-6" />,
    },
    {
        category: "Leg Strength",
        trend: "+20%",
        lifts: "Squat, Leg Press",
        icon: <Dumbbell className="h-6 w-6" />,
    }
];

const StrengthCategoryCard = ({ category, trend, lifts, icon }: { category: string; trend: string; lifts: string; icon: ReactNode }) => (
    <div className="p-4 bg-background/50 rounded-lg border border-primary/20 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <div className="flex-1">
            <h4 className="font-semibold">{category}</h4>
            <p className="text-sm text-muted-foreground">{lifts}</p>
        </div>
        <div className="text-right">
            <p className="text-2xl font-bold text-green-500 flex items-center gap-1 justify-end">
                <TrendingUp className="h-5 w-5" />
                {trend}
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
        </div>
    </div>
);


export function StrengthTrends() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Strength Trends
        </h3>
        <CardDescription>
          Your estimated strength is trending up based on your performance in the main compound lifts for each category.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
            {strengthCategories.map(cat => (
                <StrengthCategoryCard key={cat.category} {...cat} />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
