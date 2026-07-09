# Growth & Acquisition — Requirements

> **Status:** Draft → ready for review
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-07
> **Feature:** Growth & Acquisition (awareness → eyeballs → signups)
> **Related:** `marketing-campaigns/requirements.md`, `analytics/requirements.md`,
> `payment-processor/discount-codes-design.md`, `post-launch-roadmap.md`

---

## 1. Background & Problem

shrey.fit is soft-launching this week. The platform is deep and feature-complete,
but it has **effectively zero audience**: the trainer has so far only reached out
to personal friends, and there is no organized presence on **LinkedIn, Instagram,
or X**. The binding constraint is **not features — it's top-of-funnel demand.**

Two concrete gaps make this worse:

1. **The site is not built to be found or shared.** Metadata is minimal
   (`app/src/app/layout.tsx` and `(marketing)/layout.tsx` set only a `title` and
   `description`). There are **no Open Graph / Twitter Card tags, no per-page
   metadata, no share images, no sitemap.xml, and no robots.txt.** A link to any
   page pasted on LinkedIn/X/iMessage renders as a bare URL with no image, title,
   or description — killing click-through on exactly the channels we need.
2. **We can't yet see which outreach works.** Analytics tracks only page views,
   so we can't attribute a signup to a channel or campaign.

**Decision (per owner, 2026-07-07): go marketing-first, fast-follow with GA4.**
Acquisition build leads; a thin conversion-tracking slice ships right behind it so
spend/effort is measurable — but full product analytics stays deferred.

## 2. Vision

Make every shrey.fit link **look professional and clickable** everywhere it's
shared, give the trainer **turnkey assets and a repeatable playbook** to post on
LinkedIn/Instagram/X, turn satisfied clients into **organic promoters** via
shareable result cards and referrals, and wire **just enough tracking** to know
which channel drives signups. Reuse the already-built **email campaign engine**
and **discount-code system** rather than building new infrastructure.

## 3. Scope

This feature is organized into **phases by impact ÷ effort**, front-loading the
cheapest, highest-leverage work. Phases 1–2 are the marketing-first push;
Phase 3 is the GA4 fast-follow; Phases 4–5 compound over time.

### Phase 1 — Shareability & SEO Foundation (do first)

The single highest-ROI work: make the site *findable and shareable*. Almost
entirely additive (metadata + static assets), no new backend.

**In scope:**
- **Open Graph + Twitter Card metadata** on all marketing pages (home, services,
  about, faq, connect, blog index, and every blog post) using the Next.js App
  Router `metadata` API and a shared metadata helper.
- **Per-page titles & descriptions** (unique, keyword-aware) replacing the single
  generic pair in the layouts.
- **Branded share/OG images** (1200×630): a default brand image plus
  per-blog-post images (static or dynamically generated via `next/og`).
- **SEO essentials:** `sitemap.xml` (Next.js `sitemap.ts`), `robots.txt`
  (`robots.ts`), canonical URLs, and **JSON-LD structured data**
  (`Organization`, `LocalBusiness`, and `Article` for blog posts).
- **A canonical site URL / metadataBase** so relative OG image paths resolve
  absolutely in crawlers.

**Out of scope (Phase 1):** dynamic client-result images, referral logic,
GA4 events.

### Phase 2 — Social Presence & Launch Playbook

Turn the foundation into activity. Mostly **content/process**, plus small app hooks.

**In scope:**
- A **launch playbook doc** (LinkedIn / Instagram / X): profile setup, bio + link,
  a 2-week starter post calendar, and copy/hashtag templates aligned to the brand.
