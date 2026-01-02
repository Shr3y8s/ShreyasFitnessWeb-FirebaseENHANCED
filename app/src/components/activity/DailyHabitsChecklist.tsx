"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Square, Loader2, Check, CheckSquare } from 'lucide-react';
import { CircularProgress } from '@/components/ui/circular-progress';
import { DailyHabit } from '@/types/plan';
import { DailyHabitLog } from '@/types/activity';
import { useToast } from '@/hooks/use-toast';

interface DailyHabitsChecklistProps {
  habits: DailyHabit[];
  completedHabits: DailyHabitLog[];
  onToggle: (habitId: string, completed: boolean) => Promise<void>;
}

export function DailyHabitsChecklist({ habits, completedHabits, onToggle }: DailyHabitsChecklistProps) {
  const { toast } = useToast();
  const [savingHabitId, setSavingHabitId] = useState<string | null>(null);
  const [completingAll, setCompletingAll] = useState(false);

  const isHabitCompleted = (habitId: string): boolean => {
    const log = completedHabits.find(h => h.habitId === habitId);
    return log ? log.completed : false;
  };

  const handleToggle = async (habitId: string) => {
    const currentlyCompleted = isHabitCompleted(habitId);
    const habit = habits.find(h => h.id === habitId);
    setSavingHabitId(habitId);
    
    try {
      await onToggle(habitId, !currentlyCompleted);
      toast({
        title: !currentlyCompleted ? "✅ Habit Complete" : "Habit Unchecked",
        description: habit ? `${habit.title} ${!currentlyCompleted ? 'completed' : 'unchecked'}` : !currentlyCompleted ? 'Habit completed' : 'Habit unchecked',
      });
    } catch (error) {
      console.error('Error toggling habit:', error);
      toast({
        title: "Error",
        description: "Failed to update habit. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingHabitId(null);
    }
  };

  const handleCompleteAll = async () => {
    setCompletingAll(true);
    try {
      // Mark all incomplete habits as complete
      const incompleteHabits = habits.filter(h => !isHabitCompleted(h.id));
      for (const habit of incompleteHabits) {
        await onToggle(habit.id, true);
      }
      toast({
        title: "🎉 All Habits Complete!",
        description: `Great job! All ${habits.length} habits completed today`,
      });
    } catch (error) {
      console.error('Error completing all habits:', error);
      toast({
        title: "Error",
        description: "Failed to complete all habits. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingAll(false);
    }
  };

  if (habits.length === 0) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-green-500" />
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
  const allCompleted = completedCount === habits.length;

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 bg-primary/5 border-primary/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-green-500" />
            Daily Habits
          </CardTitle>
          {/* Complete All Button in Header */}
          {!allCompleted && (
            <Button
              onClick={handleCompleteAll}
              disabled={completingAll}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {completingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Ring with Stats */}
        <div className="flex items-center gap-4 pb-3 border-b">
          {/* Circular Progress Ring */}
          <CircularProgress 
            percentage={percentage} 
            size={80}
            strokeWidth={8}
          />
          
          {/* Stats */}
          <div className="flex-1">
            <p className="text-xl font-bold text-foreground">
              {completedCount} of {habits.length}
            </p>
            <p className="text-sm text-muted-foreground">
              habits completed
            </p>
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
                  disabled={saving || completingAll}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all ${
                    completed
                      ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800'
                      : 'bg-background hover:bg-accent border-border'
                  } ${(saving || completingAll) ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : completed ? (
                      <CheckSquare className="h-5 w-5 text-green-600" />
                    ) : (
                      <Square className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className={`font-medium text-sm ${completed ? 'text-green-900 dark:text-green-300 line-through' : 'text-foreground'}`}>
                      {habit.title}
                    </h4>
                    {habit.description && (
                      <p className={`text-xs mt-0.5 ${completed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
                        {habit.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
        </div>

        {/* Motivational Message */}
        {allCompleted && habits.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              🎉 All habits completed today! Great job!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
