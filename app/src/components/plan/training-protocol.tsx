"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Dumbbell, Calendar, Check } from 'lucide-react';

const upcomingWorkouts = [
    { day: 'Monday', title: 'Upper Body' },
    { day: 'Tuesday', title: 'Lower Body' },
    { day: 'Thursday', title: 'Upper Body' },
    { day: 'Saturday', title: 'Lower Body' },
];

const focusAreas = [
    'Progressive overload on main lifts',
    '8-12 rep range for hypertrophy',
    'Control the eccentric (3 second tempo)',
];

export function TrainingProtocol() {
    return (
        <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
            <CardHeader className="relative">
                <CardTitle className="flex items-center gap-3 text-xl">
                    <Dumbbell className="w-6 h-6 text-primary" />
                    <span>Training Protocol</span>
                </CardTitle>
                <CardDescription>
                    Your current workout program and guidelines for this phase.
                </CardDescription>
                <div className="absolute top-4 right-4 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Last Updated: Oct 21, 2025
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="font-bold mb-3">Weekly Split: Upper/Lower (4x/week)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {upcomingWorkouts.map((workout) => (
                            <div key={workout.day} className="p-4 bg-primary/5 rounded-lg text-center border border-primary/20">
                                <p className="text-sm font-semibold text-primary">{workout.day}</p>
                                <p className="text-xs text-muted-foreground mt-1">{workout.title}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-bold mb-3">Key Priorities:</h3>
                    <ul className="space-y-3">
                        {focusAreas.map((area, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <Check className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                                <span className="text-sm font-medium text-foreground">{area}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
    );
}
