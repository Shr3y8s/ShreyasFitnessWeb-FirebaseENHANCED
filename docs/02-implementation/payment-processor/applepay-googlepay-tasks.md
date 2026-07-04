# Apple Pay & Google Pay (one-time, via PayPal) — Tasks

> **Status:** Draft → ready for review
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-04
> **Requirements:** `applepay-googlepay-requirements.md`
> **Design:** `applepay-googlepay-design.md`
> **Decision basis:** `applepay-googlepay-decision.md`

---

## How to use

One feature, three sub-phases. **Google Pay first** (fully sandbox-verifiable), then
**Apple Pay** (needs live-domain verification), then the neutral capability + logos +
acceptance. Every task obeys the neutral-interface rule (no wallet name in
app/pages/components — only the adapter + `PaymentMethodLogos`). Scope is **one-time
only**; wallet buttons must NOT render in `mode === 'subscription'`.

## Testing environments (see design §10 for detail)

- **Google Pay = SANDBOX-testable, no real charge.** Google Pay client
  `environment: 'TEST'` (from `PAYPAL_ENV=sandbox`) returns non-chargeable test
  credentials; PayPal **sandbox** captures fake money. Verifiable **end-to-end on the
  dev machine in Chrome** (normal Google account; nothing charged). No `.well-known`
  file needed.
- **Apple Pay = NOT testable on localhost / Windows / Chrome.** Needs a **real Apple
  device** (Safari/iOS/macOS) + **HTTPS** + a **registered, verified domain** (the
  `.well-known` file returning 200, registered in PayPal). Verify via **(a)** an Apple
  **Sandbox Tester** Apple ID + Apple sandbox test cards on a **staging HTTPS domain**,
  or **(b)** a **$1 live smoke test** on `shrey.fit` (reuse `SMOKETEST`) then refund.
  T3 (domain registration) must be done before Apple Pay can render.


---

# T1 — SDK components (single load)  [FR-1, FR-2, NFR-3]

- [x] **T1.1** In `app/src/lib/payments/providers/paypal.ts` `loadPayPal(...)`, add
      `applepay,googlepay` to the single `loadScript` `components` string
      (`'buttons,card-fields,applepay,googlepay'`); keep `enableFunding: 'venmo'`. Do
      NOT add a second PayPal `loadScript`. ✅ done
- [x] **T1.2** Add a memoized Google `pay.js` loader inside the adapter (inject
      `https://pay.google.com/gp/p/js/pay.js` once), invoked lazily only on the Google
      Pay path so non-eligible/subscription contexts never fetch it. ✅ done
      (`loadGooglePayScript`)
- [ ] **T1.3** Confirm exact PayPal component names + `Applepay()/Googlepay()` APIs
      against current PayPal docs; verify `buttons,card-fields` + Venmo still load from
      the one call (no regression to existing buttons). (typecheck passes; verify in
      sandbox runtime)


---

# T2 — Google Pay flow (sandbox first)  [FR-4, FR-6, FR-7, FR-8, FR-9, FR-12]

- [ ] **T2.1** Confirm the merchant is enabled for Google Pay in the PayPal dashboard
      (sandbox).
- [ ] **T2.2** In `renderCheckout` (one-time branch only, `!isSubscription`), implement
      the Google Pay flow: `Googlepay().config()` → `PaymentsClient({ environment })`
      (`TEST`/`PRODUCTION` from `PAYPAL_ENV`) → `isReadyToPay` gate (skip if not ready).
- [ ] **T2.3** Render the Google Pay button into an isolated child DOM node in the "More
      ways to pay" section; on click build the `PaymentDataRequest`, `loadPaymentData`,
      `createPaypalOrder` (server, forwarding `discountCode`), `Googlepay().confirmOrder`,
      then `capturePaypalOrder` (server) → `onProcessing`/`onApproved(transactionId)`.
- [ ] **T2.4** Push the Google Pay teardown into the existing `closers[]` cleanup array.
- [ ] **T2.5** Verify a Google Pay one-time purchase (session + 4-pack) fulfills via the
      existing `capturePaypalOrder` + `PAYMENT.CAPTURE.COMPLETED` path in an eligible
      Chrome/Android sandbox context.
- [ ] **T2.6** Verify a **discounted** Google Pay one-time charges the server-set
      discounted amount (FR-9).
- [ ] **T2.7** Verify a non-eligible context omits Google Pay without breaking the other
      buttons, and `mode === 'subscription'` shows **no** Google Pay button (FR-6/FR-7).

---

# T3 — Apple Pay domain registration  [FR-11, NFR-5]

> **Sandbox-first:** we register **`sandbox.shrey.fit`** in the PayPal **sandbox**
> dashboard for testing; `shrey.fit` gets registered in the **live** dashboard at launch.
> The `.well-known` file ships from `app/public/` to both.

