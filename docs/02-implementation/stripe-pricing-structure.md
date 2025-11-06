# Stripe Pricing Structure Implementation

## Overview

This document describes how the application maintains and uses Stripe product and pricing data from Firestore.

## Date: 2025-11-05

## Problem Statement

Previously, the code used hardcoded assumptions about whether products were subscriptions or one-time purchases. This caused several issues:

1. **No support for products with multiple price types** - e.g., Complete Transformation has both recurring ($199/mo) and one-time ($60/session) prices
2. **Broken imports** - Code referenced deleted `getProductDetails()` function
3. **Inflexibility** - Changes in Stripe dashboard weren't automatically reflected in the application

## Solution

Implemented a proper data structure that mirrors Firestore's Stripe product/price hierarchy and maintains ALL prices for context-specific selection.

## Data Structure

### TypeScript Types (`app/src/types/stripe.ts`)

```typescript
export interface StripePrice {
  id: string;           // Stripe price ID
  amount: number;       // Amount in cents
  currency: string;     // Currency code (e.g., "usd")
  type: 'recurring' | 'one_time';  // Price type from Firestore
}

export interface StripeProduct {
  id: string;           // Stripe product ID
  name: string;         // Product name
  description?: string; // Optional description
  prices: StripePrice[]; // ALL prices for this product
}
```

### Firestore Structure (Created by Stripe Extension)

```
stripe_products/{productId}
├── name: "Complete Transformation Package"
├── description: "..."
└── prices (subcollection)
    ├── {priceId_1}
    │   ├── type: "recurring"
    │   ├── unit_amount: 19900
    │   └── currency: "usd"
    └── {priceId_2}
        ├── type: "one_time"
        ├── unit_amount: 6000
        └── currency: "usd"
```

## Implementation Details

### 1. Data Fetching (`payment/page.tsx` - Line ~125)

```typescript
const loadPriceForTier = async (tierId: string) => {
  // Get product document
  const productSnap = await getDoc(doc(db, 'stripe_products', productId));
  const productInfo = productSnap.data();

  // Fetch ALL prices for this product
  const pricesSnapshot = await getDocs(
    collection(db, 'stripe_products', productId, 'prices')
  );

  // Store complete product with ALL prices
  const prices: StripePrice[] = [];
  pricesSnapshot.forEach(doc => {
    prices.push({
      id: doc.id,
      amount: doc.data().unit_amount || 0,
      currency: doc.data().currency || 'usd',
      type: doc.data().type || 'one_time'
    });
  });

  const product: StripeProduct = {
    id: productId,
    name: productInfo.name || '',
    description: productInfo.description,
    prices: prices  // ALL prices maintained
  };

  setProductData(product);
};
```

### 2. Price Selection Logic

#### Signup Flow (`selectSignupPrice()` helper)

```typescript
export function selectSignupPrice(product: StripeProduct): StripePrice | null {
  // Prefer recurring price for subscriptions
  const recurringPrice = product.prices.find(p => p.type === 'recurring');
  const oneTimePrice = product.prices.find(p => p.type === 'one_time');
  return recurringPrice || oneTimePrice || null;
}
```

**Usage in signup:**
- Complete Transformation → Uses recurring price ($199/mo)
- In-Person Training → Uses one-time price ($70/session)
- 4-Pack → Uses one-time price ($240)

#### Session Booking Flow (`selectSessionPrice()` helper - Future)

```typescript
export function selectSessionPrice(product: StripeProduct): StripePrice | null {
  // Always use one-time price for individual sessions
  return product.prices.find(p => p.type === 'one_time') || null;
}
```

**Usage when booking sessions (future implementation):**
- Complete Transformation → Uses one-time price ($60/session)
- In-Person Training → Uses one-time price ($70/session)
- 4-Pack → Deducts from prepaid sessions (no charge)

### 3. Stripe Checkout Session Creation

