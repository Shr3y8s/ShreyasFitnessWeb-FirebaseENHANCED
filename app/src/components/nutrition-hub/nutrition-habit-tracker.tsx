"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Flame, Calendar, TrendingUp, Drumstick, Salad, Droplet, Clock, Leaf, CircleDot } from "lucide-react";
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface NutritionHabit {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface HabitCompletions {
  [habitId: string]: boolean;
}

interface DailyCompletion {
  date: string;
  completions: HabitCompletions;
}

// Icon mapper
const iconMap: Record<string, any> = {
  Drumstick,
  Salad,
  Droplet,
  Clock,
  Leaf,
  CircleDot
};

const HabitIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = iconMap[iconName] || CircleDot;
  return <IconComponent className={className} />;
};

// Icon color mapping
const iconColorMap: Record<string, string> = {
  'meals': 'text-blue-500',
  'protein': 'text-rose-500',
  'vegetables': 'text-green-600',
  'hydration': 'text-cyan-500',
  'timing': 'text-purple-500',
  'quality': 'text-emerald-500'
};

interface NutritionHabitTrackerProps {
  selectedDate: string; // YYYY-MM-DD format
  compact?: boolean; // When true, shows only the habits list (no streak/weekly sidebar)
}

export function NutritionHabitTracker({ selectedDate, compact = false }: NutritionHabitTrackerProps) {
  const [habits, setHabits] = useState<NutritionHabit[]>([]);
  const [todayCompletions, setTodayCompletions] = useState<HabitCompletions>({});
  const [weeklyData, setWeeklyData] = useState<DailyCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  
  const { user } = useAuth();

  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getDateDaysAgo = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // Load user's assigned habits
  useEffect(() => {
    const loadHabits = async () => {
      if (!user) return;

      try {
        const planRef = doc(db, 'clientPlans', user.uid);
        const planSnap = await getDoc(planRef);
        
        if (planSnap.exists()) {
          const data = planSnap.data();
          const assignedHabits = data.nutritionProtocol?.healthyHabits?.habits || [];
          setHabits(assignedHabits);
        }
      } catch (error) {
        console.error('Error loading habits:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHabits();
  }, [user]);

  // Load completions for selected date and weekly data
  useEffect(() => {
    const loadCompletions = async () => {
      if (!user || habits.length === 0) return;

      try {
        // Load completions for selected date
        const selectedDateRef = doc(db, 'nutritionLogs', user.uid, 'habits', selectedDate);
        const selectedDateSnap = await getDoc(selectedDateRef);
        
        if (selectedDateSnap.exists()) {
          setTodayCompletions(selectedDateSnap.data() as HabitCompletions);
        } else {
          // Initialize with all habits unchecked
          const initialCompletions: HabitCompletions = {};
          habits.forEach(habit => {
            initialCompletions[habit.id] = false;
          });
          setTodayCompletions(initialCompletions);
        }

        // Load last 7 days for weekly view
        const weeklyPromises = [];
        for (let i = 6; i >= 0; i--) {
          const date = getDateDaysAgo(i);
          weeklyPromises.push(
            getDoc(doc(db, 'nutritionLogs', user.uid, 'habits', date))
          );
        }

        const weeklySnaps = await Promise.all(weeklyPromises);
        const weeklyResults: DailyCompletion[] = weeklySnaps.map((snap, index) => ({
          date: getDateDaysAgo(6 - index),
          completions: snap.exists() ? snap.data() as HabitCompletions : {}
        }));

        setWeeklyData(weeklyResults);
        
        // Calculate streak
        calculateStreak(weeklyResults);
      } catch (error) {
        console.error('Error loading completions:', error);
      }
    };

    loadCompletions();
  }, [user, habits, selectedDate]);

  const calculateStreak = (weekData: DailyCompletion[]) => {
    if (habits.length === 0) return;

    let currentStreak = 0;
    
    // Start from most recent day and work backwards
    for (let i = weekData.length - 1; i >= 0; i--) {
      const dayData = weekData[i];
      const allCompleted = habits.every(habit => dayData.completions[habit.id] === true);
      
      if (allCompleted) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }

    setStreak(currentStreak);
  };

  const handleHabitToggle = async (habitId: string, checked: boolean) => {
    if (!user) return;

    const updatedCompletions = {
      ...todayCompletions,
      [habitId]: checked
    };

    setTodayCompletions(updatedCompletions);

    try {
      const selectedDateRef = doc(db, 'nutritionLogs', user.uid, 'habits', selectedDate);
      await setDoc(selectedDateRef, updatedCompletions);

      // Reload weekly data to update streak
      const weeklyPromises = [];
      for (let i = 6; i >= 0; i--) {
        const date = getDateDaysAgo(i);
        weeklyPromises.push(
          getDoc(doc(db, 'nutritionLogs', user.uid, 'habits', date))
        );
      }
      const weeklySnaps = await Promise.all(weeklyPromises);
      const weeklyResults: DailyCompletion[] = weeklySnaps.map((snap, index) => ({
        date: getDateDaysAgo(6 - index),
        completions: snap.exists() ? snap.data() as HabitCompletions : {}
      }));
      setWeeklyData(weeklyResults);
      calculateStreak(weeklyResults);
    } catch (error) {
      console.error('Error saving completion:', error);
      setTodayCompletions(todayCompletions);
    }
  };

  const getWeeklyProgress = () => {
    if (habits.length === 0) return 0;
    
    let totalPossible = habits.length * weeklyData.length;
    let totalCompleted = 0;

    weeklyData.forEach(day => {
      habits.forEach(habit => {
        if (day.completions[habit.id] === true) {
          totalCompleted++;
        }
      });
    });

    return totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  };

  const getDayLabel = (date: string) => {
    const dayDate = new Date(date + 'T00:00:00');
    return dayDate.toLocaleDateString('en-US', { weekday: 'short' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading habits...</p>
        </div>
      </div>
    );
  }

  if (habits.length === 0) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-6 w-6 text-primary" />
            Daily Habit Tracker
          </CardTitle>
          <CardDescription>
            Track your nutrition habits every day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No habits assigned yet. Your coach will set up habits for you to track.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const todayDate = getTodayDate();
  const isToday = selectedDate === todayDate;
  const completedToday = habits.filter(h => todayCompletions[h.id] === true).length;
  const progressPercent = habits.length > 0 ? (completedToday / habits.length) * 100 : 0;
  const weeklyProgress = getWeeklyProgress();

  // Compact mode: only the habits card
  if (compact) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50 bg-primary/5">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Daily Habits
              </CardTitle>
              <CardDescription>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </CardDescription>
            </div>
            {completedToday === habits.length && habits.length > 0 && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                All Complete! 🎉
              </Badge>
            )}
          </div>
          <div className="pt-4">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-right text-xs text-muted-foreground mt-1">
              {completedToday} of {habits.length} completed
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {habits.map((habit) => {
            const isCompleted = todayCompletions[habit.id] === true;
            return (
              <div
                key={habit.id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border transition-all duration-300",
                  isCompleted
                    ? "bg-background/50 border-muted opacity-75"
                    : "bg-secondary/50 border-secondary hover:bg-secondary hover:shadow-sm"
                )}
              >
                <Checkbox
                  id={`compact-${habit.id}`}
                  checked={isCompleted}
                  onCheckedChange={(checked) => handleHabitToggle(habit.id, !!checked)}
                  className="mt-0.5 transition-transform duration-200 data-[state=checked]:scale-110"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <HabitIcon
                      iconName={habit.icon}
                      className={`h-4 w-4 ${iconColorMap[habit.category] || 'text-gray-500'}`}
                    />
                    <label
                      htmlFor={`compact-${habit.id}`}
                      className={cn(
                        "font-semibold text-sm cursor-pointer transition-all duration-300",
                        isCompleted && "line-through text-muted-foreground"
                      )}
                    >
                      {habit.title}
                    </label>
                  </div>
                  <p className={cn(
                    "text-xs text-muted-foreground",
                    isCompleted && "line-through"
                  )}>
                    {habit.description}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-2">
            <a href="/dashboard/client/nutrition" className="text-sm text-primary hover:underline flex items-center gap-1 justify-end">
              View Nutrition Hub →
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Today's Habits */}
      <div className="lg:col-span-2">
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-primary" />
                  {isToday ? "Today's Habits" : "Daily Habits"}
                </CardTitle>
                <CardDescription>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </CardDescription>
              </div>
              {completedToday === habits.length && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  All Complete! 🎉
                </Badge>
              )}
            </div>
            <div className="pt-4">
              <Progress value={progressPercent} className="h-2" />
              <p className="text-right text-xs text-muted-foreground mt-1">
                {completedToday} of {habits.length} completed
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {habits.map((habit) => {
              const isCompleted = todayCompletions[habit.id] === true;
              return (
                <div
                  key={habit.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border transition-all duration-300",
                    isCompleted
                      ? "bg-background/50 border-muted opacity-75"
                      : "bg-secondary/50 border-secondary hover:bg-secondary hover:shadow-sm"
                  )}
                >
                  <Checkbox
                    id={habit.id}
                    checked={isCompleted}
                    onCheckedChange={(checked) => handleHabitToggle(habit.id, !!checked)}
                    className="mt-0.5 transition-transform duration-200 data-[state=checked]:scale-110"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <HabitIcon
                        iconName={habit.icon}
                        className={`h-4 w-4 ${iconColorMap[habit.category] || 'text-gray-500'}`}
                      />
                      <label
                        htmlFor={habit.id}
                        className={cn(
                          "font-semibold text-sm cursor-pointer transition-all duration-300",
                          isCompleted && "line-through text-muted-foreground"
                        )}
                      >
                        {habit.title}
                      </label>
                    </div>
                    <p className={cn(
                      "text-xs text-muted-foreground",
                      isCompleted && "line-through"
                    )}>
                      {habit.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Stats Sidebar */}
      <div className="space-y-6">
        {/* Streak Card */}
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-orange-500">
                {streak} {streak === 1 ? 'day' : 'days'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {streak > 0 ? 'Keep it going!' : 'Start your streak today!'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Completion Rate</span>
                <span className="font-bold">{weeklyProgress}%</span>
              </div>
              <Progress value={weeklyProgress} className="h-2" />
            </div>

            {/* 7-Day Grid */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Last 7 Days</p>
              <div className="grid grid-cols-7 gap-1">
                {weeklyData.map((day, index) => {
                  const allCompleted = habits.every(h => day.completions[h.id] === true);
                  const isToday = day.date === todayDate;
                  
                  return (
                    <div key={day.date} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        {getDayLabel(day.date)}
                      </div>
                      <div
                        className={cn(
                          "h-10 rounded flex items-center justify-center text-xs font-medium",
                          day.date === selectedDate && "ring-2 ring-primary ring-offset-1",
                          allCompleted
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {allCompleted ? '✓' : '-'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
