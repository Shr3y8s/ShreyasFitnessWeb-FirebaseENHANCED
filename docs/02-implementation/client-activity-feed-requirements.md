# Client Activity Feed — Requirements Document

> **Feature:** Client Activity Feed & Real-Time Notifications  
> **Status:** Draft  
> **Created:** 2026-03-22  
> **Last Updated:** 2026-03-22

---

## 1. Feature Summary

The **Client Activity Feed** is a real-time, chronological log of all meaningful client actions across the platform. It enables the trainer to stay informed about client engagement without actively checking each client's profile.

The trainer can:
- View a running log of all client activity (retained for 7 days)
- Receive real-time notifications while on any page of the website
- Filter activity by event type or by client

---

## 2. User Stories

| # | As a… | I want to… | So that… |
|---|---|---|---|
| 1 | Trainer | See a running feed of all my clients' activities | I know who's engaged and who might need a nudge |
| 2 | Trainer | Get real-time notifications when a client does something | I can react promptly (e.g., congratulate, adjust plan) |
| 3 | Trainer | See when a new client signs up | I can welcome them and start onboarding immediately |
| 4 | Trainer | See when a client logs weight | I can track progress without navigating to their profile |
| 5 | Trainer | See when a client completes a workout | I know they're following their plan |
| 6 | Trainer | See when a client hits a goal or milestone | I can celebrate their achievement |
| 7 | Trainer | See when a client schedules or cancels a session | I'm aware of my upcoming schedule changes |
| 8 | Trainer | Filter activity by type or client | I can focus on what matters right now |
| 9 | Admin | See activity for ALL clients across all trainers | I have full visibility into platform engagement |
| 10 | Trainer | Get notified while on ANY page of the website | I don't miss important client actions |

---

## 3. Activity Event Types

| # | Event Key | Display Label | Example Message |
|---|---|---|---|
| 1 | `client_login` | Logged In | "John Smith logged in" |
| 2 | `workout_completed` | Completed Workout | "John Smith completed Upper Body Push" |
| 3 | `nutrition_day_completed` | Completed Nutrition | "Jane Doe completed nutrition plan for today" |
| 4 | `daily_activities_completed` | Completed Daily Activities | "Mike Johnson completed all daily activities" |
| 5 | `weight_logged` | Logged Weight | "Sarah Lee logged weight: 178 lbs (↓2 lbs)" |
| 6 | `goal_completed` | Hit a Goal | "John Smith reached goal: Lose 10 lbs 🏆" |
| 7 | `milestone_completed` | Reached Milestone | "Jane Doe reached milestone: 5-day step streak 🎯" |
| 8 | `new_client_signup` | New Client | "Mike Johnson signed up (Online Coaching) 🎉" |
| 9 | `session_scheduled` | Scheduled Session | "Sarah Lee scheduled training session for Mar 25" |
| 10 | `checkin_scheduled` | Scheduled Check-in | "John Smith scheduled weekly check-in for Mar 24" |
| 11 | `weekly_survey_submitted` | Submitted Check-in Survey | "Jane Doe submitted weekly check-in survey" |
| 12 | `subscription_canceled` | Canceled Subscription | "Mike Johnson canceled subscription" |
| 13 | `session_purchased` | Purchased Session Pack | "Sarah Lee purchased 4-pack training sessions" |
| 14 | `session_canceled` | Canceled Session | "John Smith canceled training session on Mar 25" |
| 15 | `session_rescheduled` | Rescheduled Session | "Jane Doe rescheduled session from Mar 25 to Mar 27" |

---

## 4. Scope & Permissions

| Viewer Role | Sees activity from… |
|---|---|
| **Trainer** (non-admin) | Only their assigned clients (`assignedTrainerId === trainer.uid`) |
| **Admin who trains** (`canTrain: true`) | ALL clients (admin privilege) |
| **Admin who doesn't train** | ALL clients (admin view) |

---

## 5. Data Retention

- Events are retained for **7 days**, then automatically deleted by a scheduled cleanup function.
- No GDPR/account-deletion cleanup integration needed — events auto-expire within 7 days and contain minimal data. A note will be added to the deletion checklist doc: "activityFeed: auto-expires, no cleanup needed."

---

## 6. UI Requirements

### 6.1 Notification Bell (All Pages)

- Bell icon visible in the trainer sidebar/header on **every trainer page**
- Red badge showing unread count (caps at "9+")
- Click opens the **Activity Feed slide-out panel** from the right side of the screen
- Brief pulse animation when new event arrives

### 6.2 Activity Feed Slide-Out Panel

The primary way to access the activity feed. Available on any trainer page — the trainer clicks the bell and a panel slides in from the right side of the browser.

- **Slide-out from right**: Uses shadcn/ui `Sheet` component (`side="right"`)
- **Chronological list**: Activity events sorted newest first
- **Grouped by day**: "Today", "Yesterday", "This Week" section headers
- **Filter pills**: All, Workouts, Nutrition, Goals, Sessions, Logins, etc.
- **Client filter**: Search/dropdown to filter by specific client
- **Unread indicators**: Unread items have a subtle accent border or highlighted background
- **Mark All Read**: Button to mark all events as read
- **Click to navigate**: Clicking an event navigates to the relevant client hub page
- **Close**: Click outside panel, press Escape, or click X to close

### 6.3 Toast Notifications

- When new events arrive in real-time, show a brief toast notification (top-right)
- Shows event icon + client name + short message
- Auto-dismisses after 5 seconds
- Clicking navigates to relevant context
- Uses existing `use-toast.ts` hook and toast infrastructure

### 6.4 Fallback Route

- `/dashboard/trainer/activity` — full-page view of the activity feed
- Not added to sidebar navigation (primary access is via bell → slide-out panel)
- Serves as deep-link / bookmark option

---

## 7. Feed Item Display Format

Each item in the feed shows:

```
[Icon] [Client Name] [action text]              [relative timestamp]
  💪    John Smith    completed Upper Body Push         2 minutes ago
  ⚖️    Jane Doe      logged weight: 178 lbs (-2 lbs)   15 minutes ago
  🎉    Mike Johnson  signed up (Online Coaching)        1 hour ago
  🏆    Sarah Lee     hit goal: Lose 10 lbs              3 hours ago
  📅    John Smith    scheduled session for Mar 25       5 hours ago
  ❌    Jane Doe      canceled subscription               Yesterday
```

Icons per event type:

| Event Type | Icon |
|---|---|
| `client_login` | 🔵 |
| `workout_completed` | 💪 |
| `nutrition_day_completed` | 🥗 |
| `daily_activities_completed` | ✅ |
| `weight_logged` | ⚖️ |
| `goal_completed` | 🏆 |
| `milestone_completed` | 🎯 |
| `new_client_signup` | 🎉 |
| `session_scheduled` | 📅 |
| `checkin_scheduled` | 📋 |
| `weekly_survey_submitted` | 📝 |
| `subscription_canceled` | ❌ |
| `session_purchased` | 💳 |
| `session_canceled` | 🚫 |
| `session_rescheduled` | 🔄 |

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Real-time latency | Events appear in < 3 seconds of client action |
| Feed load time | < 1 second for initial feed render |
| Max events displayed | 100 most recent |
| Retention | 7 days |
| Concurrent listeners | 1 per active trainer session |
| Storage technology | Firestore (required for real-time `onSnapshot` push to browser) |

---

## 9. Out of Scope

- Client-facing activity feed (clients do not see this)
- Email/push notifications (future enhancement)
- Activity analytics or aggregation dashboards
- Events older than 7 days
