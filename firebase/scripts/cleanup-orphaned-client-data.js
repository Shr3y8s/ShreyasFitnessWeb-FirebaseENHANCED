/**
 * Orphan sweep: delete client-owned data whose owning user no longer exists.
 *
 * Per-user deletion (performAccountDeletion) only visits uids that still have a
 * `users/{uid}` doc. Users removed OUTSIDE the engine (e.g. Firebase console) left
 * their side-collection data unreferenced and unvisited. This script finds and
 * deletes that orphaned data by scanning each collection directly and checking the
 * owning id against `users/{uid}` existence (cached).
 *
 * SAFETY:
 *   - DRY RUN by default. Pass --commit to actually delete.
 *   - Only deletes docs whose owning id has NO `users/{uid}` doc (orphans).
 *   - Never matches broadcast sentinels (clientId/recipientId === "all").
 *   - Skips the audit collections (deleted_accounts, audit_logs) entirely.
 *
 * Options:
 *   --commit              actually delete (omit for dry run)
 *   --collection=<name>   scope to ONE collection key from TARGETS below
 *   --limit=<n>           cap console output lines (default 50)
 *
 * Targets (collection → owning field). Mirrors CLIENT_DATA_REGISTRY field fixes:
 *   client_messages       senderId | recipientId   (queryOr)
 *   sessions              clientId
 *   workouts              clientId
 *   clientPlans           clientId
 *   goals                 clientId
 *   notifications         userId
 *   login_history         userId
 *   progressPhotos        userId
 *   clientNotifications   clientId (exclude "all")
 *   clientTasks           clientId (exclude "all")
 *   clientReminders       clientId (exclude "all")
 *   weeklySurveys         docId == uid (+ responses subcollection)
 *   nutritionLogs         docId == uid
 *   clientStats           docId == uid
 *   dailyActivities       docId prefix {uid}_
 *   billing_customers     docId == uid (+ subscriptions/transactions)
 *   stripe_customers      docId == uid (+ subscriptions/payments/checkout_sessions)
 *
 * Auth: repo-root service-account-key.json else ADC. storageBucket set so any
 * future storage sweeps resolve. Run from repo root or firebase/.
 *
 *   node firebase/scripts/cleanup-orphaned-client-data.js                 # dry run
 *   node firebase/scripts/cleanup-orphaned-client-data.js --commit        # apply
 *   node firebase/scripts/cleanup-orphaned-client-data.js --collection=client_messages
 */

const path = require("path");
const admin = require(require.resolve("firebase-admin", {
  paths: [path.join(__dirname, "..", "functions")],
}));

