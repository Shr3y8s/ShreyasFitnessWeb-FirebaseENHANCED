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
import type { CheckoutOptions, BillingAddress, DiscountPreview } from '@/lib/payments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X } from 'lucide-react';

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
   * Base (pre-discount) amount in minor units (cents). Used to show "You'll be
   * charged $X" on the payment stage when no discount is applied. Optional.
   */
  amount?: number;
  /**
   * Fired whenever the applied discount preview changes (apply → the validated
   * DiscountPreview; remove/clear → null). Lets the page's Order Summary reflect the
   * discounted breakdown (subtotal / discount / total) as the single source of truth.
   */
  onPreviewChange?: (preview: DiscountPreview | null) => void;
  /**
   * Fired whenever the internal checkout stage changes ('discount' → 'payment' and
   * back via "Change"). Lets the page show payment-only chrome (e.g. the "Payment
   * Options" header) only on the payment stage. Subscriptions/non-discount providers
   * report 'payment' on mount.
   */
  onStageChange?: (stage: 'discount' | 'payment') => void;
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
  amount,
  onPreviewChange,
  onStageChange,
  onBeforeCheckout,
  onError,
}: ProviderCheckoutProps) {



  const provider = getPaymentProvider({ mode });
  const isButton = provider.capabilities.buttonCheckout;
  // DISABLED (2026-06): our own ACDC inline hosted card fields (the in-page
  // number/expiry/cvv form + its modal) are turned OFF on ALL paths. They worked for
  // one-time purchases but NOT for subscriptions (headless vaulted-card subscriptions
  // require PayPal's Reference Transactions capability, which is not enabled), so
  // exposing them only for one-time was confusing. The single card option everywhere
  // is now PayPal's dedicated "Debit or Credit Card" Smart Button (PayPal-hosted guest
  // card checkout, NO account needed) rendered by renderCheckout — which needs no
  // Reference Transactions. To re-enable ACDC later, restore this to:
  //   !!provider.capabilities.cardFields && !!provider.renderCardFields && mode !== 'subscription'
  // (the renderCardFields adapter + createPaypalOrder/…CardSetupToken/…SubscriptionWithCard
  // callables are intentionally left intact for that reversal.)
  const isCardFields = false;
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
  // True once buyer approval returns (popup closed) and we're awaiting the server
  // capture/activation + navigation. Drives a full-cover "Finalizing your payment…"
  // overlay so the page is never left blank during that gap. Stays true through the
  // navigation (we never set it back to false on the happy path).
  const [paymentProcessing, setPaymentProcessing] = useState(false);


  // Modal-mode state
  const [walletMounting, setWalletMounting] = useState(isModal);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [cardFieldsReady, setCardFieldsReady] = useState(false);
  const optsRef = useRef<CheckoutOptions | null>(null);

  // Billing address (AVS) — collected as our own inputs, passed into card submit().
  const [billingCountry, setBillingCountry] = useState('US');
  const [billingPostal, setBillingPostal] = useState('');

  // ----- Discount code (Feature 2) — neutral, server-validated -----
  // Phase 1 supports ONE-TIME items only. The field shows when the active provider
  // advertises `capabilities.discounts` AND the checkout is a one-time payment.
  // On Apply we call the adapter's previewDiscount (READ-ONLY); the applied code is
  // threaded into buildOpts so the wallet/card create-order callable re-validates +
  // applies it server-side (the client never sets the amount).
  // Discounts apply to BOTH one-time (payment) AND subscription checkout. For
  // subscriptions the base plans are minted 2-cycle (TRIAL seq 1 + REGULAR seq 2), so
  // the server bakes a per-subscriber billing_cycles override into the create call
  // (intro = first cycle only with auto-revert; recurring = every cycle). The server
  // validates + applies the code per-mode; the client never sets the amount.
  // (subscription-discounts T10 — 2-cycle override model.)
  const discountsSupported = !!provider.capabilities.discounts;


  const [codeInput, setCodeInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | undefined>(undefined);
  const [preview, setPreview] = useState<DiscountPreview | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);
  const [discountError, setDiscountError] = useState<string>('');

  // Two-stage swap (design): when discounts are supported the card opens on the
  // DISCOUNT stage (code field + Continue) and the payment buttons are NOT mounted.
  // Clicking Continue swaps to the PAYMENT stage (buttons mount once with the final
  // amount → no flicker). "Change" goes back. When discounts aren't supported
  // (subscriptions / non-discount providers) we open straight on PAYMENT so that
  // flow is byte-for-byte unchanged.
  const [stage, setStage] = useState<'discount' | 'payment'>(
    discountsSupported ? 'discount' : 'payment'
  );

  // Report the current stage to the page so it can show payment-only chrome (the
  // "Payment Options" header + accepted-methods sidebar) only on the payment stage.
  // Fires on mount + whenever the stage swaps.
  useEffect(() => {
    onStageChange?.(stage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);


  const fmtCents = (cents: number) =>

    `$${(Math.max(0, cents) / 100).toFixed(2)}`;

  // Map a neutral failure reason → a friendly inline message.
  const reasonMessage = (reason?: string): string => {
    switch (reason) {
      case 'not_found': return "That code isn't valid.";
      case 'inactive': return 'That code is no longer active.';
      case 'expired': return 'That code has expired.';
      case 'limit_reached': return 'That code has reached its redemption limit.';
      case 'per_user_limit': return "You've already used that code.";
      case 'not_applicable': return "That code doesn't apply to this item.";
      case 'not_supported': return 'Discount codes are not available here.';
      default: return "We couldn't apply that code. Please try again.";
    }
  };

  const applyDiscount = async () => {
    const code = codeInput.trim();
    if (!code || !provider.previewDiscount) return;
    setDiscountChecking(true);
    setDiscountError('');
    try {
      const result = await provider.previewDiscount({
        code,
        productId: metadata?.type === 'subscription' ? '' : (metadata?.productId || ''),
        mode,
        priceId,
      });
      if (!result.valid) {
        setPreview(null);
        setAppliedCode(undefined);
        onPreviewChange?.(null);
        setDiscountError(reasonMessage(result.reason));
        return;
      }
      setPreview(result);
      setAppliedCode(result.code || code.toUpperCase());
      // Let the page's Order Summary reflect the discounted breakdown.
      onPreviewChange?.(result);
    } catch {
      setPreview(null);
      setAppliedCode(undefined);
      onPreviewChange?.(null);
      setDiscountError("We couldn't apply that code. Please try again.");
    } finally {
      setDiscountChecking(false);
    }
  };

  const removeDiscount = () => {
    setAppliedCode(undefined);
    setPreview(null);
    setCodeInput('');
    setDiscountError('');
    onPreviewChange?.(null);
  };






  // Navigate to the success page, appending the provider transaction id (capture id)
  // as `txn` when the one-time capture path returns it. The success page uses `txn`
  // to match an ABSOLUTE fulfillment signal (sessionPackages[].providerTransactionId)
  // instead of waiting for the session balance to rise — which the synchronous
  // capture has already done before the page mounts.
  const navigateToSuccess = (transactionId?: string) => {
    if (transactionId) {
      const sep = successUrl.includes('?') ? '&' : '?';
      window.location.href = `${successUrl}${sep}txn=${encodeURIComponent(transactionId)}`;
    } else {
      window.location.href = successUrl;
    }
  };

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
    // Applied discount code (Feature 2). The adapter forwards it to the server
    // create-order callable, which re-validates + applies it (client never sets the
    // amount). Undefined when no code is applied → byte-for-byte unchanged checkout.
    discountCode: appliedCode,
  });


  // ----- MODAL MODE: mount wallet buttons immediately on first render -----
  // Strict-Mode-safe: no one-shot ref guard (that left the wallet container empty
  // because Strict Mode's mount→unmount→remount closed the buttons after the first
  // mount and the guard blocked the real remount). Instead each run owns its mount
  // node + cleanup, and a `cancelled` flag drops a render that resolves post-unmount.
  useEffect(() => {
    // Only mount once we're on the PAYMENT stage (two-stage swap). On the discount
    // stage the buttons are not rendered; switching back via "Change" returns to the
    // discount stage and this effect's cleanup unmounts the buttons.
    if (!isModal || stage !== 'payment' || !provider.renderCheckout) return;

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
          onProcessing: () => setPaymentProcessing(true),
          onApproved: (transactionId) => {
            navigateToSuccess(transactionId);
          },
          onError: (e) => {
            // Approval failed/cancelled before fulfillment — drop the overlay so the
            // buttons are usable again.
            setPaymentProcessing(false);
            onError?.(e);
          },
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
    // Re-mount the wallet buttons when entering the payment stage or when the applied
    // discount code changes so the create-order callable runs again at the new
    // (discounted) amount. Leaving the payment stage (Change) runs cleanup → unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModal, stage, priceId, appliedCode]);




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

          onProcessing: () => setPaymentProcessing(true),
          onApproved: (transactionId) => {
            navigateToSuccess(transactionId);
          },
          onError: (e) => {
            setPaymentProcessing(false);
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

  // ----- STAGE 1 (discount): code field + Apply + Continue -----
  // The numeric breakdown (subtotal / discount / total) lives in the page's Order
  // Summary (driven by onPreviewChange). Here we only own the input, the applied
  // code chip, and the Continue gate that swaps to the payment stage.
  const discountStage = (
    <div>
      {!appliedCode ? (
        <>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
            <Tag className="h-4 w-4 text-emerald-600" />
            Have a discount code?
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                if (discountError) setDiscountError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyDiscount();
                }
              }}
              placeholder="Enter discount code"
              className="flex-1 uppercase"
              disabled={discountChecking}
              autoCapitalize="characters"
            />
            <Button
              type="button"
              variant="outline"
              onClick={applyDiscount}
              disabled={discountChecking || !codeInput.trim()}
            >
              {discountChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </div>
          {discountError && (
            <p className="mt-1.5 text-sm text-red-600">{discountError}</p>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                <Tag className="h-3 w-3" />
                {appliedCode}
              </span>
              {preview?.label && (
                <span className="text-sm text-emerald-800">{preview.label}</span>
              )}
            </div>
            <button
              type="button"
              onClick={removeDiscount}
              className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-900"
              aria-label="Remove discount code"
            >
              <X className="h-4 w-4" />
              Remove
            </button>
          </div>
          {preview && (
            <div className="mt-2 flex items-baseline gap-2 text-sm">
              <span className="text-gray-500 line-through">
                {fmtCents(preview.originalAmount)}
              </span>
              <span className="font-semibold text-emerald-700">
                {fmtCents(preview.discountedAmount)}
              </span>
              <span className="text-emerald-700">
                (you save {fmtCents(preview.amountOff)})
              </span>
            </div>
          )}
        </div>
      )}

      {/* Continue gate — swaps to the payment stage (mounts the buttons ONCE with
          the final amount). Doubles as "Continue without a code" when none applied. */}
      <Button
        type="button"
        className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        disabled={disabled || discountChecking}
        onClick={() => setStage('payment')}
      >
        {appliedCode ? 'Continue' : 'Continue without a code'}
      </Button>
    </div>
  );

  // ----- STAGE 2 (payment): charged-amount summary + Change link, then buttons -----
  // The amount charged is unambiguous here: discounted total when a code is applied,
  // else the base `amount` prop (omitted if the page didn't pass one).
  const chargeAmountCents = preview ? preview.discountedAmount : amount;
  const paymentSummary = (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2 text-gray-700">
        {appliedCode ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
              <Tag className="h-3 w-3" />
              {appliedCode}
            </span>
            <span>
              You&apos;ll be charged{' '}
              <span className="font-semibold text-gray-900">
                {chargeAmountCents != null ? fmtCents(chargeAmountCents) : 'the listed price'}
              </span>
            </span>
          </>
        ) : (
          <span>
            You&apos;ll be charged{' '}
            <span className="font-semibold text-gray-900">
              {chargeAmountCents != null ? fmtCents(chargeAmountCents) : 'the listed price'}
            </span>
          </span>
        )}
      </div>
      {discountsSupported && (
        <button
          type="button"
          onClick={() => setStage('discount')}
          className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
        >
          {appliedCode ? 'Change' : 'Have a code?'}
        </button>
      )}
    </div>
  );

  // ----- MODAL MODE render: two-stage swap (discount → payment) -----
  if (isModal) {
    // STAGE 1 — discount entry + Continue. Payment buttons are NOT mounted yet.
    if (stage === 'discount') {
      return discountStage;
    }

    // STAGE 2 — payment. The discount field/Continue are gone; the charged-amount
    // summary + Change link sit above the wallet buttons (which mount once here).
    return (
      <>
        {/* Finalizing overlay — covers the screen the instant buyer approval returns
            (popup closes) and stays up through the server capture/activation +
            navigation, so the page is never left blank. */}
        {paymentProcessing && (
          <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900">Finalizing your payment…</p>
            <p className="text-sm text-gray-600 mt-1">
              Please don&apos;t close or refresh this window.
            </p>
          </div>
        )}
        {discountsSupported && paymentSummary}

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
        {/* Finalizing overlay — same as modal mode: covers the gap between buyer
            approval (popup closed) and navigation so the page is never blank. */}
        {paymentProcessing && (
          <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600 mb-4" />
            <p className="text-lg font-semibold text-gray-900">Finalizing your payment…</p>
            <p className="text-sm text-gray-600 mt-1">
              Please don&apos;t close or refresh this window.
            </p>
          </div>
        )}
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
