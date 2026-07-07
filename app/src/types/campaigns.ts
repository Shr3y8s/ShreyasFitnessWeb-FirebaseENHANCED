/**
 * Marketing Campaigns — shared TypeScript types (Phase 1).
 *
 * Mirrors the Firestore model in
 * docs/02-implementation/marketing-campaigns/design.md §3.
 *
 * All collections are admin-only from the client (see firestore.rules); the
 * send engine + unsubscribe writes happen server-side via the Admin SDK.
 */

/** Campaign lifecycle status. */
export type CampaignStatus = "draft" | "sending" | "sent" | "failed";

/** Content authoring mode. */
export type CampaignMode = "template" | "html";

/** Per-recipient delivery status. */
export type RecipientStatus = "pending" | "sent" | "failed" | "suppressed";

/** Where a recipient came from when the list was built. */
export type RecipientSource = "pasted" | "client";

/** Launch-template CTA target (resolved to a site path at render time). */
export type CtaTarget = "signup" | "services";

/** The guided "Launch Template" content block. */
export interface CampaignTemplate {
  /** Big headline at the top of the email. */
  headline: string;
  /** Body copy (plain text / lightweight markup). */
  body: string;
  /** Discount code shown in the highlighted block (as pasted). */
  discountCode?: string;
  /** Expiry date shown next to the code (ISO string or display string). */
  expiryDate?: string;
  /** CTA button label. */
  ctaLabel: string;
  /** CTA button destination. */
  ctaTarget: CtaTarget;
}

/** A campaign document: `campaigns/{campaignId}`. */
export interface Campaign {
  id: string;
  /** Internal name (required). */
  name: string;
  status: CampaignStatus;
  mode: CampaignMode;
  /** Email subject line. */
  subject: string;
  /** Present when `mode === "template"`. */
  template?: CampaignTemplate;
  /** Present when `mode === "html"`. */
  rawHtml?: string;
  /** Referenced discount code (as pasted); shown in template block. */
  discountCode?: string;
  /** Resolved CTA target path (`/signup` or `/services`). */
  ctaUrl?: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  /** Admin uid that created the campaign. */
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  sentAt?: unknown;
}

/** A recipient document: `campaigns/{id}/recipients/{recipientId}`. */
export interface CampaignRecipient {
  /** Deterministic hash of the lowercased email (doc id + this field). */
  id: string;
  /** Lowercased email address. */
  email: string;
  /** Optional display name for personalization. */
  name?: string;
  source: RecipientSource;
  status: RecipientStatus;
  /** Last error message (when status === "failed"). */
  error?: string;
  /** Signed unsubscribe token embedded in this recipient's email. */
  unsubscribeToken?: string;
  sentAt?: unknown;
}

/** A suppression document: `emailSuppression/{emailHash}`. */
export interface SuppressionEntry {
  /** Lowercased email (kept for admin readability). */
  email: string;
  /** `unsubscribe` in Phase 1; `bounce`/`complaint` later. */
  reason: "unsubscribe" | "bounce" | "complaint";
  /** Origin campaign, if known. */
  campaignId?: string;
  createdAt?: unknown;
}

/** Draft payload used by the admin editor when creating/updating a campaign. */
export interface CampaignDraftInput {
  name: string;
  mode: CampaignMode;
  subject: string;
  template?: CampaignTemplate;
  rawHtml?: string;
  discountCode?: string;
}

/** A parsed/validated recipient entry from the paste box or client select. */
export interface RecipientInput {
  email: string;
  name?: string;
  source: RecipientSource;
}
