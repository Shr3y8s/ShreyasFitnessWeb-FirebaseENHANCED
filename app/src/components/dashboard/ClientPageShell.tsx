"use client";

/**
 * ClientPageShell — shared mobile-ready frame for every /dashboard/client/* page.
 *
 * Renders the sidebar, the mobile top bar (hamburger + SHREY.FIT / Client Portal),
 * and the floating "Liquid Glass" bottom tab bar so navigation is consistent and
 * reachable on phones across all client sub-pages (Tasks, Plan, Nutrition,
 * Progress, Activity, etc.).
 *
 * These sub-pages are light-only (no forest/dark theme toggle — that lives on the
 * main dashboard), so the shell uses the default styling.
 */

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { MobileTabBar } from '@/components/dashboard/mobile-tab-bar';

interface ClientPageShellProps {
  children: ReactNode;
  /** Extra classes for the content wrapper (rare — defaults handle padding). */
  className?: string;
}

export function ClientPageShell({ children, className }: ClientPageShellProps) {
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) router.push('/login');
    } catch {
      /* silent — matches existing per-page behavior */
    }
  };

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        userProfilePhoto={userData?.profilePhotoSmall || undefined}
        onLogout={handleLogout}
      />
      <SidebarInset>
        {/* Mobile top bar — hamburger is the only way to reach nav on phones. */}
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border/50 bg-background/80 px-4 py-3 backdrop-blur-md">
          <SidebarTrigger className="size-9 text-foreground" />
          <div className="flex flex-col leading-none">
            <span className="font-bold text-base tracking-wide">
              SHREY<span className="text-primary">.</span>FIT
            </span>
            <span className="text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground mt-0.5">
              Client Portal
            </span>
          </div>
        </div>

        <div className={`client-surface p-4 sm:p-6 lg:p-8 pb-28 md:pb-8${className ? ` ${className}` : ''}`}>
          {children}
        </div>

        {/* App-like floating bottom tab bar (mobile only) */}
        <MobileTabBar />
      </SidebarInset>
    </SidebarProvider>
  );
}
