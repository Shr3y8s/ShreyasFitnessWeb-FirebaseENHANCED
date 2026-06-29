/**
 * Generic, provider-NEUTRAL payment webhook + module exports.
 *
 * `paymentWebhook` (HTTP) is the single server entry point for provider events:
 *   verifySignature(req)  →  parseEvent(req)  →  neutral fulfillment
 * The provider-specific parts live in ./providers/<provider>.js; the business
 * logic lives in ./fulfillment.js and is reused across providers.
 *
 * STATUS: scaffolding for Phase 2. The Stripe live path is still the invertase
 * extension + existing triggers in ../index.js — this generic webhook is NOT yet
 * registered as a live endpoint and is wired live per-provider at cutover
 * (PayPal in Phase 3/5). The PayPal provider adapter is added in Phase 3.
 *
 * See docs/02-implementation/payment-processor/payment-processor-design.md (§3)
 */

const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const fulfillment = require("./fulfillment");
const discounts = require("./discounts");

// Server-side one-time prices (minor units) — mirror the adapter's ONETIME_AMOUNTS.
// Used to resolve the ORIGINAL amount for discount preview/apply so the client never
// supplies an amount. (Subscriptions are Phase 2 — preview returns not_applicable.)
const ONETIME_PRICE_MINOR = { IN_PERSON: 7500, IN_PERSON_4PACK: 24000 };

// Server-side subscription monthly prices (minor units), keyed by neutral app tier
// id (resolvePlanTier(planId).tierId). Used to resolve the ORIGINAL first-cycle
// amount for subscription discount preview/apply so the client never supplies an
// amount. Both tiers bill $250/mo; CT additionally has a $60 setup fee which a
// first-cycle discount does NOT touch (business decision 2026-06-25).
const SUBSCRIPTION_PRICE_MINOR = {
  online_coaching: 20000, // $200/mo
  complete_transformation: 25000, // $250/mo
};




// PayPal secrets (Secret Manager). Declared here so the functions below can read
// them via process.env at runtime. Set with:
//   firebase functions:secrets:set PAYPAL_CLIENT_ID
//   firebase functions:secrets:set PAYPAL_CLIENT_SECRET
//   firebase functions:secrets:set PAYPAL_WEBHOOK_ID
// (PAYPAL_ENV is a plain env var; the adapter defaults to "sandbox" when unset.)
// DUAL ENV (design §7.1): one deployed backend serves BOTH PayPal sandbox (used by
// `npm run dev`) and live (prod build). Two credential SETS, selected per request:
//   - Callables: client passes `paypalEnv` (from NEXT_PUBLIC_PAYPAL_ENV) → cfg.
//   - Webhooks: two functions (paypalWebhookSandbox/Live), each binds only its set.
// Set each with `firebase functions:secrets:set <NAME>`.
const PAYPAL_CLIENT_ID_SANDBOX = defineSecret("PAYPAL_CLIENT_ID_SANDBOX");
const PAYPAL_CLIENT_SECRET_SANDBOX = defineSecret("PAYPAL_CLIENT_SECRET_SANDBOX");
const PAYPAL_WEBHOOK_ID_SANDBOX = defineSecret("PAYPAL_WEBHOOK_ID_SANDBOX");
const PAYPAL_CLIENT_ID_LIVE = defineSecret("PAYPAL_CLIENT_ID_LIVE");
const PAYPAL_CLIENT_SECRET_LIVE = defineSecret("PAYPAL_CLIENT_SECRET_LIVE");
const PAYPAL_WEBHOOK_ID_LIVE = defineSecret("PAYPAL_WEBHOOK_ID_LIVE");

// RESEND_API_KEY backs the welcome email sent on first activation (via the
// onFirstActivation hook). Functions that FULFILL (the webhooks + the synchronous
// callables below) must bind it or the welcome email fails with "Missing API key".
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const PAYPAL_SANDBOX_SECRETS = [PAYPAL_CLIENT_ID_SANDBOX, PAYPAL_CLIENT_SECRET_SANDBOX, PAYPAL_WEBHOOK_ID_SANDBOX];
const PAYPAL_LIVE_SECRETS = [PAYPAL_CLIENT_ID_LIVE, PAYPAL_CLIENT_SECRET_LIVE, PAYPAL_WEBHOOK_ID_LIVE];
// Callables can be invoked for EITHER env, so they bind BOTH sets and pick per call.
// RESEND_API_KEY is included so any fulfilling path can send the welcome email.
const PAYPAL_SECRETS = [...PAYPAL_SANDBOX_SECRETS, ...PAYPAL_LIVE_SECRETS, RESEND_API_KEY];


/**
 * Resolve the PayPal config (API base + credentials + webhook id) for an env.
 * `env` is 'production' | 'sandbox' (anything else → sandbox). Returns the `cfg`
 * shape the paypal.js adapter helpers expect: { base, clientId, clientSecret,
 * paypalWebhookId }.
 */
function paypalEnvConfig(env) {
  const live = env === "production";
  return {
    base: live ? "api-m.paypal.com" : "api-m.sandbox.paypal.com",
    clientId: process.env[live ? "PAYPAL_CLIENT_ID_LIVE" : "PAYPAL_CLIENT_ID_SANDBOX"],
    clientSecret: process.env[live ? "PAYPAL_CLIENT_SECRET_LIVE" : "PAYPAL_CLIENT_SECRET_SANDBOX"],
    paypalWebhookId: process.env[live ? "PAYPAL_WEBHOOK_ID_LIVE" : "PAYPAL_WEBHOOK_ID_SANDBOX"],
  };
}

/** Normalize a client-supplied paypalEnv to 'production' | 'sandbox'. */
function normalizePaypalEnv(v) {
  return String(v || "").toLowerCase() === "production" ? "production" : "sandbox";
}

/**
 * Persist the per-subscriber discount/intro DISPLAY state on the user doc so the
 * Billing/Membership pages can render "intro $X for N months, then $base/mo" without a
 * live PayPal read (subscription-discounts T10.8.1 / FR-16). Best-effort; never throws.
 * `override` is the create-time price override from resolveSubscriptionPlan:
 *   { scope:'intro'|'recurring', discountedMinor, regularMinor, trialCycles }.
 * A falsy/empty override CLEARS any stale promo state (no-code subscription / re-subscribe).
 */
