import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { pageMetadata } from '@/lib/seo';
import {
  ArrowRight,
  Scale,
  Sprout,
  CalendarCheck,
  Apple,
  Dumbbell,
  type LucideIcon,
} from 'lucide-react';

export const metadata: Metadata = pageMetadata({
  title: 'Blog',
  description:
    'Evidence-based fitness advice, practical training tips, and motivational content to help you on your fitness journey.',
  path: '/blog',
});


type Post = {
  href: string;
  date: string;
  title: string;
  excerpt: string;
  icon: LucideIcon;
};

const POSTS: Post[] = [
  {
    href: '/blog/control-first',
    date: 'June 10, 2026',
    title: 'The Control-First Approach Most Trainers Miss',
    excerpt:
      'Master control and proper form before chasing heavy weights. This approach builds better muscle connection, prevents injuries, and delivers superior results compared to the typical "lift heavy" mentality most trainers push.',
    icon: Sprout,
  },
  {
    href: '/blog/mind-muscle',
    date: 'May 22, 2026',
    title: 'Why I Never Let Clients Chase Numbers',
    excerpt:
      'Developing a strong mind-muscle connection is far more important than lifting heavy weights. Learn to feel each exercise in the target muscles rather than just moving weight from point A to point B.',
    icon: Dumbbell,
  },
  {
    href: '/blog/sustainable-approach',
    date: 'May 8, 2026',
    title: 'The Sustainable Approach I Learned After Years of Failure',
    excerpt:
      'Consistency with a "good enough" program you enjoy will always beat sporadic adherence to the "perfect" program you dread. Find workouts you actually look forward to rather than those that look impressive on paper.',
    icon: CalendarCheck,
  },
  {
    href: '/blog/nutrition-framework',
    date: 'April 20, 2026',
    title: "The 'Less Is More' Nutrition Framework",
    excerpt:
      'Simplify nutrition by focusing on a few key principles rather than complex rules. Prioritize protein, focus on whole foods, and follow the 80/20 rule for sustainable eating habits that don\'t require obsession.',
    icon: Apple,
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* Header */}
      <section className="pt-28 pb-8 md:pt-32">
        <div className="mx-auto max-w-5xl px-6">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">
            Welcome to my <span className="text-emerald-600">Fitness Journey</span> Blog!
          </h1>
          <div className="mt-4 h-1 w-20 rounded-full bg-emerald-600" />
          <p className="mt-5 max-w-2xl text-lg text-stone-600">
            Where I share evidence-based advice, practical tips, and motivational content to help you
            on your fitness journey. Whether you&apos;re just starting out or looking to take your
            fitness to the next level, you&apos;ll find valuable information here to support your
            goals.
          </p>
        </div>
      </section>

      {/* Featured Article */}
      <section className="pb-10">
        <div className="mx-auto max-w-5xl px-6">
          <Card className="gap-0 overflow-hidden border-emerald-600/30 bg-white py-0 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/50 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
            <CardContent className="grid gap-0 p-0 md:grid-cols-[240px_1fr]">
              <div className="relative flex min-h-[220px] items-center justify-center self-stretch bg-gradient-to-br from-emerald-600 to-teal-600 p-10">

                <Scale className="size-16 text-white/90" />
                <Badge className="absolute left-4 top-4 rounded-full bg-white/20 text-white">
                  Featured
                </Badge>
              </div>

              <div className="p-6 md:py-8 md:pr-8">
                <span className="text-sm font-medium text-emerald-700">June 25, 2026</span>
                <h2 className="mt-1 text-2xl font-bold text-stone-900">
                  The 40/60 Rule: Why What You Do Outside the Gym Matters Most
                </h2>
                <p className="mt-3 text-stone-600">
                  What if I told you that your workouts—even the most intense ones—account for only
                  about 40% of your results? After years of working with clients, I&apos;ve
                  discovered that what you do during the other 23 hours of your day matters more than
                  what you do during your workout hour.
                </p>
                <p className="mt-3 text-stone-600">
                  Learn how small daily choices about movement, food, and your environment have a
                  greater impact on your fitness results than your workouts alone, and how to optimize
                  the 60% that happens outside the gym.
                </p>
                <Button asChild className="mt-5 rounded-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href="/blog/forty-sixty-rule">
                    Read Full Article <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Blog Articles */}
      <section className="pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {POSTS.map((post) => (
              <Card
                key={post.href}
                className="group flex flex-col overflow-hidden border-emerald-600/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                  <post.icon className="size-12 text-emerald-600" />
                </div>
                <CardContent className="flex flex-1 flex-col p-6">
                  <span className="text-sm font-medium text-emerald-700">{post.date}</span>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">{post.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-stone-600">{post.excerpt}</p>
                  <Button
                    asChild
                    variant="outline"
                    className="mt-5 w-fit rounded-full border-emerald-600/40 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Link href={post.href}>
                      Read More <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
