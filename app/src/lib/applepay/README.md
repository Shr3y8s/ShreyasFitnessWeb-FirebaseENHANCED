# Apple Pay domain-association files

These two files are the **Apple Pay domain-association** payloads that PayPal (our
Apple Pay processor) issues. PayPal generates a **different signed body for its
SANDBOX vs LIVE environments**, so we keep both and serve the correct one per backend.

| File | Served when | Backend / domain |
|------|-------------|------------------|
| `domain-association.sandbox` | `NEXT_PUBLIC_PAYPAL_ENV !== "production"` | staging → `sandbox.shrey.fit` |
| `domain-association.live`    | `NEXT_PUBLIC_PAYPAL_ENV === "production"` | prod → `shrey.fit` |

## How they're served
We do **not** put these in `public/` — a static file can only serve one body, but our
two App Hosting backends (staging + prod) build from the same branch and need
different bodies. Instead they're served by the route handler:

```
src/app/.well-known/apple-developer-merchantid-domain-association/route.ts
```

which reads the env-selected file at request time and returns it as `text/plain` at
the canonical URL:

```
https://<domain>/.well-known/apple-developer-merchantid-domain-association
```

`next.config.ts` → `outputFileTracingIncludes` ensures both files are bundled into the
traced server output (otherwise the runtime `readFileSync` would 500).

## Updating a file (e.g. PayPal rotates it)
1. In the PayPal dashboard (correct environment: Sandbox vs Live), open Apple Pay →
   your domain → download the domain-association file.
2. Overwrite the matching file here (`.sandbox` or `.live`) with the exact bytes
   (single-line hex, **no trailing newline**).
3. Deploy the matching backend, then `curl` the public URL to confirm it returns the
   new bytes before clicking **Register Domain** in PayPal.

## Registering a new domain
The file must already be reachable at the public URL on that backend **before** you
click **Register Domain** in PayPal — PayPal fetches it to verify ownership. Order:
deploy → `curl` verify → Register Domain.