async function persistSubscriptionDiscountState(uid, override) {
  if (!uid) return;
  const admin = require("firebase-admin");
  const ref = admin.firestore().collection("users").doc(uid);
  try {
    if (override && override.scope) {
      await ref.set(
        {
          subscriptionDiscount: {
            scope: override.scope, // 'intro' | 'recurring'
            introCycles:
              override.scope === "intro"
                ? Math.max(1, Math.round(Number(override.trialCycles) || 1))
                : null,
            basePriceMinor: override.regularMinor ?? null,
            discountedMinor: override.discountedMinor ?? null,
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await ref.set(
        {
          subscriptionDiscount: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (e) {
    logger.warn("persistSubscriptionDiscountState failed (non-fatal)", { uid, error: e.message });
  }
}


/**
 * Subscription-discounts plan resolver (subscription-discounts-2cycle-handoff.md).
 * Given the BASE plan id + (optional) discount code, returns:
 *   { planToUse, customId, override? }
 *     - planToUse  — ALWAYS the base plan id (the 2-plan model keeps a single base
 *                    plan per tier; discounts are applied via a per-subscriber
 *                    billing_cycles override, NOT a separate discounted plan).
 *     - customId   — bare uid, or a JSON token carrying uid + code when discounted.
 *     - override   — { scope, discountedMinor, regularMinor, trialCycles } passed to
 *                    the adapter's buildPriceOverride (omitted when no code).
 *   { error: HttpsError } — when a supplied code is invalid; the caller throws it.
 *
 * No code → { planToUse: basePlanId, customId: uid }.
 * With code → validate it (scope subscription, level allowed, limits) → resolve the
 * tier from the base plan → compute the discounted price server-side → return the
 * base plan id + the override spec. The base plan is minted as 2-cycle (TRIAL seq 1
 * + REGULAR seq 2), so the override can reprice the existing cycles (intro = seq 1
 * only; recurring = both) without ADDing a cycle (the PayPal constraint).
 */
async function resolveSubscriptionPlan(basePlanId, uid, rawCode) {
  if (!rawCode) {
    return { planToUse: basePlanId, customId: uid };
  }
  const tier = PROVIDERS.paypal.resolvePlanTier
    ? PROVIDERS.paypal.resolvePlanTier(basePlanId)
    : {};
  const tierId = tier.tierId;
  const regularMinor = tierId ? SUBSCRIPTION_PRICE_MINOR[tierId] : undefined;
  if (!tierId || regularMinor == null) {
    return { error: new HttpsError("invalid-argument", "Unknown subscription plan for discount.") };
  }
  try {
    const codeDoc = await discounts.getCode(rawCode);
    const perUser = codeDoc ? await discounts.countUserRedemptions(codeDoc.id, uid) : 0;
    const v = discounts.validateCode(
      codeDoc,
      { productId: tierId, mode: "subscription", priceId: basePlanId, userId: uid },
      perUser
    );
    if (!v.valid) {
      return { error: new HttpsError("failed-precondition", `Discount code ${v.reason}.`) };
    }
    if (codeDoc.freeComp) {
      return { error: new HttpsError("failed-precondition", "This code is a free comp, not a paid subscription discount.") };
    }
    // Subscription codes need a subscription scope and a valid discount value. BOTH
    // percentage and fixed ($ off) are supported — the discounted price is computed
    // server-side below (with the code's minimum-charge floor) and rejected if it
    // doesn't actually reduce the price. A 100%-off percentage is allowed because the
    // floor clamps it to a real (>$0) charge; a TRUE $0 (freeComp) is the parked
    // comp path and is rejected above.
    //   percentage → 0 < value <= 100 (floored to the min charge if it would hit $0)
    //   fixed      → value > 0 (cents off; floored likewise)
    // discountScope "first_cycle" → intro (discount the first N cycles, then revert);
    // "recurring" → permanent discount on every cycle.
    const scope = codeDoc.discountScope === "first_cycle" ? "intro"
      : codeDoc.discountScope === "recurring" ? "recurring" : null;
    if (!scope) {
      return { error: new HttpsError("failed-precondition", "This code isn't configured for subscriptions.") };
    }
    const level = Number(codeDoc.value);
    const validValue =
      codeDoc.type === "percentage" ? level > 0 && level <= 100
      : codeDoc.type === "fixed" ? level > 0
      : false;
    if (!validValue) {
      return { error: new HttpsError("failed-precondition", "This discount code has an invalid value for a subscription.") };
    }

    // Compute the discounted price SERVER-SIDE from the code (never client-set). This
    // applies the code's minimum-charge floor (default $1.00), so a 100%-off or a
    // large fixed discount lands at the floor rather than $0 (PayPal rejects $0).
    const computed = discounts.computeDiscountedAmount(codeDoc, regularMinor);
    const discountedMinor = computed.discountedAmount;
    if (discountedMinor == null || !(discountedMinor < regularMinor)) {
      return { error: new HttpsError("failed-precondition", "Discount did not reduce the price.") };
    }
    // A genuine $0 (free comp) can't be billed as a subscription cycle — that's the
    // parked comp path. The floor normally prevents this; guard anyway.
    if (discountedMinor <= 0) {
      return { error: new HttpsError("failed-precondition", "Free subscriptions aren't supported yet. Set a minimum charge floor (e.g. $1).") };
    }
    // Thread uid + code through custom_id (JSON token) so the ACTIVATED webhook
    // records the redemption. Bounded to PayPal's 127-char custom_id limit.
    const customId = JSON.stringify({
      u: uid,
      c: codeDoc.id,
      p: tierId,
      o: regularMinor,
    }).slice(0, 127);
    // Intro length: how many cycles the discounted TRIAL price applies before PayPal
    // auto-reverts to full. Admin-configurable per code (default 1). Only meaningful
    // for the "intro" scope; recurring ignores it.
    const introCycles = codeDoc.introCycles != null
      ? Math.max(1, Math.round(Number(codeDoc.introCycles)))
      : 1;
    return {
      planToUse: basePlanId,
      customId,
      override: {
        scope, // "intro" | "recurring"
        discountedMinor,
        regularMinor,
        trialCycles: introCycles,
      },
    };
  } catch (e) {
    if (e instanceof HttpsError) return { error: e };
    logger.error("resolveSubscriptionPlan failed", { uid, basePlanId, error: e.message });
    return { error: new HttpsError("internal", "Failed to validate discount.") };
  }
}





// Provider registry. Paddle adapter is added in its phase.
const PROVIDERS = {
  stripe: require("./providers/stripe"),
  paypal: require("./providers/paypal"), // Phase 3
  // paddle: require("./providers/paddle"),  // Phase 4
};

/**
 * Injectable fulfillment hooks (parity side effects: welcome email / onboarding
 * goal / activity-feed). The main functions entrypoint (../index.js) calls
 * `setFulfillmentHooks({ onFirstActivation })` so this neutral module stays free
 * of those dependencies (avoids a circular require). See fulfillment.js header.
 */
let fulfillmentHooks = {};
function setFulfillmentHooks(hooks) {
  fulfillmentHooks = hooks || {};
}


/**
 * Dispatch a single neutral PaymentEvent to fulfillment.
 */
async function handleEvent(providerName, e) {
  switch (e.type) {
    case "subscription.activated":
    case "subscription.updated":
      await fulfillment.activateSubscription(
        {
          userId: e.userId,
          subscriptionId: e.subscriptionId,
          provider: providerName,
          status: e.subscription?.status || "active",
          priceId: e.subscription?.priceId,
          productId: e.subscription?.productId,
          tierId: e.subscription?.tierId,
          tierName: e.subscription?.tierName,
          currentPeriodEnd: e.subscription?.currentPeriodEnd,
          amount: e.subscription?.amount,
          interval: e.subscription?.interval,
          // Funding instrument (card brand+last4 / PayPal / Venmo) for the
          // "Current Payment Method" card. Null when PayPal didn't expose it.
          paymentMethod: e.subscription?.paymentMethod || e.paymentMethod,
        },
        fulfillmentHooks
      );
      // Discount redemption (Feature 2 / T9): when the Smart Button subscription
      // carried a code (threaded in custom_id), record it on activation. Idempotent
      // on the subscription id — the card path's synchronous record dedupes against
      // this same id, so only one redemption is ever written.
      if (e.discountRedemption?.code) {
        try {
          const dr = e.discountRedemption;
          await discounts.recordRedemption({
            codeId: dr.code,
            userId: dr.userId,
            mode: dr.mode || "subscription",
            productId: dr.productId,
            originalAmount: dr.originalAmount,
            discountedAmount: dr.discountedAmount,
            amountOff:
              dr.originalAmount != null && dr.discountedAmount != null
                ? dr.originalAmount - dr.discountedAmount
                : null,
            transactionId: dr.transactionId,
          });
        } catch (err) {
          logger.error("subscription discount redemption recording failed (non-fatal)", { error: err.message });
        }
      }
      break;



    case "subscription.paused":
      // PayPal BILLING.SUBSCRIPTION.SUSPENDED → keep the subscription recoverable.
      // Sync the neutral subscription record + user doc to a `paused` status and set
      // the membership pause flag, but PRESERVE subscriptionId so resume (/activate)
      // still works. (If our own pauseSubscription callable initiated this, these
      // fields are already set; the webhook just keeps PayPal-initiated suspensions
      // — e.g. failed-payment — consistent.)
      try {
        const admin = require("firebase-admin");
        await fulfillment.writeSubscriptionRecord({
          userId: e.userId,
          subscriptionId: e.subscriptionId,
          provider: providerName,
          status: "paused",
        });
        if (e.userId) {
          await admin.firestore().collection("users").doc(e.userId).update({
            subscriptionStatus: "paused",
            subscriptionPaused: true,
            pausedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      } catch (err) {
        logger.error("subscription.paused sync failed", { userId: e.userId, error: err.message });
      }
      break;

    case "subscription.canceled":
      // A status-only cancel still flows through activateSubscription so the
      // user doc + neutral record stay consistent; a hard delete uses deactivate.
      if (e.subscription) {
        await fulfillment.activateSubscription({
          userId: e.userId,
          subscriptionId: e.subscriptionId,
          provider: providerName,
          status: "canceled",
        });
      } else {
        await fulfillment.deactivateSubscription({
          userId: e.userId,
          subscriptionId: e.subscriptionId,
        });
      }
      break;

    case "payment.completed":
      if (e.isSessionPackage) {
        await fulfillment.fulfillSessionPackage({
          userId: e.userId,
          provider: providerName,
          productId: e.productId,
          productName: e.productName,
          priceId: e.priceId,
          transactionId: e.transaction?.id,
          amount: e.transaction?.amount,
          quantity: e.quantity,
        }, fulfillmentHooks);
      }
      // Recurring subscription RENEWAL: roll the membership dashboard's billing
      // fields forward on the user doc (lastPaymentDate / lastPaymentAmount /
      // currentPeriodEnd). The first charge is handled at activation; this keeps
      // "Next Billing" + the paid line correct on every renewal.
      if (e.subscriptionRenewal?.userId) {
        try {
          const admin = require("firebase-admin");
          const update = {
            lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          if (e.subscriptionRenewal.amount != null) {
            update.lastPaymentAmount = e.subscriptionRenewal.amount;
          }
          if (e.subscriptionRenewal.currentPeriodEnd != null) {
            update.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(
              e.subscriptionRenewal.currentPeriodEnd * 1000
            );
          }
          // Keep the "Current Payment Method" card fresh from each renewal's
          // funding instrument when PayPal exposed it.
          if (e.subscriptionRenewal.paymentMethod) {
            update.currentPaymentMethod = e.subscriptionRenewal.paymentMethod;
          }
          await admin.firestore().collection("users").doc(e.subscriptionRenewal.userId).update(update);
        } catch (err) {
          logger.error("subscription renewal user-doc sync failed (non-fatal)", { userId: e.subscriptionRenewal.userId, error: err.message });
        }
      }
      if (e.transaction) {
        await fulfillment.writeTransactionRecord({
          userId: e.userId,
          transaction: e.transaction,
          provider: providerName,
        });
      }
      // Discount redemption (Feature 2): when the capture carried a code, record it
      // (transactional + idempotent on the capture id) so usage counts are accurate.
      if (e.discountRedemption?.code) {
        try {
          const dr = e.discountRedemption;
          await discounts.recordRedemption({
            codeId: dr.code,
            userId: dr.userId,
            mode: dr.mode || "payment",
            productId: dr.productId,
            originalAmount: dr.originalAmount,
            discountedAmount: dr.discountedAmount,
            amountOff:
              dr.originalAmount != null && dr.discountedAmount != null
                ? dr.originalAmount - dr.discountedAmount
                : null,
            transactionId: dr.transactionId,
          });
        } catch (err) {
          logger.error("discount redemption recording failed (non-fatal)", { error: err.message });
        }
      }
      break;


    case "payment.refunded":

      if (e.transaction) {
        await fulfillment.writeTransactionRecord({
          userId: e.userId,
          transaction: { ...e.transaction, status: "refunded" },
          provider: providerName,
        });
      }
      break;

    default:
      logger.info("Unhandled neutral payment event", { type: e.type, provider: providerName });
  }
}

/**
 * Generic webhook. The active provider is chosen by the `?provider=` query (so a
 * single function can serve multiple providers' endpoints) or defaults to env.
 * Each provider registers its own endpoint URL + signature secret at cutover.
 */
/**
 * Resolve which provider sent this webhook. Prefer the explicit `?provider=` query
 * (how we register each endpoint), but FALL BACK to the provider-specific signature
 * headers so a missing/stripped query param can never silently route a PayPal event
 * to the Stripe verifier (PayPal sends `paypal-transmission-sig`; Stripe sends
 * `stripe-signature`). Last resort: env default, then "stripe".
 */
function detectProvider(req) {
  if (req.query && req.query.provider) return req.query.provider.toString();
  const h = req.headers || {};
  if (h["paypal-transmission-sig"]) return "paypal";
  if (h["stripe-signature"]) return "stripe";
  // PayPal is the live processor; Stripe is dormant. Default to PayPal when no
  // query param or signature header identifies the sender.
  return (process.env.PAYMENT_PROVIDER || "paypal").toString();

}

const paymentWebhook = onRequest({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req, res) => {

  const providerName = detectProvider(req);
  const provider = PROVIDERS[providerName];


  if (!provider) {
    logger.error("paymentWebhook: unknown provider", { providerName });
    res.status(400).send("Unknown provider");
    return;
  }

  // Verify signature using provider-specific secrets (read from env/Secret Mgr).
  // For PayPal, default to a sandbox cfg here (this generic endpoint is retained for
  // Stripe/other; PayPal uses the dedicated paypalWebhookSandbox/Live functions).
  const verifyCtx = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    ...paypalEnvConfig("sandbox"),
  };

  let verified;
  try {
    verified = await provider.verifySignature(req, verifyCtx);
  } catch (err) {
    logger.error("paymentWebhook: verifySignature threw", { providerName, error: err.message });
    res.status(400).send("Signature verification error");
    return;
  }

  if (!verified?.ok) {
    res.status(400).send("Invalid signature");
    return;
  }

  let events = [];
  try {
    events = (await provider.parseEvent(verified.event, verifyCtx)) || [];
  } catch (err) {
    logger.error("paymentWebhook: parseEvent threw", { providerName, error: err.message });
    res.status(400).send("Parse error");
    return;
  }


  try {
    for (const e of events) {
      await handleEvent(providerName, e);
    }
    res.status(200).send("ok");
  } catch (err) {
    // Return 500 so the provider retries (fulfillment is idempotent).
    logger.error("paymentWebhook: fulfillment failed", { providerName, error: err.message });
    res.status(500).send("Fulfillment error");
  }
});

/**
 * Shared PayPal webhook handler. Verifies + parses + fulfills against the given env.
 * Backed by two thin wrappers (sandbox/live) so each binds only its own secrets and
 * PayPal points each dashboard at a distinct URL (no env query param to rely on).
 */
async function handlePaypalWebhook(req, res, env) {
  const cfg = paypalEnvConfig(env);
  const provider = PROVIDERS.paypal;
  let verified;
  try {
    verified = await provider.verifySignature(req, cfg);
  } catch (err) {
    logger.error("paypalWebhook: verifySignature threw", { env, error: err.message });
    res.status(400).send("Signature verification error");
    return;
  }
  if (!verified?.ok) {
    res.status(400).send("Invalid signature");
    return;
  }
  let events = [];
  try {
    events = (await provider.parseEvent(verified.event, cfg)) || [];
  } catch (err) {
    logger.error("paypalWebhook: parseEvent threw", { env, error: err.message });
    res.status(400).send("Parse error");
    return;
  }

  try {
    for (const e of events) {
      await handleEvent("paypal", e);
    }
    res.status(200).send("ok");
  } catch (err) {
    logger.error("paypalWebhook: fulfillment failed", { env, error: err.message });
    res.status(500).send("Fulfillment error");
  }
}

// SANDBOX webhook — register the sandbox PayPal dashboard webhook at this URL.
// Binds RESEND_API_KEY too: the webhook fulfills (incl. the welcome email on
// first activation) — without it the email fails with "Missing API key".
const paypalWebhookSandbox = onRequest(
  { region: "us-west1", secrets: [...PAYPAL_SANDBOX_SECRETS, RESEND_API_KEY] },
  (req, res) => handlePaypalWebhook(req, res, "sandbox")
);

// LIVE webhook — register the live PayPal dashboard webhook at this URL.
const paypalWebhookLive = onRequest(
  { region: "us-west1", secrets: [...PAYPAL_LIVE_SECRETS, RESEND_API_KEY] },
  (req, res) => handlePaypalWebhook(req, res, "production")
);



/**
 * Callable: cancel the caller's PayPal subscription (backs the client adapter's
 * `cancelSubscription`). Auth-gated; verifies the subscription belongs to the
 * caller via their user doc before calling PayPal. The webhook
 * (BILLING.SUBSCRIPTION.CANCELLED) performs the actual fulfillment/state change.
 */
const cancelPaypalSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const subscriptionId = req.data?.subscriptionId;
  if (!subscriptionId) throw new HttpsError("invalid-argument", "subscriptionId required.");

  const admin = require("firebase-admin");
  const userSnap = await admin.firestore().collection("users").doc(uid).get();
  const userData = userSnap.data() || {};
  if (userData.subscriptionId !== subscriptionId) {
    throw new HttpsError("permission-denied", "Subscription does not belong to caller.");
  }

  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));
  try {
    await PROVIDERS.paypal.cancelSubscription(subscriptionId, cfg);
    return { ok: true };
  } catch (err) {
    logger.error("cancelPaypalSubscription failed", { uid, subscriptionId, error: err.message });
    throw new HttpsError("internal", "Failed to cancel subscription.");
  }
});

/**
 * Callable: capture a one-time PayPal Order SERVER-SIDE (backs the client adapter's
 * one-time onApprove). The browser SDK's actions.order.capture() is unreliable for
 * guest-card orders (permission_denied); our server credentials capture reliably.
 * Auth-gated. The PAYMENT.CAPTURE.COMPLETED webhook performs fulfillment (idempotent),
 * so this just triggers/confirms the capture and returns its status.
 */
const capturePaypalOrder = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");

  const orderId = req.data?.orderId;
  if (!orderId) throw new HttpsError("invalid-argument", "orderId required.");

  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));
  try {
    const result = await PROVIDERS.paypal.captureOrder(orderId, cfg);
    const capture = result?.purchase_units?.[0]?.payments?.captures?.[0];
    const status = result?.status || capture?.status;

    // SYNCHRONOUS fulfillment (PayPal best practice): the capture response is the
    // authoritative "money received" signal — fulfill immediately on COMPLETED
    // instead of waiting on the PAYMENT.CAPTURE.COMPLETED webhook (which is slow/
    // unreliable in sandbox). The webhook remains an idempotent backup:
    // fulfillSessionPackage dedupes on providerTransactionId (the capture id), so a
    // later webhook for the same capture is a no-op. We resolve the neutral product
    // identity from the captured amount (same logic the webhook path uses).
    if (status === "COMPLETED" && capture?.id) {
      const minor = (() => {
        const v = parseFloat(capture.amount?.value ?? "0");
        return Math.round((Number.isNaN(v) ? 0 : v) * 100);
      })();
      // Resolve product identity. PREFER the threaded custom_id token (productId +
      // code) so a DISCOUNTED capture resolves correctly — the discounted amount no
      // longer matches the catalog amount. Fall back to amount inference (no code).
      const parsedSync = PROVIDERS.paypal.parseOrderCustomId
        ? PROVIDERS.paypal.parseOrderCustomId(capture.custom_id)
        : { productId: null, code: null, originalAmount: null };
      let item =
        parsedSync.productId && PROVIDERS.paypal.resolveOneTimeByAppId
          ? PROVIDERS.paypal.resolveOneTimeByAppId(parsedSync.productId)
          : null;
      if (!item && PROVIDERS.paypal.resolveOneTimeByAmount) {
        item = PROVIDERS.paypal.resolveOneTimeByAmount(minor);
      }
      const productName = item ? item.label : "Training Sessions";
      try {
        await fulfillment.fulfillSessionPackage({
          userId: uid,
          provider: "paypal",
          productId: item ? item.appId : null,
          productName,
          transactionId: capture.id,
          amount: minor,
          quantity: item ? item.quantity : undefined,
        }, fulfillmentHooks);
        await fulfillment.writeTransactionRecord({
          userId: uid,
          provider: "paypal",
          transaction: {
            id: capture.id,
            date: Math.floor(Date.now() / 1000),
            amount: minor,
            currency: capture.amount?.currency_code || "usd",
            status: "succeeded",
            productName,
            type: "one_time", // synchronous one-time capture
          },
        });
        // Record the discount redemption (idempotent on capture id; the webhook
        // backup also attempts it and dedupes on the same capture id).
        if (parsedSync.code) {
          await discounts.recordRedemption({
            codeId: parsedSync.code,
            userId: uid,
            mode: "payment",
            productId: item ? item.appId : null,
            originalAmount: parsedSync.originalAmount ?? (item ? item.amount : null),
            discountedAmount: minor,
            amountOff: parsedSync.originalAmount != null ? parsedSync.originalAmount - minor : null,
            transactionId: capture.id,
          });
        }
      } catch (e) {

        // Fail-soft: the webhook backup will still fulfill. Don't fail the capture.
        logger.error("capturePaypalOrder: synchronous fulfillment failed (webhook will retry)", { uid, orderId, error: e.message });
      }
    }

    // Return the capture id as `transactionId` so the client can navigate to the
    // success page with an ABSOLUTE fulfillment signal (the success page matches
    // sessionPackages[].providerTransactionId === this id). This avoids the
    // baseline-rise race where synchronous fulfillment already incremented the
    // session balance before the success page mounts.
    return { ok: true, status: status || "COMPLETED", transactionId: capture?.id || null };
  } catch (err) {
    logger.error("capturePaypalOrder failed", { uid, orderId, error: err.message });
    throw new HttpsError("internal", "Failed to capture order.");
  }
});



/**
 * Callable: create a one-time PayPal Order SERVER-SIDE (ACDC card-fields flow).
 * Amount is resolved server-side from the priceId (never trusted from client).
 */
const createPaypalOrder = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const priceId = req.data?.priceId;
  if (!priceId) throw new HttpsError("invalid-argument", "priceId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));

  // DISCOUNT (Feature 2): when a code is supplied, re-validate it + recompute the


  // discounted amount SERVER-SIDE (the client never sets the amount). The original
  // amount comes from our server price map; the floored discounted amount is passed
  // to the adapter's createOrder, which also threads the productId + code through
  // custom_id so the capture path records the redemption + resolves the product.
  const rawCode = req.data?.discountCode;
  const orderOpts = {};
  if (rawCode) {
    const originalMinor = ONETIME_PRICE_MINOR[priceId];
    if (originalMinor == null) {
      throw new HttpsError("invalid-argument", "Unknown one-time item for discount.");
    }
    try {
      const codeDoc = await discounts.getCode(rawCode);
      const perUser = codeDoc
        ? await discounts.countUserRedemptions(codeDoc.id, uid)
        : 0;
      const v = discounts.validateCode(
        codeDoc,
        { productId: null, mode: "payment", priceId, userId: uid },
        perUser
      );
      if (!v.valid) {
        throw new HttpsError("failed-precondition", `Discount code ${v.reason}.`);
      }
      const computed = discounts.computeDiscountedAmount(codeDoc, originalMinor);
      if (computed.freeComp) {
        // Free comps bypass PayPal entirely (Phase 2 path). Not used in phase-1
        // paid checkout — reject here so a $0 order is never sent to PayPal.
        throw new HttpsError("failed-precondition", "This code is a free comp, not a paid discount.");
      }
      orderOpts.discountedAmountMinor = computed.discountedAmount;
      orderOpts.discountCode = codeDoc.id;
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      logger.error("createPaypalOrder: discount validation failed", { uid, priceId, error: e.message });
      throw new HttpsError("internal", "Failed to validate discount.");
    }
  }

  try {
    const orderId = await PROVIDERS.paypal.createOrder(priceId, uid, cfg, orderOpts);
    return { ok: true, orderId };
  } catch (err) {
    logger.error("createPaypalOrder failed", { uid, priceId, error: err.message });
    throw new HttpsError("internal", "Failed to create order.");
  }
});

/**
 * Callable: validate + PREVIEW a discount code (Feature 2, read-only). Resolves the
 * server-side original amount, validates the code, and returns a neutral
 * DiscountPreview. Records NO redemption and changes no counts. Phase 1 supports
 * one-time items; subscriptions return { valid:false, reason:'not_applicable' }.
 */
const previewDiscount = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const code = req.data?.code;
  const priceId = req.data?.priceId;
  const mode = req.data?.mode === "subscription" ? "subscription" : "payment";
  const productId = req.data?.productId || null;
  if (!code || !priceId) throw new HttpsError("invalid-argument", "code and priceId required.");

  // Resolve the server-side ORIGINAL amount the discount applies to:
  //   - one-time (payment): the item price from ONETIME_PRICE_MINOR.
  //   - subscription: the FIRST-CYCLE monthly price (SUBSCRIPTION_PRICE_MINOR by
  //     tier). For Complete Transformation a first-cycle discount applies to the
  //     $250 month only — NOT the $60 setup fee (business decision 2026-06-25).
  const empty = { originalAmount: 0, discountedAmount: 0, amountOff: 0 };
  let originalMinor;
  if (mode === "payment") {
    originalMinor = ONETIME_PRICE_MINOR[priceId];
  } else {
    // priceId is the PayPal plan id (P-...); resolve its neutral tier → monthly price.
    const tier = PROVIDERS.paypal.resolvePlanTier
      ? PROVIDERS.paypal.resolvePlanTier(priceId)
      : {};
    originalMinor = tier.tierId ? SUBSCRIPTION_PRICE_MINOR[tier.tierId] : undefined;
  }
  if (originalMinor == null) {
    return { valid: false, reason: "not_applicable", ...empty };
  }


  try {
    const codeDoc = await discounts.getCode(code);
    const perUser = codeDoc ? await discounts.countUserRedemptions(codeDoc.id, uid) : 0;
    const v = discounts.validateCode(codeDoc, { productId, mode, priceId, userId: uid }, perUser);
    if (!v.valid) {
      return { valid: false, reason: v.reason, originalAmount: originalMinor, discountedAmount: originalMinor, amountOff: 0 };
    }
    const c = discounts.computeDiscountedAmount(codeDoc, originalMinor);
    return {
      valid: true,
      code: codeDoc.id,
      originalAmount: originalMinor,
      discountedAmount: c.discountedAmount,
      amountOff: c.amountOff,
      freeComp: c.freeComp,
      label: c.label,
    };
  } catch (err) {
    logger.error("previewDiscount failed", { uid, code, error: err.message });
    return { valid: false, reason: "error", ...empty };
  }
});

