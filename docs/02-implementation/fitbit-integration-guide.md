# Fitbit Integration Implementation Guide

**Status:** Post-Launch Enhancement  
**Priority:** Low  
**Estimated Time:** 3-4 days  
**Cost:** $0 (Free API access)  
**Complexity:** Medium

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Fitbit Developer Portal Setup](#fitbit-developer-portal-setup)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Data Synchronization](#data-synchronization)
8. [Testing Strategy](#testing-strategy)
9. [Deployment](#deployment)
10. [Security Considerations](#security-considerations)
11. [Troubleshooting](#troubleshooting)

---

## Overview

This guide provides a complete implementation plan for integrating Fitbit devices with the Shreya's Method Fitness platform. The integration will automatically sync activity data (steps, heart rate, sleep, weight) from users' Fitbit devices to the Progress Dashboard.

### Why Fitbit?

- **Cross-Platform:** Works on iOS and Android
- **Free API:** No costs for up to 100 users
- **Comprehensive Data:** Steps, heart rate, sleep, weight, calories
- **Easy Development:** Well-documented API with OAuth 2.0
- **No Device Required:** Can test with Fitbit mobile app

### What Gets Synced

| Metric | Fitbit Endpoint | Maps To |
|--------|----------------|---------|
| Steps | `/activities/steps` | `dailyActivities.steps` |
| Heart Rate | `/activities/heart` | New: `dailyActivities.heartRate` |
| Sleep | `/sleep` | New: `dailyActivities.sleep` |
| Weight | `/body/weight` | `dailyActivities.weight` |
| Calories | `/activities/calories` | New: `dailyActivities.caloriesBurned` |
| Water | `/foods/log/water` | `dailyActivities.waterIntake` |

---

## Prerequisites

### Required Knowledge
- OAuth 2.0 flow
- Firebase Cloud Functions
- Firestore security rules
- Next.js API routes
- Async/await patterns

### Required Tools
- Fitbit Developer account
- Firebase project
- Next.js application

### Dependencies to Install

```bash
npm install axios @types/axios
```

---

## Architecture

### High-Level Flow

```
┌─────────────┐
│   Client    │
│  Dashboard  │
└──────┬──────┘
       │ 1. Click "Connect Fitbit"
       ↓
┌─────────────────┐
│  Next.js API    │
│  /auth/fitbit   │
└────────┬────────┘
         │ 2. Redirect to Fitbit
         ↓
┌─────────────────┐
│ Fitbit OAuth    │
│ Authorization   │
└────────┬────────┘
         │ 3. User authorizes
         ↓
┌─────────────────┐
│  Next.js API    │
│ /auth/callback  │
└────────┬────────┘
         │ 4. Exchange code for tokens
         ↓
┌─────────────────┐
│   Firestore     │
│ fitbitTokens/   │
│   {userId}      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Cloud Function │
│  Daily Sync     │
│  (Scheduled)    │
└────────┬────────┘
         │ 5. Fetch Fitbit data
         ↓
┌─────────────────┐
│   Firestore     │
│ dailyActivities │
└─────────────────┘
```

### Data Flow

1. **User Authorization:** User clicks "Connect Fitbit" → OAuth flow
2. **Token Storage:** Access & refresh tokens stored in Firestore
3. **Daily Sync:** Cloud Function runs daily to fetch data
4. **Data Merge:** Fitbit data merges with manual entries
5. **Display:** Progress Dashboard shows combined data

### Firestore Schema

```typescript
// Collection: fitbitTokens/{userId}
interface FitbitTokens {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scope: string[];
  tokenType: string;
  connectedAt: Timestamp;
  lastSync: Timestamp | null;
  isActive: boolean;
}

// Enhanced: dailyActivities/{userId}_{date}
interface DailyActivityData {
  // Existing fields...
  steps: number;
  waterIntake: number;
  weight?: number;
  
  // New Fitbit fields
  heartRate?: {
    resting: number;
    average: number;
    peak: number;
  };
  sleep?: {
    totalMinutes: number;
    deepMinutes: number;
    lightMinutes: number;
    remMinutes: number;
    awakeMinutes: number;
    efficiency: number;
  };
  caloriesBurned?: number;
  activeMinutes?: number;
  
  // Metadata
  dataSource: 'manual' | 'fitbit' | 'hybrid';
  fitbitSyncedAt?: Timestamp;
}
```

---

## Fitbit Developer Portal Setup

### Step 1: Register Application

1. Go to https://dev.fitbit.com/apps/new
2. Fill out the form:

```
Application Name: Shreya's Method Fitness
Description: Personal training platform for tracking fitness progress
Application Website: https://yourdomain.com (or http://localhost:3000 for dev)
Organization: Your Business Name
Organization Website: https://yourdomain.com

OAuth 2.0 Application Type: Personal
   (Supports up to 100 users, perfect for personal training business)

Callback URL: 
   Development: http://localhost:3000/api/auth/fitbit/callback
   Production: https://yourdomain.com/api/auth/fitbit/callback

Default Access Type: Read & Write
   (Read for data, Write for future features like goal setting)

OAuth 2.0: Yes
Subscriber API: No
```

3. Click "Register" → Instant approval!

### Step 2: Get Credentials

After registration, you'll receive:
- **OAuth 2.0 Client ID:** e.g., `23ABCD`
- **Client Secret:** e.g., `a1b2c3d4e5f6789...`

### Step 3: Store in Environment Variables

**Development (`app/.env.local`):**
```bash
FITBIT_CLIENT_ID=your_client_id_here
FITBIT_CLIENT_SECRET=your_client_secret_here
FITBIT_REDIRECT_URI=http://localhost:3000/api/auth/fitbit/callback
```

**Production (Firebase Environment Config):**
```bash
firebase functions:config:set fitbit.client_id="your_client_id" \
  fitbit.client_secret="your_client_secret" \
  fitbit.redirect_uri="https://yourdomain.com/api/auth/fitbit/callback"
```

---

## Backend Implementation

### 1. Fitbit API Wrapper (`app/src/lib/fitbit-api.ts`)

```typescript
import axios from 'axios';
import { db } from './firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';
const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';

interface FitbitTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  scope: string[];
  tokenType: string;
  connectedAt: Timestamp;
  lastSync: Timestamp | null;
  isActive: boolean;
}

/**
 * Get Fitbit authorization URL for OAuth flow
 */
export function getFitbitAuthUrl(userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.FITBIT_CLIENT_ID!,
    response_type: 'code',
    scope: 'activity heartrate sleep weight nutrition',
    redirect_uri: process.env.FITBIT_REDIRECT_URI!,
    state: userId, // Pass userId to identify user after callback
  });
  
  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = Buffer.from(
      `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      FITBIT_TOKEN_URL,
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: process.env.FITBIT_REDIRECT_URI!,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    const { access_token, refresh_token, expires_in, scope } = response.data;
    
    // Store tokens in Firestore
    const tokensRef = doc(db, 'fitbitTokens', userId);
    await setDoc(tokensRef, {
      userId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
      scope: scope.split(' '),
      tokenType: 'Bearer',
      connectedAt: Timestamp.now(),
      lastSync: null,
      isActive: true,
    } as FitbitTokens);
    
    return { success: true };
  } catch (error: any) {
    console.error('Fitbit token exchange error:', error.response?.data || error);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.message || 'Failed to connect Fitbit',
    };
  }
}

/**
 * Refresh expired access token
 */
async function refreshAccessToken(userId: string): Promise<string | null> {
  try {
    const tokensRef = doc(db, 'fitbitTokens', userId);
    const tokensDoc = await getDoc(tokensRef);
    
    if (!tokensDoc.exists()) {
      throw new Error('No Fitbit tokens found');
    }
    
    const tokens = tokensDoc.data() as FitbitTokens;
    const auth = Buffer.from(
      `${process.env.FITBIT_CLIENT_ID}:${process.env.FITBIT_CLIENT_SECRET}`
    ).toString('base64');
    
    const response = await axios.post(
      FITBIT_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
      }),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    const { access_token, refresh_token, expires_in } = response.data;
    
    // Update tokens
    await setDoc(tokensRef, {
      ...tokens,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Timestamp.fromDate(new Date(Date.now() + expires_in * 1000)),
    }, { merge: true });
    
    return access_token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const tokensRef = doc(db, 'fitbitTokens', userId);
  const tokensDoc = await getDoc(tokensRef);
  
  if (!tokensDoc.exists()) {
    return null;
  }
  
  const tokens = tokensDoc.data() as FitbitTokens;
  
  // Check if token is expired or will expire in next 5 minutes
  const expiresAt = tokens.expiresAt.toDate();
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  if (expiresAt <= fiveMinutesFromNow) {
    // Token expired or expiring soon, refresh it
    return await refreshAccessToken(userId);
  }
  
  return tokens.accessToken;
}

/**
 * Fetch activity data from Fitbit
 */
export async function fetchFitbitData(
  userId: string,
  date: string // Format: YYYY-MM-DD
): Promise<{
  steps?: number;
  heartRate?: any;
  sleep?: any;
  weight?: number;
  calories?: number;
  water?: number;
  activeMinutes?: number;
}> {
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    throw new Error('No valid Fitbit access token');
  }
  
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  try {
    // Fetch all data in parallel
    const [steps, heartRate, sleep, weight, calories, water] = await Promise.all([
      axios.get(`${FITBIT_API_BASE}/activities/steps/date/${date}/1d.json`, { headers }),
      axios.get(`${FITBIT_API_BASE}/activities/heart/date/${date}/1d.json`, { headers }),
      axios.get(`${FITBIT_API_BASE}/sleep/date/${date}.json`, { headers }),
      axios.get(`${FITBIT_API_BASE}/body/log/weight/date/${date}.json`, { headers }),
      axios.get(`${FITBIT_API_BASE}/activities/calories/date/${date}/1d.json`, { headers }),
      axios.get(`${FITBIT_API_BASE}/foods/log/water/date/${date}.json`, { headers }),
    ]);
    
    return {
      steps: steps.data['activities-steps']?.[0]?.value || 0,
      heartRate: heartRate.data['activities-heart']?.[0]?.value || null,
      sleep: sleep.data.summary || null,
      weight: weight.data.weight?.[0]?.weight || null,
      calories: calories.data['activities-calories']?.[0]?.value || 0,
      water: water.data.summary?.water || 0,
      activeMinutes: heartRate.data['activities-heart']?.[0]?.value?.heartRateZones?.find(
        (z: any) => z.name === 'Fat Burn' || z.name === 'Cardio' || z.name === 'Peak'
      )?.minutes || 0,
    };
  } catch (error: any) {
    console.error('Fitbit data fetch error:', error.response?.data || error);
    throw error;
  }
}

/**
 * Check if user has connected Fitbit
 */
export async function isFitbitConnected(userId: string): Promise<boolean> {
  const tokensRef = doc(db, 'fitbitTokens', userId);
  const tokensDoc = await getDoc(tokensRef);
  
  if (!tokensDoc.exists()) {
    return false;
  }
  
  const tokens = tokensDoc.data() as FitbitTokens;
  return tokens.isActive;
}

/**
 * Disconnect Fitbit (revoke tokens)
 */
export async function disconnectFitbit(userId: string): Promise<void> {
  const tokensRef = doc(db, 'fitbitTokens', userId);
  await setDoc(tokensRef, { isActive: false }, { merge: true });
}
```

### 2. OAuth Callback Routes

**`app/src/app/api/auth/fitbit/route.ts`** (Initiate OAuth):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getFitbitAuthUrl } from '@/lib/fitbit-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }
  
  const authUrl = getFitbitAuthUrl(userId);
  
  // Redirect to Fitbit authorization
  return NextResponse.redirect(authUrl);
}
```

**`app/src/app/api/auth/fitbit/callback/route.ts`** (Handle callback):

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/fitbit-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // This is the userId
  const error = searchParams.get('error');
  
  if (error) {
    // User denied authorization
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/activity?fitbit_error=${error}`
    );
  }
  
  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/activity?fitbit_error=invalid_request`
    );
  }
  
  // Exchange code for tokens
  const result = await exchangeCodeForTokens(code, state);
  
  if (result.success) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/activity?fitbit_connected=true`
    );
  } else {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/client/activity?fitbit_error=${result.error}`
    );
  }
}
```

### 3. Data Sync Cloud Function

**`firebase/functions/fitbit-sync.js`:**

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Run daily at 6 AM UTC
exports.syncFitbitData = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      // Get all active Fitbit connections
      const tokensSnapshot = await db.collection('fitbitTokens')
        .where('isActive', '==', true)
        .get();
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      const syncPromises = tokensSnapshot.docs.map(async (tokenDoc) => {
        const userId = tokenDoc.id;
        
        try {
          // Fetch Fitbit data using the fitbit-api functions
          const fitbitData = await fetchFitbitDataForUser(userId, dateStr);
          
          // Merge with existing daily activity data
          const activityRef = db.collection('dailyActivities').doc(`${userId}_${dateStr}`);
          const activityDoc = await activityRef.get();
          
          const existingData = activityDoc.exists ? activityDoc.data() : {};
          
          await activityRef.set({
            ...existingData,
            userId,
            date: dateStr,
            steps: fitbitData.steps || existingData.steps || 0,
            waterIntake: fitbitData.water || existingData.waterIntake || 0,
            weight: fitbitData.weight || existingData.weight,
            heartRate: fitbitData.heartRate,
            sleep: fitbitData.sleep,
            caloriesBurned: fitbitData.calories,
            activeMinutes: fitbitData.activeMinutes,
            dataSource: existingData.steps ? 'hybrid' : 'fitbit',
            fitbitSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          
          // Update last sync time
          await tokenDoc.ref.update({
            lastSync: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          console.log(`Synced Fitbit data for user ${userId}`);
        } catch (error) {
          console.error(`Error syncing Fitbit for user ${userId}:`, error);
        }
      });
      
      await Promise.all(syncPromises);
      console.log(`Completed Fitbit sync for ${tokensSnapshot.size} users`);
    } catch (error) {
      console.error('Fitbit sync function error:', error);
    }
  });

// Helper function (mirrors the client-side fetchFitbitData)
async function fetchFitbitDataForUser(userId, date) {
  // Implementation similar to fetchFitbitData in fitbit-api.ts
  // but using Firebase Admin SDK for token management
}
```

