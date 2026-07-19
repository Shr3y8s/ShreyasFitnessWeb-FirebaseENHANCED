/**
 * Marketing Campaign — send engine + unsubscribe.
 *
 * Pure helpers + callable handlers for dispatching campaign emails and handling
 * one-click unsubscribes. Mirrors the transactional email stack:
 *   - Resend, from `notifications@shrey.fit`, reply-to `support@shrey.fit`.
 *   - RESEND_API_KEY is passed in from the bound secret (index.js), the same way
 *     admin-notifications.js receives it — this module never reads secrets itself.
 *
 * Sending is THROTTLED and FAIL-SOFT: one recipient's failure never aborts the
 * batch, and suppression (unsubscribe) is re-checked at send time so a late
 * opt-out before a retry is always honored.
 *
 * See docs/02-implementation/marketing-campaigns/design.md §4.
 */

const crypto = require("crypto");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const { HttpsError } = require("firebase-functions/v2/https");
const { Resend } = require("resend");
const { renderCampaign } = require("./campaign-templates");

const FROM = "Shrey.Fit <notifications@shrey.fit>";
const REPLY_TO = "support@shrey.fit";
const BASE_URL = "https://shrey.fit";

// Throttle: messages per batch + pause between batches (Resend-friendly).
const BATCH_SIZE = 10;
const BATCH_PAUSE_MS = 1100;

/** Lowercase + trim an email for hashing / storage. */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** SHA-256 hex of the normalized email — used as recipient + suppression doc id. */
function emailHash(email) {
  return crypto.createHash("sha256").update(normalizeEmail(email)).digest("hex");
}

/**
 * Signed unsubscribe token: base64url(payload).hmac.
 * payload = { e: email, c: campaignId }. HMAC over the payload with a server
 * secret prevents anyone from forging an unsubscribe for an arbitrary address.
 */
function signUnsubscribeToken(email, campaignId, secret) {
  const payload = JSON.stringify({ e: normalizeEmail(email), c: campaignId || "" });
  const body = Buffer.from(payload).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Verify + decode an unsubscribe token. Returns { email, campaignId } or null. */
function verifyUnsubscribeToken(token, secret) {
  try {
    const [body, sig] = String(token || "").split(".");
    if (!body || !sig) return null;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");
    // Constant-time compare.
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload || !payload.e) return null;
    return { email: payload.e, campaignId: payload.c || "" };
  } catch (e) {
    return null;
  }
}

/** Build the public unsubscribe URL embedded in the email footer. */
function unsubscribeUrl(token) {
  return `${BASE_URL}/unsubscribe?token=${encodeURIComponent(token)}`;
}

/** Throws unless the caller is an admin (admins/{uid}.role == 'admin'). */
async function assertAdmin(uid) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
  const snap = await admin.firestore().collection("admins").doc(uid).get();
  if (!snap.exists || snap.data()?.role !== "admin") {
    throw new HttpsError("permission-denied", "Admin only.");
  }
}

/**
 * Fetch the discount-code docs referenced by a campaign + its recipients into a
 * { CODE_UPPER: { code, ...docData } } map, for Feature C's {{code_terms}}
 * wording. Code doc ids are the uppercased code string (see payments/discounts.js).
 * Fail-soft: any read error just omits that code (the placeholder collapses).
 *
 * @param {string[]} codes  raw code strings (campaign-level + per-recipient)
 */
