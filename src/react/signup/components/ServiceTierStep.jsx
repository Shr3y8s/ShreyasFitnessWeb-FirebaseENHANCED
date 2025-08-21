// src/react/signup/components/ServiceTierStep.jsx
import React from 'react';

function ServiceTierStep({ formData, updateFormData, nextStep, prevStep, error }) {
  // Service tiers matching your offerings from services.html
  const tiers = [
    {
      id: 'in-person-training',
      title: 'In-Person Training',
      price: '$70/session',
      description: 'Expert in-person coaching sessions focused on technique, form, and effective workouts.',
      details: 'Seattle Area Only'
    },
    {
      id: 'online-coaching',
      title: 'Online Coaching',
      price: '$199/month',
      description: 'Complete transformation system with custom programs, nutrition guidance, and support.',
      details: 'Remote Coaching'
    },
    {
      id: 'complete-transformation',
      title: 'Complete Transformation',
      price: '$199/month + $60/session',
      description: 'Comprehensive coaching plus hands-on training for maximum results.',
      details: 'Seattle Premium Experience'
    }
  ];
  
  const handleTierSelect = (tier) => {
    updateFormData({ tier });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.tier) {
      updateFormData({ error: 'Please select a service tier' });
      return;
    }
    
    nextStep();
  };
  
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <h3>Select Your Service Tier</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <p className="form-description">
        Choose the service that best fits your fitness goals and preferences.
      </p>
      
      <div className="service-tiers">
        {tiers.map(tier => (
          <div 
            key={tier.id}
            className={`service-tier ${formData.tier === tier.id ? 'selected' : ''}`}
            onClick={() => handleTierSelect(tier.id)}
          >
            <div className="tier-header">
              <input
                type="radio"
                name="tier"
                id={tier.id}
                className="tier-radio"
                checked={formData.tier === tier.id}
                onChange={() => handleTierSelect(tier.id)}
              />
              <h4 className="tier-title">{tier.title}</h4>
            </div>
            <div className="tier-price">{tier.price}</div>
            <p className="tier-description">{tier.description}</p>
            <span className="tier-details">{tier.details}</span>
          </div>
        ))}
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
          Continue <i className="fas fa-arrow-right"></i>
        </button>
      </div>
    </form>
  );
}

export default ServiceTierStep;
