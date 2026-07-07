# Marketing Campaigns — Requirements

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-06
> **Feature:** Marketing Campaigns (email)
> **Related:** `admin-notifications/design.md`, `email-notifications/design.md`,
> `payment-processor/discount-codes-design.md`, `client-activity-feed-*`

---

## 1. Background & Problem

Shrey.Fit is beta testing and soft-launching. There is currently **no way to
proactively reach a list of people by email** to invite them to explore the
services and join. The owner wants to:

1. Send a **branded invite email** to a set of email addresses (compiled outside
   the app, or selected from existing clients).
2. Attach a **time-limited discount code** (e.g. a launch special) so recipients
   have a clear, urgent reason to act.
3. Re-run this pattern for future promotions (Thanksgiving, New Year, Black
   Friday, etc.).

The app already has the key building blocks: **Resend** email delivery
(`notifications@shrey.fit`, reply-to `support@shrey.fit`) with a template pattern
and fail-soft Cloud Function helpers; a full **discount-code system** with an
admin UI at `/dashboard/admin/discount-codes`; a **lead pool** in
`contact_form_submissions`; and an established **admin dashboard + sidebar**
pattern.

## 2. Vision

An admin-managed **Campaigns** capability: create a campaign, choose its
recipients (pasted list and/or selected existing clients), compose its content
(a guided **launch template** or **raw pasted HTML**), reference a discount code
created in the existing discount UI, preview and test-send, then dispatch a
throttled, fail-soft batch through Resend. Every send is **CAN-SPAM compliant**
(physical address + one-click unsubscribe) and honors a **suppression list**.
Later phases add reusable/seasonal templates, scheduling, open/click analytics,
and lifecycle automation.

## 3. Scope

### Phase 1 — Launch Email Campaign (MVP)

**In scope:**
- Admin **Campaigns** section (`/dashboard/admin/campaigns`): list, create/edit,
  preview, test-send, send.
- Two content modes:
  - **Launch Template** — guided fields (headline, body, discount code, expiry,
    CTA label + target) rendered into a branded, mobile-friendly HTML email.
  - **Custom HTML** — paste arbitrary HTML authored elsewhere; the system wraps
    it and injects the required compliance footer.
- Recipients from **two sources**, merged and de-duplicated:
  - A **pasted list** (comma/newline separated), validated (regex +
    disposable-domain + typo suggestion parity with the connect form).
  - **Selected existing clients** (multi-select from user records).
- **Discount code**: a text field where the admin pastes a code created in
  `/dashboard/admin/discount-codes`, with a live existence/active validation
  lookup (read-only — no inline creation).
- **UTM tagging** on CTA links (`utm_source=email`, `utm_campaign=<id>`).
- **Send engine**: an admin-only callable that batches through Resend with
  throttling, filters suppressed addresses, and records per-recipient
  `sent|failed` status plus campaign-level counts. Fail-soft per recipient.
- **Test send** to an arbitrary address before the real blast.
- **Compliance**: physical mailing address + **one-click unsubscribe** in every
  email; a public **unsubscribe page**; a **suppression list** enforced on send.
- Admin visibility: sent/failed counts and per-recipient status.

**Out of scope (Phase 1):**
- Open / click / bounce / complaint tracking (Phase 3).
- Scheduling future sends (Phase 2).
- Reusable/seasonal template library (Phase 2).
- Automated lifecycle / drip sequences (Phase 4).
- SMS.

### Later Phases (outlined; detailed when scheduled)
- **Phase 2 — Templates & Scheduling:** seasonal template library, scheduled
  sends, saved audience segments.
- **Phase 3 — Deliverability & Analytics:** Resend webhooks (open/click/bounce/
  complaint), campaign analytics dashboard, discount-redemption attribution,
  auto-suppression on hard bounce/complaint.
- **Phase 4 — Lifecycle Automation:** welcome drip, abandoned-signup/checkout
  nudges, win-back for canceled subscriptions, re-engagement for inactive
  clients, referral program, milestone/PR celebration emails.

## 4. User Stories & Acceptance Criteria (Phase 1)

### US-1 — Create a campaign
As an admin, I can create a campaign with a name and choose a content mode.
- **AC-1.1** I can create a `draft` campaign with a required internal name.
- **AC-1.2** I can choose **Launch Template** or **Custom HTML** mode.
- **AC-1.3** Drafts persist and can be edited before sending.

### US-2 — Compose content
As an admin, I can compose the email in either mode.
- **AC-2.1** Launch Template: I can edit headline, body, discount code, expiry
  date, CTA label, and CTA target (`/signup` or `/services`); output is a
  branded, mobile-friendly HTML email.
- **AC-2.2** Custom HTML: I can paste raw HTML; the system wraps it and appends
  the compliance footer (address + unsubscribe) automatically.
- **AC-2.3** A live **preview** renders the final email (including footer).

### US-3 — Choose recipients
As an admin, I can build the recipient list from two sources.
- **AC-3.1** I can paste emails separated by commas/newlines.
- **AC-3.2** Invalid, disposable, and duplicate addresses are flagged/removed;
  the final valid count is shown.
- **AC-3.3** I can multi-select existing clients to add them.
- **AC-3.4** Addresses on the suppression list are excluded and reported.

### US-4 — Attach a discount code
As an admin, I can reference an existing discount code.
- **AC-4.1** I can paste a discount code string.
- **AC-4.2** The UI validates existence/active status (read-only lookup) and
  warns if the code is missing, inactive, or expired — but does not block send.

### US-5 — Test and send
As an admin, I can verify then dispatch.
- **AC-5.1** I can send a **test** email to an address of my choosing.
- **AC-5.2** Sending shows a confirmation with the final recipient count.
- **AC-5.3** The batch is throttled to respect Resend rate limits.
- **AC-5.4** One recipient failure never aborts the batch (fail-soft).
- **AC-5.5** After completion the campaign shows `sent`/`failed` counts and each
  recipient's status.

### US-6 — Compliance & unsubscribe
As a recipient, I can opt out easily; as the business, we stay compliant.
- **AC-6.1** Every email footer contains a physical mailing address and a
  one-click unsubscribe link with a signed token.
- **AC-6.2** Visiting the unsubscribe link adds the address to the suppression
  list and shows a confirmation page (no login required).
- **AC-6.3** Suppressed addresses are skipped on all subsequent sends.

### US-7 — Access control
- **AC-7.1** Only admin users can view/create/send campaigns.
- **AC-7.2** The send/test operations are enforced server-side as admin-only.
- **AC-7.3** The unsubscribe endpoint is public but token-scoped to a single
  recipient/address.

## 5. Non-Functional Requirements
- **Fail-soft:** send operations never crash the batch on a single failure.
- **Idempotency:** re-sending a `sent` campaign is guarded (explicit re-send or
  send-to-failed-only, never silent duplicate blasts).
- **Rate limiting:** batched with throttling to stay within Resend limits.
- **Privacy:** suppression records store a hash of the email where practical;
  recipient PII is limited to what's needed to send.
- **Consistency:** reuse existing Resend config, admin sidebar, and UI
  components/patterns.

## 6. Compliance Notes (CAN-SPAM)
- Accurate `From`/reply-to (already configured).
- Clear identification of the message as a promotion where applicable.
- Valid physical postal address in the footer.
- Conspicuous, working one-click unsubscribe honored promptly.
- No sending to addresses that have unsubscribed.
