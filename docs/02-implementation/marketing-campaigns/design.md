# Marketing Campaigns — Design

> **Status:** Draft → ready for implementation
> **Owner:** Shrey.Fit (shreyfitweb / shrey.fit)
> **Created:** 2026-07-06
> **Related:** `requirements.md`, `admin-notifications/design.md`,
> `email-notifications/design.md`, `payment-processor/discount-codes-design.md`

---

## 1. Overview

Phase 1 delivers an admin-managed email campaign tool. The admin composes a
campaign (guided **Launch Template** or **Custom HTML**), attaches a discount
code reference, builds a recipient list (pasted + selected clients), previews,
test-sends, then dispatches a throttled, fail-soft batch via Resend. Every email
carries a compliance footer (physical address + one-click unsubscribe). A public
unsubscribe endpoint writes to a suppression list enforced on every send.

The design deliberately mirrors existing patterns:
- **Email:** Resend, `notifications@shrey.fit`, reply-to `support@shrey.fit`
  (see `admin-notifications.js`).
- **Templates:** a `build()`-style module returning `{ subject, html, text }`
  (see `admin-templates.js` / `templates.js`).
- **Admin callables + admin UI + sidebar** (see discount-codes feature).

## 2. Architecture

```
Admin UI (/dashboard/admin/campaigns)
   │  create/edit draft (Firestore write via admin SDK-guarded rules)
   │  validate discount code (read via existing discounts API)
   │  test send  ─────────────► sendCampaignTest (callable, admin-only)
   │  send       ─────────────► sendCampaign     (callable, admin-only)
   ▼
Firestore
   campaigns/{id}
   campaigns/{id}/recipients/{rid}
   emailSuppression/{emailHash}
   ▲
   │ sendCampaign: load recipients → filter suppressed → batch+throttle → Resend
   │               → write per-recipient status → update counts → status=sent
   ▼
Resend  ──► recipient inbox (footer: address + unsubscribe link w/ signed token)
                                   │ click
                                   ▼
Public route /unsubscribe?token=… ──► unsubscribe callable/route → emailSuppression
```

## 3. Data Model (Firestore)

### 3.1 `campaigns/{campaignId}`
| Field | Type | Notes |
|-------|------|-------|
| `name` | string | Internal name (required). |
| `status` | string | `draft` \| `sending` \| `sent` \| `failed`. |
| `mode` | string | `template` \| `html`. |
| `subject` | string | Email subject line. |
| `template` | map? | Launch-template fields (see 3.2). Present when `mode=template`. |
| `rawHtml` | string? | Pasted HTML. Present when `mode=html`. |
| `discountCode` | string? | Referenced code (as pasted). |
| `ctaUrl` | string? | Resolved CTA target (`/signup` or `/services`). |
| `recipientCount` | number | Total recipients queued. |
| `sentCount` | number | Successfully sent. |
| `failedCount` | number | Failed. |
| `createdBy` | string | Admin uid. |
| `createdAt` / `updatedAt` / `sentAt` | Timestamp | Lifecycle. |

### 3.2 `campaigns/{id}.template` (map)
`headline`, `body` (plain text / lightweight markup), `discountCode`,
`expiryDate` (string/Timestamp), `ctaLabel`, `ctaTarget` (`signup`|`services`).

### 3.3 `campaigns/{id}/recipients/{recipientId}`
| Field | Type | Notes |
|-------|------|-------|
| `email` | string | Lowercased. |
| `name` | string? | For personalization (selected clients / optional). |
| `source` | string | `pasted` \| `client`. |
| `status` | string | `pending` \| `sent` \| `failed` \| `suppressed`. |
| `error` | string? | Last error message. |
| `unsubscribeToken` | string | Signed token embedded in this recipient's email. |
| `sentAt` | Timestamp? | |

`recipientId` = deterministic hash of the lowercased email, so the same address
can't be double-added within one campaign (natural de-dup).

### 3.4 `emailSuppression/{emailHash}`
| Field | Type | Notes |
|-------|------|-------|
| `email` | string | Lowercased (kept for admin readability). |
| `reason` | string | `unsubscribe` (Phase 1); `bounce`/`complaint` later. |
| `campaignId` | string? | Origin campaign, if known. |
| `createdAt` | Timestamp | |

`emailHash` = SHA-256 of the lowercased email (doc id).

## 4. Cloud Functions

All callables verify `context.auth` + admin role (same guard used by other admin
callables). Resend key is read from the existing bound secret/env
(`RESEND_API_KEY`) the way `admin-notifications.js` receives it.

### 4.1 `sendCampaignTest` (callable, admin-only)
Input: `{ campaignId, toEmail }`. Renders the campaign email (with a throwaway
unsubscribe token) and sends a single message to `toEmail`. Returns
`{ ok, error? }`. Does not touch recipient docs or counts.

