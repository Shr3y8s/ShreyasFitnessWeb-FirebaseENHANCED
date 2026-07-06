'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  Calendar,
  CalendarCheck,

  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  Coffee,
  CreditCard,
  Crown,
  Dumbbell,
  Gift,
  Handshake,
  Laptop,
  type LucideIcon,
  MapPin,
  MessageSquare,
  Rocket,
  Salad,
  Tags,
  Target,
  X,
} from 'lucide-react';


/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

const PLATFORM_FEATURES: { icon: LucideIcon; title: string; desc: string }[] = [
  { icon: BadgeCheck, title: 'Your Plan, Live', desc: 'Training & nutrition protocol, your vision and current focus — always up to date.' },
  { icon: Dumbbell, title: 'Interactive Workouts', desc: 'Log every set & rep, watch exercise demos, and check off completed workouts.' },
  { icon: Salad, title: 'Nutrition Hub', desc: 'Meal plans, macro tracking, a daily habit tracker, and easy-to-follow guides.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Body composition, strength trends, and workout history — visualized over time.' },
  { icon: Target, title: 'Goals & Milestones', desc: 'Set targets, track milestones, and unlock achievements as you progress.' },
  { icon: Camera, title: 'Photos & Weekly Survey', desc: "Track the visual change and tell me how you're really doing each week." },
  { icon: Calendar, title: 'Book Workouts & Check-ins', desc: 'Schedule your 1-on-1 sessions and weekly check-ins right inside the app.' },
  { icon: MessageSquare, title: 'Direct Coach Chat', desc: 'Message me anytime, with everything about your plan in one thread.' },
  { icon: CreditCard, title: 'Billing & Membership', desc: 'Buy sessions, manage your subscription, and view invoices — all self-service.' },
];

type Cell = { kind: 'inc' | 'partial' | 'no' | 'text'; text?: string; sub?: string; strong?: boolean };
const COMPARISON: { feature: string; seattle?: string; cells: [Cell, Cell, Cell] }[] = [
  {
    feature: 'SHREY.FIT Platform Access',
    seattle: '(full client app)',
    cells: [
      { kind: 'partial', text: 'Essentials', sub: 'Book sessions, coach chat & billing' },
      { kind: 'inc', text: 'Full access' },
      { kind: 'inc', text: 'Full access', strong: true },
    ],
  },
  { feature: 'Custom Training Program', cells: [{ kind: 'text', text: '—' }, { kind: 'inc', text: 'Every 2 weeks' }, { kind: 'inc', text: 'Continuously adapted', strong: true }] },
  { feature: 'Nutrition Coaching', cells: [{ kind: 'text', text: '—' }, { kind: 'inc', text: 'Every 2 weeks' }, { kind: 'inc', text: 'Continuously adapted', strong: true }] },
  { feature: 'Progress Check-Ins', cells: [{ kind: 'inc', text: 'In session' }, { kind: 'inc', text: 'Every 2 weeks' }, { kind: 'inc', text: 'Weekly', strong: true }] },
  { feature: 'Messaging Support', cells: [{ kind: 'text', text: '—' }, { kind: 'inc', text: 'Within 24 hrs' }, { kind: 'inc', text: 'Priority · same day', strong: true }] },
  { feature: 'Video Form Analysis', cells: [{ kind: 'text', text: '—' }, { kind: 'inc', text: 'Included' }, { kind: 'inc', text: 'Included' }] },
  {
    feature: 'Real-World Skills Coaching',
    seattle: '(eat out, shop, travel, social events)',
    cells: [{ kind: 'no' }, { kind: 'no' }, { kind: 'inc', text: 'Included' }],
  },
  { feature: 'Train-Anywhere Fundamentals', cells: [{ kind: 'inc', text: 'In session' }, { kind: 'no' }, { kind: 'inc', text: 'Included' }] },
  { feature: 'Mindset & Lifestyle Coaching', cells: [{ kind: 'text', text: '—' }, { kind: 'no' }, { kind: 'inc', text: 'Included' }] },
  { feature: '1-on-1 Strategy Call', cells: [{ kind: 'text', text: '—' }, { kind: 'inc', text: 'Monthly' }, { kind: 'inc', text: 'Monthly + as-needed', strong: true }] },
  {
    feature: 'Habit & Accountability',
    cells: [
      { kind: 'text', text: '—' },
      { kind: 'partial', text: 'Tracker only', sub: 'self-guided in app' },
      { kind: 'inc', text: 'Full 1-on-1 coaching', strong: true },
    ],
  },
  {
    feature: 'In-Person Check-In Meetings',
    seattle: '(Seattle · FaceTime if remote)',
    cells: [{ kind: 'text', text: '—' }, { kind: 'no' }, { kind: 'inc', text: 'Included', strong: true }],
  },
  {
    feature: 'In-Person Training Sessions',
    seattle: '(Seattle)',
    cells: [{ kind: 'text', text: '$75/session' }, { kind: 'no' }, { kind: 'inc', text: '$60/session', strong: true, sub: 'best rate anywhere' }],
  },
];

