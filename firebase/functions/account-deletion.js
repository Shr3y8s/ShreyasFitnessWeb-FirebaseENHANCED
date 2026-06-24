/**
 * Account deletion — shared, provider-NEUTRAL implementation.
 *
 * `performAccountDeletion(params)` is the single source of truth for all three
 * deletion modes. It is reused by:
 *   - the `deleteAccount` callable in ../index.js (admin UI), and
 *   - the `bulk-delete-test-accounts.js` maintenance script.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️  DRIFT GUARD — READ THIS BEFORE ADDING A FEATURE
 * Every piece of client-owned data lives in ONE place: `CLIENT_DATA_REGISTRY`
 * below. All three modes (mock / no-traces / gdpr-clean) AND the orphan scan
 * (`scanClientData`) iterate that same list. When you add a feature that writes
 * client-owned data to a NEW collection / subcollection / storage prefix, add a
 * single registry entry — it then flows into discovery, deletion, GDPR handling,
 * and the verification scan automatically. Do NOT hand-add per-mode delete code.
 * (Provider/billing/auth steps that aren't simple wipes stay bespoke — see below.)
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Modes:
 *   - mock        → discovery only; no writes. Returns an inventory of everything
 *                   that WOULD be deleted (registry + billing/auth footprint).
 *   - no-traces   → wipe everything incl. financial records; cancel any active
 *                   subscription (provider seam, fail-soft); delete Auth + user doc.
 *   - gdpr-clean  → remove PII, anonymize + preserve financial/business records,
 *                   set gdprDeleted:true, delete Auth. Optionally refund session
 *                   credits. Blocks on upcoming sessions unless adminOverride.
 *
 * PROVIDER NOTE: PayPal is the live processor. There are no live Stripe
 * subscriptions/charges — only legacy Stripe *Firestore* docs (stripe_customers),
 * deleted as plain Firestore documents. This module imports ZERO Stripe SDK.
 * Subscription cancel + credit refunds go through the provider seam
 * (../payments → PROVIDERS[provider]) resolved from the client's stored provider
 * (never assumed); operations are treated as optional capabilities + fail-soft.
 */

const admin = require("firebase-admin");
const { logger } = require("firebase-functions");
const crypto = require("crypto");

const { MAX_CLIENT_REFUND_CREDITS } = require("./product-config");
const {
  PROVIDERS,
  paypalEnvConfig,
  normalizePaypalEnv,
} = require("./payments");

