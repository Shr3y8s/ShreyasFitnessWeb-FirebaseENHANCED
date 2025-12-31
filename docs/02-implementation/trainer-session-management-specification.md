# Trainer Session Management Specification

## Overview

This specification defines the Trainer Session Management system, providing trainers with comprehensive tools to manage two distinct types of client interactions:
1. **Training Sessions**: In-person 1-on-1 training sessions at physical locations with package-based credits
2. **Weekly Check-ins**: Phone call appointments for weekly progress check-ins

These are separate interfaces with different workflows due to their fundamentally different nature.

## Core Requirements

### Purpose
- Enable trainers to view, manage, and track all client sessions from centralized dashboards
- Provide session note-taking capabilities for documenting session outcomes
- Support package credit management for training sessions (90-day expiration)
- Track weekly check-in cadence and completion
- Support trainer-initiated session actions (cancel, mark complete, mark no-show)
- Enable package expiration extensions (one-time only)

### Key Differences: Training Sessions vs Weekly Check-ins

| Feature | Training Sessions | Weekly Check-ins |
|---------|------------------|------------------|
| **Session Type** | In-person at location | Phone call |
| **Credits** | Package-based (4/8/16 sessions) | No credits (included in membership) |
| **Expiration** | 90 days from purchase | No expiration |
| **Location** | Public gym or private location | N/A (phone) |
| **Package Tracking** | Yes - credits consumed | No |
| **Extension** | Can extend once | N/A |
| **Scheduling** | Via Calendly | Via Calendly |
| **Tracking Field** | `packageId` | `weekIdentifier` |

## Data Architecture

### Firestore Collections

#### `sessions/{sessionId}` (Base Collection)

**Common Fields** (Both session types):
```typescript
{
  id: string,
  clientId: string,
  clientName: string,
  clientEmail: string,
  trainerId: string,
  calendlyEventId: string,
  calendlyEventUri: string,
  cancelUrl: string,          // Calendly cancel URL
  rescheduleUrl: string,       // Calendly reschedule URL
  scheduledDate: Timestamp,
  duration: number,            // minutes
  status: "scheduled" | "completed" | "canceled" | "no-show",
  canceledBy?: "client" | "trainer",
  canceledAt?: Timestamp,
  cancelReason?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  completedAt?: Timestamp,
  notes?: string,              // Session notes by trainer
  notesVisibleToClient?: boolean, // Whether notes are client-visible
  sessionType: "training" | "checkin"
}
```

**Training Session Fields** (when `sessionType === "training"`):
```typescript
{
  locationId: string,          // Location document ID or "private"
  locationType: "public" | "private",
  packageId: string,           // Links to user's sessionPackages
  creditReturned: boolean      // Whether credit was returned on cancel
}
```

**Check-in Session Fields** (when `sessionType === "checkin"`):
```typescript
{
  weekIdentifier: string       // ISO week format: "2025-W01"
}
```

#### `users/{userId}/sessionPackages/{packageId}`

```typescript
{
  id: string,
  quantity: number,            // Total sessions purchased (4, 8, or 16)
  remaining: number,           // Sessions left
  purchaseDate: Timestamp,
  expirationDate: Timestamp,   // 90 days from purchase
  expired: boolean,
  stripePaymentIntentId: string,
  stripePriceId: string,
  stripeProductId: string,
  stripeProductName: string,
  amount: number,
  extendedBy?: {
    trainerId: string,
    date: Timestamp,
    daysAdded: number,
    reason: string
  }
}
```

#### `training_locations/{locationId}` (Existing)

```typescript
{
  id: string,
  name: string,
  address: string,
  city: string,
  state: string,
  zip: string,
  // ... other location fields
}
```

### Data Relationships

```
sessions (collection)
├── Training Session (sessionType: "training")
│   ├── clientId → users/{userId}
│   ├── packageId → users/{userId}/sessionPackages/{packageId}
│   └── locationId → training_locations/{locationId} OR "private"
│
└── Check-in Session (sessionType: "checkin")
    ├── clientId → users/{userId}
    └── weekIdentifier (standalone tracking)
```

## UI/UX Design Specifications

### Navigation Structure

**Trainer Sidebar Addition**:
```
Trainer Dashboard
├── Client Hub
├── Assignments
├── Exercises
├── 🏋️ Training Sessions (NEW)
├── 📞 Check-ins (NEW)
└── Messages
```

### 1. Training Session Management Dashboard

