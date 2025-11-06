"use client";

import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { BrainCircuit, Activity, Bed, TrendingUp, TrendingDown, ArrowRight, Dumbbell, Utensils, Pin, Check, Frown } from "lucide-react";
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const subjectiveTrendData = {
    energy: { previous: 3, current: 4 },
    sleep: { previous: 4, current: 4 },
    mood: { previous: 3, current: 5 },
};

const adherenceTrendData = {
    workouts: { previous: 3, current: 2 },
    nutrition: { previous: 4, current: 3 },
}

const metricConfig: { [key: string]: { label: string; icon: ReactNode } } = {
    energy: { label: "Energy", icon: <Activity className="h-5 w-5 icon-hover-bounce" /> },
    sleep: { label: "Sleep", icon: <Bed className="h-5 w-5 icon-hover-bounce" /> },
    mood: { label: "Mood", icon: <BrainCircuit className="h-5 w-5 icon-hover-bounce" /> },
    workouts: { label: "Workout Difficulty", icon: <Dumbbell className="h-5 w-5 icon-hover-bounce" /> },
    nutrition: { label: "Nutrition Adherence", icon: <Utensils className="h-5 w-5 icon-hover-bounce" /> },
};


const TrendIcon = ({ current, previous, lowerIsBetter = false }: { current: number; previous: number, lowerIsBetter?: boolean }) => {
    if (current > previous) return <TrendingUp className={cn("h-5 w-5 animate-bounce-subtle", lowerIsBetter ? "text-red-500" : "text-green-500")} />;
    if (current < previous) return <TrendingDown className={cn("h-5 w-5 animate-bounce-subtle", lowerIsBetter ? "text-green-500" : "text-red-500")} />;
    return <ArrowRight className="h-5 w-5 text-muted-foreground" />;
};

const getRatingColor = (value: number) => {
    if (value >= 4) return "text-green-500";
    if (value === 3) return "text-yellow-500";
    return "text-red-500";
}

const getDifficultyColor = (value: number) => {
    if (value <= 2) return "text-green-500";
    if (value === 3) return "text-yellow-500";
    return "text-red-500";
}

const lastWeekNotes = {
    wins: "Hit a new PR on deadlifts and felt strong all week.",
    challenges: "Struggled with sleep on Tuesday night, which made Wednesday's workout tough."
}

export function QualitativeTrends() {
    return (
        <div className="space-y-6">
            <Card className="card-hover-lift border-primary/50 gradient-accent-gold animate-fade-in-up">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2"><Pin className="text-primary icon-hover-rotate" /> Personal Reflection</h3>
                    <CardDescription>Review your notes from last week as you reflect on this one.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Check className="text-green-500 h-4 w-4 icon-hover-bounce" /> Wins</h4>
                        <p className="text-sm italic text-muted-foreground p-3 bg-background rounded-md">&quot;{lastWeekNotes.wins}&quot;</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Frown className="text-red-500 h-4 w-4 icon-hover-bounce" /> Challenges</h4>
                        <p className="text-sm italic text-muted-foreground p-3 bg-background rounded-md">&quot;{lastWeekNotes.challenges}&quot;</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="card-hover-lift border-primary/50 animate-fade-in-up stagger-1">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Weekly Subjective Trends</h3>
                    <CardDescription>Your subjective feedback week-over-week.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(subjectiveTrendData).map(([key, values]) => {
                        const config = metricConfig[key];
                        return (
                            <div key={key} className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">{config.icon} {config.label}</h4>
                                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                                    <div className="text-center">
                                        <p className={cn("text-3xl font-bold number-emphasis animate-count-up", getRatingColor(values.previous))}>{values.previous}</p>
                                        <p className="text-xs text-muted-foreground">Last Week</p>
                                    </div>
                                    <TrendIcon current={values.current} previous={values.previous} />
                                    <div className="text-center">
                                        <p className={cn("text-3xl font-bold number-emphasis animate-count-up", getRatingColor(values.current))}>{values.current}</p>
                                        <p className="text-xs text-muted-foreground">This Week</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            <Card className="card-hover-lift border-primary/50 animate-fade-in-up stagger-2">
                <CardHeader>
                    <h3 className="text-xl font-semibold leading-none tracking-tight">Adherence Trends</h3>
                    <CardDescription>How your adherence difficulty is trending.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {Object.entries(adherenceTrendData).map(([key, values]) => {
                        const config = metricConfig[key];
                        return (
                            <div key={key} className="space-y-2">
                                <h4 className="font-semibold flex items-center gap-2">{config.icon} {config.label}</h4>
                                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                                    <div className="text-center">
                                        <p className={cn("text-3xl font-bold number-emphasis animate-count-up", getDifficultyColor(values.previous))}>{values.previous}</p>
                                        <p className="text-xs text-muted-foreground">Last Week</p>
                                    </div>
                                    <TrendIcon current={values.current} previous={values.previous} lowerIsBetter />
                                    <div className="text-center">
                                        <p className={cn("text-3xl font-bold number-emphasis animate-count-up", getDifficultyColor(values.current))}>{values.current}</p>
                                        <p className="text-xs text-muted-foreground">This Week</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
