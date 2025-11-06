// Stripe configuration for Next.js app
import { loadStripe } from '@stripe/stripe-js';

// Get Stripe publishable key from environment variable
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
}

// Initialize Stripe promise
export const stripePromise = loadStripe(stripePublishableKey);

// Modern Stripe Elements appearance configuration matching your brand
export const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#059669', // emerald-600 in Tailwind
    colorBackground: '#ffffff',
    colorText: '#374151', // gray-700 in Tailwind
    colorDanger: '#dc2626', // red-600 in Tailwind
    fontFamily: 'Inter, system-ui, sans-serif',
    borderRadius: '8px',
    spacingUnit: '4px',
    fontSizeBase: '16px'
  },
  rules: {
    '.Input': {
      borderColor: '#d1d5db', // gray-300
      borderRadius: '8px',
      padding: '12px',
      fontSize: '16px'
    },
    '.Input:focus': {
      borderColor: '#059669', // emerald-600
      boxShadow: '0 0 0 1px #059669'
    }
  }
};

// Stripe Elements options
export const elementsOptions = {
  appearance,
  loader: 'auto' as const
};

// Format currency helper
export const formatCurrency = (amount: number): string => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};

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
export function selectSignupPrice(product: import('@/types/stripe').StripeProduct): import('@/types/stripe').StripePrice | null {
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
export function selectSessionPrice(product: import('@/types/stripe').StripeProduct): import('@/types/stripe').StripePrice | null {
  return product.prices.find(p => p.type === 'one_time') || null;
}

/**
 * Fetch all active products from Firestore with their prices
 * @param includeInactive - If true, includes inactive products (default: false)
 * @returns Array of StripeProduct with all data
 */
export async function fetchAllProducts(includeInactive: boolean = false): Promise<import('@/types/stripe').StripeProduct[]> {
  const { getFirestore, collection, getDocs } = await import('firebase/firestore');
  const db = getFirestore();
  
  const productsRef = collection(db, 'stripe_products');
  const productsSnap = await getDocs(productsRef);
  
  const products: import('@/types/stripe').StripeProduct[] = [];
  
  for (const productDoc of productsSnap.docs) {
    const productData = productDoc.data();
    
    // Filter inactive products unless explicitly requested
    if (!includeInactive && productData.active !== true) {
      continue;
    }
    
    const productId = productDoc.id;
    
    // Fetch prices for this product
    const pricesSnap = await getDocs(
      collection(db, 'stripe_products', productId, 'prices')
    );
    
    const prices: import('@/types/stripe').StripePrice[] = [];
    pricesSnap.forEach(priceDoc => {
      const priceData = priceDoc.data();
      prices.push({
        id: priceDoc.id,
        amount: priceData.unit_amount || 0,
        currency: priceData.currency || 'usd',
        type: (priceData.type as 'recurring' | 'one_time') || 'one_time'
      });
    });
    
    products.push({
      id: productId,
      name: productData.name || '',
      description: productData.description,
      active: productData.active || false,
      prices: prices
    });
  }
  
  return products;
}

/**
 * Fetch single product by ID from Firestore
 * @param productId - Stripe product ID
 * @returns StripeProduct or null if not found
 */
export async function fetchProduct(productId: string): Promise<import('@/types/stripe').StripeProduct | null> {
  const { getFirestore, doc, getDoc, collection, getDocs } = await import('firebase/firestore');
  const db = getFirestore();
  
  const productRef = doc(db, 'stripe_products', productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    return null;
  }
  
  const productData = productSnap.data();
  
  // Fetch prices
  const pricesSnap = await getDocs(
    collection(db, 'stripe_products', productId, 'prices')
  );
  
  const prices: import('@/types/stripe').StripePrice[] = [];
  pricesSnap.forEach(priceDoc => {
    const priceData = priceDoc.data();
    prices.push({
      id: priceDoc.id,
      amount: priceData.unit_amount || 0,
      currency: priceData.currency || 'usd',
      type: (priceData.type as 'recurring' | 'one_time') || 'one_time'
    });
  });
  
  return {
    id: productId,
    name: productData.name || '',
    description: productData.description,
    active: productData.active || false,
    prices: prices
  };
}
