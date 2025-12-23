"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Calendar, Check, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { WorkoutAssignment } from '@/types/workout';
import { getCurrentWeekISO, formatWeekRange } from '@/lib/week-utils';

interface ClientTrainingProtocolProps {
  clientId: string;
  keyPriorities: string[];
}

export function ClientTrainingProtocol({ clientId, keyPriorities }: ClientTrainingProtocolProps) {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeeklyAssignments = async () => {
      try {
        setLoading(true);
        
        // Get current week's Sunday and Saturday dates
        const currentWeekISO = getCurrentWeekISO();
        const weekStart = new Date(currentWeekISO);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        // Convert to Firestore Timestamps for comparison
        const startTimestamp = Timestamp.fromDate(weekStart);
        const endTimestamp = Timestamp.fromDate(weekEnd);
        
        // Query assignments with dueDate in current week
        const assignmentsRef = collection(db, 'workoutAssignments');
        const q = query(
          assignmentsRef,
          where('clientId', '==', clientId),
          where('dueDate', '>=', startTimestamp),
          where('dueDate', '<=', endTimestamp)
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedAssignments: WorkoutAssignment[] = [];
        
        querySnapshot.forEach((doc) => {
          fetchedAssignments.push({
            id: doc.id,
            ...doc.data()
          } as WorkoutAssignment);
        });
        
        // Sort by due date (handle Timestamp objects)
        fetchedAssignments.sort((a, b) => {
          const aDate = a.dueDate as any;
          const bDate = b.dueDate as any;
          const aTime = aDate?.toDate ? aDate.toDate().getTime() : 0;
          const bTime = bDate?.toDate ? bDate.toDate().getTime() : 0;
          return aTime - bTime;
        });
        
        setAssignments(fetchedAssignments);
      } catch (error) {
        console.error('Error fetching weekly assignments:', error);
      } finally {
        setLoading(false);
      }
    };

    if (clientId) {
      fetchWeeklyAssignments();
    }
  }, [clientId]);

  // Get badge variant based on completion percentage
  const getCompletionBadgeVariant = (percentage: number): "default" | "secondary" | "outline" => {
    if (percentage === 100) return "default"; // Green for complete
    if (percentage > 0) return "secondary"; // Yellow for in progress
    return "outline"; // Gray for not started
  };

  // Format date to "Mon, Dec 23"
  const formatDueDate = (dueDate: any) => {
    // Handle Firestore Timestamp objects
    let date: Date;
    if (dueDate?.toDate && typeof dueDate.toDate === 'function') {
      date = dueDate.toDate();
    } else if (dueDate instanceof Date) {
      date = dueDate;
    } else if (typeof dueDate === 'string') {
      date = new Date(dueDate + 'T00:00:00');
    } else {
      return 'Not scheduled';
    }
    
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' });
    const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${dayOfWeek}, ${monthDay}`;
  };

  if (loading) {
    return (
      <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-xl">
            <Dumbbell className="w-6 h-6 text-primary" />
            <span>Training Protocol</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3 text-xl">
          <Dumbbell className="w-6 h-6 text-primary" />
          <span>Training Protocol</span>
        </CardTitle>
        <CardDescription>
          Your current workout program and guidelines for this week.
        </CardDescription>
        <div className="absolute top-4 right-4 text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {formatWeekRange(new Date(getCurrentWeekISO()))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Workouts */}
        {assignments.length > 0 ? (
          <div>
            <h3 className="font-bold mb-3">This Week&apos;s Workouts:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-primary">
                      {assignment.dueDate ? formatDueDate(assignment.dueDate) : 'Not scheduled'}
                    </p>
                    <Badge 
                      variant={getCompletionBadgeVariant(assignment.completionPercentage || 0)}
                      className="text-xs"
                    >
                      {assignment.completionPercentage || 0}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{assignment.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No workouts scheduled this week</p>
            <p className="text-sm mt-1">Check back later or reach out to your trainer</p>
          </div>
        )}

        {/* Key Priorities */}
        {keyPriorities && keyPriorities.length > 0 && (
          <div>
            <h3 className="font-bold mb-3">Key Priorities:</h3>
            <ul className="space-y-3">
              {keyPriorities.map((priority, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">{priority}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
