"use client";

import { useState } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { MealAccordion, FoodItem, MealCategory } from '@/components/nutrition/meal-accordion';
import { MealPlanView } from '@/components/nutrition/meal-plan-view';
import { NutritionHabitTracker } from '@/components/nutrition/nutrition-habit-tracker';
import { NutritionResources } from '@/components/nutrition/nutrition-resources';
import { NutritionSummary } from '@/components/dashboard/nutrition-summary';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Flame, Droplets, Utensils, Target, Sparkles, BookOpen, CheckCircle2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Accordion } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const initialDailyLog: Record<MealCategory, FoodItem[]> = {
  Breakfast: [
    { id: '1', food: 'Oatmeal with berries and nuts', calories: 450, protein: 20 },
  ],
  Lunch: [
    { id: '2', food: 'Grilled chicken salad', calories: 600, protein: 45 },
  ],
  Dinner: [
    { id: '3', food: 'Salmon with quinoa and roasted broccoli', calories: 750, protein: 50 },
  ],
  Snacks: [
    { id: '4', food: 'Greek yogurt, apple', calories: 400, protein: 25 },
  ],
};

const dailyGoals = {
  calories: 2500,
  protein: 180,
  water: 8
};

const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function NutritionPage() {
  const [dailyLog, setDailyLog] = useState(initialDailyLog);
  const [caloriesConfirmed, setCaloriesConfirmed] = useState(false);
  const [waterIntake, setWaterIntake] = useState(4);

  const dailyTotals = Object.values(dailyLog).flat().reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      return acc;
    },
    { calories: 0, protein: 0 }
  );

  const updateLog = (meal: MealCategory, updatedItems: FoodItem[]) => {
    setDailyLog(prevLog => ({
      ...prevLog,
      [meal]: updatedItems
    }));
  };

  const handleAddWater = () => {
    if (waterIntake < dailyGoals.water) {
      setWaterIntake(prev => prev + 1);
    }
  };

  return (
    <SidebarProvider>
      <ClientSidebar />
      <SidebarInset>
        <div className="min-h-screen text-foreground p-4 sm:p-6 lg:p-8 bg-primary/5">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="space-y-2 mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-3">
                <Utensils className="w-8 h-8 text-primary"/>
                Nutrition Hub
              </h1>
              <p className="text-muted-foreground">
                Your central place for all things nutrition. Track, plan, and build habits.
              </p>
            </div>
            
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Flame className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-bold text-xl">{dailyTotals.calories.toLocaleString()} <span className="text-sm text-muted-foreground">/ {dailyGoals.calories.toLocaleString()}</span></p>
                      <p className="text-xs text-muted-foreground">Calories</p>
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-bold text-xl">{dailyTotals.protein}g <span className="text-sm text-muted-foreground">/ {dailyGoals.protein}g</span></p>
                      <p className="text-xs text-muted-foreground">Protein</p>
                    </div>
                  </div>
                  <Separator orientation="vertical" className="h-8" />
                  <div className="flex items-center gap-3">
                    <Droplets className="w-6 h-6 text-primary" />
                    <div>
                      <p className="font-bold text-xl">{waterIntake} <span className="text-sm text-muted-foreground">/ {dailyGoals.water}</span></p>
                      <p className="text-xs text-muted-foreground">Glasses Water</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Button onClick={handleAddWater} disabled={waterIntake >= dailyGoals.water}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Log Water
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="tracking">
              <TabsList className="mb-4 inline-flex items-center justify-center rounded-full bg-secondary p-1">
                <TabsTrigger value="tracking">
                  <Target className="mr-2 h-4 w-4" />
                  Daily Tracking
                </TabsTrigger>
                <TabsTrigger value="meal-plan">
                  <Utensils className="mr-2 h-4" />
                  Meal Plan
                </TabsTrigger>
                <TabsTrigger value="habits">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Habits
                </TabsTrigger>
                <TabsTrigger value="resources">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Resources
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tracking" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        <h3 className="text-xl font-semibold mb-4">Today&apos;s Food Log</h3>
                        <Accordion type="multiple" defaultValue={mealCategories} className="w-full space-y-2">
                          {mealCategories.map(meal => (
                            <MealAccordion 
                              key={meal}
                              meal={meal}
                              items={dailyLog[meal]}
                              onUpdate={(updatedItems) => updateLog(meal, updatedItems)}
                            />
                          ))}
                        </Accordion>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="lg:col-span-1 space-y-6">
                    <Card className={cn("border-primary/20", caloriesConfirmed && "border-green-500/50 bg-green-950/20")}>
                      <CardContent className="p-4 flex items-center gap-2">
                        <Checkbox 
                          id="calories-confirmed" 
                          checked={caloriesConfirmed} 
                          onCheckedChange={(checked) => setCaloriesConfirmed(!!checked)} 
                        />
                        <label 
                          htmlFor="calories-confirmed" 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Confirm Calorie Target Hit
                        </label>
                      </CardContent>
                    </Card>
                    <NutritionSummary />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="meal-plan" className="mt-6">
                <MealPlanView />
              </TabsContent>

              <TabsContent value="habits" className="mt-6">
                <NutritionHabitTracker />
              </TabsContent>

              <TabsContent value="resources" className="mt-6">
                <NutritionResources />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
