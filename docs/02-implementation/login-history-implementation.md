# Login History Implementation

## Overview
This document describes the client-side login history feature that displays account login activity on the user profile page. This implementation provides users with visibility into their account access patterns and helps detect suspicious activity.

**Note:** This is a **client-side display feature only**. The actual login tracking (creating login_history records) must be implemented separately via Firebase Authentication triggers or Cloud Functions.

## Implementation Status

### ✅ Completed (Frontend Display)
- TypeScript types for login history data
- API functions for fetching login history
- UI components for displaying login history
- Security rules for reading login history
- Firestore composite indexes
- Suspicious activity detection (client-side)
- CSV export functionality

### ❌ Not Implemented (Backend Tracking)
- Firebase Auth trigger to create login_history records
- Device detection and IP geolocation
- Login attempt tracking (success/failure)
- Backend suspicious activity detection

## Architecture

### Data Model

**Collection:** `login_history`

**Document Structure:**
```typescript
{
  id: string;                    // Auto-generated document ID
  userId: string;                // User's UID
  timestamp: Timestamp;          // When the login occurred
  success: boolean;              // Whether login was successful
  
  device: {
    type: 'desktop' | 'mobile' | 'tablet';
    browser: string;             // e.g., "Chrome", "Firefox"
    os: string;                  // e.g., "Windows 11", "iOS"
    userAgent?: string;          // Full user agent string
  };
  
  location: {
    ip: string;                  // Anonymized IP (e.g., "192.168.x.x")
    city: string;
    state: string;
    country: string;
    countryCode: string;         // e.g., "US", "IN"
  };
  
  // For failed logins
  failureReason?: 'wrong-password' | 'user-not-found' | 
                  'too-many-requests' | 'account-disabled' | 
                  'network-error';
  attemptNumber?: number;        // Number of consecutive failures
  
  createdAt: Timestamp;
}
```

### Frontend Components

#### 1. `app/src/types/login-history.ts`
TypeScript type definitions for login history data.

#### 2. `app/src/lib/login-history-api.ts`
API functions:
- `getMyLoginHistory(limitCount)` - Fetch user's login history
- `getLoginHistoryStats()` - Calculate summary statistics
- `detectSuspiciousActivity(history)` - Client-side suspicious activity detection
- `exportLoginHistory()` - Export login history to CSV

#### 3. `app/src/components/security/LoginHistoryItem.tsx`
Component to display individual login history entry with:
- Success/failure status
- Date and time
- Device and browser information
- Location
- Suspicious activity indicator

#### 4. `app/src/components/security/LoginHistoryCard.tsx`
Main component displaying:
- Suspicious activity alerts
- Login statistics (total, successful, failed, locations)
- Most used device
- Recent login history (last 30 days)
- Export to CSV functionality
- Show more/less functionality

#### 5. Profile Page Integration
Added `<LoginHistoryCard />` to `app/src/app/dashboard/client/profile/page.tsx`

### Security Rules

**Firestore Rules** (`firestore.rules`):
```javascript
match /login_history/{logId} {
  // Users can only read their own login history
  allow read: if isAuthenticated() && 
                 resource.data.userId == request.auth.uid;
  
  // Only backend functions can write login history
  allow write: if false;
}
```

### Firestore Indexes

**Required composite index** (`firestore.indexes.json`):
```json
{
  "collectionGroup": "login_history",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "timestamp",
      "order": "DESCENDING"
    }
  ]
}
```

## Features

### 1. Login History Display
- Shows last 30 days of login activity by default
- Displays device, browser, OS, and location for each login
- Indicates successful vs failed logins
- Expandable to show full history

### 2. Statistics Dashboard
- Total logins
- Successful logins
- Failed logins  
- Unique locations
- Most used device

### 3. Suspicious Activity Detection (Client-Side)
The system flags potentially suspicious activity based on:
- **Multiple failed logins:** 3+ failed attempts in last 7 days
- **Unusual locations:** Logins from cities not commonly used (less than 3 logins historically)

**Limitations:** This is client-side detection only. For production, implement backend detection with Firebase Cloud Functions.

### 4. CSV Export
Users can export their login history to CSV format including:
- Date and time
- Status (success/failure with reason)
- Device type and browser
- Location (city, state, country)
- IP address (anonymized)

### 5. Privacy & Data Retention
- IP addresses should be anonymized (last octet masked)
- Records retained for 90 days (to be implemented in backend)
- Users can export their full history

## Backend Implementation TODO

To complete this feature, you need to implement backend login tracking:

### Step 1: Create Cloud Function for Auth Triggers

```javascript
// firebase/functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Track successful logins
exports.trackLoginSuccess = functions.auth.user().onCreate(async (user) => {
  // This only fires on account creation, not logins
  // For actual login tracking, you need a different approach
});

// Better approach: Use Cloud Functions with HTTP triggers
exports.trackLogin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');
  }
  
  const { device, location } = data;
  
  await admin.firestore().collection('login_history').add({
    userId: context.auth.uid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    success: true,
    device: device,
    location: location,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return { success: true };
});
```

