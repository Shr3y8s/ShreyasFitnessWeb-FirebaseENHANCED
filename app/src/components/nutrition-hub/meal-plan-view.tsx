"use client";

import { useState, useEffect } from 'react';
import { TodayMealPlan } from './today-meal-plan';
import { WeeklyMealPlan } from './weekly-meal-plan';
import { useAuth } from '@/lib/auth-context';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { registerListener, unregisterListener } from '@/lib/listener-registry';
import { Utensils } from 'lucide-react';

interface MealItem {
  name: string;
  items: string[];
}

interface DayMealPlan {
  day: string;
  meals: MealItem[];
}

export function MealPlanView() {
  const [weeklyMealPlan, setWeeklyMealPlan] = useState<DayMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const planRef = doc(db, 'clientPlans', user.uid);
    
    const unsubscribe = onSnapshot(
      planRef,
      (docSnap) => {
        try {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const mealPlan = data.nutritionProtocol?.mealPlan?.weeklyPlan || [];
            setWeeklyMealPlan(mealPlan);
            setError(null);
          } else {
            setWeeklyMealPlan([]);
          }
        } catch (err) {
          console.error('Error processing meal plan data:', err);
          setError('Failed to load meal plan');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error loading meal plan:', err);
        setError('Failed to load meal plan');
        setLoading(false);
      }
    );

    registerListener(unsubscribe);

    return () => {
      unregisterListener(unsubscribe);
      unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Utensils className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Unable to load meal plan</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!weeklyMealPlan || weeklyMealPlan.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto">
            <Utensils className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No meal plan assigned yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your trainer will create a personalized meal plan for you soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TodayMealPlan weeklyMealPlan={weeklyMealPlan} />
      <WeeklyMealPlan weeklyMealPlan={weeklyMealPlan} />
    </div>
  );
}