// ============================================================================
// CLIENT DATA REGISTRY — the single source of truth for client-owned data.
//
// `kind`:
//   - "storagePrefix" : Cloud Storage objects under `path` (templated with {uid}).
//   - "query"         : top-level collection docs where `field` == uid.
//   - "docId"         : a single doc whose id IS the uid, in `collection`.
//   - "docIdPrefix"   : docs in `collection` whose id starts with "{uid}" (e.g.
//                       dailyActivities uses composite ids `{uid}_{date}`).
//   - "subcollection" : a subcollection `sub` under parent doc `parent` (templated).
//
// `noTraces`: "delete" | "skip"  — behavior in no-traces mode.
// `gdpr`:     "delete" | "preserve" — behavior in gdpr-clean mode. PII → delete;
//             business/financial records → preserve.
// `excludeValues` (optional): doc field values that must NEVER be matched even if
//             they equal a query result (e.g. broadcast sentinel clientId:"all").
//
// ORDER MATTERS for parent/child: list subcollections BEFORE their parent doc.
// ============================================================================
const CLIENT_DATA_REGISTRY = [
  // ---- Storage (PII) ----
  {name: "Progress Photos (Storage)", kind: "storagePrefix", path: "progressPhotos/{uid}/", noTraces: "delete", gdpr: "delete"},
  {name: "Nutrition Screenshots (Storage)", kind: "storagePrefix", path: "nutritionScreenshots/{uid}/", noTraces: "delete", gdpr: "delete"},
  {name: "Profile Photos (Storage)", kind: "storagePrefix", path: "profile-photos/{uid}/", noTraces: "delete", gdpr: "delete"},

  // ---- Activity logs (subcollection on the user doc) ----
  {name: "Activity Logs", kind: "subcollection", parent: "users/{uid}", sub: "activities", noTraces: "delete", gdpr: "preserve"},

  // ---- Training / business records (preserved under GDPR) ----
  {name: "Workouts", kind: "query", collection: "workouts", field: "clientId", noTraces: "delete", gdpr: "preserve"},
  {name: "Client Plans", kind: "query", collection: "clientPlans", field: "clientId", noTraces: "delete", gdpr: "preserve"},
  {name: "Client Stats", kind: "docId", collection: "clientStats", noTraces: "delete", gdpr: "preserve"},
  {name: "Goals", kind: "query", collection: "goals", field: "clientId", noTraces: "delete", gdpr: "preserve"},
  // sessions docs are keyed by clientId (writer sets clientId:userId; client reads
  // where clientId == uid). NOT userId — that field doesn't exist on session docs.
  {name: "Sessions", kind: "query", collection: "sessions", field: "clientId", noTraces: "delete", gdpr: "preserve"},

  {name: "Daily Activities", kind: "docIdPrefix", collection: "dailyActivities", noTraces: "delete", gdpr: "preserve"},

  // ---- Communications / PII ----
  // client_messages docs are keyed by senderId/recipientId (NO clientId field), so
  // match BOTH and union — covers messages where the user is sender OR recipient.
  {name: "Client Messages", kind: "queryOr", collection: "client_messages", fields: ["senderId", "recipientId"], noTraces: "delete", gdpr: "delete"},

  {name: "Notifications", kind: "query", collection: "notifications", field: "userId", noTraces: "delete", gdpr: "preserve"},
  {name: "Progress Photos Metadata", kind: "query", collection: "progressPhotos", field: "userId", noTraces: "delete", gdpr: "delete"},
  {name: "Login History", kind: "query", collection: "login_history", field: "userId", noTraces: "delete", gdpr: "delete"},

  // ---- Client notifications / tasks / reminders (newer features) ----
  // Reminders/tasks can be broadcast with clientId:"all" — never match that.
  {name: "Client Notifications", kind: "query", collection: "clientNotifications", field: "clientId", noTraces: "delete", gdpr: "delete", excludeValues: ["all"]},
  {name: "Client Tasks", kind: "query", collection: "clientTasks", field: "clientId", noTraces: "delete", gdpr: "delete", excludeValues: ["all"]},
  {name: "Client Reminders", kind: "query", collection: "clientReminders", field: "clientId", noTraces: "delete", gdpr: "delete", excludeValues: ["all"]},

  // ---- Weekly surveys (subcollection + parent doc) ----
  {name: "Weekly Surveys (responses)", kind: "subcollection", parent: "weeklySurveys/{uid}", sub: "responses", noTraces: "delete", gdpr: "delete"},
  {name: "Weekly Surveys Parent Doc", kind: "docId", collection: "weeklySurveys", noTraces: "delete", gdpr: "delete"},

  // ---- Nutrition logs (all approach subcollections + coach notes + parent doc) ----
  {name: "Nutrition Logs (mealPlans)", kind: "subcollection", parent: "nutritionLogs/{uid}", sub: "mealPlans", noTraces: "delete", gdpr: "delete"},
  {name: "Nutrition Logs (meals)", kind: "subcollection", parent: "nutritionLogs/{uid}", sub: "meals", noTraces: "delete", gdpr: "delete"},
  {name: "Nutrition Logs (habits)", kind: "subcollection", parent: "nutritionLogs/{uid}", sub: "habits", noTraces: "delete", gdpr: "delete"},
  {name: "Nutrition Logs (coachNotes)", kind: "subcollection", parent: "nutritionLogs/{uid}", sub: "coachNotes", noTraces: "delete", gdpr: "delete"},
  {name: "Nutrition Logs Parent Doc", kind: "docId", collection: "nutritionLogs", noTraces: "delete", gdpr: "delete"},

  // ---- Session packages subcollection (read-only/vestigial; safe no-op) ----
  // Live session packages are an ARRAY on the user doc (deleted with the user doc
  // in no-traces). This covers any legacy/edge subcollection writes.
  {name: "Session Packages (subcollection)", kind: "subcollection", parent: "users/{uid}", sub: "sessionPackages", noTraces: "delete", gdpr: "preserve"},
];

// ============================================================================
// Registry executors (shared by mock, no-traces, gdpr-clean, and the scan).
// ============================================================================

/** Replace `{uid}` in a path/template. */
function tpl(s, uid) {
  return String(s).replace(/\{uid\}/g, uid);
}

/** A short human-readable location string for a registry entry (for inventory). */
function describeEntry(entry, uid) {
  switch (entry.kind) {
    case "storagePrefix": return `storage:${tpl(entry.path, uid)}`;
    case "query": return `${entry.collection} where ${entry.field} == ${uid}`;
    case "queryOr": return `${entry.collection} where (${entry.fields.join(" | ")}) == ${uid}`;
    case "docId": return `${entry.collection}/${uid}`;

    case "docIdPrefix": return `${entry.collection} (docId starts-with ${uid})`;
    case "subcollection": return `${tpl(entry.parent, uid)}/${entry.sub}`;
    default: return entry.name;
  }
}

/** Build the Firestore query/ref snapshot for a registry entry (Firestore kinds). */
async function snapshotForEntry(entry, uid) {
  const db = admin.firestore();
  switch (entry.kind) {
    case "query":
      return db.collection(entry.collection).where(entry.field, "==", uid).get();
    case "docIdPrefix":
      return db.collection(entry.collection)
          .where(admin.firestore.FieldPath.documentId(), ">=", uid)
          .where(admin.firestore.FieldPath.documentId(), "<", uid + "\uf8ff")
          .get();
    case "subcollection":
      return db.doc(tpl(entry.parent, uid)).collection(entry.sub).get();
    default:
      return null;
  }
}

/**
 * For a "queryOr" entry: run one `where(field == uid)` query per field, union the
 * results by doc id (a doc matching multiple fields appears once). Returns an array
 * of Firestore doc snapshots.
 */