**Route**: `/dashboard/trainer/training-sessions`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────┐
│ TRAINING SESSION MANAGEMENT                                      │
│ [All Clients ▼] [This Week ▼] [All Status ▼] [Search client...]│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ QUICK STATS                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │ Today: 3  │ │ Week: 12  │ │ Month: 48 │ │ No-Show:2 │       │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ EXPIRING PACKAGES (< 14 days) - Collapsible                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ John Doe                                                    │ │
│ │ 2/8 sessions remaining • Expires: Jan 15 (8 days)         │ │
│ │ Extended: No                                                │ │
│ │ [Extend Package] [Notify Client]                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📅 UPCOMING SESSIONS - Collapsible (Default: Open)              │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tomorrow, Jan 1 @ 10:00 AM (60 min)                        │ │
│ │ John Doe • 📍 Gym ABC (Public)                             │ │
│ │ 📦 Package: 6/8 sessions • Expires: 45 days                │ │
│ │ 🔗 [Calendly Manage]                                        │ │
│ │ [Add Notes] [Mark Complete] [Mark No-Show] [Cancel]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Jan 3 @ 2:00 PM (60 min)                                   │ │
│ │ Jane Smith • 📍 Private                                     │ │
│ │ 📦 Package: 4/16 sessions • Expires: 60 days               │ │
│ │ [Add Notes] [Mark Complete] [Mark No-Show] [Cancel]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✅ COMPLETED SESSIONS - Collapsible (Default: Closed)           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dec 28 @ 10:00 AM • John Doe • Gym ABC                    │ │
│ │ ✓ Notes: Great progress on squats. Increase weight next.  │ │
│ │ [View Details] [Edit Notes]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ❌ CANCELED SESSIONS - Collapsible (Default: Closed)            │
│ [Shows recent cancellations with cancel reason and who canceled]│
└─────────────────────────────────────────────────────────────────┘
```

### 2. Weekly Check-in Management Dashboard

**Route**: `/dashboard/trainer/check-ins`

**Layout Structure**:
```
┌─────────────────────────────────────────────────────────────────┐
│ WEEKLY CHECK-IN MANAGEMENT                                       │
│ [All Clients ▼] [This Week ▼] [All Status ▼] [Search client...]│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ QUICK STATS                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │ Today: 5  │ │ Week: 18  │ │ Month: 72 │ │ Missed: 3 │       │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📅 UPCOMING CHECK-INS - Collapsible (Default: Open)             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tomorrow, Jan 1 @ 3:00 PM (30 min phone call)              │ │
│ │ John Doe • Week 1 of 2026                                  │ │
│ │ 🔗 [Calendly Manage]                                        │ │
│ │ [Add Notes] [Mark Complete] [Mark No-Show] [Cancel]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ✅ COMPLETED CHECK-INS - Collapsible (Default: Closed)          │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Dec 25 @ 3:00 PM • John Doe • 2024-W52                    │ │
│ │ ✓ Notes: Discussed progress. Adjust meal plan.            │ │
│ │ [View Details] [Edit Notes]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ ⚠️ MISSED CHECK-INS - Alert Section                             │
│ [Shows clients who missed scheduled check-ins]                  │
└─────────────────────────────────────────────────────────────────┘
```

## Modal/Dialog Designs

### 1. Mark Session Complete Dialog

```
┌───────────────────────────────────────────────┐
│ Mark Session Complete                         │
├───────────────────────────────────────────────┤
│ Date: Jan 1, 2026 @ 10:00 AM                 │
│ Client: John Doe                              │
│ Duration: 60 minutes                          │
│ Location: Gym ABC                             │
│                                               │
│ Session Notes (optional):                     │
│ ┌───────────────────────────────────────────┐ │
│ │                                           │ │
│ │ [Rich text area for trainer notes]       │ │
│ │                                           │ │
│ │                                           │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ Notes visible to client?                      │
│ (•) Yes - Client can see notes                │
│ ( ) No - Trainer-only notes                   │
│                                               │
│ [Cancel] [Mark Complete & Save]              │
└───────────────────────────────────────────────┘
```

### 2. Mark No-Show Dialog

```
┌───────────────────────────────────────────────┐
│ Mark as No-Show                               │
├───────────────────────────────────────────────┤
│ ⚠️ This records that the client didn't show   │
│                                               │
│ Client: John Doe                              │
│ Date: Jan 1, 2026 @ 10:00 AM                 │
│                                               │
│ Session Credit:                               │
│ ( ) Return credit to client                   │
│ (•) Deduct session (no credit return)        │
│                                               │
│ Internal Notes:                               │
│ ┌───────────────────────────────────────────┐ │
│ │ No call, no show. Client unreachable.    │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ [Cancel] [Confirm No-Show]                   │
└───────────────────────────────────────────────┘
```

### 3. Cancel Session Dialog (Trainer-Initiated)

```
┌───────────────────────────────────────────────┐
│ Cancel Session                                │
├───────────────────────────────────────────────┤
│ ⚠️ Credit will be returned to client          │
│                                               │
│ Date: Jan 1, 2026 @ 10:00 AM                 │
│ Client: John Doe                              │
│ Location: Gym ABC                             │
│                                               │
│ Cancellation Reason (required):               │
│ ┌───────────────────────────────────────────┐ │
│ │ Trainer illness - need to reschedule     │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ Notify client?                                │
│ [✓] Send notification email                   │
│                                               │
│ [Go Back] [Confirm Cancellation]             │
└───────────────────────────────────────────────┘
```

### 4. Extend Package Expiration Dialog

```
┌───────────────────────────────────────────────┐
│ Extend Package Expiration                     │
├───────────────────────────────────────────────┤
│ Client: John Doe                              │
│ Package: 2/8 sessions remaining               │
│ Current Expiration: Feb 15, 2026             │
│                                               │
│ ⚠️ Packages can only be extended once         │
│ Status: Not yet extended                      │
│                                               │
│ Extend by: [30 ▼] days                       │
│ Options: 14, 30, 60, 90 days                 │
│                                               │
│ New expiration date: March 17, 2026          │
│                                               │
│ Reason (required):                            │
│ ┌───────────────────────────────────────────┐ │
│ │ Client recovering from injury             │ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ [Cancel] [Confirm Extension]                 │
└───────────────────────────────────────────────┘
```

### 5. Add/Edit Notes Dialog

```
┌───────────────────────────────────────────────┐
│ Session Notes                                 │
├───────────────────────────────────────────────┤
│ Date: Dec 28, 2024 @ 10:00 AM               │
│ Client: John Doe                              │
│ Status: Completed                             │
│                                               │
│ Notes:                                        │
│ ┌───────────────────────────────────────────┐ │
│ │ Great session today. Client made          │ │
│ │ significant progress on squat form.       │ │
│ │ Increased working weight to 185 lbs.      │ │
│ │                                           │ │
│ │ Next session: Focus on deadlift technique│ │
│ └───────────────────────────────────────────┘ │
│                                               │
│ Notes visible to client?                      │
│ [✓] Yes - Client can see these notes          │
│                                               │
│ Last updated: Dec 28, 2024 @ 11:30 AM        │
│                                               │
│ [Cancel] [Save Notes]                         │
└───────────────────────────────────────────────┘
```

## Workflows & Process Flows

### Training Session Management Workflows

#### 1. Mark Session Complete
```
User Action: Click "Mark Complete" button
│
├─> Open "Mark Complete" dialog
│   └─> Pre-fill: date, client, duration, location
│
├─> User adds notes (optional)
│   └─> Select visibility: client-visible or trainer-only
│
├─> User clicks "Mark Complete & Save"
│   ├─> Update session status to "completed"
│   ├─> Set completedAt timestamp
│   ├─> Save notes with visibility setting
│   └─> Close dialog
│
└─> Show success toast: "Session marked complete"
```

#### 2. Mark Session No-Show
```
User Action: Click "Mark No-Show" button
│
├─> Open "Mark No-Show" dialog
│   └─> Default: Deduct session (no credit return)
│
├─> User selects credit option:
│   ├─> Return credit (creditReturned = true)
│   └─> Deduct session (creditReturned = false)
│
├─> User adds internal notes
│
├─> User clicks "Confirm No-Show"
│   ├─> Update session status to "no-show"
│   ├─> Set creditReturned flag
│   ├─> If creditReturned = true:
│   │   └─> Increment package.remaining
│   ├─> Save notes
│   └─> Close dialog
│
└─> Show success toast with action taken
```

#### 3. Cancel Session (Trainer-Initiated)
```
User Action: Click "Cancel" button
│
├─> Open "Cancel Session" dialog
│   └─> Show warning: Credit will be returned
│
├─> User enters cancellation reason (required)
│
├─> User selects notification option
│
├─> User clicks "Confirm Cancellation"
│   ├─> Update session:
│   │   ├─> status = "canceled"
│   │   ├─> canceledBy = "trainer"
│   │   ├─> canceledAt = now
│   │   ├─> cancelReason = user input
│   │   └─> creditReturned = true
│   ├─> Increment package.remaining
│   ├─> If notification selected:
│   │   └─> Send email to client
│   └─> Close dialog
│
└─> Show success toast: "Session canceled, credit returned"
```

#### 4. Extend Package Expiration
```
User Action: Click "Extend Package" button
│
├─> Check if already extended:
│   ├─> If extendedBy exists:
│   │   └─> Show error: "Package already extended"
│   └─> If not extended: Continue
│
├─> Open "Extend Package" dialog
│   └─> Show current expiration date
│
├─> User selects extension duration (14/30/60/90 days)
│   └─> Display new expiration date
│
├─> User enters reason (required)
│
├─> User clicks "Confirm Extension"
│   ├─> Calculate new expiration date
│   ├─> Update package:
│   │   ├─> expirationDate = new date
│   │   └─> extendedBy = {
│   │         trainerId,
│   │         date: now,
│   │         daysAdded,
│   │         reason
│   │       }
│   └─> Close dialog
│
└─> Show success toast: "Package extended to [date]"
```

#### 5. Add/Edit Session Notes
```
User Action: Click "Add Notes" or "Edit Notes"
│
├─> Open "Session Notes" dialog
│   ├─> If editing: Pre-fill existing notes
│   └─> If adding: Empty text area
│
├─> User types/edits notes
│
├─> User selects visibility:
│   ├─> Client-visible
│   └─> Trainer-only
│
├─> User clicks "Save Notes"
│   ├─> Update session:
│   │   ├─> notes = user input
│   │   ├─> notesVisibleToClient = selected option
│   │   └─> updatedAt = now
│   └─> Close dialog
│
└─> Show success toast: "Notes saved"
```

### Weekly Check-in Workflows

**Note**: Check-ins follow similar workflows but WITHOUT:
- Package credit management
- Expiration tracking
- Location information

They have the same:
- Mark Complete (with notes)
- Mark No-Show (no credit logic)
- Cancel (no credit logic)
- Add/Edit Notes

## API Specifications

### Training Session Management Functions

#### `getTrainerSessions(trainerId, filters)`
```typescript
Parameters:
  trainerId: string
  filters: {
    sessionType?: 'training' | 'checkin'
    clientId?: string
    status?: SessionStatus | 'all'
    dateRange?: { start: Date, end: Date }
  }