const APPROACH = [
  {
    icon: Dumbbell,
    persona: 'Best for you if…',
    title: 'Hands-On Training',
    desc: "You're local to Seattle, you learn best in person, and you want to nail your technique and build real confidence in the gym — on your own schedule.",
    popular: false,
  },
  {
    icon: Laptop,
    persona: 'Best for you if…',
    title: 'The Full Remote System',
    desc: "You're self-motivated and want a proven plan plus expert support you can run from anywhere, on your own schedule.",
    popular: false,
  },
  {
    icon: Crown,
    persona: 'Best for you if…',
    title: 'The One Most Clients Choose',
    desc: "You've started and stalled before. You don't just want a plan — you want me in your corner, teaching you the real-world skills so the results finally stick for good.",
    popular: true,
  },
];

const SAVINGS = [
  { feature: 'Custom Training Programs', sep: '$175' },
  { feature: 'Nutrition Coaching', sep: '$200' },
  { feature: 'Real-World Skills & Lifestyle Coaching', sep: '$150' },
  { feature: 'Weekly Progress Check-Ins', sep: '$150' },
  { feature: 'Habit & Accountability Coaching', sep: '$120' },
  { feature: 'Monthly 1-on-1 Strategy Call', sep: '$100' },
  { feature: 'Anytime Priority Messaging', sep: '$99' },
  { feature: 'Video Form Analysis', sep: '$125' },
  { feature: 'In-Person Check-In Meetings', sep: '$180' },
];

/* ---- Modal content ---- */
type Feature = { title: string; desc: string };
type ModalData = {
  title: string;
  intro: string;
  price: string;
  priceUnit: string;
  priceNote: string;
  included: Feature[];
  missing: Feature[];
  missingAllGood?: boolean;
  format: string;
  formatNote: string;
  upgradeTitle?: string;
  upgradeText?: string;
  proof: string;
  cta: string;
};

