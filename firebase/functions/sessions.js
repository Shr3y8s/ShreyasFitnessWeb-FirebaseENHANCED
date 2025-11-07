/**
 * Cloud Functions for In-Person Training Session Management
 * 
 * This module handles:
 * - Session package purchases (Stripe integration)
 * - Session balance tracking
 * - Session scheduling (Calendly webhook)
 * - Session cancellation
 * - Package expiration
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const sharedConfig = require("./firebase-config.json");

const db = admin.firestore();

// Define Stripe secret key (same as other functions use)
const stripeKey = defineSecret("STRIPE_KEY");

/**
 * NOTE: Session package purchases now use Stripe Extension's built-in checkout
 * The Extension automatically handles:
 * - Checkout session creation (via checkout_sessions collection)
 * - Webhook processing
 * - Payment document creation
 * 
 * Session packages are created by the syncPaymentToUser trigger in index.js
 * when it detects a payment with metadata.type === "session_package"
 */

/**
 * Get Session Balance
 * Returns user's session balance and package details
 */
exports.getSessionBalance = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      throw new HttpsError("not-found", "User not found");
    }

    const userData = userDoc.data();
    const packages = userData.sessionPackages || [];
    const balance = userData.sessionBalance || {
      available: 0,
      purchased: 0,
      used: 0,
      expired: 0,
    };

    // Convert Timestamps to milliseconds for client consumption
    const serializedPackages = packages.map(pkg => ({
      ...pkg,
      purchaseDate: pkg.purchaseDate?.toMillis() || null,
      expirationDate: pkg.expirationDate?.toMillis() || null,
    }));

    // Find next expiration
    const activePackages = packages.filter(pkg => !pkg.expired && pkg.remaining > 0);
    let nextExpiration = null;
    if (activePackages.length > 0) {
      const earliestExpiration = activePackages.reduce((earliest, pkg) => {
        return pkg.expirationDate.toMillis() < earliest.toMillis() ? pkg.expirationDate : earliest;
      }, activePackages[0].expirationDate);
      nextExpiration = earliestExpiration.toMillis();
    }

    // Find upcoming expirations (within 7 days)
    const now = admin.firestore.Timestamp.now();
    const sevenDaysFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + (7 * 24 * 60 * 60 * 1000)
    );
    
    const upcomingExpirations = activePackages
      .filter(pkg => pkg.expirationDate.toMillis() <= sevenDaysFromNow.toMillis())
      .map(pkg => ({
        ...pkg,
        purchaseDate: pkg.purchaseDate?.toMillis() || null,
        expirationDate: pkg.expirationDate?.toMillis() || null,
      }));

    return {
      available: balance.available,
      packages: serializedPackages,
      nextExpiration: nextExpiration,
      upcomingExpirations: upcomingExpirations,
    };
  } catch (error) {
    console.error("Error getting session balance:", error);
    throw new HttpsError("internal", "Failed to get session balance");
  }
});

/**
 * Schedule Session (Calendly Webhook Handler)
 * Deducts session from balance when booking is confirmed
 */
