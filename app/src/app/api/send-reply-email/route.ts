import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { data, error } = await resend.emails.send({
      from: 'Shreyas.fit <info@shrey.fit>',
      to: leadEmail,
      replyTo: 'info@shrey.fit',
      subject: 'Re: Your message to Shrey.fit',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          
          <!-- Greeting -->
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 10px;">
            Hi <strong>${leadName || 'there'}</strong>,
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
            Thank you for your interest in Shrey.fit services. Please see my response below.
          </p>
          
          <!-- Trainer's Reply -->
          <div style="margin-bottom: 30px;">
            <p style="white-space: pre-wrap; font-size: 15px; line-height: 1.6; color: #1f2937; margin: 0;">${replyMessage}</p>
          </div>
          
          <!-- Divider -->
          <hr style="border: none; border-top: 2px solid #e5e7eb; margin: 30px 0;" />
          
          <!-- Original Message Quote -->
          <div style="margin-bottom: 30px;">
            <p style="font-size: 14px; color: #6b7280; margin-bottom: 15px;">
              On ${formattedDate}, ${leadName || 'you'} wrote:
            </p>
            
            <div style="background: #f9fafb; padding: 15px; border-left: 3px solid #d1d5db; border-radius: 4px;">
              <p style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0;">${originalMessage || 'Your inquiry'}</p>
              ${serviceInterest ? `
              <p style="font-size: 13px; color: #6b7280; font-style: italic; margin-top: 15px; margin-bottom: 0;">
                Service Interest: ${serviceInterest}
              </p>` : ''}
            </div>
          </div>
          
          <!-- Signature -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="font-size: 15px; line-height: 1.4; color: #374151; margin: 0;">
              Thanks,<br />
              Shreyas<br />
              <br />
              <a href="https://shrey.fit" style="color: #059669; font-weight: bold; font-size: 16px; text-decoration: none;">Shrey.Fit</a><br />
              <a href="mailto:info@shrey.fit" style="color: #059669; font-size: 14px; text-decoration: none;">info@shrey.fit</a>
            </p>
          </div>
          
        </div>
      `,
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
