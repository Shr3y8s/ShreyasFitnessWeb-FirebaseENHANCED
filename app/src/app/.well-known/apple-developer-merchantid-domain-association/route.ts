// Apple Pay domain-association file — served per-environment.
//
// PayPal (our Apple Pay processor) issues a DIFFERENT signed
// `apple-developer-merchantid-domain-association` body for its SANDBOX vs LIVE
// environments. We run two App Hosting backends from the SAME branch:
//   • staging  → sandbox.shrey.fit  (NEXT_PUBLIC_PAYPAL_ENV = "sandbox")
//   • prod     → shrey.fit          (NEXT_PUBLIC_PAYPAL_ENV = "production")
// A single static file in public/ can't serve different bytes per backend, so we
// serve this path from a route handler that picks the correct committed file based
// on the build's NEXT_PUBLIC_PAYPAL_ENV. Apple/PayPal fetch this exact URL when
// verifying the domain (PayPal dashboard → Register Domain), so the bytes must match
// what PayPal generated for that environment.
//
// The two bodies live on disk (easy to find/update) at:
//   src/lib/applepay/domain-association.sandbox
//   src/lib/applepay/domain-association.live
// They are included in the traced server bundle via `outputFileTracingIncludes` in
// next.config.ts. See docs/.../applepay-googlepay-design.md and the README beside
// the data files.

import { readFileSync } from 'fs';
import path from 'path';

// Force dynamic so this is a server route (not statically prerendered) and always
// reads the file for the running backend.
export const dynamic = 'force-dynamic';

export function GET() {
  const isProd = process.env.NEXT_PUBLIC_PAYPAL_ENV === 'production';
  const file = isProd
    ? 'domain-association.live'
    : 'domain-association.sandbox';
  const filePath = path.join(process.cwd(), 'src', 'lib', 'applepay', file);

  try {
    // The file is a single-line hex string with no trailing newline; serve verbatim.
    const body = readFileSync(filePath, 'utf8');
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch {
    return new Response('Apple Pay domain-association file not found.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
