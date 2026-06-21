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

// ========== SERVICE TIERS (Stripe product IDs) ==========
// Maps each selectable signup product to its Stripe product ID.
// `user.tier` stores whichever product the client chose at signup, so this
// includes BOTH the recurring subscriptions (Online Coaching, Complete
// Transformation) AND the one-time in-person products (single session, 4-pack).
// These are NOT all "subscriptions" — the name is "service tiers" because any
// of them can be the value of `user.tier` that trainer/admin screens compare against.
//
// DUAL MODE: product IDs differ between Stripe test mode and live mode. We pick
// the set based on the publishable key prefix, which is the only thing that
// differs per environment (`.env.local` = pk_test in dev; `apphosting.yaml` =
// pk_live in prod). So `npm run dev` uses TEST product IDs and production uses
// LIVE — no extra env var to manage.
//
// IMPORTANT: Keep the subscription/check-in subset in sync with
// firebase/functions/product-config.js `CHECKIN_ELIGIBLE_PRODUCTS` (which lists
// BOTH test + live IDs since product IDs are globally unique).
// Frontend can't import from /functions, so the IDs are duplicated.
const STRIPE_LIVE = (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '').startsWith('pk_live');

const LIVE_TIERS = {
  IN_PERSON: 'prod_UiweIP2zdj2sRv',              // One-time single session, no check-ins
  IN_PERSON_4PACK: 'prod_UiwQCggpkdr6S5',        // One-time 4-pack, no check-ins
  ONLINE_COACHING: 'prod_Uiwc6hs1G6YlIf',        // Subscription, has check-ins
  COMPLETE_TRANSFORMATION: 'prod_UiwXMrl2KqquZD', // Subscription, has check-ins
} as const;

const TEST_TIERS = {
  IN_PERSON: 'prod_SwuHPYlY94VZyY',              // One-time single session, no check-ins
  IN_PERSON_4PACK: 'prod_SwvMUVeTqAnveu',        // One-time 4-pack, no check-ins
  ONLINE_COACHING: 'prod_SwvHrfi1C4k4pS',        // Subscription, has check-ins
  COMPLETE_TRANSFORMATION: 'prod_SwvI0SWs0J3DMQ', // Subscription, has check-ins
} as const;

export const SERVICE_TIERS = STRIPE_LIVE ? LIVE_TIERS : TEST_TIERS;


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
  ONLINE_COACHING: '',          // TODO(Phase 5): paste live P-xxxx from catalog script
  COMPLETE_TRANSFORMATION: '',  // TODO(Phase 5): paste live P-xxxx from catalog script
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



