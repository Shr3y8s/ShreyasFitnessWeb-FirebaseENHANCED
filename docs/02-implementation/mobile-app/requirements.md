 analytics to understand how clients are using  the dashboard featuers and also potential clients are navigating and using the website.

**Status:** Draft for review
**Owner:** Shreyas Fitness
**Last updated:** 2026-07-06
**Related docs:** `docs/04-architecture/application-architecture.md`, `docs/02-implementation/payment-processor/applepay-googlepay-decision.md`, `docs/02-implementation/tier-feature-gating/tier-feature-gating-requirements.md`

> This is the **requirements** document only. Design (`design.md`) and task breakdown (`tasks.md`) will follow **after this document is reviewed and approved**.

---

## 1. Overview

### 1.1 Goal
Ship a native mobile application for **iOS and Android** that delivers the **client-side (logged-in) experience** of the existing web platform. The app is focused on **retention and daily engagement** for people who are already clients — not on marketing or acquisition (that remains the job of the website).

### 1.2 Approach
- **Framework:** React Native via **Expo** (managed workflow + EAS build/submit/update).
- **Backend:** Reuse the **existing Firebase backend as-is** — same Firebase Auth, Firestore, Cloud Functions, Storage, and Firestore/Storage security rules. No backend rewrite.
- **Shared logic:** Extract portable, framework-agnostic TypeScript (types, API wrappers, validation, formatting, pricing/metrics utilities) into a **shared package** consumed by both the Next.js web app and the mobile app.
- **Cross-platform from one codebase:** iOS and Android are built and shipped together from a single React Native codebase.

### 1.3 What the mobile app is (and is not)
- **Is:** The **client dashboard** — the functionality currently under `app/src/app/dashboard/client/*`.
- **Is not:** The public **marketing website** (`app/src/app/(marketing)/*`), trainer tooling, or admin tooling.

---

## 2. Scope

### 2.1 In scope — MVP (Phase 1)
The MVP is the smallest set of features that makes the app worth installing and opening daily:

1. **Authentication** — email/password sign-in, password reset, session persistence, sign-out. (Adapted from web `login` / `forgot-password` / `reset-password`.)
2. **Home / Dashboard** — a client's daily overview: welcome header, current plan snapshot, upcoming workout reminder, at-a-glance progress.
3. **Workouts** — view assigned workouts, view exercise details, and **mark workouts/exercises complete** (write-back to Firestore).
4. **Progress + Progress Photos** — view progress metrics/charts and **upload progress photos** (camera + photo library) to Firebase Storage.
5. **Messages** — client ↔ trainer messaging (view + send), reusing the existing messaging data model.
6. **Push notifications** — device registration + receiving pushes (e.g., new message, workout reminder, coach outreach) via Expo push + FCM/APNs.

### 2.2 In scope — required supporting screens (MVP)
These are small but **required** for the app to function and pass store review:
- **Login / Signup entry** — login fully in-app; account creation may be minimal and **route subscription purchase to the website** (see §5).
- **Legal** — **Privacy Policy** and **Terms** must be reachable in-app (WebView or external link to existing `/legal/privacy` and `/legal/terms`). Required by both stores.
- **Support / About** — a minimal screen (or link-out to the website) for help/contact.
- **Upgrade / upsell** — for non-subscribed or lower-tier users, an upsell that **links out to the website** to purchase (see §5). Tier feature-gating rules mirror the existing web gating.

### 2.3 Deferred to later phases (post-MVP)
Explicitly **out of scope for MVP**, planned for later phases:
- **Nutrition** hub, **Goals**, **Weekly check-ins**, **Tasks**, **Activity feed**, **Sessions / scheduling / session purchase**, **Resources**.
- **"Learn" content** — blog, exercise/video library (genuinely useful, but not MVP; a candidate later phase).
- **Trainer app** and **Admin app** experiences.
- **In-app billing management** beyond view-only status (full subscription management stays on web).
- **Offline-first / full offline sync**, deep linking beyond basics, and advanced analytics.

### 2.4 Explicitly out of scope (all phases, unless revisited)
- Rebuilding the **public marketing pages** (home, services, about, faq, connect) as native screens. These remain **web-only**; the app may link out to them if ever needed.
- **In-app selling of digital subscriptions** using Apple/Google in-app purchase (IAP). See §5.

---

## 3. Feature Requirements (User Stories + Acceptance Criteria)

