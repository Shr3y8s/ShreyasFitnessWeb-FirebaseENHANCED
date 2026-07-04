# Apple Pay & Google Pay (one-time, via PayPal) — Design

> **Status:** Draft → ready for review
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-04
> **Requirements:** `applepay-googlepay-requirements.md`
> **Decision basis:** `applepay-googlepay-decision.md` (Option A — one-time via Orders v2)
> **Tasks:** `applepay-googlepay-tasks.md`

---

## 1. Overview & principles

Broaden **one-time** checkout funding **inside the PayPal adapter** while keeping the
app method-agnostic. Today `app/src/lib/payments/providers/paypal.ts`:
- Loads the SDK once: `loadScript({ clientId, components:'buttons,card-fields',
  currency:'USD', enableFunding:'venmo', intent })` (single-load rule — a second load
  breaks the first).
- In `renderCheckout`, renders funding sources as **separate, eligibility-guarded
  buttons** in labeled boxes via the `renderSection(label, items)` helper: **Pay with
  Card** → **Pay with PayPal** (PayPal + Pay Later) → **More ways to pay** (Venmo).

Apple/Google Pay are **separate SDK components** (not `FUNDING.*` sources), so they
need their own render + confirm flow. We add them into the **same** "More ways to pay"
section, using the **same** isolated-DOM + cleanup pattern, and the **same** server
order-create + capture path — so fulfillment and discounts are unchanged.

**Neutral rule (G2/NFR-1):** pages only render `<ProviderCheckout>` and read neutral
capability flags; the adapter owns all wallet specifics.

**Fulfillment (unchanged, G3):** one-time → `createPaypalOrder` (server) →
wallet-specific confirm → `capturePaypalOrder` (server, synchronous fulfill) +
idempotent `PAYMENT.CAPTURE.COMPLETED` webhook backup.

**Scope (decision):** one-time only. In `mode === 'subscription'` the wallet buttons are
**not rendered** (Option B — recurring via Vault+Orders — is deferred).

---

## 2. SDK load changes (FR-1, FR-2, NFR-3)

