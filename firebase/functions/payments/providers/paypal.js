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
  // sandbox (2-cycle base plans, minted 2026-06-27)
  "P-1UL86855135904642NJAFK4I": { tierId: "online_coaching", tierName: "Online Coaching" },
  "P-28C55086862794508NJAFK4I": { tierId: "complete_transformation", tierName: "Complete Transformation" },
  // live (2-cycle base plans, re-minted 2026-06-28)
  "P-4EM46614UA100974ENJA7U3A": { tierId: "online_coaching", tierName: "Online Coaching" },
  "P-8D877538ML425510RNJA7U3I": { tierId: "complete_transformation", tierName: "Complete Transformation" },
};



function resolvePlanTier(planId) {
  if (!planId) return {};
  return PLAN_TIER_MAP[planId] || {};
}

/**
 * Registry-backed tier resolution (subscription-management-design.md §2, FR-3).
 *
 * Plan ids are migrating OUT of source code into a Firestore `paypalPlans/{planId}`
 * registry so plans CREATED/REPRICED at runtime (admin console) resolve their tier
 * without a redeploy. Lookup order:
 *   1. in-code PLAN_TIER_MAP — fast path + safety seed for the known base ids.
 *   2. Firestore `paypalPlans/{planId}` — authoritative for everything else.
 *
 * Kept async + separate from the sync `resolvePlanTier` (still used as the in-memory
 * fallback). The webhook dispatch path (`parseEvent`) awaits this. Requires
 * firebase-admin initialized (it is, in the functions runtime). Best-effort: on any
 * Firestore error we fall back to the in-code map so webhooks never hard-fail.
 */
