'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Flag,
  Dumbbell,
  Medal,
  ClipboardList,
  TrendingUp,
  DollarSign,
  HelpCircle,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* FAQ data — edit answers here. `popular` flags the "Most Asked" badge. */
/* JSX answers keep links/emphasis; search matches on `keywords` + question. */
/* ------------------------------------------------------------------ */
type FAQItem = {
  q: string;
  a: React.ReactNode;
  keywords: string;
  popular?: boolean;
};
type FAQCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  items: FAQItem[];
};

const FAQ_DATA: FAQCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Flag,
    items: [
      {
        q: 'How do I get started with training?',
        keywords: 'start begin sign up consultation onboarding assessment',
        a: (
          <>
            <p className="font-semibold text-emerald-800">
              Getting started doesn&apos;t have to be overwhelming — I&apos;ve made the process simple.
            </p>
            <p>
              The first step is scheduling a{' '}
              <Link href="/connect#schedule-content" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                free consultation
              </Link>{' '}
              where I&apos;ll answer your questions about services and pricing and we&apos;ll see if we&apos;re a good fit.
            </p>
            <p>
              After you sign up for a package or membership, we&apos;ll schedule a comprehensive assessment to review your
              health history, set goals, and build your personalized program.
            </p>
            <p>
              <strong>Ready?</strong>{' '}
              <Link href="/connect#schedule-content" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                Schedule your free consultation today.
              </Link>
            </p>
          </>
        ),
      },
      {
        q: 'Do I need to be fit already to start training?',
        keywords: 'beginner fitness level experience new out of shape',
        a: (
          <>
            <p className="font-semibold text-emerald-800">No fitness experience required!</p>
            <p>
              I specialize in working with people at all fitness levels, including complete beginners. Every program
              meets you exactly where you are and progresses at a pace that&apos;s right for you.
            </p>
          </>
        ),
      },
      {
        q: 'What happens during the comprehensive assessment?',
        keywords: 'assessment evaluation first session intake health history',
        a: (
          <p>
            After you sign up, we&apos;ll schedule a comprehensive assessment of about 60 minutes. It includes a detailed
            discussion of your health history, fitness background, specific goals, and lifestyle so I can tailor your plan.
          </p>
        ),
      },
      {
        q: 'What should I wear and bring to my training sessions?',
        keywords: 'wear bring clothing shoes water towel equipment',
        a: (
          <p>
            Wear comfortable athletic clothing and supportive shoes appropriate for your workout. Bring a water bottle, a
            small towel, and any specific equipment we&apos;ve discussed (for home training).
          </p>
        ),
      },
    ],
  },
  {
    id: 'training',
    title: 'Training Information',
    icon: Dumbbell,
    items: [
      {
        q: 'Where do in-person sessions take place?',
        keywords: 'location gym seattle home in-person where',
        a: (
          <p>
            I offer training at partnered gyms throughout the Seattle area, as well as home training for clients with
            basic equipment. We&apos;ll determine the exact location during your consultation based on your preferences
            and proximity.
          </p>
        ),
      },
      {
        q: 'What equipment do I need for online coaching?',
        keywords: 'equipment online coaching home gym minimal',
        a: (
          <p>
            Equipment needs vary based on your goals and what you have access to. I can design programs using minimal or
            no equipment, or for fully-equipped home or commercial gyms.
          </p>
        ),
      },
      {
        q: 'How often will we meet for training?',
        keywords: 'frequency how often sessions per week schedule',
        a: (
          <p>
            Frequency depends on your goals, availability, and budget. Most clients see the best results with 2–3
            sessions per week, but I offer flexible scheduling options.
          </p>
        ),
      },
    ],
  },
  {
    id: 'services',
    title: 'Services & Specialties',
    icon: Medal,
    items: [
      {
        q: 'Do you offer nutrition planning?',
        keywords: 'nutrition diet meal plan eating macros',
        a: (
          <>
            <p className="font-semibold text-emerald-800">Yes!</p>
            <p>
              Nutrition is a crucial part of reaching your goals, and I provide practical guidance that works with your
              lifestyle. My approach builds sustainable habits rather than restrictive diets.
            </p>
          </>
        ),
      },
      {
        q: 'Do you work with clients who have injuries or medical conditions?',
        keywords: 'injury injuries medical condition rehab cleared doctor',
        a: (
          <p>
            Yes, as long as you&apos;ve been cleared for exercise by your healthcare provider. Please share any health
            concerns during our initial consultation so I can program safely around them.
          </p>
        ),
      },
    ],
  },
  {
    id: 'policies',
    title: 'Policies & Logistics',
    icon: ClipboardList,
    items: [
      {
        q: 'What is your cancellation policy?',
        keywords: 'cancellation cancel session 24 hours notice fee',
        a: (
          <p>
            I require 24 hours&apos; notice for session cancellations. Sessions cancelled with less notice may be subject
            to a fee. Emergencies happen, so exceptions can be made on a case-by-case basis.
          </p>
        ),
      },
      {
        q: 'How are payments handled?',
        keywords: 'payment paypal venmo card credit debit billing secure',
        a: (
          <p>
            Payments are processed securely through PayPal, which lets you pay with major credit and debit cards or your
            PayPal/Venmo account — you don&apos;t need a PayPal account to check out with a card. One-time session
            packages are paid at purchase, and memberships are billed monthly. We never store your full card number.
          </p>
        ),
      },
      {
        q: 'Can I pause or cancel my membership anytime?',
        keywords: 'pause cancel membership subscription month-to-month contract',
        a: (
          <p>
            Yes. Memberships are month-to-month with no long-term contract. You can <strong>pause</strong> for 1–3 months
            or <strong>cancel</strong> anytime from your profile under &quot;Account &amp; Data Management.&quot; When you
            cancel, you keep access until the end of your current billing period, and you can re-subscribe later. See our{' '}
            <Link href="/legal/terms" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              Terms of Service
            </Link>{' '}
            for details.
          </p>
        ),
      },
      {
        q: 'What is your refund policy?',
        keywords: 'refund money back cancel prorate session credits',
        a: (
          <p>
            Memberships are billed for the current period and aren&apos;t prorated when you cancel, and session packages
            expire 60 days after purchase. If you delete your account, up to two unused, non-expired session credits may
            be refunded at the rate you paid. We also handle billing errors and unauthorized charges in good faith. Full
            details are in our{' '}
            <Link href="/legal/terms" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              Terms of Service
            </Link>
            , or email{' '}
            <a href="mailto:billing@shrey.fit" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              billing@shrey.fit
            </a>
            .
          </p>
        ),
      },
      {
        q: 'Is my personal and health information private?',
        keywords: 'privacy data security health information gdpr ccpa delete',
        a: (
          <p>
            Absolutely. Your information is encrypted, shared only with your assigned coach, and never sold. You can
            access, export, or delete your data anytime from your profile. Learn more in our{' '}
            <Link href="/legal/privacy" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              Privacy Policy
            </Link>{' '}
            or email{' '}
            <a href="mailto:privacy@shrey.fit" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              privacy@shrey.fit
            </a>
            .
          </p>
        ),
      },
    ],
  },
  {
    id: 'results',
    title: 'Results & Expectations',
    icon: TrendingUp,
    items: [
      {
        q: 'How quickly will I see results?',
        keywords: 'results how fast quickly timeline progress',
        a: (
          <>
            <p className="font-semibold text-emerald-800">Every fitness journey is unique.</p>
            <p>
              Your results depend on your starting point, goals, consistency, and genetics. We&apos;ll track metrics
              beyond appearance so you can see progress clearly and stay motivated throughout your journey.
            </p>
          </>
        ),
      },
      {
        q: 'What kind of results can I expect?',
        keywords: 'results expect benefits energy sleep strength confidence',
        a: (
          <p>
            Beyond physical changes, clients typically experience improved energy, better sleep, enhanced mood, increased
            strength and endurance, better posture, reduced pain, and greater confidence.
          </p>
        ),
      },
    ],
  },
  {
    id: 'pricing',
    title: 'Pricing & Packages',
    icon: DollarSign,
    items: [
      {
        q: 'What do your services cost?',
        keywords: 'cost price pricing how much packages plans',
        popular: true,
        a: (
          <>
            <p className="font-semibold text-emerald-800">
              All new clients receive a{' '}
              <Link href="/connect#schedule-content" className="underline underline-offset-2 hover:text-emerald-900">
                free consultation
              </Link>{' '}
              where I&apos;ll walk you through pricing for the option that fits you best.
            </p>
            <p>I offer three ways to work together:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>In-Person Training:</strong> pay per session, with a discounted multi-session pack available
              </li>
              <li>
                <strong>Online Coaching:</strong> a monthly membership that includes all remote coaching services
              </li>
              <li>
                <strong>Complete Transformation:</strong> our premium monthly package combining online coaching with
                in-person sessions
              </li>
            </ul>
            <p>
              Current prices for every option are shown on the{' '}
              <Link href="/services" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                Services page
              </Link>{' '}
              and again at checkout before you pay.
            </p>
          </>
        ),
      },
      {
        q: 'Do you offer package deals or discounts?',
        keywords: 'discount deal package referral save promo',
        a: (
          <p>
            Yes — I offer several ways to save on your fitness investment, including discounted session packs and referral
            bonuses.
          </p>
        ),
      },
      {
        q: 'Is there a contract requirement?',
        keywords: 'contract commitment month to month long term',
        a: (
          <p>
            My options are designed to be flexible while encouraging the consistency needed for real results. Online
            Coaching is month-to-month with no long-term contract required.
          </p>
        ),
      },
    ],
  },
];

