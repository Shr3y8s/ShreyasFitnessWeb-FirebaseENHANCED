/**
 * Stripe server adapter — reference implementation of the provider seam.
 *
 * Exposes `verifySignature(req)` and `parseEvent(req)` that the generic
 * `paymentWebhook` (../index.js) uses to turn a raw Stripe webhook into a
 * provider-NEUTRAL PaymentEvent, which neutral fulfillment then handles.
 *
 * This proves the generic path on a provider we already understand before the
 * PayPal adapter is added. It is NOT yet wired as the live webhook — the
 * invertase extension + the existing triggers in ../index.js remain the live
 * Stripe path until cutover (design §8). This adapter exists so the generic
 * `paymentWebhook` has a working reference and so the event-mapping table
 * (design §3.3) is executable.
 *
 * See docs/02-implementation/payment-processor/payment-processor-design.md (§3)
 */

const { logger } = require("firebase-functions");

/**
 * Verify the Stripe webhook signature. Requires the raw request body
 * (req.rawBody, which Cloud Functions provides) and the endpoint secret.
 * @returns {{ ok: boolean, event?: object, error?: string }}
 */
function verifySignature(req, { stripeSecretKey, webhookSecret }) {
  try {
    const stripe = require("stripe")(stripeSecretKey, {
      apiVersion: "2024-09-30.acacia",
    });
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    return { ok: true, event };
  } catch (err) {
    logger.error("Stripe webhook signature verification failed", { error: err.message });
    return { ok: false, error: err.message };
  }
}

/**
 * Map a verified Stripe event → neutral PaymentEvent(s).
 * Returns an array (some events produce none we care about).
 *
 * Neutral PaymentEvent shapes (design §3.2):
 *   { type:'subscription.activated'|'subscription.updated', userId, subscription:{...} }
 *   { type:'subscription.canceled', userId, subscriptionId }
 *   { type:'payment.completed', userId, transaction, isSessionPackage, productId, productName }
 *   { type:'payment.refunded', userId, transaction }
 */
function parseEvent(stripeEvent) {
  const events = [];
  const obj = stripeEvent?.data?.object || {};
  const metadata = obj.metadata || {};
  const userId = metadata.userId || null;

  switch (stripeEvent.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const status = obj.status; // active | canceled | past_due | ...
      events.push({
        type: status === "canceled" ? "subscription.canceled" : "subscription.activated",
        userId,
        subscriptionId: obj.id,
        subscription: {
          status,
          priceId: obj.items?.data?.[0]?.price?.id || null,
          productId: obj.items?.data?.[0]?.price?.product || null,
          currentPeriodEnd: obj.current_period_end || null,
          tierId: metadata.tierId || null,
          tierName: metadata.tierName || null,
        },
      });
      break;
    }
    case "customer.subscription.deleted": {
      events.push({ type: "subscription.canceled", userId, subscriptionId: obj.id });
      break;
    }
    case "payment_intent.succeeded": {
      const isSessionPackage = metadata.type === "session_package";
      events.push({
        type: "payment.completed",
        userId,
        isSessionPackage,
        productId: metadata.tierId || null,
        productName: metadata.tierName || null,
        transaction: {
          id: obj.id,
          date: obj.created,
          amount: obj.amount_received ?? obj.amount,
          currency: obj.currency,
          status: "succeeded",
          productName: metadata.tierName || "",
        },
      });
      break;
    }
    case "charge.refunded": {
      events.push({
        type: "payment.refunded",
        userId,
        transaction: {
          id: obj.payment_intent || obj.id,
          date: obj.created,
          amount: obj.amount_refunded,
          currency: obj.currency,
          status: "refunded",
          productName: "",
        },
      });
      break;
    }
    default:
      break;
  }

  return events;
}

module.exports = { name: "stripe", verifySignature, parseEvent };
