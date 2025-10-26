"use client";

import { useState } from 'react';
import { ListTodo, Dumbbell, Footprints, Salad, Scale, CalendarPlus } from 'lucide-react';

interface ChecklistItems {
  workout: boolean;
  steps: boolean;
  nutrition: boolean;
  weight: boolean;
  checkin: boolean;
}

export function TodoList() {
  const [checklistItems, setChecklistItems] = useState<ChecklistItems>({
    workout: false,
    steps: false,
    nutrition: false,
    weight: false,
    checkin: false
  });

  const toggleChecklistItem = (item: keyof ChecklistItems) => {
    setChecklistItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const checklistProgress = () => {
    const completed = Object.values(checklistItems).filter(Boolean).length;
    const total = Object.keys(checklistItems).length;
    return Math.round((completed / total) * 100);
  };

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-lg">
      <div className="flex flex-col space-y-1.5 p-6">
        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
          <ListTodo className="text-primary" />
          Daily Checklist
        </h3>
        <p className="text-sm text-muted-foreground">
          Stay on track with your daily and weekly goals.
        </p>
      </div>
      <div className="p-6 pt-0 space-y-4">
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
            <div className="text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium transition-colors">
              Complete today&apos;s workout
            </span>
            <input
              type="checkbox"
              checked={checklistItems.workout}
              onChange={() => toggleChecklistItem('workout')}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
          </label>
          <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
            <div className="text-primary">
              <Footprints className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium transition-colors">Hit 8k-10k steps</span>
            <input
              type="checkbox"
              checked={checklistItems.steps}
              onChange={() => toggleChecklistItem('steps')}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
          </label>
          <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
            <div className="text-primary">
              <Salad className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium transition-colors">
              Follow nutrition plan
            </span>
            <input
              type="checkbox"
              checked={checklistItems.nutrition}
              onChange={() => toggleChecklistItem('nutrition')}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
          </label>
          <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
            <div className="text-primary">
              <Scale className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium transition-colors">Log your weight</span>
            <input
              type="checkbox"
              checked={checklistItems.weight}
              onChange={() => toggleChecklistItem('weight')}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
          </label>
          <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg transition-colors hover:bg-gradient-to-r from-primary/10 to-primary/5 cursor-pointer">
            <div className="text-primary">
              <CalendarPlus className="h-5 w-5" />
            </div>
            <span className="flex-1 text-sm font-medium transition-colors">
              Schedule weekly check-in
            </span>
            <input
              type="checkbox"
              checked={checklistItems.checkin}
              onChange={() => toggleChecklistItem('checkin')}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary focus:ring-2"
            />
          </label>
        </div>
        <div className="space-y-2 pt-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Progress</span>
            <span>{checklistProgress()}%</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${checklistProgress()}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
