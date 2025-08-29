// src/react/signup/components/ConfirmationStep.jsx
import React from 'react';

function ConfirmationStep({ formData, handleSubmit, prevStep, isSubmitting, error }) {
  return (
    <div className="signup-form">
      <h3>Review Your Information</h3>
      
      {error && <div className="error-message" role="alert">{error}</div>}
      
      <div className="review-section">
        <h4>Account Information</h4>
        <div className="review-item">
          <span className="item-label">Name:</span>
          <span className="item-value">{formData.name}</span>
        </div>
        <div className="review-item">
          <span className="item-label">Email:</span>
          <span className="item-value">{formData.email}</span>
        </div>
        <div className="review-item">
          <span className="item-label">Phone:</span>
          <span className="item-value">{formData.phone || 'Not provided'}</span>
        </div>
      </div>
      
      <div className="review-section">
        <h4>Selected Plan</h4>
        <div className="review-item">
          <span className="item-label">Plan:</span>
          <span className="item-value">
            {formData.tier === 'in-person-training' && 'In-Person Training'}
            {formData.tier === 'online-coaching' && 'Online Coaching'}
            {formData.tier === 'complete-transformation' && 'Complete Transformation'}
          </span>
        </div>
      </div>
      
      <div className="review-section">
        <h4>Payment Information</h4>
        <div className="review-item">
          <span className="item-label">Payment Method:</span>
          <span className="item-value">
            {formData.tier === 'in-person-training' 
              ? 'In-person payment at first session'
              : formData.paymentInfo?.brand 
                ? `${formData.paymentInfo.brand.toUpperCase()} •••• ${formData.paymentInfo.last4}` 
                : 'Not provided'}
          </span>
        </div>
        {formData.tier !== 'in-person-training' && (
          <div className="review-item">
            <span className="item-label">Payment Plan:</span>
            <span className="item-value">
              {formData.tier === 'online-coaching' || formData.tier === 'complete-transformation' 
                ? 'Monthly Subscription' 
                : formData.paymentInfo?.paymentPlan === 'installment' 
                  ? '4 Monthly Payments' 
                  : 'Pay in Full'}
            </span>
          </div>
        )}
      </div>
      
      <p className="disclaimer">
        By clicking "Complete Sign Up", you agree to our Terms of Service and Privacy Policy.
        {formData.tier !== 'in-person-training' 
          ? 'Your payment will be processed securely by Stripe.'
          : 'Your payment will be collected at your first training session.'}
      </p>
      
      <div className="button-row">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={prevStep}
          disabled={isSubmitting}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <button 
          type="button" 
          className="btn-primary-enhanced"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Complete Sign Up'}
          {!isSubmitting && <i className="fas fa-check-circle"></i>}
        </button>
      </div>
    </div>
  );
}

export default ConfirmationStep;
