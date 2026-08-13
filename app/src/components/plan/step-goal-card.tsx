"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Footprints } from 'lucide-react';

interface StepGoalCardProps {
  target?: number;
  tips?: string[];
}

export function StepGoalCard({ target, tips }: StepGoalCardProps) {
  // Show nothing if no step goal is set
  if (!target) {
    return null;
  }

  return (
    <Card className="bg-green-500/10 border-2 border-green-500/20 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg sm:text-xl text-green-800 dark:text-green-200">
          <Footprints className="h-6 w-6 shrink-0" />
          <span>Daily Step Goal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* text-5xl is intentional here — the step count is this card's hero
            stat. tabular-nums keeps the digits from shifting width. */}
        <div className="text-center">
            <p className="text-4xl sm:text-5xl font-bold text-green-900 dark:text-green-200 tabular-nums">{target.toLocaleString()}</p>
            <p className="text-sm font-medium text-green-800 dark:text-green-400">steps/day</p>
        </div>
        {tips && tips.length > 0 && (
          <div>
              <h5 className="text-sm font-bold mb-2 text-green-800 dark:text-green-300">Tips to hit your goal:</h5>
              {/* Explicit bullets instead of `list-inside`, which wraps
                  continuation lines under the marker on narrow screens. */}
              <ul className="space-y-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
                      <span className="min-w-0">{tip}</span>
                    </li>
                  ))}
              </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
