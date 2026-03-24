# Client Activity Feed — Architecture & Design Document

> **Feature:** Client Activity Feed & Real-Time Notifications  
> **Companion to:** [client-activity-feed-requirements.md](./client-activity-feed-requirements.md)  
> **Status:** Draft  
> **Created:** 2026-03-22  
> **Last Updated:** 2026-03-22

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Actions                          │
│  (login, workout, nutrition, weight, goals, sessions, etc.)     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloud Functions (Event Producers)                   │
│                                                                 │
│  Existing triggers + new hooks call writeActivityEvent()        │
│  → Writes to Firestore `activityFeed` collection                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│             Firestore: `activityFeed` Collection                │
│                                                                 │
│  Write-once, append-only log events                             │
│  Auto-expires via scheduled cleanup (7 days)                    │
│  Real-time subscriptions via onSnapshot                         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  onSnapshot      │    │ Scheduled Cleanup │
│  (Real-time)     │    │ (Daily 3 AM UTC)  │
│                  │    │                   │
│  → Feed panel    │    │ Deletes events    │
│  → Unread badge  │    │ older than 7 days │
│  → Toast alerts  │    │                   │
└──────────────────┘    └──────────────────┘
```

---

## 2. Storage Decision: Firestore (Not GCS)

Firestore is the required storage choice for this feature. The rationale:

- **Real-time push**: The core requirement is real-time notifications while on any page. Firestore's `onSnapshot` provides this natively — new events push to the browser instantly with zero additional infrastructure.
- **GCS alternative rejected**: GCS is great for logs you batch-process later, but it has no real-time push capability. To achieve real-time from GCS you'd need Cloud Pub/Sub → Cloud Functions → WebSockets/SSE — a whole extra infrastructure layer for the same result.
- **Data volume is tiny**: ~500–2,000 docs/week for 20 active clients. Auto-cleaned after 7 days. Well within Firestore's sweet spot.
- **Log-like treatment**: Events are write-once, append-only, time-ordered, auto-expiring. We treat them as logs — they just happen to live in Firestore to leverage `onSnapshot`.

---

## 3. Data Model

### 3.1 Collection: `activityFeed/{autoId}`

```typescript
interface ActivityFeedEvent {
  // Core fields
  id: string;                    // Firestore auto-generated document ID
  type: ActivityEventType;       // Event type key (see enum below)
  clientId: string;              // The client who performed the action
  clientName: string;            // Denormalized for display (avoids joins)
  trainerId: string;             // Client's assigned trainer at time of event

  // Display
  message: string;               // Human-readable summary
  timestamp: Timestamp;          // When the event occurred (server timestamp)

  // Event-specific data
  metadata: Record<string, any>; // Varies by event type (see §3.2)

  // State
  read: boolean;                 // Has trainer seen this? (default: false)

  // TTL
  expiresAt: Timestamp;          // timestamp + 7 days (for scheduled cleanup)
}

type ActivityEventType =
  | 'client_login'
  | 'workout_completed'
  | 'nutrition_day_completed'
  | 'daily_activities_completed'
  | 'weight_logged'
  | 'goal_completed'
  | 'milestone_completed'
  | 'new_client_signup'
  | 'session_scheduled'
  | 'checkin_scheduled'
  | 'weekly_survey_submitted'
  | 'subscription_canceled'
  | 'session_purchased'
  | 'session_canceled'
  | 'session_rescheduled';