### 3.1 Authentication
**US-1:** As a client, I can sign in with my email and password so I can access my dashboard.
- **AC-1.1:** Valid credentials authenticate via Firebase Auth and land on Home.
- **AC-1.2:** Invalid credentials show a clear inline error.
- **AC-1.3:** Session persists across app restarts (secure token storage).
- **AC-1.4:** I can request a password reset email.
- **AC-1.5:** I can sign out; session is cleared from the device.

### 3.2 Home / Dashboard
**US-2:** As a client, I can see a daily overview when I open the app.
- **AC-2.1:** Displays welcome header with the client's name.
- **AC-2.2:** Shows current plan snapshot and next/upcoming workout.
- **AC-2.3:** Shows an at-a-glance progress indicator.
- **AC-2.4:** Data loads from Firestore for the authenticated user only (per existing security rules).
- **AC-2.5:** Locked/gated content respects tier feature-gating.

### 3.3 Workouts
**US-3:** As a client, I can view and complete my assigned workouts.
- **AC-3.1:** Lists assigned workouts with status.
- **AC-3.2:** I can open a workout and view exercises (sets/reps/notes) and available exercise detail/video where applicable.
- **AC-3.3:** I can mark a workout/exercise complete; the completion writes back to Firestore and reflects in progress.
- **AC-3.4:** Errors on write are surfaced and retryable.

### 3.4 Progress + Progress Photos
**US-4:** As a client, I can view my progress and upload progress photos.
- **AC-4.1:** Displays progress metrics/charts sourced from existing data.
- **AC-4.2:** I can capture a photo with the camera or pick from the library.
- **AC-4.3:** Photo uploads to Firebase Storage under the correct owner path (per Storage rules) with progress/failure feedback.
- **AC-4.4:** Camera and photo-library permissions are requested with clear rationale.

### 3.5 Messages
**US-5:** As a client, I can message my trainer.
- **AC-5.1:** I can view my conversation thread(s).
- **AC-5.2:** I can send a message; it appears in near-real-time and persists to Firestore.
- **AC-5.3:** New inbound messages update the thread live while viewing.

### 3.6 Push Notifications
**US-6:** As a client, I receive relevant push notifications.
- **AC-6.1:** On first relevant moment, I'm prompted for notification permission with rationale.
- **AC-6.2:** Device push token is registered and stored for the user.
- **AC-6.3:** Tapping a notification deep-links to the relevant screen (e.g., message thread).
- **AC-6.4:** Notifications can be triggered from existing Cloud Functions notification flows.

---

## 4. Non-Functional Requirements

- **NFR-1 (Backend reuse):** No changes to Firestore data model or security rules are required for MVP; the app authenticates and reads/writes exactly as the web client does. Any needed rule change must be justified and reviewed.
- **NFR-2 (Shared code):** Business logic (types, API wrappers, validation, pricing/metrics/date utilities) is shared with the web app to avoid divergence.
- **NFR-3 (Real-time):** Messaging and live-updating dashboard data use Firestore listeners.
- **NFR-4 (Performance):** Cold start to interactive < ~3s on mid-range devices; lists virtualized; images optimized/cached.
- **NFR-5 (Security & privacy):** Secure token storage (Keychain/Keystore); least-privilege data access; photos and personal data handled per Privacy Policy.
- **NFR-6 (Accessibility):** Support dynamic font sizes, sufficient contrast, and screen-reader labels on interactive elements.
- **NFR-7 (Observability):** Crash reporting and basic analytics (screen views, key events), consistent with existing analytics where feasible.
- **NFR-8 (Offline resilience):** Graceful handling of no-connectivity (cached reads where safe, clear retry states). Full offline sync is out of scope for MVP.
- **NFR-9 (Updatability):** Support Expo OTA updates (EAS Update) for JS-only fixes without a store review, where compliant.

---

## 5. Payments & In-App Purchase (IAP) Compliance Requirements

**Decision (MVP): Web-billing / external-purchase model — no in-app selling of digital subscriptions.**

