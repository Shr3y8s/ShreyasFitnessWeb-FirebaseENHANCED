// Provider-neutral payment domain model + the PaymentProvider interface.
//
// IMPORTANT: This file must NOT import any payment-processor SDK. Pages and
// components depend only on these neutral types; each processor (Stripe today,
// PayPal/Paddle later) is implemented as an adapter under ./providers/*.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md

export type BillingInterval = 'recurring' | 'one_time';

/** A purchasable price/plan in provider-neutral form. */
export interface Price {
  /** Provider price/plan id (e.g. Stripe `price_…`, Paddle `pri_…`). */
  id: string;
  /** Amount in minor units (cents). */
  amount: number;
  currency: string;
  type: BillingInterval;
  /** Archived/replaced prices are inactive and must be ignored for new checkouts. */
  active: boolean;
  /** Optional stable human key (e.g. "complete_transformation_monthly"). */
  lookupKey?: string;
}

/** A sellable product with one or more prices. */
export interface Product {
  /** Provider product id (e.g. Stripe `prod_…`). */
  id: string;
  name: string;
  description?: string;
  active: boolean;
  prices: Price[];
}

/** A past payment, neutral shape for the billing-history UI. */
export interface Transaction {
  id: string;
  /** Epoch seconds. */
  date: number;
  /** Amount in minor units (cents). */
  amount: number;
  currency: string;
  status: string;
  productName: string;
  /** Hosted invoice / receipt URL when the provider offers one. */
  receiptUrl?: string;
}

/**
 * What a provider can do, so a single UI can adapt without per-processor
 * branching. e.g. the billing page shows a "Manage billing" portal button only
 * when `hostedPortal` is true, and a stored-card block only when
 * `showsStoredCard` is true.
 */
export interface ProviderCapabilities {
  /** Provider offers a hosted customer/billing portal (Stripe ✅ Paddle ✅ PayPal ❌). */
  hostedPortal: boolean;
  /** Provider exposes a stored card-on-file to display (Stripe ✅ Paddle ✅ PayPal ❌). */
  showsStoredCard: boolean;
  /** Provider supports canceling a subscription via API from our own UI. */
  inAppCancel: boolean;
}

/** Options for starting a checkout, provider-neutral. */
export interface CheckoutOptions {
  userId: string;
  email?: string;
  /** Neutral price id to purchase. */
  priceId: string;
  /** 'subscription' = recurring plan; 'payment' = one-time / session package. */
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/** Result of starting checkout. `url` is set when the flow is a redirect. */
export interface CheckoutResult {
  /** Redirect URL to follow (Stripe/PayPal). Absent when an overlay handles it (Paddle). */
  url?: string;
}

export type PaymentProviderName = 'stripe' | 'paypal' | 'paddle';

/**
 * The single interface the app depends on. Adapters implement this; pages call
 * it via `getPaymentProvider()` from ./index. Optional methods are present only
 * when the matching capability flag is true.
 */
export interface PaymentProvider {
  readonly name: PaymentProviderName;
  readonly capabilities: ProviderCapabilities;

  // Catalog
  fetchAllProducts(includeInactive?: boolean): Promise<Product[]>;
  fetchProduct(productId: string): Promise<Product | null>;

  // Checkout — opens an overlay, redirects, or returns a URL to follow.
  startCheckout(opts: CheckoutOptions): Promise<CheckoutResult>;

  // Post-purchase management
  getBillingHistory(customerId: string): Promise<Transaction[]>;
  openBillingPortal?(opts: {
    customerId: string;
    returnUrl: string;
    /** Restricted = payment-method updates only (no cancellation). */
    restricted?: boolean;
  }): Promise<string>;
  cancelSubscription?(subscriptionId: string): Promise<void>;
}
