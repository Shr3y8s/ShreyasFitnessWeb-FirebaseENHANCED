/**
 * Marketing Campaigns — callable + HTTP entry points.
 *
 * Thin wrappers around the fail-soft engine in `send-campaign.js`. All admin
 * callables verify the admin role server-side (defense in depth on top of the
 * Firestore rules). The unsubscribe endpoint is public — the signed token is the
 * authorization.
 *
 * Secrets:
 *   - RESEND_API_KEY  — shared transactional email key (same as everywhere else).
 *   - CAMPAIGN_UNSUB_SECRET — HMAC key for signing/verifying unsubscribe tokens.
 *
 * See docs/02-implementation/marketing-campaigns/design.md §4.
 */

const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

const {
  assertAdmin,
  runSend,
  runTestSend,
  processUnsubscribe,
} = require("./send-campaign");
const { renderCampaign } = require("./campaign-templates");
const admin = require("firebase-admin");



const REGION = "us-west1";
const resendKey = defineSecret("RESEND_API_KEY");
const unsubSecret = defineSecret("CAMPAIGN_UNSUB_SECRET");

function readKey(secret) {
  try {
    return secret.value() || null;
  } catch (e) {
    return null;
  }
}

/** Admin-only: send a single test email for a campaign. */
const sendCampaignTest = onCall(
  { region: REGION, secrets: [resendKey, unsubSecret] },
  async (req) => {
    await assertAdmin(req.auth?.uid);
    const campaignId = req.data?.campaignId;
    const toEmail = req.data?.toEmail;
    if (!campaignId || !toEmail) {
      throw new HttpsError("invalid-argument", "campaignId and toEmail are required.");
    }
    return runTestSend({
      campaignId,
      toEmail,
      resendApiKey: readKey(resendKey),
      unsubSecret: readKey(unsubSecret) || "dev-unsub-secret",
    });
  }
);

/** Admin-only: dispatch the campaign to all (or failed) recipients. */
const sendCampaign = onCall(
  { region: REGION, secrets: [resendKey, unsubSecret], timeoutSeconds: 540 },
  async (req) => {
    await assertAdmin(req.auth?.uid);
    const campaignId = req.data?.campaignId;
    const mode = req.data?.mode === "failed" ? "failed" : "all";
    if (!campaignId) throw new HttpsError("invalid-argument", "campaignId is required.");
    return runSend({
      campaignId,
      mode,
      resendApiKey: readKey(resendKey),
      unsubSecret: readKey(unsubSecret) || "dev-unsub-secret",
    });
  }
);

/**
 * Admin-only: render a campaign exactly as a recipient would see it, WITHOUT
 * sending anything. Accepts either a saved `campaignId` or an inline `draft`
 * object (so the editor can preview unsaved edits). Returns { subject, html }.
 *
 * Uses the same `renderCampaign()` code path as the real sender, so the preview
 * can never drift from what actually goes out. The unsubscribe link is a inert
 * placeholder ("#") since nothing is signed or sent.
 */
const previewCampaign = onCall({ region: REGION }, async (req) => {
  await assertAdmin(req.auth?.uid);
  const campaignId = req.data?.campaignId;
  const draft = req.data?.draft;

  let campaign;
  if (draft && typeof draft === "object") {
    // Preview an unsaved draft straight from the editor form.
    campaign = { id: campaignId || "preview", ...draft };
  } else if (campaignId) {
    const snap = await admin.firestore().collection("campaigns").doc(campaignId).get();
    if (!snap.exists) throw new HttpsError("not-found", "Campaign not found.");
    campaign = { id: campaignId, ...snap.data() };
  } else {
    throw new HttpsError("invalid-argument", "Provide a campaignId or a draft to preview.");
  }

  const sampleRecipient = { email: "alex@example.com", name: "Alex" };
  const { subject, html } = renderCampaign(campaign, sampleRecipient, {
    unsubscribeUrl: "#",
  });
  return { subject, html };
});

/**
 * Public HTTP unsubscribe endpoint: GET /unsubscribeEmail?token=…

 * Renders a minimal confirmation page. Idempotent + no auth required.
 * (The public Next.js /unsubscribe page can call this or embed it directly.)
 */
const unsubscribeEmail = onRequest(
  { region: REGION, secrets: [unsubSecret], cors: true },
  async (req, res) => {
    const token = req.query.token || (req.body && req.body.token);
    const result = await processUnsubscribe({
      token,
      unsubSecret: readKey(unsubSecret) || "dev-unsub-secret",
    });

    const ok = result.ok;
    const message = ok
      ? "You've been unsubscribed. You won't receive further marketing emails from Shrey.Fit."
      : "We couldn't process that unsubscribe link. It may be invalid or expired.";

    res.status(ok ? 200 : 400).send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribe — Shrey.Fit</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;
    justify-content:center;margin:0;padding:24px}
  .card{max-width:480px;background:#1e293b;border:1px solid #334155;border-radius:16px;
    padding:32px;text-align:center}
  h1{font-size:20px;margin:0 0 12px}
  p{font-size:15px;line-height:1.6;color:#cbd5e1;margin:0 0 20px}
  a{color:#38bdf8;text-decoration:none}
</style></head>
<body><div class="card">
  <h1>${ok ? "You're unsubscribed" : "Something went wrong"}</h1>
  <p>${message}</p>
  <p><a href="https://shrey.fit">Return to Shrey.Fit</a></p>
</div></body></html>`);
    if (!ok) logger.warn("[Campaign] unsubscribe request failed", { error: result.error });
  }
);

module.exports = { sendCampaign, sendCampaignTest, previewCampaign, unsubscribeEmail };


