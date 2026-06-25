# Discount Codes — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Feature:** 2 of 3 (discount codes)
> **Requirements:** `discount-codes-requirements.md`

---

## 1. Overview & principles

A provider-neutral discount system. The **single load-bearing rule** (req G1/NFR-4):

> The app layer (pages, components) only knows the **neutral** concept of "a code
> applied to a checkout" and a **neutral preview** of the resulting amount. All
> translation into PayPal mechanics (order amount, subscription pricing override,
> discounted plan, free-comp bypass) lives **only** inside
> `app/src/lib/payments/providers/paypal.ts` and
> `firebase/functions/payments/providers/paypal.js`.

The **server is the sole authority** on the charged amount (G2/NFR-1). The client's
displayed total is a preview computed by a callable; the actual order/subscription is
created server-side from the code + item, so a tampered client can never change what
is charged.

## 2. Data model (Firestore)

### 2.1 `discount_codes/{codeIdUpper}`
Document id = the code, uppercased (case-insensitive uniqueness). Fields:
```
code:            string   // canonical display form (e.g. "FRIENDS25")
type:            "percentage" | "fixed"
value:           number   // percentage: 0–100; fixed: minor units (cents) off
active:          boolean
expiresAt:       Timestamp | null
maxRedemptions:  number | null     // global cap; null = unlimited
redemptionCount: number            // incremented atomically
perUserLimit:    number | null     // optional; null = no per-user cap
appliesTo:       {                  // null/absent = applies to all items
                   items?: CheckoutItemKey[]      // e.g. ["IN_PERSON"]
                   productIds?: AppProductId[]     // e.g. ["online_coaching"]
                   modes?: ("payment"|"subscription")[]
                 } | null
minChargeFloor:  number             // minor units; default 100 ($1.00)
freeComp:        boolean            // true = 100%-off, bypass processor
discountScope:   "first_cycle" | "recurring" | "one_time"  // subscription handling
fallbackPlanIds: {                  // for recurring subscription discounts (FR-9)
                   online_coaching?: string         // discounted P-... plan id
                   complete_transformation?: string
                 } | null
createdAt, updatedAt, createdBy
```

### 2.2 `discount_redemptions/{autoId}`
One per successful redemption (audit + per-user counting):
```
codeId:          string   // uppercased code
userId:          string
mode:            "payment" | "subscription"
productId:       AppProductId
originalAmount:  number   // minor units
discountedAmount:number   // minor units actually charged (or 0 for free-comp)
amountOff:       number   // minor units discounted
transactionId:   string | null   // capture id / subscription id
freeComp:        boolean
createdAt:       Timestamp
```

### 2.3 Security rules
- `discount_codes`: **no client reads/writes.** Created/edited only by admin via a
  callable (admin-auth-gated) or admin SDK; validated/applied only server-side.
- `discount_redemptions`: **no client reads/writes**; server-only. (Admin UI reads
  via a callable, not direct collection reads.)

> Rationale (NFR-1): clients must not enumerate codes or read limits/floors. All
> access is through callables.

## 3. Neutral interface additions (`app/src/lib/payments/types.ts`)

```ts
/** A validated discount preview, provider-neutral. */
export interface DiscountPreview {
  valid: boolean;
  /** Present when invalid: 'not_found' | 'inactive' | 'expired' | 'limit_reached'
   *  | 'not_applicable' | 'error'. */
  reason?: string;
  code?: string;            // canonical code echoed back
  originalAmount: number;   // minor units
  discountedAmount: number; // minor units (post-floor)
  amountOff: number;        // minor units
  /** True when this is a free comp (no processor charge). */
  freeComp?: boolean;
  /** Human label, e.g. "25% off" / "$10.00 off" / "Floored to $1.00". */
  label?: string;
}

// CheckoutOptions gains an optional code (already has metadata):
export interface CheckoutOptions {
  // ...existing...
  discountCode?: string;
}

// PaymentProvider gains:
export interface PaymentProvider {
  // ...existing...
  /** Validate + preview a discount for an item. Server-backed. Optional capability. */
  previewDiscount?(opts: {
    code: string;
    productId: string;     // neutral Product.id
    mode: 'subscription' | 'payment';
    priceId: string;
  }): Promise<DiscountPreview>;
}
```

