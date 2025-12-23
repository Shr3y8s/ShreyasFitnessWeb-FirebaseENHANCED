"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Lightbulb } from "lucide-react";

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

export function NutritionHabitTracker() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Focus on These Habits
          </CardTitle>
          <CardDescription>
            Consistency over perfection. Master these before worrying about strict tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Daily Habits:</h3>
            <div className="space-y-4">
              {healthyHabits.map((habit, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Check className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                  <div>
                    <p className="font-semibold">{habit.title}</p>
                    <p className="text-sm text-muted-foreground">{habit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What are &quot;Whole Foods&quot;?</CardTitle>
          <CardDescription>
            Think of foods that are as close to their natural state as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {wholeFoods.map((food, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <span className="text-sm font-medium">{food}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
