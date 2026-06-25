const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Load shared configuration (copied from root by predeploy hook)
const sharedConfig = require("./firebase-config.json");
const { ONBOARDING_DEADLINE_DAYS, CHECKIN_ELIGIBLE_PRODUCTS, MAX_CLIENT_REFUND_CREDITS } = require("./product-config");

// Activity Feed helper for writing client activity events
const { writeActivityEvent } = require("./activity-feed");

// Client Notifications helper
const {writeClientNotification} = require("./client-notifications");

// Define secrets for secure access to Stripe
const stripeKey = defineSecret("STRIPE_KEY");
const resendKey = defineSecret("RESEND_API_KEY");

// Provider-neutral account deletion path. The deletion logic lives in a shared
// helper (also reused by the bulk-delete-test-accounts.js script) and uses the
// PayPal seam (NOT the Stripe SDK) for subscription cancel + credit refunds.
const { PAYPAL_SECRETS } = require("./payments");
const { performAccountDeletion } = require("./account-deletion");


// Stripe portal configuration ID for restricted payment method changes only (LIVE)
const STRIPE_PORTAL_CONFIG_ID = "bpc_1TjmYzBjx3iGODd6BoqqhSti";

/**
 * Create a payment intent for one-time payments
 * This is used by the PaymentElement in the React UI
 * @param {Object} request - The callable function request
 * @return {Object} Payment intent client secret
 */
exports.createPaymentIntent = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    logger.info("Starting payment intent creation");

    // Validate input data
    if (!request.data || !request.data.price) {
      const error = new Error("Missing required parameter: price");
      logger.error("Payment intent creation failed - missing price", {
        requestData: request.data,
      });
      throw error;
    }

    // Require authentication — no unauthenticated/test bypass in production.
    if (!request.auth) {
      const error = new Error("The function must be called while authenticated.");
      logger.error("Payment intent creation failed - not authenticated");
      throw error;
    }

    const userId = request.auth.uid;

    logger.info("Creating payment intent", {
      userId: userId,
      priceId: request.data.price,
    });


    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Get the price from Stripe to verify it exists and get the amount
    const price = await stripe.prices.retrieve(request.data.price);

    if (!price) {
      const error = new Error("The requested price does not exist.");
      logger.error("Payment intent creation failed - invalid price", {
        priceId: request.data.price,
      });
      throw error;
    }

    // Create a PaymentIntent with the price amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      automatic_payment_methods: request.data.automatic_payment_methods ||
        {enabled: true},
      metadata: {
        userId: userId,
        priceId: request.data.price,
      },
    });


    logger.info("Payment intent created successfully", {
      paymentIntentId: paymentIntent.id,
      userId: userId,
    });

    // Return success response
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error) {
    logger.error("Error creating payment intent", {
      error: error.message,
      stack: error.stack,
      requestData: request.data,
    });

    // Re-throw with proper callable function error handling
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
});

/**
 * Create a customer portal session for subscription management
 * This allows customers to manage their subscriptions, update payment methods, etc.
 * @param {Object} request - The callable function request
 * @return {Object} Portal session URL
 */
exports.createPortalSession = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Validate input data
    if (!request.data || !request.data.customerId) {
      const error = new Error("Missing required parameter: customerId");
      logger.error("Portal session creation failed - missing customerId", {
        requestData: request.data,
      });
      throw error;
    }

    // Require authentication
    if (!request.auth) {
      const error = new Error("The function must be called while authenticated.");
      logger.error("Portal session creation failed - not authenticated");
      throw error;
    }

    const userId = request.auth.uid;

    logger.info("Creating customer portal session", {
      userId: userId,
      customerId: request.data.customerId,
    });

    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Create the customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: request.data.customerId,
      return_url: request.data.return_url ||
        `${process.env.PUBLIC_URL}/dashboard`,
    });

    logger.info("Customer portal session created successfully", {
      sessionId: session.id,
      url: session.url,
      userId: userId,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    logger.error("Error creating customer portal session", {
      error: error.message,
      stack: error.stack,
      requestData: request.data,
    });

    // Re-throw with proper callable function error handling
    throw new Error(`Portal session creation failed: ${error.message}`);
  }
});

/**
 * Get complete billing history from Stripe API
 * Fetches invoices, charges, subscriptions, and current payment method
 * This provides full payment details including card brand/last4 for all transactions
 * @param {Object} request - The callable function request
 * @return {Object} Complete billing history data
 */
exports.getBillingHistory = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Validate input data
    if (!request.data || !request.data.customerId) {
      const error = new Error("Missing required parameter: customerId");
      logger.error("Billing history fetch failed - missing customerId", {
        requestData: request.data,
      });
      throw error;
    }

    // Require authentication
    if (!request.auth) {
      const error = new Error("The function must be called while authenticated.");
      logger.error("Billing history fetch failed - not authenticated");
      throw error;
    }

    const userId = request.auth.uid;
    const customerId = request.data.customerId;

    logger.info("Fetching billing history from Stripe", {
      userId,
      customerId,
    });

    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Fetch all billing data with proper expansion (Acacia API)
    const [invoices, subscriptions, customer] = await Promise.all([
      // Get paid invoices with expanded payment_intent data
      stripe.invoices.list({
        customer: customerId,
        status: "paid",
        limit: 100,
        expand: [
          "data.payment_intent",
          "data.payment_intent.latest_charge",
          "data.payment_intent.payment_method",
        ],
      }),

      // Get active subscriptions with default payment method
      stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        expand: ["data.default_payment_method"],
      }),

      // Get customer with default payment method
      stripe.customers.retrieve(customerId, {
        expand: ["invoice_settings.default_payment_method"],
      }),
    ]);

    logger.info("Billing history fetched successfully", {
      userId,
      invoiceCount: invoices.data.length,
      subscriptionCount: subscriptions.data.length,
    });

    return {
      success: true,
      invoices: invoices.data,
      subscriptions: subscriptions.data,
      currentPaymentMethod: customer.invoice_settings?.default_payment_method,
    };
  } catch (error) {
    logger.error("Error fetching billing history", {
      error: error.message,
      stack: error.stack,
      requestData: request.data,
    });

    throw new Error(`Billing history fetch failed: ${error.message}`);
  }
});

/**
 * Create a restricted customer portal session for payment method changes only
 * This uses a specific portal configuration that only allows payment method updates
 * preventing customers from canceling subscriptions from the billing page
 * @param {Object} request - The callable function request
 * @return {Object} Portal session URL
 */
exports.createPaymentMethodPortalSession = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Validate input data
    if (!request.data || !request.data.customerId) {
      const error = new Error("Missing required parameter: customerId");
      logger.error("Payment method portal session creation failed - missing customerId", {
        requestData: request.data,
      });
      throw error;
    }

    // Require authentication
    if (!request.auth) {
      const error = new Error("The function must be called while authenticated.");
      logger.error("Payment method portal session creation failed - not authenticated");
      throw error;
    }

    const userId = request.auth.uid;
    const customerId = request.data.customerId;

    logger.info("Creating payment method portal session", {
      userId,
      customerId,
    });

    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Create portal session with restricted configuration
    // This configuration only allows payment method updates, not subscription cancellation
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: request.data.return_url ||
        `${process.env.PUBLIC_URL}/dashboard/client/billing`,
      configuration: STRIPE_PORTAL_CONFIG_ID,
    });

    logger.info("Payment method portal session created with restricted config", {
      configId: STRIPE_PORTAL_CONFIG_ID,
    });

    logger.info("Payment method portal session created successfully", {
      sessionId: session.id,
      url: session.url,
      userId,
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    logger.error("Error creating payment method portal session", {
      error: error.message,
      stack: error.stack,
      requestData: request.data,
    });

    throw new Error(`Payment method portal session creation failed: ${error.message}`);
  }
});

/**
 * REMOVED: Custom webhook handler
 * 
 * This function has been removed because we're now using the Stripe Extension's
 * built-in webhook handler which properly manages all webhook events.
 * 
 * The Extension handles:
 * - checkout.session.completed
 * - customer.subscription.created/updated/deleted
 * - invoice.payment_succeeded/failed
 * 
 * Our syncSubscriptionToUser trigger below handles copying subscription status
 * from stripe_customers to the users collection.
 */

/**
 * SUBSCRIPTION MANAGEMENT FUNCTIONS
 * Custom functions for cancel, pause, and resume subscription
 * These provide better UX and retention opportunities than Stripe Customer Portal
 */

/**
 * Cancel a subscription at period end
 * User keeps access until current billing period ends
 * @param {Object} request - The callable function request
 * @param {string} request.data.reason - Optional cancellation reason
 * @return {Object} Success response with access end date
 */
