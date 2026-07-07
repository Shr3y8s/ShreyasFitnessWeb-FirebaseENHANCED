import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// This route uses the RESEND_API_KEY secret, which is RUNTIME-only on Firebase
// App Hosting (not available during `next build`). Force dynamic so it's never
// statically evaluated at build time.
export const dynamic = 'force-dynamic';

// Format date for email display
function formatEmailDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { 
      leadName, 
      leadEmail, 
      replyMessage, 
      trainerName,
      originalMessage,
      serviceInterest,
      sentDate
    } = body;

    // 2. Validate required fields
    if (!leadEmail || !replyMessage) {
      return NextResponse.json(
        { error: 'Missing required fields: leadEmail and replyMessage are required' },
        { status: 400 }
      );
    }

    // 3. Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(leadEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 4. Format the date for display
    const formattedDate = sentDate ? formatEmailDate(new Date(sentDate)) : 'Recently';

    // 5. Send email via Resend
    // Instantiate lazily (per-request) so the API key is read at runtime, not at
    // module-eval/build time when the secret is not present.
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Shrey.Fit <info@shrey.fit>',
      to: leadEmail,
      replyTo: 'info@shrey.fit',
      subject: 'Re: Your message to Shrey.fit',
      html: `<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f3f4f6; font-family: Arial, Helvetica, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f3f4f6; padding: 24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <!-- Header -->
        <tr><td style="background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); padding: 24px 32px;">
          <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">Shrey.Fit</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding: 32px;">
          <p style="margin: 0 0 12px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            Hi <strong>${leadName || 'there'}</strong>,
          </p>
          <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #374151;">
            Thank you for your interest in Shrey.fit services. Please see my response below.
          </p>

          <!-- Trainer's Reply -->
          <p style="white-space: pre-wrap; margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #1f2937;">${replyMessage}</p>

          <!-- Divider -->
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

          <!-- Original Message Quote -->
          <p style="margin: 0 0 12px 0; font-size: 14px; color: #6b7280;">
            On ${formattedDate}, ${leadName || 'you'} wrote:
          </p>
          <div style="background: #f0fdf4; padding: 16px; border-left: 4px solid #10b981; border-radius: 8px;">
            <p style="white-space: pre-wrap; margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">${originalMessage || 'Your inquiry'}</p>
            ${serviceInterest ? `
            <p style="margin: 14px 0 0 0; font-size: 13px; color: #6b7280; font-style: italic;">
              Service Interest: ${serviceInterest}
            </p>` : ''}
          </div>

          <!-- Signature -->
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 15px; line-height: 1.5; color: #374151;">
              Thanks,<br />
              Shreyas
            </p>
            <p style="margin: 16px 0 0 0; font-size: 15px; line-height: 1.5;">
              <a href="https://shrey.fit" style="color: #059669; font-weight: 700; font-size: 16px; text-decoration: none;">Shrey.Fit</a><br />
              <a href="mailto:info@shrey.fit" style="color: #059669; font-size: 14px; text-decoration: none;">info@shrey.fit</a>
            </p>
          </div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding: 20px 32px; border-top: 1px solid #e5e7eb; background: #fafafa;">
          <p style="margin: 0; font-size: 12px; color: #6b7280;">
            © ${new Date().getFullYear()} Shrey.Fit · Real coaching. Real results.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      // Plain text fallback for email clients that don't support HTML
      text: `Hi ${leadName || 'there'},

Thank you for your interest in Shrey.fit services. Please see my response below.

${replyMessage}

────────────────────────────────────

On ${formattedDate}, ${leadName || 'you'} wrote:

${originalMessage || 'Your inquiry'}
${serviceInterest ? `\nService Interest: ${serviceInterest}` : ''}

────────────────────────────────────

Thanks,
Shreyas

Shrey.Fit
info@shrey.fit`
    });

    // 6. Handle Resend API errors
    if (error) {
      console.error('Resend API error:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        { 
          error: 'Failed to send email', 
          details: error,
          message: error.message || 'Unknown Resend error'
        },
        { status: 500 }
      );
    }

    // 7. Return success with email ID for tracking
    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'Email sent successfully'
    });

  } catch (error: any) {
    console.error('Error sending reply email:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.name
      },
      { status: 500 }
    );
  }
}
