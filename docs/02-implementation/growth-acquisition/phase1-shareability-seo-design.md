# Growth & Acquisition — Phase 1: Shareability & SEO — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit
> **Created:** 2026-07-07
> **Requirements:** `docs/02-implementation/growth-acquisition/requirements.md` (Phase 1)
> **Roadmap:** `docs/04-architecture/post-launch-roadmap.md` (Tier 1 — Growth & Acquisition)
> **Tasks:** `phase1-shareability-seo-tasks.md`

---

## 1. Overview & goal

Make every shrey.fit link **look professional when shared** (LinkedIn, X, iMessage,
WhatsApp, Slack) and **discoverable by search engines**. This is pure metadata/config
plumbing — **no new data model, no payments changes, no auth changes.** It is the
highest-ROI, lowest-risk work before the launch push (Phase 2).

### Current state (verified in code)
- `app/src/app/layout.tsx` (root) — `metadata` sets only `title` + `description`.
  **No `metadataBase`, no `openGraph`, no `twitter`, no icons.**
- `app/src/app/(marketing)/layout.tsx` — same: only `title` + `description`.
- Marketing pages (`page.tsx`, `services`, `about`, `faq`, `blog`, each blog post) —
  most set only a plain `title`/`description`; several share generic copy.
- **No `sitemap.ts`, no `robots.ts`** anywhere under `app/src/app/`.
- **No JSON-LD / structured data** anywhere.
- `next.config.ts` — no `metadataBase`; `images.remotePatterns` allow `picsum.photos`
  and `firebasestorage.googleapis.com` only.

### Consequence
A link pasted anywhere today renders as a bare URL (no card image/title/description),
and Google has no sitemap to crawl or structured data to build rich results from.

---

## 2. Design principles

1. **Use the Next.js App Router Metadata API** — the idiomatic mechanism already in use
   (`export const metadata`). We extend it; we do **not** hand-write `<head>` tags or add
   a third-party SEO lib. Zero new runtime dependencies.
2. **One source of truth for the base URL + defaults.** A single `site` config module
   (`app/src/lib/seo.ts`) holds the canonical origin, brand name, default description,
   default social image, and social handles. Every page imports from it.
3. **Inherit, override only what differs.** Root layout sets `metadataBase` + full
   default OG/Twitter block; child routes override `title`/`description`/`openGraph.images`
   only where they diverge. App Router merges parent → child automatically.
4. **Dynamic OG images via the framework**, not a design tool — Next.js
   `opengraph-image.tsx` (built-in `ImageResponse`) renders branded 1200×630 PNGs at the
   edge. No Figma export pipeline, no binary assets to maintain (a static fallback PNG is
   the one exception, see §5.3).
5. **Marketing pages only.** OG/Twitter/JSON-LD/sitemap target the **public** marketing
   surface. Authenticated dashboard routes stay `noindex` (see §7).

---

## 3. Base URL & environment

A canonical absolute origin is required for `metadataBase`, `sitemap`, `robots`, and
canonical URLs. Sharers and crawlers need absolute URLs.

- **Source:** `NEXT_PUBLIC_SITE_URL` (e.g. `https://shrey.fit`), read in `seo.ts`.
  - Add to `app/.env.local` (dev) and to `app/apphosting.yaml` env (prod).
  - Fallback in code to `https://shrey.fit` so a missing var never breaks the build.
- **Staging:** `apphosting.staging.yaml` sets it to the staging domain so previews don't
  emit production canonicals or get indexed (staging also returns `noindex` — see §6).

```ts
// app/src/lib/seo.ts (shape)
export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://shrey.fit',
  name: 'SHREY.FIT',
  shortName: 'SHREY.FIT',
  description: 'Personal training & fitness coaching — sustainable, control-first…',
  defaultOgImage: '/og/default.png', // static fallback (see §5.3)
  twitterHandle: '@shreyfit',        // TODO confirm handle
  locale: 'en_US',
} as const;

export function absoluteUrl(path = '/') {
  return new URL(path, SITE.url).toString();
}
```

---

## 4. Metadata layering

### 4.1 Root layout (`app/src/app/layout.tsx`)
Set the site-wide defaults **once**:
- `metadataBase: new URL(SITE.url)` — makes all relative OG image paths absolute.
- `title: { default: 'SHREY.FIT — Personal Training & Coaching', template: '%s | SHREY.FIT' }`
  so child pages can set a bare `title: 'Blog'` and get `Blog | SHREY.FIT`.
