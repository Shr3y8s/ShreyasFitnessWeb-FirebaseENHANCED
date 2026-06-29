# Application Architecture Guide

> **🚀 Going to production?** See the
> [Production Architecture & Launch Plan](./production-architecture-and-launch-plan.md).
> The production frontend is hosted on **Firebase App Hosting (GCP / Cloud Run)**
> — not Vercel — chosen for its scale-to-zero cost model and single-vendor
> consolidation with the Firebase backend. That doc has the full GCP-vs-Vercel
> rationale, the production architecture, and the step-by-step launch runbook +
> checklist. **Note:** the diagrams and references to "Vercel" below describe the
> earlier dev-oriented model; the production source of truth is the launch plan.


## Overview

This document explains the complete architecture of the Shreyas Method Fitness application, including how different services work together, data flows, and when to use each component.



---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Development vs Production](#development-vs-production)
4. [Data Flow Patterns](#data-flow-patterns)
5. [Next.js API Routes vs Firebase Functions](#nextjs-api-routes-vs-firebase-functions)
6. [Security Model](#security-model)
7. [Deployment Architecture](#deployment-architecture)
8. [FAQ](#faq)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ USER'S BROWSER                                               │
│ - React UI (Next.js pages)                                  │
│ - Client-side JavaScript                                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ VERCEL (Next.js - Frontend Platform)                        │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ React Pages & Components                               │ │
│ │ - Dashboard, Profile, Workouts, etc.                   │ │
│ │ - Server-side rendering (SSR)                          │ │
│ │ - Static generation (SSG)                              │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Next.js API Routes (/app/api/*)                        │ │
│ │ - /api/autocomplete (Google Places proxy)             │ │
│ │ - /api/place-details (Address components)             │ │
│ │ - User-facing HTTP endpoints                           │ │
│ └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
              ↓                                    ↓
┌───────────────────────┐          ┌───────────────────────────┐
│ GOOGLE CLOUD          │          │ FIREBASE (Google Cloud)   │
│                       │          │                           │
│ • Google Places API   │          │ • Firestore (Database)    │
│   (New)               │          │ • Auth (Authentication)   │
│ • Maps API            │          │ • Storage (Blob Storage)  │
└───────────────────────┘          │                           │
                                   │ • Functions (Events)      │
                                   │   - Stripe webhooks       │
                                   │   - Scheduled tasks       │
                                   │   - Triggers              │
                                   └───────────────────────────┘
                                             ↑
                               ┌─────────────┴─────────────┐
                               │                           │
                         ┌──────────┐              ┌──────────┐
                         │ STRIPE   │              │ SENDGRID │
                         │ Payments │              │ Emails   │
                         └──────────┘              └──────────┘
```

---

## Technology Stack

### Frontend (Next.js on Vercel)

**Framework:**
- Next.js 15.5.4 (React 19)
- TypeScript
- Tailwind CSS

**Purpose:**
- User interface
- Client-side interactivity
- Server-side rendering
- API proxy layer

**Key Features:**
- App Router (file-based routing)
- Server components & Client components
- API routes for backend logic
- Automatic code splitting
- Image optimization

### Backend Services (Firebase)

**Firebase Services Used:**

1. **Firestore (Database)**
   - NoSQL document database
   - Collections: users, workouts, exercises, assignments
   - Real-time updates
   - Offline support

2. **Firebase Auth**
   - User authentication
   - Email/password login
   - Session management
   - Email verification

3. **Firebase Storage**
   - Profile photos
   - Workout videos
   - Exercise images
   - Document uploads

4. **Firebase Functions**
   - Event-driven serverless functions
   - Stripe webhook handler
   - Background processing
   - Scheduled tasks

### Third-Party Services

**Google Places API (New):**
- Address autocomplete
- Place details
- Geocoding

**Stripe:**
- Payment processing
- Subscription management
- Webhooks for payment events

**SendGrid (Future):**
- Transactional emails
- Marketing campaigns
- Email tracking

---

## Development vs Production

### Development (localhost)

```
┌────────────────────────────────────────────────────────┐
│ YOUR LAPTOP (localhost:3000)                           │
│                                                         │
│ ┌────────────────────────────────────────────────────┐│
│ │ Next.js Dev Server (npm run dev)                   ││
│ │ - Hot reload                                       ││
│ │ - Source maps                                      ││
│ │ - Detailed errors                                  ││
│ │ - Turbopack for fast refresh                       ││
│ └────────────────────────────────────────────────────┘│
│                                                         │
│ Environment: .env.local                                │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ FIREBASE (Google Cloud - Production Services)          │
│ - Firestore (shreyfitweb project)                     │
│ - Auth (user accounts)                                 │
│ - Storage (file uploads)                               │
│ - Functions (webhooks, triggers)                       │
└────────────────────────────────────────────────────────┘
```

**Running Locally:**
```bash
# Start development server
cd app
npm run dev

# Server runs on http://localhost:3000
# API routes available at http://localhost:3000/api/*
```

**Environment Variables:**
- Stored in `app/.env.local`
- Not committed to git
- Loaded automatically by Next.js

### Production (Vercel)

```
┌────────────────────────────────────────────────────────┐
│ VERCEL (Global CDN)                                     │
│ URL: yourapp.vercel.app OR custom domain               │
│                                                         │
│ ┌────────────────────────────────────────────────────┐│
│ │ Next.js Production Build                           ││
│ │ - Optimized bundles                                ││
│ │ - Edge caching                                     ││
│ │ - Serverless functions                             ││
│ │ - Automatic HTTPS                                  ││
│ └────────────────────────────────────────────────────┘│
│                                                         │
│ Environment: Vercel Dashboard                          │
└────────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────────┐
│ FIREBASE (Google Cloud)                                 │
│ Same services as development                           │
└────────────────────────────────────────────────────────┘
```

**Deployment Process:**
1. Push code to GitHub (main branch)
2. Vercel auto-detects changes
3. Builds Next.js application
4. Deploys to global CDN
5. Live in ~60 seconds

---

## Data Flow Patterns

### Pattern 1: Client → Firebase (Direct Access)

**Use Case:** Reading/writing user data

```
┌──────────────────┐
│ React Component  │
│ (Browser)        │
└──────────────────┘
        ↓
    Firebase SDK
        ↓
┌──────────────────┐
│ Firestore        │
│ (Cloud)          │
└──────────────────┘

Example:
const userDoc = await getDoc(doc(db, 'users', userId));
```

**Advantages:**
- Simple, direct access
- Real-time updates
- Offline support
- Firestore security rules protect data

### Pattern 2: Client → Next.js API → Firebase

**Use Case:** Complex operations, business logic

```
┌──────────────────┐
│ React Component  │
│ (Browser)        │
└──────────────────┘
        ↓ fetch()
┌──────────────────┐
│ Next.js API      │
│ (Vercel Server)  │
└──────────────────┘
        ↓
┌──────────────────┐
│ Firestore        │
│ (Cloud)          │
└──────────────────┘

Example:
fetch('/api/create-workout', { ... })
```

**Advantages:**
- Server-side validation
- Complex business logic
- Hide sensitive operations
- Aggregations and queries

### Pattern 3: Client → Next.js API → External Service

**Use Case:** Third-party API integration (Google Places)

```
┌──────────────────┐
│ React Component  │
│ (Browser)        │
└──────────────────┘
        ↓ fetch()
┌──────────────────┐
│ Next.js API      │
│ (Proxy)          │
└──────────────────┘
        ↓ with API key
┌──────────────────┐
│ Google Places    │
│ (Cloud)          │
└──────────────────┘

Example:
fetch('/api/autocomplete', { input: "1600 Penn" })
```

**Advantages:**
- API key security (never exposed)
- Request/response transformation
- Rate limiting
- Error handling

### Pattern 4: External Service → Firebase Function

**Use Case:** Webhooks, event triggers

```
┌──────────────────┐
│ Stripe           │
│ (Payment Event)  │
└──────────────────┘
        ↓ webhook POST
┌──────────────────┐
│ Firebase Function│
│ stripeWebhook    │
└──────────────────┘
        ↓
┌──────────────────┐
│ Firestore Update │
│ (User payment)   │
└──────────────────┘

Example:
Stripe payment succeeds → webhook → update user subscription
```

**Advantages:**
- Independent of user requests
- Stable webhook URL
- Background processing
- Event-driven architecture

---

## Next.js API Routes vs Firebase Functions

### When to Use Next.js API Routes

**Location:** `app/src/app/api/**/route.ts`

**Characteristics:**
- Run on Vercel servers
- Respond to HTTP requests
- Timeout: 10s (free), 60s (pro)
- Integrated with Next.js app

**Best For:**

✅ **User-facing endpoints**
```typescript
// /app/api/user-profile/route.ts
export async function GET(request: NextRequest) {
  const userId = request.headers.get('user-id');
  const userDoc = await getDoc(doc(db, 'users', userId));
  return Response.json(userDoc.data());
}
```

✅ **API proxies**
```typescript
// /app/api/autocomplete/route.ts
export async function POST(request: NextRequest) {
  const { input } = await request.json();
  
  // Hide API key, forward to Google
  const response = await fetch('https://places.googleapis.com/...', {
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_KEY }
  });
  
  return Response.json(await response.json());
}
```

✅ **Data transformation**
```typescript
// /app/api/dashboard-stats/route.ts
export async function GET() {
  // Aggregate data from multiple sources
  // Transform for UI consumption
  // Return optimized payload
}
```

### When to Use Firebase Functions

**Location:** `firebase/functions/index.js`

**Characteristics:**
- Run on Google Cloud
- Event-driven or HTTP triggered
- No timeout limits
- Independent deployment

**Best For:**

✅ **Event triggers**
```javascript
// Runs automatically when user created
exports.onUserCreate = functions.auth.user().onCreate((user) => {
  return createWelcomeEmail(user);
});

// Runs when Firestore document changes
exports.onWorkoutUpdate = functions.firestore
  .document('workouts/{workoutId}')
  .onUpdate((change, context) => {
    return syncWithExternalSystem(change.after.data());
  });
```

✅ **Scheduled tasks**
```javascript
// Runs every day at midnight
exports.dailyCleanup = functions.pubsub
  .schedule('0 0 * * *')
  .onRun((context) => {
    return cleanupExpiredSessions();
  });
```

✅ **Webhooks**
```javascript
// Stable URL for Stripe
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const event = stripe.webhooks.constructEvent(
    req.rawBody,
    sig,
    webhookSecret
  );
  
  // Process payment event
  await handleStripeEvent(event);
  
  res.json({ received: true });
});
```

✅ **Background processing**
```javascript
// Long-running task
exports.processVideo = functions.storage
  .object()
  .onFinalize(async (object) => {
    // Takes 5-10 minutes
    await transcodeVideo(object);
    await generateThumbnails(object);
    await updateDatabase(object);
  });
```

### Comparison Table

| Feature | Next.js API Routes | Firebase Functions |
|---------|-------------------|-------------------|
| **Trigger** | HTTP requests only | HTTP, Events, Scheduled |
| **Timeout** | 10s (free), 60s (pro) | None (540s max) |
| **Location** | Vercel servers | Google Cloud |
| **Deployment** | With Next.js app | Independent |
| **Use Case** | User requests | Background tasks |
| **URL Stability** | Changes with redeploy | Stable |
| **Integration** | Built into Next.js | Separate service |

---

## Security Model

### Tier-Based Feature Gating (UI-only, by design)

The client dashboard gates which features each client sees by their subscription
tier (`user.tier`, an `AppProductId`). In-person clients (`in_person`,
`in_person_4pack`) see only Buy/Schedule sessions, Support, and Account; coaching
clients (`online_coaching`, `complete_transformation`) see the full dashboard.

- **Single source of truth:** `getClientFeatureAccess(tier)` + the `FEATURE_MATRIX`
  in `app/src/lib/constants.ts`. OC and CT are modeled as **separate rows** (equal
  today, free to diverge later). The sidebar (`client-sidebar.tsx`), per-page guards
  (`FeatureLockedShell` / `FeatureGuard` → `UpgradeUpsell`), and the dashboard-home
  branch all read from it. Unknown/missing tier defaults to the most-restrictive row.
- **UI-only by design — no data-exposure risk.** Gating is implemented purely in the
  UI. Every gated feature reads per-user data that `firestore.rules` already scopes
  to `request.auth.uid` (e.g. `plans`, `workouts`, `nutritionLogs`, `goals`,
  `weeklySurveys`, `progressPhotos`, `dailyActivityLogs`). An in-person client cannot
  read anyone else's data and has none of their own behind these screens, so backend
  / Firestore-rules tier enforcement would add cost and complexity with **zero**
  security benefit. This is a no-risk decision, not an accepted gap.
- **Deep-links** to a gated route render a soft "Upgrade to Online Coaching" upsell
  panel (no redirect). See `docs/02-implementation/tier-feature-gating/`.


### Environment Variables

#### Next.js Environment Variable Rules

**1. `NEXT_PUBLIC_*` Prefix (Client-Accessible):**
```env
NEXT_PUBLIC_STRIPE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=https://app.com
```

**Behavior:**
- ✅ Available in browser
- ✅ Available on server
- ⚠️ Embedded in JavaScript bundle
- ⚠️ Visible in DevTools

**When to Use:**
- Public API keys (Stripe publishable key)
- Public URLs
- Non-sensitive configuration

**2. Regular Variables (Server-Only):**
```env
GOOGLE_MAPS_API_KEY=AIza...
DATABASE_URL=postgres://...
STRIPE_SECRET_KEY=sk_test_...
```

**Behavior:**
- ❌ NOT available in browser
- ✅ Only available on server
- 🔒 Never in JavaScript bundle
- 🔒 Never visible to users

**When to Use:**
- API keys
- Database credentials
- Secret keys
- Sensitive configuration

#### Our Google Places API Key

**Current:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

**Why It's Secure Despite `NEXT_PUBLIC_`:**

```typescript
// ❌ WOULD BE EXPOSED (if we did this):
// Client component
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
fetch(`https://places.googleapis.com/...?key=${apiKey}`);
// ^ This would expose key in browser

// ✅ ACTUALLY SECURE (what we do):
// Server-side API route
export async function POST(request: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const response = await fetch('https://places.googleapis.com/...', {
    headers: { 'X-Goog-Api-Key': apiKey }
  });
  // ^ Key stays on server, never sent to browser
}
```

**Key Point:** API routes **always run on the server**, so even `NEXT_PUBLIC_*` variables remain secure when used only in API routes.

### API Key Protection Strategies

**1. Server-Side Proxy (Our Approach)**
```
Browser → Next.js API → Google (with key)
✅ Key never reaches browser
✅ Simple to implement
✅ Easy to add rate limiting
```

**2. Google API Restrictions**
```
API Key Settings:
- Application restrictions: None (for server-side)
- API restrictions: Only "Places API (New)"
- No HTTP referrer needed (server calls)
```

**3. Firestore Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      // Users can only read/write their own data
      allow read, write: if request.auth != null 
                        && request.auth.uid == userId;
    }
  }
}
```

---

## Deployment Architecture

### Vercel Deployment

**Steps:**

1. **Connect Repository:**
   ```
   Vercel Dashboard → New Project → Import Git Repository
   ```

2. **Configure:**
   ```
   Framework: Next.js (auto-detected)
   Build Command: next build
   Output Directory: .next
   Install Command: npm install
   ```

3. **Environment Variables:**
   ```
   Add in Vercel Dashboard → Settings → Environment Variables
   - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - etc.
   ```

4. **Deploy:**
   ```bash
   git push origin main
   # Vercel auto-deploys
   # Live in ~60 seconds
   ```

**Features:**
- Automatic deployments on push
- Preview deployments for PRs
- Custom domains
- SSL/HTTPS automatic
- Global CDN
- Edge functions

### Firebase Deployment

**Firebase Services (Already Deployed):**
- Firestore
- Auth
- Storage
- Functions

**Deploying Firebase Functions:**
```bash
cd firebase
firebase deploy --only functions

# Or specific function
firebase deploy --only functions:stripeWebhook
```

**Firebase Hosting (Alternative to Vercel):**
```bash
cd app
npm run build

cd ../firebase
firebase deploy --only hosting
```

---

## FAQ

### General Architecture

**Q: Why use both Vercel and Firebase?**

A: Each service excels at different things:
- **Vercel:** Perfect for Next.js frontend, SSR, API routes
- **Firebase:** Best-in-class backend services (database, auth, storage)

Together they provide a complete, production-ready stack without managing servers.

**Q: Can I use only Firebase and skip Vercel?**

A: Yes! You can deploy Next.js to Firebase Hosting. However:
- ✅ Everything in one platform
- ❌ Not as optimized for Next.js as Vercel
- ❌ More configuration required
- ❌ Less developer-friendly

**Q: Can I use only Vercel and skip Firebase?**

A: Possible but not recommended:
- Need alternative database (PostgreSQL, MongoDB)
- Need alternative auth (Auth0, Clerk)
- Need alternative storage (AWS S3, Cloudinary)
- More services to manage and integrate

### Data Access

**Q: Should I access Firestore directly from React components or use API routes?**

A: **Depends on the use case:**

**Direct Access (Preferred for Simple Operations):**
```typescript
// Good for: Reading user's own data, real-time updates
const userDoc = await getDoc(doc(db, 'users', userId));
```

**Via API Route (Preferred for Complex Operations):**
```typescript
// Good for: Business logic, aggregations, admin operations
const response = await fetch('/api/admin/users');
```

**Q: Doesn't direct Firestore access expose my database?**

A: No! Firestore Security Rules protect your data:
```javascript
// Users can only read their own data
allow read: if request.auth.uid == userId;
```

Even with direct access, users can't bypass these rules.

**Q: When should data go through an API route?**

A: Use API routes when you need:
- Server-side validation
- Complex queries/aggregations
- Business logic
- Access to multiple services
- Operations that shouldn't run client-side

### API Keys and Security

**Q: My API key has `NEXT_PUBLIC_` prefix. Is it secure?**

A: If used only in **server-side API routes**, yes! The code never runs in the browser, so the key stays secure. However, for clarity, you could rename it without the prefix.

**Q: Can users see my API keys in the browser?**

A: **No, because:**
1. Keys are only used in server-side API routes
2. API routes run on Vercel servers, not in browser
3. Responses don't include the API key
4. Browser never makes direct requests to Google

**Q: How do I verify my API key is secure?**

A: Test in browser DevTools:
```javascript
// Console tab
console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
// Result: undefined ✅

// Network tab → Check requests
// You'll see: POST /api/autocomplete ✅
// You won't see: POST places.googleapis.com ✅
```

**Q: Should I rotate my API keys?**

A: Yes, for security best practices:
- Rotate every 90 days
- Rotate immediately if exposed
- Use different keys for dev/production
- Monitor usage in Google Cloud Console

### Performance and Costs

**Q: How much does this architecture cost?**

A: **Development: $0**

**Production:**
- Vercel: Free tier (100GB bandwidth, unlimited requests)
- Firebase: Free tier (generous quotas)
- Google Places API: $200/month free credit
- **Total for small app: $0/month**

As you scale:
- Vercel Pro: $20/month per member
- Firebase Blaze: Pay-as-you-go (very affordable)
- Google Places: Only pay after free credit

**Q: Will my app be slow?**

A: No! This architecture is **extremely fast:**
- Vercel: Global CDN (edge caching)
- Firestore: Single-digit millisecond reads
- Next.js: Optimized bundles, code splitting
- API routes: Serverless, auto-scaling

**Q: How many users can this handle?**

A: **Millions!** All services auto-scale:
- Vercel: Automatic scaling
- Firestore: Handles billions of operations
- Firebase Functions: Auto-scales to demand

No server management needed.

### Development Workflow

**Q: How do I test locally?**

A:
```bash
cd app
npm run dev
# Runs on localhost:3000
# Uses production Firebase (safe with security rules)
```

**Q: Can I use a separate Firebase project for development?**

A: Yes! Create dev/prod Firebase projects:
```env
# .env.local (development)
NEXT_PUBLIC_FIREBASE_API_KEY=dev_project_key

# Vercel (production)
NEXT_PUBLIC_FIREBASE_API_KEY=prod_project_key
```

**Q: How do I debug API routes?**

A:
```typescript
export async function POST(request: NextRequest) {
  console.log('Request received:', request.url);
  // Logs appear in terminal where npm run dev runs
  
  try {
    // Your code
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Deployment

**Q: How do I deploy to production?**

A:
```bash
git add .
git commit -m "Feature: New functionality"
git push origin main
# Vercel auto-deploys in ~60 seconds
```

**Q: Can I preview changes before deploying?**

A: Yes! Vercel creates preview deployments:
```bash
git checkout -b new-feature
git push origin new-feature
# Vercel creates preview URL
# Test at: new-feature-yourapp.vercel.app
```

**Q: How do I rollback a bad deployment?**

A: In Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." → "Promote to Production"
4. Done! (~30 seconds)

### Troubleshooting

**Q: My API route returns 404**

A: Check:
1. File location: `app/src/app/api/route-name/route.ts`
2. Export function: `export async function GET/POST()`
3. Restart dev server: `npm run dev`
4. URL: `http://localhost:3000/api/route-name`

**Q: Environment variables not working**

A: Check:
1. File name: `.env.local` (not `.env`)
2. Location: In `app/` directory
3. Format: `KEY=value` (no quotes needed)
4. Restart: Stop and restart `npm run dev`
5. Access: `process.env.KEY_NAME`

**Q: Firestore permission denied**

A: Check:
1. User authenticated: `auth.currentUser`
2. Security rules: Allow read/write for this user?
3. Document path: Correct collection and ID?
4. Firebase project: Using correct project?

**Q: Google Places API not working**

A: Check:
1. API enabled: Places API (New) in Google Cloud
2. API key: Correct key in `.env.local`
3. Restrictions: "None" or correct restrictions
4. Billing: Enabled in Google Cloud
5. Restart server after adding key

---

## Best Practices

### Code Organization

```
app/src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (server-side)
│   ├── dashboard/         # App pages
│   └── (auth)/           # Auth pages
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── dashboard/        # Feature-specific components
├── lib/                  # Utilities
│   ├── firebase.ts       # Firebase config
│   ├── auth-context.tsx  # Auth provider
│   └── utils.ts          # Helper functions
└── types/                # TypeScript types
```

### Environment Variables

```env
# Public (can be used client-side if needed)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# Private (server-only)
GOOGLE_MAPS_API_KEY=...
STRIPE_SECRET_KEY=...
DATABASE_URL=...
```

### Error Handling

```typescript
// API Route
export async function POST(request: NextRequest) {
  try {
    // Your logic
    return Response.json({ success: true });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// React Component
try {
  const response = await fetch('/api/endpoint');
  if (!response.ok) {
    throw new Error('Request failed');
  }
  const data = await response.json();
} catch (error) {
  console.error('Fetch error:', error);
  alert('Operation failed. Please try again.');
}
```

### Security Checklist

- ✅ API keys in environment variables (never in code)
- ✅ Firestore security rules configured
- ✅ User authentication required for protected routes
- ✅ Input validation on all API routes
- ✅ Rate limiting for sensitive endpoints
- ✅ HTTPS only (automatic with Vercel)
- ✅ CORS configured appropriately
- ✅ Sensitive data encrypted at rest (automatic with Firebase)

---

## Additional Resources

### Official Documentation

- [Next.js Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Google Places API (New)](https://developers.google.com/maps/documentation/places/web-service/overview)

### Project-Specific Guides

- [Google Maps Setup Guide](../02-implementation/google-maps-setup-guide.md)
- [Stripe Integration](../02-implementation/stripe-integration.md)
- [Admin Account Setup](../02-implementation/admin-account-setup-guide.md)

### Support

For issues or questions:
1. Check this documentation
2. Review error logs (browser console, terminal)
3. Check Firebase/Vercel dashboards for errors
4. Consult official documentation
5. Search GitHub issues for similar problems

---

**Last Updated:** October 28, 2025
