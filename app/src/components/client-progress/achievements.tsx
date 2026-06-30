"use client";

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Trophy, Award } from 'lucide-react';

export function Achievements() {
  return (
    <Card className="card-hover-lift border-primary/50">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Metric Achievements
        </h3>
        <CardDescription>
          Milestones you&apos;ve reached
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center text-center py-10">
          <Award className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="font-semibold">No achievements yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Keep training — milestones you reach will show up here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