// ---- Admin discount-code management (Feature 2, phase 1: create/list/deactivate) ----

/** Throws unless the caller is an admin (admins/{uid}.role == 'admin'). */
async function assertAdmin(uid) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const admin = require("firebase-admin");
  const snap = await admin.firestore().collection("admins").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

/** Callable: create/overwrite a discount code (admin only). */
const createDiscountCode = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const d = req.data || {};
  const id = discounts.normalizeCode(d.code);
  if (!id) throw new HttpsError("invalid-argument", "code required.");
  if (d.type !== "percentage" && d.type !== "fixed" && d.freeComp !== true) {
    throw new HttpsError("invalid-argument", "type must be 'percentage' or 'fixed' (or freeComp).");
  }
  const doc = {
    code: id,
    type: d.type === "fixed" ? "fixed" : "percentage",
    value: Number(d.value) || 0,
    active: d.active !== false,
    expiresAt: d.expiresAt ? admin.firestore.Timestamp.fromMillis(Number(d.expiresAt)) : null,
    maxRedemptions: d.maxRedemptions != null ? Number(d.maxRedemptions) : null,
    redemptionCount: 0,
    perUserLimit: d.perUserLimit != null ? Number(d.perUserLimit) : null,
    appliesTo: d.appliesTo || null,
    minChargeFloor: d.minChargeFloor != null ? Number(d.minChargeFloor) : discounts.DEFAULT_MIN_CHARGE_FLOOR,
    freeComp: d.freeComp === true,
    discountScope: d.discountScope || "one_time",
    // Intro length (subscription "first_cycle" scope only): how many billing cycles
    // the intro price applies before PayPal auto-reverts to full price. Default 1.
    introCycles: d.introCycles != null ? Math.max(1, Math.round(Number(d.introCycles))) : 1,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: req.auth.uid,
  };
  await admin.firestore().collection("discount_codes").doc(id).set(doc, { merge: true });
  return { ok: true, id };
});