- `description`, `applicationName`, `authors`, `keywords` (light).
- `openGraph`: `type: 'website'`, `siteName`, `locale`, `url`, `title`, `description`,
  and a default `images` entry (the static fallback).
- `twitter`: `card: 'summary_large_image'`, `site`/`creator` = handle, title/description/images.
- `icons` / `manifest` if present (out of scope to create new icons; wire if they exist).
- `alternates.canonical: '/'` at root; pages override per-route.

### 4.2 Marketing layout (`app/src/app/(marketing)/layout.tsx`)
Keep it thin — it mostly inherits root. It may set an `openGraph.url`/canonical for the
marketing section, but per-page files are the better place for specific canonicals.

### 4.3 Per-page metadata (override only deltas)
Give each public page a **unique** `title`, `description`, and `alternates.canonical`:
- `/` (home) — primary keywords (personal training, coaching, location if relevant).
- `/services`, `/about`, `/faq`, `/connect`, `/library`, `/blog`.
- Each blog post (`/blog/*`) — post-specific title/description + `openGraph.type: 'article'`
  with `publishedTime`, `authors`, and its own OG image (see §5.2).

For blog posts, factor the per-post copy (title, excerpt, date) so both the page's
`generateMetadata`/`metadata` **and** the listing in `blog/page.tsx` can share it
(today the copy lives inline in `blog/page.tsx`). Minimal refactor: a small
`blog-posts.ts` metadata map keyed by slug, or colocated `metadata` exports per post.

---

## 5. OG / social images

### 5.1 Route-level dynamic images (preferred)
Add `opengraph-image.tsx` (and re-export as `twitter-image.tsx`) using Next's
`ImageResponse`:
- **Root / marketing default** — brand lockup, tagline, brand colors. 1200×630.
- Each generates at request/build time; no binary checked in.

```tsx
// app/src/app/(marketing)/opengraph-image.tsx (shape)
import { ImageResponse } from 'next/og';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'SHREY.FIT — Personal Training & Coaching';
export default function Image() {
  return new ImageResponse(<div style={{/* brand layout */}}>…</div>, size);
}
```

### 5.2 Blog post images
A dynamic `opengraph-image.tsx` under the blog post route that renders the **post title**
+ brand chrome, so each article shares a distinct, on-brand card. Pulls the title from the
shared `blog-posts.ts` map (§4.3).

### 5.3 Static fallback
Ship one static `public/og/default.png` (1200×630) referenced by `SITE.defaultOgImage`.
This guarantees a valid card even if a dynamic route image fails, and gives crawlers that
don't execute the dynamic route a concrete asset. (Only binary asset added.)

### 5.4 next.config images
No change needed for OG generation (server-rendered). If any OG image later pulls a remote
photo (e.g. Firebase Storage transformation), the existing `remotePatterns` already cover
`firebasestorage.googleapis.com`.

---

## 6. Sitemap & robots

### 6.1 `app/src/app/sitemap.ts`
Next's `MetadataRoute.Sitemap`. Enumerate **public** routes only:
- Static marketing routes (`/`, `/services`, `/about`, `/faq`, `/connect`, `/library`, `/blog`).
- Blog posts derived from the shared `blog-posts.ts` map (§4.3) so new posts auto-appear.
- Each entry: `url` (absolute via `absoluteUrl`), `lastModified`, `changeFrequency`, `priority`.
- **Exclude** all `/dashboard/*`, `/login`, `/signup`, `/checkout`, `/reset-password`,
  `/unsubscribe`, `/api/*`, `/.well-known/*`.

### 6.2 `app/src/app/robots.ts`
Next's `MetadataRoute.Robots`:
- **Production:** `allow: '/'`, `disallow: ['/dashboard/', '/api/', '/checkout', '/login',
  '/signup', '/reset-password', '/forgot-password', '/unsubscribe', '/.well-known/']`,
  and `sitemap: absoluteUrl('/sitemap.xml')`.
- **Staging / non-prod:** `disallow: '/'` (block all) so previews never get indexed —
  keyed off `NEXT_PUBLIC_SITE_URL` (or a dedicated `NEXT_PUBLIC_ENV`) so staging and prod
  emit different robots output.

### 6.3 Dashboard noindex
Authenticated routes must not be indexed even if linked. Add `robots: { index: false,
follow: false }` to the metadata of the `dashboard` layout(s) (client/trainer/admin) as a
defense-in-depth complement to robots.txt disallow.

---

