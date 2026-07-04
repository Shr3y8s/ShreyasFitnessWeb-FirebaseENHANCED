/**
 * Email Notification Templates
 *
 * Branded HTML + plain-text builders for client notification emails, matching the
 * OTP/welcome look (green accent #059669). `build(type, data)` → { subject, html, text }.
 * See docs/02-implementation/email-notifications/design.md §4.
 */

const BASE_URL = "https://shrey.fit";
const MANAGE_URL = `${BASE_URL}/dashboard/client/profile`;
const ACCENT = "#059669";

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
        </td></tr>
        <!-- Body -->
        <tr><td style="padding: 32px;">
          <h1 style="margin: 0 0 16px 0; font-size: 22px; color: #111827;">${heading}</h1>
          ${bodyHtml}
          ${cta}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background: #fafafa;">
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280;">
            You're receiving this because email notifications are on for your Shrey.Fit account.
          </p>
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            <a href="${MANAGE_URL}" style="color: ${ACCENT}; text-decoration: none;">Manage email preferences</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function footerText() {
  return `\n\n—\nYou're receiving this because email notifications are on for your Shrey.Fit account.\nManage email preferences: ${MANAGE_URL}`;
}

/**
 * @param {string} type   'new_assignment' | 'trainer_message'
 * @param {object} data   template data (firstName always injected by the helper)
 * @returns {{subject:string, html:string, text:string}}
 */
function build(type, data = {}) {
  const firstName = data.firstName || "there";

  switch (type) {
    case "new_assignment": {
      const workoutName = data.workoutName || "a new workout";
      const ctaUrl = data.ctaUrl || `${BASE_URL}/dashboard/client/workouts`;
      const dueLine = data.dueDate
        ? `<p style="margin: 0 0 8px 0; font-size: 15px; color: #374151;">Due: <strong>${data.dueDate}</strong></p>`
        : "";
      const subject = `New workout assigned: ${workoutName}`;
      const html = shell({
        heading: "You have a new workout 💪",
        bodyHtml: `
          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">Hi ${firstName},</p>
          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">
            Your coach assigned you a new workout: <strong>${workoutName}</strong>.
          </p>
          ${dueLine}`,
        ctaLabel: "View workout",
        ctaUrl,
      });
      const text = `Hi ${firstName},\n\nYour coach assigned you a new workout: ${workoutName}.` +
        (data.dueDate ? `\nDue: ${data.dueDate}` : "") +
        `\n\nView it here: ${ctaUrl}` + footerText();
      return { subject, html, text };
    }

    case "trainer_message": {
      const trainerName = data.trainerName || "Your coach";
      const ctaUrl = data.ctaUrl || `${BASE_URL}/dashboard/client/messages`;
      const previewHtml = data.preview
        ? `<div style="margin: 0 0 12px 0; padding: 12px 16px; background: #f9fafb; border-left: 3px solid ${ACCENT}; border-radius: 4px;">
             <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563; white-space: pre-wrap;">${data.preview}</p>
           </div>`
        : "";
      const subject = "New message from your coach";
      const html = shell({
        heading: "New message from your coach 💬",
        bodyHtml: `
          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">Hi ${firstName},</p>
          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #374151;">
            <strong>${trainerName}</strong> sent you a message.
          </p>
          ${previewHtml}`,
        ctaLabel: "Read message",
        ctaUrl,
      });
      const text = `Hi ${firstName},\n\n${trainerName} sent you a message.` +
        (data.preview ? `\n\n"${data.preview}"` : "") +
        `\n\nRead it here: ${ctaUrl}` + footerText();
      return { subject, html, text };
    }

    default:
      return {
        subject: "Notification from Shrey.Fit",
        html: shell({
          heading: "Notification",
          bodyHtml: `<p style="margin:0;font-size:15px;color:#374151;">You have a new update in your Shrey.Fit dashboard.</p>`,
          ctaLabel: "Open dashboard",
          ctaUrl: `${BASE_URL}/dashboard/client`,
        }),
        text: `You have a new update in your Shrey.Fit dashboard: ${BASE_URL}/dashboard/client` + footerText(),
      };
  }
}

module.exports = { build };