```

### 3.2 Metadata by Event Type

| Event Type | Metadata Fields |
|---|---|
| `client_login` | *(none needed — message is sufficient)* |
| `workout_completed` | `{ workoutId, workoutName }` |
| `nutrition_day_completed` | `{ date }` |
| `daily_activities_completed` | `{ date, habitsCompleted }` |
| `weight_logged` | `{ weight, unit, previousWeight, changeAmount }` |
| `goal_completed` | `{ goalId, goalTitle, goalCategory }` |
| `milestone_completed` | `{ goalId, goalTitle, milestoneText }` |
| `new_client_signup` | `{ tierName }` |
| `session_scheduled` | `{ sessionId, sessionDate, sessionType }` |
| `checkin_scheduled` | `{ sessionId, checkinDate }` |
| `weekly_survey_submitted` | `{ weekStartDate }` |
| `subscription_canceled` | `{ subscriptionId, accessUntil }` |
| `session_purchased` | `{ packageQuantity, amount }` |
| `session_canceled` | `{ sessionId, sessionDate, cancelReason }` |
| `session_rescheduled` | `{ sessionId, oldDate, newDate }` |

### 3.3 Design Decisions

- **Denormalized `clientName` and `trainerId`**: The feed is read-heavy, write-once. Denormalization avoids joins and keeps reads fast.
- **`trainerId` field**: Enables efficient queries. Trainers query `where('trainerId', '==', myId)`; admins query without that filter.
- **`read` field**: Powers the unread count badge. Marked `true` when the trainer opens the notification panel or explicitly marks as read.
- **`expiresAt` field**: Powers the scheduled cleanup function that deletes events older than 7 days.
- **Single flat collection** (not subcollection per trainer): Simpler indexing, and admins need cross-trainer access.

---

## 4. Firestore Security Rules

```javascript
// Add to firestore.rules inside the main match block:

match /activityFeed/{eventId} {
  // Trainers and admins can read activity feed events
  allow read: if isTrainerOrAdmin();

  // Only Cloud Functions write (via admin SDK, bypasses rules)
  allow create, delete: if false;

  // Trainers can mark events as read (only the 'read' field)
  allow update: if isTrainerOrAdmin() &&
    request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
}
```

---

## 5. Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "activityFeed",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "trainerId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "activityFeed",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "trainerId", "order": "ASCENDING" },
    { "fieldPath": "read", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "activityFeed",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
}
```

---

## 6. Backend: Cloud Functions

### 6.1 Shared Helper: `writeActivityEvent()`

**File:** `firebase/functions/activity-feed.js`

```javascript
const admin = require('firebase-admin');
const logger = require('firebase-functions/logger');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Write an activity event to the activityFeed collection.
 * Called by various Cloud Function triggers when client actions occur.
 *
 * @param {Object} params
 * @param {string} params.type - Event type key (e.g., 'workout_completed')
 * @param {string} params.clientId - The client's user ID
 * @param {string} params.clientName - The client's display name (denormalized)
 * @param {string} params.trainerId - The client's assigned trainer ID
 * @param {string} params.message - Human-readable event summary
 * @param {Object} [params.metadata={}] - Event-specific data
 */
async function writeActivityEvent({ type, clientId, clientName, trainerId, message, metadata = {} }) {
  try {
    const now = admin.firestore.Timestamp.now();
    const expiresAt = admin.firestore.Timestamp.fromMillis(now.toMillis() + SEVEN_DAYS_MS);

    await admin.firestore().collection('activityFeed').add({
      type,
      clientId,
      clientName,
      trainerId: trainerId || '',
      message,
      metadata,
      read: false,
      timestamp: now,
      expiresAt,
    });

    logger.info('[ActivityFeed] Event written', { type, clientId, trainerId });
  } catch (error) {
    // Activity feed writes are non-blocking — log and continue
    logger.error('[ActivityFeed] Failed to write event', {
      type,
      clientId,
      error: error.message,
    });
  }
}

module.exports = { writeActivityEvent };
```

### 6.2 Integration Points (Existing Functions to Modify)

Each integration adds a `writeActivityEvent()` call into an existing Cloud Function. The call is **non-blocking** (fire-and-forget with error handling) so it never disrupts the primary function's operation.