async function resolvePlanTierAsync(planId) {
  if (!planId) return {};
  const local = PLAN_TIER_MAP[planId];
  if (local) return local;
  try {
    const admin = require("firebase-admin");
    const snap = await admin.firestore().collection("paypalPlans").doc(planId).get();
    if (snap.exists) {
      const d = snap.data() || {};
      if (d.tierId) return { tierId: d.tierId, tierName: d.tierName || null };
    }
  } catch (e) {
    logger.warn("resolvePlanTierAsync registry lookup failed; using in-code map", {
      planId,
      error: e.message,
    });
  }
  return {};
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
      // Registry-backed resolution (FR-3): in-code map first, then Firestore
      // `paypalPlans` — so runtime-created/repriced plans resolve their tier.
      const tier = await resolvePlanTierAsync(r.plan_id);

      // custom_id is normally the bare uid, but the Smart Button discount path
      // (Feature 2 / T9) threads a JSON token {u,c,p,o} so the webhook can record
      // the redemption. parseOrderCustomId handles both shapes (bare uid → userId).
      const parsedSub = parseOrderCustomId(r.custom_id);
      // NEVER fall back to the raw custom_id: for a discounted sub it's a JSON token
      // ({"u":...}) and using it as the userId would create a junk billing_customers
      // doc. parseOrderCustomId already returns the bare uid for the plain path.
      const subUserId = parsedSub.userId || null;
      const firstChargeMinor = r.billing_info?.last_payment?.amount
        ? toMinorUnits(r.billing_info.last_payment.amount)
        : null;
      // Funding instrument (card brand+last4, or PayPal/Venmo) for the "Current
      // Payment Method" card + the activation transaction row. The ACTIVATED webhook
      // payload is TRIMMED and usually omits subscriber.payment_source.card, so we
      // dereference the full subscription via GET (authoritative state) when the inline
      // value has no usable instrument — the same pattern PAYMENT.SALE.COMPLETED uses.
      // Null when truly absent (wallet/balance funding) → UI falls back to "PayPal".
      let subPaymentMethod = derivePaymentMethod(r.subscriber?.payment_source);
      if (!subPaymentMethod && r.id) {
        try {
          const tok = await getAccessToken(ctx);
          const fullSub = await request("GET", `/v1/billing/subscriptions/${r.id}`, tok, null, ctx.base);
          subPaymentMethod = derivePaymentMethod(fullSub?.subscriber?.payment_source);
        } catch (e) {
          logger.warn("ACTIVATED: subscription dereference for payment_source failed (fail-soft)", { subId: r.id, error: e.message });
        }
      }
      events.push({
        type: "subscription.activated",
        userId: subUserId,
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
          amount: firstChargeMinor,
          interval: "month",
          ...(subPaymentMethod ? { paymentMethod: subPaymentMethod } : {}),
        },
        ...(subPaymentMethod ? { paymentMethod: subPaymentMethod } : {}),
        // When the subscription carried a discount code (Smart Button path), record
        // the redemption on activation (idempotent on the subscription id). The card
        // path records synchronously in its callable; both dedupe on the same id.
        discountRedemption: parsedSub.code
          ? {
              code: parsedSub.code,
              userId: subUserId,
              mode: "subscription",
              productId: parsedSub.productId || tier.tierId || null,
              originalAmount: parsedSub.originalAmount,
              discountedAmount: firstChargeMinor,
              transactionId: r.id,
            }
          : null,
      });
      break;
    }

    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      events.push({
        type: "subscription.canceled",
        // custom_id may be a bare uid OR the discount JSON token {u,c,p,o}; decode it
        // so the dispatcher always targets the real uid (not the literal JSON string).
        userId: parseOrderCustomId(r.custom_id).userId || null,
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
        // Decode custom_id (bare uid OR discount JSON token) → real uid.
        userId: parseOrderCustomId(r.custom_id).userId || null,
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
      // custom_id may be a bare uid OR the discount JSON token {u,c,p,o}; decode it so
      // the renewal transaction is written under the REAL uid (a discounted sub would
      // otherwise land under a `{"u":...}` document and never show in Payment History).
      let renewalUserId = parseOrderCustomId(r.custom || r.custom_id).userId || null;
      let nextBillingEpoch = null;
      let renewalPaymentMethod = null;
      const subId = r.billing_agreement_id || null;
      if (subId) {
        try {
          const token = await getAccessToken(ctx);
          const sub = await request("GET", `/v1/billing/subscriptions/${subId}`, token, null, ctx.base);
          const tier = resolvePlanTier(sub?.plan_id);
          if (tier.tierName) subProductName = tier.tierName;
          if (sub?.custom_id) renewalUserId = parseOrderCustomId(sub.custom_id).userId || renewalUserId;
          if (sub?.billing_info?.next_billing_time) {
            nextBillingEpoch = toEpoch(sub.billing_info.next_billing_time);
          }
          // Funding instrument (card brand+last4 or PayPal/Venmo) for the history row.
          renewalPaymentMethod = derivePaymentMethod(sub?.subscriber?.payment_source);
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
          ...(renewalPaymentMethod ? { paymentMethod: renewalPaymentMethod } : {}),
        },
        transaction: {
          id: r.id,
          date: toEpoch(r.create_time),
          amount: toMinorUnits(r.amount),
          currency: r.amount?.currency_code || r.amount?.currency || "usd",
          status: "succeeded",
          productName: subProductName,
          type: "subscription", // recurring subscription charge
          ...(renewalPaymentMethod ? { paymentMethod: renewalPaymentMethod } : {}),
        },
      });
      break;
    }


    case "PAYMENT.SALE.REFUNDED":
    case "PAYMENT.CAPTURE.REFUNDED": {
      events.push({
        type: "payment.refunded",
        // Decode custom_id (bare uid OR discount JSON token) → real uid.
        userId: parseOrderCustomId(r.custom || r.custom_id).userId || null,
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
      // Funding instrument for the one-time purchase history row. Capture payloads
      // carry payment_source on some flows; null → UI falls back to "PayPal".
      const capturePaymentMethod = derivePaymentMethod(r.payment_source || event?.payment_source);
      // Resolve product identity. PREFER the threaded custom_id token (uid +
      // productId + discount code) so a DISCOUNTED capture still resolves the right
      // product — the captured amount no longer matches the catalog amount once a
      // discount is applied. Fall back to amount→product inference for the legacy
      // no-discount path (custom_id is the bare uid there).
      const parsedCustom = parseOrderCustomId(r.custom_id);
      // NEVER fall back to the raw custom_id (JSON token on discounted orders).
      const captureUserId = parsedCustom.userId || null;
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
          ...(capturePaymentMethod ? { paymentMethod: capturePaymentMethod } : {}),
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
  // CT-member in-person session ($60). Gated to Complete Transformation members in
  // the createPaypalOrder callable (the buyer's active tier is verified server-side).

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
 * Derive a neutral payment-method descriptor from a PayPal `payment_source` object
 * (found on subscriptions under `subscriber.payment_source`, or on captures/orders).
 *
 * PayPal LIMITATION (intentional): card checkouts expose brand + last digits, and
 * wallet flows expose PayPal vs Venmo — but Apple Pay / Google Pay are NOT separate
 * funding sources here (they surface as a card or the PayPal wallet), and credit-vs-
 * debit is not reported. So the best we can return is:
 *   - card   → { label: "Visa ••4242", brand, last4, kind:"card" }
 *   - paypal → { label: "PayPal", kind:"paypal" }
 *   - venmo  → { label: "Venmo", kind:"venmo" }
 *   - paylater → { label: "Pay Later", kind:"paylater" }
 * Returns null when the source is absent/unrecognized (caller falls back to "PayPal").
 */
function derivePaymentMethod(paymentSource) {
  if (!paymentSource || typeof paymentSource !== "object") return null;
  // Card (ACDC / vaulted card).
  if (paymentSource.card) {
    const c = paymentSource.card;
    const brandRaw = c.brand || c.card_type || "";
    const brand = brandRaw
      ? brandRaw.charAt(0).toUpperCase() + brandRaw.slice(1).toLowerCase()
      : "Card";
    const last4 = c.last_digits || c.last4 || null;
    return {
      label: last4 ? `${brand} ••${last4}` : brand,
      brand,
      ...(last4 ? { last4 } : {}),
      kind: "card",
    };
  }
  if (paymentSource.venmo) return { label: "Venmo", kind: "venmo" };
  if (paymentSource.paypal) return { label: "PayPal", kind: "paypal" };
  if (paymentSource.pay_later || paymentSource.paylater) {
    return { label: "Pay Later", kind: "paylater" };
  }
  return null;
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

  // Amount as a 2-dp string (PayPal expects e.g. "1.00"). We include a single
  // line item so the PayPal record shows an Item ID (SKU) + Item name instead of
  // a blank Item ID. When items[] is present PayPal REQUIRES
  // amount.breakdown.item_total to equal the sum of the line items' unit_amount —
  // so we set the line item's unit_amount = item_total = the (possibly discounted)
  // charged amount. SKU = the neutral app product id (same id threaded in custom_id).
  const amountValue = (amountMinor / 100).toFixed(2);
  const order = await request("POST", "/v2/checkout/orders", token, {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: amountValue,
          breakdown: {
            item_total: { currency_code: "USD", value: amountValue },
          },
        },
        description: item.label,
        custom_id: orderCustomId,
        items: [
          {
            name: item.label,
            quantity: "1",
            unit_amount: { currency_code: "USD", value: amountValue },
            sku: item.appId,
          },
        ],
      },
    ],
  }, ctx.base);


  return order.id;

}