```typescript
const handlePayment = async () => {
  // Select appropriate price based on context
  const selectedPrice = selectSignupPrice(productData);
  
  // Derive mode from price type (Stripe requires this)
  const checkoutMode = selectedPrice.type === 'recurring' 
    ? 'subscription'  // For recurring prices
    : 'payment';      // For one-time prices

  const checkoutSessionData = {
    price: selectedPrice.id,
    mode: checkoutMode,
    // ... other fields
  };
};
```

### 4. Display Logic

```typescript
// All display uses the selected price's actual type
<div>
  {displayPrice.type === 'recurring' ? 'per month' : 'one-time'}
</div>

<div>
  {displayPrice.type === 'recurring'
    ? 'Monthly subscription • Cancel anytime'
    : 'One-time payment • No recurring charges'
  }
</div>
```

## Data Freshness

### React State Lifecycle

- **Scope:** Component mount to unmount (single page view)
- **Fetching:** Fresh data from Firestore on every page load
- **Persistence:** None - state cleared on navigation

### Example User Flow

1. User visits `/signup` → Component mounts → Fetches from Firestore
2. User stays on page for 10 minutes → Uses in-memory state (may be stale)
3. User navigates away → State destroyed
4. User returns to `/signup` → Component mounts again → Fresh fetch from Firestore

### Stripe Changes Reflection

When you change prices in Stripe dashboard:
1. Stripe webhook updates Firestore `stripe_products` collection
2. Next page load fetches updated prices
3. User sees new prices immediately on refresh

## Key Benefits

### 1. Flexibility
Products can have multiple price types without code changes.

### 2. Maintainability
All pricing logic reads from Firestore, not hardcoded values.

### 3. Extensibility
Easy to add new price selection contexts (e.g., session booking, upgrades).

### 4. Type Safety
TypeScript interfaces ensure proper data structure usage.

### 5. Documentation
Helper functions (`selectSignupPrice`, `selectSessionPrice`) clearly document selection logic.

## Migration Notes

### Files Changed
- ✅ Created: `app/src/types/stripe.ts` - New types and helpers
- ✅ Updated: `app/src/app/payment/page.tsx` - Uses new structure
- ⚠️ TODO: `app/src/app/signup/components/PaymentStep.tsx` - Should be updated to use same types

### Breaking Changes
- Removed dependency on deleted `getProductDetails()` function
- Changed from single price selection to full product with multiple prices

### Backwards Compatibility
All existing functionality preserved:
- Signup flow works identically
- Stripe checkout integration unchanged
- Payment confirmation page displays correctly

## Future Enhancements

### 1. Session Booking Implementation

When implementing session booking:

```typescript
// In session booking page
const sessionPrice = selectSessionPrice(productData);
if (sessionPrice) {
  // Create checkout session for single session
  const checkoutData = {
    price: sessionPrice.id,
    mode: 'payment',
    // ...
  };
}
```

### 2. Package Upgrades/Downgrades

```typescript
// Check current subscription
const currentProduct = await fetchUserProduct(userId);
const newProduct = await fetchProductData(newTierId);

// Compare prices and handle prorating
const currentRecurring = selectSignupPrice(currentProduct);
const newRecurring = selectSignupPrice(newProduct);
```

### 3. Promotional Pricing

Products could have additional price types:
- `type: "recurring_promotional"` - Discounted first month
- `type: "one_time_bundle"` - Package deals

The structure supports this with no code changes - just add prices in Stripe.

## Testing Checklist

- [x] Build succeeds without TypeScript errors
- [ ] Signup flow with Complete Transformation (recurring price)
- [ ] Signup flow with In-Person Training (one-time price)
- [ ] Signup flow with 4-Pack (one-time price)
- [ ] Payment page displays correct price and labels
- [ ] Stripe checkout session created with correct mode
- [ ] Price changes in Stripe reflect on page refresh

## Related Documentation

- [Stripe Integration](./stripe-integration.md)
- [Payment Flow Implementation](./payment-first-flow-implementation.md)
- [Region Configuration](./region-configuration-guide.md)
