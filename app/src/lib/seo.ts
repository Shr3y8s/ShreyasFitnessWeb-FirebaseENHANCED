/**
 * SEO / site metadata — single source of truth.
 *
 * Holds the canonical origin, brand identity, default social copy, and social
 * profile links used across metadata, sitemap, robots, and JSON-LD.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 * See docs/02-implementation/growth-acquisition/phase1-shareability-seo-design.md
 */

/**
 * Canonical absolute origin, e.g. "https://shrey.fit".
 * Read from NEXT_PUBLIC_SITE_URL (falls back to NEXT_PUBLIC_APP_URL, then the
 * production domain) so a missing var never breaks the build. Staging sets this
 * to the sandbox origin so previews don't emit production canonicals.
 */
const RAW_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  'https://shrey.fit';

// Normalize: strip any trailing slash so URL joins are predictable.
const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

export const SITE = {
  url: SITE_URL,
  name: 'SHREY.FIT',
  shortName: 'SHREY.FIT',
  /**
   * Default meta description / OG description used when a page sets none.
   * Kept under ~125 chars so social previews (FB/LinkedIn/X) don't truncate it,
   * while still front-loading the primary keywords.
   */
  description:
    'Personal training & fitness coaching — a sustainable, control-first approach for real strength and lasting habits.',
  /** Light, non-spammy keyword set for the site default. */
  keywords: [
    'personal training',
    'fitness coaching',
    'online coaching',
    'strength training',
    'nutrition coaching',
    'sustainable fitness',
  ],
  locale: 'en_US',
  /**
   * Social profile URLs for Organization/Person JSON-LD `sameAs`.
   * These confirm to search engines that these accounts belong to this brand.
   */
  sameAs: [
    'https://www.youtube.com/@shreyasfit',
    'https://www.instagram.com/shreyfitness',
    'https://www.linkedin.com/company/shreyfit',
    'https://x.com/SHREY_FIT',
    'https://www.facebook.com/Shrey.Fit',
    'https://www.tiktok.com/@shrey.fit',
  ] as string[],

  /** Twitter/X @handle for twitter:site. */
  twitterHandle: '@SHREY_FIT' as string | undefined,

  /** Brand logo (absolute path resolved via metadataBase). */
  logo: '/assets/logo.svg',
} as const;

/** Build an absolute URL from a path using the canonical origin. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, SITE.url).toString();
}

/** True when running against the production canonical origin. */
export function isProductionSite(): boolean {
  return SITE.url === 'https://shrey.fit';
}

/**
 * Organization JSON-LD for the brand (site-wide).
 * `sameAs` is omitted when no profiles are confirmed yet.
 */
export function organizationJsonLd(): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    description: SITE.description,
  };
  if (SITE.sameAs.length > 0) {
    data.sameAs = SITE.sameAs;
  }
  return data;
}

/**
 * WebSite JSON-LD (site-wide). Enables the site name in search results.
 */
export function webSiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
  };
}

/**
 * Build per-page Next.js Metadata with a canonical URL and OpenGraph/Twitter
 * cards derived from the site defaults. Title flows through the root layout's
 * `%s | SHREY.FIT` template, so pass the bare page title.
 */
export function pageMetadata(params: {
  title: string;
  description?: string;
  path: string;
  /** Absolute-or-root-relative image path for social cards. */
  imagePath?: string;
}): import('next').Metadata {
  const { title, description = SITE.description, path, imagePath } = params;
  const canonical = path;
  const ogImages = imagePath ? [{ url: absoluteUrl(imagePath) }] : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      title: `${title} | ${SITE.name}`,
      description,
      url: absoluteUrl(path),
      locale: SITE.locale,
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE.name}`,
      description,
      ...(SITE.twitterHandle ? { site: SITE.twitterHandle } : {}),
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
  };
}

/**
 * Person + ProfessionalService JSON-LD for the coach/business.
 *
 * Emitted on the Connect page (the primary conversion page). Models the coach
 * as a `Person` and the offering as a `ProfessionalService` so search engines
 * can associate the individual trainer with the service and its area served.
 * `sameAs` is omitted until brand/personal profiles are confirmed.
 */
export function personalTrainerServiceJsonLd(): Record<string, unknown>[] {
  const person: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE.url}/#coach`,
    name: 'Shrey',
    jobTitle: 'Personal Trainer & Fitness Coach',
    url: SITE.url,
    image: absoluteUrl('/assets/Shreyas-profile.jpg'),
    worksFor: { '@id': `${SITE.url}/#business` },
  };
  if (SITE.sameAs.length > 0) {
    person.sameAs = SITE.sameAs;
  }

  const service: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': `${SITE.url}/#business`,
    name: SITE.name,
    url: SITE.url,
    logo: absoluteUrl(SITE.logo),
    image: absoluteUrl(SITE.logo),
    description: SITE.description,
    priceRange: '$$',
    areaServed: [
      { '@type': 'Place', name: 'Seattle, WA' },
      { '@type': 'Country', name: 'United States' },
    ],
    serviceType: [
      'Personal Training',
      'Online Fitness Coaching',
      'Strength Training',
      'Nutrition Coaching',
    ],
    founder: { '@id': `${SITE.url}/#coach` },
    employee: { '@id': `${SITE.url}/#coach` },
  };
  if (SITE.sameAs.length > 0) {
    service.sameAs = SITE.sameAs;
  }

  return [person, service];
}

/** Article / BlogPosting JSON-LD for a blog post. */


export function articleJsonLd(params: {
  title: string;
  description: string;
  path: string;
  datePublished?: string;
  imagePath?: string;
  authorName?: string;
}): Record<string, unknown> {
  const {
    title,
    description,
    path,
    datePublished,
    imagePath,
    authorName = 'Shrey',
  } = params;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': absoluteUrl(path),
    },
    author: {
      '@type': 'Person',
      name: authorName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE.name,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(SITE.logo),
      },
    },
  };
  if (datePublished) data.datePublished = datePublished;
  if (imagePath) data.image = absoluteUrl(imagePath);
  return data;
}
