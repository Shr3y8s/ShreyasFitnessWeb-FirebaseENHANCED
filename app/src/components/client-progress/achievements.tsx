"use client";

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Trophy, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const mockAchievements = [
  {
    id: 1,
    name: '30 Day Streak',
    description: '30 consecutive days of workouts',
    earned: true,
    date: 'Earned 2 days ago',
  },
  {
    id: 2,
    name: 'PR Crusher',
    description: 'Hit 5 new personal records',
    earned: true,
    date: 'Earned last week',
  },
  {
    id: 3,
    name: 'Weight Goal',
    description: 'Reached target weight',
    earned: true,
    date: 'Earned 3 weeks ago',
  },
  {
    id: 4,
    name: 'Consistency King',
    description: '90% weekly compliance for a month',
    earned: false,
    date: '3 weeks remaining',
  },
  {
    id: 5,
    name: 'Transformation',
    description: 'Lost 20+ lbs',
    earned: false,
    date: '5 lbs to go',
  },
];

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
        <div className="space-y-4">
          {mockAchievements.map((achievement, index) => {
            return (
              <div
                key={achievement.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-all overflow-hidden relative",
                  "animate-fade-in-up",
                  `stagger-${Math.min(index + 1, 6)}`,
                  achievement.earned
                    ? 'gradient-accent-gold border-amber-300/50 hover:shadow-lg hover:shadow-amber-500/20'
                    : 'bg-secondary/50 border-border opacity-60 hover:opacity-80'
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-lg transition-transform hover:scale-110",
                    achievement.earned
                      ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20 text-amber-600'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Award className={cn("h-5 w-5", achievement.earned && "animate-pulse")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={cn("font-semibold text-sm", achievement.earned && "text-amber-900 dark:text-amber-100")}>
                      {achievement.name}
                    </h4>
                    {achievement.earned && (
                      <Badge className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md">
                        ✓ Earned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {achievement.date}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
