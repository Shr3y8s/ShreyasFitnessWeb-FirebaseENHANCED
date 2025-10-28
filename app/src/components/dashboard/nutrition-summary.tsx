"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Flame,
  Droplets,
  Plus,
  UtensilsCrossed,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutritionSummaryProps {
  onLogMeal?: () => void;
  onAddWater?: () => void;
}

export function NutritionSummary({ onLogMeal, onAddWater }: NutritionSummaryProps) {
  // In a real app, this data would come from props or state management
  const caloriesConsumed = 2200;
  const calorieGoal = 2200;
  const waterConsumed = 64;
  const waterGoal = 128;

  // --- LOGIC FOR CALORIE PROGRESS ---
  const calorieProgress = (caloriesConsumed / calorieGoal) * 100;
  const calorieDifference = Math.abs(calorieGoal - caloriesConsumed);

  // Determine the state: over, under, or met
  const calorieState =
    caloriesConsumed > calorieGoal
      ? 'over'
      : caloriesConsumed === calorieGoal
      ? 'met'
      : 'under';

  // --- LOGIC FOR WATER PROGRESS ---
  const waterProgress = (waterConsumed / waterGoal) * 100;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Nutrition Summary
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily intake at a glance.
          </p>
        </div>
        <Button variant="link" className="text-primary cursor-pointer">
          View Nutrition <span aria-hidden="true">→</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* --- CALORIE SECTION --- */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 divide-x text-center items-center">
            <div>
              <p className="font-bold text-lg">{caloriesConsumed}</p>
              <p className="text-xs text-muted-foreground">Consumed</p>
            </div>
            <div>
              <p className="font-bold text-lg">{calorieGoal}</p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
            {/* Conditional rendering for the difference */}
            <div className="flex flex-col items-center justify-center">
              {calorieState === 'met' ? (
                <CheckCircle className="h-6 w-6 text-primary" />
              ) : (
                <p
                  className={cn(
                    'font-bold text-lg',
                    calorieState === 'over' && 'text-destructive',
                    calorieState === 'under' && 'text-primary'
                  )}
                >
                  {calorieDifference}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {calorieState === 'over'
                  ? 'Over'
                  : calorieState === 'met'
                  ? 'Target Met'
                  : 'Remaining'}
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Calories</span>
              <span>{Math.round(calorieProgress)}%</span>
            </div>
            {/* Conditional styling for the progress bar */}
            <Progress
              value={calorieProgress}
              aria-label={`${Math.round(calorieProgress)}% of calorie goal`}
              className={cn(
                calorieState === 'over' && '[&>div]:bg-destructive'
              )}
            />
          </div>
        </div>

        {/* --- MACROS DISTRIBUTION --- */}
        <div className="space-y-2">
          <h4 className="font-semibold">Macros Distribution</h4>
          <div className="w-full flex h-3 rounded-full overflow-hidden bg-secondary">
            <div
              className="bg-sky-500"
              style={{ width: `40%` }}
              title={`Protein: 40%`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `35%` }}
              title={`Carbs: 35%`}
            />
            <div
              className="bg-rose-500"
              style={{ width: `25%` }}
              title={`Fat: 25%`}
            />
          </div>
          <div className="grid grid-cols-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500" />
              <span>Protein 40%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Carbs 35%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Fat 25%</span>
            </div>
          </div>
        </div>
        
        {/* --- WATER INTAKE --- */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Water Intake
            </h4>
            <span className="text-sm text-muted-foreground">
              {waterConsumed} / {waterGoal} oz
            </span>
          </div>
          <Progress
            value={waterProgress}
            aria-label={`${waterProgress}% of water goal`}
            className="[&>div]:bg-blue-500"
          />
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-4">
        <Button
          onClick={onLogMeal}
          className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary transition-all hover:-translate-y-1 hover:shadow-glow cursor-pointer gap-2"
        >
          <UtensilsCrossed />
          Log Meal
        </Button>
        <Button
          onClick={onAddWater}
          className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border border-blue-500 transition-all hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(59,130,246,0.15),_2px_0_20px_rgba(59,130,246,0.25),_4px_0_25px_rgba(59,130,246,0.15)] cursor-pointer gap-2"
        >
          <Plus />
          Add Water
        </Button>
      </CardFooter>
    </Card>
  );
}