export default function FAQPage() {
  const [query, setQuery] = useState('');

  // Filter categories/items by the search query (question + keywords).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_DATA;
    return FAQ_DATA.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) => it.q.toLowerCase().includes(q) || it.keywords.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  const noResults = filtered.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <main className="mx-auto max-w-4xl px-4 pt-28 pb-16 sm:px-6 sm:pb-20 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200">
            <HelpCircle className="size-3.5" /> FAQ
          </span>
          <h1 className="text-4xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <div className="mx-auto mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
          <p className="mx-auto mt-4 max-w-2xl text-gray-600">
            Answers to common questions about training, services, and policies. Can&apos;t find what you&apos;re looking
            for?{' '}
            <Link href="/connect#message" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
              Reach out
            </Link>
            .
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mb-10 max-w-xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            aria-label="Search frequently asked questions"
            className="w-full rounded-full border border-gray-200 bg-white/90 py-3 pl-12 pr-4 text-gray-900 shadow-sm outline-none ring-emerald-200 transition focus:border-emerald-400 focus:ring-2"
          />
        </div>

        {/* No results */}
        {noResults && (
          <div className="rounded-2xl border border-gray-200 bg-white/90 p-10 text-center shadow-sm">
            <p className="text-gray-600">
              No questions match &quot;{query}&quot;.{' '}
              <button onClick={() => setQuery('')} className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                Clear search
              </button>{' '}
              or{' '}
              <Link href="/connect#message" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                contact me directly
              </Link>
              .
            </p>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-6">
          {filtered.map((cat) => {
            const Icon = cat.icon;
            return (
              <section
                key={cat.id}
                id={cat.id}
                className="scroll-mt-24 overflow-hidden rounded-2xl border border-emerald-100 bg-white/90 shadow-sm backdrop-blur"
              >
                <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
                    <Icon className="size-4" />
                  </span>
                  <h2 className="text-lg font-bold text-gray-900">{cat.title}</h2>
                </div>

                <Accordion type="single" collapsible className="px-6">
                  {cat.items.map((item, idx) => (
                    <AccordionItem key={idx} value={`${cat.id}-${idx}`}>
                      <AccordionTrigger className="text-base font-semibold text-gray-900 hover:no-underline">
                        <span className="flex flex-wrap items-center gap-2 pr-2 text-left">
                          {item.q}
                          {item.popular && (
                            <Badge className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-600">
                              Most Asked
                            </Badge>
                          )}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-3 text-[15px] leading-relaxed text-gray-700">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </section>
            );
          })}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-10 rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            <MessageCircle className="size-6" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Still have questions?</h3>
          <p className="mx-auto mt-2 max-w-md text-gray-600">
            If you couldn&apos;t find the answer you were looking for, reach out and I&apos;ll get back to you personally.
          </p>
          <Link
            href="/connect#message"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-semibold text-white shadow-md transition hover:from-emerald-700 hover:to-teal-700"
          >
            Contact Me
          </Link>
        </div>
      </main>
    </div>
  );
}
