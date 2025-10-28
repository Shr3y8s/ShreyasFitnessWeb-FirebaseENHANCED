"use client";

import { Target, Dumbbell, Apple } from 'lucide-react';

const goals = [
  {
    id: 1,
    icon: Target,
    title: 'Cardio Endurance',
    description: '3x 30+ min sessions/week',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    id: 2,
    icon: Dumbbell,
    title: 'Build Strength',
    description: 'Progressive compound lifts',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    id: 3,
    icon: Apple,
    title: 'Better Nutrition',
    description: 'Hit protein & water targets',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export function CurrentGoals() {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-glow">
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <h3 className="text-xl font-semibold leading-none tracking-tight">
          Current Goals
        </h3>
        <p className="text-sm text-muted-foreground">
          Your primary objectives. Let&apos;s work towards them together!
        </p>
      </div>
      <div className="p-6 pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {goals.map((goal) => {
            const Icon = goal.icon;
            return (
              <div
                key={goal.id}
                className="flex flex-col items-center text-center p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className={`p-3 rounded-full ${goal.bgColor} mb-2`}>
                  <Icon className={`h-5 w-5 ${goal.color}`} />
                </div>
                <h4 className="font-semibold text-sm mb-1">{goal.title}</h4>
                <p className="text-xs text-muted-foreground leading-tight">
                  {goal.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
