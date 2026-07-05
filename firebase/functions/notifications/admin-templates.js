/**
 * Admin Notification Templates
 *
 * Branded HTML + plain-text builders for OWNER (admin) notification emails, matching the
 * client-notification look (green accent #059669). `build(type, data)` →
 * { subject, html, text, feedMessage }.
 *
 * Unlike the client templates there is NO "manage preferences" link — the admin controls
 * a single global on/off switch in Admin → Settings.
 *
 * See docs/02-implementation/admin-notifications/design.md §4.
 */

const BASE_URL = "https://shrey.fit";
const ACCENT = "#059669";

/** Format minor units (cents) → "$X.XX". */
function money(amountMinor) {
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return "";
  return `$${(n / 100).toFixed(2)}`;
}

/** Shared branded shell. `bodyHtml` is the per-type inner content. */
function shell({ heading, bodyHtml, ctaLabel, ctaUrl }) {
  const cta = ctaLabel && ctaUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
         <tr><td style="border-radius: 8px; background: ${ACCENT};">
           <a href="${ctaUrl}" style="display: inline-block; padding: 12px 28px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none;">${ctaLabel}</a>
         </td></tr>
       </table>`
    : "";

  return `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <tr><td style="background: ${ACCENT}; padding: 20px 32px;">
          <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Shrey.Fit</span>
          <span style="font-size: 12px; color: #d1fae5; margin-left: 8px;">Owner alert</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding: 32px;">
          <h1 style="margin: 0 0 16px 0; font-size: 22px; color: #111827;">${heading}</h1>
          ${bodyHtml}
          ${cta}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background: #fafafa;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            You're receiving this as the Shrey.Fit account owner. Manage owner alerts in
            <a href="${BASE_URL}/dashboard/admin/settings" style="color: ${ACCENT}; text-decoration: none;">Admin → Settings</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function footerText() {
  return `\n\n—\nYou're receiving this as the Shrey.Fit account owner.\nManage owner alerts: ${BASE_URL}/dashboard/admin/settings`;
}

function p(text) {
  return `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">${text}</p>`;
}

/**
 * @param {string} type   one of the admin notification types
 * @param {object} data   template data
 * @returns {{subject:string, html:string, text:string, feedMessage:string}}
 */
function build(type, data = {}) {
  const name = (data.name && String(data.name).trim()) || "Someone";

  switch (type) {
    case "new_inquiry": {
      const ctaUrl = `${BASE_URL}/dashboard/admin/leads`;
      const subject = `New inquiry from ${name}`;
      const feedMessage = `New inquiry from ${name}`;
      const detail = [
        data.email ? `Email: <strong>${data.email}</strong>` : "",
        data.service ? `Service interest: <strong>${data.service}</strong>` : "",
      ].filter(Boolean).map(p).join("");
      const preview = data.message
        ? `<div style="margin: 0 0 12px 0; padding: 12px 16px; background: #f9fafb; border-left: 3px solid ${ACCENT}; border-radius: 4px;">
             <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.message}</p>
           </div>`
        : "";
      const html = shell({
        heading: "New inquiry 💬",
        bodyHtml: `${p(`<strong>${name}</strong> submitted the contact form.`)}${detail}${preview}`,
        ctaLabel: "Open Lead Inbox",
        ctaUrl,
      });
      const text = `New inquiry from ${name}.` +
        (data.email ? `\nEmail: ${data.email}` : "") +
        (data.service ? `\nService interest: ${data.service}` : "") +
        (data.message ? `\n\n"${data.message}"` : "") +
        `\n\nOpen the Lead Inbox: ${ctaUrl}` + footerText();
      return { subject, html, text, feedMessage };
    }

    case "new_pending_signup": {
      const ctaUrl = `${BASE_URL}/dashboard/admin/pending-accounts`;
      const subject = `New signup started (payment pending): ${name}`;
      const feedMessage = `${name} started signing up (payment pending)`;
      const detail = data.email ? p(`Email: <strong>${data.email}</strong>`) : "";
      const html = shell({
        heading: "New signup started 📝",
        bodyHtml: `${p(`<strong>${name}</strong> created an account but hasn't completed payment yet.`)}${detail}`,
        ctaLabel: "View pending accounts",
        ctaUrl,
      });
      const text = `${name} started signing up but hasn't paid yet.` +
        (data.email ? `\nEmail: ${data.email}` : "") +
        `\n\nView pending accounts: ${ctaUrl}` + footerText();
      return { subject, html, text, feedMessage };
    }

    case "new_client_activated": {
      const ctaUrl = `${BASE_URL}/dashboard/admin/client-management`;
      const tier = data.tierName ? ` (${data.tierName})` : "";
      const subject = `New client: ${name}${tier}`;
      const feedMessage = data.tierName ? `${name} activated ${data.tierName}` : `${name} became a client`;
      const html = shell({
        heading: "New paying client 🎉",
        bodyHtml: `${p(`<strong>${name}</strong> completed payment and activated their account${tier}.`)}`,
        ctaLabel: "View client",
        ctaUrl,
      });
      const text = `${name} completed payment and activated their account${tier}.` +
        `\n\nView client: ${ctaUrl}` + footerText();
      return { subject, html, text, feedMessage };
    }

    case "new_session_purchase": {
      const ctaUrl = `${BASE_URL}/dashboard/admin/revenue`;
      const productName = data.productName || "Training sessions";
      const amount = money(data.amountMinor);
      const subject = `New purchase: ${productName}${amount ? ` — ${amount}` : ""}`;
      const who = data.name ? `${name} ` : "";
      const feedMessage = `${who}bought ${productName}${amount ? ` (${amount})` : ""}`.trim();
      const html = shell({
        heading: "New purchase 💳",
        bodyHtml: `${p(`${who ? `<strong>${name}</strong> ` : ""}purchased <strong>${productName}</strong>${amount ? ` for <strong>${amount}</strong>` : ""}.`)}`,
        ctaLabel: "View revenue",
        ctaUrl,
      });
      const text = `${who}purchased ${productName}${amount ? ` for ${amount}` : ""}.` +
        `\n\nView revenue: ${ctaUrl}` + footerText();
      return { subject, html, text, feedMessage };
    }

    case "subscription_canceled": {
      const ctaUrl = `${BASE_URL}/dashboard/admin/subscriptions`;
      const tier = data.tierName ? ` (${data.tierName})` : "";
      const subject = `Subscription canceled: ${name}`;
      const feedMessage = `${name} canceled their subscription${tier}`;
      const html = shell({
        heading: "Subscription canceled ❌",
        bodyHtml: `${p(`<strong>${name}</strong> canceled their subscription${tier}.`)}`,
        ctaLabel: "View subscriptions",
        ctaUrl,
      });
      const text = `${name} canceled their subscription${tier}.` +
        `\n\nView subscriptions: ${ctaUrl}` + footerText();
      return { subject, html, text, feedMessage };
    }

    default:
      return {
        subject: "Shrey.Fit owner alert",
        feedMessage: "New account activity",
        html: shell({
          heading: "Owner alert",
          bodyHtml: p("There's new activity in your Shrey.Fit dashboard."),
          ctaLabel: "Open dashboard",
          ctaUrl: `${BASE_URL}/dashboard/admin`,
        }),
        text: `There's new activity in your Shrey.Fit dashboard: ${BASE_URL}/dashboard/admin` + footerText(),
      };
  }
}

module.exports = { build, money };