exports.cancelSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey, ...PAYPAL_SECRETS],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;
    const reason = request.data?.reason || "User requested cancellation";

    logger.info("Cancel subscription request", {
      userId,
      reason,
    });

    // Get user document
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      throw new Error("No active subscription found");
    }

    // Provider detection: PayPal subscription ids are `I-…`; Stripe are `sub_…`.
    const isPaypal = String(subscriptionId).startsWith("I-") || userData.provider === "paypal";

    let currentPeriodEndSec;
    if (isPaypal) {
      // PayPal has NO native "cancel at period end". We replicate Stripe's UX with a
      // LOCAL flag (cancelAtPeriodEnd) and keep access until currentPeriodEnd; a
      // scheduled function performs the real PayPal /cancel at that date. Reactivate
      // simply clears the flag (no PayPal call needed since we never canceled).
      const existingEnd = userData.currentPeriodEnd?.toMillis
        ? userData.currentPeriodEnd.toMillis()
        : null;
      const lastPaymentMs = userData.lastPaymentDate?.toMillis
        ? userData.lastPaymentDate.toMillis()
        : null;
      const fallback = (lastPaymentMs ? new Date(lastPaymentMs) : new Date());
      if (!existingEnd) fallback.setMonth(fallback.getMonth() + 1);
      currentPeriodEndSec = Math.floor((existingEnd || fallback.getTime()) / 1000);

      await userRef.update({
        cancelAtPeriodEnd: true,
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(currentPeriodEndSec * 1000),
        // Persist the PayPal env so the scheduled finalizer (which has no request
        // context) can resolve the correct credentials when it performs the real
        // /cancel at period end.
        paypalEnv: paymentsModule.normalizePaypalEnv(request.data?.paypalEnv),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("PayPal subscription marked cancel-at-period-end (local flag)", {
        userId,
        subscriptionId,
        currentPeriodEnd: currentPeriodEndSec,
      });
    } else {
      // Initialize Stripe
      const stripe = require("stripe")(stripeKey.value(), {
        apiVersion: "2024-09-30.acacia",
      });

      // Cancel subscription at period end
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      currentPeriodEndSec = subscription.current_period_end;

      logger.info("Subscription canceled in Stripe", {
        userId,
        subscriptionId,
        currentPeriodEnd: currentPeriodEndSec,
      });

      // Update Firestore
      await userRef.update({
        cancelAtPeriodEnd: true,
        canceledAt: admin.firestore.FieldValue.serverTimestamp(),
        currentPeriodEnd: admin.firestore.Timestamp.fromMillis(currentPeriodEndSec * 1000),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info("Subscription cancellation synced to Firestore", {
        userId,
        subscriptionId,
      });
    }

    // Return success with access end date
    const accessUntil = new Date(currentPeriodEndSec * 1000);


    // ACTIVITY FEED: Write subscription_canceled event
    writeActivityEvent({
      type: 'subscription_canceled',
      clientId: userId,
      clientName: userData.name || 'Client',
      trainerId: userData.assignedTrainerId || '',
      message: `${userData.name || 'Client'} canceled subscription`,
      metadata: {
        subscriptionId: subscriptionId,
        accessUntil: accessUntil.toISOString(),
      },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write subscription_canceled event", { userId, error: err.message });
    });

    return {
      success: true,
      message: "Subscription canceled successfully",
      accessUntil: accessUntil.toISOString(),
      currentPeriodEnd: currentPeriodEndSec,
    };
  } catch (error) {
    logger.error("Error canceling subscription", {

      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Subscription cancellation failed: ${error.message}`);
  }
});

/**
 * Pause a subscription for 1, 2, or 3 months
 * Access blocked immediately, billing pauses, auto-resumes on scheduled date
 * @param {Object} request - The callable function request
 * @param {number} request.data.duration - Months to pause (1, 2, or 3)
 * @param {string} request.data.reason - Optional pause reason
 * @return {Object} Success response with resume date
 */
exports.pauseSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey, ...PAYPAL_SECRETS],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;
    const duration = request.data?.duration;
    const reason = request.data?.reason || "User requested pause";

    // Validate duration
    if (![1, 2, 3].includes(duration)) {
      throw new Error("Duration must be 1, 2, or 3 months");
    }

    logger.info("Pause subscription request", {
      userId,
      duration,
      reason,
    });

    // Get user document
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      throw new Error("No active subscription found");
    }

    const isPaypal = String(subscriptionId).startsWith("I-") || userData.provider === "paypal";

    // Calculate resume date (add full months from now)
    const now = new Date();
    const resumeDate = new Date(now);
    resumeDate.setMonth(resumeDate.getMonth() + duration);
    // Keep the same day of month, but set to start of day
    resumeDate.setHours(0, 0, 0, 0);
    const resumeTimestamp = Math.floor(resumeDate.getTime() / 1000);

    if (isPaypal) {
      // PayPal: suspend the subscription now. PayPal has no native auto-resume date,
      // so the scheduled `processScheduledPaypalSubscriptionActions` re-activates it
      // (/activate) at `pauseResumesAt`.
      const cfg = paymentsModule.paypalEnvConfig(
        paymentsModule.normalizePaypalEnv(request.data?.paypalEnv)
      );
      await paymentsModule.PROVIDERS.paypal.suspendSubscription(subscriptionId, cfg);
      logger.info("PayPal subscription suspended", { userId, subscriptionId, resumesAt: resumeTimestamp });
    } else {
      // Initialize Stripe
      const stripe = require("stripe")(stripeKey.value(), {
        apiVersion: "2024-09-30.acacia",
      });

      // Pause subscription in Stripe using pause_collection
      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: {
          behavior: "mark_uncollectible",
          resumes_at: resumeTimestamp,
        },
      });

      logger.info("Subscription paused in Stripe", {
        userId,
        subscriptionId,
        resumesAt: resumeTimestamp,
        resumeDate: resumeDate.toISOString(),
      });
    }

    // Update Firestore
    await userRef.update({
      subscriptionPaused: true,
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      pauseResumesAt: admin.firestore.Timestamp.fromDate(resumeDate),
      pauseDuration: duration,
      // Persist the PayPal env so the scheduled auto-resume (which has no request
      // context) can resolve the correct credentials when it re-activates the sub.
      ...(isPaypal ? { paypalEnv: paymentsModule.normalizePaypalEnv(request.data?.paypalEnv) } : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });


    logger.info("Subscription pause synced to Firestore", {
      userId,
      subscriptionId,
    });

    return {
      success: true,
      message: `Subscription paused for ${duration} month(s)`,
      resumeDate: resumeDate.toISOString(),
      resumeTimestamp: resumeTimestamp,
    };
  } catch (error) {
    logger.error("Error pausing subscription", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Subscription pause failed: ${error.message}`);
  }
});

/**
 * Resume a paused subscription early
 * Billing restarts immediately, full access restored
 * @param {Object} request - The callable function request
 * @return {Object} Success response
 */
exports.resumeSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey, ...PAYPAL_SECRETS],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;

    logger.info("Resume subscription request", {
      userId,
    });

    // Get user document
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      throw new Error("No subscription found");
    }

    if (!userData.subscriptionPaused) {
      throw new Error("Subscription is not paused");
    }

    const isPaypal = String(subscriptionId).startsWith("I-") || userData.provider === "paypal";

    if (isPaypal) {
      // PayPal: re-activate the suspended subscription.
      const cfg = paymentsModule.paypalEnvConfig(
        paymentsModule.normalizePaypalEnv(request.data?.paypalEnv)
      );
      await paymentsModule.PROVIDERS.paypal.activatePaypalSubscription(subscriptionId, cfg);
      logger.info("PayPal subscription re-activated (resume)", { userId, subscriptionId });
    } else {
      // Initialize Stripe
      const stripe = require("stripe")(stripeKey.value(), {
        apiVersion: "2024-09-30.acacia",
      });

      // Resume subscription in Stripe by removing pause_collection
      await stripe.subscriptions.update(subscriptionId, {
        pause_collection: "",
      });

      logger.info("Subscription resumed in Stripe", {
        userId,
        subscriptionId,
      });
    }

    // Update Firestore

    await userRef.update({
      subscriptionPaused: false,
      resumedAt: admin.firestore.FieldValue.serverTimestamp(),
      pauseResumesAt: admin.firestore.FieldValue.delete(),
      pauseDuration: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Subscription resume synced to Firestore", {
      userId,
      subscriptionId,
    });

    return {
      success: true,
      message: "Subscription resumed successfully",
    };
  } catch (error) {
    logger.error("Error resuming subscription", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Subscription resume failed: ${error.message}`);
  }
});

/**
 * Reactivate a canceled subscription (undo cancellation before period ends)
 * Removes the cancel_at_period_end flag, billing continues normally
 * @param {Object} request - The callable function request
 * @return {Object} Success response
 */
exports.reactivateSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;

    logger.info("Reactivate subscription request", {
      userId,
    });

    // Get user document
    const userRef = admin.firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      throw new Error("No subscription found");
    }

    if (!userData.cancelAtPeriodEnd) {
      throw new Error("Subscription is not canceled");
    }

    const isPaypal = String(subscriptionId).startsWith("I-") || userData.provider === "paypal";

    if (isPaypal) {
      // PayPal cancel-at-period-end is a LOCAL flag only (the real PayPal /cancel
      // runs at period end via the scheduled function). So reactivation just clears
      // the flag — no PayPal API call needed since the subscription is still active.
      logger.info("PayPal subscription reactivated (cleared local cancel flag)", { userId, subscriptionId });
    } else {
      // Initialize Stripe
      const stripe = require("stripe")(stripeKey.value(), {
        apiVersion: "2024-09-30.acacia",
      });

      // Reactivate subscription in Stripe by removing cancel_at_period_end
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      logger.info("Subscription reactivated in Stripe", {
        userId,
        subscriptionId,
      });
    }

    // Update Firestore

    await userRef.update({
      cancelAtPeriodEnd: false,
      reactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Keep canceledAt as permanent audit trail
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Subscription reactivation synced to Firestore", {
      userId,
      subscriptionId,
    });

    return {
      success: true,
      message: "Subscription reactivated successfully",
    };
  } catch (error) {
    logger.error("Error reactivating subscription", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Subscription reactivation failed: ${error.message}`);
  }
});

/**
 * Admin-initiated subscription cancellation for a client
 * Cancels subscription at period end (client keeps access until billing period ends)
 * Requires admin role verification
 * @param {Object} request - The callable function request
 * @param {string} request.data.targetUserId - The client's user ID
 * @param {string} request.data.reason - Reason for cancellation
 * @return {Object} Success response with access end date
 */
exports.adminCancelSubscription = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const adminId = request.auth.uid;
    const targetUserId = request.data?.targetUserId;
    const reason = request.data?.reason || "Admin-initiated cancellation";

    if (!targetUserId) {
      throw new Error("Missing required parameter: targetUserId");
    }

    // Verify admin role
    const adminDoc = await admin.firestore().collection("admins").doc(adminId).get();
    if (!adminDoc.exists) {
      throw new Error("Unauthorized: Admin access required");
    }

    logger.info("Admin cancel subscription request", {
      adminId,
      targetUserId,
      reason,
    });

    // Get target user document
    const userRef = admin.firestore().collection("users").doc(targetUserId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const subscriptionId = userData.subscriptionId;

    if (!subscriptionId) {
      throw new Error("No active subscription found for this client");
    }

    if (userData.cancelAtPeriodEnd) {
      throw new Error("Subscription is already set to cancel at period end");
    }

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info("Subscription canceled by admin in Stripe", {
      adminId,
      targetUserId,
      subscriptionId,
      currentPeriodEnd: subscription.current_period_end,
    });

    // Update Firestore
    await userRef.update({
      cancelAtPeriodEnd: true,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      canceledBy: "admin",
      canceledByAdminId: adminId,
      cancelReason: reason,
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log audit
    await admin.firestore().collection("audit_logs").add({
      action: "admin_cancel_subscription",
      targetUserId: targetUserId,
      performedBy: adminId,
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: reason,
      subscriptionId: subscriptionId,
      accessUntil: new Date(subscription.current_period_end * 1000).toISOString(),
    });

    const accessUntil = new Date(subscription.current_period_end * 1000);

    logger.info("Admin subscription cancellation completed", {
      adminId,
      targetUserId,
      subscriptionId,
      accessUntil: accessUntil.toISOString(),
    });

    return {
      success: true,
      message: "Subscription canceled at period end",
      accessUntil: accessUntil.toISOString(),
      currentPeriodEnd: subscription.current_period_end,
    };
  } catch (error) {
    logger.error("Error in admin cancel subscription", {
      error: error.message,
      stack: error.stack,
      adminId: request.auth?.uid,
      targetUserId: request.data?.targetUserId,
    });

    throw new Error(`Admin subscription cancellation failed: ${error.message}`);
  }
});

/**
 * Firestore trigger to sync ONE-TIME payment status from stripe_customers to users
 * This handles one-time payments like 4-pack sessions or single training sessions
 * Triggered whenever a payment document is created or updated in the payments subcollection
 */
exports.syncPaymentToUser = onDocumentWritten({
  document: "stripe_customers/{userId}/payments/{paymentId}",
  region: sharedConfig.region,
  secrets: [stripeKey, resendKey],
}, async (event) => {
  const change = event.data;
  const userId = event.params.userId;
  const paymentId = event.params.paymentId;

  try {
    // If payment was deleted
    if (!change.after.exists) {
      logger.info("Payment deleted", {userId, paymentId});
      return null;
    }

    const paymentData = change.after.data();
    const status = paymentData.status;

    logger.info("One-time payment detected, syncing to user", {
      userId,
      paymentId,
      status,
      amount: paymentData.amount,
    });

    // For one-time payments, if status is 'succeeded', mark user as active
    if (status === "succeeded") {
      // Get current user data to check if already activated
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      
      const updateData = {
        lastPaymentId: paymentId,
        lastPaymentAmount: paymentData.amount || 0,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Only set accountActivated if not already set (write-once boolean)
      if (!userData || !userData.accountActivated) {
        updateData.accountActivated = true;
        
        logger.info("Activating account on first payment", {
          userId,
          paymentId,
        });
      }
      
      // Assign trainer if not already assigned
      
      if (!userData || !userData.assignedTrainerId) {
        logger.info("Assigning trainer to one-time payment customer", {userId});
        
        // Get first admin/trainer from admins collection
        const adminsSnapshot = await admin.firestore()
          .collection("admins")
          .limit(1)
          .get();
        
        if (!adminsSnapshot.empty) {
          const trainerDoc = adminsSnapshot.docs[0];
          const trainerData = trainerDoc.data();
          
          updateData.assignedTrainerId = trainerDoc.id;
          updateData.assignedTrainerCollection = 'admins';  // Multi-trainer architecture: specify source collection
          updateData.assignedTrainerName = trainerData.name || "Your Coach";
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
          
          logger.info("Trainer assigned to user", {
            userId,
            trainerId: trainerDoc.id,
            trainerCollection: 'admins',
            trainerName: trainerData.name,
          });
        } else {
          logger.warn("No trainer found in admins collection", {userId});
        }
      }

      await admin.firestore().collection("users").doc(userId).update(updateData);

      logger.info("User payment synced successfully (one-time payment)", {
        userId,
        accountActivated: updateData.accountActivated || userData.accountActivated,
        paymentId,
        trainerAssigned: !!updateData.assignedTrainerId,
      });

      // Send welcome email (non-blocking, only on first activation)
      if (updateData.accountActivated) {
        // Get fresh user data after update to access name and email
        const userDocRefresh = await admin.firestore().collection("users").doc(userId).get();
        const userDataRefresh = userDocRefresh.data();
        
        // Send welcome email in the background (don't await)
        sendWelcomeEmail(
          userDataRefresh.name,
          userDataRefresh.email,
          updateData.assignedTrainerName || null,
          null // One-time payments don't have tier names typically
        ).catch(error => {
          // Errors already logged in sendWelcomeEmail, just ensure they don't propagate
          logger.warn("Welcome email sending failed but continuing", {userId});
        });
        
        logger.info("Welcome email triggered for one-time payment", {userId});

        // ACTIVITY FEED: Write new_client_signup event on first activation (one-time payment path)
        const clientName = userDataRefresh?.name || userData?.name || 'New Client';
        const assignedTrainerId = updateData.assignedTrainerId || userData?.assignedTrainerId || '';
        
        writeActivityEvent({
          type: 'new_client_signup',
          clientId: userId,
          clientName: clientName,
          trainerId: assignedTrainerId,
          message: `${clientName} signed up`,
          metadata: {},
        }).catch(err => {
          logger.warn("[ActivityFeed] Failed to write new_client_signup event (payment path)", { userId, error: err.message });
        });
      }

      // Check if this is a session package purchase
      const metadata = paymentData.metadata || {};
      if (metadata.type === "session_package") {
        logger.info("Session package purchase detected, creating package", {
          userId,
          paymentId,
          priceId: paymentData.price,
        });
        
        // ACTIVITY FEED: Write session_purchased event
        const { getClientInfoForActivityFeed } = require("./activity-feed");
        getClientInfoForActivityFeed(userId).then(clientInfo => {
          // Try to get product name from payment data for a descriptive message
          const productName = paymentData.items?.[0]?.price?.product?.name || 
                             paymentData.items?.[0]?.description || 
                             'training sessions';
          const amount = paymentData.amount ? `$${(paymentData.amount / 100).toFixed(0)}` : '';
          
          writeActivityEvent({
            type: 'session_purchased',
            clientId: userId,
            clientName: clientInfo.clientName,
            trainerId: clientInfo.trainerId,
            message: amount 
              ? `${clientInfo.clientName} purchased ${productName} (${amount})`
              : `${clientInfo.clientName} purchased ${productName}`,
            metadata: {
              amount: paymentData.amount || 0,
            },
          }).catch(err => {
            logger.warn("[ActivityFeed] Failed to write session_purchased event", { userId, error: err.message });
          });
        });
        
        try {
          await createSessionPackageFromPayment(userId, paymentData);
        } catch (error) {
          logger.error("Failed to create session package", {
            error: error.message,
            userId,
            paymentId,
          });
        }
      }
    }

    return null;
  } catch (error) {
    logger.error("Error syncing one-time payment to user", {
      error: error.message,
      userId,
      paymentId,
    });
    // Don't throw - this is a trigger function
    return null;
  }
});

/**
 * Helper function to create session package from payment
 * Called by syncPaymentToUser when session package purchase is detected
 */
async function createSessionPackageFromPayment(userId, paymentData) {
  // Initialize Stripe to get product details
  const stripe = require("stripe")(stripeKey.value(), {
    apiVersion: "2024-09-30.acacia",
  });

  // Extract data from payment document (Stripe Extension format)
  // The payment document IS the PaymentIntent with items added by extension
  const priceId = paymentData.items[0].price.id;
  const productId = paymentData.items[0].price.product;
  const paymentIntentId = paymentData.id; // Payment intent ID is the document ID

  // Get price and product details from Stripe
  const price = await stripe.prices.retrieve(priceId);
  const product = await stripe.products.retrieve(productId);

  // Determine quantity from product name
  // Expected format: "Single Session" or "4-Pack Training Sessions"
  const productName = product.name || "";
  const quantityMatch = productName.match(/(\d+)/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

  // Calculate expiration date (end of 60th day from purchase)
  const purchaseDate = admin.firestore.Timestamp.now();
  
  // Create a JavaScript Date object and add 60 days
  const expirationDateObj = new Date(purchaseDate.toMillis());
  expirationDateObj.setDate(expirationDateObj.getDate() + 60);
  
  // Set to end of day (23:59:59.999)
  expirationDateObj.setHours(23, 59, 59, 999);
  
  // Convert back to Firestore Timestamp
  const expirationDate = admin.firestore.Timestamp.fromDate(expirationDateObj);

  // Create package object
  const packageData = {
    id: admin.firestore().collection("users").doc().id, // Generate unique ID
    quantity: quantity,
    remaining: quantity,
    purchaseDate: purchaseDate,
    expirationDate: expirationDate,
    expired: false,
    stripePaymentIntentId: paymentIntentId,
    stripePriceId: priceId,
    stripeProductId: product.id,
    stripeProductName: product.name, // Store product name at purchase time for historical accuracy
    amount: paymentData.amount, // Actual amount charged (includes discounts/coupons)
  };

  // Update user document with new package and balance
  const userRef = admin.firestore().collection("users").doc(userId);
  
  await admin.firestore().runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data();
    
    // Get current packages and balance
    const currentPackages = userData.sessionPackages || [];
    const currentBalance = userData.sessionBalance || {
      available: 0,
      purchased: 0,
      used: 0,
      expired: 0,
      lastUpdated: purchaseDate,
    };

    // Add new package
    const updatedPackages = [...currentPackages, packageData];
    
    // Update balance
    const updatedBalance = {
      available: currentBalance.available + quantity,
      purchased: currentBalance.purchased + quantity,
      used: currentBalance.used,
      expired: currentBalance.expired,
      lastUpdated: purchaseDate,
    };

    // Update user document
    transaction.update(userRef, {
      sessionPackages: updatedPackages,
      sessionBalance: updatedBalance,
    });
  });

  logger.info("Session package created successfully", {
    userId,
    packageId: packageData.id,
    quantity,
  });
}

