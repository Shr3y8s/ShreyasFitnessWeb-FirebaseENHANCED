/**
 * Bulk test-account cleanup.
 *
 * Deletes test/dev accounts in bulk by reusing the SAME provider-neutral deletion
 * path as the admin UI: firebase/functions/account-deletion.js → performAccountDeletion().
 * That helper writes the deleted_accounts + audit_logs records and (fail-soft) cancels
 * PayPal subscriptions / refunds credits, so a pure test account with no billing wipes
 * cleanly even without PayPal secrets bound.
 *
 * SAFETY:
 *   - DRY RUN by default. Pass --commit to actually delete.
 *   - REFUSES to run with no filter (so you can't nuke the whole users collection).
 *   - Caps the batch with --limit (default 50). Prints the matched uid+email list first.
 *
 * Filters (combinable; an account must match ALL provided filters):
 *   --email-regex=<re>          match users whose email matches this JS regex (case-insensitive)
 *   --unactivated               only users with accountActivated === false
 *   --created-before=YYYY-MM-DD only users created strictly before this date
 *
 * Options:
 *   --mode=no-traces|gdpr-clean (default: no-traces)
 *   --limit=<n>                 max accounts to act on (default: 50)
 *   --paypal-env=production|sandbox  cfg selector for cancel/refund (default: env or production)
 *   --reason="..."              audit reason (default: "Bulk test-account cleanup")
 *   --commit                    actually perform the deletion (omit for dry run)
 *
 * Verification (read-only, never deletes):
 *   --scan-uid=<uid>            run the orphan scan for ONE uid and exit. Iterates
 *                               the SAME CLIENT_DATA_REGISTRY the deletion uses and
 *                               reports any location with leftover data. Use AFTER a
 *                               deletion to prove nothing was orphaned, or against any
 *                               account to spot coverage gaps. Ignores all filters/--commit.
 *     node firebase/scripts/bulk-delete-test-accounts.js --scan-uid=abc123

 *
 * Usage (from repo root or firebase/):
 *   # dry run — list everything that WOULD be deleted, write nothing
 *   node firebase/scripts/bulk-delete-test-accounts.js --email-regex="@example\.com$"
 *   # commit
 *   node firebase/scripts/bulk-delete-test-accounts.js --email-regex="@example\.com$" --commit
 *   # unactivated accounts created before a date
 *   node firebase/scripts/bulk-delete-test-accounts.js --unactivated --created-before=2026-01-01 --commit
 *
 * Auth: prefers an explicit service-account key at repo root (service-account-key.json),
 * else falls back to Application Default Credentials. Set GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT
 * (e.g. shreyfitweb) if ADC needs the project. PayPal creds (for cancel/refund) come from env:
 *   PAYPAL_CLIENT_ID_LIVE / PAYPAL_CLIENT_SECRET_LIVE (or *_SANDBOX). Missing → cancel/refund
 *   no-op (fail-soft); fine for pure test accounts.
 */

const admin = require("firebase-admin");

