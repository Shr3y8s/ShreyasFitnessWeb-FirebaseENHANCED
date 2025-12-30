# Client Hub Implementation Specification

**Version:** 2.0  
**Date:** December 30, 2025  
**Status:** Planning Phase - Requirements Complete  
**Feature Name:** Client Hub (Comprehensive Client Management System)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Information Architecture](#information-architecture)
3. [Tab Specifications - The WHAT](#tab-specifications---the-what)
4. [List View Requirements](#list-view-requirements)
5. [Implementation Approach](#implementation-approach)

---

## Executive Summary

### Purpose
Create a unified "Client Hub" that gives trainers complete visibility into ALL client data - everything a client sees in their own dashboard, plus admin-only information. This is a single-pane-of-glass view for comprehensive client management.

### Key Principles
1. **Complete Information** - Show ALL data available about a client, not just a subset
2. **Mirrored Structure** - Tabs mirror the client's own sidebar sections
3. **At-a-Glance Insights** - Rich badges and quick stats in the list view
4. **Bulk Actions Preserved** - Multi-select for group messaging and assignments
5. **Easy Navigation** - Intuitive tab structure, clear breadcrumbs

### Route Structure
```
/dashboard/trainer/client-hub          → List view with all clients
/dashboard/trainer/client-hub/[id]     → Detail view with 7 tabs
/dashboard/trainer/clients             → OLD SYSTEM (keep for now)
```

---

## Information Architecture

### Complete Client Data Map

Based on the client sidebar structure, here's EVERYTHING available about a client:

```
CLIENT HUB
│
├── 📊 OVERVIEW TAB
│   ├── Key Metrics Dashboard
│   ├── Status Badges (Payment, Training, Sessions)
│   ├── Critical Alerts (expiring sessions, inactivity, etc.)
│   ├── Quick Stats (workouts, check-ins, last activity)
│   └── Quick Actions (message, assign, edit plan)
│
├── 📋 PLAN TAB
│   ├── Client's Vision & Goals
│   ├── Weekly Focus
│   ├── Training Protocol
│   ├── Nutrition Protocol
│   ├── LISS Cardio Schedule
│   ├── Daily Habits Checklist
│   ├── Step Goal
│   └── Water Goal
│   [Link to: Edit Plan page]
│
├── 💪 TRAINING TAB
│   ├── Workout Assignments
│   │   ├── All assigned workouts (history)
│   │   ├── Status (assigned, in progress, completed)
│   │   ├── Due dates
│   │   ├── Completion rate
│   │   └── Last workout completed
│   │
│   ├── 1-on-1 Sessions
│   │   ├── Session Balance (purchased, used, available)
│   │   ├── Session Packages (history of purchases)
│   │   ├── Upcoming Sessions (scheduled dates/times/locations)
│   │   ├── Past Sessions (completed history)
│   │   └── Expiration Dates
│   │
│   └── Quick Actions
│       ├── Assign New Workout
│       └── Schedule Session
│
├── 🍎 NUTRITION TAB
│   ├── Nutrition Approach
│   │   ├── Current approach (assigned by trainer)
│   │   ├── Calorie targets
│   │   ├── Macro targets
│   │   └── Meal timing preferences
│   │
│   ├── Meal Plans
│   │   ├── Weekly meal plan (if assigned)
│   │   ├── Today's meals
│   │   └── Meal prep suggestions
│   │
│   ├── Nutrition Habits
│   │   ├── Daily habit tracking
│   │   ├── Consistency scores
│   │   └── Trends over time
│   │
│   └── Quick Actions
│       └── Update Nutrition Protocol
│
├── 📈 PROGRESS TAB
│   ├── Key Metrics
│   │   ├── Weight (current, trend, chart)
│   │   ├── Body measurements
│   │   ├── Body fat % (if tracked)
│   │   └── Custom metrics
│   │
│   ├── Daily Activities Log
│   │   ├── Steps (daily logs, averages, trends)
│   │   ├── Water intake (daily logs, consistency)
│   │   ├── Weight logs (timeline, frequency)
│   │   └── Daily habits (completion rates)
│   │
│   ├── Progress Photos
│   │   ├── Photo timeline
│   │   ├── Comparison view
│   │   ├── Upload dates
│   │   └── Photo grid/gallery
│   │
│   ├── Weekly Surveys
│   │   ├── Survey history
│   │   ├── Qualitative feedback
│   │   ├── Trend analysis
│   │   └── Coach responses
│   │
│   ├── Goals & Milestones
│   │   ├── Active goals
│   │   ├── Completed goals
│   │   ├── Progress towards goals
│   │   └── Celebration moments
│   │
│   └── Progress Charts
│       ├── Weight trend
│       ├── Activity trends
│       ├── Habit consistency
│       └── Workout frequency
│
├── 💬 SUPPORT TAB
│   ├── Messages/Chat
│   │   ├── Full conversation history
│   │   ├── Unread count
│   │   ├── Quick reply
│   │   └── Message search
│   │
│   ├── Weekly Check-ins
│   │   ├── Check-in history
│   │   ├── Scheduled check-ins
│   │   ├── Notes from check-ins
│   │   └── Action items
│   │
│   ├── Trainer Assignment
│   │   ├── Assigned trainer info
│   │   ├── Assignment date
│   │   └── Relationship duration
│   │
│   └── Resources
│       ├── Shared resources
│       ├── Documents
│       └── Links
│
└── 👤 ACCOUNT TAB
    ├── Profile Information
    │   ├── Name (preferred name)
    │   ├── Email
    │   ├── Phone
    │   ├── Address
    │   ├── Timezone
    │   ├── Emergency contact
    │   ├── Profile photo
    │   └── Account creation date
    │
    ├── Security
    │   ├── Login History (last 30 days)
    │   │   ├── Login date/time
    │   │   ├── Device (browser, OS)
    │   │   ├── Location (city, state, country)
    │   │   ├── IP address (anonymized)
    │   │   ├── Success/failure status
    │   │   └── Suspicious activity flags
    │   │
    │   ├── Security Overview
    │   │   ├── Email verification status
    │   │   ├── Password last changed
    │   │   ├── 2FA status
    │   │   └── Active sessions
    │   │
    │   └── Export Options
    │       └── Download login history CSV
    │
    ├── Membership (visible to all)
    │   ├── Current plan/tier
    │   ├── Membership status
    │   ├── Member since date
    │   ├── Membership duration
    │   └── Plan features
    │
    └── Billing & Payments (ADMIN ONLY)
        ├── Subscription Details
        │   ├── Current subscription
        │   ├── Billing cycle
        │   ├── Next billing date
        │   ├── Payment amount
        │   └── Subscription status
        │
        ├── Payment Method
        │   ├── Card type/last 4 digits
        │   ├── Expiration date
        │   └── Update payment link
        │
        ├── Subscription Transaction History
        │   ├── All subscription payments
        │   ├── Payment dates
        │   ├── Amounts
        │   ├── Payment methods used
        │   └── Payment statuses
        │
        ├── Session Purchase History
        │   ├── All session package purchases
        │   ├── Purchase dates
        │   ├── Package types
        │   ├── Amounts paid
        │   └── Expiration dates
        │
        ├── Total Revenue
        │   ├── Lifetime value
        │   ├── Monthly recurring revenue
        │   └── Session purchase total
        │
        └── Quick Links
            ├── Stripe customer dashboard
            └── Manage subscription
```

---

## Tab Specifications - The WHAT

### Tab 1: 📊 Overview

**Purpose:** At-a-glance dashboard with the most important client information and alerts

**What to Show:**
- **Status Summary Card**
  - Payment status (Active subscription? Which tier?)
  - Training status (On track? Inactive? Never assigned?)
  - Session balance (How many available?)
  - Account status (Activated? Pending?)

- **Key Metrics Grid**
  - Total workouts assigned
  - Total workouts completed
  - Completion rate %
  - Last workout date
  - Days since last workout
  - Current weight (if tracked)
  - Weight change (if tracked)
  - Days as client

- **Alerts & Notifications**
  - 🚨 Sessions expiring soon (< 14 days)
  - ⚠️ Inactive client (no workout > 14 days)
  - ⚠️ No workouts ever assigned
  - ⚠️ Payment issue
  - ⚠️ Never logged in / account not activated
  - ✅ Milestones achieved recently

- **Recent Activity Feed**
  - Last 10 activities across all categories
  - Workout completions
  - Weight logs
  - Survey submissions
  - Photo uploads
  - Messages sent

- **Quick Action Buttons**
  - Send Message
  - Assign Workout
  - Edit Plan
  - Schedule Session
  - View Full History (link to specific tab)

---

### Tab 2: 📋 Plan

**Purpose:** Complete view of the client's personalized plan (same as what they see)

**What to Show:**
- **Your Vision Card**
  - Client's vision statement
  - Edit button (links to plan editor)

- **Weekly Focus Card**
  - Current week's focus area
  - Edit button

- **Training Protocol Card**
  - Workout frequency
  - Training style/approach
  - Special notes
  - Edit button

- **Nutrition Protocol Card**
  - Nutrition approach
  - Calorie targets
  - Macro splits
  - Meal timing
  - Special notes
  - Edit button

- **LISS Cardio Schedule Card**
  - Days per week
  - Duration per session
  - Intensity guidelines
  - Edit button

- **Daily Habits Checklist**
  - List of assigned daily habits
  - Edit button

- **Goals Card**
  - Step goal (daily target)
  - Water goal (daily target)
  - Edit buttons

**Action:**
- Big "Edit Complete Plan" button that goes to existing plan editor

---

### Tab 3: 💪 Training

**Purpose:** All workout and session information

**What to Show:**

**Workout Assignments Section:**
- **Summary Stats**
  - Total assigned: X
  - Completed: X
  - In Progress: X
  - Pending: X
  - Completion rate: X%

- **Recent Workouts Table/List**
  - Workout name
  - Assigned date
  - Due date
  - Status (assigned, in_progress, completed)
  - Completion date
  - Duration (if completed)
  - Click to view details

- **Workout Activity Chart**
  - Workouts per week/month over time
  - Completion trends

- **Quick Actions**
  - Assign New Workout button
  - View All Assignments button

**1-on-1 Sessions Section:**
- **Session Balance Card**
  - Total purchased
  - Total used
  - Available remaining
  - Visual progress bar

- **Session Packages Table**
  - Package type
  - Purchase date
  - Quantity
  - Amount paid
  - Used count
  - Remaining
  - Expiration date
  - Status (active/expired)

- **Upcoming Sessions List**
  - Date & time
  - Duration
  - Location
  - Notes
  - Status

- **Past Sessions List**
  - Date & time
  - Duration
  - Location
  - Notes
  - Marked complete

- **Quick Actions**
  - Buy Sessions link
  - Schedule Session link

---

### Tab 4: 🍎 Nutrition

**Purpose:** All nutrition-related information

**What to Show:**

**Nutrition Approach Card:**
- Assigned approach (Flexible tracking, Intuitive eating, etc.)
- Calorie target (if applicable)
- Macro targets (if applicable)
- Meal timing preferences
- Special dietary notes
- Edit button

**Current Meal Plan (if assigned):**
- Week view of meal plan
- Today's meals highlighted
- Meal prep suggestions
- View full meal plan link

**Nutrition Habits Tracker:**
- Daily habit completion
- Consistency score
- Trends over time
- Recent logs

**Nutrition Trends:**
- Adherence over time
- Notes and patterns

**Quick Actions:**
- Update Nutrition Protocol button

---

### Tab 5: 📈 Progress

**Purpose:** All progress tracking data - metrics, photos, surveys, activities

**What to Show:**

**Key Metrics Summary:**
- Current weight
- Starting weight
- Weight change (+ or -)
- % change
- Current body fat % (if tracked)
- Custom measurements

**Weight Chart:**
- Line chart showing weight over time
- Date range selector
- Export data option

**Daily Activities:**
- **Steps Tracking**
  - Recent daily logs
  - Average steps per day
  - Trend chart
  - Goal vs actual

- **Water Tracking**
  - Recent daily logs
  - Average intake
  - Consistency score
  - Goal vs actual

- **Weight Logs**
  - Log frequency
  - Most recent logs
  - Weight trend

- **Daily Habits**
  - Habit completion rates
  - Streaks
  - Consistency trends

**Progress Photos:**
- Photo timeline/grid
- Most recent photos
- Upload dates
- Comparison view option
- Photo count

**Weekly Surveys:**
- Survey submission history
- Recent responses
- Qualitative trends
- Coach notes/responses
- Sentiment analysis

**Goals & Milestones:**
- Active goals
- Progress towards goals
- Completed milestones
- Celebrations

**Charts & Visualizations:**
- Weight trend line
- Activity trends
- Habit consistency
- Workout frequency
- Nutrition adherence

---

### Tab 6: 💬 Support

**Purpose:** All communication and support interactions

**What to Show:**

**Messages/Chat Section:**
- Full conversation history with trainer
- Unread message count
- Message search
- Quick reply box
- Send new message button
- View full conversation link

**Weekly Check-ins Section:**
- Scheduled check-ins list
- Check-in history
- Notes from each check-in
- Action items
- Next check-in date

**Trainer Assignment Info:**
- Assigned trainer name & photo
- Trainer contact info
- Assignment date
- Relationship duration
- Trainer bio/specialties

**Resources Section:**
- Shared documents
- Links to resources
- Educational materials
- Video links

**Quick Actions:**
- Send Message
- Schedule Check-in
- Share Resource

---

### Tab 7: 👤 Account

**Purpose:** All account, profile, security, membership, and billing information

**What to Show:**

**Profile Information (visible to all trainers):**
- Full name
- Preferred name
- Email address
- Phone number
- Address (street, city, state, zip, country)
- Timezone
- Emergency contact (name, phone, relationship)
- Profile photo
- Account creation date
- Last login date
- Edit profile link (if admin)

**Security Section (visible to all trainers):**
- **Security Overview Card**
  - Email verified: Yes/No
  - Password last changed: Date
  - 2FA enabled: Yes/No
  - Active sessions: Count
  - Account activated: Yes/No

- **Login Statistics Card**
  - Total logins (last 30 days)
  - Last login: Date & time
  - Most used device
  - Unique locations
  - Failed login attempts

- **Suspicious Activity Alerts** (if any)
  - Multiple failed attempts
  - Unusual locations
  - Concurrent sessions from different locations

- **Login History Table**
  - Date & time
  - Success/Failure
  - Device (browser + OS)
  - Location (city, state, country)
  - IP address (anonymized for privacy)
  - Sortable and filterable

- **Export Options**
  - Download login history CSV button

**Membership Section (visible to all trainers):**
- Current plan/tier name
- Plan description
- Membership status (active, inactive, canceled)
- Member since date
- Membership duration (X months)
- Plan features list
- Manage subscription link

**Billing & Payments (ADMIN ONLY):**
- **Subscription Info Card**
  - Current subscription tier
  - Billing cycle (monthly, annual)
  - Next billing date
  - Next payment amount
  - Subscription status
  - Stripe customer link

- **Payment Method Card**
  - Card brand
  - Last 4 digits
  - Expiration date
  - Update payment method link

- **Revenue Summary Card**
  - Lifetime value
  - Monthly recurring revenue
  - Total session purchases
  - Total paid

- **Subscription Transaction History Table**
  - Date
  - Description/Product
  - Payment method
  - Amount
  - Status
  - Invoice link

- **Session Purchase History Table**
  - Date
  - Package type
  - Quantity
  - Amount paid
  - Expiration date
  - Status

- **Quick Actions**
  - View in Stripe Dashboard
  - Manage Subscription
  - Send Invoice

---

## List View Requirements

### Purpose
Information-rich client list that shows key status at a glance and supports bulk actions

### What to Show for Each Client

**Client Row Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [✓] 👤 John Doe                                   [View →]      │
│     john@example.com • Member since Jan 2024                    │
│                                                                  │
│     💳 Active ($99/mo)  💪 On Track  📅 8 sessions  ⚡ 2d ago   │
│     ⚠️ Sessions expiring in 7 days                              │
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
1. **Selection Checkbox** - For bulk actions
2. **Avatar** - Profile photo or initials
3. **Name & Email** - Primary identification
4. **Member Since** - Tenure indicator
5. **Status Badges:**
   - 💳 **Payment Status**
     - ✅ Active ($X/mo or plan name)
     - ⏸️ Inactive / Canceled
     - ⏳ Pending (never activated)
   
   - 💪 **Training Status**
     - 🟢 On Track (< 7 days since last workout)
     - 🟡 Slowing (7-14 days since last workout)
     - 🔴 Inactive (> 14 days since last workout)
     - ⚪ Never Assigned (no workouts ever)
   
   - 📅 **Sessions Badge**
     - X sessions available
     - Or "No sessions"
     - Color coded by urgency

6. **Quick Stats:**
   - ⚡ Last activity: "2d ago"
   - 📊 X workouts completed
   - ⏰ Next: Dec 31 (next session/check-in)

7. **Alert Indicators:**
   - ⚠️ Sessions expiring soon
   - ⚠️ Inactive client
   - ⚠️ Payment issue
   - ⚠️ Never logged in
   - ✅ Recent milestone

### Filters & Search

**Search Bar:**
- Search by name, email, location

**Independent Filters:**
1. **Payment Status:** All, Active, Inactive, Pending
2. **Subscription Type:** All, [Each product/tier]
3. **Session Status:** All, Has Sessions, No Sessions, Expiring Soon
4. **Session Type:** All, [Each session package type]
5. **Training Activity:** All, On Track, Slowing, Inactive, Never Assigned

### Bulk Actions

**When clients are selected:**
- Send Group Message
- Assign Workout to All
- (Future: Update Status, Tag, Export)

---

## Implementation Approach

### Phase 1: Foundation
- Create routes and basic structure
- Copy data fetching patterns from existing pages
- Get list view showing with basic info
- Get detail view showing with tab structure
- Navigation between list and detail working

### Phase 2: Overview Tab
- Build the overview dashboard
- Implement all status badges
- Create alerts system
- Recent activity feed

### Phase 3: Data-Heavy Tabs (Training, Progress, Nutrition)
- Implement Training tab with workouts + sessions
- Implement Progress tab with all tracking data
- Implement Nutrition tab with plans + habits
- Reuse existing components where possible

### Phase 4: Communication Tabs (Plan, Support)
- Implement Plan tab (mostly read-only display)
- Implement Support tab (messages, check-ins)
- Link to existing editors

### Phase 5: Account Tab
- Profile information display
- Security + login history (NEW)
- Membership display
- Billing (admin only) with transaction histories

### Phase 6: List View Enhancements
- Rich badges implementation
- All filters working
- Bulk selection and actions
- Polish and performance

### Phase 7: Polish & Launch
- Responsive design
- Loading states
- Error handling
- Documentation
- Testing
- Gradual rollout

---

## Success Criteria

**Completeness:**
- [ ] Every piece of client data is accessible in Client Hub
- [ ] Matches or exceeds information in current system
- [ ] Mirrors what clients see in their own dashboard

**Usability:**
- [ ] Trainers can find any client information in < 10 seconds
- [ ] No need to navigate to multiple pages for basic info
- [ ] Bulk actions work smoothly

**Performance:**
- [ ] List loads in < 2 seconds
- [ ] Tab switching feels instant
- [ ] Works with 100+ clients

**Adoption:**
- [ ] Trainers prefer Client Hub over old system
- [ ] Positive feedback on information density
- [ ] Time saved in client management tasks

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| 7 tabs matching client sidebar | Intuitive structure trainers can mentally map |
| Comprehensive data display | No more hunting across multiple pages |
| List view badges | At-a-glance status without opening detail |
| Preserved bulk actions | Critical existing workflow |
| Security tab for trainers | Visibility into client access patterns |
| Admin-only billing | Sensitive financial data protection |
| Coexist with old system | Safe, gradual migration |

---

**Document Version:** 2.0  
**Last Updated:** December 30, 2025  
**Focus:** Requirements & Information Architecture (The WHAT)