/** Callable: list discount codes (admin only). */
const listDiscountCodes = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const snap = await admin.firestore().collection("discount_codes").get();
  const codes = snap.docs.map((doc) => {
    const x = doc.data() || {};
    return {
      id: doc.id,
      code: x.code || doc.id,
      type: x.type,
      value: x.value,
      active: x.active !== false,
      expiresAt: x.expiresAt?.toMillis ? x.expiresAt.toMillis() : null,
      maxRedemptions: x.maxRedemptions ?? null,
      redemptionCount: x.redemptionCount || 0,
      perUserLimit: x.perUserLimit ?? null,
      minChargeFloor: x.minChargeFloor ?? discounts.DEFAULT_MIN_CHARGE_FLOOR,
      freeComp: x.freeComp === true,
      discountScope: x.discountScope || "one_time",
      introCycles: x.introCycles != null ? Number(x.introCycles) : 1,
      appliesTo: x.appliesTo || null,
    };
  });
  return { ok: true, codes };
});

/** Callable: activate/deactivate a discount code (admin only). */
const setDiscountCodeActive = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const id = discounts.normalizeCode(req.data?.code);
  if (!id) throw new HttpsError("invalid-argument", "code required.");
  await admin.firestore().collection("discount_codes").doc(id).set(
    { active: req.data?.active !== false, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { ok: true, id };
});

