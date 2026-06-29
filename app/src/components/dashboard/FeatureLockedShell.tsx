'use client';

import { useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { UpgradeUpsell } from '@/components/dashboard/UpgradeUpsell';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';
import { getClientFeatureAccess, type ClientFeatureKey } from '@/lib/constants';

/**
 * Self-contained "feature locked" page shell for tier gating (see
 * docs/02-implementation/tier-feature-gating/). Renders the normal client
 * dashboard chrome (sidebar) with the UpgradeUpsell panel as the content.
 *
 * Usage in a gated page — early-return AFTER all hooks:
 *
 *   const { userData } = useAuth();
 *   ...all hooks...
 *   if (!getClientFeatureAccess(userData?.tier).nutrition) {
 *     return <FeatureLockedShell feature="nutrition" />;
 *   }
 *
 * It pulls user + logout itself so callers don't need to thread props.
 */
export function FeatureLockedShell({ feature }: { feature: ClientFeatureKey }) {
  const router = useRouter();
  const { userData } = useAuth();

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
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
        <div className="min-h-screen bg-primary/5">
          <UpgradeUpsell feature={feature} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Re-export for convenience so a page can do a one-line tier check. */
export { getClientFeatureAccess };
