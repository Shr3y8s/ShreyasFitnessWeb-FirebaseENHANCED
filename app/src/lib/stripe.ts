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
 * Check if a product is a session product
 * Session products are identified by having ONLY one-time prices (no recurring)
 * @param product - StripeProduct to check
 * @returns true if product is a session product
 */
export function isSessionProduct(product: import('@/types/stripe').StripeProduct): boolean {
  // Must have at least one price
  if (!product.prices || product.prices.length === 0) {
    return false;
  }
  
  // All prices must be one_time (no recurring prices)
  return product.prices.every(price => price.type === 'one_time');
}

/**
 * Fetch all session products dynamically
 * Finds products that only have one-time prices
 * @returns Array of session products sorted by price (ascending)
 */
export async function fetchSessionProducts(): Promise<import('@/types/stripe').StripeProduct[]> {
  const allProducts = await fetchAllProducts();
  
  // Filter for session products (only one-time prices)
  const sessionProducts = allProducts.filter(isSessionProduct);
  
  // Sort by price (lowest to highest)
  return sessionProducts.sort((a, b) => {
    const priceA = selectSessionPrice(a);
    const priceB = selectSessionPrice(b);
    return (priceA?.amount || 0) - (priceB?.amount || 0);
  });
}

/**
 * Get pricing info for all session products
 * Automatically detects session products by price type
 * @returns Array of pricing details ready for display
 */
export async function getSessionPricing() {
  const sessionProducts = await fetchSessionProducts();
  
  return sessionProducts.map(product => {
    const price = selectSessionPrice(product);
    const quantity = parseInt(product.name.match(/\d+/)?.[0] || '1'); // Extract number from name
    
    return {
      product,
      price,
      priceId: price?.id || '',
      amount: price ? price.amount / 100 : 0,
      quantity,
      pricePerSession: price ? price.amount / 100 / quantity : 0,
    };
  });
}

/**
 * Calculate savings for package deals
 * @param sessionPricing - Array from getSessionPricing()
 * @returns Enhanced pricing with savings calculations
 */
export function calculateSessionSavings(sessionPricing: Awaited<ReturnType<typeof getSessionPricing>>) {
  // Find single session (quantity === 1)
  const singleSession = sessionPricing.find(p => p.quantity === 1);
  
  return sessionPricing.map(item => {
    if (!singleSession || item.quantity === 1) {
      return { ...item, savings: 0 };
    }
    
    // Calculate savings vs buying individual sessions
    const individualCost = singleSession.amount * item.quantity;
    const packageCost = item.amount;
    const savings = individualCost - packageCost;
    
    return { ...item, savings };
  });
}

/**
 * Create Stripe checkout session using Extension's checkout_sessions collection
 * This is the single source of truth for creating checkout sessions
 * @param options - Checkout session configuration
 * @returns Promise resolving to checkout URL
 */
export async function createStripeCheckoutSession({
  userId,
  priceId,
  mode = 'payment',
  successUrl,
  cancelUrl,
  metadata = {},
}: {
  userId: string;
  priceId: string;
  mode?: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
}): Promise<string> {
  const { getFirestore, collection, addDoc, onSnapshot } = await import('firebase/firestore');
  const db = getFirestore();
  
  const checkoutSessionData = {
    price: priceId,
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    customer_update: {
      name: 'auto'
    },
    metadata,
  };

  const checkoutSessionRef = await addDoc(
    collection(db, `stripe_customers/${userId}/checkout_sessions`),
    checkoutSessionData
  );

  return new Promise((resolve, reject) => {
    const unsubscribe = onSnapshot(checkoutSessionRef, (snap) => {
      const data = snap.data();
      if (data?.error) {
        unsubscribe();
        reject(new Error(data.error.message || 'Checkout session creation failed'));
      } else if (data?.url) {
        unsubscribe();
        resolve(data.url);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      unsubscribe();
      reject(new Error('Checkout session creation timed out'));
    }, 10000);
  });
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