/**
 * SESSION MANAGEMENT SYSTEM
 * Import and export session management functions
 */
const sessionFunctions = require("./sessions");

// Export session management functions (excluding purchaseSessionPackage and stripeSessionWebhook)
// Those are now handled by Stripe Extension's built-in checkout and syncPaymentToUser trigger
// Note: calendlyWebhook now handles BOTH training sessions AND check-ins via smart routing
exports.getSessionBalance = sessionFunctions.getSessionBalance;
exports.calendlyWebhook = sessionFunctions.calendlyWebhook;
exports.expireSessionPackages = sessionFunctions.expireSessionPackages;
exports.cancelSession = sessionFunctions.cancelSession;

/**
 * WORKOUT MANAGEMENT SYSTEM (POLYMORPHIC)
 * Import and export workout management functions
 * Supports the new polymorphic workout system with:
 * - workoutTemplates (blueprints)
 * - workoutAssignments (configured per client)
 * - workoutExecutions (actual performance tracking)
 */
const workoutFunctions = require("./workouts");

// Export workout management functions (UNIFIED MODEL)
exports.assignWorkout = workoutFunctions.assignWorkout;
exports.saveWorkout = workoutFunctions.saveWorkout;  // NEW unified function
exports.completeWorkout = workoutFunctions.completeWorkout;  // NEW unified function
exports.createWorkoutTemplate = workoutFunctions.createWorkoutTemplate;
exports.updateWorkoutTemplate = workoutFunctions.updateWorkoutTemplate;
exports.deleteWorkoutTemplate = workoutFunctions.deleteWorkoutTemplate;
exports.updateWorkoutAssignment = workoutFunctions.updateWorkoutAssignment;  // NEW update assignment function
exports.deleteWorkoutAssignment = workoutFunctions.deleteWorkoutAssignment;  // NEW delete assignment function

/**
 * Firestore trigger to sync subscription status from stripe_customers to users
 * This bridges the Stripe Extension (which updates stripe_customers)
 * with our users collection
 * Triggered whenever a subscription document is created or updated
 */
