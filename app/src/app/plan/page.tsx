"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ClipboardList, Dumbbell, Apple, Heart, MessageSquare, Calendar, ChevronDown, Footprints } from 'lucide-react';

export default function MyPlanPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (authLoading) return;

    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.role !== 'client') {
      router.push('/dashboard');
      return;
    }

    if (userData.paymentStatus !== 'active') {
      router.push('/payment');
      return;
    }

    setLoading(false);
  }, [userData, authLoading, router]);

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ClientSidebar
        userName={userData?.name}
        userTier={userData?.tier}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <ClipboardList className="h-8 w-8 text-primary" />
                My Plan
              </h1>
              <p className="text-muted-foreground mt-1">
                Your personalized training, nutrition, and cardio protocols
              </p>
            </div>

            {/* Quick Stats & Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
              {/* Status Badge */}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="font-semibold text-green-700">Active</span>
                </div>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">Updated 7 days ago</span>
              </div>

              {/* Quick Stats */}
              <div className="flex items-center gap-3 text-sm font-medium">
                <span>2,400 cal</span>
                <span className="text-muted-foreground">|</span>
                <span>180g protein</span>
                <span className="text-muted-foreground">|</span>
                <span>4x workouts</span>
                <span className="text-muted-foreground">|</span>
                <span>3x cardio</span>
              </div>
            </div>

            {/* This Week's Focus - Featured at Top */}
            <Card className="transition-all duration-300 hover:shadow-lg border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  This Week&apos;s Focus
                </CardTitle>
                <CardDescription>Week of Oct 21-27, 2025</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Adjustments Made:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                      <span className="text-sm">Increased calories by 100 (2300 → 2400)</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                      <span className="text-sm">Added third cardio session on Wednesday</span>
                    </li>
                    <li className="flex items-start gap-2 p-2 bg-green-500/5 rounded">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                      <span className="text-sm">Reduced deadlift volume (fatigue management)</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Your Focus This Week:</h4>
                  <ol className="space-y-1 ml-4 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">1.</span>
                      <span>Hit all 4 training sessions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">2.</span>
                      <span>Prioritize sleep (7-8 hours nightly)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-semibold text-primary">3.</span>
                      <span>Check in mid-week if energy levels drop</span>
                    </li>
                  </ol>
                </div>

                <div className="p-4 bg-secondary/30 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">NOTES FROM LAST CALL:</p>
                  <p className="text-sm italic">
                    &quot;Weight down 2.5lbs this week, feeling good overall. Energy slightly low on leg days - added 100 calories and will watch for improvements. Keep pushing on upper body lifts, form is looking solid!&quot;
                  </p>
                  <p className="text-xs text-muted-foreground mt-3 text-right">- Coach Shreyas</p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Next Check-in: Oct 28, 2025
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Training Protocol Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Training Protocol
                </CardTitle>
                <CardDescription>Your current workout program and guidelines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Current Split: Upper/Lower 4x/week</h3>
                  <ul className="space-y-1 ml-4">
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span><strong>Monday:</strong> Upper Body</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span><strong>Tuesday:</strong> Lower Body</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span><strong>Thursday:</strong> Upper Body</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                      <span><strong>Saturday:</strong> Lower Body</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Focus Areas:</h4>
                  <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                      <span>Progressive overload on main lifts</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                      <span>8-12 rep range for hypertrophy</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                      <span>Control the eccentric (3 second tempo)</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Last Updated: Oct 21, 2025 by Coach Shreyas
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Nutrition Protocol Card with Tabs */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-primary" />
                  Nutrition Protocol
                </CardTitle>
                <CardDescription>Choose your nutrition approach</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="macros" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="macros">Macro Tracking</TabsTrigger>
                    <TabsTrigger value="mealplan">Meal Plan</TabsTrigger>
                    <TabsTrigger value="simple">Simple Guidelines</TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Macro Tracking */}
                  <TabsContent value="macros" className="space-y-4 mt-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-3">Daily Targets:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-muted-foreground">Calories</p>
                          <p className="text-2xl font-bold text-primary">2,400</p>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-muted-foreground">Protein</p>
                          <p className="text-2xl font-bold text-primary">180g</p>
                          <p className="text-xs text-muted-foreground">30%</p>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-muted-foreground">Carbs</p>
                          <p className="text-2xl font-bold text-primary">240g</p>
                          <p className="text-xs text-muted-foreground">40%</p>
                        </div>
                        <div className="p-3 bg-primary/5 rounded-lg">
                          <p className="text-xs text-muted-foreground">Fats</p>
                          <p className="text-2xl font-bold text-primary">80g</p>
                          <p className="text-xs text-muted-foreground">30%</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Meal Timing:</h4>
                      <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Pre-workout: 30-60g carbs</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Post-workout: 30g protein within 2 hours</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Spread across 4-5 meals throughout the day</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Guidelines:</h4>
                      <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Prioritize whole, minimally processed foods</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Track consistently on weekdays, flexible on weekends</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Aim for 80% adherence to targets</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last Updated: Oct 21, 2025 by Coach Shreyas
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab 2: Meal Plan */}
                  <TabsContent value="mealplan" className="space-y-4 mt-4">
                    {/* Weekly Daily Average Summary */}
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm font-semibold text-center">
                        Weekly Daily Avg: 2,400 cal | 180g protein | 240g carbs | 80g fats
                      </p>
                    </div>

                    {/* Week-long Meal Plan Accordion */}
                    <div className="space-y-2">
                      {/* Monday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Monday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                            <p><strong>Meal 4:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Tuesday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Tuesday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                            <p><strong>Meal 4:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Wednesday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Wednesday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Thursday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Thursday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                            <p><strong>Meal 4:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Friday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Friday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                            <p><strong>Meal 4:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Saturday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Saturday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p className="text-primary font-medium"><strong>Post Training:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Sunday */}
                      <Collapsible className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
                          <span className="font-semibold">Sunday</span>
                          <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-4 pb-4 space-y-2">
                          <div className="text-sm space-y-1 text-muted-foreground">
                            <p><strong>Meal 1:</strong></p>
                            <p><strong>Meal 2:</strong></p>
                            <p><strong>Meal 3:</strong></p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last Updated: Oct 21, 2025 by Coach Shreyas
                      </p>
                    </div>
                  </TabsContent>

                  {/* Tab 3: Simple Guidelines */}
                  <TabsContent value="simple" className="space-y-4 mt-4">
                    <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <h3 className="font-semibold text-lg mb-3">Beginner Approach</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Focus on building healthy habits without strict tracking
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-3">Daily Habits:</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xl">✓</span>
                          <div>
                            <p className="font-medium">Eat 3 whole food meals per day</p>
                            <p className="text-sm text-muted-foreground">Breakfast, lunch, and dinner</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xl">✓</span>
                          <div>
                            <p className="font-medium">30g protein minimum per meal</p>
                            <p className="text-sm text-muted-foreground">About a palm-sized portion of meat/fish</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xl">✓</span>
                          <div>
                            <p className="font-medium">Fill half your plate with vegetables</p>
                            <p className="text-sm text-muted-foreground">At lunch and dinner</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <span className="text-xl">✓</span>
                          <div>
                            <p className="font-medium">Drink 8 glasses of water daily</p>
                            <p className="text-sm text-muted-foreground">Stay hydrated throughout the day</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">What Counts as &quot;Whole Foods&quot;?</h4>
                      <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Lean meats, fish, eggs</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Vegetables and fruits</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Rice, potatoes, oats</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Nuts, seeds, olive oil</span>
                        </li>
                      </ul>
                    </div>

                    <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                      <p className="text-sm font-medium text-center">
                        Focus on <strong>CONSISTENCY</strong> over perfection!
                      </p>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Last Updated: Oct 21, 2025 by Coach Shreyas
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Cardio Protocol Card */}
            <Card className="transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Cardio Protocol
                </CardTitle>
                <CardDescription>Your cardiovascular training prescription</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Active Prescription: Daily Steps */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="font-semibold text-green-700 text-sm uppercase tracking-wide">Active Prescription</span>
                  </div>
                  
                  <div className="p-4 bg-green-500/5 border-2 border-green-500/20 rounded-lg">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Footprints className="h-5 w-5" />
                      Daily Step Goal
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="text-2xl font-bold text-primary">10,000</p>
                        <p className="text-xs text-muted-foreground">steps/day</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <p className="text-xl font-semibold">7 days/week</p>
                      </div>
                      <div className="p-3 bg-background rounded-lg">
                        <p className="text-xs text-muted-foreground">Tracking</p>
                        <p className="text-sm font-semibold">Phone/Smartwatch</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm">Tips:</h4>
                      <ul className="space-y-1 ml-4 text-sm">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                          <span>Break it up throughout the day</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                          <span>Walking meetings, stairs, parking farther away</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                          <span>Post-meal walks are great for digestion</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Inactive Alternative: LISS Cardio */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
                    <span className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">Alternative (Not Currently Active)</span>
                  </div>
                  
                  <div className="p-4 bg-muted/20 border border-muted-foreground/20 rounded-lg opacity-60">
                    <h3 className="font-semibold text-lg mb-3 text-muted-foreground">LISS Cardio</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-semibold text-muted-foreground">Low Intensity Steady State</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Frequency</p>
                        <p className="font-semibold text-muted-foreground">3x per week</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="font-semibold text-muted-foreground">20-30 minutes</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">Target HR</p>
                        <p className="font-semibold text-muted-foreground">120-130 BPM</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Timing:</h4>
                      <ul className="space-y-1 ml-4 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Post-workout or separate session</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span>Morning preferred (fasted optional)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Last Updated: Oct 21, 2025 by Coach Shreyas
                  </p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