Returns: Promise<Session[]>

Firestore Query:
  collection('sessions')
    .where('trainerId', '==', trainerId)
    .where('sessionType', '==', filters.sessionType)
    [optional filters...]
    .orderBy('scheduledDate', 'desc')
```

#### `markSessionComplete(sessionId, notes, notesVisibleToClient)`
```typescript
Parameters:
  sessionId: string
  notes?: string
  notesVisibleToClient: boolean

Returns: Promise<{ success: boolean }>

Operations:
  1. Update session document:
     - status = 'completed'
     - completedAt = now
     - notes = notes
     - notesVisibleToClient = notesVisibleToClient
     - updatedAt = now
```

#### `markSessionNoShow(sessionId, returnCredit, notes)`
```typescript
Parameters:
  sessionId: string
  returnCredit: boolean
  notes?: string

Returns: Promise<{ success: boolean }>

Operations:
  1. Get session document
  2. Update session:
     - status = 'no-show'
     - creditReturned = returnCredit
     - notes = notes (internal)
     - updatedAt = now
  3. If returnCredit && sessionType === 'training':
     - Get package document
     - Increment package.remaining
     - Update package.updatedAt
```

#### `cancelSession(sessionId, cancelReason, notifyClient)`
```typescript
Parameters:
  sessionId: string
  cancelReason: string
  notifyClient: boolean

