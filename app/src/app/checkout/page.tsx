'use client';

// Unified, reusable checkout page (design §2.7).
//
// Generic + scenario-agnostic: it assumes the user is ALREADY authenticated.
// No account creation, no reCAPTCHA, no signup branching lives here — callers
// (signup, dashboard buttons, …) do any scenario-specific work BEFORE routing in.
//
//   /checkout?item=<CheckoutItemKey>&return=<relative path>
//
// It resolves the item → product → active-provider checkout priceId, renders the
// provider method menu (PayPal/Pay Later/Venmo via Smart Buttons + a "Pay with
// debit/credit card" modal for ACDC card fields), and on approval navigates to
// /checkout/success (which waits for the webhook's fulfillment signal).

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import {
  getPaymentProvider,
  formatCurrency,
  selectSignupPrice,
  selectSessionPrice,
} from '@/lib/payments';
import type { DiscountPreview } from '@/lib/payments';
import {
  getCheckoutItem,
  getBillingOption,
  PAYPAL_PLANS,
  type PaypalPlanKey,
} from '@/lib/constants';


import { ProviderCheckout } from '@/components/payments/ProviderCheckout';
import { PaymentMethodLogos } from '@/components/payments/PaymentMethodLogos';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { AuthHeader } from '@/components/AuthHeader';
import { Footer } from '@/components/Footer';
import { AlertCircle, ArrowLeft, CreditCard, Loader2, Lock, ShieldCheck } from 'lucide-react';