const MODALS: Record<string, ModalData> = {
  inperson: {
    title: 'In-person Training Sessions',
    intro:
      'Expert in-person coaching sessions focused on technique, form, and effective workouts tailored specifically to your unique goals, fitness level, and lifestyle. These sessions are perfect for those who want hands-on guidance without requiring comprehensive nutrition or lifestyle coaching.',
    price: '$75',
    priceUnit: '/session',
    priceNote: '4-session pack available: $260 ($65/session)',
    included: [
      { title: 'Expert 1-on-1 Coaching', desc: 'Personalized attention and guidance throughout your entire training session' },
      { title: 'Form Correction & Technique', desc: 'Hands-on technique guidance and safety instruction to maximize results and prevent injury' },
      { title: 'Personalized Session Programming', desc: 'Each session designed specifically for your body, goals, and fitness level' },
      { title: 'Equipment Guidance', desc: 'Learn how to properly use equipment for maximum effectiveness and safety' },
      { title: 'Essential App Access', desc: 'Your own SHREY.FIT account to book & buy sessions, message your coach anytime, and manage billing — all in one place (full coaching features are Online/Complete only)' },
    ],
    missing: [
      { title: 'Custom Training Programs', desc: 'Updated monthly based on your progress, feedback, and available equipment' },
      { title: 'Complete Nutrition Coaching', desc: 'Personalized meal plans and dietary guidance to support your fitness goals' },
      { title: 'Unlimited Messaging Support', desc: 'Direct access with 24-hour response guarantee for questions and guidance' },
    ],
    format: 'In-Person',
    formatNote: 'In-person sessions available in the Seattle area only.',
    upgradeTitle: 'Ready for More?',
    upgradeText: 'Many clients start with In-Person Training and upgrade to Complete Transformation within 30 days for more comprehensive results.',
    proof: 'Great starting point - I learned proper form quickly and saw immediate improvement in my strength.',
    cta: 'Book Your First Session',
  },
  online: {
    title: 'Online Coaching',
    intro:
      'Your complete remote coaching system - everything you need to train smart and eat right from anywhere. A custom program refreshed every two weeks, real nutrition coaching, a monthly 1-on-1 strategy call, and direct access to me so you always know your next move.',
    price: '$200',
    priceUnit: '/month',
    priceNote: 'Just ~$6.67 per day for a complete remote coaching system',
    included: [
      { title: 'Your Coaching & Accountability Command Center', desc: 'Full access to the SHREY.FIT app — your live plan, interactive workouts, nutrition hub, progress analytics, goals, check-ins, and direct coach chat, all in one place' },
      { title: 'Custom Training Program', desc: 'Personalized exercise plans refreshed every two weeks based on your progress, goals, and available equipment' },
      { title: 'Nutrition Coaching', desc: 'A personalized nutrition plan adjusted every two weeks so you always know exactly how to eat for your goals' },
      { title: 'Bi-Weekly Progress Check-Ins', desc: 'A structured review every two weeks to track progress and fine-tune your program' },
      { title: 'Monthly 1-on-1 Strategy Call', desc: 'A dedicated video call each month to plan ahead, solve roadblocks, and keep you accountable' },
      { title: 'Direct Messaging Support', desc: 'Message me directly with questions and check-ins, with replies typically within 24 hours' },
      { title: 'Video Form Analysis', desc: 'Submit workout videos for detailed technique feedback and exercise modifications' },
    ],
    missing: [
      { title: 'Weekly Progress Check-Ins', desc: 'Complete Transformation reviews your progress every week instead of every two weeks - faster adjustments, faster results' },
      { title: 'Priority Same-Day Messaging', desc: 'Skip the line with priority responses (typically same day) instead of standard 48-hour replies' },
      { title: 'Continuously Adapted Programming', desc: 'Your plan is adjusted whenever your body, schedule, or life changes - not just once a month' },
      { title: 'Real-World Skills Coaching', desc: 'Learn how to eat out, shop, travel, and handle a night out with friends while still hitting your goals - the skills that keep you in shape for life' },
      { title: 'Train-Anywhere Fundamentals', desc: 'Master the fundamentals of movement so you can build an effective workout in any gym, park, or hotel - and never be lost or dependent again' },
      { title: 'Mindset & Lifestyle Coaching', desc: 'The mental side most coaches skip - rewiring how you think about food and training so the change actually sticks' },
      { title: 'As-Needed 1-on-1 Calls', desc: 'Online includes a monthly strategy call - Complete adds extra as-needed calls whenever you hit a roadblock' },
      { title: 'Hands-On Habit & Accountability Coaching', desc: 'Online Coaching includes the self-guided habit tracker in the app — Complete adds me actively coaching your daily habits and holding you accountable, not just handing you the tracker' },
      { title: 'In-Person Check-In Meetings (Included)', desc: "Sit down with me to talk through how you're feeling and any roadblocks - in person in Seattle, or over FaceTime anywhere else" },
      { title: 'Locked-In $60 In-Person Rate', desc: 'Train with me in person at the best rate available anywhere - below the $75 walk-in and the $260 four-pack' },
    ],
    format: 'Remote',
    formatNote: 'This service is delivered remotely to serve you anywhere in the world.',
    upgradeTitle: 'Want Even Better Results?',
    upgradeText: 'For just $50 more, Complete Transformation upgrades you to weekly check-ins, anytime priority support, a monthly 1-on-1 strategy call, real-world skills & mindset coaching, and included in-person check-in meetings - and adds a locked-in $60 in-person rate as a bonus.',
    proof: 'The Online Coaching package completely changed my approach to fitness. Having both training and nutrition support made all the difference.',
    cta: 'Start Your Transformation',
  },
  complete: {
    title: 'Complete Transformation',
    intro:
      "My highest level of support - we solve your puzzle together. You get everything in Online Coaching, upgraded, plus the real-world skills and one-on-one access that don't just get you results - they teach you to keep them for life. My job isn't to keep you dependent on me; it's to make myself unnecessary. And as a bonus, you lock in my best-ever in-person rate.",
    price: '$250',
    priceUnit: '/month',
    priceNote: 'Just ~$8.33 per day - only ~$1.67 more than Online Coaching for everything below',
    included: [
      { title: 'Your Full Coaching & Accountability Command Center', desc: 'The complete SHREY.FIT app experience — live plan, interactive workouts, nutrition hub, progress analytics, goals, weekly check-ins, and priority coach chat, all in one place' },
      { title: 'Everything in Online Coaching', desc: 'Your custom training program, nutrition coaching, direct messaging, and video form analysis - all included as the foundation' },
      { title: 'Weekly Progress Check-Ins', desc: 'A structured review every single week (not every two) so we adjust faster and you progress faster' },
      { title: 'Priority Same-Day Messaging', desc: 'Front-of-the-line responses, typically the same day, whenever you have a question or need a quick adjustment' },
      { title: 'Continuously Adapted Programming', desc: 'Your plan evolves whenever your body, schedule, or life changes - not just once a month' },
      { title: '1-on-1 Strategy Calls (Monthly + As-Needed)', desc: "Your monthly strategy call, plus extra as-needed calls whenever you hit a roadblock - so you're never stuck waiting" },
      { title: 'Habit & Accountability Coaching', desc: 'A structured behavior-change system that builds the daily habits that actually create lasting results' },
      { title: 'Real-World Skills Coaching', desc: 'The skills most coaching skips: how to order at a restaurant, shop a grocery store, travel, and enjoy a night out with friends while still hitting your goals - in person in Seattle, or over FaceTime anywhere else' },
      { title: 'Train-Anywhere Fundamentals', desc: 'Master the fundamentals of movement so you can build an effective workout in any gym, park, or hotel - never lost, never dependent on a machine or a once-a-week session' },
      { title: 'Mindset & Lifestyle Coaching', desc: "The mental side that actually drives results - I've lost over 100 pounds and rewired how I think about food and training, so I help you do the same from where you are now" },
      { title: 'In-Person Check-In Meetings (Included)', desc: "Sit down with me to talk through how you're feeling, wins, and roadblocks - beyond your regular check-ins and workouts. In person in Seattle, or over FaceTime anywhere else" },
      { title: 'Priority Support & Scheduling', desc: 'Preferential booking times and the fastest response to everything you need' },
      { title: 'BONUS: Locked-In $60 In-Person Rate', desc: 'Train with me in person at $60/session - my best rate anywhere, below the $75 walk-in and the $260 four-pack ($65/session). Seattle area only.' },
      { title: 'BONUS: In-Person Progress Assessments', desc: 'Hands-on measurements and form correction during your in-person sessions for precise feedback' },
    ],
    missing: [
      { title: 'Nothing!', desc: 'This is our most comprehensive package with everything included' },
      { title: 'Maximum Results', desc: 'Get the best of both worlds: remote guidance plus in-person accountability' },
      { title: 'Complete Support System', desc: 'Our premium tier delivers the ultimate fitness experience with no compromises' },
    ],
    missingAllGood: true,
    format: 'Remote + In-Person',
    formatNote: 'Remote coaching available worldwide, in-person sessions available in the Seattle area only.',
    proof: 'The combination of online coaching and in-person sessions gave me the perfect balance of accountability and flexibility. This is the ultimate fitness experience.',
    cta: 'Go Premium',
  },
};

