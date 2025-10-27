'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowRight, Loader2 } from 'lucide-react';

function AccountSetupContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // In a real implementation, you would:
    // 1. Verify the session ID with Stripe
    // 2. Get the customer email from the session
    // 3. Confirm account was created by webhook
    
    if (!sessionId) {
      setStatus('error');
      return;
    }

    // For now, simulate loading
    setTimeout(() => {
      setStatus('success');
      // In production, get this from Stripe session
      setEmail('your-email@example.com');
    }, 1500);
  }, [sessionId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Setting up your account...
              </h2>
              <p className="text-gray-600">
                Please wait while we complete your registration
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Setup Error
              </h2>
              <p className="text-gray-600 mb-6">
                There was an issue setting up your account. Please contact support.
              </p>
              <Button 
                onClick={() => router.push('/signup')}
                variant="outline"
              >
                Return to Signup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your account is being created
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success Message */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-6 rounded-xl">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Check Your Email
                </h3>
                <p className="text-gray-700 leading-relaxed mb-3">
                  We've sent a password setup link to <strong>{email}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Click the link in the email to set your password and complete your account setup.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">What happens next:</h3>
            <ol className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-sm font-bold mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-gray-700">
                    <strong>Check your email</strong> for the password setup link
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    The email should arrive within a few minutes
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-sm font-bold mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-gray-700">
                    <strong>Click the link</strong> to set your password
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose a strong, memorable password
                  </p>
                </div>
              </li>
              <li className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 text-sm font-bold mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-gray-700">
                    <strong>Sign in</strong> and start your transformation journey
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Access your personalized dashboard and programs
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Important Note */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> If you don't see the email, check your spam folder. 
              The email is sent from no-reply@firebase.com
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => router.push('/login')}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Go to Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              onClick={() => window.location.href = 'mailto:' + email}
              variant="outline"
              className="flex-1"
            >
              <Mail className="w-4 h-4 mr-2" />
              Open Email
            </Button>
          </div>

          {/* Support Link */}
          <div className="text-center pt-4 border-t">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a href="/contact" className="text-emerald-600 hover:text-emerald-700 font-medium">
                Contact Support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AccountSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <AccountSetupContent />
    </Suspense>
  );
}
