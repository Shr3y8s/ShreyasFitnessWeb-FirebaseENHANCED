'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyPasswordResetCode, confirmPasswordReset, getFirebaseErrorMessage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Lock, Eye, EyeOff, KeyRound, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { AuthHeader } from '@/components/AuthHeader';
import PasswordChecklist from 'react-password-checklist';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [codeValid, setCodeValid] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  // Verify the reset code on mount
  useEffect(() => {
    const verifyCode = async () => {
      if (!oobCode || mode !== 'resetPassword') {
        setError('Invalid or missing password reset link. Please request a new one.');
        setCodeValid(false);
        setIsVerifying(false);
        return;
      }

      try {
        const result = await verifyPasswordResetCode(oobCode);
        
        if (result.success && result.email) {
          setEmail(result.email);
          setCodeValid(true);
        } else {
          setError('This password reset link is invalid or has expired. Please request a new one.');
          setCodeValid(false);
        }
      } catch (err) {
        setError('This password reset link is invalid or has expired. Please request a new one.');
        setCodeValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyCode();
  }, [oobCode, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!passwordValid) {
      setError('Please ensure your password meets all requirements');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const result = await confirmPasswordReset(oobCode!, newPassword);
      
      if (result.success) {
        setResetComplete(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(getFirebaseErrorMessage(result.error));
      }
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuthHeader />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set New Password</h1>
          {email && codeValid && !resetComplete && (
            <p className="text-gray-600 max-w-md mx-auto">
              Creating new password for <span className="font-medium text-emerald-600">{email}</span>
            </p>
          )}
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="pt-6 space-y-6">
              {isVerifying ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-4" />
                  <p className="text-gray-600">Verifying reset link...</p>
                </div>
              ) : !codeValid ? (
                <div className="space-y-6 py-4">
                  {/* Invalid/Expired Code */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Link Expired or Invalid
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {error || 'This password reset link is no longer valid.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push('/forgot-password')}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Request New Reset Link
                    </Button>

                    <Link 
                      href="/login"
                      className="block w-full text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Return to Sign In
                    </Link>
                  </div>
                </div>
              ) : resetComplete ? (
                <div className="space-y-6 py-4">
                  {/* Success State */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Password Reset Successful!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your password has been changed successfully.
                    </p>
                    <p className="text-sm text-gray-600">
                      Redirecting to sign in page...
                    </p>
                  </div>

                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  >
                    Sign In Now
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                      New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Must meet all security requirements
                    </p>

                    {/* Password Requirements Checklist */}
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <PasswordChecklist
                        rules={["minLength", "specialChar", "number", "capital", "lowercase"]}
                        minLength={8}
                        value={newPassword}
                        valueAgain={confirmPassword}
                        onChange={(isValid) => setPasswordValid(isValid)}
                        messages={{
                          minLength: "At least 8 characters",
                          specialChar: "Has a special character (!@#$%^&*)",
                          number: "Has a number",
                          capital: "Has an uppercase letter",
                          lowercase: "Has a lowercase letter"
                        }}
                        iconSize={14}
                        style={{
                          fontSize: '13px'
                        }}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200"
                    disabled={isLoading || !newPassword || !confirmPassword || !passwordValid}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Resetting Password...
                      </div>
                    ) : (
                      'Reset Password'
                    )}
                  </Button>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <strong>Tip:</strong> Choose a strong password with a mix of letters, numbers, and symbols for better security.
                    </p>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
