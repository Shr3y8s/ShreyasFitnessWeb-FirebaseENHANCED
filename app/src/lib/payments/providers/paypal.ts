// PayPal adapter — implements the neutral PaymentProvider interface using PayPal
// Smart Buttons for BOTH subscription and one-time checkout (no redirect).
//
// Only this file (and ./stripe, ./paddle) may import provider-specific code.
//
// Catalog identity (see design §2.6): PayPal has no shared catalog to read, so we
// build the neutral catalog locally from constants.ts. The neutral `Product.id`
// stays the SAME Stripe product id used today, so the app-wide tier logic
// (`SERVICE_TIERS`, product-config check-in eligibility, `hasOnlineCoaching`,
// `user.tier`) is unchanged. PayPal-specific identifiers live on the `Price`:
//   - recurring tier  → Price.id = PayPal Billing Plan id (P-xxxx) from PAYPAL_PLANS
//   - one-time item   → Price.id = PAYPAL_ONETIME key, amount from PAYPAL_ONETIME
//
// The webhook is the source of truth for activation/fulfillment; `onApproved` is
// UI feedback only.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.6)

import { loadScript } from '@paypal/paypal-js';
import {
  SERVICE_TIERS,
  PAYPAL_PLANS,
  PAYPAL_ONETIME,
  PAYPAL_ENV,
} from '@/lib/constants';
import type {
  PaymentProvider,
  Product,
  Price,
  Transaction,
  CheckoutOptions,
  CheckoutResult,
  BillingAddress,
} from '../types';


const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

// Neutral catalog, built locally. Keyed by Stripe product id (= Product.id) so
// `user.tier` semantics are unchanged. Names/descriptions mirror the catalog the
// owner created in PayPal; richer marketing copy/features live in product-marketing.ts.
interface CatalogEntry {
  productId: string; // Stripe product id (neutral Product.id / user.tier)
  name: string;
  description: string;
  price: Price;
}

function buildCatalog(): CatalogEntry[] {
  return [
    {
      productId: SERVICE_TIERS.ONLINE_COACHING,
      name: 'Online Coaching',
      description:
        'Custom monthly training programs, personalized nutrition coaching, unlimited messaging support, and weekly progress check-ins.',
      price: {
        id: PAYPAL_PLANS.ONLINE_COACHING,
        amount: 25000,
        currency: 'USD',
        type: 'recurring',
        active: true,
        lookupKey: 'online_coaching_monthly',
      },
    },
    {
      productId: SERVICE_TIERS.COMPLETE_TRANSFORMATION,
      name: 'Complete Transformation',
      description:
        'All online coaching benefits plus in-person training sessions. Includes a discounted in-person session at signup, then $250/month.',
      price: {
        id: PAYPAL_PLANS.COMPLETE_TRANSFORMATION,
        amount: 25000,
        currency: 'USD',
        type: 'recurring',
        active: true,
        lookupKey: 'complete_transformation_monthly',
      },
    },
    {
      productId: SERVICE_TIERS.IN_PERSON,
      name: PAYPAL_ONETIME.IN_PERSON.label,
      description: '1:1 in-person training session (Seattle area).',
      price: {
        id: 'IN_PERSON',
        amount: PAYPAL_ONETIME.IN_PERSON.amount,
        currency: 'USD',
        type: 'one_time',
        active: true,
        lookupKey: 'in_person_single',
      },
    },
    {
      productId: SERVICE_TIERS.IN_PERSON_4PACK,
      name: PAYPAL_ONETIME.IN_PERSON_4PACK.label,
      description: '4-pack of in-person training sessions at a discounted rate (Seattle area).',
      price: {
        id: 'IN_PERSON_4PACK',
        amount: PAYPAL_ONETIME.IN_PERSON_4PACK.amount,
        currency: 'USD',
        type: 'one_time',
        active: true,
        lookupKey: 'in_person_4pack',
      },
    },
  ];
}

function toNeutralProduct(entry: CatalogEntry): Product {
  return {
    id: entry.productId,
    name: entry.name,
    description: entry.description,
    active: true,
    prices: [entry.price],
  };
}

