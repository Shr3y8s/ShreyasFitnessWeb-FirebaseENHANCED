/**
 * Marketing metadata for Stripe products
 * 
 * This provides UI-specific enhancements for products that Stripe doesn't support,
 * such as feature lists, location details, and custom descriptions.
 * 
 * Key by actual Stripe product IDs (e.g., "prod_SwvI0SWs0J3DMQ")
 */

export interface ProductMarketing {
  /** Additional details badge (e.g., "Seattle Area Only") */
  details?: string;
  /** Feature bullet points for the product */
  features?: string[];
  /** Override Stripe description with marketing copy (optional) */
  marketingDescription?: string;
}

/**
 * Marketing enhancements keyed by Stripe product ID
 * 
 * When a new product is added in Stripe:
 * 1. It will automatically appear in signup (with Stripe name/description)
 * 2. Optionally add marketing metadata here for enhanced UI
 * 3. If no marketing data exists, product still works with Stripe defaults
 */
export const PRODUCT_MARKETING: Record<string, ProductMarketing> = {
  // In-Person Training
  'prod_SwuHPYlY94VZyY': {
    details: 'Seattle Area Only',
    features: [
      '1:1 personalized training',
      'Form correction',
      'Custom exercise selection',
      'Progress tracking'
    ]
  },
  
  // 4-Pack Training Sessions
  'prod_SwvMUVeTqAnveu': {
    details: 'Seattle Area Only',
    features: [
      '4 personalized sessions',
      'Discounted rate',
      'Program design',
      'Exercise technique review'
    ]
  },
  
  // Online Coaching Subscription
  'prod_SwvHrfi1C4k4pS': {
    details: 'Remote Coaching',
    features: [
      'Custom workout program',
      'Nutrition guidance',
      '24/7 messaging support',
      'Weekly check-ins'
    ]
  },
  
  // Complete Transformation Package
  'prod_SwvI0SWs0J3DMQ': {
    details: 'Seattle Premium Experience',
    features: [
      'All online coaching features',
      'Monthly in-person session',
      'Advanced progress tracking',
      'Priority support'
    ]
  }
};

/**
 * Get marketing metadata for a product
 * @param productId - Stripe product ID
 * @returns Marketing metadata or empty object if none exists
 */
export function getProductMarketing(productId: string): ProductMarketing {
  return PRODUCT_MARKETING[productId] || {};
}
