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

// Note: Additional constants can be added as needed.
