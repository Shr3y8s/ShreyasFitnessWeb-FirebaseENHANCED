/**
 * One-time COPY migration: Stripe-shaped Firestore data → provider-neutral shape.
 *
 * Two parts (both COPY-only — old Stripe fields/docs are left intact so the app
 * keeps working during/after the migration; a later cleanup script removes them):
 *
 *  1) stripe_customers/{uid}  →  billing_customers/{uid}
 *       { provider, providerCustomerId, email }  (merge — never clobbers an
 *       existing webhook-written PayPal billing_customers doc).
 *
 *  2) users/{uid}.sessionPackages[]  — add neutral fields copied from stripe*:
 *       providerTransactionId  ← stripePaymentIntentId
 *       priceId                ← stripePriceId
 *       productName            ← stripeProductName
 *       productId (app id)     ← derived from stripeProductId/name/quantity
 *       provider               ← existing or 'stripe' (legacy rows predate provider)
 *     The old stripe* fields are LEFT IN PLACE.
 *
 * Idempotent: re-running skips docs/packages that already have the neutral fields.
 *
 * Usage (from repo root or firebase/):
 *   node firebase/scripts/migrate-stripe-to-neutral.js            # dry run (default)
 *   node firebase/scripts/migrate-stripe-to-neutral.js --commit   # apply
 *
 * Auth: uses repo-root service-account-key.json if present; otherwise falls back to
 * Application Default Credentials (set GOOGLE_APPLICATION_CREDENTIALS / run
 * `gcloud auth application-default login`, with GCLOUD_PROJECT=shreyfitweb) — same
 * options the other migration scripts support.
 */

const admin = require("firebase-admin");

// Prefer an explicit service-account key if it exists; else fall back to ADC.
let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}

const COMMIT = process.argv.includes("--commit");



// Legacy Stripe product id → app product id (both test + live; globally unique).
const STRIPE_PRODUCT_TO_APP_ID = {
  prod_SwvHrfi1C4k4pS: "online_coaching",
  prod_Uiwc6hs1G6YlIf: "online_coaching",
  prod_SwvI0SWs0J3DMQ: "complete_transformation",
  prod_UiwXMrl2KqquZD: "complete_transformation",
  prod_SwuHPYlY94VZyY: "in_person",
  prod_UiweIP2zdj2sRv: "in_person",
  prod_SwvMUVeTqAnveu: "in_person_4pack",
  prod_UiwQCggpkdr6S5: "in_person_4pack",
};

/** Resolve a session package's app product id from its legacy fields. */
function resolvePackageAppId(pkg) {
  // 1) Map a known legacy Stripe product id.
  if (pkg.stripeProductId && STRIPE_PRODUCT_TO_APP_ID[pkg.stripeProductId]) {
    return STRIPE_PRODUCT_TO_APP_ID[pkg.stripeProductId];
  }
  // 2) Fall back to quantity (1 = single, >1 = 4-pack family).
  const qty = Number(pkg.quantity) || 1;
  return qty > 1 ? "in_person_4pack" : "in_person";
}

async function migrateBillingCustomers(db) {
  console.log("\n=== stripe_customers → billing_customers ===");
  const snap = await db.collection("stripe_customers").get();
  let scanned = 0;
  let copied = 0;
  let skipped = 0;

  for (const docSnap of snap.docs) {
    scanned++;
    const uid = docSnap.id;
    const data = docSnap.data() || {};
    const providerCustomerId = data.stripeId || null;
    const email = data.email || null;
    const provider = providerCustomerId && String(providerCustomerId).startsWith("cus_")
      ? "stripe"
      : "paypal";

    const billingRef = db.collection("billing_customers").doc(uid);
    const existing = await billingRef.get();
    // Skip only if a billing doc already records this same providerCustomerId.
    if (existing.exists && existing.data().providerCustomerId === providerCustomerId) {
      skipped++;
      continue;
    }

    copied++;
    console.log(`  ✓ ${uid}: provider=${provider} providerCustomerId=${providerCustomerId || "(none)"}`);
    if (COMMIT) {
      await billingRef.set(
        {
          provider,
          ...(providerCustomerId ? { providerCustomerId } : {}),
          ...(email ? { email } : {}),
          migratedFromStripe: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
  }

  console.log(`  scanned=${scanned} copied=${copied} skipped(existing)=${skipped}`);
  return { scanned, copied, skipped };
}

async function migrateSessionPackages(db) {
  console.log("\n=== users.sessionPackages[] stripe* → neutral ===");
  const snap = await db.collection("users").get();
  let usersScanned = 0;
  let usersUpdated = 0;
  let pkgsConverted = 0;
  let pkgsAlready = 0;

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
      // Already neutral? (has providerTransactionId + productId)
      if (pkg.providerTransactionId && pkg.productId) {
        pkgsAlready++;
        return pkg;
      }
      changed = true;
      pkgsConverted++;
      return {
        ...pkg,
        provider: pkg.provider || "stripe",
        providerTransactionId: pkg.providerTransactionId ?? pkg.stripePaymentIntentId ?? null,
        priceId: pkg.priceId ?? pkg.stripePriceId ?? null,
        productName: pkg.productName ?? pkg.stripeProductName ?? null,
        productId: pkg.productId ?? resolvePackageAppId(pkg),
        // NOTE: legacy stripe* fields intentionally LEFT IN PLACE (cleanup later).
      };
    });

    if (!changed) continue;

    usersUpdated++;
    console.log(`  ✓ ${docSnap.id}: ${packages.length} package(s) neutralized`);
    if (COMMIT) {
      batch.update(docSnap.ref, { sessionPackages: updated });
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
    `packagesConverted=${pkgsConverted} packagesAlreadyNeutral=${pkgsAlready}`
  );
  return { usersScanned, usersUpdated, pkgsConverted, pkgsAlready };
}

async function main() {
  admin.initializeApp(
    serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : undefined
  );
  const db = admin.firestore();



  console.log(`\nStripe → neutral COPY migration — mode: ${COMMIT ? "COMMIT" : "DRY RUN"}`);

  await migrateBillingCustomers(db);
  await migrateSessionPackages(db);

  console.log("\nDone." + (COMMIT ? "" : " (dry run — nothing written; re-run with --commit)") + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFAILED:", err.message);
    process.exit(1);
  });
