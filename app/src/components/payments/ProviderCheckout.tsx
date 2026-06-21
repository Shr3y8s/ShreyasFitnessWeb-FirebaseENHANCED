'use client';

// Provider-agnostic checkout trigger. Pages render <ProviderCheckout .../> and
// never reference a specific processor.
//
// Two layouts:
//  - INLINE (default, `cardMode="inline"`): render a TRIGGER BUTTON first — nothing
//    happens (no account creation, no SDK popup) until the user clicks. On click we run
//    `onBeforeCheckout`, then branch on the active provider's capabilities:
//      - redirect providers (Stripe): startCheckout() then follow the returned URL.
//      - button providers (PayPal): reveal a container and renderCheckout() (mounts
//        PayPal Smart Buttons) + the ACDC card fields below; on approval navigate to
//        successUrl.
//  - MODAL (`cardMode="modal"`, used by the unified /checkout page): wallet/Smart
//    Buttons mount immediately (no trigger), and the ACDC hosted card fields live in a
//    Radix Dialog opened by a "Pay with debit/credit card" button.
//
// The webhook is the source of truth for fulfillment; `onApproved` only navigates.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.3a, §2.7)

import { useEffect, useRef, useState } from 'react';
import { getPaymentProvider } from '@/lib/payments';
import type { CheckoutOptions, BillingAddress } from '@/lib/payments';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { PaymentMethodLogos } from '@/components/payments/PaymentMethodLogos';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';



/**
 * onBeforeCheckout may create the account and return the resolved userId, plus any
 * metadata that depends on it (e.g. the signup flow only knows the uid after the
 * account is created). Returned metadata is merged over the `metadata` prop.
 */
type BeforeCheckoutResult =
  | void
  | { userId?: string; metadata?: Record<string, string> };


interface ProviderCheckoutProps {
  mode: CheckoutOptions['mode'];
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  /** Known userId for logged-in pages. Signup flow can omit and supply it via onBeforeCheckout. */
  userId?: string;
  email?: string;
  metadata?: Record<string, string>;
  /** Label for the trigger button. */
  label?: string;
  /** Label for the modal's primary pay button (e.g. "Pay $75.00"). */
  payLabel?: string;
  disabled?: boolean;
  className?: string;

