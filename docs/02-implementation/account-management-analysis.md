# Account Management Comprehensive Analysis
**Date:** December 27, 2025  
**Version:** 1.0  
**Status:** Complete Analysis

---

## Executive Summary

This document provides a comprehensive analysis of account-related actions and features in the fitness application, identifying what has been implemented, what critical gaps exist, and what is required for launch.

### Key Findings

**✅ Implemented & Production-Ready:**
- Profile management (comprehensive)
- Billing & payment method management
- 1-on-1 session management system
- Data export (GDPR compliant)

**❌ Critical Gaps (Launch Blockers):**
- Subscription management (pause/cancel/resume)
- Account deletion workflow
- Email change process
- Basic security features

**⚠️ Recommended for Post-Launch:**
- Two-factor authentication
- Account activity log
- Usage analytics dashboard
- App-specific settings page

---

## Table of Contents

1. [Current Implementation Status](#current-implementation-status)
2. [Critical Gaps Analysis](#critical-gaps-analysis)
3. [App Settings Evaluation](#app-settings-evaluation)
4. [Account Information Dashboard](#account-information-dashboard)
5. [Launch Requirements Matrix](#launch-requirements-matrix)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Technical Specifications](#technical-specifications)
8. [User Experience Flows](#user-experience-flows)
9. [Recommendations](#recommendations)

---

## 1. Current Implementation Status

### 1.1 Profile Management (`/dashboard/client/profile`)

**Status:** ✅ Fully Functional & Production-Ready

#### Features Implemented:

**Profile Photo Management:**
- ✅ Upload with crop tool (ImageCropModal)
- ✅ Image optimization (small/large versions)
- ✅ Firebase Storage integration
- ✅ Real-time display updates
- ✅ File validation (type, size limits)

**Personal Information:**
- ✅ Full name (required field)
- ✅ Preferred name (optional)
- ✅ Email address (read-only, with support contact notice)
- ✅ Phone number (with E.164 formatting & validation)
- ✅ Date of birth
- ✅ Gender selection
- ✅ Real-time updates to auth context

**Location/Address:**
- ✅ Google Places autocomplete integration
- ✅ Full address fields (street, city, state, country, zip)
- ✅ Structured address storage
- ✅ Manual edit capability after autocomplete

**Emergency Contact:**
- ✅ Contact name
- ✅ Phone number (validated E.164 format)
- ✅ Relationship dropdown
- ✅ Medical notes (optional, for trainer awareness)
- ✅ Nested object storage in Firestore

**Communication Preferences:**
- ✅ Workout reminders toggle
- ✅ New assignments notifications toggle
- ✅ Progress updates toggle
- ✅ Trainer messages toggle
- ✅ Marketing communications toggle
- ✅ Notification frequency selection (real-time/daily/weekly/off)
- ✅ Banner indicating email service not yet configured

**Security:**
- ✅ Change password functionality
- ✅ Re-authentication requirement
- ✅ Password validation (min 6 chars, no reuse)
- ✅ Specific error messages (wrong password, too many attempts)
- ❌ "Coming Soon" badges for 2FA, active sessions, login history

**Data Management:**
- ✅ Download personal data (GDPR compliant JSON export)
- ✅ Export includes profile, address, emergency contact, preferences
- ❌ "Coming Soon" for pause subscription
- ❌ "Coming Soon" for cancel subscription
- ❌ "Coming Soon" for delete account

#### Technical Architecture:

**Data Storage:**
```typescript
users/{userId} {
  // Personal Info
  name: string
  preferredName?: string
  email: string (read-only)
  phone?: string (E.164 format)
  dateOfBirth?: string
  gender?: string
  
  // Profile Photos
  profilePhotoSmall?: string
  profilePhotoLarge?: string
  
  // Address (nested object)
  address?: {
    street?: string
    city?: string
    state?: string (2-letter code)
    country?: string (2-letter code)
    zipCode?: string
  }
  
  // Emergency Contact (nested object)
  emergencyContact?: {
    name?: string
    phone?: string (E.164 format)
    relationship?: string
    medicalNotes?: string
  }
  
  // Notification Preferences (nested object)
  notificationPreferences?: {
    workoutReminders: boolean
    newAssignments: boolean
    progressUpdates: boolean
    trainerMessages: boolean
    marketing: boolean
    frequency: 'real-time' | 'daily' | 'weekly' | 'off'
  }
}
```

**Key Components:**
- `ImageCropModal` - Profile photo cropping
- `AddressAutocomplete` - Google Places integration
- Phone validation utilities (`validateAndFormatPhone`, `formatPhoneForDisplay`)
- Image processing utilities (`processAndUploadProfilePhoto`)

**Validation:**
- Phone: E.164 format validation with display formatting
- Profile photo: Type checking (image/*), size limit (5MB)
- Password: Min 6 chars, no current password reuse
- All updates use Firestore transactions for atomicity

---

### 1.2 Billing Management (`/dashboard/client/billing`)

**Status:** ✅ Fully Functional & Production-Ready

#### Features Implemented:

**Current Payment Method Display:**
- ✅ Card brand and last 4 digits
- ✅ Expiration date display
- ✅ Link payment method support
- ✅ Alternative payment method support
- ✅ Visual card styling

**Payment Method Updates:**
- ✅ "Update Payment Method" button
- ✅ Stripe Customer Portal integration (restricted config)
- ✅ Opens in same window with return URL
- ✅ Real-time refresh after update
- ✅ Loading state handling

**Next Payment Information:**
- ✅ Next payment date display
- ✅ Next payment amount calculation
- ✅ Visual calendar indicator

**Payment History:**
- ✅ Complete transaction table
- ✅ Date and time display with timezone
- ✅ Product name (subscription tier)
- ✅ Activity description (payment/created/updated)
- ✅ Amount formatting by currency
- ✅ Payment method used (masked)
- ✅ Status badges (succeeded/pending/failed)
- ✅ Receipt download links

**Support Integration:**
- ✅ Help banner with coach inbox link
- ✅ Billing email link
- ✅ Error messaging

#### Technical Architecture:

**Stripe Integration:**
```typescript
// Customer Portal Configuration
- Uses restricted portal config (payment methods only)
- No subscription cancellation access
- Configuration ID in environment variables
- Fallback to default config if not set

// Cloud Functions
- getBillingHistory: Fetches invoices, subscriptions, payment methods
- createPaymentMethodPortalSession: Opens restricted portal
```

**Data Flow:**
1. Fetch Stripe customer ID from `stripe_customers/{userId}`
2. Call `getBillingHistory` Cloud Function
3. Parse invoices for transaction history
4. Extract payment method from subscription or charges
5. Calculate next payment from subscription period
6. Display formatted data with real-time updates

**Payment Method Extraction:**
```javascript
// Priority order for payment method:
1. Current payment method from API
2. Subscription default payment method
3. Latest charge payment method details

// Handles multiple types:
- Card (brand + last4)
- Link (email or country)
- Other payment methods (display type)
```

---

### 1.3 Session Management System

**Status:** ✅ Fully Functional & Production-Ready

#### Buy Sessions Page (`/dashboard/client/sessions/buy`)

**Features:**
- ✅ Session balance display (prominent card)
- ✅ Pricing comparison cards (Single $70, 4-Pack $240)
- ✅ Savings calculation display
- ✅ Stripe Checkout integration
- ✅ Purchase history table
- ✅ Expiration warnings (7 days before)
- ✅ Package status tracking

**Architecture:**
```typescript
// Session Balance (in users document)
sessionBalance: {
  available: number,    // Computed from packages
  purchased: number,    // Lifetime total
  used: number,         // Lifetime used
  expired: number,      // Lifetime expired
  lastUpdated: Timestamp
}

// Session Packages (array in users document)
sessionPackages: [
  {
    id: string,
    type: 'single' | '4-pack',
    quantity: number,
    remaining: number,
    purchaseDate: Timestamp,
    expirationDate: Timestamp,  // 60 days from purchase
    expired: boolean,
    stripePaymentIntentId: string,
    stripePriceId: string
  }
]
```

#### Schedule Sessions Page (`/dashboard/client/sessions/schedule`)

**Features:**
- ✅ Calendly widget integration
- ✅ Session balance check (prevents booking if zero)
- ✅ Upcoming sessions list
- ✅ Session cancellation (with 24hr policy)
- ✅ Location display (private or training location)
- ✅ Confirmation dialogs
- ✅ Real-time balance updates

**Business Logic:**
- ✅ FIFO package deduction (oldest unexpired first)
- ✅ 60-day expiration from purchase
- ✅ 24+ hour cancellation = credit return
- ✅ <24 hour cancellation = no credit (no-show policy)
- ✅ Trainer cancellation = always credit return

**Sessions Collection:**
```typescript
sessions/{sessionId} {
  clientId: string,
  clientName: string,
  clientEmail: string,
  trainerId: string,
  packageId: string,          // Which package was used
  calendlyEventId: string,
  scheduledDate: Timestamp,
  duration: number,
  status: 'scheduled' | 'completed' | 'canceled' | 'no-show',
  canceledBy?: 'client' | 'trainer',
  creditReturned: boolean,
  locationId: string,
  locationType: 'private' | 'training_location',
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### Sidebar Integration:

**Real-time Balance Display:**
- ✅ Shows available sessions in sidebar
- ✅ Green badge with count
- ✅ Real-time listener on user document
- ✅ Updates immediately on purchase/use
- ✅ Listener registered with centralized registry

---

## 2. Critical Gaps Analysis

### 2.1 Subscription Management (MISSING - CRITICAL)

**Status:** ❌ Not Implemented (Launch Blocker)

#### What's Missing:

**Current State:**
- Profile page shows "Coming Soon" badges
- No ability for clients to manage subscriptions
- No self-service cancellation
- No pause/resume capability
- No subscription status visibility

**Required Features:**

1. **View Subscription Status**
   - Current plan name and pricing
   - Billing cycle (monthly)
   - Next billing date
   - Subscription start date
   - Subscription status (active/paused/canceled)

2. **Cancel Subscription**
   - Cancel at end of period (retain access until paid period ends)
   - Immediate cancellation option
   - Clear refund policy display
   - Confirmation workflow with alternatives
   - Email confirmation

3. **Pause Subscription**
   - Pause for 1-3 months
   - Medical/vacation use cases
   - Auto-resume capability
   - Email notification
   - Clear terms display

4. **Resume Subscription**
   - For paused subscriptions
   - Immediate billing restart
   - Email confirmation

5. **Subscription History**
   - Plan changes log
   - Pause/resume history
   - Status change dates
   - Reasons for changes (if provided)

#### Technical Requirements:

**Stripe Integration:**
```javascript
// Cancel subscription
stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true  // or cancel_at: 'now'
});

// Pause subscription
stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'mark_uncollectible',
    resumes_at: timestamp
  }
});

// Resume subscription
stripe.subscriptions.update(subscriptionId, {
  pause_collection: null
});
```

**Cloud Functions Needed:**
- `cancelSubscription(userId, cancelAtPeriodEnd, reason?)`
- `pauseSubscription(userId, resumeDate, reason?)`
- `resumeSubscription(userId)`
- `getSubscriptionDetails(userId)`

**Database Updates:**
```typescript
users/{userId} {
  subscription: {
    stripeSubscriptionId: string,
    status: 'active' | 'paused' | 'canceled' | 'past_due',
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: boolean,
    pausedUntil?: Timestamp,
    canceledAt?: Timestamp,
    cancelReason?: string,
    history: [
      {
        action: 'created' | 'paused' | 'resumed' | 'canceled',
        date: Timestamp,
        reason?: string,
        by: 'client' | 'admin'
      }
    ]
  }
}
```

#### UX Requirements:

**Cancel Flow:**
1. Navigate to subscription page
2. Click "Cancel Subscription"
3. Show retention dialog ("Are you sure? Consider pausing instead...")
4. Explain consequences (lose access at period end, no refund)
5. Require confirmation ("Type CANCEL to confirm")
6. Show success message with dates
7. Send email confirmation

**Pause Flow:**
1. Click "Pause Subscription"
2. Select duration (1, 2, or 3 months)
3. Enter optional reason
4. Confirm pause dates
5. Show success message
6. Send email confirmation with resume date

---

### 2.2 Account Deletion (MISSING - COMPLIANCE ISSUE)

**Status:** ❌ Not Implemented (GDPR/CCPA Violation)

#### Why It's Critical:

**Legal Requirements:**
- GDPR Article 17: "Right to erasure"
- CCPA Section 1798.105: "Right to deletion"
- Without this, you cannot legally operate in EU or California
- Fines: Up to €20M or 4% of annual revenue (GDPR)

**Current State:**
- Profile page shows "Coming Soon"
- No deletion capability at all
- Data export exists (good first step)

#### Required Features:

1. **Delete Account Request**
   - Accessible from profile page
   - Clear explanation of consequences
   - Multi-step confirmation process
   - Final confirmation via email

2. **Pre-Deletion Checklist**
   - Export data reminder (automatic download)
   - Outstanding balance warning
   - Active session credits warning
   - Subscription cancellation (if not done)
   - Refund policy display

3. **Confirmation Workflow**
   - Require current password entry
   - Type "DELETE" to confirm
   - Email verification link
   - 7-day grace period option

4. **Data Deletion Process**
   - Delete user document
   - Delete all related data (sessions, messages, progress photos)
   - Delete authentication account
   - Cancel Stripe subscription
   - Delete Stripe customer (optional, can anonymize)
   - Send confirmation email before deletion

5. **Retention Policy**
   - Financial records: Keep 7 years (legal requirement)
   - Anonymize instead of delete (keep transaction IDs)
   - Clear explanation to user

#### Technical Requirements:

**Cloud Function:**
```javascript
async function deleteUserAccount(userId, reason?) {
  // 1. Verify user authentication
  // 2. Export final data copy
  // 3. Cancel active subscriptions
  // 4. Delete or anonymize related data:
  //    - sessions (anonymize)
  //    - messages (delete)
  //    - progress_photos (delete from Storage)
  //    - activity_logs (delete)
  //    - workout_assignments (anonymize)
  // 5. Delete user document
  // 6. Delete Firebase Authentication account
  // 7. Send confirmation email
  // 8. Log deletion for compliance
}
```

**Database Changes:**
```typescript
// Add deletion tracking
user_deletions/{deletionId} {
  userId: string,
  email: string,
  deletionDate: Timestamp,
  reason?: string,
  dataExported: boolean,
  subscriptionCanceled: boolean,
  relatedDataRemoved: {
    sessions: boolean,
    messages: boolean,
    photos: boolean,
    // ... other collections
  }
}
```

**Anonymization vs Deletion:**
```javascript
// Financial records - anonymize
sessions/{sessionId} {
  clientId: 'DELETED_USER',
  clientName: 'Deleted User',
  clientEmail: 'deleted@example.com',
  // Keep transaction details for compliance
}

// Personal data - delete
DELETE progress_photos/{photoId}
DELETE client_messages/{messageId}
DELETE activity_logs/{logId}
```

#### UX Flow:

**Step 1: Initial Request**
- Navigate to Profile > Account & Data Management
- Click "Delete Account"
- Show warning modal with consequences

**Step 2: Pre-Deletion Actions**
- Automatic data export initiated
- Check for active subscription (must cancel first)
- Check for unused session credits (offer refund?)
- Display refund policy

**Step 3: Confirmation**
- Require password entry
- Type "DELETE" to proceed
- Send verification email
- Option for 7-day grace period

**Step 4: Execution**
- Process deletion request
- Send final confirmation email
- Display "Account Deleted" message
- Redirect to public site

---

### 2.3 Email Change Process (INCOMPLETE)

**Status:** ⚠️ Partially Implemented (Manual Only)

#### Current State:

**What Exists:**
- Email field is read-only in profile
- Message: "Contact support to change email"

**What's Missing:**
- No self-service email change
- No documentation of support process
- No verification workflow

#### Required Features:

**Option A: Self-Service (Recommended)**

1. **Request Email Change**
   - Click "Change Email" button
   - Enter new email address
   - Enter current password (security check)
   - Submit request

2. **Verification Workflow**
   - Send verification email to NEW address
   - Send notification to OLD address
   - Both emails include cancellation links
   - 24-hour verification window

3. **Complete Change**
   - Click verification link in new email
   - Update Firebase Authentication email
   - Update Firestore user email
   - Update Stripe customer email
   - Send confirmation to both addresses

4. **Security Measures**
   - Require current password
   - Rate limiting (max 3 attempts/day)
   - Log email changes
   - Option to revert (within 24 hours)

**Option B: Manual Process (Minimum Viable)**

1. **Document Support Process**
   - Create support form for email change
   - Clear instructions in profile
   - Expected response time
   - Required information

2. **Support Workflow**
   - Verify identity (security questions, payment info)
   - Manual update in Firebase Console
   - Update Stripe customer
   - Send confirmation emails

#### Technical Requirements:

**Cloud Function (Self-Service):**
```javascript
async function requestEmailChange(userId, newEmail, password) {
  // 1. Verify password
  // 2. Check new email not already in use
  // 3. Generate verification token
  // 4. Send verification emails
  // 5. Store pending change in Firestore
  // 6. Set expiration (24 hours)
}

async function verifyEmailChange(token) {
  // 1. Validate token
  // 2. Check not expired
  // 3. Update Firebase Auth email
  // 4. Update Firestore email
  // 5. Update Stripe customer email
  // 6. Send confirmations
  // 7. Log change
}
```

**Database Schema:**
```typescript
// Pending email changes
email_change_requests/{requestId} {
  userId: string,
  oldEmail: string,
  newEmail: string,
  verificationToken: string,
  requestedAt: Timestamp,
  expiresAt: Timestamp,
  verified: boolean,
  verifiedAt?: Timestamp,
  canceledAt?: Timestamp
}

// Email change log
email_change_log/{logId} {
  userId: string,
  oldEmail: string,
  newEmail: string,
  changedAt: Timestamp,
  method: 'self-service' | 'support',
  verifiedBy?: string
}
```

---

### 2.4 Security Features (MISSING)

**Status:** ❌ Partially Implemented

#### What's Implemented:
- ✅ Password change functionality
- ✅ Re-authentication requirement
- ✅ Password validation

#### What's Missing:

**1. Two-Factor Authentication (2FA)**
- ❌ SMS-based 2FA
- ❌ Authenticator app support (TOTP)
- ❌ Backup codes
- ❌ 2FA enrollment flow
- ❌ 2FA management page

**2. Active Sessions Management**
- ❌ List of active sessions (device, location, last active)
- ❌ Sign out all other sessions
- ❌ Sign out specific session
- ❌ Session notifications (new device login)

**3. Login History**
- ❌ Recent logins (date, time, device, location, IP)
- ❌ Failed login attempts
- ❌ Password change history
- ❌ Export login history

**4. Security Alerts**
- ❌ Email on new device login
- ❌ Email on password change
- ❌ Email on 2FA enrollment/removal
- ❌ Suspicious activity detection

**5. Password Requirements Display**
- ⚠️ Basic validation exists (min 6 chars)
- ❌ No strength meter
- ❌ No complexity requirements display
- ❌ No "last changed" date shown

#### Recommendations:

**For Launch:**
- Display password last changed date
- Show basic security status
- Plan for 2FA post-launch

**Post-Launch (Priority):**
- 2FA implementation (Phase 2)
- Active sessions management (Phase 2)
- Login history (Phase 3)
- Security alerts (Phase 3)

---

## 3. App Settings Evaluation

### Current State

**No dedicated Settings page exists.** Most "settings" are in Profile page:
- ✅ Notification preferences
- ✅ Contact information
- ✅ Profile details
- ❌ No app-specific preferences

### Potential Settings to Consider

#### Display Preferences:
- ❌ Theme (light/dark mode)
- ❌ Units (lbs/kg, miles/km)
- ❌ Date format (MM/DD/YYYY vs DD/MM/YYYY)
- ❌ Time format (12h vs 24h)
- ❌ Language selection

#### Privacy Settings:
- ❌ Who can view progress photos (trainer only vs shared)
- ❌ Share workout data with trainer
- ❌ Allow trainer to see activity data
- ❌ Analytics opt-out
- ❌ Marketing preferences (already in profile)

#### Workout Preferences:
- ❌ Default workout view (list vs calendar)
- ❌ Auto-start rest timer
- ❌ Rest timer duration defaults
- ❌ Exercise video autoplay

#### Notification Settings:
- ✅ Email preferences (already in profile)
- ❌ Push notifications (when mobile app launches)
- ❌ SMS notifications
- ❌ In-app notification sounds

#### Integration Settings:
- ❌ Connected apps (Fitbit, Apple Health, Google Fit)
- ❌ Data sync preferences
- ❌ Auto-sync toggles
- ⚠️ Shows "Coming Soon" in sidebar

### Recommendation: **DO NOT BUILD SETTINGS PAGE AT LAUNCH**

**Rationale:**
1. Current profile page handles essentials well
2. No overwhelming number of preferences yet
3. Can add settings page when you have >5 app preferences
4. Focus launch efforts on critical gaps (subscription, deletion)

**Post-Launch Settings Priority:**
1. **Phase 2:** Theme preference (if users request)
2. **Phase 2:** Units preference (international users)
3. **Phase 3:** Workout preferences (after usage patterns emerge)
4. **Phase 4:** Advanced privacy controls

---

## 4. Account Information Dashboard

### Current Distribution of Information

| Information | Location | Status |
|------------|----------|--------|
| Personal Info | Profile | ✅ Complete |
| Profile Photo | Profile | ✅ Complete |
| Address | Profile | ✅ Complete |
| Emergency Contact | Profile | ✅ Complete |
| Notification Preferences | Profile | ✅ Complete |
| Password Management | Profile | ✅ Complete |
| Data Export | Profile | ✅ Complete |
| | | |
| Payment Method | Billing | ✅ Complete |
| Payment History | Billing | ✅ Complete |
| Next Payment | Billing | ✅ Complete |
| | | |
| Session Balance | Sessions + Sidebar | ✅ Complete |
| Purchase History | Sessions | ✅ Complete |
| Upcoming Sessions | Sessions | ✅ Complete |
| | | |
| Subscription Status | ❌ Nowhere | ❌ Missing |
| Subscription History | ❌ Nowhere | ❌ Missing |
| Account Created Date | Profile (member since) | ✅ Complete |
| Last Login | ❌ Nowhere | ❌ Missing |
| Usage Statistics | ❌ Nowhere | ❌ Missing |

### Missing: Centralized Account Overview

**What Clients Want to See at a Glance:**
1. Account status summary
2. Subscription tier and benefits
3. Payment status
4. Session credits
5. Recent activity
6. Quick actions

**Recommendation:** 
- Not critical for launch
- Can add account overview dashboard in Phase 2
- Current navigation works adequately

### Proposed Account Overview (Future)

**Route:** `/dashboard/client/account`

**Sections:**
1. **Account Status Card**
   - Member since: Date
   - Subscription: Active/Paused/Canceled
   - Next billing: Date/Amount
   - Session credits: Count

2. **Quick Actions**
   - Update payment method
   - Buy sessions
   - Update profile
   - Download data

3. **Usage Statistics**
   - Workouts completed this month
   - Sessions attended this month
   - Last login
   - Days active (streak)

4. **Recent Activity**
   - Last 5 transactions
   - Last 5 workouts
   - Last 5 sessions

---

## 5. Launch Requirements Matrix

### Critical (Blocking Launch)

| Feature | Status | Priority | Estimated Effort | Compliance Impact |
|---------|--------|----------|------------------|-------------------|
| Subscription Management | ❌ Missing | P0 | 3-4 days | Business Critical |
| - Cancel subscription | ❌ Missing | P0 | 1 day | Business Critical |
| - Pause subscription | ❌ Missing | P0 | 1 day | Business Critical |
| - Resume subscription | ❌ Missing | P0 | 0.5 day | Business Critical |
| - Subscription history | ❌ Missing | P1 | 1 day | Nice to have |
| | | | | |
| Account Deletion | ❌ Missing | P0 | 2-3 days | **GDPR/CCPA Required** |
| - Deletion workflow | ❌ Missing | P0 | 1 day | **Legal Requirement** |
| - Data anonymization | ❌ Missing | P0 | 1 day | **Legal Requirement** |
| - Confirmation process | ❌ Missing | P0 | 0.5 day | User Protection |

**Total Critical Effort: 5-7 days**

### High Priority (Launch Risk)

| Feature | Status | Priority | Estimated Effort | Impact |
|---------|--------|----------|------------------|--------|
| Email Change Process | ⚠️ Partial | P1 | 2-3 days | User Support |
| - Self-service flow | ❌ Missing | P1 | 2 days | Support Burden |
| - OR documented manual process | ⚠️ Needs Doc | P1 | 0.5 day | Minimum Viable |
| | | | | |
| Password Security | ⚠️ Basic | P1 | 1 day | Security |
| - Last changed date | ❌ Missing | P1 | 0.5 day | User Awareness |
| - Strength requirements | ⚠️ Basic | P1 | 0.5 day | Security |

**Total High Priority Effort: 3-4 days**

### Medium Priority (Post-Launch)

| Feature | Status | Priority | Estimated Effort | Impact |
|---------|--------|----------|------------------|--------|
| Two-Factor Authentication | ❌ Missing | P2 | 3-5 days | Security |
| Active Sessions Management | ❌ Missing | P2 | 2-3 days | Security |
| Login History | ❌ Missing | P2 | 2 days | Transparency |
| Account Overview Dashboard | ❌ Missing | P2 | 2-3 days | UX Enhancement |
| Security Alerts | ❌ Missing | P3 | 2 days | Security |
| App Settings Page | ❌ Missing | P3 | 2-3 days | UX Enhancement |
| Usage Analytics | ❌ Missing | P3 | 3-4 days | Engagement |

**Total Medium Priority Effort: 16-24 days (spread over Phase 2 & 3)**

---

## 6. Implementation Roadmap

### Phase 1: Launch Blockers (5-7 Days)

**Goal:** Address critical compliance and business requirements

#### Day 1-2: Subscription Management Page
- [ ] Create `/dashboard/client/subscription` route and page
- [ ] Build subscription status display component
- [ ] Implement cancel subscription flow
  - Cloud Function: `cancelSubscription`
  - Stripe API integration
  - Confirmation dialog
  - Email notification
- [ ] Add refund policy display
- [ ] Update navigation/sidebar

#### Day 3-4: Pause/Resume Subscription
- [ ] Implement pause subscription flow
  - Cloud Function: `pauseSubscription`
  - Duration selection (1-3 months)
  - Stripe API integration
- [ ] Implement resume subscription flow
  - Cloud Function: `resumeSubscription`
  - Immediate billing restart
- [ ] Add subscription history log
- [ ] Testing (all subscription states)

#### Day 5-6: Account Deletion
- [ ] Create account deletion workflow component
- [ ] Build confirmation process
  - Password verification
  - "DELETE" typing confirmation
  - Email verification
- [ ] Implement deletion Cloud Function
  - Data export automation
  - Data anonymization logic
  - Subscription cancellation
  - Storage cleanup
- [ ] Add deletion tracking collection
- [ ] Email notifications

#### Day 7: Testing & Documentation
- [ ] End-to-end testing
- [ ] Edge case testing
- [ ] Documentation updates
- [ ] Legal review (refund policy, deletion policy)

**Deliverables:**
- ✅ Self-service email change (or documented manual process)
- ✅ Enhanced password security displays
- ✅ Account overview dashboard
- ✅ Improved subscription management UX

---

### Phase 3: Advanced Features (1-2 Months)

**Goal:** Add advanced security and engagement features

#### Month 1: Security & Compliance
- [ ] Two-factor authentication
  - SMS verification
  - Authenticator app support
  - Backup codes
- [ ] Active sessions management
  - Session list
  - Remote logout
- [ ] Security alerts
  - New device emails
  - Suspicious activity detection

#### Month 2: Analytics & Engagement
- [ ] Usage analytics dashboard
  - Login streak
  - Workout completion rate
  - Session attendance rate
- [ ] Login history
- [ ] Enhanced data export options

**Deliverables:**
- ✅ 2FA system (fully functional)
- ✅ Session management dashboard
- ✅ Usage analytics
- ✅ Security alert system

---

## 7. Technical Specifications

### 7.1 New Routes Required

```typescript
// Client routes to add
/dashboard/client/subscription       // Subscription management page
/dashboard/client/account            // Account overview (Phase 2)
/dashboard/client/security           // Security settings (Phase 3)

// API endpoints (Cloud Functions)
/api/subscription/cancel            // Cancel subscription
/api/subscription/pause             // Pause subscription
/api/subscription/resume            // Resume subscription
/api/subscription/status            // Get subscription details
/api/account/delete                 // Delete account
/api/account/export                 // Export data (exists)
/api/email/change-request           // Request email change (Phase 2)
/api/email/verify-change            // Verify email change (Phase 2)
```

### 7.2 Database Schema Additions

```typescript
// Add to users/{userId}
subscription: {
  stripeSubscriptionId: string,
  status: 'active' | 'paused' | 'canceled' | 'past_due',
  tier: string,
  currentPeriodStart: Timestamp,
  currentPeriodEnd: Timestamp,
  cancelAtPeriodEnd: boolean,
  canceledAt?: Timestamp,
  cancelReason?: string,
  pausedAt?: Timestamp,
  pausedUntil?: Timestamp,
  pauseReason?: string,
  history: [
    {
      action: 'created' | 'upgraded' | 'downgraded' | 'paused' | 'resumed' | 'canceled',
      date: Timestamp,
      reason?: string,
      by: 'client' | 'admin' | 'system',
      details?: any
    }
  ]
}

security: {
  passwordLastChanged?: Timestamp,
  twoFactorEnabled?: boolean,
  twoFactorMethod?: 'sms' | 'totp',
  lastLogin?: Timestamp,
  lastLoginIP?: string,
  lastLoginDevice?: string
}

// New collections

// Account deletion tracking
user_deletions/{deletionId} {
  userId: string,
  email: string,
  requestedAt: Timestamp,
  scheduledFor: Timestamp,
  deletedAt?: Timestamp,
  canceledAt?: Timestamp,
  reason?: string,
  dataExported: boolean,
  subscriptionCanceled: boolean,
  relatedDataStatus: {
    sessions: 'anonymized' | 'deleted',
    messages: 'deleted',
    photos: 'deleted',
    activities: 'deleted',
    workouts: 'anonymized'
  }
}

// Email change requests
email_change_requests/{requestId} {
  userId: string,
  oldEmail: string,
  newEmail: string,
  verificationToken: string,
  oldEmailToken: string,
  requestedAt: Timestamp,
  expiresAt: Timestamp,
  verified: boolean,
  verifiedAt?: Timestamp,
  canceledAt?: Timestamp,
  canceledBy?: 'user' | 'system'
}

// Subscription history log
subscription_history/{logId} {
  userId: string,
  action: string,
  subscriptionId: string,
  previousStatus?: string,
  newStatus: string,
  timestamp: Timestamp,
  reason?: string,
  initiatedBy: 'client' | 'admin' | 'system',
  metadata?: any
}
```

### 7.3 Cloud Functions to Implement

```javascript
// Subscription Management
exports.cancelSubscription = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Get subscription from Stripe
  // 3. Cancel subscription (end of period or immediate)
  // 4. Update user document
  // 5. Log to subscription history
  // 6. Send confirmation email
  // 7. Return success
});

exports.pauseSubscription = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Validate pause duration (1-3 months)
  // 3. Pause in Stripe
  // 4. Update user document
  // 5. Log to subscription history
  // 6. Send confirmation email
  // 7. Return success
});

exports.resumeSubscription = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Resume in Stripe
  // 3. Update user document
  // 4. Log to subscription history
  // 5. Send confirmation email
  // 6. Return success
});

exports.getSubscriptionDetails = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Fetch from Stripe
  // 3. Fetch from Firestore
  // 4. Combine and return
});

// Account Deletion
exports.requestAccountDeletion = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Verify password
  // 3. Check for active subscriptions
  // 4. Export user data automatically
  // 5. Create deletion request (7-day grace period)
  // 6. Send confirmation emails
  // 7. Return success
});

exports.executeAccountDeletion = functions.https.onCall(async (data, context) => {
  // 1. Verify deletion token
  // 2. Cancel subscriptions
  // 3. Anonymize financial records (sessions, payments)
  // 4. Delete personal data (messages, photos, activities)
  // 5. Delete user document
  // 6. Delete Firebase Auth account
  // 7. Log deletion
  // 8. Send final confirmation
});

exports.cancelAccountDeletion = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication
  // 2. Cancel deletion request
  // 3. Send confirmation email
});

// Scheduled function for auto-deletion after grace period
exports.processScheduledDeletions = functions.pubsub.schedule('every 24 hours')
  .onRun(async (context) => {
    // 1. Query deletion requests where scheduledFor < now
    // 2. Execute deletion for each
    // 3. Log results
  });

// Email Change (Phase 2)
exports.requestEmailChange = functions.https.onCall(async (data, context) => {
  // 1. Verify authentication & password
  // 2. Validate new email (not in use)
  // 3. Generate tokens
  // 4. Create change request
  // 5. Send verification emails
  // 6. Return success
});

exports.verifyEmailChange = functions.https.onCall(async (data, context) => {
  // 1. Verify token
  // 2. Check not expired
  // 3. Update Firebase Auth
  // 4. Update Firestore
  // 5. Update Stripe customer
  // 6. Log change
  // 7. Send confirmations
});
```

### 7.4 Stripe API Integration Points

```javascript
// Subscription Management
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Cancel subscription
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
  cancellation_details: {
    comment: reason,
    feedback: 'other'
  }
});

// Pause subscription (1-3 months)
const pauseUntil = new Date();
pauseUntil.setMonth(pauseUntil.getMonth() + pauseMonths);

await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'mark_uncollectible',
    resumes_at: Math.floor(pauseUntil.getTime() / 1000)
  }
});

// Resume subscription
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: null
});

// Get subscription details
const subscription = await stripe.subscriptions.retrieve(subscriptionId);
const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
  customer: customerId
});
```

---

## 8. User Experience Flows

### 8.1 Cancel Subscription Flow

```
1. User navigates to /dashboard/client/subscription
2. Views current subscription status
3. Clicks "Cancel Subscription"
4. Sees retention modal:
   - "Are you sure?"
   - Benefits of staying (workout library, trainer access, etc.)
   - Alternative: "Pause instead?" button
5. User confirms they want to cancel
6. Sees consequences screen:
   - Access until: [end of current period]
   - No refunds for partial months
   - Session credits remain (until expiration)
   - Data will be retained
7. User types "CANCEL" to confirm
8. System processes:
   - Cancels subscription in Stripe (end of period)
   - Updates user document
   - Logs to history
9. Success screen:
   - "Subscription canceled"
   - Access until: [date]
   - "Download your data" button
   - "We're sad to see you go" message
10. Email confirmation sent
```

### 8.2 Pause Subscription Flow

```
1. User clicks "Pause Subscription"
2. Sees pause options screen:
   - 1 month ($0)
   - 2 months ($0)
   - 3 months ($0)
   - Optional: reason dropdown
3. User selects duration and optionally provides reason
4. Sees confirmation:
   - Paused from: [date]
   - Resumes on: [date]
   - No charges during pause
   - Access continues until: [end of current period]
5. User confirms
6. System processes:
   - Pauses in Stripe with resume date
   - Updates user document
   - Logs to history
7. Success screen:
   - "Subscription paused"
   - Resume date: [date]
   - "Can resume early anytime"
8. Email confirmation sent
```

### 8.3 Delete Account Flow

```
1. User navigates to Profile > Account & Data Management
2. Clicks "Delete Account" button
3. Sees warning modal:
   - "This action cannot be undone"
   - What will be deleted
   - What will be retained (anonymized financial records)
   - 7-day grace period offered
4. User clicks "Continue"
5. Pre-deletion checklist:
   - ✓ Data export initiated (automatic download)
   - ⚠️ Active subscription detected (must cancel first)
   - ⚠️ 3 unused session credits (offer refund?)
6. User completes checklist actions
7. Confirmation screen:
   - Enter password
   - Type "DELETE" to confirm
8. Email verification:
   - "Click link to confirm deletion"
   - 7-day grace period starts
   - Can cancel deletion anytime
9. User clicks email link
10. Final confirmation:
    - "Account will be deleted on [date]"
    - "Download your data" button
    - "Cancel deletion" button
11. After 7 days, automatic deletion:
    - Data anonymized/deleted
    - Account removed
    - Final email: "Account has been deleted"
```

---

## 9. Recommendations

### 9.1 Launch Priority

**Must Have Before Launch (P0):**
1. ✅ Subscription Management (cancel/pause/resume) - 3-4 days
2. ✅ Account Deletion - 2-3 days
3. ⚠️ Email Change (documented manual process minimum) - 0.5 day

**Total: 5-7.5 days to launch-ready state**

### 9.2 Recommended Approach

**Option A: Minimal Viable Launch (6 days)**
- Day 1-3: Subscription management (cancel + pause)
- Day 4-5: Account deletion (basic flow)
- Day 6: Testing + documentation
- Use manual email change process temporarily

**Option B: Complete Launch (8 days)**
- Day 1-3: Subscription management (full featured)
- Day 4-6: Account deletion (with grace period)
- Day 7: Self-service email change
- Day 8: Testing + documentation

**Recommendation: Go with Option A for faster launch**

### 9.3 Post-Launch Roadmap

**Phase 2 (Weeks 2-4):**
- Email change self-service
- Password security enhancements
- Account overview dashboard
- Enhanced subscription history

**Phase 3 (Months 2-3):**
- Two-factor authentication
- Active sessions management
- Login history
- Security alerts

**Phase 4 (Months 4+):**
- Usage analytics
- App settings page
- Advanced privacy controls
- Integration management

### 9.4 Legal Considerations

**Before Launch:**
- ✅ Update Terms of Service (refund policy, cancellation policy)
- ✅ Update Privacy Policy (deletion rights, data retention)
- ✅ GDPR compliance documentation
- ✅ CCPA compliance documentation

**Refund Policy Example:**
```
All subscription sales are final. No refunds for:
- Partial month cancellations
- Canceled subscriptions
- Unused sessions within trial period

Exceptions considered on case-by-case basis for:
- Medical emergencies (with documentation)
- Billing errors
- Service unavailability

To request a refund exception, contact: billing@shrey.fit
```

**Deletion Policy Example:**
```
Right to Erasure:
- Request account deletion anytime
- 7-day grace period (can cancel)
- Personal data deleted/anonymized
- Financial records retained 7 years (legal requirement)
- Anonymized transaction data retained for analytics

Deletion process:
1. Request via profile page
2. Receive confirmation email
3. 7-day grace period
4. Automatic deletion after grace period
5. Final confirmation email
```

---

## 10. Success Criteria

### Launch Success Metrics

**Functionality:**
- [ ] All P0 features implemented and tested
- [ ] GDPR/CCPA compliant deletion process
- [ ] Subscription management works in test mode
- [ ] Subscription management works in live mode
- [ ] Email notifications working
- [ ] Error handling comprehensive

**Testing:**
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] End-to-end tests passing
- [ ] Edge cases handled
- [ ] Mobile responsive
- [ ] Accessibility audit passed

**Documentation:**
- [ ] User guide updated
- [ ] API documentation complete
- [ ] Legal policies updated
- [ ] Support documentation ready
- [ ] Troubleshooting guide created

**Compliance:**
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Legal review completed

### Post-Launch Metrics to Track

**User Engagement:**
- Subscription cancellation rate
- Subscription pause rate
- Pause-to-resume conversion
- Account deletion rate
- Session credit utilization

**Support Impact:**
- Email change support tickets
- Subscription-related tickets
- Account deletion inquiries
- Time to resolution

**Business Metrics:**
- Churn rate
- Reactivation rate (after pause)
- Customer lifetime value
- Support cost per user

---

## Appendix A: FAQ

**Q: Can we skip subscription management and just use Stripe Portal?**
A: Not recommended. Stripe Portal gives users access to cancel anytime, which may increase churn. Custom flow allows retention attempts and business logic control.

**Q: Why 7-day grace period for account deletion?**
A: Industry standard. Prevents accidental deletions, allows time for users to reconsider, reduces support burden.

**Q: Can we delete financial records too?**
A: No. Legal requirement to retain financial records for 7 years. Anonymize instead (replace personal info with "Deleted User").

**Q: What if user has active subscription during deletion?**
A: Force subscription cancellation first. Include in pre-deletion checklist. Auto-cancel during deletion process.

**Q: Should we offer refunds during cancellation?**
A: Business decision. Standard: No refunds (access until period end). Could offer pro-rated refund for special cases.

**Q: How to handle unused session credits?**
A: Options: (1) No refund (expires after 60 days), (2) Pro-rated refund (calculate unused value), (3) Transfer to another client (gifting). Recommend option 1 for simplicity.

**Q: Can users reactivate deleted accounts?**
A: No. Deletion is permanent. They must create new account. Make this clear in deletion flow.

**Q: What about GDPR data portability?**
A: Already implemented! "Download My Data" feature exports JSON. Compliant with GDPR Article 20.

---

## Appendix B: Email Templates

### Subscription Canceled Email

```
Subject: Subscription Canceled - Access Until [Date]

Hi [Name],

Your Shrey.Fit subscription has been canceled as requested.

What this means:
- Your access continues until: [Date]
- No further charges will be made
- Your session credits remain active (until expiration)
- Your data will be retained

Want to come back?
You can reactivate anytime by visiting your account page.

Download Your Data:
[Download Button]

Questions?
Reply to this email or contact us at support@shrey.fit

- The Shrey.Fit Team
```

### Subscription Paused Email

```
Subject: Subscription Paused - Resuming [Date]

Hi [Name],

Your Shrey.Fit subscription has been paused.

Pause Details:
- Paused from: [Date]
- Resumes on: [Date]
- No charges during pause
- Current access until: [End of Period]

Need to resume early?
Visit your account page anytime to resume.

Questions?
Reply to this email or contact us at support@shrey.fit

- The Shrey.Fit Team
```

### Account Deletion Requested Email

```
Subject: Account Deletion Requested - 7 Day Grace Period

Hi [Name],

You've requested to delete your Shrey.Fit account.

What happens next:
- 7-day grace period (can cancel anytime)
- Account will be deleted on: [Date]
- Data will be permanently removed
- Your data export: [Download Link]

Changed your mind?
[Cancel Deletion Button]

This action cannot be undone after [Date].

Questions?
Reply to this email or contact us at support@shrey.fit

- The Shrey.Fit Team
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Dec 27, 2025 | Development Team | Initial comprehensive analysis |

---

**End of Document**
- ✅ Subscription management page (fully functional)
- ✅ Account deletion workflow (GDPR compliant)
- ✅ Updated documentation
- ✅ Email templates
- ✅ Legal policies reviewed

---

### Phase 2: Post-Launch Enhancements (1-2 Weeks)

**Goal:** Improve security and user experience

#### Week 1: Security Features
- [ ] Email change self-service flow
  - Request form
  - Email verification
  - Cloud Functions
- [ ] Password enhancements
  - Display last changed date
  - Strength meter
  - Complexity requirements
- [ ] Security status dashboard
- [ ] Testing

#### Week 2: UX Improvements
- [ ] Account overview dashboard
  - Status summary
  - Usage statistics
  - Quick actions
- [ ] Subscription history view
- [ ] Enhanced error messaging
- [ ] Mobile responsiveness review

**Deliverables:**