/** Resolve the one-time amount (minor units) for a PAYPAL_ONETIME price id. */
function oneTimeAmount(priceId: string): { amount: number; label: string } | null {
  const entry = (PAYPAL_ONETIME as Record<string, { amount: number; label: string }>)[priceId];
  return entry ?? null;
}

// The PayPal JS SDK only supports ONE <script> per page. We load it once with
// BOTH `buttons` and `card-fields` so the Smart Buttons (wallet) and the ACDC
// hosted card fields share the same SDK instance. Loading a second script (e.g.
// a separate card-fields load) tears down the first and breaks the already-rendered
// buttons' postMessage bridge ("No ack for postMessage onInit ... in 10000ms").
// 'subscription' intent toggles the vault flow.
let scriptCache: { key: string; promise: Promise<any> } | null = null;

function loadPayPal(intent: 'subscription' | 'capture'): Promise<any> {
  const key = `${PAYPAL_CLIENT_ID}:${intent}`;
  if (scriptCache && scriptCache.key === key) return scriptCache.promise;

  const options: Record<string, any> = {
    clientId: PAYPAL_CLIENT_ID,
    components: 'buttons,card-fields',
    currency: 'USD',
    // sandbox vs live is determined by the client id; intent toggles vault flow.
    intent: intent === 'subscription' ? 'subscription' : 'capture',
  };
  if (intent === 'subscription') {
    options.vault = true;
  }

  const promise = loadScript(options as any);
  scriptCache = { key, promise };
  return promise;
}



