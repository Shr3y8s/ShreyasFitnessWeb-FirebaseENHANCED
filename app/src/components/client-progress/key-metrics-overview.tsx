"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { getActivityLogsForDateRange, getRecentWeightLogs } from '@/lib/activity-api';
import { getTodayLocal, getDaysAgo, formatDateISO } from '@/lib/date-utils';
import type { DailyActivityData } from '@/types/activity';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { TrendingUp, ArrowDown, Flame, Info, ArrowUp, Footprints, Pencil, Smartphone, Target, Dumbbell, ChevronDown, ChevronUp, X } from 'lucide-react';
import { FaWeight } from 'react-icons/fa';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Metric {
    id: string;
    icon: ReactNode;
    label: string;
    startWeight?: string;
    value: string;
    unit: string;
    change?: string;
    bf_change?: string;
    changeType?: 'positive' | 'negative';
    trend?: 'up' | 'down';
    tooltip: string;
    editable: boolean;
    subtext?: string;
    avg?: string;
}

// Helper functions
function calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.length);
}

// Calculate habit score with hybrid approach:
// - Nutrition, steps, water: count by days (7 max each)
// - Workouts: use actual assigned/completed counts from workoutStats
async function calculateHabitScore(
    userId: string,
    sevenDaysAgoStr: string,
    todayStr: string,
    weeklyActivities: DailyActivityData[]
): Promise<number> {
    try {
        // Get nutrition approach
        const planSnap = await getDoc(doc(db, 'clientPlans', userId));
        const nutritionApproach = planSnap.data()?.nutritionProtocol?.approach || 'macro_tracking';
        const nutritionSubcollection = nutritionApproach === 'macro_tracking' ? 'meals' :
                                      nutritionApproach === 'meal_plan' ? 'mealPlans' :
                                      'habits'; // healthy_habits

        // Get nutrition data and workout stats
        const [nutritionSnap, workoutGoalDoc] = await Promise.all([
            getDocs(query(
                collection(db, 'nutritionLogs', userId, nutritionSubcollection),
                where('__name__', '>=', sevenDaysAgoStr),
                where('__name__', '<=', todayStr),
                limit(10)
            )),
            getDoc(doc(db, 'goals', `${userId}_workout_consistency`))
        ]);

        // Get pre-calculated workout stats
        const workoutStats = workoutGoalDoc.exists() ? workoutGoalDoc.data()?.workoutStats : null;
        const workoutCompleted = workoutStats?.thisWeek?.completed || 0;
        const workoutAssigned = workoutStats?.thisWeek?.assigned || 0;

        // Count completed habits for nutrition, steps, water (day-based)
        let nutritionCompleted = 0;
        let stepsCompleted = 0;
        let waterCompleted = 0;

        // For each of 7 days, check nutrition, steps, water
        for (let i = 6; i >= 0; i--) {
            const dateStr = i === 0 ? todayStr : getDaysAgo(i);

            // 1. Nutrition (dayComplete)
            const nutritionDay = nutritionSnap.docs.find(doc => doc.id === dateStr);
            if (nutritionDay?.data().dayComplete) nutritionCompleted++;

            // 2. Steps (met goal)
            const activity = weeklyActivities.find(a => a.date === dateStr);
            if (activity?.steps && activity.steps.steps >= activity.steps.goal) {
                stepsCompleted++;
            }

            // 3. Water (met goal)
            if (activity?.water && activity.water.amount >= activity.water.goal) {
                waterCompleted++;
            }
        }

        // Calculate score: (completed) / (possible) * 100
        // Possible = 7 days for nutrition + 7 days for steps + 7 days for water + assigned workouts
        const totalCompleted = nutritionCompleted + workoutCompleted + stepsCompleted + waterCompleted;
        const totalPossible = 7 + workoutAssigned + 7 + 7; // nutrition + workouts + steps + water

        // Avoid division by zero
        if (totalPossible === 0) return 0;

        return Math.round((totalCompleted / totalPossible) * 100);
    } catch (error) {
        console.error('Error calculating habit score:', error);
        return 0;
    }
}

