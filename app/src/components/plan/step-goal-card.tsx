"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Footprints } from 'lucide-react';

export function StepGoalCard() {
  const stepTips = [
    'Break it up throughout the day',
    'Post-meal walks are great for digestion',
    'Try walking meetings or taking the stairs',
  ];

  return (
    <Card className="relative bg-green-500/10 border-2 border-green-500/20 transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl text-green-800 dark:text-green-200">
          <Footprints className="h-6 w-6" />
          <span>Daily Step Goal</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
            <p className="text-5xl font-bold text-green-900 dark:text-green-200">10,000</p>
            <p className="text-sm font-medium text-green-800 dark:text-green-400">steps/day</p>
        </div>
        <div>
            <h5 className="text-sm font-bold mb-2 text-green-800 dark:text-green-300">Tips to hit your goal:</h5>
            <ul className="space-y-1 list-disc list-inside text-sm font-medium text-green-700 dark:text-green-400">
                {stepTips.map(tip => <li key={tip}>{tip}</li>)}
            </ul>
        </div>
      </CardContent>
    </Card>
  );
}
