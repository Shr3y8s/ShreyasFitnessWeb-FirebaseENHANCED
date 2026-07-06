import Link from 'next/link';
import Image from 'next/image';
import { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Lightbulb,
  Star,
} from 'lucide-react';

interface BlogPostProps {
  title: string;
  date: string;
  children: ReactNode;
  nextPost?: { href: string; title: string };
  prevPost?: { href: string; title: string };
  relatedPosts: Array<{
    href: string;
    title: string;
    description: string;
    icon: ReactNode;
  }>;
}

export function BlogPost({ title, date, children, nextPost, prevPost, relatedPosts }: BlogPostProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* Header */}
      <header className="pt-28 pb-8 md:pt-32">
        <div className="mx-auto max-w-3xl px-6">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
          >
            <ArrowLeft className="size-4" /> Back to Blog
          </Link>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-stone-900 sm:text-4xl">
            {title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-stone-600">
            <div className="flex items-center gap-2">
              <span className="size-9 overflow-hidden rounded-full">
                <Image
                  src="/assets/Shreyas-profile.jpg"
                  alt="Shreyas Annapureddy"
                  width={40}
                  height={40}
                  className="size-full object-cover"
                />
              </span>
              <span>By Shreyas Annapureddy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="size-4 text-emerald-600" />
              <span>{date}</span>
            </div>
          </div>
          <div className="mt-6 h-px w-full bg-emerald-600/15" />
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 pb-20">
        <article
          className="space-y-5 text-lg leading-relaxed text-stone-700
            [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-stone-900
            [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-stone-900
            [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ul]:marker:text-emerald-600
            [&_strong]:font-semibold [&_strong]:text-stone-900
            [&_a]:text-emerald-700 [&_a]:underline"
        >
          {children}
        </article>

        {/* Post Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-emerald-600/15 pt-6">
          {prevPost ? (
            <Link
              href={prevPost.href}
              className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
            >
              <ArrowLeft className="size-4" /> Previous Article
            </Link>
          ) : (
            <span />
          )}
          {nextPost && (
            <Link
              href={nextPost.href}
              className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
            >
              Next Article <ArrowRight className="size-4" />
            </Link>
          )}
        </div>

        {/* Related Posts */}
        <div className="mt-14">
          <h3 className="text-xl font-bold text-stone-900">Related Articles</h3>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPosts.map((post, index) => (
              <Link
                key={index}
                href={post.href}
                className="group flex flex-col overflow-hidden rounded-xl border border-emerald-600/20 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <div className="flex h-24 items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 [&_svg]:size-10">
                  {post.icon}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-stone-900">{post.title}</h4>
                  <p className="mt-1 text-sm text-stone-600">{post.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BlogSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 [&_svg]:size-5 [&_i]:text-lg">
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-stone-900">{title}</h2>
      </div>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  );
}

export function ProTip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5">
      <h4 className="mb-2 flex items-center gap-2 font-semibold text-amber-800">
        <Lightbulb className="size-5" /> Pro Tip
      </h4>
      <div className="text-stone-700">{children}</div>
    </div>
  );
}

export function KeyTakeaway({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-emerald-600 bg-emerald-50 p-5">
      <h4 className="mb-2 flex items-center gap-2 font-semibold text-emerald-800">
        <CheckCircle2 className="size-5" /> Key Takeaway
      </h4>
      <div className="text-stone-700">{children}</div>
    </div>
  );
}

export function SummaryBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-600/25 bg-white p-5 shadow-sm">
      <h4 className="mb-2 flex items-center gap-2 font-semibold text-stone-900">
        <Star className="size-5 text-emerald-600" /> In a Nutshell
      </h4>
      <div className="text-stone-700">{children}</div>
    </div>
  );
}

export function PullQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote className="border-l-4 border-emerald-600 bg-emerald-50/50 py-4 pl-6 pr-4 text-xl font-medium italic text-stone-800">
      {children}
    </blockquote>
  );
}
