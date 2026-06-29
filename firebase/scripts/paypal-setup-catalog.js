/**
 * PayPal catalog setup — reusable for BOTH sandbox and live.
 *
 * Creates the recurring Catalog Products + 2 base Billing Plans for the two
 * subscription tiers (Online Coaching $200/mo, Complete Transformation $250/mo —
 * NO setup fee). Prints the resulting PROD-/P- IDs to paste into
 * `app/src/lib/constants.ts` (base maps) and to seed the `paypalPlans` registry.
 *
 *   2-CYCLE base plans (subscription-discounts-2cycle-handoff.md): each base plan
 *   is minted as TWO billing cycles —
 *     - seq 1  TRIAL   ×1   at the regular monthly price
 *     - seq 2  REGULAR (∞)  at the regular monthly price
 *   A no-discount subscriber therefore pays the regular price every month (the
 *   TRIAL phase is just a normal first month at full price). This 2-cycle shape is
 *   REQUIRED so per-subscriber discounts can be applied as a create-time
 *   `plan.billing_cycles` override (buildPriceOverride): an override can only
 *   REPRICE cycles that already exist, never ADD one. With both cycles present:
 *     - intro discount     → override reprices seq 1 (TRIAL) only; seq 2 reverts.
 *     - recurring discount → override reprices seq 1 + seq 2.
 *   This retires the old "22-plan" model (2 base + 20 pre-minted discounted plans).
 *
 * One-time items (single session $75, 4-pack $240, and the $60 CT-member session) do
 * NOT need catalog entries — they are charged via the Orders API at checkout, so they
 * live only as amounts in constants (`PAYPAL_ONETIME`). The CT $60 setup fee is REMOVED
 * (CT's in-person sessions are now bought post-signup at the $60 member rate).
 *
 * Secrets are read from ENV — never hard-code them:
 *
 *   # sandbox (dev)
 *   set PAYPAL_ENV=sandbox
 *   set PAYPAL_CLIENT_ID=...        (sandbox client id)
 *   set PAYPAL_SECRET=...           (sandbox secret)
 *   node firebase/scripts/paypal-setup-catalog.js
 *
 *   # live (cutover) — run with the LIVE app's credentials
 *   set PAYPAL_ENV=production
 *   set PAYPAL_CLIENT_ID=...        (live client id)
 *   set PAYPAL_SECRET=...           (live secret)
 *   node firebase/scripts/paypal-setup-catalog.js
 *
 *   # deactivate retired base plans (after cutover), comma-separated:
 *   node firebase/scripts/paypal-setup-catalog.js --deactivate-old P-OLDOC,P-OLDCT
 *
 * Idempotency: PayPal does not dedupe by name, so re-running creates new
 * products/plans. Run ONCE per environment and record the printed IDs.
 *
 * Docs: docs/02-implementation/payment-processor/subscription-discounts-2cycle-handoff.md
 */

const https = require("https");

const ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;
const BASE = ENV === "production" ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";

// Optional: create only one tier, e.g. ONLY=COMPLETE_TRANSFORMATION (so a re-run
// doesn't duplicate a tier that already succeeded).
const ONLY = (process.env.ONLY || "").toUpperCase();

// PayPal product `description` max length. Catalog metadata only (the full marketing
// copy lives in the app), so trimming here has no user-facing impact on shrey.fit.
const PAYPAL_DESC_MAX = 256;

const TIERS = [
  {
    key: "ONLINE_COACHING",
    short: "OC",
    name: "Online Coaching",
    tierId: "online_coaching",
    description:
      "Complete transformation system with monthly custom training programs, personalized nutrition coaching, unlimited messaging support, weekly progress check-ins, video form analysis, and habit & accountability coaching.",
    monthly: "200.00", // $200/mo
  },
  {
    key: "COMPLETE_TRANSFORMATION",
    short: "CT",
    name: "Complete Transformation",
    tierId: "complete_transformation",
    description:
      "Premium fitness experience combining comprehensive online coaching with hands-on personal training. Includes all online coaching benefits plus discounted in-person training sessions ($60/session for members). Online coaching available worldwide; in-person sessions in Seattle area only.",
    monthly: "250.00", // $250/mo — NO setup fee
  },
];

