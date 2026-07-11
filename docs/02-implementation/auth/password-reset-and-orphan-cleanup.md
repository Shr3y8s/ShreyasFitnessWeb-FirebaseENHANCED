# Password Reset Eligibility & Orphaned-Account Cleanup

Status: Implemented
Owner: Auth
Last updated: 2026-07-10

## 1. Background & problem

This app uses **email/password as the primary credential** and **Google as a
LOGIN-ONLY method** (it must never create a brand-new account). A real,
onboarded account is defined by the presence of a **profile document** in one
of `admins/{uid}`, `trainers/{uid}`, or `users/{uid}` (waterfall lookup, mirrored
by `userHasProfile()` in `app/src/lib/firebase.ts`).

Because Firebase Auth creates an Auth user the moment a Google popup succeeds,
we can end up with a Firebase Auth user that has **no profile doc**. We call
these **orphans**.

### The reported bug

> "When I try to log in via email and — instead of entering a password — click
> *Continue with Google*, pick my account in the popup, the popup closes and the
> page just spins / gets stuck."

This is the orphan path on the **login** page: `signInWithPopup` authenticates
the Google user, but `userHasProfile()` returns false, so login refuses to
proceed. Historically this left a profile-less Google Auth user **owning the
email address**, producing a dead-end loop:

- Sign up → `auth/email-already-in-use` (the orphan owns it).
- Log in with password → fails (a Google-only user has no password credential).
- Forgot password → **used to silently "work"**, which is the deeper flaw below.

## 2. Two classes of orphan

| Type | How it's created | Has profile doc? | Providers | Cleaned by |
|------|------------------|------------------|-----------|------------|
| **Type-1** | User clicks *Continue with Google* on **login** (or abandons the Google step of signup) and never finishes onboarding | **No** | `google.com` only | Login-page immediate delete (best-effort) + reset-path reap + **scheduled auth sweep (new)** |
| **Type-2** | User completes email/password signup (profile doc written) but never pays → `accountActivated === false` | **Yes** | `password` (± `google.com`) | Existing Firestore-driven `cleanupPendingAccounts` (48h) |

Notes:

- The **login page already** attempts an immediate `result.user.delete()` for
  Type-1 (the Google credential is fresh, so delete is allowed). That is
  best-effort — it can fail with `auth/requires-recent-login`, leaving the
  orphan behind. The scheduled sweep is the safety net.
- A **completed Google signup is a real account** (it has a profile doc), so it
  is Google-only but is **NOT** an orphan and must never be swept.

## 3. The password-reset flaw (the real fix)

Firebase's `sendPasswordResetEmail` + `confirmPasswordReset` will, for a
**Google-only** account (real or orphan), **silently add a password credential**
when the reset link is completed. That means:

- Sending a reset link to a Google-only email is misleading (they never set a
  password) and, worse, **mutates the account** by bolting on a password
  credential the user never intended.
- For a Type-1 orphan the reset "succeeds" and cements a broken, profile-less
  account that can now log in but has nowhere to go.

Also relevant: **Email Enumeration Protection is ENABLED** in Firebase Auth.
That makes the client-side `fetchSignInMethodsForEmail` unreliable/empty, so we
**cannot** determine provider state safely on the client. We must use the
**Admin SDK** on the server.

### Rule we enforce

Gate password reset on the presence of a **`password` provider**:

- Has `password` provider → **eligible** → send the reset email.
- Google-only **with** profile → **not eligible** → tell them to use
  *Continue with Google*.
- Google-only **without** profile (Type-1 orphan) → **delete the orphan** to
  free the email, then treat as "no account / go sign up".
- No Auth user at all → behave as eligible-looking (send-nothing) to preserve
  enumeration protection (generic success), or return `ok` and let the normal
  send no-op. See implementation for exact response shape.

## 4. Solution overview

Four coordinated pieces:

1. **`checkResetEligibility` callable Cloud Function** (Admin SDK).
   The single source of truth for provider/profile state, since client-side
   enumeration is unreliable. Returns one of:
   - `ok` — a `password` provider exists → proceed with reset email.
   - `google_only` — Google-only **real** account (has profile) → nudge to Google.
   - `not_found` — no Auth user (generic; preserves enumeration protection).
   It also **reaps Type-1 orphans** immediately: if the email maps to a
   Google-only, profile-less user, it deletes that Auth user server-side and
   returns `not_found` (email is now free to sign up).

