"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Droplets, TrendingUp, Target, Calendar, BicepsFlexed, ClipboardEdit, Apple, Beef, Wheat } from "lucide-react";
import type { ReactNode } from "react";
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface MacroTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface StreakData {
  proteinStreak: number;
  loggingStreak: number;
  waterStreak: number;
  isLoading?: boolean;
  nutritionApproach?: string;
}



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
      icon: <Wheat className="h-5 w-5 text-amber-500" />,
      title: "Carbs",
      value: `${carbs}g`,
    },
    {
      icon: <Beef className="h-5 w-5 text-rose-500" />,
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

export function ActiveStreaksCard({ proteinStreak = 0, loggingStreak = 0, waterStreak = 0, isLoading = false, nutritionApproach }: StreakData) {
  // Only show protein streak for macro_tracking approach
  const showProteinStreak = nutritionApproach === 'macro_tracking';
  
  const streakData = [
    ...(showProteinStreak ? [{
      icon: <BicepsFlexed className="h-5 w-5 text-amber-500" />,
      title: "Protein Goal Streak",
      value: proteinStreak === 0 ? "Start today!" : `${proteinStreak} ${proteinStreak === 1 ? 'day' : 'days'}`,
      isActive: proteinStreak > 0
    }] : []),
    {
      icon: <ClipboardEdit className="h-5 w-5 text-blue-500" />,
      title: "Meal Logging Streak",
      value: loggingStreak === 0 ? "Start today!" : `${loggingStreak} ${loggingStreak === 1 ? 'day' : 'days'}`,
      isActive: loggingStreak > 0
    },
    {
      icon: <Droplets className="h-5 w-5 text-sky-500" />,
      title: "Water Intake Streak",
      value: waterStreak === 0 ? "Start today!" : `${waterStreak} ${waterStreak === 1 ? 'day' : 'days'}`,
      isActive: waterStreak > 0
    },
  ];

  const hasAnyStreak = proteinStreak > 0 || loggingStreak > 0 || waterStreak > 0;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-amber-500" />
          Active Streaks
        </CardTitle>
        <CardDescription>
          {hasAnyStreak ? 'Keep the momentum going! 🔥' : 'Start building your streaks today!'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          streakData.map((item) => (
            <StreakItem key={item.title} {...item} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

interface ThisWeekData {
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  totalDays: number;
}

export function ThisWeekCard({ avgCalories, avgProtein, daysLogged, totalDays }: ThisWeekData) {
  const consistencyScore = totalDays > 0 ? Math.round((daysLogged / totalDays) * 100) : 0;
  
  const thisWeekData = [
    {
      icon: <Flame className="h-5 w-5 text-muted-foreground" />,
      title: "Avg Calories",
      value: avgCalories > 0 ? `${Math.round(avgCalories).toLocaleString()}/day` : "No data",
    },
    {
      icon: <BicepsFlexed className="h-5 w-5 text-muted-foreground" />,
      title: "Avg Protein",
      value: avgProtein > 0 ? `${Math.round(avgProtein)}g/day` : "No data",
    },
  ];

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-green-500/50 bg-gradient-to-br from-green-50 via-green-50/50 to-green-100/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          This Week
        </CardTitle>
        <CardDescription>
          {daysLogged} of {totalDays} days logged
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {thisWeekData.map((item) => (
          <ThisWeekItem key={item.title} {...item} />
        ))}
        <div>
          <ThisWeekItem 
            icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />} 
            title="Consistency Score" 
            value={`${consistencyScore}%`} 
          />
          <Progress value={consistencyScore} className="h-2 mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

interface TrendsSummaryData {
  longestStreak: number;
  bestWeekDate: string;
  monthlyGoalsHit: number;
  monthlyGoalsTotal: number;
}

export function TrendsSummaryCard({ longestStreak, bestWeekDate, monthlyGoalsHit, monthlyGoalsTotal }: TrendsSummaryData) {
  const monthlyPercentage = monthlyGoalsTotal > 0 ? Math.round((monthlyGoalsHit / monthlyGoalsTotal) * 100) : 0;
  
  const trendsSummaryData = [
    { 
      title: "Longest Streak", 
      value: longestStreak > 0 ? `${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}` : "No streaks yet" 
    },
    { 
      title: "Best Week", 
      value: bestWeekDate || "No data yet" 
    },
    { 
      title: "Days This Month", 
      value: `${monthlyGoalsHit}/${monthlyGoalsTotal} goals hit` 
    },
  ];

  const getEncouragementMessage = () => {
    if (monthlyPercentage >= 80) {
      return {
        title: "Outstanding! 🌟",
        message: "You're crushing your nutrition goals!"
      };
    } else if (monthlyPercentage >= 60) {
      return {
        title: "Keep it up! 💪",
        message: "You're on track for a great month!"
      };
    } else if (monthlyPercentage >= 40) {
      return {
        title: "Good progress! 📈",
        message: "You're building momentum!"
      };
    } else if (monthlyGoalsHit > 0) {
      return {
        title: "Getting started! 🚀",
        message: "Every day counts - keep going!"
      };
    } else {
      return {
        title: "Ready to begin? 💫",
        message: "Start logging today to build your trends!"
      };
    }
  };

  const encouragement = getEncouragementMessage();

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trends Summary
        </CardTitle>
        <CardDescription>Your nutrition journey at a glance</CardDescription>
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
          <p className="font-bold text-green-800 dark:text-green-200">{encouragement.title}</p>
          <p className="text-sm text-green-700 dark:text-green-300">{encouragement.message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
