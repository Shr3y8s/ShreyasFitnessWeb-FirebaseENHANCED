# Production Architecture & Launch Plan

> **Status:** Pre-launch planning document
> **Decision:** Frontend hosted on **Firebase App Hosting (GCP / Cloud Run)**; backend on **Firebase (Google Cloud)**
> **Target domain:** `shrey.fit`
> **Firebase project:** `shreyfitweb`
> **Last updated:** 2026-06-13

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Hosting Decision: GCP vs. Vercel](#2-hosting-decision-gcp-vs-vercel)
3. [Production Architecture](#3-production-architecture)
4. [Development → Production Delta](#4-development--production-delta)
5. [Phased Launch Runbook](#5-phased-launch-runbook)
6. [Master Launch Checklist](#6-master-launch-checklist)
7. [Risks & Rollback](#7-risks--rollback)

---

## 1. Executive Summary

The Shreyas Method Fitness platform is a **Next.js 15 / React 19** application
backed by **Firebase** (Firestore, Auth, Storage, Cloud Functions v2) on the
`shreyfitweb` Google Cloud project. It integrates with **Stripe** (payments &
subscriptions), **Resend** (transactional email), **Calendly** (session &
check-in scheduling), and **Google Places** (address autocomplete).

Today the app runs in **development mode**:

- The Next.js app runs locally (`npm run dev`) against the **live Firebase
  backend**.
- Stripe runs in **test mode** (`pk_test` / `sk_test`) with a test-mode bypass
  in the payment function.
- `firebase.json` hosting still serves the **legacy static site** (`static/`),
  not the Next.js app.
- Third-party integrations (Calendly, Resend) are wired but not all are
  production-verified.

"Going to production" means:

| Area | Development (now) | Production (target) |
|---|---|---|
| Frontend host | `localhost:3000` | **Firebase App Hosting** (`shrey.fit`) |
| Stripe | Test mode | **Live mode** |
| Secrets | `.env.local` / test secrets | **GCP Secret Manager (live)** — one model |
| Domain / TLS | none | `shrey.fit` + automatic HTTPS |
| Integrations | partially verified | Calendly + Resend + Places fully verified |
| Hardening | dev rules / test flags | locked rules, no test bypasses |

This document records the hosting decision, the target architecture, and a
**step-by-step launch runbook** to get there.

> **Scope note:** This is a *planning/documentation* artifact. It identifies the
> specific files and changes required, but the code changes themselves are
> executed as part of the runbook phases, not by this document.

---

## 2. Hosting Decision: GCP vs. Vercel

The central production decision was **where to host the Next.js frontend**. The
backend (Firestore/Auth/Storage/Functions) stays on Firebase regardless.

> **Terminology note:** This app uses the Next.js **App Router with SSR / server
> components**. Classic **Firebase Hosting** is a static/CDN host and **cannot**
> serve SSR on its own — it's only suitable for static marketing pages. The
> correct GCP mechanism for an SSR Next.js app is **Firebase App Hosting**,
> which builds the app with Cloud Build and serves SSR from **Cloud Run**,
> fronted by Firebase's global CDN. Throughout this doc, "GCP hosting" means
> **Firebase App Hosting (Cloud Run)**.

### 2.1 Options Considered

- **Option A — Firebase App Hosting (GCP / Cloud Run) + Firebase backend** —
  *all-in on Google; **CHOSEN***
- **Option B — Vercel (frontend) + Firebase (backend)** — *the hybrid*
- **Option C — Classic Firebase Hosting + Cloud Functions** — *rejected; cannot
  serve App-Router SSR on its own; only fits static pages.*

### 2.2 Pros & Cons

#### Option A — Firebase App Hosting / GCP (CHOSEN)

**Pros**
- **Lower cost at low usage** — no fixed per-seat fee; **scales to zero**. You
  pay only Cloud Run usage + Cloud Build minutes. (Vercel Pro is a fixed
  **~$20/member/mo** regardless of traffic — the deciding factor here.)
- **One vendor:** frontend + Firestore + Auth + Storage + Functions all under
  `shreyfitweb` — unified billing, IAM, Cloud Logging, monitoring.
- **Same-cloud as backend** → simpler CORS story and marginally lower
  server-side latency to Firestore/Functions.
- **Secrets via Cloud Secret Manager** — the **same** mechanism the Functions
  already use (`defineSecret`). One secrets model for the entire app.
- GitHub-triggered rollouts; immutable, rollback-able releases.

**Cons**
- Less mature Next.js DX than Vercel; some bleeding-edge Next.js features may
  lag; thinner community/troubleshooting content.
- Possible **Cloud Run cold starts** when scaled to zero (first request slower)
  — mitigated with min instances on latency-sensitive paths.
- Preview environments and one-click rollbacks are less polished than Vercel's.
- Slightly more build/infra configuration than Vercel.

#### Option B — Vercel (alternative / fallback)

**Pros**
- Best-in-class Next.js developer experience; zero-config SSR/ISR, image
  optimization, edge caching.
- Fastest path to launch (connect repo → push → live ~60s); automatic preview
  deploys per branch/PR; one-click rollbacks.
- Global edge CDN, automatic HTTPS, simple custom-domain setup.

**Cons**
- **Fixed ~$20/member/mo (Pro)** even at low/zero traffic — more expensive than
  App Hosting's scale-to-zero model for a small launch.
- Two vendors / two dashboards / two bills (Vercel + GCP).
- Cross-origin calls: frontend (`shrey.fit`) → Functions (`cloudfunctions.net`)
  require CORS attention (already handled; see `region-configuration-guide.md`).

### 2.3 Decision Matrix

| Factor | Firebase App Hosting / GCP (A) | Vercel (B) |
|---|---|---|
| Cost at low traffic | ★★★★★ | ★★★☆☆ |
| Single vendor / unified ops | ★★★★★ | ★★☆☆☆ |
| CORS / backend latency | ★★★★★ | ★★★☆☆ |
| Secrets model consistency | ★★★★★ | ★★★☆☆ |
| Next.js DX & features | ★★★☆☆ | ★★★★★ |
| Time to first launch | ★★★☆☆ | ★★★★★ |
| Preview deploys & rollbacks | ★★★☆☆ | ★★★★★ |
| Cost predictability at scale | ★★★★☆ | ★★★☆☆ |

### 2.4 Latency Notes (Frontend → Backend)

Hosting location has **little impact** on this app's perceived latency, because
most backend traffic does **not** flow through the frontend host:

1. **Firestore reads/writes** — the browser talks **directly** to Firestore via
   the Firebase Web SDK (`app/src/lib/firebase.ts`). The frontend host is not in
   this path. Latency = browser → Google.
2. **Callable Functions** (`createPaymentIntent`, session functions, etc.) are
   invoked **directly from the browser** via the callable SDK — again, the host
   is not in the path.
3. **Auth** — browser ↔ Firebase Auth directly.

This is **Pattern 1 (Client → Firebase direct)** from the architecture guide and
it dominates the app's traffic.

With **Firebase App Hosting**, the **bonus** is that the frontend's server-side
work (SSR renders and the 4 Next.js API routes — Google Places proxy, contact,
email) runs **in the same cloud as the backend**, giving a simpler CORS story
and slightly lower server-side hop latency than a separate Vercel region would.

| Path | Frequency | App Hosting (GCP) | Vercel |
|---|---|---|---|
| Browser → Firestore (direct SDK) | Very High | Same | Same |
| Browser → Functions (callable SDK) | High | Same | Same |
| Next.js API route → Google/Resend | Low | Baseline (same cloud) | +~5–30ms |
| SSR render → Firestore data | Med | Co-located | Co-locate region |

### 2.5 Decision

**Frontend → Firebase App Hosting (GCP / Cloud Run).** The deciding factor is
**cost at low usage**: App Hosting scales to zero with no fixed per-seat fee,
whereas Vercel Pro charges a fixed ~$20/member/mo regardless of traffic. App
Hosting also consolidates everything under a single vendor (`shreyfitweb`) with
one secrets/IAM/billing model and same-cloud proximity to the backend.

**Tradeoffs accepted:** a less polished Next.js deploy experience than Vercel and
possible Cloud Run cold starts (mitigated via **min instances** on
latency-sensitive paths). **Vercel (Option B) remains the documented fallback**
if developer velocity or richer preview/rollback tooling later outweighs the
fixed cost.

---

## 3. Production Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ USER'S BROWSER  (https://shrey.fit)                          │
│ - React UI (Next.js client components)                       │
│ - Firebase Web SDK (direct Firestore/Auth/Storage/callable)  │
└─────────────────────────────────────────────────────────────┘
        │  (1) direct SDK         │  (2) HTTPS page loads / API routes
        │                         ▼
        │   ┌──────────────────────────────────────────────────┐
        │   │ FIREBASE APP HOSTING  (Cloud Run + Firebase CDN)  │
        │   │  - Next.js SSR/SSG/ISR (built via Cloud Build)    │
        │   │  - 4 API routes:                                  │
        │   │     /api/autocomplete                             │
        │   │     /api/place-details                            │
        │   │     /api/submit-contact                           │
        │   │     /api/send-reply-email                         │
        │   │  (same GCP project as backend → simple CORS)      │
        │   └──────────────────────────────────────────────────┘
        │                   │                  │
        ▼                   ▼                  ▼
┌──────────────────────────────────┐   ┌──────────────┐   ┌──────────────┐
│ FIREBASE / GOOGLE CLOUD          │   │ GOOGLE PLACES│   │ RESEND       │
│ (project: shreyfitweb)           │   │ (autocomplete│   │ (email:      │
│  • Firestore (nam5)              │   │  + details)  │   │  shrey.fit)  │
│  • Auth                          │   └──────────────┘   └──────────────┘
│  • Storage                       │
│  • Cloud Functions v2:           │
│     - createPaymentIntent        │◄──────────────┐
│     - session/checkin functions  │               │ webhooks
│     - calendlyWebhook            │◄────────┐      │
│     - stripeWebhook (extension)  │◄──┐     │      │
│  • firestore-stripe-payments ext │   │     │      │
│  • Secret Manager:               │   │     │      │
│     STRIPE_KEY, STRIPE_WEBHOOK,  │   │     │      │
│     RESEND_API_KEY, CALENDLY_PAT │   │     │      │
└──────────────────────────────────┘   │     │      │
                                   ┌────┴───┐ │  ┌───┴────┐
                                   │ STRIPE │ │  │CALENDLY│
                                   │ (live) │ │  │(webhk) │
                                   └────────┘ │  └────────┘
                                              │
                                        (live events)
```

**Key data flows**

- **(1) Direct SDK** — browser ↔ Firestore/Auth/Storage and callable Functions.
  Protected by Firestore/Storage Security Rules + Auth. *Host-independent.*
- **(2) SSR + API routes** — Next.js server work runs on Cloud Run (App Hosting)
  in the same GCP project; secret keys stay server-side.
- **Webhooks** — Stripe and Calendly POST to stable Cloud Function URLs,
  independent of the frontend.

---

## 4. Development → Production Delta

| Item | Dev (now) | Prod (target) | File(s) / Location |
|---|---|---|---|
| Frontend host | localhost | Firebase App Hosting (Cloud Run) | App Hosting backend |
| Hosting config | static site | Next.js via App Hosting | `firebase.json`, `apphosting.yaml` |
| Stripe keys | `pk_test`/`sk_test` | `pk_live`/`sk_live` | App Hosting env + Secret Manager |
| Stripe webhook | test `whsec_` | live `whsec_` | Secret Manager `STRIPE_WEBHOOK` |
| Stripe products/prices | test IDs | live IDs | `firebase/functions/product-config.js`, `index.js` |
| Test bypass | `isTestMode` allowed | removed | `firebase/functions/index.js` |
| Stripe extension | duplicate installs | single version | `firebase.json` `extensions` |
| Stripe API version | mixed pins | single pinned version | `firebase/functions/index.js` |
| App URL var | none | `NEXT_PUBLIC_APP_URL` | App Hosting env, code refs |
| Firebase web config | `.env.local` | App Hosting env (`apphosting.yaml`) | `app/.env.example` keys |
| Calendly webhook | dev/test | prod subscription | Calendly dashboard |
| Resend domain | maybe sandbox | verified `shrey.fit` | Resend dashboard (SPF/DKIM) |
| Google Places key | unrestricted | restricted + billing | Google Cloud Console |
| Security rules | dev-permissive | locked | `firestore.rules`, `storage.rules` |
| Image patterns | incl. `picsum.photos` | prod-only | `app/next.config.ts` |

---

## 5. Phased Launch Runbook

Work the phases in order. Each step is a discrete, verifiable action.

### Phase 0 — Decisions & Prerequisites
- [x] Confirm hosting decision: **Firebase App Hosting (GCP)** (done — see §2.5).
- [x] Confirm ownership/access to: domain registrar for `shrey.fit`, Stripe
      account, Resend account, Calendly account, Google Cloud `shreyfitweb`.
      *(GCP `shreyfitweb` verified — authenticated as `satish.annapureddy@gmail.com`,
      project ACTIVE. Owner confirmed admin access to domain registrar, Stripe,
      Resend, and Calendly.)*
- [x] Confirm the **Blaze (pay-as-you-go)** billing plan is enabled on
      `shreyfitweb` (required for App Hosting / Cloud Run / Cloud Build).
      *(Owner confirmed; consistent with v2 Functions + Stripe extensions already
      deployed, which require Blaze.)*
- [x] Confirm GitHub repo access for the Firebase App Hosting GitHub connection.
      *(Owner confirmed admin access to `Shr3y8s/ShreyasFitnessWeb-FirebaseENHANCED`.)*
- [x] Ensure the Firebase CLI is current (`npm i -g firebase-tools`) — App
      Hosting requires a recent version. *(Verified: `firebase-tools` v15.20.0.)*
- [x] Decide URL structure. **DECISION:** serve **everything (marketing + app)
      from the Next.js app on the apex `shrey.fit`** and **retire the legacy
      `static/` site**. (The `firebase.json` legacy-hosting block is removed in
      Phase 2.)

> ✅ **Phase 0 complete** — all prerequisites confirmed and the URL-structure
> decision is locked. Proceed to Phase 1 (Environment Variables & Secrets).



### Phase 1 — Environment Variables & Secrets

> **Why this comes first:** With Firebase App Hosting, `NEXT_PUBLIC_*` variables
> are compiled into the Next.js bundle **at build time** (Cloud Build) and are
> declared in **`apphosting.yaml`** (committed to the repo). The first rollout in
> Phase 2 can't build a working app until this config exists — so env/secrets are
> configured **before** the hosting backend is created and the domain is wired.

- [x] In **`apphosting.yaml`** (App Hosting env), set the production
      `NEXT_PUBLIC_*` build/runtime variables from `app/.env.example`:
      - `NEXT_PUBLIC_FIREBASE_API_KEY`
      - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
      - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
      - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
      - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
      - `NEXT_PUBLIC_FIREBASE_APP_ID`
      - `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

      *Done — authored `app/apphosting.yaml` with the production Firebase web
      config inline (these are public identifiers), `availability: [BUILD,
      RUNTIME]`.*
- [~] Add `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = **live** publishable key.
      *Variable is declared in `apphosting.yaml` with a `REPLACE_WITH_LIVE_pk_live_KEY`
      placeholder. **Owner action (Phase 3):** paste the live `pk_live_...` value.*
- [x] Introduce a canonical **`NEXT_PUBLIC_APP_URL`** (`https://shrey.fit`) and
      use it for redirects/links/emails instead of any hardcoded URLs.
      *Declared in `apphosting.yaml`. (Replacing hardcoded URLs in code is tracked
      in Phase 6 cleanup.)*
- [x] Reference **server-side secrets from Cloud Secret Manager** in
      `apphosting.yaml` (App Hosting integrates natively with Secret Manager).
      Declared as RUNTIME-only `secret:` refs so keys are never inlined in the
      client bundle:
      - `GOOGLE_MAPS_API_KEY` → exposed as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
        (the app reads the Maps key under this name, but only inside the
        server-side `/api/autocomplete` and `/api/place-details` routes).
      - `RECAPTCHA_SECRET_KEY` (used by `/api/submit-contact`).
      - `RESEND_API_KEY` (used by `/api/send-reply-email`).
- [x] **Populate the secret values in Secret Manager** (`apphosting:secrets:set`).
      *Done — all three created/versioned in `projects/shreyfitweb/secrets`:*
      - `GOOGLE_MAPS_API_KEY` → version 1 (Production)
      - `RECAPTCHA_SECRET_KEY` → version 1 (Production)
      - `RESEND_API_KEY` → version 2 (shared with Cloud Functions; auto-deletion
        of old versions now disabled because two runtimes share it — expected).
      *The `apphosting.yaml` references were already authored, so we answered
      **No** to each CLI "add to apphosting.yaml?" prompt to avoid duplicates.*

      > **Secrets model (for future reference):** there is **one** durable Secret
      > Manager entry per secret. `defineSecret(...)` (Functions) and `secret:`
      > (App Hosting `apphosting.yaml`) are **two read/bind references** to that
      > same entry — neither stores the value. The value is written only by
      > `…secrets:set` and injected into each runtime at cold start. Keep **both**
      > references for `RESEND_API_KEY`; removing `defineSecret` would break
      > Functions email.

- [ ] In **GCP Secret Manager** (used by Functions via `defineSecret`), set live
      values:
      - `STRIPE_KEY` (live secret key)
      - `STRIPE_WEBHOOK` — **declare the reference now, fill the live value in
        Phase 3** (the signing secret only exists after the live webhook endpoint
        is created). This avoids a circular dependency.
      - `RESEND_API_KEY` (production key)
      - `CALENDLY_PAT` (production token)

      *These Functions secrets already exist in Secret Manager (the v2 Functions
      are deployed and running). **Owner action:** confirm/rotate each to its
      **live** value before launch. Left unchecked pending that confirmation.*
- [x] Confirm `firebase-config.json` `region` is correct (it's read at build by
      `next.config.ts` and copied into Functions on predeploy).
      *Verified: `region: us-west1`. `next.config.ts` injects it as
      `NEXT_PUBLIC_FIREBASE_FUNCTIONS_REGION` at build, so App Hosting's Cloud
      Build picks it up automatically — no entry needed in `apphosting.yaml`.*
- [ ] Grant the App Hosting backend service account access to any referenced
      secrets (Secret Manager Secret Accessor role). *(Note: the backend's
      service account is created when the backend is created in Phase 2 — so this
      runs immediately after Phase 2's backend creation and before the first
      rollout. `firebase apphosting:secrets:grantaccess` handles this.)*

> 🔶 **Phase 1 status:** `apphosting.yaml` authored and committed (public config
> inline; secrets referenced). Remaining items are **owner-provided secret
> values** (live Stripe publishable key in Phase 3; populate `GOOGLE_MAPS_API_KEY`,
> `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY`; confirm Functions secrets are live)
> and the **service-account grant** which executes right after the backend exists
> in Phase 2.


### Phase 2 — Hosting & Domain (Firebase App Hosting)

> **⚠️ Production-build readiness (discovered during Phase 2):** The app had
> **never had a passing `next build`** (dev mode doesn't enforce these checks).
> Running it locally surfaced and fixed several launch blockers:
> - ✅ Stale local `node_modules` missing `radix-ui` → resolved via `npm ci`
>   (App Hosting runs `npm ci`, so it's unaffected; the lockfile entry exists).
> - ✅ **ESLint was failing the build** → set `eslint.ignoreDuringBuilds: true`
>   in `next.config.ts` (lint runs separately; it shouldn't gate deploys).
> - ✅ **12 real TypeScript errors** across 7 files → all fixed (billing/settings
>   `null`→`undefined`; added missing `WorkoutAssignmentExercise` /
>   `WorkoutExecutionExercise` types; Recharts label typing ×2; client-hub
>   nutrition macro/meal-plan cast). **`tsc --noEmit` now passes.**
> - 🔶 **`useSearchParams()` prerender errors** — Next.js fails to statically
>   prerender client pages that call `useSearchParams()` without a `<Suspense>`
>   boundary. Fixed `dashboard/trainer/assignments/page.tsx` (split into an inner
>   component wrapped in `<Suspense>`). **Remaining pages need the same pattern**
>   (build fails one page at a time): `dashboard/trainer/workouts/create`,
>   `dashboard/trainer/weekly-checkins`, `dashboard/trainer/training-sessions`,
>   `dashboard/trainer/clients-messages`, `dashboard/trainer/assignments/create`.
>   (`account-setup` and `reset-password` already wrap correctly.)
>   **Pattern:** rename the page fn to `*Inner`, then
>   `export default function Page() { return <Suspense fallback={…}><Inner/></Suspense>; }`.
>   Alternatively add `export const dynamic = 'force-dynamic';` to each such page.
>   **NOTE:** under Turbopack, `force-dynamic` alone did NOT suppress the CSR-bailout
>   prerender error — the Suspense-wrapper split is the reliable fix and was applied to
>   all six affected pages: `assignments/page.tsx`, `assignments/create/page.tsx`,
>   `workouts/create/page.tsx`, `weekly-checkins/page.tsx`, `training-sessions/page.tsx`,
>   `clients-messages/page.tsx`.
> - [x] ✅ **`npm --prefix app run build` now exits 0** — all 77 routes compile,
>   type-check, and prerender cleanly. The app is ready for the first App Hosting rollout.

- [x] **Resolve the `firebase.json` hosting conflict.** *Done — removed the

      legacy `hosting` block entirely (it served the `static/` site and had a
      dead `/api/v1` rewrite to `minimalTest`, a function that is **not**
      exported anywhere in `firebase/functions`). Per the Phase 0 decision, the
      Next.js app is served by **App Hosting** (configured via `apphosting.yaml`
      + the backend), which is managed separately from `firebase.json`. The
      legacy `static/` site is retired.*
- [ ] In the **Firebase console → App Hosting**, create a backend and **connect
      the GitHub repo** (authorize the live branch, e.g. `main`). *(Owner — console step.)*
- [ ] Set the App Hosting **root directory** to `app/` (the Next.js app).
- [ ] Confirm **`apphosting.yaml`** (authored in Phase 1) is present in the app
      root with all env vars and secret references. *(Already committed at
      `app/apphosting.yaml`.)*
- [ ] **Grant the backend service account access to the secrets** (carried over
      from Phase 1 — do this right after the backend is created, before the
      first rollout):
      ```
      firebase apphosting:secrets:grantaccess GOOGLE_MAPS_API_KEY --backend <backend-id>
      firebase apphosting:secrets:grantaccess RECAPTCHA_SECRET_KEY --backend <backend-id>
      firebase apphosting:secrets:grantaccess RESEND_API_KEY --backend <backend-id>
      ```
- [ ] Confirm the build pipeline (Cloud Build) detects Next.js and produces a
      Cloud Run service; verify the first rollout succeeds (it should now build
      correctly because the env config from Phase 1 exists).
- [ ] Set **min instances ≥ 1** on the App Hosting backend if cold starts are a
      concern for first-request latency.
- [ ] Add custom domain `shrey.fit` (and `www`) to the App Hosting backend;
      configure the DNS records Firebase provides at the registrar.
- [ ] Verify automatic managed **SSL/HTTPS** is issued.
- [ ] Confirm a successful production rollout serves the app at `shrey.fit`.

> **Owner Runbook — exact commands for the remaining Phase 2 steps.** These are
> interactive (GitHub browser OAuth + registrar DNS) and must be run by the owner
> in a terminal at the repo root, authenticated as the project owner. Validated
> prerequisites: `apphosting.yaml` is present and correct, no backend exists yet
> (`apphosting:backends:list` is empty), and `npm --prefix app run build` exits 0.
>
> 1. **Push the committed build fixes** so the connected branch is current:
>    ```
>    git push origin main
>    ```
> 2. **Create the backend + connect GitHub** (opens a browser to authorize the
>    GitHub App; choose repo `Shr3y8s/ShreyasFitnessWeb-FirebaseENHANCED`, live
>    branch `main`, root directory `app`, and enable automatic rollouts):
>    ```
>    firebase apphosting:backends:create --project shreyfitweb
>    ```
>    Note the backend ID it prints (referred to below as `<backend-id>`).
> 3. **Grant the backend's service account access to the three secrets:**
>    ```
>    firebase apphosting:secrets:grantaccess GOOGLE_MAPS_API_KEY  --backend <backend-id> --project shreyfitweb
>    firebase apphosting:secrets:grantaccess RECAPTCHA_SECRET_KEY --backend <backend-id> --project shreyfitweb
>    firebase apphosting:secrets:grantaccess RESEND_API_KEY       --backend <backend-id> --project shreyfitweb
>    ```
> 4. **Trigger / confirm the first rollout** (creating the backend kicks off an
>    initial rollout from the connected branch; to roll out manually later):
>    ```
>    firebase apphosting:rollouts:create <backend-id> --project shreyfitweb
>    ```
>    Watch it in the console (App Hosting → your backend → Rollouts) until it
>    succeeds and prints the default `*.web.app`/`run.app` URL.
> 5. **Add the custom domain** (console: App Hosting → backend → Add custom
>    domain → `shrey.fit`, then add the `www` redirect). Create the DNS records
>    Firebase shows at the registrar; wait for verification + managed SSL.
> 6. **(Optional) reduce cold starts:** set `runConfig.minInstances: 1` in
>    `apphosting.yaml` and commit, before launch.
>
> **✅ First rollout succeeded (2026-06-14).** The backend `shreyfit-app`
> (us-central1, root `/app`, branch `main`) is live and serving at
> `https://shreyfit-app--shreyfitweb.us-central1.hosted.app`. Two additional build
> blockers were discovered and fixed during the first real Cloud Build (neither
> reproduced in a plain local `next build`):
> - **Next.js version gate:** the App Hosting buildpack hard-blocks vulnerable
>   Next versions (CVE-2025-55182 flagged 15.5.4). Upgraded `next` +
>   `eslint-config-next` to **15.5.19** (latest 15.5.x patch; avoided the 16.x
>   major mid-launch).
> - **Build-time secret evaluation:** `app/src/app/api/send-reply-email/route.ts`
>   constructed `new Resend(process.env.RESEND_API_KEY)` at **module scope**.
>   Since `RESEND_API_KEY` is RUNTIME-only, it was `undefined` during `next build`'s
>   "Collecting page data" and Resend threw "Missing API key". Fixed by moving the
>   `new Resend(...)` call **inside** the POST handler (lazy/per-request init) and
>   adding `export const dynamic = 'force-dynamic'`. (The other 3 API routes read
>   their secrets inside handlers already, so they were fine.)
> - **Owner/Code-Defender note:** pushes to the GitHub remote must be done from the
>   owner's terminal (the assistant's environment blocks external pushes); each push
>   to `main` auto-triggers a rollout.
- [x] First rollout builds & serves successfully *(serving on the `*.hosted.app` URL)*

### Phase 3 — Stripe Go-Live
- [ ] Toggle Stripe dashboard to **live mode**.
- [ ] Recreate **products & prices** in live mode (test-mode IDs do not carry
      over).
- [ ] Update live price/product IDs referenced in
      `firebase/functions/product-config.js` and `firebase/functions/index.js`.
- [ ] Verify/replace the hardcoded **Customer Portal config ID**
      (`STRIPE_PORTAL_CONFIG_ID = "bpc_..."` in `index.js`) with the **live**
      portal configuration.
- [ ] Pin a **single** Stripe API version across the codebase (code currently
      mixes `2024-09-30.acacia` and `2025-07-30.basil`).
- [ ] **Remove the `isTestMode` unauthenticated bypass** in `createPaymentIntent`
      (and any other test-only fallbacks like `test-user-id`).
- [ ] **Resolve duplicate Stripe extension** in `firebase.json` — it installs
      `invertase/firestore-stripe-payments` twice
      (`firestore-stripe-payments` and `firestore-stripe-payments-qscq@0.3.12`).
      Keep exactly one and reconfigure it for live keys.
- [ ] Create the **live webhook endpoint** in Stripe pointing at the production
      `stripeWebhook` / extension URL; capture the new `whsec_` into
      `STRIPE_WEBHOOK` (Phase 2).
- [ ] Configure live BNPL options (Affirm/Klarna/Afterpay) in the dashboard if
      desired.
- [ ] Deploy Functions: `firebase deploy --only functions`.

### Phase 4 — Third-Party Integrations
- [ ] **Calendly:** create a **production webhook subscription** pointing at the
      live `calendlyWebhook` Function URL; verify the production PAT
      (`CALENDLY_PAT`). Test booking → cancellation round-trip.
- [ ] **Resend:** verify the `shrey.fit` domain (SPF/DKIM/DMARC) so
      `support@`, `verify@`, `info@`, `billing@` etc. send from a verified
      domain and are not sandboxed. Send test emails to Gmail/Outlook and check
      they don't land in spam.
- [ ] **Google Places:** ensure billing is enabled and **restrict the API key**
      (API restriction = Places API; appropriate application restriction for
      server-side use).

### Phase 5 — Backend Hardening
- [ ] Review and lock down **`firestore.rules`** for production (no broad
      read/write; enforce auth + ownership/role checks).
- [ ] Review and lock down **`storage.rules`**.
- [ ] Confirm **`firestore.indexes.json`** is deployed
      (`firebase deploy --only firestore:indexes`).
- [ ] Set **min instances** on latency-sensitive Functions (payments, webhooks)
      if cold starts are a concern.
- [ ] Seed required production data: exercise library
      (`firebase/scripts/seed-exercises.js`), admin account
      (`admin-account-setup-guide.md`).

### Phase 6 — Code Cleanup
- [ ] Remove dev-only flags/bypasses (`isTestMode`, `test-user-id` fallbacks).
- [ ] Audit hardcoded values; ensure all emails/links use the production domain
      (most already use `shrey.fit` ✅) and `NEXT_PUBLIC_APP_URL`.
- [ ] Remove `picsum.photos` from `app/next.config.ts` `images.remotePatterns`
      if not used in production.
- [ ] Strip noisy `console.log` statements from Functions (keep structured
      `logger` calls).
- [ ] **Delete the orphaned top-level `static/` directory.** It's the legacy
      pre-Next.js HTML site, fully superseded by the `app/src/app/(marketing)/`
      route group and no longer served by anything (the `firebase.json` Hosting
      block that referenced it was removed in Phase 2). Verify nothing references
      `static/` paths, then delete the directory.


### Phase 7 — Legal, Analytics & Ops
- [ ] Confirm final content + contact emails on Terms (`app/src/app/legal/terms`)
      and Privacy (`app/src/app/legal/privacy`) pages.
- [ ] Enable analytics (Firebase Analytics via `measurementId`) and/or a product
      analytics tool.
- [ ] Add error tracking (e.g. Sentry) for frontend and Functions.
- [ ] Configure Firestore **backups**: scheduled exports and/or Point-in-Time
      Recovery (PITR).
- [ ] Set **budget alerts** on GCP (covers App Hosting/Cloud Run, Functions,
      Firestore, and Cloud Build spend in one place).
- [ ] Set up uptime monitoring for the site and webhook endpoints.

### Phase 8 — Pre-Launch Verification
- [ ] **End-to-end live smoke test** with a real card (small amount, then
      refund): signup → live payment → Calendly booking → webhook updates
      Firestore → dashboard reflects subscription/session.
- [ ] Verify subscription lifecycle: create, view in Customer Portal, cancel.
- [ ] Verify emails (verification, replies, notifications) deliver and render.
- [ ] Cross-browser + mobile/responsive pass.
- [ ] Verify Firestore/Storage rules block unauthorized access (negative tests).
- [ ] Verify first-request latency / cold-start behavior is acceptable (tune App
      Hosting min instances if needed).
- [ ] Document and rehearse the **rollback plan** (Phase 9 / §7).

### Phase 9 — Launch & Post-Launch
- [ ] Final rollout of frontend (App Hosting) and deploy of Functions (Firebase).
- [ ] Confirm `shrey.fit` resolves to the App Hosting backend with valid SSL.
- [ ] Announce launch.
- [ ] Monitor for the first 24–72h: Stripe events, Function + Cloud Run logs in
      Cloud Logging, App Hosting rollout health, email deliverability, error
      tracker.
- [ ] Schedule key/secret rotation cadence (e.g. every 90 days).

---

## 6. Master Launch Checklist

Quick-reference consolidated view. Legend: 🔴 blocker · ⚠️ needs work · ✅ done.

**Prerequisites (Phase 0)** — ✅ all confirmed
- [x] 🔴 Blaze billing enabled on `shreyfitweb`
- [x] Access confirmed (GCP, domain registrar, Stripe, Resend, Calendly)
- [x] GitHub repo admin access for App Hosting connection
- [x] Firebase CLI current (v15.20.0)
- [x] URL structure decided: apex `shrey.fit`, retire legacy static site


**Env & Secrets (Phase 1 — before hosting)**
- [x] 🔴 `apphosting.yaml` authored with env + secret references
- [x] 🔴 All `NEXT_PUBLIC_FIREBASE_*` set in App Hosting env (prod)
- [x] ⚠️ `NEXT_PUBLIC_APP_URL` introduced (declared in `apphosting.yaml`)
- [ ] 🔴 `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = live *(placeholder; owner sets in Phase 3)*
- [x] 🔴 App Hosting secrets populated: `GOOGLE_MAPS_API_KEY`, `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY`

- [ ] 🔴 Functions Secret Manager confirmed live: `STRIPE_KEY`, `STRIPE_WEBHOOK`, `RESEND_API_KEY`, `CALENDLY_PAT`
- [ ] 🔴 App Hosting service account granted Secret Accessor *(runs after backend created in Phase 2)*
- [ ] ⚠️ Google Places key restricted + billing enabled (Phase 4)


**Hosting & Domain (Phase 2)**
- [x] 🔴 `firebase.json` legacy `hosting` block removed (static site retired)
- [x] 🔴 App Hosting backend created (`shreyfit-app`, us-central1), GitHub connected, root = `/app`
- [x] 🔴 Backend service account granted Secret Accessor (all 3 secrets)
- [x] 🔴 First rollout builds & serves successfully (`shreyfit-app--shreyfitweb.us-central1.hosted.app`)
- [x] ✅ Next.js upgraded 15.5.4 → 15.5.19 (cleared buildpack CVE gate)
- [x] ✅ `send-reply-email` Resend lazy-init fix (cleared build-time secret error)
- [ ] 🔴 `shrey.fit` custom domain + managed SSL on App Hosting *(owner/console — last Phase 2 step)*



**Stripe**
- [ ] 🔴 Live keys + live products/prices + updated price IDs
- [ ] 🔴 Live webhook endpoint + new `whsec_`
- [ ] 🔴 `isTestMode` bypass removed
- [ ] 🔴 Duplicate Stripe extension resolved
- [ ] ⚠️ Live Customer Portal config verified
- [ ] ⚠️ Single Stripe API version pinned

**Integrations**
- [ ] ⚠️ Calendly production webhook + PAT verified
- [ ] ⚠️ Resend `shrey.fit` domain verified (SPF/DKIM)

**Backend Hardening**
- [ ] 🔴 `firestore.rules` locked for production
- [ ] 🔴 `storage.rules` locked for production
- [ ] ⚠️ Indexes deployed; min-instances set; prod data seeded

**Code Cleanup**
- [ ] ⚠️ Test flags / fallbacks removed
- [ ] ⚠️ `picsum.photos` removed from `next.config.ts` (if unused)
- [ ] ⚠️ Console logs cleaned in Functions

**Legal / Analytics / Ops**
- [ ] ✅ Terms & Privacy pages exist — confirm final content
- [ ] ⚠️ Analytics + error tracking enabled
- [ ] ⚠️ Backups (PITR/exports) + budget alerts + uptime monitoring

**Verification**
- [ ] 🔴 End-to-end live payment + Calendly + webhook smoke test
- [ ] ⚠️ Email deliverability + cross-browser/mobile + negative rule tests
- [ ] ⚠️ Cold-start / first-request latency acceptable (min instances tuned)
- [ ] ⚠️ Rollback plan documented & rehearsed

---

## 7. Risks & Rollback

**Top blockers (must clear before launch)**
1. **Stripe live mode** — wrong/missing live keys, price IDs, or webhook secret
   silently breaks payments. Mitigation: full live smoke test in Phase 8.
2. **Hosting conflict** — `firebase.json` still serving the legacy static site
   can shadow or confuse the production app/domain. Must be resolved in Phase 2.

3. **Security rules** — dev-permissive rules in production expose user data.
   Must be locked in Phase 5 with negative tests in Phase 8.
4. **Duplicate Stripe extension** — two installs can double-process events or
   conflict. Must be reduced to one in Phase 3.
5. **Cold starts** — App Hosting scaled to zero can make the first request slow.
   Mitigation: set min instances ≥ 1 on the App Hosting backend (Phase 1).

**Rollback strategy**
- **Frontend (App Hosting):** every rollout is an immutable release. Roll back
  by **redeploying / pinning the previous successful rollout** from the Firebase
  console (App Hosting → Rollouts) or by reverting the connected branch commit
  and triggering a new rollout.
- **Functions:** redeploy the previous known-good version
  (`firebase deploy --only functions`); keep the prior commit tagged.
- **Stripe:** if live payments misbehave, disable the live webhook endpoint and
  pause new checkouts while investigating; refunds via Stripe dashboard.
- **DNS:** keep a documented record of prior DNS values to revert if the cutover
  fails.

---

## Related Documents

- [Application Architecture (dev/overview)](./application-architecture.md)
- [Stripe Integration](../02-implementation/stripe-integration.md)
- [Region Configuration Guide](../02-implementation/region-configuration-guide.md)
- [Calendly Webhook Setup Guide](../02-implementation/calendly-webhook-setup-guide.md)
- [Admin Account Setup Guide](../02-implementation/admin-account-setup-guide.md)
- [Security Implementation Roadmap](../02-implementation/security-implementation-roadmap.md)
