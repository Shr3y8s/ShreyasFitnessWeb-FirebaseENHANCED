import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { subWeeks, format } from 'date-fns';

interface ExerciseDataPoint {
  date: string; // Formatted date string
  timestamp: Date; // Actual date for sorting
  weight: number;
  unit: string;
}

interface ExerciseProgression {
  exerciseId: string;
  exerciseName: string;
  dataPoints: ExerciseDataPoint[];
  color: string;
  timesPerformed: number;
}

interface UseStrengthProgressionDataResult {
  data: ExerciseProgression[];
  loading: boolean;
  error: string | null;
  allExercises: string[]; // List of all exercise names for reference
}

// Color palette for different exercise lines
const CHART_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Orange
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
];

/**
 * Hook to fetch and calculate strength progression data for a client
 * Tracks max weight lifted per exercise over time
 * @param clientId - The client's user ID
 * @param weeksBack - Number of weeks to analyze (default: 12)
 * @param topN - Number of top exercises to show (default: 6)
 */
export function useStrengthProgressionData(
  clientId: string,
  weeksBack: number = 12,
  topN: number = 6
): UseStrengthProgressionDataResult {
  const [data, setData] = useState<ExerciseProgression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allExercises, setAllExercises] = useState<string[]>([]);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const fetchProgressionData = async () => {
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

        if (snapshot.empty) {
          setData([]);
          setAllExercises([]);
          return;
        }

        // Track exercise data: { exerciseId: { name, dataPoints[], count } }
        const exerciseData: Record<string, {
          exerciseName: string;
          dataPoints: ExerciseDataPoint[];
          count: number;
        }> = {};

        snapshot.docs.forEach(doc => {
          const workout = doc.data();
          const completedAt = workout.completedAt?.toDate();
          
          if (!completedAt || !workout.exercises) return;

          workout.exercises.forEach((exercise: any) => {
            // Only track strength exercises with actual data
            if (exercise.exerciseType !== 'strength' || !exercise.actual) return;
            
            if (exercise.actual.type !== 'strength' || !exercise.actual.completedSets) return;

            // Find max weight in this workout for this exercise
            let maxWeight = 0;
            let weightUnit = 'lbs';

            exercise.actual.completedSets.forEach((set: any) => {
              if (set.completed && set.actualWeight) {
                if (set.actualWeight > maxWeight) {
                  maxWeight = set.actualWeight;
                  weightUnit = set.actualWeightUnit || 'lbs';
                }
              }
            });

            if (maxWeight === 0) return;

            const exerciseId = exercise.exerciseId;
            const exerciseName = exercise.exerciseName;

            // Initialize exercise tracking
            if (!exerciseData[exerciseId]) {
              exerciseData[exerciseId] = {
                exerciseName,
                dataPoints: [],
                count: 0
              };
            }

            // Add data point
            exerciseData[exerciseId].dataPoints.push({
              date: format(completedAt, 'MMM d'),
              timestamp: completedAt,
              weight: maxWeight,
              unit: weightUnit
            });
            
            exerciseData[exerciseId].count++;
          });
        });

        // Get all exercise names
        const allExerciseNames = Object.values(exerciseData)
          .map(e => e.exerciseName)
          .sort();
        setAllExercises(allExerciseNames);

        // Select top N most frequently performed exercises
        const topExercises = Object.entries(exerciseData)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, topN);

        // Format for chart
        const progressionData: ExerciseProgression[] = topExercises.map(
          ([exerciseId, data], index) => ({
            exerciseId,
            exerciseName: data.exerciseName,
            dataPoints: data.dataPoints.sort((a, b) => 
              a.timestamp.getTime() - b.timestamp.getTime()
            ),
            color: CHART_COLORS[index % CHART_COLORS.length],
            timesPerformed: data.count
          })
        );

        setData(progressionData);
      } catch (err) {
        console.error('Error fetching strength progression data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch progression data');
      } finally {
        setLoading(false);
      }
    };

    fetchProgressionData();
  }, [clientId, weeksBack, topN]);

  return { data, loading, error, allExercises };
}
