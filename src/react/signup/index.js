// src/react/signup/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SignupForm } from './SignupForm';
import './signup.css';

// Load Stripe with your publishable key (hardcoded for development)
// For production, you would typically use environment variables
const stripePromise = loadStripe('pk_test_51Hg4SwBjx3iGODd6fpJzOpYnyoBLQfoZS4ZMusKkfV82WhhHL0z15HWLe2Fs2K45x5GlNzX91ywD6lJkYfsbAHCz002TVq3QZn');

// Note: Make sure to update to the latest Stripe library versions:
// npm install @stripe/stripe-js@latest @stripe/react-stripe-js@latest
// This ensures BNPL options like Affirm, Klarna, and Afterpay will appear when enabled

// Modern Stripe Elements appearance configuration
const appearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#4caf50',
    colorBackground: '#ffffff',
    colorText: '#30313d',
    fontFamily: 'Roboto, system-ui, sans-serif',
    borderRadius: '8px',
  },
};

const options = {
  appearance,
  loader: 'auto'
};

// Export Stripe configuration for use in components
export { stripePromise, appearance, options };

// Wait for DOM to be ready, then mount React
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-signup-form');
  if (container) {
    const root = createRoot(container);
    root.render(
      <SignupForm />
    );
  } else {
    console.error('Could not find react-signup-form container element');
  }
});
