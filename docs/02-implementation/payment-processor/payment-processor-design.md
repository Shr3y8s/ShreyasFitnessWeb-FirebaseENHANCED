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
  buttonCheckout: boolean;    // PayPal ✅ (Smart Buttons) — Stripe ❌ / Paddle ❌
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
  // Redirect/overlay providers return a url to follow:
  startCheckout(opts: CheckoutOptions): Promise<{ url?: string }>;
  // Button-checkout providers (capabilities.buttonCheckout) mount in-place buttons
  // instead of redirecting; returns an unmount/cleanup fn:
  renderCheckout?(opts: CheckoutOptions & {
    container: HTMLElement;
    onApproved: () => void;     // post-approval UI feedback; webhook is source of truth
    onError?: (e: unknown) => void;
  }): Promise<() => void>;
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
//   (fallback NEXT_PUBLIC_PAYMENT_PROVIDER for both; default 'paypal')
export function getPaymentProvider(hint?: { mode?: 'subscription' | 'payment' }): PaymentProvider;
```
**Default is now `paypal`** (PayPal is the live processor). The Stripe adapter stays
registered but **dormant** — Stripe rejected the merchant application at go-live
(Jun 2026); set the env back to `stripe` to reactivate it if Stripe ever reinstates.
The safety fallback in `getPaymentProvider()` also returns PayPal (not Stripe).


### 2.3a `<ProviderCheckout>` component
A shared component (`app/src/components/payments/ProviderCheckout.tsx`) keeps pages
provider-agnostic. It always renders a **trigger button** first (so nothing happens —
no account creation, no SDK popup — until the user clicks), then branches on
`capabilities.buttonCheckout`:
- **redirect providers (Stripe):** on click → `onBeforeCheckout()` → `startCheckout()` →
  follow `url`. Single click, unchanged from today.
- **button providers (PayPal):** on click → `onBeforeCheckout()` → reveal a container and
  `renderCheckout()` (mounts `<PayPalButtons>`), wiring `onApproved` to navigate to
  `successUrl`. So it's click-trigger → PayPal buttons appear → approve in popup.

**`onBeforeCheckout` may be async and return a resolved userId.** Signature:
`() => void | Promise<void | { userId?: string }>`. This is the seam that preserves the
signup flow's **"create the account at the very last step, just before the processor
call"** semantics across BOTH provider types: the page passes an `onBeforeCheckout` that
(a) runs reCAPTCHA + creates the Firebase account and (b) returns `{ userId }`.
`<ProviderCheckout>` runs it on the trigger click, then uses the returned `userId` for
`startCheckout`/`renderCheckout` (falling back to the `userId` prop for logged-in pages).
GA4 `begin_checkout` is emitted here too. Pages render
`<ProviderCheckout mode priceId successUrl cancelUrl metadata userId? onBeforeCheckout? />`
and never reference a processor directly.

**DOM-isolation requirement (button providers).** PayPal `buttons.render(el)` injects an
`<iframe>` into `el`. If `el` is a React-owned node, the next React re-render (the
auth-state change after signup, a parent re-render, etc.) reconciles the PayPal-mutated
DOM and throws `NotFoundError` (`removeChild`/`insertBefore`) → blank white screen. So
`<ProviderCheckout>` mounts into an **inner plain `<div>` created imperatively and
appended to the ref container** — React only ever owns the empty outer wrapper, never the
node PayPal mutates (the same isolation `@paypal/react-paypal-js` does internally).



**Price-id resolution (critical for button providers).** A page's checkout `priceId`
must be the **active provider's** id, not a Stripe id — Stripe wants a `price_…`, PayPal
wants a Billing Plan `P-…` (subscription) or a `PAYPAL_ONETIME` key (one-time). Because
the neutral `Product.id` is the **same Stripe product id** across adapters (design §2.6),
pages resolve the correct price by calling
`getPaymentProvider({mode}).fetchProduct(stripeProductId)` → `selectSignupPrice` /
`selectSessionPrice` → `price.id`, and pass that to `<ProviderCheckout priceId=…>`.
Button providers render on mount, so this resolution happens during the page's load
effect (not on click). Display name/amount may still come from the existing
Stripe-sourced catalog (same numbers) — only the checkout `priceId` must come from the
active provider. For Stripe this returns the same id used today (no behavior change).


### 2.4 Pricing helpers (`pricing.ts`)
Move the provider-independent math out of `lib/stripe.ts`: `formatCurrency`,
`selectSignupPrice`, `selectSessionPrice`, `isSessionProduct`,
`getSessionPricing`-style helpers, `calculateSessionSavings`. They operate only on
neutral `Product`/`Price`, so they never change again across providers.

### 2.5 Stripe adapter (`providers/stripe.ts`)
Implements `PaymentProvider` by delegating to the **existing** `lib/stripe.ts`
(`fetchAllProducts`, `fetchProduct`, `createStripeCheckoutSession`) and the
existing Functions callables (`createPaymentMethodPortalSession`,
`getBillingHistory`). Capabilities: `{ buttonCheckout:false, hostedPortal:true,
showsStoredCard:true, inAppCancel:true }`. No logic rewrite — pure delegation,
mapping `lookup_key`→`lookupKey` etc.

### 2.6 PayPal adapter (`providers/paypal.ts`) — launch processor
Uses **PayPal Smart Buttons** (`@paypal/react-paypal-js` → its re-exported imperative
`loadScript` + `paypal.Buttons(...).render(container)`) for BOTH flows via
`renderCheckout()` (not a redirect). Capabilities: `{ buttonCheckout:true,
hostedPortal:false, showsStoredCard:false, inAppCancel:true }`.

**Catalog identity (critical — keeps `user.tier` semantics unchanged).** PayPal has no
shared product catalog to read like Stripe, so `fetchAllProducts`/`fetchProduct` build
the neutral catalog locally from `constants.ts` (`SERVICE_TIERS` + `PAYPAL_PLANS` +
`PAYPAL_ONETIME`) plus the existing names/marketing. To avoid touching the app-wide tier
logic (`SERVICE_TIERS`, `product-config.js` check-in eligibility, `ONLINE_COACHING_TIERS`,
`hasOnlineCoaching`), the neutral **`Product.id` stays the same Stripe product id** used
today (so `user.tier` is still a Stripe product id). PayPal-specific identifiers live on
the `Price`:
- **recurring tiers** → `Price.id` = the PayPal **Billing Plan id** (`P-xxxx`) from
  `PAYPAL_PLANS`, `type:'recurring'`.
- **one-time items** → `Price.id` = the `PAYPAL_ONETIME` key (`IN_PERSON` /
  `IN_PERSON_4PACK`), `type:'one_time'`, `amount` from `PAYPAL_ONETIME`.

`renderCheckout()` then branches on `opts.mode`:
- **subscription** → `paypal.Buttons({ createSubscription: (_,a)=>a.subscription.create({ plan_id: opts.priceId, custom_id: opts.userId }) })`. `custom_id` carries the uid so the webhook maps the subscription → user.
- **one-time** → `paypal.Buttons({ createOrder: (_,a)=>a.order.create({ purchase_units:[{ amount, custom_id: opts.userId, description }] }), onApprove: (_,a)=>a.order.capture() })`. Amount resolved from `PAYPAL_ONETIME[opts.priceId]`.

`onApprove` fires `opts.onApproved` (UI feedback only). `getBillingHistory()` reads the
neutral `billing_customers/{uid}/transactions` docs from Firestore (owner-readable per
rules; no hosted portal); `cancelSubscription()` calls the server cancel callable (T3.3).
The PayPal approval popup (PayPal / Venmo / card) completes payment; **the webhook is the
source of truth** for activation/fulfillment.

### 2.6a PayPal ACDC card fields (card-only checkout, no PayPal account) — FR-12
**Why:** PayPal Smart Buttons force a card-paying *subscriber* to create/log into a PayPal
account (recurring billing needs a vaulted wallet) — bad CX. PayPal **ACDC ("Advanced
Credit and Debit Card Payments")** is enabled on our account, so we render **hosted card
fields** in-page for card-only checkout (branded + 3-D Secure), with the Smart Button kept
alongside as the wallet option. New capability flag: `cardFields: true` (PayPal). Stays in
the existing PayPal adapter — same webhook/fulfillment/cancel; no new processor.

**SDK load:** add `card-fields` to components, keep `buttons`:
`loadScript({ components: 'buttons,card-fields', intent, vault: isSubscription, … })`.

**One-time (Orders):** `paypal.CardFields({ createOrder, onApprove })`.
- `createOrder` = same Orders body as the button (amount from `PAYPAL_ONETIME`, `custom_id`).
- `onApprove({ orderID })` → call our **server capture** callable `capturePaypalOrder`
  (FR-11) — NOT a client capture. Webhook `PAYMENT.CAPTURE.COMPLETED` fulfills.

**Subscription (vault + plan):** card must be vaulted, then the subscription created with
that vaulted payment source. Flow:
1. `paypal.CardFields({ createVaultSetupToken, onApprove })` (vault setup token flow), OR
   create the subscription with the card via `createSubscription` if the SDK build supports
   inline card → subscription. We use the **server-assisted** path to stay robust:
   - client `CardFields.submit()` performs 3-D Secure on the card,
   - on success client calls a new callable **`createPaypalSubscriptionWithCard`** with the
     vault/setup token + `plan_id` + uid; the server creates the subscription
     (`POST /v1/billing/subscriptions` with the vaulted `payment_source`) and returns it.
2. The `BILLING.SUBSCRIPTION.ACTIVATED` webhook activates the tier (unchanged).

**`<ProviderCheckout>` rendering (design §2.3a):** when `capabilities.cardFields` is true,
render BOTH the Smart Button (wallet) and a "Pay with card" section containing the hosted
fields + a Pay button that calls `CardFields.submit()`. Both still mount into the
**isolated non-React container** (the iframe-isolation rule from §2.3a applies to card
fields too). On success → navigate to `successUrl`; webhook fulfills.

**3-D Secure / SCA:** ACDC handles the 3DS challenge inside `CardFields.submit()`; we treat
a resolved submit as "approved → let the webhook confirm," and surface `onError` on failure
(declined / failed liability shift).


### 2.7 Unified checkout flow (`/checkout` + `/checkout/success`) — Phase 3.7

**Goal.** Replace the per-page, inline checkout UIs (the `<ProviderCheckout>` mounted
directly inside pricing cards, the bespoke `/payment` page, etc.) with ONE reusable,
generic checkout destination every "Buy" / "Pay" / "Subscribe" button routes to:

```
…any Buy/Pay button → router.push('/checkout?item=<KEY>&return=<relative path>')
                       → /checkout (menu + card-in-modal) → approve
                       → /checkout/success?item=<KEY>&return=<relative path>
                       → Firestore listener waits for fulfillment → ✅ Continue → <return>
