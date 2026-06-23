'use client';

// Unified checkout SUCCESS page (design §2.7.3).
//
//   /checkout/success?item=<CheckoutItemKey>&return=<relative path>
//
// Fixes the post-payment "pop-in" lag: instead of bouncing straight to the
// destination (where the webhook may not have written fulfillment yet), we show a
// "Finalizing…" spinner and watch users/{uid} until the item's fulfillment signal
// arrives, THEN show ✅ + a Continue button. A 15s soft-timeout lets the user
// continue anyway if the webhook is slow.

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { getCheckoutItem } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AuthHeader } from '@/components/AuthHeader';
import { Footer } from '@/components/Footer';
import { CheckCircle2, Loader2 } from 'lucide-react';


/** `return` must be a same-site relative path; else fall back to /dashboard. */
function safeReturn(raw: string | null): string {
  if (!raw) return '/dashboard';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/dashboard';
  return raw;
}

// Soft fallback only. PayPal SANDBOX webhooks (BILLING.SUBSCRIPTION.ACTIVATED) can
// lag ~60–90s; the button-subscription path fulfills via that webhook (no synchronous
// fulfillment), so the wait must comfortably exceed sandbox lag to avoid a false
// "still finalizing" message on the happy path. Production webhooks are much faster.
const TIMEOUT_MS = 120000;


function SuccessInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const itemKey = searchParams.get('item');
  const returnPath = useMemo(() => safeReturn(searchParams.get('return')), [searchParams]);
  const item = useMemo(() => getCheckoutItem(itemKey), [itemKey]);

  // 'waiting' = listening for fulfillment; 'done' = signal received;
  // 'timeout' = soft fallback (continue anyway).
  const [status, setStatus] = useState<'waiting' | 'done' | 'timeout'>('waiting');
  const baselinePurchasedRef = useRef<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!item) {
      // Unknown item — nothing to wait for; just allow continue.
      setStatus('timeout');
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(
      userRef,
      (snap) => {
        const data = snap.data() || {};

        if (item.fulfillment === 'subscription_active') {
          if (data.accountActivated === true) {
            setStatus('done');
          }
        } else {
          // session_package → wait for sessionBalance.purchased to rise above the
          // baseline captured on the first snapshot.
          const purchased = data?.sessionBalance?.purchased ?? 0;
          if (baselinePurchasedRef.current === null) {
            baselinePurchasedRef.current = purchased;
          } else if (purchased > baselinePurchasedRef.current) {
            setStatus('done');
          }
        }
      },
      () => {
        // On listener error, fall back to soft-continue.
        setStatus('timeout');
      }
    );

    const timer = setTimeout(() => {
      setStatus((s) => (s === 'waiting' ? 'timeout' : s));
    }, TIMEOUT_MS);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [authLoading, user, item, router]);

  // On the confirmed-success path, Continue goes to the after-payment destination
  // (e.g. /dashboard?payment=success → Welcome). But in the TIMEOUT state the
  // payment is NOT yet confirmed — sending them to the success-gated destination
  // would imply success and (for an un-activated account) bounce through the
  // dashboard guard. So when unconfirmed we route to a neutral, un-guarded page
  // (home) instead of asserting success. With synchronous fulfillment the happy
  // path resolves to 'done' almost immediately, so 'timeout' is now rare.
  const handleContinue = () =>
    router.push(status === 'timeout' ? '/' : returnPath);


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuthHeader />
      <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">

        <CardContent className="p-10 text-center">
          {status === 'waiting' ? (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mx-auto mb-5" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Finalizing your purchase…
              </h2>
              <p className="text-sm text-gray-600">
                This only takes a moment. Please don&apos;t close this window.
              </p>
            </>
          ) : status === 'done' ? (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment complete!</h2>
              <p className="text-sm text-gray-600 mb-6">
                Your purchase has been confirmed and your account is updated.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Thanks for your payment!</h2>
              <p className="text-sm text-gray-600 mb-6">
                We&apos;re still finalizing your purchase — it may take a minute to appear.
                You can continue now; everything will update automatically.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                onClick={handleContinue}
              >
                Continue
              </Button>
            </>
          )}
        </CardContent>
      </Card>
      </div>
      <Footer />
    </div>
  );
}


export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
