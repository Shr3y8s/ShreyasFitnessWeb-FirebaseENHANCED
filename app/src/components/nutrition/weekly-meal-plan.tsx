"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, Utensils } from "lucide-react";

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
  const [openDay, setOpenDay] = useState<string | undefined>('Monday');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          Full Weekly Plan
        </CardTitle>
        <CardDescription>Your complete meal plan for the week.</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" value={openDay} onValueChange={setOpenDay} collapsible className="w-full">
          {weeklyMealPlan.map((dayPlan) => (
            <AccordionItem value={dayPlan.day} key={dayPlan.day} className="border-b-0">
              <AccordionTrigger className="text-lg font-semibold hover:no-underline px-4 py-3 bg-secondary/30 rounded-t-lg data-[state=open]:rounded-b-none data-[state=open]:bg-secondary/50">
                <span>{dayPlan.day}</span>
              </AccordionTrigger>
              <AccordionContent className="bg-secondary/50 rounded-b-lg">
                <div className="space-y-4 pt-2 px-4 pb-4 border-t">
                  {dayPlan.meals.map((meal) => {
                    const hasMoreThanTwoItems = meal.items.length > 2;
                    return (
                      <div key={meal.name}>
                        <p className="font-semibold text-sm text-primary mb-2">{meal.name}</p>
                        <ul className="space-y-1.5">
                          {meal.items.slice(0, 2).map((item, itemIndex) => (
                            <li key={`${dayPlan.day}-${meal.name}-${itemIndex}`} className="flex items-start gap-3">
                              <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                        {hasMoreThanTwoItems && (
                          <Collapsible>
                            <CollapsibleContent>
                              <ul className="space-y-1.5 mt-1.5">
                                {meal.items.slice(2).map((item, itemIndex) => (
                                  <li key={itemIndex} className="flex items-start gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                                    <span className="text-sm text-muted-foreground">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </CollapsibleContent>
                            <CollapsibleTrigger asChild>
                              <Button variant="link" className="p-0 h-auto text-xs mt-2 flex items-center gap-1">
                                Show more
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </CollapsibleTrigger>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
