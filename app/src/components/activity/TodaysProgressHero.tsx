"use client";

/**
 * TodaysProgressHero — the "am I done for today?" summary card.
 *
 * Problem it solves: the Daily Activities page is a vertical stack of 4–5 logger
 * cards. On desktop you can see them all at once and eyeball your day; on a phone
 * you scroll through several screen-heights with no idea how much is left. Each
 * card knows its own progress, but nothing knew the *day's* progress.
 *
 * This card shows one master ring (the average completion across only the modules
 * the coach actually assigned) plus a row of tappable chips that jump straight to
 * the matching logger card — turning several screens of scrolling into one tap.
 *
 * Purely presentational: it derives everything from props the page has already
 * fetched. No data fetching, no writes.
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CircularProgress } from '@/components/ui/circular-progress';
import { Footprints, Droplets, Target, HeartPulse, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** DOM ids the page assigns to each logger card so chips can scroll to them. */
export const ACTIVITY_SECTION_IDS = {
  steps: 'activity-steps',
  water: 'activity-water',
  habits: 'activity-habits',
  cardio: 'activity-cardio',
} as const;

interface ModuleState {
  /** Whether the coach assigned this module (unassigned modules are excluded). */
  assigned: boolean;
  /** Progress 0–100 for this module. */
  percentage: number;
  /** Short status text shown on the chip, e.g. "6/8" or "✓". */
  label: string;
}

export interface TodaysProgressHeroProps {
  steps: ModuleState;
  water: ModuleState;
  habits: ModuleState;
  cardio: ModuleState;
  /** True when viewing today (vs. back-filling a past day) — changes the copy. */
  isToday: boolean;
  /** Fired once when every assigned module first reaches 100%. */
  onAllComplete?: () => void;
}

interface ChipConfig {
  key: keyof typeof ACTIVITY_SECTION_IDS;
  name: string;
  icon: LucideIcon;
  iconClass: string;
  state: ModuleState;
}

/** Smooth-scrolls a logger card into view, accounting for the sticky header. */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  el.scrollIntoView({
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
    block: 'center',
  });
}

export function TodaysProgressHero({
  steps,
  water,
  habits,
  cardio,
  isToday,
  onAllComplete,
}: TodaysProgressHeroProps) {
  const chips: ChipConfig[] = [
    { key: 'steps', name: 'Steps', icon: Footprints, iconClass: 'text-primary', state: steps },
    { key: 'water', name: 'Water', icon: Droplets, iconClass: 'text-blue-500', state: water },
    { key: 'habits', name: 'Habits', icon: Target, iconClass: 'text-green-500', state: habits },
    { key: 'cardio', name: 'Cardio', icon: HeartPulse, iconClass: 'text-red-500', state: cardio },
  ];

  const assignedChips = chips.filter((c) => c.state.assigned);

  // Overall = mean of assigned modules only, so a client without a water goal
  // isn't permanently stuck at 75%.
  const overall =
    assignedChips.length > 0
      ? Math.round(
          assignedChips.reduce((sum, c) => sum + Math.min(100, c.state.percentage), 0) /
            assignedChips.length
        )
      : 0;

  const allComplete = assignedChips.length > 0 && overall >= 100;
  const completedCount = assignedChips.filter((c) => c.state.percentage >= 100).length;

  // Fire the celebration exactly once per transition into "all complete".
  const hasCelebrated = React.useRef(false);
  React.useEffect(() => {
    if (allComplete && !hasCelebrated.current) {
      hasCelebrated.current = true;
      onAllComplete?.();
    }
    if (!allComplete) {
      hasCelebrated.current = false;
    }
  }, [allComplete, onAllComplete]);

  // Nothing assigned yet — the page shows its own empty state instead.
  if (assignedChips.length === 0) return null;

  const headline = allComplete
    ? isToday
      ? 'Day Complete 🎉'
      : 'All Logged 🎉'
    : isToday
      ? "Today's Progress"
      : "That Day's Progress";

  const subline = allComplete
    ? 'Every goal hit. Outstanding work.'
    : `${completedCount} of ${assignedChips.length} goals complete`;

  return (
    <Card
      className={cn(
        'transition-all duration-300 hover:shadow-glow hover:-translate-y-1 border-primary/50',
        allComplete ? 'bg-green-500/10' : 'bg-primary/5'
      )}
    >
      <CardContent className="p-4 sm:p-6">
        {/* Master ring + headline */}
        <div className="flex items-center gap-4">
          <CircularProgress percentage={overall} size={88} strokeWidth={9}>
            <span
              className={cn(
                'text-lg font-bold tabular-nums',
                allComplete ? 'text-green-600 dark:text-green-400' : 'text-foreground'
              )}
            >
              {overall}%
            </span>
          </CircularProgress>

          <div className="min-w-0 flex-1">
            <p className="text-lg sm:text-xl font-bold text-foreground">{headline}</p>
            <p className="text-sm text-muted-foreground">{subline}</p>
          </div>
        </div>

        {/* Tappable jump chips — one tap replaces scrolling past several cards */}
        <div className="mt-4 flex flex-wrap gap-2">
          {assignedChips.map(({ key, name, icon: Icon, iconClass, state }) => {
            const done = state.percentage >= 100;
            return (
              <button
                key={key}
                type="button"
                onClick={() => scrollToSection(ACTIVITY_SECTION_IDS[key])}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5',
                  'text-xs font-semibold transition-all active:scale-95',
                  done
                    ? 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
                aria-label={`${name}: ${state.label}. Jump to ${name} section`}
              >
                <Icon className={cn('h-3.5 w-3.5 shrink-0', done ? 'text-green-600' : iconClass)} />
                <span>{name}</span>
                <span className="tabular-nums opacity-80">{state.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
