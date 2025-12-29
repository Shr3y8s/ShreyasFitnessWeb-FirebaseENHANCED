'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Mail, Check } from 'lucide-react';

interface ChangeEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSuccess: (newEmail: string) => void;
}

type Step = 'enter-details' | 'verify-otp' | 'complete';

export function ChangeEmailDialog({
  open,
  onOpenChange,
  currentEmail,
  onSuccess,
}: ChangeEmailDialogProps) {
  const [step, setStep] = useState<Step>('enter-details');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // OTP input refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Reset resend timer when step changes
  useEffect(() => {
    if (step === 'verify-otp' && resendTimer === 0) {
      setResendDisabled(true);
      setResendTimer(60);
    }
  }, [step]);

  // Countdown timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (resendTimer === 0 && resendDisabled) {
      setResendDisabled(false);
    }
  }, [resendTimer, resendDisabled]);

  // Auto-focus first OTP input when entering verify step
  useEffect(() => {
    if (step === 'verify-otp' && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  // Auto-submit OTP when all 6 digits are entered
  useEffect(() => {
    if (step === 'verify-otp' && otp.every(digit => digit !== '')) {
      handleVerifyOTP();
    }
  }, [otp, step]);

  // STEP 1: Send OTP to new email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!currentPassword.trim()) {
      setError('Current password is required');
      return;
    }

    if (!newEmail.trim() || !confirmEmail.trim()) {
      setError('Please enter and confirm your new email');
      return;
    }

    if (!isValidEmail(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (newEmail !== confirmEmail) {
      setError('Email addresses do not match');
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setError('New email must be different from current email');
      return;
    }

    setLoading(true);
    
    try {
      const { sendEmailChangeOTP } = await import('@/lib/profile-api');
      
      const result = await sendEmailChangeOTP(currentPassword, newEmail);

      if (result.success) {
        setStep('verify-otp');
        setError('');
      } else {
        setError(result.error || 'Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { verifyEmailChangeOTP, completeEmailChange } = await import('@/lib/profile-api');
      
      // Verify OTP
      const verifyResult = await verifyEmailChangeOTP(newEmail, otpCode);

      if (!verifyResult.success) {
        setError(verifyResult.error || 'Invalid verification code');
        setLoading(false);
        return;
      }

      // Complete email change
      const completeResult = await completeEmailChange(newEmail);

      if (completeResult.success) {
        setStep('complete');
        setTimeout(() => {
          onSuccess(newEmail);
          handleClose();
        }, 2000);
      } else {
        setError(completeResult.error || 'Failed to complete email change');
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Clear error when user starts typing
    if (error) setError('');
  };

  // Handle OTP input keydown (backspace)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle OTP input paste
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Only process if it's 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      otpRefs.current[5]?.focus();
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (resendDisabled) return;

    setError('');
    setLoading(true);

    try {
      const { sendEmailChangeOTP } = await import('@/lib/profile-api');
      
      const result = await sendEmailChangeOTP(currentPassword, newEmail);

      if (result.success) {
        setOtp(['', '', '', '', '', '']);
        setResendDisabled(true);
        setResendTimer(60);
        otpRefs.current[0]?.focus();
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err: any) {
      console.error('Error resending OTP:', err);
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    if (!loading && step !== 'verify-otp') {
      resetForm();
      onOpenChange(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStep('enter-details');
    setCurrentPassword('');
    setNewEmail('');
    setConfirmEmail('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    setResendDisabled(false);
    setResendTimer(0);
  };

  // Back to step 1
  const handleBack = () => {
    setStep('enter-details');
    setOtp(['', '', '', '', '', '']);
    setError('');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Change Email Address
          </DialogTitle>
          <DialogDescription>
            {step === 'enter-details' && "Enter your new email address. We'll send you a verification code."}
            {step === 'verify-otp' && `Enter the 6-digit code sent to ${newEmail}`}
            {step === 'complete' && 'Email address changed successfully!'}
          </DialogDescription>
        </DialogHeader>

        {/* STEP 1: Enter Details */}
        {step === 'enter-details' && (
          <form onSubmit={handleSendOTP}>
            <div className="space-y-4 py-4">
              {/* Current Email (Read-only) */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Current Email
                </label>
                <input
                  type="email"
                  value={currentEmail}
                  disabled
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500"
                />
              </div>

              {/* Current Password */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={loading}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required for security verification
                </p>
              </div>

              {/* New Email */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  New Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={loading}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your.new.email@example.com"
                  autoComplete="off"
                />
              </div>

              {/* Confirm New Email */}
              <div>
                <label className="text-sm font-medium text-foreground">
                  Confirm New Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  disabled={loading}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Confirm your new email"
                  autoComplete="off"
                />
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Info Alert */}
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  We'll send a 6-digit verification code to your new email address.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2: Verify OTP */}
        {step === 'verify-otp' && (
          <div className="space-y-6 py-4">
            {/* OTP Input */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block text-center">
                Enter Verification Code
              </label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={index === 0 ? handleOtpPaste : undefined}
                    disabled={loading}
                    className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50"
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Code sent to {newEmail}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Resend Code */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the code?
              </p>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendDisabled || loading}
                className="text-sm text-primary hover:text-primary/80 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendDisabled
                  ? `Resend code in ${resendTimer}s`
                  : 'Resend code'}
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying code...</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP 3: Complete */}
        {step === 'complete' && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-center mb-2">
                Email Changed Successfully!
              </h3>
              <p className="text-sm text-muted-foreground text-center">
                Your email has been updated to <strong>{newEmail}</strong>
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
