import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { BLOG_POSTS } from '@/lib/blog-posts';
import { exerciseVideos } from '@/lib/exercise-videos';

/**
 * XML sitemap for the PUBLIC marketing surface only.
 *
 * Authenticated/transactional routes (dashboard, login, signup, checkout,
 * reset-password, unsubscribe, api, .well-known) are intentionally excluded.
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static public marketing routes.
  const staticRoutes: MetadataRoute.Sitemap = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/services', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/library', changeFrequency: 'weekly', priority: 0.7 },
    { path: '/blog', changeFrequency: 'weekly', priority: 0.8 },
    { path: '/faq', changeFrequency: 'monthly', priority: 0.6 },
    { path: '/connect', changeFrequency: 'monthly', priority: 0.6 },
  ].map((r) => ({
    url: absoluteUrl(r.path),
    lastModified: now,
    changeFrequency: r.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: r.priority,
  }));

  // Blog posts derived from the shared metadata map so new posts auto-appear.
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: absoluteUrl(`/blog/${post.slug}`),
    lastModified: new Date(post.isoDate),
    changeFrequency: 'yearly',
    priority: 0.6,
  }));

  // Per-video library pages (visible videos only) so each shareable video is
  // independently indexable. Mirrors the /library/[videoId] generateStaticParams.
  const libraryRoutes: MetadataRoute.Sitemap = exerciseVideos
    .filter((v) => !v.hidden)
    .map((v) => ({
      url: absoluteUrl(`/library/${v.videoId}`),
      lastModified: v.publishedAt ? new Date(v.publishedAt) : now,
      changeFrequency: 'yearly',
      priority: 0.5,
    }));

  return [...staticRoutes, ...blogRoutes, ...libraryRoutes];
}
