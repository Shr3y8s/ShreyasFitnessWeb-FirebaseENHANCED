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
  creditsToRefund?: number; // 0 to available; omit for default cap (MAX_CLIENT_REFUND_CREDITS=2)
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
 * Cancel a client's subscription (admin only)
 * Cancels at period end - client keeps access until billing period ends
 * @param params - Cancel parameters
 * @returns Cancel result with access end date
 */
export async function adminCancelSubscription(params: {
  targetUserId: string;
  reason: string;
}): Promise<{ success: boolean; message: string; accessUntil?: string }> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Must be authenticated to cancel subscriptions');
  }

  const cancelFn = httpsCallable<typeof params, { success: boolean; message: string; accessUntil?: string }>(
    functions,
    'adminCancelSubscription'
  );

  try {
    const result = await cancelFn(params);
    return result.data;
  } catch (error: any) {
    console.error('Error canceling subscription:', error);
    const message = error.message || 'Failed to cancel subscription';
    throw new Error(message);
  }
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
