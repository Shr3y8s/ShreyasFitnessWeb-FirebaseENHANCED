'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Lock,
  ArrowRight,
  ClipboardList,
  Apple,
  Dumbbell,
  BarChart3,
  Goal,
  Activity,
  PhoneCall,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import type { ClientFeatureKey } from '@/lib/constants';

/**
 * Friendly upsell shown when a client whose tier lacks a feature reaches a gated
 * route (deep-link) — see docs/02-implementation/tier-feature-gating/. It's a soft
 * upsell (not a redirect): the client stays in-context and is offered Online
 * Coaching, with a CTA to the existing /dashboard/client/upgrade flow.
 */

interface UpsellCopy {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  blurb: string;
  bullets: string[];
}

const FEATURE_COPY: Partial<Record<ClientFeatureKey, UpsellCopy>> = {
  plan: {
    icon: ClipboardList,
    title: 'Your personalized plan lives here',
    blurb:
      'Online Coaching includes a custom training & nutrition plan built and updated by your coach.',
    bullets: ['Tailored training protocol', 'Nutrition targets & habits', 'Updated as you progress'],
  },
  nutrition: {
    icon: Apple,
    title: 'Unlock your Nutrition Hub',
    blurb:
      'Online Coaching includes a coach-built nutrition plan, daily targets, and habit tracking.',
    bullets: ['Personalized macros & meals', 'Daily habit tracking', 'Coach feedback'],
  },
  workouts: {
    icon: Dumbbell,
    title: 'Get coach-assigned workouts',
    blurb:
      'Online Coaching delivers structured workouts you can follow, track, and log every session.',
    bullets: ['Programmed workouts', 'Set-by-set logging', 'Progress over time'],
  },
  progress: {
    icon: BarChart3,
    title: 'Track your progress',
    blurb:
      'Online Coaching unlocks progress charts, key metrics, and trends so you can see results.',
    bullets: ['Body metrics & trends', 'Performance charts', 'Milestone tracking'],
  },
  goals: {
    icon: Goal,
    title: 'Set goals & milestones',
    blurb:
      'Online Coaching lets you and your coach set goals and track milestones together.',
    bullets: ['Coach-guided goals', 'Milestone tracking', 'Accountability'],
  },
  logging: {
    icon: Activity,
    title: 'Daily logging & check-ins',
    blurb:
      'Online Coaching includes daily activity logging, weekly surveys, and progress photos.',
    bullets: ['Daily activities', 'Weekly surveys', 'Progress photos'],
  },
  checkins: {
    icon: PhoneCall,
    title: 'Weekly check-ins with your coach',
    blurb:
      'Online Coaching includes recurring weekly check-ins to review progress and adjust your plan.',
    bullets: ['Scheduled check-ins', 'Plan adjustments', 'Ongoing accountability'],
  },
  tasks: {
    icon: ListTodo,
    title: 'Stay on track with tasks',
    blurb:
      'Online Coaching gives your coach a way to assign and track tasks that keep you moving forward.',
    bullets: ['Coach-assigned tasks', 'Clear next steps', 'Progress tracking'],
  },
};

const DEFAULT_COPY: UpsellCopy = {
  icon: Sparkles,
  title: 'Upgrade to Online Coaching',
  blurb: 'This feature is part of Online Coaching. Upgrade to unlock your full dashboard.',
  bullets: ['Personalized plan', 'Nutrition & workouts', 'Progress tracking & check-ins'],
};

export function UpgradeUpsell({ feature }: { feature: ClientFeatureKey }) {
  const copy = FEATURE_COPY[feature] ?? DEFAULT_COPY;
  const Icon = copy.icon;

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full rounded-xl border bg-primary/5 border-primary/40 shadow-sm">
        <CardContent className="text-center py-10 px-6 space-y-5">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center relative">
            <Icon className="w-7 h-7 text-primary" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Lock className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold">{copy.title}</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{copy.blurb}</p>
          </div>

          <ul className="text-sm text-left max-w-xs mx-auto space-y-2">
            {copy.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <ArrowRight className="w-3 h-3" />
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/dashboard/client/upgrade">
                Upgrade to Online Coaching
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Have questions?{' '}
            <Link href="/dashboard/client/messages" className="text-primary hover:underline">
              Message your coach
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