- `ProviderCapabilities` gains `discounts?: boolean`.
- **Stripe adapter:** `capabilities.discounts = false` and either omits
  `previewDiscount` or returns `{ valid:false, reason:'not_supported', ... }`. Keeps
  the build green; Stripe could implement natively later. (No app behavior depends on
  Stripe here — PayPal is the active provider.)

The app NEVER computes the discount itself — it calls `previewDiscount` for display
and passes `discountCode` into `renderCheckout` / `startCheckout`. The adapter routes
both to server callables.

## 4. Server: validation & application (neutral core + PayPal adapter)

### 4.1 Neutral discount module — `firebase/functions/payments/discounts.js`
Provider-agnostic helpers reused by any provider:
- `getCode(codeUpper)` — read the code doc.
- `validateCode(codeDoc, { productId, mode, priceId, userId })` → `{ valid, reason }`
  (active, expiry, global + per-user limits, applicability via `appliesTo`).
- `computeDiscountedAmount(codeDoc, originalMinor)` → `{ discountedAmount, amountOff,
  floored, freeComp }`, applying percentage/fixed math then clamping to
  `minChargeFloor` (unless `freeComp`, which yields `discountedAmount = 0`).
- `recordRedemption(...)` — transactional: re-check limits, write a
  `discount_redemptions` doc, `FieldValue.increment(redemptionCount)`.

`originalMinor` comes from the **server's** product catalog (constants mirror in the
PayPal adapter / `ONETIME_AMOUNTS` + plan prices), never from the client.

### 4.2 Callables (`firebase/functions/payments/index.js`)
- **`previewDiscount`** (auth-gated): `{ code, productId, mode, priceId }` →
  `DiscountPreview`. Resolves the server-side original amount, validates, computes the
  floored discounted amount. **Read-only** (no redemption recorded, no count change).
- **One-time apply:** extend `createPaypalOrder` to accept `discountCode`. The server
  re-validates, computes the discounted amount, and creates the PayPal order at that
  amount (overriding `ONETIME_AMOUNTS`). The capture path records the redemption on
  successful fulfillment.
  - For **free-comp** one-time: skip PayPal entirely — call `fulfillSessionPackage`
    directly + record a $0 redemption (a new `redeemFreeComp` callable, see §6).
- **Subscription apply (phase 2):** extend the subscription-create callables to accept
  `discountCode`:
  - **first_cycle:** create the subscription with a first-cycle price override (PayPal
    subscription `plan.billing_cycles` override at create, or adjust the setup fee).
  - **recurring:** create the subscription against the code's `fallbackPlanIds[tier]`
    (a pre-created discounted Billing Plan) — the discounted-plan fallback (FR-9).
  - **free-comp:** bypass PayPal; grant the subscription entitlement/activation
    server-side + $0 redemption.

### 4.3 Where amounts are overridden (PayPal adapter, server)
- One-time order creation (`createOrder`) already builds the `purchase_units.amount`
  from `ONETIME_AMOUNTS[priceId]`. Add an optional `discountedAmountMinor` param: when
  present (and validated), use it for `amount.value` and add a `breakdown`/`items`
  note describing the discount for the PayPal record.
- Capture flow (`captureOrder` + `capturePaypalOrder`) is unchanged except it must
  resolve the neutral product identity by the **original** product (passed through
  metadata), not by the discounted amount — because the existing
  `resolveOneTimeByAmount` keys off the amount. **Design change:** pass the
  `productId` explicitly through the order `custom_id`/metadata so fulfillment no
  longer relies on amount→product inference when a discount is applied. (See §7 risk.)

## 5. Client UI

### 5.1 Neutral hook/flow
- `ProviderCheckout` (and `/checkout` page) gain an optional **code field**. On
  "Apply", call `getPaymentProvider({mode}).previewDiscount(...)`; show the discounted
  total + label, or the failure reason. Store the applied `code` and pass it into the
  `renderCheckout` opts (`discountCode`).
- The displayed total updates from the **neutral `DiscountPreview`** only — no PayPal
  detail in the component.
- The checkout summary shows: original (struck-through) + discounted total + code
  chip with a "remove" affordance.

### 5.2 Free-comp UX
- When `previewDiscount` returns `freeComp: true`, the wallet/card buttons are
  replaced by a single neutral **"Redeem (Free)"** button that calls the adapter's
  free-comp path (which calls `redeemFreeComp`) and navigates to success.