- **PAY-1:** Clients **subscribe to and manage billing on the website** using the existing PayPal/Stripe flow (0% app-store commission).
- **PAY-2:** The app **must not** sell or upsell digital subscriptions using an embedded checkout or an embedded WebView presented as "not in-app." This pattern is against store policy and a common rejection cause.
- **PAY-3:** For non-subscribed/lower-tier users, the app shows an upsell that **links out to the website** to complete purchase, using the store-sanctioned **external-purchase link entitlement/disclosure** (Apple) and external-billing allowances (Google) where required.
- **PAY-4:** Clients who subscribed on the web and log in on mobile get full access with **no IAP** (purchase-elsewhere, consume-in-app is permitted).
- **PAY-5:** **In-person / physical training services** are exempt from IAP and may continue using any processor; however, session purchase UI is deferred (see §2.3) and, when built, will follow the same web-first approach for MVP.
- **PAY-6:** The app exposes **billing status view-only** (e.g., current tier/renewal) sourced from existing data; full management remains on web.
- **Rationale & references:** Mirrors and extends the reasoning in `applepay-googlepay-decision.md`. This keeps platform fees at the current processor rate, avoids the 15–30% store cut on digital goods, and stays compliant. A dedicated decision note will be produced during design.

---

## 6. Platform / Store Requirements

- **STORE-1 (Accounts):** Apple Developer Program ($99/yr) and Google Play Developer ($25 one-time) accounts.
- **STORE-2 (Builds):** Production builds via EAS (`.ipa` for iOS, `.aab` for Android). iOS build does not require a local Mac.
- **STORE-3 (Testing tracks):** TestFlight (iOS) and Play Console internal/closed testing (Android) for beta distribution.
- **STORE-4 (Privacy disclosures):** Apple Privacy "nutrition labels" and Google Play Data Safety form completed accurately for collected data (email, photos, health/fitness-related, usage).
- **STORE-5 (Legal URLs):** Public Privacy Policy URL and support URL provided in both listings.
- **STORE-6 (Reviewer access):** A demo/reviewer **client login** is provided so reviewers can access gated content.
- **STORE-7 (Push):** APNs (iOS) and FCM (Android) credentials configured for push.
- **STORE-8 (Minimum OS):** Support current−2 major OS versions (target confirmed during design; e.g., iOS 15+/Android 8+ as a starting assumption).
- **STORE-9 (Assets):** App icon, screenshots for required device sizes, descriptions, keywords, category, content rating.
- **STORE-10 (External-purchase compliance):** If §5 link-out is used, configure the required Apple external-purchase entitlement/disclosure and Google external-billing settings.

---

## 7. Assumptions

- **A-1:** The existing Firebase project(s) support a **staging environment** for app development/testing (a staging pattern already exists, e.g., `apphosting.staging.yaml`).
- **A-2:** Existing client-side data models are stable enough to reuse without schema changes for MVP.
- **A-3:** The team can procure Apple/Google developer accounts and a physical iOS and Android device for testing.
- **A-4:** Marketing/acquisition continues via the website; the app is distributed to existing/new clients who sign up on web.

---

## 8. Dependencies

- **D-1:** Firebase Auth, Firestore, Storage, Cloud Functions (existing).
- **D-2:** Expo + EAS (build, submit, update), Expo push service, FCM/APNs.
- **D-3:** Shared TypeScript logic package extracted from the web app.
- **D-4:** Existing notification Cloud Functions (`firebase/functions/notifications/*`) for push triggers.
- **D-5:** Existing legal pages (`/legal/privacy`, `/legal/terms`).

---

## 9. Open Questions

- **Q-1:** Confirm **minimum supported OS versions** for iOS and Android.
- **Q-2:** Should account **signup** be minimal in-app (then route to web for subscription), or fully link out to the web signup?
- **Q-3:** Which **crash reporting/analytics** stack (e.g., existing analytics vs. Sentry/Crashlytics)?
- **Q-4:** Confirm the **staging Firebase** target the app should point at during development.
- **Q-5:** Branding/design system parity — reuse web design tokens, or define a mobile-native visual language?
- **Q-6:** Do we want **"Learn" content** (blog/library) prioritized as the first post-MVP phase, or nutrition/goals?

---

## 10. Phasing (high-level, for context — detailed plan in `tasks.md`)

- **Phase 0 — Foundations:** Accounts, Expo/EAS scaffold, shared-logic package, Firebase wiring, auth on device.
- **Phase 1 — MVP:** The six MVP features (§2.1) + required supporting screens (§2.2), beta via TestFlight/Play internal, store submission and launch.
- **Phase 2 — Engagement expansion:** Nutrition, Goals, Check-ins, Tasks, Activity feed.
- **Phase 3 — Scheduling & content:** Sessions/scheduling, Resources, "Learn" content.
- **Phase 4 — Beyond client:** Trainer app / admin capabilities (if pursued).

---

### Next step
Review this `requirements.md`. Once approved, the next deliverables are `design.md` (architecture, shared-package boundaries, navigation, data/permission flows, payments decision note) and `tasks.md` (phased, checkbox task breakdown).