exports.calendlyWebhook = onRequest({
  region: sharedConfig.region,
  cors: false,
}, async (req, res) => {
  // TODO: Verify Calendly webhook signature
  
  const webhookEvent = req.body;
  
  console.log("Received Calendly webhook:", JSON.stringify(webhookEvent, null, 2));

  try {
    if (webhookEvent.event === "invitee.created") {
      const payload = webhookEvent.payload;
      
      // Extract data directly from payload (Calendly includes everything)
      const inviteeEmail = payload.email;
      const inviteeName = payload.name;
      const scheduledEvent = payload.scheduled_event;
      
      if (!inviteeEmail || !scheduledEvent) {
        console.error("Missing required data in webhook payload");
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      const calendlyEventId = scheduledEvent.uri.split('/').pop();
      const scheduledDate = admin.firestore.Timestamp.fromDate(
        new Date(scheduledEvent.start_time)
      );
      const duration = Math.round(
        (new Date(scheduledEvent.end_time) - new Date(scheduledEvent.start_time)) / (1000 * 60)
      );

      console.log(`Processing booking for ${inviteeEmail} (${inviteeName})`);

      // Find user by email
      const usersSnapshot = await db.collection("users")
        .where("email", "==", inviteeEmail)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        console.error(`User not found for email: ${inviteeEmail}`);
        return res.status(404).json({ error: "User not found" });
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Schedule the session
      await scheduleSession({
        userId,
        calendlyEventId,
        eventDetails: {
          scheduledDate,
          duration,
          eventUri: scheduledEvent.uri,
        },
        userData,
      });

      console.log(`Successfully scheduled session for user ${userId}`);
      res.json({ success: true });
    } else if (webhookEvent.event === "invitee.canceled") {
      // Handle cancellation
      console.log("Invitee canceled:", webhookEvent.payload);
      res.json({ received: true });
    } else {
      console.log("Unhandled event type:", webhookEvent.event);
      res.json({ received: true });
    }
  } catch (error) {
    console.error("Error processing Calendly webhook:", error);
    res.status(500).json({ error: "Webhook processing failed", details: error.message });
  }
});

/**
 * Schedule Session Internal Function
 * Deducts session from oldest unexpired package
 */
async function scheduleSession({ userId, calendlyEventId, eventDetails, userData }) {
  const userRef = db.collection("users").doc(userId);
  
  await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentData = userDoc.data();
    
    const packages = currentData.sessionPackages || [];
    const balance = currentData.sessionBalance || { available: 0, purchased: 0, used: 0, expired: 0 };

    // Check if balance available
    if (balance.available <= 0) {
      throw new Error("No sessions available");
    }

    // Find oldest unexpired package with remaining sessions (FIFO)
    const activePackages = packages
      .filter(pkg => !pkg.expired && pkg.remaining > 0)
      .sort((a, b) => a.purchaseDate.toMillis() - b.purchaseDate.toMillis());

    if (activePackages.length === 0) {
      throw new Error("No active packages found");
    }

    const packageToUse = activePackages[0];
    const packageIndex = packages.findIndex(pkg => pkg.id === packageToUse.id);

    // Deduct 1 session from package
    packages[packageIndex].remaining -= 1;

    // Update balance
    const updatedBalance = {
      available: balance.available - 1,
      purchased: balance.purchased,
      used: balance.used + 1,
      expired: balance.expired,
      lastUpdated: admin.firestore.Timestamp.now(),
    };

    // Create session record
    const sessionData = {
      clientId: userId,
      clientName: userData.name || "",
      clientEmail: userData.email || "",
      trainerId: process.env.TRAINER_ID || "admin", // TODO: Get from config
      packageId: packageToUse.id,
      calendlyEventId: calendlyEventId,
      calendlyEventUri: eventDetails.eventUri,
      scheduledDate: eventDetails.scheduledDate,
      duration: eventDetails.duration,
      status: "scheduled",
      creditReturned: false,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    const sessionRef = db.collection("sessions").doc();
    transaction.set(sessionRef, sessionData);

    // Update user with modified packages and balance
    transaction.update(userRef, {
      sessionPackages: packages,
      sessionBalance: updatedBalance,
    });

    console.log(`Session scheduled for user ${userId}, deducted from package ${packageToUse.id}`);
  });
}

/**
 * Expire Session Packages (Scheduled Function)
 * Runs daily at 2 AM UTC to check and expire packages
 */
