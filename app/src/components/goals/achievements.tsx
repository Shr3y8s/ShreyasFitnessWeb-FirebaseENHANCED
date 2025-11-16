"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface Achievement {
  id: string;
  title: string;
  description: string;
  earnedDate: string;
}

const achievements: Achievement[] = [
  {
    id: '1',
    title: 'First Goal Completed',
    description: 'Completed your very first goal',
    earnedDate: '2024-01-15',
  },
  {
    id: '2',
    title: '7-Day Streak',
    description: 'Maintained progress for 7 days straight',
    earnedDate: '2024-03-20',
  },
  {
    id: '3',
    title: '5 Goals Mastery',
    description: 'Successfully completed 5 goals',
    earnedDate: '2024-05-12',
  },
  {
    id: '4',
    title: 'Consistency Champion',
    description: 'Hit milestones on time for 3 months',
    earnedDate: '2024-08-15',
  },
];

export function Achievements() {
  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">
          Milestone Summary
        </CardTitle>
        <CardDescription>
          Your goal milestones and achievements
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Recent Achievements */}
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className="p-3 border border-green-500/50 bg-green-50 dark:bg-green-900/10 rounded-lg transition-all hover:shadow-md hover:border-green-500"
            >
              <div className="flex items-start gap-3">
                <Star className="h-8 w-8 flex-shrink-0 text-green-600 dark:text-green-500" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm text-green-900 dark:text-green-100 mb-1">
                    {achievement.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {achievement.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Earned: {new Date(achievement.earnedDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
