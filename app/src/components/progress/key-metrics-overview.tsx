"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TrendingUp, Scale, ArrowDown, Flame, Info, ArrowUp, Footprints, Pencil, Smartphone, Target, Dumbbell } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { Progress } from '../ui/progress';

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

const initialMetrics: Metric[] = [
    {
        id: 'weight',
        icon: <Scale className="h-6 w-6 text-primary" />,
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
        icon: <Flame className="h-6 w-6 text-primary" />,
        label: 'Workout Streak',
        value: '5',
        unit: 'days',
        subtext: 'in a row',
        tooltip: "This is your longest active streak. Keeping a streak alive is a powerful motivator. Keep the fire going!",
        editable: true,
    },
    {
        id: 'strength-gain',
        icon: <Dumbbell className="h-6 w-6 text-primary" />,
        label: 'Strength Gain',
        value: '+8',
        unit: '%',
        subtext: 'last 30 days',
        tooltip: "An estimate of your overall strength increase based on your logged workouts.",
        editable: false,
    },
    {
        id: 'steps',
        icon: <Footprints className="h-6 w-6 text-primary" />,
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

const HabitConsistencyCard = () => {
    const consistencyScore = 88;
    return (
        <TooltipProvider>
            <Card className="group flex flex-col transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/20 cursor-pointer bg-primary/5 col-span-1 md:col-span-2 lg:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className="h-6 w-6 text-primary" />
                            Habit Score
                        </div>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground/50" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p className="max-w-xs">Your adherence to core habits. Aim for 80% or more!</p>
                            </TooltipContent>
                        </Tooltip>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 justify-center">
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold">{consistencyScore}%</p>
                    </div>
                    <p className="text-xs text-muted-foreground">Last 7 days</p>
                    <Progress value={consistencyScore} className="mt-2 h-2" />
                </CardContent>
            </Card>
        </TooltipProvider>
    )
};


const MetricCard = ({ metric, onEdit, className }: { metric: Metric, onEdit: (metric: Metric) => void, className?: string }) => {
    const TrendIcon = metric.trend === 'up' ? ArrowUp : ArrowDown;
    const isWeightCard = metric.id === 'weight';
    const isStrengthCard = metric.id === 'strength-gain';
    const isStepsCard = metric.id === 'steps';

    return (
        <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Card className={cn("group flex flex-col transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/20 cursor-pointer bg-primary/5", className)}>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                {metric.icon}
                                {metric.label}
                            </CardTitle>
                             <div className="flex items-center gap-2">
                                {metric.editable && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); onEdit(metric); }}>
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground/50" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">{metric.tooltip}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isWeightCard ? (
                             <div className="flex items-center justify-center gap-4">
                                <div>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <p className="text-lg font-semibold text-muted-foreground line-through">{metric.startWeight}</p>
                                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-3xl font-bold">{metric.value}</p>
                                        <span className="text-muted-foreground text-sm self-end">lbs</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-center gap-2">
                                        <Badge
                                            className={cn(
                                                "text-xs font-semibold gap-1",
                                                metric.changeType === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800'
                                            )}
                                        >
                                            <TrendIcon className="h-3 w-3" />
                                            {metric.change}
                                        </Badge>
                                        {metric.bf_change && (
                                            <Badge
                                            className={cn(
                                                "text-xs font-semibold gap-1",
                                                "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"
                                            )}
                                        >
                                            <ArrowDown className="h-3 w-3" />
                                            {metric.bf_change}
                                        </Badge>
                                        )}
                                    </div>
                                </div>
                             </div>
                        ) : isStrengthCard ? (
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold">{metric.value}{metric.unit}</p>
                            </div>
                        ) : isStepsCard ? (
                            <>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-bold">{parseInt(metric.value).toLocaleString()}</p>
                                    {metric.change && (
                                        <Badge
                                            className={cn(
                                                "text-xs font-semibold gap-1 self-center",
                                                metric.changeType === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800'
                                            )}
                                        >
                                            <TrendIcon className="h-3 w-3" />
                                            {metric.change}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">Avg: {parseInt(metric.avg || '0').toLocaleString()}</p>
                            </>
                        ) : (
                            <div className="flex items-baseline gap-2">
                                <p className="text-3xl font-bold">{metric.value.toLocaleString()}</p>
                                {metric.change && (
                                    <Badge
                                        className={cn(
                                            "text-xs font-semibold gap-1 self-center",
                                            metric.changeType === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800'
                                        )}
                                    >
                                        <TrendIcon className="h-3 w-3" />
                                        {metric.change}
                                    </Badge>
                                )}
                            </div>
                        )}
                         {!isStepsCard && <p className="text-xs text-muted-foreground">{metric.subtext}</p>}
                    </CardContent>
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
    const [metrics, setMetrics] = useState(initialMetrics);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [editingMetric, setEditingMetric] = useState<Metric | null>(null);
    const [newValue, setNewValue] = useState('');

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
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant="outline" className="gap-2 text-xs bg-secondary border-primary/20 text-primary whitespace-nowrap cursor-pointer">
                                        <Smartphone className="inline-block h-3 w-3" />
                                        Device Sync: Coming Soon
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        Soon you&apos;ll be able to automatically sync your weight, steps, and other data from your smart devices!
                                    </p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Manual Updates Required (For Now!)</AlertTitle>
                        <AlertDescription>
                            The wearable sync feature is coming soon! Until then, please manually update your metrics by clicking the <Pencil className="inline-block h-3 w-3" /> icon on a card. We recommend updating your <b>weight</b> and optional <b>body fat %</b> after each weigh-in, and your <b>steps/streak</b> daily.
                        </AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {metrics.map((metric) => (
                            <MetricCard key={metric.id} metric={metric} onEdit={handleEdit} className="lg:col-span-1"/>
                        ))}
                        <HabitConsistencyCard />
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
