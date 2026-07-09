# Growth & Acquisition — Phase 1: Shareability & SEO — Tasks

> **Status:** ✅ COMPLETE — deployed & verified in production (2026-07-08). Prod
> `robots.txt` emits `Allow: /` + disallow list + `Host`/`Sitemap`; sandbox emits
> `Disallow: /`. Root cause of the staging leak (missing `NEXT_PUBLIC_SITE_URL`
> override on the staging backend) fixed and documented in `sandbox-staging-setup.md` §4.
> **Design:** `phase1-shareability-seo-design.md`
> **Requirements:** `requirements.md` (Phase 1)
> **Estimate:** ~1 week, low risk, no data model / payments / auth changes.
> **Verification checklist:** `phase1-verification-checklist.md`
>
> **Deferred (not blocking soft launch):** static OG fallback (5.1) and per-post OG
> images (5.3) — a single dynamic default social card (`app/src/app/opengraph-image.tsx`)
> and dynamic favicon (`app/src/app/icon.tsx`) cover all routes for launch. Optional
> `NEXT_PUBLIC_ENV` (0.3) skipped: `isProductionSite()` branches on the canonical URL.


Legend: `[ ]` todo · `[x]` done · `[~]` intentionally skipped. Work top-to-bottom; each block is independently shippable.

---

## 0. Prep & config

- [x] **0.1** Confirm the canonical production origin (`https://shrey.fit`) and social
  handles. **Create/reserve accounts under the BRAND name (SHREY.FIT), not the trainer
  name** — see `requirements.md` §9. All handles now confirmed and wired into
  `SITE.sameAs` (YouTube `@shreyasfit`, Instagram `shreyfitness`, LinkedIn
  `company/shreyfit`, X `SHREY_FIT`, Facebook `Shrey.Fit`, TikTok `@shrey.fit`) and
  `SITE.twitterHandle` (`@SHREY_FIT`).
- [x] **0.2** Add `NEXT_PUBLIC_SITE_URL` to:
  - `app/.env.local` → prod origin for local dev, or a local value.
  - `app/apphosting.yaml` → `https://shrey.fit`.
  - `app/apphosting.staging.yaml` → the staging domain.
- [~] **0.3** (Optional) SKIPPED — `isProductionSite()` branches on the canonical URL
  (`SITE.url === 'https://shrey.fit'`) instead of a separate `NEXT_PUBLIC_ENV` flag.


## 1. SEO foundation module

- [x] **1.1** Create `app/src/lib/seo.ts`:

  - `SITE` const (url, name, shortName, description, defaultOgImage, twitterHandle, locale,
    `sameAs: string[]`).
  - `absoluteUrl(path)` helper.
  - `isProductionSite()` helper (branches on canonical URL) for robots branching.
  - JSON-LD builders: `organizationJsonLd()`, `articleJsonLd(post)`, and
    `personalTrainerServiceJsonLd()` (Person + Service; shipped in place of the deferred
    `localBusinessJsonLd()` since there is no physical storefront).
- [x] **1.2** Create `app/src/components/seo/JsonLd.tsx` — renders
  `<script type="application/ld+json">` from a plain object (server component, no deps).

## 2. Blog content single-source refactor

- [x] **2.1** Create `app/src/lib/blog-posts.ts` — export `BLOG_POSTS` map keyed by slug
  with `{ slug, title, description, excerpt, date (ISO), author, icon? }`. Populate from the
  inline `POSTS` array currently in `app/src/app/(marketing)/blog/page.tsx` (control-first,
  mind-muscle, sustainable-approach, nutrition-framework, forty-sixty-rule).
- [x] **2.2** Refactor `blog/page.tsx` to read from `BLOG_POSTS` (remove the inline copy;
  keep the icon mapping). Verify the listing renders identically.

## 3. Root & marketing metadata