```

**Reusability principle (owner rule).** `/checkout` is **scenario-agnostic** and
**assumes the user is already authenticated.** It contains NO account creation, NO
reCAPTCHA, NO signup-specific branching. Any scenario-specific work (e.g. creating the
Firebase account + reCAPTCHA for a new signup) MUST happen in the *caller* BEFORE it
redirects into `/checkout`. This keeps `/checkout` identical whether reached from the
dashboard (already logged in) or from signup (account just created), so it is a true
shared surface.

#### 2.7.1 `CHECKOUT_ITEMS` registry (source of truth)
A small registry in `constants.ts`, keyed by a short, non-sensitive URL param. The URL
carries ONLY the key — amounts, plan ids, and product ids are resolved server-/adapter-side
from this registry (nothing chargeable is trusted from the URL):

```ts
export type CheckoutItemKey =
  | 'IN_PERSON' | 'IN_PERSON_4PACK' | 'ONLINE_COACHING' | 'COMPLETE_TRANSFORMATION';

export interface CheckoutItem {
  mode: 'payment' | 'subscription';          // → getPaymentProvider({mode})
  productId: string;                          // SERVICE_TIERS.x (neutral Product.id = Stripe prod id)
  fulfillment: 'session_package' | 'subscription_active'; // success-page signal to await
}

