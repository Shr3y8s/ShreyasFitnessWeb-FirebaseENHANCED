import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subMonths } from 'date-fns';

interface ExerciseCompletionData {
  exerciseId: string;
  exerciseName: string;
  completionRate: number;
  timesAssigned: number;
  timesCompleted: number;
  avgCompletionPercentage: number;
}

interface UseExerciseCompletionDataResult {
  data: ExerciseCompletionData[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and calculate exercise completion rates for a client
 * Shows which exercises are consistently completed vs frequently skipped
 * @param clientId - The client's user ID
 * @param monthsBack - Number of months to analyze (default: 3)
 */
export function useExerciseCompletionData(
  clientId: string,
  monthsBack: number = 3
): UseExerciseCompletionDataResult {
  const [data, setData] = useState<ExerciseCompletionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchCompletionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Calculate date range (last N months)
        const now = new Date();
        const startDate = subMonths(now, monthsBack);

        // Fetch completed workouts for the time period
        const workoutsRef = collection(db, 'workouts');
        const q = query(
          workoutsRef,
          where('clientId', '==', clientId),
          where('status', '==', 'completed'),
          where('completedAt', '>=', startDate)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setData([]);
          return;
        }

        // Aggregate exercise completion data
        const exerciseStats: Record<string, {
          exerciseName: string;
          timesAssigned: number;
          totalCompletionPercentage: number;
          timesFullyCompleted: number; // completionPercentage >= 80%
        }> = {};

        snapshot.docs.forEach(doc => {
          const workout = doc.data();
          
          if (!workout.exercises || !Array.isArray(workout.exercises)) return;

          workout.exercises.forEach((exercise: any) => {
            const exerciseId = exercise.exerciseId;
            const exerciseName = exercise.exerciseName;
            const completionPercentage = exercise.completionPercentage || 0;

            if (!exerciseStats[exerciseId]) {
              exerciseStats[exerciseId] = {
                exerciseName,
                timesAssigned: 0,
                totalCompletionPercentage: 0,
                timesFullyCompleted: 0
              };
            }

            exerciseStats[exerciseId].timesAssigned++;
            exerciseStats[exerciseId].totalCompletionPercentage += completionPercentage;
            
            // Consider "fully completed" if >= 80%
            if (completionPercentage >= 80) {
              exerciseStats[exerciseId].timesFullyCompleted++;
            }
          });
        });

        // Convert to array and calculate rates
        const completionData: ExerciseCompletionData[] = Object.entries(exerciseStats)
          .map(([exerciseId, stats]) => {
            const avgCompletionPercentage = stats.totalCompletionPercentage / stats.timesAssigned;
            const completionRate = (stats.timesFullyCompleted / stats.timesAssigned) * 100;

            return {
              exerciseId,
              exerciseName: stats.exerciseName,
              completionRate: Math.round(completionRate),
              timesAssigned: stats.timesAssigned,
              timesCompleted: stats.timesFullyCompleted,
              avgCompletionPercentage: Math.round(avgCompletionPercentage)
            };
          })
          // Sort by completion rate (lowest first to highlight problem exercises)
          .sort((a, b) => a.completionRate - b.completionRate);

        setData(completionData);
      } catch (err) {
        console.error('Error fetching exercise completion data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch completion data');
      } finally {
        setLoading(false);
      }
    };

    fetchCompletionData();
  }, [clientId, monthsBack]);

  return { data, loading, error };
}
