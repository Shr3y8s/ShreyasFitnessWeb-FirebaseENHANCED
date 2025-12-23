"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
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


  // Get the most recent update date from assignments
  const getLastUpdatedDate = (): string => {
    if (assignments.length === 0) return 'Not updated';
    
    // Find the most recent updatedAt date
    const mostRecent = assignments.reduce((latest, assignment) => {
      const assignmentDate = assignment.updatedAt;
      if (!assignmentDate) return latest;
      
      const date = assignmentDate instanceof Date ? assignmentDate : 
                   (assignmentDate as any).toDate ? (assignmentDate as any).toDate() : 
                   new Date(assignmentDate);
      
      return !latest || date > latest ? date : latest;
    }, null as Date | null);

    if (!mostRecent) return 'Not updated';
    
    return `Last updated: ${mostRecent.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
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
        <div className="absolute top-4 right-4 text-xs text-muted-foreground">
          {getLastUpdatedDate()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekly Workouts */}
        {assignments.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-bold">This Week&apos;s Workouts:</h3>
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {formatWeekRange(new Date(getCurrentWeekISO()))}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="p-4 bg-primary/5 rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-semibold text-primary">
                        {assignment.dueDate ? formatDueDate(assignment.dueDate) : 'Not scheduled'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{assignment.name}</p>
                    </div>
                    <CircularProgress 
                      percentage={assignment.completionPercentage || 0}
                      size={44}
                      strokeWidth={4}
                    />
                  </div>
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
                <h3 className="font-semibold mb-2 text-sm">Key Priorities:</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
                  {keyPriorities.map((priority: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-foreground">{priority}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
      </CardContent>
    </Card>
  );
}