/**
 * Callable: edit an EXISTING discount code's mutable fields (admin only).
 * The code string is the document identity (and is referenced by redemptions), so it
 * CANNOT be changed here — only type/value/floor/limits/expiry/freeComp/active/scope.
 * Critically this NEVER touches `redemptionCount`, `code`, `createdAt`, or `createdBy`
 * (unlike createDiscountCode, which resets redemptionCount to 0). Only fields PRESENT
 * in req.data are updated, so partial edits are safe.
 */
const updateDiscountCode = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const d = req.data || {};
  const id = discounts.normalizeCode(d.code);
  if (!id) throw new HttpsError("invalid-argument", "code required.");

  const ref = admin.firestore().collection("discount_codes").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Discount code not found.");

  // Build an update with ONLY the provided, editable fields (never code/count/created*).
  const update = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
  if (d.type !== undefined) {
    if (d.type !== "percentage" && d.type !== "fixed") {
      throw new HttpsError("invalid-argument", "type must be 'percentage' or 'fixed'.");
    }
    update.type = d.type;
  }
  if (d.value !== undefined) update.value = Number(d.value) || 0;
  if (d.active !== undefined) update.active = d.active !== false;
  if (d.expiresAt !== undefined) {
    update.expiresAt = d.expiresAt
      ? admin.firestore.Timestamp.fromMillis(Number(d.expiresAt))
      : null;
  }
  if (d.maxRedemptions !== undefined) {
    update.maxRedemptions = d.maxRedemptions != null && d.maxRedemptions !== ""
      ? Number(d.maxRedemptions)
      : null;
  }
  if (d.perUserLimit !== undefined) {
    update.perUserLimit = d.perUserLimit != null && d.perUserLimit !== ""
      ? Number(d.perUserLimit)
      : null;
  }
  if (d.minChargeFloor !== undefined) {
    update.minChargeFloor = d.minChargeFloor != null
      ? Number(d.minChargeFloor)
      : discounts.DEFAULT_MIN_CHARGE_FLOOR;
  }
  if (d.freeComp !== undefined) update.freeComp = d.freeComp === true;
  if (d.discountScope !== undefined) update.discountScope = d.discountScope || "one_time";
  if (d.introCycles !== undefined) {
    update.introCycles = d.introCycles != null && d.introCycles !== ""
      ? Math.max(1, Math.round(Number(d.introCycles)))
      : 1;
  }
  if (d.appliesTo !== undefined) update.appliesTo = d.appliesTo || null;

  await ref.set(update, { merge: true });
  return { ok: true, id };
});



/**
 * Callable: create a vault SETUP TOKEN so the client's ACDC card fields can vault a
 * card for a subscription. Returns the setup token id.
 */
const createPaypalCardSetupToken = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));
  try {
    const setupToken = await PROVIDERS.paypal.createCardSetupToken(cfg);

    return { ok: true, setupToken };
  } catch (err) {
    logger.error("createPaypalCardSetupToken failed", { uid, error: err.message });
    throw new HttpsError("internal", "Failed to create card setup token.");
  }
});

/**
 * Callable: create a subscription billed to a vaulted CARD (ACDC). Lets a card-only
 * buyer subscribe with NO PayPal account. The webhook (BILLING.SUBSCRIPTION.ACTIVATED)
 * performs fulfillment; `custom_id` = uid maps it to the user.
 */
const createPaypalSubscriptionWithCard = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const setupToken = req.data?.setupToken;
  const planId = req.data?.planId;
  if (!setupToken) throw new HttpsError("invalid-argument", "setupToken required.");
  if (!planId) throw new HttpsError("invalid-argument", "planId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));

  // SUBSCRIPTION DISCOUNTS (2-cycle override model): resolveSubscriptionPlan returns
  // the BASE plan id + (when a code applies) a per-subscriber billing_cycles override
  // ({ scope, discountedMinor, regularMinor, trialCycles }). We vault the card against
  // the base plan and bake the override into the create call (the base plan is minted
  // 2-cycle, so the override reprices existing cycles — no INVALID_BILLING_CYCLE_SEQUENCE).
  // custom_id carries uid + code so the ACTIVATED webhook / synchronous path records
  // the redemption. No code → base plan + bare-uid custom_id + no override.
  const sub = await resolveSubscriptionPlan(planId, uid, req.data?.discountCode);
  if (sub.error) throw sub.error;
  const planToUse = sub.planToUse;
  const cardCustomId = sub.customId;
  const cardOverride = sub.override || {};

  // discountCtx drives the synchronous redemption record on confirmed ACTIVE.
  let discountCtx = null;
  if (req.data?.discountCode) {
    const t = PROVIDERS.paypal.resolvePlanTier ? PROVIDERS.paypal.resolvePlanTier(planId) : {};
    const codeDoc = await discounts.getCode(req.data.discountCode);
    const regularMinor = t.tierId ? SUBSCRIPTION_PRICE_MINOR[t.tierId] : null;
    if (codeDoc) {
      const computed = discounts.computeDiscountedAmount(codeDoc, regularMinor || 0);
      discountCtx = {
        code: codeDoc.id,
        productId: t.tierId || null,
        originalAmount: regularMinor,
        discountedAmount: computed.discountedAmount,
        amountOff: computed.amountOff,
      };
    }
  }
  try {

    // Resolve buyer email — REQUIRED by PayPal alongside `card.vault_id` (without it
    // PayPal treats the vaulted card as inline raw-card entry and 400s for
    // number/expiry). Prefer the auth token email; fall back to users/{uid}.email.
    let email = req.auth?.token?.email || null;
    if (!email) {
      try {
        const admin = require("firebase-admin");
        const userSnap = await admin.firestore().collection("users").doc(uid).get();
        email = userSnap.data()?.email || null;
      } catch (e) {
        logger.warn("createPaypalSubscriptionWithCard: could not resolve user email", { uid, error: e.message });
      }
    }

    // Create against the BASE plan, baking in the per-subscriber price override
    // (intro/recurring) when a code was applied. The base plan is 2-cycle so the
    // override reprices existing cycles — no INVALID_BILLING_CYCLE_SEQUENCE.
    const created = await PROVIDERS.paypal.createSubscriptionWithCard(setupToken, planToUse, cardCustomId, email, cfg, cardOverride);

    const subscriptionId = created?.id;




    // SYNCHRONOUS confirmation (PayPal best practice): don't trust the create
    // response alone and don't wait on the BILLING.SUBSCRIPTION.ACTIVATED webhook
    // (slow/unreliable in sandbox). Re-read the subscription's authoritative state
    // from PayPal; only fulfill when status === 'ACTIVE' (real first charge taken).
    // The webhook remains an idempotent backup (activateSubscription is write-once
    // on accountActivated).
    let status = created?.status || null;
    let lastPayment = null;
    if (subscriptionId) {
      try {
        let sub = await PROVIDERS.paypal.getSubscription(subscriptionId, cfg);
        status = sub?.status || status;
        lastPayment = sub?.billing_info?.last_payment || null;
        logger.info("createPaypalSubscriptionWithCard: subscription status", {
          uid,
          subscriptionId,
          planId,
          status,
          lastPayment,
        });

        // FALLBACK: if PayPal left the subscription in APPROVAL_PENDING (no amount
        // due at creation, e.g. Online Coaching has no setup fee), explicitly nudge
        // it to ACTIVATE, then re-read its authoritative state. We still gate
        // fulfillment strictly on a confirmed ACTIVE status below (money-safety).
        if (status && status !== "ACTIVE" && PROVIDERS.paypal.activatePaypalSubscription) {
          try {
            await PROVIDERS.paypal.activatePaypalSubscription(subscriptionId, cfg);
            sub = await PROVIDERS.paypal.getSubscription(subscriptionId, cfg);
            status = sub?.status || status;
            lastPayment = sub?.billing_info?.last_payment || lastPayment;
            logger.info("createPaypalSubscriptionWithCard: status after explicit activate", {
              uid,
              subscriptionId,
              planId,
              status,
              lastPayment,
            });
          } catch (ae) {
            logger.warn("createPaypalSubscriptionWithCard: explicit activate failed", { uid, subscriptionId, error: ae.message });
          }
        }

        if (status === "ACTIVE") {
          const tier = PROVIDERS.paypal.resolvePlanTier
            ? PROVIDERS.paypal.resolvePlanTier(planId)
            : {};
          await fulfillment.activateSubscription(
            {
              userId: uid,
              subscriptionId,
              provider: "paypal",
              status: "active",
              priceId: planId,
              productId: tier.tierId || null,
              tierId: tier.tierId || null,
              tierName: tier.tierName || null,
              currentPeriodEnd: sub?.billing_info?.next_billing_time
                ? Math.floor(Date.parse(sub.billing_info.next_billing_time) / 1000)
                : undefined,
              // ACTUAL first-charge amount (post-discount), minor units → accurate MRR.
              amount: lastPayment?.amount?.value
                ? Math.round(parseFloat(lastPayment.amount.value) * 100)
                : undefined,
              interval: "month",
              // Funding instrument (card path → typically "Visa ••4242") for the
              // "Current Payment Method" card. Null → UI falls back to "PayPal".
              paymentMethod: PROVIDERS.paypal.derivePaymentMethod
                ? PROVIDERS.paypal.derivePaymentMethod(sub?.subscriber?.payment_source)
                : null,
            },
            fulfillmentHooks
          );

          // Persist the discount/intro DISPLAY state for Billing/Membership (T10.8.1).
          await persistSubscriptionDiscountState(uid, sub.override);

          // DISCOUNT redemption (Feature 2 / T9): record once on confirmed ACTIVE,
          // idempotent on the subscription id (a later ACTIVATED webhook for the
          // same subscription dedupes via recordRedemption's transactionId guard).
          if (discountCtx) {

            try {
              await discounts.recordRedemption({
                codeId: discountCtx.code,
                userId: uid,
                mode: "subscription",
                productId: discountCtx.productId,
                originalAmount: discountCtx.originalAmount,
                discountedAmount: discountCtx.discountedAmount,
                amountOff: discountCtx.amountOff,
                transactionId: subscriptionId,
              });
            } catch (re) {
              logger.error("createPaypalSubscriptionWithCard: redemption recording failed (non-fatal)", { uid, subscriptionId, error: re.message });
            }
          }
        }
      } catch (e) {

        // Fail-soft: the ACTIVATED webhook backup will still fulfill if it arrives.
        logger.error("createPaypalSubscriptionWithCard: status check/fulfill failed (webhook may retry)", { uid, subscriptionId, error: e.message });
      }
    }


    return { ok: true, subscriptionId, status: status || "PENDING" };
  } catch (err) {
    logger.error("createPaypalSubscriptionWithCard failed", { uid, planId, error: err.message });
    throw new HttpsError("internal", "Failed to create subscription.");
  }
});

