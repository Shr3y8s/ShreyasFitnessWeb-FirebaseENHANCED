# PayPal Launch Features — Overview & Staging

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-24
> **Purpose:** Index + execution order for the three PayPal launch features.

---

## The three features (spec-driven)

Each feature has a **requirements → design → tasks** set under
`docs/02-implementation/payment-processor/`:

1. **PayPal Live Readiness** — verify/close prod config gaps + a safe ≈ $1 live
   smoke test.
   - `paypal-live-readiness-requirements.md`
   - `paypal-live-readiness-design.md`
   - `paypal-live-readiness-tasks.md`
2. **Discount Codes** — provider-neutral, admin-managed codes (percentage + fixed),
   one-time + subscription (first-cycle + recurring), $1 floor + free-comp path.
   - `discount-codes-requirements.md`
   - `discount-codes-design.md`
   - `discount-codes-tasks.md`
3. **Additional Payment Methods** — Venmo, then Apple Pay + Google Pay via PayPal.
   - `paypal-payment-methods-requirements.md`
   - `paypal-payment-methods-design.md`
   - `paypal-payment-methods-tasks.md`
   - **Apple Pay + Google Pay (Phase 2) — EXPANDED into a dedicated spec set (2026-07-04):**
     - `applepay-googlepay-decision.md` — ADR: why Billing Plans (not Orders v2 +
       Vault) for subscriptions; the two wallet integration options; chose **Option A**
       (one-time via Orders v2) now, deferred **Option B** (wallet-funded recurring).
     - `applepay-googlepay-requirements.md`
     - `applepay-googlepay-design.md`
     - `applepay-googlepay-tasks.md`

These sit alongside the parent specs (`payment-processor-{requirements,design,tasks}.md`).


## Cross-cutting constraints (apply to all three)

- **Neutral interface only.** No app page/component imports a PayPal SDK or references
  a PayPal/wallet/discount mechanic. All provider specifics live in
  `app/src/lib/payments/providers/paypal.ts` + `firebase/functions/payments/*`.
- **Server is the source of truth for money.** Discount validation/application and
  order/subscription amounts are computed server-side; the client cannot set them.
- **Sandbox-first.** Discounts and Venmo are fully built + verified in PayPal sandbox.
  Only the live smoke test (and Apple Pay device verification) require live.
- **Idempotent fulfillment unchanged.** All methods reuse the existing capture/
  activation + idempotent webhook paths.

## Execution order (agreed staging)

1. **Venmo** (payment-methods phase 1) — small, low-risk, sandbox-verified.
2. **Discount codes phase 1** (one-time + `SMOKETEST` $1 floor) — sandbox-verified.
3. **Live PayPal readiness** (config audit + webhook registration).
4. **Live ≈ $1 smoke test** (live-readiness T4, using the `SMOKETEST` code).
5. **Discount codes phase 2** (subscriptions first-cycle + recurring/discounted-plan,
   free-comp, limits/expiry, full admin UI, GA4).
6. **Apple Pay + Google Pay** (payment-methods phase 2, incl. Apple Pay domain
   registration; Apple Pay verified on live).

> Rationale: the live smoke test must run against live to be meaningful, so live
> readiness precedes it; discounts are decoupled from live (built in sandbox) so phase
> 1 can proceed in parallel and then enable the $1 test.

## Key constraints to remember

- **PayPal rejects $0 transactions.** A true 100%-off cannot go through PayPal — use
  the **$1 floor** for the paid smoke test, and the **free-comp bypass** (server-side
  fulfillment, no processor charge) for genuine comps.
- **Single SDK load.** Never add a second `loadScript`; add funding/components to the
  one existing load.
- **Discounted amount applies to every funding source** (card/PayPal/Venmo/wallets),
  because the discount is set server-side on the order/subscription.
