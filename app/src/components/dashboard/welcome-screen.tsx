"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Circle, Dumbbell, TrendingUp, BarChart3, User, Zap } from 'lucide-react';

interface WelcomeScreenProps {
  onContinue: (dontShowAgain?: boolean) => void;
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleContinue = () => {
    onContinue(dontShowAgain);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-5xl w-full space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">
            Welcome to Your Fitness Dashboard
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to crush your fitness goals, all in one place.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-card p-6 space-y-3 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-xl font-semibold">Personalized Workouts</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Access daily workouts tailored to your goals, complete with instructions and video guides.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-xl font-semibold">Track Your Progress</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Log your weights, reps, and sets to monitor strength gains and stay motivated.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6 space-y-3 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary flex-shrink-0" />
              <h3 className="text-xl font-semibold">Visualize Your Journey</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              See your progress over time with intuitive charts for weight, body fat, and more.
            </p>
          </div>
        </div>

        {/* Dashboard Setup Status */}
        <div className="rounded-xl border bg-card p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Dashboard Setup Status</h2>
            <p className="text-muted-foreground">
              Your personalized experience is being customized
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold">Account Setup</p>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-green-100 text-green-700">
                  Complete
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-semibold">Initial Assessment</p>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Pending
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Circle className="w-6 h-6 text-amber-500" />
              <div>
                <p className="font-semibold">Custom Plan Creation</p>
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
                  Pending
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground italic">
            Your coach will reach out soon to begin personalizing your dashboard with workouts,
            nutrition plans, and goals tailored specifically to you.
          </p>
        </div>

        {/* What to Expect */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">What to Expect</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold">Personalized Experience</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Your coach will customize your dashboard with workouts, nutrition plans, and goals
                tailored specifically to your fitness journey and objectives.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-semibold">Real-Time Updates</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                As you progress, your dashboard will evolve with new challenges, updated plans, and
                detailed analytics to keep you motivated and on track.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center space-y-4">
          <Button
            onClick={handleContinue}
            size="lg"
            className="text-lg px-8 py-6 transition-transform hover:-translate-y-1 hover:shadow-xl"
          >
            Continue to My Dashboard
          </Button>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">
              Don&apos;t show this welcome screen again
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
