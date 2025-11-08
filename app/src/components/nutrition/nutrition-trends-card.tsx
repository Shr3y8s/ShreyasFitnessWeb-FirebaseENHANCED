"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Droplets, TrendingUp, Target, Calendar, Trophy, BicepsFlexed, ClipboardEdit } from "lucide-react";
import type { ReactNode } from "react";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

const streakData = [
  {
    icon: <BicepsFlexed className="h-5 w-5 text-amber-500" />,
    title: "Protein Goal Streak",
    value: "7 days",
  },
  {
    icon: <ClipboardEdit className="h-5 w-5 text-blue-500" />,
    title: "Meal Logging Streak",
    value: "5 days",
  },
  {
    icon: <Droplets className="h-5 w-5 text-sky-500" />,
    title: "Water Intake Streak",
    value: "14 days",
  },
];

const thisWeekData = [
  {
    icon: <Flame className="h-5 w-5 text-muted-foreground" />,
    title: "Avg Calories",
    value: "2,450/day",
  },
  {
    icon: <Target className="h-5 w-5 text-muted-foreground" />,
    title: "Avg Protein",
    value: "175g/day",
  },
];

const achievementsData = [
  { title: "Longest Streak", value: "21 days" },
  { title: "Best Week", value: "Week of Oct 20" },
  { title: "Days This Month", value: "18/30 goals hit" },
];

const Section = ({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) => (
  <div className="space-y-3">
    <h3 className="font-semibold text-foreground flex items-center gap-2">
      {icon}
      {title}
    </h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const StreakItem = ({ icon, title, value }: { icon: ReactNode; title: string; value: string }) => (
  <div className="flex items-center justify-between gap-4 p-3 bg-green-500/10 rounded-lg">
    <div className="flex items-center gap-3">
      {icon}
      <p className="text-sm font-medium text-green-900 dark:text-green-200">{title}</p>
    </div>
    <Badge className="bg-green-200 text-green-900 hover:bg-green-300 dark:bg-green-800 dark:text-green-100 font-semibold">{value}</Badge>
  </div>
);

const ThisWeekItem = ({ icon, title, value }: { icon: ReactNode; title: string; value: string }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/50">
    <div className="flex items-center gap-3">
      {icon}
      <p className="text-sm text-muted-foreground">{title}</p>
    </div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);

export function NutritionTrendsCard() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="text-primary" />
          Nutrition Trends
        </CardTitle>
        <CardDescription>
          Your progress and achievements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Section title="Active Streaks" icon={<Flame className="h-5 w-5 text-amber-500" />}>
          {streakData.map((item) => (
            <StreakItem key={item.title} {...item} />
          ))}
        </Section>
        
        <Section title="This Week" icon={<Calendar className="h-5 w-5 text-muted-foreground" />}>
          {thisWeekData.map((item) => (
            <ThisWeekItem key={item.title} {...item} />
          ))}
          <div>
            <ThisWeekItem icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />} title="Consistency Score" value="92%" />
            <Progress value={92} className="h-2 mt-2" />
          </div>
        </Section>

        <Section title="Achievements" icon={<Trophy className="h-5 w-5 text-yellow-500" />}>
          {achievementsData.map((item) => (
            <div key={item.title} className="flex items-center justify-between py-2 border-b border-border/50">
              <p className="text-sm text-muted-foreground">{item.title}</p>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </Section>

        <div className="p-4 bg-green-500/10 rounded-lg text-center">
          <p className="font-bold text-green-800 dark:text-green-200">Keep it up!</p>
          <p className="text-sm text-green-700 dark:text-green-300">You&apos;re on track for your best month yet. 🎉</p>
        </div>
      </CardContent>
    </Card>
  );
}