async function fetchCodeDocs(codes) {
  const unique = [
    ...new Set(
      (codes || [])
        .map((c) => String(c || "").trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
  const map = {};
  if (!unique.length) return map;
  const db = admin.firestore();
  await Promise.all(
    unique.map(async (codeId) => {
      try {
        const snap = await db.collection("discount_codes").doc(codeId).get();
        if (snap.exists) map[codeId] = { code: codeId, ...snap.data() };
      } catch (e) {
        logger.warn("[Campaign] code doc fetch failed (non-fatal)", {
          codeId,
          error: e.message,
        });
      }
    })
  );
  return map;
}

/** True if the email is currently suppressed. Fail-soft (errs on NOT suppressed). */
async function isSuppressed(email) {

  try {
    const snap = await admin
      .firestore()
      .collection("emailSuppression")
      .doc(emailHash(email))
      .get();
    return snap.exists;
  } catch (e) {
    logger.warn("[Campaign] suppression check failed; treating as not suppressed", {
      error: e.message,
    });
    return false;
  }
}

/** Send one rendered email via Resend. Returns { ok, error? }. Never throws. */
async function sendOne(resend, { to, subject, html, text }) {
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) return { ok: false, error: error.message || "resend_error" };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || "exception" };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Test send: render the campaign with a throwaway unsubscribe token and send a
 * single message to `toEmail`. Does not touch recipient docs or counts.
 *
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
async function runTestSend({ campaignId, toEmail, resendApiKey, unsubSecret }) {
  if (!resendApiKey) return { ok: false, error: "RESEND_API_KEY unavailable" };
  const to = normalizeEmail(toEmail);
  if (!to) return { ok: false, error: "A test recipient email is required." };

  const db = admin.firestore();
  const snap = await db.collection("campaigns").doc(campaignId).get();
  if (!snap.exists) throw new HttpsError("not-found", "Campaign not found.");
  const campaign = { id: campaignId, ...snap.data() };

  // Feature C: resolve the campaign-level code doc for {{code_terms}} (a test
  // send has no recipient doc, so only the campaign code applies).
  const codeDocs = await fetchCodeDocs([
    campaign.discountCode,
    campaign.template && campaign.template.discountCode,
  ]);

  const token = signUnsubscribeToken(to, campaignId, unsubSecret);
  const { subject, html, text } = renderCampaign(
    campaign,
    { email: to },
    { unsubscribeUrl: unsubscribeUrl(token), codeDocs }
  );


  const resend = new Resend(resendApiKey);
  const res = await sendOne(resend, { to, subject: `[TEST] ${subject}`, html, text });
  if (!res.ok) logger.error("[Campaign] test send failed", { campaignId, error: res.error });
  return res;
}

/**
 * Full send: load recipients, filter suppressed, batch+throttle through Resend,
 * write per-recipient status, update counts, set final status. Fail-soft.
 *
 * @param {object} p
 * @param {string} p.campaignId
 * @param {'all'|'failed'} [p.mode]      'failed' retries only failed recipients.
 * @param {string} p.resendApiKey
 * @param {string} p.unsubSecret
 * @returns {Promise<{sentCount:number, failedCount:number, suppressedCount:number}>}
 */
async function runSend({ campaignId, mode = "all", resendApiKey, unsubSecret }) {
  if (!resendApiKey) throw new HttpsError("failed-precondition", "Email service unavailable.");

  const db = admin.firestore();
  const campaignRef = db.collection("campaigns").doc(campaignId);
  const snap = await campaignRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Campaign not found.");
  const campaign = { id: campaignId, ...snap.data() };

  if (mode !== "failed" && campaign.status === "sent") {
    throw new HttpsError(
      "failed-precondition",
      "This campaign was already sent. Use retry-failed to re-send to failed recipients."
    );
  }

  // Load recipients (all, or only failed for a retry).
  let recipientsQuery = campaignRef.collection("recipients");
  if (mode === "failed") recipientsQuery = recipientsQuery.where("status", "==", "failed");
  const recipSnap = await recipientsQuery.get();
  const recipients = recipSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  if (!recipients.length) {
    return { sentCount: 0, failedCount: 0, suppressedCount: 0 };
  }

  await campaignRef.update({
    status: "sending",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Feature C: pre-fetch every code doc referenced by the campaign or any
  // recipient once, so {{code_terms}} can be resolved per-recipient without a
  // per-email read. Fail-soft (missing codes just collapse the placeholder).
  const codeDocs = await fetchCodeDocs([
    campaign.discountCode,
    campaign.template && campaign.template.discountCode,
    ...recipients.map((r) => r.discountCode),
  ]);

  const resend = new Resend(resendApiKey);

  let sentCount = 0;
  let failedCount = 0;
  let suppressedCount = 0;

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      batch.map(async (r) => {
        try {
          const email = normalizeEmail(r.email);
          if (await isSuppressed(email)) {
            suppressedCount += 1;
            await r.ref.update({ status: "suppressed" });
            return;
          }
          const token =
            r.unsubscribeToken || signUnsubscribeToken(email, campaignId, unsubSecret);
          const { subject, html, text } = renderCampaign(
            campaign,
            { email, name: r.name, discountCode: r.discountCode || "" },
            { unsubscribeUrl: unsubscribeUrl(token), codeDocs }
          );


          const res = await sendOne(resend, { to: email, subject, html, text });
          if (res.ok) {
            sentCount += 1;
            await r.ref.update({
              status: "sent",
              unsubscribeToken: token,
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              error: admin.firestore.FieldValue.delete(),
            });
          } else {
            failedCount += 1;
            await r.ref.update({ status: "failed", error: String(res.error).slice(0, 500) });
          }
        } catch (e) {
          // Absolutely never let one recipient abort the batch.
          failedCount += 1;
          logger.error("[Campaign] recipient send threw (non-fatal)", {
            campaignId,
            error: e.message,
          });
          try {
            await r.ref.update({ status: "failed", error: String(e.message).slice(0, 500) });
          } catch (_) {
            /* swallow */
          }
        }
      })
    );
    if (i + BATCH_SIZE < recipients.length) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(BATCH_PAUSE_MS);
    }
  }

  // Recompute totals from the whole subcollection so retries stay accurate.
  const finalStatus = failedCount > 0 && sentCount === 0 ? "failed" : "sent";
  try {
    const allSnap = await campaignRef.collection("recipients").get();
    let totalSent = 0;
    let totalFailed = 0;
    allSnap.forEach((d) => {
      const s = d.data().status;
      if (s === "sent") totalSent += 1;
      else if (s === "failed") totalFailed += 1;
    });
    await campaignRef.update({
      status: finalStatus,
      sentCount: totalSent,
      failedCount: totalFailed,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    logger.error("[Campaign] final count update failed (non-fatal)", {
      campaignId,
      error: e.message,
    });
  }

  logger.info("[Campaign] send complete", {
    campaignId,
    sentCount,
    failedCount,
    suppressedCount,
  });
  return { sentCount, failedCount, suppressedCount };
}

/**
 * Handle a one-click unsubscribe. Verifies the signed token and writes a
 * suppression entry (idempotent). Returns { ok, email? }. No auth required —
 * the token itself is the authorization.
 */
async function processUnsubscribe({ token, unsubSecret }) {
  const decoded = verifyUnsubscribeToken(token, unsubSecret);
  if (!decoded) return { ok: false, error: "invalid_token" };

  const email = normalizeEmail(decoded.email);
  try {
    await admin
      .firestore()
      .collection("emailSuppression")
      .doc(emailHash(email))
      .set(
        {
          email,
          reason: "unsubscribe",
          campaignId: decoded.campaignId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    logger.info("[Campaign] unsubscribe recorded", { campaignId: decoded.campaignId });
    return { ok: true, email };
  } catch (e) {
    logger.error("[Campaign] unsubscribe write failed", { error: e.message });
    return { ok: false, error: "write_failed" };
  }
}

module.exports = {
  // helpers (exported for reuse / tests)
  normalizeEmail,
  emailHash,
  signUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
  assertAdmin,
  isSuppressed,
  // handlers
  runTestSend,
  runSend,
  processUnsubscribe,
};