2. **Extend `cleanupPendingAccounts`** with a second **Type-1 auth sweep** pass
   (see §5). The existing Firestore-driven Type-2 pass is unchanged.

3. **`forgot-password/page.tsx`** — call `checkResetEligibility` first; only
   send the reset email on `ok`. On `google_only`, show a "use Continue with
   Google" nudge. On `not_found`, show the existing generic success/te sign-up
   guidance.

4. **`login/page.tsx`** — on invalid-credential, nudge the user toward
   *Continue with Google* (covers the "I have a Google-only account and typed a
   password" case).

## 5. Type-1 auth sweep (appended to `cleanupPendingAccounts`)

Type-1 orphans have **no `users` doc**, so the existing Firestore query cannot
see them. The new pass iterates **Firebase Auth itself**:

- Paginate `admin.auth().listUsers(1000, pageToken)` in a loop.
- Delete a user **only if all three** hold:
  1. **Google-only**: exactly one provider and it is `google.com` (never
     `password` → protects every real email user).
  2. **Older than 48h**: `creationTime` older than the same 48h window used by
     Type-2 (avoids racing an in-progress signup).
  3. **No profile doc**: `users/{uid}` does not exist (this is the definition
     of a Type-1 orphan; a completed Google signup has a profile doc and is
     skipped).
- Each delete is wrapped in try/catch and counted separately (`orphansDeleted`).

### Safety properties

- **Real Google accounts** (completed signup) are never touched — they have a
  profile doc (fails check #3).
- **Real email/password accounts** are never touched — they have a `password`
  provider (fails check #1).
- **In-flight signups** are never touched — the 48h window (check #2).
- Per-user `users/{uid}` `.get()` is cheap at current volume; can be optimized
  later if the user base grows large.

### Relationship to the reset-path reap

The reset path reaps a Type-1 orphan **immediately** (good UX). The scheduled
sweep is the **safety net** guaranteeing every Type-1 orphan is gone within
~48–72h even if nobody triggers a reset. They are complementary, not redundant.

## 6. Case matrix

| Scenario | Providers | Profile? | Reset page result | Login page | Swept? |
|----------|-----------|----------|-------------------|-----------|--------|
| Real email/password user | `password` | Yes | `ok` → send email | normal | No |
| Real Google user (completed signup) | `google.com` | Yes | `google_only` → Google nudge | Google works | No |
| Type-1 orphan (login-only Google) | `google.com` | No | orphan deleted → `not_found` | invalid-cred nudge → sign up | Yes (safety net) |
| Type-2 pending (unpaid email signup) | `password` | Yes (`accountActivated:false`) | `ok` → send email | normal | Type-2 pass (48h) |
| Unknown email | none | — | `not_found` (generic) | invalid-cred | n/a |

## 7. Files touched

- `firebase/functions/index.js`
  - **new** `exports.checkResetEligibility` (onCall, Admin SDK).
  - **extend** `exports.cleanupPendingAccounts` with the Type-1 auth-sweep pass;
    return `{ success, accountsDeleted, orphansDeleted }`.
- `app/src/lib/firebase.ts`
  - **new** `checkResetEligibility(email)` typed `httpsCallable` wrapper.
- `app/src/app/forgot-password/page.tsx`
  - gate send on `checkResetEligibility`; add `google_only` nudge UI.
- `app/src/app/login/page.tsx`
  - invalid-credential → nudge toward *Continue with Google*.

## 8. Manual test matrix

1. **Password user** → forgot-password → receives reset email; reset works.
2. **Real Google user** → forgot-password → sees "use Continue with Google",
   no email sent; account unchanged (no password credential added).
3. **Type-1 orphan** → forgot-password → orphan deleted; can now sign up with
   the same email. Also: run the scheduled job → orphan (if >48h) is swept.
4. **Unknown email** → forgot-password → generic success/sign-up guidance; no
   account mutated.
5. **Login with Google (orphan)** → no infinite spinner; clear message to sign
   up with the same email.
6. **Sweep safety** → confirm a real Google user (<or >48h) and a real password
   user are NEVER deleted by the job.
