/**
 * Social share helpers — UTM tagging + per-network share URLs.
 *
 * Single source of truth for building shareable, campaign-tagged links so every
 * "Share this" affordance across the marketing site emits consistent UTM params
 * that Phase 3 (GA4 conversion tracking) can attribute back to a channel.
 *
 * Growth & Acquisition — Phase 2 (social presence & launch), task Track B.1.
 * See docs/02-implementation/growth-acquisition/requirements.md (US-4 / AC-4.1).
 */

import { absoluteUrl } from './seo';

/** Supported share networks (plus `copy` for the copy-link affordance). */
export type ShareNetwork = 'linkedin' | 'x' | 'facebook' | 'copy';

/** UTM parameters attached to an outbound share link. */
export type UtmParams = {
  source: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
};

/**
 * Append `utm_*` params to a URL. Existing params are preserved; existing
 * `utm_*` keys are overwritten so callers stay authoritative.
 */
export function withUtm(url: string, utm: UtmParams): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', utm.source);
  if (utm.medium) u.searchParams.set('utm_medium', utm.medium);
  if (utm.campaign) u.searchParams.set('utm_campaign', utm.campaign);
  if (utm.content) u.searchParams.set('utm_content', utm.content);
  if (utm.term) u.searchParams.set('utm_term', utm.term);
  return u.toString();
}

/**
 * Per-network UTM source strings. `medium` is `social` and `campaign` defaults
 * to `share_button` so organic shares are distinguishable from paid/email.
 */
const NETWORK_SOURCE: Record<Exclude<ShareNetwork, 'copy'>, string> = {
  linkedin: 'linkedin',
  x: 'x',
  facebook: 'facebook',
};

/**
 * Build the canonical, UTM-tagged destination URL for a page being shared.
 *
 * @param path       Root-relative path being shared (e.g. `/blog/foo`).
 * @param network    The network the link is destined for (drives utm_source).
 * @param campaign   Optional campaign label (defaults to `share_button`).
 */
export function shareTargetUrl(
  path: string,
  network: ShareNetwork,
  campaign = 'share_button',
): string {
  const source = network === 'copy' ? 'copy_link' : NETWORK_SOURCE[network];
  return withUtm(absoluteUrl(path), {
    source,
    medium: 'social',
    campaign,
  });
}

/**
 * Build the network's share-intent URL (the popup/compose URL) that wraps the
 * UTM-tagged destination. For `copy`, returns the bare tagged destination.
 */
export function shareIntentUrl(params: {
  path: string;
  network: ShareNetwork;
  title?: string;
  /** X/Twitter @handle to attribute via `via=` (without the leading @). */
  via?: string;
  campaign?: string;
}): string {
  const { path, network, title = '', via, campaign } = params;
  const target = shareTargetUrl(path, network, campaign);

  switch (network) {
    case 'linkedin':
      // LinkedIn derives title/summary from the destination's OG tags.
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        target,
      )}`;
    case 'x': {
      const u = new URL('https://twitter.com/intent/tweet');
      u.searchParams.set('url', target);
      if (title) u.searchParams.set('text', title);
      if (via) u.searchParams.set('via', via.replace(/^@/, ''));
      return u.toString();
    }
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        target,
      )}`;
    case 'copy':
    default:
      return target;
  }
}
