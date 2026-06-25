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

/**
 * Dual-environment (design §7.1): ONE deployed Functions backend serves BOTH the
 * PayPal sandbox (used by `npm run dev`) and live (prod build). Because there's a
 * single backend, each request carries its env and we resolve credentials + API
 * base per call — never from a single module-level constant:
 *   - Callables (B1): client passes `paypalEnv` (from NEXT_PUBLIC_PAYPAL_ENV); the
 *     callable wrapper builds the cfg and passes it in.
 *   - Webhooks: two thin functions (`paypalWebhookSandbox`/`paypalWebhookLive`) each
 *     bind only their env's secrets and pass the matching cfg.
 *
 * `cfg` shape (built in payments/index.js `paypalEnvConfig`):
 *   { base, clientId, clientSecret, webhookId }
 * Every helper below takes `cfg` so the right API base + creds are used.
 */
function apiBaseForEnv(env) {
  return env === "production" ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";
}

/**
 * Plan id (P-xxxx) → tier identity. `tierId` is the SAME Stripe product id stored
 * in `user.tier` (so check-in eligibility / tier logic is unchanged). Both PayPal
 * plan ids AND Stripe product ids differ sandbox/live, but plan ids are globally
 * unique, so we keep ONE merged map and look up by plan id regardless of env (the
 * webhook that delivered the event already determined the env via its function).
 */
// `tierId` is the provider-neutral APP PRODUCT ID (app/src/lib/constants.ts
// APP_PRODUCTS) stored in `user.tier`. Plan ids are globally unique, so one merged
// map works for both envs; both sandbox and live plans map to the SAME app id.
const PLAN_TIER_MAP = {
  // sandbox
  "P-98H09129JK640830CNI26BLQ": { tierId: "online_coaching", tierName: "Online Coaching" },
  "P-9YF75345BP118725ENI26GLI": { tierId: "complete_transformation", tierName: "Complete Transformation" },
  // live (prod catalog run 2026-06-21)
  "P-96194639LX633004DNI4ANSI": { tierId: "online_coaching", tierName: "Online Coaching" },
  "P-3S168526T8851291KNI4ANSI": { tierId: "complete_transformation", tierName: "Complete Transformation" },
};


function resolvePlanTier(planId) {
  if (!planId) return {};
  return PLAN_TIER_MAP[planId] || {};
}


/**
 * Low-level JSON request to the PayPal REST API. `base` is the per-request API host
 * (sandbox vs live). Falls back to the sandbox host only as a last resort.
 */
