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
 * Admin/business analytics shapes (provider-neutral). Pages render these without
 * touching any provider-specific Firestore collection or payload — the active
 * provider's adapter (capabilities.adminAnalytics) computes them.
 */
export interface RevenueMetrics {
  /** Monthly recurring revenue in minor units (post-discount, annual normalized). */
  mrr: number;
  /** Count of active subscriptions. */
  activeSubscriptions: number;
  /** MRR broken down by tier/plan. `revenueMonthly` is minor units. */
  revenueByTier: { tierName: string; revenueMonthly: number; count: number }[];
}

/** A recent payment row for the admin revenue dashboard. */
export interface AdminTransaction {
  id: string;
  /** Epoch seconds. */
  date: number;
  /** Amount in minor units (cents). */
  amount: number;
  currency: string;
  status: string;
  productName: string;
  /** Whether this charge was a subscription renewal or a one-time purchase. */
  type: 'subscription' | 'one_time';
}

/** Neutral active-subscription summary for account/membership surfaces. */
export interface NeutralActiveSubscription {
  subscriptionId: string;
  status: string;
  /** Amount in minor units (cents). */
  amount: number;
  interval: 'month' | 'year';
  /** Epoch seconds, or null. */
  currentPeriodEnd: number | null;
  tierName?: string;
  productId?: string;
}


/**
 * What a provider can do, so a single UI can adapt without per-processor
 * branching. e.g. the billing page shows a "Manage billing" portal button only
 * when `hostedPortal` is true, and a stored-card block only when
 * `showsStoredCard` is true.
 */
export interface ProviderCapabilities {
  /**
   * Provider checks out via in-place mounted buttons (PayPal Smart Buttons) rather
   * than a redirect/overlay. When true, the adapter implements `renderCheckout`;
   * when false (Stripe/Paddle), it uses `startCheckout`.
   */
  buttonCheckout: boolean;
  /**
   * Provider can render in-page hosted CARD fields (no account/login needed) for
   * card-only checkout. PayPal ✅ via ACDC ("Advanced Credit and Debit Card");
   * Stripe ✅ via Elements; Paddle ❌ (overlay). When true the adapter implements
   * `renderCardFields`. Lets a card-paying subscriber avoid the PayPal-account wall.
   */
  cardFields?: boolean;
  /** Provider offers a hosted customer/billing portal (Stripe ✅ Paddle ✅ PayPal ❌). */
  hostedPortal: boolean;

  /** Provider exposes a stored card-on-file to display (Stripe ✅ Paddle ✅ PayPal ❌). */
  showsStoredCard: boolean;
  /** Provider supports canceling a subscription via API from our own UI. */
  inAppCancel: boolean;
  /**
   * Provider offers an external merchant/admin dashboard (payments, reports, refunds)
   * the admin can open (Stripe ✅ PayPal ✅). When true the adapter implements
   * `getAdminDashboardUrl`. Keeps the app UI free of hardcoded provider URLs.
   */
  externalAdminDashboard?: boolean;
  /**
   * Provider can compute admin/business analytics (MRR, active subs, revenue by
   * tier, recent transactions) from its own data store. When true the adapter
   * implements `getRevenueMetrics` + `getRecentTransactions`. PayPal ✅ (neutral
   * Firestore store). Stripe ❌ here — Stripe is denied for live use on this app,
   * so its adapter intentionally does not implement analytics.
   */
  adminAnalytics?: boolean;
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
 * Minimal billing address for card AVS / 3-D Secure. Collected as plain inputs
 * (NOT a hosted field) and passed into the card `submit()`. Country is an
 * ISO-3166-1 alpha-2 code (e.g. 'US').
 */
export interface BillingAddress {
  countryCode: string;
  postalCode: string;
}

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

  /**
   * Button-checkout providers (capabilities.buttonCheckout === true) mount in-place
   * payment buttons into `container` instead of redirecting. `onApproved` fires
   * after buyer approval (UI feedback only — the webhook is the source of truth for
   * fulfillment). Returns an unmount/cleanup function.
   */
  renderCheckout?(
    opts: CheckoutOptions & {
      container: HTMLElement;
      onApproved: () => void;
      onError?: (e: unknown) => void;
    }
  ): Promise<() => void>;

  /**
   * Card-fields providers (capabilities.cardFields === true) render hosted, in-page
   * CARD inputs into `container` for card-only checkout WITHOUT a provider account
   * (PayPal ACDC). Returns `{ submit, cleanup }`: `submit()` validates + runs 3DS and
   * (one-time) captures server-side or (subscription) vaults the card and creates the
   * subscription; `onApproved` then fires (webhook is the source of truth). `cleanup`
   * unmounts the fields.
   */
  renderCardFields?(
    opts: CheckoutOptions & {
      container: HTMLElement;
      onApproved: () => void;
      onError?: (e: unknown) => void;
    }
  ): Promise<{ submit: (billingAddress?: BillingAddress) => Promise<void>; cleanup: () => void }>;


  // Post-purchase management
  getBillingHistory(customerId: string): Promise<Transaction[]>;

  openBillingPortal?(opts: {
    customerId: string;
    returnUrl: string;
    /** Restricted = payment-method updates only (no cancellation). */
    restricted?: boolean;
  }): Promise<string>;
  cancelSubscription?(subscriptionId: string): Promise<void>;

  /**
   * External merchant/admin dashboard URL (payments, reports, refunds). Present when
   * `capabilities.externalAdminDashboard` is true. Lets the admin UI render a single
   * neutral "Open Payments Dashboard" link without hardcoding any provider URL.
   */
  getAdminDashboardUrl?(): string;

  // ---- Admin/business analytics (capabilities.adminAnalytics) ----
  // Implemented by providers that can compute analytics from their own store.
  // Pages call these instead of querying provider-specific collections directly.

  /** Revenue metrics: MRR, active subscription count, revenue-by-tier. */
  getRevenueMetrics?(): Promise<RevenueMetrics>;

  /** Most recent payments (default 10), newest first, tagged subscription/one_time. */
  getRecentTransactions?(limit?: number): Promise<AdminTransaction[]>;

  /** The user's current active subscription (neutral summary), or null. */
  getActiveSubscription?(userId: string): Promise<NeutralActiveSubscription | null>;
}



