/**
 * One-time migration: users/{uid}.tier  legacy Stripe product id (`prod_…`)
 *  provider-neutral APP PRODUCT ID (see app/src/lib/constants.ts APP_PRODUCTS).
 *
 * Why: we moved `user.tier` off env-specific Stripe product ids onto stable,
 * env-independent app ids. New signups already write app ids; this converts the
 * existing user docs.
 *
 * Idempotent: docs already holding an app id (or with no tier) are skipped.
 * Maps BOTH test and live Stripe product ids (globally unique) → the app id, so
 * the same script works in dev and prod.
 *
 * Usage (from repo root or firebase/):
 *   # dry run (default) — prints what WOULD change, writes nothing
 *   node firebase/scripts/migrate-tier-ids.js
 *   # commit the changes
 *   node firebase/scripts/migrate-tier-ids.js --commit
 *
 * Auth: uses Application Default Credentials. Either run with
 *   GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>
 * or `firebase login:ci` / `gcloud auth application-default login`. Set the
 * project with GCLOUD_PROJECT=shreyfitweb if not already configured.
 */

const admin = require("firebase-admin");

// Prefer an explicit service-account key if it exists; else fall back to ADC.
let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}


// Legacy Stripe product id  app product id. Both test + live, since ids are
// globally unique and a given user's tier only ever matches one set.
const TIER_MIGRATION = {
  // ----- ONLINE COACHING -----
  prod_SwvHrfi1C4k4pS: "online_coaching",        // test
  prod_Uiwc6hs1G6YlIf: "online_coaching",        // live
  // ----- COMPLETE TRANSFORMATION -----
  prod_SwvI0SWs0J3DMQ: "complete_transformation", // test
  prod_UiwXMrl2KqquZD: "complete_transformation", // live
  // ----- IN-PERSON (single) -----
  prod_SwuHPYlY94VZyY: "in_person",               // test
  prod_UiweIP2zdj2sRv: "in_person",               // live
  // ----- IN-PERSON 4-PACK -----
  prod_SwvMUVeTqAnveu: "in_person_4pack",         // test
  prod_UiwQCggpkdr6S5: "in_person_4pack",         // live
};

const APP_IDS = new Set(Object.values(TIER_MIGRATION));
const COMMIT = process.argv.includes("--commit");

async function main() {
  admin.initializeApp(
    serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : undefined
  );
  const db = admin.firestore();


  console.log(`\nTier id migration — mode: ${COMMIT ? "COMMIT" : "DRY RUN"}\n`);

  const snap = await db.collection("users").get();
  let scanned = 0;
  let toMigrate = 0;
  let alreadyAppId = 0;
  let noTier = 0;
  let unknown = 0;
  const batchLimit = 400;
  let batch = db.batch();
  let pending = 0;

  for (const docSnap of snap.docs) {
    scanned++;
    const tier = docSnap.data().tier;

    if (!tier) { noTier++; continue; }
    if (APP_IDS.has(tier)) { alreadyAppId++; continue; }

    const mapped = TIER_MIGRATION[tier];
    if (!mapped) {
      unknown++;
      console.warn(`  ? ${docSnap.id}: unknown tier "${tier}" — left unchanged`);
      continue;
    }

    toMigrate++;
    console.log(`  ✓ ${docSnap.id}: "${tier}" → "${mapped}"`);

    if (COMMIT) {
      batch.update(docSnap.ref, { tier: mapped });
      pending++;
      if (pending >= batchLimit) {
        await batch.commit();
        batch = db.batch();
        pending = 0;
      }
    }
  }

  if (COMMIT && pending > 0) await batch.commit();

  console.log("\n----------------------------------------");
  console.log(`Scanned:          ${scanned}`);
  console.log(`Migrated:         ${toMigrate}${COMMIT ? "" : " (dry run — not written)"}`);
  console.log(`Already app id:   ${alreadyAppId}`);
  console.log(`No tier:          ${noTier}`);
  console.log(`Unknown tier:     ${unknown}`);
  console.log("----------------------------------------\n");
  if (!COMMIT && toMigrate > 0) {
    console.log("Re-run with --commit to apply these changes.\n");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\nFAILED:", err.message);
    process.exit(1);
  });
