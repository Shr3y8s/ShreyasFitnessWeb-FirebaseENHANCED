/**
 * PayPal catalog setup — reusable for BOTH sandbox and live.
 *
 * Creates the recurring Catalog Products + Billing Plans for the two
 * subscription tiers, and prints the resulting PROD-/P- IDs to paste into
 * `app/src/lib/constants.ts` (SANDBOX_PLANS / LIVE_PLANS).
 *
 * One-time products (single session $75, 4-pack $240, and the Complete
 * Transformation $60 in-person session) do NOT need catalog entries — they are
 * charged via the Orders API at checkout. The CT $60 is modeled as a one-time
 * `setup_fee` on the CT subscription plan so signup charges $60 + $250/mo in a
 * single PayPal subscription approval.
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
 * Idempotency: PayPal does not dedupe by name, so re-running creates new
 * products/plans. Run once per environment and record the printed IDs. To avoid
 * accidental duplicates, the script prints existing plans for the products it
 * just created and exits non-zero if credentials are missing.
 *
 * Docs: docs/02-implementation/payment-processor/payment-processor-{design,tasks}.md
 */

const https = require("https");

const ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;
const BASE = ENV === "production" ? "api-m.paypal.com" : "api-m.sandbox.paypal.com";

// Optional: create only one tier, e.g. ONLY=COMPLETE_TRANSFORMATION (so a
// re-run doesn't duplicate a tier that already succeeded).
const ONLY = (process.env.ONLY || "").toUpperCase();

// PayPal product `description` max length. This is catalog metadata only (shown
// in some PayPal UIs) — the full marketing copy lives in the app
// (product-marketing.ts), so trimming here has no user-facing impact on shrey.fit.
const PAYPAL_DESC_MAX = 256;


// Descriptions are verbatim from the Stripe products (owner-confirmed).
const TIERS = [
  {
    key: "ONLINE_COACHING",
    name: "Online Coaching",
    description:
      "Complete transformation system with monthly custom training programs, personalized nutrition coaching, unlimited messaging support, weekly progress check-ins, video form analysis, and habit & accountability coaching.",
    monthly: "250.00",
    setupFee: "0.00",
  },
  {
    key: "COMPLETE_TRANSFORMATION",
    name: "Complete Transformation",
    description:
      "Premium fitness experience combining comprehensive online coaching with hands-on personal training. Includes all online coaching benefits plus in-person training sessions with expert guidance and form correction. Online coaching available worldwide; in-person sessions in Seattle area only.",
    monthly: "250.00",
    // CT charges a discounted in-person session ($60) once at signup, then
    // $250/mo. Modeled as a one-time setup_fee on the subscription plan.
    setupFee: "60.00",
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
  // PayPal caps product description at 256 chars; trim safely (catalog metadata
  // only — full marketing copy lives in the app).
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

async function createPlan(token, productId, tier) {
  const paymentPreferences = {
    auto_bill_outstanding: true,
    setup_fee_failure_action: "CANCEL",
    payment_failure_threshold: 1,
  };
  if (tier.setupFee && tier.setupFee !== "0.00") {
    paymentPreferences.setup_fee = { value: tier.setupFee, currency_code: "USD" };
  }

  const plan = await request("POST", "/v1/billing/plans", token, {
    product_id: productId,
    name: `${tier.name} Monthly`,
    description: `${tier.name} — $${tier.monthly}/month${
      tier.setupFee !== "0.00" ? ` + $${tier.setupFee} one-time` : ""
    }`,
    status: "ACTIVE",
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0, // infinite until canceled
        pricing_scheme: { fixed_price: { value: tier.monthly, currency_code: "USD" } },
      },
    ],
    payment_preferences: paymentPreferences,
  });
  return plan.id; // P-xxxx
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

  const tiersToCreate = ONLY ? TIERS.filter((t) => t.key === ONLY) : TIERS;
  if (ONLY && tiersToCreate.length === 0) {
    console.error(`ERROR: ONLY='${ONLY}' did not match any tier. Valid: ${TIERS.map((t) => t.key).join(", ")}`);
    process.exit(1);
  }
  if (ONLY) console.log(`(ONLY=${ONLY} — creating just this tier)\n`);

  const results = {};
  for (const tier of tiersToCreate) {
    console.log(`Creating product: ${tier.name} ...`);
    const productId = await createProduct(token, tier);
    console.log(`  product id: ${productId}`);

    console.log(`Creating plan: ${tier.name} Monthly ($${tier.monthly}/mo` +
      `${tier.setupFee !== "0.00" ? ` + $${tier.setupFee} setup` : ""}) ...`);
    const planId = await createPlan(token, productId, tier);
    console.log(`  plan id:    ${planId}\n`);

    results[tier.key] = { productId, planId };
  }

  console.log("==================================================================");
  console.log(`Paste into app/src/lib/constants.ts (${ENV === "production" ? "LIVE_PLANS" : "SANDBOX_PLANS"}):\n`);
  console.log("{");
  for (const [key, v] of Object.entries(results)) {
    console.log(`  ${key}: '${v.planId}',  // product ${v.productId}`);
  }
  console.log("}");
  console.log("==================================================================\n");
  console.log("One-time amounts (Orders API, no plan needed):");
  console.log("  In-Person Training Session: $75");
  console.log("  4-Pack In-Person Sessions:  $240");
  console.log("  (CT $60 discounted session is the plan setup_fee above.)\n");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
