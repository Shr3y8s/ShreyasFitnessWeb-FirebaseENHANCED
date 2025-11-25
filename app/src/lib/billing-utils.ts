/**
 * Billing Utilities
 * Standalone functions for fetching and processing billing/subscription data from Stripe
 */

import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';

export interface PaymentMethodDetails {
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  link?: {
    email?: string;
  };
}

export interface Transaction {
  id: string;
  date: number;
  productName: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  receiptUrl: string | null;
}

export interface BillingData {
  subscriptions: any[];
  transactions: Transaction[];
  currentPaymentMethod: PaymentMethodDetails | null;
  nextPaymentDate: Date | null;
  nextPaymentAmount: number | null;
  stripeCustomerId: string | null;
  hasActiveSubscription: boolean;
}

/**
 * Fetch complete billing data for a user
 * @param userId - Firebase user ID
 * @returns BillingData object with subscription, payment, and transaction info
 */
export async function fetchClientBillingData(userId: string): Promise<BillingData> {
  try {
    // Get Stripe customer ID from Firestore
    const customerDocRef = doc(db, 'stripe_customers', userId);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      console.log('[Billing Utils] No Stripe customer found for user:', userId);
      return {
        subscriptions: [],
        transactions: [],
        currentPaymentMethod: null,
        nextPaymentDate: null,
        nextPaymentAmount: null,
        stripeCustomerId: null,
        hasActiveSubscription: false,
      };
    }

    const customerData = customerDoc.data();
    const customerId = customerData.stripeId;

    if (!customerId) {
      console.error('[Billing Utils] No stripeId found in customer document');
      return {
        subscriptions: [],
        transactions: [],
        currentPaymentMethod: null,
        nextPaymentDate: null,
        nextPaymentAmount: null,
        stripeCustomerId: null,
        hasActiveSubscription: false,
      };
    }

    console.log('[Billing Utils] Fetching billing history from Stripe API for customer:', customerId);

    // Call the Cloud Function to get complete billing data
    const getBillingHistory = httpsCallable(functions, 'getBillingHistory');
    const result = await getBillingHistory({ customerId });

    const data = result.data as any;

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch billing history');
    }

    console.log('[Billing Utils] Billing data fetched successfully', {
      invoices: data.invoices?.length || 0,
      subscriptions: data.subscriptions?.length || 0,
    });

    // Extract current payment method
    let paymentMethod = null;
    if (data.currentPaymentMethod) {
      paymentMethod = data.currentPaymentMethod;
    } else if (data.subscriptions?.[0]?.default_payment_method) {
      paymentMethod = data.subscriptions[0].default_payment_method;
    }

    // Extract next payment info from active subscription
    let nextPaymentDate = null;
    let nextPaymentAmount = null;
    let hasActiveSubscription = false;

    if (data.subscriptions?.[0]) {
      const sub = data.subscriptions[0];
      hasActiveSubscription = sub.status === 'active';
      
      if (sub.current_period_end) {
        nextPaymentDate = new Date(sub.current_period_end * 1000);
      }
      
      // Calculate next payment amount from subscription items
      const amount = sub.items?.data?.reduce((sum: number, item: any) => {
        return sum + (item.price?.unit_amount || 0);
      }, 0);
      nextPaymentAmount = amount;
    }

    // Process transactions - invoices contain all payment data
    const allTransactions: Transaction[] = [];

    if (data.invoices) {
      data.invoices.forEach((invoice: any) => {
        // Get payment method details from payment_intent.latest_charge
        const paymentMethodDetails = invoice.payment_intent?.latest_charge?.payment_method_details;
        let pmDisplay = 'Payment method';

        // Handle different payment method types
        if (paymentMethodDetails?.card) {
          const brand = paymentMethodDetails.card.brand;
          const last4 = paymentMethodDetails.card.last4;
          pmDisplay = `${brand.charAt(0).toUpperCase() + brand.slice(1)} •••• ${last4}`;
        } else if (paymentMethodDetails?.link) {
          const country = paymentMethodDetails.link.country;
          pmDisplay = country ? `Link (${country})` : 'Link';
        } else if (paymentMethodDetails?.type) {
          pmDisplay = paymentMethodDetails.type.charAt(0).toUpperCase() +
            paymentMethodDetails.type.slice(1);
        }

        // Extract product name from metadata or description
        let productName = 'Subscription';
        if (invoice.lines?.data && invoice.lines.data.length > 0) {
          const lineItem = invoice.lines.data[0];
          productName = lineItem.metadata?.tierName || lineItem.description || 'Subscription';
        }

        // Determine activity type
        let activity = 'Subscription Payment';
        if (invoice.billing_reason === 'subscription_create') {
          activity = 'Subscription Created';
        } else if (invoice.billing_reason === 'subscription_cycle') {
          activity = 'Subscription Payment';
        } else if (invoice.billing_reason === 'subscription_update') {
          activity = 'Subscription Updated';
        } else if (invoice.description) {
          activity = invoice.description;
        }

        allTransactions.push({
          id: invoice.id,
          date: invoice.created,
          productName: productName,
          description: activity,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          paymentMethod: pmDisplay,
          receiptUrl: invoice.hosted_invoice_url || invoice.invoice_pdf,
        });
      });
    }

    // Sort by date (newest first)
    allTransactions.sort((a, b) => b.date - a.date);

    return {
      subscriptions: data.subscriptions || [],
      transactions: allTransactions,
      currentPaymentMethod: paymentMethod,
      nextPaymentDate,
      nextPaymentAmount,
      stripeCustomerId: customerId,
      hasActiveSubscription,
    };
  } catch (error) {
    console.error('[Billing Utils] Error fetching billing data:', error);
    throw error;
  }
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Format date from timestamp
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time from timestamp
 */
export function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get payment method display string
 */
export function getPaymentMethodDisplay(paymentMethod: PaymentMethodDetails | null): string {
  if (!paymentMethod) return 'No payment method';

  if (paymentMethod.type === 'card' && paymentMethod.card) {
    const brand = paymentMethod.card.brand.charAt(0).toUpperCase() + 
                  paymentMethod.card.brand.slice(1);
    return `${brand} •••• ${paymentMethod.card.last4}`;
  }

  if (paymentMethod.type === 'link') {
    return 'Link';
  }

  return paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1);
}