/**
 * Build a per-subscriber `plan.billing_cycles` price override for the 2-cycle base
 * plans (subscription-discounts-2cycle-handoff.md). Base plans are minted as
 * TRIAL(seq 1) + REGULAR(seq 2) at the regular price; this override reprices the
 * cycles that already exist for THIS subscriber only (the base plan is unchanged for
 * everyone else). Validated in sandbox 2026-06-27 (`--mint2cycle`: INTRO 201 +
 * RECURRING 201). The hard PayPal constraint: an override can only REPRICE existing
 * cycles, never ADD one — which is why the base plan must already be 2-cycle.
 *
 * Two scopes:
 *   - "intro"     → reprice seq 1 (TRIAL, total_cycles:N) to the discounted price;
 *                   seq 2 (REGULAR) stays at full price. PayPal auto-reverts after N.
 *   - "recurring" → reprice BOTH seq 1 and seq 2 to the discounted price (permanent).
 *
 * Every cycle MUST carry `frequency` (PayPal rejects the override otherwise). The
 * plan's `setup_fee` (e.g. CT's $60) is NOT a billing cycle, so it is untouched.
 * Returns null when no (valid) discount is supplied.
 *
 * @param {object} opts
 *   @param {"intro"|"recurring"} opts.scope
 *   @param {number} opts.discountedMinor  discounted price, minor units
 *   @param {number} opts.regularMinor     regular price, minor units (seq 2 on intro)
 *   @param {number} [opts.trialCycles=1]  how many cycles the intro price applies
 *   @param {string} [opts.intervalUnit="MONTH"]
 */
