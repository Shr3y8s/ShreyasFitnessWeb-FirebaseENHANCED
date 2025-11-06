"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Flame, Award, Calendar, Target } from 'lucide-react';

interface TrendData {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
}

export function NutritionTrendsCard() {
  // Sample data - in production this would come from props or API
  const streaks = [
    { label: 'Protein Goal Streak', days: 7, icon: '💪' },
    { label: 'Meal Logging Streak', days: 5, icon: '📝' },
    { label: 'Water Intake Streak', days: 14, icon: '💧' },
  ];

  const weeklyStats: TrendData[] = [
    { label: 'Avg Calories', value: '2,450/day', trend: 'stable', icon: <Flame className="h-4 w-4" /> },
    { label: 'Avg Protein', value: '175g/day', trend: 'up', icon: <Target className="h-4 w-4" /> },
    { label: 'Consistency Score', value: '92%', trend: 'up', icon: <Award className="h-4 w-4" /> },
  ];

  const achievements = [
    { label: 'Longest Streak', value: '21 days' },
    { label: 'Best Week', value: 'Week of Oct 20' },
    { label: 'Days This Month', value: '18/30 goals hit' },
  ];

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-primary/5 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Nutrition Trends
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Your progress and achievements
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Active Streaks */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Active Streaks
          </h4>
          <div className="space-y-2">
            {streaks.map((streak, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{streak.icon}</span>
                  <span className="text-sm font-medium">{streak.label}</span>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">
                  {streak.days} days
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Trends */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            This Week
          </h4>
          <div className="space-y-3">
            {weeklyStats.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {stat.icon}
                    <span className="font-medium">{stat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stat.value}</span>
                    {stat.trend === 'up' && (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                </div>
                {stat.label === 'Consistency Score' && (
                  <Progress value={92} className="h-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500" />
            Achievements
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {achievements.map((achievement, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between p-2 rounded-md bg-secondary/50"
              >
                <span className="text-xs text-muted-foreground">{achievement.label}</span>
                <span className="text-xs font-semibold">{achievement.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <p className="text-sm text-center">
            <span className="font-semibold text-primary">Keep it up!</span>
            <br />
            <span className="text-muted-foreground text-xs">
              You&apos;re on track for your best month yet 🎯
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
