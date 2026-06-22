/**
 * Phase 5 cleanup (stripe-neutralization-tasks.md): remove legacy Stripe residue
 * from Firestore AFTER the copy migration (migrate-stripe-to-neutral.js) has run
 * and prod has been validated on the neutral data.
 *
 * This is the LAST step of the neutralization task. It is NOT account deletion —
 * it cleans Stripe leftovers from accounts you are KEEPING. (Deleting an account
 * already wipes that user's full Stripe footprint via account-deletion.js.)
 *
 * Two parts, each with a SAFETY GATE so we never destroy data the migration hasn't
 * already copied to its neutral home:
 *
 *  1) users/{uid}.sessionPackages[] — strip the legacy stripe* fields:
 *       stripePaymentIntentId, stripePriceId, stripeProductName, stripeProductId
 *     GATE: a package is only stripped if it already has its neutral equivalents
 *     (providerTransactionId + productId). Un-migrated packages are left intact
 *     and reported, so you can re-run the migration first.
 *
 *  2) stripe_customers/{uid} (+ subscriptions/payments/checkout_sessions subcollections):
 *     delete the doc + subcollections (pure Firestore — no Stripe API).
 *     GATE: only deleted when a corresponding billing_customers/{uid} doc exists
 *     (proving the migration copied the billing identity). Orphans without a
 *     billing_customers counterpart are skipped and reported.
 *
 *  3) billing_customers/{uid} — strip the stale PARENT-level `provider` and
 *     `migratedFromStripe` fields. Provider is authoritative at the RECORD level
 *     (each transactions/{id}.provider and subscriptions/{id}.provider); the
 *     migration wrote a parent-level `provider` by inferring from the old Stripe id,
 *     which is sometimes WRONG (e.g. "stripe" for a PayPal client). Nothing reads the
 *     parent field anymore, so we remove it to avoid confusion. (No gate needed —
 *     subcollections are untouched.)
 *
 * Leaves `stripe_products` intact (t"he dormant Stripe adapter still references it).

 *
 * Idempotent: re-running skips packages/docs already cleaned.
 *
 * Usage (from repo root or firebase/):
 *   node firebase/scripts/cleanup-stripe-data.js                 # dry run (default)
 *   node firebase/scripts/cleanup-stripe-data.js --commit        # apply
 *   node firebase/scripts/cleanup-stripe-data.js --skip-customers --commit   # packages only
 *   node firebase/scripts/cleanup-stripe-data.js --skip-packages --commit    # customers only
 *   node firebase/scripts/cleanup-stripe-data.js --limit=25                  # cap scan output
 *
 * Auth: prefers repo-root service-account-key.json; else Application Default
 * Credentials (set GOOGLE_APPLICATION_CREDENTIALS / `gcloud auth application-default
 * login`, with GCLOUD_PROJECT=shreyfitweb) — same as the other migration scripts.
 */

const admin = require("firebase-admin");

