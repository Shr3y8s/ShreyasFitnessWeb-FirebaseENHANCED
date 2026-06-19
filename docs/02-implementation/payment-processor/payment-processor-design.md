# Payment Processor Abstraction — Design

> **Status:** Draft → in implementation
> **Created:** 2026-06-19
> **Related:** `payment-processor-requirements.md`, `payment-processor-tasks.md`

---

## 1. Overview

We introduce a thin **provider seam** on both the client and the server. The app
depends on internal interfaces and a **provider-neutral domain model**; each
processor (Stripe today, PayPal/Paddle later) is a swappable **adapter**.

```
        ┌──────────────────────── CLIENT (Next.js) ────────────────────────┐
 pages/ →  @/lib/payments (interface)  →  providers/{stripe|paypal|paddle}.ts
 components                              (only adapters import an SDK)
        └───────────────────────────────────────────────────────────────────┘
                                   │ callable / overlay / redirect
        ┌──────────────────────── SERVER (Cloud Functions) ─────────────────┐
  paymentWebhook (HTTP)  →  providers/{...}.js verifySignature/parseEvent
        →  NEUTRAL fulfillment: activateSubscription / fulfillSessionPackage
           / writeSubscriptionRecord  →  Firestore billing_* (+ users)
        └───────────────────────────────────────────────────────────────────┘
```

Key principle: **business logic is provider-neutral and written once.** Only
`verifySignature` + `parseEvent` (server) and `startCheckout`/`openBillingPortal`/
`getBillingHistory` (client) are processor-specific.

## 2. Client Architecture

### 2.1 File layout
```
app/src/lib/payments/
  types.ts            # neutral interfaces + capability flags (NO SDK imports)
  pricing.ts          # neutral helpers (formatCurrency, selectSignupPrice, …)
  index.ts            # getPaymentProvider(hint?) — per-purpose routing by env
  providers/
    stripe.ts         # wraps existing lib/stripe.ts + Stripe portal/history callables
    paypal.ts         # (Phase 3) PayPal adapter
    paddle.ts         # (Phase 4) Paddle adapter
```

### 2.2 Neutral domain model (`types.ts`)
```ts
export type BillingInterval = 'recurring' | 'one_time';

export interface Price {
  id: string;                 // provider price/plan id
  amount: number;             // minor units (cents)
  currency: string;
  type: BillingInterval;
  active: boolean;
  lookupKey?: string;
}
export interface Product {
  id: string; name: string; description?: string;
  active: boolean; prices: Price[];
}
export interface Transaction {
  id: string; date: number; amount: number; currency: string;
  status: string; productName: string; receiptUrl?: string;
}
export interface ProviderCapabilities {
  hostedPortal: boolean;      // Stripe ✅ Paddle ✅ PayPal ❌
  showsStoredCard: boolean;   // Stripe ✅ Paddle ✅ PayPal ❌
  inAppCancel: boolean;       // all ✅
}
export interface CheckoutOptions {
  userId: string; email?: string;
  priceId: string; mode: 'subscription' | 'payment';
  successUrl: string; cancelUrl: string;
  metadata?: Record<string, string>;
}
export interface PaymentProvider {
  readonly name: 'stripe' | 'paypal' | 'paddle';
  readonly capabilities: ProviderCapabilities;
  fetchAllProducts(includeInactive?: boolean): Promise<Product[]>;
  fetchProduct(productId: string): Promise<Product | null>;
  // Opens overlay (Paddle), redirects (Stripe/PayPal), or returns a url to follow:
  startCheckout(opts: CheckoutOptions): Promise<{ url?: string }>;
  getBillingHistory(customerId: string): Promise<Transaction[]>;
  openBillingPortal?(opts: { customerId: string; returnUrl: string; restricted?: boolean }): Promise<string>;
  cancelSubscription?(subscriptionId: string): Promise<void>;
}
```

### 2.3 Provider routing (`index.ts`)
```ts
// Per-purpose routing: subscriptions and one-time can use different providers.
// Env (apphosting.yaml / .env.local):
//   NEXT_PUBLIC_PAYMENT_PROVIDER_SUBSCRIPTION = stripe | paypal | paddle
//   NEXT_PUBLIC_PAYMENT_PROVIDER_ONETIME      = stripe | paypal | paddle
//   (fallback NEXT_PUBLIC_PAYMENT_PROVIDER for both; default 'stripe')
export function getPaymentProvider(hint?: { mode?: 'subscription' | 'payment' }): PaymentProvider;
```
Today every value defaults to `stripe`, so behavior is unchanged.

### 2.4 Pricing helpers (`pricing.ts`)
Move the provider-independent math out of `lib/stripe.ts`: `formatCurrency`,
`selectSignupPrice`, `selectSessionPrice`, `isSessionProduct`,
`getSessionPricing`-style helpers, `calculateSessionSavings`. They operate only on
neutral `Product`/`Price`, so they never change again across providers.

### 2.5 Stripe adapter (`providers/stripe.ts`)
Implements `PaymentProvider` by delegating to the **existing** `lib/stripe.ts`
(`fetchAllProducts`, `fetchProduct`, `createStripeCheckoutSession`) and the
existing Functions callables (`createPaymentMethodPortalSession`,
`getBillingHistory`). Capabilities: `{ hostedPortal:true, showsStoredCard:true,
inAppCancel:true }`. No logic rewrite — pure delegation, mapping `lookup_key`→
`lookupKey` etc.

