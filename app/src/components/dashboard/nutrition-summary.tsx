"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Droplets,
  Plus,
  UtensilsCrossed,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { getTodayLocal } from '@/lib/date-utils';
import { NutritionCommandCenter } from '@/components/nutrition-hub/nutrition-command-center';
import { TodayMealPlan } from '@/components/nutrition-hub/today-meal-plan';
import { NutritionHabitTracker } from '@/components/nutrition-hub/nutrition-habit-tracker';
import { registerListener, unregisterListener } from '@/lib/listener-registry';

export function NutritionSummary() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Nutrition approach & goals from clientPlans
  const [approach, setApproach] = useState<string>('macro_tracking');
  const [goals, setGoals] = useState({
    calories: 2400,
    protein: 180,
    carbs: 240,
    fats: 80,
  });

  // Today's totals from nutrition log
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  // Water data from daily activities
  const [waterAmount, setWaterAmount] = useState(0);
  const [waterGoal, setWaterGoal] = useState(128);

  // Meal plan data
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<{ day: string; meals: { name: string; items: string[] }[] }[]>([]);

  // Load plan (approach + macro targets + meal plan)
  useEffect(() => {
    if (!user) return;

    const loadPlan = async () => {
      try {
        const planRef = doc(db, 'clientPlans', user.uid);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
          const data = planSnap.data();
          const protocol = data.nutritionProtocol;

          if (protocol?.approach) {
            setApproach(protocol.approach);
          }

          if (protocol?.macroTracking) {
            const t = protocol.macroTracking;
            setGoals({
              calories: Number(t.calories) || 2400,
              protein: Number(t.protein) || 180,
              carbs: Number(t.carbs) || 240,
              fats: Number(t.fats) || 80,
            });
          }

          if (protocol?.mealPlan?.weeklyPlan) {
            setWeeklyMealPlan(protocol.mealPlan.weeklyPlan);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading nutrition plan:', error);
        setLoading(false);
      }
    };

    loadPlan();
  }, [user]);

  // Subscribe to today's nutrition log (macro tracking only)
  useEffect(() => {
    if (!user || approach !== 'macro_tracking') return;

    const todayStr = getTodayLocal();
    const logRef = doc(db, 'nutritionLogs', user.uid, 'meals', todayStr);

    const unsubscribe = onSnapshot(logRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTotals({
          calories: data.totalCalories || 0,
          protein: data.totalProtein || 0,
          carbs: data.totalCarbs || 0,
          fat: data.totalFat || 0,
        });
      } else {
        setTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      }
    }, (error) => {
      console.error('Error loading nutrition log:', error);
    });

    registerListener(unsubscribe);
    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user, approach]);

  // Subscribe to today's water data (macro tracking only)
  useEffect(() => {
    if (!user || approach !== 'macro_tracking') return;

    const todayStr = getTodayLocal();
    const activityRef = doc(db, 'dailyActivities', `${user.uid}_${todayStr}`);

    const unsubscribe = onSnapshot(activityRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.water) {
          setWaterAmount(data.water.amount || 0);
          setWaterGoal(data.water.goal || 128);
        }
      } else {
        setWaterAmount(0);
        setWaterGoal(128);
      }
    }, (error) => {
      console.error('Error loading water data:', error);
    });

    registerListener(unsubscribe);
    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user, approach]);

  const waterProgress = waterGoal > 0 ? Math.min((waterAmount / waterGoal) * 100, 100) : 0;
  const todayStr = getTodayLocal();

  // Approach badge label
  const approachLabelMap: Record<string, string> = {
    macro_tracking: 'Macro Tracking',
    meal_plan: 'Meal Plan',
    healthy_habits: 'Healthy Habits',
  };
  const approachBadge = approachLabelMap[approach] || '';

  if (loading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ── Healthy Habits approach ─────────────────────────────────────────────
  if (approach === 'healthy_habits') {
    return (
      <NutritionHabitTracker
        selectedDate={todayStr}
        compact={true}
        cardTitle="Nutrition Summary"
        approachBadge={approachBadge}
      />
    );
  }

  // ── Meal Plan approach ───────────────────────────────────────────────────
  if (approach === 'meal_plan') {
    if (weeklyMealPlan.length === 0) {
      return (
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
          <CardHeader className="flex flex-row items-start justify-between pb-3">
            <div>
              <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2 flex-wrap">
                <Flame className="h-5 w-5 text-primary" />
                Nutrition Summary
                {approachBadge && (
                  <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs font-semibold ml-1">
                    {approachBadge}
                  </Badge>
                )}
              </h3>
            </div>
            <Link href="/dashboard/client/nutrition">
              <Button variant="link" className="text-primary cursor-pointer">
                View Nutrition <span aria-hidden="true">→</span>
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="text-center py-8 text-muted-foreground">
            <p>No meal plan configured yet.</p>
            <p className="text-sm mt-1">Your coach will set up your plan soon.</p>
          </CardContent>
        </Card>
      );
    }

    // Render compact TodayMealPlan (no coach notes footer)
    return (
      <TodayMealPlan
        weeklyMealPlan={weeklyMealPlan}
        selectedDate={todayStr}
        compact={true}
        cardTitle="Nutrition Summary"
        approachBadge={approachBadge}
      />
    );
  }

  // ── Macro Tracking approach (default) ───────────────────────────────────
  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2 flex-wrap">
            <Flame className="h-5 w-5 text-primary" />
            Nutrition Summary
            {approachBadge && (
              <Badge className="bg-primary/10 text-primary border border-primary/30 text-xs font-semibold ml-1">
                {approachBadge}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily intake at a glance.
          </p>
        </div>
        <Link href="/dashboard/client/nutrition">
          <Button variant="link" className="text-primary cursor-pointer">
            View Nutrition <span aria-hidden="true">→</span>
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Macro rings - reuse NutritionCommandCenter as-is */}
        <NutritionCommandCenter
          caloriesConsumed={totals.calories}
          calorieGoal={goals.calories}
          proteinConsumed={totals.protein}
          proteinGoal={goals.protein}
          carbsConsumed={totals.carbs}
          carbsGoal={goals.carbs}
          fatsConsumed={totals.fat}
          fatsGoal={goals.fats}
        />

        {/* Water Intake */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Water Intake
            </h4>
            <span className="text-sm text-muted-foreground">
              {waterAmount} / {waterGoal} oz
            </span>
          </div>
          <Progress
            value={waterProgress}
            aria-label={`${Math.round(waterProgress)}% of water goal`}
            className="[&>div]:bg-blue-500"
          />
        </div>

        {/* Action Buttons - aligned with content */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Link href="/dashboard/client/nutrition">
            <Button className="w-full bg-primary/20 text-primary hover:bg-primary/30 border border-primary transition-all hover:-translate-y-1 hover:shadow-glow cursor-pointer gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              Log Meal
            </Button>
          </Link>
          <Link href="/dashboard/client/activity">
            <Button className="w-full bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border border-blue-500 transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(59,130,246,0.15),2px_0_20px_rgba(59,130,246,0.25),4px_0_25px_rgba(59,130,246,0.15)] cursor-pointer gap-2">
              <Plus className="h-4 w-4" />
              Add Water
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
