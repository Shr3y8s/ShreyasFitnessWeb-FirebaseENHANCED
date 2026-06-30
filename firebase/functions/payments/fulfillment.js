/**
 * Provider-NEUTRAL payment fulfillment.
 *
 * These functions perform the app-side effects of a payment — activate the
 * account, write the subscription record, create session packages, and mirror a
 * neutral billing_* store — given ALREADY-NEUTRALIZED inputs. Each provider's
 * `parseEvent` (see ./providers/<provider>.js) resolves its raw webhook payload
 * into these neutral shapes, so this business logic is written ONCE and reused
 * across Stripe / PayPal / Paddle.
 *
 * Ported from the Stripe-specific triggers in ../index.js
 * (`syncSubscriptionToUser`, `createSessionPackageFromPayment`) so behavior
 * matches the current production path. This module does NOT import any payment
 * SDK and does NOT call a provider API — all data it needs is passed in.
 *
 * See docs/02-implementation/payment-processor/payment-processor-design.md (§3, §4)
 *
 * NOTE (parity hooks): the current Stripe triggers also send a welcome email,
 * auto-create the onboarding/check-in goal, and write a `new_client_signup`
 * activity-feed event on first activation. Those side effects are invoked via
 * optional callbacks (`hooks`) so the generic webhook can wire them in without
 * this module taking on those dependencies. They MUST be wired before PayPal
 * goes live (tracked in tasks T2.x / T3.3).
 */

const admin = require("firebase-admin");
const { logger } = require("firebase-functions");

/**
 * Defensive userId guard — the SINGLE chokepoint every billing writer runs through.
 *
 * A Firestore `userId` MUST be a bare document id. But PayPal's discounted-checkout
 * `custom_id` is a JSON token (`{"u":"<uid>","c":"<code>",...}`); if any current OR
 * future webhook path lets that raw string reach a writer, it would create a junk
 * `billing_customers/{"u":...}` document (and mis-route the subcollection writes).
 * Provider adapters are supposed to decode it, but we normalize here too so the junk
 * doc is STRUCTURALLY IMPOSSIBLE regardless of caller. Decodes a `{u}` token → uid;
 * passes a bare id through; returns null for anything unusable (caller then skips).
 */
function normalizeUserId(userId) {
  if (typeof userId !== "string" || !userId) return null;
  if (userId.startsWith("{")) {
    try {
      const parsed = JSON.parse(userId);
      return parsed && typeof parsed.u === "string" && parsed.u ? parsed.u : null;
    } catch {
      return null;
    }
  }
  return userId;
}

/**
 * Write/merge the neutral billing customer doc.
 * billing_customers/{uid} { provider, providerCustomerId, email }
 */
