"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckSquare, Square, Loader2 } from 'lucide-react';
import { DailyHabit } from '@/types/plan';
import { DailyHabitLog } from '@/types/activity';

interface DailyHabitsChecklistProps {
  habits: DailyHabit[];
  completedHabits: DailyHabitLog[];
  onToggle: (habitId: string, completed: boolean) => Promise<void>;
}

export function DailyHabitsChecklist({ habits, completedHabits, onToggle }: DailyHabitsChecklistProps) {
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);

  const isHabitCompleted = (habitId: string): boolean => {
    const log = completedHabits.find(h => h.habitId === habitId);
    return log ? log.completed : false;
  };

  const handleToggle = async (habitId: string) => {
    const currentlyCompleted = isHabitCompleted(habitId);
    setSavingHabitId(habitId);
    
    try {
      await onToggle(habitId, !currentlyCompleted);
    } catch (error) {
      console.error('Error toggling habit:', error);
      alert('Failed to update habit. Please try again.');
    } finally {
      setSavingHabitId(null);
    }
  };

  // Get icon component based on iconType
  const getIconElement = (iconType: string) => {
    // For now, use CheckSquare for all - can be expanded later
    return CheckSquare;
  };

  if (habits.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5 text-green-500" />
            Daily Habits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No daily habits configured yet. Your trainer will set these up for you.
          </p>
        </CardContent>
      </Card>
    );
  }

  const completedCount = habits.filter(h => isHabitCompleted(h.id)).length;
  const percentage = (completedCount / habits.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CheckSquare className="h-5 w-5 text-green-500" />
          Daily Habits
          <span className="ml-auto text-sm font-normal text-muted-foreground">
            {completedCount} / {habits.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                percentage >= 100 ? 'bg-green-500' : 'bg-primary'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Habits List */}
        <div className="space-y-2">
          {habits
            .sort((a, b) => a.order - b.order)
            .map((habit) => {
              const completed = isHabitCompleted(habit.id);
              const saving = savingHabitId === habit.id;
              
              return (
                <button
                  key={habit.id}
                  onClick={() => handleToggle(habit.id)}
                  disabled={saving}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    completed
                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  } ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : completed ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className={`font-medium text-sm ${completed ? 'text-green-900 line-through' : 'text-foreground'}`}>
                      {habit.title}
                    </h4>
                    {habit.description && (
                      <p className={`text-xs mt-0.5 ${completed ? 'text-green-700' : 'text-muted-foreground'}`}>
                        {habit.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>

        {/* Motivational Message */}
        {completedCount === habits.length && habits.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800">
              🎉 All habits completed today! Great job!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
