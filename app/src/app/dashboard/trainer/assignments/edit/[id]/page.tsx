'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { updateWorkoutAssignment } from '@/lib/workout-api';
import { getTodayLocal, createMidnightTimestamp } from '@/lib/date-utils';
import TrainerSidebar from '@/components/TrainerSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Save, ArrowLeft, CheckCircle } from 'lucide-react';
import { ExerciseConfiguration } from '@/components/workouts/ExerciseConfiguration';

// Step Indicator Component
function StepIndicator({ step, label, active, completed, locked, onClick }: { 
  step: number; 
  label: string; 
  active: boolean; 
  completed: boolean;
  locked?: boolean;
  onClick?: () => void 
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick || locked}
      className={`flex flex-col items-center gap-1 ${onClick && !locked ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} ${locked ? 'opacity-60' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        locked ? 'bg-gray-300 text-gray-600' :
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-primary text-white' :
        'bg-gray-200 text-gray-600'
      }`}>
        {locked || completed ? <CheckCircle className="h-5 w-5" /> : step}
      </div>
      <span className={`text-xs ${active && !locked ? 'text-primary font-medium' : 'text-gray-600'}`}>{label}</span>
    </button>
  );
}

interface ConfiguredExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  configuration: any;
  notes?: string;
}