// ── CLI parsing ─────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
function getFlag(name) {
  return argv.includes(`--${name}`);
}
function getOpt(name, fallback = undefined) {
  const prefix = `--${name}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const COMMIT = getFlag("commit");
const MODE = getOpt("mode", "no-traces");
const LIMIT = parseInt(getOpt("limit", "50"), 10);
const REASON = getOpt("reason", "Bulk test-account cleanup");
const PAYPAL_ENV = getOpt("paypal-env", process.env.NEXT_PUBLIC_PAYPAL_ENV || "production");

const EMAIL_REGEX_RAW = getOpt("email-regex");
const ONLY_UNACTIVATED = getFlag("unactivated");
const CREATED_BEFORE_RAW = getOpt("created-before");
const SCAN_UID = getOpt("scan-uid");

// ── Validation ──────────────────────────────────────────────────────────────
// --scan-uid is a read-only verification path; it bypasses mode/filter checks.
if (!SCAN_UID && !["no-traces", "gdpr-clean"].includes(MODE)) {
  console.error(`ERROR: --mode must be 'no-traces' or 'gdpr-clean' (got '${MODE}')`);
  process.exit(1);
}

const hasAnyFilter = !!EMAIL_REGEX_RAW || ONLY_UNACTIVATED || !!CREATED_BEFORE_RAW;
if (!SCAN_UID && !hasAnyFilter) {

  console.error(
      "ERROR: refusing to run with NO filter. Provide at least one of:\n" +
      "  --email-regex=<re>   --unactivated   --created-before=YYYY-MM-DD"
  );
  process.exit(1);
}

let emailRegex = null;
if (EMAIL_REGEX_RAW) {
  try {
    emailRegex = new RegExp(EMAIL_REGEX_RAW, "i");
  } catch (e) {
    console.error(`ERROR: invalid --email-regex: ${e.message}`);
    process.exit(1);
  }
}

let createdBefore = null;
if (CREATED_BEFORE_RAW) {
  const d = new Date(CREATED_BEFORE_RAW + "T00:00:00Z");
  if (isNaN(d.getTime())) {
    console.error(`ERROR: invalid --created-before (expected YYYY-MM-DD): ${CREATED_BEFORE_RAW}`);
    process.exit(1);
  }
  createdBefore = d;
}

if (isNaN(LIMIT) || LIMIT < 1) {
  console.error(`ERROR: invalid --limit: ${getOpt("limit")}`);
  process.exit(1);
}

// ── Auth ──────────────────────────────────────────────────────────────────────
let serviceAccount = null;
try {
  serviceAccount = require("../../service-account-key.json");
} catch {
  serviceAccount = null;
}

// Make PayPal env vars available to the helper's resolvePaypalCfg (which reads
// process.env.NEXT_PUBLIC_PAYPAL_ENV by default). The script flag wins.
process.env.NEXT_PUBLIC_PAYPAL_ENV = PAYPAL_ENV;

/** Convert a Firestore createdAt (Timestamp | Date | string) into a Date, or null. */
function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  admin.initializeApp(
      serviceAccount ? {credential: admin.credential.cert(serviceAccount)} : undefined
  );

  // Require the helper AFTER admin.initializeApp() — it calls admin.firestore() etc.
  const {performAccountDeletion, scanClientData} = require("../functions/account-deletion");

  const db = admin.firestore();

  // ── SCAN MODE (read-only verification) ──────────────────────────────────────
  if (SCAN_UID) {
    console.log(`\n=== Orphan scan for uid: ${SCAN_UID} (read-only) ===\n`);
    const result = await scanClientData(SCAN_UID);
    if (result.findings.length === 0) {
      console.log("✓ No client data found — account is fully clean.\n");
      return;
    }
    console.log(`Found ${result.findings.length} location(s) with data:\n`);
    for (const f of result.findings) {
      const count = f.count === -1 ? "ERROR" : f.count;
      const extra = f.gdprDeleted !== undefined ? ` (gdprDeleted: ${f.gdprDeleted})` : "";
      const err = f.error ? ` — ${f.error}` : "";
      console.log(`  • ${String(count).padStart(5)}  ${f.name}  [${f.location}]${extra}${err}`);
    }
    console.log(
        `\n${result.hasOrphans ? "⚠️  Leftover data present." : "No orphans."} ` +
        "Note: gdpr-clean intentionally PRESERVES business records (workouts, plans, " +
        "sessions, goals, billing_customers, anonymized user doc), so findings are " +
        "expected after a gdpr-clean deletion; they should be ZERO after no-traces.\n"
    );
    return;
  }

  console.log("\n=== Bulk test-account cleanup ===");

  console.log(`Mode:           ${MODE}`);
  console.log(`Run:            ${COMMIT ? "COMMIT (will delete)" : "DRY RUN (no writes)"}`);
  console.log(`Limit:          ${LIMIT}`);
  console.log(`PayPal env:     ${PAYPAL_ENV}`);
  console.log("Filters:");
  if (emailRegex) console.log(`  - email matches /${EMAIL_REGEX_RAW}/i`);
  if (ONLY_UNACTIVATED) console.log("  - accountActivated === false");
  if (createdBefore) console.log(`  - createdAt < ${createdBefore.toISOString()}`);
  console.log("");

  // Pull users. Use the cheapest server-side filter we can, then refine in JS.
  let query = db.collection("users");
  if (ONLY_UNACTIVATED) {
    query = query.where("accountActivated", "==", false);
  }
  const snap = await query.get();

  const matched = [];
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const email = data.email || "";

    if (emailRegex && !emailRegex.test(email)) continue;

    if (createdBefore) {
      const created = toDate(data.createdAt);
      if (!created || created >= createdBefore) continue;
    }

    matched.push({uid: doc.id, email, accountActivated: data.accountActivated === true});
    if (matched.length >= LIMIT) break;
  }

  console.log(`Matched ${matched.length} account(s) (capped at ${LIMIT}):\n`);
  matched.forEach((m, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. ${m.uid}  ${m.email || "(no email)"}${m.accountActivated ? "" : "  [unactivated]"}`);
  });
  console.log("");

  if (matched.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (!COMMIT) {
    console.log("DRY RUN complete — no data was deleted. Re-run with --commit to act.\n");
    return;
  }

  console.log(`Committing ${MODE} deletion for ${matched.length} account(s)...\n`);
  let ok = 0;
  let failed = 0;
  for (const m of matched) {
    try {
      const result = await performAccountDeletion({
        targetUserId: m.uid,
        mode: MODE,
        adminOverride: true, // bulk cleanup bypasses the upcoming-session guard
        performedBy: "bulk-delete-script",
        reason: REASON,
        creditsToRefund: 0, // never auto-refund in bulk test cleanup
        paypalEnv: PAYPAL_ENV,
      });
      ok++;
      console.log(`  ✓ ${m.uid} (${m.email}) — ${result?.summary?.totalItemsDeleted ?? 0} items`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${m.uid} (${m.email}) — ${e.message}`);
    }
  }

  console.log(`\nDone. Succeeded: ${ok}, Failed: ${failed}\n`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("\nFATAL:", e.message);
      process.exit(1);
    });