- [x] **3.1** `app/src/app/layout.tsx` — replace the minimal `metadata` with:
  `metadataBase: new URL(SITE.url)`, `title: { default, template: '%s | SHREY.FIT' }`,
  `description`, `applicationName`, default `openGraph` (type `website`, siteName, locale,
  url, images: default OG), default `twitter` (`summary_large_image`), `alternates.canonical: '/'`,
  and `icons`/`manifest` **only if** they already exist in `public/`.
- [x] **3.2** `app/src/app/(marketing)/layout.tsx` — keep metadata thin (inherits root);
  render `<JsonLd data={organizationJsonLd()} />` once for the whole marketing surface.

## 4. Per-page metadata (unique title/description/canonical)

For each, set a unique `title` (bare, uses template), `description`, and
`alternates.canonical`:
- [x] **4.1** `/` — `app/src/app/(marketing)/page.tsx`.
- [x] **4.2** `/services` — `services/layout.tsx`.
- [x] **4.3** `/about` — `about/page.tsx`.
- [x] **4.4** `/faq` — `faq/layout.tsx`.
- [x] **4.5** `/connect` — `connect/layout.tsx` (+ `personalTrainerServiceJsonLd()`).
- [x] **4.6** `/library` — `library/page.tsx`.
- [x] **4.7** `/blog` — `blog/page.tsx` (unique listing metadata).
- [x] **4.8** Each blog post page (`blog/control-first`, `blog/mind-muscle`,
  `blog/sustainable-approach`, `blog/nutrition-framework`, `blog/forty-sixty-rule`):
  - Export `metadata` from `BLOG_POSTS[slug]` with `openGraph.type: 'article'`,
    `publishedTime`, `authors`, `alternates.canonical`.
  - Render `<JsonLd data={articleJsonLd(post)} />` in the post body.

## 5. OG / social images

- [~] **5.1** DEFERRED — static fallback `app/public/og/default.png`. The dynamic default
  card (5.2) covers all routes; a static fallback is a nice-to-have, not launch-blocking.
