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

// Product ID mapping - used to look up Stripe products in Firestore
export const STRIPE_PRODUCT_IDS = {
  'in-person-training': 'prod_SwuHPYlY94VZyY',
  'online-coaching': 'prod_SwvHrfi1C4k4pS', 
  'complete-transformation': 'prod_SwvI0SWs0J3DMQ',
  '4-pack-training': 'prod_SwvMUVeTqAnveu'
} as const;

// Helper to get product ID from tier ID
export const getProductId = (tierId: string): string => {
  return STRIPE_PRODUCT_IDS[tierId as keyof typeof STRIPE_PRODUCT_IDS] || '';
};

// Format currency helper
export const formatCurrency = (amount: number): string => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};
