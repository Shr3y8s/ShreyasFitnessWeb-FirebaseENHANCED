const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Define secrets for secure access to Stripe
const stripeKey = defineSecret("STRIPE_KEY");

/**
 * Create a payment intent for one-time payments
 * This is used by the PaymentElement in the React UI
 * @param {Object} request - The callable function request
 * @return {Object} Payment intent client secret
 */
exports.createPaymentIntent = onCall({
  region: "us-west1",
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
      apiVersion: "2025-07-30.basil",
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
  region: "us-west1",
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
      apiVersion: "2025-07-30.basil",
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
 * Firestore trigger to sync subscription status from stripe_customers to users
 * This bridges the Stripe Extension (which updates stripe_customers)
 * with our users collection (which tracks paymentStatus)
 * Triggered whenever a subscription document is created or updated
 */
exports.syncSubscriptionToUser = onDocumentWritten({
  document: "stripe_customers/{userId}/subscriptions/{subscriptionId}",
  region: "us-west1",
}, async (event) => {
  const change = event.data;
  const userId = event.params.userId;
  const subscriptionId = event.params.subscriptionId;

  try {
    // If subscription was deleted
    if (!change.after.exists) {
      logger.info("Subscription deleted, updating user", {userId, subscriptionId});
      await admin.firestore().collection("users").doc(userId).update({
        paymentStatus: "cancelled",
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

    // Update the users collection with payment status
    // Only update paymentStatus - don't duplicate stripeId/stripeLink
    await admin.firestore().collection("users").doc(userId).update({
      paymentStatus: status === "active" ? "active" : "pending",
      subscriptionId: subscriptionId,
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info("User payment status synced successfully", {
      userId,
      paymentStatus: status === "active" ? "active" : "pending",
      subscriptionId,
    });

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
