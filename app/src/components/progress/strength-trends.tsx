"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Dumbbell, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const strengthCategories = [
    {
        category: "Push Strength",
        trend: "+15%",
        lifts: "Bench Press, Shoulder Press",
        icon: <Dumbbell className="h-6 w-6" />,
        gradient: "gradient-accent-blue",
        color: "text-blue-600",
    },
    {
        category: "Pull Strength",
        trend: "+12%",
        lifts: "Deadlift, Bent-over Row",
        icon: <Dumbbell className="h-6 w-6" />,
        gradient: "gradient-accent-green",
        color: "text-green-600",
    },
    {
        category: "Leg Strength",
        trend: "+20%",
        lifts: "Squat, Leg Press",
        icon: <Dumbbell className="h-6 w-6" />,
        gradient: "gradient-accent-purple",
        color: "text-purple-600",
    }
];

const StrengthCategoryCard = ({ category, trend, lifts, icon, gradient, color, index }: { category: string; trend: string; lifts: string; icon: ReactNode; gradient: string; color: string; index: number }) => (
    <div className={cn(
        "p-4 rounded-lg border border-primary/20 flex items-center gap-4 card-hover-lift overflow-hidden",
        gradient,
        "animate-fade-in-up",
        `stagger-${index + 1}`
    )}>
        <div className={cn("p-3 rounded-lg", gradient)}>{icon}</div>
        <div className="flex-1">
            <h4 className="font-semibold">{category}</h4>
            <p className="text-sm text-muted-foreground">{lifts}</p>
        </div>
        <div className="text-right">
            <p className={cn("text-2xl font-bold number-emphasis animate-count-up flex items-center gap-1 justify-end", color)}>
                <TrendingUp className="h-5 w-5" />
                {trend}
            </p>
            <p className="text-xs text-muted-foreground">This month</p>
        </div>
    </div>
);


export function StrengthTrends() {
  return (
    <Card className="card-hover-lift border-primary/50">
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
            {strengthCategories.map((cat, index) => (
                <StrengthCategoryCard key={cat.category} {...cat} index={index} />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