- [x] **5.2** `app/src/app/opengraph-image.tsx` — dynamic default card via
  `next/og` `ImageResponse` (brand lockup + tagline). Serves as `og:image`/`twitter:image`
  for every route at the app root. **(2026-07-08: restyled to match the app 1:1 — the exact
  light body gradient (`emerald-50→white→teal-50`) with dark gray-800 SHREY·FIT letters and
  the signature emerald-600 dot, reproducing the MarketingNav lockup. Dark-on-light is the
  highest-contrast, most on-brand option. Kept at the universal 1200×630: a brief bump to
  1600×840 (for LinkedIn's ≥1600px *hint*) tripped opengraph.xyz's "expects exactly 1200×630"
  check — the universal standard wins since 1200×630 renders fine on LinkedIn anyway.)**
- [~] **5.3** DEFERRED — per-post OG images. Blog posts fall back to the default card for
  launch; per-post cards are a Phase 2 polish item.
- [x] **5.4** Verify the `opengraph-image` route returns a 1200×630 PNG in `next build`.
  (Also added `app/src/app/icon.tsx` — dynamic favicon.)

## 6. Sitemap & robots

- [x] **6.1** `app/src/app/sitemap.ts` — `MetadataRoute.Sitemap`: static marketing routes +
  blog posts from `BLOG_POSTS`; absolute URLs via `absoluteUrl`; `lastModified`/
  `changeFrequency`/`priority`. Exclude all authed/utility routes.
- [x] **6.2** `app/src/app/robots.ts` — `MetadataRoute.Robots`: prod allows `/` with the
  disallow list (`/dashboard/`, `/api/`, `/checkout`, `/login`, `/signup`,
  `/reset-password`, `/forgot-password`, `/unsubscribe`, `/.well-known/`) + `sitemap` URL;
  **non-prod returns `disallow: '/'`**.
- [x] **6.3** Add `robots: { index: false, follow: false }` to the dashboard layout
  metadata (client / trainer / admin) as defense-in-depth.

## 7. Validation

- [x] **7.1** `cd app && npm run build` — succeeds; `/sitemap.xml`, `/robots.txt`, and the
  `opengraph-image` route resolve. (Earlier robots/sitemap/favicon 500s fixed.)
- [x] **7.2** Local `<head>` spot-check (home, one blog post, `/services`): unique
  title/description, canonical present, `og:image` absolute, `twitter:card` present.
- [x] **7.3** Deploy to **staging**; confirm `robots.txt` blocks all and pages are `noindex`.
  **(Verified 2026-07-08: sandbox.shrey.fit `robots.txt` → `Disallow: /`, no Host/Sitemap.
  Required setting `NEXT_PUBLIC_SITE_URL=https://sandbox.shrey.fit` on the staging backend as
  a Console env var — `apphosting.staging.yaml` is not auto-merged on this CLI version. Prod
  re-verified: `Allow: /` + disallow list + `Host`/`Sitemap`.)**
- [ ] **7.4** Run social validators against staging/prod: LinkedIn Post Inspector, X Card
  Validator, Facebook OG debugger — confirm rich cards render. *(Phase 2 launch prep.)*
- [ ] **7.5** Google Rich Results Test on a blog post (Article) + home (Organization) +
  `/connect` (Person/Service). Fix any warnings. View-source check that `sameAs` emits. *(Phase 2.)*
- [ ] **7.6** Regression: dashboard routes emit `noindex` and are absent from `sitemap.xml`.


## 8. Launch handoff (to Phase 2)

- [~] **8.1** After prod deploy: submit `sitemap.xml` in Google Search Console; verify domain.
  **(2026-07-08: Domain verified in Search Console; `sitemap.xml` submitted at
  `https://shrey.fit/sitemap.xml`. Console showed "Sitemap could not be read" immediately
  after submit — a known Google fetch-queue lag, not a real error; the sitemap opens fine
  in-browser and lists the correct `https://shrey.fit` URLs. NOTE: verification is per Google
  account and permanent — a re-verify prompt in another browser means a different
  account/property, NOT a lost verification; do not add a second DNS TXT record. Prefer the
  single Domain property.)**

  **RESOLVED — CONFIRMED COSMETIC (2026-07-09):** The "Sitemap could not be read" status
  persisted >10h and re-submitting did not clear it. Diagnosed as Search Console
  reprocessing lag on a brand-new property, **not** a site bug — verified three ways:
  1. `curl -i https://shrey.fit/sitemap.xml` → `200`, `content-type: application/xml`,
     well-formed `<urlset>`, all 12 `<loc>`s absolute `https://shrey.fit/...`, no redirects.
  2. Same request with a `Googlebot` User-Agent → identical valid XML (no UA-specific
     block/redirect). `robots.txt` → `200`, `Allow: /`, references `Sitemap:` correctly.
  3. **URL Inspection on `https://shrey.fit/` → "URL is on Google / Page is indexed",
     Crawl allowed: Yes, Page fetch: Successful, Indexing allowed: Yes.** Homepage was
     discovered & indexed via an internal link (referring page `/legal/privacy`), NOT the
     sitemap — proving discovery/indexing is unblocked. The inspection's "No referring
     sitemaps detected" is the same reprocessing lag from the other side of the mirror.

  **Action:** do NOT re-submit repeatedly (it can reset Google's queue timer). The
  "could not be read" + "no referring sitemaps" labels self-resolve on Google's schedule
  (~2–7 days on a new property) and flip to "Success / 12 discovered pages." **Not a launch
  blocker** — indexing is confirmed working.
- [ ] **8.2** Capture 2–3 "known-good" share URLs (home, a blog post) for the Phase 2 launch
  posts so the first LinkedIn/IG/X shares render correct cards.

---

### Open questions — RESOLVED
- ~~Confirm X/Twitter handle + LinkedIn/IG profile URLs for `sameAs` and `twitter.site`.~~
  Resolved in 0.1 — all six profiles confirmed and wired.
- ~~Is `LocalBusiness` structured data launch-ready?~~ No physical storefront — shipped
  `Organization` + `personalTrainerServiceJsonLd()` (Person + Service) instead.