exports.expireSessionPackages = onSchedule({
  schedule: "0 2 * * *", // Daily at 2 AM UTC
  region: sharedConfig.region,
  timeZone: "UTC",
}, async () => {
  const now = admin.firestore.Timestamp.now();
  let packagesExpired = 0;
  let sessionsExpired = 0;

  try {
    // Query all users with session packages
    const usersSnapshot = await db.collection("users")
      .where("sessionBalance.available", ">", 0)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const packages = userData.sessionPackages || [];
      let modified = false;

      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        
        // Check if package is expired
        if (!pkg.expired && pkg.remaining > 0 && pkg.expirationDate.toMillis() < now.toMillis()) {
          packages[i].expired = true;
          sessionsExpired += pkg.remaining;
          packagesExpired++;
          modified = true;
        }
      }

      if (modified) {
        // Recalculate balance
        const activePackages = packages.filter(pkg => !pkg.expired);
        const available = activePackages.reduce((sum, pkg) => sum + pkg.remaining, 0);
        const expiredCount = packages.filter(pkg => pkg.expired).reduce((sum, pkg) => sum + pkg.remaining, 0);

        const updatedBalance = {
          ...userData.sessionBalance,
          available: available,
          expired: expiredCount,
          lastUpdated: now,
        };

        await db.collection("users").doc(userId).update({
          sessionPackages: packages,
          sessionBalance: updatedBalance,
        });

        console.log(`Expired packages for user ${userId}`);
        // TODO: Send expiration notification email
      }
    }

    console.log(`Expiration job completed: ${packagesExpired} packages expired, ${sessionsExpired} sessions lost`);
  } catch (error) {
    console.error("Error in expiration job:", error);
  }
});

/**
 * Cancel Session
 * Allows clients or trainers to cancel sessions
 */
exports.cancelSession = onCall({
  region: sharedConfig.region,
  cors: true,
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { sessionId, reason } = request.data;
  const userId = request.auth.uid;

  try {
    const sessionRef = db.collection("sessions").doc(sessionId);
    
    await db.runTransaction(async (transaction) => {
      const sessionDoc = await transaction.get(sessionRef);
      
      if (!sessionDoc.exists) {
        throw new HttpsError("not-found", "Session not found");
      }

      const sessionData = sessionDoc.data();
      
      // Verify user can cancel (client or trainer)
      const userDoc = await transaction.get(db.collection("users").doc(userId));
      const userData = userDoc.data();
      const isTrainer = userData.role === "trainer" || userData.role === "admin";
      const isClient = userId === sessionData.clientId;
      
      if (!isTrainer && !isClient) {
        throw new HttpsError("permission-denied", "Not authorized to cancel this session");
      }

      // Check if already canceled or completed
      if (sessionData.status !== "scheduled") {
        throw new HttpsError("failed-precondition", "Session cannot be canceled");
      }

      // Check cancellation window (24 hours before)
      const now = admin.firestore.Timestamp.now();
      const hoursUntilSession = (sessionData.scheduledDate.toMillis() - now.toMillis()) / (1000 * 60 * 60);
      
      const creditReturned = hoursUntilSession > 24 || isTrainer;
      const canceledBy = isTrainer ? "trainer" : "client";

      // Update session
      transaction.update(sessionRef, {
        status: "canceled",
        canceledBy: canceledBy,
        canceledAt: now,
        cancelReason: reason || "",
        creditReturned: creditReturned,
        updatedAt: now,
      });

      // If credit returned, add back to package
      if (creditReturned) {
        const clientRef = db.collection("users").doc(sessionData.clientId);
        const clientDoc = await transaction.get(clientRef);
        const clientData = clientDoc.data();
        
        const packages = clientData.sessionPackages || [];
        const packageIndex = packages.findIndex(pkg => pkg.id === sessionData.packageId);
        
        if (packageIndex >= 0) {
          packages[packageIndex].remaining += 1;
          
          const balance = clientData.sessionBalance || {};
          const updatedBalance = {
            ...balance,
            available: balance.available + 1,
            used: balance.used - 1,
            lastUpdated: now,
          };
          
          transaction.update(clientRef, {
            sessionPackages: packages,
            sessionBalance: updatedBalance,
          });
        }
      }
    });

    return {
      success: true,
      creditReturned: creditReturned,
    };
  } catch (error) {
    console.error("Error canceling session:", error);
    throw new HttpsError("internal", "Failed to cancel session");
  }
});
