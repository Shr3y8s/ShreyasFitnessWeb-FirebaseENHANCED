// Provider-neutral pricing helpers. Pure functions over the neutral domain
// model (./types) — no payment-processor SDK or Firestore coupling. These are
// safe to use from any page/component and never change across providers.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.4)

import type { Product, Price } from './types';

/** Format minor units (cents) as a USD currency string. */
export function formatCurrency(amount: number): string {
  return (amount / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

/**
 * Select the price to use at signup.
 * - Prefer an active recurring (subscription) price.
 * - Fall back to an active one-time price.
 * Only ACTIVE prices are considered (archived/replaced prices are ignored so we
 * never charge a superseded amount).
 */
export function selectSignupPrice(product: Product): Price | null {
  const livePrices = product.prices.filter((p) => p.active !== false);
  const recurringPrice = livePrices.find((p) => p.type === 'recurring');
  const oneTimePrice = livePrices.find((p) => p.type === 'one_time');
  return recurringPrice || oneTimePrice || null;
}

/** Select the one-time price for individual session booking. */
export function selectSessionPrice(product: Product): Price | null {
  return product.prices.find((p) => p.type === 'one_time') || null;
}

/**
 * A "session product" has ONLY one-time prices (no recurring), e.g. single
 * session or session packs.
 */
export function isSessionProduct(product: Product): boolean {
  if (!product.prices || product.prices.length === 0) return false;
  return product.prices.every((price) => price.type === 'one_time');
}

/** A session product with derived per-session pricing for display. */
export interface SessionPricing {
  product: Product;
  price: Price | null;
  priceId: string;
  amount: number; // dollars
  quantity: number;
  pricePerSession: number; // dollars
}

/**
 * Build display pricing for a set of session products (filter + sort done by the
 * caller's catalog fetch). Quantity is parsed from the product name (e.g.
 * "4-Pack" → 4), defaulting to 1.
 */
export function buildSessionPricing(sessionProducts: Product[]): SessionPricing[] {
  return sessionProducts.map((product) => {
    const price = selectSessionPrice(product);
    const quantity = parseInt(product.name.match(/\d+/)?.[0] || '1', 10);
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

/** Add savings (vs. buying single sessions) to each session-pricing entry. */
export function calculateSessionSavings(
  sessionPricing: SessionPricing[]
): (SessionPricing & { savings: number })[] {
  const singleSession = sessionPricing.find((p) => p.quantity === 1);
  return sessionPricing.map((item) => {
    if (!singleSession || item.quantity === 1) {
      return { ...item, savings: 0 };
    }
    const individualCost = singleSession.amount * item.quantity;
    const packageCost = item.amount;
    return { ...item, savings: individualCost - packageCost };
  });
}