function buildPriceOverride(opts = {}) {
  const scope = opts.scope === "intro" ? "intro" : opts.scope === "recurring" ? "recurring" : null;
  if (
    !scope ||
    opts.discountedMinor == null ||
    opts.regularMinor == null ||
    !(opts.discountedMinor < opts.regularMinor)
  ) {
    return null;
  }
  const fmt = (m) => (Math.max(0, Math.round(m)) / 100).toFixed(2);
  const freq = { interval_unit: opts.intervalUnit || "MONTH", interval_count: 1 };
  const trialCycles = opts.trialCycles && opts.trialCycles > 0 ? Math.round(opts.trialCycles) : 1;
  const price = (m) => ({ fixed_price: { value: fmt(m), currency_code: "USD" } });

  if (scope === "intro") {
    // Reprice only the TRIAL cycle (seq 1); REGULAR (seq 2) stays full price.
    return {
      billing_cycles: [
        {
          sequence: 1,
          tenure_type: "TRIAL",
          total_cycles: trialCycles,
          frequency: freq,
          pricing_scheme: price(opts.discountedMinor),
        },
      ],
    };
  }
  // recurring: reprice BOTH cycles to the discounted price.
  return {
    billing_cycles: [
      {
        sequence: 1,
        tenure_type: "TRIAL",
        total_cycles: 1,
        frequency: freq,
        pricing_scheme: price(opts.discountedMinor),
      },
      {
        sequence: 2,
        tenure_type: "REGULAR",
        total_cycles: 0,
        frequency: freq,
        pricing_scheme: price(opts.discountedMinor),
      },
    ],
  };
}


/**
 * Create a subscription for the Smart Button (PayPal/Venmo) flow SERVER-SIDE — no
 * vaulted card (so NO Reference Transactions capability needed). The buyer approves
 * in the PayPal popup; we build the subscription body here so the amount + any
 * first-cycle discount override are server-authoritative (the client never sets the
 * price — parity with the one-time createOrder path). `custom_id` carries the uid so
 * the webhook maps activation → user. Returns the created subscription id; the Smart
 * Button's onApprove resolves on buyer approval and the ACTIVATED webhook (plus the
 * callable's synchronous confirmation) fulfills.
 * @param {string} planId    PayPal billing plan id (P-xxxx)
 * @param {string} customId  Firebase uid
 * @param {object} ctx       { clientId, clientSecret, base }
 * @param {object} opts      optional { scope, discountedMinor, regularMinor, trialCycles }
 *                           — a per-subscriber price override (buildPriceOverride).
 * @returns the created subscription id (I-xxxx)
 */
