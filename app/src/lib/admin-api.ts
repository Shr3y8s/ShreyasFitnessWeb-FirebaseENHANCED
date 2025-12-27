import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';

/**
 * Admin API utilities for administrative operations
 * These functions require admin role
 */

export interface DeleteAccountParams {
  targetUserId: string;
  adminOverride?: boolean;
  reason: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  deletedUserId: string;
  stripeCustomerId: string;
  itemsDeleted: {
    photos: number;
    activities: number;
    workouts: number;
    surveys: number;
    messages: number;
    plans: number;
  };
}

/**
 * Delete a user account (admin only)
 * Requires admin role, performs comprehensive deletion with validation
 * @param params - Deletion parameters
 * @returns Deletion result with counts of deleted items
 */
export async function deleteAccount(params: DeleteAccountParams): Promise<DeleteAccountResponse> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Must be authenticated to delete accounts');
  }

  const functions = getFunctions();
  const deleteAccountFn = httpsCallable<DeleteAccountParams, DeleteAccountResponse>(
    functions,
    'deleteAccount'
  );

  try {
    const result = await deleteAccountFn(params);
    return result.data;
  } catch (error: any) {
    console.error('Error deleting account:', error);
    
    // Extract meaningful error message
    const message = error.message || 'Failed to delete account';
    throw new Error(message);
  }
}
