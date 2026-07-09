# Post-Launch Roadmap — shrey.fit

**Status:** Draft for review
**Owner:** Shrey.Fit
**Last updated:** 2026-07-07
**Related docs:** `docs/04-architecture/application-architecture.md`, `docs/04-architecture/production-architecture-and-launch-plan.md`, `docs/02-implementation/mobile-app/requirements.md`, `docs/02-implementation/marketing-campaigns/requirements.md`, `docs/02-implementation/growth-acquisition/requirements.md`, `docs/02-implementation/analytics/requirements.md`, `docs/02-implementation/voice-ai/requirements.md`

> **Re-ranked 2026-07-07 (owner decision): marketing-first, GA4 fast-follow.**
> For a soft launch with essentially no audience (outreach so far limited to
> friends; no LinkedIn/Instagram/X presence), the binding constraint is
> **top-of-funnel demand — awareness, eyeballs, signups — not features or even
> measurement.** So **Growth & Acquisition is now Tier 1**, and analytics is
> reduced to a **thin conversion-tracking slice** that ships right behind it (so
> acquisition effort is measurable). Full product analytics stays deferred. The
> acquisition work is specced in `docs/02-implementation/growth-acquisition/requirements.md`.

> This is a **strategy + prioritization** document. It records the reasoning behind
> what we build after soft launch and in what order. Each prioritized item links to
> (or will spawn) its own `requirements.md` → `design.md` → `tasks.md` triad, following
> the established doc pattern in this repo.

---

## 1. Purpose

shrey.fit enters **soft launch** this week with a deep, feature-rich platform already in place.
The question this document answers is **not** "what's missing" but **"what to build next for
maximum impact, in what order, and why."**

The guiding principle: **for a soft launch, the biggest risk is flying blind and losing early
clients — not missing features.** Therefore the sequence prioritizes *measure → retain → grow →
expand platform*, rather than leading with the largest, slowest effort (native mobile).

---

## 2. Current-State Feature Inventory (what's already built)

A snapshot so future prioritization starts from reality.

### 2.1 Client dashboard (`app/src/app/dashboard/client/*`)
- Workouts + **workout execution tracking** (mark complete, sets/reps, exercise detail/video).
- **Progress** metrics/charts + **progress photos** (Firebase Storage).
- **Nutrition hub** (meal plans, nutrition habit tracker).
- **Goals**, **weekly check-ins**, **tasks**, **activity feed**.
- **Messages** (client ↔ trainer).
- **Sessions** (scheduling, purchase), **resources**.
- **Billing / membership**, tier feature-gating, upgrade/upsell.
- **Early gamification:** `Achievements` component (streaks, PRs, weigh-in milestones) — currently computed/read-only.

### 2.2 Trainer dashboard (`app/src/app/dashboard/trainer/*`)
- Client hub, assignments (create/edit), weekly check-ins, training sessions, workouts, activity feed, outreach.

### 2.3 Admin dashboard (`app/src/app/dashboard/admin/*`)
- Client management/assignment, trainers, subscriptions, revenue, discount codes, **email campaigns**, locations, pending accounts, settings, leads.

### 2.4 Marketing site (`app/src/app/(marketing)/*`)
- Home, services, about, faq, connect (lead form), blog (multiple posts), exercise/video library.

### 2.5 Platform / infrastructure
- **Payments:** PayPal + Stripe, tiers, discounts, prepay/subscriptions, feature-gating.
- **Email:** Resend-based notifications + marketing campaigns (CAN-SPAM, suppression list).
- **Notifications:** Cloud Functions notification flows; activity feed.
- **Analytics (today):** only Firebase Analytics `page_view` via `AnalyticsListener` — **no product/event instrumentation yet.**
- **Mobile:** a reviewed draft `requirements.md` (Expo/React Native, reuse Firebase). Not built.

---

## 3. Prioritized Roadmap

Ordered by **impact ÷ effort**, and sequenced so each tier informs the next.

### Tier 1 — Measure & quick wins (do first)

**1.1 Analytics & instrumentation** — *highest leverage, currently weakest.*
- Today we only track page views. We can't answer "which dashboard features get used?" or "where do
  prospects drop off in the signup funnel?" — the exact questions raised for launch.
