import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { pageMetadata } from '@/lib/seo';
import { Button } from '@/components/ui/button';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Award,
  BookHeart,
  BrainCircuit,
  Code2,
  Dumbbell,
  GraduationCap,
  Instagram,
  Linkedin,
  Youtube,
  Quote,

  Scale,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';


export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'Learn about Shreyas Annapureddy, NASM Certified Personal Trainer with 3+ years of experience specializing in sustainable weight loss and lifestyle coaching.',
  path: '/about',
});


const CREDENTIALS = [
  {
    icon: Award,
    title: 'NASM Certified Personal Trainer',
    detail:
      'With my NASM Personal Trainer certification and recent BA degree, I bring both scientific knowledge and practical experience to help you achieve your fitness goals.',
  },
  {
    icon: Dumbbell,
    title: '3+ Years Personal Training Experience',
    detail:
      'Specializing in sustainable weight loss transformations and lifestyle coaching. My approach focuses on lasting results through balanced nutrition and fitness routines that fit your real life.',
  },
  {
    icon: GraduationCap,
    title: 'Bachelor of Arts in Media & Communications',
    detail: 'Graduated from University of Washington',
  },
  {
    icon: BookHeart,
    title: 'Minor in Health Education and Promotion',
    detail: 'Completed at University of Washington',
  },
];

