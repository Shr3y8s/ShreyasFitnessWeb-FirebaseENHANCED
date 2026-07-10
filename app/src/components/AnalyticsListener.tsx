'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackEvent } from '@/lib/firebase';
import { captureUtmFromUrl } from '@/lib/attribution';


/**
 * Fires a Firebase Analytics `page_view` event on every client-side route change.
 *
 * `useSearchParams()` triggers a CSR bailout during static prerender, so the
 * hook usage lives in an inner component wrapped in <Suspense> (same pattern
 * used across the trainer pages). The outer export is safe to mount in the
 * root layout.
 */
function AnalyticsListenerInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    // Capture any UTM/gclid params on this landing before we emit page_view, so
    // first-touch attribution is stored the moment a campaign link is opened.
    captureUtmFromUrl();
    const query = searchParams?.toString();
    const page_path = query ? `${pathname}?${query}` : pathname;
    trackEvent('page_view', {
      page_path,
      page_location: typeof window !== 'undefined' ? window.location.href : undefined,
      page_title: typeof document !== 'undefined' ? document.title : undefined,
    });
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsListener() {
  return (
    <Suspense fallback={null}>
      <AnalyticsListenerInner />
    </Suspense>
  );
}
