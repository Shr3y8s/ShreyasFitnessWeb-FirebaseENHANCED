# Firebase Functions Region Configuration Guide

## Overview

The project uses a **shared configuration file** to manage Firebase Functions deployment regions. This ensures that both the front-end (Vercel/Next.js) and back-end (Cloud Functions) use the same region, preventing CORS errors.

## Configuration File

**Location:** `firebase-config.json` (project root)

```json
{
  "region": "us-west1",
  "projectId": "shreyfitweb",
  "_comment": "This configuration is used by both front-end (Vercel) and Cloud Functions (Google Cloud). Change region here to affect both deployments."
}
```

## How It Works

### 1. Front-end (Next.js/Vercel)

**Build Time Configuration:**

**File:** `app/next.config.ts`
```typescript
import * as fs from 'fs';
import * as path from 'path';

// Read firebase-config.json from project root at build time
const firebaseConfigPath = path.resolve(__dirname, '../firebase-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

const nextConfig: NextConfig = {
  env: {
    // Expose Firebase region from shared config file
    NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION: firebaseConfig.region,
  },
};
```

**Runtime Usage:**

**File:** `app/src/lib/firebase.ts`
```typescript
// Region is exposed as environment variable by next.config.ts
const functionsRegion = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const functions = getFunctions(app, functionsRegion);
```

**How it works:**
1. `next.config.ts` reads `firebase-config.json` at **build time**
2. Exposes the region as `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION` environment variable
3. `firebase.ts` uses this env var to configure Firebase Functions instance
4. When you call Cloud Functions using `httpsCallable()`, they target the correct region

### 2. Back-end (Cloud Functions)

**File:** `firebase/functions/index.js`

```javascript
const sharedConfig = require("../../firebase-config.json");

// All functions use the shared region
exports.createPaymentIntent = onCall({
  region: sharedConfig.region,
  // ...
});
```

All 6 Cloud Functions read from the same config file:
- `createPaymentIntent`
- `createPortalSession`
- `syncPaymentToUser`
- `syncSubscriptionToUser`
- `verifyRecaptcha`
- `cleanupPendingAccounts`

## How to Change Regions

### Step 1: Update the Config File

Edit `firebase-config.json` and change the region:

```json
{
  "region": "us-central1",  // or any valid region
  "projectId": "shreyfitweb"
}
```

### Step 2: Redeploy Cloud Functions

```bash
cd firebase/functions
firebase deploy --only functions
```

This will deploy all functions to the new region.

### Step 3: Rebuild Next.js Application

The Next.js config reads `firebase-config.json` at build time, so you need to rebuild:

**For Development:**
```bash
cd app
# Kill the current dev server (Ctrl+C)
npm run dev
```

**For Production (Vercel):**
The build will automatically pick up the new region from `firebase-config.json`.

### Step 4: Deploy to Vercel (Production)

```bash
git add firebase-config.json
git commit -m "Change Cloud Functions region to us-central1"
git push
```

Vercel will automatically rebuild and deploy with the new region configuration.

## Available Regions

Firebase Cloud Functions supports these regions:

### North America
- `us-central1` (Iowa) - **Default**
- `us-east1` (South Carolina)
- `us-east4` (Northern Virginia)
- `us-west1` (Oregon) - **Current**
- `us-west2` (Los Angeles)
- `us-west3` (Salt Lake City)
- `us-west4` (Las Vegas)

### Europe
- `europe-west1` (Belgium)
- `europe-west2` (London)
- `europe-west3` (Frankfurt)
- `europe-west6` (Zurich)
- `europe-central2` (Warsaw)

### Asia Pacific
- `asia-east1` (Taiwan)
- `asia-east2` (Hong Kong)
- `asia-northeast1` (Tokyo)
- `asia-northeast2` (Osaka)
- `asia-northeast3` (Seoul)
- `asia-south1` (Mumbai)
- `asia-southeast1` (Singapore)
- `asia-southeast2` (Jakarta)

### Other
- `australia-southeast1` (Sydney)
- `southamerica-east1` (São Paulo)

[See full list of regions](https://firebase.google.com/docs/functions/locations)

## Best Practices

### 1. Choose Region Closest to Users
- **US-based users:** `us-west1` or `us-central1`
- **EU-based users:** `europe-west1` or `europe-west3`
- **Asia-based users:** `asia-northeast1` or `asia-southeast1`

### 2. Consider Latency
Lower latency = better user experience. Choose the region closest to your primary user base.

### 3. Pricing Considerations
- Most regions have the same pricing
- Some regions (e.g., Tokyo, Sydney) may have slightly higher costs
- [Check pricing details](https://cloud.google.com/functions/pricing)

### 4. Testing Region Changes
After changing regions:
1. Test function calls in development
2. Verify Stripe Customer Portal opens correctly
3. Check billing page loads payment history
4. Test payment processing

## Troubleshooting

### CORS Errors After Region Change

**Symptom:**
```
Access to fetch at 'https://[region]-[project].cloudfunctions.net/...' 
has been blocked by CORS policy
```

**Solution:**
1. Verify `firebase-config.json` has correct region
2. Redeploy functions: `firebase deploy --only functions`
3. Restart dev server: `npm run dev`
4. Clear browser cache

### Functions Not Found

**Symptom:**
```
Function not found: createPortalSession
```

**Solution:**
The functions are deployed to the old region. Redeploy:
```bash
firebase deploy --only functions
```

### Build Errors in Vercel

**Symptom:**
```
Cannot find module '../../../firebase-config.json'
```

**Solution:**
Ensure `firebase-config.json` is committed to Git:
```bash
git add firebase-config.json
git commit -m "Add firebase config"
git push
```

## Summary

✅ **Single source of truth:** `firebase-config.json`  
✅ **No hardcoded regions** in code  
✅ **Easy to change:** Edit one file, redeploy  
✅ **Version controlled:** Track region changes in Git  
✅ **Consistent:** Front-end and back-end always match  

---

**Current Configuration:**
- **Region:** `us-west1` (Oregon)
- **Project:** `shreyfitweb`
