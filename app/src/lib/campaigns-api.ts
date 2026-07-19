// Marketing Campaigns — client API (Phase 1).
//
// Admin-only wrappers over the campaign callables in
// firebase/functions/campaigns/ plus direct Firestore reads for the list/detail
// views. All campaign collections are admin-only from the client (see
// firestore.rules); sending + unsubscribe writes happen server-side.
//
// See docs/02-implementation/marketing-campaigns/design.md.

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { functions, db } from '@/lib/firebase';
import type {
  Campaign,
  CampaignRecipient,
  CampaignDraftInput,
  RecipientInput,
} from '@/types/campaigns';

// ── Callables ──────────────────────────────────────────────────────────────

async function call<T>(name: string, payload: Record<string, unknown> = {}): Promise<T> {
  const fn = httpsCallable(functions, name);
  const res = await fn(payload);
  return res.data as T;
}

/** Send a single test email of a draft campaign to the given address. */
export async function sendCampaignTest(
  campaignId: string,
  testEmail: string,
): Promise<{ ok: boolean }> {
  return call('sendCampaignTest', { campaignId, toEmail: testEmail });
}

/** Kick off the full send for a campaign. Returns per-recipient tallies. */
export async function sendCampaign(
  campaignId: string,
): Promise<{ ok: boolean; sentCount: number; failedCount: number; suppressedCount: number }> {
  return call('sendCampaign', { campaignId });
}

/** A discount code option for the campaign editor's code pickers. */
export interface DiscountCodeOption {
  code: string;
  active: boolean;
  discountScope?: string;
  type?: string;
  value?: number;
}

/**
 * Fetch the admin's discount codes (via the admin-gated `listDiscountCodes`
 * callable) for the campaign editor's code dropdowns. Returns ACTIVE codes only,
 * sorted alphabetically. Fail-soft: returns [] on any error so the editor still
 * works (the admin can always fall back to typing a code).
 */
export async function listActiveDiscountCodes(): Promise<DiscountCodeOption[]> {
  try {
    const data = await call<{ codes?: DiscountCodeOption[] }>('listDiscountCodes', {});
    return (data.codes || [])
      .filter((c) => c && c.code && c.active)
      .sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return [];
  }
}


/**
 * Render a campaign exactly as a recipient would see it, without sending.
 * Pass a saved `campaignId` and/or an inline `draft` (to preview unsaved edits).
 * Returns the rendered subject + HTML.
 */
export async function previewCampaign(args: {
  campaignId?: string;
  draft?: CampaignDraftInput;
}): Promise<{ subject: string; html: string }> {
  return call('previewCampaign', {
    campaignId: args.campaignId,
    draft: args.draft,
  });
}


// ── Firestore reads/writes (admin-only via rules) ────────────────────────────

const CAMPAIGNS = 'campaigns';

/** List all campaigns, newest first. */
export async function listCampaigns(): Promise<Campaign[]> {
  const q = query(collection(db, CAMPAIGNS), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Campaign, 'id'>) }));
}

/** Fetch a single campaign by id. */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  const ref = doc(db, CAMPAIGNS, campaignId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Campaign, 'id'>) };
}

/** List a campaign's recipients. */
export async function listRecipients(campaignId: string): Promise<CampaignRecipient[]> {
  const q = query(collection(db, CAMPAIGNS, campaignId, 'recipients'), orderBy('email', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CampaignRecipient, 'id'>) }));
}

/** Resolve the CTA target to a site path. */
function resolveCtaUrl(target?: string): string {
  return target === 'services' ? '/services' : '/signup';
}

/**
 * Create a new draft campaign. Returns the generated campaign id.
 * The document is created directly (admin-gated by rules); the send engine
 * is only invoked later via `sendCampaign`.
 */
export async function createCampaign(input: CampaignDraftInput, createdBy?: string): Promise<string> {
  const ref = doc(collection(db, CAMPAIGNS));
  const payload: Record<string, unknown> = {
    name: input.name,
    status: 'draft',
    mode: input.mode,
    subject: input.subject,
    discountCode: input.discountCode || '',
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    createdBy: createdBy || '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (input.mode === 'template' && input.template) {
    payload.template = input.template;
    payload.ctaUrl = resolveCtaUrl(input.template.ctaTarget);
  }
  if (input.mode === 'html' && input.rawHtml) {
    payload.rawHtml = input.rawHtml;
  }
  await setDoc(ref, payload);
  return ref.id;
}

