'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ExternalLink, Monitor } from 'lucide-react';
import { FormData, ServiceTier as ServiceTierType } from '../page';
import { getPaymentProvider, selectSignupPrice, type Product } from '@/lib/payments';
import { getProductMarketing } from '@/lib/product-marketing';
import { getBillingOptions, IN_PERSON_TIERS } from '@/lib/constants';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';



interface ServiceTierStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  error: string;
  /** When the chosen email already has an account, this is the checkout-carrying
   * login URL (/login?next=<checkout>). Presence of this value means we show an
   * explicit "Go to Login" CTA instead of the generic error styling. */
  loginUrl?: string;
  isSubmitting: boolean;
}

interface EnhancedProduct extends Product {
  displayPrice: number;
  details?: string;
  features: string[];
  marketingDescription?: string;
}

// A single selectable option within a group box: a (productId, cadence) pair.
interface TierOption {
  productId: string;
  productName: string;
  intervalCount: number;
  amount: number;       // minor units for THIS option
  label: string;        // radio label ("Single session" / "4-Pack" / "Monthly" / "Quarterly")
  suffix: string;       // price suffix ("" / "/mo" / "/3 mo")
  features: string[];
  saveBadge?: boolean;  // quarterly "Save 10%"
}

// A group box (In-Person / Online Coaching / Complete Transformation).
interface TierGroup {
  key: string;
  title: string;
  details?: string;
  description?: string;
  options: TierOption[];
}

