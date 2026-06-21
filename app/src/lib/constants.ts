/**
 * Application Constants
 * Centralized configuration for external service URLs and app-wide constants
 */

// ========== CALENDLY URLs ==========
export const CALENDLY_URLS = {
  BASE: 'https://calendly.com/shreyas-annapureddy',
  
  // Event-specific URLs
  INTRO_CALL: 'https://calendly.com/shreyas-annapureddy/30min',
  TRAINING_SESSION: 'https://calendly.com/shreyas-annapureddy/1-1-training-session',
  WEEKLY_CHECKIN: 'https://calendly.com/shreyas-annapureddy/weekly-checkin',
  ONBOARDING_CONSULTATION: 'https://calendly.com/shreyas-annapureddy/30-min-onboarding-consultation',
} as const;

// ========== APP PRODUCTS (provider-neutral, env-independent) ==========
// The app's OWN product catalog. These ids are the single source of truth for
// what we sell, the price shown (= price charged), and tier semantics. They are
// the SAME in dev and prod — the env-specific *provider* ids (PayPal plan ids,
// Stripe product/price ids) are mapped from these inside the payment adapters
// only (app/src/lib/payments/providers/*). The app NEVER hardcodes a provider id.
//
// `user.tier` stores an AppProductId (e.g. 'online_coaching'). Historically it
// stored a Stripe product id (`prod_…`); a one-time migration converts existing
// docs (firebase/scripts/migrate-tier-ids.js).
export type AppProductId =
  | 'in_person'
  | 'in_person_4pack'
  | 'online_coaching'
  | 'complete_transformation';

export interface AppProduct {
  id: AppProductId;
  name: string;
  kind: 'subscription' | 'one_time';
  /** Price in MINOR units (cents) — the amount shown AND charged. */
  amount: number;
  interval?: 'month';
  /** One-time fee charged with the first subscription cycle (CT first session). */
  setupFee?: number;
  /** True for tiers that include weekly check-ins (Online Coaching family). */
  hasCheckins: boolean;
  /** Sessions granted for one-time session packages (1, 4). */
  sessionsIncluded?: number;
}

export const APP_PRODUCTS: Record<AppProductId, AppProduct> = {
  in_person: {
    id: 'in_person',
    name: 'In-Person Training Session',
    kind: 'one_time',
    amount: 7500, // $75
    hasCheckins: false,
    sessionsIncluded: 1,
  },
  in_person_4pack: {
    id: 'in_person_4pack',
    name: '4-Pack In-Person Sessions',
    kind: 'one_time',
    amount: 24000, // $240
    hasCheckins: false,
    sessionsIncluded: 4,
  },
  online_coaching: {
    id: 'online_coaching',
    name: 'Online Coaching',
    kind: 'subscription',
    amount: 25000, // $250/mo
    interval: 'month',
    hasCheckins: true,
  },
  complete_transformation: {
    id: 'complete_transformation',
    name: 'Complete Transformation',
    kind: 'subscription',
    amount: 25000, // $250/mo
    interval: 'month',
    setupFee: 6000, // $60 discounted in-person session at signup (first cycle)
    hasCheckins: true,
  },
};

/** Look up an app product by id (or null). */
export function getAppProduct(id: string | undefined | null): AppProduct | null {
  if (!id) return null;
  return (APP_PRODUCTS as Record<string, AppProduct>)[id] ?? null;
}

// ========== SERVICE TIERS (app product ids) ==========
// Back-compat alias: many screens compare `user.tier` against `SERVICE_TIERS.X`.
// These now resolve to the provider-neutral AppProductIds above (same dev+prod),
// so those comparisons keep working without per-call changes.
export const SERVICE_TIERS = {
  IN_PERSON: 'in_person',
  IN_PERSON_4PACK: 'in_person_4pack',
  ONLINE_COACHING: 'online_coaching',
  COMPLETE_TRANSFORMATION: 'complete_transformation',
} as const;



// In-person product IDs (one-time session purchases — single or 4-pack).
export const IN_PERSON_TIERS = [
  SERVICE_TIERS.IN_PERSON,
  SERVICE_TIERS.IN_PERSON_4PACK,
] as const;

// Tiers that include online coaching (need onboarding consultation)
// Same as check-in eligible products
export const ONLINE_COACHING_TIERS = [
  SERVICE_TIERS.ONLINE_COACHING,
  SERVICE_TIERS.COMPLETE_TRANSFORMATION,
] as const;


// Helper function to check if user has online coaching
export function hasOnlineCoaching(tier: string | undefined): boolean {
  if (!tier) return false;
  return ONLINE_COACHING_TIERS.includes(tier as any);
}