async function createSubscription(planId, customId, ctx = {}, opts = {}) {
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);
  const subscriptionBody = {
    plan_id: planId,
    custom_id: customId || undefined,
  };
  const override = buildPriceOverride(opts);
  if (override) subscriptionBody.plan = override;
  const subscription = await request("POST", "/v1/billing/subscriptions", token, subscriptionBody, ctx.base);
  return subscription.id;
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
async function createSubscriptionWithCard(setupToken, planId, customId, email, ctx = {}, opts = {}) {
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

  // SUBSCRIPTION DISCOUNT (2-cycle override model): when the caller passes a
  // validated override spec ({ scope, discountedMinor, regularMinor, trialCycles },
  // computed server-side from the code — the client never sets these), bake the
  // per-subscriber billing_cycles override into the create call. The base plan is
  // 2-cycle (TRIAL seq 1 + REGULAR seq 2), so buildPriceOverride reprices the
  // existing cycles (intro = seq 1 only, auto-revert; recurring = both). The $60 CT
  // setup fee is part of the plan, NOT a billing cycle, so it is untouched.
  const override = buildPriceOverride(opts);
  if (override) subscriptionBody.plan = override;



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

/**
 * Revise a subscription onto a DIFFERENT plan (POST /v1/billing/subscriptions/{id}/revise).
 * Moves the subscriber to `newPlanId` effective the next billing cycle WITHOUT
 * cancel/re-subscribe and WITHOUT re-collecting payment (same vaulted source). Used
 * by the admin "Change plan" action to end a promo (→ base plan), move tier, or
 * reprice an individual. The BILLING.SUBSCRIPTION.UPDATED webhook then syncs the
 * neutral record + tier. Returns the PayPal revise response.
 * @param {string} subscriptionId  PayPal subscription id (I-xxxx)
 * @param {string} newPlanId       target Billing Plan id (P-xxxx)
 * @param {object} ctx { clientId, clientSecret, base }
 */
async function reviseSubscription(subscriptionId, newPlanId, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  if (!newPlanId) throw new Error("newPlanId required");
  const token = await getAccessToken(ctx);
  return request(
    "POST",
    `/v1/billing/subscriptions/${subscriptionId}/revise`,
    token,
    { plan_id: newPlanId },
    ctx.base
  );
}

/**
 * Per-client price override on the SAME plan (FR-16). PayPal does NOT allow an inline
 * price override via `/revise` on the same plan (422 OVERRIDES_ON_SAME_PLAN_NOT_ALLOWED).
 * The supported mechanism — and exactly what the merchant dashboard's "Update pricing"
 * uses — is JSON-Patch on the subscription itself:
 *   PATCH /v1/billing/subscriptions/{id}
 *   [{ op:'replace',
 *      path:'/plan/billing_cycles/@sequence==<REGULAR seq>/pricing_scheme/fixed_price',
 *      value:{ currency_code, value } }]
 * → HTTP 204. The subscription keeps its plan_id (plan_overridden:true) and the new
 * price applies from the NEXT billing cycle (PayPal's <10-days-before-renewal rule
 * pushes it one cycle further). Sandbox-validated 2026-06-27 (script S1 `--patch` P4).
 *
 * We resolve the REGULAR cycle's sequence from the plan's billing_cycles (base plans
 * have one REGULAR at seq 1; first_cycle intro plans have the REGULAR at seq 2).
 * @param {string} subscriptionId  I-xxxx
 * @param {number} amountMinor     new recurring price, minor units
 * @param {object} [opts]          { currency?: string }
 */
async function reviseSubscriptionPricing(subscriptionId, amountMinor, opts = {}, ctx = {}) {
  if (!subscriptionId) throw new Error("subscriptionId required");
  if (amountMinor == null) throw new Error("amountMinor required");
  const currency = opts.currency || "USD";
  const token = await getAccessToken(ctx);

  // Find the REGULAR billing cycle's sequence from the subscription's plan.
  const sub = await request("GET", `/v1/billing/subscriptions/${subscriptionId}`, token, null, ctx.base);
  const planId = sub.plan_id;
  let regSeq = 1;
  try {
    const plan = await request("GET", `/v1/billing/plans/${planId}`, token, null, ctx.base);
    const cycles = plan.billing_cycles || [];
    const regular = cycles.find((c) => c.tenure_type === "REGULAR") || cycles[cycles.length - 1];
    if (regular && regular.sequence) regSeq = regular.sequence;
  } catch (e) {
    logger.warn("reviseSubscriptionPricing: could not read plan cycles, defaulting seq 1", { subscriptionId, error: e.message });
  }

  // PATCH returns 204 No Content on success (request() resolves with {}).
  await request(
    "PATCH",
    `/v1/billing/subscriptions/${subscriptionId}`,
    token,
    [
      {
        op: "replace",
        path: `/plan/billing_cycles/@sequence==${regSeq}/pricing_scheme/fixed_price`,
        value: { currency_code: currency, value: (amountMinor / 100).toFixed(2) },
      },
    ],
    ctx.base
  );
  return { ok: true, planId, sequence: regSeq };
}


// ── Plan management (admin "Manage Subscriptions" console) ──────────────────
// subscription-management-design.md §3. These back the admin callables that
// list/create/reprice/activate/deactivate Billing Plans. All take the per-request
// `ctx` ({ base, clientId, clientSecret }) so the right env is used.

/**
 * GET a single Billing Plan (status + billing_cycles + pricing).
 * @param {string} planId  P-xxxx
 */
async function getPlan(planId, ctx = {}) {
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);
  return request("GET", `/v1/billing/plans/${planId}`, token, null, ctx.base);
}

