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
      const updateData = {
        paymentStatus: "active",
        lastPaymentId: paymentId,
        lastPaymentAmount: paymentData.amount || 0,
        lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Assign trainer if not already assigned
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      
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
          updateData.assignedTrainerName = trainerData.name || "Your Coach";
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
          
          logger.info("Trainer assigned to user", {
            userId,
            trainerId: trainerDoc.id,
            trainerName: trainerData.name,
          });
        } else {
          logger.warn("No trainer found in admins collection", {userId});
        }
      }

      await admin.firestore().collection("users").doc(userId).update(updateData);

      logger.info("User payment status synced successfully (one-time payment)", {
        userId,
        paymentStatus: "active",
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

  // Determine package type and quantity from product name
  // Expected format: "Single Session" or "4-Pack Training Sessions"
  const productName = product.name || "";
  const quantityMatch = productName.match(/(\d+)/);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
  const packageType = quantity === 1 ? "single" : (quantity === 4 ? "4-pack" : `${quantity}-pack`);

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
    type: packageType,
    quantity: quantity,
    remaining: quantity,
    purchaseDate: purchaseDate,
    expirationDate: expirationDate,
    expired: false,
    stripePaymentIntentId: paymentIntentId,
    stripePriceId: priceId,
    stripeProductId: product.id,
    amount: price.unit_amount,
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
    type: packageType,
  });
}

/**
 * SESSION MANAGEMENT SYSTEM
 * Import and export session management functions
 */
const sessionFunctions = require("./sessions");

// Export session management functions (excluding purchaseSessionPackage and stripeSessionWebhook)
// Those are now handled by Stripe Extension's built-in checkout and syncPaymentToUser trigger
exports.getSessionBalance = sessionFunctions.getSessionBalance;
exports.calendlyWebhook = sessionFunctions.calendlyWebhook;
exports.expireSessionPackages = sessionFunctions.expireSessionPackages;
exports.cancelSession = sessionFunctions.cancelSession;

/**
 * Firestore trigger to sync subscription status from stripe_customers to users
 * This bridges the Stripe Extension (which updates stripe_customers)
 * with our users collection (which tracks paymentStatus)
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

    // Prepare update object
    const updateData = {
      paymentStatus: status === "active" ? "active" : "pending",
      subscriptionId: subscriptionId,
      subscriptionStatus: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // If subscription is active and user doesn't have a trainer assigned, assign one
    if (status === "active") {
      const userDoc = await admin.firestore().collection("users").doc(userId).get();
      const userData = userDoc.data();
      
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
          updateData.assignedTrainerName = trainerData.name || "Your Coach";
          updateData.assignedAt = admin.firestore.FieldValue.serverTimestamp();
          
          logger.info("Trainer assigned to user", {
            userId,
            trainerId: trainerDoc.id,
            trainerName: trainerData.name,
          });
        } else {
          logger.warn("No trainer found in admins collection", {userId});
        }
      }
    }

    // Update the users collection with payment status and trainer assignment
    await admin.firestore().collection("users").doc(userId).update(updateData);

    logger.info("User payment status synced successfully", {
      userId,
      paymentStatus: status === "active" ? "active" : "pending",
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
 * Scheduled function to clean up abandoned pending accounts
 * Runs daily at 2 AM UTC to remove accounts that:
 * - Have paymentStatus === "pending"
 * - Were created more than 48 hours ago
 * - Have no successful payments
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

    // Find pending accounts older than 48 hours
    const usersRef = admin.firestore().collection("users");
    const pendingAccountsQuery = usersRef
        .where("paymentStatus", "==", "pending")
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
 * MIGRATION FUNCTIONS
 * One-time or administrative functions for data migrations
 */
const migrationFunctions = require("./migrate-session-locations");
exports.migrateSessionLocations = migrationFunctions.migrateSessionLocations;
