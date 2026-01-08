import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { functions } from './firebase';

/**
 * Admin API utilities for administrative operations
 * These functions require admin role
 */

export type DeletionMode = 'mock' | 'no-traces' | 'gdpr-clean';

export type DeletionStepStatus = 'pending' | 'processing' | 'complete' | 'error' | 'skipped';

export interface DeletionStep {
  name: string;
  collection: string;
  queryFilter?: string;
  status: DeletionStepStatus;
  itemsFound: number;
  itemsDeleted: number;
  sampleItems?: string[];
  error?: string;
}

export interface DeleteAccountParams {
  targetUserId: string;
  mode: DeletionMode;
  adminOverride?: boolean;
  reason: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
  mode: DeletionMode;
  deletedUserId: string;
  stripeCustomerId: string;
  steps: DeletionStep[];
  summary: {
    totalCollectionsProcessed: number;
    totalItemsFound: number;
    totalItemsDeleted: number;
    stripeCustomerStatus: 'deleted' | 'anonymized' | 'preserved';
    firebaseAuthStatus: 'deleted' | 'preserved';
  };
  // Legacy fields for backward compatibility
  itemsDeleted?: {
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
