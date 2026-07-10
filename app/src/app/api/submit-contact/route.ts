import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import disposableDomains from 'disposable-email-domains';

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score: number; error?: string }> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return { success: false, score: 0, error: 'Server configuration error' };
    }

    const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const response = await fetch(verificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    });

    const result = await response.json();
    
    return {
      success: result.success || false,
      score: result.score || 0,
      error: result['error-codes']?.[0] || undefined,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, score: 0, error: 'Verification failed' };
  }
}

/**
 * Sanitize the client-supplied marketing attribution (UTM/gclid) before storing.
 *
 * The browser sends the persisted first-touch attribution alongside the form so
 * a lead can be traced to the channel that drove it. We NEVER trust the client
 * blindly: only the six known campaign keys are copied, each coerced to a string
 * and length-capped. These are non-PII campaign tags. Returns null when there is
 * no usable attribution so the field is omitted rather than stored empty.
 */
function sanitizeAttribution(input: unknown): Record<string, string> | null {
  if (!input || typeof input !== 'object') return null;
  const allowed = ['source', 'medium', 'campaign', 'term', 'content', 'gclid'];
  const src = input as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of allowed) {
    const value = src[key];
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim().slice(0, 100);
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Validate email syntax
 */
function validateEmailSyntax(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Check if email domain is disposable
 */
function isDisposableEmail(email: string): boolean {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;
    return disposableDomains.includes(domain);
  } catch (error) {
    console.error('Error checking disposable email:', error);
    return false;
  }
}

/**
 * POST /api/submit-contact
 * Secure contact form submission handler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      service,
      serviceDisplayText,
      message,
      newsletter,
      recaptchaToken,
      attribution,
    } = body;

    // Validate required fields
    if (!name || !email || !service || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reCAPTCHA token
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: 'Security verification required' },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA with Google
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    
    if (!recaptchaResult.success) {
      console.error('reCAPTCHA verification failed:', recaptchaResult.error);
      return NextResponse.json(
        { error: 'Security verification failed. Please try again.' },
        { status: 403 }
      );
    }

    // Check reCAPTCHA score (must be > 0.5 for legitimate users)
    if (recaptchaResult.score < 0.5) {
      console.warn('Low reCAPTCHA score detected:', recaptchaResult.score);
      return NextResponse.json(
        { error: 'Security verification failed. Please try again later.' },
        { status: 403 }
      );
    }

    // Validate email syntax
    if (!validateEmailSyntax(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Check for disposable email
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: 'Disposable email addresses are not allowed. Please use a permanent email address.' },
        { status: 400 }
      );
    }

    // All validations passed - save to Firestore.
    // Marketing attribution (UTM/gclid) is sanitized server-side and only
    // included when present, so direct/organic leads don't store an empty map.
    const cleanAttribution = sanitizeAttribution(attribution);
    const submissionData = {
      Name: name.trim(),
      Email: email.trim(),
      EmailLower: email.trim().toLowerCase(),
      Phone: phone?.trim() || null,
      Service: service,
      ServiceDisplayText: serviceDisplayText || service,
      Message: message.trim(),
      Newsletter: newsletter || false,
      Status: 'Unread',
      Sent: serverTimestamp(),
      LastUpdated: serverTimestamp(),
      Replied: false,
      Archived: false,
      
      // Security metadata
      recaptchaScore: recaptchaResult.score,
      recaptchaVerified: true,
      submissionSource: 'web',

      // Marketing attribution — spread only when present (null → omitted).
      ...(cleanAttribution ? { Attribution: cleanAttribution } : {}),
    };

    const docRef = await addDoc(
      collection(db, 'contact_form_submissions'),
      submissionData
    );

    console.log('Contact submission saved:', docRef.id, 'Score:', recaptchaResult.score);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      submissionId: docRef.id,
    });

  } catch (error: any) {
    console.error('Error processing contact submission:', error);
    return NextResponse.json(
      { error: 'Failed to submit message. Please try again.' },
      { status: 500 }
    );
  }
}
