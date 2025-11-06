/**
 * Stripe Product and Price Types
 * 
 * These types mirror the Firestore structure created by the Stripe Firebase Extension:
 * - stripe_products/{productId} - Product document
 * - stripe_products/{productId}/prices/{priceId} - Price subcollection
 * 
 * Products can have multiple prices with different types:
 * - Complete Transformation: recurring ($199/mo) + one_time ($60/session)
 * - In-Person Training: one_time ($70/session)
 * - 4-Pack: one_time ($240 for 4 sessions)
 */

export interface StripePrice {
  /** Stripe price ID (e.g., "price_1234abcd") */
  id: string;
  /** Amount in cents (e.g., 19900 = $199.00) */
  amount: number;
  /** Currency code (e.g., "usd") */
  currency: string;
  /** Price type - recurring for subscriptions, one_time for single charges */
  type: 'recurring' | 'one_time';
}

export interface StripeProduct {
  /** Stripe product ID (e.g., "prod_1234abcd") */
  id: string;
  /** Product name (e.g., "Complete Transformation Package") */
  name: string;
  /** Optional product description */
  description?: string;
  /** All prices associated with this product - NEVER empty after fetch */
  prices: StripePrice[];
}

/**
 * Helper function to select the appropriate price for signup flow
 * 
 * Signup Logic:
 * - If product has recurring price (subscription), use that
 * - Otherwise, use one-time price
 * 
 * This ensures users are subscribed to monthly plans when available,
 * while still supporting one-time purchase products.
 */
export function selectSignupPrice(product: StripeProduct): StripePrice | null {
  const recurringPrice = product.prices.find(p => p.type === 'recurring');
  const oneTimePrice = product.prices.find(p => p.type === 'one_time');
  return recurringPrice || oneTimePrice || null;
}

/**
 * Helper function to select per-session price for session booking
 * 
 * Session Booking Logic:
 * - Always use one_time price for individual sessions
 * - Used when user books sessions (separate from subscription)
 * 
 * Note: This is for future session booking implementation
 */
export function selectSessionPrice(product: StripeProduct): StripePrice | null {
  return product.prices.find(p => p.type === 'one_time') || null;
}
