"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Utensils, Dumbbell, Footprints, Droplets, Check, Trophy, ArrowUp, ArrowDown, ArrowRight, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getActivityLogsForDateRange } from '@/lib/activity-api';

type AdherencePeriod = 'today' | 'weekly' | 'monthly';

interface Habit {
    id: string;
    title: string;
    icon: ReactNode;
    type: 'progress' | 'binary'; // progress = show %, binary = show complete/incomplete
    adherence: {
        today: number;
        yesterday: number;
        weekly: number;
        monthly: number;
    };
    weeklyLog: boolean[];
    // For binary habits in monthly view
    monthlyCompletedDays?: number;
    monthlyTotalDays?: number;
}

const DayCheckbox = ({ day, checked }: { day: string; checked: boolean }) => (
    <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{day}</span>
        <div className={cn(
            "w-6 h-6 rounded flex items-center justify-center border",
            checked ? "bg-primary border-primary" : "bg-muted border-border"
        )}>
            {checked && <Check className="h-4 w-4 text-primary-foreground" />}
        </div>
    </div>
);

const HabitRow = ({ habit, period }: { habit: Habit; period: AdherencePeriod }) => {
    const adherence = habit.adherence[period];
    const trend = habit.adherence.today > habit.adherence.yesterday ? 'up' : habit.adherence.today < habit.adherence.yesterday ? 'down' : 'same';
    const TrendIcon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight;
    
    if (period === 'weekly') {
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const completedDays = habit.weeklyLog.filter(day => day).length;
        const totalDays = habit.weeklyLog.length;
        
        return (
            <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="text-primary">{habit.icon}</div>
                        <p className="font-semibold">{habit.title}</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{completedDays}/{totalDays}</p>
                </div>
                <div className="flex justify-around">
                    {days.map((day, index) => (
                        <DayCheckbox key={index} day={day} checked={habit.weeklyLog[index]} />
                    ))}
                </div>
            </div>
        );
    }
    
    if (period === 'today') {
        // Binary habits: Show Complete/Incomplete badges
        if (habit.type === 'binary') {
            const todayComplete = habit.adherence.today === 100;
            const yesterdayComplete = habit.adherence.yesterday === 100;
            
            return (
                <div className="p-4 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="text-primary">{habit.icon}</div>
                        <p className="font-semibold">{habit.title}</p>
                    </div>
                    <div className="flex items-center justify-between text-center">
                        <div className="flex flex-col items-center gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-sm font-semibold",
                                yesterdayComplete 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                                {yesterdayComplete ? "✓ Complete" : "Incomplete"}
                            </span>
                            <p className="text-xs text-muted-foreground">Yesterday</p>
                        </div>
                        <TrendIcon className={cn(
                            "h-6 w-6",
                            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                        )} />
                        <div className="flex flex-col items-center gap-2">
                            <span className={cn(
                                "px-3 py-1 rounded-full text-sm font-semibold",
                                todayComplete 
                                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                                {todayComplete ? "✓ Complete" : "Incomplete"}
                            </span>
                            <p className="text-xs text-muted-foreground">Today</p>
                        </div>
                    </div>
                </div>
            );
        }
        
        // Progress habits: Show percentages
        return (
             <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                    <div className="text-primary">{habit.icon}</div>
                    <p className="font-semibold">{habit.title}</p>
                </div>
                <div className="flex items-center justify-between text-center">
                    <div>
                        <p className="text-2xl font-bold">{habit.adherence.yesterday}%</p>
                        <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                    <TrendIcon className={cn(
                        "h-6 w-6",
                        trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground'
                    )} />
                     <div>
                        <p className="text-2xl font-bold text-primary">{habit.adherence.today}%</p>
                        <p className="text-xs text-muted-foreground">Today</p>
                    </div>
                </div>
            </div>
        )
    }

    // Monthly view
    // Binary habits: Show "X/30 days" format
    if (habit.type === 'binary' && habit.monthlyCompletedDays !== undefined) {
        return (
            <div className="p-4 bg-secondary/50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                        <div className="text-primary">{habit.icon}</div>
                        <p className="font-semibold">{habit.title}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-lg text-primary">
                            {habit.monthlyCompletedDays}/{habit.monthlyTotalDays} days
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {adherence}% completion rate
                        </p>
                    </div>
                </div>
                <Progress value={adherence} />
            </div>
        );
    }
    
    // Progress habits: Show percentage with progress bar
    return (
        <div className="p-4 bg-secondary/50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                    <div className="text-primary">{habit.icon}</div>
                    <p className="font-semibold">{habit.title}</p>
                </div>
                <p className="font-bold text-lg text-primary">{adherence}%</p>
            </div>
            <Progress value={adherence} />
        </div>
    );
};

const MonthlyHabitSummary = ({ habits }: { habits: Habit[] }) => {
    // Calculate perfect days from weekly logs (last 30 days would need more data)
    // For now, use the average of all habits' monthly adherence as approximation
    const avgMonthlyAdherence = Math.round(
        habits.reduce((sum, h) => sum + h.adherence.monthly, 0) / habits.length
    );
    const totalDays = 30;
    const perfectDays = Math.round((avgMonthlyAdherence / 100) * totalDays);

    return (
        <div className="p-6 bg-secondary/50 rounded-lg text-center">
            <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Monthly Summary</h3>
            <p className="text-muted-foreground text-sm mb-4">Days you completed all 4 core habits.</p>
            <p className="text-5xl font-bold text-primary">{perfectDays} <span className="text-2xl text-muted-foreground">/ {totalDays}</span></p>
            <p className="text-sm font-semibold text-primary mt-1">{avgMonthlyAdherence}% Adherence Rate</p>
        </div>
    );
};

export function HabitTracker() {
    const { user } = useAuth();
    const [period, setPeriod] = useState<AdherencePeriod>('today');
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadedTabs, setLoadedTabs] = useState<Record<AdherencePeriod, boolean>>({
        today: false,
        weekly: false,
        monthly: false
    });

    // Load data for specific tab
    const loadTodayData = async () => {
        if (!user) return;
        
        try {
            setLoading(true);

            // Get date strings
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            const todayStr = today.toISOString().split('T')[0];
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            // Parallelize independent queries for Today tab
            const [planSnap, todayActivity, yesterdayActivity] = await Promise.all([
                getDoc(doc(db, 'clientPlans', user.uid)),
                getDoc(doc(db, 'dailyActivities', `${user.uid}_${todayStr}`)),
                getDoc(doc(db, 'dailyActivities', `${user.uid}_${yesterdayStr}`))
            ]);

            const nutritionApproach = planSnap.data()?.nutritionProtocol?.approach || 'macros';
            const nutritionSubcollection = nutritionApproach === 'macros' ? 'meals' :
                                          nutritionApproach === 'meal-plan' ? 'mealPlans' :
                                          'habits';

            // Parallelize nutrition and workout queries
            const [todayNutrition, yesterdayNutrition, workoutSnap] = await Promise.all([
                getDoc(doc(db, 'nutritionLogs', user.uid, nutritionSubcollection, todayStr)),
                getDoc(doc(db, 'nutritionLogs', user.uid, nutritionSubcollection, yesterdayStr)),
                getDocs(query(
                    collection(db, 'workouts'),
                    where('clientId', '==', user.uid),
                    where('status', '==', 'completed'),
                    limit(10) // Only need recent few for today/yesterday
                ))
            ]);

            // Calculate adherence for today/yesterday only
            const calculateNutritionAdherence = (nutritionDoc: any) => {
                if (!nutritionDoc || !nutritionDoc.exists()) return 0;
                return nutritionDoc.data().dayComplete ? 100 : 0;
            };

            const nutritionToday = calculateNutritionAdherence(todayNutrition);
            const nutritionYesterday = calculateNutritionAdherence(yesterdayNutrition);

            const todayWorkouts = workoutSnap.docs.filter(doc => {
                const completedDate = doc.data().completedDate?.toDate();
                return completedDate && completedDate.toISOString().split('T')[0] === todayStr;
            });
            const yesterdayWorkouts = workoutSnap.docs.filter(doc => {
                const completedDate = doc.data().completedDate?.toDate();
                return completedDate && completedDate.toISOString().split('T')[0] === yesterdayStr;
            });

            const workoutToday = todayWorkouts.length > 0 ? 100 : 0;
            const workoutYesterday = yesterdayWorkouts.length > 0 ? 100 : 0;

            const calculateStepsProgress = (activity: any) => {
                if (!activity || !activity.steps || !activity.steps.goal) return 0;
                const progress = (activity.steps.steps / activity.steps.goal) * 100;
                return Math.min(Math.round(progress), 100);
            };

            const stepsToday = todayActivity.exists() ? calculateStepsProgress(todayActivity.data()) : 0;
            const stepsYesterday = yesterdayActivity.exists() ? calculateStepsProgress(yesterdayActivity.data()) : 0;

            const calculateWaterProgress = (activity: any) => {
                if (!activity || !activity.water || !activity.water.goal) return 0;
                const progress = (activity.water.amount / activity.water.goal) * 100;
                return Math.min(Math.round(progress), 100);
            };

            const waterToday = todayActivity.exists() ? calculateWaterProgress(todayActivity.data()) : 0;
            const waterYesterday = yesterdayActivity.exists() ? calculateWaterProgress(yesterdayActivity.data()) : 0;

            const nutritionLabel = nutritionApproach === 'macros' ? 'Macro Tracking' :
                                  nutritionApproach === 'meal-plan' ? 'Meal Plan Adherence' :
                                  'Nutrition Habits';

            // Build habits with today/yesterday data only
            const habitsData: Habit[] = [
                {
                    id: 'nutrition',
                    title: nutritionLabel,
                    icon: <Utensils className="h-5 w-5" />,
                    type: 'binary',
                    adherence: {
                        today: nutritionToday,
                        yesterday: nutritionYesterday,
                        weekly: 0, // Placeholder
                        monthly: 0, // Placeholder
                    },
                    weeklyLog: [],
                },
                {
                    id: 'workouts',
                    title: 'Workouts Completed',
                    icon: <Dumbbell className="h-5 w-5" />,
                    type: 'binary',
                    adherence: {
                        today: workoutToday,
                        yesterday: workoutYesterday,
                        weekly: 0,
                        monthly: 0,
                    },
                    weeklyLog: [],
                },
                {
                    id: 'cardio',
                    title: 'Cardio (Steps)',
                    icon: <Footprints className="h-5 w-5" />,
                    type: 'progress',
                    adherence: {
                        today: stepsToday,
                        yesterday: stepsYesterday,
                        weekly: 0,
                        monthly: 0,
                    },
                    weeklyLog: [],
                },
                {
                    id: 'water',
                    title: 'Water Intake',
                    icon: <Droplets className="h-5 w-5" />,
                    type: 'progress',
                    adherence: {
                        today: waterToday,
                        yesterday: waterYesterday,
                        weekly: 0,
                        monthly: 0,
                    },
                    weeklyLog: [],
                },
            ];

            setHabits(habitsData);
            setLoadedTabs(prev => ({ ...prev, today: true }));
        } catch (error) {
            console.error('Error loading today data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadWeeklyData = async () => {
        if (!user || loadedTabs.weekly) return;
        
        try {
            setLoading(true);

            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
            
            const todayStr = today.toISOString().split('T')[0];
            const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

            // Parallelize all weekly data queries
            const [planSnap, weeklyActivities, weeklyNutritionSnap, workoutSnap] = await Promise.all([
                getDoc(doc(db, 'clientPlans', user.uid)),
                getActivityLogsForDateRange(user.uid, sevenDaysAgoStr, todayStr),
                (async () => {
                    const approach = (await getDoc(doc(db, 'clientPlans', user.uid))).data()?.nutritionProtocol?.approach || 'macros';
                    const subcollection = approach === 'macros' ? 'meals' : approach === 'meal-plan' ? 'mealPlans' : 'habits';
                    return getDocs(query(
                        collection(db, 'nutritionLogs', user.uid, subcollection),
                        where('__name__', '>=', sevenDaysAgoStr),
                        where('__name__', '<=', todayStr),
                        limit(10)
                    ));
                })(),
                getDocs(query(
                    collection(db, 'workouts'),
                    where('clientId', '==', user.uid),
                    where('status', '==', 'completed'),
                    limit(50)
                ))
            ]);

            const nutritionApproach = planSnap.data()?.nutritionProtocol?.approach || 'macros';

            // Calculate weekly stats
            const nutritionWeekly = Math.round((weeklyNutritionSnap.docs.filter(doc => doc.data().dayComplete).length / 7) * 100);
            
            const weeklyWorkouts = workoutSnap.docs.filter(doc => {
                const completedDate = doc.data().completedDate?.toDate();
                if (!completedDate) return false;
                const dateStr = completedDate.toISOString().split('T')[0];
                return dateStr >= sevenDaysAgoStr && dateStr <= todayStr;
            });
            const workoutWeekly = Math.round((weeklyWorkouts.length / 7) * 100);

            const calculateStepsProgress = (activity: any) => {
                if (!activity || !activity.steps || !activity.steps.goal) return 0;
                return Math.min(Math.round((activity.steps.steps / activity.steps.goal) * 100), 100);
            };
            const stepsWeekly = Math.round(
                weeklyActivities.reduce((sum, a) => sum + calculateStepsProgress(a), 0) / 7
            );

            const calculateWaterProgress = (activity: any) => {
                if (!activity || !activity.water || !activity.water.goal) return 0;
                return Math.min(Math.round((activity.water.amount / activity.water.goal) * 100), 100);
            };
            const waterWeekly = Math.round(
                weeklyActivities.reduce((sum, a) => sum + calculateWaterProgress(a), 0) / 7
            );

            // Build weekly logs
            const buildWeeklyLog = (checkFn: (dateStr: string) => boolean) => {
                const log: boolean[] = [];
                for (let i = 6; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    log.push(checkFn(dateStr));
                }
                return log;
            };

            const nutritionWeeklyLog = buildWeeklyLog((dateStr) => {
                return weeklyNutritionSnap.docs.some(doc => doc.id === dateStr && doc.data().dayComplete);
            });

            const workoutWeeklyLog = buildWeeklyLog((dateStr) => {
                return workoutSnap.docs.some(doc => {
                    const completedDate = doc.data().completedDate?.toDate();
                    return completedDate && completedDate.toISOString().split('T')[0] === dateStr;
                });
            });

            const stepsWeeklyLog = buildWeeklyLog((dateStr) => {
                const activity = weeklyActivities.find(a => a.date === dateStr);
                return activity?.steps ? (activity.steps.steps || 0) >= (activity.steps.goal || 0) : false;
            });

            const waterWeeklyLog = buildWeeklyLog((dateStr) => {
                const activity = weeklyActivities.find(a => a.date === dateStr);
                return activity?.water ? (activity.water.amount || 0) >= (activity.water.goal || 0) : false;
            });

            // Update habits with weekly data
            setHabits(prev => prev.map(habit => {
                if (habit.id === 'nutrition') {
                    return { ...habit, adherence: { ...habit.adherence, weekly: nutritionWeekly }, weeklyLog: nutritionWeeklyLog };
                } else if (habit.id === 'workouts') {
                    return { ...habit, adherence: { ...habit.adherence, weekly: workoutWeekly }, weeklyLog: workoutWeeklyLog };
                } else if (habit.id === 'cardio') {
                    return { ...habit, adherence: { ...habit.adherence, weekly: stepsWeekly }, weeklyLog: stepsWeeklyLog };
                } else if (habit.id === 'water') {
                    return { ...habit, adherence: { ...habit.adherence, weekly: waterWeekly }, weeklyLog: waterWeeklyLog };
                }
                return habit;
            }));

            setLoadedTabs(prev => ({ ...prev, weekly: true }));
        } catch (error) {
            console.error('Error loading weekly data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMonthlyData = async () => {
        if (!user || loadedTabs.monthly) return;
        
        try {
            setLoading(true);

            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
            
            const todayStr = today.toISOString().split('T')[0];
            const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

            // Parallelize monthly data queries
            const [planSnap, monthlyActivities, monthlyNutritionSnap, workoutSnap] = await Promise.all([
                getDoc(doc(db, 'clientPlans', user.uid)),
                getActivityLogsForDateRange(user.uid, thirtyDaysAgoStr, todayStr),
                (async () => {
                    const approach = (await getDoc(doc(db, 'clientPlans', user.uid))).data()?.nutritionProtocol?.approach || 'macros';
                    const subcollection = approach === 'macros' ? 'meals' : approach === 'meal-plan' ? 'mealPlans' : 'habits';
                    return getDocs(query(
                        collection(db, 'nutritionLogs', user.uid, subcollection),
                        where('__name__', '>=', thirtyDaysAgoStr),
                        where('__name__', '<=', todayStr),
                        limit(35)
                    ));
                })(),
                getDocs(query(
                    collection(db, 'workouts'),
                    where('clientId', '==', user.uid),
                    where('status', '==', 'completed'),
                    limit(100)
                ))
            ]);

            const nutritionMonthly = Math.round((monthlyNutritionSnap.docs.filter(doc => doc.data().dayComplete).length / 30) * 100);
            
            const monthlyWorkouts = workoutSnap.docs.filter(doc => {
                const completedDate = doc.data().completedDate?.toDate();
                if (!completedDate) return false;
                const dateStr = completedDate.toISOString().split('T')[0];
                return dateStr >= thirtyDaysAgoStr && dateStr <= todayStr;
            });
            const workoutMonthly = Math.round((monthlyWorkouts.length / 30) * 100);

            const calculateStepsProgress = (activity: any) => {
                if (!activity || !activity.steps || !activity.steps.goal) return 0;
                return Math.min(Math.round((activity.steps.steps / activity.steps.goal) * 100), 100);
            };
            const stepsMonthly = Math.round(
                monthlyActivities.reduce((sum, a) => sum + calculateStepsProgress(a), 0) / 30
            );

            const calculateWaterProgress = (activity: any) => {
                if (!activity || !activity.water || !activity.water.goal) return 0;
                return Math.min(Math.round((activity.water.amount / activity.water.goal) * 100), 100);
            };
            const waterMonthly = Math.round(
                monthlyActivities.reduce((sum, a) => sum + calculateWaterProgress(a), 0) / 30
            );

            // Update habits with monthly data
            setHabits(prev => prev.map(habit => {
                if (habit.id === 'nutrition') {
                    return { 
                        ...habit, 
                        adherence: { ...habit.adherence, monthly: nutritionMonthly },
                        monthlyCompletedDays: monthlyNutritionSnap.docs.filter(doc => doc.data().dayComplete).length,
                        monthlyTotalDays: 30
                    };
                } else if (habit.id === 'workouts') {
                    return { 
                        ...habit, 
                        adherence: { ...habit.adherence, monthly: workoutMonthly },
                        monthlyCompletedDays: monthlyWorkouts.length,
                        monthlyTotalDays: 30
                    };
                } else if (habit.id === 'cardio') {
                    return { ...habit, adherence: { ...habit.adherence, monthly: stepsMonthly } };
                } else if (habit.id === 'water') {
                    return { ...habit, adherence: { ...habit.adherence, monthly: waterMonthly } };
                }
                return habit;
            }));

            setLoadedTabs(prev => ({ ...prev, monthly: true }));
        } catch (error) {
            console.error('Error loading monthly data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Load today data on mount
    useEffect(() => {
        if (!user) return;
        loadTodayData();
    }, [user]);

    // Load data when tab changes
    useEffect(() => {
        if (!user) return;
        
        if (period === 'weekly' && !loadedTabs.weekly) {
            loadWeeklyData();
        } else if (period === 'monthly' && !loadedTabs.monthly) {
            loadMonthlyData();
        }
    }, [period, user, loadedTabs.weekly, loadedTabs.monthly]);

    if (loading) {
        return (
            <Card className="card-hover-lift border-primary/50">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Habit Adherence</h3>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (habits.length === 0) {
        return (
            <Card className="card-hover-lift border-primary/50">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Habit Adherence</h3>
                </CardHeader>
                <CardContent className="py-12 text-center text-muted-foreground">
                    No habit data available yet. Start logging your activities!
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50 relative">
            <CardHeader>
                <h3 className="text-xl font-semibold leading-none tracking-tight">Habit Adherence</h3>
            </CardHeader>
            <CardContent>
                <Tabs value={period} onValueChange={(value) => setPeriod(value as AdherencePeriod)} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="weekly">Weekly</TabsTrigger>
                        <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    </TabsList>
                    <TabsContent value="today" className="pt-4">
                        <div className="space-y-4">
                            {habits.map((habit) => (
                                <HabitRow key={habit.id} habit={habit} period="today" />
                            ))}
                        </div>
                    </TabsContent>
                    <TabsContent value="weekly" className="pt-4">
                        <div className="space-y-4">
                            {habits.map((habit) => (
                                <HabitRow key={habit.id} habit={habit} period="weekly" />
                            ))}
                            <div className="pt-4 mt-2 border-t border-border">
                                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                                    <p className="font-semibold">Weekly Total</p>
                                    <p className="text-xl font-bold text-primary">
                                        {habits.reduce((total, habit) => total + habit.weeklyLog.filter(day => day).length, 0)}/{habits.reduce((total, habit) => total + habit.weeklyLog.length, 0)}
                                        <span className="text-sm text-muted-foreground ml-2">
                                            ({Math.round((habits.reduce((total, habit) => total + habit.weeklyLog.filter(day => day).length, 0) / habits.reduce((total, habit) => total + habit.weeklyLog.length, 0)) * 100)}%)
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="monthly" className="pt-4">
                        <div className="space-y-4">
                            {habits.map((habit) => (
                                <HabitRow key={habit.id} habit={habit} period="monthly" />
                            ))}
                            <div className="pt-4 mt-2 border-t border-border">
                                <MonthlyHabitSummary habits={habits} />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
