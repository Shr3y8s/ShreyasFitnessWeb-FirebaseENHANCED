"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Dumbbell } from 'lucide-react';

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
        <div className="flex flex-col items-center justify-center text-center py-10">
          <Dumbbell className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold">Not enough data yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete logged workouts and your strength trends will appear here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
