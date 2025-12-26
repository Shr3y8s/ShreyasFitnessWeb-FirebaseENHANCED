"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { BrainCircuit, Activity, Bed, TrendingUp, TrendingDown, ArrowRight, Dumbbell, Utensils, Pin, Check, Frown, Loader2, AlertCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { getRecentSurveys, type WeeklySurveyData } from '@/lib/survey-api';

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

export function QualitativeTrends() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [surveys, setSurveys] = useState<WeeklySurveyData[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadSurveys = async () => {
            if (!user) return;
            
            setLoading(true);
            setError(null);
            
            try {
                const recentSurveys = await getRecentSurveys(user.uid, 8);
                setSurveys(recentSurveys);
            } catch (err) {
                setError('Failed to load survey data');
                console.error('Error loading surveys:', err);
            } finally {
                setLoading(false);
            }
        };
        
        loadSurveys();
    }, [user]);

    // Get current week (most recent) and previous week data
    const currentWeek = surveys[0];
    const previousWeek = surveys[1];
    
    // Calculate trends
    const subjectiveTrendData = currentWeek && previousWeek ? {
        energy: { previous: previousWeek.ratings.energy, current: currentWeek.ratings.energy },
        sleep: { previous: previousWeek.ratings.sleep, current: currentWeek.ratings.sleep },
        mood: { previous: previousWeek.ratings.mood, current: currentWeek.ratings.mood },
    } : null;
    
    const adherenceTrendData = currentWeek && previousWeek ? {
        workouts: { previous: previousWeek.adherence.workouts, current: currentWeek.adherence.workouts },
        nutrition: { previous: previousWeek.adherence.nutrition, current: currentWeek.adherence.nutrition },
    } : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-200 bg-red-50/50">
                <CardContent className="flex items-center gap-3 py-6">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <p className="text-sm text-red-800">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (surveys.length === 0) {
        return (
            <Card className="border-primary/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <BrainCircuit className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Survey Data Yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Complete your first weekly survey to start tracking your subjective feedback and see trends over time!
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (surveys.length === 1) {
        return (
            <Card className="border-primary/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Check className="h-12 w-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Great Start!</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                        You've completed your first survey. Complete next week's survey to start seeing trends and comparisons!
                    </p>
                </CardContent>
            </Card>
        );
    }
    // Now we have at least 2 weeks of data, show trends
    return (
        <div className="space-y-6">
            {previousWeek && (
                <Card className="card-hover-lift border-primary/50 gradient-accent-gold animate-fade-in-up">
                    <CardHeader>
                        <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                            <Pin className="text-primary icon-hover-rotate" /> Personal Reflection
                        </h3>
                        <CardDescription>Review your notes from last week as you reflect on this one.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {previousWeek.wins && (
                            <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                    <Check className="text-green-500 h-4 w-4 icon-hover-bounce" /> Wins
                                </h4>
                                <p className="text-sm italic text-muted-foreground p-3 bg-background rounded-md">
                                    &quot;{previousWeek.wins}&quot;
                                </p>
                            </div>
                        )}
                        {previousWeek.challenges && (
                            <div>
                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                                    <Frown className="text-red-500 h-4 w-4 icon-hover-bounce" /> Challenges
                                </h4>
                                <p className="text-sm italic text-muted-foreground p-3 bg-background rounded-md">
                                    &quot;{previousWeek.challenges}&quot;
                                </p>
                            </div>
                        )}
                        {!previousWeek.wins && !previousWeek.challenges && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No notes from last week
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
            {subjectiveTrendData && (
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
            )}

            {adherenceTrendData && (
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
            )}
        </div>
    );
}