/**
 * LIST Billing Plans (optionally filtered by product). Optional reconciliation
 * read — the admin console's table is sourced from the Firestore registry, but this
 * lets us cross-check against PayPal. Returns the raw { plans: [...] } page.
 * @param {string} [productId]  filter to one product
 */
async function listPlans(productId, ctx = {}) {
  const token = await getAccessToken(ctx);
  const qs = productId ? `?product_id=${encodeURIComponent(productId)}&page_size=20` : "?page_size=20";
  return request("GET", `/v1/billing/plans${qs}`, token, null, ctx.base);
}

/**
 * CREATE a Billing Plan under an existing product (FR-8). `spec` mirrors the PayPal
 * plan body but we build the common monthly shape from minor units so callers pass
 * simple values. Returns the created plan id (P-xxxx).
 *
 * The plan is minted with the SAME 2-cycle shape as the base catalog plans
 * (subscription-discounts-2cycle-handoff.md): a TRIAL cycle at sequence 1
 * (total_cycles:1) + a REGULAR cycle at sequence 2 (total_cycles:0), BOTH priced at
 * `amountMinor`. A no-discount subscriber therefore pays the regular price every
 * month, while the 2-cycle shape lets a create-time `plan.billing_cycles` override
 * apply an intro discount to seq 1 only — PayPal can only REPRICE existing cycles,
 * never ADD one, so the base plan must already be 2-cycle.
 * @param {object} spec { productId, name, description?, amountMinor, currency?, intervalUnit? }
 */
