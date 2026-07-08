'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Award,
  CalendarCheck,
  ChartLine,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  Flame,
  Globe,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Quote,
  Salad,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const CREDIBILITY = [
  { icon: Award, label: 'NASM Certified' },
  { icon: TrendingUp, label: '100+ lbs lost personally' },
  { icon: MapPin, label: 'Seattle in-person' },
  { icon: Globe, label: 'Online worldwide' },
];

const COACH_STATS = [
  { stat: 'NASM', label: 'Certified Personal Trainer' },
  { stat: '3+ yrs', label: 'Coaching experience' },
  { stat: '100+ lbs', label: 'Lost on my own journey' },
  { stat: 'Worldwide', label: 'Online + Seattle in-person' },
];

const PLATFORM_FEATURES = [
  {
    icon: ClipboardList,
    title: 'Your Plan, Live',
    desc: 'Training & nutrition protocol, your vision and weekly focus — always current.',
  },
  {
    icon: Dumbbell,
    title: 'Interactive Workouts',
    desc: 'Log every set & rep, watch exercise demos, and check off completed workouts.',
  },
  {
    icon: Salad,
    title: 'Nutrition Hub',
    desc: 'Meal plans, macro tracking, a daily habit tracker, and easy-to-follow guides.',
  },
  {
    icon: ChartLine,
    title: 'Progress Analytics',
    desc: 'Body composition, strength trends, and workout history — visualized over time.',
  },
  {
    icon: Target,
    title: 'Goals & Milestones',
    desc: 'Set targets, track milestones, and unlock achievements as you progress.',
  },
  {
    icon: MessageSquare,
    title: 'Direct Coach Chat',
    desc: 'Message me anytime, with everything about your plan in one thread.',
  },
];

const SHOWCASE = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    src: '/assets/screenshots/dashboard_main.png',
    caption: 'Your whole journey at a glance — sessions, tasks, metrics, and coach notes.',
  },
  {
    id: 'plan',
    label: 'My Plan',
    src: '/assets/screenshots/my training plan.png',
    caption: 'A living training & nutrition plan, updated as you progress.',
  },
  {
    id: 'progress',
    label: 'Progress',
    src: '/assets/screenshots/progress.png',
    caption: 'Track body composition and strength trends over time.',
  },
  {
    id: 'nutrition',
    label: 'Nutrition Hub',
    src: '/assets/screenshots/nutrition hub.png',
    caption: 'Meal plans, macros, and daily habits — all in one place.',
  },
  {
    id: 'workouts',
    label: 'Workouts',
    src: '/assets/screenshots/my workouts.png',
    caption: 'Interactive workouts with demos and set-by-set logging.',
  },
  {
    id: 'goals',
    label: 'Goals',
    src: '/assets/screenshots/goals and milestones.png',
    caption: 'Set goals, hit milestones, and celebrate every win.',
  },
];

const STEPS = [
  {
    icon: ClipboardList,
    title: 'Pick your plan',
    desc: 'Choose in-person training, online coaching, or the complete transformation — and get instant app access.',
  },
  {
    icon: CalendarCheck,
    title: 'Book your free setup call',
    desc: 'Right after signup, schedule a call in your dashboard where we map out your personalized plan together.',
  },
  {
    icon: Flame,
    title: 'Train with your plan, live',
    desc: 'Follow your workouts and nutrition in the app, log progress, and stay accountable with direct coach support.',
  },
];

const PLANS = [
  {
    name: 'In-Person Training',
    badge: 'Training Only',
    price: '$75',
    unit: '/session',
    tagline: 'Expert 1-on-1 guidance',
    highlight: false,
    features: [
      'Hands-on coaching & form correction',
      'Personalized session programming',
      'Essential app access (book, chat, billing)',
      'Seattle area only',
    ],
  },
  {
    name: 'Online Coaching',
    badge: 'Most Convenient',
    price: '$200',
    unit: '/month',
    tagline: 'Train smart from anywhere',
    highlight: false,
    features: [
      'Custom program refreshed every 2 weeks',
      'Real nutrition coaching',
      'Monthly 1-on-1 strategy call',
      'Full SHREY.FIT app access',
    ],
  },
  {
    name: 'Complete Transformation',
    badge: 'Best Value',
    price: '$250',
    unit: '/month',
    tagline: 'My highest level of support',
    highlight: true,
    features: [
      'Everything in Online Coaching',
      'Weekly check-ins & priority messaging',
      'Real-world skills & mindset coaching',
      'Locked-in $60 in-person rate (Seattle)',
    ],
  },
];

