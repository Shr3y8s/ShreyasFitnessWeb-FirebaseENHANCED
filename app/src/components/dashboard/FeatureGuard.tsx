'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getClientFeatureAccess, type ClientFeatureKey } from '@/lib/constants';
import { UpgradeUpsell } from './UpgradeUpsell';

/**
 * Gates a page body by a single tier feature (see
 * docs/02-implementation/tier-feature-gating/). When the current client's tier
 * lacks the feature, a friendly upsell panel is shown instead of the page content.
 *
 * UI-only gating: the underlying data is already owner-scoped by firestore.rules,
 * so this is a product/UX guard with no data-exposure risk. Deep-links are handled
 * gracefully (soft upsell, no redirect).
 */
export function FeatureGuard({
  feature,
  children,
  fallback,
}: {
  feature: ClientFeatureKey;
  children: ReactNode;
  /** Optional custom node shown when access is denied (defaults to UpgradeUpsell). */
  fallback?: ReactNode;
}) {
  const { userData, loading } = useAuth();

  // While auth resolves, render nothing (avoids a flash of either state).
  if (loading) return null;

  const access = getClientFeatureAccess(userData?.tier);

  if (!access[feature]) {
    return <>{fallback ?? <UpgradeUpsell feature={feature} />}</>;
  }

  return <>{children}</>;
}