async function queryOrDocs(entry, uid) {
  const db = admin.firestore();
  const byId = new Map();
  for (const field of entry.fields) {
    const snap = await db.collection(entry.collection).where(field, "==", uid).get();
    for (const d of snap.docs) byId.set(d.id, d);
  }
  return Array.from(byId.values());
}

/** Count items for a registry entry without modifying anything (mock/scan). */
async function countEntry(entry, uid) {
  if (entry.kind === "storagePrefix") {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({prefix: tpl(entry.path, uid)});
    return {count: files.length, sample: files.slice(0, 5).map((f) => f.name)};
  }
  if (entry.kind === "docId") {
    const snap = await admin.firestore().collection(entry.collection).doc(uid).get();
    return {count: snap.exists ? 1 : 0, sample: snap.exists ? [uid] : []};
  }
  if (entry.kind === "queryOr") {
    const docs = (await queryOrDocs(entry, uid)).filter((d) => !isExcluded(entry, d));
    return {count: docs.length, sample: docs.slice(0, 5).map((d) => d.id)};
  }
  // query | docIdPrefix | subcollection
  const snapshot = await snapshotForEntry(entry, uid);
  const docs = (snapshot.docs || []).filter((d) => !isExcluded(entry, d));
  return {count: docs.length, sample: docs.slice(0, 5).map((d) => d.id)};
}


/** Whether a doc should be excluded (e.g. broadcast sentinel). */
function isExcluded(entry, doc) {
  if (!entry.excludeValues || !entry.field) return false;
  const v = doc.get ? doc.get(entry.field) : (doc.data() || {})[entry.field];
  return entry.excludeValues.includes(v);
}

