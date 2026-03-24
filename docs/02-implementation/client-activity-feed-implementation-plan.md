# Client Activity Feed — Implementation Plan

> **Feature:** Client Activity Feed & Real-Time Notifications  
> **Companion docs:**  
> - [Requirements](./client-activity-feed-requirements.md)  
> - [Architecture & Design](./client-activity-feed-architecture.md)  
> **Status:** In Progress  
> **Created:** 2026-03-22  
> **Last Updated:** 2026-03-22

---

## Implementation Strategy

The implementation is broken into 4 phases. Each phase builds on the previous and can be **verified independently** before moving to the next. No existing functionality is disrupted — all changes are additive.

**Key principle:** Phase 2 delivers one complete vertical slice (one event → Firestore → real-time UI). Once that works, Phase 3 is purely repetitive hook-ups with zero architectural risk.

---

## Phase 1: Foundation

> **Goal:** Lay all groundwork without touching any existing code.  
> **Risk:** Zero — pure additions.  
> **Verification:** Files created, no build errors, `firestore.rules` and `firestore.indexes.json` valid.

### Step 1.1 — TypeScript Types
- [ ] Create `app/src/types/activity-feed.ts`
- Defines `ActivityFeedEvent` interface and `ActivityEventType` union type
- Defines event metadata interfaces per event type
- Defines helper constants (event type → icon, event type → display label)

### Step 1.2 — Cloud Functions Helper
- [ ] Create `firebase/functions/activity-feed.js`
- Exports `writeActivityEvent({ type, clientId, clientName, trainerId, message, metadata })`
- Writes to `activityFeed` collection with auto-generated ID
- Sets `read: false`, `timestamp: serverTimestamp`, `expiresAt: timestamp + 7 days`
- Wrapped in try/catch — never throws (non-blocking)

### Step 1.3 — Firestore Security Rules
- [ ] Add `activityFeed` rules to `firestore.rules`
- `allow read: if isTrainerOrAdmin()`
- `allow create, delete: if false` (only Cloud Functions write)
- `allow update: if isTrainerOrAdmin() && affectedKeys().hasOnly(['read'])`

### Step 1.4 — Firestore Indexes
- [ ] Add indexes to `firestore.indexes.json`:
  - `trainerId ASC + timestamp DESC` (trainer feed query)
  - `trainerId ASC + read ASC + timestamp DESC` (unread count query)
  - `expiresAt ASC` (TTL cleanup query)

### Step 1.5 — TTL Cleanup Function
- [ ] Add `cleanupExpiredActivityFeed` to `firebase/functions/index.js`
- Scheduled: daily at 3 AM UTC
- Queries `where('expiresAt', '<', now)`, deletes in batch (limit 500)

### Phase 1 Verification
- [ ] `npm run build` in `app/` passes (no TS errors)
- [ ] `firestore.rules` is valid (no syntax errors)
- [ ] `firestore.indexes.json` is valid JSON

---

## Phase 2: End-to-End Vertical Slice

> **Goal:** Get ONE event flowing through the entire pipeline: Cloud Function → Firestore → Real-time UI.  
> **Risk:** Low — one small hook into existing function, all new frontend code.  
> **Verification:** Trigger a new client signup → event appears in Firestore → slide-out panel shows it in real-time.

### Step 2.1 — Hook First Event: `new_client_signup`
- [ ] Modify `syncSubscriptionToUser` in `firebase/functions/index.js`
- After `accountActivated` is first set to `true`, call `writeActivityEvent()`
- Get client name from user data, trainer ID from assignment
- Non-blocking: wrapped in `.catch()` so it doesn't affect subscription sync
- [ ] Same hook in `syncPaymentToUser` for one-time payment path

### Step 2.2 — Frontend API Layer
- [ ] Create `app/src/lib/activity-feed-api.ts`
- `subscribeToActivityFeed(trainerId, isAdmin, callback)` — sets up `onSnapshot` listener
- `markEventAsRead(eventId)` — updates `{ read: true }`
- `markAllEventsAsRead(trainerId, isAdmin)` — batch updates all unread

### Step 2.3 — Activity Feed Context
- [ ] Create `app/src/context/ActivityFeedContext.tsx`
- Manages real-time `onSnapshot` listener
- Provides: `events[]`, `unreadCount`, `isSheetOpen`, `openSheet()`, `closeSheet()`
- Tracks `isInitialLoad` to suppress toast flood on first render
- Registers listener with `ListenerRegistry` for cleanup on logout
- [ ] Create `app/src/hooks/useActivityFeed.ts` — convenience hook

