'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail, checkResetEligibility, getFirebaseErrorMessage } from '@/lib/firebase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Mail, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { AuthHeader } from '@/components/AuthHeader';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  // When the email belongs to a real Google-only account, we don't send a reset
  // email (there's no password to reset). Instead we surface a "Continue with
  // Google" nudge so the user isn't stuck waiting for an email that never comes.
  const [googleOnly, setGoogleOnly] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setGoogleOnly(false);

    try {
      // Gate on server-side eligibility first. Email Enumeration Protection means
      // the client can't inspect provider state, so a Cloud Function (Admin SDK)
      // decides. This also reaps Type-1 orphans (Google-provider Auth users with
      // no profile doc) so those correctly fall through to "not_found".
      const status = await checkResetEligibility(email);

      if (status === 'google_only') {
        // Real Google-only account: no password credential exists to reset.
        setGoogleOnly(true);
        return;
      }

      // For both "ok" and "not_found" we send (or attempt to send) the reset
      // email and show the neutral success screen. This preserves enumeration
      // protection — a stranger probing emails can't tell which accounts exist.
      const result = await sendPasswordResetEmail(email);

      if (result.success) {
        setEmailSent(true);
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <AuthHeader />
      <div className="container mx-auto flex-1 px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Enter your email address and we&apos;ll send you instructions to reset your password
          </p>
        </div>

        <div className="max-w-md mx-auto">
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-6">
              <Link 
                href="/login"
                className="inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-4 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Sign In
              </Link>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {googleOnly ? (
                <div className="space-y-6 py-4">
                  {/* Google-only account: no password to reset */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                      <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Use Google to Sign In
                    </h3>
                    <p className="text-gray-600 mb-1">
                      This account was created with Google, so there&apos;s no password to reset.
                    </p>
                    <p className="text-emerald-600 font-medium mb-4">
                      {email}
                    </p>
                    <p className="text-sm text-gray-600">
                      Head back to the sign-in page and choose <strong>Continue with Google</strong>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Return to Sign In
                    </Button>

                    <button
                      onClick={() => {
                        setGoogleOnly(false);
                        setEmail('');
                        setError('');
                      }}
                      className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Try a different email
                    </button>
                  </div>
                </div>
              ) : !emailSent ? (
                <form onSubmit={handleSubmit} className="space-y-4">

                  {error && (
                    <div className="flex items-center space-x-2 text-sm text-red-700 bg-red-50 border border-red-200 p-4 rounded-lg">
                      <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      We&apos;ll send a password reset link to this email address
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> If you don&apos;t see the email, check your spam folder. 
                      The reset link will expire in 1 hour.
                    </p>
                  </div>
                </form>
              ) : (
                <div className="space-y-6 py-4">
                  {/* Success State */}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Check Your Email
                    </h3>
                    <p className="text-gray-600 mb-1">
                      If an account exists for this email, we&apos;ve sent a password reset link to:
                    </p>
                    <p className="text-emerald-600 font-medium mb-4">
                      {email}
                    </p>
                    <p className="text-sm text-gray-600">
                      Click the link in the email to reset your password. The link will expire in 1 hour.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => router.push('/login')}
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                    >
                      Return to Sign In
                    </Button>

                    <button
                      onClick={() => {
                        setEmailSent(false);
                        setEmail('');
                        setError('');
                      }}
                      className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Try a different email
                    </button>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Didn&apos;t receive the email?</strong> Check your spam folder or try again with a different email address.
                    </p>
                  </div>
                </div>
              )}

              {/* Help Links */}
              <div className="border-t pt-4 space-y-2 text-center text-sm text-gray-600">
                <p>Need help? <a href="mailto:support@shreyfit.com" className="text-emerald-600 hover:text-emerald-700 font-medium">Contact Support</a></p>
                <p>
                  Remember your password?{' '}
                  <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    Sign In
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
