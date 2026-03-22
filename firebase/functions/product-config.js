/**
 * Product Configuration for Firebase Cloud Functions
 * 
 * Maps Stripe product IDs to eligibility rules and feature access.
 * 
 * IMPORTANT: Keep in sync with app/src/lib/product-marketing.ts
 * When adding a new subscription product with check-ins, add its ID to CHECKIN_ELIGIBLE_PRODUCTS.
 */

/**
 * Stripe Product IDs that include weekly check-in access
 * 
 * These products include "Weekly check-ins" as a feature and allow
 * clients to book virtual check-in sessions with their trainer.
 */
const CHECKIN_ELIGIBLE_PRODUCTS = [
  'prod_SwvHrfi1C4k4pS',  // Online Coaching
  'prod_SwvI0SWs0J3DMQ',  // Complete Transformation
];

/**
 * Check if a user's subscription includes check-in access
 * @param {string} productId - Stripe product ID from user.tier
 * @returns {boolean} True if product includes check-in access
 */
function isEligibleForCheckins(productId) {
  return CHECKIN_ELIGIBLE_PRODUCTS.includes(productId);
}

/**
 * Default deadline for setup/onboarding goals (in days)
 */
const ONBOARDING_DEADLINE_DAYS = 15;

/**
 * Maximum number of session credits auto-refunded during client-initiated account deletion.
 * Trainer-initiated deletion allows the trainer to choose any number (0 to all).
 * This cap prevents abuse (e.g., buying a 4-pack, using 1, deleting for 3 refunded).
 */
const MAX_CLIENT_REFUND_CREDITS = 2;

module.exports = {
  CHECKIN_ELIGIBLE_PRODUCTS,
  isEligibleForCheckins,
  ONBOARDING_DEADLINE_DAYS,
  MAX_CLIENT_REFUND_CREDITS,
};
