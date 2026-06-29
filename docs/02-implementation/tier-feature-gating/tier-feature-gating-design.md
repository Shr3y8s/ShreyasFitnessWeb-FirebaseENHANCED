# Tier-Based Feature Gating — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-06-29
> **Requirements:** `tier-feature-gating-requirements.md`

---

## 1. Overview & principles

The **single load-bearing rule** (req NFR-2):

> What a client can see in the dashboard is derived **only** from a declarative
> per-tier feature matrix in `app/src/lib/constants.ts`. The sidebar, the per-page
> route guards, and the dashboard-home branching all read from the same resolver
> (`getClientFeatureAccess`). No component re-implements tier logic.

Gating is **UI-only** (req NFR-1). All gated routes read per-user data already scoped
to `request.auth.uid` by Firestore rules, so an in-person client can neither see
another client's data nor has any of their own behind these screens. Backend/rules
enforcement would add cost and complexity with **zero** security benefit, so it is
deliberately excluded. This is a *no-risk* decision, not an accepted gap.

## 2. Feature matrix (single source of truth)

### 2.1 Type + matrix — `app/src/lib/constants.ts`

```ts
/** Dashboard features that can be gated by tier. */
export interface ClientFeatureAccess {
  fullDashboard: boolean;     // full home layout vs simplified in-person home
  tasks: boolean;             // My Tasks
  plan: boolean;              // My Plan
  logging: boolean;           // Daily Activities + Weekly Survey + Progress Photos
  workouts: boolean;          // My Workouts
  checkins: boolean;          // Weekly Check-ins
  nutrition: boolean;         // Nutrition Hub
  progress: boolean;          // Progress
  goals: boolean;             // Goals & Milestones
  buySessions: boolean;       // Buy 1-on-1 Sessions
  scheduleSessions: boolean;  // Schedule 1-on-1
  support: boolean;           // Your Trainer + Coach Chat + Resources
  account: boolean;           // Profile + Security + Membership + Billing
}

// In-person group: sessions + support + account only.
const IN_PERSON_ACCESS: ClientFeatureAccess = {
  fullDashboard: false, tasks: false, plan: false, logging: false,
  workouts: false, checkins: false, nutrition: false, progress: false, goals: false,
  buySessions: true, scheduleSessions: true, support: true, account: true,
};

// Coaching group: everything.
const FULL_ACCESS: ClientFeatureAccess = {
  fullDashboard: true, tasks: true, plan: true, logging: true,
  workouts: true, checkins: true, nutrition: true, progress: true, goals: true,
  buySessions: true, scheduleSessions: true, support: true, account: true,
};

/**
 * Per-tier feature matrix — the single source of truth for client feature access.
 * OC and CT are SEPARATE rows on purpose: they are identical today but free to
 * diverge later (e.g. a CT-only feature) by editing just CT's row. We spread into
 * fresh objects so the two rows are equal by value, never shared by reference.
 */
const FEATURE_MATRIX: Record<AppProductId, ClientFeatureAccess> = {
  in_person: { ...IN_PERSON_ACCESS },
  in_person_4pack: { ...IN_PERSON_ACCESS },
  online_coaching: { ...FULL_ACCESS },
  complete_transformation: { ...FULL_ACCESS },
};

/**
 * Resolve the feature-access row for a tier (an AppProductId stored on user.tier).
 * Unknown/missing tier → most-restrictive (in-person) row (req FR-6 safe default).
 */
export function getClientFeatureAccess(tier?: string | null): ClientFeatureAccess {
  return FEATURE_MATRIX[tier as AppProductId] ?? { ...IN_PERSON_ACCESS };
}

/** Convenience for guards/pages. */
export type ClientFeatureKey = keyof ClientFeatureAccess;
```

Notes:
- Built on the existing `AppProductId` union, so adding a product forces a compile
  error here (the `Record` must be exhaustive) — extensibility with a safety net.