---

## Frontend Implementation

### 1. Connect Fitbit Button Component

**`app/src/components/integrations/ConnectFitbitButton.tsx`:**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { isFitbitConnected, disconnectFitbit } from '@/lib/fitbit-api';
import { Activity, Link, Unlink, Loader2 } from 'lucide-react';

export function ConnectFitbitButton() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    checkConnection();
  }, [user]);
  
  const checkConnection = async () => {
    if (!user) return;
    setLoading(true);
    const connected = await isFitbitConnected(user.uid);
    setIsConnected(connected);
    setLoading(false);
  };
  
  const handleConnect = () => {
    if (!user) return;
    
    // Redirect to OAuth initiation
    window.location.href = `/api/auth/fitbit?userId=${user.uid}`;
  };
  
  const handleDisconnect = async () => {
    if (!user) return;
    
    if (confirm('Disconnect your Fitbit? Your data will remain, but automatic syncing will stop.')) {
      setLoading(true);
      await disconnectFitbit(user.uid);
      setIsConnected(false);
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Checking connection...
      </Button>
    );
  }
  
  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <Activity className="h-4 w-4" />
          <span className="font-medium">Fitbit Connected</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="text-red-600 hover:text-red-700"
        >
          <Unlink className="mr-2 h-4 w-4" />
          Disconnect
        </Button>
      </div>
    );
  }
  
  return (
    <Button onClick={handleConnect} variant="default">
      <Link className="mr-2 h-4 w-4" />
      Connect Fitbit
    </Button>
  );
}
```

### 2. Add to Activity Page

**`app/src/app/dashboard/client/activity/page.tsx`:**

```typescript
import { ConnectFitbitButton } from '@/components/integrations/ConnectFitbitButton';