- [x] **T3.1** `apple-developer-merchantid-domain-association` placed in
      `app/public/.well-known/` (no extension). ✅
- [ ] **T3.2** Verify (runtime, after SSL active)
      `https://sandbox.shrey.fit/.well-known/apple-developer-merchantid-domain-association`
      returns 200 with exact content (check `next.config.ts` / App Hosting doesn't strip
      it; add a rewrite/header only if the check fails). Repeat on `shrey.fit` at launch.
- [x] **T3.3** `sandbox.shrey.fit` registered as an Apple Pay web domain in the PayPal
      **sandbox** dashboard. ✅ (`shrey.fit` in live dashboard deferred to launch.)


---

# T4 — Apple Pay flow  [FR-3, FR-6, FR-7, FR-8, FR-9]

- [x] **T4.1** `renderApplePay` (one-time branch only) implements the eligibility gate
      (`ApplePaySession` + `supportsVersion(4)` + `canMakePayments` + `Applepay().config()`)
      + a localhost/secure-context origin guard; non-fatal skip (returns null → omitted). ✅
- [x] **T4.2** Apple Pay button (`<apple-pay-button>`) rendered into an isolated child
      node in "More ways to pay"; `ApplePaySession` wired with `onvalidatemerchant`
      (`Applepay().validateMerchant` → `completeMerchantValidation`) +
      `onpaymentauthorized` (`createPaypalOrder` → `Applepay().confirmOrder` →
      `completePayment` → `capturePaypalOrder` → `onApproved(transactionId)`); cancel
      non-fatal. ✅
- [x] **T4.3** Apple Pay teardown pushed into the existing `closers[]` array (via the
      `customMount` closer contract). ✅
- [ ] **T4.4** Verify an Apple Pay one-time purchase on a **real Apple device** against
      the registered sandbox domain (`sandbox.shrey.fit`) fulfills via the existing paths.
      (runtime — Apple sandbox tester card, no real charge)

- [ ] **T4.5** Verify a non-Apple context omits Apple Pay (non-fatal) and
      `mode === 'subscription'` shows **no** Apple Pay button (FR-6/FR-7).

---

# T5 — Neutral capability + logos  [FR-13, FR-14, NFR-1]

- [x] **T5.1** `ProviderCapabilities.wallets?: boolean` added to
      `app/src/lib/payments/types.ts`; `wallets: true` in the PayPal adapter,
      `wallets: false` in the Stripe adapter. ✅
- [x] **T5.2** `PaymentMethodLogos.tsx` comment updated: the marks are a display-only
      "accepted here" row; functional wallet buttons are rendered in the adapter
      (eligibility-gated). No method-specific branching in any page. ✅
- [x] **T5.3** Neutral-interface audit clean: `applepay`/`googlepay` appear ONLY in the
      adapter (`paypal.ts`/`stripe.ts`), the neutral `types.ts` capability doc, and
      `PaymentMethodLogos.tsx` — no app page/component references a wallet name (G2). ✅


---

# T6 — Acceptance  (maps to requirements §7)

- [ ] **T6.1 (AC-1)** Google Pay renders + completes a one-time purchase (sandbox);
      fulfills via existing capture + webhook.
- [ ] **T6.2 (AC-2)** Apple Pay renders + completes a one-time purchase on a real Apple
      device (domain registered); fulfills via existing paths.
- [ ] **T6.3 (AC-3)** A discounted one-time wallet purchase charges the server-set
      discounted amount.
- [ ] **T6.4 (AC-4)** Non-eligible contexts and `mode === 'subscription'` omit the
      wallets with no regression to existing buttons/card.
- [ ] **T6.5 (AC-5)** `.well-known` URL returns 200 with correct content; `shrey.fit`
      registered in PayPal.
- [ ] **T6.6 (AC-6)** App remains method-agnostic; `capabilities.wallets` present; logos
      updated; neutral-interface audit clean.

---

## Notes / deferred

- **Wallet-funded recurring (Option B)** is explicitly **out of scope** — see
  `applepay-googlepay-decision.md §4`. Revisit only if one-time wallet adoption is high
  AND the self-serve "Save Payment Methods" (vaulting) toggle is confirmed; it would be
  its own spec (Vault + Orders + scheduled-charge engine, MPAN, dunning,
  cancel-as-stop-scheduling, reconciliation with the Billing-Plans model).
- **Server changes:** none expected — `createPaypalOrder` + `capturePaypalOrder`
  callables and the `PAYMENT.CAPTURE.COMPLETED` webhook are reused. If a wallet's
  `confirmOrder` requires a server-side confirm step, add a thin callable mirroring the
  existing pattern (confirm during T2/T4 implementation).
