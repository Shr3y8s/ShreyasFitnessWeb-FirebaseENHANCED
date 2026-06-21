/**
 * Billing Utilities
 *
 * Provider-NEUTRAL billing data, read from the `billing_customers/{uid}` store the
 * payment webhook writes (transactions + subscriptions) plus the `users/{uid}` doc.
 * No Stripe API call, no `stripe_customers` read — works for any provider (PayPal today).
 */

import { doc, getDoc, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';


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
  const empty: BillingData = {
    subscriptions: [],
    transactions: [],
    currentPaymentMethod: null,
    nextPaymentDate: null,
    nextPaymentAmount: null,
    stripeCustomerId: null,
    hasActiveSubscription: false,
  };

  try {
    // Neutral billing customer doc (written by the payment webhook). Absent until
    // the user's first payment — return empty rather than erroring.
    const billingRef = doc(db, 'billing_customers', userId);
    const billingSnap = await getDoc(billingRef);
    const providerCustomerId = billingSnap.exists()
      ? (billingSnap.data().providerCustomerId || null)
      : null;

    // Transactions (neutral) — billing_customers/{uid}/transactions, newest first.
    const txSnap = await getDocs(
      query(collection(db, 'billing_customers', userId, 'transactions'), orderBy('date', 'desc'))
    );
    const transactions: Transaction[] = txSnap.docs.map((d) => {
      const t = d.data() as any;
      return {
        id: d.id,
        date: typeof t.date === 'number' ? t.date : (t.date?.seconds ?? 0),
        productName: t.productName || 'Payment',
        description: t.productName || 'Payment',
        amount: t.amount ?? 0,
        currency: t.currency ?? 'usd',
        status: t.status ?? 'succeeded',
        paymentMethod: t.provider ? (t.provider === 'paypal' ? 'PayPal' : t.provider) : 'Payment method',
        receiptUrl: t.receiptUrl ?? null,
      };
    });

    // Subscription status + next-payment info from the user doc (kept in sync by
    // fulfillment) plus the neutral subscription record for currentPeriodEnd.
    const userSnap = await getDoc(doc(db, 'users', userId));
    const userData = userSnap.exists() ? (userSnap.data() as any) : {};
    const hasActiveSubscription = userData.subscriptionStatus === 'active';

    let nextPaymentDate: Date | null = null;
    let nextPaymentAmount: number | null = null;
    const subsSnap = await getDocs(collection(db, 'billing_customers', userId, 'subscriptions'));
    const subscriptions = subsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const activeSub = subscriptions.find((s: any) => s.status === 'active') || subscriptions[0];
    if (activeSub && (activeSub as any).currentPeriodEnd) {
      nextPaymentDate = new Date((activeSub as any).currentPeriodEnd * 1000);
    }

    return {
      subscriptions,
      transactions,
      currentPaymentMethod: null, // PayPal exposes no stored card; provider funds the charge
      nextPaymentDate,
      nextPaymentAmount,
      stripeCustomerId: providerCustomerId, // kept field name for back-compat; holds providerCustomerId
      hasActiveSubscription,
    };
  } catch (error) {
    console.error('[Billing Utils] Error fetching billing data:', error);
    return empty;
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