export const CHECKOUT_ITEMS: Record<CheckoutItemKey, CheckoutItem> = {
  IN_PERSON:               { mode: 'payment',      productId: SERVICE_TIERS.IN_PERSON,               fulfillment: 'session_package' },
  IN_PERSON_4PACK:         { mode: 'payment',      productId: SERVICE_TIERS.IN_PERSON_4PACK,         fulfillment: 'session_package' },
  ONLINE_COACHING:         { mode: 'subscription', productId: SERVICE_TIERS.ONLINE_COACHING,         fulfillment: 'subscription_active' },
  COMPLETE_TRANSFORMATION: { mode: 'subscription', productId: SERVICE_TIERS.COMPLETE_TRANSFORMATION, fulfillment: 'subscription_active' },
};
```
`productId` stays the **Stripe product id** (design §2.6), so the active provider's checkout
`priceId` is resolved the usual way: `getPaymentProvider({mode}).fetchProduct(productId)` →
`selectSignupPrice`/`selectSessionPrice` → `price.id`.

#### 2.7.2 `/checkout?item=&return=` (generic, auth-required)
- Reads `item` (a `CheckoutItemKey`) and `return` (a relative path).
- **`return` allowlist:** must start with `/` and not with `//` (no off-site / open-redirect).
  Invalid/missing → fall back to `/dashboard`.