/**
 * Callable: create a subscription SERVER-SIDE for the Smart Button (PayPal/Venmo)
 * flow — no vaulted card, so no Reference Transactions capability needed. Returns
 * the subscription id for the button to approve. This is the server-authoritative
 * parity of the one-time `createPaypalOrder`: the client passes only planId +
 * (optional) discountCode; the server validates the code, computes the discounted
 * first-cycle amount from its own price map, and applies the billing-cycle override
 * (the client never sets the price). When a code is applied the uid + code are
 * threaded through `custom_id` as a JSON token so the ACTIVATED webhook records the
 * redemption; otherwise `custom_id` is the bare uid (back-compat). The $60 CT setup
 * fee stays on the plan and is never discounted (business decision 2026-06-25).
 */
const createPaypalSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const planId = req.data?.planId;
  if (!planId) throw new HttpsError("invalid-argument", "planId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));

  // SUBSCRIPTION DISCOUNTS (2-cycle override model): when a code is applied,
  // resolveSubscriptionPlan returns the BASE plan id + a per-subscriber billing_cycles
  // override ({ scope, discountedMinor, regularMinor, trialCycles }). We create against
  // the base plan and bake the override into the create call — the base plan is minted
  // 2-cycle, so the override reprices existing cycles (no INVALID_BILLING_CYCLE_SEQUENCE).
  // custom_id carries uid + code (JSON token) so the ACTIVATED webhook records the
  // redemption. No code → base plan + bare-uid custom_id + no override.
  const { planToUse, customId, override, error: subErr } = await resolveSubscriptionPlan(planId, uid, req.data?.discountCode);
  if (subErr) throw subErr;

  try {
    const subscriptionId = await PROVIDERS.paypal.createSubscription(planToUse, customId, cfg, override || {});
    // Persist the discount/intro DISPLAY state for Billing/Membership (T10.8.1).
    // A missing override clears any stale promo (no-code subscription). Non-fatal.
    await persistSubscriptionDiscountState(uid, override);
    return { ok: true, subscriptionId };

  } catch (err) {
    logger.error("createPaypalSubscription failed", { uid, planId, error: err.message });

    throw new HttpsError("internal", "Failed to create subscription.");
  }
});



/**
 * Callable (ADMIN): change a subscriber's plan via PayPal revise — to end a promo
 * (→ base plan), move tier, or reprice an individual. No cancel/re-subscribe, no
 * re-collecting payment. The BILLING.SUBSCRIPTION.UPDATED webhook syncs the neutral
 * record + tier on the next read. (subscription-discounts T10.5 / FR-12.)
 */
const revisePaypalSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const subscriptionId = req.data?.subscriptionId;
  const newPlanId = req.data?.newPlanId;
  if (!subscriptionId) throw new HttpsError("invalid-argument", "subscriptionId required.");
  if (!newPlanId) throw new HttpsError("invalid-argument", "newPlanId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv));
  try {
    const result = await PROVIDERS.paypal.reviseSubscription(subscriptionId, newPlanId, cfg);
    return { ok: true, result };
  } catch (err) {
    logger.error("revisePaypalSubscription failed", { subscriptionId, newPlanId, error: err.message });
    throw new HttpsError("internal", "Failed to change the subscription plan.");
  }
});

/**
 * Callable (ADMIN): per-client price override on the SAME plan (FR-16). Sets a custom
 * recurring price for ONE subscriber without moving them to a different plan — the
 * exact behavior of the PayPal dashboard's "Update pricing" (sandbox-validated S1:
 * PATCH subscription, inline pricing_scheme override → plan_overridden:true, new price
 * from the next billing cycle). Looks the subscriber up by targetUserId (their stored
 * subscriptionId) and writes optimistic `pendingPriceMinor`/`priceEffectiveAt` on the
 * user doc so the membership/billing UI can show "new price effective {date}" until the
 * UPDATED webhook reconciles. (subscription-management T3.9 / FR-16, FR-17.)
 */
const repriceClientSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const targetUserId = req.data?.targetUserId;
  const newAmountMinor = Number(req.data?.newAmountMinor);
  if (!targetUserId) throw new HttpsError("invalid-argument", "targetUserId required.");
  if (!Number.isFinite(newAmountMinor) || newAmountMinor < 100) {
    throw new HttpsError("invalid-argument", "newAmountMinor must be ≥ 100 (a $1.00 floor).");
  }
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv ?? req.data?.env));

  const ref = admin.firestore().collection("users").doc(targetUserId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const u = snap.data() || {};
  const subscriptionId = u.subscriptionId;
  if (!subscriptionId) throw new HttpsError("failed-precondition", "User has no active subscription.");

  try {
    await PROVIDERS.paypal.reviseSubscriptionPricing(subscriptionId, newAmountMinor, {}, cfg);
    // Optimistic display (FR-17): the new price applies next cycle. The UPDATED
    // webhook / next renewal reconciles `lastPaymentAmount` + clears these.
    await ref.set(
      {
        pendingPriceMinor: newAmountMinor,
        priceEffectiveAt: u.currentPeriodEnd || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true, subscriptionId, newAmountMinor };
  } catch (err) {
    logger.error("repriceClientSubscription failed", { targetUserId, subscriptionId, error: err.message });
    throw new HttpsError("internal", "Failed to update the client's price.");
  }
});



// ============================================================================
// Subscription Management Console (subscription-management FR-3…FR-19) — admin.
// All callables are admin-gated. They translate neutral admin actions into PayPal
// adapter calls and keep the Firestore `paypalPlans` registry authoritative for the
// console's display. Per-client reprice (`repriceClientSubscription` /
// `reviseSubscriptionPricing`) is intentionally NOT here yet — deferred until the
// PayPal `revise` pricing-override is sandbox-validated (script S1).
// ============================================================================

/** Upsert a plan doc into the Firestore `paypalPlans` registry (merge). */
async function upsertPlanRegistry(planId, fields) {
  const admin = require("firebase-admin");
  await admin
    .firestore()
    .collection("paypalPlans")
    .doc(planId)
    .set(
      {
        planId,
        ...fields,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
}

/**
 * Pricing math (FR-11/FR-12). Returns the new price in minor units with a $1.00
 * (100 minor) floor so a plan can never drop to $0 (PayPal rejects $0 recurring).
 *   percent: round(current * (1 + value/100))
 *   amount:  current + round(value*100)   (value is whole dollars, +/-)
 *   set:     round(value*100)
 */
function computeNewPrice(currentMinor, action = {}) {
  const FLOOR = 100;
  const cur = Number(currentMinor) || 0;
  const v = Number(action.value) || 0;
  let next;
  switch (action.mode) {
    case "percent":
      next = Math.round(cur * (1 + v / 100));
      break;
    case "amount":
      next = cur + Math.round(v * 100);
      break;
    case "set":
      next = Math.round(v * 100);
      break;
    default:
      next = cur;
  }
  return Math.max(FLOOR, next);
}

/** Active-subscriber counts per plan id (FR-5). Source: users with a live sub. */
async function activeSubCountsByPlan() {
  const admin = require("firebase-admin");
  const snap = await admin
    .firestore()
    .collection("users")
    .where("subscriptionId", "!=", null)
    .get();
  const counts = {};
  snap.forEach((d) => {
    const pid = d.data()?.subscriptionPlanId;
    if (pid) counts[pid] = (counts[pid] || 0) + 1;
  });
  return counts;
}

/** Callable (ADMIN): list registry plans + active-sub counts (FR-3/FR-5). */
const listPaypalPlans = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const env = req.data?.env ? normalizePaypalEnv(req.data.env) : null;
  const snap = await admin.firestore().collection("paypalPlans").get();
  const counts = await activeSubCountsByPlan();
  const plans = snap.docs
    .map((doc) => {
      const x = doc.data() || {};
      return {
        planId: doc.id,
        productId: x.productId || null,
        tierId: x.tierId || null,
        tierName: x.tierName || null,
        amountMinor: x.amountMinor ?? null,
        currency: x.currency || "USD",
        status: x.status || "ACTIVE",
        env: x.env || null,
        name: x.name || doc.id,
        activeSubscriptions: counts[doc.id] || 0,
      };
    })
    .filter((p) => (env ? p.env === env : true));
  return { ok: true, plans };
});

