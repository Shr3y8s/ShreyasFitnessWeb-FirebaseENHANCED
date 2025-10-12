// src/react/signup/SignupForm.jsx
import React, { useState, useEffect } from 'react';
import { createUserWithTier, auth } from '../../firebase-config';
import { onAuthStateChanged } from 'firebase/auth';
import { Elements } from '@stripe/react-stripe-js';
// Access the global auth functions defined in js/auth.js
// The window.safelySetSigningUp function prevents redirects during signup
import AccountInfoStep from './components/AccountInfoStep';
import ServiceTierStep from './components/ServiceTierStep';
import PaymentStep from './components/PaymentStep';
import PaymentStepDev from './components/PaymentStepDev';
import ConfirmationStep from './components/ConfirmationStep';
import { stripePromise, options } from './index';

// Set this to false to use the production version of the payment step with BNPL support
const USE_DEV_MODE = false;

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
  const [currentUser, setCurrentUser] = useState(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Track authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      console.log("Auth state changed:", user ? "User authenticated" : "No user");
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const updateFormData = (data) => {
    setFormData({...formData, ...data});
    // Clear errors when form data changes
    setError('');
  };

  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);
  
  // Ensure we prevent automatic redirects during signup
  useEffect(() => {
    // Set the global signing up flag to prevent redirects
    if (window.safelySetSigningUp && currentStep > 1 && currentStep < 4) {
      console.log("Setting global isSigningUp flag to prevent redirects");
      window.safelySetSigningUp(true);
    }
    
    // Clean up when component unmounts
    return () => {
      if (window.safelySetSigningUp) {
        window.safelySetSigningUp(false);
      }
    };
  }, [currentStep]);

  // Create user account before proceeding to payment
  const handleCreateAccount = async () => {
    try {
      setIsSubmitting(true);
      setError('');
      
      // Set the global signing up flag to prevent redirects
      if (window.safelySetSigningUp) {
        console.log("Setting global isSigningUp flag during account creation");
        window.safelySetSigningUp(true);
      }
      
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
      
      console.log("Account created successfully");
      setIsSubmitting(false);
      nextStep(); // Proceed to payment step
    } catch (error) {
      console.error('Account creation error:', error);
      setError(error.message);
      setIsSubmitting(false);
      
      // Reset signing up flag on error
      if (window.safelySetSigningUp) {
        window.safelySetSigningUp(false);
      }
    }
  };

  // Function to handle payment completion - to be called from PaymentStep
  const handlePaymentComplete = () => {
    console.log("Payment completed successfully");
    setPaymentComplete(true);
    nextStep();
  };

  // Final submit after payment and confirmation
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      // No need to create user again, as it's already done before the payment step
      console.log("Signup flow complete, dispatching success event");
      
      // Only now dispatch the success event - after payment is confirmed
      const signupSuccessEvent = new CustomEvent('signupSuccess', {
        detail: { 
          email: formData.email,
          name: formData.name,
          autoLogin: true,
          tier: formData.tier
        }
      });
      
      // Allow redirect to dashboard by resetting the signing up flag
      if (window.safelySetSigningUp) {
        console.log("Resetting global isSigningUp flag after complete signup");
        window.safelySetSigningUp(false);
      }
      
      // Dispatch event to trigger dashboard redirect
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
            nextStep={handleCreateAccount} 
            prevStep={prevStep}
            error={error}
            isSubmitting={isSubmitting}
          />
        );
      case 3:
        // Use development version when DEV_MODE is enabled
        return USE_DEV_MODE ? (
          <PaymentStepDev 
            formData={formData} 
            updateFormData={updateFormData} 
            nextStep={nextStep} 
            prevStep={prevStep}
            error={error}
          />
        ) : (
          <Elements stripe={stripePromise} options={options}>
            <PaymentStep 
              formData={formData} 
              updateFormData={updateFormData} 
              nextStep={handlePaymentComplete} 
              prevStep={prevStep}
              error={error}
              currentUser={currentUser}
            />
          </Elements>
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
