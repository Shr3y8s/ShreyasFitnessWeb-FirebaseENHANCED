// Subscription Management Console — client API wrappers (subscription-management Phase 4.2).
//
// Thin typed wrappers over the admin-gated callables in
// firebase/functions/payments/index.js. The console never touches Firestore
// directly — all reads/writes go through these functions (which use the admin SDK
// and re-check `assertAdmin`). Every call threads the current `PAYPAL_ENV` so the
// backend resolves the right PayPal credentials (dual-env, design §7.1).

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { PAYPAL_ENV } from '@/lib/constants';
import type {
  PaypalPlanRow,
  PlanSubscriptionRow,
  PaypalSubscriptionDetail,
  AllSubscriptionRow,
  RepriceAction,
  RepricePreviewRow,
  RepriceResultRow,
} from '@/types/subscription-admin';

async function call<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const fn = httpsCallable(functions, name);
  const res = await fn({ ...payload, paypalEnv: PAYPAL_ENV });
  return res.data as T;
}

/** List registry plans (filtered to the current env) + active-sub counts. */
export async function listPaypalPlans(): Promise<PaypalPlanRow[]> {
  const data = await call<{ ok: boolean; plans: PaypalPlanRow[] }>('listPaypalPlans', {
    env: PAYPAL_ENV,
  });
  return data?.plans || [];
}

/** Create a new monthly plan under a product. Returns the new plan id. */
export async function createPaypalPlan(input: {
  productId: string;
  name: string;
  tierId: string;
  tierName: string;
  amountMinor: number;
  interval?: 'MONTH';
  currency?: string;
}): Promise<string> {
  const data = await call<{ ok: boolean; planId: string }>('createPaypalPlan', input);
  return data.planId;
}

/** Rename and/or reprice a single plan. */
export async function updatePaypalPlan(input: {
  planId: string;
  name?: string;
  amountMinor?: number;
}): Promise<{ planId: string; updated: string[] }> {
  return call('updatePaypalPlan', input);
}

/** Turn a plan ON/OFF for NEW subscriptions (existing subscribers unaffected). */
export async function setPaypalPlanActive(planId: string, active: boolean): Promise<void> {
  await call('setPaypalPlanActive', { planId, active });
}

/** Bulk reprice — dry-run preview (writes nothing). */

export async function repricePlansPreview(
  planIds: string[],
  action: RepriceAction
): Promise<RepricePreviewRow[]> {
  const data = await call<{ ok: boolean; preview: RepricePreviewRow[] }>('repricePlans', {
    planIds,
    action,
    dryRun: true,
  });
  return data?.preview || [];
}

/** Bulk reprice — apply. Returns per-plan results. */
export async function repricePlansApply(
  planIds: string[],
  action: RepriceAction
): Promise<RepriceResultRow[]> {
  const data = await call<{ ok: boolean; results: RepriceResultRow[] }>('repricePlans', {
    planIds,
    action,
    dryRun: false,
  });
  return data?.results || [];
}

/** Subscribers of a given plan (from `users` docs). */
export async function listPlanSubscriptions(planId: string): Promise<PlanSubscriptionRow[]> {
  const data = await call<{ ok: boolean; subscriptions: PlanSubscriptionRow[] }>(
    'listPlanSubscriptions',
    { planId }
  );
  return data?.subscriptions || [];
}

/** One subscription's PayPal detail + matched user doc. */
export async function getPaypalSubscriptionDetail(
  subscriptionId: string
): Promise<PaypalSubscriptionDetail> {
  return call('getPaypalSubscriptionDetail', { subscriptionId });
}

/** Admin "Change plan" — revise a subscription to a different plan id. */
export async function revisePaypalSubscription(
  subscriptionId: string,
  newPlanId: string
): Promise<void> {
  await call('revisePaypalSubscription', { subscriptionId, newPlanId });
}

/**
 * Admin "Change price" — per-client inline same-plan override (FR-16). Sets a custom
 * recurring price for ONE subscriber (PATCH subscription; effective next cycle).
 * `newAmountMinor` is cents (≥ 100 = $1.00 floor).
 */
export async function repriceClientSubscription(
  targetUserId: string,
  newAmountMinor: number
): Promise<void> {
  await call('repriceClientSubscription', { targetUserId, newAmountMinor });
}


/** Admin-initiated cancel-at-period-end for a client's subscription. */
export async function adminCancelSubscription(
  targetUserId: string,
  reason?: string
): Promise<void> {
  // adminCancelSubscription lives in the main functions index (Stripe-era admin
  // tool); it accepts targetUserId. Threading paypalEnv is harmless.
  await call('adminCancelSubscription', { targetUserId, reason: reason || 'Admin console' });
}

/**
 * ALL subscriptions (every status) from the neutral store — the global
 * Subscriptions tab. Retains canceled/paused (unlike the active-only plan list).
 */
export async function listAllSubscriptions(): Promise<AllSubscriptionRow[]> {
  const data = await call<{ ok: boolean; subscriptions: AllSubscriptionRow[] }>(
    'listAllSubscriptions'
  );
  return data?.subscriptions || [];
}

/** Admin pause (suspend) a client's PayPal subscription. */
export async function adminPauseSubscription(targetUserId: string): Promise<void> {
  await call('adminPauseSubscription', { targetUserId });
}

/** Admin resume (re-activate) a paused subscription. */
export async function adminResumeSubscription(targetUserId: string): Promise<void> {
  await call('adminResumeSubscription', { targetUserId });
}
