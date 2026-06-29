# Tier-Based Feature Gating — Requirements

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-29
> **Related:** `app/src/lib/constants.ts` (APP_PRODUCTS / SERVICE_TIERS),
> `app/src/components/dashboard/client-sidebar.tsx`,
> `docs/04-architecture/application-architecture.md`

---

## 1. Background & Problem

The client dashboard exposes the **full feature set to every client regardless of
the tier they purchased**. Today the app sells four products (`AppProductId` in
`constants.ts`):

| Product id | Kind | Coaching? |
|---|---|---|
| `in_person` | one-time session | no |
| `in_person_4pack` | one-time 4-pack | no |
| `online_coaching` (OC) | subscription | yes |
| `complete_transformation` (CT) | subscription | yes |

In-person clients (single session or 4-pack) buy **only** training sessions — they
have no coach-provisioned plan, workouts, nutrition protocol, goals, check-ins, or
progress tracking. Yet the dashboard still shows them all of those sections, where
they see empty/irrelevant screens. This is confusing and makes the product feel
broken for that audience.

We need to **gate the dashboard feature set by tier** so that each client only sees
what their purchase includes.

## 2. Vision

A **single, declarative source of truth** that maps each tier (`AppProductId`) to the
set of dashboard features it can access. The UI (sidebar, dashboard home, and each
gated page) reads from this map so that what a client sees always matches what they
bought. When a client without a feature deep-links into a gated route, they get a
friendly **upsell** prompt rather than a broken/empty screen.

## 3. Access Model

Two behavioral groups today, modeled as **four distinct tiers** (so OC and CT can
diverge later — see FR-2):

**In-person group (`in_person`, `in_person_4pack`)** — access ONLY:
- Dashboard home (a **simplified** in-person view)
- Training → **Buy 1-on-1 Sessions**, **Schedule 1-on-1**
- **Support** (Your Trainer, Coach Chat, Resources)
- **Account** (Profile, Security, Membership, Billing)

**Coaching group (`online_coaching`, `complete_transformation`)** — access the
**full** dashboard (everything in-person sees, plus):
- Dashboard home (full layout)
- My Tasks
- Planning → My Plan
- Logging → Daily Activities, Weekly Survey, Progress Photos
- Training → My Workouts, Weekly Check-ins
- Nutrition Hub
- Progress, Goals & Milestones

Full feature → tier matrix:

| Feature key | in_person | in_person_4pack | online_coaching | complete_transformation |
|---|:---:|:---:|:---:|:---:|
| `fullDashboard` | ✗ | ✗ | ✓ | ✓ |
| `tasks` | ✗ | ✗ | ✓ | ✓ |
| `plan` | ✗ | ✗ | ✓ | ✓ |
| `logging` (activities/survey/photos) | ✗ | ✗ | ✓ | ✓ |
| `workouts` | ✗ | ✗ | ✓ | ✓ |
| `checkins` | ✗ | ✗ | ✓ | ✓ |
| `nutrition` | ✗ | ✗ | ✓ | ✓ |
| `progress` | ✗ | ✗ | ✓ | ✓ |
| `goals` | ✗ | ✗ | ✓ | ✓ |
| `buySessions` | ✓ | ✓ | ✓ | ✓ |
| `scheduleSessions` | ✓ | ✓ | ✓ | ✓ |
| `support` | ✓ | ✓ | ✓ | ✓ |
| `account` | ✓ | ✓ | ✓ | ✓ |

> **OC and CT are identical TODAY but are intentionally modeled as two separate
> rows.** CT is expected to gain CT-only features in the future; the model must let
> CT diverge from OC by editing a single matrix row, with no shared helper to
> untangle.

## 4. Scope

**In scope:**
- A declarative per-tier feature matrix + a resolver (`getClientFeatureAccess(tier)`)
  and a `ClientFeatureAccess` type, as the single source of truth.
- **Sidebar gating** — hide groups/items the tier can't access.
- **Per-page route guards** for gated pages, showing an **upsell panel** (not a
  redirect) when an in-person client deep-links in.
- A **simplified dashboard home** for the in-person group.
- Documentation of the UI-only design decision + rationale.

