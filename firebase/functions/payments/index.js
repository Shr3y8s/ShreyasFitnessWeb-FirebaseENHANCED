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
        },
        fulfillmentHooks
      );
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
        });
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
        });
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

  // Phase 1: one-time only. Subscriptions (Phase 2) aren't discountable yet.
  const originalMinor = ONETIME_PRICE_MINOR[priceId];
  const empty = { originalAmount: 0, discountedAmount: 0, amountOff: 0 };
  if (mode !== "payment" || originalMinor == null) {
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
    fallbackPlanIds: d.fallbackPlanIds || null,
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
  if (d.appliesTo !== undefined) update.appliesTo = d.appliesTo || null;
  if (d.fallbackPlanIds !== undefined) update.fallbackPlanIds = d.fallbackPlanIds || null;

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

    const created = await PROVIDERS.paypal.createSubscriptionWithCard(setupToken, planId, uid, email, cfg);
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
            },
            fulfillmentHooks
          );
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


module.exports = {
  paymentWebhook,
  paypalWebhookSandbox,
  paypalWebhookLive,
  cancelPaypalSubscription,
  capturePaypalOrder,
  createPaypalOrder,
  createPaypalCardSetupToken,
  createPaypalSubscriptionWithCard,

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