Returns: Promise<{ success: boolean }>

Operations:
  1. Get session document
  2. Update session:
     - status = 'canceled'
     - canceledBy = 'trainer'
     - canceledAt = now
     - cancelReason = cancelReason
     - creditReturned = true (if training session)
     - updatedAt = now
  3. If training session:
     - Get package document
     - Increment package.remaining
  4. If notifyClient:
     - Send email notification
```

#### `extendPackageExpiration(userId, packageId, daysToAdd, reason, trainerId)`
```typescript
Parameters:
  userId: string
  packageId: string
  daysToAdd: number
  reason: string
  trainerId: string

Returns: Promise<{ success: boolean, newExpirationDate: Date }>

Operations:
  1. Get package document
  2. Check if already extended (extendedBy exists):
     - If yes: throw error "Package already extended"
  3. Calculate new expiration date
  4. Update package:
     - expirationDate = new date
     - extendedBy = {
         trainerId,
         date: now,
         daysAdded,
         reason
       }
     - updatedAt = now
  5. Return new expiration date
```

#### `updateSessionNotes(sessionId, notes, notesVisibleToClient)`
```typescript
Parameters:
  sessionId: string
  notes: string
  notesVisibleToClient: boolean

Returns: Promise<{ success: boolean }>

Operations:
  1. Update session document:
     - notes = notes
     - notesVisibleToClient = notesVisibleToClient
     - updatedAt = now
```

#### `getExpiringPackages(trainerId, daysUntilExpiration)`
```typescript
Parameters:
  trainerId: string
  daysUntilExpiration: number (default: 14)

Returns: Promise<Array<{
  userId: string,
  package: SessionPackage,
  client: { name, email },
  sessionsRemaining: number,
  daysUntilExpiration: number
}>>

Operations:
  1. Get all training sessions for trainer
  2. Get unique clientIds
  3. For each client:
     - Get sessionPackages
     - Filter packages where:
       * remaining > 0
       * !expired
       * expirationDate - now <= daysUntilExpiration days
  4. Join with client data
  5. Return enriched package list
