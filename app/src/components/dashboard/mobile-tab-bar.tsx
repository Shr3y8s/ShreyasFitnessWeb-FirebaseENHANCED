"use client";

/**
 * MobileTabBar — app-like bottom navigation for the client portal on phones.
 *
 * Shows the 5 most-frequent on-the-go destinations as a fixed bottom bar
 * (hidden on md+ where the full sidebar is always visible). The 5th tab,
 * "More", opens the full sidebar drawer via the shared SidebarProvider context
 * (useSidebar) so every other destination (Plan, Goals, Billing, Profile, etc.)
 * remains one tap away.
 *
 * Tier-aware: clients without full-dashboard access (in-person only) don't have
 * Nutrition/Progress, so those tabs fall back to always-available destinations.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, Apple, BarChart3, Menu, type LucideIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { getClientFeatureAccess } from '@/lib/constants';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

interface TabItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  /** When true, opens the sidebar drawer instead of navigating. */
  isMore?: boolean;
  /** Match this path prefix for active highlighting. */
  match?: (pathname: string) => boolean;
}

interface MobileTabBarProps {
  /** Dashboard theme — forest needs a dark-green bar instead of white. */
  theme?: 'default' | 'dark' | 'forest';
}

export function MobileTabBar({ theme = 'default' }: MobileTabBarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { userData } = useAuth();
  const access = getClientFeatureAccess(userData?.tier);
  const isForest = theme === 'forest';


  // Build the 5 tabs. Coaching clients get the rich set; in-person-only clients
  // (no nutrition/progress) get workout-booking + messages instead so no tab is
  // a dead link.
  const tabs: TabItem[] = [
    {
      label: 'Home',
      href: '/dashboard/client',
      icon: Home,
      match: (p) => p === '/dashboard/client',
    },
    access.workouts
      ? {
          label: 'Workouts',
          href: '/dashboard/client/workouts',
          icon: Dumbbell,
          match: (p) => p.startsWith('/dashboard/client/workouts'),
        }
      : {
          label: 'Sessions',
          href: '/dashboard/client/sessions/schedule',
          icon: Dumbbell,
          match: (p) => p.startsWith('/dashboard/client/sessions'),
        },
    access.nutrition
      ? {
          label: 'Nutrition',
          href: '/dashboard/client/nutrition',
          icon: Apple,
          match: (p) => p.startsWith('/dashboard/client/nutrition'),
        }
      : {
          label: 'Trainer',
          href: '/dashboard/client/trainer',
          icon: Apple,
          match: (p) => p.startsWith('/dashboard/client/trainer'),
        },
    access.progress
      ? {
          label: 'Progress',
          href: '/dashboard/client/progress',
          icon: BarChart3,
          match: (p) => p.startsWith('/dashboard/client/progress'),
        }
      : {
          label: 'Billing',
          href: '/dashboard/client/billing',
          icon: BarChart3,
          match: (p) => p.startsWith('/dashboard/client/billing'),
        },
    { label: 'More', icon: Menu, isMore: true },
  ];

  return (
    <nav
      className={cn(
        // Floating "Liquid Glass" pill — detached from edges, hovers above content.
        'md:hidden fixed inset-x-3 z-40 rounded-3xl border backdrop-blur-xl',
        'shadow-[0_8px_30px_rgba(0,0,0,0.18)]',
        isForest
          ? 'border-white/15 bg-[#0d3d20]/55 ring-1 ring-white/10'
          : 'border-white/50 bg-background/60 ring-1 ring-white/40'
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around gap-1 px-1.5 py-1.5">
        {tabs.map((tab) => {
          const active = tab.match ? tab.match(pathname) : false;
          const Icon = tab.icon;

          const inner = (
            <span
              className={cn(
                // Each tab is a rounded capsule; the active one gets a soft glass fill.
                'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 min-h-13 text-[0.65rem] font-medium',
                'transition-all duration-200 active:scale-95',
                active && (isForest ? 'bg-white/15' : 'bg-primary/12'),
                isForest
                  ? active
                    ? 'text-green-200'
                    : 'text-white/70 hover:text-white'
                  : active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5 transition-transform duration-200', active && 'scale-110')} />
              {tab.label}
            </span>
          );


          if (tab.isMore) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setOpenMobile(true)}
                className="flex flex-1"
                aria-label="Open full menu"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link key={tab.label} href={tab.href!} className="flex flex-1" aria-current={active ? 'page' : undefined}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}


