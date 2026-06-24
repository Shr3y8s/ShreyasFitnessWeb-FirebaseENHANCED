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
 * Write/merge the neutral billing customer doc.
 * billing_customers/{uid} { provider, providerCustomerId, email }
 */
async function writeBillingCustomer({ userId, provider, providerCustomerId, email }) {
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
}) {
  if (!userId || !subscriptionId) return;
  const ref = admin
    .firestore()
    .collection("billing_customers")
    .doc(userId)
    .collection("subscriptions")
    .doc(subscriptionId);
  await ref.set(
    {
      provider,
      status: status ?? null,
      priceId: priceId ?? null,
      productId: productId ?? null,
      currentPeriodEnd: currentPeriodEnd ?? null,
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
  const { userId, subscriptionId, provider, status } = p;
  if (!userId) {
    logger.warn("activateSubscription called without userId");
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


  // Sync tier from event metadata when present.
  if (p.tierId && p.tierName) {
    updateData.tier = p.tierId;
    updateData.tierName = p.tierName;
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
 */
async function fulfillSessionPackage(p) {
  const { userId, provider, productId, productName, priceId, transactionId, amount } = p;
  if (!userId) {
    logger.warn("fulfillSessionPackage called without userId");
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

  // Write-once account activation for package-only buyers.
  const freshDoc = await userRef.get();
  if (freshDoc.exists && !freshDoc.data().accountActivated) {
    await userRef.update({
      accountActivated: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  logger.info("Session package created (neutral fulfillment)", { userId, quantity, provider, transactionId });
}

module.exports = {
  writeBillingCustomer,
  writeSubscriptionRecord,
  writeTransactionRecord,
  activateSubscription,
  deactivateSubscription,
  fulfillSessionPackage,
};
