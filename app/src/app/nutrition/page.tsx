"use client";

import { useState, useRef } from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { MealAccordion, FoodItem, MealCategory } from '@/components/nutrition/meal-accordion';
import { MealPlanView } from '@/components/nutrition/meal-plan-view';
import { NutritionHabitTracker } from '@/components/nutrition/nutrition-habit-tracker';
import { NutritionResources } from '@/components/nutrition/nutrition-resources';
import { NutritionCommandCenter } from '@/components/nutrition/nutrition-command-center';
import { DayCompleteButton } from '@/components/nutrition/day-complete-button';
import { TargetMacrosCard, ActiveStreaksCard, ThisWeekCard, TrendsSummaryCard } from '@/components/nutrition/nutrition-trends-card';
import { NutritionApproachGuide } from '@/components/nutrition/nutrition-approach-guide';
import { Utensils, Target, Sparkles, BookOpen, Upload, X, Image as ImageIcon, CheckCircle2, UploadCloud } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion } from '@/components/ui/accordion';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const initialDailyLog: Record<MealCategory, FoodItem[]> = {
  Breakfast: [
    { id: '1', food: 'Oatmeal with berries and nuts', calories: 450, protein: 20, carbs: 60, fat: 15 },
  ],
  Lunch: [
    { id: '2', food: 'Grilled chicken salad', calories: 600, protein: 45, carbs: 30, fat: 30 },
  ],
  Dinner: [
    { id: '3', food: 'Salmon with quinoa and roasted broccoli', calories: 750, protein: 50, carbs: 55, fat: 35 },
  ],
  Snacks: [
    { id: '4', food: 'Greek yogurt, apple', calories: 400, protein: 25, carbs: 50, fat: 10 },
  ],
};

const dailyGoals = {
  calories: 2500,
  protein: 180,
  carbs: 250,
  fat: 70,
  water: 128 // 1 gallon in oz
};

const mealCategories: MealCategory[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

export default function NutritionPage() {
  const { toast } = useToast();
  const [dailyLog, setDailyLog] = useState(initialDailyLog);
  const [dayComplete, setDayComplete] = useState(false);
  const [waterIntake, setWaterIntake] = useState(64); // Starting at 64 oz (0.5 gallon)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dailyTotals = Object.values(dailyLog).flat().reduce(
    (acc, item) => {
      acc.calories += item.calories;
      acc.protein += item.protein;
      acc.carbs += item.carbs;
      acc.fat += item.fat;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const updateLog = (meal: MealCategory, updatedItems: FoodItem[]) => {
    setDailyLog(prevLog => ({
      ...prevLog,
      [meal]: updatedItems
    }));
  };

  const handleAddWater = () => {
    if (waterIntake < dailyGoals.water) {
      setWaterIntake(prev => prev + 16); // Add 16 oz per click
    }
  };

  const handleRemoveWater = () => {
    if (waterIntake > 0) {
      setWaterIntake(prev => Math.max(0, prev - 16)); // Remove 16 oz per click
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      toast({
        title: "File Selected",
        description: `${file.name} is ready for upload.`,
      });
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleMarkComplete = () => {
    setDayComplete(true);
    toast({
      title: "Day Complete!",
      description: "You've marked your nutrition as complete for the day.",
    });
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
            
            <NutritionCommandCenter
              caloriesConsumed={dailyTotals.calories}
              calorieGoal={dailyGoals.calories}
              proteinConsumed={dailyTotals.protein}
              proteinGoal={dailyGoals.protein}
              carbsConsumed={dailyTotals.carbs}
              carbsGoal={dailyGoals.carbs}
              fatsConsumed={dailyTotals.fat}
              fatsGoal={dailyGoals.fat}
              waterConsumed={waterIntake}
              waterGoal={dailyGoals.water}
              onAddWater={handleAddWater}
              onRemoveWater={handleRemoveWater}
            />

            <NutritionApproachGuide />

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
                  <div className="lg:col-span-2 space-y-4">
                    <Tabs defaultValue="manual" className="w-full">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold">Today&apos;s Food Log</h2>
                        <TabsList className="bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg p-1">
                          <TabsTrigger 
                            value="manual"
                            className="data-[state=active]:bg-green-200/50 dark:data-[state=active]:bg-green-800/50 data-[state=active]:text-green-900 dark:data-[state=active]:text-green-100 rounded-md px-3 py-1 text-sm"
                          >
                            Log Manually
                          </TabsTrigger>
                          <TabsTrigger 
                            value="screenshot"
                            className="data-[state=active]:bg-green-200/50 dark:data-[state=active]:bg-green-800/50 data-[state=active]:text-green-900 dark:data-[state=active]:text-green-100 rounded-md px-3 py-1 text-sm"
                          >
                            Upload Screenshot
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="manual">
                        <Accordion type="multiple" defaultValue={mealCategories} className="w-full space-y-4">
                          {mealCategories.map(meal => (
                            <MealAccordion 
                              key={meal}
                              meal={meal}
                              items={dailyLog[meal]}
                              onUpdate={(updatedItems) => updateLog(meal, updatedItems)}
                            />
                          ))}
                        </Accordion>
                      </TabsContent>

                      <TabsContent value="screenshot">
                        <div className="p-6 bg-secondary/50 border-dashed border-2 rounded-lg text-center space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Using another app like MyFitnessPal? Upload a screenshot of your daily log here for your coach to review.
                          </p>
                          <div className="flex flex-col items-center gap-4">
                            <Input 
                              id="screenshot" 
                              type="file" 
                              className="hidden" 
                              onChange={handleFileUpload} 
                              accept="image/*" 
                              ref={fileInputRef}
                            />
                            <Label 
                              htmlFor="screenshot" 
                              className={cn(
                                "w-full max-w-sm cursor-pointer",
                                buttonVariants({ variant: "outline" })
                              )}
                            >
                              <UploadCloud className="mr-2 h-4 w-4" />
                              {fileName ? `Selected: ${fileName}` : "Choose Screenshot"}
                            </Label>
                            <Button 
                              onClick={handleMarkComplete}
                              className="w-full max-w-sm"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark Day as Complete
                            </Button>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  <div className="lg:col-span-1 space-y-4">
                    <TargetMacrosCard 
                      calories={dailyGoals.calories}
                      protein={dailyGoals.protein}
                      carbs={dailyGoals.carbs}
                      fat={dailyGoals.fat}
                    />
                    <ActiveStreaksCard />
                    <ThisWeekCard />
                    <TrendsSummaryCard />
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
