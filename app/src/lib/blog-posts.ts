/**
 * Blog post metadata — single source of truth.
 *
 * Keyed by slug (the folder name under app/src/app/(marketing)/blog/<slug>/).
 * Consumed by:
 *   - the blog listing page (blog/page.tsx)
 *   - each post's `metadata` / Article JSON-LD
 *   - each post's dynamic opengraph-image
 *   - sitemap.ts (so new posts auto-appear)
 *
 * Growth & Acquisition — Phase 1 (shareability & SEO).
 */

export type BlogPostMeta = {
  /** URL slug (folder name). The path is `/blog/<slug>`. */
  slug: string;
  title: string;
  /** Short excerpt used for listing cards + meta description. */
  excerpt: string;
  /** Human-readable published date (also used for OG/JSON-LD). */
  date: string;
  /** ISO 8601 date for JSON-LD `datePublished` + sitemap `lastModified`. */
  isoDate: string;
  /** Whether this post is the featured (hero) article on the listing. */
  featured?: boolean;
};

/**
 * Ordered newest → oldest. `featured: true` marks the hero card.
 */
export const BLOG_POSTS: BlogPostMeta[] = [
  {
    slug: 'forty-sixty-rule',
    title: 'The 40/60 Rule: Why What You Do Outside the Gym Matters Most',
    excerpt:
      'Your workouts—even the most intense ones—account for only about 40% of your results. Learn how the other 60% (daily movement, food, and environment choices) drives your transformation.',
    date: 'June 25, 2026',
    isoDate: '2026-06-25',
    featured: true,
  },
  {
    slug: 'control-first',
    title: 'The Control-First Approach Most Trainers Miss',
    excerpt:
      'Master control and proper form before chasing heavy weights. This approach builds better muscle connection, prevents injuries, and delivers superior results compared to the typical "lift heavy" mentality.',
    date: 'June 10, 2026',
    isoDate: '2026-06-10',
  },
  {
    slug: 'mind-muscle',
    title: 'Why I Never Let Clients Chase Numbers',
    excerpt:
      'Developing a strong mind-muscle connection is far more important than lifting heavy weights. Learn to feel each exercise in the target muscles rather than just moving weight from point A to point B.',
    date: 'May 22, 2026',
    isoDate: '2026-05-22',
  },
  {
    slug: 'sustainable-approach',
    title: 'The Sustainable Approach I Learned After Years of Failure',
    excerpt:
      'Consistency with a "good enough" program you enjoy will always beat sporadic adherence to the "perfect" program you dread. Find workouts you actually look forward to.',
    date: 'May 8, 2026',
    isoDate: '2026-05-08',
  },
  {
    slug: 'nutrition-framework',
    title: "The 'Less Is More' Nutrition Framework",
    excerpt:
      'Simplify nutrition by focusing on a few key principles rather than complex rules. Prioritize protein, focus on whole foods, and follow the 80/20 rule for sustainable eating habits.',
    date: 'April 20, 2026',
    isoDate: '2026-04-20',
  },
];

/** Look up a single post's metadata by slug. */
export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
