// src/react/signup/utils/stripeUtils.js

import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * Tests which payment methods are available for the account
 * Useful for debugging Buy Now Pay Later (BNPL) options
 * @param {Object} options - Options for testing payment methods
 * @param {number} options.amount - Amount in cents (e.g. 10000 for $100.00)
 * @param {string} options.currency - Currency code (e.g. 'usd')
 * @param {string} options.country - Country code (e.g. 'US')
 * @returns {Promise<Array<string>>} - Array of available payment method types
 */
export const getAvailablePaymentMethods = async (options = {
  amount: 10000,
  currency: 'usd',
  country: 'US'
}) => {
  try {
    const functions = getFunctions();
    const checkPaymentMethods = httpsCallable(
      functions,
      'stripePaymentsGetPaymentMethodsAvailability'
    );

    console.log('Checking available payment methods...');
    const result = await checkPaymentMethods(options);
    
    if (result.data && result.data.available_payment_methods) {
      console.log('Available payment methods:', result.data.available_payment_methods);
      return result.data.available_payment_methods;
    } else {
      console.warn('No payment methods data returned');
      return [];
    }
  } catch (error) {
    console.error('Error checking payment methods:', error);
    throw error;
  }
};

/**
 * Helper function to test if specific payment methods are available
 * @param {Array<string>} targetMethods - Methods to check for (e.g. ['affirm', 'klarna'])
 * @returns {Promise<Object>} - Object with availability status for each method
 */
export const testBNPLAvailability = async (targetMethods = ['affirm', 'afterpay_clearpay', 'klarna']) => {
  const availableMethods = await getAvailablePaymentMethods();
  
  // Create a result object showing which methods are available
  const results = {};
  targetMethods.forEach(method => {
    results[method] = availableMethods.includes(method);
  });
  
  console.table(results);
  return results;
};
