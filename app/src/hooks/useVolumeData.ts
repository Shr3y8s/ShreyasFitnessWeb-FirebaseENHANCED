import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfWeek, endOfWeek, format, subWeeks } from 'date-fns';

interface WeeklyVolumeData {
  week: string;
  weekStart: Date;
  volume: number;
  workoutCount: number;
}

interface UseVolumeDataResult {
  data: WeeklyVolumeData[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and calculate weekly training volume for a client
 * @param clientId - The client's user ID
 * @param weeksBack - Number of weeks to fetch (default: 12)
 */
export function useVolumeData(clientId: string, weeksBack: number = 12): UseVolumeDataResult {
  const [data, setData] = useState<WeeklyVolumeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchVolumeData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range (last N weeks)
        const now = new Date();
        const startDate = subWeeks(now, weeksBack);

        // Fetch completed workouts for the time period
        const workoutsRef = collection(db, 'workouts');
        const q = query(
          workoutsRef,
          where('clientId', '==', clientId),
          where('status', '==', 'completed'),
          where('completedAt', '>=', startDate),
          orderBy('completedAt', 'asc')
        );

        const snapshot = await getDocs(q);

        // Process workouts and calculate volume
        const weeklyVolumes: Record<string, {
          weekStart: Date;
          volume: number;
          workoutCount: number;
        }> = {};

        snapshot.docs.forEach(doc => {
          const workout = doc.data();
          const completedAt = workout.completedAt?.toDate();
          
          if (!completedAt) return;

          // Calculate volume for this workout
          let workoutVolume = 0;
          if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises.forEach((exercise: any) => {
              // Only calculate volume for strength exercises
              if (exercise.exerciseType === 'strength' && exercise.actual) {
                if (exercise.actual.type === 'strength' && 
                    exercise.actual.completedSets && 
                    Array.isArray(exercise.actual.completedSets)) {
                  exercise.actual.completedSets.forEach((set: any) => {
                    if (set.completed && set.actualWeight && set.actualReps) {
                      workoutVolume += set.actualWeight * set.actualReps;
                    }
                  });
                }
              }
            });
          }

          // Group by week
          const weekStart = startOfWeek(completedAt, { weekStartsOn: 1 }); // Monday
          const weekKey = format(weekStart, 'yyyy-MM-dd');

          if (!weeklyVolumes[weekKey]) {
            weeklyVolumes[weekKey] = {
              weekStart,
              volume: 0,
              workoutCount: 0
            };
          }

          weeklyVolumes[weekKey].volume += workoutVolume;
          weeklyVolumes[weekKey].workoutCount++;
        });

        // Convert to array and add formatted week labels
        const volumeArray: WeeklyVolumeData[] = Object.entries(weeklyVolumes)
          .map(([key, data]) => {
            const weekEnd = endOfWeek(data.weekStart, { weekStartsOn: 1 });
            const weekLabel = `${format(data.weekStart, 'MMM d')}-${format(weekEnd, 'd')}`;
            
            return {
              week: weekLabel,
              weekStart: data.weekStart,
              volume: Math.round(data.volume),
              workoutCount: data.workoutCount
            };
          })
          .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());

        setData(volumeArray);
      } catch (err) {
        console.error('Error fetching volume data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch volume data');
      } finally {
        setLoading(false);
      }
    };

    fetchVolumeData();
  }, [clientId, weeksBack]);

  return { data, loading, error };
}
