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
const { isEligibleForCheckins } = require("./product-config");

const db = admin.firestore();

// Activity Feed helper
const { writeActivityEvent, getClientInfoForActivityFeed } = require("./activity-feed");

// Define secrets
const stripeKey = defineSecret("STRIPE_KEY");
const calendlyPat = defineSecret("CALENDLY_PAT");

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
 * Resolve Location from Calendly
 * Determines locationId and locationType based on Calendly location string
 */
async function resolveLocation(locationString, userId) {
  // Normalize location string
  const location = (locationString || "").trim();
  
  console.log(`Resolving location: "${location}" for user ${userId}`);
  
  // Only process if location is non-empty
  if (location) {
    // Case 1: Private location (client's address)
    if (location.toLowerCase().includes("address specified in my profile") || 
        location.toLowerCase().includes("use my address")) {
      
      // Check if user has address set in profile
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();
      
      if (userData?.address) {
        console.log(`Using private address for user ${userId}`);
        return {
          locationId: "private",
          locationType: "private"
        };
      }
      // If no address set, will fall through to default location (Case 3)
      console.warn(`User ${userId} selected private location but no address set, defaulting`);
      
    } else {
      // Case 2: Match against public trainer locations
      const locationsSnapshot = await db.collection("training_locations")
        .where("isActive", "==", true)
        .get();
      
      const locationLower = location.toLowerCase();
      
      // Try to match location name (bi-directional partial match)
      for (const locationDoc of locationsSnapshot.docs) {
        const locationData = locationDoc.data();
        const nameLower = locationData.name.toLowerCase();
        const displayNameLower = locationData.displayName.toLowerCase();
        
        // Check if location contains name OR name contains location
        if (locationLower.includes(nameLower) || 
            nameLower.includes(locationLower) ||
            locationLower.includes(displayNameLower) ||
            displayNameLower.includes(locationLower)) {
          
          console.log(`Matched location: ${locationData.displayName} (${locationDoc.id})`);
          return {
            locationId: locationDoc.id,
            locationType: "public"
          };
        }
      }
    }
  }
  
  // Case 3: Default fallback (empty location OR no match found)
  console.log("Using default location");
  const defaultLocationSnapshot = await db.collection("training_locations")
    .where("isDefault", "==", true)
    .limit(1)
    .get();
  
  if (defaultLocationSnapshot.empty) {
    throw new Error("No default location configured");
  }
  
  const defaultLocation = defaultLocationSnapshot.docs[0];
  return {
    locationId: defaultLocation.id,
    locationType: "public"
  };
}

/**
 * Handle Calendly Cancellation
 * Called when invitee.canceled webhook is received
 * This happens when user reschedules (cancel + new booking) or manually cancels
 */
