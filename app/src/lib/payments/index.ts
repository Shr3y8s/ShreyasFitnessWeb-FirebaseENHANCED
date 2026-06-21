// Payment provider selection — the single entry point the app uses.
//
// Pages/components call `getPaymentProvider()` and depend ONLY on the neutral
// PaymentProvider interface. The active processor is chosen by env, and can be
// routed per purpose (subscriptions vs one-time) so two providers can run at
// once (e.g. Paddle for subscriptions + PayPal for one-off).
//
//   NEXT_PUBLIC_PAYMENT_PROVIDER_SUBSCRIPTION = stripe | paypal | paddle
//   NEXT_PUBLIC_PAYMENT_PROVIDER_ONETIME      = stripe | paypal | paddle
//   NEXT_PUBLIC_PAYMENT_PROVIDER              = fallback for both
// Default everywhere is 'paypal' — PayPal is the live processor. The Stripe adapter
// is retained but DORMANT (Stripe rejected the merchant application at go-live); it
// can be reactivated by setting the env back to 'stripe' if Stripe ever reinstates.
//
// See docs/02-implementation/payment-processor/payment-processor-design.md (§2.3)


import type { PaymentProvider, PaymentProviderName } from './types';
import { stripeProvider } from './providers/stripe';
import { paypalProvider } from './providers/paypal';

export * from './types';
export * from './pricing';

const REGISTRY: Partial<Record<PaymentProviderName, PaymentProvider>> = {
  stripe: stripeProvider,
  paypal: paypalProvider,
  // paddle: paddleProvider,  // added in Phase 4
};


function resolveName(mode?: 'subscription' | 'payment'): PaymentProviderName {
  const fallback = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER;
  const perMode =
    mode === 'subscription'
      ? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_SUBSCRIPTION
      : mode === 'payment'
        ? process.env.NEXT_PUBLIC_PAYMENT_PROVIDER_ONETIME
        : undefined;
  const name = (perMode || fallback || 'paypal') as PaymentProviderName;
  return name;

}

/**
 * Get the active payment provider. Pass `{ mode }` to route subscriptions and
 * one-time purchases to different providers when configured.
 */
export function getPaymentProvider(hint?: {
  mode?: 'subscription' | 'payment';
}): PaymentProvider {
  const name = resolveName(hint?.mode);
  const provider = REGISTRY[name];
  if (!provider) {
    // Configured for a provider whose adapter isn't registered yet — fail safe
    // to PayPal (the live processor) rather than crash or route to dormant Stripe.
    return paypalProvider;
  }

  return provider;
}