- `hasOnlineCoaching(tier)` is **unchanged** and still used by payment/onboarding
  logic; the gating layer does not depend on it (keeps OC/CT independent per FR-2).

## 3. Sidebar gating — `app/src/components/dashboard/client-sidebar.tsx`

The sidebar already pulls `userData` via `useAuth()`. Compute access once:

```ts
const access = getClientFeatureAccess(userData?.tier);
```

Then wrap each tier-specific group/item:
- **Tasks** group → `{access.tasks && (...)}`
- **Planning** group → `{access.plan && (...)}`
- **Logging** group → `{access.logging && (...)}`
- **Training** group: always rendered (Buy + Schedule are universal); inside it,
  **My Workouts** → `{access.workouts && (...)}`, **Weekly Check-ins** →
  `{access.checkins && (...)}`. Buy + Schedule stay unconditional.
- **Nutrition** group → `{access.nutrition && (...)}`
- **Progress** group → `{access.progress && access.goals && (...)}` (the group holds
  both Progress and Goals; gate each item individually so the group renders if either
  is allowed — today they move together).
- **Support** + **Account** groups → always rendered.

In-person clients thus see: Dashboard, Training (Buy + Schedule), Support, Account.

> No layout regressions (NFR-5): we hide whole `SidebarGroup`s, so no empty group
> labels remain.

## 4. Route guard + upsell — `app/src/components/dashboard/FeatureGuard.tsx` (new)

A small client component that gates a page body by a single feature key.

```tsx
'use client';
import { useAuth } from '@/lib/auth-context';
import { getClientFeatureAccess, type ClientFeatureKey } from '@/lib/constants';
import { UpgradeUpsell } from './UpgradeUpsell';

export function FeatureGuard({
  feature,
  children,
}: { feature: ClientFeatureKey; children: React.ReactNode }) {
  const { userData, loading } = useAuth();
  if (loading) return null;               // or a light skeleton
  const access = getClientFeatureAccess(userData?.tier);
  if (!access[feature]) return <UpgradeUpsell feature={feature} />;
  return <>{children}</>;
}
```

`UpgradeUpsell` (new, `app/src/components/dashboard/UpgradeUpsell.tsx`) is a friendly
panel: a lock/star icon, headline ("Online Coaching unlocks this"), a short
feature-specific blurb (keyed off `feature`), a bullet list of what they'd get, and a
primary CTA button → `/dashboard/client/upgrade`. Styled with the existing `Card` +
`Button` UI primitives so it matches the dashboard theme.

**Usage** — wrap each gated page's content. Pages keep their own
sidebar/`SidebarProvider` shell (so the upsell shows inside the normal dashboard
chrome), and wrap just the main content region:

```tsx
<FeatureGuard feature="nutrition">
  {/* existing page content */}
</FeatureGuard>
```

Gated pages and their feature keys:

| Route | feature |
|---|---|
| `/dashboard/client/plan` | `plan` |
| `/dashboard/client/nutrition` | `nutrition` |
| `/dashboard/client/workouts` | `workouts` |
| `/dashboard/client/progress` | `progress` |
| `/dashboard/client/goals` | `goals` |
| `/dashboard/client/activity` | `logging` |
| `/dashboard/client/survey` | `logging` |
| `/dashboard/client/photos` | `logging` |
| `/dashboard/client/checkins` | `checkins` |
| `/dashboard/client/tasks` | `tasks` |

> Why a panel, not a redirect: it keeps the client in-context and is an upsell
> surface. It also avoids redirect loops and lost deep-link intent.

## 5. Simplified in-person dashboard home — `app/src/app/dashboard/client/page.tsx`

Branch the rendered body on `access.fullDashboard`:

```ts
const access = getClientFeatureAccess(userDataFromAuth?.tier);
// ...
return access.fullDashboard ? <FullClientHome/> : <InPersonClientHome/>;
```

