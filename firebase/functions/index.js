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
 * Firestore trigger to sync ONE-TIME payment status from stripe_customers to users
 * This handles one-time payments like 4-pack sessions or single training sessions
 * Triggered whenever a payment document is created or updated in the payments subcollection
 */
exports.syncPaymentToUser = onDocumentWritten({
  document: "stripe_customers/{userId}/payments/{paymentId}",
  region: sharedConfig.region,
  secrets: [stripeKey],
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

// Export workout management functions
exports.assignWorkout = workoutFunctions.assignWorkout;
exports.startWorkoutExecution = workoutFunctions.startWorkoutExecution;
exports.updateWorkoutExecution = workoutFunctions.updateWorkoutExecution;
exports.saveWorkoutExecution = workoutFunctions.saveWorkoutExecution;
exports.completeWorkoutExecution = workoutFunctions.completeWorkoutExecution;
exports.createWorkoutTemplate = workoutFunctions.createWorkoutTemplate;
exports.updateWorkoutTemplate = workoutFunctions.updateWorkoutTemplate;
exports.deleteWorkoutTemplate = workoutFunctions.deleteWorkoutTemplate;

/**
 * Firestore trigger to sync subscription status from stripe_customers to users
 * This bridges the Stripe Extension (which updates stripe_customers)
 * with our users collection
 * Triggered whenever a subscription document is created or updated
 */
exports.syncSubscriptionToUser = onDocumentWritten({
  document: "stripe_customers/{userId}/subscriptions/{subscriptionId}",
  region: sharedConfig.region,
}, async (event) => {
  const change = event.data;
  const userId = event.params.userId;
  const subscriptionId = event.params.subscriptionId;

  try {
    // If subscription was deleted
    if (!change.after.exists) {
      logger.info("Subscription deleted, updating user", {userId, subscriptionId});
      await admin.firestore().collection("users").doc(userId).update({
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
      subscriptionId: subscriptionId,
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

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
 * ACCOUNT DELETION FUNCTION
 * Admin-initiated account deletion with proper data handling
 * Preserves financial records while removing all PII
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
    const adminOverride = request.data?.adminOverride || false;
    const reason = request.data?.reason || "Admin-initiated deletion";

    if (!targetUserId) {
      throw new Error("targetUserId is required");
    }

    logger.info("Account deletion initiated", {
      adminId,
      targetUserId,
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

    // STEP 1: VALIDATE - No upcoming sessions
    logger.info("Validating no upcoming sessions", {targetUserId});
    const now = new Date();
    const sessionsSnapshot = await admin.firestore()
        .collection("sessions")
        .where("userId", "==", targetUserId)
        .where("status", "==", "scheduled")
        .where("scheduledAt", ">", now)
        .get();

    if (!sessionsSnapshot.empty) {
      throw new Error(
          `Cannot delete account: User has ${sessionsSnapshot.size} upcoming sessions. Cancel all sessions first.`,
      );
    }

    // STEP 2: VALIDATE - Subscription status
    logger.info("Validating subscription status", {targetUserId});
    if (userData.subscriptionId && userData.subscriptionStatus === "active" && !userData.cancelAtPeriodEnd) {
      if (!adminOverride) {
        throw new Error(
            "Cannot delete account: User has active subscription. Cancel subscription first or use admin override.",
        );
      }

      // Admin override: Auto-cancel subscription
      logger.info("Admin override: Auto-canceling subscription", {
        targetUserId,
        subscriptionId: userData.subscriptionId,
      });

      const stripe = require("stripe")(stripeKey.value(), {
        apiVersion: "2024-09-30.acacia",
      });

      await stripe.subscriptions.update(userData.subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    // STEP 3: CREATE AUDIT RECORD
    logger.info("Creating deleted_accounts audit record", {targetUserId});
    const randomId = Math.random().toString(36).substring(2, 15);
    const anonymizedEmail = `deleted-user-${randomId}@privacy.local`;

    // Calculate email hash for potential lookups
    const crypto = require("crypto");
    const emailHash = crypto
        .createHash("sha256")
        .update(userData.email || "")
        .digest("hex");

    // Count completed sessions
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
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: "admin",
      deletedByAdminId: adminId,
      reason: reason,
      accountCreatedAt: userData.createdAt || null,
      lastPaymentDate: userData.lastPaymentDate || null,
      totalPayments: userData.sessionBalance?.purchased || 0,
      hadActiveSubscription: !!userData.subscriptionId,
      hadUpcomingSessions: false,
      sessionsCompleted: completedSessionsSnapshot.size,
    };

    await admin.firestore()
        .collection("deleted_accounts")
        .doc(targetUserId)
        .set(deletionRecord);

    logger.info("Audit record created", {targetUserId});

    // STEP 4: ANONYMIZE STRIPE CUSTOMER
    if (stripeCustomerId) {
      logger.info("Anonymizing Stripe customer", {stripeCustomerId});
      try {
        const stripe = require("stripe")(stripeKey.value(), {
          apiVersion: "2024-09-30.acacia",
        });

        await stripe.customers.update(stripeCustomerId, {
          name: "Deleted User",
          email: anonymizedEmail,
          phone: null,
          description: `Account deleted on ${new Date().toISOString().split("T")[0]}`,
          metadata: {
            userId: "deleted",
            deletedAt: new Date().toISOString(),
            originalUserIdHash: emailHash,
          },
        });

        logger.info("Stripe customer anonymized", {stripeCustomerId});
      } catch (error) {
        logger.error("Failed to anonymize Stripe customer", {
          error: error.message,
          stripeCustomerId,
        });
        // Continue - don't block deletion on Stripe errors
      }
    }

    // Track deletion counts
    const deletionCounts = {
      photos: 0,
      activities: 0,
      workouts: 0,
      surveys: 0,
      messages: 0,
      plans: 0,
    };

    // STEP 5: DELETE PROGRESS PHOTOS (Firebase Storage)
    logger.info("Deleting progress photos", {targetUserId});
    try {
      const bucket = admin.storage().bucket();
      const [files] = await bucket.getFiles({
        prefix: `progress-photos/${targetUserId}/`,
      });

      for (const file of files) {
        await file.delete();
        deletionCounts.photos++;
      }

      logger.info("Progress photos deleted", {
        targetUserId,
        count: deletionCounts.photos,
      });
    } catch (error) {
      logger.error("Failed to delete progress photos", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 6: DELETE ACTIVITY LOGS
    logger.info("Deleting activity logs", {targetUserId});
    try {
      const activitiesSnapshot = await admin.firestore()
          .collection("users")
          .doc(targetUserId)
          .collection("activities")
          .get();

      const batch = admin.firestore().batch();
      activitiesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCounts.activities++;
      });

      if (!batch._writes.length === 0) {
        await batch.commit();
      }

      logger.info("Activity logs deleted", {
        targetUserId,
        count: deletionCounts.activities,
      });
    } catch (error) {
      logger.error("Failed to delete activity logs", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 7: DELETE WORKOUT EXECUTIONS
    logger.info("Deleting workout executions", {targetUserId});
    try {
      const workoutsSnapshot = await admin.firestore()
          .collection("workoutExecutions")
          .where("userId", "==", targetUserId)
          .get();

      const batch = admin.firestore().batch();
      workoutsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCounts.workouts++;
      });

      if (batch._writes.length > 0) {
        await batch.commit();
      }

      logger.info("Workout executions deleted", {
        targetUserId,
        count: deletionCounts.workouts,
      });
    } catch (error) {
      logger.error("Failed to delete workout executions", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 8: DELETE SURVEY RESPONSES
    logger.info("Deleting survey responses", {targetUserId});
    try {
      const surveysSnapshot = await admin.firestore()
          .collection("users")
          .doc(targetUserId)
          .collection("surveys")
          .get();

      const batch = admin.firestore().batch();
      surveysSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCounts.surveys++;
      });

      if (batch._writes.length > 0) {
        await batch.commit();
      }

      logger.info("Survey responses deleted", {
        targetUserId,
        count: deletionCounts.surveys,
      });
    } catch (error) {
      logger.error("Failed to delete survey responses", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 9: DELETE MESSAGES
    logger.info("Deleting messages", {targetUserId});
    try {
      const messagesSnapshot = await admin.firestore()
          .collection("messages")
          .where("userId", "==", targetUserId)
          .get();

      const batch = admin.firestore().batch();
      messagesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCounts.messages++;
      });

      if (batch._writes.length > 0) {
        await batch.commit();
      }

      logger.info("Messages deleted", {
        targetUserId,
        count: deletionCounts.messages,
      });
    } catch (error) {
      logger.error("Failed to delete messages", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 10: DELETE PLAN DATA
    logger.info("Deleting plan data", {targetUserId});
    try {
      const plansSnapshot = await admin.firestore()
          .collection("users")
          .doc(targetUserId)
          .collection("plans")
          .get();

      const batch = admin.firestore().batch();
      plansSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletionCounts.plans++;
      });

      if (batch._writes.length > 0) {
        await batch.commit();
      }

      logger.info("Plan data deleted", {
        targetUserId,
        count: deletionCounts.plans,
      });
    } catch (error) {
      logger.error("Failed to delete plan data", {
        error: error.message,
        targetUserId,
      });
    }

    // STEP 11: REMOVE FROM TRAINER'S CLIENT LIST
    if (userData.assignedTrainerId) {
      logger.info("Removing from trainer's client list", {
        targetUserId,
        trainerId: userData.assignedTrainerId,
      });

      try {
        const trainerCollection = userData.assignedTrainerCollection || "admins";
        const trainerRef = admin.firestore()
            .collection(trainerCollection)
            .doc(userData.assignedTrainerId);

        await trainerRef.update({
          clients: admin.firestore.FieldValue.arrayRemove(targetUserId),
        });

        logger.info("Removed from trainer's client list", {
          targetUserId,
          trainerId: userData.assignedTrainerId,
        });
      } catch (error) {
        logger.error("Failed to remove from trainer's client list", {
          error: error.message,
          targetUserId,
        });
      }
    }

    // STEP 12: DELETE FIRESTORE USER DOCUMENT
    logger.info("Deleting Firestore user document", {targetUserId});
    await userRef.delete();

    // STEP 13: DELETE FIREBASE AUTH
    logger.info("Deleting Firebase Auth account", {targetUserId});
    try {
      await admin.auth().deleteUser(targetUserId);
      logger.info("Firebase Auth account deleted", {targetUserId});
    } catch (error) {
      logger.error("Failed to delete Firebase Auth account", {
        error: error.message,
        targetUserId,
      });
      // This is critical - but don't fail if account doesn't exist
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // STEP 14: LOG AUDIT
    await admin.firestore().collection("audit_logs").add({
      action: "account_deletion",
      targetUserId: targetUserId,
      performedBy: adminId,
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
      reason: reason,
      success: true,
      deletionCounts: deletionCounts,
    });

    logger.info("Account deletion completed successfully", {
      targetUserId,
      adminId,
      deletionCounts,
    });

    return {
      success: true,
      message: "Account deleted successfully",
      deletedUserId: targetUserId,
      stripeCustomerId: stripeCustomerId,
      itemsDeleted: deletionCounts,
    };
  } catch (error) {
    logger.error("Account deletion failed", {
      error: error.message,
      stack: error.stack,
      adminId: request.auth?.uid,
      targetUserId: request.data?.targetUserId,
    });

    // Log failed attempt
    if (request.auth && request.data?.targetUserId) {
      try {
        await admin.firestore().collection("audit_logs").add({
          action: "account_deletion",
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
 * MIGRATION FUNCTIONS
 * One-time or administrative functions for data migrations
 */
const migrationFunctions = require("./migrate-session-locations");
exports.migrateSessionLocations = migrationFunctions.migrateSessionLocations;