const initialMetrics: Metric[] = [
    {
        id: 'weight',
        icon: <span className="h-4 w-4 text-primary inline-flex items-center justify-center"><FaWeight size={16} /></span>,
        label: 'Weight Journey',
        startWeight: "215.0 lbs",
        value: '202.0',
        unit: 'lbs',
        change: '-13.0 lbs',
        bf_change: '-2%',
        changeType: 'positive',
        trend: 'down',
        tooltip: "This is your current weight and the total amount you've lost since starting. Seeing this number go down is a fantastic sign of progress!",
        editable: true,
    },
    {
        id: 'workout-streak',
        icon: <Flame className="h-4 w-4 text-primary animate-flicker" />,
        label: 'Workout Streak',
        value: '0',
        unit: 'days',
        subtext: 'in a row',
        tooltip: "This is your longest active streak. Keeping a streak alive is a powerful motivator. Keep the fire going!",
        editable: true,
    },
    {
        id: 'strength-gain',
        icon: <Dumbbell className="h-4 w-4 text-primary" />,
        label: 'Strength Gain',
        value: '+8',
        unit: '%',
        subtext: 'last 30 days',
        tooltip: "An estimate of your overall strength increase based on your logged workouts.",
        editable: false,
    },
    {
        id: 'steps',
        icon: <Footprints className="h-4 w-4 text-primary" />,
        label: 'Steps',
        value: '9500',
        unit: 'steps',
        avg: '8450',
        change: '+1050',
        changeType: 'positive',
        trend: 'up',
        subtext: '7-day average',
        tooltip: "Your steps for today compared to your 7-day average. This is a great indicator of your overall activity level.",
        editable: true,
    },
];

const HabitConsistencyCard = ({ index, score, loading }: { index?: number, score: number, loading?: boolean }) => {
    return (
        <TooltipProvider>
            <Card className={cn(
                "group p-2 card-hover-lift border-primary/20 cursor-pointer gradient-accent-green col-span-1 md:col-span-2 lg:col-span-1 overflow-hidden text-center",
                "animate-fade-in-up",
                index !== undefined && `stagger-${Math.min(index + 1, 6)}`
            )}>
                <div className="flex items-center justify-between mb-0.5">
                    <Target className="h-4 w-4 text-primary" />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground/50" />
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-xs">
                                Your consistency score for the last 7 days across 4 core habits (Nutrition, Workouts, Steps, Water). 
                                Each day you complete a habit counts toward your score (max 28 completions per week). 
                                New users will see lower scores initially - keep logging daily to build your consistency!
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </div>
                <p className="text-xs font-medium text-primary mb-0.5">Habit Score</p>
                <p className="text-2xl font-bold number-emphasis animate-count-up">
                    {loading ? '...' : score}%
                </p>
                <p className="text-xs text-primary">Last 7 days</p>
            </Card>
        </TooltipProvider>
    )
};


const MetricCard = ({ metric, onEdit, className, index }: { metric: Metric, onEdit: (metric: Metric) => void, className?: string, index?: number }) => {
    const TrendIcon = metric.trend === 'up' ? ArrowUp : ArrowDown;
    const isWeightCard = metric.id === 'weight';
    const isStrengthCard = metric.id === 'strength-gain';
    const isStepsCard = metric.id === 'steps';

    return (
        <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Card className={cn(
                    "group p-2 card-hover-lift border-primary/20 cursor-pointer overflow-hidden text-center gradient-accent-green",
                    "animate-fade-in-up",
                    index !== undefined && `stagger-${Math.min(index + 1, 6)}`,
                    className
                )}>
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="icon-hover-bounce">{metric.icon}</span>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground/50" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">{metric.tooltip}</p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                    <p className="text-xs font-medium text-primary mb-0.5">{metric.label}</p>
                    {isWeightCard ? (
                        <>
                            <div className="flex flex-col items-center justify-center">
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-bold">{metric.value}</p>
                                    <span className="text-muted-foreground text-xs">lbs</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <p className="text-xs font-semibold text-muted-foreground line-through">{metric.startWeight}</p>
                                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="mt-0.5 flex items-center justify-center">
                                <Badge
                                    className={cn(
                                        "text-xs font-semibold gap-1",
                                        metric.changeType === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 animate-pulse-badge' : 'bg-red-100 text-red-800'
                                    )}
                                >
                                    <TrendIcon className="h-3 w-3" />
                                    {metric.change} ({metric.bf_change})
                                </Badge>
                            </div>
                            <p className="text-xs text-primary mt-0.5">{metric.subtext}</p>
                        </>
                    ) : isStrengthCard ? (
                        <>
                            <p className="text-2xl font-bold">{metric.value}{metric.unit}</p>
                            <p className="text-xs text-primary">{metric.subtext}</p>
                        </>
                    ) : isStepsCard ? (
                        <>
                            <p className="text-2xl font-bold">{parseInt(metric.value).toLocaleString()}</p>
                            {metric.change && (
                                <div className="flex justify-center mt-0.5">
                                    <Badge
                                        className={cn(
                                            "text-xs font-semibold gap-1",
                                            metric.changeType === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 animate-pulse-badge' : 'bg-red-100 text-red-800'
                                        )}
                                    >
                                        <TrendIcon className="h-3 w-3" />
                                        {metric.change}
                                    </Badge>
                                </div>
                            )}
                            <p className="text-xs text-primary">Avg: {parseInt(metric.avg || '0').toLocaleString()}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                            <p className="text-xs text-primary">{metric.subtext}</p>
                        </>
                    )}
                </Card>
            </TooltipTrigger>
            <TooltipContent>
                <p className="max-w-xs">{metric.tooltip}</p>
            </TooltipContent>
        </Tooltip>
        </TooltipProvider>
    );
};

