// app/src/lib/subscription-api.ts

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { PAYPAL_ENV } from './constants';

/**
 * Subscription Management API
 * Frontend wrappers for subscription Cloud Functions
 */

export interface CancelSubscriptionData {
  reason?: string;
}

export interface PauseSubscriptionData {
  duration: 1 | 2 | 3;
  reason?: string;
}

export interface SubscriptionAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Cancel subscription at period end
 * User keeps access until current billing period ends
 */
export const cancelSubscription = async (
  data: CancelSubscriptionData
): Promise<SubscriptionAPIResponse> => {
  const cancelFn = httpsCallable(functions, 'cancelSubscription');
  try {
    const result = await cancelFn({ ...data, paypalEnv: PAYPAL_ENV });
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription',
    };
  }
};

/**
 * Pause subscription for 1, 2, or 3 months
 * Access blocked immediately, auto-resumes on scheduled date
 */
export const pauseSubscription = async (
  data: PauseSubscriptionData
): Promise<SubscriptionAPIResponse> => {
  const pauseFn = httpsCallable(functions, 'pauseSubscription');
  try {
    const result = await pauseFn({ ...data, paypalEnv: PAYPAL_ENV });
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Pause subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to pause subscription',
    };
  }
};

/**
 * Resume paused subscription early
 * Billing restarts immediately, full access restored
 */
export const resumeSubscription = async (): Promise<SubscriptionAPIResponse> => {
  const resumeFn = httpsCallable(functions, 'resumeSubscription');
  try {
    const result = await resumeFn({ paypalEnv: PAYPAL_ENV });
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Resume subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to resume subscription',
    };
  }
};

/**
 * Reactivate canceled subscription before period ends
 * Removes cancel_at_period_end flag, billing continues normally
 */
export const reactivateSubscription = async (): Promise<SubscriptionAPIResponse> => {
  const reactivateFn = httpsCallable(functions, 'reactivateSubscription');
  try {
    const result = await reactivateFn({ paypalEnv: PAYPAL_ENV });
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Reactivate subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reactivate subscription',
    };
  }
};
