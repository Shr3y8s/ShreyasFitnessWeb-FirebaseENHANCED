const {onRequest, onCall} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// Define secrets for secure access to Stripe
const stripeKey = defineSecret("STRIPE_KEY");

/**
 * Minimal test function - successfully deployed
 */
exports.minimalTest = onRequest({
  region: "us-west1"
}, (req, res) => {
  res.send("Hello, World!");
});

/**
 * Simple callable test function 
 * This tests if the basic callable function structure works without Stripe
 */
exports.basicCallable = onCall({
  region: "us-west1"
}, async (request) => {
  // Return a simple response to verify the function works
  return {
    message: "Callable function working",
    authenticated: !!request.auth
  };
});

/**
 * Create a payment intent for one-time payments
 * This is used by the PaymentElement in the React UI
 */
exports.createPaymentIntent = onCall({
  region: "us-west1",
  secrets: [stripeKey],
  cors: {
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://localhost:5000",
    ],
  },
}, async (request) => {
  try {
    logger.info("Starting payment intent creation");
    
    // For development/testing: Allow unauthenticated calls with testing flag
    const isTestMode = request.data && request.data.isTestMode;
    
    if (!request.auth && !isTestMode) {
      throw new Error("The function must be called while authenticated.");
    }

    // Get user ID (or use test-user-id for testing)
    const userId = request.auth ? request.auth.uid : "test-user-id";

    logger.info("Creating payment intent", {
      userId: userId,
      priceId: request.data.price,
      isTestMode: isTestMode
    });

    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2025-07-30.basil"
    });

    // Get the price from Stripe to verify it exists and get the amount
    const price = await stripe.prices.retrieve(request.data.price);

    if (!price) {
      throw new Error("The requested price does not exist.");
    }

    // Create a PaymentIntent with the price amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.unit_amount,
      currency: price.currency,
      automatic_payment_methods: request.data.automatic_payment_methods ||
        {enabled: true},
      // Remove customer field for one-time payments to fix the error
      metadata: {
        userId: userId,
        priceId: request.data.price,
        isTestMode: isTestMode || false
      }
    });

    // Direct return pattern for callable functions
    return {
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    logger.error("Error creating payment intent", error);
    throw new Error(error.message);
  }
});

/**
 * Create a checkout session for subscriptions
 * This redirects the user to the Stripe Checkout page
 */
exports.createCheckoutSession = onCall({
  region: "us-west1",
  secrets: [stripeKey],
  cors: {
    origin: [
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://localhost:5000",
    ],
  },
}, async (request) => {
  try {
    // For development/testing: Allow unauthenticated calls with testing flag
    const isTestMode = request.data && request.data.isTestMode;
    
    if (!request.auth && !isTestMode) {
      throw new Error("The function must be called while authenticated.");
    }

    // Get user ID (or use test-user-id for testing)
    const userId = request.auth ? request.auth.uid : "test-user-id";

    logger.info("Creating checkout session", {
      userId: userId,
      lineItems: request.data.line_items,
      isTestMode: isTestMode
    });

    // Initialize Stripe with the secret key
    const stripe = require("stripe")(stripeKey.value(), {
      apiVersion: "2025-07-30.basil"
    });

    // Create the checkout session with provided line items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: request.data.line_items,
      mode: "subscription",
      success_url: request.data.success_url ||
        `${process.env.PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: request.data.cancel_url ||
        `${process.env.PUBLIC_URL}/canceled`,
      client_reference_id: userId,
      customer_email: request.data.customer_email || "test@example.com",
      billing_address_collection: request.data.billing_address_collection ||
        "required",
      allow_promotion_codes: request.data.allow_promotion_codes || true,
      metadata: request.data.metadata || {},
      subscription_data: {
        metadata: {
          userId: userId,
          isTestMode: isTestMode || false,
          ...request.data.metadata
        }
      }
    });

    return {
      sessionId: session.id
    };
  } catch (error) {
    logger.error("Error creating checkout session", error);
    throw new Error(error.message);
  }
});

/**
 * Webhook handler for Stripe events
 * This ensures data consistency between Stripe and Firebase
 */
exports.stripeWebhook = onRequest({
  region: "us-west1",
  secrets: [stripeKey]
}, (req, res) => {
  // Handle preflight requests for CORS directly
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, stripe-signature");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return;
  }

  // Initialize Stripe with the secret key
  const stripe = require("stripe")(stripeKey.value(), {
    apiVersion: "2025-07-30.basil"
  });

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || stripeKey.value();
    
    if (!webhookSecret) {
      logger.error("Webhook secret not configured");
      return res.status(500).json({error: "Webhook secret not configured"});
    }

    const sig = req.headers["stripe-signature"];

    // Verify and construct the event
    const event = stripe.webhooks.constructEvent(
      req.rawBody, sig, webhookSecret,
    );

    logger.info(`Webhook received: ${event.type}`);

    // Handle the event based on its type
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        logger.info("Payment succeeded:", paymentIntent.id);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "invoice.payment_succeeded":
      case "invoice.payment_failed":
        // Log event details
        logger.info(`${event.type} event received:`, {
          id: event.data.object.id,
          customer: event.data.object.customer
        });
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    return res.status(200).json({received: true});
  } catch (err) {
    logger.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