const TIERS = [
  {
    key: 'inperson',
    badge: 'Training Only',
    icon: Dumbbell,
    title: 'In-Person Training',
    tagline: 'Get expert 1-on-1 guidance',
    price: '$75',
    unit: '/session',
    desc: 'Expert in-person coaching sessions focused on technique, form, and effective workouts tailored to your goals. Includes essential SHREY.FIT app access — book & buy sessions, message your coach, and manage billing (full coaching features are Online/Complete only).',
    format: 'Seattle Area Only',
    highlight: false,
    cta: 'Book Your First Session',
  },
  {
    key: 'online',
    badge: 'Most Convenient',
    icon: Laptop,
    title: 'Online Coaching',
    tagline: 'Train smart and eat right from anywhere',
    price: '$200',
    unit: '/month',
    desc: 'A complete remote system - a custom program refreshed every 2 weeks, real nutrition coaching, a monthly strategy call, video form analysis, and direct support to keep you progressing on your own terms. Includes full SHREY.FIT app access.',
    format: 'Remote Coaching',
    highlight: false,
    cta: 'Start Your Transformation',
  },
  {
    key: 'complete',
    badge: 'Best Value',
    icon: Crown,
    title: 'Complete Transformation',
    tagline: 'My highest level of support — we solve your puzzle together',
    price: '$250',
    unit: '/month',
    desc: "Everything in Online Coaching, plus the hands-on guidance, real-world skills, and direct access that don't just get you results — they teach you to keep them for life. Includes full SHREY.FIT app access. Locked-in $60 in-person rate as a bonus.",
    format: 'Remote + Seattle In-Person Bonus',
    highlight: true,
    cta: 'Go Premium',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Detail modal                                                        */
/* ------------------------------------------------------------------ */

function DetailModal({ data, trigger }: { data: ModalData; trigger: React.ReactNode }) {
  const [openMissing, setOpenMissing] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-stone-900">{data.title}</DialogTitle>
        </DialogHeader>
        <p className="text-stone-600">{data.intro}</p>

        <div className="mt-2 rounded-xl border border-emerald-600/25 bg-emerald-50/60 p-5 text-center">
          <div className="text-3xl font-bold text-stone-900">
            {data.price}
            <span className="text-base font-medium text-stone-500">{data.priceUnit}</span>
          </div>
          <p className="mt-1 text-sm text-stone-600">{data.priceNote}</p>
        </div>

        <h3 className="mt-4 font-semibold text-stone-900">What&apos;s Included:</h3>
        <ul className="space-y-3">
          {data.included.map((f) => (
            <li key={f.title} className="flex items-start gap-3">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              <div>
                <strong className="text-stone-800">{f.title}</strong>
                <p className="text-sm text-stone-600">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>

        <Collapsible open={openMissing} onOpenChange={setOpenMissing} className="mt-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-stone-900">What You&apos;re Missing:</h3>
            <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-full border border-emerald-600/30 px-3 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-50">
              {openMissing ? 'Hide' : 'Show'}
              <ChevronDown className={`size-4 transition-transform ${openMissing ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="mt-3">
            <ul className="space-y-3">
              {data.missing.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  {data.missingAllGood ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-stone-400" />
                  )}
                  <div>
                    <strong className="text-stone-800">{f.title}</strong>
                    <p className="text-sm text-stone-600">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>

        <div className="mt-2">
          <h4 className="font-semibold text-stone-900">Available Format:</h4>
          <Badge className="mt-2 rounded-full bg-emerald-600 text-white">{data.format}</Badge>
          <p className="mt-2 text-sm text-stone-600">{data.formatNote}</p>
        </div>

        {data.upgradeTitle && (
          <div className="rounded-xl border border-emerald-600/25 bg-emerald-50/50 p-5">
            <h4 className="font-semibold text-stone-900">{data.upgradeTitle}</h4>
            <p className="mt-1 text-sm text-stone-600">{data.upgradeText}</p>
          </div>
        )}

        <blockquote className="border-l-4 border-emerald-600 bg-stone-50 p-4 text-sm italic text-stone-600">
          &quot;{data.proof}&quot;
        </blockquote>

        <Button asChild className="mt-2 w-full rounded-full bg-emerald-600 hover:bg-emerald-700">
          <Link href="/signup">{data.cta}</Link>
        </Button>

      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Cell renderer                                                       */
/* ------------------------------------------------------------------ */

function ComparisonCell({ cell }: { cell: Cell }) {
  if (cell.kind === 'no') {
    return (
      <span className="inline-flex text-stone-300">
        <X className="size-4" />
      </span>
    );
  }
  if (cell.kind === 'text') {
    return <span className="text-sm text-stone-500">{cell.text}</span>;
  }
  const color = cell.kind === 'partial' ? 'text-amber-600' : 'text-emerald-700';
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span className={`inline-flex items-baseline gap-1 text-sm ${color}`}>
        <Check className="size-3.5" />
        {cell.strong ? <strong>{cell.text}</strong> : cell.text}
      </span>
      {cell.sub && (
        <span className={`text-xs ${cell.kind === 'partial' ? 'text-amber-600' : 'text-emerald-600'}`}>
          {cell.sub}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 text-stone-800">
      {/* ===================== TIER CARDS ===================== */}
      <section className="pt-28 pb-16 md:pt-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              SHREY.FIT Services
            </h1>
            <p className="mt-3 text-lg text-stone-600">
              Three tailored service options designed to fit your fitness needs and goals.
            </p>
          </div>

          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <Card
                key={tier.key}
                className={`group relative flex flex-col bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)] ${
                  tier.highlight
                    ? 'border-emerald-600 shadow-[0_0_25px_oklch(65%_0.16_151_/_0.25)]'
                    : 'border-emerald-600/25 hover:border-emerald-600/40'
                }`}
              >

                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge
                    className={`rounded-full px-3 py-1 ${
                      tier.highlight ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {tier.badge}
                  </Badge>
                </div>
                <CardContent className="flex flex-1 flex-col p-8">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <tier.icon className="size-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-stone-900">{tier.title}</h3>
                  <p className="mt-1 min-h-10 text-sm text-stone-500">{tier.tagline}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-stone-900">{tier.price}</span>
                    <span className="text-stone-500">{tier.unit}</span>
                  </div>
                  <p className="mt-4 flex-1 text-sm text-stone-600">{tier.desc}</p>
                  <span className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                    <MapPin className="size-3.5" /> {tier.format}
                  </span>
                  <div className="mt-6 flex flex-col gap-2">
                    <DetailModal
                      data={MODALS[tier.key]}
                      trigger={
                        <Button variant="outline" className="rounded-full border-emerald-600/40 text-emerald-700 hover:bg-emerald-50">
                          Learn More
                        </Button>
                      }
                    />
                    <Button
                      asChild
                      className={`rounded-full ${
                        tier.highlight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-stone-900 hover:bg-stone-800'
                      }`}
                    >
                      <Link href={tier.key === 'inperson' ? '/connect' : '/signup'}>{tier.cta}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== PLATFORM / COMMAND CENTER ===================== */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              More than a coach
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Your Entire Fitness Command Center
            </h2>
            <p className="mt-4 text-lg text-stone-600">
              <strong className="text-stone-800">Most trainers run on Google Docs and spreadsheets.</strong>{' '}
              I built you a real app — everything in one place, fully interactive, and made for how
              clients and coaches actually work.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FEATURES.map((f) => (
              <Card
                key={f.title}
                className="group border-emerald-600/20 bg-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-600/40 hover:shadow-[0_0_15px_oklch(65%_0.16_151_/_0.25),0_4px_20px_oklch(65%_0.16_151_/_0.25)]"
              >
                <CardContent className="p-6">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                    <f.icon className="size-6" />
                  </div>
                  <h4 className="mt-4 text-lg font-semibold text-stone-900">{f.title}</h4>
                  <p className="mt-2 text-sm text-stone-600">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl rounded-xl bg-emerald-50/70 p-4 text-center text-sm text-stone-600">
            Full platform access is included with <strong>Online Coaching</strong> and{' '}
            <strong>Complete Transformation</strong>. <strong>In-Person Training</strong> includes
            essential app access — booking, coach chat, and billing.
          </p>
        </div>
      </section>

      {/* ===================== COMPARISON CHART ===================== */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Compare All Three Options
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              See exactly what you get at every level — and why most clients choose Complete
              Transformation
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="mx-auto w-full min-w-[720px] max-w-5xl border-separate border-spacing-0 overflow-hidden rounded-2xl border border-emerald-600/20 bg-white shadow-sm">
              <thead>
                <tr>
                  <th className="border-b border-emerald-600/15 bg-stone-50 p-4 text-left text-sm font-semibold text-stone-700">
                    What You Get
                  </th>
                  <th className="border-b border-emerald-600/15 bg-stone-50 p-4 text-center">
                    <span className="block text-sm font-bold text-stone-800">In-Person Training</span>
                    <span className="mt-1 block font-bold text-emerald-600">
                      $75<small className="text-xs font-medium text-stone-400">/session</small>
                    </span>
                  </th>
                  <th className="border-b border-emerald-600/15 bg-stone-50 p-4 text-center">
                    <span className="block text-sm font-bold text-stone-800">Online Coaching</span>
                    <span className="mt-1 block font-bold text-emerald-600">
                      $200<small className="text-xs font-medium text-stone-400">/month</small>
                    </span>
                  </th>
                  <th className="border-b-2 border-emerald-600 bg-emerald-50 p-4 text-center">
                    <Badge className="mb-1 rounded-full bg-emerald-600 text-white">Best Value</Badge>
                    <span className="block text-sm font-bold text-emerald-700">Complete Transformation</span>
                    <span className="mt-1 block font-bold text-emerald-600">
                      $250<small className="text-xs font-medium text-stone-400">/month</small>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature}>
                    <td className="border-b border-stone-100 p-4 text-left text-sm font-medium text-stone-700">
                      {row.feature}
                      {row.seattle && <span className="ml-1 text-xs font-normal text-stone-400">{row.seattle}</span>}
                    </td>
                    <td className="border-b border-stone-100 p-4 text-center">
                      <ComparisonCell cell={row.cells[0]} />
                    </td>
                    <td className="border-b border-stone-100 p-4 text-center">
                      <ComparisonCell cell={row.cells[1]} />
                    </td>
                    <td className="border-b border-stone-100 bg-emerald-50/50 p-4 text-center">
                      <ComparisonCell cell={row.cells[2]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Next-step lanes */}
          <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
            <Card className="border-emerald-600/25 bg-white">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                  <CircleHelp className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Still deciding?</h4>
                  <p className="mt-1 text-sm text-stone-600">
                    Have a question about the options or not sure which fits? Book a free intro call —
                    no commitment, just clarity.
                  </p>
                  <Button asChild variant="link" className="mt-1 h-auto p-0 text-emerald-700">
                    <Link href="/connect">
                      Book a free intro call <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="border-emerald-600 bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Rocket className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900">Ready to begin?</h4>
                  <p className="mt-1 text-sm text-stone-600">
                    Pick your plan and get instant access. Right after, you&apos;ll book a free setup
                    call in your dashboard where we map out your personalized plan together.
                  </p>
                  <Button asChild className="mt-3 rounded-full bg-emerald-600 hover:bg-emerald-700">
                    <Link href="/signup">
                      Get started <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-stone-500">
            <MapPin className="size-4 text-stone-400" />
            Online coaching is available worldwide. In-person sessions are available in the Seattle
            area only.
          </p>
        </div>
      </section>

      {/* ===================== EMPATHY ===================== */}
      <section className="border-y border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
              The real reason
            </span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Why most people never see results — and why it&apos;s not your fault
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Card className="border-red-200 bg-red-50/40">
              <CardContent className="p-8">
                <div className="flex items-center gap-2 font-semibold text-red-600">
                  <X className="size-5" /> What goes wrong
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
                <div className="flex items-center gap-2 font-semibold text-emerald-700">
                  <Check className="size-5" /> How I do it differently
                </div>
                <p className="mt-4 text-stone-700">
                  I&apos;ve been over 100 pounds heavier myself, and I had to completely rewire how I
                  think about food and training.
                </p>
                <p className="mt-3 text-stone-700">
                  So I meet you exactly where you are — not where some &quot;perfect plan&quot; assumes
                  you should be — and we build the skills together, one realistic step at a time, so
                  the change actually lasts.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== APPROACH + MY PROMISE ===================== */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              The Right Approach For Your Fitness Journey
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              Whatever your starting point, there is a fit — and most clients quickly find that one
              option simply gives the most.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {APPROACH.map((a) => (
              <Card
                key={a.title}
                className={`relative ${a.popular ? 'border-emerald-600 shadow-[0_0_20px_oklch(65%_0.16_151_/_0.2)]' : 'border-emerald-600/25'} bg-white`}
              >
                {a.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full bg-emerald-600 text-white">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <a.icon className="size-6" />
                  </div>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-emerald-600">
                    {a.persona}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-stone-900">{a.title}</h3>
                  <p className="mt-2 text-sm text-stone-600">{a.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* My Promise */}
          <div className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 to-emerald-800 p-8 text-white shadow-xl md:grid md:grid-cols-[1fr_1.2fr] md:gap-10 md:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider">
                <Handshake className="size-4" /> My Promise
              </div>
              <h3 className="mt-4 text-2xl font-bold leading-tight">
                I don&apos;t create dependence — I build independence.
              </h3>
            </div>
            <div className="mt-6 space-y-4 text-emerald-50 md:mt-0">
              <p>
                My goal is to teach you the skills to stay in shape on your own — so your results last
                for life, not just while we work together. Most coaches overcomplicate food and
                training so you stay dependent on them; I do the opposite.
              </p>
              <p>
                You&apos;ll learn how to order at any restaurant, train in any gym, and handle a
                vacation or a night out without losing your progress. Diets are temporary structure —
                the skills I teach are for life, long after you stop needing a coach.
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-2xl text-center text-stone-600">
            Every option is tailored to you, and you can upgrade anytime — but Complete Transformation
            gives you the most room to grow from day one.
          </p>
        </div>
      </section>

      {/* ===================== VALUE COMPARISON ===================== */}
      <section id="value-comparison-section" className="border-t border-emerald-600/15 bg-white/60 py-10 md:py-14">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              Why Our Services Are Your Best Investment
            </h2>
            <p className="mt-3 text-lg text-stone-600">
              See how much Complete Transformation would cost if you bought every piece separately
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Coffee comparison */}
            <Card className="border-emerald-600/25 bg-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Coffee className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">Less Than Your Daily Coffee</h3>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-lg border border-stone-100 p-4">
                    <span className="flex items-center gap-2 text-stone-600">
                      <Coffee className="size-4" /> Starbucks Latte:
                    </span>
                    <span>
                      <span className="text-lg font-bold text-stone-900">$5.50</span>
                      <span className="text-sm text-stone-500">/day</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-50/70 p-4">
                    <span className="flex items-center gap-2 font-medium text-emerald-800">
                      <Laptop className="size-4" /> Complete Transformation:
                    </span>
                    <span>
                      <span className="text-lg font-bold text-emerald-700">$8.33</span>
                      <span className="text-sm text-stone-500">/day</span>
                    </span>
                  </div>
                </div>
                <p className="mt-6 text-center text-sm text-stone-600">
                  For less than $9/day, get your entire fitness solution
                </p>
              </CardContent>
            </Card>

            {/* Value breakdown */}
            <Card id="savings-comparison-table" className="border-emerald-600/25 bg-white">
              <CardContent className="p-8">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Tags className="size-5" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Complete Transformation vs. Typical Fitness Coaching
                  </h3>
                </div>
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-stone-100 font-semibold text-stone-700">
                        <td className="py-3">Service Feature</td>
                        <td className="py-3 text-center">SHREY.FIT</td>
                        <td className="py-3 text-right">Bought Separately</td>
                      </tr>
                      {SAVINGS.map((s) => (
                        <tr key={s.feature} className="border-b border-stone-100">
                          <td className="py-3 text-stone-700">{s.feature}</td>
                          <td className="py-3 text-center text-emerald-700">Included</td>
                          <td className="py-3 text-right">
                            <span className="font-bold text-stone-900">{s.sep}</span>
                            <span className="text-stone-500">/month</span>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-b-2 border-dashed border-stone-200 bg-stone-50 font-semibold">
                        <td className="py-3.5">Coaching Value Total</td>
                        <td className="py-3.5 text-center text-emerald-700">
                          <span className="font-bold">$250</span>/mo
                        </td>
                        <td className="py-3.5 text-right">
                          <span className="font-bold text-stone-900">$1,299</span>
                          <span className="text-stone-500">/month</span>
                        </td>
                      </tr>
                      <tr className="bg-emerald-50">
                        <td className="py-3.5 font-semibold text-emerald-800">You Save Every Month</td>
                        <td className="py-3.5"></td>
                        <td className="py-3.5 text-right text-lg font-bold text-emerald-600">$1,049</td>
                      </tr>
                      <tr className="bg-amber-50">
                        <td className="py-3.5" colSpan={3}>
                          <span className="flex items-start gap-2 text-stone-700">
                            <Gift className="mt-0.5 size-4 shrink-0 text-amber-500" />
                            <span>
                              And on top of all that — a locked-in <strong>$60</strong> in-person
                              training rate (Seattle), below the $75 walk-in. The coaching alone
                              already pays for itself; this is just the cherry on top.
                            </span>
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== FINAL CTA ===================== */}
      <section className="px-6 py-14">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-16 text-center shadow-xl md:px-16">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Not sure which option is right for you?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-emerald-50">
            Schedule a free consultation to discuss your goals and find your perfect fitness solution.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-white px-7 text-base text-emerald-700 hover:bg-emerald-50"
            >
              <Link href="/connect">
                <CalendarCheck className="size-4" /> Schedule Free Consultation
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-white/70 bg-transparent px-7 text-base text-white hover:bg-white/10"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
