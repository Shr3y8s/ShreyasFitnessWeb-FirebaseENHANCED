// src/react/signup/SignupForm.jsx
import React, { useState } from 'react';
import { createUserWithTier } from '../../firebase-config';
import AccountInfoStep from './components/AccountInfoStep';
import ServiceTierStep from './components/ServiceTierStep';
import PaymentStep from './components/PaymentStep';
import ConfirmationStep from './components/ConfirmationStep';

export function SignupForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    tier: null,
    paymentInfo: null
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (data) => {
    setFormData({...formData, ...data});
    // Clear errors when form data changes
    setError('');
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // Create user with tier info
      const result = await createUserWithTier(
        formData.email,
        formData.password,
        formData.name,
        formData.phone,
        formData.tier
      );
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to create account');
      }
      
      // Dispatch the same success event your current code looks for
      const signupSuccessEvent = new CustomEvent('signupSuccess', {
        detail: { 
          email: formData.email,
          name: formData.name,
          autoLogin: true,
          tier: formData.tier
        }
      });
      document.dispatchEvent(signupSuccessEvent);
      
    } catch (error) {
      console.error('Signup error:', error);
      setError(error.message);
      setIsSubmitting(false);
    }
  };

  // Render the current step
  const renderStep = () => {
    switch(currentStep) {
      case 1:
        return (
          <AccountInfoStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep}
            error={error}
          />
        );
      case 2:
        return (
          <ServiceTierStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep}
            error={error}
          />
        );
      case 3:
        return (
          <PaymentStep 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep}
            error={error}
          />
        );
      case 4:
        return (
          <ConfirmationStep 
            formData={formData} 
            handleSubmit={handleSubmit} 
            prevStep={prevStep}
            isSubmitting={isSubmitting}
            error={error}
          />
        );
      default:
        return <AccountInfoStep 
                 formData={formData} 
                 updateFormData={updateFormData} 
                 nextStep={nextStep}
                 error={error}
               />;
    }
  };

  return (
    <div className="signup-form-container">
      {/* Progress indicator */}
      <div className="progress-steps">
        <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Account</div>
        </div>
        <div className={`step-connector ${currentStep >= 2 ? 'active' : ''}`}></div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Select Plan</div>
        </div>
        <div className={`step-connector ${currentStep >= 3 ? 'active' : ''}`}></div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Payment</div>
        </div>
        <div className={`step-connector ${currentStep >= 4 ? 'active' : ''}`}></div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Confirm</div>
        </div>
      </div>
      
      {/* Current step */}
      {renderStep()}
    </div>
  );
}

export default SignupForm;