**Out of scope:**
- **Backend / API / Firestore-rules enforcement.** Not required — see §6 NFR-1.
- Changing what trainers provision; pricing/checkout changes.
- Any change to admin/trainer dashboards.
- New upsell/upgrade *purchase* flow (we link to the existing
  `/dashboard/client/upgrade`).

## 5. Functional Requirements

- **FR-1 Feature matrix (single source of truth).** A declarative map from every
  `AppProductId` → a `ClientFeatureAccess` object of boolean feature keys (the keys in
  §3). A resolver `getClientFeatureAccess(tier?: string): ClientFeatureAccess` returns
  the row for a tier, defaulting to the most-restrictive (in-person) row for an
  unknown/missing tier.
- **FR-2 OC and CT independent.** OC and CT have their own matrix rows. Changing one
  must not affect the other. (They are equal today by value, not by reference.)
- **FR-3 Sidebar reflects access.** The client sidebar renders only the
  groups/items the current tier can access. In-person clients see Dashboard, Training
  (Buy + Schedule only), Support, Account.
- **FR-4 Route guard + upsell.** Each gated page is wrapped so that a client whose
  tier lacks that feature sees a friendly **"Upgrade to Online Coaching"** upsell
  panel (headline, what they'd unlock, CTA → `/dashboard/client/upgrade`) instead of
  the page content. Gated pages: plan, nutrition, workouts, progress, goals, activity,
  survey, photos, checkins, tasks.
- **FR-5 Simplified in-person home.** The dashboard home (`/dashboard/client`) renders
  a **simplified** view for the in-person group (upcoming session, Buy/Schedule CTAs,
  trainer/support, account summary) — no empty plan/nutrition/progress/habits widgets.
  The coaching group keeps today's full layout.
- **FR-6 Safe default.** Any client whose `tier` is missing or unrecognized is treated
  as the in-person (most restrictive) row, never granted full access by default.

## 6. Non-Functional Requirements

- **NFR-1 UI-only by design — no data-exposure risk.** Every gated feature reads
  per-user data that Firestore rules already scope to `request.auth.uid` (e.g.
  `plans`, `workouts`, `nutritionLogs`, `goals`, `weeklySurveys`, `progressPhotos`,
  `dailyActivityLogs`). An in-person client cannot read any other client's data, and
  has none of their own in those collections. Therefore backend/rules enforcement adds
  no security value; gating is a **product/UX** concern and is implemented in the UI
  only. (This is a no-risk decision, not an accepted gap.)
- **NFR-2 Single source of truth.** Sidebar, guards, and dashboard-home branching all
  derive from the same matrix; no tier logic is duplicated/hard-coded per component.
- **NFR-3 Backward compatible.** Coaching-group clients see no change. No data
  migration; `user.tier` is already an `AppProductId`.
- **NFR-4 Extensible.** Adding a feature key or a new tier is a localized edit to the
  matrix + (if needed) the guard map.
- **NFR-5 No layout regressions.** Gating hides whole sections cleanly without leaving
  empty containers, broken grids, or dangling badges.

## 7. Acceptance Criteria

- An `in_person` (and `in_person_4pack`) client sees ONLY: Dashboard (simplified),
  Training → Buy + Schedule, Support, Account — in the sidebar and as reachable pages.
- An `online_coaching` and a `complete_transformation` client see the full dashboard
  exactly as today.
- Deep-linking an in-person client to `/dashboard/client/nutrition` (and every other
  gated route) shows the upsell panel with a working CTA to `/dashboard/client/upgrade`.
- The in-person dashboard home shows no empty coaching-only widgets.
- Flipping a single CT matrix cell changes CT's access without affecting OC (verified
  by inspection/unit check).
- A client with a missing/unknown `tier` is gated to the in-person feature set.

## 8. Open Questions / Assumptions

- **Assumption:** Upsell CTA targets the existing `/dashboard/client/upgrade` page; no
  new purchase flow is built here.
- **Assumption:** Support (Your Trainer, Coach Chat, Resources) stays visible to
  in-person clients; buying a session assigns a trainer, so chat is meaningful.
- **Assumption:** Membership + Billing remain visible to in-person clients (they have
  purchase history / receipts).
- **Assumption:** `tier` is reliably present on activated clients (set by fulfillment).
  Un-activated clients are already redirected to checkout before reaching the dashboard.
