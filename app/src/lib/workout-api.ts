/**
 * WORKOUT API INTEGRATION
 * Firebase Cloud Functions integration for polymorphic workout system
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  WorkoutTemplate,
  WorkoutAssignment,
  WorkoutExecution,
  WorkoutAssignmentExercise,
  WorkoutExecutionExercise,
} from '@/types/workout';

// ============================================================================
// TYPE DEFINITIONS FOR API CALLS
// ============================================================================

interface AssignWorkoutRequest {
  workoutTemplateId: string;
  clientId: string;
  exercises: WorkoutAssignmentExercise[];
  scheduledDate: string; // YYYY-MM-DD format
  dueDate?: string; // YYYY-MM-DD format
  notes?: string;
  name?: string;
  // Note: description comes from template, not stored in assignment
}

interface AssignWorkoutResponse {
  success: boolean;
  assignmentId: string;
  assignment: WorkoutAssignment;
}

interface StartExecutionRequest {
  workoutAssignmentId: string;
}

interface StartExecutionResponse {
  success: boolean;
  executionId: string;
  execution: WorkoutExecution;
  resumed: boolean;
}

interface UpdateExecutionRequest {
  executionId: string;
  exercises: WorkoutExecutionExercise[];
  durationMinutes: number;
  overallNotes?: string;
}

interface UpdateExecutionResponse {
  success: boolean;
  executionId: string;
}

interface CompleteExecutionRequest {
  executionId: string;
  exercises: WorkoutExecutionExercise[];
  durationMinutes: number;
  overallNotes?: string;
}

interface CompleteExecutionResponse {
  success: boolean;
  executionId: string;
  completionStatus: 'completed' | 'partial' | 'not_started';
  completionPercentage: number;
  stats: {
    completedExercises: number;
    partialExercises: number;
    totalExercises: number;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Assign a workout template to a client with configured parameters
 * 
 * @param data - Assignment configuration
 * @returns Promise with assignment ID and data
 * 
 * @example
 * ```typescript
 * const result = await assignWorkout({
 *   workoutTemplateId: 'template_123',
 *   clientId: 'client_456',
 *   exercises: configuredExercises,
 *   scheduledDate: '2025-12-10',
 *   notes: 'Focus on form'
 * });
 * console.log('Assigned:', result.assignmentId);
 * ```
 */
export async function assignWorkout(
  data: AssignWorkoutRequest
): Promise<AssignWorkoutResponse> {
  const assignWorkoutFn = httpsCallable<AssignWorkoutRequest, AssignWorkoutResponse>(
    functions,
    'assignWorkout'
  );

  try {
    const result = await assignWorkoutFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error assigning workout:', error);
    throw new Error(error.message || 'Failed to assign workout');
  }
}

/**
 * Start a workout execution session
 * Creates a new execution record or resumes an existing in-progress execution
 * 
 * @param workoutAssignmentId - ID of the assignment to execute
 * @returns Promise with execution ID and data
 * 
 * @example
 * ```typescript
 * const result = await startWorkoutExecution('assignment_123');
 * if (result.resumed) {
 *   console.log('Resumed existing execution');
 * } else {
 *   console.log('Started new execution');
 * }
 * ```
 */
export async function startWorkoutExecution(
  workoutAssignmentId: string
): Promise<StartExecutionResponse> {
  const startFn = httpsCallable<StartExecutionRequest, StartExecutionResponse>(
    functions,
    'startWorkoutExecution'
  );

  try {
    const result = await startFn({ workoutAssignmentId });
    return result.data;
  } catch (error: any) {
    console.error('Error starting workout execution:', error);
    throw new Error(error.message || 'Failed to start workout execution');
  }
}

/**
 * Update a workout execution with actual performance data
 * Called periodically as the client completes exercises
 * 
 * @param data - Execution update data
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * await updateWorkoutExecution({
 *   executionId: 'exec_123',
 *   exercises: updatedExercises,
 *   durationMinutes: 45,
 *   overallNotes: 'Feeling strong today'
 * });
 * ```
 */
export async function updateWorkoutExecution(
  data: UpdateExecutionRequest
): Promise<UpdateExecutionResponse> {
  const updateFn = httpsCallable<UpdateExecutionRequest, UpdateExecutionResponse>(
    functions,
    'updateWorkoutExecution'
  );

  try {
    const result = await updateFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error updating workout execution:', error);
    throw new Error(error.message || 'Failed to update workout execution');
  }
}

/**
 * Complete a workout execution
 * Finalizes the execution and calculates completion stats
 * 
 * @param data - Final execution data
 * @returns Promise with completion stats
 * 
 * @example
 * ```typescript
 * const result = await completeWorkoutExecution({
 *   executionId: 'exec_123',
 *   exercises: finalExercises,
 *   durationMinutes: 60,
 *   overallNotes: 'Great workout!'
 * });
 * console.log(`Completed ${result.stats.completedExercises}/${result.stats.totalExercises} exercises`);
 * ```
 */
export async function completeWorkoutExecution(
  data: CompleteExecutionRequest
): Promise<CompleteExecutionResponse> {
  const completeFn = httpsCallable<CompleteExecutionRequest, CompleteExecutionResponse>(
    functions,
    'completeWorkoutExecution'
  );

  try {
    const result = await completeFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error completing workout execution:', error);
    throw new Error(error.message || 'Failed to complete workout execution');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format date for API calls (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse API date string to Date object
 */
export function parseAPIDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

/**
 * Calculate workout duration in minutes
 */
export function calculateDuration(startTime: Date, endTime?: Date): number {
  const end = endTime || new Date();
  return Math.round((end.getTime() - startTime.getTime()) / 60000);
}
