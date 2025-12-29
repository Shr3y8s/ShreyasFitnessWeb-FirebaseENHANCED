import { auth, db, functions } from './firebase';
import { 
  updateEmail, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  fetchSignInMethodsForEmail 
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

interface ChangeEmailResult {
  success: boolean;
  error?: string;
}

/**
 * STEP 1: Send OTP to new email after validating current password
 * This verifies the user owns the OLD email (via password)
 */
export async function sendEmailChangeOTP(
  currentPassword: string,
  newEmail: string
): Promise<ChangeEmailResult> {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return {
        success: false,
        error: 'No authenticated user found',
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return {
        success: false,
        error: 'Invalid email format',
      };
    }

    // Check if new email is same as current
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return {
        success: false,
        error: 'New email must be different from current email',
      };
    }

    // STEP 1: Re-authenticate user with current password (proves they own OLD email)
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
      console.error('[sendEmailChangeOTP] Re-authentication failed:', error);
      
      if (error.code === 'auth/wrong-password') {
        return { success: false, error: 'Current password is incorrect' };
      } else if (error.code === 'auth/too-many-requests') {
        return { success: false, error: 'Too many attempts. Please try again later' };
      } else {
        return { success: false, error: 'Failed to verify password' };
      }
    }

    // STEP 2: Check if new email is already in use
    try {
      const methods = await fetchSignInMethodsForEmail(auth, newEmail);
      if (methods.length > 0) {
        return {
          success: false,
          error: 'This email is already registered to another account',
        };
      }
    } catch (error: any) {
      console.error('[sendEmailChangeOTP] Error checking email availability:', error);
      // Continue anyway - will be caught later if needed
    }

    // STEP 3: Send OTP to new email via Cloud Function
    const sendOTP = httpsCallable(functions, 'sendEmailVerificationOTP');
    
    try {
      await sendOTP({ email: newEmail });
    } catch (error: any) {
      console.error('[sendEmailChangeOTP] Failed to send OTP:', error);
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[sendEmailChangeOTP] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * STEP 2: Verify OTP code for new email
 * This verifies the user owns the NEW email
 */
export async function verifyEmailChangeOTP(
  newEmail: string,
  otp: string
): Promise<ChangeEmailResult> {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      return {
        success: false,
        error: 'No authenticated user found',
      };
    }

    // Verify OTP via Cloud Function
    const verifyOTP = httpsCallable(functions, 'verifyEmailOTP');
    
    try {
      const result = await verifyOTP({ email: newEmail, otp });
      const data = result.data as any;
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Invalid verification code',
        };
      }
    } catch (error: any) {
      console.error('[verifyEmailChangeOTP] OTP verification failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify code',
      };
    }

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('[verifyEmailChangeOTP] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}

/**
 * STEP 3: Complete email change after OTP verification
 * Calls Cloud Function to update Firebase Auth, Firestore, and Stripe using Admin SDK
 */
export async function completeEmailChange(
  newEmail: string
): Promise<ChangeEmailResult> {
  try {
    const user = auth.currentUser;
    
    if (!user || !user.email) {
      return {
        success: false,
        error: 'No authenticated user found',
      };
    }

    console.log('[completeEmailChange] Calling Cloud Function to update email');

    // Call Cloud Function to update email using Admin SDK
    // This bypasses the client-side restrictions and verifies OTP on the server
    const updateUserEmail = httpsCallable(functions, 'updateUserEmail');
    
    try {
      const result = await updateUserEmail({ newEmail });
      const data = result.data as any;
      
      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to update email',
        };
      }

      console.log('[completeEmailChange] Email updated successfully');

      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[completeEmailChange] Cloud Function call failed:', error);
      
      // Parse error message from Cloud Function
      const errorMessage = error.message || 'Failed to update email';
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  } catch (error: any) {
    console.error('[completeEmailChange] Unexpected error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
