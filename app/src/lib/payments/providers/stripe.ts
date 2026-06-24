// Stripe adapter — implements the neutral PaymentProvider interface by delegating
// to the existing Stripe integration (`@/lib/stripe`) and the Stripe Cloud
// Function callables. This is the reference adapter that proves the abstraction:
// the app runs through the interface while Stripe remains the live processor.
//
// Only this file (and ./paypal, ./paddle) may import provider-specific code.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.5)

import {
  fetchAllProducts as stripeFetchAllProducts,
  fetchProduct as stripeFetchProduct,
  createStripeCheckoutSession,
} from '@/lib/stripe';
import type { StripeProduct } from '@/types/stripe';
import type {
  PaymentProvider,
  Product,
  Transaction,
  CheckoutOptions,
  CheckoutResult,
} from '../types';

/** Map a Stripe-shaped product to the neutral domain model. */
function toNeutralProduct(p: StripeProduct): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    active: p.active,
    prices: p.prices.map((price) => ({
      id: price.id,
      amount: price.amount,
      currency: price.currency,
      type: price.type,
      active: price.active !== false,
      lookupKey: price.lookup_key ?? undefined,
    })),
  };
}

export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  capabilities: {
    buttonCheckout: false,
    hostedPortal: true,
    showsStoredCard: true,
    inAppCancel: true,
    externalAdminDashboard: true,
  },

  getAdminDashboardUrl(): string {
    return 'https://dashboard.stripe.com';
  },

  async fetchAllProducts(includeInactive = false): Promise<Product[]> {
    const products = await stripeFetchAllProducts(includeInactive);
    return products.map(toNeutralProduct);
  },

  async fetchProduct(productId: string): Promise<Product | null> {
    const product = await stripeFetchProduct(productId);
    return product ? toNeutralProduct(product) : null;
  },

  async startCheckout(opts: CheckoutOptions): Promise<CheckoutResult> {
    // Stripe uses the invertase extension's checkout_sessions collection; the
    // existing helper resolves a redirect URL. `mode` maps 'payment'|'subscription'.
    const url = await createStripeCheckoutSession({
      userId: opts.userId,
      priceId: opts.priceId,
      mode: opts.mode === 'subscription' ? 'subscription' : 'payment',
      successUrl: opts.successUrl,
      cancelUrl: opts.cancelUrl,
      metadata: opts.metadata ?? {},
    });
    return { url };
  },

  async getBillingHistory(customerId: string): Promise<Transaction[]> {
    // Delegates to the existing `getBillingHistory` callable and maps Stripe
    // invoices to neutral transactions. (The billing page currently performs an
    // equivalent inline mapping; this is the provider-neutral home for it and
    // will back the capability-driven billing UI in the per-provider phase.)
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    const getBillingHistory = httpsCallable(functions, 'getBillingHistory');
    const result = await getBillingHistory({ customerId });
    const data = result.data as { invoices?: any[] };

    const transactions: Transaction[] = [];
    (data.invoices || []).forEach((invoice: any) => {
      let productName = 'Subscription';
      if (invoice.lines?.data?.length > 0) {
        const lineItem = invoice.lines.data[0];
        productName = lineItem.metadata?.tierName || lineItem.description || 'Subscription';
      }
      transactions.push({
        id: invoice.id,
        date: invoice.created,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: invoice.status,
        productName,
        receiptUrl: invoice.hosted_invoice_url || invoice.invoice_pdf,
      });
    });
    return transactions;
  },

  async openBillingPortal(opts: {
    customerId: string;
    returnUrl: string;
    restricted?: boolean;
  }): Promise<string> {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    // Restricted = payment-method updates only (the page's current default).
    const fnName = opts.restricted === false
      ? 'createPortalSession'
      : 'createPaymentMethodPortalSession';
    const createPortal = httpsCallable(functions, fnName);
    const result = await createPortal({
      customerId: opts.customerId,
      return_url: opts.returnUrl,
    });
    const data = result.data as { url?: string };
    if (!data.url) throw new Error('Failed to create portal session');
    return data.url;
  },
};