/** Callable (ADMIN): create a new monthly Billing Plan + register it (FR-8). */
const createPaypalPlan = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const d = req.data || {};
  const productId = d.productId;
  const name = d.name;
  const amountMinor = d.amountMinor;
  if (!productId) throw new HttpsError("invalid-argument", "productId required.");
  if (!name) throw new HttpsError("invalid-argument", "name required.");
  if (amountMinor == null) throw new HttpsError("invalid-argument", "amountMinor required.");
  const env = normalizePaypalEnv(d.paypalEnv ?? d.env);
  const cfg = paypalEnvConfig(env);
  const currency = d.currency || "USD";
  try {
    const planId = await PROVIDERS.paypal.createPlan(
      { productId, name, amountMinor, currency, intervalUnit: d.interval || "MONTH" },
      cfg
    );
    await upsertPlanRegistry(planId, {
      productId,
      tierId: d.tierId || null,
      tierName: d.tierName || null,
      amountMinor: Number(amountMinor),
      currency,
      status: "ACTIVE",
      env,
      name,
      createdAt: require("firebase-admin").firestore.FieldValue.serverTimestamp(),
    });
    return { ok: true, planId };
  } catch (err) {
    logger.error("createPaypalPlan failed", { productId, name, error: err.message });
    throw new HttpsError("internal", "Failed to create the plan.");
  }
});

/** Callable (ADMIN): rename and/or reprice a plan (FR-9). */
const updatePaypalPlan = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const d = req.data || {};
  const planId = d.planId;
  if (!planId) throw new HttpsError("invalid-argument", "planId required.");
  const env = normalizePaypalEnv(d.paypalEnv ?? d.env);
  const cfg = paypalEnvConfig(env);

  const ref = admin.firestore().collection("paypalPlans").doc(planId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Plan not in registry.");
  const existing = snap.data() || {};
  const currency = existing.currency || "USD";

  const registryUpdate = {};
  try {
    if (d.amountMinor != null && Number(d.amountMinor) !== existing.amountMinor) {
      // Base plans are minted 2-cycle (TRIAL seq 1 + REGULAR seq 2). A WHOLE-PLAN
      // reprice must update BOTH cycles so a new subscriber pays the new price from
      // month 1 (cycle 1) onward — repricing only seq 2 would leave the first month
      // at the old price (PayPal shows it as Trial period 1).
      await PROVIDERS.paypal.updatePlanPricing(
        planId,
        Number(d.amountMinor),
        { billingCycleSequences: [1, 2], currency },
        cfg
      );

      registryUpdate.amountMinor = Number(d.amountMinor);
    }
    if (d.name && d.name !== existing.name) {
      registryUpdate.name = d.name;
    }
    if (Object.keys(registryUpdate).length > 0) {
      await upsertPlanRegistry(planId, registryUpdate);
    }
    return { ok: true, planId, updated: Object.keys(registryUpdate) };
  } catch (err) {
    logger.error("updatePaypalPlan failed", { planId, error: err.message });
    throw new HttpsError("internal", "Failed to update the plan.");
  }
});

/** Callable (ADMIN): turn a plan ON/OFF for NEW subscriptions (FR-7). */
const setPaypalPlanActive = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const planId = req.data?.planId;
  const active = req.data?.active === true;
  if (!planId) throw new HttpsError("invalid-argument", "planId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv ?? req.data?.env));
  try {
    if (active) await PROVIDERS.paypal.activatePlan(planId, cfg);
    else await PROVIDERS.paypal.deactivatePlan(planId, cfg);
    await upsertPlanRegistry(planId, { status: active ? "ACTIVE" : "INACTIVE" });
    return { ok: true, planId, status: active ? "ACTIVE" : "INACTIVE" };
  } catch (err) {
    logger.error("setPaypalPlanActive failed", { planId, active, error: err.message });
    throw new HttpsError("internal", "Failed to change plan status.");
  }
});

/**
 * Callable (ADMIN): bulk/global reprice of selected plans (FR-10/FR-11). With
 * `dryRun:true` returns an old→new preview and writes nothing. Otherwise applies the
 * new price to each plan via update-pricing-schemes and updates the registry. A $1.00
 * floor is enforced. Affects ALL current + future subscribers of those plans (PayPal
 * applies its standard consumer-notice timing to existing subscribers).
 */
const repricePlans = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const d = req.data || {};
  const planIds = Array.isArray(d.planIds) ? d.planIds : [];
  const action = d.action || {};
  const dryRun = d.dryRun === true;
  if (planIds.length === 0) throw new HttpsError("invalid-argument", "planIds required.");
  if (!["percent", "amount", "set"].includes(action.mode)) {
    throw new HttpsError("invalid-argument", "action.mode must be percent|amount|set.");
  }
  const env = normalizePaypalEnv(d.paypalEnv ?? d.env);
  const cfg = paypalEnvConfig(env);

  // Load each plan's current registry state to compute and (optionally) apply.
  const db = admin.firestore();
  const preview = [];
  for (const planId of planIds) {
    const snap = await db.collection("paypalPlans").doc(planId).get();
    if (!snap.exists) {
      preview.push({ planId, error: "not_in_registry" });
      continue;
    }
    const x = snap.data() || {};
    const oldMinor = x.amountMinor ?? 0;
    const newMinor = computeNewPrice(oldMinor, action);
    preview.push({
      planId,
      name: x.name || planId,
      tierId: x.tierId || null,
      oldMinor,
      newMinor,
      currency: x.currency || "USD",
    });
  }

  if (dryRun) return { ok: true, dryRun: true, preview };

  // Apply: reprice via PayPal, then update registry. Collect per-plan results so a
  // single failure doesn't abort the whole batch.
  const results = [];
  for (const p of preview) {
    if (p.error) {
      results.push({ planId: p.planId, ok: false, error: p.error });
      continue;
    }
    try {
      // Base plans are 2-cycle (TRIAL seq 1 + REGULAR seq 2); a whole-plan reprice
      // updates BOTH cycles so new subscribers pay the new price from month 1.
      await PROVIDERS.paypal.updatePlanPricing(
        p.planId,
        p.newMinor,
        { billingCycleSequences: [1, 2], currency: p.currency },
        cfg
      );

      await upsertPlanRegistry(p.planId, { amountMinor: p.newMinor });
      results.push({ planId: p.planId, ok: true, newMinor: p.newMinor });
    } catch (err) {
      logger.error("repricePlans: plan failed", { planId: p.planId, error: err.message });
      results.push({ planId: p.planId, ok: false, error: err.message });
    }
  }
  return { ok: true, dryRun: false, results };
});

/** Callable (ADMIN): list subscribers of a given plan (FR-14). Source: users docs. */
const listPlanSubscriptions = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const planId = req.data?.planId;
  if (!planId) throw new HttpsError("invalid-argument", "planId required.");
  const snap = await admin
    .firestore()
    .collection("users")
    .where("subscriptionPlanId", "==", planId)
    .get();
  const subscriptions = snap.docs
    .map((doc) => {
      const x = doc.data() || {};
      if (!x.subscriptionId) return null; // canceled — plan id may linger; skip
      return {
        userId: doc.id,
        name: x.name || x.displayName || null,
        email: x.email || null,
        subscriptionId: x.subscriptionId,
        status: x.subscriptionStatus || "active",
        tierId: x.tier || null,
        tierName: x.tierName || null,
        currentPeriodEnd: x.currentPeriodEnd?.toMillis ? x.currentPeriodEnd.toMillis() : null,
        cancelAtPeriodEnd: x.cancelAtPeriodEnd === true,
      };
    })
    .filter(Boolean);
  return { ok: true, subscriptions };
});