## 7. Structured data (JSON-LD)

Inject via a tiny server component that renders a `<script type="application/ld+json">`
(no client JS, no dependency). Add:
- **`Organization`** (site-wide, in marketing layout): name, url, logo, `sameAs`
  (LinkedIn/IG/X profile URLs — from `SITE`), contact.
- **`LocalBusiness`** (home page) — the app has physical `locations`; emit
  name/address/geo/opening hours if available. *(Depends on having real location data;
  if not launch-ready, ship `Organization` only and defer `LocalBusiness`.)*
- **`Article` / `BlogPosting`** (each blog post) — headline, description, datePublished,
  author, image (the post OG image), `mainEntityOfPage`.
- **`BreadcrumbList`** (blog posts) — optional, nice-to-have.

```tsx
// app/src/components/seo/JsonLd.tsx (shape)
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
```

---

## 8. Files touched (anticipated)

**New**
- `app/src/lib/seo.ts` — `SITE` config + `absoluteUrl()` + JSON-LD builders.
- `app/src/lib/blog-posts.ts` — shared post metadata map (slug → title/desc/date/author),
  refactored out of `blog/page.tsx` inline data.
- `app/src/components/seo/JsonLd.tsx` — JSON-LD renderer.
- `app/src/app/(marketing)/opengraph-image.tsx` (+ `twitter-image.tsx` re-export).
- `app/src/app/(marketing)/blog/[…]/opengraph-image.tsx` — per-post image (path matches
  actual blog route structure — currently one folder per post).
- `app/src/app/sitemap.ts`
- `app/src/app/robots.ts`
- `app/public/og/default.png` — static fallback OG image.

**Edited**
- `app/src/app/layout.tsx` — `metadataBase`, title template, full default OG/Twitter block.
- `app/src/app/(marketing)/layout.tsx` — Organization JSON-LD; thin metadata.
- Each marketing page + blog post — unique `title`/`description` + `alternates.canonical`
  (+ `openGraph.type:'article'` and Article JSON-LD on posts).
- `app/src/app/dashboard/**/layout.tsx` — `robots: { index:false, follow:false }`.
- `app/.env.local`, `app/apphosting.yaml`, `app/apphosting.staging.yaml` — `NEXT_PUBLIC_SITE_URL`.
- `next.config.ts` — only if a remote host is needed for OG images (likely none).

---

## 9. Risks & mitigations

- **Wrong/missing base URL → broken absolute OG URLs.** → Single `SITE.url` with a safe
  `https://shrey.fit` fallback; verify with a card validator before launch (§10).
- **Staging pages get indexed / leak canonicals.** → `robots.ts` returns `disallow:'/'`
  off-prod; canonicals derive from `NEXT_PUBLIC_SITE_URL`.
- **Blog data duplicated (listing vs. post vs. sitemap).** → Extract `blog-posts.ts` as the
  single source; listing, per-post metadata, OG image, and sitemap all read from it.
- **`LocalBusiness` JSON-LD with incomplete data hurts rather than helps.** → Ship only if
  address/geo are real; otherwise `Organization` only, defer `LocalBusiness`.
- **Dynamic OG image runtime errors.** → Static `default.png` fallback guarantees a valid card.
- **Twitter/LinkedIn handles unknown.** → `SITE` holds them in one place; leave `sameAs`/
  `twitter.site` out until confirmed (open question in requirements).

---

## 10. Testing & validation

- **Build:** `next build` succeeds; `/sitemap.xml` and `/robots.txt` resolve; each
  `opengraph-image` route returns a 1200×630 PNG.
- **Metadata unit sanity:** spot-check rendered `<head>` for home, a blog post, `/services`
  — unique title/description, canonical, `og:image` absolute, `twitter:card`.
- **Social validators (pre-launch):** LinkedIn Post Inspector, X Card Validator, and a
  Facebook/OG debugger against the deployed staging/prod URLs.
- **Google:** `robots.txt` Tester + Rich Results Test on a blog post (Article) and home
  (Organization/LocalBusiness). Submit `sitemap.xml` in Search Console at launch.
- **Regression:** confirm dashboard routes emit `noindex` and are absent from `sitemap.xml`.

---

## 11. Out of scope (later phases)

- Share buttons + UTM-tagged share URLs (Phase 2 — social presence).
- Launch email/announcement runbook (Phase 2).
- Conversion event tracking / GA4 funnel (Phase 3).
- Referral codes (Phase 4), client result cards (Phase 5).