async function writeBillingCustomer({ userId, provider, providerCustomerId, email }) {
  userId = normalizeUserId(userId);
  if (!userId) return;
  const ref = admin.firestore().collection("billing_customers").doc(userId);
  await ref.set(
    {
      provider,
      ...(providerCustomerId ? { providerCustomerId } : {}),
      ...(email ? { email } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Write a neutral subscription record under the billing customer.
 * billing_customers/{uid}/subscriptions/{id}
 */
async function writeSubscriptionRecord({
  userId,
  subscriptionId,
  provider,
  status,
  priceId,
  productId,
  currentPeriodEnd,
  amount,
  interval,
  intervalCount,
  months,
  paymentMethod,
}) {
  userId = normalizeUserId(userId);
  if (!userId || !subscriptionId) return;

  const ref = admin
    .firestore()
    .collection("billing_customers")
    .doc(userId)
    .collection("subscriptions")
    .doc(subscriptionId);
  // Set-once `createdAt` = the true "subscription started" date for the admin
  // console. Renewals/status updates only touch `updatedAt`, so this never drifts.
  const existing = await ref.get();
  const createdAtField = existing.exists && existing.data()?.createdAt
    ? {}
    : { createdAt: admin.firestore.FieldValue.serverTimestamp() };
  await ref.set(
    {
      provider,
      ...createdAtField,
      status: status ?? null,
      // `priceId`/`productId`/`currentPeriodEnd` identify the plan/tier/period. They
      // are ONLY written when the caller provides them (activation/renewal) — a
      // status-only update (pause/resume/cancel) must NOT null them out, or the
      // admin Subscriptions plan-filter (which matches on priceId) would drop the row.
      ...(priceId != null ? { priceId } : {}),
      ...(productId != null ? { productId } : {}),
      ...(currentPeriodEnd != null ? { currentPeriodEnd } : {}),
      // `amount` is the ACTUAL charged amount in minor units (post-discount), not

      // catalog price — so revenue/MRR dashboards are accurate even with promos.
      // `interval` ('month'|'year') lets MRR normalize annual plans. Only written
      // when the caller knows them (activation/renewal); omitted on status-only
      // cancel updates so we don't clobber a previously-stored amount.
      ...(amount != null ? { amount } : {}),
      ...(interval ? { interval } : {}),
      // `intervalCount`/`months` (prepay-plans Phase A): the billing cadence
      // (1 monthly, 3 quarterly). Authoritative for cadence-aware MRR (amount ÷ months)
      // + "next billing" math. Only written when known so a status-only update keeps them.
      ...(intervalCount != null ? { intervalCount } : {}),
      ...(months != null ? { months } : {}),
      // `paymentMethod` { label, brand?, last4?, kind } — the instrument funding this

      // subscription (card brand+last4, or "PayPal"/"Venmo" wallet). PayPal doesn't
      // expose Apple/Google Pay or credit-vs-debit, so those fall back to card/wallet.
      // Only written when known so a status-only update doesn't clobber it.
      ...(paymentMethod ? { paymentMethod } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}



/**
 * Write a neutral transaction record (for the billing-history UI / NFR-2).
 * billing_customers/{uid}/transactions/{id}
 */
async function writeTransactionRecord({ userId, transaction, provider }) {
  userId = normalizeUserId(userId);
  if (!userId || !transaction?.id) return;
  const ref = admin
    .firestore()
    .collection("billing_customers")
    .doc(userId)
    .collection("transactions")
    .doc(transaction.id);
  await ref.set(
    {
      provider,
      date: transaction.date ?? Math.floor(Date.now() / 1000),
      amount: transaction.amount ?? 0,
      currency: transaction.currency ?? "usd",
      status: transaction.status ?? "succeeded",
      productName: transaction.productName ?? "",
      receiptUrl: transaction.receiptUrl ?? null,
      // `type` ('subscription' | 'one_time') lets admin analytics split recurring vs
      // one-time revenue without provider-specific parsing. Default 'one_time'.
      type: transaction.type === "subscription" ? "subscription" : "one_time",
      // `paymentMethod` { label, brand?, last4?, kind } — the instrument used for THIS
      // charge (e.g. "Visa ••4242", or "PayPal"/"Venmo"). Only written when known.
      ...(transaction.paymentMethod ? { paymentMethod: transaction.paymentMethod } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

}

/**
 * Activate / update a subscription on the user doc.
 * Mirrors syncSubscriptionToUser: write-once accountActivated, tier sync,
 * trainer auto-assignment on first active subscription, and subscriptionId
 * cleanup on full cancellation.
 *
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.subscriptionId
 * @param {string} p.provider
 * @param {string} p.status  neutral status: 'active' | 'canceled' | 'past_due' | 'paused' | ...
 * @param {string} [p.priceId]
 * @param {string} [p.productId]
 * @param {string} [p.tierId]
 * @param {string} [p.tierName]
 * @param {number} [p.currentPeriodEnd]
 * @param {object} [hooks] optional { onFirstActivation({userId, userData}) }
 */
async function activateSubscription(p, hooks = {}) {
  const userId = normalizeUserId(p.userId);
  const { subscriptionId, provider, status } = p;
  if (!userId) {
    logger.warn("activateSubscription called without a usable userId", { rawUserId: p.userId });
    return;
  }

  const userRef = admin.firestore().collection("users").doc(userId);
  const userDoc = await userRef.get();
  const userData = userDoc.data() || {};

  const updateData = {
    subscriptionStatus: status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // On full cancellation, clean up subscriptionId so the user can re-subscribe.
  if (status === "canceled") {
    updateData.subscriptionId = admin.firestore.FieldValue.delete();
    updateData.subscriptionEndedAt = admin.firestore.FieldValue.serverTimestamp();
  } else if (subscriptionId) {
    updateData.subscriptionId = subscriptionId;
    // Persist the PayPal plan id (priceId) so the admin "Manage Subscriptions"
    // console can group/count active subscriptions per plan (PayPal has no
    // list-subscriptions API — we source counts from users docs).
    // (subscription-management FR-5/FR-14; design §4 active-sub count source.)
    if (p.priceId) updateData.subscriptionPlanId = p.priceId;
  }


  // Mirror billing fields onto the USER doc so the membership dashboard can render
  // "Recent Activity" + "Next Billing" without reading the billing_customers
  // subcollection. (The neutral subscription record is still written below.)
  // - `lastPaymentDate`: when a charge was taken. On `active` we stamp now (first
  //   charge at activation, or a renewal); the membership page derives Next Billing
  //   = lastPaymentDate + 1 month and shows the "Subscription started" line from it.
  // - `currentPeriodEnd`: provider's next_billing_time (passed in as epoch seconds),
  //   used for the "canceled — access until …" display.
  if (status === "active") {
    updateData.lastPaymentDate = admin.firestore.FieldValue.serverTimestamp();
  }
  if (p.currentPeriodEnd != null) {
    updateData.currentPeriodEnd = admin.firestore.Timestamp.fromMillis(p.currentPeriodEnd * 1000);
  }

  // Mirror the billing cadence onto the USER doc (prepay-plans Phase B). The
  // membership "Next Billing" fallback adds `months`, and the Plan label reads
  // `intervalCount` (1 monthly / 3 quarterly). Only written when known so a
  // status-only update (pause/cancel) keeps the previously-stored cadence.
  if (p.intervalCount != null) updateData.intervalCount = p.intervalCount;
  if (p.months != null) updateData.months = p.months;



  // Sync tier from event metadata when present.
  if (p.tierId && p.tierName) {
    updateData.tier = p.tierId;
    updateData.tierName = p.tierName;
  }

  // Mirror the funding instrument onto the user doc so the Billing/Membership
  // "Current Payment Method" card can render it ("Visa ••4242" / "PayPal" / "Venmo")
  // without reading the subcollection. Only written when known (e.g. activation or a
  // renewal that carried the payment_source) so a status-only update keeps it.
  if (p.paymentMethod) {
    updateData.currentPaymentMethod = p.paymentMethod;
  }


  // Write-once activation on first active subscription.
  let firstActivation = false;
  if (status === "active" && !userData.accountActivated) {
    updateData.accountActivated = true;
    firstActivation = true;
  }

  // Assign a trainer on first active subscription if none assigned.
  if (status === "active" && !userData.assignedTrainerId) {
    const adminsSnapshot = await admin
      .firestore()
      .collection("admins")
      .limit(1)
      .get();
    if (!adminsSnapshot.empty) {
      const trainerDoc = adminsSnapshot.docs[0];
      const trainerData = trainerDoc.data();
      updateData.assignedTrainerId = trainerDoc.id;
      updateData.assignedTrainerCollection = "admins";
      updateData.assignedTrainerName = trainerData.name || "Your Coach";
      updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
    } else {
      logger.warn("No trainer found in admins collection", { userId });
    }
  }

  await userRef.update(updateData);

  // Neutral billing store.
  await writeSubscriptionRecord({
    userId,
    subscriptionId,
    provider,
    status,
    priceId: p.priceId,
    productId: p.productId,
    currentPeriodEnd: p.currentPeriodEnd,
    amount: p.amount,
    interval: p.interval,
    intervalCount: p.intervalCount,
    months: p.months,
    paymentMethod: p.paymentMethod,
  });


  logger.info("Subscription synced to user (neutral fulfillment)", {
    userId,
    subscriptionId,
    status,
    provider,
    firstActivation,
  });

  // Parity side effects (welcome email / goal / activity feed) via hook.
  if (firstActivation && typeof hooks.onFirstActivation === "function") {
    try {
      await hooks.onFirstActivation({
        userId,
        userData,
        tierId: updateData.tier || userData.tier,
        trainerId: updateData.assignedTrainerId || userData.assignedTrainerId,
      });
    } catch (e) {
      logger.error("onFirstActivation hook failed (non-fatal)", { userId, error: e.message });
    }
  }
}

/**
 * Mark a subscription fully removed (provider deleted it).
 */
async function deactivateSubscription({ userId, subscriptionId }) {
  userId = normalizeUserId(userId);
  if (!userId) return;
  await admin.firestore().collection("users").doc(userId).update({
    subscriptionId: admin.firestore.FieldValue.delete(),
    subscriptionStatus: admin.firestore.FieldValue.delete(),
    subscriptionEndedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  logger.info("Subscription deleted, user fields cleaned (neutral)", { userId, subscriptionId });
}

/**
 * Create a session package from a completed one-time payment.
 * Mirrors createSessionPackageFromPayment, but takes NEUTRAL inputs (the caller
 * resolves productName/quantity/amount from the provider event) so it makes no
 * provider API call.
 *
 * @param {object} p
 * @param {string} p.userId
 * @param {string} p.provider
 * @param {string} p.productId
 * @param {string} p.productName  used to derive quantity ("4-Pack…" → 4)
 * @param {string} [p.priceId]
 * @param {string} p.transactionId  provider payment/charge id (idempotency key)
 * @param {number} p.amount  minor units actually charged
 * @param {number} [p.quantity]  explicit quantity (falls back to name parse)
 * @param {object} [hooks] optional { onFirstActivation({userId, userData, tierId, trainerId}) }
 */
async function fulfillSessionPackage(p, hooks = {}) {
  const userId = normalizeUserId(p.userId);
  const { provider, productId, productName, priceId, transactionId, amount } = p;
  if (!userId) {
    logger.warn("fulfillSessionPackage called without a usable userId", { rawUserId: p.userId });
    return;
  }

  const quantity =
    p.quantity != null
      ? p.quantity
      : parseInt((productName || "").match(/(\d+)/)?.[1] || "1", 10);

  const purchaseDate = admin.firestore.Timestamp.now();
  const expirationDateObj = new Date(purchaseDate.toMillis());
  expirationDateObj.setDate(expirationDateObj.getDate() + 60);
  expirationDateObj.setHours(23, 59, 59, 999);
  const expirationDate = admin.firestore.Timestamp.fromDate(expirationDateObj);

  const userRef = admin.firestore().collection("users").doc(userId);

  await admin.firestore().runTransaction(async (t) => {
    const userDoc = await t.get(userRef);
    const userData = userDoc.data() || {};

    // Idempotency: if a package already exists for this transaction, skip.
    // (Also checks the legacy stripePaymentIntentId for any pre-migration rows.)
    const currentPackages = userData.sessionPackages || [];
    if (transactionId && currentPackages.some((pkg) => pkg.providerTransactionId === transactionId || pkg.stripePaymentIntentId === transactionId)) {
      logger.info("Session package already exists for transaction, skipping", { userId, transactionId });
      return;
    }

    // Provider-NEUTRAL package shape (no stripe* fields). `productId` is the app
    // product id (e.g. in_person_4pack); `providerTransactionId` is the provider's
    // payment/capture id.
    const packageData = {
      id: admin.firestore().collection("users").doc().id,
      quantity,
      remaining: quantity,
      purchaseDate,
      expirationDate,
      expired: false,
      provider,
      providerTransactionId: transactionId || null,
      productId: productId || null,
      priceId: priceId || null,
      productName: productName || null,
      amount: amount ?? 0,
    };


    const currentBalance = userData.sessionBalance || {
      available: 0,
      purchased: 0,
      used: 0,
      expired: 0,
      lastUpdated: purchaseDate,
    };

    t.update(userRef, {
      sessionPackages: [...currentPackages, packageData],
      sessionBalance: {
        available: currentBalance.available + quantity,
        purchased: currentBalance.purchased + quantity,
        used: currentBalance.used,
        expired: currentBalance.expired,
        lastUpdated: purchaseDate,
      },
    });
  });

  // Write-once account activation for package-only buyers. Also assign a trainer
  // on first activation if none assigned — one-time / in-person buyers need a coach
  // for Coach Chat + session scheduling, exactly like first-subscription clients
  // (mirrors activateSubscription's auto-assignment). Ported back after the neutral
  // fulfillment migration dropped the legacy one-time trainer-assignment block.
  const freshDoc = await userRef.get();
  const freshData = freshDoc.exists ? freshDoc.data() || {} : {};
  let firstActivation = false;
  let assignedTrainerId = freshData.assignedTrainerId;
  if (freshDoc.exists && !freshData.accountActivated) {
    const activationUpdate = {
      accountActivated: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Assign a trainer if none assigned yet.
    if (!freshData.assignedTrainerId) {
      const adminsSnapshot = await admin
        .firestore()
        .collection("admins")
        .limit(1)
        .get();
      if (!adminsSnapshot.empty) {
        const trainerDoc = adminsSnapshot.docs[0];
        const trainerData = trainerDoc.data();
        activationUpdate.assignedTrainerId = trainerDoc.id;
        activationUpdate.assignedTrainerCollection = "admins";
        activationUpdate.assignedTrainerName = trainerData.name || "Your Coach";
        activationUpdate.assignedAt = admin.firestore.FieldValue.serverTimestamp();
        assignedTrainerId = trainerDoc.id;
      } else {
        logger.warn("No trainer found in admins collection (session package)", { userId });
      }
    }

    await userRef.update(activationUpdate);
    firstActivation = true;
  }

  logger.info("Session package created (neutral fulfillment)", { userId, quantity, provider, transactionId });


  // Parity side effects (welcome email / activity feed) via hook — ONLY on first
  // activation, so repeat webhooks for the same buyer don't re-send. One-time
  // session buyers have no subscription tier, so tierId is undefined; the setup
  // goal inside onFirstActivation is tier-gated and correctly skips for them.
  if (firstActivation && typeof hooks.onFirstActivation === "function") {
    try {
      await hooks.onFirstActivation({
        userId,
        userData: freshData,
        tierId: undefined,
        trainerId: assignedTrainerId,
      });

    } catch (e) {
      logger.error("onFirstActivation hook failed (non-fatal, session package)", { userId, error: e.message });
    }
  }
}

module.exports = {
  writeBillingCustomer,
  writeSubscriptionRecord,
  writeTransactionRecord,
  activateSubscription,
  deactivateSubscription,
  fulfillSessionPackage,
};
