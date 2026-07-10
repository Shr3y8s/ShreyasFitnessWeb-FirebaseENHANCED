// src/lib/attribution.ts
//
// Lightweight marketing-attribution helper (Growth & Acquisition, Phase 3).
//
// Captures UTM parameters (+ gclid) from the landing URL and persists them so
// that later conversion events (connect_form_submit, signup_start,
// signup_complete, checkout_complete) and the records they create
// (contact_form_submissions, users/{uid}) can be attributed back to the channel
// that drove the visit.
//
// PRIVACY: We only ever store campaign/source metadata — NEVER any PII. UTM
// values come from our own share links (built in Phase 2) and inbound ad/social
// links, so they are safe, non-personal identifiers.
//
// TWO WINDOWS:
//   • First-touch (localStorage, 30-day TTL) — the VERY FIRST way a visitor
//     found us. Never overwritten once set, so credit survives later navigation
//     (e.g. they arrive via LinkedIn, browse, leave, come back direct, convert →
//     LinkedIn still gets first-touch credit).
//   • Last-touch (sessionStorage) — the most recent campaign for this session.
//
// SSR-safe: every accessor guards `typeof window` and swallows storage errors
// (Safari private mode, disabled storage) so it can be imported anywhere.

const FIRST_TOUCH_KEY = 'shreyfit_attribution_first';
const LAST_TOUCH_KEY = 'shreyfit_attribution_last';
const FIRST_TOUCH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** The UTM fields we recognise, plus Google Ads' gclid. */
export interface Attribution {
  source?: string; // utm_source   e.g. "linkedin"
  medium?: string; // utm_medium   e.g. "social"
  campaign?: string; // utm_campaign e.g. "soft_launch"
  term?: string; // utm_term
  content?: string; // utm_content
  gclid?: string; // Google Ads click id
}

/** Attribution + the timestamp it was first captured (first-touch record). */
interface StoredAttribution extends Attribution {
  capturedAt: number; // epoch ms
}

const UTM_PARAM_MAP: Record<string, keyof Attribution> = {
  utm_source: 'source',
  utm_medium: 'medium',
  utm_campaign: 'campaign',
  utm_term: 'term',
  utm_content: 'content',
  gclid: 'gclid',
};

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Parse recognised attribution params out of a query string. */
function parseAttribution(search: string): Attribution {
  const params = new URLSearchParams(search);
  const attr: Attribution = {};
  for (const [param, key] of Object.entries(UTM_PARAM_MAP)) {
    const value = params.get(param);
    if (value) {
      // Trim + cap length to keep values sane; these are non-PII campaign tags.
      attr[key] = value.trim().slice(0, 100);
    }
  }
  return attr;
}

function hasAnyValue(attr: Attribution): boolean {
  return Object.values(attr).some((v) => !!v);
}

function readStored(key: string): StoredAttribution | null {
  if (!isBrowser()) return null;
  try {
    const storage = key === FIRST_TOUCH_KEY ? window.localStorage : window.sessionStorage;
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

function writeStored(key: string, value: StoredAttribution): void {
  if (!isBrowser()) return;
  try {
    const storage = key === FIRST_TOUCH_KEY ? window.localStorage : window.sessionStorage;
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode / disabled) — attribution is best-effort.
  }
}

/**
 * Read UTM/gclid params from the CURRENT URL and persist them.
 *
 * Called on every route change from <AnalyticsListener>. Safe to call
 * repeatedly and on pages with no UTM params (it no-ops when nothing is
 * present).
 *
 *   • First-touch: written ONLY if there is no un-expired first-touch already.
 *   • Last-touch:  overwritten every time new UTM params appear.
 */
export function captureUtmFromUrl(): void {
  if (!isBrowser()) return;

  const attr = parseAttribution(window.location.search);
  if (!hasAnyValue(attr)) return; // Nothing to capture on this page.

  const now = Date.now();
  const record: StoredAttribution = { ...attr, capturedAt: now };

  // Last-touch always reflects the latest campaign for the session.
  writeStored(LAST_TOUCH_KEY, record);

  // First-touch is sticky: only set it if empty or expired.
  const existingFirst = readStored(FIRST_TOUCH_KEY);
  const expired = !existingFirst || now - existingFirst.capturedAt > FIRST_TOUCH_TTL_MS;
  if (expired) {
    writeStored(FIRST_TOUCH_KEY, record);
  }
}

/**
 * Return the stored attribution to attach to events / records.
 *
 * Prefers first-touch (the original discovery channel); falls back to
 * last-touch, then an empty object. The returned shape is flat and JSON-safe so
 * it can be spread directly into a `trackEvent` payload or a Firestore doc.
 */
export function getAttribution(): Attribution {
  const first = readStored(FIRST_TOUCH_KEY);
  if (first && hasAnyValue(first)) {
    const { capturedAt: _capturedAt, ...attr } = first;
    return attr;
  }
  const last = readStored(LAST_TOUCH_KEY);
  if (last && hasAnyValue(last)) {
    const { capturedAt: _capturedAt, ...attr } = last;
    return attr;
  }
  return {};
}

/**
 * Firestore-friendly attribution map. Returns `null` when there is no
 * attribution so callers can omit the field entirely rather than writing an
 * empty object (Firestore treats missing vs. empty differently in queries).
 */
export function getAttributionForRecord(): Attribution | null {
  const attr = getAttribution();
  return hasAnyValue(attr) ? attr : null;
}