### Step 2.4 — Activity Feed Item Component
- [ ] Create `app/src/components/trainer/activity-feed/ActivityFeedItem.tsx`
- Renders: icon, client name, action text, relative timestamp
- Unread styling (accent left border or highlighted background)
- Click handler (marks as read, optionally navigates to client hub)

### Step 2.5 — Activity Feed Panel Component
- [ ] Create `app/src/components/trainer/activity-feed/ActivityFeedPanel.tsx`
- Renders list of `ActivityFeedItem` components
- Grouped by day: "Today", "Yesterday", "This Week"
- Filter pills at top (All, Workouts, Nutrition, Goals, Sessions, Logins, etc.)
- Client filter dropdown
- "Mark All Read" button
- Empty state when no events
- Scrollable container

### Step 2.6 — Activity Feed Sheet (Slide-Out Panel)
- [ ] Create `app/src/components/trainer/activity-feed/ActivityFeedSheet.tsx`
- Uses shadcn/ui `Sheet` component with `side="right"`
- Header: "Client Activity Feed" title + close button
- Body: `ActivityFeedPanel` component
- Controlled by context: `isSheetOpen`, `openSheet()`, `closeSheet()`

### Step 2.7 — Notification Bell
- [ ] Create `app/src/components/trainer/activity-feed/NotificationBell.tsx`
- Bell icon (lucide-react `Bell`)
- Red badge with unread count (caps at "9+")
- Click opens the Sheet via context `openSheet()`

### Step 2.8 — Wire Into Trainer Layout
- [ ] Wrap trainer pages with `ActivityFeedProvider` in the trainer layout
- [ ] Add `NotificationBell` to `TrainerSidebar` header area
- [ ] Render `ActivityFeedSheet` in the trainer layout (globally available)

### Phase 2 Verification
- [ ] Log in as trainer → see bell icon in sidebar (0 unread initially)
- [ ] Create a test signup (or manually add a doc to `activityFeed`)
- [ ] Bell shows unread badge → click → slide-out panel opens → event visible
- [ ] Click event → marked as read → unread count decreases
- [ ] "Mark All Read" button works
- [ ] Navigate between trainer pages → bell + panel still work everywhere
- [ ] Log out → no permission errors (listener cleaned up)

---

## Phase 3: All Cloud Function Hooks

> **Goal:** Wire up all remaining 14 event types.  
> **Risk:** Low — same pattern repeated. Each hook is isolated.  
> **Verification:** Trigger each client action → corresponding event appears in feed.

### Step 3.1 — Login Events
- [ ] Hook `trackLogin` in `index.js` → `client_login`
- Only for client-role users (check user doc role before writing)
- Get client name + trainer ID from user document

### Step 3.2 — Workout Events
- [ ] Hook `completeWorkout` in `workouts.js` → `workout_completed`
- Get workout name, client name, trainer ID from workout + user data

