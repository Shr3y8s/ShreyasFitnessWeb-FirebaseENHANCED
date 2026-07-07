# Marketing Campaigns — Tasks

> **Status:** Phase 1 build complete → pending QA & launch

> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-06
> **Related:** `requirements.md`, `design.md`

Legend: `[ ]` todo · `[x]` done. Phase 1 is broken into buildable steps; later
phases are outlined and will be detailed when scheduled.

---

## Phase 1 — Launch Email Campaign (MVP)

### 1. Data & Rules
- [x] 1.1 Add Firestore security rules for `campaigns/**` (admin-only client access).
- [x] 1.2 Add Firestore security rules for `emailSuppression/**` (admin read; no client writes).
- [x] 1.3 Add composite indexes if needed (campaigns list ordering, recipients by status).
- [x] 1.4 Define TS types (`app/src/types/campaigns.ts`): `Campaign`, `CampaignRecipient`, `SuppressionEntry`.

### 2. Backend — Templates & Rendering
- [x] 2.1 Create `firebase/functions/campaigns/campaign-templates.js` with `renderCampaign()`.
- [x] 2.2 Build the branded Launch Template layout (inline styles, mobile-friendly, discount+expiry block, CTA button).
- [x] 2.3 Implement Custom HTML wrapper (head boilerplate + always-on footer).
- [x] 2.4 Implement shared compliance footer (business name, physical address, unsubscribe link).
- [x] 2.5 Append UTM params to CTA links.
- [x] 2.6 Generate plain-text fallback for both modes.

### 3. Backend — Send Engine
- [x] 3.1 Create `firebase/functions/campaigns/send-campaign.js` (admin-only callables).
- [x] 3.2 Implement `sendCampaignTest({ campaignId, toEmail })`.
- [x] 3.3 Implement `sendCampaign({ campaignId, mode })` with throttled batching.
- [x] 3.4 Suppression check per recipient (skip + mark `suppressed`).
- [x] 3.5 Per-recipient fail-soft status writes + campaign count updates.
- [x] 3.6 Idempotency guard (no re-blast of `sent` unless `mode='failed'`).
- [x] 3.7 Wire signed unsubscribe token generation (HMAC over email + campaignId).
- [x] 3.8 Export callables from `firebase/functions/index.js`.

### 4. Backend — Unsubscribe
- [x] 4.1 Implement token verification helper (shared with send engine).
- [x] 4.2 Implement server-side suppression write (route handler or callable, admin SDK).
- [x] 4.3 Ensure idempotency + safe re-visits.

### 5. Frontend — Admin UI
- [x] 5.1 Add **Campaigns** item to `AdminSidebar.tsx`.
- [x] 5.2 Create `campaigns-api.ts` (CRUD, discount lookup, callable wrappers).
- [x] 5.3 Build list page `/dashboard/admin/campaigns` (search, status-grouped sections, pagination + New Campaign).
- [x] 5.4 Build create/edit page `/dashboard/admin/campaigns/[id]`:
  - [x] 5.4.1 Content mode toggle (Template / Custom HTML).
  - [x] 5.4.2 Launch template fields form.
  - [x] 5.4.3 Custom HTML textarea.
  - [x] 5.4.4 Discount code input + live validation badge (reuse discounts read API).
  - [x] 5.4.5 Recipients builder: paste box (validate/de-dup, counts) + client multi-select.
  - [x] 5.4.6 Preview pane (final HTML incl. footer).
  - [x] 5.4.7 Test-send control.
  - [x] 5.4.8 Send button + confirmation dialog (final count).
- [x] 5.5 Reuse connect-form validation stack (regex, disposable-domains, mailcheck).

### 6. Frontend — Public Unsubscribe
- [x] 6.1 Create public `/unsubscribe` page with confirmation UI.
- [x] 6.2 Handle success/invalid-token/already-unsubscribed states.


### 7. Compliance & Config
- [x] 7.1 Confirm/park the physical mailing address to display in footer.
  - **Interim (pre-launch):** `Shrey.Fit, 12904 NE 203rd Ct, Woodinville, WA 98072` (home address).
  - [ ] 7.1a **Before go-live:** replace with an official business address (single config constant).
- [ ] 7.2 Add unsubscribe-signing secret to functions config/env.
- [ ] 7.3 Verify Resend `From`/reply-to and domain are production-ready.

### 8. QA & Launch
- [ ] 8.1 Test-send both modes to a personal inbox; verify rendering on mobile + desktop.
- [ ] 8.2 Verify unsubscribe flow end-to-end (link → suppression → excluded on resend).
- [ ] 8.3 Verify de-dup, invalid/disposable filtering, and suppressed exclusion counts.
- [ ] 8.4 Verify fail-soft (inject a bad address; batch completes; failed count correct).
- [ ] 8.5 Verify admin-only access (non-admin blocked client + server side).
- [ ] 8.6 Send the real launch campaign. 🚀

---

## Phase 2 — Templates & Scheduling (outlined)
- [ ] Seasonal template library (Thanksgiving, New Year, Black Friday, etc.).
- [ ] Scheduled sends (send at a future date/time).
- [ ] Saved audience segments (reusable recipient lists).

## Phase 3 — Deliverability & Analytics (outlined)
- [ ] Resend webhooks: open, click, bounce, complaint.
- [ ] Auto-suppression on hard bounce / complaint.
- [ ] Campaign analytics dashboard (sent/open/click/unsub rates).
- [ ] Discount-redemption attribution per campaign.

## Phase 4 — Lifecycle Automation (outlined)
- [ ] Welcome drip for new signups.
- [ ] Abandoned-signup / abandoned-checkout nudges.
- [ ] Win-back for canceled subscriptions.
- [ ] Re-engagement for inactive clients.
- [ ] Referral program emails.
- [ ] Milestone / PR celebration emails.