/** `return` must be a same-site relative path; else fall back to /dashboard. */
function safeReturn(raw: string | null): string {
  if (!raw) return '/dashboard';
  // Must start with a single '/', not '//' (protocol-relative) — no off-site redirect.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userData, loading: authLoading } = useAuth();

  const itemKey = searchParams.get('item');
  // `return` = where Back/cancel goes. `next` = where to go AFTER successful
  // payment (passed through to /checkout/success). They're DISTINCT: e.g. signup
  // sets return=/signup?step=plan (Back → 4-package step) but next=
  // /dashboard?payment=success (after payment → Welcome landing). `next` defaults
  // to `return` when absent, so flows that don't set it are unchanged.
  const returnPath = useMemo(() => safeReturn(searchParams.get('return')), [searchParams]);
  const nextPath = useMemo(
    () => safeReturn(searchParams.get('next') ?? searchParams.get('return')),
    [searchParams]
  );
  const item = useMemo(() => getCheckoutItem(itemKey), [itemKey]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [amount, setAmount] = useState<number>(0); // minor units
  const [priceType, setPriceType] = useState<'recurring' | 'one_time'>('one_time');
  const [checkoutPriceId, setCheckoutPriceId] = useState<string>('');
  // Billing cadence (prepay-plans Phase B): 1 = monthly (default), 3 = quarterly.
  // Drives the "/mo" vs "every 3 months" + no-refund copy. Monthly items leave this 1.
  const [intervalCount, setIntervalCount] = useState<number>(1);

  // Discount preview (Feature 2). ProviderCheckout reports the validated preview up
  // here so the Order Summary is the single source of price truth; null = no code.
  const [discountPreview, setDiscountPreview] = useState<DiscountPreview | null>(null);
  // Checkout stage reported by ProviderCheckout. Payment-only chrome (the "Payment
  // Options" header + accepted-methods sidebar) shows only on the 'payment' stage so
  // Stage 1 (discount entry) stays clean. Defaults to 'payment' for non-discount flows.
  const [checkoutStage, setCheckoutStage] = useState<'discount' | 'payment'>('payment');



  // Auth guard — /checkout requires an authenticated user (callers ensure this).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const next = encodeURIComponent(
        `/checkout?item=${itemKey ?? ''}&return=${encodeURIComponent(returnPath)}`
      );
      router.replace(`/login?next=${next}`);
    }
  }, [authLoading, user, router, itemKey, returnPath]);

  // Resolve the item → product → active-provider priceId + display summary.
  useEffect(() => {
    if (authLoading || !user) return;
    if (!item) {
      setError('This checkout link is invalid or missing an item.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const provider = getPaymentProvider({ mode: item.mode });
        const product = await provider.fetchProduct(item.productId);
        if (!product) {
          throw new Error('Product not found for this item.');
        }
        const price =
          item.mode === 'subscription'
            ? selectSignupPrice(product)
            : selectSessionPrice(product);
        if (!price) {
          throw new Error('No active price available for this item.');
        }
        if (cancelled) return;
        setProductName(product.name || item.label);

        // CADENCE OVERRIDE (prepay-plans Phase B): the catalog's selectSignupPrice
        // returns the DEFAULT (monthly) plan. When the checkout item carries a
        // `planKey` (quarterly variant), swap in that plan's PayPal id + the matching
        // BillingOption amount so the subscription is created against the quarterly
        // plan. Monthly items have no planKey → unchanged (back-compat).
        const count = item.intervalCount && item.intervalCount > 0 ? item.intervalCount : 1;
        setIntervalCount(count);
        if (item.mode === 'subscription' && item.planKey) {
          const planId = (PAYPAL_PLANS as Record<PaypalPlanKey, string>)[item.planKey];
          const opt = getBillingOption(item.productId, count);
          if (!planId) {
            throw new Error('This plan is not available yet. Please try the monthly option.');
          }
          setCheckoutPriceId(planId);
          setAmount(opt ? opt.amount : price.amount);
          setPriceType('recurring');
        } else {
          setAmount(price.amount);
          setPriceType(price.type);
          setCheckoutPriceId(price.id);
        }
      } catch (e) {

        if (!cancelled) setError((e as Error)?.message || 'Failed to load checkout.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, item]);

  if (authLoading || (!user && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Success page's "Continue" goes to `nextPath` (after-payment target), which may
  // differ from the Back/cancel `returnPath` (e.g. signup: Back → plan step, but
  // after payment → /dashboard?payment=success Welcome landing).
  const successUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/checkout/success?item=${itemKey}&return=${encodeURIComponent(nextPath)}`
      : '';

  const cancelUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${returnPath}` : returnPath;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuthHeader />
      <div className="flex-1 container mx-auto px-4 py-10">
        {/* Branded heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Checkout</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Complete your purchase below — your payment is processed securely.
          </p>
        </div>

      <div className="max-w-3xl mx-auto">

        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground"
          onClick={() => router.push(returnPath)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>


        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {error ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="font-medium">Checkout Error</span>
                </div>
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => router.push(returnPath)}
                >
                  Go Back
                </Button>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-6 w-6 mr-2 animate-spin" />
                Loading…
              </div>
            ) : (
              <>
                {/* Item summary — the single source of price truth. When a discount
                    code is applied (ProviderCheckout reports it via onPreviewChange)
                    this block updates IN PLACE to a subtotal / discount / total
                    breakdown. No code → the plain price (unchanged). */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{productName}</p>
                      <p className="text-sm text-gray-600">
                        {priceType === 'recurring'
                          ? intervalCount === 3
                            ? 'Billed every 3 months • Cancel anytime'
                            : 'Monthly subscription • Cancel anytime'
                          : 'One-time payment'}
                      </p>

                    </div>
                    <div className="text-right">
                      {discountPreview ? (
                        <>
                          <div className="text-base text-gray-500 line-through">
                            {formatCurrency(discountPreview.originalAmount)}
                          </div>
                          <div className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(discountPreview.discountedAmount)}
                          </div>
                        </>
                      ) : (
                        <div className="text-2xl font-bold text-emerald-600">
                          {formatCurrency(amount)}
                        </div>
                      )}
                      {priceType === 'recurring' && (
                        <div className="text-xs text-gray-600">
                          {intervalCount === 3 ? 'per 3 months' : 'per month'}
                        </div>
                      )}
                      {/* Effective $/mo for quarterly so the per-month value is obvious. */}
                      {priceType === 'recurring' && intervalCount === 3 && !discountPreview && (
                        <div className="text-xs font-medium text-emerald-700">
                          {formatCurrency(Math.round(amount / 3))}/mo
                        </div>
                      )}
                    </div>
                  </div>

                  {/* No-refund disclosure for pre-paid multi-month plans (prepay-plans
                      B6.1 / FR-B9). Monthly subscriptions don't show this. */}
                  {priceType === 'recurring' && intervalCount === 3 && (
                    <p className="mt-3 text-xs text-gray-600">
                      Billed once every 3 months. No refunds — your access continues
                      until the end of your paid period. Cancel anytime to stop the next
                      renewal.
                    </p>
                  )}


                  {/* Discount line-items — shown only when a code is applied. */}
                  {discountPreview && (
                    <div className="mt-4 pt-4 border-t border-emerald-200 space-y-1.5 text-sm">
                      <div className="flex items-center justify-between text-gray-700">
                        <span>Subtotal</span>
                        <span>{formatCurrency(discountPreview.originalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>
                          {discountPreview.code}
                          {discountPreview.label ? ` (${discountPreview.label})` : ''}
                        </span>
                        <span>−{formatCurrency(discountPreview.amountOff)}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold text-gray-900 pt-1.5 border-t border-emerald-100">
                        <span>Total today</span>
                        <span>{formatCurrency(discountPreview.discountedAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>


                {/* Payment section. The "Payment Options" header + the no-account
                    callout + the accepted-methods sidebar are PAYMENT-stage chrome —
                    they're hidden during the discount stage (two-stage swap) so Stage 1
                    shows only "Have a discount code?" + Continue. ProviderCheckout
                    reports its stage via onStageChange. */}
                <div className="pt-2">
                  {checkoutStage === 'payment' && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-semibold text-gray-900">Payment Options</h3>
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <Lock className="h-3 w-3" />
                          Secure
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Choose how you&apos;d like to pay — PayPal, Pay Later, or any debit/credit
                        card.
                      </p>
                      {/* Make the no-account card option explicit: the "Debit or Credit
                          Card" button below is PayPal-hosted guest checkout (no PayPal
                          login/account needed). */}
                      <div className="flex items-start gap-2 mb-4 py-2.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                        <CreditCard className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          <span className="font-semibold">No PayPal account needed.</span> Choose{' '}
                          <span className="font-semibold">Debit or Credit Card</span> to pay with any
                          card — PayPal just processes it securely.
                        </span>
                      </div>
                    </>
                  )}


                  {/* Two columns on desktop: payment buttons (left) + accepted-methods
                      sidebar (right). Stacks to a single column on mobile so the logos
                      fall below the buttons on narrow screens. */}
                  <div className="grid md:grid-cols-[1fr_auto] gap-6 md:gap-8">
                    {/* Provider method menu (Stage 1 discount field → Stage 2 wallet buttons) */}
                    <div>
                      <ProviderCheckout
                        mode={item!.mode}
                        priceId={checkoutPriceId}
                        userId={user?.uid}
                        email={userData?.email || user?.email || undefined}
                        successUrl={successUrl}
                        cancelUrl={cancelUrl}
                        cardMode="modal"
                        amount={amount}
                        payLabel={`Pay ${formatCurrency(discountPreview ? discountPreview.discountedAmount : amount)}`}
                        onPreviewChange={setDiscountPreview}
                        onStageChange={setCheckoutStage}
                        metadata={{

                          userId: user?.uid || '',
                          item: itemKey || '',
                          type: item!.fulfillment,
                          productId: item!.productId,
                        }}
                        onError={(e) =>
                          setError((e as Error)?.message || 'Payment failed. Please try again.')
                        }
                      />

                    </div>

                    {/* Accepted methods — payment-stage only (right sidebar on desktop,
                        full-width below the buttons on mobile). */}
                    {checkoutStage === 'payment' && (
                      <div className="md:w-56 md:border-l md:border-gray-200 md:pl-6 border-t border-gray-200 pt-5 md:pt-0 md:border-t-0">
                        <p className="text-sm text-muted-foreground mb-4">
                          We accept all major credit/debit cards and wallets
                        </p>
                        <PaymentMethodLogos />
                      </div>
                    )}
                  </div>
                </div>




                <div className="flex items-center justify-center gap-2 mt-2 py-2.5 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  Secure payment • Your info is encrypted
                </div>



              </>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      <Footer />
    </div>
  );
}


export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
