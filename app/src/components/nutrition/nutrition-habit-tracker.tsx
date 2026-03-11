"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Lightbulb, Scissors, Shield, Refrigerator, Share2, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getClientPlan } from '@/lib/plan-api';
import { NutritionHabit, HealthyHabitsPreset } from '@/types/plan';

// Static fallback habits (shown when no Firestore data / no preset)
const staticHabits = [
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

// Full "Cut Food in Half" explainer view
function CutFoodInHalfView({ habits }: { habits: NutritionHabit[] }) {
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
      {habits.length > 0 && (
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

// Standard habits view (no preset or custom habits)
function StandardHabitsView({ habits }: { habits: NutritionHabit[] | null }) {
  const displayHabits = habits && habits.length > 0
    ? habits.map((h, i) => ({ title: h.title, description: h.description, key: h.id || String(i) }))
    : staticHabits.map((h, i) => ({ ...h, key: String(i) }));

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
              {displayHabits.map((habit) => (
                <div key={habit.key} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Check className="h-5 w-5 mt-1 text-primary shrink-0" />
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

export function NutritionHabitTracker() {
  const { userData } = useAuth();
  const [preset, setPreset] = useState<HealthyHabitsPreset>(null);
  const [habits, setHabits] = useState<NutritionHabit[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!userData?.uid) return;
    getClientPlan(userData.uid)
      .then((plan) => {
        if (plan?.nutritionProtocol?.healthyHabits) {
          const hh = plan.nutritionProtocol.healthyHabits as { habits: NutritionHabit[]; preset?: HealthyHabitsPreset };
          if (hh.habits) setHabits(hh.habits);
          if (hh.preset) setPreset(hh.preset);
        }
      })
      .catch((err) => console.error('Failed to load nutrition habits:', err))
      .finally(() => setLoaded(true));
  }, [userData?.uid]);

  // While loading, show nothing to avoid flash of wrong content
  if (!loaded) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Loading your nutrition habits...
      </div>
    );
  }

  if (preset === 'cut_food_in_half') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge className="bg-orange-600 text-white">
            <Scissors className="h-3 w-3 mr-1" />
            Cut Food in Half — Active Protocol
          </Badge>
        </div>
        <CutFoodInHalfView habits={habits} />
      </div>
    );
  }

  return <StandardHabitsView habits={habits.length > 0 ? habits : null} />;
}
