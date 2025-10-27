"use client";

import { Button } from '@/components/ui/button';
import { Flame, Droplets, Plus } from 'lucide-react';

interface NutritionSummaryProps {
  onLogMeal?: () => void;
  onAddWater?: () => void;
}

export function NutritionSummary({ onLogMeal, onAddWater }: NutritionSummaryProps) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex p-6 flex-row items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
            <Flame className="text-primary" />
            Nutrition Summary
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Your daily intake at a glance.
          </p>
        </div>
        <Button variant="link" className="text-primary -mt-2">
          View Nutrition <span aria-hidden="true">→</span>
        </Button>
      </div>
      <div className="p-6 pt-0 space-y-8">
        {/* Calorie Overview */}
        <div className="space-y-4">
          <div className="grid grid-cols-3 divide-x text-center items-center">
            <div>
              <p className="font-bold text-lg">2200</p>
              <p className="text-xs text-muted-foreground">Consumed</p>
            </div>
            <div>
              <p className="font-bold text-lg">2200</p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary"
              >
                <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
                <path d="m9 11 3 3L22 4"></path>
              </svg>
              <p className="text-xs text-muted-foreground">Target Met</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-muted-foreground mb-1">
              <span>Calories</span>
              <span>100%</span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>

        {/* Macros Distribution */}
        <div className="space-y-2">
          <h4 className="font-semibold">Macros Distribution</h4>
          <div className="w-full flex h-3 rounded-full overflow-hidden bg-secondary">
            <div className="bg-sky-500" style={{ width: '40%' }}></div>
            <div className="bg-amber-500" style={{ width: '35%' }}></div>
            <div className="bg-rose-500" style={{ width: '25%' }}></div>
          </div>
          <div className="grid grid-cols-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              <span>Protein 40%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>Carbs 35%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span>Fat 25%</span>
            </div>
          </div>
        </div>

        {/* Water Intake */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold flex items-center gap-2">
              <Droplets className="h-5 w-5 text-blue-500" />
              Water Intake
            </h4>
            <span className="text-sm text-muted-foreground">64 / 128 oz</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full bg-blue-500 transition-all" style={{ width: '50%' }}></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4 p-6 pt-0">
        <Button
          onClick={onLogMeal}
          className="transition-transform hover:-translate-y-1 hover:shadow-lg"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"></path>
            <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"></path>
            <path d="m2.1 21.8 6.4-6.3"></path>
            <path d="m19 5-7 7"></path>
          </svg>
          Log Meal
        </Button>
        <Button
          onClick={onAddWater}
          variant="outline"
          className="transition-transform hover:-translate-y-1 hover:shadow-lg hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/50"
        >
          <Plus className="mr-2" />
          Add Water
        </Button>
      </div>
    </div>
  );
}