- **Decision (see §5):** implement **GA4 fully first**; PostHog is a documented Phase-2 drop-in behind
  the same wrapper. Covers both stated goals: dashboard feature usage **and** website navigation/funnel.
- **Spawns:** `docs/02-implementation/analytics/requirements.md` (this is the priority-1 deliverable).

**1.2 Voice input (AI quick win)** — *low effort, real daily value.*
- Mic button on high-friction text fields: client check-in notes, trainer coaching notes/messages,
  food logging. Browser Web Speech API for MVP; optional Whisper-via-Cloud-Function for accuracy.
- A differentiator that costs little and gets used constantly.

### Tier 2 — Retention (make clients sticky)

**2.1 Gamification, leveled up** — *build on the existing `achievements.tsx` foundation.*
- Persist achievements; fire a celebratory moment on unlock (we already have `activity-sounds.ts`).
- Streaks with "freeze"/protection, weekly goals with progress rings, tie unlocks to push/email nudges.
- Mirrors what proven apps rely on (Strava kudos, Duolingo streaks, Apple Fitness rings, Whoop/Fitbit badges).

**2.2 Smart notifications / behavioral nudges** — *reuse existing notification infra.*
- Trigger on missed workout, streak-at-risk, new plan assigned, check-in due — informed by Tier 1 data.

### Tier 3 — Growth (acquisition & social) — *top near-term business priority*

> **Priority note:** analytics (Tier 1.1) is the top *engineering* prerequisite, but
> **marketing/acquisition is the top near-term business priority** — a soft launch with
> no clients to measure is the real risk. Stand up Tier 1.1 and Tier 3.1 in parallel:
> instrument first so acquisition spend is measurable, then push on acquisition.

**3.1 Marketing/social enablement** — *mostly app-side additions + a content cadence (not a big build).*
- OG/meta tags + share images for blog and results pages.
- "Share your progress/achievement" card generator (drives organic social, incl. LinkedIn).
- **Referral codes** — a natural extension of the existing discount-code engine.
- **UTM capture** on connect/signup (pairs with Tier 1 analytics to prove channel ROI).
- LinkedIn/social *posting* itself is a content cadence, not code.

### Tier 4 — Platform expansion (largest effort, slowest payback)

**4.1 Mobile apps** — *the right long-term move, but do it after Tier 1 proves engagement justifies it.*
- The existing `mobile-app/requirements.md` is sound (Expo, reuse Firebase, web-billing to avoid the
  15–30% store cut).
- **Interim option:** ship an installable **PWA** (push-capable) as a 1–2 week step to test mobile
  demand before committing to a full native build. Requires extracting the shared TS logic package first.

---

## 4. AI Opportunities (ranked by impact ÷ effort)

1. **Voice input** — Tier 1.2 above. Lowest effort, broad daily use.
2. **AI check-in summarizer for trainers** — auto-summarize a client's weekly check-in + activity into a
   briefing. Big trainer time-saver as clients-per-trainer scales. (AWS Bedrock tooling available.)
3. **Natural-language food logging** — "grilled chicken and rice" → macros. Pairs with voice.
4. **Semantic search / client Q&A assistant** over the blog + exercise library.
5. **AI form-check on exercise/progress videos** — high wow-factor, higher effort; later.

### QA automation ("virtual client")
Valuable, but framed as **developer velocity**, not a client feature. Best fit: **Playwright** E2E tests
for launch-critical paths (signup → checkout → dashboard), optionally driven by an AI agent to explore
flows. Do a focused version for the critical funnel now; expand later.

> **Voice Mode C (voice Q&A assistant) is deferred.** The shipped voice spec
> (`docs/02-implementation/voice-ai/requirements.md`) covers only dictation (Mode A) and
> voice messaging (Mode B). A voice-driven Q&A assistant depends on semantic search over
> our own content — see idea 4A.1 below — and is parked until that exists.

---

## 4A. Content & Discovery Ideas (evaluated)

Four ideas raised for turning our existing content into more reach and product value.
Each is judged against the launch goals (**acquisition + retention**, minimal build).

**4A.1 Semantic / hybrid search over our own content** — *PARKED (near-term).*
- Search + client Q&A grounded **only** in the blog + exercise/video library (not a general chatbot).
- High value long-term and it's the **prerequisite for voice Mode C**, but it's a real build
  (embeddings, vector store, retrieval) with modest launch-stage payoff. Revisit once the content
  library is larger and analytics show search demand.

