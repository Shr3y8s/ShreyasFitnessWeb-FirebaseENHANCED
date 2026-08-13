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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flame, ArrowRight, Drumstick, Salad, Droplet, Clock, Leaf, CircleDot, Target, Calendar, Check, type LucideIcon } from 'lucide-react';
import { NutritionApproach, NutritionHabit, MacroTrackingData, MealPlanData, PlannedMeal } from '@/types/plan';
import { NutritionApproachDisplay } from '@/components/nutrition-hub/nutrition-approach-display';

// Icon mapper for dynamic icon rendering
const iconMap: Record<string, LucideIcon> = {
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
    macroTracking?: MacroTrackingData;
    mealPlan?: MealPlanData;
  };
}

// Approach badge styles
const approachBadgeStyles = {
  healthy_habits: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  macro_tracking: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  meal_plan: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
};

const approachNames = {
  healthy_habits: 'Healthy Habits',
  macro_tracking: 'Macro Tracking',
  meal_plan: 'Meal Plan',
};

export function ClientNutritionProtocol({ assignedApproach, lastUpdated, nutritionData }: ClientNutritionProtocolProps) {
  const healthyHabits: NutritionHabit[] = nutritionData?.healthyHabits?.habits || [];
  const macroTracking = nutritionData?.macroTracking || null;
  const mealPlan = nutritionData?.mealPlan || null;

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Not configured yet';
    return `Last updated: ${lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
    <div className="space-y-6">
      {/* Educational Approach Display */}
      <NutritionApproachDisplay 
        assignedApproach={assignedApproach}
        trainerName="Your Coach"
        assignedDate={lastUpdated}
      />

      {/* Protocol Details Card */}
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      {/* "Last updated" as a wrapping flex sibling, not absolutely positioned —
          see the matching note in client-training-protocol.tsx. */}
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-3 text-lg sm:text-xl min-w-0">
            <Flame className="w-6 h-6 shrink-0 text-primary" />
            <span>Nutrition Protocol</span>
          </CardTitle>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatLastUpdated()}
          </span>
        </div>
        <CardDescription>
          Your personalized nutrition approach and guidelines
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Approach Badge */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Your Approach:</span>
            <Badge className={`${approachBadgeStyles[assignedApproach]} text-sm px-3 py-1`}>
              {approachNames[assignedApproach]}
            </Badge>
          </div>
        </div>

        {/* Healthy Habits Content */}
        {assignedApproach === 'healthy_habits' && (
          <div className="space-y-4">
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                💡 Beginner-Friendly Approach
              </p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                Build healthy habits without strict tracking
              </p>
            </div>

            {healthyHabits.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Your Daily Habits
                </h3>
                <div className="space-y-2">
                  {healthyHabits.map((habit) => (
                    <div key={habit.id} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg border">
                      <div className="flex-shrink-0 mt-0.5">
                        <HabitIcon 
                          iconName={habit.icon} 
                          className={`h-4 w-4 ${iconColorMap[habit.category] || 'text-gray-500'}`} 
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{habit.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{habit.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Your trainer will configure your habits soon
                </p>
              </div>
            )}

            <div className="p-3 bg-green-500/10 rounded-lg text-center border border-green-500/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                Focus on <span className="font-bold">CONSISTENCY</span> over perfection!
              </p>
            </div>
          </div>
        )}

        {/* Macro Tracking Content */}
        {assignedApproach === 'macro_tracking' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                📊 Precision Approach
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                Track your macros to hit specific targets
              </p>
            </div>

            {macroTracking ? (
              <>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Daily Targets
                  </h3>
                  {/* 2-up on phones with tighter padding so 4-digit calorie
                      values don't crowd their cell; 4-up from md. */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                    {macroTracking.calories && (
                      <div className="p-2.5 sm:p-3 bg-primary/5 rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground">Calories</p>
                        <p className="text-lg sm:text-xl font-bold text-blue-600 tabular-nums">{macroTracking.calories}</p>
                      </div>
                    )}
                    {macroTracking.protein && (
                      <div className="p-2.5 sm:p-3 bg-primary/5 rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground">Protein</p>
                        <p className="text-lg sm:text-xl font-bold text-rose-600 tabular-nums">{macroTracking.protein}g</p>
                        {macroTracking.proteinPercentage && (
                          <p className="text-xs text-muted-foreground tabular-nums">{macroTracking.proteinPercentage}%</p>
                        )}
                      </div>
                    )}
                    {macroTracking.carbs && (
                      <div className="p-2.5 sm:p-3 bg-primary/5 rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground">Carbs</p>
                        <p className="text-lg sm:text-xl font-bold text-amber-600 tabular-nums">{macroTracking.carbs}g</p>
                        {macroTracking.carbsPercentage && (
                          <p className="text-xs text-muted-foreground tabular-nums">{macroTracking.carbsPercentage}%</p>
                        )}
                      </div>
                    )}
                    {macroTracking.fats && (
                      <div className="p-2.5 sm:p-3 bg-primary/5 rounded-lg text-center border">
                        <p className="text-xs text-muted-foreground">Fats</p>
                        <p className="text-lg sm:text-xl font-bold text-purple-600 tabular-nums">{macroTracking.fats}g</p>
                        {macroTracking.fatsPercentage && (
                          <p className="text-xs text-muted-foreground tabular-nums">{macroTracking.fatsPercentage}%</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {macroTracking.timing && macroTracking.timing.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Meal Timing:</h3>
                    <ul className="space-y-1.5">
                      {macroTracking.timing.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {macroTracking.guidelines && macroTracking.guidelines.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 text-sm">Guidelines:</h3>
                    <ul className="space-y-1.5">
                      {macroTracking.guidelines.map((item: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Your trainer will configure your macro targets soon
                </p>
              </div>
            )}
          </div>
        )}

        {/* Meal Plan Content */}
        {assignedApproach === 'meal_plan' && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <p className="text-sm font-medium text-purple-800 dark:text-purple-300">
                📋 Structured Approach
              </p>
              <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                Follow your custom weekly meal plan
              </p>
            </div>

            {mealPlan && mealPlan.weeklyPlan && mealPlan.weeklyPlan.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  This Week&apos;s Plan Preview
                </h3>
                
                {/* Show first day as example */}
                <div className="p-4 bg-background/50 rounded-lg border">
                  <p className="font-medium text-sm mb-3">{mealPlan.weeklyPlan[0].day} Example:</p>
                  <div className="space-y-2">
                    {mealPlan.weeklyPlan[0].meals.slice(0, 3).map((meal: PlannedMeal, index: number) => (
                      <div key={index} className="text-sm">
                        <span className="font-medium">{meal.name}:</span>{' '}
                        <span className="text-muted-foreground">
                          {meal.items.slice(0, 2).join(', ')}
                          {meal.items.length > 2 && '...'}
                        </span>
                      </div>
                    ))}
                    {mealPlan.weeklyPlan[0].meals.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">
                        + {mealPlan.weeklyPlan[0].meals.length - 3} more meals
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-2">
                  View full 7-day meal plan in Nutrition Hub
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  Your trainer will create your meal plan soon
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA Button */}
        <div className="pt-4 border-t">
          <Link href="/dashboard/client/nutrition" className="block">
            <Button size="lg" className="w-full gap-2">
              Go to Nutrition Hub
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Track your nutrition and view detailed plans
          </p>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
