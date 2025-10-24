'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Dumbbell, Target, TrendingUp, Sparkles, RefreshCcw, CircleCheckBig, Clock } from 'lucide-react';

export default function DashboardWelcomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [hideWelcome, setHideWelcome] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserPreference = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          // Check user role and redirect appropriately
          if (userData?.role === 'trainer' || userData?.role === 'admin') {
            router.push('/dashboard/trainer');
            return;
          }
          
          if (userData?.hideWelcomeDashboard) {
            // If user has chosen to hide welcome screen, redirect to client dashboard
            router.push('/dashboard/client');
            return;
          }
        } catch (error) {
          console.error('Error checking user preferences:', error);
        }
      }
      setLoading(false);
    };

    checkUserPreference();
  }, [user, router]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleContinueToDashboard = async () => {
    if (hideWelcome && user) {
      try {
        await setDoc(doc(db, 'users', user.uid), 
          { hideWelcomeDashboard: true }, 
          { merge: true }
        );
      } catch (error) {
        console.error('Error saving user preference:', error);
      }
    }
    router.push('/dashboard/client');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Header with logout */}
      <div className="absolute top-6 right-6">
        <Button variant="ghost" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="max-w-5xl w-full mx-auto space-y-8">
        {/* Hero Section */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to Your Fitness Dashboard
          </h1>
          <p className="mt-4 text-xl text-muted-foreground">
            Everything you need to crush your fitness goals, all in one place.
          </p>
        </div>

        {/* Feature Preview */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="text-primary mt-1">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Personalized Workouts</h3>
              <p className="text-sm text-muted-foreground">
                Access daily workouts tailored to your goals, complete with instructions and video guides.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="text-primary mt-1">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Track Your Progress</h3>
              <p className="text-sm text-muted-foreground">
                Log your weights, reps, and sets to monitor strength gains and stay motivated.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-secondary/50 rounded-lg">
            <div className="text-primary mt-1">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Visualize Your Journey</h3>
              <p className="text-sm text-muted-foreground">
                See your progress over time with intuitive charts for weight, body fat, and more.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Setup Status */}
        <div className="rounded-xl border text-card-foreground w-full bg-card/50 backdrop-blur-sm shadow-lg">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="font-semibold tracking-tight text-2xl">Dashboard Setup Status</h3>
            <p className="text-sm text-muted-foreground">Your personalized experience is being customized</p>
          </div>
          <div className="p-6 pt-0">
            <div className="divide-y divide-border">
              <div className="flex justify-between items-center py-3">
                <p className="text-base font-medium">Account Setup</p>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-primary/80 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  <CircleCheckBig className="mr-1 h-3 w-3" />
                  Complete
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <p className="text-base font-medium">Initial Assessment</p>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                  <Clock className="mr-1 h-3 w-3" />
                  Pending
                </div>
              </div>
              <div className="flex justify-between items-center py-3">
                <p className="text-base font-medium">Custom Plan Creation</p>
                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent hover:bg-secondary/80 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                  <Clock className="mr-1 h-3 w-3" />
                  Pending
                </div>
              </div>
            </div>
            <p className="text-muted-foreground mt-6 text-center text-sm">
              Your coach will reach out soon to begin personalizing your dashboard with workouts, nutrition plans, and goals tailored specifically to you.
            </p>
          </div>
        </div>

        {/* What to Expect */}
        <div className="rounded-xl border text-card-foreground w-full bg-card/50 backdrop-blur-sm shadow-lg">
          <div className="flex flex-col space-y-1.5 p-6">
            <h3 className="text-xl font-semibold leading-none tracking-tight">What to Expect</h3>
          </div>
          <div className="p-6 pt-0 grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="text-primary mt-1">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Personalized Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Your coach will customize your dashboard with workouts, nutrition plans, and goals tailored specifically to your fitness journey and objectives.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-primary mt-1">
                <RefreshCcw className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Real-Time Updates</h3>
                <p className="text-sm text-muted-foreground">
                  As you progress, your dashboard will evolve with new challenges, updated plans, and detailed analytics to keep you motivated and on track.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleContinueToDashboard}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8"
          >
            Continue to My Dashboard
          </Button>
          
          <div className="flex items-center justify-center space-x-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={hideWelcome}
              onClick={() => setHideWelcome(!hideWelcome)}
              className={`peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                hideWelcome ? 'bg-primary text-primary-foreground' : ''
              }`}
              id="show-welcome"
            />
            <label htmlFor="show-welcome" className="text-sm font-medium leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Don&apos;t show this welcome screen again
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