## 6. Free-comp path (FR-10)

A 100%-off / `freeComp` code must NOT touch PayPal ($0 is rejected). Flow:
1. `previewDiscount` flags `freeComp`.
2. Client calls adapter free-comp method → callable **`redeemFreeComp`**
   `{ code, productId, mode, priceId }` (auth-gated).
3. Server re-validates (incl. limits), then:
   - one-time → `fulfillSessionPackage(...)` with `amount: 0`,
   - subscription → activate entitlement (`activateSubscription` neutral fulfillment
     with a `freeComp`/`compToken` marker; no PayPal subscription id), and
   - records a $0 `discount_redemptions` doc.
4. Returns success; the success page treats it like any fulfillment.

> Subscription free-comp has no PayPal subscription, so cancellation/renewal don't
> apply — it's a manual comp. The design records it distinctly (`freeComp: true`,
> no `subscriptionId`) so billing surfaces show "Complimentary" rather than a broken
> subscription. (Phase 2.)

## 7. Risks & mitigations

- **Risk: amount→product inference breaks with discounts.** `resolveOneTimeByAmount`
  identifies the product by the captured amount; a discounted capture won't match.
  **Mitigation:** thread the original `productId` through the order `custom_id`/metadata
  and prefer it in fulfillment; keep amount inference only as a no-discount fallback.
- **Risk: over-redemption under concurrency.** **Mitigation:** transactional
  `recordRedemption` re-checks limits inside the transaction (NFR-2).
- **Risk: client replays a stale preview.** **Mitigation:** server re-validates +
  recomputes on apply/capture; preview is advisory only.
- **Risk: PayPal USD minimum > $1.** **Mitigation:** make `minChargeFloor`
  configurable per code; verify the real minimum during phase 1 and set the default
  accordingly.
- **Risk: recurring discount not natively expressible.** **Mitigation:** discounted
  plan fallback (`fallbackPlanIds`), pre-created via the catalog script; documented.

## 8. Phasing

- **Phase 1 (smoke-test capable):** model + rules, neutral types + `previewDiscount`,
  `discounts.js` core, `previewDiscount` callable, one-time apply in `createPaypalOrder`
  + capture redemption recording, floor enforcement, checkout code field, basic admin
  create/list/deactivate. **Sandbox-verified.** Enables Feature 1's $1 smoke test.
- **Phase 2 (full):** subscription first-cycle + recurring (discounted-plan fallback),
  free-comp path + UX, per-user limits, full admin UI (edit/scope/history), GA4 events.

## 9. Testing (sandbox)

- Unit: `computeDiscountedAmount` (percentage, fixed, floor clamp, freeComp),
  `validateCode` (expiry, limits, applicability).
- Integration (sandbox): percentage + fixed one-time → captured amount equals server
  computation; redemption recorded; floor clamps a 100%-off paid code to $1.00.
- `SMOKETEST` floors $75 → $1.00 end-to-end (handoff to Feature 1).
- Phase 2: first-cycle + recurring subscription discount activations; free-comp
  activation with $0 redemption; limit/expiry rejections.

## 10. Files touched (anticipated)

- `app/src/lib/payments/types.ts` — `DiscountPreview`, `CheckoutOptions.discountCode`,
  `capabilities.discounts`, `previewDiscount`.
- `app/src/lib/payments/providers/paypal.ts` — `previewDiscount`, pass `discountCode`
  into order/subscription create; free-comp method.
- `app/src/lib/payments/providers/stripe.ts` — `discounts:false` + no-op preview.
- `app/src/components/payments/ProviderCheckout.tsx` + `app/src/app/checkout/page.tsx`
  — code field + neutral preview display + free-comp button.
- `firebase/functions/payments/discounts.js` — NEW neutral core.
- `firebase/functions/payments/index.js` — `previewDiscount`, `redeemFreeComp`,
  `discountCode` params on order/subscription callables, redemption recording.
- `firebase/functions/payments/providers/paypal.js` — discounted order amount,
  productId via custom_id, discounted-plan subscription create.
- `firestore.rules` — lock `discount_codes` + `discount_redemptions` to server-only.
- Admin: a new admin page + callables to manage codes (phase 1 basic, phase 2 full).
- `firebase/scripts/paypal-setup-catalog.js` — extend to create discounted fallback
  plans (phase 2).
