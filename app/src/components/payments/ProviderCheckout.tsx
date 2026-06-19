'use client';

// Provider-agnostic checkout trigger. Pages render <ProviderCheckout .../> and
// never reference a specific processor. It branches on the active provider's
// capabilities:
//   - redirect providers (Stripe): a button that calls startCheckout() then
//     follows the returned URL.
//   - button providers (PayPal Smart Buttons, capabilities.buttonCheckout): mounts
//     the provider's in-place buttons via renderCheckout() and navigates to
//     successUrl on approval.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.3a)

import { useEffect, useRef, useState } from 'react';
import { getPaymentProvider } from '@/lib/payments';
import type { CheckoutOptions } from '@/lib/payments';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ProviderCheckoutProps {
  mode: CheckoutOptions['mode'];
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  email?: string;
  metadata?: Record<string, string>;
  /** Label for the redirect-style button (ignored by button-checkout providers). */
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Optional hook fired right before checkout starts (e.g. GA4 begin_checkout). */
  onBeforeCheckout?: () => void;
  onError?: (e: unknown) => void;
}

export function ProviderCheckout({
  mode,
  priceId,
  successUrl,
  cancelUrl,
  userId,
  email,
  metadata,
  label = 'Continue to Payment',
  disabled = false,
  className,
  onBeforeCheckout,
  onError,
}: ProviderCheckoutProps) {
  const provider = getPaymentProvider({ mode });
  const isButton = provider.capabilities.buttonCheckout;
  const containerRef = useRef<HTMLDivElement>(null);
  const [processing, setProcessing] = useState(false);

  const opts: CheckoutOptions = {
    userId,
    email,
    priceId,
    mode,
    successUrl,
    cancelUrl,
    metadata,
  };

  // Button-checkout providers: mount their buttons into the container.
  useEffect(() => {
    if (!isButton || !provider.renderCheckout || !containerRef.current) return;

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    onBeforeCheckout?.();
    provider
      .renderCheckout({
        ...opts,
        container: containerRef.current,
        onApproved: () => {
          window.location.href = successUrl;
        },
        onError: (e) => onError?.(e),
      })
      .then((unmount) => {
        if (cancelled) {
          unmount();
        } else {
          cleanup = unmount;
        }
      })
      .catch((e) => onError?.(e));

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isButton, priceId, mode]);

  if (isButton) {
    // PayPal Smart Buttons render here.
    return <div ref={containerRef} className={className} />;
  }

  // Redirect-style providers (Stripe): a button that starts checkout.
  const handleClick = async () => {
    setProcessing(true);
    try {
      onBeforeCheckout?.();
      const { url } = await provider.startCheckout(opts);
      if (url) window.location.href = url;
    } catch (e) {
      setProcessing(false);
      onError?.(e);
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled || processing} className={className}>
      {processing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        label
      )}
    </Button>
  );
}