- Auth-required: if no signed-in user, bounce to `/login` (callers are responsible for
  ensuring auth before routing here — see the reusability principle).
- Loads the item summary (name/amount) from the existing catalog and resolves the active
  provider's checkout `priceId`.
- Renders a **method menu** for the active provider. For PayPal (capability-driven):
  - Smart Buttons → PayPal, **Pay Later/BNPL**, **Venmo** (when eligible) render inline.
  - A **"Pay with debit/credit card"** button opens a **modal** containing the ACDC hosted
    card fields (incl. Cardholder Name) — keeps the card form out of the main flow and off
    the pricing cards.
- `successUrl = /checkout/success?item=<KEY>&return=<return>`; on approval the buttons/card
  flow navigate there. The webhook remains the source of truth for fulfillment.

#### 2.7.3 `/checkout/success?item=&return=` (finalizing + Continue)
Fixes the post-payment "pop-in" lag (where the dashboard rendered before the webhook had
written fulfillment). Flow:
1. Show a "Finalizing your purchase…" spinner.
2. Open a Firestore `onSnapshot` on `users/{uid}` and wait for the item's `fulfillment`
   signal:
   - `session_package` → `sessionBalance.purchased` is **greater than a baseline** captured
     on mount (a new package was created).
   - `subscription_active` → `accountActivated === true`.
3. On signal → ✅ success state + a **Continue** button (navigates to `return`).
4. **15s timeout fallback** → show a soft note ("still processing — you can continue") and
   enable Continue anyway, so a slow webhook never traps the user.

#### 2.7.4 `<ProviderCheckout>` card-in-modal mode (Amazon-style two-column)
`<ProviderCheckout>` gains `cardMode="modal"` (used by `/checkout`): wallet/Smart Buttons
render inline, and a **"Debit or Credit Card"** button opens a Radix `Dialog` with the ACDC
hosted card fields. The iframe-isolation rule from §2.3a still applies (fields mount into an
imperatively-created non-React child node). Inline behavior remains the default so other
call sites are unaffected. Stripe stays redirect (capability-driven; no card-in-modal).

The modal is a **professional two-column layout** (Amazon/Google checkout style):
- **Header:** `CreditCard` icon + title **"Enter Card Details"** (not "Add a card" — we do
  NOT store the card) + "All fields required … we never store your card."
- **Left column (form):** stacked fields **Cardholder Name (full) → Card Number (full) →
  Expiry | CVV** (the only paired row), each with a label above it; then a **billing
  address** row — **Country `<select>` + ZIP/Postal `<input>`** collected as our own React
  inputs (NOT hosted fields) for AVS.
- **Right column (sidebar):** "We accept all major cards" + the accepted **card-network
  logos** (cards-only here — see §2.7.7), centered.
- **Footer:** `[ Cancel (outline) ]` — `[ 🛡 Encrypted & Secure ]` (ShieldCheck) —
  `[ Pay $<amount> ]` (the amount comes from a `payLabel` prop the page passes).

**Billing address → AVS.** A neutral `BillingAddress { countryCode, postalCode }` type is
added; the card `submit(billingAddress?)` forwards it to PayPal's
`cardField.submit({ billingAddress })` so the issuer can run Address Verification (reduces
declines/fraud). Country defaults to `US`.

#### 2.7.5 Cardholder Name + field layout (`renderCardFields`)
`renderCardFields` in `paypal.ts` adds `cardField.NameField()` (Cardholder Name) alongside
Number/Expiry/CVV, mounted in the same isolated container, laid out **Name (full) → Number
(full) → Expiry | CVV** via a CSS grid with a label above each field. Still ONE `loadScript`
(`buttons,card-fields`) — no second SDK load. `submit()` accepts the optional billing address
(§2.7.4).

#### 2.7.7 Accepted-method logos (`PaymentMethodLogos`)
`app/src/components/payments/PaymentMethodLogos.tsx` renders the "We accept" brand marks:
- **Card networks** (Visa, Mastercard, Amex, Discover) via the **`react-svg-credit-card-payment-icons`**
  package — official-style inline SVGs (no asset 404s, brand-faithful).