- **Full home** = today's layout (unchanged) for OC/CT.
- **Simplified in-person home** keeps only the pieces that are meaningful:
  - `WelcomeHeader`
  - Upcoming session card (the existing next-session card / "Book Session" empty
    state — already self-contained)
  - Prominent **Buy 1-on-1 Sessions** + **Schedule 1-on-1** CTAs
  - `AccountSummary`
  - A small "Your Trainer / Coach Chat" support link block
  - **Omitted:** KeyMetrics, NutritionSummary, CurrentPlan, ProgressCharts,
    DailyHabits/Onboarding, CoachReminders/ActivityAlerts, PersonalRecords,
    WorkoutCalendar, WeeklyCheckin.

Implementation approach: extract the existing full layout JSX into a local
`FullClientHome` block (or keep inline behind the `access.fullDashboard` branch) and
add an `InPersonClientHome` block. Data-loading effects that only feed full-home
widgets can stay (harmless) initially; a follow-up can skip them when
`!access.fullDashboard` to save reads. Keep it minimal in this pass to limit risk.

## 6. Data flow

```
user.tier (AppProductId, set by fulfillment)
        │
        ▼
getClientFeatureAccess(tier) ──► ClientFeatureAccess (booleans)
        │                                   │
        ├── client-sidebar.tsx  (hide groups/items)
        ├── FeatureGuard         (gate page body → UpgradeUpsell)
        └── client/page.tsx      (full vs simplified home)
```

`tier` arrives through `useAuth().userData.tier` (already wired; the auth context
attaches a realtime listener to the user doc), so changes (e.g. an upgrade) reflect
without a manual refresh.

## 7. Risks & mitigations

- **Risk: `tier` briefly undefined during auth load.** `FeatureGuard` returns `null`
  while `loading`, and `getClientFeatureAccess(undefined)` defaults to the restrictive
  row — never accidentally granting full access. Sidebar groups simply don't render
  until `userData` is present.
- **Risk: simplified-home refactor regresses the full home.** Mitigation: keep the
  full-home JSX byte-for-byte and only *branch* around it; the in-person block is
  additive.
- **Risk: a gated page also needs its data effects gated.** Out of scope for
  correctness (effects just return empty); optional follow-up to skip fetches when
  `!access[feature]`.
- **Risk: future tier added without a matrix row.** The exhaustive `Record<AppProductId,…>`
  produces a TypeScript error until the row is added (NFR-4 safety net).

## 8. Testing

- **Unit:** `getClientFeatureAccess` returns the correct row for each
  `AppProductId`; returns the in-person row for `undefined`/garbage; OC and CT rows
  are equal by value but not the same reference (mutating one wouldn't affect the
  other).
- **Manual (per tier):** log in as each of the four tiers and verify sidebar
  contents, that each gated route shows the upsell for in-person, and that the
  in-person home is the simplified layout while OC/CT is the full layout.
- **Manual (edge):** a user doc with missing/garbage `tier` is gated to in-person.

## 9. Files touched (anticipated)

- `app/src/lib/constants.ts` — `ClientFeatureAccess`, `FEATURE_MATRIX`,
  `getClientFeatureAccess`, `ClientFeatureKey`.
- `app/src/components/dashboard/FeatureGuard.tsx` — NEW guard.
- `app/src/components/dashboard/UpgradeUpsell.tsx` — NEW upsell panel.
- `app/src/components/dashboard/client-sidebar.tsx` — conditional groups/items.
- `app/src/app/dashboard/client/page.tsx` — full vs simplified home branch.
- `app/src/app/dashboard/client/{plan,nutrition,workouts,progress,goals,activity,
  survey,photos,checkins,tasks}/page.tsx` — wrap content in `FeatureGuard`.
- `docs/04-architecture/application-architecture.md` — note the UI-only gating
  decision + no-risk rationale + matrix pointer.
