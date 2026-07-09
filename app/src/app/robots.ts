import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/**
 * robots.txt — allow crawling of the public marketing surface, disallow
 * authenticated/transactional routes, and point crawlers at the sitemap.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */

export default function robots(): MetadataRoute.Robots {
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