- **Wallets** — **PayPal** (inline wordmark) + **Google Pay** and **Apple Pay** rendered from
  the **official mark SVGs** in `app/public/payment-icons/` (`google-pay-mark_800.svg`,
  `Apple_Pay_Mark_RGB_041619.svg`) via `<img>` (brand-guideline compliant).
- API: `variant="cards" | "wallets" | "both"` (+ optional `columns` grid). The `/checkout`
  page shows two captioned rows (**Cards** / **Wallets**); the **card-entry modal sidebar**
  shows **cards-only** (wallets don't belong in a card-typing form).
- These are **display-only**. Apple/Google Pay as *functional* buttons remain deferred
  (§2.7.6).

#### 2.7.8 Modal render stability (PayPal hosted-field iframes)
PayPal's ACDC fields are cross-origin **iframes** that load AFTER the dialog opens, which
caused two artifacts that are now fixed:
- **No reposition/flicker:** the `DialogContent` has a **fixed height** (`h-[760px]`,
  `max-h-[92vh]`, internal scroll) so Radix computes the centered position once and never
  recenters when the iframes grow. (A `min-height`-only reserve was insufficient — taller
  iframes still grew the box and a centered dialog moves by half the delta.)
- **No "fields fill in" / Strict-Mode double-mount:** the fields are held hidden
  (`opacity:0`) behind a spinner until rendered, then fade in together after a short settle;
  the mount effect mounts once per real open and **defers teardown** so React 19 dev Strict
  Mode's mount→unmount→remount reuses the existing fields instead of destroying/rebuilding.
- The residual brief field-load is inherent to PayPal's remote iframes (no app fix possible);
  it's masked by the spinner+fade.

#### 2.7.6 Deferred (NOT built now)
- **Apple Pay / Google Pay** *functional buttons* via PayPal — require separate
  `applepay`/`googlepay` SDK components AND PayPal **domain registration** of `shrey.fit`
  over HTTPS; they won't render on `localhost`. (Their **logos** are already shown — §2.7.7.)
- **Affirm / Klarna** are NOT available through PayPal (Stripe-only) — out of scope.



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
`paymentWebhook` = `detectProvider(req)` → `verifySignature(req)` → `parseEvent(req)`
→ `switch` → neutral fulfillment. Fulfillment (`activateSubscription`,
`fulfillSessionPackage`, `writeSubscriptionRecord`, activity-feed writes) is ported
once from the current Stripe-specific handlers in `index.js`/`sessions.js`.

**Provider routing (`detectProvider`).** A single `paymentWebhook` serves all
providers. It resolves the provider by, in order: the explicit `?provider=` query
(how each endpoint is registered) → **provider-specific signature headers** (PayPal
sends `paypal-transmission-sig`, Stripe sends `stripe-signature`) → env default →
`stripe`. The header fallback is required: if a registered URL is missing/strips the
query param, events must NOT silently fall through to the wrong verifier. (This was a
real bug — a PayPal webhook registered without `?provider=paypal` ran the Stripe
verifier and never fulfilled.)

**One-time capture dedupe (PayPal).** A PayPal Orders purchase emits BOTH
`CHECKOUT.ORDER.APPROVED` and `PAYMENT.CAPTURE.COMPLETED` (different ids). Only the
**capture** event fulfills the session package; `CHECKOUT.ORDER.APPROVED` is ignored
for fulfillment (approval ≠ captured) to avoid double-creating packages.

**Server-side capture (PayPal one-time).** The browser SDK's `actions.order.capture()`
is unreliable for unbranded/guest-card orders (returns `ack: permission_denied` /
"Insufficient privileges"; works only when the buyer is logged into a PayPal account).
Since production buyers pay by card as guests, the one-time `onApprove` does NOT capture
in the browser — it calls the auth-gated `capturePaypalOrder` callable with the
`orderID`, which captures server-side via `POST /v2/checkout/orders/{id}/capture` using
our Secret Manager credentials (full capture privilege). The `PAYMENT.CAPTURE.COMPLETED`
webhook still performs fulfillment (idempotent). Subscriptions are unaffected — they
never capture client-side (`createSubscription` → PayPal bills the plan → webhook).



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
- **Always:** render the payment-history table.
  - Stripe keeps its existing rich live `getBillingHistory` callable (card brand/last4).
  - PayPal reads the neutral `billing_customers/{uid}/transactions` store (NFR-2;
    written by the webhook) via `provider.getBillingHistory(uid)`.
- **If `capabilities.hostedPortal`** → "Update Payment Method" button →
  `openBillingPortal({restricted:true})` (Stripe/Paddle). **PayPal has NO hosted
  portal** — its only customer surface is the full paypal.com account page, which
  can't be scoped (unlike Stripe's restricted portal config). Per owner decision we
  do **NOT** link to it. No "Manage in PayPal" link anywhere.
