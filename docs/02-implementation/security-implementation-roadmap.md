# Security Implementation Roadmap
**Date:** December 29, 2025  
**Version:** 1.0  
**Status:** Phase 1 Complete - Email Security ✅

---

## Executive Summary

This document outlines the complete security implementation roadmap for the fitness application, including recently completed features, ongoing work, and future enhancements.

### Current Status

**✅ Phase 1 Complete (Email Security):**
- Email verification system (OTP-based)
- Email change process (secure, verified)
- Password change functionality
- Basic security infrastructure

**🎯 Next Phase (Authentication & Access Control):**
- Two-factor authentication
- Session management
- Password policy enhancements

**📋 Future Phases:**
- Security monitoring & alerts
- Advanced threat detection
- Compliance enhancements

---

## Table of Contents

1. [Completed Features](#1-completed-features)
2. [Security Architecture](#2-security-architecture)
3. [Phase 2: Enhanced Authentication](#3-phase-2-enhanced-authentication)
4. [Phase 3: Session & Access Management](#4-phase-3-session--access-management)
5. [Phase 4: Security Monitoring](#5-phase-4-security-monitoring)
6. [Phase 5: Advanced Security](#6-phase-5-advanced-security)
7. [Implementation Timeline](#7-implementation-timeline)
8. [Security Best Practices](#8-security-best-practices)
9. [Compliance Requirements](#9-compliance-requirements)

---

## 1. Completed Features

### 1.1 Email Verification System ✅

**Status:** Production Ready  
**Completed:** December 29, 2025

#### Features Implemented:

**OTP Generation & Validation:**
- 6-digit random code generation
- 10-minute expiration window
- Maximum 3 verification attempts per code
- Server-side validation (Admin SDK)
- Rate limiting protection

**User Flow:**
1. User provides email during signup
2. System sends OTP via email
3. User enters code within 10 minutes
4. System validates code server-side
5. Account created upon successful verification

**Technical Implementation:**

```typescript
// Frontend: app/src/lib/email-verification-api.ts
export async function sendVerificationCode(email: string)
export async function verifyCode(email: string, code: string)

// Backend: firebase/functions/index.js
exports.sendEmailVerificationCode = onCall(...)
exports.verifyEmailCode = onCall(...)
```

**Security Features:**
- Server-side validation prevents client manipulation
- Time-based expiration (10 min)
- Attempt tracking (max 3 attempts)
- Automatic cleanup of expired codes
- Rate limiting per email address

**Database Schema:**
```typescript
email_verification/{email} {
  code: string,
  createdAt: Timestamp,
  expiresAt: Timestamp,
  attempts: number,
  verified: boolean
}
```

#### Benefits:
- ✅ Prevents fake email signups
- ✅ Ensures user owns email address
- ✅ Reduces spam accounts
- ✅ Improves data quality
- ✅ GDPR/CCPA compliance (verified contact)

---

### 1.2 Email Change Process ✅

**Status:** Production Ready  
**Completed:** December 29, 2025

#### Features Implemented:

**Dual Verification System:**
- **Step 1:** Password authentication (proves OLD email ownership)
- **Step 2:** OTP verification (proves NEW email ownership)
- Admin SDK bypass for Firebase Auth restrictions
- Automatic Stripe customer sync
- Audit trail maintenance

**User Flow:**
1. Click "Change Email" in profile
2. Enter new email address
3. Enter current password (validates OLD email ownership)
4. Receive OTP at NEW email
5. Enter OTP code
6. System validates and updates:
   - Firebase Authentication email
   - Firestore user document
   - Stripe customer email
7. Confirmation sent to both emails

**Technical Implementation:**

```typescript
// Frontend: app/src/components/profile/ChangeEmailDialog.tsx
// API: app/src/lib/profile-api.ts
export async function changeEmail(
  currentPassword: string,
  newEmail: string,
  verificationCode: string
)

// Backend: firebase/functions/index.js
exports.updateUserEmail = onCall({
  region: sharedConfig.region,
  secrets: [stripeKey],
  cors: true,
}, async (request) => {
  // 1. Verify current password
  // 2. Verify OTP code
  // 3. Update Firebase Auth (Admin SDK)
  // 4. Update Firestore
  // 5. Update Stripe customer
  // 6. Send notifications
})
```

**Security Features:**
- Requires current password (prevents unauthorized changes)
- OTP verification ensures new email ownership
- Server-side execution (Admin SDK bypass)
- Atomic updates (all-or-nothing)
- Audit trail (previousEmail, emailChangeDate)
- Notifications to both email addresses

**Data Updates:**
```typescript
// Firestore users/{userId}
{
  email: newEmail,
  previousEmail: oldEmail,
  emailChangeDate: serverTimestamp(),
  emailVerified: true
}

// Firebase Authentication
// Email updated via Admin SDK

// Stripe Customer
customer.email = newEmail
```

#### Benefits:
- ✅ Self-service (reduces support burden)
- ✅ Secure dual verification
- ✅ Maintains data consistency across services
- ✅ Audit trail for compliance
- ✅ User transparency (both emails notified)

---

### 1.3 Password Management ✅

**Status:** Production Ready  
**Implemented:** Previously

#### Features Implemented:

**Password Change:**
- Re-authentication requirement
- Minimum 6 character validation
- Current password verification
- New password confirmation
- Error handling for edge cases

**Security Measures:**
- Must provide current password
- Cannot reuse current password
- Rate limiting (Firebase built-in)
- Session invalidation on change (optional)

**User Experience:**
```typescript
// Profile page security section
1. Click "Change Password"
2. Enter current password
3. Enter new password
4. Confirm new password
5. System validates:
   - Current password correct
   - New password meets requirements
   - New ≠ current password
6. Update password
7. Success confirmation
```

**Error Handling:**
```typescript
auth/wrong-password → "Current password is incorrect"
auth/too-many-requests → "Too many attempts. Try later"
auth/requires-recent-login → "Please log out and back in"
auth/weak-password → "Password too weak (min 6 chars)"
```

#### Current Limitations:
- ❌ No password strength meter
- ❌ No complexity requirements (uppercase, numbers, symbols)
- ❌ No "last changed" date display
- ❌ No password history (prevent reuse)
- ❌ No forced password rotation

#### Recommendations for Enhancement:
- Add password strength indicator
- Display "last changed" date
- Implement complexity rules
- Add password history (last 5 passwords)

---

## 2. Security Architecture

### 2.1 Current Security Stack

**Authentication:**
- Firebase Authentication (email/password)
- Session management (Firebase tokens)
- Role-based access control (RBAC)

**Authorization:**
- Firestore Security Rules
- Cloud Function access control
- API route protection

**Data Protection:**
- HTTPS everywhere (enforced)
- E.164 phone formatting
- Encrypted storage (Firebase default)
- PII handling best practices

**Audit & Compliance:**
- Email verification
- Email change tracking
- Data export capability (GDPR)
- Account deletion (planned - GDPR/CCPA)

### 2.2 Security Layers

```
┌─────────────────────────────────────────┐
│  Layer 1: Network Security              │
│  - HTTPS/TLS encryption                 │
│  - CORS policies                        │
│  - Rate limiting                        │
└─────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  Layer 2: Authentication                │
│  - Email/password ✅                    │
│  - Email verification ✅                │
│  - Password change ✅                   │
│  - Email change ✅                      │
│  - 2FA ❌ (Phase 2)                     │
└─────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  Layer 3: Authorization                 │
│  - Firestore rules ✅                   │
│  - Role-based access ✅                 │
│  - Session management ⚠️ (Basic)        │
└─────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  Layer 4: Data Protection               │
│  - Encryption at rest ✅                │
│  - Encryption in transit ✅             │
│  - PII handling ✅                      │
│  - Data export ✅                       │
└─────────────────────────────────────────┘
           ▼
┌─────────────────────────────────────────┐
│  Layer 5: Monitoring & Response         │
│  - Audit logs ⚠️ (Basic)                │
│  - Security alerts ❌                   │
│  - Threat detection ❌                  │
└─────────────────────────────────────────┘
```

### 2.3 Centralized Configuration

**Region Configuration:**
- `firebase-config.json` - Single source of truth
- Auto-applied to frontend & backend
- Consistent function deployment

**Environment Variables:**
```bash
# Frontend (.env.local)
NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION=us-west1

# Backend (firebase/functions/.env)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 3. Phase 2: Enhanced Authentication

**Target Timeline:** 2-3 Weeks  
**Priority:** High  
**Estimated Effort:** 8-12 days

### 3.1 Two-Factor Authentication (2FA)

**Priority:** P1 - High  
**Effort:** 5-7 days

#### Features to Implement:

**3.1.1 SMS-Based 2FA**

**User Flow:**
1. Enable 2FA in security settings
2. Enter phone number
3. Receive verification SMS
4. Enter verification code
5. 2FA enabled with backup codes

**Login Flow with 2FA:**
1. Enter email & password
2. System checks if 2FA enabled
3. Send SMS code
4. User enters code
5. Grant access

**Technical Requirements:**

```typescript
// Database schema
users/{userId} {
  security: {
    twoFactorEnabled: boolean,
    twoFactorMethod: 'sms' | 'totp' | null,
    twoFactorPhone?: string,
    backupCodes: string[],  // Array of 10 backup codes
    twoFactorEnabledAt?: Timestamp
  }
}

// Cloud Functions
exports.enableTwoFactor = onCall(...)
exports.verifyTwoFactor = onCall(...)
exports.disableTwoFactor = onCall(...)
exports.regenerateBackupCodes = onCall(...)
```

**Security Considerations:**
- Backup codes (10 codes, single-use)
- SMS vendor selection (Twilio recommended)
- Rate limiting (max 3 SMS per 5 minutes)
- Encrypted phone storage
- Audit log for 2FA events

**Implementation Steps:**
1. **Day 1-2:** Backend setup
   - Cloud Functions for 2FA
   - SMS integration (Twilio)
   - Backup code generation
   - Database schema updates

2. **Day 3-4:** Frontend UI
   - Enable 2FA dialog
   - Phone verification flow
   - Backup codes display
   - 2FA login flow

3. **Day 5:** Testing
   - Unit tests
   - Integration tests
   - Edge cases (lost phone, etc.)

4. **Days 6-7:** Documentation & Polish
   - User guide
   - Troubleshooting docs
   - UX refinements

**Cost Estimate:**
- Twilio SMS: ~$0.0075 per SMS
- Expected volume: 500 users × 2 SMS/month = $7.50/month

---

**3.1.2 Authenticator App (TOTP) - Alternative**

**Priority:** P2 - Medium (After SMS 2FA)  
**Effort:** 3-4 days

**Benefits over SMS:**
- No SMS costs
- Works offline
- More secure (no SMS interception)

**Implementation:**
```typescript
// Use libraries
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

// Generate secret
const secret = speakeasy.generateSecret({
  name: 'ShreyFit',
  issuer: 'ShreyFit'
});

// Generate QR code
const qrCode = await QRCode.toDataURL(secret.otpauth_url);

// Verify token
const verified = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: 'base32',
  token: userToken,
  window: 2  // Allow 2-step time difference
});
```

**Supported Apps:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password

---

### 3.2 Password Policy Enhancements

**Priority:** P1 - High  
**Effort:** 2-3 days

#### Features to Implement:

**3.2.1 Password Strength Meter**

**Visual Indicator:**
```
Weak     [■□□□□] Must contain 8+ chars
Fair     [■■□□□] Add uppercase letter
Good     [■■■□□] Add number
Strong   [■■■■□] Add symbol
Excellent [■■■■■] Great password!
```

**Requirements:**
- Minimum 8 characters (upgrade from 6)
- At least 1 uppercase letter
- At least 1 number
- At least 1 special character
- No common passwords (check against list)

**Implementation:**
```typescript
// app/src/lib/password-utils.ts
export function calculatePasswordStrength(password: string) {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };
  
  strength = Object.values(checks).filter(Boolean).length;
  
  return {
    strength, // 0-5
    checks,
    label: ['Weak', 'Fair', 'Good', 'Strong', 'Excellent'][strength] || 'Weak'
  };
}
```

**UI Component:**
```tsx
<PasswordStrengthMeter 
  password={password}
  onStrengthChange={(strength) => setStrength(strength)}
/>
```

---

**3.2.2 Password Last Changed Display**

**Location:** Security section of profile page

**Display:**
```
Password
Last changed: December 25, 2024 (4 days ago)
[Change Password]
```

**Database Update:**
```typescript
users/{userId} {
  security: {
    passwordLastChanged: Timestamp,
    passwordChangedCount: number
  }
}
```

**Auto-update on password change:**
```typescript
await updateDoc(doc(db, 'users', userId), {
  'security.passwordLastChanged': serverTimestamp(),
  'security.passwordChangedCount': increment(1)
});
```

---

**3.2.3 Password History**

**Prevent Reuse:**
- Store hashed versions of last 5 passwords
- Check new password against history
- Display error if match found

**Database Schema:**
```typescript
users/{userId} {
  security: {
    passwordHistory: [
      {
        hash: string,  // bcrypt hash
        changedAt: Timestamp
      }
    ]
  }
}
```

**Validation:**
```typescript
// Server-side only
import * as bcrypt from 'bcrypt';

const newPasswordHash = await bcrypt.hash(newPassword, 10);

// Check against history
for (const old of passwordHistory) {
  if (await bcrypt.compare(newPassword, old.hash)) {
    throw new Error('Cannot reuse recent password');
  }
}
```

---

### 3.3 Security Status Dashboard

**Priority:** P2 - Medium  
**Effort:** 2 days

**Location:** New section in profile page or dedicated `/dashboard/client/security` page

**Dashboard Components:**

```tsx
┌─────────────────────────────────────────┐
│  Security Status Overview               │
├─────────────────────────────────────────┤
│  ✅ Email Verified                      │
│  ✅ Strong Password                     │
│  ❌ Two-Factor Authentication (Setup)   │
│  ✅ Recent Login Activity Normal        │
│  ⚠️  Password Changed 180 days ago     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Security Score: 75/100                 │
│  [■■■■■■■■□□] Good                      │
│                                         │
│  Recommendations:                       │
│  1. Enable two-factor authentication    │
│  2. Update your password (it's old)     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Quick Actions                          │
│  - Enable 2FA                           │
│  - Change Password                      │
│  - View Login History                   │
│  - Download Security Report             │
└─────────────────────────────────────────┘
```

**Security Score Calculation:**
```typescript
function calculateSecurityScore(user: User): number {
  let score = 0;
  
  // Email verified (20 points)
  if (user.emailVerified) score += 20;
  
  // Strong password (20 points)
  if (user.security?.passwordStrength === 'strong') score += 20;
  
  // 2FA enabled (30 points)
  if (user.security?.twoFactorEnabled) score += 30;
  
  // Password age (15 points)
  const daysSinceChange = getDaysSince(user.security?.passwordLastChanged);
  if (daysSinceChange < 90) score += 15;
  else if (daysSinceChange < 180) score += 10;
  else if (daysSinceChange < 365) score += 5;
  
  // Recent login (15 points)
  const daysSinceLogin = getDaysSince(user.security?.lastLogin);
  if (daysSinceLogin < 7) score += 15;
  else if (daysSinceLogin < 30) score += 10;
  else if (daysSinceLogin < 90) score += 5;
  
  return score;
}
```

---

## 4. Phase 3: Session & Access Management

**Target Timeline:** 1-2 Months  
**Priority:** Medium  
**Estimated Effort:** 10-15 days

### 4.1 Active Sessions Management

**Priority:** P1 - Medium  
**Effort:** 5-6 days

#### Features to Implement:

**4.1.1 Session Tracking**

**Display Active Sessions:**
```
Active Sessions

┌─────────────────────────────────────────┐
│  🖥️  Chrome on Windows                  │
│  San Francisco, CA                      │
│  Last active: 2 minutes ago             │
│  IP: 192.168.1.100                     │
│  [This device] [Sign Out]              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  📱 Safari on iPhone                    │
│  San Francisco, CA                      │
│  Last active: 1 hour ago                │
│  IP: 192.168.1.101                     │
│  [Sign Out]                             │
└─────────────────────────────────────────┘

[Sign Out All Other Sessions]
```

**Database Schema:**
```typescript
user_sessions/{sessionId} {
  userId: string,
  deviceType: 'desktop' | 'mobile' | 'tablet',
  browser: string,
  os: string,
  ipAddress: string,
  location: {
    city: string,
    state: string,
    country: string
  },
  createdAt: Timestamp,
  lastActiveAt: Timestamp,
  tokenExpiry: Timestamp,
  isActive: boolean
}
```

**Session Creation:**
```typescript
// On successful login
await addDoc(collection(db, 'user_sessions'), {
  userId: user.uid,
  deviceType: detectDeviceType(),
  browser: detectBrowser(),
  os: detectOS(),
  ipAddress: request.ip,
  location: await getLocationFromIP(request.ip),
  createdAt: serverTimestamp(),
  lastActiveAt: serverTimestamp(),
  tokenExpiry: getTokenExpiry(),
  isActive: true
});
```

**Session Cleanup:**
```typescript
// Scheduled function - runs hourly
exports.cleanupExpiredSessions = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const expiredSessions = await db.collection('user_sessions')
      .where('tokenExpiry', '<', now)
      .where('isActive', '==', true)
      .get();
    
    const batch = db.batch();
    expiredSessions.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });
    await batch.commit();
  });
```

---

**4.1.2 Remote Sign Out**

**Single Session Sign Out:**
```typescript
exports.signOutSession = functions.https.onCall(async (data, context) => {
  const { sessionId } = data;
  const userId = context.auth.uid;
  
  // Verify session belongs to user
  const session = await db.collection('user_sessions')
    .doc(sessionId)
    .get();
    
  if (session.data().userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // Deactivate session
  await session.ref.update({
    isActive: false,
    signedOutAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Revoke Firebase tokens (if possible)
  // Note: Firebase doesn't support per-session token revocation
  // Instead, rely on token expiry
  
  return { success: true };
});
```

**Sign Out All Other Sessions:**
```typescript
exports.signOutAllOtherSessions = functions.https.onCall(async (data, context) => {
  const { currentSessionId } = data;
  const userId = context.auth.uid;
  
  // Get all active sessions except current
  const sessions = await db.collection('user_sessions')
    .where('userId', '==', userId)
    .where('isActive', '==', true)
    .get();
  
  const batch = db.batch();
  sessions.docs.forEach(doc => {
    if (doc.id !== currentSessionId) {
      batch.update(doc.ref, {
        isActive: false,
        signedOutAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  });
  
  await batch.commit();
  return { success: true, count: sessions.size - 1 };
});
```

---

### 4.2 Login History

**Priority:** P2 - Medium  
**Effort:** 3-4 days

**Display Login History:**
```
Login History (Last 30 Days)

┌─────────────────────────────────────────┐
│  ✅ Successful Login                    │
│  Dec 29, 2025 at 7:30 PM                │
│  Chrome on Windows • San Francisco, CA  │
│  IP: 192.168.1.100                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ❌ Failed Login Attempt                │
│  Dec 28, 2025 at 3:15 PM                │
│  Unknown Browser • Los Angeles, CA      │
│  IP: 203.0.113.42                      │
│  Reason: Invalid password               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ✅ Successful Login                    │
│  Dec 27, 2025 at 9:00 AM                │
│  Safari on iPhone • San Francisco, CA   │
│  IP: 192.168.1.101                     │
└─────────────────────────────────────────┘

[Export History] [View All]
```

**Database Schema:**
```typescript
login_history/{logId} {
  userId: string,
  success: boolean,
  timestamp: Timestamp,
  ipAddress: string,
  location: {
    city: string,
    state: string,
    country: string
  },
  device: {
    type: string,
    browser: string,
    os: string
  },
  failureReason?: string,
  sessionId?: string  // If successful
}
```

**Capture Login Events:**
```typescript
// On successful login
await addDoc(collection(db, 'login_history'), {
  userId: user.uid,
  success: true,
  timestamp: serverTimestamp(),
  ipAddress: request.ip,
  location: await getLocationFromIP(request.ip),
  device: getDeviceInfo(),
  sessionId: sessionId
});

// On failed login
await addDoc(collection(db, 'login_history'), {
  userId: attemptedUserId,
  success: false,
  timestamp: serverTimestamp(),
  ipAddress: request.ip,
  location: await getLocationFromIP(request.ip),
  device: getDeviceInfo(),
  failureReason: error.code
});
```

**Cleanup Policy:**
- Retain login history for 90 days
- Auto-delete older entries
- Keep suspicious activity logs longer (365 days)

---

### 4.3 Security Alerts

**Priority:** P2 - Medium  
**Effort:** 2-3 days

**Alert Types:**

1. **New Device Login**
   - Email when login from new device/location
   - Option to secure account if unauthorized

2. **Password Changed**
   - Immediate email notification
   - Link to secure account if unauthorized

3. **Email Changed**
   - Already implemented ✅
   - Notifications to both old and new emails

4. **Failed Login Attempts**
   - Alert after 5 failed attempts in 15 minutes
   - Temporary account lock option

5. **2FA Disabled**
   - Immediate notification
   - Require re-authentication to disable

**Email Templates:**

```
Subject: New Device Login to Your Account

Hi [Name],

A new device logged into your Shrey.Fit account:

Device: Chrome on Windows
Location: Los Angeles, CA
Time: Dec 29, 2025 at 7:30 PM
IP: 203.0.113.42

Was this you?
[Yes, This Was Me] [No, Secure My Account]

If you didn't log in, secure your account immediately:
- Change your password
- Enable two-factor authentication
- Review active sessions

Questions? Reply to this email.

- Shrey.Fit Security Team
```

**Implementation:**
```typescript
// Cloud Function triggered on new session creation
exports.onNewSession = functions.firestore
  .document('user_sessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const session = snap.data();
    
    // Check if device is new
    const existingSessions = await db.collection('user_sessions')
      .where('userId', '==', session.userId)
      .where('deviceType', '==', session.deviceType)
      .where('browser', '==', session.browser)
      .get();
    
    if (existingSessions.size === 1) {
      // First time this device/browser combo
      await sendNewDeviceAlert(session);
    }
  });
```

---

## 5. Phase 4: Security Monitoring

**Target Timeline:** 3-4 Months  
**Priority:** Low  
**Estimated Effort:** 8-10 days

### 5.1 Security Audit Log

**Purpose:** Comprehensive logging of all security-related events

**Events to Log:**
- Login attempts (success/failure)
- Password changes
- Email changes
- 2FA enrollment/unenrollment
- Security settings changes
- Data exports
- Account deletion requests
- Session sign-outs
- Failed authorization attempts

**Database Schema:**
```typescript
security_audit_log/{logId} {
  userId: string,
  eventType: 'login' | 'password_change' | 'email_change' | '2fa_enable' | ...,
  success: boolean,
  timestamp: Timestamp,
  ipAddress: string,
  userAgent: string,
  details: {
    // Event-specific details
  },
  riskLevel: 'low' | 'medium' | 'high',
  flagged: boolean
}
```

**Query Interface:**
```typescript
// Admin dashboard
const suspiciousActivity = await db.collection('security_audit_log')
  .where('riskLevel', 'in', ['medium', 'high'])
  .where('timestamp', '>', last24Hours)
  .orderBy('timestamp', 'desc')
  .limit(100)
  .get();
```

---

### 5.2 Threat Detection

**Suspicious Activity Patterns:**

1. **Brute Force Detection**
   - 5+ failed logins in 15 minutes
   - Temporary account lock (30 minutes)
   - Alert user via email

2. **Impossible Travel**
   - Logins from distant locations within short time
   - Alert user for verification

3. **Account Takeover Indicators**
   - Password changed + email changed within 1 hour
   - New device + immediate data export
   - Multiple sessions from different locations

4. **Unusual Activity**
   - Login at unusual hours
   - Multiple failed 2FA attempts
   - Rapid account changes

**Implementation:**
```typescript
// Real-time threat detection
exports.detectThreats = functions.firestore
  .document('login_history/{logId}')
  .onCreate(async (snap, context) => {
    const login = snap.data();
    const threats = [];
    
    // Check for brute force
    const recentFailed = await getRecentFailedLogins(
      login.userId,
      15 // minutes
    );
    if (recentFailed >= 5) {
      threats.push({
        type: 'brute_force',
        severity: 'high'
      });
    }
    
    // Check for impossible travel
    const lastLogin = await getLastSuccessfulLogin(login.userId);
    if (lastLogin) {
      const distance = calculateDistance(
        lastLogin.location,
        login.location
      );
      const timeDiff = login.timestamp - lastLogin.timestamp;
      const speed = distance / timeDiff; // km/h
      
      if (speed > 800) { // Faster than plane
        threats.push({
          type: 'impossible_travel',
          severity: 'high'
        });
      }
    }
    
    if (threats.length > 0) {
      await logThreat(login.userId, threats);
      await alertUser(login.userId, threats);
    }
  });
```

---

## 6. Phase 5: Advanced Security

**Target Timeline:** 6+ Months  
**Priority:** Low  
**Estimated Effort:** Variable

### 6.1 Biometric Authentication

**Platforms:** Mobile app (future)

**Features:**
- Face ID / Touch ID
- Fingerprint recognition
- Secure enclave storage

### 6.2 Hardware Security Keys

**Standards:** WebAuthn / FIDO2

**Benefits:**
- Phishing-resistant
- No SMS interception
- Physical device required

### 6.3 Advanced Threat Intelligence

**Features:**
- IP reputation checking
- Behavioral analysis
- Machine learning anomaly detection
- Integration with security databases

---

## 7. Implementation Timeline

### Summary Timeline

```
Phase 1: Email Security ✅ (Completed Dec 29, 2025)
├── Email verification system
├── Email change process
└── Password management

Phase 2: Enhanced Authentication 🎯 (Next, 2-3 weeks)
├── Two-factor authentication (5-7 days)
├── Password policy enhancements (2-3 days)
└── Security status dashboard (2 days)

Phase 3: Session & Access Management (1-2 months)
├── Active sessions management (5-6 days)
├── Login history (3-4 days)
└── Security alerts (2-3 days)

Phase 4: Security Monitoring (3-4 months)
├── Security audit log (3-4 days)
└── Threat detection (5-6 days)

Phase 5: Advanced Security (6+ months)
├── Biometric authentication
├── Hardware security keys
└── Advanced threat intelligence
```

### Detailed Phase 2 Timeline

**Week 1:**
- Days 1-2: 2FA backend (Cloud Functions, SMS integration)
- Days 3-4: 2FA frontend (UI components, flows)
- Day 5: 2FA testing

**Week 2:**
- Days 1-2: Password policy (strength meter, validation)
- Day 3: Password history & "last changed" display
- Days 4-5: Security dashboard

**Week 3:**
- Buffer for testing, bug fixes, documentation

---

## 8. Security Best Practices

### 8.1 Development Practices

**Code Security:**
- ✅ Never store secrets in code
- ✅ Use environment variables for sensitive data
- ✅ Validate all user inputs (client & server)
- ✅ Sanitize data before storage
- ✅ Use parameterized queries (Firestore handles this)

**Authentication:**
- ✅ Always use HTTPS
- ✅ Implement proper session management
- ✅ Use secure, httpOnly cookies when possible
- ✅ Implement rate limiting
- ✅ Log security events

**Authorization:**
- ✅ Principle of least privilege
- ✅ Check permissions on every request
- ✅ Server-side validation (never trust client)
- ✅ Firestore Security Rules as first line of defense

### 8.2 Data Protection

**Encryption:**
- ✅ In transit: TLS 1.3 (Firebase default)
- ✅ At rest: AES-256 (Firebase default)
- ⚠️ Sensitive fields: Consider additional encryption

**PII Handling:**
- ✅ Collect only necessary data
- ✅ Clear retention policies
- ✅ User data export capability
- ✅ Account deletion capability
- ✅ Anonymization for analytics

**Backups:**
- ✅ Automated daily backups (Firestore)
- ✅ Point-in-time recovery
- ✅ Backup encryption
- ✅ Regular backup testing

### 8.3 Incident Response

**Preparation:**
1. Security incident response plan
2. Designated security contact
3. Communication templates
4. Legal counsel contact

**Detection:**
1. Monitor audit logs
2. Review security alerts
3. User reports
4. Automated threat detection

**Response:**
1. Assess severity
2. Contain breach
3. Investigate root cause
4. Notify affected users (if required)
5. Document incident

**Recovery:**
1. Implement fixes
2. Test security
3. Monitor for recurrence
4. Post-mortem review

### 8.4 Security Testing

**Regular Testing:**
- Unit tests for security functions
- Integration tests for auth flows
- Penetration testing (annually)
- Security audits (before major releases)

**Automated Scanning:**
- Dependency vulnerability scanning
- Code security scanning (SAST)
- Infrastructure scanning

**Manual Review:**
- Code reviews (security focus)
- Firestore Rules review
- Cloud Function permissions review

---

## 9. Compliance Requirements

### 9.1 GDPR (General Data Protection Regulation)

**Requirements Met:** ✅

1. **Right to Access**
   - ✅ Users can view all their data in profile
   - ✅ Data export functionality

2. **Right to Rectification**
   - ✅ Users can update profile information
   - ✅ Self-service email change

3. **Right to Erasure**
   - ⚠️ Account deletion (in account-management-analysis.md, needs implementation)

4. **Right to Data Portability**
   - ✅ JSON export of user data

5. **Lawful Basis for Processing**
   - ✅ Email verification (proves consent)
   - ✅ Terms of Service acceptance

6. **Data Protection by Design**
   - ✅ Minimal data collection
   - ✅ Encryption by default
   - ✅ Regular security reviews

### 9.2 CCPA (California Consumer Privacy Act)

**Requirements Met:** ✅

1. **Right to Know**
   - ✅ Privacy policy explains data collection
   - ✅ Users can view collected data

2. **Right to Delete**
   - ⚠️ Account deletion (needs implementation)

3. **Right to Opt-Out**
   - ✅ Marketing preferences
   - ✅ Data collection preferences

4. **Non-Discrimination**
   - ✅ No service degradation for opt-outs

### 9.3 PCI DSS (Payment Card Industry)

**Compliance:** Handled by Stripe ✅

- All payment processing via Stripe
- No card data stored in our systems
- PCI DSS Level 1 certified (Stripe)

### 9.4 HIPAA (Health Insurance Portability)

**Status:** Not Applicable

- Fitness data is not protected health information (PHI)
- No integration with healthcare providers
- No medical diagnosis or treatment

**Note:** If future features include medical integration:
- HIPAA Business Associate Agreement required
- Additional security controls needed
- Audit trail requirements
- Encryption requirements (already met)

---

## 10. Success Metrics

### 10.1 Security Metrics

**Authentication:**
- 2FA adoption rate (target: >30% in 6 months)
- Failed login attempts per user (target: <0.5/month)
- Password reset frequency (target: <5%/month)
- Email verification success rate (target: >95%)

**Account Security:**
- Accounts with strong passwords (target: >70%)
- Password age (target: <180 days avg)
- Active session count per user (target: <3)
- Suspicious activity detected (target: <0.1%)

**User Trust:**
- Security feature usage (2FA, data export, etc.)
- Support tickets for security issues (target: <2%/month)
- User-reported security incidents (target: 0)

### 10.2 Compliance Metrics

**Data Protection:**
- Data export requests (track volume)
- Account deletion requests (track volume)
- Data breach incidents (target: 0)
- Privacy policy updates (track dates)

**Audit & Monitoring:**
- Security audit log completeness (target: 100%)
- Alert response time (target: <1 hour)
- False positive rate (target: <5%)

---

## 11. Resources & Tools

### 11.1 Third-Party Services

**SMS (Twilio):**
- Account: twilio.com
- Cost: ~$0.0075/SMS
- Documentation: twilio.com/docs

**Email (Current):**
- Provider: Firebase / Sendgrid (to be configured)
- Templates: in /docs/email-templates

**IP Geolocation:**
- Service: ipapi.com or ipstack.com
- Free tier: 1,000 requests/day
- Used for: Session tracking, threat detection

### 11.2 Development Tools

**Testing:**
- Jest: Unit testing
- Cypress: E2E testing
- Postman: API testing

**Security Scanning:**
- npm audit: Dependency scanning
- ESLint: Code quality
- SonarQube: Security scanning (optional)

**Monitoring:**
- Firebase Console: Error tracking
- Google Cloud Logging: Log aggregation
- Sentry: Error monitoring (optional)

### 11.3 Documentation

**Internal Docs:**
- `/docs/02-implementation/` - Implementation guides
- `/docs/04-architecture/` - Architecture decisions
- `/docs/03-legal/` - Legal policies

**External Docs:**
- Firebase Security: firebase.google.com/docs/rules
- Stripe Security: stripe.com/docs/security
- OWASP Top 10: owasp.org/www-project-top-ten

---

## 12. Appendix

### 12.1 Security Checklist

**Pre-Launch:**
- [x] Email verification implemented
- [x] Email change process implemented
- [x] Password change implemented
- [x] HTTPS enforced
- [x] Firestore Security Rules reviewed
- [x] Data export capability
- [ ] 2FA implemented
- [ ] Account deletion implemented
- [ ] Security monitoring in place

**Ongoing:**
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Penetration testing
- [ ] Incident response drills
- [ ] User security education

### 12.2 Emergency Contacts

**Security Team:**
- Lead: [To be assigned]
- Email: security@shrey.fit

**External Resources:**
- Legal Counsel: [To be assigned]
- Security Consultant: [Optional]
- Firebase Support: firebase.google.com/support

**Incident Reporting:**
- Internal: security@shrey.fit
- Users: support@shrey.fit

### 12.3 Glossary

**2FA:** Two-Factor Authentication  
**CCPA:** California Consumer Privacy Act  
**CORS:** Cross-Origin Resource Sharing  
**GDPR:** General Data Protection Regulation  
**HTTPS:** Hypertext Transfer Protocol Secure  
**OTP:** One-Time Password  
**PCI DSS:** Payment Card Industry Data Security Standard  
**PII:** Personally Identifiable Information  
**RBAC:** Role-Based Access Control  
**TLS:** Transport Layer Security  
**TOTP:** Time-based One-Time Password

---

**Document End**

Version: 1.0  
Last Updated: December 29, 2025  
Next Review: January 29, 2026