```

## Detailed Implementation Phases

### Phase 1: Core Training Session Management
**Priority**: HIGH | **Total Time**: 3-4 days

#### Phase 1.1: Foundation & Setup (2-3 hours)

**Sub-tasks**:
- [ ] 1.1.1: Create API file `app/src/lib/session-management-api.ts` (30 min)
  - Add TypeScript interfaces for session management
  - Import Firestore dependencies
  - **Test**: File compiles without errors

- [ ] 1.1.2: Create base page `app/src/app/dashboard/trainer/training-sessions/page.tsx` (1 hour)
  - Set up basic Next.js page structure
  - Add TrainerSidebar wrapper
  - Add page title and breadcrumb
  - **Test**: Page loads at `/dashboard/trainer/training-sessions`
  - **Test**: Trainer auth check works (non-trainers redirected)

- [ ] 1.1.3: Update TrainerSidebar navigation (30 min)
  - Add "Training Sessions" menu item
  - Add icon and active state
  - **Test**: New menu item appears and links work

- [ ] 1.1.4: Create session management types (30 min)
  - Update `app/src/types/session.ts` if needed
  - Add filter types, stats types
  - **Test**: Types compile correctly

**Success Criteria**:
✅ Empty page loads without errors
✅ Navigation item appears in sidebar
✅ Auth protection working
✅ TypeScript compilation successful

---

#### Phase 1.2: Data Fetching (2-3 hours)

**Sub-tasks**:
- [ ] 1.2.1: Implement `getTrainerSessions()` function (1.5 hours)
  - Query sessions collection with filters
  - Filter by sessionType="training"
  - Order by scheduledDate
  - **Test**: Query returns data from Firestore
  - **Test**: Filters work (clientId, status, dateRange)

- [ ] 1.2.2: Implement session data hook (1 hour)
  - Create `useTrainerSessions` hook
  - Handle loading states
  - Handle errors
  - **Test**: Hook fetches and returns data
  - **Test**: Loading state works correctly

- [ ] 1.2.3: Add package data enrichment (30 min)
  - Fetch associated package info
  - Join package data with sessions
  - **Test**: Package info appears with sessions

**Success Criteria**:
✅ Can fetch training sessions from Firestore
✅ Session data includes all required fields
✅ Package information loads correctly
✅ Loading and error states handled

---

#### Phase 1.3: Session List Display (3-4 hours)

**Sub-tasks**:
- [ ] 1.3.1: Create session card component (1.5 hours)
  - Build `SessionCard.tsx` component
  - Display session date, time, client name
  - Show location info
  - Show package info (X/Y sessions)
  - **Test**: Card renders with mock data
  - **Test**: All fields display correctly

- [ ] 1.3.2: Implement upcoming sessions section (1 hour)
  - Create collapsible section
  - Filter sessions where status="scheduled"
  - Sort by date (earliest first)
  - **Test**: Shows only scheduled sessions
  - **Test**: Collapsible works

- [ ] 1.3.3: Implement completed sessions section (1 hour)
  - Create collapsible section (default closed)
  - Filter sessions where status="completed"
  - Sort by date (most recent first)
  - **Test**: Shows only completed sessions
  - **Test**: Session notes display if present

- [ ] 1.3.4: Add empty states (30 min)
  - No upcoming sessions message
  - No completed sessions message
  - **Test**: Empty states appear when appropriate

**Success Criteria**:
✅ Sessions render in correct sections
✅ All session data displays properly
✅ Collapsible sections work
✅ Empty states show when no data

---

#### Phase 1.4: Filters & Search (2-3 hours)

**Sub-tasks**:
- [ ] 1.4.1: Implement client filter dropdown (1 hour)
  - Get list of trainer's clients
  - Build dropdown component
  - Apply filter to query
  - **Test**: Filter updates session list
  - **Test**: "All Clients" option works

- [ ] 1.4.2: Implement date range filter (1 hour)
  - Add Today/Week/Month/Custom options
  - Build date range picker for custom
  - Apply to query
  - **Test**: Each option filters correctly
  - **Test**: Custom range works

- [ ] 1.4.3: Implement status filter (30 min)
  - Add All/Scheduled/Completed/Canceled/No-Show
  - Apply to query
  - **Test**: Each status filters correctly

- [ ] 1.4.4: Add client search (30 min)
  - Add search input
  - Filter by client name
  - **Test**: Search filters results

**Success Criteria**:
✅ All filters work independently
✅ Filters work together (compound)
✅ Filter state persists during session
✅ Clear filters option works

---

#### Phase 1.5: Quick Stats Dashboard (1-2 hours)

**Sub-tasks**:
- [ ] 1.5.1: Calculate session statistics (1 hour)
  - Count today's sessions
  - Count this week's sessions
  - Count this month's sessions
  - Count no-shows
  - **Test**: Counts are accurate

- [ ] 1.5.2: Build stats cards UI (1 hour)
  - Create 4 stat cards
  - Add icons and styling
  - Make responsive
  - **Test**: Cards display correctly
  - **Test**: Numbers update with filters

**Success Criteria**:
✅ Stats calculate correctly
✅ Stats update when filters change
✅ Cards are responsive

---

#### Phase 1.6: Mark Complete Functionality (3-4 hours)

**Sub-tasks**:
- [ ] 1.6.1: Create MarkCompleteDialog component (1.5 hours)
  - Build modal UI
  - Add notes textarea
  - Add visibility radio buttons
  - Pre-fill session info
  - **Test**: Dialog opens/closes
  - **Test**: Form fields work

- [ ] 1.6.2: Implement `markSessionComplete()` API function (1 hour)
  - Update session status
  - Save notes
  - Set completedAt timestamp
  - **Test**: Function updates Firestore
  - **Test**: Error handling works

- [ ] 1.6.3: Wire up dialog to button (30 min)
  - Add "Mark Complete" button to session card
  - Connect to dialog
  - Handle submission
  - **Test**: Button opens dialog
  - **Test**: Submission works

- [ ] 1.6.4: Add success/error feedback (30 min)
  - Show success toast
  - Show error toast if fails
  - Close dialog on success
  - **Test**: User sees feedback
  - **Test**: Session list updates

**Success Criteria**:
✅ Can mark session complete
✅ Notes save correctly
✅ Visibility setting works
✅ UI updates immediately
✅ Error handling works

---

#### Phase 1.7: Mark No-Show Functionality (2-3 hours)

**Sub-tasks**:
- [ ] 1.7.1: Create MarkNoShowDialog component (1 hour)
  - Build modal UI
  - Add credit return radio buttons
  - Add internal notes field
  - **Test**: Dialog opens/closes correctly

- [ ] 1.7.2: Implement `markSessionNoShow()` API function (1.5 hours)
  - Update session status
  - Handle credit return logic
  - Update package.remaining if returning credit
  - **Test**: Function works with credit return
  - **Test**: Function works without credit return
  - **Test**: Package updates correctly

- [ ] 1.7.3: Wire up and test (30 min)
  - Connect button to dialog
  - Handle submission
  - Add feedback
  - **Test**: End-to-end flow works

**Success Criteria**:
✅ Can mark session as no-show
✅ Credit return option works correctly
✅ Package credits update when returned
✅ Internal notes save

---

#### Phase 1.8: Cancel Session Functionality (2-3 hours)

**Sub-tasks**:
- [ ] 1.8.1: Create CancelSessionDialog component (1 hour)
  - Build modal UI
  - Add reason field (required)
  - Add notify client checkbox
  - Show warning about credit return
  - **Test**: Dialog validation works

- [ ] 1.8.2: Implement `cancelSession()` API function (1.5 hours)
  - Update session status
  - Set canceledBy="trainer"
  - Return credit (increment package.remaining)
  - Optional: Send notification email
  - **Test**: Credit returns correctly
  - **Test**: Session updates correctly

- [ ] 1.8.3: Wire up and test (30 min)
  - Connect button to dialog
  - Handle submission
  - **Test**: Cancellation works end-to-end

**Success Criteria**:
✅ Can cancel session
✅ Credit always returns for trainer cancels
✅ Cancellation reason saves
✅ Email notification option works (if implemented)

---

#### Phase 1.9: Session Notes (1-2 hours)

**Sub-tasks**:
- [ ] 1.9.1: Create SessionNotesDialog component (1 hour)
  - Build modal with textarea
  - Show session details
  - Add visibility toggle
  - Pre-fill if editing
  - **Test**: Dialog works for add/edit

- [ ] 1.9.2: Implement `updateSessionNotes()` function (30 min)
  - Update notes field
  - Update visibility setting
  - **Test**: Notes update in Firestore

- [ ] 1.9.3: Add notes buttons to cards (30 min)
  - "Add Notes" for sessions without notes
  - "Edit Notes" for sessions with notes
  - Show notes preview on card
  - **Test**: Buttons appear correctly
  - **Test**: Notes display on card

**Success Criteria**:
✅ Can add notes to any session
✅ Can edit existing notes
✅ Notes visibility setting works
✅ Notes display on session cards

---

#### Phase 1.10: Calendly Integration (30 min)

**Sub-tasks**:
- [ ] 1.10.1: Add Calendly link buttons (30 min)
  - Show "Manage on Calendly" button
  - Link to cancelUrl or rescheduleUrl
  - Open in new tab
  - **Test**: Links work correctly

**Success Criteria**:
✅ Calendly links open correctly
✅ Links go to correct Calendly pages

---

### Phase 2: Package Management Features
**Priority**: HIGH | **Total Time**: 2-3 days

#### Phase 2.1: Expiring Packages Alert (2-3 hours)

**Sub-tasks**:
- [ ] 2.1.1: Implement `getExpiringPackages()` function (1.5 hours)
  - Query packages expiring < 14 days
  - Join with client data
  - Calculate days until expiration
  - **Test**: Returns correct packages
  - **Test**: Calculations accurate

- [ ] 2.1.2: Build expiring packages section UI (1 hour)
  - Create collapsible alert section
  - Display package details
  - Show expiration countdown
  - Color code by urgency
  - **Test**: Section displays correctly
  - **Test**: Shows accurate data

- [ ] 2.1.3: Add notification action (30 min)
  - "Notify Client" button
  - Send email reminder (optional)
  - **Test**: Button works

**Success Criteria**:
✅ Expiring packages identified correctly
✅ Countdown displays accurately
✅ Urgency color coding works

---

#### Phase 2.2: Extend Package Functionality (3-4 hours)

**Sub-tasks**:
- [ ] 2.2.1: Create ExtendPackageDialog component (1.5 hours)
  - Build modal UI
  - Show current expiration
  - Add duration dropdown (14/30/60/90 days)
  - Calculate and show new date
  - Add reason field (required)
  - Check if already extended
  - **Test**: Dialog displays correctly
  - **Test**: Date calculations work
  - **Test**: Validation works

- [ ] 2.2.2: Implement `extendPackageExpiration()` function (1.5 hours)
  - Check if already extended (one-time limit)
  - Calculate new expiration date
  - Update package with extendedBy data
  - **Test**: Extension works
  - **Test**: One-time limit enforced
  - **Test**: ExtendedBy data saves correctly

- [ ] 2.2.3: Wire up and test (1 hour)
  - Add "Extend Package" button
  - Connect to dialog
  - Handle submission
  - Update UI
  - **Test**: End-to-end flow works
  - **Test**: Cannot extend twice

**Success Criteria**:
✅ Can extend package expiration
✅ One-time limit enforced
✅ Reason tracking works
✅ New expiration date calculates correctly
✅ Extended packages show "Extended" status

---

#### Phase 2.3: Package Info Display (2 hours)

**Sub-tasks**:
- [ ] 2.3.1: Add package info to session cards (1 hour)
  - Show sessions remaining (X/Y format)
  - Show days until expiration
  - Show extended status if applicable
  - **Test**: Info displays correctly
  - **Test**: Updates after actions

- [ ] 2.3.2: Add package expiration warnings (1 hour)
  - Badge on card if expiring soon
  - Warning icon
  - Color coding
  - **Test**: Warnings appear correctly

**Success Criteria**:
✅ Package info visible on all session cards
✅ Expiration warnings display
✅ Info updates in real-time

---

### Phase 3: Weekly Check-in Management
**Priority**: MEDIUM | **Total Time**: 2-3 days

#### Phase 3.1: Check-in Page Setup (1-2 hours)

**Sub-tasks**:
- [ ] 3.1.1: Create `/dashboard/trainer/check-ins/page.tsx` (1 hour)
  - Copy structure from training-sessions page
  - Simplify for check-ins (no packages)
  - Update queries for sessionType="checkin"
  - **Test**: Page loads correctly

- [ ] 3.1.2: Update TrainerSidebar (15 min)
  - Add "Check-ins" menu item
  - **Test**: Navigation works

- [ ] 3.1.3: Update data fetching for check-ins (45 min)
  - Filter by sessionType="checkin"
  - Remove package-related logic
  - **Test**: Fetches check-in sessions only

**Success Criteria**:
✅ Check-in page loads
✅ Shows only check-in sessions
✅ No package-related features

---

#### Phase 3.2: Check-in Session Display (2-3 hours)

**Sub-tasks**:
- [ ] 3.2.1: Create CheckinCard component (1.5 hours)
  - Simpler than SessionCard (no location/package)
  - Show week identifier
  - Show phone call indication
  - **Test**: Card renders correctly

- [ ] 3.2.2: Implement sections (1 hour)
  - Upcoming check-ins
  - Completed check-ins
  - **Test**: Sections display correctly

- [ ] 3.2.3: Add missed check-ins alert (30 min)
  - Show check-ins past scheduled date with no completion
  - **Test**: Missed check-ins identified correctly

**Success Criteria**:
✅ Check-in cards display properly
✅ Week identifier shows
✅ Missed check-ins highlighted

---

#### Phase 3.3: Check-in Actions (2-3 hours)

**Sub-tasks**:
- [ ] 3.3.1: Reuse Mark Complete dialog (30 min)
  - Adapt for check-ins (remove location)
  - **Test**: Works for check-ins

- [ ] 3.3.2: Reuse Mark No-Show dialog (30 min)
  - Remove credit return option
  - **Test**: Works for check-ins

- [ ] 3.3.3: Reuse Cancel dialog (30 min)
  - Remove credit return logic
  - **Test**: Works for check-ins

- [ ] 3.3.4: Reuse Notes dialog (30 min)
  - Same functionality
  - **Test**: Notes work for check-ins

- [ ] 3.3.5: Test all actions (1 hour)
  - Test each action thoroughly
  - Verify no package logic runs
  - **Test**: All actions work correctly

**Success Criteria**:
✅ All session actions work for check-ins
✅ No package-related logic executes
✅ Week tracking works

---

#### Phase 3.4: Check-in Stats (1 hour)

**Sub-tasks**:
- [ ] 3.4.1: Calculate check-in stats (30 min)
  - Today/Week/Month counts
  - Missed count
  - **Test**: Calculations correct

- [ ] 3.4.2: Build stats display (30 min)
  - Update stats cards for check-ins
  - **Test**: Stats display correctly

**Success Criteria**:
✅ Check-in stats accurate
✅ Stats update with filters

---

### Phase 4: Client Hub Integration
**Priority**: MEDIUM | **Total Time**: 1 day

#### Phase 4.1: Training Tab Updates (2-3 hours)

**Sub-tasks**:
- [ ] 4.1.1: Add "Manage Sessions" button (30 min)
  - Add button to Training tab in Client Hub
  - Link to training-sessions page with client filter
  - **Test**: Button appears and links correctly

- [ ] 4.1.2: Add completed sessions list (1.5 hours)
  - Show last 5 completed training sessions
  - Display with notes if present
  - **Test**: Shows correct sessions
  - **Test**: Notes display

- [ ] 4.1.3: Show package status (1 hour)
  - Display sessions remaining
  - Show expiration date
  - Show extended status
  - **Test**: Info displays correctly

**Success Criteria**:
✅ Can navigate to session management from Client Hub
✅ Completed sessions visible
✅ Package info integrated

---

#### Phase 4.2: Session Notes Visibility (1-2 hours)

**Sub-tasks**:
- [ ] 4.2.1: Client-side notes display (1 hour)
  - Show client-visible notes in Client Hub
  - Hide trainer-only notes
  - **Test**: Visibility setting respected

- [ ] 4.2.2: Add notes to completed sessions view (1 hour)
  - Display in client's session history
  - **Test**: Notes appear correctly

**Success Criteria**:
✅ Client sees only client-visible notes
✅ Trainer-only notes hidden from client
✅ Notes enhance client experience

---

### Phase 5: Enhancement & Polish
**Priority**: LOW | **Total Time**: 2-3 days

#### Phase 5.1: Export Functionality (3-4 hours)

**Sub-tasks**:
- [ ] 5.1.1: Implement CSV export (2 hours)
  - Export session list to CSV
  - Include all relevant fields
  - **Test**: CSV downloads correctly
  - **Test**: Data is accurate

- [ ] 5.1.2: Implement PDF export (2 hours)
  - Generate PDF report
  - Include stats and session list
  - **Test**: PDF generates correctly
  - **Test**: Formatting is good

**Success Criteria**:
✅ Can export to CSV
✅ Can export to PDF
✅ Exports include correct data

---

#### Phase 5.2: Performance Optimization (2-3 hours)

**Sub-tasks**:
- [ ] 5.2.1: Add pagination (1.5 hours)
  - Limit initial session load
  - Add "Load More" button
  - **Test**: Pagination works

- [ ] 5.2.2: Implement real-time updates (1 hour)
  - Use Firestore listeners
  - Update list when sessions change
  - **Test**: Real-time updates work

- [ ] 5.2.3: Optimize queries (30 min)
  - Add indexes if needed
  - Cache frequently accessed data
  - **Test**: Page loads faster

**Success Criteria**:
✅ Page loads quickly
✅ Real-time updates work
✅ No performance issues

---

#### Phase 5.3: UI Polish (2-3 hours)

**Sub-tasks**:
- [ ] 5.3.1: Add loading states (1 hour)
  - Skeleton screens
  - Loading spinners
  - **Test**: Loading states show

- [ ] 5.3.2: Add confirmation dialogs (1 hour)
  - Confirm before destructive actions
  - **Test**: Confirmations prevent accidents

- [ ] 5.3.3: Add animations (1 hour)
  - Smooth transitions
  - Toast animations
  - **Test**: Animations enhance UX

**Success Criteria**:
✅ Loading states clear
✅ Confirmations prevent mistakes
✅ Animations smooth

---

## Testing Strategy

### After Each Phase:
1. **Unit Test**: Test individual functions
2. **Integration Test**: Test component integration
3. **E2E Test**: Test complete user flows
4. **Bug Fix**: Address any issues before next phase

### Final Testing (Before Release):
- [ ] Test all training session actions
- [ ] Test all check-in actions
- [ ] Test package management
- [ ] Test with multiple clients
- [ ] Test with edge cases (expired packages, extended packages, etc.)
- [ ] Test error handling
- [ ] Test mobile responsiveness
- [ ] Test with real data

---

## Rollback Strategy

If issues arise:
1. Each phase is independent
2. Can rollback individual features
3. Feature flags can disable problematic sections
4. Database changes are additive (no deletions)

---

## Dependencies Between Phases

- Phase 2 depends on Phase 1 (needs session cards)
- Phase 3 can be done parallel to Phase 2
- Phase 4 depends on Phase 1 & 2
- Phase 5 depends on all previous phases

## Firestore Security Rules

```javascript
// Session Management Rules
match /sessions/{sessionId} {
  // Trainers can read sessions where they are the trainer
  allow read: if request.auth != null && 
    (resource.data.trainerId == request.auth.uid ||
     hasRole('admin'));
  
  // Only trainers and admins can update sessions
  allow update: if request.auth != null &&
    (resource.data.trainerId == request.auth.uid ||
     hasRole('admin')) &&
    // Ensure critical fields aren't changed
    request.resource.data.clientId == resource.data.clientId &&
    request.resource.data.trainerId == resource.data.trainerId &&
    request.resource.data.packageId == resource.data.packageId;
  
  // Sessions can only be created by system (Calendly webhook)
  allow create: if false; // Handled by Cloud Function
  
  // No deletion
  allow delete: if false;
}

// Package Extension Rules
match /users/{userId}/sessionPackages/{packageId} {
  // Trainers can read packages for their clients
  allow read: if request.auth != null &&
    (isTrainerForClient(userId) || hasRole('admin'));
  
  // Only trainers and admins can extend packages
  allow update: if request.auth != null &&
    (isTrainerForClient(userId) || hasRole('admin')) &&
    // Can only update expiration and extendedBy
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['expirationDate', 'ext
