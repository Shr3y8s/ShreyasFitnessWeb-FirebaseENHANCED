# Growth & Acquisition — Phase 3: Analytics & Attribution

Instrument the acquisition funnel end-to-end so we can answer two questions after
soft launch:

1. **Which channel drove a lead/customer?** (LinkedIn, Instagram, Google Ads, direct…)
2. **Where in the funnel do people drop off?** (land → connect/signup → checkout)

This is GA4 event instrumentation + a privacy-safe UTM attribution layer. No PII is
ever stored in attribution — only campaign/source tags from our own share links and
inbound ad/social links.

Related:
- `app/src/lib/attribution.ts` — UTM capture/persist (first-touch + last-touch)
- `app/src/lib/firebase.ts` — `trackEvent()` GA4 wrapper
- `app/src/components/AnalyticsListener.tsx` — page_view + UTM capture on route change
- `phase1-verification-checklist.md` — SEO/shareability (Phase 1)

---

## 1. Configuration

- [x] GA4 Measurement ID present in `app/.env.local`
      (`NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-5GBP19SXBW`).
- [x] `trackEvent()` no-ops safely when `analytics` is unavailable (SSR / consent
      not granted / unsupported browser).

## 2. Attribution layer (`attribution.ts`)

- [x] Capture recognised UTM params (`utm_source/medium/campaign/term/content`)
      plus `gclid` from the landing URL.
- [x] **First-touch** persisted in `localStorage` with a 30-day TTL; never
      overwritten once set (original discovery channel wins).
- [x] **Last-touch** persisted in `sessionStorage`; overwritten on each new campaign.
- [x] SSR-safe: every accessor guards `typeof window` and swallows storage errors
      (Safari private mode / disabled storage).
- [x] `getAttribution()` returns a **flat, JSON-safe** object (safe to spread into a
      `trackEvent` payload or a Firestore doc).
- [x] `getAttributionForRecord()` returns `null` when empty so callers can omit the
      field rather than writing an empty map.

## 3. Funnel events (GA4)

- [x] `page_view` on every route change (`AnalyticsListener`), enriched with
      source/medium/campaign for channel reporting.
- [x] `captureUtmFromUrl()` wired into `AnalyticsListener` so UTMs are captured on
      the very first page and every subsequent navigation.
- [x] `connect_form_submit` on successful contact-form submit (`/connect`).
- [x] `signup_complete` on successful account creation, with `tier` + attribution.
- [x] `begin_checkout` on signup checkout hand-off and on the in-dashboard upgrade
      flow (`/dashboard/client/upgrade`).
- [x] `checkout_complete` on the success page, fired **exactly once** when
      fulfillment is CONFIRMED (`status === 'done'`) — never on the soft-timeout
      state (that would inflate conversions). Includes `item`, `label`, `mode`, and
      attribution.

## 4. Attribution on persisted records

- [x] `signup` attaches attribution to the `users/{uid}` doc so a customer can be
      traced to their acquisition channel.
- [x] `submit-contact` API attaches server-sanitized attribution to
      `contact_form_submissions` (only the six known keys, string-coerced +
      length-capped; omitted entirely when absent).

## 5. Build & verification

- [ ] `npm run build` passes (no type errors) — run from `app/`.
- [ ] **GA4 DebugView** end-to-end walk-through (see checklist below).

---

## GA4 DebugView verification checklist

Run against the deployed origin (or local dev with the GA Debugger extension).
Open **GA4 → Admin → DebugView** and confirm each event arrives with expected
params.

1. **UTM capture** — visit
   `https://shrey.fit/?utm_source=linkedin&utm_medium=social&utm_campaign=soft_launch`.
   - [ ] `page_view` shows `source=linkedin`, `medium=social`, `campaign=soft_launch`.
   - [ ] `localStorage['shreyfit_attribution_first']` is set (DevTools → Application).

2. **Lead funnel** — navigate to `/connect`, submit the contact form.
   - [ ] `connect_form_submit` fires with the attribution params attached.
   - [ ] New `contact_form_submissions` doc has an `Attribution` map with the UTMs.

3. **Signup funnel** — complete a signup.
   - [ ] `signup_complete` fires with `tier` + attribution.
   - [ ] `begin_checkout` fires on hand-off to payment.
   - [ ] `users/{uid}` doc carries the attribution.

4. **Purchase** — complete a checkout (sandbox).
   - [ ] `checkout_complete` fires **once** with `item`/`label`/`mode` + attribution.
   - [ ] It does **not** fire on the "couldn't confirm yet" timeout state.

5. **First-touch stickiness** — in the same browser, visit again with a *different*
   `utm_source` (e.g. `instagram`) and convert.
   - [ ] Conversion events still carry the ORIGINAL `source=linkedin` (first-touch),
         not `instagram`, until the 30-day TTL expires.

---

## Notes / follow-ups

- [ ] Mark `checkout_complete` (and optionally `signup_complete`) as **Conversions**
      in GA4 (Admin → Events) once events are confirmed flowing.
- [ ] Consider a lightweight consent gate before initializing analytics if we later
      target EU/UK traffic (GDPR). Today `trackEvent` simply no-ops without consent
      infra; revisit before any paid EU campaigns.
- [ ] Build UTM'd share links per channel (Phase 2 `share.ts`) so `utm_source`
      values stay consistent across LinkedIn/Instagram/etc.