### Step 3.3 — Nutrition Events
- [ ] Hook `onNutritionLogWrite` in `goals.js` → `nutrition_day_completed`
- Only when `dayComplete === true` (and wasn't true before, if update)
- Get client name + trainer ID from user document

### Step 3.4 — Daily Activity Events
- [ ] Hook `onDailyActivityWrite` in `goals.js` → `daily_activities_completed`
- Determine "all habits completed" by checking against plan-defined habits
- [ ] Hook `onWeightLog` / `onDailyActivityWrite` in `goals.js` → `weight_logged`
- When `weight` field is present in the activity document
- Include weight value, unit, and change from previous (if available)

### Step 3.5 — Goal & Milestone Events (New Trigger)
- [ ] Create `onGoalStatusChange` trigger on `goals/{goalId}`
- Diff `before.status` vs `after.status`: if changed to `completed` → `goal_completed`
- Diff `before.milestones` vs `after.milestones`: detect newly completed → `milestone_completed`
- Get client name + trainer ID from goal document's `clientId` and `trainerId` fields
- [ ] Export new trigger from `goals.js` and register in `index.js`

### Step 3.6 — Subscription Events
- [ ] Hook `cancelSubscription` in `index.js` → `subscription_canceled`
- Get client name + trainer ID from user document
- Include `accessUntil` in metadata

### Step 3.7 — Session Purchase Events
- [ ] Hook `syncPaymentToUser` in `index.js` → `session_purchased`
- When session package purchase is detected (metadata.type === "session_package")
- Include package quantity and amount in metadata

### Step 3.8 — Session Scheduling Events
- [ ] Hook `calendlyWebhook` in `sessions.js` → `session_scheduled`
- After training session creation
- [ ] Hook `calendlyWebhook` in `sessions.js` → `checkin_scheduled`
- After weekly check-in creation
- [ ] Hook `calendlyWebhook` in `sessions.js` → `session_rescheduled`
- On Calendly reschedule event type
- [ ] Hook `cancelSession` in `sessions.js` → `session_canceled`
- After session cancellation

### Step 3.9 — Weekly Survey Events (New Trigger)
- [ ] Create `onWeeklySurveySubmit` trigger on `weeklySurveys/{userId}/responses/{weekStartDate}`
- Fires on document creation
- Get client name + trainer ID from user document
- [ ] Export new trigger and register in `index.js`

### Phase 3 Verification
- [ ] Each event type produces a correctly formatted `activityFeed` document
- [ ] All events appear in the slide-out panel with correct icons and messages
- [ ] Filters in the panel correctly show/hide event types
- [ ] No existing functionality is broken (workouts still complete, goals still track, etc.)

---

## Phase 4: Polish

> **Goal:** Add toast notifications, fallback page, and documentation.  
> **Risk:** Minimal — additive UI enhancements and docs.  
> **Verification:** Full end-to-end testing of all features.

### Step 4.1 — Toast Notifications
- [ ] In `ActivityFeedContext`, detect new events via `snapshot.docChanges()` (type `'added'`)
- Skip during initial load (`isInitialLoad` flag)
- Show toast using existing `use-toast.ts` hook
- Toast content: event icon + client name + short message
- Auto-dismiss after 5 seconds

### Step 4.2 — Fallback Full-Page Route
- [ ] Create `app/src/app/dashboard/trainer/activity/page.tsx`
- Full-page view using `ActivityFeedPanel` component (same as slide-out, just full-page)
- Wrapped in trainer layout with sidebar
- Accessible via direct URL (not in sidebar navigation)

### Step 4.3 — Documentation Updates
- [ ] Update `docs/02-implementation/client-deletion-collection-checklist.md`
- Add note: "`activityFeed` — Auto-expires (7-day TTL). No cleanup needed."
- [ ] Update this implementation plan — mark all steps complete

### Phase 4 Verification
- [ ] Toast appears when new event arrives (not on page load)
- [ ] Toast auto-dismisses after 5 seconds
- [ ] `/dashboard/trainer/activity` page loads correctly
- [ ] Full regression: all existing features still work
- [ ] Logout → no permission errors
- [ ] Multiple trainer sessions → each sees their own events

---

## Deployment Checklist

Before deploying to production:

- [ ] Deploy Firestore indexes (`firebase deploy --only firestore:indexes`)
- [ ] Deploy Firestore rules (`firebase deploy --only firestore:rules`)
- [ ] Deploy Cloud Functions (`firebase deploy --only functions`)
- [ ] Deploy frontend (Next.js build + deploy)
- [ ] Verify indexes are built (check Firebase Console → Firestore → Indexes)
- [ ] Test end-to-end in production: trigger event → appears in feed

---

## File Summary

### New Files Created
| File | Phase | Purpose |
|---|---|---|
| `app/src/types/activity-feed.ts` | 1.1 | TypeScript types |
| `firebase/functions/activity-feed.js` | 1.2 | Shared helper function |
| `app/src/lib/activity-feed-api.ts` | 2.2 | Firestore queries + listener |
| `app/src/context/ActivityFeedContext.tsx` | 2.3 | React context |
| `app/src/hooks/useActivityFeed.ts` | 2.3 | Convenience hook |
| `app/src/components/trainer/activity-feed/ActivityFeedItem.tsx` | 2.4 | Single event row |
| `app/src/components/trainer/activity-feed/ActivityFeedPanel.tsx` | 2.5 | Feed list with filters |
| `app/src/components/trainer/activity-feed/ActivityFeedSheet.tsx` | 2.6 | Slide-out panel |
| `app/src/components/trainer/activity-feed/NotificationBell.tsx` | 2.7 | Bell icon + badge |
| `app/src/app/dashboard/trainer/activity/page.tsx` | 4.2 | Fallback full-page view |

### Existing Files Modified
| File | Phase | Change |
|---|---|---|
| `firestore.rules` | 1.3 | Add `activityFeed` rules |
| `firestore.indexes.json` | 1.4 | Add 3 indexes |
| `firebase/functions/index.js` | 1.5, 2.1, 3.1, 3.5, 3.6, 3.7, 3.9 | Cleanup function + event hooks |
| `firebase/functions/workouts.js` | 3.2 | `workout_completed` hook |
| `firebase/functions/goals.js` | 3.3, 3.4, 3.5 | Nutrition + activity + goal hooks |
| `firebase/functions/sessions.js` | 3.8 | Session event hooks |
| Trainer layout/sidebar files | 2.8 | Wire in context + bell + sheet |
| `docs/02-implementation/client-deletion-collection-checklist.md` | 4.3 | Add activityFeed note |