### 2.1 PayPal components (single load)
In `loadPayPal(intent)` extend the one `loadScript` options — do **not** add a second
load:
```
components: 'buttons,card-fields,applepay,googlepay'   // add applepay,googlepay
enableFunding: 'venmo'                                  // unchanged
```
The wallet components only need to be present for the one-time (`capture`) intent path;
because the same `loadPayPal` cache key is `${clientId}:${intent}`, keep the components
string identical across intents for simplicity (harmless for subscription mount — we
just don't render wallet buttons there). Confirm exact component names against current
PayPal docs during implementation.

### 2.2 Google `pay.js` (separate, allowed)
Google Pay needs Google's own script for the button + payment client:
`https://pay.google.com/gp/p/js/pay.js`. This is **not** the PayPal SDK, so it does not
violate the single-PayPal-load rule. Load it lazily inside the adapter's Google Pay
path (inject a `<script>` once, memoized like `scriptCache`), so no app page imports it
and non-eligible/subscription contexts never fetch it.

---

## 3. Apple Pay flow (FR-3, FR-6, FR-11)

Implemented entirely inside `renderCheckout`, one-time branch only.

### 3.1 Eligibility gate
```
const eligible =
  window.ApplePaySession &&
  ApplePaySession.supportsVersion(4) &&
  ApplePaySession.canMakePayments() &&
  paypal.Applepay; // component present
```
If not eligible → skip (non-fatal), exactly like the Venmo/card guards. Also fetch
`paypal.Applepay().config()` to confirm the merchant is Apple-Pay-capable; any failure →
skip.

### 3.2 Render + confirm
1. Render an Apple Pay button into an **isolated child DOM node** appended to the "More
   ways to pay" section box (same pattern as `renderSection`). Use the Apple Pay button
   CSS (`-apple-pay-button`) or PayPal's helper.
2. On click → `new ApplePaySession(version, paymentRequest)` where `paymentRequest` is
   built from the config (country US, currency USD, `total.label` = product name,
   `total.amount` = display amount).
3. `session.onvalidatemerchant` → `paypal.Applepay().validateMerchant({ validationUrl })`
   → `session.completeMerchantValidation(merchantSession)`.
4. `session.onpaymentauthorized`:
   - Create the order **server-side** via the existing `createPaypalOrder` callable
     (forwarding `priceId`, `userId`, `discountCode`, `paypalEnv`) → `orderId`.
   - `paypal.Applepay().confirmOrder({ orderId, token: event.payment.token,
     billingContact, shippingContact })`.
   - `session.completePayment(SUCCESS)`.
   - `opts.onProcessing()` then capture **server-side** via the existing
     `capturePaypalOrder` callable → returns `transactionId` → `opts.onApproved(transactionId)`.
5. Errors → `session.completePayment(FAILURE)` + `opts.onError(e)`; the finalize overlay
   is dropped by `ProviderCheckout` (existing behavior).

### 3.3 Domain registration (FR-11 / NFR-5)
- Move the obtained file to
  `app/public/.well-known/apple-developer-merchantid-domain-association` (no extension).
- Verify `https://shrey.fit/.well-known/apple-developer-merchantid-domain-association`
  returns **200** with the exact bytes. Next.js serves `public/` at the site root; the
  `.well-known` path should pass through, but **verify** App Hosting / `next.config.ts`
  doesn't rewrite/strip it (add a header/rewrite only if a check fails).
- Register `shrey.fit` as an Apple Pay web domain in the PayPal dashboard (Payment
  Methods → Apple Pay → Register Domain).

---

## 4. Google Pay flow (FR-4, FR-6, FR-12)

Implemented inside `renderCheckout`, one-time branch only.

### 4.1 Eligibility gate
1. Ensure `pay.js` is loaded (§2.2).
2. `const config = await paypal.Googlepay().config()` → gives
   `allowedPaymentMethods`, `merchantInfo`, `apiVersion`, etc.
3. `const paymentsClient = new google.payments.api.PaymentsClient({ environment })` where
   `environment` = `'TEST'` (sandbox) / `'PRODUCTION'` (live), keyed off `PAYPAL_ENV`.
4. `const { result } = await paymentsClient.isReadyToPay(isReadyToPayRequest)` → if not
   ready, skip (non-fatal).

### 4.2 Render + confirm
1. Render the Google Pay button (`paymentsClient.createButton({ onClick })`) into an
   **isolated child DOM node** in the "More ways to pay" section.
2. On click → build `PaymentDataRequest` from `config` (with `transactionInfo`:
   `totalPrice` = display amount, `currencyCode:'USD'`, `countryCode:'US'`).
3. `const paymentData = await paymentsClient.loadPaymentData(request)`.
4. Create the order **server-side** via `createPaypalOrder` (same args as Apple Pay) →
   `orderId`.
5. `const { status } = await paypal.Googlepay().confirmOrder({ orderId,
   paymentMethodData: paymentData.paymentMethodData })`.
6. On `APPROVED` → `opts.onProcessing()` → `capturePaypalOrder` (server) →
   `opts.onApproved(transactionId)`. Errors → `opts.onError(e)`.

### 4.3 Enablement (FR-12)
- Confirm Google Pay is enabled for the merchant in the PayPal dashboard.
- Obtain **Google production approval** (business name/domain review) before enabling in
  `PRODUCTION`. In `TEST` no approval is needed for sandbox verification.

---

## 5. Rendering integration & placement (FR-5)

Reuse the existing `renderSection` mechanics in `renderCheckout`:
- The wallets join the **"More ways to pay"** section alongside Venmo. Because Apple/
  Google Pay are not `FUNDING.*` sources, they can't be passed as `renderSection` items
  directly; instead, after the Venmo `renderSection` call, **append wallet mounts into
  the same section box** when eligible (or render a dedicated wallet sub-block using the
  same box styling if the Venmo box didn't render).
- Each wallet button mounts into its **own isolated child node** (React never
  reconciles it — the iframe-isolation pattern already used for buttons/card fields).
- **Cleanup:** push each wallet's teardown (button removal / session cleanup) into the
  existing `closers[]` array so the returned cleanup closure tears down wallets +
  Venmo + card + PayPal together (extends current behavior).
- **One-time gate:** the entire wallet block is inside `if (!isSubscription) { … }` so
  it never renders for subscriptions (FR-7).

---

## 6. Neutral capability + logos (FR-13, FR-14)

### 6.1 Capability flag
`app/src/lib/payments/types.ts` — add to `ProviderCapabilities`:
```
/**
 * Provider exposes extra device/OS wallet buttons (Apple Pay / Google Pay) for
 * ONE-TIME checkout, rendered internally by the adapter (eligibility-gated). The app
 * may use this for neutral copy only; it must NOT branch on a specific wallet name.
 * PayPal ✅ (one-time). Stripe ❌.
 */
wallets?: boolean;
```
- PayPal adapter (`providers/paypal.ts`) `capabilities`: add `wallets: true`.
- Stripe adapter (`providers/stripe.ts`) `capabilities`: add `wallets: false`.

### 6.2 Logos
`app/src/components/payments/PaymentMethodLogos.tsx` already renders Apple Pay + Google
Pay marks (currently commented as "display-only … deferred to cutover"). Update the
comment to reflect they are now **functional for one-time checkout** (no code/branching
change required in pages). No method-specific branching is added to any page.

---

## 7. Files touched (anticipated)

- `app/src/lib/payments/providers/paypal.ts`
  - `loadPayPal`: add `applepay,googlepay` to `components` (§2.1).
  - Google `pay.js` loader (memoized) (§2.2).
  - `renderCheckout` one-time branch: Apple Pay flow (§3.2), Google Pay flow (§4.2),
    placement + cleanup (§5); wallet block gated to `!isSubscription`.
  - `capabilities`: add `wallets: true`.
- `app/src/lib/payments/types.ts` — `ProviderCapabilities.wallets?: boolean` (§6.1).
- `app/src/lib/payments/providers/stripe.ts` — `wallets: false` (parity).
- `app/src/components/payments/PaymentMethodLogos.tsx` — comment/behavior update (§6.2).
- `app/public/.well-known/apple-developer-merchantid-domain-association` — NEW static
  asset (§3.3).
- `app/next.config.ts` — only if a `.well-known` serving check fails (add header/rewrite).
- (No server changes expected — `createPaypalOrder` + `capturePaypalOrder` callables and
  the `PAYMENT.CAPTURE.COMPLETED` webhook are reused as-is. If `confirmOrder` needs a
  server confirm step for a given wallet, add a thin callable mirroring the existing
  pattern — confirm during implementation.)

---

## 8. Risks & mitigations

- **Second SDK load breaks buttons.** Mitigation: add wallet components to the **single**
  PayPal load (§2.1); Google `pay.js` is a separate, allowed script (NFR-3).
- **Apple Pay not testable in sandbox.** Mitigation: verify Apple Pay on **live** with
  the registered domain (coordinate with live-readiness); gate behind eligibility so
  non-Apple contexts are unaffected. Google Pay is verifiable in `TEST`.
- **`.well-known` stripped by framework/App Hosting routing.** Mitigation: place under
  `public/`, verify the served URL returns 200 + exact content **before** registering
  with PayPal; add a rewrite/header only if the check fails.
- **Wallet returns a card, not a distinct wallet name.** Mitigation: accept the
  documented `derivePaymentMethod` fallback (card brand+last4 / "PayPal") — FR-10.
- **Discounted amount must apply to wallets.** Mitigation: wallets use the same
  server-side `createPaypalOrder` (with `discountCode`), so the discount applies
  automatically (FR-9/G4).
- **Confirm-order signature drift vs current PayPal SDK.** Mitigation: verify
  `Applepay().confirmOrder` / `Googlepay().confirmOrder` argument shapes against current
  docs during implementation; keep the server create/capture unchanged.

---

## 9. Phasing

- **9.1 Google Pay (sandbox-verifiable first).** SDK components + `pay.js` loader +
  Google Pay flow; verify in `TEST`/Chrome. Lower risk, no domain file.
- **9.2 Apple Pay.** Domain file + registration + `Applepay()` flow; verify on a real
  Apple device against the live domain.
- **9.3 Neutral capability + logos.** `wallets` flag + logo comment; neutral-interface
  audit.

(Google Pay first because it's fully sandbox-testable; Apple Pay needs live-domain
verification.)

---

## 10. Testing environments (IMPORTANT — the two wallets differ)

The two wallets have very different testability. Neither uses PayPal's "fake card
number" sandbox form; each has its own wallet-provider test path.

### 10.1 Google Pay — ✅ fully testable in SANDBOX (no real charge, on a dev machine)
Google Pay has a first-class **TEST environment**. Initialize the Google Pay client with
`environment: 'TEST'` (we key this off `PAYPAL_ENV=sandbox` → `'TEST'`, `production` →
`'PRODUCTION'`). In `TEST`:
- Google returns **non-chargeable test payment credentials** (a dummy token), so **no
  real money moves**. You do NOT need a special merchant approval to test.
- Works on the **dev machine in a normal Chrome browser** signed into a regular Google
  account. Google presents test/dummy cards in the sheet; nothing is charged.
- PayPal's **sandbox** `Googlepay().confirmOrder` accepts the test token, and
  `capturePaypalOrder` captures against your **PayPal sandbox** (fake money).
- **Net:** the entire flow — button → Google Pay sheet → `confirmOrder` →
  `capturePaypalOrder` → `PAYMENT.CAPTURE.COMPLETED` webhook fulfillment — is verifiable
  with zero real charges. This is why Google Pay is built + verified **first**.
- **⚠️ `localhost` is NOT an accepted origin.** PayPal's Google Pay config call
  (`GetGooglePayConfig`) only returns CORS headers for a SECURE context served from a
  **real, resolvable domain**. It rejects `http://localhost` **and** `https://localhost`
  (verified 2026-07-04: preflight blocked, `googlepay_config_error`). So HTTPS alone is
  not enough — you must serve from a real domain:
  - **Tunnel:** `cloudflared tunnel --url http://localhost:3000` (quick tunnel, no
    account) or `ngrok http 3000`; open the `*.trycloudflare.com` / `*.ngrok-free.app`
    URL — NOT localhost.
  - **Or a deployed preview** (Firebase App Hosting preview / `staging.shrey.fit`).
  - The adapter's `renderGooglePay` **guards on this**: it skips Google Pay (with a
    quiet `console.info`, non-fatal) when the origin is `localhost` or non-HTTPS, so a
    normal `npm run dev` on localhost doesn't throw the CORS error into the Next overlay.
  - A `dev:https` script (`next dev --experimental-https`) exists, but note HTTPS
    localhost is STILL rejected by PayPal — use a tunnel/preview for Google Pay.
- No `.well-known` file and no domain-association step (that's Apple Pay only).


### 10.2 Apple Pay — ⚠️ NOT testable on localhost / Windows / Chrome
Apple Pay on the web has hard platform requirements — there is **no** fake-card
simulator in a desktop Chrome/Windows environment:
- Requires a **real Apple device** (Safari on iOS/iPadOS, or macOS Safari with Touch ID),
  **HTTPS**, and a **registered + verified domain** (the
  `.well-known/apple-developer-merchantid-domain-association` file returning 200, with
  the domain registered in PayPal). `localhost` does **not** satisfy this.
- Apple **does** offer a sandbox: create a **Sandbox Tester Apple ID** (App Store
  Connect) and add **Apple's official sandbox test cards** to the Wallet on a real
  device signed into that sandbox Apple ID — then no real money moves.

Two viable ways to verify Apple Pay without charging real customers:
1. **Apple Sandbox Tester + PayPal sandbox** on a **staging HTTPS domain** that serves
   the `.well-known` file and is registered in PayPal → Apple sandbox test card, no real
   charge; or
2. **$1 live smoke test** on `shrey.fit` (reuse the `SMOKETEST` $1-floor discount from
   live-readiness) on a real Apple device, then refund.

Either way, **T3 (`.well-known` file + domain registration) must be done first** — Apple
Pay cannot even render until the domain is verified.

### 10.3 Test matrix
- **Google Pay (sandbox / Chrome):** button renders when `isReadyToPay`; one-time
  purchase (session + 4-pack) fulfills via `capturePaypalOrder` + webhook; non-eligible
  context omits it; a **discounted** one-time charges the discounted amount; `mode ===
  'subscription'` shows **no** Google Pay button.
- **Apple Pay (Apple device + registered domain):** button renders on Safari/iOS;
  one-time purchase fulfills via existing paths; `.well-known` URL returns 200;
  non-Apple context omits it. (Verify via Apple sandbox tester on staging HTTPS, or a $1
  live smoke test.)
- **Regression:** Card / PayPal / Pay Later / Venmo + ACDC + subscription flows
  unchanged; neutral-interface audit finds no `applepay`/`googlepay` outside the adapter
  + `PaymentMethodLogos`.