/** Delete every Firestore doc in `docs`, chunked to respect the 500-write batch limit. */
async function deleteDocsChunked(docs) {
  const db = admin.firestore();
  let deleted = 0;
  for (let i = 0; i < docs.length; i += 400) {
    const chunk = docs.slice(i, i + 400);
    const batch = db.batch();
    chunk.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

/** Delete all data for a registry entry. Returns the number of items removed. */
async function deleteEntry(entry, uid) {
  if (entry.kind === "storagePrefix") {
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles({prefix: tpl(entry.path, uid)});
    for (const file of files) {
      await file.delete();
    }
    return files.length;
  }
  if (entry.kind === "docId") {
    const ref = admin.firestore().collection(entry.collection).doc(uid);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      return 1;
    }
    return 0;
  }
  if (entry.kind === "queryOr") {
    const docs = (await queryOrDocs(entry, uid)).filter((d) => !isExcluded(entry, d));
    return deleteDocsChunked(docs);
  }
  // query | docIdPrefix | subcollection
  const snapshot = await snapshotForEntry(entry, uid);
  const docs = (snapshot.docs || []).filter((d) => !isExcluded(entry, d));
  return deleteDocsChunked(docs);
}


// ============================================================================
// Provider seam helpers (resolve adapter + cfg from the client's stored provider)
// ============================================================================

/**
 * Resolve the PayPal cfg for the deletion path. The admin UI / script may pass an
 * explicit `paypalEnv`; otherwise fall back to NEXT_PUBLIC_PAYPAL_ENV, then default
 * to "production". Reads credentials from env/Secret Manager — when those aren't
 * bound (e.g. a script run without PayPal secrets) the cfg fields are undefined and
 * the fail-soft try/catch around each call no-ops.
 */
function resolvePaypalCfg(paypalEnv) {
  const env = normalizePaypalEnv(paypalEnv || process.env.NEXT_PUBLIC_PAYPAL_ENV || "production");
  return paypalEnvConfig(env);
}

/**
 * Resolve the payment-provider ADAPTER + its call context (cfg) for a stored
 * provider name (read from billing_customers / the subscription / the package —
 * never assumed). Returns { provider, adapter, cfg }. Provider operations are
 * OPTIONAL CAPABILITIES: callers guard on `typeof adapter?.<op> === "function"`,
 * so a provider whose adapter lacks cancel/refund (e.g. the legacy Stripe adapter)
 * cleanly no-ops without this module hardcoding any provider name.
 */
function resolveProvider(providerName, paypalEnv) {
  const adapter = providerName ? PROVIDERS[providerName] : null;
  const cfg = providerName === "paypal" ? resolvePaypalCfg(paypalEnv) : {};
  return {provider: providerName || null, adapter, cfg};
}

// ============================================================================
// Main entry point
// ============================================================================

/**
 * Perform an account deletion. Auth + admin-role checks are the CALLER's
 * responsibility (the callable wrapper / the script's own guards).
 *
 * @param {Object} params
 * @param {string} params.targetUserId
 * @param {('mock'|'no-traces'|'gdpr-clean')} [params.mode='gdpr-clean']
 * @param {boolean} [params.adminOverride=false]
 * @param {string} [params.performedBy='system']
 * @param {string} [params.reason]
 * @param {number} [params.creditsToRefund]
 * @param {string} [params.paypalEnv]
 * @return {Promise<Object>} result object (success, mode, steps, summary, …)
 */
async function performAccountDeletion({
  targetUserId,
  mode = "gdpr-clean",
  adminOverride = false,
  performedBy = "system",
  reason = "Admin-initiated deletion",
  creditsToRefund,
  paypalEnv,
} = {}) {
  try {
    if (!targetUserId) {
      throw new Error("targetUserId is required");
    }
    if (!["mock", "no-traces", "gdpr-clean"].includes(mode)) {
      throw new Error("Invalid deletion mode. Must be 'mock', 'no-traces', or 'gdpr-clean'");
    }

    logger.info("Account deletion initiated", {performedBy, targetUserId, mode, adminOverride, reason});

    const userRef = admin.firestore().collection("users").doc(targetUserId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    // Legacy Stripe customer id — retained for the audit record + inventory only.
    const stripeCustomerId = userData.stripeCustomerId;

    // Neutral billing identity. Used for inventory + billing_customers cleanup AND
    // to resolve the subscription provider (never assumed).
    let billingProvider = null;
    let billingProviderCustomerId = null;
    try {
      const billingDoc = await admin.firestore().collection("billing_customers").doc(targetUserId).get();
      if (billingDoc.exists) {
        const b = billingDoc.data() || {};
        billingProvider = b.provider || null;
        billingProviderCustomerId = b.providerCustomerId || null;
      }
    } catch (error) {
      logger.warn("Failed to read billing_customers (continuing)", {targetUserId, error: error.message});
    }

    // ========================================================================
    // MOCK MODE: registry-driven discovery (no writes)
    // ========================================================================
    if (mode === "mock") {
      logger.info("Running MOCK mode - discovery only", {targetUserId});

      const steps = [];
      let totalItemsFound = 0;

      for (const entry of CLIENT_DATA_REGISTRY) {
        try {
          const {count, sample} = await countEntry(entry, targetUserId);
          steps.push({
            name: entry.name,
            collection: describeEntry(entry, targetUserId),
            status: "complete",
            itemsFound: count,
            itemsDeleted: 0,
            sampleItems: sample,
            gdpr: entry.gdpr,
          });
          totalItemsFound += count;
        } catch (error) {
          steps.push({name: entry.name, collection: describeEntry(entry, targetUserId), status: "error", itemsFound: 0, itemsDeleted: 0, error: error.message});
        }
      }

      // Bespoke billing/identity footprint (not simple registry wipes).
      const billingFootprint = await countBillingFootprint(targetUserId, billingProvider, billingProviderCustomerId);
      for (const step of billingFootprint.steps) {
        steps.push(step);
        totalItemsFound += step.itemsFound || 0;
      }

      // User Document + Firebase Auth (always present).
      steps.push({name: "User Document", collection: "users", status: "complete", itemsFound: 1, itemsDeleted: 0, sampleItems: [targetUserId]});
      steps.push({name: "Firebase Auth", collection: "Firebase Authentication", status: "complete", itemsFound: 1, itemsDeleted: 0, sampleItems: [userData.email || targetUserId]});
      totalItemsFound += 2;

      logger.info("MOCK mode discovery complete", {targetUserId, totalItemsFound, steps: steps.length});

      const subscriptionInfo = {
        subscriptionId: userData.subscriptionId || null,
        subscriptionStatus: userData.subscriptionStatus || null,
        cancelAtPeriodEnd: userData.cancelAtPeriodEnd || false,
        provider: billingProvider || userData.provider || null,
      };
      const sessionCreditInfo = {
        available: userData.sessionBalance?.available || 0,
        purchased: userData.sessionBalance?.purchased || 0,
        used: userData.sessionBalance?.used || 0,
        expired: userData.sessionBalance?.expired || 0,
        activePackages: (userData.sessionPackages || [])
            .filter((pkg) => !pkg.expired && pkg.remaining > 0)
            .map((pkg) => ({
              id: pkg.id,
              remaining: pkg.remaining,
              quantity: pkg.quantity,
              provider: pkg.provider || (pkg.stripePaymentIntentId ? "stripe" : null),
            })),
      };

      return {
        success: true,
        message: "Mock deletion preview complete (no data was deleted)",
        mode: "mock",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        billingCustomerExists: billingFootprint.billingCustomerExists,
        steps,
        subscriptionInfo,
        sessionCreditInfo,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound,
          totalItemsDeleted: 0,
          stripeCustomerStatus: "preserved",
          firebaseAuthStatus: "preserved",
        },
      };
    }

    // ========================================================================
    // REAL DELETION MODES (no-traces & gdpr-clean)
    // ========================================================================

    // Block on upcoming scheduled sessions unless overridden.
    const upcomingSessionsSnapshot = await admin.firestore()
        .collection("sessions")
        .where("clientId", "==", targetUserId)
        .where("status", "==", "scheduled")
        .where("scheduledDate", ">", admin.firestore.Timestamp.now())
        .get();

    if (!upcomingSessionsSnapshot.empty && !adminOverride) {
      throw new Error(
          `Cannot delete account with ${upcomingSessionsSnapshot.size} upcoming scheduled sessions. ` +
          `Please cancel sessions first or use admin override.`
      );
    }

    const subscriptionId = userData.subscriptionId;
    const subscriptionStatus = userData.subscriptionStatus;
    const sessionBalance = userData.sessionBalance || {};
    const availableCredits = sessionBalance.available || 0;

    // Resolve the subscription's provider from its OWN record — the authoritative
    // source is billing_customers/{uid}/subscriptions/{subscriptionId}.provider (NOT
    // the parent billing_customers doc, which can be stale/wrong, and NOT assumed).
    // This lets a client run, e.g., a Stripe subscription + PayPal one-time sessions
    // and have each canceled/refunded via its own provider.
    let subProviderName = null;
    if (subscriptionId) {
      try {
        const subRecord = await admin.firestore()
            .collection("billing_customers")
            .doc(targetUserId)
            .collection("subscriptions")
            .doc(subscriptionId)
            .get();
        subProviderName = subRecord.exists ? (subRecord.data().provider || null) : null;
      } catch (error) {
        logger.warn("Failed to read subscription record for provider resolution (continuing)", {
          targetUserId,
          subscriptionId,
          error: error.message,
        });
      }
    }
    const {adapter: subAdapter, cfg: subCfg} = resolveProvider(subProviderName, paypalEnv);


    // ---- PRE-DELETION: subscription cancel + credit refunds ----
    if (mode === "gdpr-clean") {
      if (subscriptionId && (subscriptionStatus === "active" || userData.cancelAtPeriodEnd)) {
        if (typeof subAdapter?.cancelSubscription === "function") {
          try {
            await subAdapter.cancelSubscription(subscriptionId, subCfg);
            logger.info("Auto-canceled subscription for GDPR deletion", {targetUserId, subscriptionId, provider: subProviderName});
          } catch (error) {
            logger.warn("Failed to cancel subscription during GDPR deletion (may already be canceled / no cfg)", {error: error.message, provider: subProviderName, subscriptionId});
          }
        } else {
          logger.info("No cancelSubscription capability for provider; skipping cancel", {targetUserId, provider: subProviderName, subscriptionId});
        }
      }

      const requested = creditsToRefund;
      const resolvedCreditsToRefund = (typeof requested === "number") ?
          Math.min(Math.max(0, requested), availableCredits) :
          Math.min(availableCredits, MAX_CLIENT_REFUND_CREDITS);

      if (resolvedCreditsToRefund > 0 && availableCredits > 0) {
        let remainingToRefund = resolvedCreditsToRefund;
        const activePackages = (userData.sessionPackages || []).filter((pkg) => !pkg.expired && pkg.remaining > 0);
        for (const pkg of activePackages) {
          if (remainingToRefund <= 0) break;
          if (!pkg.amount || !pkg.quantity) continue;
          const creditsFromThisPkg = Math.min(pkg.remaining, remainingToRefund);
          const refundAmount = Math.round((creditsFromThisPkg / pkg.quantity) * pkg.amount);
          if (refundAmount <= 0) continue;

          // Authoritative provider for a one-time purchase is its transaction record:
          // billing_customers/{uid}/transactions/{providerTransactionId}.provider.
          // Fall back to the package's own `provider` (or legacy stripe* inference)
          // only if the transaction doc is absent.
          let pkgProviderName = pkg.provider || (pkg.stripePaymentIntentId ? "stripe" : null);
          if (pkg.providerTransactionId) {
            try {
              const txRecord = await admin.firestore()
                  .collection("billing_customers")
                  .doc(targetUserId)
                  .collection("transactions")
                  .doc(pkg.providerTransactionId)
                  .get();
              if (txRecord.exists && txRecord.data().provider) {
                pkgProviderName = txRecord.data().provider;
              }
            } catch (error) {
              logger.warn("Failed to read transaction record for provider resolution (using package fallback)", {
                targetUserId,
                packageId: pkg.id,
                transactionId: pkg.providerTransactionId,
                error: error.message,
              });
            }
          }
          const {adapter: pkgAdapter, cfg: pkgCfg} = resolveProvider(pkgProviderName, paypalEnv);


          if (pkg.providerTransactionId && typeof pkgAdapter?.refundCapture === "function") {
            try {
              await pkgAdapter.refundCapture(pkg.providerTransactionId, {amountMinorUnits: refundAmount, currency: "USD"}, pkgCfg);
              logger.info("Refunded session credits for GDPR deletion", {targetUserId, provider: pkgProviderName, packageId: pkg.id, refundAmount, creditsRefunded: creditsFromThisPkg});
              remainingToRefund -= creditsFromThisPkg;
            } catch (error) {
              logger.warn("Failed to refund session package (may already be refunded / no cfg)", {error: error.message, provider: pkgProviderName, packageId: pkg.id});
            }
          } else {
            logger.info("Skipping package refund (no refundCapture capability / no transaction id)", {targetUserId, packageId: pkg.id, provider: pkgProviderName, hasTransactionId: !!pkg.providerTransactionId});
            remainingToRefund -= creditsFromThisPkg;
          }
        }
        logger.info("Session credit refund summary", {targetUserId, requested: resolvedCreditsToRefund, totalAvailable: availableCredits, forfeited: availableCredits - resolvedCreditsToRefund});
      }
    }

    if (mode === "no-traces") {
      if (subscriptionId) {
        if (typeof subAdapter?.cancelSubscription === "function") {
          try {
            await subAdapter.cancelSubscription(subscriptionId, subCfg);
            logger.info("Auto-canceled subscription for no-traces deletion", {targetUserId, subscriptionId, provider: subProviderName});
          } catch (error) {
            logger.warn("Failed to cancel subscription during no-traces deletion (may already be canceled / no cfg)", {error: error.message, provider: subProviderName, subscriptionId});
          }
        } else {
          logger.info("No cancelSubscription capability for provider; skipping cancel", {targetUserId, provider: subProviderName, subscriptionId});
        }
      }
      if (availableCredits > 0) {
        logger.info("Zeroing out session credits for no-traces deletion", {targetUserId, creditsZeroed: availableCredits});
      }
    }

    // ---- AUDIT RECORD ----
    logger.info("Creating deleted_accounts audit record", {targetUserId, mode});
    const randomId = Math.random().toString(36).substring(2, 15);
    const anonymizedEmail = `deleted-user-${randomId}@privacy.local`;
    const emailHash = crypto.createHash("sha256").update(userData.email || "").digest("hex");

    const completedSessionsSnapshot = await admin.firestore()
        .collection("sessions")
        .where("clientId", "==", targetUserId)
        .where("status", "==", "completed")
        .get();

    await admin.firestore().collection("deleted_accounts").doc(targetUserId).set({
      deletedUserId: targetUserId,
      anonymizedEmail,
      originalEmailHash: emailHash,
      stripeCustomerId: stripeCustomerId || null,
      billingProvider: billingProvider || null,
      billingProviderCustomerId: billingProviderCustomerId || null,
      deletionMode: mode,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: "admin",
      deletedByAdminId: performedBy,
      reason,
      accountCreatedAt: userData.createdAt || null,
      lastPaymentDate: userData.lastPaymentDate || null,
      totalPayments: userData.sessionBalance?.purchased || 0,
      hadActiveSubscription: !!userData.subscriptionId,
      sessionsCompleted: completedSessionsSnapshot.size,
    });
    logger.info("Audit record created", {targetUserId, mode});

    // ========================================================================
    // NO-TRACES: delete everything flagged noTraces:'delete' + bespoke steps
    // ========================================================================
    if (mode === "no-traces") {
      logger.info("Starting NO-TRACES deletion", {targetUserId});
      const steps = [];
      let totalDeleted = 0;

      for (const entry of CLIENT_DATA_REGISTRY) {
        if (entry.noTraces !== "delete") continue;
        try {
          const count = await deleteEntry(entry, targetUserId);
          steps.push({name: entry.name, itemsDeleted: count, status: "complete"});
          totalDeleted += count;
        } catch (error) {
          steps.push({name: entry.name, status: "error", error: error.message});
        }
      }

      if (subscriptionId) {
        steps.push({name: "Subscription (Canceled)", itemsDeleted: 1, status: "complete"});
      }
      if (availableCredits > 0) {
        steps.push({name: `Session Credits (Zeroed ${availableCredits} remaining)`, itemsDeleted: availableCredits, status: "complete"});
      }

      // Neutral Billing Customer: subcollections then parent doc.
      try {
        let billingItemsDeleted = 0;
        for (const subName of ["subscriptions", "transactions"]) {
          const subSnap = await admin.firestore().collection("billing_customers").doc(targetUserId).collection(subName).get();
          billingItemsDeleted += await deleteDocsChunked(subSnap.docs);
        }
        const billingRef = admin.firestore().collection("billing_customers").doc(targetUserId);
        if ((await billingRef.get()).exists) {
          await billingRef.delete();
          billingItemsDeleted += 1;
        }
        steps.push({name: "Billing Customer (Firestore + Subcollections)", itemsDeleted: billingItemsDeleted, status: "complete"});
        totalDeleted += billingItemsDeleted;
      } catch (error) {
        logger.error("Failed to delete billing customer", {error: error.message});
        steps.push({name: "Billing Customer", status: "error", error: error.message});
      }

      // Legacy Stripe Customer Firestore footprint (doc + subcollections). No Stripe API.
      // NOT gated on userData.stripeCustomerId: migrated accounts hold the Stripe id in
      // billing_customers.providerCustomerId (users.stripeCustomerId is null), so we
      // delete whenever the stripe_customers/{uid} footprint exists at all.
      try {
        let subItemsDeleted = 0;
        for (const subName of ["subscriptions", "payments", "checkout_sessions"]) {
          const subSnap = await admin.firestore().collection("stripe_customers").doc(targetUserId).collection(subName).get();
          subItemsDeleted += await deleteDocsChunked(subSnap.docs);
        }
        const stripeRef = admin.firestore().collection("stripe_customers").doc(targetUserId);
        let parentDeleted = 0;
        if ((await stripeRef.get()).exists) {
          await stripeRef.delete();
          parentDeleted = 1;
        }
        if (parentDeleted + subItemsDeleted > 0) {
          steps.push({name: "Legacy Stripe Customer (Firestore + Subcollections)", itemsDeleted: parentDeleted + subItemsDeleted, status: "complete"});
          totalDeleted += parentDeleted + subItemsDeleted;
        }
      } catch (error) {
        logger.error("Failed to delete legacy Stripe customer Firestore docs", {error: error.message});
        steps.push({name: "Legacy Stripe Customer", status: "error", error: error.message});
      }


      // Remove from trainer's client list.
      if (userData.assignedTrainerId) {
        try {
          const trainerCollection = userData.assignedTrainerCollection || "admins";
          await admin.firestore().collection(trainerCollection).doc(userData.assignedTrainerId).update({
            clients: admin.firestore.FieldValue.arrayRemove(targetUserId),
          });
          steps.push({name: "Trainer Client List", itemsDeleted: 1, status: "complete"});
        } catch (error) {
          steps.push({name: "Trainer Client List", status: "error", error: error.message});
        }
      }

      // User document.
      await userRef.delete();
      steps.push({name: "User Document", itemsDeleted: 1, status: "complete"});
      totalDeleted += 1;

      // Firebase Auth.
      try {
        await admin.auth().deleteUser(targetUserId);
        steps.push({name: "Firebase Auth", itemsDeleted: 1, status: "complete"});
        totalDeleted += 1;
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          steps.push({name: "Firebase Auth", status: "error", error: error.message});
        } else {
          steps.push({name: "Firebase Auth", itemsDeleted: 0, status: "complete"});
        }
      }

      await admin.firestore().collection("audit_logs").add({
        action: "account_deletion", mode: "no-traces", targetUserId, performedBy,
        performedAt: admin.firestore.FieldValue.serverTimestamp(), reason, success: true, totalDeleted,
      });
      logger.info("NO-TRACES deletion completed", {targetUserId, totalDeleted});

      return {
        success: true,
        message: "Account completely removed (no traces)",
        mode: "no-traces",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        steps,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound: totalDeleted,
          totalItemsDeleted: totalDeleted,
          stripeCustomerStatus: "deleted",
          firebaseAuthStatus: "deleted",
        },
      };
    }

    // ========================================================================
    // GDPR-CLEAN: delete PII (gdpr:'delete'), preserve business/financial records
    // ========================================================================
    if (mode === "gdpr-clean") {
      logger.info("Starting GDPR-CLEAN deletion", {targetUserId});
      const steps = [];
      let totalDeleted = 0;

      // Anonymize neutral Billing Customer (preserve financial records).
      try {
        const billingRef = admin.firestore().collection("billing_customers").doc(targetUserId);
        if ((await billingRef.get()).exists) {
          await billingRef.set({
            email: anonymizedEmail,
            name: admin.firestore.FieldValue.delete(),
            gdprDeleted: true,
            gdprDeletedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
          logger.info("Billing customer anonymized", {targetUserId});
        }
        steps.push({name: "Billing Customer (Anonymized)", itemsDeleted: 0, status: "complete"});
      } catch (error) {
        steps.push({name: "Billing Customer", status: "error", error: error.message});
      }

      // Delete all PII registry entries.
      for (const entry of CLIENT_DATA_REGISTRY) {
        if (entry.gdpr !== "delete") continue;
        try {
          const count = await deleteEntry(entry, targetUserId);
          steps.push({name: entry.name, itemsDeleted: count, status: "complete"});
          totalDeleted += count;
        } catch (error) {
          steps.push({name: entry.name, status: "error", error: error.message});
        }
      }

      // Anonymize the user document (preserve for business records).
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
        steps.push({name: "User Document (Anonymized)", itemsDeleted: 0, status: "complete"});
        logger.info("User document anonymized", {targetUserId});
      } catch (error) {
        steps.push({name: "User Document", status: "error", error: error.message});
      }

      // Delete Firebase Auth.
      try {
        await admin.auth().deleteUser(targetUserId);
        steps.push({name: "Firebase Auth", itemsDeleted: 1, status: "complete"});
        totalDeleted += 1;
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          steps.push({name: "Firebase Auth", status: "error", error: error.message});
        } else {
          steps.push({name: "Firebase Auth", itemsDeleted: 0, status: "complete"});
        }
      }

      await admin.firestore().collection("audit_logs").add({
        action: "account_deletion", mode: "gdpr-clean", targetUserId, performedBy,
        performedAt: admin.firestore.FieldValue.serverTimestamp(), reason, success: true, totalDeleted,
      });
      logger.info("GDPR-CLEAN deletion completed", {targetUserId, totalDeleted});

      return {
        success: true,
        message: "PII removed, business records preserved (GDPR-compliant)",
        mode: "gdpr-clean",
        deletedUserId: targetUserId,
        stripeCustomerId: stripeCustomerId || "",
        steps,
        summary: {
          totalCollectionsProcessed: steps.length,
          totalItemsFound: totalDeleted,
          totalItemsDeleted: totalDeleted,
          stripeCustomerStatus: "n/a",
          firebaseAuthStatus: "deleted",
        },
      };
    }

    throw new Error(`Unknown deletion mode: ${mode}`);
  } catch (error) {
    logger.error("Account deletion failed", {error: error.message, stack: error.stack, performedBy, targetUserId, mode});
    if (targetUserId) {
      try {
        await admin.firestore().collection("audit_logs").add({
          action: "account_deletion", mode: mode || "unknown", targetUserId, performedBy,
          performedAt: admin.firestore.FieldValue.serverTimestamp(), reason: reason || "Unknown",
          success: false, error: error.message,
        });
      } catch (logError) {
        logger.error("Failed to log deletion failure", {error: logError.message});
      }
    }
    throw new Error(`Account deletion failed: ${error.message}`);
  }
}