function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (data) headers["Content-Length"] = Buffer.byteLength(data);

    const req = https.request({ hostname: BASE, path, method, headers }, (res) => {
      let chunks = "";
      res.on("data", (c) => (chunks += c));
      res.on("end", () => {
        let parsed = {};
        try { parsed = chunks ? JSON.parse(chunks) : {}; } catch { parsed = { raw: chunks }; }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
        else reject(new Error(`${method} ${path} → ${res.statusCode}: ${chunks}`));
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64");
    const body = "grant_type=client_credentials";
    const req = https.request(
      {
        hostname: BASE,
        path: "/v1/oauth2/token",
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let chunks = "";
        res.on("data", (c) => (chunks += c));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(chunks);
            if (parsed.access_token) resolve(parsed.access_token);
            else reject(new Error(`Token error: ${chunks}`));
          } catch (e) {
            reject(new Error(`Token parse error: ${chunks}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function createProduct(token, tier) {
  // PayPal caps product description at 256 chars; trim safely (catalog metadata only).
  let description = tier.description;
  if (description.length > PAYPAL_DESC_MAX) {
    description = description.slice(0, PAYPAL_DESC_MAX - 1).trimEnd() + "…";
    console.log(`  (description trimmed to ${PAYPAL_DESC_MAX} chars for PayPal)`);
  }
  const product = await request("POST", "/v1/catalogs/products", token, {
    name: tier.name,
    description,
    type: "SERVICE",
    category: "EXERCISE_AND_FITNESS",
  });
  return product.id; // PROD-xxxx
}

const PAYMENT_PREFS = {
  auto_bill_outstanding: true,
  setup_fee_failure_action: "CANCEL",
  payment_failure_threshold: 1,
};

/**
 * BASE plan (2-cycle): seq 1 TRIAL ×1 + seq 2 REGULAR (∞), BOTH at the regular
 * monthly price. The two cycles exist so a per-subscriber create-time override can
 * reprice them for discounts (intro = seq 1 only; recurring = both). A no-discount
 * subscriber pays the regular price every month. NO setup fee.
 * Sandbox-validated 2026-06-27 (paypal-validate-revise-pricing.js --mint2cycle).
 */
async function createBasePlan(token, productId, tier) {
  const freq = { interval_unit: "MONTH", interval_count: 1 };
  const price = { fixed_price: { value: tier.monthly, currency_code: "USD" } };
  const plan = await request("POST", "/v1/billing/plans", token, {
    product_id: productId,
    name: `${tier.name} Monthly`,
    description: `${tier.name} — $${tier.monthly}/month`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: freq,
        tenure_type: "TRIAL",
        sequence: 1,
        total_cycles: 1, // first month at the regular price (repriceable for intro discounts)
        pricing_scheme: price,
      },
      {
        frequency: freq,
        tenure_type: "REGULAR",
        sequence: 2,
        total_cycles: 0, // infinite until canceled
        pricing_scheme: price,
      },
    ],
    payment_preferences: PAYMENT_PREFS,
  });
  return plan.id; // P-xxxx
}

/** Deactivate retired plans so no new subscription can be created against them. */
async function deactivatePlans(token, planIds) {
  for (const id of planIds) {
    try {
      await request("POST", `/v1/billing/plans/${id}/deactivate`, token, {});
      console.log(`  ✓ deactivated ${id}`);
    } catch (e) {
      console.error(`  ✗ failed to deactivate ${id}: ${e.message}`);
    }
  }
}

async function main() {
  if (!CLIENT_ID || !SECRET) {
    console.error(
      "ERROR: set PAYPAL_CLIENT_ID and PAYPAL_SECRET env vars (and optionally PAYPAL_ENV=sandbox|production)."
    );
    process.exit(1);
  }

  console.log(`\nPayPal catalog setup — ENV=${ENV} (${BASE})\n`);
  const token = await getToken();
  console.log("✓ OAuth token acquired\n");

  // --deactivate-old P-AAA,P-BBB : deactivate retired plans and exit.
  const deactivateArg = process.argv.find((a) => a.startsWith("--deactivate-old"));
  if (deactivateArg) {
    const inline = deactivateArg.includes("=") ? deactivateArg.split("=")[1] : process.argv[process.argv.indexOf(deactivateArg) + 1];
    const ids = String(inline || "").split(",").map((s) => s.trim()).filter(Boolean);
    if (!ids.length) {
      console.error("ERROR: --deactivate-old requires a comma-separated list of plan ids.");
      process.exit(1);
    }
    console.log(`Deactivating ${ids.length} retired plan(s)...`);
    await deactivatePlans(token, ids);
    console.log("\nDone.\n");
    return;
  }

  const tiersToCreate = ONLY ? TIERS.filter((t) => t.key === ONLY) : TIERS;
  if (ONLY && tiersToCreate.length === 0) {
    console.error(`ERROR: ONLY='${ONLY}' did not match any tier. Valid: ${TIERS.map((t) => t.key).join(", ")}`);
    process.exit(1);
  }
  if (ONLY) console.log(`(ONLY=${ONLY} — creating just this tier)\n`);

  // Collected results, keyed for a paste-ready constants block + registry seed.
  const baseIds = {};   // { ONLINE_COACHING: 'P-...', COMPLETE_TRANSFORMATION: 'P-...' }
  const productIds = {};

  for (const tier of tiersToCreate) {
    console.log(`Creating product: ${tier.name} ...`);
    const productId = await createProduct(token, tier);
    productIds[tier.key] = productId;
    console.log(`  product id: ${productId}`);

    console.log(`Creating 2-CYCLE base plan: ${tier.name} Monthly ($${tier.monthly}/mo) ...`);
    baseIds[tier.key] = await createBasePlan(token, productId, tier);
    console.log(`  plan id:    ${baseIds[tier.key]}`);
    console.log("");
  }

  const mapName = ENV === "production" ? "LIVE_PLANS" : "SANDBOX_PLANS";

  console.log("==================================================================");
  console.log(`Paste into app/src/lib/constants.ts — ${mapName}:\n`);
  console.log(`const ${mapName} = {`);
  for (const [key, v] of Object.entries(baseIds)) {
    console.log(`  ${key}: '${v}',  // product ${productIds[key]}`);
  }
  console.log("};\n");

  console.log("Also update firebase/functions/payments/providers/paypal.js PLAN_TIER_MAP");
  console.log("and seed the paypalPlans registry (firebase/scripts/seed-paypal-plans.js):");
  for (const tier of tiersToCreate) {
    console.log(`  ${baseIds[tier.key]} → { tierId: '${tier.tierId}', tierName: '${tier.name}', amountMinor: ${Math.round(parseFloat(tier.monthly) * 100)} }`);
  }
  console.log("==================================================================\n");
  console.log("One-time amounts (Orders API, no plan needed — set in PAYPAL_ONETIME):");
  console.log("  In-Person Training Session (public):  $75  (IN_PERSON)");
  console.log("  4-Pack In-Person Sessions (public):   $240 (IN_PERSON_4PACK)");

  console.log("Reminder: after recording ids, deactivate the OLD base plans:");
  console.log("  node firebase/scripts/paypal-setup-catalog.js --deactivate-old <oldOC>,<oldCT>\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
