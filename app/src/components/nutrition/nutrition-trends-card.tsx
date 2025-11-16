"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Droplets, TrendingUp, Target, Calendar, BicepsFlexed, ClipboardEdit, Apple } from "lucide-react";
import type { ReactNode } from "react";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

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

const trendsSummaryData = [
  { title: "Longest Streak", value: "21 days" },
  { title: "Best Week", value: "Week of Oct 20" },
  { title: "Days This Month", value: "18/30 goals hit" },
];

const MacroGridItem = ({ icon, title, value }: { icon: ReactNode; title: string; value: string }) => (
  <div className="flex flex-col items-center justify-center p-4 bg-secondary/50 rounded-lg space-y-2">
    <div className="flex items-center gap-2">
      {icon}
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
    </div>
    <p className="text-lg font-bold text-foreground">{value}</p>
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

export function TargetMacrosCard({ calories, protein, carbs, fat }: MacroTargets) {
  const macroData = [
    {
      icon: <Flame className="h-5 w-5 text-orange-500" />,
      title: "Calories",
      value: `${calories.toLocaleString()}`,
    },
    {
      icon: <BicepsFlexed className="h-5 w-5 text-red-500" />,
      title: "Protein",
      value: `${protein}g`,
    },
    {
      icon: <Apple className="h-5 w-5 text-green-500" />,
      title: "Carbs",
      value: `${carbs}g`,
    },
    {
      icon: <Droplets className="h-5 w-5 text-yellow-500" />,
      title: "Fat",
      value: `${fat}g`,
    },
  ];

  return (
    <Card 
      className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-green-500/50 bg-green-500/10"
      style={{ boxShadow: '0 0 15px oklch(70% 0.19 145 / 0.25), 0 4px 20px oklch(70% 0.19 145 / 0.4)' }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
          Daily Targets
        </CardTitle>
        <CardDescription>
          Your nutrition goals for today.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {macroData.map((item) => (
            <MacroGridItem key={item.title} {...item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActiveStreaksCard() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          Active Streaks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {streakData.map((item) => (
          <StreakItem key={item.title} {...item} />
        ))}
      </CardContent>
    </Card>
  );
}

export function ThisWeekCard() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {thisWeekData.map((item) => (
          <ThisWeekItem key={item.title} {...item} />
        ))}
        <div>
          <ThisWeekItem icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />} title="Consistency Score" value="92%" />
          <Progress value={92} className="h-2 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendsSummaryCard() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trends Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {trendsSummaryData.map((item) => (
            <div key={item.title} className="flex items-center justify-between py-2 border-b border-border/50">
              <p className="text-sm text-muted-foreground">{item.title}</p>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="p-4 bg-green-500/10 rounded-lg text-center">
          <p className="font-bold text-green-800 dark:text-green-200">Keep it up!</p>
          <p className="text-sm text-green-700 dark:text-green-300">You&apos;re on track for your best month yet. 🎉</p>
        </div>
      </CardContent>
    </Card>
  );
}
