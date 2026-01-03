import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Workout } from '@/types/workout';
import { ClientData } from '../utils/assignmentHelpers';

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  exercises?: any[];
  difficulty?: string;
  targetMuscleGroups?: string[];
}

export function useAssignmentsData() {
  const router = useRouter();
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      try {
        // Fetch clients assigned to this trainer
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('assignedTrainerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData: ClientData[] = [];
        clientsSnapshot.forEach((doc) => {
          clientsData.push({
            id: doc.id,
            name: doc.data().name,
            email: doc.data().email,
            tier: doc.data().tier
          });
        });
        setClients(clientsData);

        // Fetch workout templates
        const workoutsQuery = query(
          collection(db, 'workoutTemplates'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        const workoutsData: WorkoutTemplate[] = [];
        workoutsSnapshot.forEach((doc) => {
          const data = doc.data();
          workoutsData.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            estimatedDuration: data.estimatedDuration,
            exercises: data.exercises,
            difficulty: data.difficulty,
            targetMuscleGroups: data.targetMuscleGroups
          });
        });
        setWorkoutTemplates(workoutsData);

        // Fetch workouts (unified model - replaces workoutAssignments + workoutExecutions)
        const workoutsCollectionQuery = query(
          collection(db, 'workouts'),
          where('trainerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const workoutsCollectionSnapshot = await getDocs(workoutsCollectionQuery);
        const workoutsCollectionData: Workout[] = [];
        workoutsCollectionSnapshot.forEach((doc) => {
          const data = doc.data();
          workoutsCollectionData.push({
            id: doc.id,
            clientId: data.clientId,
            trainerId: data.trainerId,
            name: data.name || 'Unnamed Workout',
            status: data.status || 'scheduled',
            scheduledDate: data.scheduledDate?.toDate() || new Date(),
            dueDate: data.dueDate?.toDate() || undefined,
            completedAt: data.completedAt?.toDate() || undefined,
            startedAt: data.startedAt?.toDate() || undefined,
            exercises: data.exercises || [],
            notes: data.notes,
            durationMinutes: data.durationMinutes,
            overallDifficulty: data.overallDifficulty,
            overallNotes: data.overallNotes,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Workout);
        });
        setWorkouts(workoutsCollectionData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router, authLoading, canAccessTrainerDashboard]);

  const reloadWorkouts = async () => {
    if (!user) return;
    
    try {
      const workoutsQuery = query(
        collection(db, 'workouts'),
        where('trainerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const workoutsSnapshot = await getDocs(workoutsQuery);
      const workoutsData: Workout[] = [];
      workoutsSnapshot.forEach((doc) => {
        const data = doc.data();
        workoutsData.push({
          id: doc.id,
          clientId: data.clientId,
          trainerId: data.trainerId,
          name: data.name || 'Unnamed Workout',
          status: data.status || 'scheduled',
          scheduledDate: data.scheduledDate?.toDate() || new Date(),
          dueDate: data.dueDate?.toDate() || undefined,
          completedAt: data.completedAt?.toDate() || undefined,
          startedAt: data.startedAt?.toDate() || undefined,
          exercises: data.exercises || [],
          notes: data.notes,
          durationMinutes: data.durationMinutes,
          overallDifficulty: data.overallDifficulty,
          overallNotes: data.overallNotes,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as Workout);
      });
      setWorkouts(workoutsData);
    } catch (error) {
      console.error('Error reloading workouts:', error);
    }
  };

  return {
    loading,
    clients,
    workoutTemplates,
    workouts,
    reloadWorkouts
  };
}
