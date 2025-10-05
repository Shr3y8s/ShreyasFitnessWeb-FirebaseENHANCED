'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { signOutUser } from '@/lib/firebase';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

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
  
  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">SHREY.FIT Dashboard</h1>
            <p className="text-stone-600">
              Welcome to your fitness journey{user?.displayName ? `, ${user.displayName}` : ''}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Workout Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Workout Progress</CardTitle>
              <CardDescription>Track your fitness journey</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">
                Your personalized workout plan and progress tracking will appear here.
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-stone-500">Last updated: Today</p>
            </CardFooter>
          </Card>
          
          {/* Nutrition Card */}
          <Card>
            <CardHeader>
              <CardTitle>Nutrition</CardTitle>
              <CardDescription>Meal plans and tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">
                Your nutrition guidance and meal plans will appear here.
              </p>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-stone-500">Last updated: Today</p>
            </CardFooter>
          </Card>
          
          {/* Upcoming Sessions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Sessions</CardTitle>
              <CardDescription>Your training schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-stone-600">
                No upcoming sessions scheduled. Use the button below to book your next session.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Book Session</Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="bg-stone-100 p-6 rounded-lg">
          <h2 className="text-xl font-medium mb-4">Getting Started</h2>
          <p className="mb-4">
            Welcome to your SHREY.FIT dashboard! This is where you&apos;ll track your progress, 
            access your personalized workout plans, and stay connected with your trainer.
          </p>
          <p>
            We&apos;re currently building out your personalized experience. 
            Check back soon for updates to your dashboard!
          </p>
        </div>
      </div>
    </div>
  );
}
