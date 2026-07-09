# Growth & Acquisition — Phase 1 Verification Checklist

Post-deploy verification for the shareability & SEO work (structured data,
social cards, favicon, robots/sitemap). Run against the deployed origin
(production or staging) after each release that touches these files.

Related:
- `phase1-shareability-seo-design.md`
- `phase1-shareability-seo-tasks.md`
- `app/src/lib/seo.ts`

---

## 1. Crawl infrastructure

- [x] `GET /robots.txt` returns **200** with `text/plain` and includes a
      `Sitemap:` line pointing at `<origin>/sitemap.xml`.
      **(Prod verified 2026-07-08: `Allow: /` + disallow list + `Host: https://shrey.fit/`
      + `Sitemap: https://shrey.fit/sitemap.xml`.)**
- [ ] `GET /sitemap.xml` returns **200** with valid XML and lists the marketing
      routes (home, services, about, faq, connect, blog posts).
- [ ] Sitemap URLs use the canonical origin (no `localhost` / preview host).
- [x] Staging origin sets `NEXT_PUBLIC_SITE_URL` to the sandbox domain so it
      does **not** emit production canonicals.
      **(Verified 2026-07-08: set `NEXT_PUBLIC_SITE_URL=https://sandbox.shrey.fit` on the
      staging backend as a Console env var + rolled out; sandbox `robots.txt` → `Disallow: /`
      with no `Host`/`Sitemap`. NOTE: `apphosting.staging.yaml` is NOT auto-merged on this
      CLI version — the value must be set as a Console env var. See `sandbox-staging-setup.md` §4.)**

## 2. Favicon & icons

- [ ] `GET /icon` (or the hashed `/icon.png` in page source) returns **200**
      as `image/png` — no 404/500.
- [ ] Browser tab shows the brand "S" mark, not the framework default.
- [ ] View source of `/`: `<link rel="icon">` is present and resolves.

## 3. Social share cards (OpenGraph / Twitter)

- [x] View source of `/`: `og:image`, `og:title`, `og:description`,
      `og:url`, and `twitter:card=summary_large_image` are present.
      **(Confirmed locally 2026-07-08 from saved page source — og:image →
      /opengraph-image?…, 1200×630 declared, twitter:card=summary_large_image.)**
- [x] `GET /opengraph-image` returns **200** `image/png`, 1200×630.
      **(Confirmed locally 2026-07-08 via `curl -v http://localhost:3000/opengraph-image`
      → `HTTP/1.1 200 OK`, `content-type: image/png`, ~160 KB PNG body.
      Re-run against the deployed origin after release.)**


- [ ] Paste the production URL into the LinkedIn Post Inspector and confirm the
      card renders with the correct title, description, and image.
- [ ] Repeat for a blog post URL (per-page title/description flow through).
- [ ] Confirm `twitter:site` is `@SHREY_FIT` in page source (now set in `SITE.twitterHandle`).


## 4. Structured data (JSON-LD)

- [ ] Home page emits **Organization** + **WebSite** JSON-LD.
- [ ] `/connect` emits **Person** + **ProfessionalService** JSON-LD with a
      shared `@id` graph (`#coach` ↔ `#business`).
- [ ] Blog posts emit **BlogPosting** JSON-LD.
- [ ] Run each page through Google's Rich Results Test — **no errors**
      (warnings for optional fields like `sameAs`/`aggregateRating` are OK).
- [ ] Confirm `sameAs` lists all confirmed profiles — YouTube
      (`@shreyasfit`), Instagram (`shreyfitness`), LinkedIn (`company/shreyfit`),
      X (`SHREY_FIT`), Facebook (`Shrey.Fit`), TikTok (`@shrey.fit`) — on the
      home Organization JSON-LD and on `/connect` Person + ProfessionalService.



## 5. Canonicals & titles

- [ ] Each marketing page has a self-referencing `<link rel="canonical">`.
- [ ] Page `<title>` uses the `%s | SHREY.FIT` template.
- [ ] No duplicate or conflicting canonical tags.

---

## Parked follow-ups

- [x] Reserve brand social profiles and populate `SITE.sameAs` +
      `SITE.twitterHandle` in `app/src/lib/seo.ts` (YouTube, Instagram,
      LinkedIn, X, Facebook, TikTok — done).

- [ ] Submit `sitemap.xml` in Google Search Console once the domain is verified.
- [ ] Add per-page custom OG images for high-intent pages (services, connect)
      if the default template underperforms in link previews.