function request(method, path, token, body, base) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const hostname = base || apiBaseForEnv("sandbox");
    const req = https.request({ hostname, path, method, headers }, (res) => {
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

/**
 * OAuth2 client-credentials token. `cfg` = { clientId, clientSecret, base } for the
 * target env (built by payments/index.js `paypalEnvConfig`).
 */
async function getAccessToken(cfg = {}) {
  const id = cfg.clientId || process.env.PAYPAL_CLIENT_ID;
  const secret = cfg.clientSecret || process.env.PAYPAL_CLIENT_SECRET;
  const base = cfg.base || apiBaseForEnv("sandbox");
  if (!id || !secret) throw new Error("PayPal credentials missing (clientId/clientSecret)");

  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${id}:${secret}`).toString("base64");
    const payload = "grant_type=client_credentials";
    const req = https.request(
      {
        hostname: base,
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

    const result = await request("POST", "/v1/notifications/verify-webhook-signature", token, verifyBody, ctx.base);

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
 * Fetch a subscription's plan_id via the PayPal REST API.
 * A recurring-charge webhook (PAYMENT.SALE.COMPLETED) carries the SUBSCRIPTION id
 * (billing_agreement_id) but NOT the plan_id / tier — so we dereference the
 * subscription to recover its plan. Returns null on any failure (caller fail-soft).
 * @param {string} subscriptionId  PayPal subscription id (I-xxxx)
 * @param {object} ctx { clientId, clientSecret, base }
 */
async function getSubscriptionPlanId(subscriptionId, ctx = {}) {
  if (!subscriptionId) return null;
  try {
    const token = await getAccessToken(ctx);
    const sub = await request("GET", `/v1/billing/subscriptions/${subscriptionId}`, token, null, ctx.base);
    return sub?.plan_id || null;
  } catch (err) {
    logger.warn("getSubscriptionPlanId failed (falling back)", { subscriptionId, error: err.message });
    return null;
  }
}

/**
 * Map a verified PayPal event → neutral PaymentEvent[] (design §3.2/§3.3).
 * `ctx` is the per-request PayPal cfg ({base,clientId,clientSecret,...}); it's used
 * for the subscription→plan lookup on recurring charges. async because that lookup
 * hits the PayPal API. (The Stripe adapter's parseEvent ignores the extra arg.)
 */
async function parseEvent(event, ctx = {}) {
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
          // ACTUAL charged amount (post-discount), minor units — for accurate MRR.
          amount: r.billing_info?.last_payment?.amount
            ? toMinorUnits(r.billing_info.last_payment.amount)
            : null,
          interval: "month",
        },
      });
      break;
    }
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      events.push({
        type: "subscription.canceled",
        userId: r.custom_id || null,
        subscriptionId: r.id,
        // include a subscription marker so the dispatcher updates status (not hard-delete)
        subscription: { status: "canceled" },
      });
      break;
    }

    // SUSPENDED is a PAUSE, not a cancellation. PayPal fires this both when our
    // pauseSubscription callable calls /suspend AND when PayPal suspends a sub
    // itself (e.g. repeated failed payments). It MUST NOT hard-cancel or clear the
    // subscriptionId — the sub stays recoverable (resume = /activate). We emit a
    // distinct neutral `subscription.paused` so the dispatcher sets status=paused
    // and the membership "paused" flag while preserving subscriptionId.
    case "BILLING.SUBSCRIPTION.SUSPENDED": {
      events.push({
        type: "subscription.paused",
        userId: r.custom_id || null,
        subscriptionId: r.id,
        subscription: { status: "paused" },
      });
      break;
    }


    // ---- Recurring subscription payment (v1 Sale) → transaction + renewal sync ----
    case "PAYMENT.SALE.COMPLETED": {
      // The Sale event carries the SUBSCRIPTION id (billing_agreement_id) but NOT
      // the plan_id/tier/custom_id/next_billing_time. Dereference the subscription
      // once to recover: tier name (for the transaction label), the uid
      // (custom_id — the Sale event's own `custom` is often absent), and the next
      // billing date (to roll the membership "Next Billing" / currentPeriodEnd
      // forward on each renewal). Fail-soft: any lookup miss keeps generic values.
      let subProductName = "Subscription";
      let renewalUserId = r.custom || r.custom_id || null;
      let nextBillingEpoch = null;
      const subId = r.billing_agreement_id || null;
      if (subId) {
        try {
          const token = await getAccessToken(ctx);
          const sub = await request("GET", `/v1/billing/subscriptions/${subId}`, token, null, ctx.base);
          const tier = resolvePlanTier(sub?.plan_id);
          if (tier.tierName) subProductName = tier.tierName;
          if (sub?.custom_id) renewalUserId = sub.custom_id;
          if (sub?.billing_info?.next_billing_time) {
            nextBillingEpoch = toEpoch(sub.billing_info.next_billing_time);
          }
        } catch (err) {
          logger.warn("PAYMENT.SALE.COMPLETED subscription lookup failed (fail-soft)", { subId, error: err.message });
        }
      }
      events.push({
        type: "payment.completed",
        userId: renewalUserId,
        isSessionPackage: false,
        // Renewal marker so the dispatcher rolls user-doc billing fields forward
        // (lastPaymentDate / lastPaymentAmount / currentPeriodEnd) for the dashboard.
        subscriptionRenewal: {
          userId: renewalUserId,
          amount: toMinorUnits(r.amount),
          currentPeriodEnd: nextBillingEpoch,
        },
        transaction: {
          id: r.id,
          date: toEpoch(r.create_time),
          amount: toMinorUnits(r.amount),
          currency: r.amount?.currency_code || r.amount?.currency || "usd",
          status: "succeeded",
          productName: subProductName,
          type: "subscription", // recurring subscription charge
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
      const minor = toMinorUnits(r.amount);
      // Resolve product identity. PREFER the threaded custom_id token (uid +
      // productId + discount code) so a DISCOUNTED capture still resolves the right
      // product — the captured amount no longer matches the catalog amount once a
      // discount is applied. Fall back to amount→product inference for the legacy
      // no-discount path (custom_id is the bare uid there).
      const parsedCustom = parseOrderCustomId(r.custom_id);
      const captureUserId = parsedCustom.userId || r.custom_id || null;
      let item = parsedCustom.productId ? resolveOneTimeByAppId(parsedCustom.productId) : null;
      if (!item) item = resolveOneTimeByAmount(minor);
      const appProductName = item ? item.label : "Training Sessions";
      events.push({
        type: "payment.completed",
        userId: captureUserId,
        isSessionPackage: true, // our only PayPal one-time items are session packages
        productId: item ? item.appId : null, // provider-neutral app product id
        productName: appProductName,
        quantity: item ? item.quantity : undefined,
        // Discount redemption marker (Phase 1): when the order carried a code, the
        // dispatcher records the redemption on fulfillment (idempotent on capture id).
        discountRedemption: parsedCustom.code
          ? {
              code: parsedCustom.code,
              userId: captureUserId,
              mode: "payment",
              productId: item ? item.appId : null,
              originalAmount: parsedCustom.originalAmount ?? (item ? item.amount : null),
              discountedAmount: minor,
              transactionId: r.id,
            }
          : null,
        transaction: {

          id: r.id,
          date: toEpoch(r.create_time),
          amount: minor,
          currency: r.amount?.currency_code || "usd",
          status: "succeeded",
          productName: appProductName,
          type: "one_time", // one-time session-package purchase
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
    { reason: "Canceled by customer" },
    ctx.base
  );

}

/**
 * Suspend (pause) a PayPal subscription (POST /v1/billing/subscriptions/{id}/suspend).
 * Billing stops until the subscription is /activate'd again. Backs the neutral
 * `pauseSubscription` callable's PayPal branch. PayPal has no native auto-resume
 * date, so a scheduled function re-activates at the stored `pauseResumesAt`.
 * @param {string} subscriptionId
 * @param {object} ctx { clientId, clientSecret, base }
 */
async function suspendSubscription(subscriptionId, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  const token = await getAccessToken(ctx);
  await request(
    "POST",
    `/v1/billing/subscriptions/${subscriptionId}/suspend`,
    token,
    { reason: "Paused by customer" },
    ctx.base
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
    {}, // empty body; PayPal requires a body for this POST
    ctx.base
  );

}

/**
 * Refund a PayPal capture, fully or partially (Payments API v2).
 *
 * Backs neutral session-credit refunds (e.g. the account-deletion "GDPR-clean"
 * flow). `captureId` is the provider's capture/transaction id — i.e. the neutral
 * `sessionPackages[].providerTransactionId`. Omit `amount` for a FULL refund;
 * pass minor units (cents) for a partial refund.
 *
 * NOTE: This capability is implemented and exported for reuse, but is NOT yet
 * wired into deleteAccount — that path is deferred to the deletion review.
 *
 * @param {string} captureId  PayPal capture id (providerTransactionId)
 * @param {object} [opts] { amountMinorUnits?: number, currency?: string }
 * @param {object} ctx { clientId, clientSecret, base }
 * @returns the PayPal refund response (status COMPLETED on success)
 */
async function refundCapture(captureId, opts = {}, ctx = {}) {
  if (!captureId) throw new Error("captureId required");
  const token = await getAccessToken(ctx);
  const body =
    opts.amountMinorUnits != null
      ? {
          amount: {
            value: (opts.amountMinorUnits / 100).toFixed(2),
            currency_code: opts.currency || "USD",
          },
        }
      : {}; // empty body = full refund
  return request(
    "POST",
    `/v2/payments/captures/${captureId}/refund`,
    token,
    body,
    ctx.base
  );
}

// One-time amounts (minor units) — mirrors app constants.ts PAYPAL_ONETIME. Kept

// server-side so order creation can't be tampered with from the client. `appId`
// is the provider-neutral product id stored in Firestore (sessionPackages.productId).
const ONETIME_AMOUNTS = {
  IN_PERSON: { amount: 7500, label: "In-Person Training Session", appId: "in_person", quantity: 1 },
  IN_PERSON_4PACK: { amount: 24000, label: "4-Pack In-Person Sessions", appId: "in_person_4pack", quantity: 4 },
};

/**
 * Resolve a one-time capture's neutral product identity from its amount (minor
 * units). One-time PayPal amounts are distinct ($75 vs $240), so the capture
 * amount unambiguously identifies the app product — the capture webhook payload
 * doesn't reliably carry the order's line-item description.
 */
function resolveOneTimeByAmount(minorUnits) {
  for (const v of Object.values(ONETIME_AMOUNTS)) {
    if (v.amount === minorUnits) return v;
  }
  return null;
}

/** Resolve a one-time item by its neutral app product id (e.g. "in_person_4pack"). */
function resolveOneTimeByAppId(appId) {
  if (!appId) return null;
  for (const v of Object.values(ONETIME_AMOUNTS)) {
    if (v.appId === appId) return v;
  }
  return null;
}

/**
 * Parse an order `custom_id`. For discounted orders we thread a compact JSON token
 * {u:uid, p:appProductId, c:code, o:originalMinor}; for the legacy no-discount path
 * it's the bare uid string. Returns a normalized
 * { userId, productId, code, originalAmount }.
 */
function parseOrderCustomId(customId) {
  if (!customId || typeof customId !== "string") {
    return { userId: null, productId: null, code: null, originalAmount: null };
  }
  if (customId.startsWith("{")) {
    try {
      const o = JSON.parse(customId);
      return {
        userId: o.u || null,
        productId: o.p || null,
        code: o.c || null,
        originalAmount: typeof o.o === "number" ? o.o : null,
      };
    } catch {
      // Fall through to bare-uid handling.
    }
  }
  return { userId: customId, productId: null, code: null, originalAmount: null };
}



/**
 * Create a one-time PayPal Order SERVER-SIDE (ACDC card-fields flow). The amount is
 * resolved from ONETIME_AMOUNTS (never trusted from the client). `custom_id` carries
 * the uid so the webhook maps the capture → user.
 * @returns the created order id
 */
async function createOrder(priceId, customId, ctx = {}, opts = {}) {
  const item = ONETIME_AMOUNTS[priceId];
  if (!item) throw new Error(`Unknown one-time item: ${priceId}`);
  const token = await getAccessToken(ctx);

  // Amount: server-resolved. When a validated discount is applied the caller passes
  // `discountedAmountMinor` (already floored/computed server-side via discounts.js);
  // otherwise we use the catalog amount. The client NEVER supplies the amount.
  const amountMinor =
    opts.discountedAmountMinor != null ? opts.discountedAmountMinor : item.amount;

  // Thread the neutral app productId (and discount code) through custom_id as a
  // compact JSON token so the capture path can resolve the product WITHOUT relying
  // on amount→product inference (which breaks once a discount changes the amount).
  // Falls back to the bare uid for the no-discount path (back-compat).
  const orderCustomId =
    opts.discountedAmountMinor != null || opts.discountCode
      ? JSON.stringify({
          u: customId || null, // the uid (createOrder's customId param)
          p: item.appId,
          c: opts.discountCode || null,
          o: item.amount, // original amount (minor units) for redemption records
        }).slice(0, 127) // PayPal custom_id max length is 127 chars
      : customId || undefined;

  const order = await request("POST", "/v2/checkout/orders", token, {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: { currency_code: "USD", value: (amountMinor / 100).toFixed(2) },
        description: item.label,
        custom_id: orderCustomId,
      },
    ],
  }, ctx.base);

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
  }, ctx.base);
  return res.id;
}

/**
 * Create a subscription billed to a vaulted CARD (ACDC). Exchanges the card setup
 * token → permanent payment token, then creates the Billing Plan subscription with
 * that vaulted payment source. `custom_id` carries the uid for the webhook.
 * @param {string} setupToken  vault setup token id (from createCardSetupToken)
 * @param {string} planId      PayPal billing plan id (P-xxxx)
 * @param {string} customId    Firebase uid (carried as custom_id for the webhook)
 * @param {string} email       buyer email — REQUIRED with card.vault_id (see below)
 * @param {object} ctx         { clientId, clientSecret, base }
 * @returns the created subscription (id + status)
 */
async function createSubscriptionWithCard(setupToken, planId, customId, email, ctx = {}) {
  if (!setupToken) throw new Error("setupToken required");
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);

  // 1) Exchange setup token → permanent payment token (vaulted card).
  const paymentToken = await request("POST", "/v3/vault/payment-tokens", token, {
    payment_source: { token: { id: setupToken, type: "SETUP_TOKEN" } },
  }, ctx.base);

  // DIAGNOSTIC: confirm the vault exchange actually returned a usable token id.
  // If `paymentToken.id` is empty (card not captured / Vault disabled / empty
  // fields), PayPal would ignore the `vault_id` and 400 asking for raw
  // number/expiry — so we log id + status (NEVER full PAN) to disambiguate.
  logger.info("createSubscriptionWithCard: vault payment-token", {
    hasId: !!paymentToken?.id,
    paymentTokenId: paymentToken?.id || null,
    paymentTokenStatus: paymentToken?.status || null,
  });

  // GUARD: never POST an empty `card: {}` — fail with a clear cause instead of the
  // confusing MISSING_REQUIRED_PARAMETER(number/expiry) 400.
  if (!paymentToken?.id) {
    throw new Error(
      "Vault payment token has no id — the card was not captured (Vault may be disabled on the PayPal app, or the card fields were empty)."
    );
  }

  // 2) Create the subscription using the vaulted card as the payment source.
  //
  // CRITICAL payload shape: the vaulted-card token id goes under
  // `subscriber.payment_source.card.vault_id` (just the token id — NOT raw card
  // fields, and NOT the top-level `payment_source.token` form).
  //
  // `subscriber.email_address` is REQUIRED here. Without it, PayPal does NOT
  // interpret the nested `card` object as a vault REFERENCE — it falls back to
  // treating `card` as an INLINE raw-card entry and rejects the request with
  // 400 INVALID_REQUEST / MISSING_REQUIRED_PARAMETER for `card/number` and
  // `card/expiry`. Supplying the email flips PayPal into vault-reference mode so it
  // charges the vaulted card immediately and activates the subscription (status
  // ACTIVE + first charge), emitting BILLING.SUBSCRIPTION.ACTIVATED. This is why
  // Online Coaching (no setup fee) previously never activated.
  //
  // We intentionally omit `application_context` (return_url/cancel_url/user_action):
  // those only apply to the redirect-approval flow and can push PayPal to expect a
  // redirect; this token flow has no approval page.
  const subscriptionBody = {
    plan_id: planId,
    custom_id: customId || undefined,
    subscriber: {
      email_address: email || undefined,
      payment_source: {
        card: { vault_id: paymentToken.id },
      },
    },
  };

  // DIAGNOSTIC: log the EXACT body we send so we can confirm vault_id is populated
  // (structured logger.info for the firebase MCP log reader + raw console.log).
  logger.info("createSubscriptionWithCard: subscription request body", {
    body: JSON.stringify(subscriptionBody, null, 2),
  });
  console.log("Subscription request body:", JSON.stringify(subscriptionBody, null, 2));

  const subscription = await request("POST", "/v1/billing/subscriptions", token, subscriptionBody, ctx.base);
  return subscription;

}


/**
 * Explicitly ACTIVATE a subscription that PayPal left in APPROVAL_PENDING
 * (POST /v1/billing/subscriptions/{id}/activate). Used as a fallback when the
 * synchronous create + GET-status confirmation still shows a non-ACTIVE status —
 * we nudge PayPal to activate, then re-GET and only fulfill on confirmed ACTIVE.
 * @param {string} subscriptionId  PayPal subscription id (I-xxxx)
 * @param {object} ctx { clientId, clientSecret, base }
 */
async function activateSubscription(subscriptionId, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  const token = await getAccessToken(ctx);
  await request(
    "POST",
    `/v1/billing/subscriptions/${subscriptionId}/activate`,
    token,
    { reason: "Activating subscription" },
    ctx.base
  );
}


/**
 * Fetch a subscription's authoritative state from PayPal.
 * Used for SYNCHRONOUS fulfillment confirmation (design: don't depend on webhook
 * timing for the happy path): after creating the subscription we GET it and only
 * fulfill when `status === 'ACTIVE'` (real first charge taken). Returns the full
 * subscription object ({ id, status, billing_info, ... }).
 * @param {string} subscriptionId  PayPal subscription id (I-xxxx)
 * @param {object} ctx { clientId, clientSecret, base }
 */
async function getSubscription(subscriptionId, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  const token = await getAccessToken(ctx);
  return request("GET", `/v1/billing/subscriptions/${subscriptionId}`, token, null, ctx.base);
}




module.exports = {
  name: "paypal",
  verifySignature,
  parseEvent,
  cancelSubscription,
  suspendSubscription,
  captureOrder,
  refundCapture,
  createOrder,


  createCardSetupToken,
  createSubscriptionWithCard,
  // exported under an explicit name so callers don't confuse it with
  // fulfillment.activateSubscription (which writes accountActivated to Firestore).
  activatePaypalSubscription: activateSubscription,
  getSubscription,
  resolveOneTimeByAmount, // used by capturePaypalOrder for synchronous fulfillment
  resolveOneTimeByAppId, // resolve product by neutral app id (discounted captures)
  parseOrderCustomId, // decode the threaded uid/productId/code custom_id token



  // exported for tests / reuse

  getAccessToken,
  resolvePlanTier,
  PLAN_TIER_MAP,
};


