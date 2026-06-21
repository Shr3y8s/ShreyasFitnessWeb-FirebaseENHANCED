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

// PayPal secrets (Secret Manager). Declared here so the functions below can read
// them via process.env at runtime. Set with:
//   firebase functions:secrets:set PAYPAL_CLIENT_ID
//   firebase functions:secrets:set PAYPAL_CLIENT_SECRET
//   firebase functions:secrets:set PAYPAL_WEBHOOK_ID
// (PAYPAL_ENV is a plain env var; the adapter defaults to "sandbox" when unset.)
const PAYPAL_CLIENT_ID = defineSecret("PAYPAL_CLIENT_ID");
const PAYPAL_CLIENT_SECRET = defineSecret("PAYPAL_CLIENT_SECRET");
const PAYPAL_WEBHOOK_ID = defineSecret("PAYPAL_WEBHOOK_ID");
const PAYPAL_SECRETS = [PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_WEBHOOK_ID];


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
        },
        fulfillmentHooks
      );
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
        });
      }
      if (e.transaction) {
        await fulfillment.writeTransactionRecord({
          userId: e.userId,
          transaction: e.transaction,
          provider: providerName,
        });
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
  return (process.env.PAYMENT_PROVIDER || "stripe").toString();
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
  const verifyCtx = {
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    paypalWebhookId: process.env.PAYPAL_WEBHOOK_ID,
    paypalEnv: process.env.PAYPAL_ENV,
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
    events = (await provider.parseEvent(verified.event)) || [];
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

  try {
    await PROVIDERS.paypal.cancelSubscription(subscriptionId);
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

  try {
    const result = await PROVIDERS.paypal.captureOrder(orderId);
    const status = result?.status || result?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
    return { ok: true, status: status || "COMPLETED" };
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
  try {
    const orderId = await PROVIDERS.paypal.createOrder(priceId, uid);
    return { ok: true, orderId };
  } catch (err) {
    logger.error("createPaypalOrder failed", { uid, priceId, error: err.message });
    throw new HttpsError("internal", "Failed to create order.");
  }
});

/**
 * Callable: create a vault SETUP TOKEN so the client's ACDC card fields can vault a
 * card for a subscription. Returns the setup token id.
 */
const createPaypalCardSetupToken = onCall({ region: "us-west1", secrets: PAYPAL_SECRETS }, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  try {
    const setupToken = await PROVIDERS.paypal.createCardSetupToken();
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
  try {
    const sub = await PROVIDERS.paypal.createSubscriptionWithCard(setupToken, planId, uid);
    return { ok: true, subscriptionId: sub?.id, status: sub?.status };
  } catch (err) {
    logger.error("createPaypalSubscriptionWithCard failed", { uid, planId, error: err.message });
    throw new HttpsError("internal", "Failed to create subscription.");
  }
});

module.exports = {
  paymentWebhook,
  cancelPaypalSubscription,
  capturePaypalOrder,
  createPaypalOrder,
  createPaypalCardSetupToken,
  createPaypalSubscriptionWithCard,


  setFulfillmentHooks, // ../index.js injects parity side-effects (welcome email/goal/feed)
  handleEvent, // exported for unit testing
  PROVIDERS,
};


