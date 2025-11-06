"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Utensils, Dumbbell, Footprints, Droplets, Check, Trophy, ArrowUp, ArrowDown, ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AdherencePeriod = 'today' | 'weekly' | 'monthly';

interface Habit {
    id: string;
    title: string;
    icon: ReactNode;
    adherence: {
        today: number;
        yesterday: number;
        weekly: number;
        monthly: number;
    };
    weeklyLog: boolean[];
}

const habits: Habit[] = [
    {
        id: 'meal-plan',
        title: 'Meal Plan & Macros',
        icon: <Utensils className="h-5 w-5" />,
        adherence: { today: 95, yesterday: 80, weekly: 88, monthly: 92 },
        weeklyLog: [true, true, true, false, true, true, false],
    },
    {
        id: 'workouts',
        title: 'Workouts Completed',
        icon: <Dumbbell className="h-5 w-5" />,
        adherence: { today: 100, yesterday: 100, weekly: 100, monthly: 95 },
        weeklyLog: [true, true, false, true, true, false, true],
    },
    {
        id: 'cardio',
        title: 'Cardio (Steps)',
        icon: <Footprints className="h-5 w-5" />,
        adherence: { today: 80, yesterday: 95, weekly: 90, monthly: 85 },
        weeklyLog: [true, false, true, true, true, true, true],
    },
    {
        id: 'water',
        title: 'Water Intake',
        icon: <Droplets className="h-5 w-5" />,
        adherence: { today: 75, yesterday: 70, weekly: 85, monthly: 80 },
        weeklyLog: [true, true, true, true, false, true, true],
    },
];

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

const MonthlyHabitSummary = () => {
    const perfectDays = 17;
    const totalDays = 30;
    const perfectDayRate = Math.round((perfectDays / totalDays) * 100);

    return (
        <div className="p-6 bg-secondary/50 rounded-lg text-center">
            <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold">Monthly Summary</h3>
            <p className="text-muted-foreground text-sm mb-4">Days you completed all 4 core habits.</p>
            <p className="text-5xl font-bold text-primary">{perfectDays} <span className="text-2xl text-muted-foreground">/ {totalDays}</span></p>
            <p className="text-sm font-semibold text-primary mt-1">{perfectDayRate}% Adherence Rate</p>
        </div>
    );
};

export function HabitTracker() {
    const [period, setPeriod] = useState<AdherencePeriod>('today');

    return (
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50">
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
                        <MonthlyHabitSummary />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
