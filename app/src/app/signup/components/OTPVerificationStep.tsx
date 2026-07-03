'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { sendOTP, verifyOTP } from '@/lib/email-verification-api';

interface OTPVerificationStepProps {
  email: string;
  onVerified: () => void;
  prevStep: () => void;
}

export default function OTPVerificationStep({ email, onVerified, prevStep }: OTPVerificationStepProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newOtp.every(digit => digit !== '')) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((digit, index) => {
      if (index < 6) newOtp[index] = digit;
    });
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length - 1, 5);
    inputRefs[lastIndex].current?.focus();

    // Auto-verify if 6 digits pasted
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (code?: string) => {
    const otpCode = code || otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    const result = await verifyOTP(email, otpCode);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        onVerified();
      }, 1500);
    } else {
      setError(result.error || 'Invalid code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs[0].current?.focus();
    }

    setIsVerifying(false);
  };

  const handleResend = async () => {
    setIsResending(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    
    const result = await sendOTP(email);
    
    if (result.success) {
      setResendCooldown(60); // 60 second cooldown
      inputRefs[0].current?.focus();
    } else {
      setError(result.error || 'Failed to resend code');
    }
    
    setIsResending(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mb-2">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
        <p className="text-gray-600">
          We sent a 6-digit code to<br />
          <span className="font-semibold text-gray-900">{email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div>
        <Label className="text-center block mb-3">Enter Verification Code</Label>
        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isVerifying || success}
              className={`
                w-12 h-14 text-center text-2xl font-bold
                ${success ? 'border-green-500 bg-green-50' : ''}
                ${error ? 'border-red-500' : ''}
              `}
            />
          ))}
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Email verified successfully! Proceeding...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Resend Code */}
      <div className="text-center space-y-3">
        <p className="text-sm text-gray-600">
          Didn't receive the code?
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleResend}
          disabled={isResending || resendCooldown > 0 || success}
          className="w-full"
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend in {resendCooldown}s
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Resend Code
            </>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={isVerifying || success}
          className="flex-1"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Change Email
        </Button>
        <Button
          onClick={() => handleVerify()}
          disabled={otp.some(digit => !digit) || isVerifying || success}
          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : success ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verified
            </>
          ) : (
            'Verify Code'
          )}
        </Button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-center text-gray-500">
        Code expires in 10 minutes
      </p>
    </div>
  );
}