const TESTIMONIALS = [
  {
    name: 'Steven S.',
    result: 'Lost 28 lbs in 4 months',
    quote:
      "I'd tried everything - keto, CrossFit, personal trainers who didn't get it. Shreyas understood my struggles from day one. Finally, someone who didn't judge my past failures.",
  },
  {
    name: 'Griffin R.',
    result: 'Down 35 lbs and feeling strong',
    quote:
      "I was honestly skeptical of another trainer promising 'different results.' But Shreyas built a plan around my crazy work schedule and two kids. It actually stuck.",
  },
  {
    name: 'Jason L.',
    result: 'Consistent for 8 months now',
    quote:
      'I felt so overwhelmed by all the conflicting fitness advice. Shreyas cut through the noise and showed me what actually works for busy people like me.',
  },
];

function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const [activeShot, setActiveShot] = useState(SHOWCASE[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* ============================ HERO ============================ */}
      {/* pt offsets the fixed 80px nav (h-20) plus breathing room */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24">

        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge
                variant="secondary"
                className="mb-5 rounded-full border border-emerald-600/30 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700"
              >
                <Sparkles className="mr-1.5 size-3.5" />
                1-on-1 coaching with a real coach — powered by a real app
              </Badge>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                Real coaching. Real results.{' '}
                <span className="text-emerald-600">Backed by a real app.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg text-stone-600">
                You&apos;ve tried the fad diets and the cookie-cutter programs. Let&apos;s do
                this differently — expert 1-on-1 coaching paired with a full platform that
                keeps your plan, workouts, nutrition, and progress in one place, wherever you are.
              </p>
              <p className="mt-4 max-w-xl text-base text-stone-600">
                <strong className="text-stone-800">
                  Every plan is built and adjusted by me personally — never by AI.
                </strong>{' '}
                The app is simply where it all lives: your workouts, nutrition, progress,
                billing, and our conversations in one place, instead of a messy Google Doc.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-full bg-emerald-600 px-7 text-base hover:bg-emerald-700"
                >
                  <Link href="/signup">
                    Get Started <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-emerald-600/40 px-7 text-base text-emerald-700 hover:bg-emerald-50"
                >
                  <Link href="/connect">Book a Free Intro Call</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {CREDIBILITY.map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-sm text-stone-600">
                    <c.icon className="size-4 text-emerald-600" />
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual: framed dashboard screenshot + coach card overlay */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-emerald-200/50 to-teal-100/40 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-emerald-600/30 bg-white shadow-[0_20px_60px_-15px_rgba(16,120,80,0.3)]">
                <div className="flex items-center gap-1.5 border-b border-emerald-600/15 bg-emerald-50/60 px-4 py-3">
                  <span className="size-3 rounded-full bg-red-400/70" />
                  <span className="size-3 rounded-full bg-amber-400/70" />
                  <span className="size-3 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 text-xs font-medium text-stone-400">
                    app.shrey.fit / dashboard
                  </span>
                </div>
                <Image
                  src="/assets/screenshots/dashboard_main.png"
                  alt="SHREY.FIT client dashboard"
                  width={1200}
                  height={1100}
                  priority
                  className="w-full"
                />
              </div>

              {/* Floating coach card — makes the human behind the app explicit */}
              <div className="absolute -bottom-4 left-2 flex max-w-[calc(100%-1rem)] items-center gap-2.5 rounded-2xl border border-emerald-600/20 bg-white/95 px-3 py-2.5 shadow-[0_12px_30px_-10px_rgba(16,120,80,0.35)] backdrop-blur sm:-bottom-5 sm:-left-5 sm:max-w-none sm:gap-3 sm:px-4 sm:py-3">
                <div className="relative shrink-0">
                  <Image
                    src="/assets/Shreyas-profile.jpg"
                    alt="Shreyas — your coach"
                    width={56}
                    height={56}
                    className="size-11 rounded-full object-cover ring-2 ring-emerald-500/40 sm:size-14"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full border-2 border-white bg-emerald-500" />
                </div>
                <div className="pr-1">
                  <div className="text-sm font-bold leading-tight text-stone-900">Shreyas</div>
                  <div className="text-xs font-medium text-emerald-700">
                    Your Coach · NASM Certified
                  </div>
                </div>
              </div>
            </div>

            {/* Caption reinforcing the human behind the platform */}
            <p className="mt-10 text-center text-sm text-stone-500 lg:col-span-2">
              Built and run by your coach, Shreyas — the app is the hub, the coaching is always human.
            </p>


          </div>
        </div>
      </section>

      {/* ===================== WHY SHREY.FIT (3 BOXES) =============== */}
      <section className="border-t border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              Why SHREY.FIT
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              A real coach, real experience, and real tools — together
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              Most programs give you one of these. Lasting change needs all three working as one.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: HeartHandshake,
                eyebrow: 'The coach',
                title: 'Someone who genuinely gets it',
                desc:
                  "A NASM-certified coach who's obsessed with this — and has lived it. I coach with the knowledge, patience, and passion of someone who remembers exactly how overwhelming the start feels.",
              },
              {
                icon: Trophy,
                eyebrow: 'The experience',
                title: 'Been there, done it, helped others do it',
                desc:
                  "I lost 100+ pounds myself and have spent 3+ years helping beginners and stuck lifters get real, lasting results — not 30-day quick fixes that fall apart.",
              },
              {
                icon: LayoutDashboard,
                eyebrow: 'The platform',
                title: 'Powerful tools that keep it together',
                desc:
                  'Your plan, workouts, nutrition, progress, and our conversations live in one purpose-built app — so coaching actually works, in Seattle or anywhere in the world.',
              },
            ].map((pillar) => (
              <Card
                key={pillar.title}
                className="group border-emerald-600/20 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <CardContent className="p-8">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <pillar.icon className="size-7" />
                  </div>
                  <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    {pillar.eyebrow}
                  </div>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">{pillar.title}</h3>
                  <p className="mt-3 text-sm text-stone-600">{pillar.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PILLAR 1 · THE COACH (+ STATS) =========== */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[380px_1fr]">
            <div className="relative mx-auto w-full max-w-sm">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-emerald-200/50 to-teal-100/40 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-emerald-600/30 bg-white shadow-[0_20px_60px_-15px_rgba(16,120,80,0.3)]">
                <Image
                  src="/assets/Shreyas-profile.jpg"
                  alt="Shreyas Annapureddy — Personal Trainer & Coach"
                  width={500}
                  height={500}
                  className="w-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                The coach · Meet Shreyas
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                Hi, I&apos;m Shreyas.
              </h2>
              <p className="mt-5 text-lg text-stone-600">
                Five years ago I was over 100 pounds overweight and convinced fitness was for
                &quot;other people&quot; — not someone like me. Changing that didn&apos;t come from a
                perfect plan; it came from learning the skills, one realistic step at a time.
              </p>
              <p className="mt-4 text-lg text-stone-600">
                Now, as a NASM-certified coach, that&apos;s exactly how I work with you: with real
                empathy, real experience, and a platform that keeps us connected every step of the
                way. My goal isn&apos;t to keep you dependent on me —{' '}
                <strong className="text-stone-800">
                  it&apos;s to teach you to keep your results for life.
                </strong>
              </p>

              {/* Stats now support the coach statement */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {COACH_STATS.map((t) => (
                  <div
                    key={t.label}
                    className="rounded-xl border border-emerald-600/20 bg-emerald-50/50 px-3 py-4 text-center"
                  >
                    <div className="text-xl font-bold text-emerald-600">{t.stat}</div>
                    <div className="mt-1 text-xs text-stone-500">{t.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="rounded-full bg-emerald-600 px-6 hover:bg-emerald-700">
                  <Link href="/about">
                    My full story <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-emerald-600/40 px-6 text-emerald-700 hover:bg-emerald-50"
                >
                  <Link href="/connect">Book a free intro call</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= PILLAR 2 · THE EXPERIENCE ================ */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              The experience · The real reason
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Why most people never see results — and why it&apos;s not your fault
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="size-5" />
                  <span className="font-semibold">What goes wrong</span>
                </div>
                <p className="mt-4 text-stone-700">
                  You&apos;ve been handed the &quot;perfect&quot; meal plan and workout before — and
                  still fell off. The truth no one tells you: you can&apos;t flip years of habits
                  overnight.
                </p>
                <p className="mt-3 text-stone-700">
                  Most trainers assume you already have skills you were never taught, then blame you
                  when the plan doesn&apos;t stick.
                </p>
              </CardContent>
            </Card>
            <Card className="border-emerald-600/30 bg-emerald-50/50">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="size-5" />
                  <span className="font-semibold">How I do it differently</span>
                </div>
                <p className="mt-4 text-stone-700">
                  I&apos;ve been over 100 pounds heavier myself, and I had to completely rewire how I
                  think about food and training.
                </p>
                <p className="mt-3 text-stone-700">
                  So I meet you exactly where you are — not where some &quot;perfect plan&quot;
                  assumes you should be — and we build the skills together, one realistic step at a
                  time, so the change actually lasts. I don&apos;t build dependence; I build
                  independence.
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="link" className="text-emerald-700">
              <Link href="/about">
                Read my full story <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ================= PILLAR 3 · THE PLATFORM ================== */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              The platform
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Your entire fitness command center
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              <strong className="text-stone-800">
                Most trainers run on Google Docs and spreadsheets.
              </strong>{' '}
              I built you a real app — everything in one place, fully interactive, and made for
              how remote clients and coaches actually work together.
            </p>
          </div>

          {/* Feature grid */}
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FEATURES.map((f) => (
              <Card
                key={f.title}
                className="group border-emerald-600/20 bg-white/70 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <CardContent className="p-6">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <f.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{f.title}</h3>
                  <p className="mt-2 text-sm text-stone-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Screenshot showcase */}
          <div className="mt-16">
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {SHOWCASE.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveShot(s)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    activeShot.id === s.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-stone-600 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-emerald-200/40 to-teal-100/30 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-emerald-600/30 bg-white shadow-[0_20px_60px_-15px_rgba(16,120,80,0.3)]">
                <div className="flex items-center gap-1.5 border-b border-emerald-600/15 bg-emerald-50/60 px-4 py-3">
                  <span className="size-3 rounded-full bg-red-400/70" />
                  <span className="size-3 rounded-full bg-amber-400/70" />
                  <span className="size-3 rounded-full bg-emerald-400/70" />
                  <span className="ml-3 text-xs font-medium text-stone-400">
                    app.shrey.fit / {activeShot.id}
                  </span>
                </div>
                <Image
                  key={activeShot.src}
                  src={activeShot.src}
                  alt={`SHREY.FIT ${activeShot.label}`}
                  width={1400}
                  height={1200}
                  className="max-h-[560px] w-full object-cover object-top"
                />
              </div>
              <p className="mt-4 text-center text-sm text-stone-500">{activeShot.caption}</p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-emerald-600/40 text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/services">
                See everything included <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ===================== SERVICES · FIND THE FIT =============== */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              Services
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Find the right fit
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              Whatever your starting point, there&apos;s an option for you — and you can upgrade anytime.
            </p>
          </div>
          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {PLANS.map((p) => (
              <Card
                key={p.name}
                className={`group relative flex flex-col bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)] ${
                  p.highlight
                    ? 'border-emerald-600 shadow-[0_0_25px_oklch(65%_0.16_151_/_0.25)]'
                    : 'border-emerald-600/25 hover:border-emerald-600/40'
                }`}
              >

                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full bg-emerald-600 px-3 py-1 text-white">
                      {p.badge}
                    </Badge>
                  </div>
                )}
                <CardContent className="flex flex-1 flex-col p-8">
                  {!p.highlight && (
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                      {p.badge}
                    </span>
                  )}
                  <h3 className="mt-1 text-xl font-bold text-stone-900">{p.name}</h3>
                  <p className="mt-1 min-h-10 text-sm text-stone-500">{p.tagline}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-stone-900">{p.price}</span>
                    <span className="text-stone-500">{p.unit}</span>
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className={`mt-8 rounded-full ${
                      p.highlight
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-stone-900 hover:bg-stone-800'
                    }`}
                  >
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Button asChild variant="link" className="text-emerald-700">
              <Link href="/services">
                Compare all plans in detail <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ======================= HOW IT WORKS ======================== */}
      <section className="py-10 md:py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              Getting started is simple — you&apos;ll be training with a real plan in days, not weeks.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Card
                key={s.title}
                className="group border-emerald-600/20 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <s.icon className="size-7" />
                  </div>
                  <div className="mx-auto mt-4 flex size-7 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{s.title}</h3>
                  <p className="mt-2 text-sm text-stone-600">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      </section>

      {/* ======================= TESTIMONIALS ======================== */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Success stories from people just like you
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              Real transformations from people who were tired of starting over.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="border-emerald-600/20 bg-white/80">
                <CardContent className="flex h-full flex-col p-8">
                  <Quote className="size-8 text-emerald-200" />
                  <p className="mt-4 flex-1 text-stone-700">{t.quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
                      {initials(t.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-stone-900">{t.name}</div>
                      <div className="flex items-center gap-1 text-sm text-emerald-600">
                        <Trophy className="size-3.5" />
                        {t.result}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ======================= FINAL CTA =========================== */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-16 text-center shadow-xl md:px-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to start your transformation?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">
            Pick your plan and get instant access to the app, or book a free intro call — no
            commitment, just clarity. You&apos;re not doing this alone anymore.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-7 text-base text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/signup">
                Get Started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/70 bg-transparent px-7 text-base text-white hover:bg-white/10"
            >
              <Link href="/connect">Book a Free Intro Call</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
