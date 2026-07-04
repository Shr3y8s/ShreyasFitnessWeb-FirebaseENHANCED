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

/**
 * The funding instrument used for a charge (or saved for renewals), neutral shape.
 * PayPal exposes card brand+last4 for card checkouts and the wallet name (PayPal/
 * Venmo); it does NOT expose Apple/Google Pay separately or credit-vs-debit, so
 * those fall back to `card`/`paypal`. `label` is the display string (e.g. "Visa
 * ••4242", "PayPal", "Venmo").
 */
export interface PaymentMethodInfo {
  label: string;
  brand?: string;
  last4?: string;
  kind?: 'card' | 'paypal' | 'venmo' | 'paylater' | string;
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
  /** Funding instrument used for this charge (when the provider exposes it). */
  paymentMethod?: PaymentMethodInfo;
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
  /**
   * Provider supports app-managed discount codes (Feature 2). When true the
   * adapter implements `previewDiscount` and honors `CheckoutOptions.discountCode`.
   * PayPal ✅ (our own server-side discount system). Stripe ❌ here (no-op).
   */
  discounts?: boolean;
  /**
   * Provider exposes extra device/OS wallet buttons (Apple Pay / Google Pay) for
   * ONE-TIME checkout, rendered internally by the adapter (eligibility-gated). The
   * app may use this for neutral copy only; it must NOT branch on a specific wallet
   * name. PayPal ✅ (one-time, via Orders v2). Stripe ❌ here.
   * See docs/02-implementation/payment-processor/applepay-googlepay-design.md.
   */
  wallets?: boolean;
}





/**
 * A validated discount preview, provider-neutral (Feature 2 — discount codes).
 * Amounts are minor units (cents). The app shows this for display only; the
 * SERVER always re-validates + recomputes the charged amount at order-create time
 * (a tampered client can never change what is charged).
 */
export interface DiscountPreview {
  valid: boolean;
  /** Present when invalid: 'not_found' | 'inactive' | 'expired' | 'limit_reached'
   *  | 'per_user_limit' | 'not_applicable' | 'not_supported' | 'error'. */
  reason?: string;
  /** Canonical code echoed back (uppercased). */
  code?: string;
  /** Original amount (minor units). */
  originalAmount: number;
  /** Discounted amount actually charged (minor units, post-floor). */
  discountedAmount: number;
  /** Amount off (minor units). */
  amountOff: number;
  /** True when this is a free comp (no processor charge — Phase 2). */
  freeComp?: boolean;
  /** Human label, e.g. "25% off" / "$10.00 off" / "$25% off (min $1.00)". */
  label?: string;
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
  /**
   * Optional validated discount code (Feature 2). The adapter forwards it to the
   * server, which re-validates it and creates the order/subscription at the
   * discounted amount. The client never sets the amount itself.
   */
  discountCode?: string;
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

  /**
   * Validate + preview a discount code for an item (capabilities.discounts).
   * Server-backed and READ-ONLY (records no redemption). Returns a neutral
   * DiscountPreview for display; the server independently recomputes the charged
   * amount at order-create time. Stripe returns { valid:false, reason:'not_supported' }.
   */
  previewDiscount?(opts: {
    code: string;
    productId: string;
    mode: 'subscription' | 'payment';
    priceId: string;
  }): Promise<DiscountPreview>;


  // Checkout — opens an overlay, redirects, or returns a URL to follow.
  startCheckout(opts: CheckoutOptions): Promise<CheckoutResult>;

  /**
   * Button-checkout providers (capabilities.buttonCheckout === true) mount in-place
   * payment buttons into `container` instead of redirecting. `onApproved` fires
   * after buyer approval (UI feedback only — the webhook is the source of truth for
   * fulfillment). For one-time captures it receives the provider transaction id
   * (the capture id) so the success page can match an ABSOLUTE fulfillment signal
   * instead of waiting for a balance to change. Returns an unmount/cleanup function.
   */
  renderCheckout?(
    opts: CheckoutOptions & {
      container: HTMLElement;
      onApproved: (transactionId?: string) => void;
      /** Fires the instant buyer approval returns (popup closes), BEFORE the server
       *  capture/activation await — lets the UI show a "Finalizing payment…" state
       *  during the otherwise-blank gap until navigation. */
      onProcessing?: () => void;
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