export const paypalProvider: PaymentProvider = {
  name: 'paypal',
  capabilities: {
    buttonCheckout: true,
    cardFields: true, // ACDC hosted card fields — card-only checkout, no PayPal account
    hostedPortal: false,
    showsStoredCard: false,
    inAppCancel: true,
  },


  async fetchAllProducts(_includeInactive = false): Promise<Product[]> {
    return buildCatalog().map(toNeutralProduct);
  },

  async fetchProduct(productId: string): Promise<Product | null> {
    const entry = buildCatalog().find((e) => e.productId === productId);
    return entry ? toNeutralProduct(entry) : null;
  },

  // PayPal has no redirect checkout; pages use renderCheckout (Smart Buttons).
  // startCheckout is kept for interface completeness and returns no URL.
  async startCheckout(_opts: CheckoutOptions): Promise<CheckoutResult> {
    throw new Error(
      'PayPal uses button checkout (renderCheckout). Render <ProviderCheckout> instead of calling startCheckout.'
    );
  },

  async renderCheckout(
    opts: CheckoutOptions & {
      container: HTMLElement;
      onApproved: () => void;
      onError?: (e: unknown) => void;
    }
  ): Promise<() => void> {
    if (!PAYPAL_CLIENT_ID) {
      throw new Error(
        'NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set (PAYPAL_ENV=' + PAYPAL_ENV + ').'
      );
    }

    const isSubscription = opts.mode === 'subscription';
    const paypal = await loadPayPal(isSubscription ? 'subscription' : 'capture');
    if (!paypal || !paypal.Buttons) {
      throw new Error('PayPal SDK failed to load.');
    }

    const buttonConfig: Record<string, any> = {
      style: { layout: 'vertical', shape: 'rect', label: 'paypal' },
      onApprove: () => {
        // UI feedback only — the webhook fulfills.
        opts.onApproved();
      },
      onError: (e: unknown) => opts.onError?.(e),
    };

    if (isSubscription) {
      buttonConfig.createSubscription = (_data: unknown, actions: any) =>
        actions.subscription.create({
          plan_id: opts.priceId, // P-xxxx from PAYPAL_PLANS
          custom_id: opts.userId, // webhook maps subscription → user
        });
    } else {
      const oneTime = oneTimeAmount(opts.priceId);
      if (!oneTime) {
        throw new Error(`Unknown one-time PayPal item: ${opts.priceId}`);
      }
      buttonConfig.createOrder = (_data: unknown, actions: any) =>
        actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: (oneTime.amount / 100).toFixed(2),
              },
              description: oneTime.label,
              custom_id: opts.userId, // webhook maps order → user
            },
          ],
        });
      buttonConfig.onApprove = async (data: any) => {
        // Capture SERVER-SIDE via callable. The browser SDK's actions.order.capture()
        // is unreliable for guest-card orders (permission_denied / Insufficient
        // privileges); our Functions credentials capture reliably. The webhook
        // (PAYMENT.CAPTURE.COMPLETED) does fulfillment.
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        const capture = httpsCallable(functions, 'capturePaypalOrder');
        await capture({ orderId: data?.orderID, paypalEnv: PAYPAL_ENV });
        opts.onApproved();
      };

    }

    const buttons = paypal.Buttons(buttonConfig);
    if (buttons.isEligible && !buttons.isEligible()) {
      throw new Error('PayPal Buttons are not eligible to render in this context.');
    }
    await buttons.render(opts.container);

    return () => {
      try {
        buttons.close?.();
      } catch {
        // ignore — container may already be unmounted
      }
    };
  },

  // ACDC hosted card fields — card-only checkout with NO PayPal account (FR-12).
  // Renders number/expiry/cvv into `container`; `submit()` validates + runs 3DS, then:
  //   - one-time → captures server-side via capturePaypalOrder (same as the button path),
  //   - subscription → vaults the card and creates the subscription server-side via
  //     createPaypalSubscriptionWithCard. The webhook is still the source of truth.
  async renderCardFields(
    opts: CheckoutOptions & {
      container: HTMLElement;
      onApproved: () => void;
      onError?: (e: unknown) => void;
    }
  ): Promise<{ submit: (billingAddress?: BillingAddress) => Promise<void>; cleanup: () => void }> {
    if (!PAYPAL_CLIENT_ID) {
      throw new Error(
        'NEXT_PUBLIC_PAYPAL_CLIENT_ID is not set (PAYPAL_ENV=' + PAYPAL_ENV + ').'
      );
    }


    const isSubscription = opts.mode === 'subscription';
    // Reuse the single SDK load (buttons,card-fields) — never load a second script.
    const paypal = await loadPayPal(isSubscription ? 'subscription' : 'capture');
    if (!paypal || !paypal.CardFields) {

      throw new Error('PayPal CardFields (ACDC) is not available for this account/context.');
    }

    const callable = async (name: string, payload: unknown): Promise<any> => {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/lib/firebase');
      const fn = httpsCallable(functions, name);
      const res = await fn(payload as Record<string, unknown>);
      return res.data;
    };

    const cardFieldConfig: Record<string, any> = {
      style: { input: { 'font-size': '16px' } },
      onError: (e: unknown) => opts.onError?.(e),
    };

    if (isSubscription) {
      // Vault the card via a setup token, then create the subscription server-side
      // with the resulting vaulted payment source.
      cardFieldConfig.createVaultSetupToken = async () => {
        const data = await callable('createPaypalCardSetupToken', { userId: opts.userId, paypalEnv: PAYPAL_ENV });
        if (!data?.setupToken) throw new Error('Failed to create card setup token.');
        return data.setupToken as string;
      };
      cardFieldConfig.onApprove = async (data: { vaultSetupToken?: string }) => {
        await callable('createPaypalSubscriptionWithCard', {
          setupToken: data?.vaultSetupToken,
          planId: opts.priceId, // P-xxxx
          userId: opts.userId,
          paypalEnv: PAYPAL_ENV,
        });
        opts.onApproved();
      };
    } else {
      const oneTime = oneTimeAmount(opts.priceId);
      if (!oneTime) {
        throw new Error(`Unknown one-time PayPal item: ${opts.priceId}`);
      }
      cardFieldConfig.createOrder = async () => {
        const data = await callable('createPaypalOrder', {
          priceId: opts.priceId,
          userId: opts.userId,
          paypalEnv: PAYPAL_ENV,
        });
        if (!data?.orderId) throw new Error('Failed to create PayPal order.');
        return data.orderId as string;
      };
      cardFieldConfig.onApprove = async (data: { orderID?: string }) => {
        // Capture server-side (guest-card client capture is unreliable — FR-11).
        await callable('capturePaypalOrder', { orderId: data?.orderID, paypalEnv: PAYPAL_ENV });
        opts.onApproved();
      };
    }

    const cardField = paypal.CardFields(cardFieldConfig);
    if (cardField.isEligible && !cardField.isEligible()) {
      throw new Error('PayPal card fields are not eligible to render in this context.');
    }

    // Standard card-form layout (Stripe/Amazon style): a 2-column grid where the
    // Cardholder Name and Card Number each span the full width, and Expiry + CVV
    // share the bottom row. A small label sits above each hosted field.
    opts.container.style.cssText =
      'display:grid;grid-template-columns:1fr 1fr;gap:14px;';
    const mk = (cls: string, label: string, fullWidth: boolean) => {
      const wrap = document.createElement('div');
      if (fullWidth) wrap.style.gridColumn = '1 / -1';
      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.style.cssText =
        'display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:6px;';
      const el = document.createElement('div');
      el.className = cls;
      el.style.cssText =
        'border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;min-height:44px;background:#fff;';
      wrap.appendChild(lbl);
      wrap.appendChild(el);
      opts.container.appendChild(wrap);
      return el;
    };
    // Name (full) → Number (full) → Expiry | CVV (shared row). NameField is part of
    // the same ACDC card-fields instance.
    const nameEl = mk('pp-card-name', 'Cardholder Name', true);
    const numberEl = mk('pp-card-number', 'Card Number', true);
    const expiryEl = mk('pp-card-expiry', 'Expiration (MM/YY)', false);
    const cvvEl = mk('pp-card-cvv', 'Security Code (CVV)', false);


    const nameField = cardField.NameField({ placeholder: 'Name on card' });
    const numberField = cardField.NumberField();
    const expiryField = cardField.ExpiryField();
    const cvvField = cardField.CVVField();
    await Promise.all([
      nameField.render(nameEl),
      numberField.render(numberEl),
      expiryField.render(expiryEl),
      cvvField.render(cvvEl),
    ]);

    return {
      submit: async (billingAddress?: BillingAddress) => {
        // Runs validation + 3-D Secure; resolves on success, rejects on decline.
        // Pass the billing address (country + postal) for AVS when provided.
        if (billingAddress?.countryCode && billingAddress?.postalCode) {
          await cardField.submit({
            billingAddress: {
              countryCode: billingAddress.countryCode,
              postalCode: billingAddress.postalCode,
            },
          });
        } else {
          await cardField.submit();
        }
      },
      cleanup: () => {
        try { nameField.close?.(); } catch { /* ignore */ }
        try { numberField.close?.(); } catch { /* ignore */ }
        try { expiryField.close?.(); } catch { /* ignore */ }
        try { cvvField.close?.(); } catch { /* ignore */ }
      },
    };

  },


  async getBillingHistory(customerId: string): Promise<Transaction[]> {

    // Read the neutral billing_customers/{uid}/transactions docs (NFR-2: history
    // comes from our store, written by the webhook — not a live PayPal API call).
    const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const txRef = collection(db, 'billing_customers', customerId, 'transactions');
    const snap = await getDocs(query(txRef, orderBy('date', 'desc')));

    const transactions: Transaction[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      transactions.push({
        id: doc.id,
        date: typeof d.date === 'number' ? d.date : d.date?.seconds ?? 0,
        amount: d.amount ?? 0,
        currency: d.currency ?? 'usd',
        status: d.status ?? 'paid',
        productName: d.productName ?? 'Payment',
        receiptUrl: d.receiptUrl,
      });
    });
    return transactions;
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    const cancel = httpsCallable(functions, 'cancelPaypalSubscription');
    await cancel({ subscriptionId, paypalEnv: PAYPAL_ENV });
  },
};
