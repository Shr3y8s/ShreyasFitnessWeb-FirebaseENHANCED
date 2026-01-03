import { Workout } from '@/types/workout';

export interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
}

/**
 * Calculate statistics for a specific client's workouts
 */
export function getClientStats(clientId: string, workouts: Workout[]) {
  const clientWorkouts = workouts.filter(w => w.clientId === clientId);
  const active = clientWorkouts.filter(
    w => w.status !== 'completed' && w.status !== 'skipped'
  ).length;
  const overdue = clientWorkouts.filter(w => 
    w.status !== 'completed' && 
    w.status !== 'skipped' && 
    w.dueDate && 
    new Date(w.dueDate) < new Date()
  ).length;
  
  return { 
    active, 
    overdue, 
    total: clientWorkouts.length 
  };
}

/**
 * Calculate overall workout statistics
 */
export function getWorkoutCounts(workouts: Workout[]) {
  return {
    total: workouts.length,
    active: workouts.filter(
      w => w.status !== 'completed' && w.status !== 'skipped'
    ).length,
    completed: workouts.filter(w => w.status === 'completed').length,
    overdue: workouts.filter(w => 
      w.status !== 'completed' && 
      w.status !== 'skipped' && 
      w.dueDate && 
      new Date(w.dueDate) < new Date()
    ).length
  };
}

/**
 * Determine display status for a workout (handles overdue calculation)
 */
export function getWorkoutDisplayStatus(workout: Workout): string {
  const isOverdue = 
    workout.status !== 'completed' && 
    workout.status !== 'skipped' && 
    workout.dueDate && 
    new Date(workout.dueDate) < new Date();
  
  if (isOverdue) return 'overdue';
  if (workout.status === 'started') return 'in_progress';
  return workout.status;
}

/**
 * Get status badge color classes
 */
export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get status display label
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'overdue':
      return 'Overdue';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}
