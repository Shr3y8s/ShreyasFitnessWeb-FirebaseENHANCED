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

const { onRequest } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const fulfillment = require("./fulfillment");

// Provider registry. PayPal/Paddle adapters are added in their phases.
const PROVIDERS = {
  stripe: require("./providers/stripe"),
  // paypal: require("./providers/paypal"),  // Phase 3
  // paddle: require("./providers/paddle"),  // Phase 4
};

/**
 * Dispatch a single neutral PaymentEvent to fulfillment.
 */
async function handleEvent(providerName, e) {
  switch (e.type) {
    case "subscription.activated":
    case "subscription.updated":
      await fulfillment.activateSubscription({
        userId: e.userId,
        subscriptionId: e.subscriptionId,
        provider: providerName,
        status: e.subscription?.status || "active",
        priceId: e.subscription?.priceId,
        productId: e.subscription?.productId,
        tierId: e.subscription?.tierId,
        tierName: e.subscription?.tierName,
        currentPeriodEnd: e.subscription?.currentPeriodEnd,
      });
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
const paymentWebhook = onRequest({ region: "us-west1" }, async (req, res) => {
  const providerName = (req.query.provider || process.env.PAYMENT_PROVIDER || "stripe").toString();
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

module.exports = {
  paymentWebhook,
  handleEvent, // exported for unit testing
  PROVIDERS,
};
