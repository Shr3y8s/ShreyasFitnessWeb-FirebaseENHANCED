// Stripe configuration for Next.js app
import { loadStripe } from '@stripe/stripe-js';

// Your test publishable key from the old implementation
const stripePublishableKey = 'pk_test_51Hg4SwBjx3iGODd6fpJzOpYnyoBLQfoZS4ZMusKkfV82WhhHL0z15HWLe2Fs2K45x5GlNzX91ywD6lJkYfsbAHCz002TVq3QZn';

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

// Product ID mapping (from your old implementation)
export const STRIPE_PRODUCT_IDS = {
  'in-person-training': 'prod_SwuHPYlY94VZyY',
  'online-coaching': 'prod_SwvHrfi1C4k4pS', 
  'complete-transformation': 'prod_SwvI0SWs0J3DMQ',
  '4-pack-training': 'prod_SwvMUVeTqAnveu'
} as const;

// Product details helper (TypeScript version of your old implementation)
export const getProductDetails = (tierId: string) => {
  switch(tierId) {
    case 'in-person-training':
      return {
        name: 'In-Person Training',
        amount: 7000, // $70.00 in cents
        isSubscription: false,
        productId: STRIPE_PRODUCT_IDS['in-person-training']
      };
    case 'online-coaching':
      return {
        name: 'Online Coaching', 
        amount: 19900, // $199.00 in cents
        isSubscription: true,
        productId: STRIPE_PRODUCT_IDS['online-coaching']
      };
    case 'complete-transformation':
      return {
        name: 'Complete Transformation',
        amount: 25900, // $259.00 in cents
        isSubscription: true,
        productId: STRIPE_PRODUCT_IDS['complete-transformation']
      };
    case '4-pack-training':
      return {
        name: '4-Pack Training Sessions',
        amount: 24000, // $240.00 in cents  
        isSubscription: false,
        productId: STRIPE_PRODUCT_IDS['4-pack-training']
      };
    default:
      return {
        name: 'Unknown Plan',
        amount: 0,
        isSubscription: false,
        productId: ''
      };
  }
};

// Format currency helper
export const formatCurrency = (amount: number): string => {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
};
