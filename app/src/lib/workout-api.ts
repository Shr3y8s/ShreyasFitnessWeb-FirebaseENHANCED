/**
 * WORKOUT API INTEGRATION (UNIFIED MODEL)
 * Firebase Cloud Functions integration for unified workout system
 * 
 * REFACTORED: January 2026
 * - Works with single 'workouts' collection
 * - Simplified API: 3 workout functions instead of 5+
 * - No more dual-collection complexity
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import type {
  WorkoutTemplate,
  Workout,
  WorkoutExercise,
} from '@/types/workout';

// ============================================================================
// TYPE DEFINITIONS FOR UNIFIED WORKOUT API
// ============================================================================

interface AssignWorkoutRequest {
  workoutTemplateId: string;
  clientId: string;
  name?: string;
  description?: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    exerciseType: string;
    configuration: any; // Polymorphic configuration
    notes?: string;
  }>;
  scheduledDate: string; // YYYY-MM-DD format
  dueDate?: string; // YYYY-MM-DD format
  notes?: string;
}

interface AssignWorkoutResponse {
  success: boolean;
  workoutId: string;
  workout: Workout;
}

interface SaveWorkoutRequest {
  workoutId: string;
  exercises: WorkoutExercise[];
  durationMinutes?: number;
  overallDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  overallNotes?: string;
}

interface SaveWorkoutResponse {
  success: boolean;
  workoutId: string;
  status: 'scheduled' | 'started' | 'completed' | 'skipped';
}

interface CompleteWorkoutRequest {
  workoutId: string;
  exercises: WorkoutExercise[];
  durationMinutes: number;
  completedAt?: Date; // When client completed the workout
  overallDifficulty?: 'easy' | 'moderate' | 'hard' | 'very_hard';
  overallNotes?: string;
}

interface CompleteWorkoutResponse {
  success: boolean;
  workoutId: string;
  stats: {
    completedExercises: number;
    partialExercises: number;
    totalExercises: number;
    completionPercentage: number;
  };
}

interface DeleteWorkoutAssignmentRequest {
  workoutId: string;
}

interface DeleteWorkoutAssignmentResponse {
  success: boolean;
  workoutId: string;
  message: string;
}

interface UpdateWorkoutAssignmentRequest {
  workoutId: string;
  dueDate?: string;
  notes?: string;
  exercises?: Array<{
    exerciseId: string;
    exerciseName: string;
    exerciseType: string;
    configuration: any;
    notes?: string;
  }>;
  name?: string;
}

interface UpdateWorkoutAssignmentResponse {
  success: boolean;
  workoutId: string;
  message: string;
}

// ============================================================================
// UNIFIED WORKOUT API FUNCTIONS
// ============================================================================

/**
 * Assign a workout template to a client with configured parameters
 * Creates a unified Workout document with prescribed configuration
 * 
 * @param data - Assignment configuration with polymorphic exercise configs
 * @returns Promise with workout ID and data
 * 
 * @example
 * ```typescript
 * const result = await assignWorkout({
 *   workoutTemplateId: 'template_123',
 *   clientId: 'client_456',
 *   exercises: [{
 *     exerciseId: 'bench_press',
 *     exerciseName: 'Bench Press',
 *     exerciseType: 'strength',
 *     configuration: {
 *       exerciseType: 'strength',
 *       // ... strength-specific config
 *     }
 *   }],
 *   scheduledDate: '2025-12-10',
 *   notes: 'Focus on form'
 * });
 * console.log('Assigned workout:', result.workoutId);
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
 * Save workout progress (unified save function)
 * Updates the workout document with client's actual performance data
 * Automatically updates status: scheduled → started → completed
 * 
 * @param data - Progress update with exercises containing actual data
 * @returns Promise with workout status
 * 
 * @example
 * ```typescript
 * await saveWorkout({
 *   workoutId: 'workout_123',
 *   exercises: exercisesWithActualData,
 *   durationMinutes: 45,
 *   overallDifficulty: 'moderate',
 *   overallNotes: 'Feeling strong today'
 * });
 * ```
 */
