'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { FormData, ServiceTier as ServiceTierType } from '../page';
import { fetchAllProducts, selectSignupPrice } from '@/lib/stripe';
import { StripeProduct } from '@/types/stripe';
import { getProductMarketing } from '@/lib/product-marketing';
import Link from 'next/link';

interface ServiceTierStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  error: string;
  isSubmitting: boolean;
}

interface EnhancedProduct extends StripeProduct {
  displayPrice: number;
  priceFormatted: string;
  details?: string;
  features: string[];
  marketingDescription?: string;
}

export default function ServiceTierStep({ 
  formData, 
  updateFormData, 
  nextStep, 
  prevStep, 
  error,
  isSubmitting 
}: ServiceTierStepProps) {
  const [products, setProducts] = useState<EnhancedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');

  // Fetch products from Firestore on mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        
        // Fetch all active products from Firestore
        const stripeProducts = await fetchAllProducts();
        
        if (stripeProducts.length === 0) {
          setLoadError('No products available at this time');
          return;
        }

        // Enhance products with marketing data and pricing info
        const enhanced: EnhancedProduct[] = stripeProducts.map(product => {
          const marketing = getProductMarketing(product.id);
          const price = selectSignupPrice(product);
          
          return {
            ...product,
            displayPrice: price?.amount || 0,
            priceFormatted: formatPrice(price?.amount || 0, price?.type),
            details: marketing.details,
            features: marketing.features || [],
            marketingDescription: marketing.marketingDescription
          };
        });

        // Sort by price (lowest to highest)
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

  const formatPrice = (amount: number, type?: string): string => {
    const dollars = amount / 100;
    const formatted = dollars.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    if (type === 'recurring') {
      return `${formatted}/month`;
    }
    return formatted;
  };
  
  const handleTierSelect = (product: EnhancedProduct) => {
    // Store actual Stripe product ID instead of friendly name
    const tier: ServiceTierType = {
      id: product.id, // NOW STORES ACTUAL STRIPE PRODUCT ID
      name: product.name,
      price: product.displayPrice / 100,
      features: product.features
    };
    updateFormData({ tier });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tier) {
      return;
    }
    
    nextStep();
  };
  
  // Loading state
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

  // Error state
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
        <div className="flex justify-between">
          <Button variant="outline" onClick={prevStep}>Back</Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <h3 className="text-lg font-medium">Select Your Service Tier</h3>
      
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="font-medium">Account Creation Error</span>
          </div>
          <p className="mb-3">{error}</p>
          {error.includes('email is already registered') && (
            <div className="pt-2 border-t border-red-200">
              <Link 
                href="/login" 
                className="inline-flex items-center text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Go to Login Page
              </Link>
            </div>
          )}
        </div>
      )}
      
      <p className="text-sm text-stone-600">
        Choose the service that best fits your fitness goals and preferences.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map(product => (
          <div 
            key={product.id}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all hover:border-stone-400
              ${formData.tier?.id === product.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}
            `}
            onClick={() => handleTierSelect(product)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center mr-2
                  ${formData.tier?.id === product.id ? 'bg-stone-900 text-white' : 'border border-stone-400'}
                `}>
                  {formData.tier?.id === product.id && <Check className="h-3 w-3" />}
                </div>
                <h4 className="font-medium">{product.name}</h4>
              </div>
              <span className="font-bold">{product.priceFormatted}</span>
            </div>
            
            <p className="text-sm text-stone-600 mb-2">
              {product.marketingDescription || product.description || ''}
            </p>
            
            {product.details && (
              <div className="text-xs bg-stone-100 inline-block px-2 py-1 rounded mb-3">
                {product.details}
              </div>
            )}
            
            {product.features.length > 0 && (
              <ul className="mt-3 text-sm space-y-1">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className="h-4 w-4 text-green-500 mr-1 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting || !formData.tier}
        >
          {isSubmitting ? 'Processing...' : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