// Add to the page:
<Card>
  <CardHeader>
    <h3 className="text-lg font-semibold">Device Integrations</h3>
    <CardDescription>
      Connect your fitness devices to automatically sync your activity data
    </CardDescription>
  </CardHeader>
  <CardContent>
    <ConnectFitbitButton />
  </CardContent>
</Card>
```

---

## Data Synchronization

### Sync Strategy

1. **Automatic Sync:** Cloud Function runs daily at 6 AM UTC
2. **Manual Sync:** User can trigger via "Sync Now" button (optional feature)
3. **Real-time:** Not implemented (Fitbit doesn't support webhooks for Personal apps)

### Data Merge Logic

When Fitbit data exists alongside manual entries:

```typescript
// Priority: Manual > Fitbit
const finalSteps = manualSteps || fitbitSteps || 0;

// Hybrid source if both exist
const dataSource = manualSteps && fitbitSteps ? 'hybrid' : 
                   manualSteps ? 'manual' : 'fitbit';
```

### Firestore Rules Update

Add to `firestore.rules`:

```javascript
// Allow users to read their own Fitbit tokens
match /fitbitTokens/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false; // Only backend can write
}
```

---

## Testing Strategy

### Phase 1: Without Physical Device

1. **Install Fitbit Mobile App** (iOS/Android)
2. **Create Fitbit Account** (free)
3. **Manually Log Data:**
   - Steps: 8,000
   - Weight: 75 kg
   - Water: 2000 ml
   - Sleep: 7.5 hours

4. **Test OAuth Flow:**
   - Click "Connect Fitbit"
   - Authorize app
   - Verify redirect back to app
   - Check Firestore for tokens

5. **Test API Calls:**
   - Manually trigger data fetch
   - Verify data appears in `dailyActivities`

### Phase 2: With Test User

1. **Ask Client with Fitbit:**
   - Have them connect their device
   - Monitor sync for 3-5 days
   - Verify accuracy

### Phase 3: Edge Cases

- Expired tokens (wait 8 hours, test refresh)
- Disconnection
- Re-authorization
- No data for a day
- Concurrent manual + Fitbit data

---

## Deployment

### Deployment Checklist

- [ ] Update Fitbit callback URL in Developer Portal
- [ ] Set production environment variables
- [ ] Deploy Cloud Function
- [ ] Update Firestore security rules
- [ ] Test OAuth flow in production
- [ ] Monitor Cloud Function logs

### Environment Variables

**Production:**
```bash
# In Firebase Functions config
firebase functions:config:set \
  fitbit.client_id="YOUR_PROD_CLIENT_ID" \
  fitbit.client_secret="YOUR_PROD_CLIENT_SECRET" \
  fitbit.redirect_uri="https://yourdomain.com/api/auth/fitbit/callback"

