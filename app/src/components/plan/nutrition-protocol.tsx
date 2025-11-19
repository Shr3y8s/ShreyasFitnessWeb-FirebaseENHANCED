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
import { Flame, Calendar, Utensils, Check, ArrowRight } from 'lucide-react';

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


const healthyHabits = [
    { title: "Eat 3 whole food meals per day", description: "Breakfast, lunch, and dinner" },
    { title: "30g protein minimum per meal", description: "About a palm-sized portion of meat/fish" },
    { title: "Fill half your plate with vegetables", description: "At lunch and dinner" },
    { title: "Drink 8 glasses of water daily", description: "Stay hydrated throughout the day" }
];

const wholeFoods = [
    "Lean meats, fish, eggs",
    "Vegetables and fruits",
    "Rice, potatoes, oats",
    "Nuts, seeds, olive oil"
];

export function NutritionProtocol() {
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Flame className="w-6 h-6 text-primary" />
          <span>Nutrition Protocol</span>
        </CardTitle>
        <CardDescription>
          Choose your nutrition approach.
        </CardDescription>
         <div className="absolute top-4 right-4 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            Last Updated: Oct 21, 2025
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="macro-tracking">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="macro-tracking">Macro Tracking</TabsTrigger>
            <TabsTrigger value="meal-plan">Meal Plan</TabsTrigger>
            <TabsTrigger value="healthy-habits">Healthy Habits</TabsTrigger>
          </TabsList>
          
          <TabsContent value="macro-tracking" className="mt-6">
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

          <TabsContent value="meal-plan" className="mt-6">
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

          <TabsContent value="healthy-habits" className="mt-6 space-y-6">
            <div className="p-4 bg-green-500/10 rounded-lg">
                <h3 className="font-semibold text-green-800 dark:text-green-300">Beginner Approach</h3>
                <p className="text-sm text-green-700 dark:text-green-400">Focus on building healthy habits without strict tracking</p>
            </div>

            <div>
                <h3 className="font-bold mb-3">Daily Habits:</h3>
                <div className="space-y-4">
                    {healthyHabits.map((habit, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <Check className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                            <div>
                                <p className="font-bold">{habit.title}</p>
                                <p className="text-sm font-medium text-muted-foreground">{habit.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
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
