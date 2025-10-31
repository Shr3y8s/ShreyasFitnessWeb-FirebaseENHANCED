'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInUser, signInWithGoogleAuth, getFirebaseErrorMessage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle, Mail, Lock, Eye, EyeOff, Shield, Clock, Users, Award, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { AuthHeader } from '@/components/AuthHeader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signInUser(email, password);
      
      if (result.success) {
        router.push('/dashboard');
      } else {
        setError(getFirebaseErrorMessage(result.error));
      }
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogleAuth();
      router.push('/dashboard');
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
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back to SHREY.FIT</h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Access your personalized fitness dashboard and continue your transformation journey
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Login Form */}
            <div className="order-2 lg:order-1">
              <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mx-auto mb-4">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
                  <p className="text-gray-600">Enter your credentials to access your account</p>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
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
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 pr-10 h-12 border-gray-200 focus:border-emerald-500 focus:ring-emerald-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-medium transition-all duration-200"
                      disabled={isLoading || !email || !password}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Signing in...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          Sign In
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </div>
                      )}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-3 text-gray-500 font-medium">Or continue with</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full h-12 border-gray-200 hover:bg-gray-50"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="text-center space-y-2 pt-4">
                    <div className="text-sm">
                      <Link href="#" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                        Forgot your password?
                      </Link>
                    </div>
                    <div className="text-sm text-gray-600">
                      Don&apos;t have an account?{' '}
                      <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors">
                        Sign up here
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features Panel */}
            <div className="order-1 lg:order-2 space-y-8">
              <div className="text-center lg:text-left">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Your Fitness Journey Awaits
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Get back to your personalized dashboard where real transformation happens through sustainable habits.
                </p>
              </div>

              <div className="grid gap-6">
                {[
                  {
                    icon: Users,
                    title: 'Personal Training',
                    description: 'One-on-one coaching sessions tailored to your specific goals and fitness level.'
                  },
                  {
                    icon: Clock,
                    title: 'Flexible Scheduling',
                    description: 'Book sessions that fit your busy lifestyle with easy rescheduling options.'
                  },
                  {
                    icon: Award,
                    title: 'Track Progress',
                    description: 'Monitor your transformation with detailed analytics and milestone celebrations.'
                  }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg flex items-center justify-center">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{feature.title}</h4>
                      <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
