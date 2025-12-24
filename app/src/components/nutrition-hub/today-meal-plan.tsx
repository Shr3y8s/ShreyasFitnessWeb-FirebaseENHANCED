"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Calendar, Send, Utensils } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Meal {
  name: string;
  items: string[];
}

interface DayMealPlan {
  day: string;
  meals: Meal[];
}

interface CheckedMeals {
  [key: string]: boolean;
}

interface TodayMealPlanProps {
  weeklyMealPlan: DayMealPlan[];
}

export function TodayMealPlan({ weeklyMealPlan }: TodayMealPlanProps) {
  const [checkedMeals, setCheckedMeals] = useState<CheckedMeals>({});
  const [currentDay, setCurrentDay] = useState<string>('');

  useEffect(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    setCurrentDay(day);
  }, []);

  const dayPlan = useMemo(() => {
    return weeklyMealPlan.find(p => p.day === currentDay);
  }, [currentDay, weeklyMealPlan]);

  const handleCheckedChange = (mealName: string, checked: boolean) => {
    setCheckedMeals(prev => ({ ...prev, [mealName]: checked }));
  };

  if (!dayPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading today&apos;s plan...</p>
        </CardContent>
      </Card>
    );
  }

  const totalMeals = dayPlan.meals.length;
  const completedMeals = Object.values(checkedMeals).filter(Boolean).length;
  const progress = totalMeals > 0 ? (completedMeals / totalMeals) * 100 : 0;
  const isDayComplete = progress === 100;

  return (
    <Card className={cn("border-primary/50 flex flex-col transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5", isDayComplete && "bg-green-500/10 border-green-500/20")}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today&apos;s Plan: {dayPlan.day}
            </CardTitle>
            <CardDescription>Check off your meals as you complete them.</CardDescription>
          </div>
          {isDayComplete && (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 hover:bg-green-100/80 animate-pulse-badge">
              <CheckCircle2 className="mr-1 h-3 w-3 animate-scale-in" />
              Day Complete!
            </Badge>
          )}
        </div>
        <div className="pt-4">
          <Progress value={progress} className="h-2" />
          <p className="text-right text-xs text-muted-foreground mt-1">{Math.round(progress)}% Complete</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* 2x2 Grid Layout for Meals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dayPlan.meals.map((meal) => {
            const isMealChecked = !!checkedMeals[meal.name];
            return (
              <div 
                key={meal.name} 
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300",
                  isMealChecked 
                    ? "bg-background/50 border-muted scale-[0.98] opacity-75" 
                    : "bg-secondary/50 border-secondary hover:bg-secondary hover:shadow-sm"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Checkbox
                    id={`today-${meal.name}`}
                    checked={isMealChecked}
                    onCheckedChange={(checked) => handleCheckedChange(meal.name, !!checked)}
                    className="transition-transform duration-200 data-[state=checked]:scale-110"
                  />
                  <label
                    htmlFor={`today-${meal.name}`}
                    className={cn(
                      "font-semibold text-sm text-primary cursor-pointer transition-all duration-300",
                      isMealChecked && "line-through text-muted-foreground"
                    )}
                  >
                    {meal.name}
                  </label>
                </div>
                <ul className="space-y-1.5 pl-7">
                  {meal.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-start gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                      <span className={cn(
                        "text-sm text-muted-foreground leading-tight",
                        isMealChecked && "line-through text-muted-foreground/50"
                      )}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="bg-secondary/50 p-4 border-t mt-auto">
        <div className="w-full space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Notes for your coach
          </h4>
          <Textarea placeholder="e.g., 'Can I swap the chicken for fish in this meal?'" />
          <Button className="w-full">
            <Send className="mr-2 h-4 w-4" />
            Send Note to Coach
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