// ========== PAYPAL CONFIG (Billing Plans + one-time amounts) ==========
// PayPal launch processor. See docs/02-implementation/payment-processor/
// payment-processor-design.md §7.1.
//
// DUAL ENV (NFR-7): PayPal sandbox and live are fully isolated (separate
// dashboards, credentials, API base, webhooks, and plan IDs). We pick the set
// from NEXT_PUBLIC_PAYPAL_ENV — `sandbox` in dev (`.env.local`), `production` in
// prod (`apphosting.yaml`). Unlike Stripe there is no shared catalog to filter.
//
// Recurring tiers resolve to a PayPal **Billing Plan id** (`P-xxxx`), created via
// firebase/scripts/paypal-setup-catalog.js. One-time items (single session,
// 4-pack) carry NO plan — they are charged via the Orders API, so we only store
// their amount (minor units / cents) + label. The Complete Transformation $60
// discounted in-person session is NOT here — it is the `setup_fee` baked into the
// CT billing plan (charged with the first cycle).
export const PAYPAL_ENV = (process.env.NEXT_PUBLIC_PAYPAL_ENV || 'sandbox').toLowerCase();
export const PAYPAL_LIVE = PAYPAL_ENV === 'production';

// Recurring Billing Plans (P-xxxx). Sandbox created 2026-06-19; LIVE filled at
// cutover (Phase 5) by re-running the catalog script with live credentials.
const SANDBOX_PLANS = {
  ONLINE_COACHING: 'P-98H09129JK640830CNI26BLQ',
  COMPLETE_TRANSFORMATION: 'P-9YF75345BP118725ENI26GLI',
} as const;

const LIVE_PLANS = {
  ONLINE_COACHING: 'P-96194639LX633004DNI4ANSI',
  COMPLETE_TRANSFORMATION: 'P-3S168526T8851291KNI4ANSI',
} as const;

export const PAYPAL_PLANS = PAYPAL_LIVE ? LIVE_PLANS : SANDBOX_PLANS;

// One-time items (Orders API, no plan). `amount` is in MINOR units (cents),
// matching the neutral `Price.amount` convention.
export const PAYPAL_ONETIME = {
  IN_PERSON:       { amount: 7500,  label: 'In-Person Training Session' }, // $75
  IN_PERSON_4PACK: { amount: 24000, label: '4-Pack In-Person Sessions' },  // $240
} as const;

// ========== UNIFIED CHECKOUT ITEMS (design §2.7) ==========
// Registry the generic `/checkout?item=<KEY>` page resolves. Keyed by a short,
// non-sensitive URL param — the URL carries ONLY the key; amounts, plan ids, and
// product ids are resolved here / adapter-side (nothing chargeable is trusted from
// the URL). `productId` stays the Stripe product id (= neutral Product.id, design
// §2.6) so the active provider's checkout priceId is resolved the usual way:
// getPaymentProvider({mode}).fetchProduct(productId) → select…Price → price.id.
export type CheckoutItemKey =
  | 'IN_PERSON'
  | 'IN_PERSON_4PACK'
  | 'ONLINE_COACHING'
  | 'COMPLETE_TRANSFORMATION';

export interface CheckoutItem {
  /** Routed to getPaymentProvider({mode}). */
  mode: 'payment' | 'subscription';
  /** Stripe product id (neutral Product.id / user.tier). */
  productId: string;
  /** Which fulfillment signal the success page waits for. */
  fulfillment: 'session_package' | 'subscription_active';
  /** Human label for the checkout summary (display only). */
  label: string;
}

export const CHECKOUT_ITEMS: Record<CheckoutItemKey, CheckoutItem> = {
  IN_PERSON: {
    mode: 'payment',
    productId: SERVICE_TIERS.IN_PERSON,
    fulfillment: 'session_package',
    label: 'In-Person Training Session',
  },
  IN_PERSON_4PACK: {
    mode: 'payment',
    productId: SERVICE_TIERS.IN_PERSON_4PACK,
    fulfillment: 'session_package',
    label: '4-Pack In-Person Sessions',
  },
  ONLINE_COACHING: {
    mode: 'subscription',
    productId: SERVICE_TIERS.ONLINE_COACHING,
    fulfillment: 'subscription_active',
    label: 'Online Coaching',
  },
  COMPLETE_TRANSFORMATION: {
    mode: 'subscription',
    productId: SERVICE_TIERS.COMPLETE_TRANSFORMATION,
    fulfillment: 'subscription_active',
    label: 'Complete Transformation',
  },
};

/** Resolve a CHECKOUT_ITEMS entry from an unknown URL param; null when invalid. */
export function getCheckoutItem(key: string | null | undefined): CheckoutItem | null {
  if (!key) return null;
  return (CHECKOUT_ITEMS as Record<string, CheckoutItem>)[key] ?? null;
}

/** Reverse lookup: a Stripe product id (user.tier) → its CHECKOUT_ITEMS key. */
export function getCheckoutKeyForProduct(productId: string): CheckoutItemKey | null {
  const entry = (Object.entries(CHECKOUT_ITEMS) as [CheckoutItemKey, CheckoutItem][]).find(
    ([, v]) => v.productId === productId
  );
  return entry ? entry[0] : null;
}


// Note: Additional constants can be added as needed.