export default function EditAssignmentPage() {
  const router = useRouter();
  const params = useParams();
  const workoutId = params?.id as string;
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'configure' | 'schedule' | 'review'>('configure');
  
  // Workout data (read-only)
  const [clientName, setClientName] = useState('');
  const [templateName, setTemplateName] = useState('');
  
  // Editable fields
  const [workoutName, setWorkoutName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [configuredExercises, setConfiguredExercises] = useState<ConfiguredExercise[]>([]);

  useEffect(() => {
    const loadWorkoutForEditing = async () => {
      if (authLoading || !user) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Fetch workout
        const workoutDoc = await getDoc(doc(db, 'workouts', workoutId));
        
        if (!workoutDoc.exists()) {
          toast({
            title: "Workout Not Found",
            description: "The workout assignment could not be found.",
            variant: "destructive",
          });
          router.push('/dashboard/trainer/assignments');
          return;
        }

        const workoutData = workoutDoc.data();
        
        // Verify it's scheduled
        if (workoutData.status !== 'scheduled') {
          toast({
            title: "Cannot Edit",
            description: "Only scheduled workouts can be edited.",
            variant: "destructive",
          });
          router.push('/dashboard/trainer/assignments');
          return;
        }

        // Load client name
        const clientDoc = await getDoc(doc(db, 'users', workoutData.clientId));
        setClientName(clientDoc.exists() ? clientDoc.data().name : 'Unknown');

        // Load template name
        const templateDoc = await getDoc(doc(db, 'workoutTemplates', workoutData.workoutTemplateId));
        setTemplateName(templateDoc.exists() ? templateDoc.data().name : 'Unknown');

        // Pre-populate editable fields
        setWorkoutName(workoutData.name);
        
        // Convert Firestore Timestamp to YYYY-MM-DD string
        const dueDateObj = workoutData.dueDate?.toDate?.() || new Date(workoutData.dueDate);
        const dueDateStr = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
        setDueDate(dueDateStr);
        
        setNotes(workoutData.notes || '');
        
        // Pre-populate exercises with prescribed configurations
        const exercises = workoutData.exercises.map((ex: any) => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseType: ex.exerciseType,
          configuration: ex.prescribed,
          notes: ex.notes || ''
        }));
        setConfiguredExercises(exercises);

        setLoading(false);
      } catch (error) {
        console.error('Error loading workout:', error);
        toast({
          title: "Load Failed",
          description: "Could not load workout data.",
          variant: "destructive",
        });
        router.push('/dashboard/trainer/assignments');
      }
    };

    loadWorkoutForEditing();
  }, [user, authLoading, workoutId, router, toast]);

  const handleSave = async () => {
    if (!dueDate) {
      toast({
        title: "Validation Error",
        description: "Due date is required.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateWorkoutAssignment({
        workoutId,
        name: workoutName,
        dueDate: createMidnightTimestamp(dueDate),
        notes,
        exercises: configuredExercises
      });

      toast({
        title: "Assignment Updated",
        description: "Workout assignment updated successfully!",
      });
      router.push('/dashboard/trainer/assignments');
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update assignment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="assignments" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Breadcrumb items={[
                { label: 'Trainer' },
                { label: 'Workout Assignments', href: '/dashboard/trainer/assignments' },
                { label: 'Edit Assignment' }
              ]} />
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Edit Workout Assignment</h1>
                  <p className="text-muted-foreground mt-1">
                    Modify exercise configurations, due date, and notes
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center gap-4">
                <StepIndicator 
                  step={1} 
                  label="Template" 
                  active={false} 
                  completed={true}
                  locked={true}
                  onClick={undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={2} 
                  label="Client" 
                  active={false} 
                  completed={true}
                  locked={true}
                  onClick={undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={3} 
                  label="Configure" 
                  active={currentStep === 'configure'} 
                  completed={currentStep === 'schedule' || currentStep === 'review'}
                  onClick={() => setCurrentStep('configure')}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={4} 
                  label="Schedule" 
                  active={currentStep === 'schedule'} 
                  completed={currentStep === 'review'}
                  onClick={currentStep !== 'configure' ? () => setCurrentStep('schedule') : undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={5} 
                  label="Review" 
                  active={currentStep === 'review'} 
                  completed={false}
                  onClick={currentStep === 'review' || currentStep === 'schedule' ? () => setCurrentStep('review') : undefined}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Step 1: Configure Exercises */}
            {currentStep === 'configure' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-4">Configure Exercises</h2>
                <ExerciseConfiguration
                  exercises={configuredExercises}
                  mode="configure"
                  onExerciseUpdate={(exerciseIndex, updatedConfig) => {
                    setConfiguredExercises(prev => prev.map((ex, i) => 
                      i === exerciseIndex ? { ...ex, configuration: updatedConfig } : ex
                    ));
                  }}
                  readOnly={false}
                />
                <div className="flex justify-end mt-6">
                  <Button onClick={() => setCurrentStep('schedule')}>
                    Next: Set Schedule
                  </Button>
                </div>
                
                {/* Info Banner */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-900">
                      <strong>Editing Assignment</strong>
                      <p className="mt-1">
                        Client: <strong>{clientName}</strong> • Template: <strong>{templateName}</strong>
                      </p>
                      <p className="text-xs mt-1 text-purple-700">
                        Note: Client and template cannot be changed. To assign a different workout, create a new assignment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {currentStep === 'schedule' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-6">Update Schedule & Details</h2>
                
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <Label htmlFor="workoutName">Assignment Name</Label>
                    <Input
                      id="workoutName"
                      value={workoutName}
                      onChange={(e) => setWorkoutName(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-2"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Assignment Notes (optional)</Label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes for the client..."
                      className="mt-2 w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={() => setCurrentStep('review')}>
                    Review Changes
                  </Button>
                </div>
                
                {/* Info Banner */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-900">
                      <strong>Editing Assignment</strong>
                      <p className="mt-1">
                        Client: <strong>{clientName}</strong> • Template: <strong>{templateName}</strong>
                      </p>
                      <p className="text-xs mt-1 text-purple-700">
                        Note: Client and template cannot be changed. To assign a different workout, create a new assignment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 'review' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-6">Review Changes</h2>
                
                <div className="space-y-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Client</p>
                    <p className="font-medium">{clientName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Template</p>
                    <p className="font-medium">{templateName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Workout Name</p>
                    <p className="font-medium">{workoutName}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Due Date</p>
                    <p className="font-medium">{new Date(dueDate).toLocaleDateString()}</p>
                  </div>
                  {notes && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Notes</p>
                      <p className="font-medium">{notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep('schedule')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