| File | Function | Hook Point | Event(s) Written |
|---|---|---|---|
| `index.js` | `trackLogin` | After `login_history` write + `lastLoginAt` update, only for client-role users | `client_login` |
| `workouts.js` | `completeWorkout` | After workout status set to `completed` | `workout_completed` |
| `goals.js` | `onNutritionLogWrite` | When `dayComplete === true` on the meal plan document | `nutrition_day_completed` |
| `goals.js` | `onDailyActivityWrite` | When all plan-defined habits are checked for the day | `daily_activities_completed` |
| `goals.js` | `onDailyActivityWrite` / `onWeightLog` | When `weight` field is present in the activity document | `weight_logged` |
| `index.js` | `syncSubscriptionToUser` | When `accountActivated` is first set to `true` | `new_client_signup` |
| `index.js` | `syncPaymentToUser` | When `accountActivated` is first set to `true` (one-time payment path) | `new_client_signup` |
| `index.js` | `cancelSubscription` | After successful Stripe subscription cancellation | `subscription_canceled` |
| `index.js` | `syncPaymentToUser` | When session package purchase is detected | `session_purchased` |
| `sessions.js` | `calendlyWebhook` | After training session creation | `session_scheduled` |
| `sessions.js` | `calendlyWebhook` | After weekly check-in creation | `checkin_scheduled` |
| `sessions.js` | `cancelSession` | After session cancellation | `session_canceled` |
| `sessions.js` | `calendlyWebhook` | On Calendly reschedule event | `session_rescheduled` |

### 6.3 New Firestore Triggers

These are new Cloud Function triggers that don't exist yet:

| Trigger Name | Document Path | Condition | Event(s) Written |
|---|---|---|---|
| `onGoalStatusChange` | `goals/{goalId}` | `status` changed from non-`completed` to `completed` | `goal_completed` |
| `onGoalStatusChange` | `goals/{goalId}` | A milestone's `completed` flips from `false` to `true` | `milestone_completed` |
| `onWeeklySurveySubmit` | `weeklySurveys/{userId}/responses/{weekStartDate}` | Document created | `weekly_survey_submitted` |

**Note:** The `onGoalStatusChange` trigger can piggyback on existing goal triggers or be a separate `onDocumentWritten` trigger on the `goals` collection. It needs to diff `before` and `after` states to detect status changes and milestone completions.

### 6.4 TTL Cleanup: `cleanupExpiredActivityFeed`

**Added to:** `firebase/functions/index.js`

```javascript
exports.cleanupExpiredActivityFeed = onSchedule({
  schedule: "0 3 * * *",  // Daily at 3 AM UTC
  timeZone: "UTC",
  region: sharedConfig.region,
}, async () => {
  const now = admin.firestore.Timestamp.now();
  const snapshot = await admin.firestore()
    .collection('activityFeed')
    .where('expiresAt', '<', now)
    .limit(500)
    .get();

  if (snapshot.empty) {
    logger.info('[ActivityFeed] No expired events to clean up');
    return;
  }

  const batch = admin.firestore().batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();

  logger.info(`[ActivityFeed] Cleaned up ${snapshot.size} expired events`);
});
```

---

## 7. Frontend Architecture

### 7.1 New Files

| File | Purpose |
|---|---|
| `app/src/types/activity-feed.ts` | TypeScript interfaces for `ActivityFeedEvent` and `ActivityEventType` |
| `app/src/lib/activity-feed-api.ts` | Firestore queries, `onSnapshot` setup, mark-as-read operations |
| `app/src/context/ActivityFeedContext.tsx` | React context: real-time feed state, unread count, toast triggers |
| `app/src/hooks/useActivityFeed.ts` | Convenience hook consuming the `ActivityFeedContext` |
| `app/src/components/trainer/activity-feed/ActivityFeedPanel.tsx` | Feed list with filters (used inside the Sheet) |
| `app/src/components/trainer/activity-feed/ActivityFeedItem.tsx` | Single event row component |
| `app/src/components/trainer/activity-feed/NotificationBell.tsx` | Bell icon + unread badge (triggers Sheet open) |
| `app/src/components/trainer/activity-feed/ActivityFeedSheet.tsx` | Right-side slide-out panel (shadcn `Sheet` component) |
| `app/src/app/dashboard/trainer/activity/page.tsx` | Fallback full-page route |

### 7.2 Slide-Out Panel Design

The primary UI is a right-side slide-out panel using the shadcn/ui `Sheet` component:

```
┌──────────────────────────────────────┐┌─────────────────────────┐
│                                      ││  Client Activity Feed   │
│        Current Page Content          ││  ┌───────────────────┐  │
│        (any trainer page)            ││  │ Filter: [All ▼]   │  │
│                                      ││  └───────────────────┘  │
│                                      ││                         │
│                                      ││  TODAY                  │
│                                      ││  💪 John completed...   │
│                                      ││  ⚖️ Jane logged 178lbs  │
│                                      ││  🥗 Mike completed...   │
│                                      ││                         │
│                                      ││  YESTERDAY              │
│                                      ││  🎉 Sarah signed up...  │
│                                      ││  📅 John scheduled...   │
│                                      ││  🏆 Jane hit goal...    │
│                                      ││                         │
│                                      ││  [Mark All Read]        │
└──────────────────────────────────────┘└─────────────────────────┘
```

The `Sheet` component from shadcn/ui is a standard primitive already available in the project's component library. It supports `side="right"`, handles focus trapping, escape-to-close, click-outside-to-close, and animations out of the box. **No additional UI libraries needed.**

### 7.3 Real-Time Listener Strategy

```typescript
// ActivityFeedContext.tsx — core listener logic

// 1. Build query based on role
const feedQuery = isAdmin
  ? query(collection(db, 'activityFeed'), orderBy('timestamp', 'desc'), limit(100))
  : query(
      collection(db, 'activityFeed'),
      where('trainerId', '==', trainerId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );

// 2. Set up onSnapshot listener
const unsubscribe = onSnapshot(feedQuery, (snapshot) => {
  // 3. Detect NEW events (skip initial load to avoid toast flood)
  if (!isInitialLoad) {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        showToastNotification(change.doc.data());
      }
    });
  }

  // 4. Update full feed state
  setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));

  // 5. Calculate unread count
  setUnreadCount(snapshot.docs.filter(d => !d.data().read).length);

  // 6. Mark initial load complete
  if (isInitialLoad) setIsInitialLoad(false);
});

// 7. Register with ListenerRegistry for cleanup on logout
registerListener(unsubscribe);
```

### 7.4 Context Provider Placement

The `ActivityFeedProvider` wraps the trainer layout so the real-time listener is active on all trainer pages:

```tsx
// In the trainer layout (wraps all /dashboard/trainer/* pages)
<ActivityFeedProvider trainerId={user.uid} isAdmin={canAccessAdminDashboard}>
  <SidebarProvider>
    <TrainerSidebar />
    <SidebarInset>
      <ActivityFeedSheet />  {/* Right-side slide-out, rendered globally */}
      {children}
    </SidebarInset>
  </SidebarProvider>
</ActivityFeedProvider>
```

### 7.5 Component Hierarchy

```
ActivityFeedProvider (context, listener, state)
├── NotificationBell (in sidebar header)
│   ├── Bell icon + unread badge
│   └── onClick → open Sheet
├── ActivityFeedSheet (shadcn Sheet, side="right")
│   └── ActivityFeedPanel
│       ├── Filter bar (event type pills + client dropdown)
│       ├── "Mark All Read" button
│       └── Grouped event list
│           ├── "Today" header
│           │   └── ActivityFeedItem × N
│           ├── "Yesterday" header
│           │   └── ActivityFeedItem × N
│           └── "This Week" header
│               └── ActivityFeedItem × N
└── Toast notifications (via existing use-toast hook)
```

### 7.6 Mark as Read

Two mechanisms:

1. **Individual**: Clicking an event calls `markEventAsRead(eventId)` which updates `{ read: true }` on the Firestore document.
2. **Bulk**: "Mark All Read" button calls `markAllEventsAsRead(trainerId)` which batch-updates all unread events for that trainer.

```typescript
// activity-feed-api.ts

export async function markEventAsRead(eventId: string): Promise<void> {
  await updateDoc(doc(db, 'activityFeed', eventId), { read: true });
}

export async function markAllEventsAsRead(trainerId: string, isAdmin: boolean): Promise<void> {
  const q = isAdmin
    ? query(collection(db, 'activityFeed'), where('read', '==', false))
    : query(collection(db, 'activityFeed'), where('trainerId', '==', trainerId), where('read', '==', false));

  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}
```

