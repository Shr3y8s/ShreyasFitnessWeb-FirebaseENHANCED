// src/react/signup/components/ConfirmationStep.jsx
import React from 'react';

function ConfirmationStep({ formData, handleSubmit, prevStep, isSubmitting, error }) {
  // Format selected tier for display
  const formatTier = (tierId) => {
    switch(tierId) {
      case 'in-person-training':
        return {
          name: 'In-Person Training',
          price: '$70/session'
        };
      case 'online-coaching':
        return {
          name: 'Online Coaching',
          price: '$199/month'
        };
      case 'complete-transformation':
        return {
          name: 'Complete Transformation',
          price: '$199/month + $60/session'
        };
      default:
        return {
          name: 'Unknown tier',
          price: 'Price not available'
        };
    }
  };
  
  const tierInfo = formatTier(formData.tier);
  
  return (
    <div className="signup-form">
      <h3>Review and Confirm</h3>
      
      {error && <div className="error-message">{error}</div>}
      
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
        {formData.phone && (
          <div className="review-item">
            <span className="item-label">Phone:</span>
            <span className="item-value">{formData.phone}</span>
          </div>
        )}
      </div>
      
      <div className="review-section">
        <h4>Selected Plan</h4>
        <div className="review-item">
          <span className="item-label">Service:</span>
          <span className="item-value">{tierInfo.name}</span>
        </div>
        <div className="review-item">
          <span className="item-label">Price:</span>
          <span className="item-value">{tierInfo.price}</span>
        </div>
      </div>
      
      <div className="review-section">
        <h4>Payment Information</h4>
        <div className="review-item">
          <span className="item-label">Card:</span>
          <span className="item-value">{formData.paymentInfo?.cardNumber || 'Not provided'}</span>
        </div>
      </div>
      
      <div className="terms-agreement">
        <label className="checkbox-container">
          <input type="checkbox" required />
          <span className="checkmark"></span>
          I agree to the <a href="#" target="_blank">Terms of Service</a> and <a href="#" target="_blank">Privacy Policy</a>
        </label>
      </div>
      
      <div className="next-steps-info">
        <h4>What happens next?</h4>
        <p>
          After completing signup, you will be directed to your dashboard where you can schedule your 30-minute consultation to discuss your fitness goals and create a personalized plan.
        </p>
      </div>
      
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
        >
          {isSubmitting ? 'Creating Account...' : 'Complete Signup'}
          {!isSubmitting && <i className="fas fa-check"></i>}
        </button>
      </div>
    </div>
  );
}

export default ConfirmationStep;