/** Update an existing draft campaign (only allowed while status === 'draft'). */
export async function updateCampaign(
  campaignId: string,
  input: CampaignDraftInput,
): Promise<void> {
  const ref = doc(db, CAMPAIGNS, campaignId);
  const payload: Record<string, unknown> = {
    name: input.name,
    mode: input.mode,
    subject: input.subject,
    discountCode: input.discountCode || '',
    updatedAt: serverTimestamp(),
  };
  if (input.mode === 'template' && input.template) {
    payload.template = input.template;
    payload.ctaUrl = resolveCtaUrl(input.template.ctaTarget);
  }
  if (input.mode === 'html' && input.rawHtml) {
    payload.rawHtml = input.rawHtml;
  }
  await setDoc(ref, payload, { merge: true });
}

/**
 * Simple djb2 hash → hex. Matches the server-side recipient id scheme so the
 * same email always maps to the same recipient doc (idempotent list builds).
 */
function emailHash(email: string): string {
  let h = 5381;
  const s = email.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/**
 * Replace a campaign's recipient list. Writes one doc per recipient using a
 * deterministic hash id so duplicate emails collapse. Also updates
 * recipientCount on the campaign.
 */
export async function setRecipients(
  campaignId: string,
  recipients: RecipientInput[],
): Promise<number> {
  // De-dupe by lowercased email.
  const seen = new Set<string>();
  const unique: RecipientInput[] = [];
  for (const r of recipients) {
    const key = r.email.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...r, email: key });
  }

  for (const r of unique) {
    const id = emailHash(r.email);
    const ref = doc(db, CAMPAIGNS, campaignId, 'recipients', id);
    await setDoc(
      ref,
      {
        id,
        email: r.email,
        name: r.name || '',
        source: r.source,
        // Per-recipient discount code (optional). Always written so re-pasting a
        // list WITHOUT a code for someone clears any stale code on their doc.
        discountCode: r.discountCode || '',
        status: 'pending',
      },
      { merge: true },
    );
  }


  await setDoc(
    doc(db, CAMPAIGNS, campaignId),
    { recipientCount: unique.length, updatedAt: serverTimestamp() },
    { merge: true },
  );

  return unique.length;
}

/** Parse a pasted block of emails (comma / newline / semicolon separated). */
export function parseEmailList(raw: string): RecipientInput[] {
  // Recipients are separated by commas / semicolons / newlines. An optional
  // per-recipient discount code can be appended after a pipe: "… | CODE".
  // (The pipe is unambiguous — commas/semicolons already delimit recipients
  // and angle brackets wrap the email.)
  const parts = raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: RecipientInput[] = [];
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const part of parts) {
    // Split off an optional trailing "| CODE" first, so the code never
    // interferes with name/email parsing.
    let entry = part;
    let discountCode: string | undefined;
    const pipeIdx = entry.indexOf('|');
    if (pipeIdx !== -1) {
      const codeRaw = entry.slice(pipeIdx + 1).trim();
      entry = entry.slice(0, pipeIdx).trim();
      if (codeRaw) discountCode = codeRaw.toUpperCase();
    }

    // Support "Name <email@x.com>" and bare "email@x.com".
    const match = entry.match(/^(.*?)<([^>]+)>$/);
    if (match) {
      const name = match[1].trim();
      const email = match[2].trim();
      if (emailRe.test(email)) {
        out.push({ email, name: name || undefined, source: 'pasted', discountCode });
      }
    } else if (emailRe.test(entry)) {
      out.push({ email: entry, source: 'pasted', discountCode });
    }
  }
  return out;
}


/** Best-effort millis extraction from a Firestore Timestamp-ish value. */
export function tsToMillis(v: unknown): number | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toMillis();
  const anyV = v as { toMillis?: () => number; seconds?: number };
  if (typeof anyV.toMillis === 'function') return anyV.toMillis();
  if (typeof anyV.seconds === 'number') return anyV.seconds * 1000;
  return null;
}
