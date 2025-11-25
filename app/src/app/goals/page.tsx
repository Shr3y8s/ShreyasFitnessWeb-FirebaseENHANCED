"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ClientSidebar } from '@/components/dashboard/client-sidebar';
import { signOutUser } from '@/lib/firebase';
import { Target } from 'lucide-react';
import { GoalList } from '@/components/goals/goal-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalSummary } from '@/components/goals/goal-summary';
import { Achievements } from '@/components/goals/achievements';
import { PrimaryObjectives } from '@/components/dashboard/primary-objectives';
import { CompletedGoalList } from '@/components/goals/completed-goal-list';
import { YourVision } from '@/components/plan/your-vision';

// Mock data for goals matching the sample structure
const initialGoals = [
  {
    id: 'goal-1',
    title: 'Walk 10,000 Steps Daily',
    category: 'Activity Habit',
    targetValue: 7,
    currentValue: 5,
    unit: 'days in a row',
    deadline: '2024-10-15',
    priority: 'High' as const,
    term: 'short-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Hit 10k steps for 3 consecutive days', completed: true },
      { text: 'Hit 10k steps for 5 consecutive days', completed: true },
      { text: 'Complete a 7-day streak', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-2',
    title: 'Follow Meal Plan/Macros',
    category: 'Nutrition Habit',
    targetValue: 7,
    currentValue: 2,
    unit: 'days this week',
    deadline: '2024-10-31',
    priority: 'High' as const,
    term: 'short-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Follow the meal plan for 1 day', completed: true },
      { text: 'Meal prep lunches for the week', completed: true },
      { text: 'Follow the meal plan for 7 consecutive days', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-6',
    title: 'Drink a Half Gallon of Water Daily',
    category: 'Hydration Habit',
    targetValue: 7,
    currentValue: 3,
    unit: 'days in a row',
    deadline: '2024-10-20',
    priority: 'Medium' as const,
    term: 'short-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Drink 64oz for 1 day', completed: true },
      { text: 'Drink 64oz for 3 consecutive days', completed: true },
      { text: 'Complete a 7-day streak', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-3',
    title: 'Complete 3 Workouts Per Week',
    category: 'Workout Consistency',
    targetValue: 4,
    currentValue: 2,
    unit: 'consecutive weeks',
    deadline: '2024-10-28',
    priority: 'Medium' as const,
    term: 'short-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Complete all scheduled workouts for 1 week', completed: true },
      { text: 'Complete all scheduled workouts for 2 consecutive weeks', completed: true },
      { text: 'Achieve a 4-week workout streak', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-4',
    title: 'Lose First 5 Pounds',
    category: 'Weight Loss',
    targetValue: 210,
    currentValue: 212,
    unit: 'lbs',
    deadline: '2024-12-01',
    priority: 'Medium' as const,
    lowerIsBetter: true,
    term: 'short-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Lose the first 2 pounds', completed: true },
      { text: 'Establish a consistent weigh-in routine', completed: true },
      { text: 'Reach the 5-pound loss milestone', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-5',
    title: 'Reach Target Weight of 180 lbs',
    category: 'Weight Loss',
    targetValue: 180,
    currentValue: 212,
    unit: 'lbs',
    deadline: '2025-06-01',
    priority: 'High' as const,
    lowerIsBetter: true,
    term: 'long-term' as const,
    status: 'in-progress',
    milestones: [
      { text: 'Lose the first 10 pounds', completed: false },
      { text: 'Break through the 200 lb barrier', completed: false },
      { text: 'Establish long-term maintenance habits', completed: false },
    ],
    isCompleted: false,
  },
  {
    id: 'goal-7',
    title: 'Complete Onboarding Fitness Assessment',
    category: 'Setup',
    targetValue: 1,
    currentValue: 1,
    unit: 'task',
    deadline: '2024-09-30',
    priority: 'High' as const,
    term: 'short-term' as const,
    status: 'completed',
    milestones: [
      { text: 'Schedule and complete the assessment call', completed: true },
    ],
    isCompleted: true,
  },
];

const priorityOrder: { [key: string]: number } = { 'High': 1, 'Medium': 2, 'Low': 3 };

export default function GoalsPage() {
  const router = useRouter();
  const { userData, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [goals] = useState(initialGoals);

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

    if (!userData.accountActivated) {
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

  const handleAddGoal = () => {
    // TODO: Implement add goal dialog/modal
    console.log('Add new goal clicked');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  const sortedGoals = [...goals].sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const shortTermGoals = sortedGoals.filter(g => g.term === 'short-term' && g.status !== 'completed');
  const longTermGoals = sortedGoals.filter(g => g.term === 'long-term' && g.status !== 'completed');
  const completedGoals = goals.filter(g => g.status === 'completed');

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
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2">
                <Target className="h-8 w-8 text-primary" />
                Goals Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Track your objectives and celebrate your achievements.
              </p>
            </div>
            
            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left side - 2/3 width */}
              <div className="lg:col-span-2 space-y-6">
                <GoalSummary goals={goals} onAddGoal={handleAddGoal} />
                <Tabs defaultValue="short-term">
                  <TabsList className="mb-4 inline-flex items-center justify-center rounded-full bg-secondary p-1">
                    <TabsTrigger value="short-term">Short-Term</TabsTrigger>
                    <TabsTrigger value="long-term">Long-Term</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                  </TabsList>
                  <TabsContent value="short-term">
                    <GoalList goals={shortTermGoals} title="Short-Term Focus" />
                  </TabsContent>
                  <TabsContent value="long-term">
                    <GoalList goals={longTermGoals} title="Long-Term Vision" />
                  </TabsContent>
                  <TabsContent value="completed">
                    <CompletedGoalList goals={completedGoals} />
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Right side - 1/3 width */}
              <div className="lg:col-span-1 space-y-6">
                <YourVision />
                <PrimaryObjectives />
                <Achievements />
              </div>
            </div>

          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