/**
 * Count the bespoke billing/identity footprint (billing_customers + subcollections
 * and the legacy stripe_customers footprint) for the mock inventory + scan.
 */
async function countBillingFootprint(uid, billingProvider, billingProviderCustomerId) {
  const db = admin.firestore();
  const steps = [];
  let billingCustomerExists = false;

  try {
    const billingDoc = await db.collection("billing_customers").doc(uid).get();
    billingCustomerExists = billingDoc.exists;
    steps.push({
      name: "Billing Customer",
      collection: "billing_customers",
      status: "complete",
      itemsFound: billingDoc.exists ? 1 : 0,
      itemsDeleted: 0,
      sampleItems: billingDoc.exists ? [`${billingProvider || "unknown"}:${billingProviderCustomerId || uid}`] : [],
    });
  } catch (error) {
    steps.push({name: "Billing Customer", collection: "billing_customers", status: "error", itemsFound: 0, itemsDeleted: 0, error: error.message});
  }

  for (const subName of ["subscriptions", "transactions"]) {
    try {
      const snap = await db.collection("billing_customers").doc(uid).collection(subName).get();
      steps.push({name: `Billing ${subName}`, collection: `billing_customers/${uid}/${subName}`, status: "complete", itemsFound: snap.size, itemsDeleted: 0, sampleItems: snap.docs.slice(0, 5).map((d) => d.id)});
    } catch (error) {
      steps.push({name: `Billing ${subName}`, status: "error", itemsFound: 0, itemsDeleted: 0, error: error.message});
    }
  }

  // Legacy Stripe footprint (Firestore only).
  try {
    const stripeDoc = await db.collection("stripe_customers").doc(uid).get();
    steps.push({name: "Legacy Stripe Customer", collection: "stripe_customers", status: "complete", itemsFound: stripeDoc.exists ? 1 : 0, itemsDeleted: 0, sampleItems: stripeDoc.exists ? [uid] : []});
  } catch (error) {
    steps.push({name: "Legacy Stripe Customer", status: "error", itemsFound: 0, itemsDeleted: 0, error: error.message});
  }
  for (const subName of ["subscriptions", "payments", "checkout_sessions"]) {
    try {
      const snap = await db.collection("stripe_customers").doc(uid).collection(subName).get();
      steps.push({name: `Legacy Stripe ${subName}`, collection: `stripe_customers/${uid}/${subName}`, status: "complete", itemsFound: snap.size, itemsDeleted: 0, sampleItems: snap.docs.slice(0, 5).map((d) => d.id)});
    } catch (error) {
      steps.push({name: `Legacy Stripe ${subName}`, status: "error", itemsFound: 0, itemsDeleted: 0, error: error.message});
    }
  }

  return {steps, billingCustomerExists};
}