/** Callable (ADMIN): one subscription's PayPal detail + the matched user doc (FR-15). */
const getPaypalSubscriptionDetail = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const subscriptionId = req.data?.subscriptionId;
  if (!subscriptionId) throw new HttpsError("invalid-argument", "subscriptionId required.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv ?? req.data?.env));
  try {
    const sub = await PROVIDERS.paypal.getSubscription(subscriptionId, cfg);
    // Match the owning user doc by subscriptionId.
    const us = await admin
      .firestore()
      .collection("users")
      .where("subscriptionId", "==", subscriptionId)
      .limit(1)
      .get();
    let user = null;
    if (!us.empty) {
      const doc = us.docs[0];
      const x = doc.data() || {};
      user = {
        userId: doc.id,
        name: x.name || x.displayName || null,
        email: x.email || null,
        tierId: x.tier || null,
        tierName: x.tierName || null,
        subscriptionPlanId: x.subscriptionPlanId || null,
        cancelAtPeriodEnd: x.cancelAtPeriodEnd === true,
        currentPeriodEnd: x.currentPeriodEnd?.toMillis ? x.currentPeriodEnd.toMillis() : null,
      };
    }
    const lastPayment = sub?.billing_info?.last_payment || null;
    return {
      ok: true,
      subscription: {
        id: sub?.id || subscriptionId,
        status: sub?.status || null,
        planId: sub?.plan_id || null,
        nextBillingTime: sub?.billing_info?.next_billing_time || null,
        startTime: sub?.start_time || null,
        lastPaymentAmountMinor: lastPayment?.amount?.value
          ? Math.round(parseFloat(lastPayment.amount.value) * 100)
          : null,
        lastPaymentTime: lastPayment?.time || null,
      },
      user,
    };
  } catch (err) {
    logger.error("getPaypalSubscriptionDetail failed", { subscriptionId, error: err.message });
    throw new HttpsError("internal", "Failed to load the subscription.");
  }
});


/**
 * Callable (ADMIN): list ALL subscriptions (every status) from the neutral store
 * (subscription-management FR-14). Unlike listPlanSubscriptions (which reads `users`
 * docs and therefore only sees ACTIVE subs — a canceled sub clears subscriptionId),
 * this reads `collectionGroup('subscriptions')` under billing_customers/{uid}, which
 * RETAINS the record across active/paused/canceled. Joins each to the user doc for
 * name/email. Provider-neutral: returns tierName + amount + interval + status; the
 * PayPal subscription id is included only as a provider reference.
 */
const listAllSubscriptions = onCall({ region: "us-west1" }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const db = admin.firestore();
  const snap = await db.collectionGroup("subscriptions").get();

  // Resolve each subscription's owning user (the parent of the subscriptions
  // subcollection is billing_customers/{uid}); join to users/{uid} for name/email.
  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data() || {};
    // parent.parent is the billing_customers/{uid} doc.
    const uid = doc.ref.parent.parent ? doc.ref.parent.parent.id : null;
    if (!uid) continue;
    let name = null;
    let email = null;
    let userTierName = null;
    let cancelAtPeriodEnd = false;
    try {
      const us = await db.collection("users").doc(uid).get();
      const u = us.data() || {};
      name = u.name || u.displayName || null;
      email = u.email || null;
      userTierName = u.tierName || null;
      cancelAtPeriodEnd = u.cancelAtPeriodEnd === true;
    } catch (e) {
      logger.warn("listAllSubscriptions: user lookup failed", { uid, error: e.message });
    }
    const cpe = d.currentPeriodEnd;
    rows.push({
      userId: uid,
      subscriptionId: doc.id,
      provider: d.provider || "paypal",
      status: d.status || "active",
      priceId: d.priceId || null, // provider plan id (P-…) — reference only
      productId: d.productId || null,
      tierName: d.tierName || userTierName || null,
      amountMinor: typeof d.amount === "number" ? d.amount : null,
      interval: d.interval || "month",
      currentPeriodEnd:
        typeof cpe === "number" ? cpe * 1000 : cpe?.toMillis ? cpe.toMillis() : null,
      // Set-once createdAt is the true "started" date for new subs; fall back to
      // updatedAt for legacy records written before createdAt existed (so the column
      // shows a sensible date instead of blank).
      startedAt: d.createdAt?.toMillis
        ? d.createdAt.toMillis()
        : d.updatedAt?.toMillis
          ? d.updatedAt.toMillis()
          : null,
      cancelAtPeriodEnd,
    });
  }

  // Newest first by start/period end as a stable-ish ordering.
  rows.sort((a, b) => (b.currentPeriodEnd || 0) - (a.currentPeriodEnd || 0));
  return { ok: true, subscriptions: rows };
});

/**
 * Callable (ADMIN): pause (suspend) a subscriber's PayPal subscription. Admin variant
 * of the client `pauseSubscription` — takes `targetUserId` instead of the caller's uid.
 * Billing stops until resumed; subscriptionId is preserved. No auto-resume date (the
 * admin resumes manually via adminResumeSubscription). The SUSPENDED webhook syncs the
 * neutral record + user doc to `paused`.
 */
const adminPauseSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const targetUserId = req.data?.targetUserId;
  if (!targetUserId) throw new HttpsError("invalid-argument", "targetUserId required.");
  const ref = admin.firestore().collection("users").doc(targetUserId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const u = snap.data() || {};
  const subscriptionId = u.subscriptionId;
  if (!subscriptionId) throw new HttpsError("failed-precondition", "User has no active subscription.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv ?? req.data?.env));
  try {
    await PROVIDERS.paypal.suspendSubscription(subscriptionId, cfg);
    await ref.update({
      subscriptionPaused: true,
      subscriptionStatus: "paused",
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Sync the NEUTRAL subscription record immediately so the admin console's kebab
    // menu + list (which read billing_customers/{uid}/subscriptions/{id}.status) match
    // PayPal right away — don't wait on the (slow/unreliable) SUSPENDED webhook. This
    // is a status-only update; writeSubscriptionRecord preserves priceId/tier/period.
    await fulfillment.writeSubscriptionRecord({
      userId: targetUserId,
      subscriptionId,
      provider: "paypal",
      status: "paused",
    });
    return { ok: true, subscriptionId };
  } catch (err) {
    logger.error("adminPauseSubscription failed", { targetUserId, subscriptionId, error: err.message });
    throw new HttpsError("internal", "Failed to pause the subscription.");
  }
});


/**
 * Callable (ADMIN): resume (re-activate) a paused subscription. Admin variant of the
 * client `resumeSubscription` — takes `targetUserId`. Billing restarts immediately.
 */
const adminResumeSubscription = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const admin = require("firebase-admin");
  const targetUserId = req.data?.targetUserId;
  if (!targetUserId) throw new HttpsError("invalid-argument", "targetUserId required.");
  const ref = admin.firestore().collection("users").doc(targetUserId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");
  const u = snap.data() || {};
  const subscriptionId = u.subscriptionId;
  if (!subscriptionId) throw new HttpsError("failed-precondition", "User has no subscription.");
  const cfg = paypalEnvConfig(normalizePaypalEnv(req.data?.paypalEnv ?? req.data?.env));
  try {
    await PROVIDERS.paypal.activatePaypalSubscription(subscriptionId, cfg);
    await ref.update({
      subscriptionPaused: false,
      subscriptionStatus: "active",
      resumedAt: admin.firestore.FieldValue.serverTimestamp(),
      pauseResumesAt: admin.firestore.FieldValue.delete(),
      pauseDuration: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Sync the NEUTRAL subscription record immediately so the kebab/list show
    // "active" right away (don't wait on the ACTIVATED webhook). Status-only update;
    // writeSubscriptionRecord preserves priceId/tier/period.
    await fulfillment.writeSubscriptionRecord({
      userId: targetUserId,
      subscriptionId,
      provider: "paypal",
      status: "active",
    });
    return { ok: true, subscriptionId };
  } catch (err) {
    logger.error("adminResumeSubscription failed", { targetUserId, subscriptionId, error: err.message });

    throw new HttpsError("internal", "Failed to resume the subscription.");
  }
});


module.exports = {

  paymentWebhook,

  paypalWebhookSandbox,
  paypalWebhookLive,
  cancelPaypalSubscription,
  capturePaypalOrder,
  createPaypalOrder,
  createPaypalCardSetupToken,
  createPaypalSubscriptionWithCard,
  createPaypalSubscription, // Smart Button (no-vault) server-side subscription create
  revisePaypalSubscription, // admin "Change plan" (revise to a different plan id)
  repriceClientSubscription, // admin "Change price" (inline same-plan PATCH override)

  // Subscription Management Console (subscription-management Phase 3) — admin only.
  listPaypalPlans,

  createPaypalPlan,
  updatePaypalPlan,
  setPaypalPlanActive,
  repricePlans,
  listPlanSubscriptions,
  getPaypalSubscriptionDetail,
  listAllSubscriptions, // global all-status subscriptions list (neutral store)
  adminPauseSubscription, // admin pause (suspend) a client's subscription
  adminResumeSubscription, // admin resume (re-activate) a client's subscription


  // Discount codes (Feature 2, phase 1)
  previewDiscount,
  createDiscountCode,
  listDiscountCodes,
  setDiscountCodeActive,
  updateDiscountCode,


  setFulfillmentHooks, // ../index.js injects parity side-effects (welcome email/goal/feed)

  handleEvent, // exported for unit testing
  PROVIDERS,

  // Exported so other modules (e.g. account-deletion.js) can resolve PayPal cfg and
  // bind PayPal secrets to their own callables/functions.
  paypalEnvConfig,
  normalizePaypalEnv,
  PAYPAL_SECRETS,
};



