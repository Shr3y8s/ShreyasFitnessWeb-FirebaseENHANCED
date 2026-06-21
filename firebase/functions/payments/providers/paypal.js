/**
 * PayPal server adapter — the provider-specific half of the seam for PayPal.
 *
 * Exposes:
 *   - verifySignature(req, ctx)  → validates a raw PayPal webhook (via PayPal's
 *     verify-webhook-signature API using PAYPAL_WEBHOOK_ID).
 *   - parseEvent(event)          → maps a verified PayPal event → neutral
 *     PaymentEvent[] (design §3.2/§3.3) that ./fulfillment.js handles.
 *   - cancelSubscription(id)     → calls PayPal to cancel a subscription
 *     (backing the `cancelPaypalSubscription` callable + the client adapter).
 *
 * Dual env (design §7.1): sandbox vs live is chosen by PAYPAL_ENV; credentials,
 * API base, plan→tier map, and webhook id all switch with it.
 *
 * Catalog identity (design §2.6): PayPal subscription webhooks carry only the
 * `plan_id` + our `custom_id` (the Firebase uid). To keep `user.tier` semantics
 * identical to the Stripe path, we resolve `plan_id` → the SAME Stripe product id
 * (`tierId`) + tier name via PLAN_TIER_MAP below, so neutral fulfillment writes the
 * same `tier`/`tierName` it always has.
 *
 * CommonJS (Cloud Functions). No app SDK import; only `https` + `firebase-functions`.
 *
 * See docs/02-implementation/payment-processor/payment-processor-design.md (§3, §7.1)
 */

const https = require("https");
const { logger } = require("firebase-functions");

const PAYPAL_ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const API_BASE = PAYPAL_ENV === "production" ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";

/**
 * Plan id (P-xxxx) → tier identity. `tierId` is the SAME Stripe product id stored
 * in `user.tier` (so check-in eligibility / tier logic is unchanged). Keyed by env
 * because both PayPal plan ids AND Stripe product ids differ sandbox(test)/live.
 *
 * NOTE: dev uses sandbox PayPal + Stripe TEST products; prod uses live PayPal +
 * Stripe LIVE products — they line up. Live plan ids are filled at cutover (Phase 5)
 * when the catalog script is re-run with live credentials.
 */
const PLAN_TIER_MAP = {
  sandbox: {
    "P-98H09129JK640830CNI26BLQ": { tierId: "prod_SwvHrfi1C4k4pS", tierName: "Online Coaching" },
    "P-9YF75345BP118725ENI26GLI": { tierId: "prod_SwvI0SWs0J3DMQ", tierName: "Complete Transformation" },
  },
  production: {
    // TODO(Phase 5): fill live P-xxxx → live Stripe product ids after live catalog run.
    // "P-LIVE_ONLINE_COACHING":        { tierId: "prod_Uiwc6hs1G6YlIf", tierName: "Online Coaching" },
    // "P-LIVE_COMPLETE_TRANSFORMATION":{ tierId: "prod_UiwXMrl2KqquZD", tierName: "Complete Transformation" },
  },
};

function resolvePlanTier(planId) {
  if (!planId) return {};
  const map = PLAN_TIER_MAP[PAYPAL_ENV] || {};
  return map[planId] || {};
}