/**
 * Read-only orphan scan. Iterates the SAME registry + billing/identity footprint
 * for a uid and returns every location that still has leftover data. Use AFTER a
 * deletion to prove nothing was orphaned, or against any account to spot coverage
 * gaps. Because it shares CLIENT_DATA_REGISTRY, it can never silently disagree with
 * the deletion logic. Makes NO writes.
 *
 * @return {Promise<{ uid, hasOrphans, findings: Array<{name, location, count}> }>}
 */
async function scanClientData(targetUserId) {
  if (!targetUserId) throw new Error("targetUserId is required");
  const findings = [];

  for (const entry of CLIENT_DATA_REGISTRY) {
    try {
      const {count} = await countEntry(entry, targetUserId);
      if (count > 0) {
        findings.push({name: entry.name, location: describeEntry(entry, targetUserId), count});
      }
    } catch (error) {
      findings.push({name: entry.name, location: describeEntry(entry, targetUserId), count: -1, error: error.message});
    }
  }

  // Billing/identity footprint (bespoke).
  const footprint = await countBillingFootprint(targetUserId, null, null);
  for (const s of footprint.steps) {
    if ((s.itemsFound || 0) > 0) {
      findings.push({name: s.name, location: s.collection, count: s.itemsFound});
    }
  }

  // User doc.
  try {
    const userSnap = await admin.firestore().collection("users").doc(targetUserId).get();
    if (userSnap.exists) {
      const d = userSnap.data() || {};
      findings.push({name: "User Document", location: "users", count: 1, gdprDeleted: d.gdprDeleted === true});
    }
  } catch (error) {
    findings.push({name: "User Document", location: "users", count: -1, error: error.message});
  }

  return {uid: targetUserId, hasOrphans: findings.some((f) => f.count > 0), findings};
}

module.exports = { performAccountDeletion, scanClientData, CLIENT_DATA_REGISTRY };
