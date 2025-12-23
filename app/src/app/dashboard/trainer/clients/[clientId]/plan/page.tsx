'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VisionEditor } from '@/components/trainer/plan/VisionEditor';
import { StepGoalEditor } from '@/components/trainer/plan/StepGoalEditor';
import { LissCardioEditor } from '@/components/trainer/plan/LissCardioEditor';
import { WeeklyFocusEditor } from '@/components/trainer/plan/WeeklyFocusEditor';
import { DailyHabitsEditor } from '@/components/trainer/plan/DailyHabitsEditor';
import { TrainingProtocolEditor } from '@/components/trainer/plan/TrainingProtocolEditor';
import { NutritionProtocolEditor } from '@/components/trainer/plan/NutritionProtocolEditor';
import { getClientPlan, updateVision, updateStepGoal, updateLissCardio, updateWeeklyFocus, updateDailyHabits } from '@/lib/plan-api';
import { ClientPlan, VisionData, StepGoalData, LissCardioData, WeeklyFocusData, DailyHabitsData } from '@/types/plan';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ClientPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();
  
  const clientId = params.clientId as string;
  
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState('');
  const [plan, setPlan] = useState<ClientPlan | null>(null);
  const [savingVision, setSavingVision] = useState(false);
  const [savingStepGoal, setSavingStepGoal] = useState(false);
  const [savingLissCardio, setSavingLissCardio] = useState(false);
  const [savingWeeklyFocus, setSavingWeeklyFocus] = useState(false);
  const [savingDailyHabits, setSavingDailyHabits] = useState(false);

  // Load client and plan data
  useEffect(() => {
    const loadData = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      try {
        // Fetch client data
        const clientDoc = await getDoc(doc(db, 'users', clientId));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          setClientName(clientData.name || 'Client');
        }

        // Fetch plan data
        const planData = await getClientPlan(clientId);
        setPlan(planData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clientId, user, authLoading, canAccessTrainerDashboard, router]);

  const handleSaveVision = async (visionData: VisionData) => {
    if (!user) return;
    
    setSavingVision(true);
    try {
      const result = await updateVision(clientId, user.uid, visionData);
      if (result.success) {
        // Reload plan data
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('Vision saved successfully!');
      } else {
        alert('Failed to save vision. Please try again.');
      }
    } catch (error) {
      console.error('Error saving vision:', error);
      alert('An error occurred while saving.');
    } finally {
      setSavingVision(false);
    }
  };

  const handleSaveStepGoal = async (stepGoalData: StepGoalData) => {
    if (!user) return;
    
    setSavingStepGoal(true);
    try {
      const result = await updateStepGoal(clientId, user.uid, stepGoalData);
      if (result.success) {
        // Reload plan data
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('Step goal saved successfully!');
      } else {
        alert('Failed to save step goal. Please try again.');
      }
    } catch (error) {
      console.error('Error saving step goal:', error);
      alert('An error occurred while saving.');
    } finally {
      setSavingStepGoal(false);
    }
  };

  const handleSaveLissCardio = async (lissCardioData: LissCardioData) => {
    if (!user) return;
    
    setSavingLissCardio(true);
    try {
      const result = await updateLissCardio(clientId, user.uid, lissCardioData);
      if (result.success) {
        // Reload plan data
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('LISS Cardio saved successfully!');
      } else {
        alert('Failed to save LISS cardio. Please try again.');
      }
    } catch (error) {
      console.error('Error saving LISS cardio:', error);
      alert('An error occurred while saving.');
    } finally {
      setSavingLissCardio(false);
    }
  };

  const handleSaveWeeklyFocus = async (weeklyFocusData: WeeklyFocusData) => {
    if (!user) return;
    
    setSavingWeeklyFocus(true);
    try {
      const result = await updateWeeklyFocus(clientId, user.uid, weeklyFocusData);
      if (result.success) {
        // Reload plan data
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('Weekly Focus saved successfully!');
      } else {
        alert('Failed to save weekly focus. Please try again.');
      }
    } catch (error) {
      console.error('Error saving weekly focus:', error);
      alert('An error occurred while saving.');
    } finally {
      setSavingWeeklyFocus(false);
    }
  };

  const handleSaveDailyHabits = async (dailyHabitsData: DailyHabitsData) => {
    if (!user) return;
    
    setSavingDailyHabits(true);
    try {
      const result = await updateDailyHabits(clientId, user.uid, dailyHabitsData);
      if (result.success) {
        // Reload plan data
        const updatedPlan = await getClientPlan(clientId);
        setPlan(updatedPlan);
        alert('Daily Habits saved successfully!');
      } else {
        alert('Failed to save daily habits. Please try again.');
      }
    } catch (error) {
      console.error('Error saving daily habits:', error);
      alert('An error occurred while saving.');
    } finally {
      setSavingDailyHabits(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-stone-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="clients" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
          {/* Breadcrumb */}
          <div className="mb-2">
            <Breadcrumb items={[
              { label: 'Client Management' },
              { label: 'Client Roster', href: '/dashboard/trainer/clients' },
              { label: clientName, href: `/dashboard/trainer/clients?clientId=${clientId}` },
              { label: 'Edit Plan' }
            ]} />
          </div>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-primary" />
              Edit Plan: {clientName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your client's training plan components
            </p>
          </div>

          {/* Tabbed Editor Interface */}
          <div className="bg-white rounded-xl border p-6 shadow-sm">
            <Tabs defaultValue="weeklyfocus" className="w-full">
              <TabsList className="grid w-full grid-cols-7 mb-6">
                <TabsTrigger value="weeklyfocus">
                  Weekly Focus
                </TabsTrigger>
                <TabsTrigger value="vision">
                  Your Vision
                </TabsTrigger>
                <TabsTrigger value="dailyhabits">
                  Daily Habits
                </TabsTrigger>
                <TabsTrigger value="trainingprotocol">
                  Training Protocol
                </TabsTrigger>
                <TabsTrigger value="nutrition">
                  Nutrition Protocol
                </TabsTrigger>
                <TabsTrigger value="stepgoal">
                  Step Goal
                </TabsTrigger>
                <TabsTrigger value="cardio">
                  LISS Cardio
                </TabsTrigger>
              </TabsList>

              <TabsContent value="weeklyfocus">
                <WeeklyFocusEditor
                  initialData={plan?.weeklyFocus || null}
                  onSave={handleSaveWeeklyFocus}
                  isSaving={savingWeeklyFocus}
                />
              </TabsContent>

              <TabsContent value="vision">
                <VisionEditor
                  initialData={plan?.vision || null}
                  onSave={handleSaveVision}
                  isSaving={savingVision}
                />
              </TabsContent>

              <TabsContent value="dailyhabits">
                <DailyHabitsEditor
                  initialData={plan?.dailyHabits || null}
                  onSave={handleSaveDailyHabits}
                  isSaving={savingDailyHabits}
                />
              </TabsContent>

              <TabsContent value="stepgoal">
                <StepGoalEditor
                  initialData={plan?.stepGoal || null}
                  onSave={handleSaveStepGoal}
                  isSaving={savingStepGoal}
                />
              </TabsContent>

              <TabsContent value="trainingprotocol">
                {user && (
                  <TrainingProtocolEditor
                    clientId={clientId}
                    trainerId={user.uid}
                    keyPriorities={plan?.trainingProtocol?.keyPriorities || []}
                    onUpdate={async () => {
                      const updatedPlan = await getClientPlan(clientId);
                      setPlan(updatedPlan);
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="nutrition">
                {user && (
                  <NutritionProtocolEditor
                    clientId={clientId}
                    trainerId={user.uid}
                    currentApproach={plan?.nutritionProtocol?.approach}
                    currentData={{
                      healthyHabits: plan?.nutritionProtocol?.healthyHabits,
                      macroTracking: plan?.nutritionProtocol?.macroTracking,
                      mealPlan: plan?.nutritionProtocol?.mealPlan
                    }}
                    onUpdate={async () => {
                      const updatedPlan = await getClientPlan(clientId);
                      setPlan(updatedPlan);
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="cardio">
                <LissCardioEditor
                  initialData={plan?.lissCardio || null}
                  onSave={handleSaveLissCardio}
                  isSaving={savingLissCardio}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Each section can be saved independently. Your changes 
              will be visible to your client immediately on their plan page.
            </p>
            <p className="text-sm text-blue-800 mt-2">
              <strong>Weekly Focus</strong> should be updated regularly to keep your client informed 
              of adjustments and priorities for the current week.
            </p>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
