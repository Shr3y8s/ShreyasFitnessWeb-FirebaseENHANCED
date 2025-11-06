"use client";

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Trophy, Award, Target, Zap, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockAchievements = [
  {
    id: 1,
    icon: Trophy,
    name: '30 Day Streak',
    description: '30 consecutive days of workouts',
    earned: true,
    date: 'Earned 2 days ago',
  },
  {
    id: 2,
    icon: Zap,
    name: 'PR Crusher',
    description: 'Hit 5 new personal records',
    earned: true,
    date: 'Earned last week',
  },
  {
    id: 3,
    icon: Target,
    name: 'Weight Goal',
    description: 'Reached target weight',
    earned: true,
    date: 'Earned 3 weeks ago',
  },
  {
    id: 4,
    icon: Award,
    name: 'Consistency King',
    description: '90% weekly compliance for a month',
    earned: false,
    date: '3 weeks remaining',
  },
  {
    id: 5,
    icon: Star,
    name: 'Transformation',
    description: 'Lost 20+ lbs',
    earned: false,
    date: '5 lbs to go',
  },
];

export function Achievements() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow border-primary/50">
      <CardHeader>
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Achievements
        </h3>
        <CardDescription>
          Milestones you&apos;ve reached
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockAchievements.map((achievement) => {
            const Icon = achievement.icon;
            return (
              <div
                key={achievement.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  achievement.earned
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-secondary/50 border-border opacity-60'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    achievement.earned
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm">{achievement.name}</h4>
                    {achievement.earned && (
                      <Badge variant="default" className="text-xs">
                        Earned
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