**4A.2 Blog → podcast (audio versions of posts)** — *PRIORITIZE (low effort, real reach).*
- TTS-generate an audio version of each blog post; publish as a simple podcast feed.
- Cheap, opens a new distribution channel (Spotify/Apple Podcasts), reinforces brand authority.
- Pairs naturally with the read-aloud (TTS) work already contemplated in the voice spec's Phase 2.

**4A.3 News / industry RSS ingestion** — *PARKED (low fit).*
- Auto-pull fitness-industry news into the site/feed.
- Low differentiation, adds editorial/curation burden, and risks off-brand content. Not worth it now.

**4A.4 Video → blog/podcast repurposing** — *PRIORITIZE (leverages existing assets).*
- We already fetch YouTube transcripts (`firebase/scripts/fetch-transcripts.js`,
  `generate-summaries.js`) for the exercise/video library. Reuse that pipeline to auto-draft
  blog posts / show notes from video transcripts.
- Turns one recording into blog + audio + video — maximum reach per unit of content effort.

**Synthesis — "content repurposing engine":** 4A.2 + 4A.4 combine into one pipeline:
`video/recording → transcript → summarized blog post → TTS audio/podcast`. This is the
highest-ROI content play — it multiplies distribution from assets we already produce, directly
serving the **acquisition** goal — and should be scoped as its own spec after analytics + marketing.

---

## 5. Key Decision: GA4 fully first, PostHog later

Two complementary kinds of analytics:
- **GA4** — marketing/traffic analytics for the **anonymous website** funnel (sources, pages, conversions);
  integrates with Google Ads/Search Console; **free** and **already wired** (`trackEvent` → Firebase Analytics).
- **PostHog** — product analytics for **logged-in** clients: retention cohorts, funnels, **session replay**,
  feature flags. Best for "does week-1 engagement predict month-3 retention?"

**Decision:** Implement and validate **GA4 end-to-end first** (both funnels + dashboard events). Design the
`track()` wrapper to be **provider-agnostic** so **PostHog is a low-risk drop-in later** — one backend added,
not a rewrite. This keeps launch lean while preserving the retention-analytics upside.

---

## 6. Success Metrics (per tier)

- **Tier 1 (Analytics):** acquisition funnel visible end-to-end; ≥90% of key dashboard actions emitting
  events; funnel drop-off points identified within 2 weeks of data.
- **Tier 2 (Retention):** day-7 / day-30 active rates trending up; streak participation; achievement-unlock rate.
- **Tier 3 (Growth):** connect-form → signup conversion; referral-attributed signups; channel ROI by UTM.
- **Tier 4 (Mobile):** install rate; mobile DAU/WAU; parity of engagement vs. web.

---

## 7. Immediate Next Steps

> **Re-sequenced (2026-07-07): marketing-first, GA4 fast-follow.** See the
> `growth-acquisition/requirements.md` spec, which is now the lead deliverable.

1. **Write** `docs/02-implementation/growth-acquisition/requirements.md` (Phase 1 shareability/SEO → launch playbook → thin conversion tracking → referrals → result cards). ← **now the lead deliverable. (done)**
2. **Build Phase 1 (Shareability & SEO):** OG/Twitter metadata + branded share images, per-page titles/descriptions, `sitemap.ts`/`robots.ts`, canonical URLs, JSON-LD. Highest ROI, ~1 week. ← next up (`design.md` / `tasks.md`).
3. **Phase 2 (Social presence & launch):** launch-email runbook on the existing campaign engine + a LinkedIn/Instagram/X playbook and share buttons.
4. **Phase 3 (Conversion tracking — GA4 fast-follow):** thin funnel slice from `analytics/requirements.md` (UTM capture + `connect_form_submit`/`signup_*`/`checkout_complete`).
5. **Supporting specs already drafted:** `analytics/requirements.md` (full product analytics — mostly deferred) and `voice-ai/requirements.md` (dictation + voice messaging). Revisit after acquisition traction.
6. **Later:** referrals (Phase 4), result cards (Phase 5), content repurposing engine (§4A.2 + §4A.4), then revisit retention (Tier 2) vs. mobile (Tier 4) after ~2–4 weeks of GA4 data.