const argv = process.argv.slice(2);
const COMMIT = argv.includes("--commit");
function getOpt(name, fallback) {
  const prefix = `--${name}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}
const ONLY_COLLECTION = getOpt("collection", null);
const LIMIT_RAW = getOpt("limit", "50");
const LIMIT = parseInt(LIMIT_RAW, 10);
if (isNaN(LIMIT) || LIMIT < 1) {
  console.error(`ERROR: invalid --limit: ${LIMIT_RAW}`);
  process.exit(1);
}

const STORAGE_BUCKET = (
  getOpt("storage-bucket") ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  "shreyfitweb.firebasestorage.app"
).replace(/^gs:\/\//, "");

let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}

const BROADCAST = new Set(["all"]);

// kind: "field" (top-level docs owned by one field), "fieldOr" (any of fields),
//       "docId" (doc id IS the uid), "docIdPrefix" ({uid}_...), with optional
//       `subcollections` to delete first for docId kinds.
const TARGETS = [
  // activityFeed self-expires (7-day TTL) but orphans can linger up to a week; sweep clears now.
  {key: "activityFeed", kind: "field", collection: "activityFeed", field: "clientId"},
  {key: "client_messages", kind: "fieldOr", collection: "client_messages", fields: ["senderId", "recipientId"]},

  {key: "sessions", kind: "field", collection: "sessions", field: "clientId"},
  {key: "workouts", kind: "field", collection: "workouts", field: "clientId"},
  {key: "clientPlans", kind: "field", collection: "clientPlans", field: "clientId"},
  {key: "goals", kind: "field", collection: "goals", field: "clientId"},
  {key: "notifications", kind: "field", collection: "notifications", field: "userId"},
  {key: "login_history", kind: "field", collection: "login_history", field: "userId"},
  {key: "progressPhotos", kind: "field", collection: "progressPhotos", field: "userId"},
  {key: "clientNotifications", kind: "field", collection: "clientNotifications", field: "clientId", excludeBroadcast: true},
  {key: "clientTasks", kind: "field", collection: "clientTasks", field: "clientId", excludeBroadcast: true},
  {key: "clientReminders", kind: "field", collection: "clientReminders", field: "clientId", excludeBroadcast: true},
  {key: "clientStats", kind: "docId", collection: "clientStats"},
  {key: "weeklySurveys", kind: "docId", collection: "weeklySurveys", subcollections: ["responses"]},
  {key: "nutritionLogs", kind: "docId", collection: "nutritionLogs", subcollections: ["mealPlans", "meals", "habits", "coachNotes"]},
  {key: "dailyActivities", kind: "docIdPrefix", collection: "dailyActivities"},
  {key: "billing_customers", kind: "docId", collection: "billing_customers", subcollections: ["subscriptions", "transactions"]},
  {key: "stripe_customers", kind: "docId", collection: "stripe_customers", subcollections: ["subscriptions", "payments", "checkout_sessions"]},
];

// Cache users/{uid} existence to avoid repeated reads.
const userExistsCache = new Map();
async function userExists(db, uid) {
  if (!uid || BROADCAST.has(uid)) return true; // treat sentinel as "exists" → never orphan
  if (userExistsCache.has(uid)) return userExistsCache.get(uid);
  const snap = await db.collection("users").doc(uid).get();
  userExistsCache.set(uid, snap.exists);
  return snap.exists;
}

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

/** Extract the owning uid for a doc under a "field"/"fieldOr" target. */
function owningUid(target, data) {
  if (target.kind === "fieldOr") {
    for (const f of target.fields) if (data[f]) return data[f];
    return null;
  }
  return data[target.field];
}

async function sweepFieldTarget(db, target) {
  console.log(`\n=== ${target.collection} — orphan sweep (${target.kind}) ===`);
  const snap = await db.collection(target.collection).get();
  let scanned = 0;
  let orphaned = 0;
  let printed = 0;
  const toDelete = [];

  for (const doc of snap.docs) {
    scanned++;
    const data = doc.data() || {};
    const uid = owningUid(target, data);
    if (target.excludeBroadcast && BROADCAST.has(uid)) continue;
    if (!uid) continue; // no owning field → leave alone (not clearly client-owned)
    if (await userExists(db, uid)) continue; // owner still exists → keep
    orphaned++;
    toDelete.push(doc);
    if (printed < LIMIT) {
      console.log(`  • orphan ${doc.id} (owner ${uid} missing)`);
      printed++;
    }
  }

  let deleted = 0;
  if (COMMIT && toDelete.length) deleted = await deleteDocsChunked(db, toDelete);
  console.log(`  scanned=${scanned} orphaned=${orphaned}${COMMIT ? ` deleted=${deleted}` : ""}`);
  return {scanned, orphaned, deleted};
}

async function sweepDocIdTarget(db, target) {
  console.log(`\n=== ${target.collection} — orphan sweep (docId == uid) ===`);
  const snap = await db.collection(target.collection).get();
  let scanned = 0;
  let orphaned = 0;
  let subItems = 0;
  let printed = 0;

  for (const doc of snap.docs) {
    scanned++;
    const uid = doc.id;
    if (await userExists(db, uid)) continue;
    orphaned++;
    if (printed < LIMIT) {
      console.log(`  • orphan ${target.collection}/${uid} (user missing)`);
      printed++;
    }
    if (COMMIT) {
      for (const sub of target.subcollections || []) {
        const subSnap = await doc.ref.collection(sub).get();
        subItems += await deleteDocsChunked(db, subSnap.docs);
      }
      await doc.ref.delete();
    }
  }
  console.log(`  scanned=${scanned} orphaned=${orphaned}${COMMIT ? ` deleted=${orphaned} (+${subItems} sub-items)` : ""}`);
  return {scanned, orphaned};
}

async function sweepDocIdPrefixTarget(db, target) {
  console.log(`\n=== ${target.collection} — orphan sweep (docId prefix {uid}_) ===`);
  const snap = await db.collection(target.collection).get();
  let scanned = 0;
  let orphaned = 0;
  let printed = 0;
  const toDelete = [];

  for (const doc of snap.docs) {
    scanned++;
    const uid = String(doc.id).split("_")[0];
    if (!uid) continue;
    if (await userExists(db, uid)) continue;
    orphaned++;
    toDelete.push(doc);
    if (printed < LIMIT) {
      console.log(`  • orphan ${doc.id} (owner ${uid} missing)`);
      printed++;
    }
  }
  let deleted = 0;
  if (COMMIT && toDelete.length) deleted = await deleteDocsChunked(db, toDelete);
  console.log(`  scanned=${scanned} orphaned=${orphaned}${COMMIT ? ` deleted=${deleted}` : ""}`);
  return {scanned, orphaned, deleted};
}

async function main() {
  admin.initializeApp({
    ...(serviceAccount ? {credential: admin.credential.cert(serviceAccount)} : {}),
    storageBucket: STORAGE_BUCKET,
  });
  const db = admin.firestore();

  console.log(`\nOrphaned client-data sweep — mode: ${COMMIT ? "COMMIT" : "DRY RUN"}`);
  if (ONLY_COLLECTION) console.log(`  (scoped to collection: ${ONLY_COLLECTION})`);

  const targets = ONLY_COLLECTION
    ? TARGETS.filter((t) => t.key === ONLY_COLLECTION)
    : TARGETS;
  if (ONLY_COLLECTION && targets.length === 0) {
    console.error(`ERROR: unknown --collection=${ONLY_COLLECTION}. Valid: ${TARGETS.map((t) => t.key).join(", ")}`);
    process.exit(1);
  }

  let totalOrphaned = 0;
  for (const target of targets) {
    let res;
    if (target.kind === "docId") res = await sweepDocIdTarget(db, target);
    else if (target.kind === "docIdPrefix") res = await sweepDocIdPrefixTarget(db, target);
    else res = await sweepFieldTarget(db, target);
    totalOrphaned += res.orphaned;
  }

  console.log(
      `\nDone. Total orphaned docs ${COMMIT ? "deleted" : "found"}: ${totalOrphaned}` +
      (COMMIT ? "" : " (dry run — nothing written; re-run with --commit)") + "\n"
  );
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("\nFAILED:", err.message);
      process.exit(1);
    });
