"use client";

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Flame, Utensils, Check, ArrowRight, Lock, Drumstick, Salad, Droplet, Clock, Leaf, CircleDot } from 'lucide-react';
import { NutritionApproach, HABIT_CATEGORY_INFO, NutritionHabit } from '@/types/plan';

// Icon mapper for dynamic icon rendering
const iconMap: Record<string, any> = {
  Utensils,
  Drumstick,
  Salad,
  Droplet,
  Clock,
  Leaf,
  CircleDot
};

const HabitIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = iconMap[iconName] || CircleDot;
  return <IconComponent className={className} />;
};

interface ClientNutritionProtocolProps {
  assignedApproach: NutritionApproach;
  lastUpdated: Date | null;
  nutritionData?: {
    healthyHabits?: { habits: NutritionHabit[] };
    macroTracking?: any;
    mealPlan?: any;
  };
}

// Mock data - for approaches not yet configured
const dailyTargets = [
    { label: 'Calories', value: '2,400', color: 'text-green-500' },
    { label: 'Protein', value: '180g', percentage: '30%', color: 'text-green-500' },
    { label: 'Carbs', value: '240g', percentage: '40%', color: 'text-green-500' },
    { label: 'Fats', value: '80g', percentage: '30%', color: 'text-green-500' },
];

const mealTiming = [
    "Pre-workout: 30-60g carbs",
    "Post-workout: 30g protein within 2 hours",
    "Spread across 4-5 meals throughout the day"
];

const guidelines = [
    "Prioritize whole, minimally processed foods",
    "Track consistently on weekdays, flexible on weekends",
    "Aim for 80% adherence to targets"
];


const wholeFoods = [
    "Lean meats, fish, eggs",
    "Vegetables and fruits",
    "Rice, potatoes, oats",
    "Nuts, seeds, olive oil"
];

export function ClientNutritionProtocol({ assignedApproach, lastUpdated, nutritionData }: ClientNutritionProtocolProps) {
  // Get habits from trainer data or fall back to empty
  const healthyHabits: NutritionHabit[] = nutritionData?.healthyHabits?.habits || [];
  // Format last updated date
  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Not updated';
    return `Last updated: ${lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  // Check if tab is disabled
  const isTabDisabled = (approach: NutritionApproach) => {
    return approach !== assignedApproach;
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Flame className="w-6 h-6 text-primary" />
          <span>Nutrition Protocol</span>
        </CardTitle>
        <CardDescription>
          Your assigned nutrition approach and guidelines.
        </CardDescription>
         <div className="absolute top-4 right-4 text-xs text-muted-foreground">
            {formatLastUpdated()}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={assignedApproach} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger 
              value="healthy_habits" 
              disabled={isTabDisabled('healthy_habits')}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-1">
                Healthy Habits
                {isTabDisabled('healthy_habits') && <Lock className="h-3 w-3" />}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="macro_tracking" 
              disabled={isTabDisabled('macro_tracking')}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-1">
                Macro Tracking
                {isTabDisabled('macro_tracking') && <Lock className="h-3 w-3" />}
              </span>
            </TabsTrigger>
            <TabsTrigger 
              value="meal_plan" 
              disabled={isTabDisabled('meal_plan')}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-1">
                Meal Plan
                {isTabDisabled('meal_plan') && <Lock className="h-3 w-3" />}
              </span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="macro_tracking" className="mt-6">
            <div className="space-y-6">
                <div>
                    <h3 className="font-bold mb-3">Daily Targets:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {dailyTargets.map(target => (
                             <div key={target.label} className="p-4 bg-primary/5 rounded-lg text-center">
                                <p className="text-xs text-muted-foreground">{target.label}</p>
                                <p className={`text-2xl font-bold ${target.color}`}>{target.value}</p>
                                {target.percentage && <p className="text-xs text-muted-foreground">{target.percentage}</p>}
                             </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold mb-2">Meal Timing:</h3>
                    <ul className="space-y-1 list-disc list-inside font-medium text-muted-foreground">
                       {mealTiming.map((item, index) => (
                            <li key={index}>{item}</li>
                       ))}
                    </ul>
                </div>

                 <div>
                    <h3 className="font-bold mb-2">Guidelines:</h3>
                    <ul className="space-y-1 list-disc list-inside font-medium text-muted-foreground">
                        {guidelines.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>
          </TabsContent>

          <TabsContent value="meal_plan" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Utensils className="h-16 w-16 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2 text-center">View Your Meal Plan</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Visit your nutrition hub to see your detailed meal plan, track your meals, and manage your nutrition goals.
              </p>
              <Link href="/nutrition">
                <Button size="lg" className="gap-2">
                  Go to Nutrition Hub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="healthy_habits" className="mt-6 space-y-6">
            <div className="p-4 bg-green-500/10 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-300">Beginner Approach</h3>
                <p className="text-sm text-green-700 dark:text-green-400">Focus on building healthy habits without strict tracking</p>
            </div>

            {healthyHabits.length > 0 ? (
              <div>
                  <h3 className="font-bold mb-3">Daily Habits:</h3>
                  <div className="space-y-3">
                      {healthyHabits.map((habit) => {
                        const categoryInfo = HABIT_CATEGORY_INFO[habit.category];
                        // Soft color mapping for dots
                        const dotColorMap: Record<string, string> = {
                          'meals': 'bg-blue-400',
                          'protein': 'bg-rose-400',
                          'vegetables': 'bg-green-500',
                          'hydration': 'bg-cyan-400',
                          'timing': 'bg-purple-400',
                          'quality': 'bg-emerald-400'
                        };
                        // Icon color mapping
                        const iconColorMap: Record<string, string> = {
                          'meals': 'text-blue-500',
                          'protein': 'text-rose-500',
                          'vegetables': 'text-green-600',
                          'hydration': 'text-cyan-500',
                          'timing': 'text-purple-500',
                          'quality': 'text-emerald-500'
                        };
                        return (
                          <div key={habit.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default">
                              <div className="flex-shrink-0">
                                <HabitIcon iconName={habit.icon} className={`h-5 w-5 ${iconColorMap[habit.category] || 'text-gray-500'}`} />
                              </div>
                              <div className="flex-1">
                                  <p className="font-semibold text-foreground/90">{habit.title}</p>
                                  <p className="text-sm text-muted-foreground mt-0.5">{habit.description}</p>
                              </div>
                          </div>
                        );
                      })}
                  </div>
              </div>
            ) : (
              <div className="p-6 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">
                  Your trainer hasn't configured your nutrition habits yet. Check back soon!
                </p>
              </div>
            )}
            
            <div>
                <h3 className="font-bold mb-2">What Counts as &quot;Whole Foods&quot;?</h3>
                <ul className="space-y-1 list-disc list-inside font-medium text-muted-foreground">
                    {wholeFoods.map((food, index) => (
                        <li key={index}>{food}</li>
                    ))}
                </ul>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
                <p className="font-semibold text-green-800 dark:text-green-300">Focus on <span className="font-bold">CONSISTENCY</span> over perfection!</p>
            </div>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
