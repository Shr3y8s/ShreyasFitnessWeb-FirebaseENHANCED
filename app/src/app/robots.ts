import type { MetadataRoute } from 'next';
import { absoluteUrl, isProductionSite } from '@/lib/seo';

/**
 * robots.txt — allow crawling of the public marketing surface, disallow
 * authenticated/transactional routes, and point crawlers at the sitemap.
 *
 * On any NON-production origin (e.g. the sandbox.shrey.fit staging backend),
 * we return a blanket `Disallow: /` so search engines never crawl or index
 * the sandbox (which would otherwise create duplicate content and leak the
 * staging environment). Production emits the normal allow/disallow rules.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */

export default function robots(): MetadataRoute.Robots {
  // Non-production (staging/preview): block everything.
  if (!isProductionSite()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/login',
          '/signup',
          '/checkout',
          '/forgot-password',
          '/reset-password',
          '/unsubscribe',
          '/api/',
          '/.well-known/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}


