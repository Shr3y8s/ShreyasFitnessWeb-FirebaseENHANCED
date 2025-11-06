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
  /** Whether the product is active in Stripe (can accept purchases) */
  active: boolean;
  /** All prices associated with this product - NEVER empty after fetch */
  prices: StripePrice[];
}
