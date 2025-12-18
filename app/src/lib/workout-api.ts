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

/**
 * Save workout execution (unified create/update)
 * Handles both creating new executions and updating existing ones
 * This is the primary function for the "Save Progress" button
 * 
 * @param workoutAssignmentId - ID of the assignment being executed
 * @param execution - Full execution data including exercises with actualData
 * @returns Promise with execution ID and data
 * 
 * @example
 * ```typescript
 * const result = await saveWorkoutExecution(
 *   'assignment_123',
 *   workoutExecutionData
 * );
 * if (result.isUpdate) {
 *   console.log('Progress updated');
 * } else {
 *   console.log('Execution created');
 * }
 * ```
 */
export async function saveWorkoutExecution(
  workoutAssignmentId: string,
  execution: WorkoutExecution
): Promise<{
  success: boolean;
  executionId: string;
  execution: WorkoutExecution;
  isUpdate: boolean;
}> {
  const saveFn = httpsCallable<
    { workoutAssignmentId: string; execution: WorkoutExecution },
    { success: boolean; executionId: string; execution: WorkoutExecution; isUpdate: boolean }
  >(functions, 'saveWorkoutExecution');

  try {
    const result = await saveFn({ workoutAssignmentId, execution });
    return result.data;
  } catch (error: any) {
    console.error('Error saving workout execution:', error);
    throw new Error(error.message || 'Failed to save workout execution');
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

// ============================================================================
// WORKOUT TEMPLATE MANAGEMENT
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
  template: any;
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
 * Checks for active assignments and decrements exercise usage counts
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
