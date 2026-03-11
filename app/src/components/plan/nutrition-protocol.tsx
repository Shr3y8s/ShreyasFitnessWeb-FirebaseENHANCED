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
import { Badge } from '@/components/ui/badge';
import { Flame, Calendar, Utensils, Check, ArrowRight, Scissors, Shield, Refrigerator, Share2, Trash2 } from 'lucide-react';
import { NutritionHabit, HealthyHabitsPreset } from '@/types/plan';

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

interface NutritionProtocolProps {
  habits?: NutritionHabit[];
  preset?: HealthyHabitsPreset;
  approach?: string;
  lastUpdated?: string;
}

// Cut Food in Half full explainer component
function CutFoodInHalfView({ habits }: { habits?: NutritionHabit[] }) {
  return (
    <div className="space-y-6">

      {/* Hero Rule */}
      <div className="bg-orange-600 text-white rounded-xl p-5 text-center shadow-md">
        <div className="flex justify-center mb-2">
          <Scissors className="h-8 w-8 text-orange-200" />
        </div>
        <p className="text-sm font-medium text-orange-200 mb-1">Your Coach&apos;s One Rule for You</p>
        <h2 className="text-2xl font-extrabold leading-tight">
          Whatever You&apos;re About to Eat or Drink —<br />
          <span className="text-orange-200">Cut It in Half.</span>
        </h2>
        <p className="text-sm text-orange-100 mt-2">That&apos;s it. That&apos;s the whole plan.</p>
      </div>

      {/* What this means */}
      <div className="space-y-3">
        <h3 className="font-bold text-base">What This Means in Real Life</h3>

        {/* Food */}
        <div className="border rounded-lg p-4 bg-white space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍔</span>
            <p className="font-semibold">Food — Every Meal, Every Plate</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Whatever you would normally put on your plate — take half of that amount. Burger, pasta, rice, salad, fast food, home cooked — anything. Just half the portion. No weighing. No measuring. Just eyeball it and take half.
          </p>
        </div>

        {/* Drinks */}
        <div className="border rounded-lg p-4 bg-white space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">☕</span>
            <p className="font-semibold">Caloric Drinks — Cut the Size in Half</p>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Coffee with cream or sugar, smoothies, juice, non-diet soda, energy drinks, sweet tea — cut the size in half.
            Water, black coffee, and zero-calorie drinks are completely fine as-is. Drink as much of those as you want.
          </p>
        </div>

        {/* What to do with the other half */}
        <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">✂️</span>
            <p className="font-semibold text-orange-900">What To Do With the Other Half</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-orange-100">
              <Refrigerator className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Save it for later</p>
                <p className="text-xs text-muted-foreground">Put it in the fridge. Eating the same food in two sittings still means fewer total calories than eating it all now <em>and</em> reaching for something else later.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-orange-100">
              <Share2 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Share it</p>
                <p className="text-xs text-muted-foreground">Give the other half to someone at the table. Win for you, win for them.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white rounded-lg p-3 border border-orange-100">
              <Trash2 className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm">Throw it away — guilt-free</p>
                <p className="text-xs text-muted-foreground">You have full permission to toss it. Wasting a few bites of food is worth the results you&apos;ll see on the scale.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Why This Works */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
        <h3 className="font-bold text-green-900">Why Your Coach Set You Up With This Approach</h3>
        <p className="text-sm text-green-800 leading-relaxed">
          Going from eating the way you&apos;ve always eaten to suddenly following a strict meal plan or counting every calorie is a massive change — and for most people, it doesn&apos;t stick. Instead, this approach lets you keep eating the foods you love while naturally cutting your calorie intake roughly in half. Over time, you&apos;ll start noticing your portions without even thinking about it, the scale will start to move, and that momentum builds trust in the process. Once you&apos;re seeing results, <strong>that&apos;s</strong> when we start layering in more specific nutrition skills — but for right now, this one simple rule is all you need to focus on.
        </p>
      </div>

      {/* Coach's Guarantee */}
      <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-600" />
          <h3 className="font-bold text-amber-900 text-lg">My Personal Guarantee to You</h3>
        </div>
        <p className="text-sm text-amber-800 leading-relaxed italic">
          &ldquo;I put my money where my mouth is. If you follow this approach consistently for 2 weeks and you don&apos;t see the scale start to move — I will refund your money. No questions asked.
        </p>
        <p className="text-sm text-amber-800 leading-relaxed italic">
          I&apos;m putting my reputation and years of experience on the line for this because I know it works. This isn&apos;t guesswork — it&apos;s a proven, sustainable method I&apos;ve used with clients time and time again. All you have to do is trust the process and do your part: cut it in half, every day.&rdquo;
        </p>
        <p className="text-sm font-bold text-amber-900">— Your Coach</p>
      </div>

      {/* Daily Habits */}
      {habits && habits.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold">Your Daily Habits</h3>
          {habits.map((habit) => (
            <div key={habit.id} className="flex items-start gap-3 p-4 border rounded-lg bg-white">
              <Check className="h-5 w-5 mt-0.5 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-sm">{habit.title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">{habit.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consistency callout */}
      <div className="p-4 bg-orange-600 rounded-xl text-center">
        <p className="font-bold text-white text-base">
          Focus on <span className="text-orange-200">CONSISTENCY</span> over perfection.
        </p>
        <p className="text-sm text-orange-100 mt-1">
          Do this every meal, every day. That&apos;s the whole job.
        </p>
      </div>
    </div>
  );
}

// Standard Healthy Habits view (no preset)
function StandardHabitsView({ habits }: { habits?: NutritionHabit[] }) {
  const displayHabits = habits && habits.length > 0 ? habits : [
    { id: '1', title: "Eat 3 whole food meals per day", description: "Breakfast, lunch, and dinner", icon: 'Utensils', category: 'meals' as const },
    { id: '2', title: "30g protein minimum per meal", description: "About a palm-sized portion of meat/fish", icon: 'Drumstick', category: 'protein' as const },
    { id: '3', title: "Fill half your plate with vegetables", description: "At lunch and dinner", icon: 'Salad', category: 'vegetables' as const },
    { id: '4', title: "Drink 8 glasses of water daily", description: "Stay hydrated throughout the day", icon: 'Droplet', category: 'hydration' as const },
  ];

  const wholeFoods = [
    "Lean meats, fish, eggs",
    "Vegetables and fruits",
    "Rice, potatoes, oats",
    "Nuts, seeds, olive oil"
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-green-500/10 rounded-lg">
        <h3 className="font-semibold text-green-800 dark:text-green-300">Beginner Approach</h3>
        <p className="text-sm text-green-700 dark:text-green-400">Focus on building healthy habits without strict tracking</p>
      </div>

      <div>
        <h3 className="font-bold mb-3">Daily Habits:</h3>
        <div className="space-y-4">
          {displayHabits.map((habit) => (
            <div key={habit.id} className="flex items-start gap-3">
              <Check className="h-5 w-5 mt-1 text-primary shrink-0" />
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
    </div>
  );
}

export function NutritionProtocol({ habits, preset, approach, lastUpdated }: NutritionProtocolProps) {
  const defaultTab = approach === 'macro_tracking' ? 'macro-tracking' :
    approach === 'meal_plan' ? 'meal-plan' : 'healthy-habits';

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Flame className="w-6 h-6 text-primary" />
          <span>Nutrition Protocol</span>
          {preset === 'cut_food_in_half' && (
            <Badge className="bg-orange-600 text-white text-xs ml-1">
              <Scissors className="h-3 w-3 mr-1" />
              Cut Food in Half
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Your coach-assigned nutrition approach.
        </CardDescription>
        <div className="absolute top-4 right-4 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {lastUpdated ? `Last Updated: ${lastUpdated}` : 'Last Updated: Oct 21, 2025'}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
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

          <TabsContent value="healthy-habits" className="mt-6">
            {preset === 'cut_food_in_half' ? (
              <CutFoodInHalfView habits={habits} />
            ) : (
              <StandardHabitsView habits={habits} />
            )}
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
