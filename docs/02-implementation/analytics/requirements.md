# Analytics & Instrumentation — Requirements (GA4-first)

**Status:** Draft for review
**Owner:** Shrey.Fit
**Last updated:** 2026-07-07
**Related docs:** `docs/04-architecture/post-launch-roadmap.md` (§5 decision), `docs/03-legal/privacy-policy.md`
**Scope of this doc:** Requirements only. `design.md` and `tasks.md` follow after approval.

---

## 1. Overview & Goals

Today the app tracks **only page views** (`AnalyticsListener` → `trackEvent('page_view')` in
`app/src/lib/firebase.ts`). We cannot answer the two questions raised for launch:

- **G1 — Acquisition:** How do *potential clients* find and navigate the marketing site, and where do
  they drop off on the path to signing up?
- **G2 — Engagement:** How do *existing clients* use dashboard features (workouts, check-ins, nutrition,
  goals, messages), and which usage correlates with staying subscribed?

**Decision (from roadmap §5):** implement **GA4 fully first**. Build a **provider-agnostic `track()`
wrapper** so a second backend (PostHog) can be added later behind the same call sites with no rework.
This doc specifies the GA4 implementation only; PostHog is explicitly out of scope (see §10).

### Success criteria
- Acquisition funnel visible end-to-end in GA4 within 2 weeks of data.
- ≥90% of the "key events" in §5 emitting correctly (verified in GA4 DebugView).
- Zero PII sent to GA4 (see §7).
- No measurable performance regression; analytics failures never break the app (fail-soft).

---

## 2. Definitions

- **Event** — a named user action (e.g., `workout_completed`) with optional parameters.
- **Key event (conversion)** — a business-critical event marked in the GA4 UI as a conversion.
- **User property** — a durable attribute attached to a user for segmentation (e.g., `service_tier`).
- **Funnel** — an ordered sequence of events used to measure step-by-step drop-off.
- **`track()`** — the single app-wide wrapper all instrumentation calls; the only place that talks to GA4.

---

## 3. Functional Requirements

### 3.1 Provider-agnostic tracking wrapper
- **FR-1** A single module (e.g., `app/src/lib/analytics/`) exposes `track(eventName, params?)`,
  `identify(userId, userProps?)`, and `setUserProperties(props)`.
- **FR-2** `track()` internally routes to GA4 today (via the existing `trackEvent`/`logEvent`), and is
  structured so additional providers can be registered later without changing call sites.
- **FR-3** All event names are defined as **constants/enums in one taxonomy file** (§5) — no free-form
  string literals at call sites (prevents typos and drift).
- **FR-4** `track()` must be **safe to call anywhere** (SSR, before init, unsupported browsers): it
  no-ops silently, matching the current `trackEvent` guard behavior.

### 3.2 Acquisition funnel (marketing site) — G1
Instrument the anonymous prospect journey:
- **FR-5** Retain automatic `page_view` on all marketing routes (already working).
- **FR-6** Emit events at each funnel step:
  - `cta_clicked` (with `location`, e.g. hero/pricing/nav)
  - `blog_post_viewed` (`slug`)
  - `services_viewed`
  - `connect_form_started`, `connect_form_submitted`
  - `signup_started`, `signup_step_completed` (`step`), `tier_selected` (`tier`)
  - `checkout_started`, `purchase` (see §5 for GA4 ecommerce params)
- **FR-7** **UTM capture:** on first landing, capture `utm_source/medium/campaign/term/content` and
  persist through to `connect_form_submitted` / `signup_started` so channel attribution survives navigation.

### 3.3 Engagement events (dashboard) — G2
Instrument the key client actions (full list §5), including at minimum:
- **FR-8** `workout_completed`, `checkin_submitted`, `photo_uploaded`, `goal_created`,
  `nutrition_logged`, `message_sent`, `session_booked`, `resource_viewed`, `upgrade_clicked`.
- **FR-9** Each event carries minimal, **non-PII** context params (see §5, §7).

### 3.4 User identity & properties
- **FR-10** On login, call `identify(uid)` and set user properties: `service_tier`, `user_role`
  (client/trainer/admin), `signup_date`, `account_age_days` bucket. **No name/email/phone.**
- **FR-11** On logout, reset identity so events aren't misattributed on shared devices.
- **FR-12** Exclude internal users (admin/trainer/staff) from acquisition conversion reporting where
  feasible (e.g., a `is_internal` user property + a GA4 filtered view/report).

### 3.5 Environment separation
- **FR-13** Dev/staging events must not pollute production reporting — separate GA4 property/stream
  (or a `environment` param + filtered views). Local dev defaults to DebugView / no-send.

---

## 4. Non-Functional Requirements
- **NFR-1 Fail-soft:** any analytics error is caught and swallowed; never throws into UI.
- **NFR-2 Performance:** no added blocking network in critical render paths; batch/async only.
- **NFR-3 Privacy-compliant:** consistent with `docs/03-legal/privacy-policy.md` (§7).
- **NFR-4 Maintainable:** one taxonomy file; adding an event is a 1–2 line change at the call site.
- **NFR-5 Testable:** wrapper unit-testable with a mock provider; events assertable in DebugView.

