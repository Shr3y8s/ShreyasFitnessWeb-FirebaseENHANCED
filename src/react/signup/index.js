// src/react/signup/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SignupForm } from './SignupForm';
import './signup.css';

// Load Stripe with your publishable key from environment variables
// In production, use environment variables: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

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