### Step 2: Call from Client on Login

In your authentication flow (e.g., `app/src/lib/auth-context.tsx` or login component):

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

async function trackLoginAttempt(success: boolean, failureReason?: string) {
  try {
    const functions = getFunctions();
    const trackLogin = httpsCallable(functions, 'trackLogin');
    
    // Detect device and location (client-side approximation)
    const device = detectDevice(); // Implement device detection
    const location = await getApproximateLocation(); // Use IP geolocation API
    
    await trackLogin({
      device,
      location,
      success,
      failureReason
    });
  } catch (error) {
    console.error('Failed to track login:', error);
    // Don't block login on tracking failure
  }
}
```

### Step 3: Device Detection Library

Consider using a library like `ua-parser-js` for device detection:

```bash
npm install ua-parser-js
```

```typescript
import UAParser from 'ua-parser-js';

function detectDevice() {
  const parser = new UAParser();
  const result = parser.getResult();
  
  return {
    type: result.device.type || 'desktop',
    browser: result.browser.name || 'Unknown',
    os: `${result.os.name} ${result.os.version}`,
    userAgent: navigator.userAgent
  };
}
```

### Step 4: IP Geolocation

Use a service like ipapi.co or ipinfo.io:

```typescript
async function getApproximateLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    return {
      ip: anonymizeIP(data.ip), // Implement IP anonymization
      city: data.city || 'Unknown',
      state: data.region || 'Unknown',
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || 'XX'
    };
  } catch (error) {
    return {
      ip: 'Unknown',
      city: 'Unknown',
      state: 'Unknown',
      country: 'Unknown',
      countryCode: 'XX'
    };
  }
}

function anonymizeIP(ip: string): string {
  // Mask last octet for privacy
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = 'x';
    return parts.join('.');
  }
  return ip;
}
```

### Step 5: Data Retention (Optional)

Create a scheduled Cloud Function to clean up old records:

```javascript
exports.cleanupOldLoginHistory = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const ninetyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    
    const snapshot = await admin.firestore()
      .collection('login_history')
      .where('createdAt', '<', ninetyDaysAgo)
      .get();
    
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
    console.log(`Deleted ${snapshot.size} old login history records`);
  });
```

## Testing

### Test with Mock Data

To test the frontend without backend implementation, you can manually create test documents in Firestore:

```javascript
// Run in Firebase Console or script
const loginHistory = {
  userId: 'YOUR_USER_ID',
  timestamp: firebase.firestore.Timestamp.now(),
  success: true,
  device: {
    type: 'desktop',
    browser: 'Chrome',
    os: 'Windows 11'
  },
  location: {
    ip: '192.168.x.x',
    city: 'San Francisco',
    state: 'CA',
    country: 'United States',
    countryCode: 'US'
  },
  createdAt: firebase.firestore.Timestamp.now()
};

db.collection('login_history').add(loginHistory);
```

## Security Considerations

1. **IP Anonymization:** Always anonymize IP addresses before storing
2. **Data Retention:** Auto-delete records after 90 days for privacy
3. **Read-Only Access:** Users can only read, not modify their login history
4. **Backend-Only Writes:** Only Cloud Functions can create login records
5. **Rate Limiting:** Implement rate limiting on login tracking to prevent abuse

## Future Enhancements

1. **Two-Factor Authentication:** Integrate with 2FA system
2. **Active Sessions Management:** Track and manage active sessions
3. **Real-time Alerts:** Email/SMS notifications for suspicious activity
4. **Blocklist:** Allow users to block specific IPs or devices
5. **Login Approval:** Require approval for logins from new devices/locations
6. **More Detailed Device Info:** Track screen resolution, time zone, etc.
7. **Backend Anomaly Detection:** ML-based suspicious activity detection

## Deployment Checklist

- [ ] Deploy Firestore security rules
- [ ] Deploy Firestore composite indexes
- [ ] Deploy frontend components (already done)
- [ ] Implement backend login tracking (Cloud Functions)
- [ ] Set up IP geolocation service
- [ ] Test login tracking in development
- [ ] Test suspicious activity detection
- [ ] Verify CSV export functionality
- [ ] Set up data retention policy
- [ ] Update privacy policy to mention login tracking
- [ ] Deploy to production

## Related Documentation

- [Security Implementation Roadmap](./security-implementation-roadmap.md)
- [Account Management Analysis](./account-management-analysis.md)
- [User Authentication](./user-authentication.md)

## Support

For questions or issues with this feature, refer to:
- Firebase Authentication documentation
- Firebase Cloud Functions documentation
- IP Geolocation API documentation (ipapi.co, ipinfo.io)