const PHILOSOPHY = [
  {
    icon: Scale,
    title: 'Balance',
    desc: 'Fitness should enhance your life, not consume it. I believe in creating sustainable fitness programs that fit seamlessly into your lifestyle.',
  },
  {
    icon: Target,
    title: 'Personalization',
    desc: 'No two bodies are the same. Your fitness program should be as unique as you are, tailored to your goals, preferences, and needs.',
  },
  {
    icon: TrendingUp,
    title: 'Progress',
    desc: 'Consistent, measured progress is the key to long-term success. I focus on helping you achieve sustainable results over time.',
  },
  {
    icon: BrainCircuit,
    title: 'Education',
    desc: 'Understanding the "why" behind your workouts is essential. I empower you with knowledge so you can make informed decisions about your fitness.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* ===================== PROFILE / INTRO ===================== */}
      <section className="pt-36 pb-16 md:pt-44 md:pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-start gap-10 lg:grid-cols-[380px_1fr]">
            {/* Photo + name + socials */}
            <div className="mx-auto w-full max-w-sm">
              <div className="relative">
                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-tr from-emerald-200/50 to-teal-100/40 blur-2xl" />
                <div className="relative overflow-hidden rounded-3xl border border-emerald-600/30 bg-white shadow-[0_20px_60px_-15px_rgba(16,120,80,0.3)]">
                  <Image
                    src="/assets/Shreyas-profile.jpg"
                    alt="Shreyas Annapureddy - Personal Trainer"
                    width={500}
                    height={500}
                    priority
                    className="w-full object-cover"
                  />
                </div>
              </div>
              <div className="mt-6 text-center">
                <h1 className="text-2xl font-bold text-stone-900">Shreyas Annapureddy</h1>
                <p className="mt-1 text-emerald-700">Personal Trainer &amp; Fitness Coach</p>
                <div className="mt-4 flex justify-center gap-3">
                  <a
                    href="https://www.instagram.com/shreyfitness"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="flex size-10 items-center justify-center rounded-full border border-emerald-600/30 bg-white text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
                  >
                    <Instagram className="size-5" />
                  </a>
                  <a
                    href="https://www.youtube.com/@shreyasfit"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube"
                    className="flex size-10 items-center justify-center rounded-full border border-emerald-600/30 bg-white text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
                  >
                    <Youtube className="size-5" />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/shreyfit"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="flex size-10 items-center justify-center rounded-full border border-emerald-600/30 bg-white text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white"
                  >
                    <Linkedin className="size-5" />
                  </a>
                </div>

              </div>
            </div>

            {/* Credentials */}
            <div>
              <Badge
                variant="secondary"
                className="mb-4 rounded-full border border-emerald-600/30 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700"
              >
                Certified &amp; Experienced
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
                The credentials behind the coaching
              </h2>
              <div className="mt-8 space-y-4">
                {CREDENTIALS.map((c) => (
                  <Card key={c.title} className="border-emerald-600/20 bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
                    <CardContent className="flex items-start gap-4 p-5">

                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <c.icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{c.title}</h3>
                        <p className="mt-1 text-sm text-stone-600">{c.detail}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-emerald-600/25 bg-emerald-50/60 p-6">
                <p className="text-stone-700">
                  Having personally overcome the challenges of weight loss and fitness plateaus, I{' '}
                  <span className="font-semibold text-emerald-700">
                    understand the mental and emotional aspects
                  </span>{' '}
                  of lasting change that most trainers overlook.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== TRANSFORMATION STORY ===================== */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-4xl px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              My Transformation Story
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              Why I understand your journey better than most
            </p>
          </div>

          <Card className="mt-10 border-emerald-600/25 bg-white">
            <CardContent className="p-8 md:p-10">
              <div className="flex gap-4">
                <Quote className="size-10 shrink-0 text-emerald-200" />
                <p className="text-xl font-semibold leading-snug text-stone-900">
                  I don&apos;t just want to train you for an hour. I want to offer you a better life.
                </p>
              </div>

              <div className="mt-8 space-y-5 text-stone-700">
                <p>
                  I used to be that person who avoided the gym because I felt like I didn&apos;t
                  belong there. Five years ago, I was over 100 pounds overweight, struggling with my
                  health, and convinced that fitness was for &apos;other people&apos; - not someone
                  like me.
                </p>
                <p>
                  Through my own transformation journey, I discovered that the real barriers to
                  lasting change aren&apos;t physical - they&apos;re mental and emotional. I learned
                  that successful weight loss isn&apos;t about perfect nutrition or killer workouts
                  (though those help). It&apos;s about understanding your relationship with food,
                  building confidence, and creating systems that work with your real life, not
                  against it.
                </p>
                <div className="rounded-xl border-l-4 border-emerald-600 bg-emerald-50/70 p-5">
                  <p className="font-semibold text-stone-900">
                    Today, I&apos;m not just a trainer - I&apos;m someone who&apos;s walked in your
                    shoes.
                  </p>
                </div>
                <p>
                  I understand the frustration of trying program after program without lasting
                  results. I know what it&apos;s like to feel judged, overwhelmed, and ready to give
                  up. But I also know that transformation is possible, because I&apos;ve lived it.
                </p>
                <p>
                  My approach isn&apos;t about crushing you with brutal workouts or restrictive
                  diets. It&apos;s about teaching you sustainable habits, building your confidence,
                  and giving you the tools to succeed long after our sessions end. My favorite thing
                  to tell clients is:{' '}
                  <span className="font-semibold text-emerald-700">
                    &apos;If I do my job properly, you won&apos;t need me anymore.&apos;
                  </span>{' '}
                  Because my goal isn&apos;t to keep you dependent - it&apos;s to help you become the
                  healthiest, happiest version of yourself.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fun fact — built the platform himself */}
          <Card className="mt-8 overflow-hidden border-emerald-600/30 bg-gradient-to-br from-emerald-50 to-teal-50 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/50 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]">
            <CardContent className="flex flex-col gap-5 p-8 sm:flex-row sm:items-start">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                <Code2 className="size-7" />
              </div>
              <div>
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  <Sparkles className="size-3.5" /> Fun fact
                </div>
                <h3 className="text-xl font-bold text-stone-900">
                  I built this entire platform myself.
                </h3>
                <p className="mt-3 text-stone-700">
                  Most coaches run on scattered spreadsheets and DMs — I wanted better for my
                  clients, so I designed and built SHREY.FIT from the ground up (yes, plenty of late
                  nights, with modern AI as my pair-programmer). Your live plan, workouts, nutrition,
                  progress, and our chat all live in one place because I sweated every detail of it.
                </p>
                <p className="mt-3 font-medium text-emerald-800">
                  The same drive I bring to solving my own problems is exactly what I bring to solving
                  yours.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ===================== PHILOSOPHY ===================== */}

      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              My Philosophy
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              The principles that guide my approach to fitness training
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PHILOSOPHY.map((p) => (
              <Card
                key={p.title}
                className="group border-emerald-600/20 bg-white/80 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <p.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-stone-900">{p.title}</h3>
                  <p className="mt-2 text-sm text-stone-600">{p.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-16 text-center shadow-xl md:px-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to begin your transformation?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">
            Let&apos;s work together to achieve your fitness goals through personalized training and
            expert guidance.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-7 text-base text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/connect">
                Get in Touch <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/70 bg-transparent px-7 text-base text-white hover:bg-white/10"
            >
              <Link href="/services">View Services</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
