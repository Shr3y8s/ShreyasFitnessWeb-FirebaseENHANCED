// src/react/signup/components/AccountInfoStep.jsx
import React from 'react';

function AccountInfoStep({ formData, updateFormData, nextStep, error }) {
  const handleChange = (e) => {
    updateFormData({ [e.target.name]: e.target.value });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      updateFormData({ error: 'Please fill in all required fields' });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      updateFormData({ error: 'Passwords do not match' });
      return;
    }
    
    // Proceed to next step
    nextStep();
  };
  
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      <h3>Create Your Account</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="fullname">
          <i className="fas fa-user"></i> Full Name <span className="required">*</span>
        </label>
        <input
          type="text"
          id="fullname"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          autoComplete="name"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="email">
          <i className="fas fa-envelope"></i> Email Address <span className="required">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email address"
          autoComplete="email"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="phone">
          <i className="fas fa-phone"></i> Phone Number
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="Enter your phone number"
          autoComplete="tel"
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">
          <i className="fas fa-lock"></i> Password <span className="required">*</span>
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          autoComplete="new-password"
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="confirmPassword">
          <i className="fas fa-lock"></i> Confirm Password <span className="required">*</span>
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          autoComplete="new-password"
          required
        />
      </div>
      
      <button type="submit" className="btn-primary-enhanced">
        <i className="fas fa-arrow-right"></i>
        Continue
      </button>
    </form>
  );
}

export default AccountInfoStep;
