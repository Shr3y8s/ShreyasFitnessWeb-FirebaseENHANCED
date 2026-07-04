# Sandbox Staging Setup — `sandbox.shrey.fit` (wallet testing)

> **Status:** Runbook → follow step by step
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-04
> **Why:** Google Pay & Apple Pay **cannot run on `localhost`** — PayPal's
> `GetGooglePayConfig` and Apple Pay both require a **real, registered HTTPS domain**.
> This sets up ONE shared sandbox domain (`sandbox.shrey.fit`) so you and your co-dev
> can test wallet buttons with **fake numbers** (no real charges), repeatably, from any
> browser — no tunnels, no per-laptop installs.
> **Related:** `applepay-googlepay-design.md` (§10 testing), `applepay-googlepay-decision.md`.

---

## 0. Mental model (read first — avoids the confusion we worked through)

- **You do NOT need a separate git branch.** App Hosting binds a backend to a branch,
  but **two backends can both track `main`**. The staging backend differs from prod
  ONLY by environment variables, provided via `app/apphosting.staging.yaml` (already in
  the repo).
- **You keep testing everything else locally** (local `npm run dev` frontend → the
  single **cloud** Firebase backend; you don't use emulators). This staging site is
  pulled out **only** for wallet buttons.
- **No backend/Functions changes.** The deployed Cloud Functions are already dual-env
  (`paypalWebhookSandbox` / `paypalWebhookLive`; callables pick env per request). The
  staging frontend sends `paypalEnv: 'sandbox'`, so it reuses the **same** sandbox
  credentials + webhook you already use in local dev.
- **Production `shrey.fit` is untouched** — separate backend, additive DNS record only.

**Net change:** 1 new config file (done) + 1 new App Hosting backend + 1 Porkbun DNS
record.

---

## 1. Prerequisites (verify once)

- [ ] Firebase CLI up to date: `npm i -g firebase-tools` (need a version that supports
      App Hosting environments / `--environment`; if yours doesn't, see the **Fallback**
      in §4).
- [ ] Logged in + correct project: `firebase login` then `firebase use shreyfitweb`.
- [ ] `app/apphosting.staging.yaml` exists in the repo (created 2026-07-04) with
      `NEXT_PUBLIC_PAYPAL_ENV=sandbox` + the **sandbox** client id + `NEXT_PUBLIC_APP_URL`.
- [ ] Sandbox PayPal secrets already set for Functions (they are — used by local dev):
      `PAYPAL_CLIENT_ID_SANDBOX`, `PAYPAL_CLIENT_SECRET_SANDBOX`, `PAYPAL_WEBHOOK_ID_SANDBOX`.
- [ ] Access to the **Porkbun** DNS for `shrey.fit`.

---

## 2. Commit the staging config to `main`

The staging backend reads `apphosting.staging.yaml` from the branch it tracks (`main`).

```
git add app/apphosting.staging.yaml docs/02-implementation/payment-processor/sandbox-staging-setup.md
git commit -m "chore(hosting): add sandbox staging App Hosting env override + runbook"
git push origin main
```

---

## 3. Create the staging App Hosting backend (Console — tracks `main`)

> **Use the Console, not the CLI, to create this backend.** On Firebase CLI v15.x the
> `firebase apphosting:backends:create` command has NO `--branch` or `--environment`
> flag (confirmed: its only options are `--app`, `--backend`, `--service-account`,
> `--primary-region`, `--root-dir`, `--runtime`). Branch binding + env config are done
> in the Console flow.

1. Firebase Console → **App Hosting** → **Create backend**.
2. Region: same as prod (e.g. `us-central1` / your existing region).
3. Connect the **same GitHub repo**; **Live branch: `main`** (same as prod — NOT a new
   branch).
4. Root directory: **`app`** (same as prod).
5. Name the backend e.g. `shreyfitweb-staging`. Create.

The first rollout builds `main`. It gets a default `*.web.app` / run URL first — you'll
set the sandbox env (§4) and add the custom domain (§5) next.

---

## 4. Set the SANDBOX env vars on the staging backend (primary method)

Because the CLI create can't bind an "environment", set the overrides **directly on the
staging backend** in the Console → your `shreyfitweb-staging` backend → **Settings →
Environment variables** (or **Edit configuration**). Add these three (they override the
production values baked into the base `apphosting.yaml`):

- `NEXT_PUBLIC_PAYPAL_ENV = sandbox`
- `NEXT_PUBLIC_PAYPAL_CLIENT_ID = AXP13FxA55KA3kK__Omtw717gTa8ot6Tkq-ZZde28A77Y_p7V_KrqyOdwVCHuK2rWVNYrofmxNCvuZYi`
- `NEXT_PUBLIC_APP_URL = https://sandbox.shrey.fit`

Set availability to **BUILD + RUNTIME** (these are `NEXT_PUBLIC_*`, compiled into the
client bundle at build time). Save, then trigger a rollout so the values take effect.

> **Why backend-level (not the committed file):** on this CLI version there's no
> environment-name binding, so App Hosting won't automatically merge
> `apphosting.staging.yaml`. Setting the vars on the backend is the reliable path and
> achieves the same result. The committed `app/apphosting.staging.yaml` remains as
> documentation of the intended sandbox values (and will auto-apply if you later adopt
> App Hosting environment naming).
>
> **⚠️ Do NOT put these sandbox values in the base `apphosting.yaml`** — that file is
> production (`shrey.fit`) and must stay `production` + live client id.


---

## 5. Add the custom domain `sandbox.shrey.fit` (Firebase gives you the DNS record)

1. In the **staging backend** → **Custom domains** → **Add domain** → enter
   `sandbox.shrey.fit`.
2. Firebase displays the **exact DNS record(s)** to create — account-specific. Typically:
   - An **A record** (host `sandbox`) → a Firebase IP, **or** a **CNAME** (host
     `sandbox`) → a Firebase target, and
   - Sometimes a **TXT** record for ownership verification.
   - **⚠️ Copy exactly what the wizard shows** — don't guess; the values are unique to
     your project.

---

## 6. Porkbun — add that one record (can start once §5 shows the values)

1. Porkbun → **Domain Management** → `shrey.fit` → **DNS Records / Edit**.
2. **Add** the record Firebase gave you:
   - **Type:** `A` (or `CNAME` — whatever Firebase specified)
   - **Host / Name:** `sandbox`
   - **Answer / Value:** the Firebase IP or target from §5
   - **TTL:** default (e.g. 600)
   - (+ the `TXT` verification record if Firebase asked, with the exact host/value shown)
3. **Do NOT modify** any existing `shrey.fit` / `www` records — you're only ADDING a
   `sandbox` subdomain record. Production DNS stays untouched.
4. Save.

---

## 7. Wait for DNS + automatic SSL

- DNS propagation: minutes to a few hours. Check with:
  `nslookup sandbox.shrey.fit` (should resolve to the Firebase target).
- Firebase auto-provisions a TLS cert once DNS resolves; the domain shows **Connected /
  Active** in the console. Then `https://sandbox.shrey.fit` is live.

---

## 8. Register the PayPal SANDBOX webhook (reuse existing)

You already use the sandbox webhook for local dev. Confirm it's registered in the
**PayPal Developer Dashboard (sandbox)** for your sandbox app, pointing at the deployed
`paypalWebhookSandbox` function URL. No change needed if it already exists — the staging
site uses the same Functions + webhook.

---

## 9. Deploy + verify Google Pay (fake numbers, no real charge)

1. Push to `main` (or trigger a rollout of the staging backend). Both prod + staging
   build the same code; staging uses sandbox env.
2. Open **`https://sandbox.shrey.fit/checkout?item=IN_PERSON`** in Chrome (signed into a
   normal Google account).
3. Expect the **"More ways to pay"** box to show **Google Pay** (alongside Venmo).
   - Google Pay runs in **TEST** mode (from `NEXT_PUBLIC_PAYPAL_ENV=sandbox`) → the
     sheet uses non-chargeable test cards.
4. Complete a purchase → it runs `createPaypalOrder` → Google Pay sheet →
   `confirmOrder` → `capturePaypalOrder` (all **sandbox**) → the
   `PAYMENT.CAPTURE.COMPLETED` sandbox webhook fulfills. **No real money moves.**
5. Verify fulfillment (session package credited) on the success page / dashboard.

### Google Pay acceptance checks (maps to applepay-googlepay tasks T2.5–T2.7)
- [ ] Google Pay renders on `sandbox.shrey.fit` (fake numbers).
- [ ] One-time IN_PERSON + IN_PERSON_4PACK complete + fulfill via existing paths.
- [ ] A discounted one-time (discount code) charges the server-set discounted amount.
- [ ] Card / PayPal / Pay Later / Venmo still work (no regression).

---

## 10. Apple Pay (later — Phase 2 T3/T4, same domain)

Apple Pay needs the SAME real domain **plus** file hosting + registration + a real Apple
device. On `sandbox.shrey.fit`:
1. Move the obtained file to
   `app/public/.well-known/apple-developer-merchantid-domain-association` (no extension);
   redeploy.
2. Verify
   `https://sandbox.shrey.fit/.well-known/apple-developer-merchantid-domain-association`
   returns **200** with exact content.
3. In the **PayPal sandbox dashboard**, register `sandbox.shrey.fit` as an Apple Pay web
   domain.
4. Test on a **real Apple device** (Safari on iPhone/Mac) signed into an **Apple Sandbox
   Tester** Apple ID with an Apple **sandbox test card** in Wallet → no real charge.

(For LIVE Apple Pay later, repeat the `.well-known` + domain registration on `shrey.fit`
in the PayPal **live** dashboard.)

---

## 11. Cost, safety, teardown

- **Cost:** the staging backend scales to zero when idle → ~$0 between test sessions.
- **Safety:** prod `shrey.fit` is a separate backend + untouched DNS; staging is sandbox
  only.
- **Teardown (optional):** if you stop needing it, delete the staging backend + the
  Porkbun `sandbox` record. The `apphosting.staging.yaml` file can stay in the repo.

---

## 12. Keeping staging in sync

- Both backends track `main`, so a normal `git push origin main` updates **both** (prod
  with prod env, staging with sandbox env). No merges/branches to manage.
- **Do not** put production PayPal values into `apphosting.staging.yaml`; it must stay
  sandbox.

---

## When would we ever need a real `staging` BRANCH? (future note)

Only if you later want to deploy **unmerged code** to a server for shared QA before it
hits `main`, or add CI promotion gates. That's a code-flow need, not an env need. For
today's goal (wallet testing = same code, sandbox env, real domain) a branch is
unnecessary — both backends track `main`.
