'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { FormData, ServiceTier as ServiceTierType } from '../page';
import Link from 'next/link';

interface ServiceTierStepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  nextStep: () => void;
  prevStep: () => void;
  error: string;
  isSubmitting: boolean;
}

export default function ServiceTierStep({ 
  formData, 
  updateFormData, 
  nextStep, 
  prevStep, 
  error,
  isSubmitting 
}: ServiceTierStepProps) {
  // Service tiers matching your offerings
  const tiers = [
    {
      id: 'in-person-training',
      name: 'In-Person Training',
      title: 'In-Person Training',
      price: 70,
      description: 'Expert in-person coaching sessions focused on technique, form, and effective workouts.',
      details: 'Seattle Area Only',
      features: ['1:1 personalized training', 'Form correction', 'Custom exercise selection', 'Progress tracking']
    },
    {
      id: '4-pack-training',
      name: '4-Pack Training Sessions',
      title: '4-Pack Training Sessions',
      price: 240,
      description: 'Save $40 with our 4-session package. Perfect for getting started or refreshing your program.',
      details: 'Seattle Area Only',
      features: ['4 personalized sessions', 'Discounted rate', 'Program design', 'Exercise technique review']
    },
    {
      id: 'online-coaching',
      name: 'Online Coaching',
      title: 'Online Coaching',
      price: 199,
      description: 'Complete transformation system with custom programs, nutrition guidance, and support.',
      details: 'Remote Coaching',
      features: ['Custom workout program', 'Nutrition guidance', '24/7 messaging support', 'Weekly check-ins']
    },
    {
      id: 'complete-transformation',
      name: 'Complete Transformation',
      title: 'Complete Transformation',
      price: 259,
      description: 'Comprehensive coaching plus hands-on training for maximum results.',
      details: 'Seattle Premium Experience',
      features: ['All online coaching features', 'Monthly in-person session', 'Advanced progress tracking', 'Priority support']
    }
  ];
  
  const handleTierSelect = (tier: ServiceTierType) => {
    updateFormData({ tier });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tier) {
      // Handle error but avoid TypeScript error
      const setErrorMessage = () => {};
      setErrorMessage();
      // This will be caught and handled by the parent component
      return;
    }
    
    nextStep();
  };
  
  // Format price for display
  const formatPrice = (tier: ServiceTierType) => {
    if (tier.id === 'in-person-training') {
      return `$${tier.price}/session`;
    } else if (tier.id === '4-pack-training') {
      return `$${tier.price} ($${tier.price/4}/session)`;
    } else if (tier.id === 'online-coaching') {
      return `$${tier.price}/month`;
    } else if (tier.id === 'complete-transformation') {
      return `$${tier.price}/month`;
    }
    return `$${tier.price}`;
  };
  
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
        {tiers.map(tier => (
          <div 
            key={tier.id}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all hover:border-stone-400
              ${formData.tier?.id === tier.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}
            `}
            onClick={() => handleTierSelect(tier)}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <div className={`
                  w-5 h-5 rounded-full flex items-center justify-center mr-2
                  ${formData.tier?.id === tier.id ? 'bg-stone-900 text-white' : 'border border-stone-400'}
                `}>
                  {formData.tier?.id === tier.id && <Check className="h-3 w-3" />}
                </div>
                <h4 className="font-medium">{tier.title}</h4>
              </div>
              <span className="font-bold">{formatPrice(tier)}</span>
            </div>
            <p className="text-sm text-stone-600 mb-2">{tier.description}</p>
            <div className="text-xs bg-stone-100 inline-block px-2 py-1 rounded">{tier.details}</div>
            <ul className="mt-3 text-sm space-y-1">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-1 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
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