exports.syncSubscriptionToUser = onDocumentWritten({
  document: "stripe_customers/{userId}/subscriptions/{subscriptionId}",
  region: sharedConfig.region,
  secrets: [resendKey],
}, async (event) => {
  const change = event.data;
  const userId = event.params.userId;
  const subscriptionId = event.params.subscriptionId;

  try {
    // If subscription was deleted
    if (!change.after.exists) {
      logger.info("Subscription deleted, cleaning up user subscription fields", {userId, subscriptionId});
      await admin.firestore().collection("users").doc(userId).update({
        subscriptionId: admin.firestore.FieldValue.delete(),
        subscriptionStatus: admin.firestore.FieldValue.delete(),
        subscriptionEndedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return null;
    }

    const subscriptionData = change.after.data();
    const status = subscriptionData.status;

    logger.info("Subscription change detected, syncing to user", {
      userId,
      subscriptionId,
      status,
    });

    // Get current user data to check account activation status
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const userData = userDoc.data();

    // Prepare update object
    const updateData = {
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // When subscription is fully canceled (immediate cancellation, not cancel-at-period-end),
    // clean up subscriptionId so the user can re-subscribe via the upgrade page.
    // For active/trialing/past_due subscriptions, keep the subscriptionId.
    if (status === "canceled") {
      updateData.subscriptionId = admin.firestore.FieldValue.delete();
      updateData.subscriptionEndedAt = admin.firestore.FieldValue.serverTimestamp();
      
      logger.info("Subscription fully canceled, cleaning up subscriptionId from user doc", {
        userId,
        subscriptionId,
      });
    } else {
      updateData.subscriptionId = subscriptionId;
    }

    // Extract tier info from subscription metadata (set during checkout)
    const metadata = subscriptionData.metadata || {};
    if (metadata.tierId && metadata.tierName) {
      updateData.tier = metadata.tierId;
      updateData.tierName = metadata.tierName;
      
      logger.info("Updating tier from subscription metadata", {
        userId,
        tier: metadata.tierId,
        tierName: metadata.tierName,
      });
    }

    // Only set accountActivated on first active subscription (write-once)
    if (status === "active" && (!userData || !userData.accountActivated)) {
      updateData.accountActivated = true;
      
      logger.info("Activating account on first subscription", {
        userId,
        subscriptionId,
      });
    }

    // If subscription is active and user doesn't have a trainer assigned, assign one
    if (status === "active") {
      if (!userData || !userData.assignedTrainerId) {
        logger.info("Assigning trainer to new active subscriber", {userId});
        
        // Get first admin/trainer from admins collection
        const adminsSnapshot = await admin.firestore()
          .collection("admins")
          .limit(1)
          .get();
        
        if (!adminsSnapshot.empty) {
          const trainerDoc = adminsSnapshot.docs[0];
          const trainerData = trainerDoc.data();
          
          updateData.assignedTrainerId = trainerDoc.id;
          updateData.assignedTrainerCollection = 'admins';  // Multi-trainer architecture: specify source collection
          updateData.assignedTrainerName = trainerData.name || "Your Coach";
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
          
          logger.info("Trainer assigned to user", {
            userId,
            trainerId: trainerDoc.id,
            trainerCollection: 'admins',
            trainerName: trainerData.name,
          });
        } else {
          logger.warn("No trainer found in admins collection", {userId});
        }
      }
    }

    // Update the users collection with subscription status and trainer assignment
    await admin.firestore().collection("users").doc(userId).update(updateData);

    logger.info("User subscription synced successfully", {
      userId,
      subscriptionStatus: status,
      subscriptionId,
      trainerAssigned: !!updateData.assignedTrainerId,
    });

    // Auto-create setup goal for online coaching subscriptions
    // Get trainer from either new assignment OR existing user data
    const trainerId = updateData.assignedTrainerId || userData?.assignedTrainerId;
    
    if (status === "active" && trainerId) {
      const metadata = subscriptionData.metadata || {};
      
      // Check if this tier includes check-ins (Online Coaching or Complete Transformation)
      // Uses centralized product config to determine eligibility
      const isOnlineCoaching = metadata.tierId && CHECKIN_ELIGIBLE_PRODUCTS.includes(metadata.tierId);
      
      if (isOnlineCoaching) {
        logger.info("Creating setup goal for online coaching subscription", {userId, trainerId});
        
        try {
          const setupGoalRef = admin.firestore()
            .collection("goals")
            .doc(`${userId}_setup`);
          
          // Check if already exists
          const existingGoal = await setupGoalRef.get();
          
          if (!existingGoal.exists) {
            const now = admin.firestore.Timestamp.now();
            const deadline = admin.firestore.Timestamp.fromDate(
              new Date(Date.now() + ONBOARDING_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
            );
            
            await setupGoalRef.set({
              clientId: userId,
              trainerId: trainerId,
              category: "setup",
              title: "Complete Your Onboarding",
              term: "short-term",
              priority: "high",
              isActive: true,
              isConfigured: true,
              targetValue: 3,
              currentValue: 0,
              unit: "tasks",
              lowerIsBetter: false,
              status: "active",
              deadline: deadline,
              completedAt: null,
              milestones: [
                {
                  id: `${userId}_setup_m0`,
                  order: 1,
                  text: "Schedule your 30-minute planning consultation",
                  targetValue: 1,
                  completed: false,
                  completedAt: null,
                  autoTracked: false,
                  createdAt: now,
                  updatedAt: now,
                },
                {
                  id: `${userId}_setup_m1`,
                  order: 2,
                  text: "Complete your consultation",
                  targetValue: 2,
                  completed: false,
                  completedAt: null,
                  autoTracked: false,
                  createdAt: now,
                  updatedAt: now,
                },
                {
                  id: `${userId}_setup_m2`,
                  order: 3,
                  text: "Receive your personalized fitness plan",
                  targetValue: 3,
                  completed: false,
                  completedAt: null,
                  autoTracked: false,
                  createdAt: now,
                  updatedAt: now,
                },
              ],
              createdAt: now,
              updatedAt: now,
              createdBy: trainerId,
            });
            
            logger.info("Setup goal created successfully", {userId});
          }
        } catch (error) {
          logger.error("Failed to create setup goal", {
            userId,
            error: error.message,
          });
          // Don't fail the whole subscription sync if goal creation fails
        }
      }
    }

    // Send welcome email (non-blocking, only on first activation)
    if (status === "active" && updateData.accountActivated) {
      // Get fresh user data to access name and email
      const userDocRefresh = await admin.firestore().collection("users").doc(userId).get();
      const userDataRefresh = userDocRefresh.data();
      
      // Send welcome email in the background (don't await)
      sendWelcomeEmail(
        userDataRefresh.name,
        userDataRefresh.email,
        updateData.assignedTrainerName || userData?.assignedTrainerName,
        updateData.tierName || userData?.tierName
      ).catch(error => {
        // Errors already logged in sendWelcomeEmail, just ensure they don't propagate
        logger.warn("Welcome email sending failed but continuing", {userId});
      });
      
      logger.info("Welcome email triggered for new subscription", {userId});
    }

    // ACTIVITY FEED: Write new_client_signup event on first activation
    if (status === "active" && updateData.accountActivated) {
      const clientName = userData?.name || 'New Client';
      const assignedTrainerId = updateData.assignedTrainerId || userData?.assignedTrainerId || '';
      const tierDisplayName = updateData.tierName || userData?.tierName || '';
      
      writeActivityEvent({
        type: 'new_client_signup',
        clientId: userId,
        clientName: clientName,
        trainerId: assignedTrainerId,
        message: tierDisplayName
          ? `${clientName} signed up (${tierDisplayName})`
          : `${clientName} signed up`,
        metadata: {
          tierName: tierDisplayName,
        },
      }).catch(err => {
        logger.warn("[ActivityFeed] Failed to write new_client_signup event", { userId, error: err.message });
      });
    }

    return null;
  } catch (error) {
    logger.error("Error syncing subscription to user", {
      error: error.message,
      userId,
      subscriptionId,
    });
    // Don't throw - this is a trigger function
    return null;
  }
});

/**
 * Firestore trigger to verify reCAPTCHA token for new user signups
 * Triggered when a new user document is created with a reCAPTCHA token
 * Verifies the token with Google and updates the user document with the score
 */
exports.verifyRecaptcha = onDocumentWritten({
  document: "users/{userId}",
  region: sharedConfig.region,
}, async (event) => {
  const change = event.data;
  const userId = event.params.userId;

  try {
    // Only process new documents with reCAPTCHA tokens
    if (!change.after.exists || change.before.exists) {
      return null;
    }

    const userData = change.after.data();
    
    // Skip if no reCAPTCHA token or already verified
    if (!userData.recaptchaToken || userData.recaptchaVerified) {
      return null;
    }

    logger.info("Verifying reCAPTCHA for new user", {userId});

    // Get reCAPTCHA secret from environment
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
      logger.error("reCAPTCHA secret key not configured");
      return null;
    }

    // Verify token with Google reCAPTCHA API
    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify";
    const response = await fetch(verificationUrl, {
      method: "POST",
      headers: {"Content-Type": "application/x-www-form-urlencoded"},
      body: `secret=${secretKey}&response=${userData.recaptchaToken}`,
    });

    const result = await response.json();

    logger.info("reCAPTCHA verification result", {
      userId,
      success: result.success,
      score: result.score,
      action: result.action,
    });

    // Update user document with verification result
    await admin.firestore().collection("users").doc(userId).update({
      recaptchaVerified: result.success,
      recaptchaScore: result.score || 0,
      recaptchaAction: result.action || null,
      recaptchaToken: admin.firestore.FieldValue.delete(), // Remove token after verification
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Log suspicious accounts (score < 0.5)
    if (result.success && result.score < 0.5) {
      logger.warn("Suspicious account detected - low reCAPTCHA score", {
        userId,
        email: userData.email,
        score: result.score,
      });
      
      // Optionally, you could flag the account or notify admins
      await admin.firestore().collection("users").doc(userId).update({
        accountFlags: admin.firestore.FieldValue.arrayUnion("low-recaptcha-score"),
      });
    }

    return null;
  } catch (error) {
    logger.error("Error verifying reCAPTCHA", {
      error: error.message,
      userId,
    });
    return null;
  }
});

/**
 * Scheduled function to clean up abandoned accounts that never activated
 * Runs daily at 2 AM UTC to remove accounts that:
 * - Have accountActivated === false (never completed payment)
 * - Were created more than 48 hours ago
 * 
 * This prevents database bloat from abandoned signups and test accounts
 */
exports.cleanupPendingAccounts = onSchedule({
  schedule: "0 2 * * *", // Every day at 2 AM UTC
  timeZone: "UTC",
  region: sharedConfig.region,
}, async (event) => {
  try {
    logger.info("Starting pending account cleanup job");

    const now = admin.firestore.Timestamp.now();
    const fortyEightHoursAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (48 * 60 * 60 * 1000),
    );

    // Find unactivated accounts older than 48 hours
    const usersRef = admin.firestore().collection("users");
    const pendingAccountsQuery = usersRef
        .where("accountActivated", "==", false)
        .where("createdAt", "<", fortyEightHoursAgo);

    const snapshot = await pendingAccountsQuery.get();

    if (snapshot.empty) {
      logger.info("No pending accounts to clean up");
      return null;
    }

    logger.info(`Found ${snapshot.size} pending accounts to clean up`);

    const batch = admin.firestore().batch();
    let deleteCount = 0;

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      logger.info("Deleting pending account", {
        userId,
        email: userData.email,
        createdAt: userData.createdAt,
        daysSinceCreation: Math.floor(
            (now.toMillis() - userData.createdAt.toMillis()) / (24 * 60 * 60 * 1000),
        ),
      });

      // Delete user document
      batch.delete(doc.ref);
      deleteCount++;

      // Also delete from Firebase Auth
      try {
        await admin.auth().deleteUser(userId);
        logger.info("Deleted Firebase Auth user", {userId});
      } catch (authError) {
        logger.warn("Failed to delete Firebase Auth user (may not exist)", {
          userId,
          error: authError.message,
        });
      }

      // Note: stripe_customers collection will be cleaned up by Stripe Extension
      // if configured with DELETE_STRIPE_CUSTOMERS = Auto delete
    }

    // Commit the batch
    await batch.commit();

    logger.info("Pending account cleanup completed", {
      accountsDeleted: deleteCount,
    });

    return {
      success: true,
      accountsDeleted: deleteCount,
    };
  } catch (error) {
    logger.error("Error in pending account cleanup", {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - this is a scheduled function
    return null;
  }
});

/**
 * ACCOUNT DELETION FUNCTION (THREE MODES)
 * Admin-initiated account deletion with proper data handling
 * Modes:
 * - mock: Preview what would be deleted (no actual deletion)
 * - no-traces: Complete removal of all data including financials
 * - gdpr-clean: GDPR-compliant deletion preserving financial records
 */
exports.deleteAccount = onCall({
  region: sharedConfig.region,
  secrets: PAYPAL_SECRETS, // PayPal seam handles subscription cancel + credit refunds
  cors: true,
}, async (request) => {
  // Auth + admin-role gate (the shared helper assumes the caller is authorized).
  if (!request.auth) {
    throw new Error("Authentication required");
  }
  const adminId = request.auth.uid;

  const adminDoc = await admin.firestore().collection("admins").doc(adminId).get();
  if (!adminDoc.exists) {
    throw new Error("Unauthorized: Admin access required");
  }

  // Delegate to the shared, provider-neutral deletion helper (also used by the
  // bulk-delete-test-accounts.js script). The helper validates the mode, performs
  // the deletion, and writes the deleted_accounts + audit_logs records.
  return performAccountDeletion({
    targetUserId: request.data?.targetUserId,
    mode: request.data?.mode || "gdpr-clean", // default for backward compatibility
    adminOverride: request.data?.adminOverride || false,
    reason: request.data?.reason || "Admin-initiated deletion",
    creditsToRefund: request.data?.creditsToRefund,
    paypalEnv: request.data?.paypalEnv,
    performedBy: adminId,
  });
});


/**
 * Update user email using Admin SDK (bypasses client-side restrictions)
 * Verifies OTP was completed before changing email
 * Updates Firebase Auth, Firestore, and Stripe in one atomic operation
 */
exports.updateUserEmail = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;
    const newEmail = request.data?.newEmail;

    if (!newEmail) {
      throw new Error("Missing required parameter: newEmail");
    }

    logger.info("Updating user email", {
      userId,
      newEmail,
    });

    // STEP 1: Verify OTP was completed for new email
    const otpRef = admin.firestore().collection("verifiedEmails").doc(newEmail);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists || !otpDoc.data().verified) {
      throw new Error("Email verification required. Please verify the new email first.");
    }

    logger.info("OTP verification confirmed", {userId, newEmail});

    // STEP 2: Get current user data
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const oldEmail = userData.email;

    // STEP 3: Update Firebase Auth email using Admin SDK (bypasses client restrictions)
    try {
      await admin.auth().updateUser(userId, {
        email: newEmail,
        emailVerified: true, // Mark as verified since we validated OTP
      });
      
      logger.info("Firebase Auth email updated", {userId, oldEmail, newEmail});
    } catch (authError) {
      logger.error("Failed to update Firebase Auth email", {
        error: authError.message,
        userId,
      });
      throw new Error(`Failed to update email in authentication system: ${authError.message}`);
    }

    // STEP 4: Update Firestore user document
    try {
      await admin.firestore().collection("users").doc(userId).update({
        email: newEmail,
        emailVerified: true,
        previousEmail: oldEmail,
        emailChangeDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      logger.info("Firestore user document updated", {userId});
    } catch (firestoreError) {
      logger.error("Failed to update Firestore", {
        error: firestoreError.message,
        userId,
      });
      // Continue - Auth is already updated, Firestore can sync later
    }

    // STEP 5: Update Stripe customer email
    const stripeCustomerId = userData.stripeCustomerId;
    if (stripeCustomerId) {
      try {
        const stripe = require("stripe")(stripeKey.value(), {
          apiVersion: "2024-09-30.acacia",
        });

        await stripe.customers.update(stripeCustomerId, {
          email: newEmail,
        });

        logger.info("Stripe customer email updated", {
          userId,
          stripeCustomerId,
        });
      } catch (stripeError) {
        logger.error("Failed to update Stripe customer email", {
          error: stripeError.message,
          userId,
        });
        // Continue - Stripe can be updated manually if needed
      }
    }

    // STEP 6: Clean up OTP record
    try {
      await otpRef.delete();
      logger.info("OTP record cleaned up", {newEmail});
    } catch (cleanupError) {
      logger.warn("Failed to cleanup OTP record", {error: cleanupError.message});
      // Non-critical - scheduled cleanup will handle this
    }

    logger.info("Email update completed successfully", {
      userId,
      oldEmail,
      newEmail,
    });

    return {
      success: true,
      message: "Email updated successfully",
      newEmail: newEmail,
    };
  } catch (error) {
    logger.error("Error updating user email", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    throw new Error(`Email update failed: ${error.message}`);
  }
});

/**
 * Update Stripe customer email when user changes their email
 * Called from frontend after Firebase Auth email is updated
 */
exports.updateStripeCustomerEmail = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("The function must be called while authenticated.");
    }

    const userId = request.auth.uid;
    const newEmail = request.data?.newEmail;

    if (!newEmail) {
      throw new Error("Missing required parameter: newEmail");
    }

    logger.info("Updating Stripe customer email", {
      userId,
      newEmail,
    });

    // Get user document to find Stripe customer ID
    const userDoc = await admin.firestore().collection("users").doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    if (!stripeCustomerId) {
      // No Stripe customer yet - this is okay, return success
      logger.info("No Stripe customer found, skipping email update", {
        userId,
      });
      return {
        success: true,
        message: "No Stripe customer to update",
      };
    }

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Update Stripe customer email
    await stripe.customers.update(stripeCustomerId, {
      email: newEmail,
    });

    logger.info("Stripe customer email updated successfully", {
      userId,
      stripeCustomerId,
      newEmail,
    });

    return {
      success: true,
      message: "Stripe customer email updated successfully",
    };
  } catch (error) {
    logger.error("Error updating Stripe customer email", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    // Return error info but don't fail the whole email change
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * WELCOME EMAIL SYSTEM
 * Send welcome email to new clients after account activation
 */

/**
 * Send welcome email to new client
 * Non-blocking function that sends a branded welcome email with next steps
 * @param {string} clientName - Client's name
 * @param {string} clientEmail - Client's email address
 * @param {string} trainerName - Assigned trainer's name (optional)
 * @param {string} tierName - Service tier name (optional)
 */
async function sendWelcomeEmail(clientName, clientEmail, trainerName = null, tierName = null) {
  try {
    logger.info("Sending welcome email", {
      clientEmail,
      clientName,
      trainerName,
      tierName,
    });

    const {Resend} = require("resend");
    const resend = new Resend(resendKey.value());

    // Determine greeting based on available info
    const greeting = clientName ? clientName.split(' ')[0] : 'there';
    const trainerInfo = trainerName 
      ? `<p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
           You've been assigned to work with <strong>${trainerName}</strong>, who will be your dedicated coach throughout your fitness journey.
         </p>`
      : '';
    
    const tierInfo = tierName
      ? `<p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 4px;">
           <strong>Your Plan:</strong> ${tierName}
         </p>`
      : '';

    await resend.emails.send({
      from: "Shrey.Fit Support <support@shrey.fit>",
      to: clientEmail,
      subject: "Welcome to Shrey.Fit - Let's Start Your Transformation! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 32px; font-weight: 700;">Welcome to Shrey.Fit! 🎉</h1>
                      <p style="color: #d1fae5; margin: 0; font-size: 16px;">Your fitness journey starts now</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Hi ${greeting}! 👋</h2>
                      
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        We're thrilled to have you join the Shrey.Fit community! You've taken the first step towards transforming your health and achieving your fitness goals.
                      </p>
                      
                      ${tierInfo}
                      ${trainerInfo}
                      
                      <h3 style="color: #333333; margin: 30px 0 15px 0; font-size: 20px; font-weight: 600;">What's Next? 🚀</h3>
                      
                      <div style="margin: 0 0 20px 0;">
                        <div style="display: flex; align-items: start; margin-bottom: 15px;">
                          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                          <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0;">
                            <strong>Access Your Dashboard:</strong> Log in to view your personalized plan, track progress, and connect with your coach.
                          </p>
                        </div>
                        
                        <div style="display: flex; align-items: start; margin-bottom: 15px;">
                          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                          <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0;">
                            <strong>Complete Your Profile:</strong> Add your fitness goals, preferences, and any relevant health information.
                          </p>
                        </div>
                        
                        <div style="display: flex; align-items: start; margin-bottom: 15px;">
                          <span style="color: #10b981; font-size: 20px; margin-right: 10px;">✓</span>
                          <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 0;">
                            <strong>Schedule Your First Session:</strong> Book time with your coach to discuss your goals and create your customized plan.
                          </p>
                        </div>
                      </div>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="https://shrey.fit/dashboard" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                              Go to Dashboard →
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0;">
                        <h4 style="color: #059669; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">💡 Pro Tip</h4>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                          Set aside 15 minutes today to explore your dashboard and familiarize yourself with the platform. The more engaged you are, the better your results will be!
                        </p>
                      </div>
                      
                      <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 30px 0 0 0;">
                        Have questions? We're here to help! Reply to this email or reach out to us at <a href="mailto:support@shrey.fit" style="color: #10b981; text-decoration: none;">support@shrey.fit</a>
                      </p>
                      
                      <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 20px 0 0 0;">
                        Let's make this transformation happen together!
                      </p>
                      
                      <p style="color: #666666; font-size: 15px; line-height: 1.6; margin: 10px 0 0 0; font-weight: 600;">
                        The Shrey.Fit Team
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 13px; margin: 0 0 10px 0; line-height: 1.5;">
                        <a href="https://shrey.fit" style="color: #10b981; text-decoration: none; margin: 0 10px;">Website</a> •
                        <a href="https://shrey.fit/about" style="color: #10b981; text-decoration: none; margin: 0 10px;">About</a> •
                        <a href="https://shrey.fit/contact" style="color: #10b981; text-decoration: none; margin: 0 10px;">Contact</a>
                      </p>
                      <p style="color: #999999; font-size: 12px; margin: 10px 0 0 0; line-height: 1.5;">
                        © ${new Date().getFullYear()} Shrey.Fit. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logger.info("Welcome email sent successfully", {clientEmail});
    return {success: true};
  } catch (error) {
    // Log error but don't throw - welcome email should not block signup
    logger.error("Failed to send welcome email (non-blocking)", {
      error: error.message,
      stack: error.stack,
      clientEmail,
    });
    return {success: false, error: error.message};
  }
}

/**
 * EMAIL VERIFICATION SYSTEM
 * OTP-based email verification for signup
 */

/**
 * Send OTP verification code to email
 * Used during signup to verify email ownership before account creation
 * @param {Object} request - The callable function request
 * @param {string} request.data.email - Email address to verify
 * @return {Object} Success response
 */
exports.sendEmailVerificationOTP = onCall({
  region: sharedConfig.region,
  secrets: [resendKey],
  cors: true,
}, async (request) => {
  try {
    const email = request.data?.email;

    if (!email) {
      throw new Error("Missing required parameter: email");
    }

    logger.info("Sending email verification OTP", {email});

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Firestore with email as document ID
    const otpRef = admin.firestore().collection("verifiedEmails").doc(email);
    
    await otpRef.set({
      code: otp,
      email: email,
      verified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromMillis(
          Date.now() + (10 * 60 * 1000), // 10 minutes
      ),
      attempts: 0,
    });

    // Send email via Resend
    const {Resend} = require("resend");
    const resend = new Resend(resendKey.value());

    await resend.emails.send({
      from: "verify@shrey.fit",
      to: email,
      subject: "Verify Your Email Address",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Shrey.Fit</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333333; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Verify Your Email Address</h2>
                      
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Thank you for signing up with Shrey.Fit. To complete your registration and secure your account, please enter the verification code below:
                      </p>
                      
                      <!-- OTP Box -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 8px; padding: 20px 40px; display: inline-block;">
                              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #059669; font-family: 'Courier New', monospace;">
                                ${otp}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                        This code expires in <strong>10 minutes</strong>
                      </p>
                      
                      <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                        If you didn't request this code, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
                        © ${new Date().getFullYear()} Shrey.Fit
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    logger.info("OTP email sent successfully", {email});

    return {
      success: true,
      message: "Verification code sent to your email",
    };
  } catch (error) {
    logger.error("Error sending OTP email", {
      error: error.message,
      stack: error.stack,
      email: request.data?.email,
    });

    throw new Error(`Failed to send verification code: ${error.message}`);
  }
});

/**
 * Verify OTP code and mark email as verified
 * @param {Object} request - The callable function request
 * @param {string} request.data.email - Email address being verified
 * @param {string} request.data.otp - 6-digit OTP code
 * @return {Object} Success response or error
 */
exports.verifyEmailOTP = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    const {email, otp} = request.data || {};

    if (!email || !otp) {
      throw new Error("Missing required parameters: email and otp");
    }

    if (otp.length !== 6) {
      throw new Error("Invalid code format");
    }

    logger.info("Verifying OTP", {email});

    // Get OTP document
    const otpRef = admin.firestore().collection("verifiedEmails").doc(email);
    const otpDoc = await otpRef.get();

    if (!otpDoc.exists) {
      throw new Error("No verification code found. Please request a new code.");
    }

    const otpData = otpDoc.data();

    // Check if already verified
    if (otpData.verified) {
      return {
        success: true,
        message: "Email already verified",
      };
    }

    // Check expiry
    if (Date.now() > otpData.expiresAt.toMillis()) {
      await otpRef.delete();
      throw new Error("Code expired. Please request a new code.");
    }

    // Check attempts (max 3)
    if (otpData.attempts >= 3) {
      await otpRef.delete();
      throw new Error("Too many attempts. Please request a new code.");
    }

    // Verify code
    if (otpData.code !== otp) {
      // Increment attempts
      await otpRef.update({
        attempts: admin.firestore.FieldValue.increment(1),
      });

      const remainingAttempts = 3 - (otpData.attempts + 1);
      throw new Error(
          `Invalid code. ${remainingAttempts} ${remainingAttempts === 1 ? "attempt" : "attempts"} remaining.`,
      );
    }

    // SUCCESS - Mark as verified
    await otpRef.update({
      verified: true,
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Email verified successfully", {email});

    return {
      success: true,
      message: "Email verified successfully",
    };
  } catch (error) {
    logger.error("Error verifying OTP", {
      error: error.message,
      email: request.data?.email,
    });

    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Scheduled function to clean up old email verification records
 * Runs daily at 2 AM UTC to remove:
 * - Verified records older than 30 days (audit trail)
 * - Expired/unverified records older than 1 day (spam prevention)
 * 
 * This prevents database bloat while maintaining audit history for recent verifications
 */
exports.cleanupExpiredVerifications = onSchedule({
  schedule: "0 2 * * *", // Every day at 2 AM UTC
  timeZone: "UTC",
  region: sharedConfig.region,
}, async (event) => {
  try {
    logger.info("Starting email verification cleanup job");

    const now = admin.firestore.Timestamp.now();
    
    // Calculate cutoff dates
    const thirtyDaysAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (30 * 24 * 60 * 60 * 1000),
    );
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - (24 * 60 * 60 * 1000),
    );

    let deletedCount = 0;

    // PART 1: Delete verified records older than 30 days
    logger.info("Cleaning up verified records older than 30 days");
    const verifiedQuery = admin.firestore()
        .collection("verifiedEmails")
        .where("verified", "==", true)
        .where("verifiedAt", "<", thirtyDaysAgo);

    const verifiedSnapshot = await verifiedQuery.get();

    if (!verifiedSnapshot.empty) {
      const batch1 = admin.firestore().batch();
      verifiedSnapshot.docs.forEach((doc) => {
        batch1.delete(doc.ref);
        deletedCount++;
      });
      await batch1.commit();
      logger.info(`Deleted ${verifiedSnapshot.size} old verified records`);
    }

    // PART 2: Delete expired/unverified records older than 1 day
    logger.info("Cleaning up expired/unverified records older than 1 day");
    const expiredQuery = admin.firestore()
        .collection("verifiedEmails")
        .where("verified", "==", false)
        .where("expiresAt", "<", oneDayAgo);

    const expiredSnapshot = await expiredQuery.get();

    if (!expiredSnapshot.empty) {
      const batch2 = admin.firestore().batch();
      expiredSnapshot.docs.forEach((doc) => {
        batch2.delete(doc.ref);
        deletedCount++;
      });
      await batch2.commit();
      logger.info(`Deleted ${expiredSnapshot.size} expired/unverified records`);
    }

    logger.info("Email verification cleanup completed", {
      totalDeleted: deletedCount,
    });

    return {
      success: true,
      deletedCount: deletedCount,
    };
  } catch (error) {
    logger.error("Error in email verification cleanup", {
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - this is a scheduled function
    return null;
  }
});

/**
 * LOGIN HISTORY TRACKING
 * Track user login attempts for security monitoring
 * Records device info, location, and success/failure status
 */
exports.trackLogin = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  try {
    // Verify authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const userId = request.auth.uid;
    const { device, location, success, failureReason } = request.data || {};

    logger.info("Tracking login attempt", {
      userId,
      success: success !== false, // Default to true if not specified
      deviceType: device?.type,
    });

    // Create login history record
    const loginRecord = {
      userId: userId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      success: success !== false, // Default to true (successful login)
      
      device: {
        type: device?.type || 'unknown',
        browser: device?.browser || 'Unknown',
        os: device?.os || 'Unknown',
        userAgent: device?.userAgent || null,
      },
      
      location: {
        ip: location?.ip || 'Unknown',
        city: location?.city || 'Unknown',
        state: location?.state || 'Unknown',
        country: location?.country || 'Unknown',
        countryCode: location?.countryCode || 'XX',
      },
      
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Add failure info if login failed
    if (success === false && failureReason) {
      loginRecord.failureReason = failureReason;
    }

    // Save to Firestore
    await admin.firestore().collection('login_history').add(loginRecord);

    // Also update lastLoginAt on user document (for trainer dashboard metrics)
    if (loginRecord.success && loginRecord.userId) {
      await admin.firestore().collection('users').doc(loginRecord.userId).update({
        lastLoginAt: admin.firestore.Timestamp.now(),
      }).catch((err) => {
        // Don't fail the login recording if user doc update fails
        logger.warn('Failed to update lastLoginAt on user document', { userId: loginRecord.userId, error: err.message });
      });
    }

    logger.info("Login tracked successfully", { userId });

    // ACTIVITY FEED + LOGIN STREAK: Process client login events
    if (loginRecord.success) {
      const userDocForFeed = await admin.firestore().collection('users').doc(userId).get();
      if (userDocForFeed.exists && userDocForFeed.data().role === 'client') {
        const feedUserData = userDocForFeed.data();

        // Activity Feed: client_login event
        writeActivityEvent({
          type: 'client_login',
          clientId: userId,
          clientName: feedUserData.name || 'Client',
          trainerId: feedUserData.assignedTrainerId || '',
          message: `${feedUserData.name || 'Client'} logged in`,
          metadata: {},
        }).catch(err => {
          logger.warn("[ActivityFeed] Failed to write client_login event", {userId, error: err.message});
        });

        // LOGIN STREAK: Count consecutive days with a login
        // Check last 60 days and find the longest run ending today
        const todayStr = new Date().toISOString().split('T')[0];
        const loginHistorySnapshot = await admin.firestore()
          .collection('login_history')
          .where('userId', '==', userId)
          .where('success', '==', true)
          .orderBy('timestamp', 'desc')
          .limit(60)
          .get();

        // Build a set of unique dates with successful logins
        const loginDates = new Set();
        loginHistorySnapshot.forEach((doc) => {
          const ts = doc.data().timestamp;
          if (ts) {
            const d = ts.toDate ? ts.toDate() : new Date(ts);
            loginDates.add(d.toISOString().split('T')[0]);
          }
        });
        loginDates.add(todayStr); // Include today's login

        // Count consecutive days ending today
        let streak = 0;
        const today = new Date(todayStr);
        for (let i = 0; i < 60; i++) {
          const check = new Date(today);
          check.setDate(today.getDate() - i);
          const checkStr = check.toISOString().split('T')[0];
          if (loginDates.has(checkStr)) {
            streak++;
          } else {
            break;
          }
        }

        // Progressive streak milestones:
        // Days 1–30: every 3 days (streak % 3 === 0)
        // Days 31–60: every 5 days ((streak - 30) % 5 === 0)
        // Day 61+:   every 7 days ((streak - 60) % 7 === 0)
        const isStreakMilestone =
          (streak <= 30 && streak % 3 === 0) ||
          (streak > 30 && streak <= 60 && (streak - 30) % 5 === 0) ||
          (streak > 60 && (streak - 60) % 7 === 0);
        if (isStreakMilestone) {
          writeClientNotification({
            type: "login_streak",
            clientId: userId,
            message: `🔥 ${streak}-day login streak! You're on a roll — keep it up!`,
            actionUrl: "/dashboard/client",
            metadata: {streakDays: streak},
          }).catch((err) => {
            logger.warn("[ClientNotifications] Failed to write login_streak notification", {userId, error: err.message});
          });
          logger.info("[ClientNotifications] login_streak notification sent", {userId, streak});
        }
      }
    }

    return {
      success: true,
      message: "Login tracked successfully",
    };
  } catch (error) {
    logger.error("Error tracking login", {
      error: error.message,
      stack: error.stack,
      userId: request.auth?.uid,
    });

    // Don't throw - login tracking shouldn't block the login process
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * GOALS & MILESTONES SYSTEM
 * Auto-tracking functions for goal progress
 */
const goalFunctions = require("./goals");
exports.onDailyActivityWrite = goalFunctions.onDailyActivityWrite;
exports.onWorkoutComplete = goalFunctions.onWorkoutComplete;
exports.onWorkoutChange = goalFunctions.onWorkoutChange;
exports.onWeightLog = goalFunctions.onWeightLog;
exports.onNutritionLogWrite = goalFunctions.onNutritionLogWrite;
exports.onGoalWrite = goalFunctions.onGoalWrite;  // Activity Feed: goal_completed + milestone_completed

/**
 * MIGRATION FUNCTIONS
 * One-time or administrative functions for data migrations
 */
const migrationFunctions = require('./migrate-session-locations');
exports.migrateSessionLocations = migrationFunctions.migrateSessionLocations;

const exerciseNameFixFunctions = require('./fix-exercise-names');
exports.fixExerciseNames = exerciseNameFixFunctions.fixExerciseNames;

/**
 * ACTIVITY FEED: Nutrition habits day completed trigger
 * Fires when a client completes all nutrition habits for the day (Healthy Habits approach)
 * The meal plan approach is handled by onNutritionLogWrite in goals.js
 */
exports.onNutritionHabitsWrite = onDocumentWritten({
  document: "nutritionLogs/{userId}/habits/{date}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return null;
    
    const userId = event.params.userId;
    const date = event.params.date;
    
    // Check if dayComplete is true
    if (after.dayComplete !== true) return null;
    
    // Check if it just flipped to true (not a re-save)
    const before = event.data.before.exists ? event.data.before.data() : null;
    if (before && before.dayComplete === true) return null;
    
    // Get client info and write event
    const { getClientInfoForActivityFeed } = require("./activity-feed");
    const clientInfo = await getClientInfoForActivityFeed(userId);
    
    writeActivityEvent({
      type: 'nutrition_day_completed',
      clientId: userId,
      clientName: clientInfo.clientName,
      trainerId: clientInfo.trainerId,
      message: `${clientInfo.clientName} completed all nutrition habits for today`,
      metadata: { date: date },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write nutrition habits completed event", { userId, error: err.message });
    });
    
    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onNutritionHabitsWrite trigger:", error);
    return null;
  }
});

/**
 * ACTIVITY FEED: Nutrition macro tracking day completed trigger
 * Fires when a client completes all macros for the day (Macro Tracking approach)
 */
exports.onNutritionMealsWrite = onDocumentWritten({
  document: "nutritionLogs/{userId}/meals/{date}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return null;
    
    const userId = event.params.userId;
    const date = event.params.date;
    
    if (after.dayComplete !== true) return null;
    
    const before = event.data.before.exists ? event.data.before.data() : null;
    if (before && before.dayComplete === true) return null;
    
    const { getClientInfoForActivityFeed } = require("./activity-feed");
    const clientInfo = await getClientInfoForActivityFeed(userId);
    
    writeActivityEvent({
      type: 'nutrition_day_completed',
      clientId: userId,
      clientName: clientInfo.clientName,
      trainerId: clientInfo.trainerId,
      message: `${clientInfo.clientName} completed macro tracking for today`,
      metadata: { date: date },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write nutrition meals completed event", { userId, error: err.message });
    });
    
    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onNutritionMealsWrite trigger:", error);
    return null;
  }
});

/**
 * ACTIVITY FEED: Weekly survey submitted trigger
 * Fires when a client submits a weekly check-in survey
 */
exports.onWeeklySurveySubmit = onDocumentWritten({
  document: "weeklySurveys/{userId}/responses/{weekStartDate}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return null;
    
    // Fire on create OR when lastUpdated changes (re-submissions preserve submittedAt, so use lastUpdated)
    const before = event.data.before.exists ? event.data.before.data() : null;
    const afterUpdated = after.lastUpdated?.toMillis ? after.lastUpdated.toMillis() : null;
    const beforeUpdated = before?.lastUpdated?.toMillis ? before.lastUpdated.toMillis() : null;
    
    // Skip if lastUpdated didn't change (not a real submission)
    if (before && afterUpdated === beforeUpdated) return null;
    
    const userId = event.params.userId;
    const weekStartDate = event.params.weekStartDate;
    
    // Get client info
    const { getClientInfoForActivityFeed } = require("./activity-feed");
    const clientInfo = await getClientInfoForActivityFeed(userId);
    
    writeActivityEvent({
      type: 'weekly_survey_submitted',
      clientId: userId,
      clientName: clientInfo.clientName,
      trainerId: clientInfo.trainerId,
      message: `${clientInfo.clientName} submitted weekly check-in survey`,
      metadata: {
        weekStartDate: weekStartDate,
      },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write weekly_survey_submitted event", { userId, error: err.message });
    });
    
    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onWeeklySurveySubmit trigger:", error);
    return null;
  }
});

/**
 * ACTIVITY FEED: Progress photo uploaded trigger
 * Fires when a client uploads a new progress photo
 */
exports.onProgressPhotoWrite = onDocumentWritten({
  document: "progressPhotos/{photoDocId}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    // Only fire on document creation (not updates)
    if (event.data.before.exists) return null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return null;
    
    const userId = after.userId;
    if (!userId) return null;
    
    const { getClientInfoForActivityFeed } = require("./activity-feed");
    const clientInfo = await getClientInfoForActivityFeed(userId);
    
    writeActivityEvent({
      type: 'progress_photo_uploaded',
      clientId: userId,
      clientName: clientInfo.clientName,
      trainerId: clientInfo.trainerId,
      message: `${clientInfo.clientName} uploaded progress photos`,
      metadata: { date: after.date || '' },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write progress_photo_uploaded event", { userId, error: err.message });
    });
    
    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onProgressPhotoWrite trigger:", error);
    return null;
  }
});

/**
 * ACTIVITY FEED: Client message received trigger
 * Fires when a new message is sent by a client (not by trainer)
 */
exports.onClientMessageWrite = onDocumentWritten({
  document: "client_messages/{messageId}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    // Only fire on document creation (not updates like marking as read)
    if (event.data.before.exists) return null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    if (!after) return null;
    
    const senderId = after.senderId;
    if (!senderId) return null;

    // Check if sender is a client (not trainer/admin) → trainer activity feed event
    const senderDoc = await admin.firestore().collection('users').doc(senderId).get();
    if (senderDoc.exists && senderDoc.data().role === 'client') {
      const senderData = senderDoc.data();
      writeActivityEvent({
        type: 'client_message_received',
        clientId: senderId,
        clientName: senderData.name || 'Client',
        trainerId: senderData.assignedTrainerId || after.recipientId || '',
        message: `${senderData.name || 'Client'} sent you a message`,
        metadata: {},
      }).catch(err => {
        logger.warn("[ActivityFeed] Failed to write client_message_received event", {senderId, error: err.message});
      });
      return null;
    }

    // Sender is a trainer/admin → write new_message notification to the client
    // Determine clientId: recipientId field, or look up via conversationId
    const clientId = after.recipientId || null;
    if (clientId) {
      // No dedup — every trainer message creates a bell notification immediately
      writeClientNotification({
        type: "new_message",
        clientId: clientId,
        message: "Your coach sent you a new message 💬",
        actionUrl: "/dashboard/client/messages",
        metadata: {},
      }).catch(err => {
        logger.warn("[ClientNotifications] Failed to write new_message notification", {clientId, error: err.message});
      });
      logger.info("[ClientNotifications] new_message notification sent", {clientId});
    }
    
    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onClientMessageWrite trigger:", error);
    return null;
  }
});

/**
 * CLIENT NOTIFICATIONS: clientPlans write trigger
 * Fires when a trainer updates a client's plan in the clientPlans collection.
 * Sends 'plan_updated' notification for general plan changes and
 * 'nutrition_updated' for nutrition-specific changes.
 *
 * Detection logic:
 * - nutritionProtocol changed  → nutrition_updated
 * - mealPlan changed           → nutrition_updated
 * - anything else changed      → plan_updated
 * Only fires on updates (not creates), and only when relevant fields changed.
 */
exports.onClientPlanWrite = onDocumentWritten({
  document: "clientPlans/{planId}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;

    // Only handle updates (not creates or deletes)
    if (!before || !after) return null;

    const clientId = after.clientId;
    if (!clientId) return null;

    // Helper: deep-compare two values by JSON serialization
    const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

    // Detect what changed
    const nutritionChanged =
      changed(before.nutritionProtocol, after.nutritionProtocol) ||
      changed(before.mealPlan, after.mealPlan);

    const activitiesChanged =
      changed(before.stepGoal, after.stepGoal) ||
      changed(before.waterGoal, after.waterGoal) ||
      changed(before.dailyHabits, after.dailyHabits) ||
      changed(before.lissCardio, after.lissCardio); // LISS cardio lives in Daily Activities tracker

    const planChanged =
      changed(before.trainingProtocol, after.trainingProtocol) ||
      changed(before.lissCardio, after.lissCardio) ||
      changed(before.weeklyFocus, after.weeklyFocus) ||
      changed(before.vision, after.vision) ||
      changed(before.stepGoal, after.stepGoal) ||        // step goal shows on My Plan
      changed(before.waterGoal, after.waterGoal) ||      // water goal shows on My Plan
      changed(before.dailyHabits, after.dailyHabits) ||  // daily habits show on My Plan
      changed(before.nutritionProtocol, after.nutritionProtocol) || // nutrition protocol shows on My Plan
      changed(before.mealPlan, after.mealPlan);          // meal plan shows on My Plan

    if (!nutritionChanged && !activitiesChanged && !planChanged) return null;

    if (nutritionChanged) {
      writeClientNotification({
        type: "nutrition_updated",
        clientId: clientId,
        message: "Your trainer updated your nutrition plan",
        actionUrl: "/dashboard/client/nutrition",
        metadata: {updatedSection: "Nutrition Plan"},
      }).catch((err) => {
        logger.warn("[ClientNotifications] Failed to write nutrition_updated notification", {
          clientId,
          error: err.message,
        });
      });
      logger.info("[ClientNotifications] nutrition_updated sent", {clientId});
    }

    if (activitiesChanged) {
      writeClientNotification({
        type: "activities_updated",
        clientId: clientId,
        message: "Your trainer updated your daily activity goals",
        actionUrl: "/dashboard/client/activity",
        metadata: {updatedSection: "Daily Activities"},
      }).catch((err) => {
        logger.warn("[ClientNotifications] Failed to write activities_updated notification", {
          clientId,
          error: err.message,
        });
      });
      logger.info("[ClientNotifications] activities_updated sent", {clientId});
    }

    if (planChanged) {
      writeClientNotification({
        type: "plan_updated",
        clientId: clientId,
        message: "Your trainer updated your training plan",
        actionUrl: "/dashboard/client/plan",
        metadata: {updatedSection: "Training Plan"},
      }).catch((err) => {
        logger.warn("[ClientNotifications] Failed to write plan_updated notification", {
          clientId,
          error: err.message,
        });
      });
      logger.info("[ClientNotifications] plan_updated sent", {clientId});
    }

    return null;
  } catch (error) {
    logger.error("[ClientNotifications] Error in onClientPlanWrite trigger:", {error: error.message});
    return null;
  }
});

/**
 * CLIENT ACTIVITY FEED SYSTEM
 * Real-time activity log for trainers — auto-expires after 7 days.
 * See: docs/02-implementation/client-activity-feed-architecture.md
 */

/**
 * Scheduled function to clean up expired activity feed events.
 * Runs daily at 3 AM UTC. Deletes events where expiresAt < now.
 * Events have a 7-day TTL set at write time by writeActivityEvent().
 */
/**
 * CLIENT NOTIFICATIONS: Upcoming payment reminder
 * Runs daily, finds active subscriptions renewing in 3 days, sends one notification per cycle.
 */
exports.notifyUpcomingPayments = onSchedule({
  schedule: "0 9 * * *", // Daily at 9 AM UTC
  timeZone: "UTC",
  region: sharedConfig.region,
  secrets: [stripeKey],
}, async (event) => {
  try {
    logger.info("[ClientNotifications] Starting upcoming payment check");

    const stripe = require("stripe")(stripeKey.value(), {apiVersion: "2024-09-30.acacia"});

    // Find active subscriptions renewing in the next 3 days
    const nowSec = Math.floor(Date.now() / 1000);
    const threeDaysSec = nowSec + (3 * 24 * 60 * 60);

    // Query users with active subscriptions
    const usersSnapshot = await admin.firestore()
      .collection("users")
      .where("subscriptionStatus", "==", "active")
      .where("accountActivated", "==", true)
      .get();

    let notified = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const subscriptionId = userData.subscriptionId;
      if (!subscriptionId) continue;

      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const renewalSec = sub.current_period_end;

        // Within next 3 days and not already canceled
        if (renewalSec <= threeDaysSec && !sub.cancel_at_period_end) {
          const daysUntil = Math.ceil((renewalSec - nowSec) / 86400);
          const renewalDate = new Date(renewalSec * 1000).toISOString().split("T")[0];
          const amountCents = sub.items.data[0].price.unit_amount || 0;
          const amount = amountCents ? `$${(amountCents / 100).toFixed(2)}` : "";

          // Check we haven't already notified for this renewal cycle (within 4 days)
          const recentNotifSnapshot = await admin.firestore()
            .collection("clientNotifications")
            .where("clientId", "==", userId)
            .where("type", "==", "upcoming_payment")
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

          let alreadyNotified = false;
          if (!recentNotifSnapshot.empty) {
            const lastTs = recentNotifSnapshot.docs[0].data().timestamp;
            const lastMs = lastTs && lastTs.toMillis ? lastTs.toMillis() : 0;
            // If notified in last 4 days, skip
            if (Date.now() - lastMs < 4 * 24 * 60 * 60 * 1000) {
              alreadyNotified = true;
            }
          }

          if (!alreadyNotified) {
            const message = amount
              ? `Your subscription renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} (${amount}) on ${renewalDate}`
              : `Your subscription renews in ${daysUntil} day${daysUntil !== 1 ? "s" : ""} on ${renewalDate}`;

            await writeClientNotification({
              type: "upcoming_payment",
              clientId: userId,
              message,
              actionUrl: "/dashboard/client/billing",
              metadata: {
                renewalDate,
                daysUntilRenewal: daysUntil,
                amount: amountCents,
                currency: sub.items.data[0].price.currency || "usd",
              },
            });
            notified++;
            logger.info("[ClientNotifications] upcoming_payment sent", {userId, daysUntil});
          }
        }
      } catch (subErr) {
        logger.warn("[ClientNotifications] Failed to check subscription", {userId, error: subErr.message});
      }
    }

    logger.info("[ClientNotifications] Upcoming payment check complete", {notified});
    return {success: true, notified};
  } catch (error) {
    logger.error("[ClientNotifications] Error in notifyUpcomingPayments:", {error: error.message});
    return null;
  }
});

/**
 * DAILY CLIENT REMINDERS
 * Runs daily at 3 AM UTC (8 PM PT). Sends reminder notifications to active clients who:
 * - have an overdue workout (past due date, not completed)
 * - haven't completed their nutrition approach today
 * - haven't logged any steps today
 * - haven't checked off any daily habits today
 * - haven't logged their weight in 7+ days
 *
 * All checks are non-blocking and individually try/catch'd so one failure
 * never prevents the other reminders from firing.
 * Uses 23-hour dedup to prevent re-sending on the same day (except weight: 7-day dedup).
 */
exports.dailyClientReminders = onSchedule({
  schedule: "0 3 * * *", // 3 AM UTC = 8 PM PT
  timeZone: "UTC",
  region: sharedConfig.region,
}, async (event) => {
  try {
    logger.info("[DailyReminders] Starting daily client reminder check");

    const now = admin.firestore.Timestamp.now();
    const nowMs = now.toMillis();
    const TWENTY_THREE_HOURS_MS = 23 * 60 * 60 * 1000;
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Today's date string in YYYY-MM-DD (UTC, which is fine for server-side date math)
    const todayStr = new Date().toISOString().split("T")[0];

    // Helper: check if a notification of the given type was sent to this client recently
    async function wasRecentlySent(clientId, type, windowMs) {
      const snapshot = await admin.firestore()
        .collection("clientNotifications")
        .where("clientId", "==", clientId)
        .where("type", "==", type)
        .orderBy("timestamp", "desc")
        .limit(1)
        .get();
      if (snapshot.empty) return false;
      const lastTs = snapshot.docs[0].data().timestamp;
      const lastMs = lastTs && lastTs.toMillis ? lastTs.toMillis() : 0;
      return (nowMs - lastMs) < windowMs;
    }

    // Get all active, activated clients
    const clientsSnapshot = await admin.firestore()
      .collection("users")
      .where("role", "==", "client")
      .where("accountActivated", "==", true)
      .get();

    let stats = {workoutOverdue: 0, nutrition: 0, steps: 0, habits: 0, weight: 0};

    for (const clientDoc of clientsSnapshot.docs) {
      const clientId = clientDoc.id;

      // ── 1. WORKOUT OVERDUE ──────────────────────────────────────────────────
      try {
        const overdueSnapshot = await admin.firestore()
          .collection("workouts")
          .where("clientId", "==", clientId)
          .where("status", "==", "scheduled")
          .where("dueDate", "<", now)
          .get();

        for (const workoutDoc of overdueSnapshot.docs) {
          const workout = workoutDoc.data();
          const workoutId = workoutDoc.id;
          const workoutName = workout.name || "Your workout";

          // Dedup per workoutId (stored in metadata)
          const dedup = await admin.firestore()
            .collection("clientNotifications")
            .where("clientId", "==", clientId)
            .where("type", "==", "workout_overdue")
            .where("metadata.workoutId", "==", workoutId)
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

          let alreadySent = false;
          if (!dedup.empty) {
            const lastTs = dedup.docs[0].data().timestamp;
            const lastMs = lastTs && lastTs.toMillis ? lastTs.toMillis() : 0;
            alreadySent = (nowMs - lastMs) < TWENTY_THREE_HOURS_MS;
          }

          if (!alreadySent) {
            await writeClientNotification({
              type: "workout_overdue",
              clientId,
              message: `${workoutName} is overdue — complete it when you can!`,
              actionUrl: "/dashboard/client/workouts",
              metadata: {workoutId, workoutName},
            });
            stats.workoutOverdue++;
          }
        }
      } catch (err) {
        logger.warn("[DailyReminders] workout_overdue check failed", {clientId, error: err.message});
      }

      // ── 2. NUTRITION REMINDER ────────────────────────────────────────────────
      try {
        // Check both mealPlans (meal plan approach) and habits (healthy habits approach)
        const [mealDoc, habitsDoc] = await Promise.all([
          admin.firestore()
            .collection("nutritionLogs")
            .doc(clientId)
            .collection("mealPlans")
            .doc(todayStr)
            .get(),
          admin.firestore()
            .collection("nutritionLogs")
            .doc(clientId)
            .collection("habits")
            .doc(todayStr)
            .get(),
        ]);

        const mealComplete = mealDoc.exists && mealDoc.data().dayComplete === true;
        const habitsComplete = habitsDoc.exists && habitsDoc.data().dayComplete === true;

        if (!mealComplete && !habitsComplete) {
          const alreadySent = await wasRecentlySent(clientId, "nutrition_reminder", TWENTY_THREE_HOURS_MS);
          if (!alreadySent) {
            await writeClientNotification({
              type: "nutrition_reminder",
              clientId,
              message: "Don't forget to complete your nutrition for today! 🥗",
              actionUrl: "/dashboard/client/nutrition",
              metadata: {},
            });
            stats.nutrition++;
          }
        }
      } catch (err) {
        logger.warn("[DailyReminders] nutrition_reminder check failed", {clientId, error: err.message});
      }

      // ── 3. STEPS REMINDER ────────────────────────────────────────────────────
      try {
        const activityDocId = `${clientId}_${todayStr}`;
        const activityDoc = await admin.firestore()
          .collection("dailyActivities")
          .doc(activityDocId)
          .get();

        const steps = activityDoc.exists ? (activityDoc.data().steps?.steps || 0) : 0;

        if (steps === 0) {
          const alreadySent = await wasRecentlySent(clientId, "steps_reminder", TWENTY_THREE_HOURS_MS);
          if (!alreadySent) {
            await writeClientNotification({
              type: "steps_reminder",
              clientId,
              message: "You haven't logged any steps today — get moving! 👟",
              actionUrl: "/dashboard/client/activity",
              metadata: {},
            });
            stats.steps++;
          }
        }
      } catch (err) {
        logger.warn("[DailyReminders] steps_reminder check failed", {clientId, error: err.message});
      }

      // ── 4. HABITS REMINDER ───────────────────────────────────────────────────
      try {
        const activityDocId = `${clientId}_${todayStr}`;
        const activityDoc = await admin.firestore()
          .collection("dailyActivities")
          .doc(activityDocId)
          .get();

        const habits = activityDoc.exists ? (activityDoc.data().habits || []) : [];
        const anyChecked = habits.some(h => h.completed === true || h.completed === 1);

        if (!anyChecked) {
          // Only send if the client actually has habits configured
          const planDoc = await admin.firestore()
            .collection("clientPlans")
            .doc(clientId)
            .get();
          const hasHabits = planDoc.exists &&
            planDoc.data().dailyHabits &&
            (planDoc.data().dailyHabits.habits || []).length > 0;

          if (hasHabits) {
            const alreadySent = await wasRecentlySent(clientId, "habits_reminder", TWENTY_THREE_HOURS_MS);
            if (!alreadySent) {
              await writeClientNotification({
                type: "habits_reminder",
                clientId,
                message: "You haven't checked off any habits today — small wins add up! 📝",
                actionUrl: "/dashboard/client/activity",
                metadata: {},
              });
              stats.habits++;
            }
          }
        }
      } catch (err) {
        logger.warn("[DailyReminders] habits_reminder check failed", {clientId, error: err.message});
      }

      // ── 5. WEIGHT REMINDER (7-day dedup) ─────────────────────────────────────
      try {
        // Check last 7 days for any weight entry
        let hasRecentWeight = false;
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const dateStr = checkDate.toISOString().split("T")[0];
          const actDoc = await admin.firestore()
            .collection("dailyActivities")
            .doc(`${clientId}_${dateStr}`)
            .get();
          if (actDoc.exists && actDoc.data().weight && actDoc.data().weight.weight) {
            hasRecentWeight = true;
            break;
          }
        }

        if (!hasRecentWeight) {
          const alreadySent = await wasRecentlySent(clientId, "weight_reminder", SEVEN_DAYS_MS);
          if (!alreadySent) {
            await writeClientNotification({
              type: "weight_reminder",
              clientId,
              message: "You haven't logged your weight in 7 days — hop on the scale! ⚖️",
              actionUrl: "/dashboard/client/activity",
              metadata: {},
            });
            stats.weight++;
          }
        }
      } catch (err) {
        logger.warn("[DailyReminders] weight_reminder check failed", {clientId, error: err.message});
      }
    }

    logger.info("[DailyReminders] Complete", {
      clientsChecked: clientsSnapshot.size,
      ...stats,
    });
    return {success: true, clientsChecked: clientsSnapshot.size, ...stats};
  } catch (error) {
    logger.error("[DailyReminders] Fatal error", {error: error.message});
    return null;
  }
});

/**
 * Scheduled function to clean up expired client notifications (7-day TTL).
 * Runs daily at 4 AM UTC.
 */
exports.cleanupExpiredClientNotifications = onSchedule({
  schedule: "0 4 * * *",
  timeZone: "UTC",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const now = admin.firestore.Timestamp.now();
    let totalDeleted = 0;
    let hasMore = true;
    while (hasMore) {
      const snapshot = await admin.firestore()
        .collection("clientNotifications")
        .where("expiresAt", "<", now)
        .limit(500)
        .get();
      if (snapshot.empty) { hasMore = false; break; }
      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      totalDeleted += snapshot.size;
      if (snapshot.size < 500) hasMore = false;
    }
    logger.info("[ClientNotifications] Cleanup complete", {totalDeleted});
    return {success: true, totalDeleted};
  } catch (error) {
    logger.error("[ClientNotifications] Cleanup failed", {error: error.message});
    return null;
  }
});

/**
 * ACTIVITY FEED: Client LISS cardio session completed trigger
 * Fires when a client's dailyActivities document has cardio flipped to true.
 * Writes an activity feed event: "Jane completed LISS cardio (2 / 3 this week)"
 * Doc ID format: {userId}_{YYYY-MM-DD}
 */
exports.onCardioSessionLogged = onDocumentWritten({
  document: "dailyActivities/{docId}",
  region: sharedConfig.region,
}, async (event) => {
  try {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;

    if (!after) return null;

    // Only fire when cardio flips from falsy → true
    const wasCardio = before ? before.cardio === true : false;
    const isCardio = after.cardio === true;
    if (!isCardio || wasCardio) return null;

    const userId = after.userId;
    const date = after.date; // YYYY-MM-DD
    if (!userId || !date) return null;

    // Get client info for the activity feed
    const { getClientInfoForActivityFeed } = require("./activity-feed");
    const clientInfo = await getClientInfoForActivityFeed(userId);
    if (!clientInfo.trainerId) return null;

    // Get weekly frequency target from client plan
    let target = 1;
    let frequency = '';
    try {
      const planDoc = await admin.firestore().collection("clientPlans").doc(userId).get();
      const freq = planDoc.data()?.lissCardio?.frequency || '';
      frequency = freq;
      const match = freq.match(/^(\d+)/);
      if (match) target = parseInt(match[1], 10);
    } catch (e) {
      // Ignore — use target = 1
    }

    // Count cardio sessions in current Mon–Sun week
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay(); // 0=Sun,1=Mon,...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekMon = new Date(dateObj);
    weekMon.setUTCDate(dateObj.getUTCDate() + diffToMon);
    const weekSun = new Date(weekMon);
    weekSun.setUTCDate(weekMon.getUTCDate() + 6);
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const weekStartStr = fmt(weekMon);
    const weekEndStr = fmt(weekSun);

    // Query dailyActivities for this user in the week (filter cardio in JS to avoid composite index)
    const snapshot = await admin.firestore()
      .collection("dailyActivities")
      .where("userId", "==", userId)
      .where("date", ">=", weekStartStr)
      .where("date", "<=", weekEndStr)
      .limit(7)
      .get();
    const weekCount = snapshot.docs.filter(d => d.data().cardio === true).length;

    // Build message
    const goalMet = weekCount >= target;
    const message = goalMet
      ? `${clientInfo.clientName} completed LISS cardio (${weekCount}/${target} this week ✅)`
      : `${clientInfo.clientName} completed LISS cardio (${weekCount}/${target} this week)`;

    writeActivityEvent({
      type: 'cardio_session_logged',
      clientId: userId,
      clientName: clientInfo.clientName,
      trainerId: clientInfo.trainerId,
      message,
      metadata: {
        date,
        weekCount,
        target,
        frequency,
      },
    }).catch(err => {
      logger.warn("[ActivityFeed] Failed to write cardio_session_logged event", { userId, error: err.message });
    });

    return null;
  } catch (error) {
    logger.error("[ActivityFeed] Error in onCardioSessionLogged trigger:", { error: error.message });
    return null;
  }
});

exports.cleanupExpiredActivityFeed = onSchedule({
  schedule: "0 3 * * *", // Daily at 3 AM UTC
  timeZone: "UTC",
  region: sharedConfig.region,
}, async (event) => {
  try {
    logger.info("[ActivityFeed] Starting expired event cleanup");

    const now = admin.firestore.Timestamp.now();
    let totalDeleted = 0;

    // Process in batches of 500 (Firestore batch limit)
    // Loop in case there are more than 500 expired events
    let hasMore = true;
    while (hasMore) {
      const snapshot = await admin.firestore()
        .collection("activityFeed")
        .where("expiresAt", "<", now)
        .limit(500)
        .get();

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      totalDeleted += snapshot.size;
      logger.info(`[ActivityFeed] Deleted batch of ${snapshot.size} expired events`);

      // If we got fewer than 500, we're done
      if (snapshot.size < 500) {
        hasMore = false;
      }
    }

    logger.info("[ActivityFeed] Cleanup completed", { totalDeleted });
    return { success: true, totalDeleted };
  } catch (error) {
    logger.error("[ActivityFeed] Cleanup failed", {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
});

/* ============================================================================
 * PROVIDER-NEUTRAL PAYMENTS (PayPal launch — payment-processor spec Phase 3)
 *
 * The generic `paymentWebhook` (payments/index.js) verifies + parses a provider
 * webhook and runs neutral fulfillment (payments/fulfillment.js). Here we (a)
 * inject the parity side-effects on first activation (welcome email / onboarding
 * setup goal / new_client_signup activity event) so the PayPal path matches the
 * Stripe `syncSubscriptionToUser` behavior, and (b) re-export the function +
 * the cancel callable so they deploy.
 *
 * Stripe remains the LIVE path (invertase extension + the triggers above) until
 * cutover; this webhook is invoked live per-provider in Phase 3/5.
 * ========================================================================== */
const paymentsModule = require("./payments");

/**
 * Parity side-effects on first subscription activation, shared across providers.
 * Mirrors the inline logic in syncSubscriptionToUser (welcome email + setup goal
 * + activity feed). Each effect is best-effort and must not throw.
 */
async function onFirstActivation({ userId, userData, tierId, trainerId }) {
  // 1) Onboarding setup goal — only for check-in-eligible tiers, only if a
  //    trainer is assigned and no setup goal exists yet.
  try {
    if (trainerId && tierId && CHECKIN_ELIGIBLE_PRODUCTS.includes(tierId)) {
      const setupGoalRef = admin.firestore().collection("goals").doc(`${userId}_setup`);
      const existingGoal = await setupGoalRef.get();
      if (!existingGoal.exists) {
        const now = admin.firestore.Timestamp.now();
        const deadline = admin.firestore.Timestamp.fromDate(
          new Date(Date.now() + ONBOARDING_DEADLINE_DAYS * 24 * 60 * 60 * 1000)
        );
        await setupGoalRef.set({
          clientId: userId,
          trainerId,
          category: "setup",
          title: "Complete Your Onboarding",
          term: "short-term",
          priority: "high",
          isActive: true,
          isConfigured: true,
          targetValue: 3,
          currentValue: 0,
          unit: "tasks",
          lowerIsBetter: false,
          status: "active",
          deadline,
          completedAt: null,
          milestones: [
            { id: `${userId}_setup_m0`, order: 1, text: "Schedule your 30-minute planning consultation", targetValue: 1, completed: false, completedAt: null, autoTracked: false, createdAt: now, updatedAt: now },
            { id: `${userId}_setup_m1`, order: 2, text: "Complete your consultation", targetValue: 2, completed: false, completedAt: null, autoTracked: false, createdAt: now, updatedAt: now },
            { id: `${userId}_setup_m2`, order: 3, text: "Receive your personalized fitness plan", targetValue: 3, completed: false, completedAt: null, autoTracked: false, createdAt: now, updatedAt: now },
          ],
          createdAt: now,
          updatedAt: now,
          createdBy: trainerId,
        });
        logger.info("Setup goal created (neutral onFirstActivation)", { userId });
      }
    }
  } catch (error) {
    logger.error("onFirstActivation: setup goal failed (non-fatal)", { userId, error: error.message });
  }

  // 2) Welcome email (non-blocking).
  try {
    const fresh = await admin.firestore().collection("users").doc(userId).get();
    const u = fresh.data() || userData || {};
    sendWelcomeEmail(u.name, u.email, u.assignedTrainerName, u.tierName).catch(() => {
      logger.warn("Welcome email sending failed but continuing", { userId });
    });
  } catch (error) {
    logger.error("onFirstActivation: welcome email failed (non-fatal)", { userId, error: error.message });
  }

  // 3) Activity feed: new_client_signup.
  try {
    const clientName = userData?.name || "New Client";
    const tierDisplayName = userData?.tierName || "";
    await writeActivityEvent({
      type: "new_client_signup",
      clientId: userId,
      clientName,
      trainerId: trainerId || "",
      message: tierDisplayName ? `${clientName} signed up (${tierDisplayName})` : `${clientName} signed up`,
      metadata: { tierName: tierDisplayName },
    });
  } catch (error) {
    logger.warn("onFirstActivation: new_client_signup event failed (non-fatal)", { userId, error: error.message });
  }
}

paymentsModule.setFulfillmentHooks({ onFirstActivation });

// Generic provider webhook (HTTP) + PayPal cancel callable.
exports.paymentWebhook = paymentsModule.paymentWebhook;
// Dedicated PayPal webhooks — one per env (each binds only its env's secrets).
// Register the sandbox dashboard → paypalWebhookSandbox, live → paypalWebhookLive.
exports.paypalWebhookSandbox = paymentsModule.paypalWebhookSandbox;
exports.paypalWebhookLive = paymentsModule.paypalWebhookLive;

exports.cancelPaypalSubscription = paymentsModule.cancelPaypalSubscription;
exports.capturePaypalOrder = paymentsModule.capturePaypalOrder;
// ACDC card-fields (card-only checkout, no PayPal account) — FR-12 / Phase 3.6
exports.createPaypalOrder = paymentsModule.createPaypalOrder;
// Discount codes (Feature 2, phase 1)
exports.previewDiscount = paymentsModule.previewDiscount;
exports.createDiscountCode = paymentsModule.createDiscountCode;
exports.listDiscountCodes = paymentsModule.listDiscountCodes;
exports.setDiscountCodeActive = paymentsModule.setDiscountCodeActive;
exports.updateDiscountCode = paymentsModule.updateDiscountCode;

exports.createPaypalCardSetupToken = paymentsModule.createPaypalCardSetupToken;

exports.createPaypalSubscriptionWithCard = paymentsModule.createPaypalSubscriptionWithCard;

/**
 * SCHEDULED: finalize PayPal subscription lifecycle workarounds (spec P2.3).
 *
 * PayPal has no native "cancel at period end" or "auto-resume after N months", so
 * the cancel/pause callables only set LOCAL flags + suspend; this hourly job applies
 * the real PayPal action once the stored date arrives:
 *
 *  (a) CANCEL AT PERIOD END — users with `cancelAtPeriodEnd === true` whose
 *      `currentPeriodEnd` has passed: call PayPal `/cancel` for real, then clean the
 *      user doc (delete subscriptionId, status canceled) so they can re-subscribe.
 *
 *  (b) AUTO-RESUME — users with `subscriptionPaused === true` whose `pauseResumesAt`
 *      has passed: call PayPal `/activate` to resume billing, then clear the pause
 *      flags. (A user who resumes early via the resume callable already cleared these,
 *      so they won't match.)
 *
 * Each user's stored `paypalEnv` selects the correct credentials. Errors are per-user
 * isolated so one failure doesn't block the rest; PayPal calls are idempotent enough
 * that a re-run after a transient failure is safe.
 */
exports.processScheduledPaypalSubscriptionActions = onSchedule({
  schedule: "every 1 hours",
  timeZone: "UTC",
  region: sharedConfig.region,
  secrets: PAYPAL_SECRETS,
}, async (event) => {
  const now = admin.firestore.Timestamp.now();
  const db = admin.firestore();
  const paypal = paymentsModule.PROVIDERS.paypal;
  let canceled = 0;
  let resumed = 0;

  // (a) Cancel-at-period-end finalization.
  try {
    const cancelSnap = await db
      .collection("users")
      .where("cancelAtPeriodEnd", "==", true)
      .where("currentPeriodEnd", "<=", now)
      .get();

    for (const doc of cancelSnap.docs) {
      const u = doc.data();
      const subscriptionId = u.subscriptionId;
      // Only PayPal subs are handled here; Stripe cancels itself at period end.
      const isPaypal = subscriptionId && (String(subscriptionId).startsWith("I-") || u.provider === "paypal");
      if (!isPaypal) continue;

      try {
        const cfg = paymentsModule.paypalEnvConfig(paymentsModule.normalizePaypalEnv(u.paypalEnv));
        await paypal.cancelSubscription(subscriptionId, cfg);
        // Clean the user doc so they can re-subscribe (mirrors deactivateSubscription).
        await doc.ref.update({
          subscriptionId: admin.firestore.FieldValue.delete(),
          subscriptionStatus: "canceled",
          subscriptionEndedAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelAtPeriodEnd: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        canceled++;
        logger.info("[ScheduledPaypal] Canceled subscription at period end", { userId: doc.id, subscriptionId });
      } catch (err) {
        logger.error("[ScheduledPaypal] cancel-at-period-end failed", { userId: doc.id, subscriptionId, error: err.message });
      }
    }
  } catch (err) {
    logger.error("[ScheduledPaypal] cancel query failed", { error: err.message });
  }

  // (b) Auto-resume finalization.
  try {
    const resumeSnap = await db
      .collection("users")
      .where("subscriptionPaused", "==", true)
      .where("pauseResumesAt", "<=", now)
      .get();

    for (const doc of resumeSnap.docs) {
      const u = doc.data();
      const subscriptionId = u.subscriptionId;
      const isPaypal = subscriptionId && (String(subscriptionId).startsWith("I-") || u.provider === "paypal");
      if (!isPaypal) continue;

      try {
        const cfg = paymentsModule.paypalEnvConfig(paymentsModule.normalizePaypalEnv(u.paypalEnv));
        await paypal.activatePaypalSubscription(subscriptionId, cfg);
        await doc.ref.update({
          subscriptionPaused: false,
          resumedAt: admin.firestore.FieldValue.serverTimestamp(),
          pauseResumesAt: admin.firestore.FieldValue.delete(),
          pauseDuration: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        resumed++;
        logger.info("[ScheduledPaypal] Auto-resumed paused subscription", { userId: doc.id, subscriptionId });
      } catch (err) {
        logger.error("[ScheduledPaypal] auto-resume failed", { userId: doc.id, subscriptionId, error: err.message });
      }
    }
  } catch (err) {
    logger.error("[ScheduledPaypal] resume query failed", { error: err.message });
  }

  logger.info("[ScheduledPaypal] Complete", { canceled, resumed });
  return { success: true, canceled, resumed };
});




