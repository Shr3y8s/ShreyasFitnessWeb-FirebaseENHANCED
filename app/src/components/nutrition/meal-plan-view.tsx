"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface MealPlan {
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
}

const sampleMealPlan: Record<string, MealPlan> = {
  Monday: {
    breakfast: 'Oatmeal with berries and nuts',
    lunch: 'Grilled chicken salad',
    dinner: 'Salmon with quinoa and broccoli',
    snacks: 'Greek yogurt, apple'
  },
  Tuesday: {
    breakfast: 'Scrambled eggs with avocado toast',
    lunch: 'Turkey wrap with vegetables',
    dinner: 'Stir-fried tofu with brown rice',
    snacks: 'Protein shake, almonds'
  },
  Wednesday: {
    breakfast: 'Greek yogurt parfait',
    lunch: 'Tuna salad sandwich',
    dinner: 'Grilled chicken breast with sweet potato',
    snacks: 'Cottage cheese, carrot sticks'
  },
  Thursday: {
    breakfast: 'Protein pancakes with fruit',
    lunch: 'Chicken caesar salad',
    dinner: 'Lean beef with roasted vegetables',
    snacks: 'Hard-boiled eggs, banana'
  },
  Friday: {
    breakfast: 'Smoothie bowl with granola',
    lunch: 'Grilled fish tacos',
    dinner: 'Turkey meatballs with pasta',
    snacks: 'Mixed nuts, protein bar'
  },
  Saturday: {
    breakfast: 'French toast with berries',
    lunch: 'Chicken poke bowl',
    dinner: 'Grilled steak with vegetables',
    snacks: 'Hummus with veggies'
  },
  Sunday: {
    breakfast: 'Veggie omelet with whole wheat toast',
    lunch: 'Quinoa Buddha bowl',
    dinner: 'Baked cod with asparagus',
    snacks: 'Trail mix, fruit'
  }
};

export function MealPlanView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Weekly Meal Plan</h2>
            <p className="text-sm text-muted-foreground">
              Your personalized nutrition plan for the week
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-4">This Week</span>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const meals = sampleMealPlan[day];
          return (
            <Card key={day} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{day}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">
                    Breakfast
                  </p>
                  <p className="text-sm">{meals.breakfast}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">
                    Lunch
                  </p>
                  <p className="text-sm">{meals.lunch}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">
                    Dinner
                  </p>
                  <p className="text-sm">{meals.dinner}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary uppercase mb-1">
                    Snacks
                  </p>
                  <p className="text-sm text-muted-foreground">{meals.snacks}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Meal Prep Tips</h3>
              <p className="text-sm text-muted-foreground">
                Prepare meals in advance on weekends. Cook proteins in bulk, pre-chop vegetables, 
                and portion snacks to make weekday eating easier and more consistent with your goals.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