export default function ServiceTierStep({
  formData,
  updateFormData,
  nextStep,
  prevStep,
  error,
  loginUrl,
  isSubmitting
}: ServiceTierStepProps) {
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  // The error banner lives at the TOP of the form, but "Continue" is at the BOTTOM
  // of a long plan list. Without this, an error (e.g. "account already exists")
  // appears off-screen and the user never sees it. Scroll it into view on error.
  const errorRef = useRef<HTMLDivElement | null>(null);

  // Hide "Back" for an already-authenticated, un-activated user who returned from
  // /checkout (login→checkout→Back).
  const { user } = useAuth();

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const stripeProducts = await getPaymentProvider().fetchAllProducts();
        if (stripeProducts.length === 0) {
          setLoadError('No products available at this time');
          return;
        }
        const enhanced: EnhancedProduct[] = stripeProducts.map((product) => {
          const marketing = getProductMarketing(product.id);
          const price = selectSignupPrice(product);
          return {
            ...product,
            displayPrice: price?.amount || 0,
            details: marketing.details,
            features: marketing.features || [],
            marketingDescription: marketing.marketingDescription,
          };
        });
        enhanced.sort((a, b) => a.displayPrice - b.displayPrice);
        setProducts(enhanced);
      } catch (err) {
        console.error('Error loading products:', err);
        setLoadError('Failed to load pricing options');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  const fmt = (minor: number): string =>
    (minor / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const isInPerson = (id: string) => (IN_PERSON_TIERS as readonly string[]).includes(id);

  /**
   * Build the group boxes (prepay-plans Phase B):
   *  - ONE "In-Person Training" group whose options are the two one-time PRODUCTS
   *    (Single session + 4-Pack) — radios pick a different product.
   *  - One group PER subscription tier (OC, CT) whose options are the BillingOptions
   *    (Monthly + Quarterly) — radios pick a cadence of the same product.
   * → renders as a 3×2 grid (In-Person row, OC row, CT row).
   */
  const buildGroups = (): TierGroup[] => {
    const groups: TierGroup[] = [];

    // In-Person group (collapse the two one-time products into one box).
    const inPerson = products
      .filter((p) => isInPerson(p.id))
      .sort((a, b) => a.displayPrice - b.displayPrice);
    if (inPerson.length > 0) {
      groups.push({
        key: 'in_person_group',
        title: 'In-Person Training',
        details: inPerson[0].details, // e.g. "Seattle Area Only"
        description: 'Pay-as-you-go 1:1 sessions — buy a single session or save with a 4-pack.',
        options: inPerson.map((p) => ({
          productId: p.id,
          productName: p.name,
          intervalCount: 1,
          amount: p.displayPrice,
          // 4-pack vs single — label by sessions when we can infer, else the product name.
          label: /4/.test(p.name) ? '4-Pack' : 'Single session',
          suffix: '',
          features: p.features,
          saveBadge: false,
        })),
      });
    }

    // One group per subscription tier (has billingOptions in the catalog).
    products
      .filter((p) => !isInPerson(p.id) && getBillingOptions(p.id).length > 0)
      .forEach((p) => {
        const opts = getBillingOptions(p.id)
          .slice()
          .sort((a, b) => a.period.intervalCount - b.period.intervalCount)
          .map((o) =>
            o.period.intervalCount === 3
              ? {
                  productId: p.id,
                  productName: p.name,
                  intervalCount: 3,
                  amount: o.amount,
                  label: 'Quarterly',
                  suffix: '/3 mo',
                  features: p.features,
                  saveBadge: true,
                }
              : {
                  productId: p.id,
                  productName: p.name,
                  intervalCount: 1,
                  amount: o.amount,
                  label: 'Monthly',
                  suffix: '/mo',
                  features: p.features,
                  saveBadge: false,
                }
          );
        groups.push({
          key: p.id,
          title: p.name,
          details: p.details,
          description: p.marketingDescription || p.description || undefined,
          options: opts,
        });
      });

    return groups;
  };

  const isSelected = (productId: string, intervalCount: number) =>
    formData.tier?.id === productId && (formData.tier?.intervalCount || 1) === intervalCount;

  const handleSelect = (opt: TierOption) => {
    const tier: ServiceTierType = {
      id: opt.productId,
      name: opt.productName,
      price: opt.amount / 100,
      features: opt.features,
      intervalCount: opt.intervalCount,
    };
    updateFormData({ tier });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tier) return;
    nextStep();
  };

  if (loading) {
    return (
      <div className="space-y-6 py-4">
        <h3 className="text-lg font-medium">Select Your Service Tier</h3>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pricing options...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-6 py-4">
        <h3 className="text-lg font-medium">Select Your Service Tier</h3>
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Loading Error</span>
          </div>
          <p>{loadError}</p>
        </div>
        <div className={user ? 'flex justify-end' : 'flex justify-between'}>
          {!user && <Button variant="outline" onClick={prevStep}>Back</Button>}
          <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
        </div>
      </div>
    );
  }

  const groups = buildGroups();

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <h3 className="text-lg font-medium">Select Your Service Tier</h3>

      {error && (
        <div
          ref={errorRef}
          className={`text-sm p-4 rounded-lg border ${
            loginUrl
              ? 'text-amber-800 bg-amber-50 border-amber-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">
              {loginUrl ? 'Account Already Exists' : 'Account Creation Error'}
            </span>
          </div>
          <p className="mb-3">{error}</p>
          {loginUrl && (
            <div className="pt-2 border-t border-amber-200">
              <Link
                href={loginUrl}
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Go to Login
              </Link>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-stone-600">
        Choose the service that best fits your fitness goals and preferences.
      </p>

      {/* Mobile-only heads-up: the coaching dashboard is desktop-first for now.
          Shown before payment so phone users can choose to finish on a computer. */}
      <div className="md:hidden flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <Monitor className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
        <p className="text-sm text-emerald-900">
          <span className="font-semibold">Heads up:</span> your coaching dashboard is built for
          desktop right now (a mobile app is coming soon). You can sign up here on your phone, then
          log in on a computer for the full experience.
        </p>
      </div>

      {/* One GROUP BOX per row (In-Person / Online Coaching / Complete Transformation),
          each with two side-by-side selectable option cards → a clean 3×2 layout.
          In-Person's two cards are different PRODUCTS (single / 4-pack); the
          subscription groups' two cards are cadences (Monthly / Quarterly). */}
      <div className="space-y-5">
        {groups.map((group) => (
          <div
            key={group.key}
            className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm"
          >
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-emerald-900">{group.title}</h4>
                {group.details && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                    {group.details}
                  </span>
                )}
              </div>
              {group.description && (
                <p className="text-sm text-stone-600 mt-1">{group.description}</p>
              )}
            </div>

            <div className={`grid gap-3 ${group.options.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
              {group.options.map((opt) => {
                const selected = isSelected(opt.productId, opt.intervalCount);
                return (
                  <button
                    type="button"
                    key={`${opt.productId}-${opt.intervalCount}`}
                    onClick={() => handleSelect(opt)}
                    className={`
                      text-left rounded-xl p-4 transition-all duration-200
                      ${selected
                        ? 'border-2 border-emerald-600 bg-white shadow-md ring-1 ring-emerald-200'
                        : 'border border-stone-200 bg-white/70 hover:border-emerald-300 hover:shadow-sm'}
                    `}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center">
                        <div className={`
                          w-4 h-4 rounded-full flex items-center justify-center mr-2 transition-colors
                          ${selected ? 'bg-emerald-600 text-white' : 'border border-stone-300'}
                        `}>
                          {selected && <Check className="h-2.5 w-2.5" />}
                        </div>
                        <span className={`text-sm font-semibold ${selected ? 'text-emerald-900' : 'text-stone-700'}`}>
                          {opt.label}
                        </span>
                      </div>
                      {opt.saveBadge && (
                        <span className="text-xs font-semibold text-white bg-emerald-600 px-2 py-0.5 rounded-full">
                          Save 10%
                        </span>
                      )}
                    </div>
                    <div className="pl-6">
                      <span className="text-xl font-bold text-stone-900">{fmt(opt.amount)}</span>
                      {opt.suffix && (
                        <span className="text-xs font-normal text-stone-500">{opt.suffix}</span>
                      )}
                      {opt.intervalCount === 3 && (
                        <div className="text-xs text-emerald-700 font-medium mt-0.5">
                          {fmt(Math.round(opt.amount / 3))}/mo · billed every 3 months
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Features shared across the group's options (from the first option). */}
            {group.options[0]?.features?.length > 0 && (
              <ul className="mt-4 text-sm space-y-1.5">
                {group.options[0].features.map((feature, index) => (
                  <li key={index} className="flex items-start text-stone-700">
                    <Check className="h-4 w-4 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>


      <div className={`flex mt-6 ${user ? 'justify-end' : 'justify-between'}`}>
        {!user && (
          <Button type="button" variant="outline" onClick={prevStep} disabled={isSubmitting}>
            Back
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting || !formData.tier}>
          {isSubmitting ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