// Prefer an explicit service-account key if it exists; else fall back to ADC.
let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
const SKIP_PACKAGES = argv.includes("--skip-packages");
const SKIP_CUSTOMERS = argv.includes("--skip-customers");
function getOpt(name, fallback) {
  const prefix = `--${name}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}
const LIMIT_RAW = getOpt("limit", null);
const LIMIT = LIMIT_RAW !== null ? parseInt(LIMIT_RAW, 10) : Infinity;
if (LIMIT_RAW !== null && (isNaN(LIMIT) || LIMIT < 1)) {
  console.error(`ERROR: invalid --limit: ${LIMIT_RAW}`);
  process.exit(1);
}

// Optional: scope ALL parts to a single account. Great for a safe first run —
// clean one uid, verify, then run unscoped. Omit to process every account.
const ONLY_UID = getOpt("uid", null);


// Legacy stripe* fields stripped from each session package.
const STRIPE_PKG_FIELDS = [
  "stripePaymentIntentId",
  "stripePriceId",
  "stripeProductName",
  "stripeProductId",
];

/**
 * Part 1: strip legacy stripe* fields from users/{uid}.sessionPackages[].
 * Only strips packages that already carry neutral fields (providerTransactionId + productId).
 */
async function cleanupSessionPackages(db) {
  console.log("\n=== users.sessionPackages[] — strip legacy stripe* fields ===");
  // Scope to one user doc when --uid is set; else scan all users.
  const userDocs = ONLY_UID
    ? [await db.collection("users").doc(ONLY_UID).get()].filter((d) => d.exists)
    : (await db.collection("users").get()).docs;
  const snap = { docs: userDocs };

  let usersScanned = 0;

  let usersUpdated = 0;
  let pkgsStripped = 0;
  let pkgsSkippedUnmigrated = 0;
  let printed = 0;

  const batchLimit = 300;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    usersScanned++;
    const data = docSnap.data() || {};
    const packages = data.sessionPackages;
    if (!Array.isArray(packages) || packages.length === 0) continue;

    let changed = false;
    const updated = packages.map((pkg) => {
      const hasStripeField = STRIPE_PKG_FIELDS.some((f) => pkg[f] !== undefined);
      if (!hasStripeField) return pkg; // already clean

      // SAFETY GATE: only strip if neutral equivalents exist.
      const isMigrated = !!pkg.providerTransactionId && !!pkg.productId;
      if (!isMigrated) {
        pkgsSkippedUnmigrated++;
        return pkg; // leave intact — run the migration first
      }

      changed = true;
      pkgsStripped++;
      const clean = {...pkg};
      for (const f of STRIPE_PKG_FIELDS) delete clean[f];
      return clean;
    });

    if (!changed) continue;

    usersUpdated++;
    if (printed < LIMIT) {
      console.log(`  ✓ ${docSnap.id}: stripped stripe* from ${packages.length} package(s)`);
      printed++;
    }
    if (COMMIT) {
      batch.update(docSnap.ref, {sessionPackages: updated});
      pending++;
      if (pending >= batchLimit) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (COMMIT && pending > 0) await batch.commit();

  console.log(
      `  usersScanned=${usersScanned} usersUpdated=${usersUpdated} ` +
      `packagesStripped=${pkgsStripped} packagesSkippedUnmigrated=${pkgsSkippedUnmigrated}`
  );
  if (pkgsSkippedUnmigrated > 0) {
    console.log(
        "  ⚠️  Some packages still lack neutral fields (providerTransactionId/productId).\n" +
        "      Run migrate-stripe-to-neutral.js --commit first, then re-run this cleanup."
    );
  }
  return {usersScanned, usersUpdated, pkgsStripped, pkgsSkippedUnmigrated};
}

/** Delete all docs in a snapshot, chunked under the 500-write batch limit. */
async function deleteDocsChunked(db, docs) {
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

/**
 * Part 2: delete legacy stripe_customers/{uid} docs (+ subcollections).
 * Only deletes when a billing_customers/{uid} doc exists (migration copied it).
 */
async function cleanupStripeCustomers(db) {
  console.log("\n=== stripe_customers/{uid} — delete legacy docs (+ subcollections) ===");
  const docs = ONLY_UID
    ? [await db.collection("stripe_customers").doc(ONLY_UID).get()].filter((d) => d.exists)
    : (await db.collection("stripe_customers").get()).docs;
  const snap = { docs };


  let scanned = 0;
  let deletedDocs = 0;
  let deletedSubItems = 0;
  let skippedNoBilling = 0;
  let printed = 0;

  for (const docSnap of snap.docs) {
    scanned++;
    const uid = docSnap.id;

    // SAFETY GATE: require a neutral billing_customers/{uid} counterpart.
    const billing = await db.collection("billing_customers").doc(uid).get();
    if (!billing.exists) {
      skippedNoBilling++;
      if (printed < LIMIT) {
        console.log(`  ⚠ ${uid}: SKIP — no billing_customers/{uid} (run migration first)`);
        printed++;
      }
      continue;
    }

    // Count + (optionally) delete subcollections then the parent doc.
    let subItems = 0;
    for (const subName of ["subscriptions", "payments", "checkout_sessions"]) {
      const subSnap = await db.collection("stripe_customers").doc(uid).collection(subName).get();
      subItems += subSnap.size;
      if (COMMIT && !subSnap.empty) {
        deletedSubItems += await deleteDocsChunked(db, subSnap.docs);
      }
    }
    if (COMMIT) {
      await docSnap.ref.delete();
    }
    deletedDocs++;
    if (printed < LIMIT) {
      console.log(`  ✓ ${uid}: delete doc + ${subItems} subcollection item(s)`);
      printed++;
    }
  }

  console.log(
      `  scanned=${scanned} docsDeleted=${deletedDocs} subItemsDeleted=${deletedSubItems} ` +
      `skipped(noBilling)=${skippedNoBilling}`
  );
  if (skippedNoBilling > 0) {
    console.log(
        "  ⚠️  Some stripe_customers docs have no billing_customers counterpart.\n" +
        "      Run migrate-stripe-to-neutral.js --commit first, then re-run this cleanup."
    );
  }
  return {scanned, deletedDocs, deletedSubItems, skippedNoBilling};
}

/**
 * Part 3: strip the stale PARENT-level `provider` + `migratedFromStripe` fields from
 * billing_customers/{uid}. Provider is authoritative at the record level
 * (transactions/{id}.provider, subscriptions/{id}.provider); the migration's
 * parent-level `provider` was inferred from the old Stripe id and is sometimes wrong.
 * Subcollections are NOT touched.
 */
async function cleanupBillingCustomerProvider(db) {
  console.log("\n=== billing_customers/{uid} — strip stale parent provider/migratedFromStripe ===");
  const docs = ONLY_UID
    ? [await db.collection("billing_customers").doc(ONLY_UID).get()].filter((d) => d.exists)
    : (await db.collection("billing_customers").get()).docs;
  const snap = { docs };


  let scanned = 0;
  let updated = 0;
  let printed = 0;

  const batchLimit = 300;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    scanned++;
    const data = docSnap.data() || {};
    const hasProvider = data.provider !== undefined;
    const hasMigratedFlag = data.migratedFromStripe !== undefined;
    if (!hasProvider && !hasMigratedFlag) continue;

    updated++;
    if (printed < LIMIT) {
      console.log(`  ✓ ${docSnap.id}: removing parent ${hasProvider ? `provider="${data.provider}"` : ""}${hasProvider && hasMigratedFlag ? " + " : ""}${hasMigratedFlag ? "migratedFromStripe" : ""}`);
      printed++;
    }
    if (COMMIT) {
      const patch = {};
      if (hasProvider) patch.provider = admin.firestore.FieldValue.delete();
      if (hasMigratedFlag) patch.migratedFromStripe = admin.firestore.FieldValue.delete();
      batch.update(docSnap.ref, patch);
      pending++;
      if (pending >= batchLimit) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (COMMIT && pending > 0) await batch.commit();

  console.log(`  scanned=${scanned} docsUpdated=${updated}`);
  return {scanned, updated};
}

async function main() {
  admin.initializeApp(
      serviceAccount ? {credential: admin.credential.cert(serviceAccount)} : undefined
  );
  const db = admin.firestore();

  console.log(`\nStripe data cleanup (Phase 5) — mode: ${COMMIT ? "COMMIT" : "DRY RUN"}`);
  if (ONLY_UID) console.log(`  (scoped to single uid: ${ONLY_UID})`);
  if (SKIP_PACKAGES) console.log("  (skipping sessionPackages cleanup)");
  if (SKIP_CUSTOMERS) console.log("  (skipping stripe_customers cleanup)");

  if (!SKIP_PACKAGES) await cleanupSessionPackages(db);
  if (!SKIP_CUSTOMERS) await cleanupStripeCustomers(db);
  // Part 3 always runs (it's safe + gateless); skipped only with --skip-customers
  // since it's billing-identity hygiene that pairs with the customers cleanup.
  if (!SKIP_CUSTOMERS) await cleanupBillingCustomerProvider(db);


  console.log(
      "\nDone." +
      (COMMIT ? "" : " (dry run — nothing written; re-run with --commit)") +
      "\nNote: stripe_products is intentionally left intact for the dormant Stripe adapter.\n"
  );
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nFAILED:", err.message);
      process.exit(1);
    });
