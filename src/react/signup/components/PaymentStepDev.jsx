// src/react/signup/components/PaymentStepDev.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

function PaymentStepDev({ formData, updateFormData, nextStep, prevStep, error }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState('dev_secret_mock');
  const [priceInfo, setPriceInfo] = useState({
    fullPrice: 'price_mock_full',
    installmentPrice: 'price_mock_installment',
    sessionPrice: 'price_mock_session'
  });
  const [isPaymentElementReady, setIsPaymentElementReady] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' or 'installment'

  const auth = getAuth();
  const db = getFirestore();
  
  // Add debug logs to track component state
  console.log("PaymentStep DEVELOPMENT MODE ACTIVE:", {
    stripeLoaded: !!stripe,
    elementsLoaded: !!elements,
    userAuthenticated: !!auth.currentUser,
    priceInfoLoaded: true,
    hasClientSecret: true,
    isPaymentElementReady: true
  });
  
  // Get product details based on selected tier
  const getProductDetails = useCallback(() => {
    switch(formData.tier) {
      case 'in-person-training':
        return {
          name: 'In-Person Training (DEV)',
          amount: 7000, // $70.00 in cents
          installmentAmount: 1750, // $17.50 in cents
          isSubscription: false
        };
      case 'online-coaching':
        return {
          name: 'Online Coaching (DEV)',
          amount: 19900, // $199.00 in cents
          installmentAmount: 4975, // $49.75 in cents
          isSubscription: true
        };
      case 'complete-transformation':
        return {
          name: 'Complete Transformation (DEV)',
          amount: 19900, // $199.00 in cents
          sessionAmount: 6000, // $60.00 in cents
          installmentAmount: 4975, // $49.75 in cents
          isSubscription: true,
          hasAdditionalCharge: true
        };
      default:
        return { name: 'Basic Plan (DEV)', amount: 10000, isSubscription: true };
    }
  }, [formData.tier]);
  
  const formatCurrency = (amount) => {
    return (amount / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };
  
  const handlePlanSelection = (plan) => {
    setPaymentPlan(plan);
    console.log("Plan selected:", plan);
  };
  
  // Submit handler with clean separation of payment flows
  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setPaymentError(null);
    console.log("Payment form submitted (DEVELOPMENT MODE)");
    
    const productDetails = getProductDetails();
    
    // Simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      if (productDetails.isSubscription) {
        console.log("DEVELOPMENT MODE: Simulating subscription checkout");
        
        // Skip to next step in dev mode
        updateFormData({
          paymentInfo: {
            paymentMethodId: 'dev_pm_' + Date.now(),
            last4: "4242", 
            brand: "visa",
            paymentPlan,
            paymentComplete: true
          }
        });
        
        nextStep();
      } else {
        console.log("DEVELOPMENT MODE: Simulating one-time payment");
        
        // Skip to next step in dev mode
        updateFormData({
          paymentInfo: {
            paymentMethodId: 'dev_pm_' + Date.now(),
            last4: "4242",
            brand: "visa",
            paymentPlan,
            paymentComplete: true
          }
        });
        
        nextStep();
      }
    } catch (err) {
      console.error('Payment error (DEV MODE):', err);
      setPaymentError("Development mode error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Use different UI based on product type
  const productDetails = getProductDetails();
  
  // Add development banner to show DEV mode is active
  const DevModeBanner = () => (
    <div style={{ 
      background: '#ffeb3b', 
      color: '#333', 
      padding: '8px', 
      textAlign: 'center', 
      fontWeight: 'bold',
      marginBottom: '15px',
      borderRadius: '4px'
    }}>
      DEVELOPMENT MODE - No real payments will be processed
    </div>
  );
  
  // Subscription Flow UI (No Payment Element, just payment plan selection)
  if (productDetails.isSubscription) {
    return (
      <form className="signup-form" onSubmit={handleSubmit}>
        <DevModeBanner />
        <h3>Subscription Payment</h3>
        
        {paymentError && (
          <div className="error-message" role="alert" aria-live="polite">
            <i className="fas fa-exclamation-circle"></i>
            {paymentError}
          </div>
        )}
        
        <div className="payment-summary">
          <h4>Order Summary</h4>
          <div className="summary-item">
            <span className="item-name">{productDetails.name}</span>
            <span className="item-price">{formatCurrency(productDetails.amount)}</span>
          </div>
          {productDetails.hasAdditionalCharge && (
            <div className="summary-item">
              <span className="item-name">Session Fee</span>
              <span className="item-price">{formatCurrency(productDetails.sessionAmount)}</span>
            </div>
          )}
          <p className="recurring-notice">
            You will be charged {formatCurrency(productDetails.amount)} monthly
          </p>
        </div>
        
        <div className="payment-plan-options">
          <h4>Payment Options</h4>
          
          <div className={`plan-option ${paymentPlan === 'full' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              id="full-payment" 
              name="payment-plan"
              checked={paymentPlan === 'full'}
              onChange={() => handlePlanSelection('full')}
            />
            <label htmlFor="full-payment">
              <div className="plan-option-details">
                <strong>Pay in Full</strong>
                <span>{formatCurrency(productDetails.amount)}</span>
              </div>
              <div className="plan-option-description">
                Monthly subscription, cancel anytime
              </div>
            </label>
          </div>
          
          <div className={`plan-option ${paymentPlan === 'installment' ? 'selected' : ''}`}>
            <input 
              type="radio" 
              id="installment-payment" 
              name="payment-plan"
              checked={paymentPlan === 'installment'}
              onChange={() => handlePlanSelection('installment')}
            />
            <label htmlFor="installment-payment">
              <div className="plan-option-details">
                <strong>4 Monthly Payments</strong>
                <span>{formatCurrency(productDetails.installmentAmount)}/month</span>
              </div>
              <div className="plan-option-description">
                Split into 4 easy payments
              </div>
            </label>
          </div>
        </div>
        
        <div className="payment-security-notice">
          <i className="fas fa-lock"></i>
          <span>Development Mode: No actual payment will be processed</span>
        </div>
        
        <div className="button-row">
          <button 
            type="button" 
            className="btn-secondary"
            onClick={prevStep}
            disabled={processing}
          >
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <button 
            type="submit" 
            className="btn-primary-enhanced"
            disabled={processing}
            aria-busy={processing}
          >
            {processing ? 'Processing...' : 'Continue (Dev Mode)'} 
            {!processing && <i className="fas fa-arrow-right"></i>}
          </button>
        </div>
      </form>
    );
  }
  
  // One-time Payment Flow UI (Uses mock Payment Element in dev mode)
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <DevModeBanner />
      <h3>Payment Information</h3>
      
      {paymentError && (
        <div className="error-message" role="alert" aria-live="polite">
          <i className="fas fa-exclamation-circle"></i>
          {paymentError}
        </div>
      )}
      
      <div className="payment-summary">
        <h4>Order Summary</h4>
        <div className="summary-item">
          <span className="item-name">{productDetails.name}</span>
          <span className="item-price">{formatCurrency(productDetails.amount)}</span>
        </div>
      </div>
      
      <div className="form-group">
        <label htmlFor="payment-element" className="sr-only">
          Payment details
        </label>
        <div className="payment-element-container">
          {/* Mock Payment Element for Dev Mode */}
          <div style={{padding: '20px', textAlign: 'center'}}>
            <div style={{marginBottom: '15px', fontWeight: 'bold'}}>Development Mode Payment Element</div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px'}}>
              <span>Card number</span>
              <span>4242 4242 4242 4242</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '10px'}}>
              <span>Expiry</span>
              <span>12/28</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '10px', border: '1px solid #ddd', borderRadius: '4px'}}>
              <span>CVC</span>
              <span>123</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="payment-security-notice">
        <i className="fas fa-lock"></i>
        <span>Development Mode: No actual payment will be processed.</span>
      </div>
      
      <div className="button-row">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={prevStep}
          disabled={processing}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <button 
          type="submit" 
          className="btn-primary-enhanced"
          disabled={processing}
          aria-busy={processing}
        >
          {processing ? 'Processing...' : 'Continue (Dev Mode)'} 
          {!processing && <i className="fas fa-arrow-right"></i>}
        </button>
      </div>
    </form>
  );
}

export default PaymentStepDev;