# In Next.js
FITBIT_CLIENT_ID=your_prod_client_id
FITBIT_CLIENT_SECRET=your_prod_client_secret
FITBIT_REDIRECT_URI=https://yourdomain.com/api/auth/fitbit/callback
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## Security Considerations

### Best Practices

1. **Never Expose Secrets:**
   - Client Secret stays server-side only
   - Access tokens stored in Firestore, not client

2. **Token Security:**
   - Tokens encrypted at rest (Firestore default)
   - Refresh tokens before expiry
   - Revoke on disconnect

3. **User Privacy:**
   - Only request necessary scopes
   - Allow users to disconnect anytime
   - Clear data disclosure in terms

4. **Rate Limiting:**
   - Fitbit: 150 requests/hour per user
   - Cache data when possible
   - Batch requests in Cloud Function

### GDPR Compliance

- **Right to Access:** Provide Fitbit data export
- **Right to Erasure:** Delete tokens & synced data on request
- **Data Minimization:** Only sync necessary metrics

---

## Troubleshooting

### Common Issues

#### 1. "Invalid Redirect URI"
**Cause:** Callback URL doesn't match registered URL  
**Fix:** Check Fitbit Developer Portal settings match `.env` exactly

#### 2. "Token Expired" Errors
**Cause:** Tokens expire after 8 hours  
**Fix:** Implement auto-refresh (already in code above)