/** Low-level JSON request to the PayPal REST API. */
function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request({ hostname: API_BASE, path, method, headers }, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => {
        let parsed = {};
        try { parsed = chunks ? JSON.parse(chunks) : {}; } catch { parsed = { raw: chunks }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`${method} ${path} → ${res.statusCode}: ${chunks}`));
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

/** OAuth2 client-credentials token. Reads PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET. */
async function getAccessToken({ clientId, clientSecret }) {
  const id = clientId || process.env.PAYPAL_CLIENT_ID;
  const secret = clientSecret || process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal credentials missing (PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET)");

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const payload = "grant_type=client_credentials";
    const req = https.request(
      {
        hostname: API_BASE,
        path: "/v1/oauth2/token",
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(chunks);
            if (parsed.access_token) resolve(parsed.access_token);
            else reject(new Error(`PayPal token error: ${chunks}`));
          } catch (e) {
            reject(new Error(`PayPal token parse error: ${chunks}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Verify a PayPal webhook by calling PayPal's verify-webhook-signature API.
 * Requires the raw transmission headers + the configured PAYPAL_WEBHOOK_ID.
 * @returns {{ ok: boolean, event?: object, error?: string }}
 */
async function verifySignature(req, ctx = {}) {
  try {
    const webhookId = ctx.paypalWebhookId || process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return { ok: false, error: "PAYPAL_WEBHOOK_ID not set" };

    const h = req.headers || {};
    // PayPal needs the parsed event body as JSON. Cloud Functions gives req.body
    // (parsed) and req.rawBody (Buffer). Use the parsed body for webhook_event.
    const event = req.body && typeof req.body === "object" ? req.body : JSON.parse((req.rawBody || "").toString() || "{}");

    const token = await getAccessToken(ctx);
    const verifyBody = {
      auth_algo: h["paypal-auth-algo"],
      cert_url: h["paypal-cert-url"],
      transmission_id: h["paypal-transmission-id"],
      transmission_sig: h["paypal-transmission-sig"],
      transmission_time: h["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: event,
    };

    const result = await request("POST", "/v1/notifications/verify-webhook-signature", token, verifyBody);
    if (result.verification_status === "SUCCESS") {
      return { ok: true, event };
    }
    logger.error("PayPal webhook verification_status not SUCCESS", { status: result.verification_status });
    return { ok: false, error: `verification_status=${result.verification_status}` };
  } catch (err) {
    logger.error("PayPal webhook signature verification failed", { error: err.message });
    return { ok: false, error: err.message };
  }
}

/** epoch seconds from an ISO string (PayPal uses ISO8601 timestamps). */
function toEpoch(iso) {
  const t = iso ? Date.parse(iso) : Date.now();
  return Math.floor((Number.isNaN(t) ? Date.now() : t) / 1000);
}

/** Parse a PayPal money object → minor units (cents). */
function toMinorUnits(money) {
  if (!money) return 0;
  const value = parseFloat(money.value ?? money.total ?? "0");
  return Math.round((Number.isNaN(value) ? 0 : value) * 100);
}

/**
 * Map a verified PayPal event → neutral PaymentEvent[] (design §3.2/§3.3).
 */
function parseEvent(event) {
  const events = [];
  const type = event?.event_type;
  const r = event?.resource || {};

  switch (type) {
    // ---- Subscriptions ----
    case "BILLING.SUBSCRIPTION.ACTIVATED":
    case "BILLING.SUBSCRIPTION.UPDATED":
    case "BILLING.SUBSCRIPTION.RE-ACTIVATED": {
      const tier = resolvePlanTier(r.plan_id);
      events.push({
        type: "subscription.activated",
        userId: r.custom_id || null,
        subscriptionId: r.id,
        subscription: {
          status: "active",
          priceId: r.plan_id || null,
          productId: tier.tierId || null,
          currentPeriodEnd: r.billing_info?.next_billing_time
            ? toEpoch(r.billing_info.next_billing_time)
            : null,
          tierId: tier.tierId || null,
          tierName: tier.tierName || null,
        },
      });
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED":
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      events.push({
        type: "subscription.canceled",
        userId: r.custom_id || null,
        subscriptionId: r.id,
        // include a subscription marker so the dispatcher updates status (not hard-delete)
        subscription: { status: "canceled" },
      });
      break;
    }

    // ---- Recurring subscription payment (v1 Sale) → transaction record only ----
    case "PAYMENT.SALE.COMPLETED": {
      events.push({
        type: "payment.completed",
        userId: r.custom || r.custom_id || null,
        isSessionPackage: false,
        transaction: {
          id: r.id,
          date: toEpoch(r.create_time),
          amount: toMinorUnits(r.amount),
          currency: r.amount?.currency_code || r.amount?.currency || "usd",
          status: "succeeded",
          productName: "Subscription",
        },
      });
      break;
    }
    case "PAYMENT.SALE.REFUNDED":
    case "PAYMENT.CAPTURE.REFUNDED": {
      events.push({
        type: "payment.refunded",
        userId: r.custom || r.custom_id || null,
        transaction: {
          id: r.id,
          date: toEpoch(r.create_time),
          amount: toMinorUnits(r.amount || r.seller_payable_breakdown?.total_refunded_amount),
          currency: r.amount?.currency_code || "usd",
          status: "refunded",
          productName: "",
        },
      });
      break;
    }

    // ---- One-time order capture (Orders API v2) → session package ----
    case "PAYMENT.CAPTURE.COMPLETED": {
      // custom_id is set on the capture (inherited from the purchase_unit we sent).
      const description = r.invoice_id || r.custom_id_description || "";
      events.push({
        type: "payment.completed",
        userId: r.custom_id || null,
        isSessionPackage: true, // our only PayPal one-time items are session packages
        productId: null,
        productName: description || "Training Sessions",
        transaction: {
          id: r.id,
          date: toEpoch(r.create_time),
          amount: toMinorUnits(r.amount),
          currency: r.amount?.currency_code || "usd",
          status: "succeeded",
          productName: description || "Training Sessions",
        },
      });
      break;
    }
    case "CHECKOUT.ORDER.APPROVED": {
      // IMPORTANT: do NOT fulfill on APPROVED. For an Orders purchase PayPal fires
      // BOTH this event (approval, not yet captured) AND PAYMENT.CAPTURE.COMPLETED
      // (money actually captured) — with different ids, so fulfilling both would
      // double-create the session package. Capture is the source of truth; approval
      // is ignored here. (Approval ≠ payment.)
      logger.info("Ignoring CHECKOUT.ORDER.APPROVED (fulfillment happens on PAYMENT.CAPTURE.COMPLETED)", { orderId: r.id });
      break;
    }


    default:
      logger.info("Unhandled PayPal event_type", { type });
      break;
  }

  return events;
}

/**
 * Cancel a PayPal subscription (backs the cancelPaypalSubscription callable).
 * @param {string} subscriptionId
 * @param {object} ctx { clientId, clientSecret } optional override
 */
async function cancelSubscription(subscriptionId, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  const token = await getAccessToken(ctx);
  await request(
    "POST",
    `/v1/billing/subscriptions/${subscriptionId}/cancel`,
    token,
    { reason: "Canceled by customer" }
  );
}

/**
 * Capture a one-time PayPal Order SERVER-SIDE (Orders API v2).
 *
 * The browser SDK's `actions.order.capture()` is unreliable for unbranded/guest-card
 * orders (returns ack: permission_denied / "Insufficient privileges"). Our server
 * credentials have full capture privilege, so we capture here instead. The
 * PAYMENT.CAPTURE.COMPLETED webhook still performs neutral fulfillment.
 * @param {string} orderId
 * @param {object} ctx { clientId, clientSecret } optional override
 * @returns the PayPal capture response (status COMPLETED on success)
 */
async function captureOrder(orderId, ctx = {}) {
  if (!orderId) throw new Error("orderId required");
  const token = await getAccessToken(ctx);
  return request(
    "POST",
    `/v2/checkout/orders/${orderId}/capture`,
    token,
    {} // empty body; PayPal requires a body for this POST
  );
}

// One-time amounts (minor units) — mirrors app constants.ts PAYPAL_ONETIME. Kept
// server-side so order creation can't be tampered with from the client.
const ONETIME_AMOUNTS = {
  IN_PERSON: { amount: 7500, label: "In-Person Training Session" },
  IN_PERSON_4PACK: { amount: 24000, label: "4-Pack In-Person Sessions" },
};

/**
 * Create a one-time PayPal Order SERVER-SIDE (ACDC card-fields flow). The amount is
 * resolved from ONETIME_AMOUNTS (never trusted from the client). `custom_id` carries
 * the uid so the webhook maps the capture → user.
 * @returns the created order id
 */
async function createOrder(priceId, customId, ctx = {}) {
  const item = ONETIME_AMOUNTS[priceId];
  if (!item) throw new Error(`Unknown one-time item: ${priceId}`);
  const token = await getAccessToken(ctx);
  const order = await request("POST", "/v2/checkout/orders", token, {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: (item.amount / 100).toFixed(2) },
        description: item.label,
        custom_id: customId || undefined,
      },
    ],
  });
  return order.id;
}

/**
 * Create a vault SETUP TOKEN for a card (ACDC subscription flow). The client's
 * CardFields collects the card into this token; we then exchange it for a payment
 * token and create the subscription. Returns the setup token id.
 */
async function createCardSetupToken(ctx = {}) {
  const token = await getAccessToken(ctx);
  const res = await request("POST", "/v3/vault/setup-tokens", token, {
    payment_source: { card: {} },
  });
  return res.id;
}

/**
 * Create a subscription billed to a vaulted CARD (ACDC). Exchanges the card setup
 * token → permanent payment token, then creates the Billing Plan subscription with
 * that vaulted payment source. `custom_id` carries the uid for the webhook.
 * @returns the created subscription (id + status)
 */
async function createSubscriptionWithCard(setupToken, planId, customId, ctx = {}) {
  if (!setupToken) throw new Error("setupToken required");
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);

  // 1) Exchange setup token → permanent payment token (vaulted card).
  const paymentToken = await request("POST", "/v3/vault/payment-tokens", token, {
    payment_source: { token: { id: setupToken, type: "SETUP_TOKEN" } },
  });

  // 2) Create the subscription using the vaulted card as the payment source.
  const subscription = await request("POST", "/v1/billing/subscriptions", token, {
    plan_id: planId,
    custom_id: customId || undefined,
    payment_source: {
      token: { id: paymentToken.id, type: "PAYMENT_METHOD_TOKEN" },
    },
  });
  return subscription;
}



module.exports = {
  name: "paypal",
  verifySignature,
  parseEvent,
  cancelSubscription,
  captureOrder,
  createOrder,
  createCardSetupToken,
  createSubscriptionWithCard,

  // exported for tests / reuse
  getAccessToken,
  resolvePlanTier,
  PLAN_TIER_MAP,
};
