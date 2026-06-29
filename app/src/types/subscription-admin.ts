// Subscription Management Console — shared client types (subscription-management FR-2…FR-15).
//
// These mirror the shapes returned by the admin-gated callables in
// firebase/functions/payments/index.js (Phase 3). Provider-neutral concepts
// (`tierId`/`tierName`) live here; PayPal-specific identity (`planId`, status,
// pricing schemes) is surfaced read-mostly for the console. All amounts are MINOR
// units (cents) unless suffixed otherwise.

/** A plan row from `listPaypalPlans` (Firestore `paypalPlans` registry + live count). */
export interface PaypalPlanRow {
  planId: string;            // 'P-…' (doc id)
  productId: string | null;  // PayPal product id the plan belongs to
  tierId: string | null;     // neutral app product id: 'online_coaching' | 'complete_transformation'
  tierName: string | null;
  amountMinor: number | null;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  env: string | null;        // 'sandbox' | 'production'
  name: string;
  activeSubscriptions: number;
}

/** A subscriber row from `listPlanSubscriptions`. */
export interface PlanSubscriptionRow {
  userId: string;
  name: string | null;
  email: string | null;
  subscriptionId: string;
  status: string;            // 'active' | 'paused' | 'canceled' | …
  tierId: string | null;
  tierName: string | null;
  currentPeriodEnd: number | null; // epoch ms
  cancelAtPeriodEnd: boolean;
}

/** Full detail from `getPaypalSubscriptionDetail`. */
export interface PaypalSubscriptionDetail {
  subscription: {
    id: string;
    status: string | null;
    planId: string | null;
    nextBillingTime: string | null; // ISO
    startTime: string | null;       // ISO
    lastPaymentAmountMinor: number | null;
    lastPaymentTime: string | null; // ISO
  };
  user: {
    userId: string;
    name: string | null;
    email: string | null;
    tierId: string | null;
    tierName: string | null;
    subscriptionPlanId: string | null;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number | null; // epoch ms
  } | null;
}

/**
 * A row from `listAllSubscriptions` — the global all-status subscriptions list,
 * sourced from the neutral `billing_customers/{uid}/subscriptions` store (retains
 * canceled/paused, unlike the active-only `users`-doc source). Tier is the neutral
 * grouping; the PayPal subscription id is a provider reference only.
 */
export interface AllSubscriptionRow {
  userId: string;
  subscriptionId: string;       // provider reference (PayPal I-…)
  provider: string;             // 'paypal' | 'stripe' | …
  status: string;               // 'active' | 'paused' | 'canceled' | …
  priceId: string | null;       // provider plan id (P-…) — reference only
  productId: string | null;     // neutral app product id
  tierName: string | null;
  amountMinor: number | null;
  interval: 'month' | 'year' | string;
  /** Billing cadence (prepay-plans Phase A): 1 = monthly, 3 = quarterly. Default 1. */
  intervalCount?: number;
  currentPeriodEnd: number | null; // epoch ms (next billing)

  startedAt: number | null;        // epoch ms
  cancelAtPeriodEnd: boolean;
}

/** Reprice action used by `repricePlans` (FR-11/FR-12). */
export type RepriceMode = 'percent' | 'amount' | 'set';
export interface RepriceAction {
  mode: RepriceMode;
  value: number; // percent → %, amount → whole dollars (+/-), set → whole dollars
}

/** One row of a `repricePlans` dry-run preview. */
export interface RepricePreviewRow {
  planId: string;
  name?: string;
  tierId?: string | null;
  oldMinor?: number;
  newMinor?: number;
  currency?: string;
  error?: string; // 'not_in_registry'
}

/** One row of a `repricePlans` apply result. */
export interface RepriceResultRow {
  planId: string;
  ok: boolean;
  newMinor?: number;
  error?: string;
}
