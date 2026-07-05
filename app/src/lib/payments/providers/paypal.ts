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
        amount: 20000, // $200/mo
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
        'All online coaching benefits plus discounted in-person training sessions, then $250/month.',

      price: {
        id: PAYPAL_PLANS.COMPLETE_TRANSFORMATION,
        amount: 25000, // $250/mo
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
    // `applepay,googlepay` are SEPARATE SDK components (not funding sources on
    // paypal.Buttons). They're added to the SINGLE load so the Apple/Google Pay
    // wallet flows share the same SDK instance (a second loadScript would tear down
    // the already-rendered buttons). They're only USED on the one-time (capture)
    // path — see renderCheckout — but keeping the components string identical across
    // intents keeps the loadPayPal cache key stable. (Feature 3 — Apple/Google Pay,
    // one-time; see docs/.../applepay-googlepay-design.md §2.1.)
    components: 'buttons,card-fields,applepay,googlepay',
    currency: 'USD',
    // Enable Venmo as a funding source (US buyers, eligible contexts only). The
    // @paypal/paypal-js loader maps `enableFunding` → the SDK's `enable-funding`
    // query param. Venmo renders as an additional wallet button when eligible; it
    // uses the SAME createOrder/createSubscription + onApprove config as the other
    // buttons, so capture/activation + any discounted amount apply unchanged.
    // (Feature 3 — additional payment methods, phase 1.)
    enableFunding: 'venmo',
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

// Google Pay needs Google's OWN script (the button + PaymentsClient live on
// `window.google.payments.api`). This is NOT the PayPal SDK, so it does not violate
// the single-PayPal-load rule — but we still load it ONCE (memoized) and only lazily
// from the Google Pay path, so non-eligible/subscription contexts never fetch it.
// See docs/.../applepay-googlepay-design.md §2.2.
const GOOGLE_PAY_SDK_URL = 'https://pay.google.com/gp/p/js/pay.js';
let googlePayScriptPromise: Promise<any> | null = null;

function loadGooglePayScript(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.google?.payments?.api) return Promise.resolve(w.google);
  if (googlePayScriptPromise) return googlePayScriptPromise;

  googlePayScriptPromise = new Promise((resolve, reject) => {
    // Reuse an existing tag if one was already injected.
    const existing = document.querySelector(
      `script[src="${GOOGLE_PAY_SDK_URL}"]`
    ) as HTMLScriptElement | null;
    const onload = () => {
      if (w.google?.payments?.api) resolve(w.google);
      else reject(new Error('Google Pay script loaded but google.payments.api is unavailable.'));
    };
    if (existing) {
      if (w.google?.payments?.api) return resolve(w.google);
      existing.addEventListener('load', onload, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Pay script.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GOOGLE_PAY_SDK_URL;
    script.async = true;
    script.onload = onload;
    script.onerror = () => reject(new Error('Failed to load Google Pay script.'));
    document.head.appendChild(script);
  });
  return googlePayScriptPromise;
}



export const paypalProvider: PaymentProvider = {

  name: 'paypal',
  capabilities: {
    buttonCheckout: true,
    cardFields: true, // ACDC hosted card fields — card-only checkout, no PayPal account
    hostedPortal: false,
    showsStoredCard: false,
    inAppCancel: true,
    externalAdminDashboard: true,
    adminAnalytics: true,
    discounts: true, // app-managed discount codes (Feature 2)
    // Device/OS wallet buttons (Apple Pay / Google Pay) for ONE-TIME checkout,
    // rendered internally by renderCheckout (eligibility-gated). One-time only —
    // wallet-funded recurring is deferred (see applepay-googlepay-decision.md).
    wallets: true,
  },


  // Validate + preview a discount code for an item (READ-ONLY; records nothing).
  // Backed by the `previewDiscount` callable, which resolves the original amount
  // server-side, validates the code, and returns the floored discounted amount.
  // The server independently recomputes the charged amount at order-create time.
  async previewDiscount(opts: {
    code: string;
    productId: string;
    mode: 'subscription' | 'payment';
    priceId: string;
  }) {
    const { httpsCallable } = await import('firebase/functions');
    const { functions } = await import('@/lib/firebase');
    const fn = httpsCallable(functions, 'previewDiscount');
    const res = await fn({
      code: opts.code,
      productId: opts.productId,
      mode: opts.mode,
      priceId: opts.priceId,
      paypalEnv: PAYPAL_ENV,
    });
    return res.data as import('../types').DiscountPreview;
  },


  getAdminDashboardUrl(): string {
    // Env-aware PayPal merchant dashboard (Activity → payments/subscriptions).
    // sandbox vs live keyed off NEXT_PUBLIC_PAYPAL_ENV (same source as PAYPAL_ENV).
    return PAYPAL_ENV === 'production'
      ? 'https://www.paypal.com/billing/subscriptions'
      : 'https://www.sandbox.paypal.com/billing/subscriptions';
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
      onApproved: (transactionId?: string) => void;
      onProcessing?: () => void;
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
        // Approval returned (popup closed) → show the "Finalizing…" state, then the
        // webhook fulfills (activation). UI feedback only.
        opts.onProcessing?.();
        opts.onApproved();
      },
      onError: (e: unknown) => opts.onError?.(e),
    };


    if (isSubscription) {
      // Create the subscription SERVER-SIDE via the callable (NOT
      // actions.subscription.create). The server resolves the BASE plan id, re-validates
      // any discountCode, computes the discounted price, and bakes a per-subscriber
      // billing_cycles override into the create call. The base plans are minted 2-cycle
      // (TRIAL seq 1 + REGULAR seq 2), so the override reprices existing cycles (intro =
      // seq 1 only with auto-revert; recurring = both) — no INVALID_BILLING_CYCLE_SEQUENCE.
      // custom_id carries uid + code so the ACTIVATED webhook records the redemption. No
      // code → bare-uid custom_id + no override (byte-for-byte the old plain flow).
      // (subscription-discounts T10 — 2-cycle override model.)
      buttonConfig.createSubscription = async () => {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        const createSub = httpsCallable(functions, 'createPaypalSubscription');
        const res = await createSub({
          planId: opts.priceId,
          userId: opts.userId,
          discountCode: opts.discountCode,
          paypalEnv: PAYPAL_ENV,
        });
        const subscriptionId = (res?.data as { subscriptionId?: string } | undefined)?.subscriptionId;
        if (!subscriptionId) throw new Error('Failed to create PayPal subscription.');
        return subscriptionId;
      };
    } else {

      const oneTime = oneTimeAmount(opts.priceId);

      if (!oneTime) {
        throw new Error(`Unknown one-time PayPal item: ${opts.priceId}`);
      }
      // Create the order SERVER-SIDE via the callable (NOT actions.order.create).
      // The server resolves the amount from the priceId, re-validates any
      // discountCode, computes the floored discounted amount, and threads the
      // productId + code through custom_id — so a DISCOUNTED order is created at the
      // correct amount and the capture path can record the redemption + resolve the
      // product. The client never sets the amount. (Feature 2 — discount codes.)
      buttonConfig.createOrder = async () => {
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        const createOrder = httpsCallable(functions, 'createPaypalOrder');
        const res = await createOrder({
          priceId: opts.priceId,
          userId: opts.userId,
          discountCode: opts.discountCode,
          paypalEnv: PAYPAL_ENV,
        });
        const orderId = (res?.data as { orderId?: string } | undefined)?.orderId;
        if (!orderId) throw new Error('Failed to create PayPal order.');
        return orderId;
      };
      buttonConfig.onApprove = async (data: any) => {
        // Approval returned (popup closed) → show the "Finalizing…" state during the
        // server capture below so the page is never left blank.
        opts.onProcessing?.();

        // Capture SERVER-SIDE via callable. The browser SDK's actions.order.capture()

        // is unreliable for guest-card orders (permission_denied / Insufficient
        // privileges); our Functions credentials capture reliably. The callable also
        // fulfills synchronously and returns the capture id as `transactionId` — we
        // pass it to onApproved so the success page can match an ABSOLUTE fulfillment
        // signal (sessionPackages[].providerTransactionId === id) instead of waiting
        // for the balance to change. The PAYMENT.CAPTURE.COMPLETED webhook is the
        // idempotent backup.
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/lib/firebase');
        const capture = httpsCallable(functions, 'capturePaypalOrder');
        const res = await capture({ orderId: data?.orderID, paypalEnv: PAYPAL_ENV });
        const transactionId = (res?.data as { transactionId?: string } | undefined)?.transactionId;
        opts.onApproved(transactionId);
      };


    }

    // Render funding sources as SEPARATE buttons in a CONTROLLED ORDER, each in its
    // own LABELED, OUTLINED box (Feature 3 — payment methods):
    //   1. "Pay with Card"   — PayPal-hosted guest checkout (NO PayPal account). Its
    //                          built-in "Powered by PayPal" tagline now reads as part
    //                          of this clearly-labeled box (not a stray line).
    //   2. "Pay with PayPal" — PayPal + Pay Later/Credit (PayPal picks the exact Pay
    //                          Later vs Credit label/offer itself; we can't override it)
    //   3. "More ways to pay"— Venmo (Apple/Google Pay slot in here later)
    // The combined auto-layout doesn't let us order the buttons, so we render each
    // funding source explicitly. Every funding source is eligibility-guarded and
    // non-fatal; a section box is only added if at least one of its buttons rendered
    // (so we never show an empty labeled box). All buttons share the SAME
    // createOrder/createSubscription + onApprove config, so fulfillment is identical.
    const FUNDING = paypal.FUNDING || {};
    const closers: Array<() => void> = [];
    let renderedAny = false;

    // TEMP wallet-eligibility debug (remove after diagnosis). When the checkout URL
    // has `?walletdebug=1`, append an on-screen panel and let the wallet mounts push
    // human-readable reasons for why Apple/Google Pay did or didn't render — so we can
    // diagnose on a phone without a desktop console. No-op unless the flag is present.
    const walletDebugOn =
      typeof window !== 'undefined' && /[?&]walletdebug=1\b/.test(window.location.search);
    let walletDebugEl: HTMLElement | null = null;
    const wdbg = (line: string) => {
      if (!walletDebugOn) return;
      if (typeof window !== 'undefined') console.info('[walletdebug]', line);
      if (!walletDebugEl) {
        walletDebugEl = document.createElement('pre');
        walletDebugEl.style.cssText =
          'white-space:pre-wrap;font-size:12px;line-height:1.4;background:#111;color:#0f0;' +
          'padding:10px;border-radius:8px;margin:0 0 12px;overflow:auto;max-height:40vh;';
        walletDebugEl.textContent = 'WALLET DEBUG\n';
        opts.container.appendChild(walletDebugEl);
      }
      walletDebugEl.textContent += line + '\n';
    };


    // A section item is EITHER a PayPal funding source (rendered via paypal.Buttons)
    // OR a custom wallet mount (Apple/Google Pay — separate SDK components that aren't
    // FUNDING.* sources). `customMount` renders into the provided element and returns a
    // cleanup closer, or null when not eligible/failed (non-fatal — the box skips it).
    type SectionItem =
      | { fundingSource: unknown; extraStyle?: Record<string, unknown> }
      | { customMount: (el: HTMLElement) => Promise<(() => void) | null> };

    // Build a labeled, outlined section box, render the given items into it, and append
    // it to the checkout container ONLY if something rendered.
    const renderSection = async (
      label: string,
      items: Array<SectionItem>
    ): Promise<boolean> => {
      // Box: rounded rectangle outline with a small uppercase label at the top.
      const box = document.createElement('div');
      box.style.cssText =
        'border:1px solid #e5e7eb;border-radius:12px;padding:14px 14px 10px;margin-top:' +
        (renderedAny ? '14px' : '0') + ';background:#fff;';
      const lbl = document.createElement('div');
      lbl.textContent = label;
      lbl.style.cssText =
        'font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#6b7280;margin-bottom:10px;';
      box.appendChild(lbl);
      const buttonsWrap = document.createElement('div');
      box.appendChild(buttonsWrap);
      // Attach to the live DOM first — PayPal's render() expects an in-DOM target.
      opts.container.appendChild(box);

      let any = false;
      for (const item of items) {
        // ---- Custom wallet mount (Apple/Google Pay) ----
        if ('customMount' in item) {
          try {
            const el = document.createElement('div');
            el.style.marginTop = any ? '8px' : '0';
            buttonsWrap.appendChild(el);
            const closer = await item.customMount(el);
            if (!closer) {
              el.remove(); // not eligible / failed → non-fatal, skip
              continue;
            }
            closers.push(closer);
            any = true;
          } catch {
            // Non-fatal — skip this wallet, keep the rest.
          }
          continue;
        }

        // ---- PayPal funding source (card / PayPal / Pay Later / Venmo) ----
        const { fundingSource, extraStyle } = item;
        if (!fundingSource) continue;
        try {
          const candidate = paypal.Buttons({
            ...buttonConfig,
            fundingSource,
            style: { layout: 'vertical', shape: 'rect', ...(extraStyle || {}) },
          });
          if (candidate.isEligible && !candidate.isEligible()) continue;
          const el = document.createElement('div');
          el.style.marginTop = any ? '8px' : '0';
          buttonsWrap.appendChild(el);
          await candidate.render(el);
          closers.push(() => {
            try { candidate.close?.(); } catch { /* ignore */ }
          });
          any = true;
        } catch {
          // Non-fatal — skip this funding source, keep the rest.
        }
      }

      if (!any) {
        box.remove(); // no eligible button → don't show an empty labeled box
        return false;
      }
      renderedAny = true;
      return true;
    };

    // Resolve the DISPLAY total (minor units) for the wallet sheets (Google/Apple Pay).
    // The wallet sheet total is set CLIENT-SIDE, so it must reflect what will actually
    // be captured. The server stays authoritative for the charge (createPaypalOrder
    // recomputes amount + discount), but showing the catalog $75 while capturing the
    // discounted $67.50 is wrong (and Google Pay uses totalPriceStatus:'FINAL'). So when
    // a discount code is present we ask the SAME `previewDiscount` callable the checkout
    // summary uses for the server-computed, post-floor discounted amount. Memoized so
    // both wallets share ONE call; falls back to the catalog amount on any error/invalid
    // (never blocks the wallet). See docs/.../applepay-googlepay-design.md §9.
    let walletDisplayCentsPromise: Promise<number> | null = null;
    const resolveWalletDisplayCents = (catalogCents: number): Promise<number> => {
      if (walletDisplayCentsPromise) return walletDisplayCentsPromise;
      walletDisplayCentsPromise = (async () => {
        if (!opts.discountCode) return catalogCents;
        try {
          const productId = buildCatalog().find((e) => e.price.id === opts.priceId)?.productId;
          if (!productId) return catalogCents;
          const { httpsCallable } = await import('firebase/functions');
          const { functions } = await import('@/lib/firebase');
          const preview = httpsCallable(functions, 'previewDiscount');
          const res = await preview({
            code: opts.discountCode,
            productId,
            mode: 'payment',
            priceId: opts.priceId,
            paypalEnv: PAYPAL_ENV,
          });
          const data = res?.data as { valid?: boolean; discountedAmount?: number } | undefined;
          if (data?.valid && typeof data.discountedAmount === 'number' && data.discountedAmount > 0) {
            return data.discountedAmount;
          }
          return catalogCents;
        } catch {
          return catalogCents; // non-fatal → show catalog amount
        }
      })();
      return walletDisplayCentsPromise;
    };

    // Google Pay wallet mount (Feature 3 phase 2a — ONE-TIME only). Separate PayPal

    // SDK component (`paypal.Googlepay()`) + Google's own `pay.js` button. Eligibility-
    // gated + non-fatal: returns null (→ omitted) on any non-eligibility/error so the
    // other buttons are unaffected. On tap: create the order SERVER-SIDE (amount +
    // discount are server-authoritative), run the Google Pay sheet, confirm the order
    // with PayPal, then capture server-side — the SAME fulfillment path as the buttons.
    // See docs/.../applepay-googlepay-design.md §4. Google Pay's `environment` is TEST
    // in sandbox (non-chargeable test credentials) / PRODUCTION on live.
    const renderGooglePay = async (mountEl: HTMLElement): Promise<(() => void) | null> => {
      // Wallets are one-time only (recurring via wallets is deferred — decision §4).
      if (isSubscription) return null;
      const oneTime = oneTimeAmount(opts.priceId);
      if (!oneTime) return null;
      if (!paypal.Googlepay) return null;

      // ORIGIN GUARD: PayPal's Google Pay config endpoint (GetGooglePayConfig) only
      // returns CORS headers for a SECURE context served from a REAL, resolvable
      // domain. It rejects `localhost`/`127.0.0.1` (and any non-HTTPS origin) — so on
      // a local dev box the config call 403s and the SDK logs `googlepay_config_error`,
      // which Next's dev overlay then surfaces. We can't fix that from the client, so
      // we SKIP Google Pay entirely on those origins (non-fatal — the other buttons are
      // unaffected) and log a single quiet, explanatory line instead of the raw error.
      // To test Google Pay locally, serve the app from a real HTTPS domain (a tunnel
      // such as cloudflared/ngrok, or an App Hosting preview). See
      // docs/.../applepay-googlepay-design.md §10.
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocalhost =
          host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
        const isSecure = window.location.protocol === 'https:';
        if (!isSecure || isLocalhost) {
          console.info(
            '[paypal] Google Pay skipped — requires a secure (HTTPS) real-domain origin; ' +
            'PayPal rejects localhost. Use a tunnel or a deployed preview to test it.'
          );
          return null;
        }
      }

      try {
        await loadGooglePayScript();

        const w = window as any;
        if (!w.google?.payments?.api) return null;

        const googlepay = paypal.Googlepay();
        const config = await googlepay.config();
        if (!config || config.isEligible === false) return null;

        const environment = PAYPAL_ENV === 'production' ? 'PRODUCTION' : 'TEST';
        const paymentsClient = new w.google.payments.api.PaymentsClient({ environment });

        const readyResult = await paymentsClient.isReadyToPay({
          apiVersion: config.apiVersion,
          apiVersionMinor: config.apiVersionMinor,
          allowedPaymentMethods: config.allowedPaymentMethods,
        });
        if (!readyResult?.result) return null;

        const onClick = async () => {
          try {
            // DISPLAY total on the Google Pay sheet (totalPriceStatus:'FINAL'). It must
            // MATCH what the server captures, so when a discount code is present we use
            // the server-computed discounted amount (via previewDiscount); otherwise the
            // catalog amount. The server (createPaypalOrder) remains authoritative for
            // the actual charge — this only fixes the displayed/authorized total.
            const displayCents = await resolveWalletDisplayCents(oneTime.amount);
            const paymentDataRequest = {
              apiVersion: config.apiVersion,
              apiVersionMinor: config.apiVersionMinor,
              allowedPaymentMethods: config.allowedPaymentMethods,
              merchantInfo: config.merchantInfo,
              transactionInfo: {
                countryCode: config.countryCode || 'US',
                currencyCode: 'USD',
                totalPriceStatus: 'FINAL',
                totalPrice: (displayCents / 100).toFixed(2),
              },
            };

            const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);

            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('@/lib/firebase');

            // Create the order server-side (amount + discount authoritative there).
            const createOrder = httpsCallable(functions, 'createPaypalOrder');
            const createRes = await createOrder({
              priceId: opts.priceId,
              userId: opts.userId,
              discountCode: opts.discountCode,
              paypalEnv: PAYPAL_ENV,
            });
            const orderId = (createRes?.data as { orderId?: string } | undefined)?.orderId;
            if (!orderId) throw new Error('Failed to create PayPal order.');

            // Confirm the order with the Google Pay payment credential.
            const confirm = await googlepay.confirmOrder({
              orderId,
              paymentMethodData: paymentData.paymentMethodData,
            });
            if (confirm?.status && confirm.status !== 'APPROVED') {
              throw new Error(`Google Pay order not approved (status=${confirm.status}).`);
            }

            // Capture SERVER-SIDE (same as the button/card paths); returns the capture
            // id so the success page can match an absolute fulfillment signal.
            opts.onProcessing?.();
            const capture = httpsCallable(functions, 'capturePaypalOrder');
            const capRes = await capture({ orderId, paypalEnv: PAYPAL_ENV });
            const transactionId = (capRes?.data as { transactionId?: string } | undefined)?.transactionId;
            opts.onApproved(transactionId);
          } catch (e: any) {
            // Google Pay sheet CANCEL is non-fatal (buyer dismissed) — don't surface it.
            if (e && (e.statusCode === 'CANCELED' || e.statusCode === 'CANCELLED')) return;
            opts.onError?.(e);
          }
        };

        const buttonEl = paymentsClient.createButton({
          onClick,
          buttonType: 'plain',
          buttonSizeMode: 'fill',
        });
        mountEl.appendChild(buttonEl);
        return () => {
          try { mountEl.innerHTML = ''; } catch { /* ignore */ }
        };
      } catch {
        return null; // any failure → omit Google Pay (non-fatal)
      }
    };

    // Apple Pay wallet mount (Feature 3 phase 2b — ONE-TIME only). Separate PayPal SDK
    // component (`paypal.Applepay()`) + the browser-native `ApplePaySession`. Eligibility-
    // gated + non-fatal: returns null (→ omitted) unless the browser is Apple Pay-capable
    // (Safari on a device with a card in Wallet) AND the merchant/domain is Apple Pay-
    // registered. On tap: create the order SERVER-SIDE (amount + discount authoritative),
    // validate the merchant, confirm the order with the Apple Pay token, then capture
    // server-side — the SAME fulfillment path as the buttons. See design §3. Requires the
    // domain to be registered in PayPal + the /.well-known/apple-developer-merchantid-
    // domain-association file served at 200 (T3). NOT testable on localhost / non-Safari.
    const renderApplePay = async (mountEl: HTMLElement): Promise<(() => void) | null> => {
      wdbg('ApplePay: start');
      // Wallets are one-time only (recurring via wallets is deferred — decision §4).
      if (isSubscription) { wdbg('ApplePay: SKIP isSubscription'); return null; }
      const oneTime = oneTimeAmount(opts.priceId);
      if (!oneTime) { wdbg('ApplePay: SKIP no oneTime amount for ' + opts.priceId); return null; }
      wdbg('ApplePay: paypal.Applepay = ' + (paypal.Applepay ? 'present' : 'UNDEFINED (merchant not Apple Pay-enabled?)'));
      if (!paypal.Applepay) return null;

      // ORIGIN GUARD: Apple Pay requires a SECURE (HTTPS) context on a REAL, registered
      // domain — never localhost. Skip quietly on localhost/non-HTTPS so local dev isn't
      // noisy (matches the Google Pay guard). Test via a deployed HTTPS domain that's
      // registered in PayPal (sandbox.shrey.fit) on a real Apple device.
      if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const isLocalhost =
          host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost');
        const isSecure = window.location.protocol === 'https:';
        if (!isSecure || isLocalhost) {
          wdbg('ApplePay: SKIP origin guard (secure=' + isSecure + ' host=' + host + ')');
          console.info(
            '[paypal] Apple Pay skipped — requires a secure (HTTPS) registered-domain ' +
            'origin on a real Apple device (Safari). Use the deployed sandbox domain to test.'
          );
          return null;
        }
      }

      try {
        const w = window as any;
        const ApplePaySession = w.ApplePaySession;
        wdbg(
          'ApplePay: ApplePaySession=' + (ApplePaySession ? 'present' : 'MISSING') +
          ' supportsV4=' + (ApplePaySession?.supportsVersion ? String(ApplePaySession.supportsVersion(4)) : 'n/a') +
          ' canMakePayments=' + (ApplePaySession?.canMakePayments ? String(ApplePaySession.canMakePayments()) : 'n/a')
        );
        // Browser capability gate: Apple Pay JS present, supported version, and the device
        // can make payments (a card is provisioned). Any false → omit (non-fatal).
        if (
          !ApplePaySession ||
          typeof ApplePaySession.supportsVersion !== 'function' ||
          !ApplePaySession.supportsVersion(4) ||
          typeof ApplePaySession.canMakePayments !== 'function' ||
          !ApplePaySession.canMakePayments()
        ) {
          wdbg('ApplePay: SKIP browser capability gate');
          return null;
        }

        const applepay = paypal.Applepay();
        // Merchant/domain capability: config() tells us whether this merchant+domain is
        // set up for Apple Pay (registered domain, country/currency, merchant caps).
        const config = await applepay.config();
        wdbg('ApplePay: config.isEligible=' + (config ? String(config.isEligible) : 'no config') +
          ' countryCode=' + (config?.countryCode ?? '?'));
        if (!config || config.isEligible === false) { wdbg('ApplePay: SKIP config not eligible'); return null; }


        // DISPLAY total on the Apple Pay sheet. Like Google Pay, it must MATCH the
        // server-captured amount, so when a discount code is present we use the
        // server-computed discounted amount (previewDiscount); otherwise the catalog
        // amount. Resolved before creating the session (Apple requires the total up
        // front). The server (createPaypalOrder) stays authoritative for the charge.
        const displayCents = await resolveWalletDisplayCents(oneTime.amount);

        const onClick = async () => {
          try {
            const paymentRequest = {
              countryCode: config.countryCode || 'US',
              currencyCode: config.currencyCode || 'USD',
              merchantCapabilities: config.merchantCapabilities || ['supports3DS'],
              supportedNetworks: config.supportedNetworks || ['visa', 'masterCard', 'amex', 'discover'],
              requiredBillingContactFields: ['name', 'postalAddress'],
              total: {
                label: oneTime.label || 'Shrey.Fit',
                amount: (displayCents / 100).toFixed(2),
                type: 'final',
              },
            };


            const session = new ApplePaySession(4, paymentRequest);

            // Validate the merchant against Apple via PayPal, then hand Apple the
            // resulting merchant session to open the sheet.
            session.onvalidatemerchant = async (event: any) => {
              try {
                const merchantSession = await applepay.validateMerchant({
                  validationUrl: event.validationURL,
                });
                // PayPal returns { merchantSession } (or the session directly depending
                // on SDK version); pass whichever Apple expects.
                session.completeMerchantValidation(
                  merchantSession?.merchantSession ?? merchantSession
                );
              } catch (e) {
                try { session.abort(); } catch { /* ignore */ }
                opts.onError?.(e);
              }
            };

            session.onpaymentauthorized = async (event: any) => {
              try {
                const { httpsCallable } = await import('firebase/functions');
                const { functions } = await import('@/lib/firebase');

                // Create the order server-side (amount + discount authoritative there).
                const createOrder = httpsCallable(functions, 'createPaypalOrder');
                const createRes = await createOrder({
                  priceId: opts.priceId,
                  userId: opts.userId,
                  discountCode: opts.discountCode,
                  paypalEnv: PAYPAL_ENV,
                });
                const orderId = (createRes?.data as { orderId?: string } | undefined)?.orderId;
                if (!orderId) throw new Error('Failed to create PayPal order.');

                // Confirm the order with the Apple Pay token.
                const confirm = await applepay.confirmOrder({
                  orderId,
                  token: event.payment.token,
                  billingContact: event.payment.billingContact,
                  shippingContact: event.payment.shippingContact,
                });
                if (confirm?.status && confirm.status !== 'APPROVED') {
                  session.completePayment(ApplePaySession.STATUS_FAILURE);
                  throw new Error(`Apple Pay order not approved (status=${confirm.status}).`);
                }
                session.completePayment(ApplePaySession.STATUS_SUCCESS);

                // Capture SERVER-SIDE (same as the button/card paths); returns the capture
                // id so the success page can match an absolute fulfillment signal.
                opts.onProcessing?.();
                const capture = httpsCallable(functions, 'capturePaypalOrder');
                const capRes = await capture({ orderId, paypalEnv: PAYPAL_ENV });
                const transactionId = (capRes?.data as { transactionId?: string } | undefined)?.transactionId;
                opts.onApproved(transactionId);
              } catch (e) {
                try { session.completePayment(ApplePaySession.STATUS_FAILURE); } catch { /* ignore */ }
                opts.onError?.(e);
              }
            };

            session.oncancel = () => {
              // Buyer dismissed the sheet — non-fatal, nothing to surface.
            };

            session.begin();
          } catch (e) {
            opts.onError?.(e);
          }
        };

        // Render an Apple Pay button. Use the native <apple-pay-button> custom element
        // (available where Apple Pay JS is) styled to fill the box.
        const btn = document.createElement('apple-pay-button') as HTMLElement;
        btn.setAttribute('buttonstyle', 'black');
        btn.setAttribute('type', 'plain');
        btn.setAttribute('locale', 'en-US');
        btn.style.setProperty('--apple-pay-button-width', '100%');
        btn.style.setProperty('--apple-pay-button-height', '44px');
        btn.style.display = 'block';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', onClick);
        mountEl.appendChild(btn);
        wdbg('ApplePay: RENDERED button ✓');

        return () => {
          try { mountEl.innerHTML = ''; } catch { /* ignore */ }
        };
      } catch (e) {
        wdbg('ApplePay: SKIP threw ' + ((e as Error)?.message || String(e)));
        return null; // any failure → omit Apple Pay (non-fatal)
      }
    };



    // 1) Card (top) — guest, no PayPal account. HOSTED card flow — works WITHOUT the

    //    Reference Transactions capability vaulted-card subs require.
    await renderSection('Pay with Card', [{ fundingSource: FUNDING.CARD }]);
    // 2) PayPal family — branded PayPal button + Pay Later/Credit.
    await renderSection('Pay with PayPal', [
      { fundingSource: FUNDING.PAYPAL, extraStyle: { label: 'paypal' } },
      { fundingSource: FUNDING.PAYLATER },
    ]);
    // 3) Wallets — Venmo + Google Pay + Apple Pay (one-time only; each eligibility-
    //    guarded and non-fatal, so a non-eligible context simply omits it). Google/Apple
    //    Pay are separate SDK components (customMount) — they use the SAME server
    //    createOrder + capture path, so fulfillment + discounts are identical to the
    //    other buttons. Apple Pay renders only on a capable Apple device (Safari) with the
    //    domain registered in PayPal (T3); elsewhere it's silently omitted.
    await renderSection('More ways to pay', [
      { fundingSource: FUNDING.VENMO },
      { customMount: renderGooglePay },
      { customMount: renderApplePay },
    ]);



    // Fallback: if NOTHING rendered (e.g. funding constants unavailable), render the
    // combined auto-layout so checkout is never empty.
    if (!renderedAny) {
      const buttons = paypal.Buttons(buttonConfig);
      if (buttons.isEligible && !buttons.isEligible()) {
        throw new Error('PayPal Buttons are not eligible to render in this context.');
      }
      const walletEl = document.createElement('div');
      opts.container.appendChild(walletEl);
      await buttons.render(walletEl);
      closers.push(() => {
        try { buttons.close?.(); } catch { /* ignore */ }
      });
    }

    return () => {
      for (const close of closers) {
        try { close(); } catch { /* ignore — container may already be unmounted */ }
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
          discountCode: opts.discountCode, // Feature 2 T9: server validates + first-cycle override
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
          discountCode: opts.discountCode, // Feature 2: server re-validates + applies
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
        // GUARDRAIL: reject empty/invalid card fields BEFORE calling the server.
        // PayPal CardFields exposes per-field validity via getState(); submitting
        // an empty/invalid form would vault an unusable token (no card captured)
        // and the server subscription create would then 400 on missing
        // number/expiry. getState() is async and may be unavailable in older SDKs,
        // so guard defensively and only block on a CONFIRMED-invalid form.
        try {
          if (typeof cardField.getState === 'function') {
            const state = await cardField.getState();
            if (state && state.isFormValid === false) {
              throw new Error('Please complete all card fields before paying.');
            }
          }
        } catch (e) {
          // Only rethrow our own validation message; ignore getState() failures
          // (don't block a real submit just because state introspection failed).
          if (e instanceof Error && e.message.startsWith('Please complete')) {
            throw e;
          }
        }

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
        // Funding instrument ("Visa ••4242" / "PayPal" / "Venmo") when the webhook
        // captured it. Absent on legacy rows → the UI falls back to "PayPal".
        paymentMethod: d.paymentMethod,
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

  // ---- Admin/business analytics (read from the neutral Firestore store) ----

  async getRevenueMetrics() {
    // MRR + active-subscription count + revenue-by-tier, computed from the neutral
    // active subscription records (billing_customers/{uid}/subscriptions, status==active).
    // `amount` is the ACTUAL charged amount (minor units, post-discount); `interval`
    // normalizes annual plans. One-time purchases never create a subscription record,
    // so they can't pollute MRR.
    const { collectionGroup, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    const snap = await getDocs(
      query(collectionGroup(db, 'subscriptions'), where('status', '==', 'active'))
    );

    let mrr = 0;
    let activeSubscriptions = 0;
    const byTier = new Map<string, { revenueMonthly: number; count: number }>();

    snap.forEach((doc) => {
      const d = doc.data() as any;
      if (typeof d.amount !== 'number') return; // neutral records carry `amount`
      // Cadence-aware MRR (prepay-plans Phase A): normalize the charged amount to a
      // monthly figure. `months` (or intervalCount) = 1 monthly, 3 quarterly, 12
      // annual. A quarterly $540 charge contributes $180 MRR, not $540. Legacy records
      // without the field default to monthly; the `interval==='year'` path is kept for
      // back-compat. Never divide by 0.
      const months =
        typeof d.months === 'number' && d.months > 0
          ? d.months
          : typeof d.intervalCount === 'number' && d.intervalCount > 0
            ? d.intervalCount
            : d.interval === 'year'
              ? 12
              : 1;
      let monthly = Math.round(d.amount / months);

      mrr += monthly;
      activeSubscriptions += 1;
      const tierName = d.tierName || d.productId || 'Subscription';
      const cur = byTier.get(tierName) || { revenueMonthly: 0, count: 0 };
      byTier.set(tierName, { revenueMonthly: cur.revenueMonthly + monthly, count: cur.count + 1 });
    });

    const revenueByTier = Array.from(byTier.entries())
      .map(([tierName, v]) => ({ tierName, revenueMonthly: v.revenueMonthly, count: v.count }))
      .sort((a, b) => b.revenueMonthly - a.revenueMonthly);

    return { mrr, activeSubscriptions, revenueByTier };
  },

  async getRecentTransactions(limit = 10) {
    // Recent payments from the neutral transactions store, newest first. `type`
    // (subscription | one_time) is written by the webhook/fulfillment so the UI can
    // split subscription vs one-time revenue without provider-specific parsing.
    const {
      collectionGroup,
      getDocs,
      query,
      orderBy,
      limit: fbLimit,
    } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    const snap = await getDocs(
      query(collectionGroup(db, 'transactions'), orderBy('date', 'desc'), fbLimit(limit))
    );

    return snap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        id: doc.id,
        date: typeof d.date === 'number' ? d.date : d.date?.seconds ?? 0,
        amount: d.amount ?? 0,
        currency: d.currency ?? 'usd',
        status: d.status ?? 'succeeded',
        productName: d.productName ?? 'Payment',
        // Default unknown/legacy records to one_time (one-time captures predate the tag).
        type: d.type === 'subscription' ? 'subscription' : 'one_time',
      } as const;
    });
  },

  async getActiveSubscription(userId: string) {
    // Newest active subscription under the neutral store for this user, or null.
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');

    const ref = collection(db, 'billing_customers', userId, 'subscriptions');
    const snap = await getDocs(query(ref, where('status', '==', 'active')));
    if (snap.empty) return null;

    // Pick the most recently updated active sub if multiple exist.
    const docs = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as any }));
    docs.sort((a, b) => {
      const ta = a.data.updatedAt?.seconds ?? 0;
      const tb = b.data.updatedAt?.seconds ?? 0;
      return tb - ta;
    });
    const { id, data: d } = docs[0];

    const cpe = d.currentPeriodEnd;
    const currentPeriodEnd =
      typeof cpe === 'number' ? cpe : cpe?.seconds ?? null;

    return {
      subscriptionId: id,
      status: d.status ?? 'active',
      amount: typeof d.amount === 'number' ? d.amount : 0,
      interval: d.interval === 'year' ? 'year' : 'month',
      currentPeriodEnd,
      tierName: d.tierName,
      productId: d.productId,
    };
  },
};


