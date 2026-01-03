import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subDays, format, startOfDay, eachDayOfInterval } from 'date-fns';

interface DayData {
  date: string; // YYYY-MM-DD format
  dateObj: Date;
  workoutCount: number;
  workouts: Array<{
    id: string;
    name: string;
  }>;
}

interface UseConsistencyDataResult {
  days: DayData[];
  loading: boolean;
  error: string | null;
  totalWorkouts: number;
  activeDays: number;
}

/**
 * Hook to fetch consistency data for calendar heatmap
 * @param clientId - The client's user ID
 * @param daysBack - Number of days to show (default: 90)
 */
export function useConsistencyData(
  clientId: string,
  daysBack: number = 90
): UseConsistencyDataResult {
  const [days, setDays] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [activeDays, setActiveDays] = useState(0);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchConsistencyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range
        const endDate = startOfDay(new Date());
        const startDate = subDays(endDate, daysBack - 1); // -1 to include today

        // Fetch completed workouts for the time period
        const workoutsRef = collection(db, 'workouts');
        const q = query(
          workoutsRef,
          where('clientId', '==', clientId),
          where('status', '==', 'completed'),
          where('completedAt', '>=', startDate)
        );

        const snapshot = await getDocs(q);

        // Create date map
        const dateMap: Record<string, {
          workoutCount: number;
          workouts: Array<{ id: string; name: string }>;
        }> = {};

        let totalCount = 0;

        snapshot.docs.forEach(doc => {
          const workout = doc.data();
          const completedAt = workout.completedAt?.toDate();
          
          if (!completedAt) return;

          const dateKey = format(startOfDay(completedAt), 'yyyy-MM-dd');

          if (!dateMap[dateKey]) {
            dateMap[dateKey] = {
              workoutCount: 0,
              workouts: []
            };
          }

          dateMap[dateKey].workoutCount++;
          dateMap[dateKey].workouts.push({
            id: doc.id,
            name: workout.name || 'Workout'
          });

          totalCount++;
        });

        // Generate all days in range (including empty days)
        const allDays = eachDayOfInterval({
          start: startDate,
          end: endDate
        });

        const daysData: DayData[] = allDays.map(dateObj => {
          const dateKey = format(dateObj, 'yyyy-MM-dd');
          const dayInfo = dateMap[dateKey];

          return {
            date: dateKey,
            dateObj,
            workoutCount: dayInfo?.workoutCount || 0,
            workouts: dayInfo?.workouts || []
          };
        });

        const activeDaysCount = daysData.filter(d => d.workoutCount > 0).length;

        setDays(daysData);
        setTotalWorkouts(totalCount);
        setActiveDays(activeDaysCount);
      } catch (err) {
        console.error('Error fetching consistency data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch consistency data');
      } finally {
        setLoading(false);
      }
    };

    fetchConsistencyData();
  }, [clientId, daysBack]);

  return { days, loading, error, totalWorkouts, activeDays };
}
