/**
 * Email Verification API
 * Handles OTP-based email verification during signup
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

/**
 * Send OTP verification code to email
 * @param email - Email address to verify
 * @returns Success or error message
 */
export async function sendOTP(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const sendEmailVerificationOTP = httpsCallable(functions, 'sendEmailVerificationOTP');
    
    const result = await sendEmailVerificationOTP({ email });
    const data = result.data as { success: boolean; message: string };
    
    return {
      success: data.success,
      message: data.message
    };
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    
    // Extract user-friendly error message
    const errorMessage = error.message || 'Failed to send verification code';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Verify OTP code
 * @param email - Email address being verified
 * @param otp - 6-digit OTP code
 * @returns Success or error message
 */
export async function verifyOTP(email: string, otp: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const verifyEmailOTP = httpsCallable(functions, 'verifyEmailOTP');
    
    const result = await verifyEmailOTP({ email, otp });
    const data = result.data as { success: boolean; message?: string; error?: string };
    
    if (!data.success && data.error) {
      return {
        success: false,
        error: data.error
      };
    }
    
    return {
      success: data.success,
      message: data.message || 'Email verified successfully'
    };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    
    // Extract user-friendly error message
    const errorMessage = error.message || 'Failed to verify code';
    
    return {
      success: false,
      error: errorMessage
    };
  }
}
