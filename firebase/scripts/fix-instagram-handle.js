/**
 * One-time fix: admins/{uid}.instagramUrl  legacy "shreybeast" handle
 *  correct "shreyfitness" handle.
 *
 * Why: an old Instagram handle (shreybeast) was saved on the trainer/admin
 * profile doc(s) in Firestore. The app now uses @shreyfitness. Code-level
 * defaults only apply to EMPTY fields, so any doc that already stored the old
 * value must be rewritten here.
 *
 * Idempotent: docs already holding the correct handle (or with no matching
 * value) are skipped.
 *
 * Usage (from repo root or firebase/):
 *   # dry run (default)  prints what WOULD change, writes nothing
 *   node firebase/scripts/fix-instagram-handle.js
 *   # commit the changes
 *   node firebase/scripts/fix-instagram-handle.js --commit
 *
 * Auth: uses Application Default Credentials. Either run with
 *   GOOGLE_APPLICATION_CREDENTIALS=<service-account.json>
 * or `gcloud auth application-default login`. Set the project with
 * GCLOUD_PROJECT=shreyfitweb if not already configured.
 */

const admin = require("firebase-admin");

// Prefer an explicit service-account key if it exists; else fall back to ADC.
let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}

const OLD_HANDLE = "shreybeast";
const NEW_URL = "https://www.instagram.com/shreyfitness";
const COMMIT = process.argv.includes("--commit");

async function main() {
  admin.initializeApp(
    serviceAccount ? { credential: admin.credential.cert(serviceAccount) } : undefined
  );
  const db = admin.firestore();

  const snap = await db.collection("admins").get();
  let matched = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const url = data.instagramUrl;
    if (typeof url === "string" && url.toLowerCase().includes(OLD_HANDLE)) {
      matched++;
      console.log(`[match] admins/${doc.id}: "${url}"  "${NEW_URL}"`);
      if (COMMIT) {
        await doc.ref.update({ instagramUrl: NEW_URL });
        updated++;
      }
    }
  }

  console.log(
    `\nDone. ${matched} doc(s) matched "${OLD_HANDLE}".` +
      (COMMIT ? ` ${updated} updated.` : " Dry run  no writes. Re-run with --commit to apply.")
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
