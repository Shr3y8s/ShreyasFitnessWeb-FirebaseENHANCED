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

// ========== SUBSCRIPTION TIERS ==========
// IMPORTANT: This mirrors firebase/functions/product-config.js
// Single source of truth is product-config.js - keep these in sync
// Frontend can't import from /functions, so we duplicate here
// When adding/changing Stripe products, update BOTH files:
//   1. firebase/functions/product-config.js (backend)
//   2. app/src/lib/constants.ts (frontend) <- this file
export const SUBSCRIPTION_TIERS = {
  ONLINE_COACHING: 'prod_SwvHrfi1C4k4pS',     // Has check-ins
  COMPLETE_TRANSFORMATION: 'prod_SwvI0SWs0J3DMQ', // Has check-ins
  IN_PERSON_4PACK: 'prod_RWc0eUkVInO8a4',     // No check-ins
} as const;

// Tiers that include online coaching (need onboarding consultation)
// Same as check-in eligible products
export const ONLINE_COACHING_TIERS = [
  SUBSCRIPTION_TIERS.ONLINE_COACHING,
  SUBSCRIPTION_TIERS.COMPLETE_TRANSFORMATION,
] as const;

// Helper function to check if user has online coaching
export function hasOnlineCoaching(tier: string | undefined): boolean {
  if (!tier) return false;
  return ONLINE_COACHING_TIERS.includes(tier as any);
}

// Note: Additional constants can be added as needed.
