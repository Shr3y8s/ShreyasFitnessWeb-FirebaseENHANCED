/**
 * Marketing Campaign Templates
 *
 * Branded HTML + plain-text builders for MARKETING campaign emails, matching the
 * transactional-email look (green accent #059669). Two authoring modes:
 *
 *   - "template" : a guided "Launch Template" — headline, body, highlighted
 *                  discount-code + expiry block, and a prominent CTA button.
 *   - "html"     : admin-pasted raw HTML used as the body.
 *
 * BOTH modes always receive:
 *   - a UTM-tagged CTA (template mode) so sends are attributable, and
 *   - a compliance FOOTER (business name + physical mailing address +
 *     one-click unsubscribe link). The footer is NEVER omitted — CAN-SPAM.
 *
 * `renderCampaign(campaign, recipient, { unsubscribeUrl }) ->
 *    { subject, html, text }`
 *
 * See docs/02-implementation/marketing-campaigns/design.md §5.
 */

const BASE_URL = "https://shrey.fit";
const ACCENT = "#059669";

/**
 * Interim mailing address for the compliance footer.
 *
 * ⚠️ PRE-LAUNCH: this is a home address used only during beta / soft launch.
 * It MUST be replaced with an official business address before going live.
 * Change it here (single source of truth) — nowhere else.
 */
const BUSINESS_NAME = "Shrey.Fit";
const MAILING_ADDRESS = "12904 NE 203rd Ct, Woodinville, WA 98072";

/** CTA target key → resolved site path. */
const CTA_PATHS = {
  signup: "/signup",
  services: "/services",
};

/** Minimal HTML escaping for values we interpolate into template markup. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert lightweight body text into HTML paragraphs.
 * Blank-line separated blocks become <p>; single newlines become <br>.
 */
function bodyToHtml(body) {
  const blocks = String(body || "")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (!blocks.length) return "";
  return blocks
    .map(
      (b) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #374151;">${esc(
          b
        ).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

/** Append UTM params to a CTA href for attribution. */
function withUtm(url, campaignId) {
  const sep = url.includes("?") ? "&" : "?";
  const params = [
    "utm_source=email",
    "utm_medium=campaign",
    campaignId ? `utm_campaign=${encodeURIComponent(campaignId)}` : "",
  ]
    .filter(Boolean)
    .join("&");
  return `${url}${sep}${params}`;
}

/** Resolve a CTA target key (or explicit ctaUrl) to an absolute, UTM-tagged URL. */
function resolveCtaUrl(campaign) {
  const target = campaign?.template?.ctaTarget;
  const path = campaign?.ctaUrl || CTA_PATHS[target] || CTA_PATHS.signup;
  const abs = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  return withUtm(abs, campaign?.id);
}

/** The highlighted discount-code + expiry block (template mode). */
function discountBlock(code, expiry) {
  if (!code) return "";
  const expiryLine = expiry
    ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #6b7280;">Offer expires <strong>${esc(
        expiry
      )}</strong></p>`
    : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
    <tr><td style="padding: 20px; background: #ecfdf5; border: 1px dashed ${ACCENT}; border-radius: 10px; text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #047857;">Your code</p>
      <p style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 2px; color: #065f46;">${esc(
        code
      )}</p>
      ${expiryLine}
    </td></tr>
  </table>`;
}

/** CTA button. */
function ctaButton(label, url) {
  if (!label || !url) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 8px 0 8px 0;">
    <tr><td style="border-radius: 8px; background: ${ACCENT};">
      <a href="${url}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">${esc(
    label
  )}</a>
    </td></tr>
  </table>`;
}

/** Compliance footer (HTML) — address + unsubscribe. Never omitted. */
function footerHtml(unsubscribeUrl) {
  const unsub = unsubscribeUrl
    ? `<a href="${unsubscribeUrl}" style="color: ${ACCENT}; text-decoration: underline;">Unsubscribe</a>`
    : "Unsubscribe";
  return `<tr><td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; background: #fafafa;">
    <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
      ${esc(BUSINESS_NAME)} · ${esc(MAILING_ADDRESS)}
    </p>
    <p style="margin: 0; font-size: 12px; color: #6b7280;">
      You're receiving this because you expressed interest in ${esc(
        BUSINESS_NAME
      )}. ${unsub} at any time.
    </p>
  </td></tr>`;
}

/** Compliance footer (plain text). */
function footerText(unsubscribeUrl) {
  return (
    `\n\n—\n${BUSINESS_NAME} · ${MAILING_ADDRESS}\n` +
    `You're receiving this because you expressed interest in ${BUSINESS_NAME}.\n` +
    (unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : "Unsubscribe at any time.")
  );
}

/** Shared branded shell wrapping per-mode inner content + footer. */
function shell({ innerHtml, unsubscribeUrl }) {
  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <tr><td style="background: ${ACCENT}; padding: 20px 32px;">
          <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Shrey.Fit</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding: 32px;">
          ${innerHtml}
        </td></tr>
        <!-- Footer -->
        ${footerHtml(unsubscribeUrl)}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** First name for personalization ("there" fallback). */
function firstName(recipient) {
  const n = (recipient && recipient.name ? String(recipient.name) : "").trim();
  return n ? n.split(/\s+/)[0] : "there";
}

/**
 * Render a campaign email for a specific recipient.
 *
 * @param {object} campaign               campaigns/{id} document data (+ id)
 * @param {object} recipient              { email, name? }
 * @param {object} opts
 * @param {string} opts.unsubscribeUrl    signed one-click unsubscribe URL
 * @returns {{subject:string, html:string, text:string}}
 */
function renderCampaign(campaign = {}, recipient = {}, opts = {}) {
  const unsubscribeUrl = opts.unsubscribeUrl || "";
  const subject = String(campaign.subject || "A message from Shrey.Fit");
  const name = firstName(recipient);

  if (campaign.mode === "html") {
    // Custom HTML: the pasted markup is the body; wrapper adds header + footer.
    const raw = String(campaign.rawHtml || "");
    const html = shell({ innerHtml: raw, unsubscribeUrl });
    // Best-effort text fallback: strip tags from the pasted HTML.
    const stripped = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const text = `${stripped}${footerText(unsubscribeUrl)}`;
    return { subject, html, text };
  }

  // Template mode (default).
  const t = campaign.template || {};
  const headline = t.headline || "Come train with Shrey.Fit";
  const code = campaign.discountCode || t.discountCode || "";
  const expiry = t.expiryDate || "";
  const ctaLabel = t.ctaLabel || "Explore Services";
  const ctaUrl = resolveCtaUrl(campaign);

  const innerHtml =
    `<h1 style="margin: 0 0 20px 0; font-size: 26px; line-height: 1.3; color: #111827;">${esc(
      headline
    )}</h1>` +
    `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.7; color: #374151;">Hi ${esc(
      name
    )},</p>` +
    bodyToHtml(t.body) +
    discountBlock(code, expiry) +
    ctaButton(ctaLabel, ctaUrl);

  const html = shell({ innerHtml, unsubscribeUrl });

  const text =
    `${headline}\n\n` +
    `Hi ${name},\n\n` +
    `${String(t.body || "").trim()}\n\n` +
    (code ? `Use code ${code}${expiry ? ` (expires ${expiry})` : ""}.\n\n` : "") +
    `${ctaLabel}: ${ctaUrl}` +
    footerText(unsubscribeUrl);

  return { subject, html, text };
}

module.exports = {
  renderCampaign,
  BUSINESS_NAME,
  MAILING_ADDRESS,
  CTA_PATHS,
};
