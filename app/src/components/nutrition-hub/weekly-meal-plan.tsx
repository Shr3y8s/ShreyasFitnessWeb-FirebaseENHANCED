"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Utensils, Calendar, ChevronDown } from "lucide-react";
import { cn } from '@/lib/utils';

interface Meal {
  name: string;
  items: string[];
}

interface DayMealPlan {
  day: string;
  meals: Meal[];
}

interface WeeklyMealPlanProps {
  weeklyMealPlan: DayMealPlan[];
}

export function WeeklyMealPlan({ weeklyMealPlan }: WeeklyMealPlanProps) {
  const [currentDay, setCurrentDay] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const day = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    setCurrentDay(day);
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Full Weekly Plan
              </CardTitle>
              <CardDescription>Your complete meal plan for the week.</CardDescription>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                <ChevronDown 
                  className={cn(
                    "h-5 w-5 transition-transform duration-200",
                    isOpen && "rotate-180"
                  )} 
                />
                <span className="sr-only">Toggle weekly plan</span>
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
        {/* Card Grid Layout - 3 columns on desktop, 2 on tablet, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeklyMealPlan.map((dayPlan) => {
            const isToday = dayPlan.day === currentDay;
            return (
              <Card 
                key={dayPlan.day} 
                className={cn(
                  "transition-all duration-300 hover:shadow-md hover:-translate-y-1 border",
                  isToday ? "ring-2 ring-primary bg-primary/5 border-primary/50" : "bg-background/50 border-border hover:border-primary/30"
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {dayPlan.day}
                    </span>
                    {isToday && (
                      <Badge variant="default" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {dayPlan.meals.map((meal) => (
                    <div key={meal.name} className="space-y-1.5">
                      <p className="font-semibold text-sm text-primary">{meal.name}</p>
                      <ul className="space-y-1">
                        {meal.items.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2 ml-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                            <span className="text-xs text-muted-foreground leading-tight">
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
