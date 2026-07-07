'use client';

// Public one-click unsubscribe page.
//
// Marketing emails embed `${BASE_URL}/unsubscribe?token=<signed>`. This page
// verifies the token via the public `unsubscribeEmail` HTTP function and writes
// a suppression entry server-side. No auth required — the signed token is the
// authorization. See docs/02-implementation/marketing-campaigns/design.md §4.

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

// Public HTTP function endpoint (us-west1). Overridable for staging/emulator.
const UNSUB_ENDPOINT =
  process.env.NEXT_PUBLIC_UNSUBSCRIBE_URL ||
  'https://us-west1-shreyfitweb.cloudfunctions.net/unsubscribeEmail';

type State = 'loading' | 'ok' | 'error';

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetch(UNSUB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!active) return;
        setState(res.ok ? 'ok' : 'error');
      } catch {
        if (active) setState('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-sky-400" />
            <h1 className="text-xl font-semibold mb-2">Processing…</h1>
            <p className="text-slate-300 text-sm">
              Hold on while we update your email preferences.
            </p>
          </>
        )}

        {state === 'ok' && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-green-400" />
            <h1 className="text-xl font-semibold mb-2">You&rsquo;re unsubscribed</h1>
            <p className="text-slate-300 text-sm mb-6">
              You won&rsquo;t receive further marketing emails from Shrey.Fit. Transactional
              messages (like receipts and account notices) may still be sent.
            </p>
            <Link href="/" className="text-sky-400 hover:underline text-sm">
              Return to Shrey.Fit
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle className="w-10 h-10 mx-auto mb-4 text-red-400" />
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-slate-300 text-sm mb-6">
              We couldn&rsquo;t process that unsubscribe link. It may be invalid or expired. If you
              keep receiving unwanted emails, contact{' '}
              <a href="mailto:support@shrey.fit" className="text-sky-400 hover:underline">
                support@shrey.fit
              </a>
              .
            </p>
            <Link href="/" className="text-sky-400 hover:underline text-sm">
              Return to Shrey.Fit
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      }
    >
      <UnsubscribeInner />
    </Suspense>
  );
}