export async function saveWorkout(
  data: SaveWorkoutRequest
): Promise<SaveWorkoutResponse> {
  const saveWorkoutFn = httpsCallable<SaveWorkoutRequest, SaveWorkoutResponse>(
    functions,
    'saveWorkout'
  );

  try {
    const result = await saveWorkoutFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error saving workout progress:', error);
    throw new Error(error.message || 'Failed to save workout progress');
  }
}

/**
 * Complete a workout
 * Finalizes the workout and marks it as completed
 * 
 * @param data - Final workout data with completed exercises
 * @returns Promise with completion stats
 * 
 * @example
 * ```typescript
 * const result = await completeWorkout({
 *   workoutId: 'workout_123',
 *   exercises: finalExercises,
 *   durationMinutes: 60,
 *   overallDifficulty: 'hard',
 *   overallNotes: 'Great workout!'
 * });
 * console.log(`Completed ${result.stats.completedExercises}/${result.stats.totalExercises} exercises`);
 * ```
 */
export async function completeWorkout(
  data: CompleteWorkoutRequest
): Promise<CompleteWorkoutResponse> {
  const completeWorkoutFn = httpsCallable<CompleteWorkoutRequest, CompleteWorkoutResponse>(
    functions,
    'completeWorkout'
  );

  try {
    const result = await completeWorkoutFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error completing workout:', error);
    throw new Error(error.message || 'Failed to complete workout');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update a scheduled workout assignment
 * Only works for workouts with status === 'scheduled'
 * Can update due date, notes, exercises, and name
 * 
 * @param data - Update data with workout ID and fields to update
 * @returns Promise with success response
 * 
 * @example
 * ```typescript
 * await updateWorkoutAssignment({
 *   workoutId: 'workout_123',
 *   dueDate: '2026-02-01',
 *   notes: 'Updated notes'
 * });
 * ```
 */
export async function updateWorkoutAssignment(
  data: UpdateWorkoutAssignmentRequest
): Promise<UpdateWorkoutAssignmentResponse> {
  const updateWorkoutFn = httpsCallable<
    UpdateWorkoutAssignmentRequest,
    UpdateWorkoutAssignmentResponse
  >(functions, 'updateWorkoutAssignment');

  try {
    const result = await updateWorkoutFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error updating workout assignment:', error);
    throw new Error(error.message || 'Failed to update workout assignment');
  }
}

/**
 * Delete a scheduled workout assignment
 * Only works for workouts with status === 'scheduled'
 * Atomically decrements template usageCount
 * 
 * @param data - Workout ID to delete
 * @returns Promise with success response
 * 
 * @example
 * ```typescript
 * try {
 *   await deleteWorkoutAssignment({ workoutId: 'workout_123' });
 *   console.log('Assignment deleted successfully');
 * } catch (error) {
 *   console.error('Cannot delete:', error.message);
 * }
 * ```
 */
export async function deleteWorkoutAssignment(
  data: DeleteWorkoutAssignmentRequest
): Promise<DeleteWorkoutAssignmentResponse> {
  const deleteWorkoutFn = httpsCallable<
    DeleteWorkoutAssignmentRequest,
    DeleteWorkoutAssignmentResponse
  >(functions, 'deleteWorkoutAssignment');

  try {
    const result = await deleteWorkoutFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error deleting workout assignment:', error);
    throw new Error(error.message || 'Failed to delete workout assignment');
  }
}

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

// ============================================================================
// WORKOUT TEMPLATE MANAGEMENT (Unchanged)
// ============================================================================

interface CreateWorkoutTemplateRequest {
  name: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed';
  estimatedDuration?: number;
  scope?: 'personal' | 'company';
  tags?: string[];
  exercises: Array<{ exerciseId: string }>;
  targetMuscleGroups?: string[];
  equipment?: string[];
}

interface CreateWorkoutTemplateResponse {
  success: boolean;
  templateId: string;
  template: WorkoutTemplate;
}

interface UpdateWorkoutTemplateRequest {
  templateId: string;
  name: string;
  description?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  category?: 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed';
  estimatedDuration?: number;
  scope?: 'personal' | 'company';
  tags?: string[];
  exercises: Array<{ exerciseId: string }>;
  targetMuscleGroups?: string[];
  equipment?: string[];
}

interface UpdateWorkoutTemplateResponse {
  success: boolean;
  templateId: string;
  changes: {
    addedExercises: number;
    removedExercises: number;
  };
}

interface DeleteWorkoutTemplateRequest {
  templateId: string;
  force?: boolean;
}

interface DeleteWorkoutTemplateResponse {
  success: boolean;
  templateId: string;
  deleted: 'hard' | 'soft';
  exercisesUpdated: number;
}

/**
 * Create a new workout template with atomic exercise usage count updates
 * Ensures data integrity by using transactions
 * 
 * @param data - Template data including exercises
 * @returns Promise with template ID and data
 * 
 * @example
 * ```typescript
 * const result = await createWorkoutTemplate({
 *   name: 'Upper Body Strength',
 *   description: 'Focus on chest, back, and shoulders',
 *   difficulty: 'intermediate',
 *   category: 'strength',
 *   estimatedDuration: 60,
 *   scope: 'company',
 *   exercises: [
 *     { exerciseId: 'bench_press_123' },
 *     { exerciseId: 'pullups_456' }
 *   ],
 *   tags: ['push', 'pull'],
 *   targetMuscleGroups: ['Chest', 'Back', 'Shoulders'],
 *   equipment: ['Barbell', 'Pull-up Bar']
 * });
 * console.log('Created template:', result.templateId);
 * ```
 */
export async function createWorkoutTemplate(
  data: CreateWorkoutTemplateRequest
): Promise<CreateWorkoutTemplateResponse> {
  const createTemplateFn = httpsCallable<CreateWorkoutTemplateRequest, CreateWorkoutTemplateResponse>(
    functions,
    'createWorkoutTemplate'
  );

  try {
    const result = await createTemplateFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error creating workout template:', error);
    throw new Error(error.message || 'Failed to create workout template');
  }
}

/**
 * Update an existing workout template with atomic exercise usage count updates
 * Handles the diff of added/removed exercises to maintain accurate counts
 * 
 * @param data - Updated template data
 * @returns Promise with success status and change statistics
 * 
 * @example
 * ```typescript
 * const result = await updateWorkoutTemplate({
 *   templateId: 'template_123',
 *   name: 'Upper Body Strength - Updated',
 *   exercises: [
 *     { exerciseId: 'bench_press_123' },
 *     { exerciseId: 'shoulder_press_789' } // new exercise
 *   ],
 *   // pullups_456 was removed
 * });
 * console.log(`Added: ${result.changes.addedExercises}, Removed: ${result.changes.removedExercises}`);
 * ```
 */
export async function updateWorkoutTemplate(
  data: UpdateWorkoutTemplateRequest
): Promise<UpdateWorkoutTemplateResponse> {
  const updateTemplateFn = httpsCallable<UpdateWorkoutTemplateRequest, UpdateWorkoutTemplateResponse>(
    functions,
    'updateWorkoutTemplate'
  );

  try {
    const result = await updateTemplateFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error updating workout template:', error);
    throw new Error(error.message || 'Failed to update workout template');
  }
}

/**
 * Delete a workout template with atomic exercise usage count updates
 * Checks for active workouts and decrements exercise usage counts
 * 
 * @param data - Template ID and optional force flag
 * @returns Promise with success status
 * 
 * @example
 * ```typescript
 * // Soft delete (marks as inactive)
 * const result = await deleteWorkoutTemplate({
 *   templateId: 'template_123'
 * });
 * 
 * // Force delete (hard delete even if assigned)
 * const result = await deleteWorkoutTemplate({
 *   templateId: 'template_123',
 *   force: true
 * });
 * console.log(`Template ${result.deleted === 'hard' ? 'deleted' : 'deactivated'}`);
 * ```
 */
export async function deleteWorkoutTemplate(
  data: DeleteWorkoutTemplateRequest
): Promise<DeleteWorkoutTemplateResponse> {
  const deleteTemplateFn = httpsCallable<DeleteWorkoutTemplateRequest, DeleteWorkoutTemplateResponse>(
    functions,
    'deleteWorkoutTemplate'
  );

  try {
    const result = await deleteTemplateFn(data);
    return result.data;
  } catch (error: any) {
    console.error('Error deleting workout template:', error);
    throw new Error(error.message || 'Failed to delete workout template');
  }
}