---

## 8. Account Deletion Impact

Since `activityFeed` events auto-expire after 7 days, **no GDPR cleanup integration is needed**. Add a documentation note to `client-deletion-collection-checklist.md`:

> **`activityFeed`** — Auto-expires (7-day TTL via scheduled cleanup). No cleanup action required during account deletion.

---

## 9. Performance Considerations

| Concern | Solution |
|---|---|
| **Cloud Function cold starts** delay event writing | Events are written async; UI uses `onSnapshot` which catches up automatically on reconnection |
| **Too many events** for very active clients | 7-day TTL + `limit(100)` on queries keeps things bounded. ~500 bytes per event × 100 = ~50 KB max |
| **`onSnapshot` listener** keeps connection open | Established pattern in codebase (exercises, workouts, subscriptions). Registered with `ListenerRegistry` for proper cleanup on logout |
| **Existing Cloud Functions** need modification | All changes are additive (adding `writeActivityEvent()` calls). No existing behavior is altered. Calls are wrapped in try/catch so failures don't affect primary operations |
| **Firestore read costs** | One `onSnapshot` listener = one read per update. With ~50–200 events/day and 1–3 active trainer sessions, cost is negligible |

---

## 10. Implementation Phases

### Phase 1: Infrastructure
1. Create TypeScript types (`app/src/types/activity-feed.ts`)
2. Create shared helper (`firebase/functions/activity-feed.js`)
3. Add Firestore security rules for `activityFeed` collection
4. Add Firestore indexes to `firestore.indexes.json`

### Phase 2: Cloud Function Hooks
5. Hook `trackLogin` → `client_login`
6. Hook `completeWorkout` → `workout_completed`
7. Hook `onNutritionLogWrite` → `nutrition_day_completed`
8. Hook `onDailyActivityWrite` → `daily_activities_completed` + `weight_logged`
9. New trigger for `goal_completed` + `milestone_completed`
10. Hook `syncSubscriptionToUser` / `syncPaymentToUser` → `new_client_signup`
11. Hook `cancelSubscription` → `subscription_canceled`
12. Hook `syncPaymentToUser` → `session_purchased`
13. Hook `calendlyWebhook` / `cancelSession` → `session_scheduled` / `checkin_scheduled` / `session_canceled` / `session_rescheduled`
14. New trigger for `weekly_survey_submitted`
15. Create `cleanupExpiredActivityFeed` scheduled function

### Phase 3: Frontend — Core
16. Create `ActivityFeedContext` with real-time `onSnapshot` listener
17. Create `ActivityFeedPanel` and `ActivityFeedItem` components
18. Create `ActivityFeedSheet` (right-side slide-out using shadcn `Sheet`)

### Phase 4: Frontend — Notifications
19. Create `NotificationBell` component with unread badge
20. Integrate bell into trainer sidebar/layout (visible on all trainer pages)
21. Toast notifications for new real-time events
22. "Mark as read" / "Mark all read" functionality
23. Fallback `/dashboard/trainer/activity` full-page route

### Phase 5: Polish
24. Update `client-deletion-collection-checklist.md` documentation
25. End-to-end testing

---

## 11. Dependencies & Risks

| Risk | Mitigation |
|---|---|
| Cloud Function cold starts delay event writing | Events are non-blocking. `onSnapshot` catches up automatically |
| `writeActivityEvent` fails | Wrapped in try/catch. Logged as warning. Never blocks primary function |
| Too many events overwhelm the feed | 7-day TTL + `limit(100)` bounds the dataset. Filters help focus |
| `onSnapshot` listener memory leaks | Registered with existing `ListenerRegistry`. Cleaned up on logout |
| Firestore index deployment | Indexes must be deployed before the feature goes live. Include in deploy checklist |
| Goal triggers fire multiple times | Diff `before`/`after` states carefully. Only write event on actual state transitions |
