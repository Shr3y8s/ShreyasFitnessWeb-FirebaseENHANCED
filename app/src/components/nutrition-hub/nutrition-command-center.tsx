"use client";

import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Plus, Minus, Flame, Droplets, Target, CheckCircle2, Wheat, Beef, BicepsFlexed } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfetti } from '@/hooks/use-confetti';

interface NutritionCommandCenterProps {
  caloriesConsumed: number;
  calorieGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  fatsConsumed: number;
  fatsGoal: number;
  waterConsumed: number;
  waterGoal: number;
  onAddWater: () => void;
  onRemoveWater: () => void;
}

export function NutritionCommandCenter({
  caloriesConsumed,
  calorieGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatsConsumed,
  fatsGoal,
  waterConsumed,
  waterGoal,
  onAddWater,
  onRemoveWater,
}: NutritionCommandCenterProps) {
  // Calculate progress percentages
  const calorieProgress = (caloriesConsumed / calorieGoal) * 100;
  const proteinProgress = (proteinConsumed / proteinGoal) * 100;
  const carbsProgress = (carbsConsumed / carbsGoal) * 100;
  const fatsProgress = (fatsConsumed / fatsGoal) * 100;
  const waterProgress = (waterConsumed / waterGoal) * 100;

  // Calorie status
  const calorieDifference = Math.abs(calorieGoal - caloriesConsumed);
  const calorieState =
    caloriesConsumed > calorieGoal
      ? 'over'
      : caloriesConsumed === calorieGoal
      ? 'met'
      : 'under';

  // Track if all goals are met
  const allGoalsMet =
    calorieState === 'met' &&
    proteinConsumed >= proteinGoal &&
    carbsConsumed >= carbsGoal &&
    fatsConsumed >= fatsGoal &&
    waterConsumed >= waterGoal;

  const { celebrate } = useConfetti();
  const hasTriggeredConfetti = useRef(false);

  // Trigger confetti when all goals are met
  useEffect(() => {
    if (allGoalsMet && !hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = true;
      celebrate();
    }
    // Reset if goals are no longer met
    if (!allGoalsMet && hasTriggeredConfetti.current) {
      hasTriggeredConfetti.current = false;
    }
  }, [allGoalsMet, celebrate]);

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 via-green-50/50 to-green-100/30 shadow-lg transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Calories */}
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-bold text-foreground">Calories</p>
              <div className="flex flex-col items-center gap-2">
                <CircularProgress 
                  value={calorieProgress} 
                  size={70}
                  strokeWidth={7}
                  className={calorieState === 'over' ? 'text-destructive' : undefined}
                >
                  <Flame className="w-5 h-5 text-primary" />
                </CircularProgress>
                <div className="text-center space-y-0.5">
                  <p className="text-lg">
                    <span className="font-bold">{caloriesConsumed.toLocaleString()}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-muted-foreground">{calorieGoal.toLocaleString()}</span>
                  </p>
                  {calorieState === 'met' ? (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Goal Met!</span>
                    </div>
                  ) : (
                    <p className={cn(
                      "text-sm font-semibold",
                      calorieState === 'over' ? 'text-destructive' : 'text-green-600'
                    )}>
                      {calorieDifference.toLocaleString()} {calorieState === 'over' ? 'over' : 'left'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Protein */}
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-bold text-foreground">Protein</p>
              <div className="flex flex-col items-center gap-2">
                <CircularProgress 
                  value={proteinProgress} 
                  size={70}
                  strokeWidth={7}
                  className="text-red-500"
                >
                  <BicepsFlexed className="w-5 h-5 text-red-500" />
                </CircularProgress>
                <div className="text-center space-y-0.5">
                  <p className="text-lg">
                    <span className="font-bold">{proteinConsumed}g</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-muted-foreground">{proteinGoal}g</span>
                  </p>
                  {proteinConsumed >= proteinGoal ? (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Goal Met!</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-600">
                      {proteinGoal - proteinConsumed}g left
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Carbs */}
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-bold text-foreground">Carbs</p>
              <div className="flex flex-col items-center gap-2">
                <CircularProgress 
                  value={carbsProgress} 
                  size={70}
                  strokeWidth={7}
                  className="text-amber-500"
                >
                  <Wheat className="w-5 h-5 text-amber-500" />
                </CircularProgress>
                <div className="text-center space-y-0.5">
                  <p className="text-lg">
                    <span className="font-bold">{carbsConsumed}g</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-muted-foreground">{carbsGoal}g</span>
                  </p>
                  {carbsConsumed >= carbsGoal ? (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Goal Met!</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-600">
                      {carbsGoal - carbsConsumed}g left
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Fats */}
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-bold text-foreground">Fats</p>
              <div className="flex flex-col items-center gap-2">
                <CircularProgress 
                  value={fatsProgress} 
                  size={70}
                  strokeWidth={7}
                  className="text-rose-500"
                >
                  <Beef className="w-5 h-5 text-rose-500" />
                </CircularProgress>
                <div className="text-center space-y-0.5">
                  <p className="text-lg">
                    <span className="font-bold">{fatsConsumed}g</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-muted-foreground">{fatsGoal}g</span>
                  </p>
                  {fatsConsumed >= fatsGoal ? (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Goal Met!</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-600">
                      {fatsGoal - fatsConsumed}g left
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Water */}
            <div className="flex flex-col items-center space-y-2">
              <p className="text-sm font-bold text-foreground">Water</p>
              <div className="flex flex-col items-center gap-2">
                <CircularProgress 
                  value={waterProgress} 
                  size={70}
                  strokeWidth={7}
                  className="text-blue-500"
                >
                  <Droplets className="w-5 h-5 text-blue-500" />
                </CircularProgress>
                <div className="text-center space-y-0.5">
                  <p className="text-lg">
                    <span className="font-bold">{waterConsumed}oz</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="font-bold text-muted-foreground">{waterGoal}oz</span>
                  </p>
                  {waterConsumed >= waterGoal ? (
                    <div className="flex items-center justify-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Goal Met!</span>
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-green-600">
                      {waterGoal - waterConsumed}oz left
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      onClick={onRemoveWater}
                      disabled={waterConsumed === 0}
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-blue-500/10"
                    >
                      <Minus className="h-3 w-3 text-blue-500" />
                    </Button>
                    <Button
                      onClick={onAddWater}
                      disabled={waterConsumed >= waterGoal}
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 hover:bg-blue-500/10"
                    >
                      <Plus className="h-3 w-3 text-blue-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