### 4.2 `sendCampaign` (callable, admin-only)
Input: `{ campaignId, mode?: 'all' | 'failed' }` (default `all`).
1. Load campaign; refuse if not `draft`/`failed` unless `mode='failed'`.
2. Set `status=sending`.
3. Load recipient docs (from the subcollection, written by the client during
   compose, or created here from the campaign's stored lists).
4. For each recipient, in throttled batches (e.g. N per second):
   - Skip + mark `suppressed` if the email is in `emailSuppression`.
   - Render the email with that recipient's `unsubscribeToken` + personalization.
   - Send via Resend; on success mark `sent`+`sentAt`, on error mark `failed`
     with `error`. **Never throw** out of the loop.
5. Update `sentCount`/`failedCount`; set `status=sent` (or `failed` if all
   failed). Fail-soft throughout.

Returns `{ sentCount, failedCount, suppressedCount }`.

### 4.3 Unsubscribe handling
Public Next.js route `GET /unsubscribe?token=…` (App Router) or a lightweight
callable. It verifies the signed token (HMAC over the email + campaignId using a
server secret), writes `emailSuppression/{sha256(email)}`, and renders a simple
confirmation page. Idempotent (re-visits are safe). No auth required.

## 5. Template & Rendering

New module `firebase/functions/campaigns/campaign-templates.js` exporting
`renderCampaign(campaign, recipient, { unsubscribeUrl }) -> { subject, html, text }`.

- **Launch template**: a branded, table-based, mobile-friendly HTML layout
  (inline styles for email-client compatibility) consistent with existing
  transactional emails — logo/wordmark, headline, body, a highlighted
  **discount code + expiry** block, and a prominent CTA button. CTA href gets
  UTM params appended: `?utm_source=email&utm_campaign=<campaignId>&utm_medium=campaign`.
- **Custom HTML**: the pasted `rawHtml` is used as the body; the shared wrapper
  adds `<head>` boilerplate and the compliance **footer** is always appended.
- **Footer (both modes)**: business name, physical mailing address, and the
  unsubscribe link. Never omitted.
  - **Interim address (pre-launch):** `Shrey.Fit, 12904 NE 203rd Ct,
    Woodinville, WA 98072`. This is a home address used only during beta/soft
    launch and **must be replaced with an official business address before
    going live.** Store it as a single config constant (see §7) so it is
    changed in exactly one place.
- **Plain-text**: a text fallback is generated for both modes.

## 6. Frontend

### 6.1 Routes / pages
- `app/src/app/dashboard/admin/campaigns/page.tsx` — list (name, status,
  recipients, sent/failed, date; "New Campaign" button).
- `app/src/app/dashboard/admin/campaigns/[id]/page.tsx` — create/edit:
  - Content mode toggle (Template / Custom HTML).
  - Template fields form OR raw HTML textarea.
  - Discount code input with live validation badge (reuses discounts read API).
  - Recipients builder: paste box (validated/de-duped, shows counts) + client
    multi-select; suppressed/invalid reported.
  - Preview pane (renders final HTML incl. footer).
  - Test-send input + button; Send button with confirm dialog.
- Public: `app/src/app/unsubscribe/page.tsx` — confirmation UI.

### 6.2 Sidebar
Add a **Campaigns** item to `AdminSidebar.tsx` (Marketing group), linking to
`/dashboard/admin/campaigns`.

### 6.3 Client-side validation
Reuse the connect-form stack: regex, `disposable-email-domains`, and `mailcheck`
typo suggestions so pasted lists are cleaned before send.

### 6.4 API/lib
`app/src/lib/campaigns-api.ts` — CRUD helpers (Firestore), discount-code
validation lookup, and callable wrappers (`sendCampaign`, `sendCampaignTest`).

## 7. Security Rules
- `campaigns/**` and `emailSuppression/**`: **admin read/write only** from the
  client; server (admin SDK) bypasses. Mirror the discount-codes rules block.
- Unsubscribe writes to `emailSuppression` happen **server-side** (route/callable
  with the admin SDK), so clients never write suppression directly.
- Send/test callables enforce admin role server-side (defense in depth).

## 8. Analytics
- CTA UTM params enable attribution via the existing `AnalyticsListener`.
- Optional GA4 events on send success/failure (consistent with discount-code
  analytics), deferred if not trivial.

## 9. Idempotency & Safety
- Recipient doc ids are email-hash based → no duplicates within a campaign.
- `sendCampaign` refuses to re-blast a `sent` campaign unless `mode='failed'`
  (retry only the failed recipients).
- Suppression is checked at send time, so a late unsubscribe before a retry is
  honored.

## 10. Out of Scope (deferred)
Open/click/bounce tracking + webhooks (Phase 3), scheduling (Phase 2), seasonal
template library (Phase 2), lifecycle automation + referral (Phase 4).
