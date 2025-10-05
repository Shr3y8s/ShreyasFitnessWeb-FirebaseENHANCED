'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';
import { FormData } from '../page';

interface ConfirmationStepProps {
  formData: FormData;
  handleSubmit: () => void;
  prevStep: () => void;
  isSubmitting: boolean;
  error: string;
}

export default function ConfirmationStep({
  formData,
  handleSubmit,
  prevStep,
  isSubmitting,
  error
}: ConfirmationStepProps) {
  return (
    <div className="space-y-6 py-4">
      <h3 className="text-lg font-medium">Complete Your Registration</h3>
      
      {error && (
        <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-4">
        {/* Success message */}
        <div className="bg-green-50 border border-green-100 rounded-md p-4 flex items-start">
          <div className="bg-green-100 rounded-full p-1 mr-3 mt-1">
            <Check className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-green-800">Payment Successful</h4>
            <p className="text-sm text-green-700 mt-1">
              Your payment has been processed successfully. Please review your information below.
            </p>
          </div>
        </div>
        
        {/* Account info summary */}
        <div className="bg-stone-50 p-4 rounded-md">
          <h4 className="font-medium mb-2 text-stone-900">Account Information</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-stone-600">Name:</div>
            <div className="font-medium">{formData.name}</div>
            <div className="text-stone-600">Email:</div>
            <div className="font-medium">{formData.email}</div>
            {formData.phone && (
              <React.Fragment>
                <div className="text-stone-600">Phone:</div>
                <div className="font-medium">{formData.phone}</div>
              </React.Fragment>
            )}
          </div>
        </div>
        
        {/* Service tier summary */}
        <div className="bg-stone-50 p-4 rounded-md">
          <h4 className="font-medium mb-2 text-stone-900">Selected Plan</h4>
          <div className="flex justify-between items-center mb-2">
            <div className="font-medium">{formData.tier?.name || 'Selected plan'}</div>
            <div className="font-bold">${(formData.tier?.price || 0).toFixed(2)}</div>
          </div>
          {formData.tier?.features && (
            <ul className="text-sm text-stone-600 mt-2 space-y-1">
              {formData.tier.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 text-green-500 mr-1 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* Payment summary */}
        <div className="bg-stone-50 p-4 rounded-md">
          <h4 className="font-medium mb-2 text-stone-900">Payment Method</h4>
          <div className="flex items-center">
            <div className="bg-stone-100 rounded p-1 mr-2">
              <svg className="h-6 w-6 text-stone-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div>
              <div className="font-medium">
                {(formData.paymentInfo?.cardType as string || 'Credit Card')} ending in {(formData.paymentInfo?.lastFour as string || '****')}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <p className="text-sm text-stone-600">
          By clicking &quot;Complete Signup&quot;, you agree to our Terms of Service and Privacy Policy. 
          We will send you a confirmation email with your account details.
        </p>
        
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
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Processing...' : 'Complete Signup'}
          </Button>
        </div>
      </div>
    </div>
  );
}
