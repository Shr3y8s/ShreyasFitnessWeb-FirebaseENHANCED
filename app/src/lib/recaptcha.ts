/**
 * reCAPTCHA v3 Utility
 * Handles loading reCAPTCHA script and executing verification
 */

// Load reCAPTCHA script
export const loadRecaptcha = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      // Wait for grecaptcha to be ready
      window.grecaptcha.ready(() => {
        resolve();
      });
    };
    
    script.onerror = () => {
      reject(new Error('Failed to load reCAPTCHA script'));
    };
    
    document.head.appendChild(script);
  });
};

// Execute reCAPTCHA and get token
export const executeRecaptcha = async (action: string = 'signup'): Promise<string> => {
  try {
    // Ensure reCAPTCHA is loaded
    if (!window.grecaptcha) {
      await loadRecaptcha();
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      throw new Error('reCAPTCHA site key not configured');
    }

    // Execute reCAPTCHA
    const token = await window.grecaptcha.execute(siteKey, { action });
    return token;
  } catch (error) {
    console.error('reCAPTCHA execution error:', error);
    throw error;
  }
};

// Type definitions for grecaptcha
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
