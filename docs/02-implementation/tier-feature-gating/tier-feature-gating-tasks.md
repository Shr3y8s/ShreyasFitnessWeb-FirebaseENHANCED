# Tier-Based Feature Gating — Tasks

> **Status:** ✅ Implemented & verified (2026-06-29)

> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-29
> **Requirements:** `tier-feature-gating-requirements.md`
> **Design:** `tier-feature-gating-design.md`

---

## Phase 0 — SDD docs

- [x] **T0.1** Write requirements doc (`tier-feature-gating-requirements.md`).
- [x] **T0.2** Write design doc (`tier-feature-gating-design.md`).
- [x] **T0.3** Write tasks doc (this file).

## Phase 1 — Capability layer (single source of truth)

- [x] **T1.1** In `app/src/lib/constants.ts`, add the `ClientFeatureAccess` interface
  (feature keys per design §2.1).
- [x] **T1.2** Add `IN_PERSON_ACCESS` and `FULL_ACCESS` base objects.
- [x] **T1.3** Add `FEATURE_MATRIX: Record<AppProductId, ClientFeatureAccess>` with
  OC and CT as **separate rows** (spread fresh objects so they're equal by value, not
  by reference).
- [x] **T1.4** Add `getClientFeatureAccess(tier?: string | null): ClientFeatureAccess`
  (in-person row as safe default) + export `ClientFeatureKey`.
- [x] **T1.5** Confirm `hasOnlineCoaching` is left unchanged and the gating layer does
  not depend on it.


## Phase 2 — Reusable guard + upsell

- [x] **T2.1** Create `app/src/components/dashboard/UpgradeUpsell.tsx` — a themed
  `Card` panel with icon, headline, feature-specific blurb (keyed by
  `ClientFeatureKey`), benefit bullets, and a CTA `Button` → `/dashboard/client/upgrade`.
- [x] **T2.2** Create `app/src/components/dashboard/FeatureGuard.tsx` — reads
  `useAuth()`, resolves access via `getClientFeatureAccess`, renders children when
  allowed else `<UpgradeUpsell feature={feature} />`; returns `null` while
  `auth.loading`. (Plus `FeatureLockedShell` wrapper that renders the upsell inside
  the dashboard sidebar chrome — used by the page guards in Phase 4.)


## Phase 3 — Sidebar gating

- [x] **T3.1** In `client-sidebar.tsx`, compute `const access = getClientFeatureAccess(userData?.tier)`.
- [x] **T3.2** Gate groups: Tasks (`access.tasks`), Planning (`access.plan`),
  Logging (`access.logging`), Nutrition (`access.nutrition`), Progress/Goals
  (`access.progress` / `access.goals`).
- [x] **T3.3** In the Training group, keep Buy + Schedule unconditional; gate
  My Workouts (`access.workouts`) and Weekly Check-ins (`access.checkins`).
- [x] **T3.4** Leave Dashboard, Support, Account always visible.
- [x] **T3.5** Verify no empty group labels remain for in-person clients.

## Phase 4 — Page guards (deep-link upsell)

- [x] **T4.1** Wrap `/dashboard/client/plan` content in `<FeatureGuard feature="plan">`.
- [x] **T4.2** Wrap `/dashboard/client/nutrition` in `feature="nutrition"`.
- [x] **T4.3** Wrap `/dashboard/client/workouts` in `feature="workouts"`.
- [x] **T4.4** Wrap `/dashboard/client/progress` in `feature="progress"`.
- [x] **T4.5** Wrap `/dashboard/client/goals` in `feature="goals"`.
- [x] **T4.6** Wrap `/dashboard/client/activity` in `feature="logging"`.
- [x] **T4.7** Wrap `/dashboard/client/survey` in `feature="logging"`.
- [x] **T4.8** Wrap `/dashboard/client/photos` in `feature="logging"`.
- [x] **T4.9** Wrap `/dashboard/client/checkins` in `feature="checkins"`.
- [x] **T4.10** Wrap `/dashboard/client/tasks` in `feature="tasks"`.

> Each wrap goes around the main content region, keeping the page's own
> `SidebarProvider`/sidebar shell so the upsell shows in normal dashboard chrome.

## Phase 5 — Simplified in-person dashboard home

- [x] **T5.1** In `app/src/app/dashboard/client/page.tsx`, compute access and branch
  the body on `access.fullDashboard`.
- [x] **T5.2** Keep today's full layout for OC/CT (no visual change).
- [x] **T5.3** Build the simplified in-person home: WelcomeHeader, upcoming-session
  card, Buy + Schedule CTAs, AccountSummary, a small trainer/support link block.
- [x] **T5.4** Ensure omitted coaching-only widgets don't render (no empty grids).

## Phase 6 — Docs & verification

- [x] **T6.1** Add a short note to `docs/04-architecture/application-architecture.md`
  recording the UI-only gating decision, the no-risk rationale (owner-scoped data),
  and a pointer to the `FEATURE_MATRIX` source of truth.
- [ ] **T6.2** (Optional) Unit test `getClientFeatureAccess` (each tier row;
  undefined/garbage → in-person; OC≠CT by reference).
- [x] **T6.3** Manual QA: log in as each of the four tiers; verify sidebar, gated-route
  upsells, and the in-person vs full home. (Verified by owner 2026-06-29.)
- [x] **T6.4** Build check (`npm run build` in `app/`) to confirm the exhaustive
  `Record<AppProductId,…>` compiles and no type regressions. (`tsc --noEmit` clean.)


## Notes / decisions

- **No backend enforcement** (req NFR-1): gated data is already owner-scoped in
  `firestore.rules`; UI gating is purely product/UX with no data-exposure risk.
- **OC vs CT** modeled as distinct rows so CT can diverge later by editing one row.
- **Safe default**: unknown/missing `tier` → in-person (most restrictive).
