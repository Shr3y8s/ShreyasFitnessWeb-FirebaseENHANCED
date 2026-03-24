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

// Define secrets for secure access to Stripe
const stripeKey = defineSecret("STRIPE_KEY");
const resendKey = defineSecret("RESEND_API_KEY");

// Stripe portal configuration ID for restricted payment method changes only
const STRIPE_PORTAL_CONFIG_ID = "bpc_1SQLnDBjx3iGODd65BpKI3oK";

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

    // For development/testing: Allow unauthenticated calls with testing flag
    const isTestMode = request.data && request.data.isTestMode;

    if (!request.auth && !isTestMode) {
      const error = new Error("The function must be called while authenticated.");
      logger.error("Payment intent creation failed - not authenticated", {
        isTestMode: isTestMode,
      });
      throw error;
    }

    // Get user ID (or use test-user-id for testing)
    const userId = request.auth ? request.auth.uid : "test-user-id";

    logger.info("Creating payment intent", {
      userId: userId,
      priceId: request.data.price,
      isTestMode: isTestMode,
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
        isTestMode: isTestMode || false,
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
  secrets: [stripeKey],
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

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info("Subscription canceled in Stripe", {
      userId,
      subscriptionId,
      currentPeriodEnd: subscription.current_period_end,
    });

    // Update Firestore
    await userRef.update({
      cancelAtPeriodEnd: true,
      canceledAt: admin.firestore.FieldValue.serverTimestamp(),
      currentPeriodEnd: admin.firestore.Timestamp.fromMillis(subscription.current_period_end * 1000),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("Subscription cancellation synced to Firestore", {
      userId,
      subscriptionId,
    });

    // Return success with access end date
    const accessUntil = new Date(subscription.current_period_end * 1000);

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
      currentPeriodEnd: subscription.current_period_end,
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
  secrets: [stripeKey],
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

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Calculate resume date (add full months from now)
    const now = new Date();
    const resumeDate = new Date(now);
    resumeDate.setMonth(resumeDate.getMonth() + duration);
    // Keep the same day of month, but set to start of day
    resumeDate.setHours(0, 0, 0, 0);
    const resumeTimestamp = Math.floor(resumeDate.getTime() / 1000);

    // Pause subscription in Stripe using pause_collection
    const subscription = await stripe.subscriptions.update(subscriptionId, {
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

    // Update Firestore
    await userRef.update({
      subscriptionPaused: true,
      pausedAt: admin.firestore.FieldValue.serverTimestamp(),
      pauseResumesAt: admin.firestore.Timestamp.fromDate(resumeDate),
      pauseDuration: duration,
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
  secrets: [stripeKey],
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

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Resume subscription in Stripe by removing pause_collection
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: "",
    });

    logger.info("Subscription resumed in Stripe", {
      userId,
      subscriptionId,
    });

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

    // Initialize Stripe
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // Reactivate subscription in Stripe by removing cancel_at_period_end
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    logger.info("Subscription reactivated in Stripe", {
      userId,
      subscriptionId,
    });

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
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  try {
    // Verify admin authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const adminId = request.auth.uid;
    const targetUserId = request.data?.targetUserId;
    const mode = request.data?.mode || 'gdpr-clean'; // Default to gdpr-clean for backward compatibility
    const adminOverride = request.data?.adminOverride || false;
    const reason = request.data?.reason || "Admin-initiated deletion";

    if (!targetUserId) {
      throw new Error("targetUserId is required");
    }

    // Validate mode
    if (!['mock', 'no-traces', 'gdpr-clean'].includes(mode)) {
      throw new Error("Invalid deletion mode. Must be 'mock', 'no-traces', or 'gdpr-clean'");
    }

    logger.info("Account deletion initiated", {
      adminId,
      targetUserId,
      mode,
      adminOverride,
      reason,
    });

    // Verify admin role
    const adminDoc = await admin.firestore().collection("admins").doc(adminId).get();
    if (!adminDoc.exists) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get target user data
    const userRef = admin.firestore().collection("users").doc(targetUserId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData.stripeCustomerId;

    // ============================================
    // MOCK MODE: Discovery without deletion (skip validations)
    // ============================================
    if (mode === 'mock') {
      logger.info("Running MOCK mode - discovery only", {targetUserId});

      const steps = [];
      let totalItemsFound = 0;

      // Step 1: Progress Photos (Firebase Storage)
      try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({
          prefix: `progressPhotos/${targetUserId}/`,
        });
        
        const samplePhotos = files.slice(0, 5).map(f => f.name);
        steps.push({
          name: "Progress Photos",
          collection: `storage:progressPhotos/${targetUserId}/`,
          status: "complete",
          itemsFound: files.length,
          itemsDeleted: 0,
          sampleItems: samplePhotos,
        });
        totalItemsFound += files.length;
      } catch (error) {
        steps.push({
          name: "Progress Photos",
          collection: `storage:progressPhotos/${targetUserId}/`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 1b: Nutrition Screenshots (Firebase Storage)
      try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({
          prefix: `nutritionScreenshots/${targetUserId}/`,
        });
        
        const sampleNutrition = files.slice(0, 5).map(f => f.name);
        steps.push({
          name: "Nutrition Screenshots",
          collection: `storage:nutritionScreenshots/${targetUserId}/`,
          status: "complete",
          itemsFound: files.length,
          itemsDeleted: 0,
          sampleItems: sampleNutrition,
        });
        totalItemsFound += files.length;
      } catch (error) {
        steps.push({
          name: "Nutrition Screenshots",
          collection: `storage:nutritionScreenshots/${targetUserId}/`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 1c: Profile Photos (Firebase Storage)
      try {
        const bucket = admin.storage().bucket();
        const [files] = await bucket.getFiles({
          prefix: `profile-photos/${targetUserId}/`,
        });
        
        const sampleProfile = files.slice(0, 5).map(f => f.name);
        steps.push({
          name: "Profile Photos",
          collection: `storage:profile-photos/${targetUserId}/`,
          status: "complete",
          itemsFound: files.length,
          itemsDeleted: 0,
          sampleItems: sampleProfile,
        });
        totalItemsFound += files.length;
      } catch (error) {
        steps.push({
          name: "Profile Photos",
          collection: `storage:profile-photos/${targetUserId}/`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 2: Activity Logs (Subcollection)
      try {
        const activitiesSnapshot = await admin.firestore()
            .collection("users")
            .doc(targetUserId)
            .collection("activities")
            .get();
        
        const sampleActivities = activitiesSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Activity Logs",
          collection: `users/${targetUserId}/activities`,
          status: "complete",
          itemsFound: activitiesSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleActivities,
        });
        totalItemsFound += activitiesSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Activity Logs",
          collection: `users/${targetUserId}/activities`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 3: Workouts (Unified Collection)
      try {
        const workoutsSnapshot = await admin.firestore()
            .collection("workouts")
            .where("clientId", "==", targetUserId)
            .get();
        
        const sampleWorkouts = workoutsSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Workouts",
          collection: "workouts",
          queryFilter: `where('clientId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: workoutsSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleWorkouts,
        });
        totalItemsFound += workoutsSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Workouts",
          collection: "workouts",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 4: Client Plans
      try {
        const clientPlansSnapshot = await admin.firestore()
            .collection("clientPlans")
            .where("clientId", "==", targetUserId)
            .get();
        
        const samplePlans = clientPlansSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Client Plans",
          collection: "clientPlans",
          queryFilter: `where('clientId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: clientPlansSnapshot.size,
          itemsDeleted: 0,
          sampleItems: samplePlans,
        });
        totalItemsFound += clientPlansSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Client Plans",
          collection: "clientPlans",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 5: Client Stats
      try {
        const clientStatsDoc = await admin.firestore()
            .collection("clientStats")
            .doc(targetUserId)
            .get();
        
        steps.push({
          name: "Client Stats",
          collection: "clientStats",
          status: "complete",
          itemsFound: clientStatsDoc.exists ? 1 : 0,
          itemsDeleted: 0,
          sampleItems: clientStatsDoc.exists ? [targetUserId] : [],
        });
        if (clientStatsDoc.exists) {
          totalItemsFound += 1;
        }
      } catch (error) {
        steps.push({
          name: "Client Stats",
          collection: "clientStats",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 6: Client Messages
      try {
        const messagesSnapshot = await admin.firestore()
            .collection("client_messages")
            .where("clientId", "==", targetUserId)
            .get();
        
        const sampleMessages = messagesSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Client Messages",
          collection: "client_messages",
          queryFilter: `where('clientId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: messagesSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleMessages,
        });
        totalItemsFound += messagesSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Client Messages",
          collection: "client_messages",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 6b: Notifications
      try {
        const notificationsSnapshot = await admin.firestore()
            .collection("notifications")
            .where("userId", "==", targetUserId)
            .get();
        
        const sampleNotifications = notificationsSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Notifications",
          collection: "notifications",
          queryFilter: `where('userId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: notificationsSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleNotifications,
        });
        totalItemsFound += notificationsSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Notifications",
          collection: "notifications",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 6c: Progress Photos (Firestore metadata)
      try {
        const progressPhotosSnapshot = await admin.firestore()
            .collection("progressPhotos")
            .where("userId", "==", targetUserId)
            .get();
        
        const samplePhotos = progressPhotosSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Progress Photos Metadata",
          collection: "progressPhotos",
          queryFilter: `where('userId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: progressPhotosSnapshot.size,
          itemsDeleted: 0,
          sampleItems: samplePhotos,
        });
        totalItemsFound += progressPhotosSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Progress Photos Metadata",
          collection: "progressPhotos",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 6d: Weekly Surveys
      try {
        const weeklySurveysSnapshot = await admin.firestore()
            .collection("weeklySurveys")
            .where("clientId", "==", targetUserId)
            .get();
        
        const sampleSurveys = weeklySurveysSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Weekly Surveys",
          collection: "weeklySurveys",
          queryFilter: `where('clientId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: weeklySurveysSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleSurveys,
        });
        totalItemsFound += weeklySurveysSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Weekly Surveys",
          collection: "weeklySurveys",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 7: Sessions
      try {
        const sessionsSnapshot = await admin.firestore()
            .collection("sessions")
            .where("userId", "==", targetUserId)
            .get();
        
        const sampleSessions = sessionsSnapshot.docs.slice(0, 5).map(d => `${d.id} (${d.data().status || 'unknown'})`);
        steps.push({
          name: "Sessions",
          collection: "sessions",
          queryFilter: `where('userId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: sessionsSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleSessions,
        });
        totalItemsFound += sessionsSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Sessions",
          collection: "sessions",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 8: Goals
      try {
        const goalsSnapshot = await admin.firestore()
            .collection("goals")
            .where("clientId", "==", targetUserId)
            .get();
        
        const sampleGoals = goalsSnapshot.docs.slice(0, 5).map(d => `${d.id} (${d.data().title || 'untitled'})`);
        steps.push({
          name: "Goals",
          collection: "goals",
          queryFilter: `where('clientId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: goalsSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleGoals,
        });
        totalItemsFound += goalsSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Goals",
          collection: "goals",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 9: Daily Activities
      try {
        // Daily activities use composite doc IDs: {userId}_{dateStr}
        const activitiesSnapshot = await admin.firestore()
            .collection("dailyActivities")
            .where(admin.firestore.FieldPath.documentId(), ">=", targetUserId)
            .where(admin.firestore.FieldPath.documentId(), "<", targetUserId + "\uf8ff")
            .get();
        
        const sampleDailyActivities = activitiesSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Daily Activities",
          collection: "dailyActivities",
          queryFilter: `where(documentId, 'starts-with', '${targetUserId}')`,
          status: "complete",
          itemsFound: activitiesSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleDailyActivities,
        });
        totalItemsFound += activitiesSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Daily Activities",
          collection: "dailyActivities",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 10: Nutrition Logs
      try {
        const nutritionSnapshot = await admin.firestore()
            .collection("nutritionLogs")
            .doc(targetUserId)
            .collection("mealPlans")
            .get();
        
        const sampleNutrition = nutritionSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Nutrition Logs",
          collection: `nutritionLogs/${targetUserId}/mealPlans`,
          status: "complete",
          itemsFound: nutritionSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleNutrition,
        });
        totalItemsFound += nutritionSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Nutrition Logs",
          collection: `nutritionLogs/${targetUserId}/mealPlans`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 11: Login History
      try {
        const loginSnapshot = await admin.firestore()
            .collection("login_history")
            .where("userId", "==", targetUserId)
            .get();
        
        const sampleLogins = loginSnapshot.docs.slice(0, 5).map(d => d.id);
        steps.push({
          name: "Login History",
          collection: "login_history",
          queryFilter: `where('userId', '==', '${targetUserId}')`,
          status: "complete",
          itemsFound: loginSnapshot.size,
          itemsDeleted: 0,
          sampleItems: sampleLogins,
        });
        totalItemsFound += loginSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Login History",
          collection: "login_history",
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 12: Stripe Customer (would be preserved in GDPR mode, deleted in no-traces)
      steps.push({
        name: "Stripe Customer",
        collection: "stripe_customers",
        status: "complete",
        itemsFound: stripeCustomerId ? 1 : 0,
        itemsDeleted: 0,
        sampleItems: stripeCustomerId ? [stripeCustomerId] : [],
      });
      if (stripeCustomerId) {
        totalItemsFound += 1;
      }

      // Step 13: User Document
      steps.push({
        name: "User Document",
        collection: "users",
        status: "complete",
        itemsFound: 1,
        itemsDeleted: 0,
        sampleItems: [targetUserId],
      });
      totalItemsFound += 1;

      // Step 14: Firebase Auth
      steps.push({
        name: "Firebase Auth",
        collection: "Firebase Authentication",
        status: "complete",
        itemsFound: 1,
        itemsDeleted: 0,
        sampleItems: [userData.email || targetUserId],
      });
      totalItemsFound += 1;

      // Step 15: Stripe Customer Subcollections
      try {
        const stripeSubcollections = ['subscriptions', 'payments', 'checkout_sessions'];
        for (const subName of stripeSubcollections) {
          const subSnapshot = await admin.firestore()
              .collection("stripe_customers")
              .doc(targetUserId)
              .collection(subName)
              .get();
          
          const sampleItems = subSnapshot.docs.slice(0, 5).map(d => d.id);
          steps.push({
            name: `Stripe ${subName}`,
            collection: `stripe_customers/${targetUserId}/${subName}`,
            status: "complete",
            itemsFound: subSnapshot.size,
            itemsDeleted: 0,
            sampleItems: sampleItems,
          });
          totalItemsFound += subSnapshot.size;
        }
      } catch (error) {
        steps.push({
          name: "Stripe Customer Subcollections",
          collection: `stripe_customers/${targetUserId}/*`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      // Step 16: Nutrition Logs Parent Document
      try {
        const nutritionParentDoc = await admin.firestore()
            .collection("nutritionLogs")
            .doc(targetUserId)
            .get();
        
        steps.push({
          name: "Nutrition Logs Parent Doc",
          collection: `nutritionLogs/${targetUserId}`,
          status: "complete",
          itemsFound: nutritionParentDoc.exists ? 1 : 0,
          itemsDeleted: 0,
          sampleItems: nutritionParentDoc.exists ? [targetUserId] : [],
        });
        if (nutritionParentDoc.exists) {
          totalItemsFound += 1;
        }
      } catch (error) {
        steps.push({
          name: "Nutrition Logs Parent Doc",
          collection: `nutritionLogs/${targetUserId}`,
          status: "error",
          itemsFound: 0,
          itemsDeleted: 0,
          error: error.message,
        });
      }

      logger.info("MOCK mode discovery complete", {
        targetUserId,
        totalItemsFound,
        steps: steps.length,
      });

      // Gather subscription and session credit info for admin warnings
      const subscriptionInfo = {
        subscriptionId: userData.subscriptionId || null,
        subscriptionStatus: userData.subscriptionStatus || null,
        cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
      };

      const sessionCreditInfo = {
        available: userData.sessionBalance?.available || 0,
        purchased: userData.sessionBalance?.purchased || 0,
        used: userData.sessionBalance?.used || 0,
        expired: userData.sessionBalance?.expired || 0,
        activePackages: (userData.sessionPackages || [])
          .filter(pkg => !pkg.expired && pkg.remaining > 0)
          .map(pkg => ({
            id: pkg.id,
            remaining: pkg.remaining,
            quantity: pkg.quantity,
          })),
      };

      // Return mock mode response
      return {
        success: true,
        message: "Mock deletion preview complete (no data was deleted)",
        mode: "mock",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        steps: steps,
        subscriptionInfo: subscriptionInfo,
        sessionCreditInfo: sessionCreditInfo,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound: totalItemsFound,
          totalItemsDeleted: 0,
          stripeCustomerStatus: "preserved",
          firebaseAuthStatus: "preserved",
        },
      };
    }

    // ============================================
    // ACTUAL DELETION MODES (no-traces & gdpr-clean)
    // ============================================
    
    // Validate mode-specific requirements
    if (mode !== 'mock') {
      // Check for upcoming sessions only for real deletions
      const upcomingSessionsSnapshot = await admin.firestore()
          .collection("sessions")
          .where("userId", "==", targetUserId)
          .where("status", "==", "scheduled")
          .where("scheduledTime", ">", admin.firestore.Timestamp.now())
          .get();
      
      if (!upcomingSessionsSnapshot.empty && !adminOverride) {
        throw new Error(
          `Cannot delete account with ${upcomingSessionsSnapshot.size} upcoming scheduled sessions. ` +
          `Please cancel sessions first or use admin override.`
        );
      }
    }

    // Initialize Stripe for later use
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2024-09-30.acacia",
    });

    // ============================================
    // PRE-DELETION: Handle active subscriptions & session credits
    // ============================================
    const subscriptionId = userData.subscriptionId;
    const subscriptionStatus = userData.subscriptionStatus;
    const sessionBalance = userData.sessionBalance || {};
    const availableCredits = sessionBalance.available || 0;

    if (mode === 'gdpr-clean') {
      // GDPR-CLEAN: Auto-cancel any active subscription (immediate cancellation for account deletion)
      if (subscriptionId && (subscriptionStatus === 'active' || userData.cancelAtPeriodEnd)) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
          logger.info("Auto-canceled subscription for GDPR deletion", {
            targetUserId,
            subscriptionId,
            previousStatus: subscriptionStatus,
            wasCancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
          });
        } catch (error) {
          logger.warn("Failed to cancel subscription during GDPR deletion (may already be canceled)", {
            error: error.message,
            subscriptionId,
          });
          // Continue - subscription may already be fully canceled
        }
      }

      // GDPR-CLEAN: Refund session credits based on creditsToRefund parameter
      // Admin can specify exact number (0 to all); client self-service uses MAX_CLIENT_REFUND_CREDITS cap
      const requestedCreditsToRefund = request.data?.creditsToRefund;
      const creditsToRefund = (typeof requestedCreditsToRefund === 'number')
        ? Math.min(Math.max(0, requestedCreditsToRefund), availableCredits) // Admin: clamp to 0..available
        : Math.min(availableCredits, MAX_CLIENT_REFUND_CREDITS); // Client (future): use default cap

      if (creditsToRefund > 0 && availableCredits > 0) {
        let remainingToRefund = creditsToRefund;
        const activePackages = (userData.sessionPackages || []).filter(pkg => !pkg.expired && pkg.remaining > 0);
        
        for (const pkg of activePackages) {
          if (remainingToRefund <= 0) break;
          if (pkg.stripePaymentIntentId && pkg.amount && pkg.quantity) {
            const creditsFromThisPkg = Math.min(pkg.remaining, remainingToRefund);
            const refundAmount = Math.round((creditsFromThisPkg / pkg.quantity) * pkg.amount);
            if (refundAmount > 0) {
              try {
                await stripe.refunds.create({
                  payment_intent: pkg.stripePaymentIntentId,
                  amount: refundAmount,
                  reason: 'requested_by_customer',
                  metadata: {
                    type: 'account_deletion_refund',
                    userId: targetUserId,
                    packageId: pkg.id,
                    creditsRefunded: creditsFromThisPkg,
                    totalCredits: pkg.quantity,
                  },
                });
                logger.info("Refunded session credits for GDPR deletion", {
                  targetUserId,
                  packageId: pkg.id,
                  refundAmount,
                  creditsRefunded: creditsFromThisPkg,
                });
                remainingToRefund -= creditsFromThisPkg;
              } catch (error) {
                logger.warn("Failed to refund session package (may already be refunded)", {
                  error: error.message,
                  packageId: pkg.id,
                  paymentIntentId: pkg.stripePaymentIntentId,
                });
                // Continue - don't block deletion over refund failure
              }
            }
          }
        }
        
        logger.info("Session credit refund summary", {
          targetUserId,
          requested: creditsToRefund,
          totalAvailable: availableCredits,
          forfeited: availableCredits - creditsToRefund,
        });
      }
    }

    if (mode === 'no-traces') {
      // NO-TRACES: Auto-cancel any active subscription in Stripe
      if (subscriptionId) {
        try {
          await stripe.subscriptions.cancel(subscriptionId);
          logger.info("Auto-canceled subscription for no-traces deletion", {
            targetUserId,
            subscriptionId,
            previousStatus: subscriptionStatus,
          });
        } catch (error) {
          logger.warn("Failed to cancel subscription during no-traces deletion (may already be canceled)", {
            error: error.message,
            subscriptionId,
          });
          // Continue - subscription may already be canceled or invalid
        }
      }

      // NO-TRACES: Log zeroing out session credits
      if (availableCredits > 0) {
        logger.info("Zeroing out session credits for no-traces deletion", {
          targetUserId,
          creditsZeroed: availableCredits,
        });
      }
    }

    // STEP 1: CREATE AUDIT RECORD
    logger.info("Creating deleted_accounts audit record", {targetUserId, mode});
    const randomId = Math.random().toString(36).substring(2, 15);
    const anonymizedEmail = `deleted-user-${randomId}@privacy.local`;

    const crypto = require("crypto");
    const emailHash = crypto
        .createHash("sha256")
        .update(userData.email || "")
        .digest("hex");

    const completedSessionsSnapshot = await admin.firestore()
        .collection("sessions")
        .where("userId", "==", targetUserId)
        .where("status", "==", "completed")
        .get();

    const deletionRecord = {
      deletedUserId: targetUserId,
      anonymizedEmail: anonymizedEmail,
      originalEmailHash: emailHash,
      stripeCustomerId: stripeCustomerId || null,
      deletionMode: mode,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: "admin",
      deletedByAdminId: adminId,
      reason: reason,
      accountCreatedAt: userData.createdAt || null,
      lastPaymentDate: userData.lastPaymentDate || null,
      totalPayments: userData.sessionBalance?.purchased || 0,
      hadActiveSubscription: !!userData.subscriptionId,
      sessionsCompleted: completedSessionsSnapshot.size,
    };

    await admin.firestore()
        .collection("deleted_accounts")
        .doc(targetUserId)
        .set(deletionRecord);

    logger.info("Audit record created", {targetUserId, mode});

    // ============================================
    // NO-TRACES MODE: Complete removal of everything
    // ============================================
    if (mode === 'no-traces') {
      logger.info("Starting NO-TRACES deletion", {targetUserId});
      
      const steps = [];
      let totalDeleted = 0;

      // Delete all Storage files
      const bucket = admin.storage().bucket();
      
      // Progress Photos
      try {
        const [progressFiles] = await bucket.getFiles({
          prefix: `progressPhotos/${targetUserId}/`,
        });
        for (const file of progressFiles) {
          await file.delete();
        }
        steps.push({
          name: "Progress Photos (Storage)",
          itemsDeleted: progressFiles.length,
          status: "complete",
        });
        totalDeleted += progressFiles.length;
      } catch (error) {
        steps.push({
          name: "Progress Photos (Storage)",
          status: "error",
          error: error.message,
        });
      }

      // Nutrition Screenshots
      try {
        const [nutritionFiles] = await bucket.getFiles({
          prefix: `nutritionScreenshots/${targetUserId}/`,
        });
        for (const file of nutritionFiles) {
          await file.delete();
        }
        steps.push({
          name: "Nutrition Screenshots (Storage)",
          itemsDeleted: nutritionFiles.length,
          status: "complete",
        });
        totalDeleted += nutritionFiles.length;
      } catch (error) {
        steps.push({
          name: "Nutrition Screenshots (Storage)",
          status: "error",
          error: error.message,
        });
      }

      // Profile Photos
      try {
        const [profileFiles] = await bucket.getFiles({
          prefix: `profile-photos/${targetUserId}/`,
        });
        for (const file of profileFiles) {
          await file.delete();
        }
        steps.push({
          name: "Profile Photos (Storage)",
          itemsDeleted: profileFiles.length,
          status: "complete",
        });
        totalDeleted += profileFiles.length;
      } catch (error) {
        steps.push({
          name: "Profile Photos (Storage)",
          status: "error",
          error: error.message,
        });
      }

      // Delete all Firestore collections
      const deleteBatch = async (collectionName, queryFn, stepName) => {
        try {
          const snapshot = await queryFn();
          if (snapshot.empty) {
            steps.push({ name: stepName, itemsDeleted: 0, status: "complete" });
            return;
          }

          const batch = admin.firestore().batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
          
          steps.push({
            name: stepName,
            itemsDeleted: snapshot.size,
            status: "complete",
          });
          totalDeleted += snapshot.size;
        } catch (error) {
          steps.push({
            name: stepName,
            status: "error",
            error: error.message,
          });
        }
      };

      // Activity Logs (subcollection)
      await deleteBatch(
        "activities",
        () => admin.firestore().collection("users").doc(targetUserId).collection("activities").get(),
        "Activity Logs"
      );

      // Workouts
      await deleteBatch(
        "workouts",
        () => admin.firestore().collection("workouts").where("clientId", "==", targetUserId).get(),
        "Workouts"
      );

      // Client Plans
      await deleteBatch(
        "clientPlans",
        () => admin.firestore().collection("clientPlans").where("clientId", "==", targetUserId).get(),
        "Client Plans"
      );

      // Client Stats
      try {
        const clientStatsRef = admin.firestore().collection("clientStats").doc(targetUserId);
        const statsDoc = await clientStatsRef.get();
        if (statsDoc.exists) {
          await clientStatsRef.delete();
          steps.push({ name: "Client Stats", itemsDeleted: 1, status: "complete" });
          totalDeleted += 1;
        } else {
          steps.push({ name: "Client Stats", itemsDeleted: 0, status: "complete" });
        }
      } catch (error) {
        steps.push({ name: "Client Stats", status: "error", error: error.message });
      }

      // Client Messages
      await deleteBatch(
        "client_messages",
        () => admin.firestore().collection("client_messages").where("clientId", "==", targetUserId).get(),
        "Client Messages"
      );

      // Notifications
      await deleteBatch(
        "notifications",
        () => admin.firestore().collection("notifications").where("userId", "==", targetUserId).get(),
        "Notifications"
      );

      // Progress Photos (Firestore metadata)
      await deleteBatch(
        "progressPhotos",
        () => admin.firestore().collection("progressPhotos").where("userId", "==", targetUserId).get(),
        "Progress Photos Metadata"
      );

      // Weekly Surveys
      await deleteBatch(
        "weeklySurveys",
        () => admin.firestore().collection("weeklySurveys").where("clientId", "==", targetUserId).get(),
        "Weekly Surveys"
      );

      // Sessions
      await deleteBatch(
        "sessions",
        () => admin.firestore().collection("sessions").where("userId", "==", targetUserId).get(),
        "Sessions"
      );

      // Goals
      await deleteBatch(
        "goals",
        () => admin.firestore().collection("goals").where("clientId", "==", targetUserId).get(),
        "Goals"
      );

      // Daily Activities (composite doc IDs)
      await deleteBatch(
        "dailyActivities",
        () => admin.firestore()
          .collection("dailyActivities")
          .where(admin.firestore.FieldPath.documentId(), ">=", targetUserId)
          .where(admin.firestore.FieldPath.documentId(), "<", targetUserId + "\uf8ff")
          .get(),
        "Daily Activities"
      );

      // Nutrition Logs (subcollection)
      await deleteBatch(
        "nutritionLogs",
        () => admin.firestore().collection("nutritionLogs").doc(targetUserId).collection("mealPlans").get(),
        "Nutrition Logs"
      );

      // Login History
      await deleteBatch(
        "login_history",
        () => admin.firestore().collection("login_history").where("userId", "==", targetUserId).get(),
        "Login History"
      );

      // Nutrition Logs Parent Document
      try {
        const nutritionParentRef = admin.firestore().collection("nutritionLogs").doc(targetUserId);
        const nutritionParentDoc = await nutritionParentRef.get();
        if (nutritionParentDoc.exists) {
          await nutritionParentRef.delete();
          steps.push({ name: "Nutrition Logs Parent Doc", itemsDeleted: 1, status: "complete" });
          totalDeleted += 1;
        } else {
          steps.push({ name: "Nutrition Logs Parent Doc", itemsDeleted: 0, status: "complete" });
        }
      } catch (error) {
        steps.push({ name: "Nutrition Logs Parent Doc", status: "error", error: error.message });
      }

      // Report subscription cancellation (already done in pre-deletion step)
      if (subscriptionId) {
        steps.push({
          name: "Stripe Subscription (Canceled)",
          itemsDeleted: 1,
          status: "complete",
        });
      }

      // Report session credits zeroed out
      if (availableCredits > 0) {
        steps.push({
          name: `Session Credits (Zeroed ${availableCredits} remaining)`,
          itemsDeleted: availableCredits,
          status: "complete",
        });
      }

      // Delete Stripe Customer subcollections, parent doc, AND from Stripe API
      if (stripeCustomerId) {
        try {
          // Delete subcollections first (Firestore doesn't cascade-delete)
          const stripeSubcollections = ['subscriptions', 'payments', 'checkout_sessions'];
          let subItemsDeleted = 0;
          for (const subName of stripeSubcollections) {
            const subSnapshot = await admin.firestore()
                .collection("stripe_customers")
                .doc(targetUserId)
                .collection(subName)
                .get();
            if (!subSnapshot.empty) {
              const subBatch = admin.firestore().batch();
              subSnapshot.docs.forEach((doc) => subBatch.delete(doc.ref));
              await subBatch.commit();
              subItemsDeleted += subSnapshot.size;
            }
          }

          // Delete from Stripe's servers
          await stripe.customers.del(stripeCustomerId);
          logger.info("Stripe customer deleted from Stripe API", {stripeCustomerId});
          
          // Delete parent doc from Firestore
          await admin.firestore().collection("stripe_customers").doc(targetUserId).delete();
          logger.info("Stripe customer deleted from Firestore", {targetUserId});
          
          steps.push({
            name: "Stripe Customer (API + Firestore + Subcollections)",
            itemsDeleted: 1 + subItemsDeleted,
            status: "complete",
          });
          totalDeleted += 1 + subItemsDeleted;
        } catch (error) {
          logger.error("Failed to delete Stripe customer", {error: error.message});
          steps.push({
            name: "Stripe Customer",
            status: "error",
            error: error.message,
          });
        }
      }

      // Remove from trainer's client list
      if (userData.assignedTrainerId) {
        try {
          const trainerCollection = userData.assignedTrainerCollection || "admins";
          await admin.firestore()
              .collection(trainerCollection)
              .doc(userData.assignedTrainerId)
              .update({
                clients: admin.firestore.FieldValue.arrayRemove(targetUserId),
              });
          steps.push({
            name: "Trainer Client List",
            itemsDeleted: 1,
            status: "complete",
          });
        } catch (error) {
          steps.push({
            name: "Trainer Client List",
            status: "error",
            error: error.message,
          });
        }
      }

      // Delete User Document
      await userRef.delete();
      steps.push({
        name: "User Document",
        itemsDeleted: 1,
        status: "complete",
      });
      totalDeleted += 1;

      // Delete Firebase Auth
      try {
        await admin.auth().deleteUser(targetUserId);
        steps.push({
          name: "Firebase Auth",
          itemsDeleted: 1,
          status: "complete",
        });
        totalDeleted += 1;
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          steps.push({
            name: "Firebase Auth",
            status: "error",
            error: error.message,
          });
        } else {
          steps.push({
            name: "Firebase Auth",
            itemsDeleted: 0,
            status: "complete",
          });
        }
      }

      // Log audit
      await admin.firestore().collection("audit_logs").add({
        action: "account_deletion",
        mode: "no-traces",
        targetUserId: targetUserId,
        performedBy: adminId,
        performedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: reason,
        success: true,
        totalDeleted: totalDeleted,
      });

      logger.info("NO-TRACES deletion completed", {targetUserId, totalDeleted});

      return {
        success: true,
        message: "Account completely removed (no traces)",
        mode: "no-traces",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        steps: steps,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound: totalDeleted,
          totalItemsDeleted: totalDeleted,
          stripeCustomerStatus: "deleted",
          firebaseAuthStatus: "deleted",
        },
      };
    }

    // ============================================
    // GDPR-CLEAN MODE: Remove PII, preserve business records
    // ============================================
    if (mode === 'gdpr-clean') {
      logger.info("Starting GDPR-CLEAN deletion", {targetUserId});
      
      const steps = [];
      let totalDeleted = 0;

      // Anonymize Stripe customer (don't delete)
      if (stripeCustomerId) {
        try {
          await stripe.customers.update(stripeCustomerId, {
            name: "Deleted User",
            email: anonymizedEmail,
            phone: null,
            description: `GDPR deletion on ${new Date().toISOString().split("T")[0]}`,
            metadata: {
              userId: "anonymized",
              deletedAt: new Date().toISOString(),
              originalUserIdHash: emailHash,
            },
          });
          steps.push({
            name: "Stripe Customer (Anonymized)",
            itemsDeleted: 0,
            status: "complete",
          });
          logger.info("Stripe customer anonymized", {stripeCustomerId});
        } catch (error) {
          steps.push({
            name: "Stripe Customer",
            status: "error",
            error: error.message,
          });
        }
      }

      // Delete Storage files (PII)
      const bucket = admin.storage().bucket();
      
      try {
        const [progressFiles] = await bucket.getFiles({
          prefix: `progressPhotos/${targetUserId}/`,
        });
        for (const file of progressFiles) {
          await file.delete();
        }
        steps.push({
          name: "Progress Photos (Storage)",
          itemsDeleted: progressFiles.length,
          status: "complete",
        });
        totalDeleted += progressFiles.length;
      } catch (error) {
        steps.push({
          name: "Progress Photos (Storage)",
          status: "error",
          error: error.message,
        });
      }

      try {
        const [nutritionFiles] = await bucket.getFiles({
          prefix: `nutritionScreenshots/${targetUserId}/`,
        });
        for (const file of nutritionFiles) {
          await file.delete();
        }
        steps.push({
          name: "Nutrition Screenshots (Storage)",
          itemsDeleted: nutritionFiles.length,
          status: "complete",
        });
        totalDeleted += nutritionFiles.length;
      } catch (error) {
        steps.push({
          name: "Nutrition Screenshots (Storage)",
          status: "error",
          error: error.message,
        });
      }

      try {
        const [profileFiles] = await bucket.getFiles({
          prefix: `profile-photos/${targetUserId}/`,
        });
        for (const file of profileFiles) {
          await file.delete();
        }
        steps.push({
          name: "Profile Photos (Storage)",
          itemsDeleted: profileFiles.length,
          status: "complete",
        });
        totalDeleted += profileFiles.length;
      } catch (error) {
        steps.push({
          name: "Profile Photos (Storage)",
          status: "error",
          error: error.message,
        });
      }

      // Delete Progress Photos metadata (Firestore)
      try {
        const progressPhotosSnapshot = await admin.firestore()
            .collection("progressPhotos")
            .where("userId", "==", targetUserId)
            .get();
        const batch = admin.firestore().batch();
        progressPhotosSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        if (progressPhotosSnapshot.size > 0) {
          await batch.commit();
        }
        steps.push({
          name: "Progress Photos Metadata",
          itemsDeleted: progressPhotosSnapshot.size,
          status: "complete",
        });
        totalDeleted += progressPhotosSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Progress Photos Metadata",
          status: "error",
          error: error.message,
        });
      }

      // Delete Client Messages (personal communications)
      try {
        const messagesSnapshot = await admin.firestore()
            .collection("client_messages")
            .where("clientId", "==", targetUserId)
            .get();
        const batch = admin.firestore().batch();
        messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        if (messagesSnapshot.size > 0) {
          await batch.commit();
        }
        steps.push({
          name: "Client Messages",
          itemsDeleted: messagesSnapshot.size,
          status: "complete",
        });
        totalDeleted += messagesSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Client Messages",
          status: "error",
          error: error.message,
        });
      }

      // Delete Login History (behavioral tracking)
      try {
        const loginSnapshot = await admin.firestore()
            .collection("login_history")
            .where("userId", "==", targetUserId)
            .get();
        const batch = admin.firestore().batch();
        loginSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
        if (loginSnapshot.size > 0) {
          await batch.commit();
        }
        steps.push({
          name: "Login History",
          itemsDeleted: loginSnapshot.size,
          status: "complete",
        });
        totalDeleted += loginSnapshot.size;
      } catch (error) {
        steps.push({
          name: "Login History",
          status: "error",
          error: error.message,
        });
      }

      // Delete Nutrition Logs (subcollection + parent doc)
      try {
        const nutritionSubSnapshot = await admin.firestore()
            .collection("nutritionLogs")
            .doc(targetUserId)
            .collection("mealPlans")
            .get();
        if (!nutritionSubSnapshot.empty) {
          const nlBatch = admin.firestore().batch();
          nutritionSubSnapshot.docs.forEach((doc) => nlBatch.delete(doc.ref));
          await nlBatch.commit();
        }
        // Delete parent document too
        const nutritionParentRef = admin.firestore().collection("nutritionLogs").doc(targetUserId);
        const nutritionParentDoc = await nutritionParentRef.get();
        if (nutritionParentDoc.exists) {
          await nutritionParentRef.delete();
        }
        const nlTotal = nutritionSubSnapshot.size + (nutritionParentDoc.exists ? 1 : 0);
        steps.push({
          name: "Nutrition Logs (Subcollection + Parent)",
          itemsDeleted: nlTotal,
          status: "complete",
        });
        totalDeleted += nlTotal;
      } catch (error) {
        steps.push({
          name: "Nutrition Logs",
          status: "error",
          error: error.message,
        });
      }

      // Anonymize User Document (don't delete - preserve for business records)
      try {
        await userRef.update({
          name: `Deleted User ${randomId.substring(0, 8)}`,
          email: anonymizedEmail,
          phone: admin.firestore.FieldValue.delete(),
          photoURL: admin.firestore.FieldValue.delete(),
          address: admin.firestore.FieldValue.delete(),
          gdprDeleted: true,
          gdprDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        steps.push({
          name: "User Document (Anonymized)",
          itemsDeleted: 0,
          status: "complete",
        });
        logger.info("User document anonymized", {targetUserId});
      } catch (error) {
        steps.push({
          name: "User Document",
          status: "error",
          error: error.message,
        });
      }

      // Delete Firebase Auth
      try {
        await admin.auth().deleteUser(targetUserId);
        steps.push({
          name: "Firebase Auth",
          itemsDeleted: 1,
          status: "complete",
        });
        totalDeleted += 1;
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          steps.push({
            name: "Firebase Auth",
            status: "error",
            error: error.message,
          });
        } else {
          steps.push({
            name: "Firebase Auth",
            itemsDeleted: 0,
            status: "complete",
          });
        }
      }

      // Log audit
      await admin.firestore().collection("audit_logs").add({
        action: "account_deletion",
        mode: "gdpr-clean",
        targetUserId: targetUserId,
        performedBy: adminId,
        performedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: reason,
        success: true,
        totalDeleted: totalDeleted,
      });

      logger.info("GDPR-CLEAN deletion completed", {targetUserId, totalDeleted});

      return {
        success: true,
        message: "PII removed, business records preserved (GDPR-compliant)",
        mode: "gdpr-clean",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        steps: steps,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound: totalDeleted,
          totalItemsDeleted: totalDeleted,
          stripeCustomerStatus: "anonymized",
          firebaseAuthStatus: "deleted",
        },
      };
    }

    // This should never be reached, but handle unknown modes
    throw new Error(`Unknown deletion mode: ${mode}`);

  } catch (error) {
    logger.error("Account deletion failed", {
      error: error.message,
      stack: error.stack,
      adminId: request.auth?.uid,
      targetUserId: request.data?.targetUserId,
      mode: request.data?.mode,
    });

    // Log failed attempt
    if (request.auth && request.data?.targetUserId) {
      try {
        await admin.firestore().collection("audit_logs").add({
          action: "account_deletion",
          mode: request.data?.mode || "unknown",
          targetUserId: request.data.targetUserId,
          performedBy: request.auth.uid,
          performedAt: admin.firestore.FieldValue.serverTimestamp(),
          reason: request.data?.reason || "Unknown",
          success: false,
          error: error.message,
        });
      } catch (logError) {
        logger.error("Failed to log deletion failure", {error: logError.message});
      }
    }

    throw new Error(`Account deletion failed: ${error.message}`);
  }
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

    // ACTIVITY FEED: Write client_login event (only for client-role users)
    if (loginRecord.success) {
      const userDocForFeed = await admin.firestore().collection('users').doc(userId).get();
      if (userDocForFeed.exists && userDocForFeed.data().role === 'client') {
        const feedUserData = userDocForFeed.data();
        writeActivityEvent({
          type: 'client_login',
          clientId: userId,
          clientName: feedUserData.name || 'Client',
          trainerId: feedUserData.assignedTrainerId || '',
          message: `${feedUserData.name || 'Client'} logged in`,
          metadata: {},
        }).catch(err => {
          logger.warn("[ActivityFeed] Failed to write client_login event", { userId, error: err.message });
        });
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
    const before = event.data.before.exists;
    const after = event.data.after.exists ? event.data.after.data() : null;
    
    // Only fire on document creation (not updates)
    if (before || !after) return null;
    
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
 * CLIENT ACTIVITY FEED SYSTEM
 * Real-time activity log for trainers — auto-expires after 7 days.
 * See: docs/02-implementation/client-activity-feed-architecture.md
 */

/**
 * Scheduled function to clean up expired activity feed events.
 * Runs daily at 3 AM UTC. Deletes events where expiresAt < now.
 * Events have a 7-day TTL set at write time by writeActivityEvent().
 */
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
