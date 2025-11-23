# Next.js Routing & API Guide

**Last Updated:** November 23, 2024  
**Project:** Shreyas Fitness Web Application

---

## Table of Contents

1. [Next.js Routing Overview](#nextjs-routing-overview)
2. [Page Routes vs API Routes](#page-routes-vs-api-routes)
3. [HTTP Method Routing](#http-method-routing)
4. [Contact Form Implementation](#contact-form-implementation)
5. [reCAPTCHA Security Flow](#recaptcha-security-flow)
6. [API Route Examples](#api-route-examples)
7. [Quick Reference](#quick-reference)
8. [Best Practices](#best-practices)

---

## Next.js Routing Overview

Next.js uses **file-based routing** where the directory structure directly maps to URL paths.

### The Two Routing Systems

```
app/
├── api/              ← API Routes (returns JSON/data)
│   └── route.ts
│
└── (pages)/          ← Page Routes (returns HTML/components)
    └── page.tsx
```

### Key Principle

```
URL path determines which file to load
    ↓
File location determines routing system
    ↓
Exported function determines handler
```

---

## Page Routes vs API Routes

### Page Routes (`page.tsx`)

**Purpose:** Display user interfaces

**File Pattern:** `app/[path]/page.tsx`

**Returns:** HTML/React components

**HTTP Methods:** GET only

**Example:**
```typescript
// app/connect/page.tsx
export default function ConnectPage() {
  return <div>Contact Form</div>;
}
// Handles: GET /connect
```

### API Routes (`route.ts`)

**Purpose:** Process server-side logic

**File Pattern:** `app/api/[path]/route.ts`

**Returns:** JSON data

**HTTP Methods:** GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

**Example:**
```typescript
// app/api/submit-contact/route.ts
export async function POST(request: NextRequest) {
  return NextResponse.json({ success: true });
}
// Handles: POST /api/submit-contact
```

---

## HTTP Method Routing

### Routing Table

| HTTP Method | Page Routes (page.tsx) | API Routes (route.ts) |
|-------------|------------------------|----------------------|
| **GET**     | ✅ Yes                 | ✅ Yes               |
| **POST**    | ❌ No                  | ✅ Yes               |
| **PUT**     | ❌ No                  | ✅ Yes               |
| **DELETE**  | ❌ No                  | ✅ Yes               |
| **PATCH**   | ❌ No                  | ✅ Yes               |
| **HEAD**    | ❌ No                  | ✅ Yes               |
| **OPTIONS** | ❌ No                  | ✅ Yes               |

### The Rule

```
Need to SHOW something?  → Page route (GET only)
Need to DO something?    → API route (any HTTP method)
```

---

## Contact Form Implementation

### Complete Request Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. User Action (Browser)                               │
│     ──────────────────────                              │
│     User visits: GET /connect                           │
│     Renders: app/(marketing)/connect/page.tsx           │
│     Shows: Contact form with validation                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  2. Client-Side Validation                              │
│     ──────────────────────────                          │
│     ✓ Email syntax check                                │
│     ✓ Disposable domain check                           │
│     ✓ Phone format validation                           │
│     ✓ Required fields present                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  3. reCAPTCHA Execution                                 │
│     ───────────────────                                 │
│     Execute: executeRecaptcha('contact_form')           │
│     Returns: Token (e.g., "03AGdBq2...")                │
│     Note: Score NOT calculated client-side              │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  4. HTTP POST Request                                   │
│     ──────────────────                                  │
│     POST /api/submit-contact                            │
│     Body: {                                             │
│       name, email, phone, service,                      │
│       message, newsletter, recaptchaToken               │
│     }                                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  5. Next.js Router                                      │
│     ───────────────                                     │
│     Detects: Path starts with /api/                     │
│     Routes to: app/api/submit-contact/route.ts          │
│     Executes: POST handler function                     │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  6. Server-Side Validation                              │
│     ─────────────────────────                           │
│     ✓ Required fields check                             │
│     ✓ Email syntax validation                           │
│     ✓ Disposable domain check                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  7. Google reCAPTCHA Verification                       │
│     ─────────────────────────────────                   │
│     POST: google.com/recaptcha/api/siteverify           │
│     Send: { secret, response: token }                   │
│     Receive: { success, score, challenge_ts }           │
│     Validate: score > 0.5                               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  8. Firestore Write                                     │
│     ──────────────────                                  │
│     Collection: contact_form_submissions                │
│     Document: Auto-generated ID                         │
│     Fields:                                             │
│       - User data (name, email, phone, etc.)            │
│       - Security metadata (recaptchaScore, verified)    │
│       - Management fields (Status, Sent, etc.)          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  9. Response to Client                                  │
│     ──────────────────────                              │
│     200 OK: { success: true, submissionId: "..." }      │
│     Client shows: Success message                       │
│     Form resets                                         │
└─────────────────────────────────────────────────────────┘
```

### Security Layers

**Layer 1: Client-Side (UX)**
- Email typo detection (mailcheck)
- Disposable email warnings
- Phone format validation
- Required field checks

**Layer 2: reCAPTCHA**
- Invisible v3 verification
- Token generation (client)
- Score calculation (Google server)

**Layer 3: Server-Side (Security)**
- Token verification with Google
- Score validation (must be > 0.5)
- Email syntax validation
- Disposable domain blocking
- Required field validation

**Layer 4: Audit Trail**
- Score stored in Firestore
- Verified flag set
- Submission source tracked

---

## reCAPTCHA Security Flow

### The Token vs Score Distinction

**IMPORTANT:** The client does NOT calculate the score!

```
Client Side:
├─ Executes: grecaptcha.execute()
├─ Generates: Cryptographic token
└─ Sends: Token to server

Server Side:
├─ Receives: Token from client
├─ Verifies: Sends token to Google
├─ Google calculates: Score (0.0 - 1.0)
└─ Validates: score > 0.5 to proceed
```

### Why Store the Score?

Even though we only save submissions with `score > 0.5`, storing the actual score provides:

1. **Analytics & Monitoring**
   - Track security trends over time
   - Identify bot attack patterns
   - Average legitimate user scores

2. **Debugging & Investigation**
   - Compare scores for suspicious submissions
   - Score 0.51 vs 0.95 tells different stories
   - Identify edge cases

3. **Retroactive Filtering**
   ```sql
   -- Query for borderline submissions
   SELECT * FROM submissions 
   WHERE recaptchaScore < 0.6
   ```

4. **Pattern Detection**
   - Bot campaigns often show clustered scores
   - Coordinated attacks have similar patterns
   - Can identify and block entire campaigns

5. **Compliance & Audit**
   - Proof of verification
   - Due diligence for data quality
   - Evidence for fraud investigations

6. **Threshold Optimization**
   - A/B test different score thresholds
   - Data-driven security decisions
   - Balance security vs false positives

### reCAPTCHA Response Example

```json
{
  "success": true,
  "score": 0.87,
  "action": "contact_form",
  "challenge_ts": "2024-01-15T10:30:00Z",
  "hostname": "localhost"
}
```

---

## API Route Examples

### Your Implementation: `/api/submit-contact`

**File:** `app/src/app/api/submit-contact/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { name, email, phone, service, message, recaptchaToken } = body;

    // 2. Validate required fields
    if (!name || !email || !service || !message || !recaptchaToken) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 3. Verify reCAPTCHA with Google
    const recaptchaResponse = await fetch(
      'https://www.google.com/recaptcha/api/siteverify',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
      }
    );

    const recaptchaData = await recaptchaResponse.json();

    // 4. Validate reCAPTCHA score
    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      return NextResponse.json(
        { error: 'reCAPTCHA verification failed' },
        { status: 403 }
      );
    }

    // 5. Validate email syntax
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // 6. Check disposable email domains (server-side)
    const emailDomain = email.split('@')[1]?.toLowerCase();
    const disposableDomains = require('disposable-email-domains');
    if (disposableDomains.includes(emailDomain)) {
      return NextResponse.json(
        { error: 'Disposable email addresses not allowed' },
        { status: 400 }
      );
    }

    // 7. Save to Firestore
    const docRef = await addDoc(collection(db, 'contact_form_submissions'), {
      // User data
      Name: name.trim(),
      Email: email.trim(),
      EmailLower: email.trim().toLowerCase(),
      Phone: phone || null,
      Service: service,
      ServiceDisplayText: body.serviceDisplayText || '',
      Message: message.trim(),
      Newsletter: body.newsletter || false,
      
      // Status fields
      Status: 'Unread',
      Replied: false,
      Archived: false,
      
      // Timestamps
      Sent: serverTimestamp(),
      LastUpdated: serverTimestamp(),
      
      // Security metadata
      recaptchaScore: recaptchaData.score,
      recaptchaVerified: true,
      submissionSource: 'web'
    });

    // 8. Return success
    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      submissionId: docRef.id
    });

  } catch (error: any) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Request/Response Structure

**Request:**
```json
POST /api/submit-contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@gmail.com",
  "phone": "+14255551234",
  "service": "inperson",
  "serviceDisplayText": "In-Person Training",
  "message": "I want to get fit...",
  "newsletter": true,
  "recaptchaToken": "03AGdBq2..."
}
```

**Response (Success):**
```json
HTTP 200 OK
Content-Type: application/json

{
  "success": true,
  "message": "Message sent successfully",
  "submissionId": "abc123xyz..."
}
```

**Response (Error):**
```json
HTTP 400/403/500
Content-Type: application/json

{
  "error": "Specific error message"
}
```

---

## Quick Reference

### File Structure → URL Mapping

```
File Location                          URL Path
──────────────────────────────────────────────────────────────
app/page.tsx                        →  /
app/connect/page.tsx                →  /connect
app/(marketing)/services/page.tsx   →  /services
app/dashboard/profile/page.tsx      →  /dashboard/profile

app/api/submit-contact/route.ts     →  /api/submit-contact
app/api/users/route.ts              →  /api/users
app/api/posts/[id]/route.ts         →  /api/posts/:id
```

### When to Use Which Route Type

| Scenario | Route Type | Example |
|----------|------------|---------|
| Display a page | Page route | `GET /about` |
| Show a form | Page route | `GET /connect` |
| Submit a form | API route | `POST /api/submit-contact` |
| Fetch data | API route | `GET /api/users` |
| Update data | API route | `PUT /api/users/123` |
| Delete data | API route | `DELETE /api/posts/456` |
| Webhook endpoint | API route | `POST /api/webhooks/stripe` |

### Common Patterns

**Pattern 1: Form Submission**
```typescript
// Page shows form
app/contact/page.tsx → GET /contact

// API processes submission
app/api/contact/route.ts → POST /api/contact
```

**Pattern 2: Data Fetching**
```typescript
// Page renders with data
app/users/page.tsx → GET /users (with server-side fetch)

// Or: Client fetches from API
fetch('/api/users') → GET /api/users
```

**Pattern 3: CRUD Operations**
```typescript
// All handled by API routes
GET    /api/posts      → List all posts
POST   /api/posts      → Create post
GET    /api/posts/123  → Get specific post
PUT    /api/posts/123  → Update post
DELETE /api/posts/123  → Delete post
```

---

## Best Practices

### API Route Security

1. **Always validate input server-side**
   - Never trust client-side validation alone
   - Validate data types, formats, and constraints

2. **Use environment variables for secrets**
   ```typescript
   // ✅ Good
   const apiKey = process.env.SECRET_KEY;
   
   // ❌ Bad
   const apiKey = "hardcoded-secret";
   ```

3. **Implement rate limiting**
   - Prevent abuse and DOS attacks
   - Consider using middleware or services like Vercel

4. **Return appropriate status codes**
   - 200: Success
   - 400: Bad request (validation failed)
   - 401: Unauthorized
   - 403: Forbidden (e.g., reCAPTCHA failed)
   - 500: Server error

5. **Log security events**
   ```typescript
   console.error('reCAPTCHA failed:', {
     email,
     score: recaptchaData.score,
     timestamp: new Date()
   });
   ```

### Error Handling

```typescript
export async function POST(request: NextRequest) {
  try {
    // Your logic here
    
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    );
  }
}
```

### Request Validation

```typescript
// Validate all required fields
const requiredFields = ['name', 'email', 'message'];
const missingFields = requiredFields.filter(field => !body[field]);

if (missingFields.length > 0) {
  return NextResponse.json(
    { error: `Missing fields: ${missingFields.join(', ')}` },
    { status: 400 }
  );
}
```

### Response Consistency

```typescript
// Success response structure
{
  success: true,
  data: { /* result */ },
  message: "Operation successful"
}

// Error response structure
{
  success: false,
  error: "Error description",
  code: "ERROR_CODE"
}
```

---

## Firestore Document Structure

### contact_form_submissions Collection

```typescript
{
  // User Information
  Name: string,                    // Full name
  Email: string,                   // Original case email
  EmailLower: string,              // Lowercase for queries
  Phone: string | null,            // E.164 format: +14255551234
  
  // Request Details
  Service: string,                 // Service code: "inperson", "online", etc.
  ServiceDisplayText: string,      // Human-readable: "In-Person Training"
  Message: string,                 // User's message
  Newsletter: boolean,             // Newsletter opt-in
  
  // Management Fields
  Status: "Unread" | "Read",       // Inbox status
  Replied: boolean,                // Has trainer replied?
  Archived: boolean,               // Is archived?
  
  // Timestamps
  Sent: Timestamp,                 // When submitted
  LastUpdated: Timestamp,          // Last modification
  
  // Security Metadata
  recaptchaScore: number,          // 0.0 - 1.0 (from Google)
  recaptchaVerified: boolean,      // Always true for saved docs
  submissionSource: "web"          // Where it came from
}
```

### Why These Fields?

**EmailLower**: Enables case-insensitive email searches
```typescript
// Query for user by email (case-insensitive)
where('EmailLower', '==', email.toLowerCase())
```

**Phone in E.164**: Universal format for international support
```typescript
// Stored: "+14255551234"
// Displayed: "(425) 555-1234"
```

**recaptchaScore**: Security intelligence
```typescript
// Find suspicious submissions
where('recaptchaScore', '<', 0.6)
```

**Status/Replied/Archived**: Workflow management
```typescript
// Trainer's inbox view
where('Status', '==', 'Unread')
where('Archived', '==', false)
```

---

## Troubleshooting

### Common Issues

**Issue 1: "Cannot find module 'next/server'"**
```bash
# Solution: Install Next.js dependencies
npm install next@latest
```

**Issue 2: "API route not found (404)"**
```typescript
// Check file location matches URL
// URL: /api/submit-contact
// File: app/api/submit-contact/route.ts ✓

// NOT: app/api/submit-contact.ts ✗
```

**Issue 3: "reCAPTCHA verification failed"**
```typescript
// Check environment variable
console.log('Has secret key:', !!process.env.RECAPTCHA_SECRET_KEY);

// Check score threshold
if (recaptchaData.score < 0.5) {
  console.log('Score too low:', recaptchaData.score);
}
```

**Issue 4: "CORS errors"**
```typescript
// Add CORS headers if needed
return NextResponse.json(data, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
});
```

### Debugging Tips

**Enable detailed logging:**
```typescript
export async function POST(request: NextRequest) {
  console.log('=== API Request Start ===');
  console.log('Headers:', Object.fromEntries(request.headers));
  
  const body = await request.json();
  console.log('Body:', body);
  
  // ... your logic ...
  
  console.log('=== API Request End ===');
}
```

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/submit-contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "service": "inperson",
    "message": "Test message",
    "recaptchaToken": "test-token"
  }'
```

---

## Additional Resources

### Official Documentation
- [Next.js Routing](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Google reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)

### Related Project Files
- `app/src/app/api/submit-contact/route.ts` - Contact form API
- `app/src/app/(marketing)/connect/page.tsx` - Contact form UI
- `app/src/lib/recaptcha.ts` - reCAPTCHA utilities
- `app/src/lib/phoneUtils.ts` - Phone validation utilities

---

**Document Version:** 1.0  
**Last Updated:** November 23, 2024  
**Maintained By:** Shreyas Fitness Development Team
