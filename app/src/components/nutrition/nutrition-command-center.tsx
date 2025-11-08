"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Minus, Flame, Droplets, Target, CheckCircle2, Wheat, Beef } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 via-green-50/50 to-green-100/30 shadow-lg">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Calories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="font-bold text-2xl">
                      {caloriesConsumed.toLocaleString()}
                      <span className="text-sm text-muted-foreground ml-1">
                        / {calorieGoal.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {calorieState === 'met' ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <div>
                      <p
                        className={cn(
                          'font-bold text-lg',
                          calorieState === 'over' && 'text-destructive',
                          calorieState === 'under' && 'text-green-500'
                        )}
                      >
                        {calorieDifference}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {calorieState === 'over' ? 'Over' : 'Left'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <Progress
                value={calorieProgress}
                className={cn(
                  'h-2',
                  calorieState === 'over' && '[&>div]:bg-destructive'
                )}
              />
            </div>

            {/* Protein */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="font-bold text-2xl">
                      {proteinConsumed}g
                      <span className="text-sm text-muted-foreground ml-1">
                        / {proteinGoal}g
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {proteinConsumed >= proteinGoal ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <div>
                      <p className="font-bold text-lg text-green-500">
                        {proteinGoal - proteinConsumed}g
                      </p>
                      <p className="text-xs text-muted-foreground">Left</p>
                    </div>
                  )}
                </div>
              </div>
              <Progress value={proteinProgress} className="h-2" />
            </div>

            {/* Carbs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Wheat className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="font-bold text-2xl">
                      {carbsConsumed}g
                      <span className="text-sm text-muted-foreground ml-1">
                        / {carbsGoal}g
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {carbsConsumed >= carbsGoal ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <div>
                      <p className="font-bold text-lg text-green-500">
                        {carbsGoal - carbsConsumed}g
                      </p>
                      <p className="text-xs text-muted-foreground">Left</p>
                    </div>
                  )}
                </div>
              </div>
              <Progress value={carbsProgress} className="h-2 [&>div]:bg-amber-500" />
            </div>

            {/* Fats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <Beef className="w-5 h-5 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fats</p>
                    <p className="font-bold text-2xl">
                      {fatsConsumed}g
                      <span className="text-sm text-muted-foreground ml-1">
                        / {fatsGoal}g
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {fatsConsumed >= fatsGoal ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <div>
                      <p className="font-bold text-lg text-green-500">
                        {fatsGoal - fatsConsumed}g
                      </p>
                      <p className="text-xs text-muted-foreground">Left</p>
                    </div>
                  )}
                </div>
              </div>
              <Progress value={fatsProgress} className="h-2 [&>div]:bg-rose-500" />
            </div>

            {/* Water */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Water</p>
                    <p className="font-bold text-2xl">
                      {waterConsumed}oz
                      <span className="text-sm text-muted-foreground ml-1">
                        / {waterGoal}oz
                      </span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end mb-1">
                    <Button
                      onClick={onRemoveWater}
                      disabled={waterConsumed === 0}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-blue-500/10"
                    >
                      <Minus className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                    <Button
                      onClick={onAddWater}
                      disabled={waterConsumed >= waterGoal}
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-blue-500/10"
                    >
                      <Plus className="h-3.5 w-3.5 text-blue-500" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(waterConsumed / 128).toFixed(1)} / {(waterGoal / 128).toFixed(1)} gal
                  </p>
                </div>
              </div>
              <Progress
                value={waterProgress}
                className="h-2 [&>div]:bg-blue-500"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