export function KeyMetricsOverview() {
    const { toast } = useToast();
    const { user } = useAuth();
    const [metrics, setMetrics] = useState(initialMetrics);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [newValue, setNewValue] = useState('');
    const [loading, setLoading] = useState(true);
    const [habitScore, setHabitScore] = useState(88); // Default mock value
    const [weightLoading, setWeightLoading] = useState(true);
    
    // Smart collapsible state management
    const [isInfoExpanded, setIsInfoExpanded] = useState(() => {
        if (typeof window === 'undefined') return false;
        
        const dismissed = localStorage.getItem('metricsInfoDismissed');
        const visitCount = parseInt(localStorage.getItem('metricsVisitCount') || '0');
        
        // Show for first 3 visits, or if never dismissed
        return !dismissed && visitCount < 3;
    });
    
    // Track visit count
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const visitCount = parseInt(localStorage.getItem('metricsVisitCount') || '0');
        localStorage.setItem('metricsVisitCount', (visitCount + 1).toString());
    }, []);
    
    // Handle dismiss
    const handleDismiss = () => {
        if (typeof window === 'undefined') return;
        
        localStorage.setItem('metricsInfoDismissed', 'true');
        setIsInfoExpanded(false);
    };
    
    // Load weight data
    useEffect(() => {
        if (!user) {
            setWeightLoading(false);
            return;
        }

        const loadWeightData = async () => {
            try {
                const weights = await getRecentWeightLogs(user.uid, 100);
                
                if (weights.length === 0) {
                    setWeightLoading(false);
                    return;
                }

                // Sort by date (oldest first)
                const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
                
                const firstWeight = sorted[0];
                const currentWeight = sorted[sorted.length - 1];
                
                // Convert to same unit for calculation (use current weight's unit)
                let firstValue = firstWeight.weight;
                const currentValue = currentWeight.weight;
                const unit = currentWeight.unit;
                
                if (firstWeight.unit !== currentWeight.unit) {
                    // Convert first weight to match current unit
                    if (unit === 'lbs' && firstWeight.unit === 'kg') {
                        firstValue = firstWeight.weight * 2.20462;
                    } else if (unit === 'kg' && firstWeight.unit === 'lbs') {
                        firstValue = firstWeight.weight / 2.20462;
                    }
                }
                
                const change = currentValue - firstValue;
                const percentChange = ((change / firstValue) * 100);
                
                // Update weight metric
                setMetrics(currentMetrics => 
                    currentMetrics.map(m => {
                        if (m.id === 'weight') {
                            return {
                                ...m,
                                startWeight: `${firstValue.toFixed(1)} ${unit}`,
                                value: currentValue.toFixed(1),
                                unit: unit,
                                change: `${change > 0 ? '+' : ''}${change.toFixed(1)} ${unit}`,
                                bf_change: `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
                                changeType: change <= 0 ? 'positive' as const : 'negative' as const,
                                trend: change <= 0 ? 'down' as const : 'up' as const,
                            };
                        }
                        return m;
                    })
                );
                
                setWeightLoading(false);
            } catch (error) {
                console.error('Error loading weight data:', error);
                setWeightLoading(false);
            }
        };

        loadWeightData();
    }, [user]);
    
    // Load workout streak from goals
    useEffect(() => {
        if (!user) return;

        const loadWorkoutStreak = async () => {
            try {
                const goalDoc = await getDoc(doc(db, 'goals', `${user.uid}_workout_consistency`));
                
                if (goalDoc.exists()) {
                    const streak = goalDoc.data().currentStreak || 0;
                    
                    // Update workout-streak metric
                    setMetrics(currentMetrics => 
                        currentMetrics.map(m => {
                            if (m.id === 'workout-streak') {
                                return {
                                    ...m,
                                    value: streak.toString(),
                                };
                            }
                            return m;
                        })
                    );
                }
            } catch (error) {
                console.error('Error loading workout streak:', error);
            }
        };

        loadWorkoutStreak();
    }, [user]);
    
    // Load activity data for steps
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }
        
        const loadActivityData = async () => {
            try {
                setLoading(true);
                
                // Get date strings (using local timezone)
                const todayStr = getTodayLocal();
                const sevenDaysAgoStr = getDaysAgo(6); // Last 7 days including today
                
                // Get today's activity and last 7 days
                const [todayActivity, weeklyActivities] = await Promise.all([
                    getDoc(doc(db, 'dailyActivities', `${user.uid}_${todayStr}`)),
                    getActivityLogsForDateRange(user.uid, sevenDaysAgoStr, todayStr)
                ]);
                
                // Extract steps data from nested structure
                const getTodaySteps = () => {
                    if (!todayActivity.exists()) return 0;
                    const data = todayActivity.data();
                    return data?.steps?.steps || 0;
                };
                
                const todaySteps = getTodaySteps();
                
                // Calculate average from weekly activities (nested structure)
                const weeklyStepsValues = weeklyActivities.map(activity => {
                    return activity?.steps?.steps || 0;
                });
                const avgSteps = calculateAverage(weeklyStepsValues);
                
                const change = todaySteps - avgSteps;
                
                // Calculate habit score from real data (4 habits × 7 days)
                const score = await calculateHabitScore(
                    user.uid,
                    sevenDaysAgoStr,
                    todayStr,
                    weeklyActivities
                );
                setHabitScore(score);
                
                // Update metrics with real data
                setMetrics(currentMetrics => 
                    currentMetrics.map(m => {
                        if (m.id === 'steps') {
                            return {
                                ...m,
                                value: todaySteps.toString(),
                                avg: avgSteps.toString(),
                                change: change > 0 ? `+${change}` : change.toString(),
                                changeType: change >= 0 ? 'positive' as const : 'negative' as const,
                                trend: change >= 0 ? 'up' as const : 'down' as const,
                            };
                        }
                        return m;
                    })
                );
                
                setLoading(false);
            } catch (error) {
                console.error('Error loading activity data:', error);
                setLoading(false);
            }
        };
        
        loadActivityData();
    }, [user]);

    const handleEdit = (metric: Metric) => {
        setEditingMetric(metric);
        setNewValue(metric.value);
        setEditDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingMetric) return;

        setMetrics(currentMetrics =>
            currentMetrics.map(m =>
                m.id === editingMetric.id ? { ...m, value: newValue } : m
            )
        );

        toast({
            title: "Metric Updated",
            description: `${editingMetric.label} has been updated to ${newValue}.`,
        });

        setEditDialogOpen(false);
        setEditingMetric(null);
        setNewValue('');
    };

    return (
        <>
            <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50 relative">
                <Collapsible open={isInfoExpanded} onOpenChange={setIsInfoExpanded}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                                    <TrendingUp className="text-primary" />
                                    Key Metrics Overview
                                </h3>
                                <CardDescription>
                                    Your core progress highlights. Remember, consistency is key!
                                </CardDescription>
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8">
                                    <Info className="h-4 w-4 mr-1" />
                                    {isInfoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CollapsibleTrigger>
                        </div>
                    </CardHeader>
                    
                    <CollapsibleContent>
                        <div className="px-6 pb-4">
                            <Alert className="relative">
                                <Info className="h-4 w-4" />
                                <AlertTitle>How to Update Your Metrics</AlertTitle>
                                <AlertDescription className="space-y-2">
                                    <p>
                                        These metrics update when you log data in <b>Daily Activities → Today&apos;s Activity</b>:
                                    </p>
                                    <ul className="list-disc pl-5 space-y-1 text-sm">
                                        <li><b>Weight:</b> Log your weigh-ins with optional body fat %</li>
                                        <li><b>Steps:</b> Log daily step count</li>
                                        <li><b>Workouts:</b> Complete assigned workouts to build your streak</li>
                                    </ul>
                                    <p className="text-sm pt-2 flex items-center gap-1">
                                        🔮 <b>Coming Soon:</b> Automatic sync with Apple Watch, Fitbit, and other wearables!
                                    </p>
                                </AlertDescription>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDismiss}
                                    className="mt-3"
                                >
                                    Got it, don&apos;t show again
                                </Button>
                            </Alert>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
                
                <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                        {metrics.map((metric, index) => (
                            <MetricCard key={metric.id} metric={metric} onEdit={handleEdit} className="lg:col-span-1" index={index}/>
                        ))}
                        <HabitConsistencyCard index={metrics.length} score={habitScore} loading={loading} />
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Edit {editingMetric?.label}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Manually update the value for this metric.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="metric-value">New Value ({editingMetric?.unit})</Label>
                        <Input
                            id="metric-value"
                            value={newValue}
                            onChange={(e) => setNewValue(e.target.value)}
                            className="mt-2"
                            type={editingMetric?.id === 'weight' ? 'number' : 'text'}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