#### 3. "No Data Returned"
**Cause:** User hasn't logged/worn device  
**Fix:** Show message: "No Fitbit data for this date"

#### 4. "403 Forbidden"
**Cause:** Insufficient scope permissions  
**Fix:** Re-authorize with correct scopes

#### 5. Sync Not Running
**Cause:** Cloud Function not deployed or schedule broken  
**Fix:** Check Cloud Function logs in Firebase Console

### Debug Tools

**Check Token Status:**
```typescript
const tokens = await getDoc(doc(db, 'fitbitTokens', userId));
console.log('Tokens:', tokens.data());
console.log('Expires:', tokens.data()?.expiresAt.toDate());
console.log('Active:', tokens.data()?.isActive);
```

**Test API Call:**
```bash
curl -X GET "https://api.fitbit.com/1/user/-/activities/steps/date/2024-12-25/1d.json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Future Enhancements

### Phase 2 Features (Optional)

1. **Multi-Device Support:**
   - Add Apple HealthKit
   - Add Garmin
   - Use Terra API for unified integration

2. **Real-Time Sync:**
   - Upgrade to Fitbit Production app
   - Implement webhook subscriptions
   - Instant data updates

3. **Advanced Metrics:**
   - VO2 Max estimates
   - Training load/recovery
   - Sleep stages analysis
   - Stress/readiness scores

4. **Goal Syncing:**
   - Push goals from platform to Fitbit
   - Two-way sync

---

## Resources

### Documentation
- **Fitbit API Docs:** https://dev.fitbit.com/build/reference/web-api/
- **OAuth 2.0 Flow:** https://dev.fitbit.com/build/reference/web-api/authorization/
- **Rate Limits:** https://dev.fitbit.com/build/reference/web-api/basics/#rate-limits

### Support
- **Fitbit Developer Forum:** https://community.fitbit.com/t5/Web-API/bd-p/