---

## 5. Event Taxonomy (canonical list)

Naming: `snake_case`, verb-object where sensible; reuse GA4 reserved names where they exist
(`page_view`, `login`, `sign_up`, `purchase`) to get built-in reports for free.

### 5.1 Acquisition / marketing
| Event | Key params | Conversion? |
|---|---|---|
| `page_view` | (auto) `page_path` | — |
| `cta_clicked` | `location`, `label` | — |
| `blog_post_viewed` | `slug` | — |
| `services_viewed` | — | — |
| `connect_form_started` | `source` | — |
| `connect_form_submitted` | `utm_source`, `utm_medium`, `utm_campaign` | ✅ |
| `sign_up` | `method`, `tier` | ✅ |
| `signup_step_completed` | `step` | — |
| `tier_selected` | `tier` | — |

### 5.2 Commerce
| Event | Key params | Conversion? |
|---|---|---|
| `checkout_started` | `tier`, `value`, `currency`, `provider` | — |
| `purchase` | `transaction_id`, `value`, `currency`, `items[]`, `tier` | ✅ |
| `upgrade_clicked` | `from_tier`, `to_tier`, `location` | — |
| `subscription_renewed` | `tier`, `value` | — |

### 5.3 Engagement (dashboard)
| Event | Key params |
|---|---|
| `login` | `method` |
| `workout_started` | `workout_id` |
| `workout_completed` | `workout_id`, `duration_min`, `exercises_count` |
| `checkin_submitted` | `week`, `has_notes` |
| `photo_uploaded` | `photo_type` |
| `goal_created` / `goal_completed` | `goal_type` |
| `nutrition_logged` | `meal_type`, `input_method` (`manual`/`voice`) |
| `message_sent` | `thread_role` (client/trainer) |
| `session_booked` | `session_type` |
| `resource_viewed` | `resource_id` |
| `achievement_unlocked` | `achievement_id` |
| `voice_input_used` | `field` *(reserved for Tier 1.2 voice feature)* |

> Param values must be enums/IDs/counts — **never** free text a user typed and **never** PII.

---

## 6. Funnels & Reports to build in GA4

1. **Acquisition funnel (exploration):**
   `page_view (landing)` → `services_viewed` OR `blog_post_viewed` → `connect_form_started` →
   `connect_form_submitted` → `sign_up` → `tier_selected` → `checkout_started` → `purchase`.
   Segment by `utm_source`/`utm_medium`.
2. **Activation funnel (product):**
   `sign_up` → `login` → first `workout_completed` → first `checkin_submitted` → still-active day-7.
3. **Feature-adoption report:** counts/uniques per engagement event, broken down by `service_tier`.
4. **Channel report:** conversions by UTM (proves social/LinkedIn/ads ROI — supports roadmap Tier 3).

*(Deep retention cohorts + session replay are PostHog territory, deferred — see §10.)*

---

## 7. Privacy & Consent
- **No PII** to GA4: no email, name, phone, message content, photo URLs, or free-text notes.
  Only IDs, enums, counts, and UTM values.
- **User ID:** send the Firebase `uid` as GA4 `user_id` for cross-session stitching (pseudonymous ID,
  acceptable; confirm alignment with `privacy-policy.md` and update policy language if needed).
- **Consent posture:** confirm whether a cookie/consent banner is required for the target audience
  (US-first at launch). Wrapper must support gating sends behind a consent flag if we add one.
- **IP anonymization / data retention:** set GA4 retention and any regional controls per policy.

---

## 8. Assumptions
- GA4 property + `measurementId` already provisioned (Firebase Analytics is live).
- Marketing site and dashboard share the same Next.js app and can import the shared wrapper.
- Small soft-launch user volume; well within GA4 free limits.

---

## 9. Out of Scope (this phase)
- PostHog (or any second provider) implementation — Phase 2.
- Server-side / Measurement Protocol events (e.g., webhook-driven `purchase` from Cloud Functions).
  *Noted as a design consideration since some purchases finalize server-side via PayPal/Stripe webhooks —
  `design.md` will decide client-side vs. server-side firing for `purchase`.*
- BigQuery export, custom data warehouse, attribution modeling beyond UTM.

---

## 10. PostHog — Phase 2 (documented, deferred)
When retention cohorts and session replay become the priority, add PostHog as a **second provider behind
the existing `track()` wrapper**: register its client in the analytics module, forward the same event
taxonomy, and enable session replay + retention/funnel insights on identified users. No call-site changes
expected. Trigger: after ~2–4 weeks of GA4 data confirms we need product-grade retention analysis.

---

## 11. Open Questions (for review)
1. **`purchase` firing:** client-side on success page, or server-side from the payment webhook (more
   accurate, dedupe-safe)? → resolve in `design.md`.
2. **Consent banner:** required at launch, or defer? Affects wrapper gating.
3. **Internal-user exclusion:** user-property filter sufficient, or separate GA4 property for staff?
4. **Separate GA4 stream for staging**, or single property with an `environment` dimension?
