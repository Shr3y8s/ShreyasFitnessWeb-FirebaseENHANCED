/**
 * Seed the Firestore `paypalPlans` registry (subscription-management FR-1/FR-4).
 *
 * Plan ids are migrating OUT of source code into Firestore so the webhook
 * (`resolvePlanTierAsync`) and the admin "Manage Subscriptions" console can resolve
 * plan → tier for runtime-created/repriced plans without a redeploy. This script
 * upserts the KNOWN base plan ids (the entries in paypal.js PLAN_TIER_MAP — one
 * 2-cycle base plan per tier, per env) into `paypalPlans/{planId}`. Idempotent
 * (merge); safe to re-run.
 *
 * The catalog script (paypal-setup-catalog.js) ALSO upserts each base plan it mints,
 * so after a fresh catalog run the registry is fully populated. This seed exists to
 * (a) backfill the existing base ids and (b) give a standalone way to (re)seed
 * without re-minting plans. (Subscription discounts no longer use separate discounted
 * plans — they apply a per-subscriber billing-cycle override at checkout.)
 *
 * SAFETY: DRY RUN by default — prints what it WOULD write. Pass --commit to write.
 *
 * Usage (from repo root or firebase/):
 *   node firebase/scripts/seed-paypal-plans.js              # dry run
 *   node firebase/scripts/seed-paypal-plans.js --commit     # write
 *
 * Auth: resolves firebase-admin from the FUNCTIONS dir (shared instance) and uses
 * Application Default Credentials (or a repo-root service-account-key.json). Set
 * GCLOUD_PROJECT / GOOGLE_CLOUD_PROJECT if ADC needs the project.
 *
 * Docs: docs/02-implementation/payment-processor/subscription-management-design.md §2
 */

const path = require("path");
const admin = require(require.resolve("firebase-admin", {
  paths: [path.join(__dirname, "..", "functions")],
}));

const COMMIT = process.argv.slice(2).includes("--commit");

// The known base plans (mirrors PLAN_TIER_MAP in
// firebase/functions/payments/providers/paypal.js). `env` is informational — plan
// ids are globally unique so the registry is env-agnostic for lookup.
const BASE_PLANS = [
  {
    // 2-cycle base plan (TRIAL seq1 + REGULAR seq2), minted 2026-06-27.
    planId: "P-1UL86855135904642NJAFK4I",
    productId: "PROD-51P94209CF452694B",
    tierId: "online_coaching",
    tierName: "Online Coaching",
    env: "sandbox",
    amountMinor: 20000,
    name: "Online Coaching Monthly",
  },
  {
    // 2-cycle base plan (TRIAL seq1 + REGULAR seq2), minted 2026-06-27.
    planId: "P-28C55086862794508NJAFK4I",
    productId: "PROD-5D236001YV287835G",
    tierId: "complete_transformation",
    tierName: "Complete Transformation",
    env: "sandbox",
    amountMinor: 25000,
    name: "Complete Transformation Monthly",
  },

  {
    // 2-cycle base plan (TRIAL seq1 + REGULAR seq2), re-minted 2026-06-28.
    planId: "P-4EM46614UA100974ENJA7U3A",
    productId: "PROD-8A5246863N608771L",
    tierId: "online_coaching",
    tierName: "Online Coaching",
    env: "production",
    amountMinor: 20000,
    name: "Online Coaching Monthly",
  },
  {
    // 2-cycle base plan (TRIAL seq1 + REGULAR seq2), re-minted 2026-06-28.
    planId: "P-8D877538ML425510RNJA7U3I",
    productId: "PROD-0YA71868YT116171P",
    tierId: "complete_transformation",
    tierName: "Complete Transformation",
    env: "production",
    amountMinor: 25000,
    name: "Complete Transformation Monthly",
  },

  // ── QUARTERLY (3-month pre-pay) plans — prepay-plans Phase B ──────────────
  {
    // sandbox 2-cycle quarterly, minted 2026-06-29. $540/qtr (10% off $200×3).
    planId: "P-2TA612087A1042525NJBQTAA",
    productId: "PROD-51P94209CF452694B",
    tierId: "online_coaching",
    tierName: "Online Coaching",
    env: "sandbox",
    amountMinor: 54000,
    intervalCount: 3,
    name: "Online Coaching Quarterly",
  },
  {
    // sandbox 2-cycle quarterly, minted 2026-06-29. $675/qtr (10% off $250×3).
    planId: "P-0M212305WN6341942NJBQTAA",
    productId: "PROD-5D236001YV287835G",
    tierId: "complete_transformation",
    tierName: "Complete Transformation",
    env: "sandbox",
    amountMinor: 67500,
    intervalCount: 3,
    name: "Complete Transformation Quarterly",
  },
  {
    // live 2-cycle quarterly, minted 2026-07-04. $540/qtr (10% off $200×3).
    planId: "P-48720835E0191905HNJE4AXA",
    productId: "PROD-8A5246863N608771L",
    tierId: "online_coaching",
    tierName: "Online Coaching",
    env: "production",
    amountMinor: 54000,
    intervalCount: 3,
    name: "Online Coaching Quarterly",
  },
  {
    // live 2-cycle quarterly, minted 2026-07-04. $675/qtr (10% off $250×3).
    planId: "P-18941013R8532470FNJE4AXA",
    productId: "PROD-0YA71868YT116171P",
    tierId: "complete_transformation",
    tierName: "Complete Transformation",
    env: "production",
    amountMinor: 67500,
    intervalCount: 3,
    name: "Complete Transformation Quarterly",
  },
];


function planDoc(p) {
  return {
    planId: p.planId,
    productId: p.productId || null,
    tierId: p.tierId,
    tierName: p.tierName,
    amountMinor: p.amountMinor,
    // Billing cadence (prepay-plans): 1 = monthly (default), 3 = quarterly.
    intervalCount: p.intervalCount || 1,
    currency: "USD",
    status: "ACTIVE",
    env: p.env,
    name: p.name,

    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    // createdAt only on first write (merge won't overwrite an existing one if we
    // guard, but serverTimestamp on merge is fine for a seed/backfill).
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

async function main() {
  if (admin.apps.length === 0) admin.initializeApp();
  const db = admin.firestore();

  console.log(`\n=== Seed paypalPlans registry (${COMMIT ? "COMMIT" : "DRY RUN"}) ===`);
  for (const p of BASE_PLANS) {
    console.log(`  ${p.planId} → ${p.tierId} (${p.env}) $${(p.amountMinor / 100).toFixed(2)}`);
    if (COMMIT) {
      await db.collection("paypalPlans").doc(p.planId).set(planDoc(p), { merge: true });
    }
  }
  console.log(
    COMMIT
      ? `\n✅ Wrote ${BASE_PLANS.length} plan docs to paypalPlans.`
      : `\n(DRY RUN) Would write ${BASE_PLANS.length} plan docs. Re-run with --commit.`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error("seed-paypal-plans error:", e.message);
  process.exit(1);
});