async function handleCalendlyCancellation(calendlyEventId) {
  console.log(`Looking for session with Calendly event ID: ${calendlyEventId}`);
  
  // Find the session
  const sessionsSnapshot = await db.collection("sessions")
    .where("calendlyEventId", "==", calendlyEventId)
    .where("status", "==", "scheduled")
    .limit(1)
    .get();
  
  if (sessionsSnapshot.empty) {
    console.log(`No scheduled session found for Calendly event: ${calendlyEventId}`);
    console.log(`This could be a race condition (cancel before create finished) or orphaned cancellation (test booking).`);
    console.log(`Returning gracefully to prevent webhook retry spam.`);
    // Don't throw error - this prevents webhook from being disabled due to:
    // 1. Race conditions (user cancels immediately after booking)
    // 2. Orphaned cancellations (test bookings, deleted sessions, failed creations)
    return; // Return gracefully instead of throwing
  }
  
  const sessionDoc = sessionsSnapshot.docs[0];
  const sessionData = sessionDoc.data();
  const sessionRef = db.collection("sessions").doc(sessionDoc.id);
  
  console.log(`Found session ${sessionDoc.id} for user ${sessionData.clientId}`);
  
  // Mark as canceled (this is from Calendly, so return credit automatically)
  const now = admin.firestore.Timestamp.now();
  
  await db.runTransaction(async (transaction) => {
    // IDEMPOTENCY GUARD: Re-read session inside transaction to check current status.
    // This prevents double credit return when cancelSession() Cloud Function
    // and this webhook handler race against each other.
    const freshSessionDoc = await transaction.get(sessionRef);
    const freshSessionData = freshSessionDoc.data();
    
    if (freshSessionData.status !== "scheduled") {
      console.log(`Session ${sessionDoc.id} already has status "${freshSessionData.status}" — skipping webhook credit return (likely already handled by cancelSession Cloud Function)`);
      return;
    }
    
    // For training sessions, return credit
    if (freshSessionData.sessionType === "training" && freshSessionData.packageId) {
      const clientRef = db.collection("users").doc(freshSessionData.clientId);
      const clientDoc = await transaction.get(clientRef);
      const clientData = clientDoc.data();
      
      const packages = clientData.sessionPackages || [];
      const packageIndex = packages.findIndex(pkg => pkg.id === freshSessionData.packageId);
      
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
        
        console.log(`Returned credit for canceled training session`);
      }
    }
    
    // Update session status
    transaction.update(sessionRef, {
      status: "canceled",
      canceledBy: "client",
      canceledAt: now,
      cancelReason: "Rescheduled or canceled via Calendly",
      creditReturned: freshSessionData.sessionType === "training", // Check-ins have no credit
      updatedAt: now,
    });
  });
  
  console.log(`Session ${sessionDoc.id} marked as canceled`);
}

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

      // Extract cancel and reschedule URLs (optional, may not always be present)
      const cancelUrl = payload.cancel_url || null;
      const rescheduleUrl = payload.reschedule_url || null;

      console.log(`Processing booking for ${inviteeEmail} (${inviteeName})`);
      if (cancelUrl) console.log(`Cancel URL: ${cancelUrl}`);
      if (rescheduleUrl) console.log(`Reschedule URL: ${rescheduleUrl}`);

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

      // SMART ROUTING: Detect event type from URL and name
      const eventUri = scheduledEvent.uri || "";
      const eventTypeUri = payload.event_type?.uri || "";
      const eventName = (scheduledEvent.name || "").toLowerCase();
      
      const isOnboarding = eventUri.includes('30-min-onboarding-consultation') || 
                          eventTypeUri.includes('30-min-onboarding-consultation') ||
                          eventName.includes('onboarding');
      
      const isCheckin = eventUri.includes('weekly-checkin') || 
                        eventTypeUri.includes('weekly-checkin') ||
                        eventName.includes('check-in') ||
                        eventName.includes('checkin');

      if (isOnboarding) {
        // Handle as ONBOARDING CONSULTATION (no credit, one-time setup)
        console.log(`Routing to onboarding consultation handler for user ${userId}`);
        await scheduleOnboardingConsultation({
          userId,
          calendlyEventId,
          eventDetails: {
            scheduledDate,
            duration,
            eventUri: scheduledEvent.uri,
          },
          calendlyUrls: {
            cancelUrl,
            rescheduleUrl,
          },
          userData,
        });
        console.log(`Successfully scheduled onboarding consultation for user ${userId}`);
      } else if (isCheckin) {
        // Handle as CHECK-IN (subscription-based, no credit deduction)
        console.log(`Routing to check-in handler for user ${userId}`);
        await scheduleCheckin({
          userId,
          calendlyEventId,
          eventDetails: {
            scheduledDate,
            duration,
            eventUri: scheduledEvent.uri,
          },
          calendlyUrls: {
            cancelUrl,
            rescheduleUrl,
          },
          userData,
        });
        console.log(`Successfully scheduled check-in for user ${userId}`);
      } else {
        // Handle as TRAINING SESSION (deducts credit from package)
        console.log(`Routing to training session handler for user ${userId}`);
        
        // Extract location from Calendly event
        // Calendly sends location as an object: { location: "address string", type: "physical" }
        const locationString = scheduledEvent.location?.location || "";
        
        // Resolve location (public trainer location or private client address)
        const locationInfo = await resolveLocation(locationString, userId);

        // Schedule the session
        await scheduleSession({
          userId,
          calendlyEventId,
          eventDetails: {
            scheduledDate,
            duration,
            eventUri: scheduledEvent.uri,
          },
          calendlyUrls: {
            cancelUrl,
            rescheduleUrl,
          },
          locationInfo,
          userData,
        });
        console.log(`Successfully scheduled training session for user ${userId}`);
      }

      res.json({ success: true });
    } else if (webhookEvent.event === "invitee.canceled") {
      // Handle cancellation (triggered by reschedule or manual cancel)
      const payload = webhookEvent.payload;
      const scheduledEvent = payload.scheduled_event;
      
      if (!scheduledEvent) {
        console.error("Missing scheduled_event in cancel payload");
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      const calendlyEventId = scheduledEvent.uri.split('/').pop();
      console.log(`Processing cancellation for Calendly event: ${calendlyEventId}`);

      // Find and cancel the session
      await handleCalendlyCancellation(calendlyEventId);
      
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
async function scheduleSession({ userId, calendlyEventId, eventDetails, calendlyUrls, locationInfo, userData }) {
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
    
    // Validate session is not scheduled past package expiration
    if (eventDetails.scheduledDate.toMillis() > packageToUse.expirationDate.toMillis()) {
      throw new Error(
        `Cannot schedule session past package expiration date (${packageToUse.expirationDate.toDate().toLocaleDateString()})`
      );
    }
    
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
      cancelUrl: calendlyUrls?.cancelUrl || null,
      rescheduleUrl: calendlyUrls?.rescheduleUrl || null,
      scheduledDate: eventDetails.scheduledDate,
      duration: eventDetails.duration,
      locationId: locationInfo.locationId, // "private" or training_locations doc ID
      locationType: locationInfo.locationType, // "public" or "private"
      status: "scheduled",
      sessionType: "training",
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

    console.log(`Session scheduled for user ${userId}, location: ${locationInfo.locationType}, deducted from package ${packageToUse.id}`);
  });

  // ACTIVITY FEED: Write session_scheduled event
  const sessionDateStr = eventDetails.scheduledDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  writeActivityEvent({
    type: 'session_scheduled',
    clientId: userId,
    clientName: userData.name || 'Client',
    trainerId: userData.assignedTrainerId || '',
    message: `${userData.name || 'Client'} scheduled training session for ${sessionDateStr}`,
    metadata: {
      sessionDate: eventDetails.scheduledDate.toDate().toISOString(),
      sessionType: 'training',
    },
  }).catch(err => {
    console.warn("[ActivityFeed] Failed to write session_scheduled event", { userId, error: err.message });
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
 * Calculate week identifier (Sunday-start weeks)
 * Matches frontend checkin-api.ts logic exactly
 * Format: "YYYY-MM-DD" (the Sunday that starts the week)
 * Example: Any date in the week Dec 28 - Jan 3 returns "2025-12-28"
 */
function getWeekIdentifier(date) {
  // Clone to avoid mutating original
  const d = new Date(date);
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = d.getDay();
  
  // Subtract days to get to the most recent Sunday (or current day if Sunday)
  d.setDate(d.getDate() - dayOfWeek);
  
  // Return Sunday's date as YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * REMOVED: validateOnePerWeek function
 * 
 * The "one check-in per week" restriction has been removed in favor of
 * a counter-based approach (max 2 active check-ins at a time).
 * 
 * The frontend widget handles this limit by checking active session count.
 */

/**
 * Schedule Check-in Session
 * Creates a check-in session (no credit deduction, subscription-based access)
 */
async function scheduleCheckin({ userId, calendlyEventId, eventDetails, calendlyUrls, userData }) {
  // Validate eligibility using Stripe product IDs
  const isEligible = isEligibleForCheckins(userData.tier);
  
  if (!isEligible) {
    throw new Error('User not eligible for check-ins');
  }
  
  // Counter-based validation handled by frontend (max 2 active check-ins)
  // No server-side "one per week" restriction
  
  // Create check-in session
  const sessionData = {
    // Shared base fields
    clientId: userId,
    clientName: userData.name || "",
    clientEmail: userData.email || "",
    trainerId: process.env.TRAINER_ID || "admin",
    calendlyEventId,
    calendlyEventUri: eventDetails.eventUri,
    cancelUrl: calendlyUrls?.cancelUrl || null,
    rescheduleUrl: calendlyUrls?.rescheduleUrl || null,
    scheduledDate: eventDetails.scheduledDate,
    duration: eventDetails.duration,
    status: "scheduled",
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    
    // Check-in specific
    sessionType: "checkin",
    weekIdentifier: getWeekIdentifier(eventDetails.scheduledDate.toDate()),
  };
  
  await db.collection("sessions").doc().set(sessionData);
  console.log(`Check-in scheduled: ${userId}, week: ${sessionData.weekIdentifier}`);

  // ACTIVITY FEED: Write checkin_scheduled event
  const checkinDateStr = eventDetails.scheduledDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  writeActivityEvent({
    type: 'checkin_scheduled',
    clientId: userId,
    clientName: userData.name || 'Client',
    trainerId: userData.assignedTrainerId || '',
    message: `${userData.name || 'Client'} scheduled weekly check-in for ${checkinDateStr}`,
    metadata: {
      checkinDate: eventDetails.scheduledDate.toDate().toISOString(),
    },
  }).catch(err => {
    console.warn("[ActivityFeed] Failed to write checkin_scheduled event", { userId, error: err.message });
  });
}

/**
 * Schedule Onboarding Consultation
 * Creates an onboarding consultation session (one-time, no credit)
 * Also marks milestone #1 in setup goal as complete
 */
async function scheduleOnboardingConsultation({ userId, calendlyEventId, eventDetails, calendlyUrls, userData }) {
  const now = admin.firestore.Timestamp.now();
  
  // Create consultation session
  const sessionData = {
    clientId: userId,
    clientName: userData.name || "",
    clientEmail: userData.email || "",
    trainerId: process.env.TRAINER_ID || "admin",
    calendlyEventId,
    calendlyEventUri: eventDetails.eventUri,
    cancelUrl: calendlyUrls?.cancelUrl || null,
    rescheduleUrl: calendlyUrls?.rescheduleUrl || null,
    scheduledDate: eventDetails.scheduledDate,
    duration: eventDetails.duration,
    status: "scheduled",
    sessionType: "onboarding",
    createdAt: now,
    updatedAt: now,
  };
  
  // Create session and update setup goal in transaction
  await db.runTransaction(async (transaction) => {
    // IMPORTANT: All reads MUST happen before any writes in Firestore transactions
    
    // Read setup goal first
    const setupGoalRef = db.collection("goals").doc(`${userId}_setup`);
    const setupGoalDoc = await transaction.get(setupGoalRef);
    
    // Now do all writes
    // Create session
    const sessionRef = db.collection("sessions").doc();
    transaction.set(sessionRef, sessionData);
    
    if (setupGoalDoc.exists) {
      const goalData = setupGoalDoc.data();
      const milestones = goalData.milestones || [];
      
      // Mark milestone #1 (index 0) as completed
      if (milestones.length > 0 && !milestones[0].completed) {
        milestones[0] = {
          ...milestones[0],
          completed: true,
          completedAt: now,
          updatedAt: now,
        };
        
        transaction.update(setupGoalRef, {
          milestones: milestones,
          updatedAt: now,
        });
        
        console.log(`Marked setup goal milestone #1 as complete for user ${userId}`);
      }
    } else {
      console.warn(`Setup goal not found for user ${userId} - milestone not updated`);
    }
  });
  
  console.log(`Onboarding consultation scheduled: ${userId}`);
}


/**
 * Cancel Session
 * Allows clients or trainers to cancel sessions
 * 
 * Features:
 * - Cancels session in Calendly (sends email notifications)
 * - Updates session status in Firestore
 * - Returns credit if >24 hours notice
 * - Tracks cancellation statistics
 * - Creates in-app notification
 */
exports.cancelSession = onCall({
  region: sharedConfig.region,
  cors: true,
  secrets: [calendlyPat],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { sessionId, reason } = request.data;
  const userId = request.auth.uid;

  try {
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();
    
    if (!sessionDoc.exists) {
      throw new HttpsError("not-found", "Session not found");
    }

    const sessionData = sessionDoc.data();
    
    // Verify user can cancel (client or trainer)
    // Check all possible collections (users, trainers, admins)
    let userData = null;
    let userDoc;
    
    // Try users collection first (most common - clients)
    userDoc = await db.collection("users").doc(userId).get();
    if (userDoc.exists) {
      userData = userDoc.data();
    }
    
    // Try trainers collection if not found
    if (!userData) {
      userDoc = await db.collection("trainers").doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    }
    
    // Try admins collection if still not found
    if (!userData) {
      userDoc = await db.collection("admins").doc(userId).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    }
    
    // If still not found, throw error
    if (!userData) {
      throw new HttpsError("not-found", "User not found in any collection");
    }
    
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
    
    // Check-ins never return credit (they're subscription-based, not credit-based)
    const creditReturned = sessionData.sessionType === 'checkin' 
      ? false 
      : (hoursUntilSession > 24 || isTrainer);
    const canceledBy = isTrainer ? "trainer" : "client";

    // 1. Cancel in Calendly (sends email notifications to both parties)
    try {
      console.log(`Canceling Calendly event: ${sessionData.calendlyEventId}`);
      
      const calendlyResponse = await fetch(
        `https://api.calendly.com/scheduled_events/${sessionData.calendlyEventId}/cancellation`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${calendlyPat.value()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: reason || "Session canceled"
          })
        }
      );

      console.log(`Calendly API response: ${calendlyResponse.status}`);

      if (!calendlyResponse.ok) {
        const errorText = await calendlyResponse.text();
        console.error(`Calendly cancellation failed: ${calendlyResponse.status} - ${errorText}`);
        // Continue anyway - Firestore update is more important
      } else {
        console.log("Successfully canceled in Calendly");
      }
    } catch (calendlyError) {
      console.error("Error calling Calendly API:", calendlyError.message);
      // Continue - local cancellation is still valid
    }

    // 2. Update session and user data in transaction
    await db.runTransaction(async (transaction) => {
      // IMPORTANT: All reads must happen BEFORE any writes in Firestore transactions
      
      // Read client data first
      const clientRef = db.collection("users").doc(sessionData.clientId);
      const clientDoc = await transaction.get(clientRef);
      const clientData = clientDoc.data();

      // Now do all writes
      // Update session status
      transaction.update(sessionRef, {
        status: "canceled",
        canceledBy: canceledBy,
        canceledAt: now,
        cancelReason: reason || "",
        creditReturned: creditReturned,
        updatedAt: now,
      });
      
      // Return credit if applicable
      if (creditReturned) {
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

      // Update cancellation statistics
      const stats = clientData.sessionStats || {};
      const updatedStats = {
        totalBooked: stats.totalBooked || 0,
        totalCompleted: stats.totalCompleted || 0,
        totalCanceled: (stats.totalCanceled || 0) + 1,
        canceledWithCredit: (stats.canceledWithCredit || 0) + (creditReturned ? 1 : 0),
        canceledNoCredit: (stats.canceledNoCredit || 0) + (creditReturned ? 0 : 1),
        lastCanceled: now,
      };

      transaction.update(clientRef, {
        sessionStats: updatedStats,
      });

      // 3. Create in-app notification
      const notificationRef = db.collection("notifications").doc();
      transaction.set(notificationRef, {
        userId: sessionData.clientId,
        type: "session_canceled",
        title: "Session Canceled",
        message: creditReturned 
          ? "Your session has been canceled and the credit has been returned to your balance."
          : "Your session has been canceled. No credit returned (less than 24 hours notice).",
        data: {
          sessionId: sessionId,
          scheduledDate: sessionData.scheduledDate,
          creditReturned: creditReturned,
        },
        read: false,
        createdAt: now,
      });
    });

    console.log(`Session ${sessionId} canceled by ${canceledBy}, credit returned: ${creditReturned}`);

    // ACTIVITY FEED: Write session_canceled event
    getClientInfoForActivityFeed(sessionData.clientId).then(clientInfo => {
      const sessionDateStr = sessionData.scheduledDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      writeActivityEvent({
        type: 'session_canceled',
        clientId: sessionData.clientId,
        clientName: clientInfo.clientName,
        trainerId: clientInfo.trainerId,
        message: `${clientInfo.clientName} canceled ${sessionData.sessionType || 'training'} session on ${sessionDateStr}`,
        metadata: {
          sessionId: sessionId,
          sessionDate: sessionData.scheduledDate.toDate().toISOString(),
          cancelReason: reason || '',
        },
      }).catch(err => {
        console.warn("[ActivityFeed] Failed to write session_canceled event", { sessionId, error: err.message });
      });
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
