// src/react/signup/components/PaymentStep.jsx
import React, { useState } from 'react';

function PaymentStep({ formData, updateFormData, nextStep, prevStep, error }) {
  // This is a simplified payment form
  // In production, you would integrate with Stripe or another payment processor
  
  const [cardInfo, setCardInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiry: '',
    cvv: ''
  });
  
  const handleChange = (e) => {
    setCardInfo({
      ...cardInfo,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!cardInfo.cardNumber || !cardInfo.cardName || !cardInfo.expiry || !cardInfo.cvv) {
      updateFormData({ error: 'Please complete all payment fields' });
      return;
    }
    
    // In a real app, you would process payment here
    // For this example, we'll just collect the info and store it in formData
    updateFormData({ 
      paymentInfo: {
        ...cardInfo,
        // Mask card number for security in state
        cardNumber: '**** **** **** ' + cardInfo.cardNumber.slice(-4)
      }
    });
    
    nextStep();
  };
  
  // Calculate pricing based on selected tier
  const getTierPricing = () => {
    switch(formData.tier) {
      case 'in-person-training':
        return {
          name: 'In-Person Training',
          price: '$70.00',
          recurring: false,
          frequency: 'per session'
        };
      case 'online-coaching':
        return {
          name: 'Online Coaching',
          price: '$199.00',
          recurring: true,
          frequency: 'monthly'
        };
      case 'complete-transformation':
        return {
          name: 'Complete Transformation',
          price: '$199.00',
          recurring: true,
          frequency: 'monthly + $60 per session'
        };
      default:
        return {
          name: 'Selected Plan',
          price: '$0.00',
          recurring: false,
          frequency: ''
        };
    }
  };
  
  const pricingInfo = getTierPricing();
  
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <h3>Payment Information</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="payment-summary">
        <h4>Order Summary</h4>
        <div className="summary-item">
          <span className="item-name">{pricingInfo.name}</span>
          <span className="item-price">{pricingInfo.price}</span>
        </div>
        {pricingInfo.recurring && (
          <p className="recurring-notice">
            You will be charged {pricingInfo.price} {pricingInfo.frequency}
          </p>
        )}
      </div>
      
      <div className="form-group">
        <label htmlFor="cardName">
          <i className="fas fa-user"></i> Name on Card <span className="required">*</span>
        </label>
        <input
          type="text"
          id="cardName"
          name="cardName"
          value={cardInfo.cardName}
          onChange={handleChange}
          placeholder="Name as it appears on card"
          autoComplete="cc-name"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="cardNumber">
          <i className="fas fa-credit-card"></i> Card Number <span className="required">*</span>
        </label>
        <input
          type="text"
          id="cardNumber"
          name="cardNumber"
          value={cardInfo.cardNumber}
          onChange={handleChange}
          placeholder="XXXX XXXX XXXX XXXX"
          maxLength={19}
          autoComplete="cc-number"
          required
        />
      </div>
      
      <div className="form-row">
        <div className="form-group half">
          <label htmlFor="expiry">
            <i className="fas fa-calendar"></i> Expiry Date <span className="required">*</span>
          </label>
          <input
            type="text"
            id="expiry"
            name="expiry"
            value={cardInfo.expiry}
            onChange={handleChange}
            placeholder="MM/YY"
            maxLength={5}
            autoComplete="cc-exp"
            required
          />
        </div>
        <div className="form-group half">
          <label htmlFor="cvv">
            <i className="fas fa-lock"></i> CVV <span className="required">*</span>
          </label>
          <input
            type="text"
            id="cvv"
            name="cvv"
            value={cardInfo.cvv}
            onChange={handleChange}
            placeholder="123"
            maxLength={4}
            autoComplete="cc-csc"
            required
          />
        </div>
      </div>
      
      <div className="button-row">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={prevStep}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <button type="submit" className="btn-primary-enhanced">
          Review Order <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </form>
  );
}

export default PaymentStep;
