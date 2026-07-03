'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { sendOTP } from '@/lib/email-verification-api';

interface EmailStepProps {
  email: string;
  onEmailUpdate: (email: string) => void;
  onCodeSent: () => void;
}

export default function EmailStep({ email, onEmailUpdate, onCodeSent }: EmailStepProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [localEmail, setLocalEmail] = useState(email);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate email
    if (!localEmail) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(localEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSending(true);

    // Send OTP
    const result = await sendOTP(localEmail);

    if (result.success) {
      // Update parent with email and proceed
      onEmailUpdate(localEmail);
      onCodeSent();
    } else {
      setError(result.error || 'Failed to send verification code. Please try again.');
    }

    setIsSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full mb-2">
          <Mail className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Let's Get Started</h2>
        <p className="text-gray-600">
          Enter your email to begin your transformation journey
        </p>
      </div>

      {/* Email Input */}
      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="your.email@example.com"
          value={localEmail}
          onChange={(e) => {
            setLocalEmail(e.target.value);
            setError('');
          }}
          disabled={isSending}
          className="h-12"
          autoFocus
          required
        />
        <p className="text-xs text-gray-500">
          We'll send a verification code to this email
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!localEmail || isSending}
        className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg"
      >
        {isSending ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Sending Code...
          </>
        ) : (
          <>
            Send Verification Code
            <ArrowRight className="w-5 h-5 ml-2" />
          </>
        )}
      </Button>

      {/* Help Text */}
      <div className="text-center space-y-2 pt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}
