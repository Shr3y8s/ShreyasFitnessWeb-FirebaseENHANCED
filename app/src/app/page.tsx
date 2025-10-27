'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // If user is logged in, redirect to dashboard
  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      } else {
        setIsChecking(false);
      }
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-stone-900">SHREY.FIT</h1>
          <h2 className="text-2xl mt-2 font-semibold text-stone-700">Next.js Portal</h2>
          <p className="mt-4 text-stone-600">
            Welcome to the SHREY.FIT member portal. Please login or sign up to access your dashboard.
          </p>
        </div>

        <div className="flex flex-col space-y-4 mt-8">
          <Button
            onClick={() => router.push('/login')}
            className="w-full"
            size="lg"
          >
            Login
          </Button>
          
          <Button
            onClick={() => router.push('/signup')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Create Account
          </Button>
          
          <Button
            onClick={() => window.location.href = '/'}
            variant="link"
            className="w-full mt-8"
          >
            Return to Main Website
          </Button>
        </div>
      </div>
    </div>
  );
}