## 3. Server Architecture (Phase 2+)

### 3.1 File layout
```
firebase/functions/payments/
  index.js       # generic `paymentWebhook` (HTTP) + portal/history/cancel callables
  fulfillment.js # NEUTRAL business logic (port of current Stripe handlers)
  providers/
    stripe.js    # verifySignature + parseEvent for Stripe (reference)
    paypal.js    # (Phase 3)
    paddle.js    # (Phase 4)
```

### 3.2 Neutral event model
```ts
type PaymentEvent =
  | { type: 'subscription.activated'; userId; subscription }
  | { type: 'subscription.updated';   userId; subscription }
  | { type: 'subscription.canceled';  userId; subscriptionId }
  | { type: 'payment.completed';      userId; transaction; isSessionPackage; productId }
  | { type: 'payment.refunded';       userId; transaction };
```
`paymentWebhook` = `verifySignature(req)` → `parseEvent(req)` → `switch` →
neutral fulfillment. Fulfillment (`activateSubscription`, `fulfillSessionPackage`,
`writeSubscriptionRecord`, activity-feed writes) is ported once from the current
Stripe-specific handlers in `index.js`/`sessions.js`.

### 3.3 Webhook event mapping (per provider)
| Neutral event | Stripe | PayPal | Paddle |
|---|---|---|---|
| subscription.activated | `customer.subscription.created` / invoice paid | `BILLING.SUBSCRIPTION.ACTIVATED` | `subscription.created`/`activated` |
| subscription.updated | `customer.subscription.updated` | `BILLING.SUBSCRIPTION.UPDATED` | `subscription.updated` |
| subscription.canceled | `customer.subscription.deleted` | `BILLING.SUBSCRIPTION.CANCELLED` | `subscription.canceled` |
| payment.completed | `checkout.session.completed` / `payment_intent.succeeded` | `PAYMENT.SALE.COMPLETED` / `CHECKOUT.ORDER.APPROVED` | `transaction.completed` |
| payment.refunded | `charge.refunded` | `PAYMENT.SALE.REFUNDED` | `transaction.refunded` |

## 4. Neutral Firestore Data Model

Migrate provider-named docs → neutral, written by the webhook:
```
billing_customers/{uid}                { provider, providerCustomerId, email }
billing_customers/{uid}/subscriptions/{id}   { status, priceId, productId, currentPeriodEnd, ... }
billing_customers/{uid}/transactions/{id}    { date, amount, currency, status, productName, receiptUrl }
```
- Billing UI reads **only** these neutral docs (NFR-2: history from our store, not
  live API per load).
- `users/{uid}` flags unchanged (`accountActivated`, `tier`, `subscriptionStatus`,
  session packages) — fulfillment keeps writing them.
- Migration from `stripe_customers`/`stripe_products` happens in the per-provider
  phase; during the client-abstraction phase the Stripe adapter still reads the
  existing `stripe_*` collections (no data migration yet).

## 5. Billing Page Redesign (capability-driven)

`dashboard/client/billing/page.tsx` becomes provider-shaped:
- **Always:** render `getBillingHistory()` table (every provider implements it).
- **If `capabilities.hostedPortal`** → "Manage billing" button → `openBillingPortal()`
  (Stripe/Paddle).
- **Else** (PayPal) → "Manage in PayPal" link + in-app **Cancel subscription**
  button (`cancelSubscription()`).
- **If `capabilities.showsStoredCard`** → render the card-on-file block; else hide
  it (PayPal funds from wallet).
No processor names appear in the page; it branches only on capability flags.

## 6. Checkout UX per provider
- **Stripe (today):** redirect to Stripe Checkout (subscription) / Payment Element
  (one-time) — unchanged behind `startCheckout`.
- **PayPal:** PayPal JS SDK buttons / Orders+Subscriptions; approval popup; on
  approve, capture server-side; webhook fulfills.
- **Paddle:** `Paddle.Checkout.open({ items:[{priceId}], customer, customData })`
  overlay (no redirect); webhook fulfills.

GA4 `begin_checkout`/`purchase` events are emitted from the call sites (already
present) and remain provider-independent.

## 7. Configuration & Secrets
- Client (`apphosting.yaml`, BUILD+RUNTIME): `NEXT_PUBLIC_PAYMENT_PROVIDER*`,
  plus provider client tokens (`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`,
  `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, existing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`).
- Server (Secret Manager): `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
  `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, existing `STRIPE_*`.

## 8. Testing & Cutover
- Each provider integrated against its **sandbox** first.
- Cutover = set the per-mode env to the new provider, deploy Functions, register
  the live webhook endpoint, run a small live smoke purchase, then retire the
  invertase extension (`firebase.json`) once Stripe is fully off.
- Rollback = env flip back + redeploy previous Functions.

## 9. Phasing (maps to tasks doc)
1. **Phase 1 (now, Stripe-safe):** client seam + neutral types/pricing + Stripe
   adapter + re-point call sites + build-verify. No functional change.
2. **Phase 2:** server seam — generic `paymentWebhook` + neutral fulfillment +
   neutral `billing_*` writes (Stripe still live).
3. **Phase 3:** PayPal adapter (client+server+webhook) + sandbox test.
4. **Phase 4:** Paddle adapter (client+server+webhook) + sandbox test.
5. **Phase 5:** production cutover + retire Stripe extension.