- **If `capabilities.showsStoredCard`** → render the card-on-file block (Stripe);
  else (PayPal) hide it and show a read-only "Paid with PayPal" line (PayPal funds
  from the buyer's wallet; no card last4 is exposed to us).
- **If `!hostedPortal && inAppCancel`** (PayPal) → in-app **Cancel Subscription**
  button (confirm dialog) → `provider.cancelSubscription(subscriptionId)` (the
  `cancelPaypalSubscription` callable); the webhook then updates state.
No processor names appear in the page; it branches only on capability flags.


## 6. Checkout UX per provider
- **Stripe (today):** redirect to Stripe Checkout (subscription) / Payment Element
  (one-time) — unchanged behind `startCheckout`.
- **PayPal (launch):** **Smart Buttons** (`@paypal/react-paypal-js`) for BOTH
  subscription and one-time, mounted via `renderCheckout()` through
  `<ProviderCheckout>` (no redirect). Subscription → `createSubscription({plan_id})`;
  one-time → `createOrder`→capture. Approval popup (PayPal / Venmo / card); webhook
  fulfills. Embedded card fields (ACDC) are out of scope (requirements §8).
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
- PayPal client config: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `NEXT_PUBLIC_PAYPAL_ENV`
  (`sandbox`|`production`). Recurring **Billing Plan IDs** (`P-xxxx`) per tier are
  stored in config (`constants.ts` `SERVICE_TIERS`-style map or env), created in the
  PayPal dashboard (Catalog Product → Billing Plan).

### 7.1 Dual test/live environments (sandbox in dev, live in prod) — NFR-7
PayPal exposes two fully isolated environments (separate dashboards, accounts,
credentials, API base, and webhooks). We select per deploy environment — **no
shared catalog to filter** (the Stripe pain point is gone):

| Concern | Dev (`.env.local`) | Prod (`apphosting.yaml`) |
|---|---|---|
| `NEXT_PUBLIC_PAYPAL_ENV` | `sandbox` | `production` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | sandbox client id | live client id |
| API base (server) | `api-m.sandbox.paypal.com` | `api-m.paypal.com` |
| `PAYPAL_CLIENT_SECRET` (Secret Mgr) | sandbox secret | live secret |
| `PAYPAL_WEBHOOK_ID` (Secret Mgr) | sandbox webhook id | live webhook id |
| Billing Plan IDs (`P-xxxx`) | `SANDBOX_PLANS` | `LIVE_PLANS` |

- **Client:** the PayPal JS SDK loader reads `NEXT_PUBLIC_PAYPAL_ENV` +
  `NEXT_PUBLIC_PAYPAL_CLIENT_ID`; sandbox renders the sandbox popup, prod the live one.
- **Server:** the PayPal adapter picks the API base from `PAYPAL_ENV` and verifies
  webhook signatures with the matching `PAYPAL_WEBHOOK_ID`.
- **Plan IDs + one-time amounts:** `constants.ts` mirrors the existing `SERVICE_TIERS`
  test/live pattern. Recurring tiers resolve to a PayPal **Billing Plan id** (`P-xxxx`);
  one-time items (single session, 4-pack) carry no plan — they are charged via the
  Orders API, so the adapter only needs their **amount in minor units** + label. The CT
  $60 discounted in-person session is NOT a one-time amount here — it is the `setup_fee`
  baked into the Complete Transformation billing plan (charged with the first cycle).
  ```ts
  const PAYPAL_LIVE = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'production';

  // Recurring Billing Plans (P-xxxx), created via firebase/scripts/paypal-setup-catalog.js.
  const SANDBOX_PLANS = {
    ONLINE_COACHING: 'P-98H09129JK640830CNI26BLQ',
    COMPLETE_TRANSFORMATION: 'P-9YF75345BP118725ENI26GLI',
  } as const;
  const LIVE_PLANS = {                 // filled at cutover (Phase 5) by re-running the script
    ONLINE_COACHING: '',
    COMPLETE_TRANSFORMATION: '',
  } as const;
  export const PAYPAL_PLANS = PAYPAL_LIVE ? LIVE_PLANS : SANDBOX_PLANS;

  // One-time items (Orders API, no plan) — amount in MINOR units (cents), same as Price.amount.
  export const PAYPAL_ONETIME = {
    IN_PERSON:       { amount: 7500,  label: 'In-Person Training Session' }, // $75
    IN_PERSON_4PACK: { amount: 24000, label: '4-Pack In-Person Sessions' },  // $240
  } as const;
  ```
  The plan ids/amounts are keyed by the same tier keys as `SERVICE_TIERS`, so a checkout
  call site maps a `user.tier`/product selection → PayPal plan or order amount uniformly.
- **Webhooks:** sandbox and live are registered separately (each its own endpoint +
  `PAYPAL_WEBHOOK_ID`), so dev never receives live events and vice-versa.


## 8. Testing & Cutover
- Each provider integrated against its **sandbox** first.
- Cutover = set the per-mode env to the new provider, deploy Functions, register
  the live webhook endpoint, run a small live smoke purchase, then retire the
  invertase extension (`firebase.json`) once Stripe is fully off.
- Rollback = env flip back + redeploy previous Functions.

## 10. Changing prices (operational note)
PayPal makes price changes **easier than Stripe** (no archive-and-recreate):
- **One-time items** ($75 session, $240 4-pack): the adapter builds the order
  `amount` at checkout from `PAYPAL_ONETIME` (constants today; `billing_config`
  in Phase 6). Changing the price = edit one number. No stored price object.
- **Recurring tiers**: `POST /v1/billing/plans/{id}/update-pricing-schemes` changes
  the cycle price **in place — the `P-xxxx` plan id is unchanged**, so `PAYPAL_PLANS`
  doesn't change. Existing subscribers are grandfathered by default; new subscribers
  get the new price. The CT `setup_fee` is changed via plan `PATCH /v1/billing/plans/{id}`
  (also in-place). An optional `firebase/scripts/paypal-update-pricing.js` helper
  (mirrors the catalog script) makes this a one-command op per environment.

## 11. Promotions / coupons (future — see tasks Phase 6)
The coupon **rules engine is ours and provider-neutral** (Firestore `coupons` +
server-side validator): code, percent/fixed/intro, expiry, max redemptions, per-user
limit, tier scope, first-timers, stackable — full Stripe-level customization, since
PayPal isn't involved in rule evaluation. Only **applying** the resulting discount is
provider-specific, expressed as an `appliesTo` capability the adapter advertises:
| appliesTo | PayPal support | Mechanism |
|---|---|---|
| `one_time` | ✅ full | Order `purchase_units[].amount.breakdown.discount` |
| `first_cycle` (intro price / first-N / waived setup) | ✅ full | inline `plan` override at `createSubscription` (extra TRIAL cycle / setup_fee) |
| `recurring_forever` (% off every renewal) | ❌ not cleanly | would need a dedicated discounted plan — capability-gated OFF for PayPal; admin UI hides it while PayPal is the subscription processor |
`CheckoutOptions` gains an optional `discount` (validated **server-side**, never
trusted from the client). The shared `<ProviderCheckout>` exposes a promo-code field
that is enabled per capability. If a fuller provider (e.g. Paddle) is later added for
subscriptions, `recurring_forever` lights up automatically with no engine rewrite.

## 9. Phasing (maps to tasks doc)

1. **Phase 1 (done):** client seam + neutral types/pricing + Stripe adapter +
   re-point call sites + build-verify. No functional change.
1.5. **Phase 1.5:** interface extension — add `buttonCheckout` capability +
   optional `renderCheckout()` + shared `<ProviderCheckout>` component; Stripe
   sets `buttonCheckout:false`. Build-verify (Stripe unchanged).
2. **Phase 2:** server seam — generic `paymentWebhook` + neutral fulfillment +
   neutral `billing_*` writes (Stripe still live).
3. **Phase 3:** PayPal adapter (client+server+webhook) + sandbox test.
4. **Phase 4:** Paddle adapter (client+server+webhook) + sandbox test.
5. **Phase 5:** production cutover + retire Stripe extension.