- **"Share this" affordances** on blog posts and the marketing site
  (LinkedIn / X / copy-link buttons with pre-filled UTM'd URLs).
- **Reuse the existing email campaign engine** to run the actual launch blast to
  the lead pool (`contact_form_submissions`) with a launch discount code — no new
  build, just an operational runbook + a launch template preset.
- **Content repurposing kickoff:** reuse the existing YouTube transcript pipeline
  (`firebase/scripts/fetch-transcripts.js`, `generate-summaries.js`) to draft
  LinkedIn/blog snippets from Shrey's existing videos.

**Out of scope (Phase 2):** paid ads management UI, scheduled auto-posting.

### Phase 3 — Conversion Tracking (GA4 fast-follow)

A **thin slice** of the full analytics spec — only the acquisition funnel, so we
can attribute signups to channels. Full dashboard-usage analytics remains deferred
to `analytics/requirements.md`.

**In scope:**
- A provider-agnostic `track()` wrapper (as designed in `analytics/requirements.md`)
  wired to **GA4**.
- **UTM capture & persistence:** read `utm_*` params on landing, persist through
  the session, and attach to the connect-form submission and signup record.
- Instrument the **critical funnel only:** `connect_form_submit`,
  `signup_start`, `signup_complete`, `checkout_complete`.
- A minimal way to view channel → signup attribution (GA4 reports; no custom dash).

**Out of scope (Phase 3):** per-feature dashboard events, PostHog, session replay,
retention cohorts.

### Phase 4 — Referral Program

Referrals are the highest-converting, lowest-cost acquisition channel for coaching.

**In scope:**
- Extend the **existing discount-code engine** into referral codes (give-X / get-X).
- Per-client shareable referral link with UTM + code.
- Attribution of referral-driven signups (ties into Phase 3 tracking).

### Phase 5 — Client Result Cards (organic amplification)

**In scope:**
- A **shareable "progress/achievement card" generator** (leverages the existing
  `achievements.tsx` and progress data) that clients can post to social —
  turning wins into branded, link-back promotion.

## 4. User Stories & Acceptance Criteria

### Phase 1 — Shareability & SEO

**US-1 — Rich link previews**
As anyone sharing a shrey.fit link, the preview shows a title, description, and
branded image on LinkedIn, X, Facebook, and iMessage/Slack.
- **AC-1.1** Every marketing page emits valid Open Graph tags (`og:title`,
  `og:description`, `og:image`, `og:url`, `og:type`) and Twitter Card tags.
- **AC-1.2** `og:image` resolves to an absolute URL (via `metadataBase`) and is a
  1200×630 branded image.
- **AC-1.3** Blog posts emit `og:type=article` and an article-specific image.
- **AC-1.4** Previews validate in the LinkedIn Post Inspector and X Card Validator.

**US-2 — Unique per-page SEO**
As a search engine, each page has a unique, descriptive title/description and
canonical URL.
- **AC-2.1** Home, services, about, faq, connect, blog index, and each blog post
  define their own `title` + `description` (no reliance on the generic default).
- **AC-2.2** Each page declares a canonical URL.

**US-3 — Crawlability & structured data**
- **AC-3.1** `sitemap.xml` lists all public marketing routes and is reachable.
- **AC-3.2** `robots.txt` allows crawling of public pages and disallows
  `/dashboard`, `/checkout`, and auth routes.
- **AC-3.3** JSON-LD `Organization`/`LocalBusiness` is present site-wide and
  `Article` on blog posts; it validates in Google's Rich Results Test.

### Phase 2 — Social presence & launch

**US-4 — Share buttons**
- **AC-4.1** Blog posts and key pages have Share to LinkedIn / X / copy-link
  controls with pre-filled, UTM-tagged URLs.

**US-5 — Launch runbook**
- **AC-5.1** A documented, repeatable launch-email runbook exists using the
  existing campaign engine and a launch discount code.
- **AC-5.2** A social launch playbook (profiles, bio/link, 2-week calendar,
  templates) exists for LinkedIn, Instagram, and X.

### Phase 3 — Conversion tracking

**US-6 — Channel attribution**
- **AC-6.1** `utm_*` params are captured on landing and persisted for the session.
- **AC-6.2** Connect-form submissions and signups record their originating UTM
  source/medium/campaign.
- **AC-6.3** `connect_form_submit`, `signup_start`, `signup_complete`, and
  `checkout_complete` fire to GA4 with UTM context.
- **AC-6.4** Channel → signup can be read in GA4 within a day of data.

### Phase 4 — Referrals

**US-7 — Refer a friend**
- **AC-7.1** A client can get a personal referral link/code (built on the discount
  engine).
- **AC-7.2** A signup using a referral link is attributed to the referrer.

### Phase 5 — Result cards

**US-8 — Share a win**
- **AC-8.1** A client can generate a branded image of a milestone/achievement with
  a link back to shrey.fit, suitable for social posting.

## 5. Non-Functional Requirements

- **Additive & low-risk:** Phase 1 must not alter existing page behavior beyond
  adding metadata/assets; no regressions to marketing pages.
- **Privacy/consent:** UTM capture and GA4 must respect privacy expectations;
  no PII in analytics event params; align with the existing privacy policy.
- **Reuse-first:** build on the existing campaign engine, discount codes, achievements,
  and transcript pipeline rather than new infrastructure.
- **Performance:** OG image generation (if dynamic) must be cached/edge-rendered and
  not degrade page load.
- **Consistency:** follow existing brand, component, and doc patterns.

## 6. Dependencies & Assumptions

- Canonical production domain is **shrey.fit** (needed for `metadataBase`,
  canonical URLs, and absolute OG image URLs).
- Firebase Analytics/GA4 is available and already partially wired
  (`AnalyticsListener`, `trackEvent`).
- The email campaign engine (Phase 1 of `marketing-campaigns`) is live and usable
  for the launch blast.
- Brand assets (logo, colors, a hero/share image) are available or can be produced
  for the default OG image.

## 7. Success Metrics

- **Phase 1:** 100% of marketing pages pass LinkedIn/X preview validators; blog
  posts indexed with rich results; sitemap submitted to Search Console.
- **Phase 2:** launch email sent to the full lead pool; active profiles on
  LinkedIn/IG/X with a starter cadence posted.
- **Phase 3:** channel → signup attribution visible in GA4; UTM captured on ≥90%
  of inbound campaign clicks.
- **Phase 4:** first referral-attributed signups recorded.
- **Phase 5:** clients sharing result cards that drive link-backs.

## 8. Rollout Order (recommended)

1. **Phase 1 (Shareability & SEO)** — start immediately; ~1 week, highest ROI.
2. **Phase 2 (Social presence & launch)** — in parallel/right after; content-led.
3. **Phase 3 (Conversion tracking)** — fast-follow so the above is measurable.
4. **Phase 4 (Referrals)** and **Phase 5 (Result cards)** — compound over the
   following weeks.

## 9. Decision — Social account naming (brand, not trainer)

**Decision (owner, 2026-07-07): create all social accounts under the *business/brand*
name (SHREY.FIT), matching the domain — NOT the personal trainer name.**

Rationale:
- **The brand is the durable asset.** Handles that match `shrey.fit` reinforce the
  product, are transferable to future staff, and survive independent of any one person.
  Personal-name handles couple the entire funnel to an individual and are painful to
  migrate later.
- **Clean structured data.** Phase 1 emits `Organization` JSON-LD with `sameAs` links and
  a `twitter:site` handle; these must point at **brand** profiles so search engines
  associate the social presence with the business entity.
- **Prevent squatting.** Reserve the *same* handle on **X, Instagram, LinkedIn (Company
  Page), TikTok, YouTube, Facebook** now, even if not all are actively posted. Keep the
  handle string identical across platforms.
- **Fitness nuance — trust is personal.** A brand primary account is canonical (the one we
  link on-site). The trainer's personal account may coexist and cross-post/boost reach,
  but it is **secondary** and is not the `sameAs`/`twitter:site` target.

Action items (feed into Phase 1 task 0.1):
- [ ] Reserve brand handle on X, Instagram, LinkedIn **Company Page**, TikTok, YouTube,
  Facebook. Confirm a single consistent handle string (e.g. `shreyfit` / `shrey.fit`).
- [ ] Set profile name, bio, link (→ shrey.fit), and brand avatar/banner consistently.
- [ ] Record final profile URLs + handle in `app/src/lib/seo.ts` (`SITE.sameAs`,
  `SITE.twitterHandle`).

> **Note:** LinkedIn must be a **Company Page** (not a personal profile) for the `sameAs`
> link and for running any future company-branded content/ads.

## 10. Account setup — cost, requirements, and Google visibility

### 10.1 Are the accounts free? Do we need a business address?

**All social accounts are free to create. None require a registered business or a
street address.** You only pay if you later choose to run *ads*. Each asks for an
optional *location* (city/region), not a street address. Practical setup:

| Platform | Account type | Effort | Prerequisite | Street address? |
|---|---|---|---|---|
| Instagram | Free "Professional/Business" (switch in settings) | ~5 min | Email | No |
| X (Twitter) | Free standard account | ~5 min | Email | No |
| LinkedIn **Company Page** | Free; created *from* a personal profile | ~15 min | A personal LinkedIn profile (admin) | No (city only) |
| Facebook **Page** | Free; created *from* a personal profile | ~10 min | A personal FB profile (admin) | Optional |
| TikTok | Free "Business" (switch in settings) | ~5 min | Email/phone | No |
| YouTube | Free channel / Brand account | ~10 min | A Google account | No |

Notes:
- Use a **brand email** (e.g. `hello@shrey.fit`) as the owner of all accounts.
- For LinkedIn & Facebook, a **personal profile is the admin** of the Company Page /
  Page — this is normal; the Page is a separate managed entity.
- **No LLC / business registration is required** to operate these profiles.
- **~1 hour total** to reserve all handles.

### 10.2 Google search visibility — no account required (mostly)

Two distinct things:

1. **Organic Google ranking — requires NO account.** Google crawls shrey.fit
   automatically. Phase 1's per-page metadata, `sitemap.xml`, `robots.txt`, canonical
   URLs, and JSON-LD are what drive this. This is the free, no-signup path and is
   fully covered by the Phase 1 build.
2. **Two optional *free* Google tools:**
   - **Google Search Console** (free, no business needed): verify domain ownership
     (DNS record or file), submit the sitemap, monitor search queries/coverage.
     **Recommended** — already referenced in Phase 1 task 8.1.
   - **Google Business Profile** (free): only relevant with a **physical/local
     presence** (Maps + local panel). Requires address/service-area verification.
     **Skip if fully remote**; add later if in-person training warrants it. This is the
     same trigger as the deferred `LocalBusiness` JSON-LD.

**Summary:** organic ranking = 0 accounts (Phase 1 code handles it); Search Console =
free + recommended; Google Business Profile = free but only if local; all social
accounts = free, no business address.

### 10.3 Sequencing — is account setup the immediate next step?

**No — account setup is a parallel operational task, not an engineering blocker.**

- **Immediate engineering next step = Phase 1 (shareability & SEO code).** It does **not**
  depend on the accounts existing. The only tie-in is emitting `sameAs` / `twitter:site`
  tags — those fields are **parked/blank** until handles are confirmed (see task 0.1). All
  other Phase 1 work proceeds regardless.
- **Account setup (~1 hr) is best done before Phase 2** (the launch playbook / first posts).
  Doing it *now* is worthwhile mainly to **reserve the handles** before someone squats them.
- **You are not blocked on the accounts to start building.**

### 10.4 The trainer already has personal accounts — what to do per platform

The trainer's **personal accounts stay as-is** (they can cross-post/boost). We create
*separate brand identities* for the business. Per platform:

| Platform | What to create | How (given a personal account exists) |
|---|---|---|
| Instagram | New brand account `@shrey.fit`, set to Professional | Log out / add account → new signup with brand email → switch to Professional in settings. (Personal stays separate.) |
| X (Twitter) | New brand handle | Add account under brand email; keep personal separate. |
| LinkedIn | **Company Page** (not a 2nd personal profile) | From the trainer's personal profile → "For Business" → Create a Company Page. Personal profile becomes the Page admin. |
| Facebook | **Page** (not a 2nd profile) | From personal profile → Create a Page. Personal profile is the admin. |
| TikTok | New brand account, set to Business | Add account under brand email → switch to Business. |
| YouTube | **Brand Account channel** under the existing Google login (see below) | Settings → Add/manage channels → Create a channel → **Use a custom name** → "SHREY.FIT". |

#### YouTube: Brand Account vs. a new Google account

**Use a Brand Account channel — do NOT create a whole new Google/Gmail account.**

- A **Brand Account** is a separate *channel identity* that lives **under the trainer's
  existing personal Google login**. The trainer signs in normally, but the channel shows as
  **SHREY.FIT** with its own name, logo, and subscribers — fully separate from any personal
  YouTube channel.
- **Why:** (1) no new password to manage; (2) branded as SHREY.FIT; (3) you can **add other
  managers/owners later** (VA, a business Google account) **without sharing the personal
  password** — the key advantage over a plain personal channel; (4) ownership is transferable
  if an LLC is formed later.
- **Create it:** YouTube → Settings → *"Add or manage your channel(s)"* → *"Create a channel"*
  → choose **"Use a custom name"** (this makes the Brand Account) → name it **SHREY.FIT**.