async function createPlan(spec = {}, ctx = {}) {
  const { productId, name, amountMinor } = spec;
  if (!productId) throw new Error("productId required");
  if (!name) throw new Error("name required");
  if (amountMinor == null) throw new Error("amountMinor required");
  const currency = spec.currency || "USD";
  const intervalUnit = spec.intervalUnit || "MONTH";
  const token = await getAccessToken(ctx);
  const price = { value: (amountMinor / 100).toFixed(2), currency_code: currency };
  const body = {
    product_id: productId,
    name,
    description: spec.description || name,
    status: "ACTIVE",
    billing_cycles: [
      {
        // TRIAL cycle (seq 1) — same price as REGULAR; exists so an intro discount
        // override can reprice it without adding a cycle. total_cycles:1 → PayPal
        // auto-reverts to the REGULAR cycle after one period.
        frequency: { interval_unit: intervalUnit, interval_count: 1 },
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: 1,
        pricing_scheme: { fixed_price: price },
      },
      {
        // REGULAR cycle (seq 2) — the ongoing monthly charge. total_cycles:0 = infinite.
        frequency: { interval_unit: intervalUnit, interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 2,
        total_cycles: 0,
        pricing_scheme: { fixed_price: price },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee: { value: "0", currency_code: currency },
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 1,
    },
  };
  const plan = await request("POST", "/v1/billing/plans", token, body, ctx.base);
  return plan.id;
}

/**
 * REPRICE a Billing Plan via update-pricing-schemes (FR-9/FR-11). Changes the price
 * for ALL current + future subscribers of `planId` (PayPal applies its standard
 * consumer-notice timing to existing subscribers). `billingCycleSequence` selects
 * which cycle to reprice (base plans are 2-cycle TRIAL+REGULAR, so the recurring
 * price lives on the REGULAR cycle at sequence 2 — caller passes it).
 * @param {string} planId
 * @param {number} amountMinor  new price, minor units
 * @param {object} [opts] {
 *   billingCycleSequence?: number,      // single cycle to reprice (legacy)
 *   billingCycleSequences?: number[],   // multiple cycles to reprice (preferred for whole-plan reprice)
 *   currency?: string,
 * }
 */
async function updatePlanPricing(planId, amountMinor, opts = {}, ctx = {}) {
  if (!planId) throw new Error("planId required");
  if (amountMinor == null) throw new Error("amountMinor required");
  const token = await getAccessToken(ctx);
  const currency = opts.currency || "USD";
  // Resolve which billing cycle(s) to reprice. Base plans are 2-cycle TRIAL(seq1)+
  // REGULAR(seq2): a WHOLE-PLAN reprice must update BOTH so the first month and the
  // ongoing price match (otherwise new subscribers pay the old price for cycle 1).
  // Callers can pass an explicit list via `billingCycleSequences`; we de-dupe and
  // drop falsy values, falling back to the legacy single `billingCycleSequence` (or 1).
  const requestedSeqs = Array.isArray(opts.billingCycleSequences) && opts.billingCycleSequences.length
    ? [...new Set(opts.billingCycleSequences.filter((n) => Number.isInteger(n) && n > 0))]
    : [opts.billingCycleSequence || 1];

  // PayPal's update-pricing-schemes 422s the ENTIRE request (PRICING_SCHEME_INVALID_AMOUNT
  // — "The amount entered should be different from the existing amount") if ANY included
  // cycle's new price equals its current price. Since a 2-cycle plan's cycles can be out
  // of sync (e.g. an earlier seq-2-only reprice left seq 1 at the old price), we GET the
  // plan first and include ONLY the requested cycles that (a) exist and (b) actually
  // differ from the target. If none differ, it's a no-op success (nothing to change).
  let currentBySeq = {};
  try {
    const plan = await request("GET", `/v1/billing/plans/${planId}`, token, null, ctx.base);
    for (const c of plan.billing_cycles || []) {
      const val = c?.pricing_scheme?.fixed_price?.value;
      if (c?.sequence != null && val != null) {
        currentBySeq[c.sequence] = Math.round(parseFloat(val) * 100);
      }
    }
  } catch (e) {
    // If the GET fails, fall back to attempting all requested cycles (best-effort).
    logger.warn("updatePlanPricing: plan GET failed; attempting all requested cycles", {
      planId,
      error: e.message,
    });
    currentBySeq = null;
  }

  const seqs = currentBySeq
    ? requestedSeqs.filter(
        (seq) => currentBySeq[seq] == null || currentBySeq[seq] !== amountMinor
      )
    : requestedSeqs;

  if (seqs.length === 0) {
    // Every requested cycle already at the target price → nothing to do (success).
    return { noop: true, planId };
  }

  const fixed = { value: (amountMinor / 100).toFixed(2), currency_code: currency };
  return request(
    "POST",
    `/v1/billing/plans/${planId}/update-pricing-schemes`,
    token,
    {
      pricing_schemes: seqs.map((seq) => ({
        billing_cycle_sequence: seq,
        pricing_scheme: { fixed_price: fixed },
      })),
    },
    ctx.base
  );
}



/** Activate a Billing Plan (turn ON — allows new subscriptions). (FR-7) */
async function activatePlan(planId, ctx = {}) {
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);
  await request("POST", `/v1/billing/plans/${planId}/activate`, token, {}, ctx.base);
}

/**
 * Deactivate a Billing Plan (turn OFF). Blocks NEW subscriptions only; existing
 * subscribers are unaffected (they keep billing). (FR-7)
 */
async function deactivatePlan(planId, ctx = {}) {
  if (!planId) throw new Error("planId required");
  const token = await getAccessToken(ctx);
  await request("POST", `/v1/billing/plans/${planId}/deactivate`, token, {}, ctx.base);
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
  createSubscription, // Smart Button (no-vault) server-side subscription create
  createSubscriptionWithCard,
  reviseSubscription, // admin "Change plan" — move a sub to a different plan id
  reviseSubscriptionPricing, // admin "Change price" — inline same-plan PATCH override (FR-16)


  // Plan management (admin Manage Subscriptions console — subscription-management §3)
  getPlan,
  listPlans,
  createPlan,
  updatePlanPricing,
  activatePlan,
  deactivatePlan,


  // exported under an explicit name so callers don't confuse it with
  // fulfillment.activateSubscription (which writes accountActivated to Firestore).
  activatePaypalSubscription: activateSubscription,
  getSubscription,
  resolveOneTimeByAmount, // used by capturePaypalOrder for synchronous fulfillment
  resolveOneTimeByAppId, // resolve product by neutral app id (discounted captures)
  parseOrderCustomId, // decode the threaded uid/productId/code custom_id token
  derivePaymentMethod, // map PayPal payment_source → neutral { label, brand, last4, kind }

  // Subscription discounts (2-cycle override model): build the per-subscriber
  // plan.billing_cycles override applied at create time (intro vs recurring).
  buildPriceOverride,



  // exported for tests / reuse


  getAccessToken,
  resolvePlanTier,
  PLAN_TIER_MAP,
};



