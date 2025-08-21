// src/react/signup/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { SignupForm } from './SignupForm';
import './signup.css';

// Load Stripe with your publishable key
// In production, use environment variables: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY');

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

// Wait for DOM to be ready, then mount React
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('react-signup-form');
  if (container) {
    const root = createRoot(container);
    root.render(
      <Elements stripe={stripePromise} options={options}>
        <SignupForm />
      </Elements>
    );
  } else {
    console.error('Could not find react-signup-form container element');
  }
});