  /**
   * Card-fields layout (button providers only):
   *  - 'inline' (default): card fields appear below the wallet buttons after the trigger click.
   *  - 'modal': wallet buttons mount immediately; card fields open in a modal.
   */
  cardMode?: 'inline' | 'modal';
  /**
   * Fired before the processor call. May be async and may return `{ userId }`
   * (e.g. after creating the Firebase account + reCAPTCHA). Also the place to emit
   * GA4 begin_checkout. Throw to abort checkout. In modal mode it runs once on mount.
   */
  onBeforeCheckout?: () => BeforeCheckoutResult | Promise<BeforeCheckoutResult>;
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
  payLabel = 'Pay now',
  disabled = false,
  className,
  cardMode = 'inline',
  onBeforeCheckout,
  onError,
}: ProviderCheckoutProps) {

  const provider = getPaymentProvider({ mode });
  const isButton = provider.capabilities.buttonCheckout;
  const isCardFields = !!provider.capabilities.cardFields && !!provider.renderCardFields;
  const isModal = isButton && cardMode === 'modal';

  const containerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const modalCardContainerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const cardSubmitRef = useRef<((billingAddress?: BillingAddress) => Promise<void>) | null>(null);
  const cardCleanupRef = useRef<(() => void) | null>(null);

  const [processing, setProcessing] = useState(false);
  const [buttonsMounted, setButtonsMounted] = useState(false);
  const [cardSubmitting, setCardSubmitting] = useState(false);

  // Modal-mode state
  const [walletMounting, setWalletMounting] = useState(isModal);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const optsRef = useRef<CheckoutOptions | null>(null);

  // Billing address (AVS) — collected as our own inputs, passed into card submit().
  const [billingCountry, setBillingCountry] = useState('US');
  const [billingPostal, setBillingPostal] = useState('');




  const buildOpts = (
    resolvedUserId: string,
    extraMetadata?: Record<string, string>
  ): CheckoutOptions => ({
    userId: resolvedUserId,
    email,
    priceId,
    mode,
    successUrl,
    cancelUrl,
    metadata: { ...(metadata ?? {}), ...(extraMetadata ?? {}) },
  });

  // ----- MODAL MODE: mount wallet buttons immediately on first render -----
  // Strict-Mode-safe: no one-shot ref guard (that left the wallet container empty
  // because Strict Mode's mount→unmount→remount closed the buttons after the first
  // mount and the guard blocked the real remount). Instead each run owns its mount
  // node + cleanup, and a `cancelled` flag drops a render that resolves post-unmount.
  useEffect(() => {
    if (!isModal || !provider.renderCheckout) return;

    let cancelled = false;
    let localCleanup: (() => void) | null = null;
    let mountEl: HTMLDivElement | null = null;

    setWalletMounting(true);
    (async () => {
      try {
        const before = await onBeforeCheckout?.();
        const resolvedUserId =
          (before && typeof before === 'object' && before.userId) || userId || '';
        const extraMetadata =
          before && typeof before === 'object' ? before.metadata : undefined;
        const opts = buildOpts(resolvedUserId, extraMetadata);
        optsRef.current = opts;

        if (cancelled || !containerRef.current || !provider.renderCheckout) {
          if (!cancelled) setWalletMounting(false);
          return;
        }
        // Mount into an inner plain DOM node React never reconciles (iframe isolation §2.3a).
        mountEl = document.createElement('div');
        containerRef.current.appendChild(mountEl);
        const cleanup = await provider.renderCheckout({
          ...opts,
          container: mountEl,
          onApproved: () => {
            window.location.href = successUrl;
          },
          onError: (e) => onError?.(e),
        });
        // If we were unmounted while the SDK was loading, tear the buttons back down.
        if (cancelled) {
          try { cleanup(); } catch { /* ignore */ }
          try { mountEl.remove(); } catch { /* ignore */ }
          return;
        }
        localCleanup = cleanup;
        cleanupRef.current = cleanup;
      } catch (e) {
        if (!cancelled) onError?.(e);
      } finally {
        if (!cancelled) setWalletMounting(false);
      }
    })();

    return () => {
      cancelled = true;
      try { localCleanup?.(); } catch { /* ignore */ }
      try { mountEl?.remove(); } catch { /* ignore */ }
      cleanupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal, priceId]);


  // ----- MODAL MODE: mount ACDC card fields when the modal opens -----
  // FLICKER FIX: React 19 Strict Mode (dev) runs effects mount→cleanup→mount, which
  // would build the PayPal CardFields, immediately tear them down, then rebuild —
  // the user sees the fields appear, vanish, reappear. To avoid that we mount ONCE
  // per real modal-open and DEFER teardown to a microtask/timeout; if the effect
  // re-runs synchronously (the Strict-Mode remount), we cancel the pending teardown
  // and keep the already-rendered fields. Real cleanup still runs when the modal
  // genuinely closes (cardModalOpen=false) or the component unmounts.
  const cardTeardownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardMountedRef = useRef(false);

  useEffect(() => {
    if (!isModal || !cardModalOpen || !isCardFields) return;
    if (!optsRef.current || !provider.renderCardFields) return;

    // A pending teardown from a Strict-Mode cleanup? Cancel it and reuse the fields.
    if (cardTeardownTimer.current) {
      clearTimeout(cardTeardownTimer.current);
      cardTeardownTimer.current = null;
    }
    if (cardMountedRef.current) {
      // Fields already mounted from the first (real) run — nothing to do.
      return;
    }
    cardMountedRef.current = true;

    let cancelled = false;
    let cardMountEl: HTMLDivElement | null = null;
    setCardFieldsReady(false);
    (async () => {
      try {
        // Wait a tick for the dialog content (and its ref) to mount.
        await new Promise((r) => setTimeout(r, 0));
        if (cancelled || !modalCardContainerRef.current) return;
        modalCardContainerRef.current.innerHTML = '';
        cardMountEl = document.createElement('div');
        modalCardContainerRef.current.appendChild(cardMountEl);
        const { submit, cleanup } = await provider.renderCardFields!({
          ...optsRef.current!,
          container: cardMountEl,
          onApproved: () => {
            window.location.href = successUrl;
          },
          onError: (e) => {
            setCardSubmitting(false);
            onError?.(e);
          },
        });
        cardSubmitRef.current = submit;
        cardCleanupRef.current = () => {
          try { cleanup(); } catch { /* ignore */ }
          try { cardMountEl?.remove(); } catch { /* ignore */ }
        };
        // render() resolves when the hosted-field iframes are created, but their
        // INTERNAL content (the input UI) paints a beat later. Wait a short settle
        // period behind the spinner so the user sees the finished fields, not them
        // filling in.
        await new Promise((r) => setTimeout(r, 350));
        if (cancelled) return;
        setCardFieldsReady(true);

      } catch (e) {
        if (!cancelled) onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      // Defer the real teardown. If this is just Strict Mode's synchronous remount,
      // the re-run above clears this timer before it fires (so no flicker). If the
      // modal really closed, the timer fires and tears the fields down.
      cardTeardownTimer.current = setTimeout(() => {
        try { cardCleanupRef.current?.(); } catch { /* ignore */ }
        cardCleanupRef.current = null;
        cardSubmitRef.current = null;
        cardMountedRef.current = false;
        setCardFieldsReady(false);
      }, 0);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal, cardModalOpen, isCardFields]);


  const handleClick = async () => {
    setProcessing(true);
    try {
      const before = await onBeforeCheckout?.();
      const resolvedUserId =
        (before && typeof before === 'object' && before.userId) || userId || '';
      const extraMetadata =
        before && typeof before === 'object' ? before.metadata : undefined;
      const opts = buildOpts(resolvedUserId, extraMetadata);


      if (isButton) {
        if (!provider.renderCheckout) {
          throw new Error('Active provider declares buttonCheckout but has no renderCheckout.');
        }
        // Reveal the container (it's ALWAYS rendered — see return below — so the ref
        // is never null even amid the auth-driven re-renders that follow account
        // creation in onBeforeCheckout).
        setButtonsMounted(true);
        if (!containerRef.current) {
          throw new Error('Checkout container not available.');
        }
        // Mount PayPal into an INNER plain DOM node that React never reconciles.

        // PayPal injects an <iframe> into whatever element we hand it; if that's a
        // React-owned node, the next React re-render (e.g. the auth-state change
        // after account creation, or a parent re-render) tries to reconcile the
        // PayPal-mutated DOM and throws NotFoundError (removeChild/insertBefore) →
        // blank white screen. By appending our own child div and rendering into
        // THAT, React only ever owns the empty outer wrapper.
        const mountEl = document.createElement('div');
        containerRef.current.appendChild(mountEl);
        cleanupRef.current = await provider.renderCheckout({

          ...opts,
          container: mountEl,

          onApproved: () => {
            window.location.href = successUrl;
          },
          onError: (e) => {
            setProcessing(false);
            onError?.(e);
          },
        });
        // Also mount ACDC hosted card fields (card-only, no PayPal account) into
        // their own isolated child node, alongside the wallet buttons.
        if (isCardFields && provider.renderCardFields && cardContainerRef.current) {
          const cardMountEl = document.createElement('div');
          cardContainerRef.current.appendChild(cardMountEl);
          const { submit } = await provider.renderCardFields({
            ...opts,
            container: cardMountEl,
            onApproved: () => {
              window.location.href = successUrl;
            },
            onError: (e) => {
              setCardSubmitting(false);
              onError?.(e);
            },
          });
          cardSubmitRef.current = submit;
        }
        // Buttons are now visible; the user approves in the PayPal popup.
        // Keep `processing` false so the (now hidden) trigger isn't spinning.
        setProcessing(false);

      } else {
        const { url } = await provider.startCheckout(opts);
        if (url) window.location.href = url;
        else setProcessing(false);
      }
    } catch (e) {
      setProcessing(false);
      setButtonsMounted(false);
      onError?.(e);
    }
  };

  // ----- MODAL MODE render: wallet inline + card-in-modal -----
  if (isModal) {
    return (
      <>
        {/* Wallet Smart Buttons render here. PayPal injects high-z-index iframes, so
            we HIDE this container while the card modal is open — otherwise the wallet
            buttons float over the Radix dialog (overlap bug). */}
        <div
          ref={containerRef}
          className={className}
          style={cardModalOpen ? { visibility: 'hidden', height: 0, overflow: 'hidden' } : undefined}
        />
        {walletMounting && (

          <div className="flex items-center justify-center py-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading payment options…
          </div>
        )}
        {isCardFields && (
          <>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-semibold border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 rounded-md mt-3"
              disabled={disabled}
              onClick={() => setCardModalOpen(true)}
            >

              <CreditCard className="h-5 w-5 mr-2" />
              Debit or Credit Card
            </Button>


            <Dialog open={cardModalOpen} onOpenChange={setCardModalOpen}>
              {/* Stays CENTERED and does NOT move: the dialog has a FIXED height, so
                  Radix computes its centered position once and it can never recenter
                  when the PayPal card-field iframes render/resize (that recenter-by-
                  half-the-delta was the "modal moves after loading" flicker). Content
                  scrolls internally if it ever exceeds the box — it's never clipped. */}
              <DialogContent className="sm:max-w-3xl h-[760px] max-h-[92vh] overflow-y-auto bg-gradient-to-br from-emerald-50 via-white to-teal-50">




                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-emerald-600" />
                    Enter Card Details
                  </DialogTitle>

                  <DialogDescription>
                    All fields required. Your card details are encrypted and processed securely —
                    we never store your card.
                  </DialogDescription>
                </DialogHeader>

                {/* Two columns: form (left) + accepted-card logos (right) */}
                <div className="grid md:grid-cols-[1fr_auto] gap-6 py-2">
                  <div>
                    {/* Hosted ACDC card fields mount here (Name / Number / Expiry / CVV).
                        We reserve a fixed min-height and keep the fields hidden until the
                        PayPal SDK has rendered them, so the dialog doesn't reflow/recenter
                        and the user never watches the empty boxes fill in one by one. */}
                    {/* RESERVED min-height sized to fit the full field stack (Name +
                        Number + Expiry/CVV — the PayPal iframes are tall). The fields
                        render into this box AFTER the dialog opens; reserving their final
                        height up front keeps the dialog's total height constant from the
                        first paint, so the centered dialog never recenters (= no "modal
                        moves" flicker) — and because it's min-height (not a clipped fixed
                        height) nothing gets cut off. */}
                    <div className="relative" style={{ minHeight: 340 }}>
                      {!cardFieldsReady && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading secure card form…
                        </div>
                      )}
                      <div
                        ref={modalCardContainerRef}
                        style={{
                          opacity: cardFieldsReady ? 1 : 0,
                          transition: 'opacity 150ms ease',
                          pointerEvents: cardFieldsReady ? 'auto' : 'none',
                        }}
                      />
                    </div>


                    {/* Billing address (AVS): Country + ZIP — our own inputs. */}
                    <div className="grid grid-cols-2 gap-3 mt-3">

                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                          Country
                        </label>
                        <select
                          value={billingCountry}
                          onChange={(e) => setBillingCountry(e.target.value)}
                          className="w-full h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="US">United States</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                          ZIP / Postal Code
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={billingPostal}
                          onChange={(e) => setBillingPostal(e.target.value)}
                          placeholder="e.g. 98072"
                          className="w-full h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Accepted cards sidebar — card networks only (card-entry form),
                      vertically + horizontally centered in the column. */}
                  <div className="hidden md:flex w-56 flex-col items-center justify-center text-center border-l border-emerald-100 pl-5">
                    <p className="text-sm font-medium text-gray-900 mb-3">
                      We accept all major cards
                    </p>
                    <PaymentMethodLogos variant="cards" columns={2} />
                  </div>

                </div>

                {/* Footer: Cancel — Encrypted&Secure — Pay */}
                <div className="flex items-center justify-between gap-3 border-t border-emerald-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCardModalOpen(false)}
                    disabled={cardSubmitting}
                  >
                    Cancel
                  </Button>
                  <div className="flex items-center gap-2 text-base font-semibold text-emerald-700">
                    <ShieldCheck className="h-6 w-6" />
                    Encrypted &amp; Secure
                  </div>

                  <Button
                    type="button"
                    className="min-w-[140px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    disabled={cardSubmitting || !cardFieldsReady}
                    onClick={async () => {
                      if (!cardSubmitRef.current) return;
                      setCardSubmitting(true);
                      try {
                        await cardSubmitRef.current({
                          countryCode: billingCountry,
                          postalCode: billingPostal,
                        });
                        // onApproved navigates to successUrl.
                      } catch (e) {
                        setCardSubmitting(false);
                        onError?.(e);
                      }
                    }}
                  >
                    {cardSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      payLabel
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>


          </>
        )}
      </>
    );
  }

  // Button providers (PayPal): ALWAYS render the mount container so its ref is
  // attached from first render (never null when renderCheckout runs, even amid the
  // auth-driven re-renders after account creation). The trigger button shows until
  // the buttons are mounted; the container is just hidden until then.
  if (isButton) {
    return (
      <>
        {!buttonsMounted && (
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
        )}
        <div ref={containerRef} className={className} style={buttonsMounted ? undefined : { display: 'none' }} />
        {/* ACDC card-only section (no PayPal account). Shown once the wallet
            buttons + card fields are mounted. */}
        {isCardFields && (
          <div style={buttonsMounted ? { marginTop: 16 } : { display: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: '#6b7280', fontSize: 13 }}>
              <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              or pay with card
              <span style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>
            <div ref={cardContainerRef} />
            <Button
              type="button"
              className={className}
              disabled={cardSubmitting}
              onClick={async () => {
                if (!cardSubmitRef.current) return;
                setCardSubmitting(true);
                try {
                  await cardSubmitRef.current();
                  // onApproved (set in renderCardFields) navigates to successUrl.
                } catch (e) {
                  setCardSubmitting(false);
                  onError?.(e);
                }
              }}
            >
              {cardSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay with Card'
              )}
            </Button>
          </div>
        )}
      </>
    );
  }


  // Redirect providers (Stripe): just the trigger button.
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
