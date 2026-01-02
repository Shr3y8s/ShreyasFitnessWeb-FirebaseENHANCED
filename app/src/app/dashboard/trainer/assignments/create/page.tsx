'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft,
  Calendar,
  User,
  Dumbbell,
  Target,
  Save,
  CheckCircle,
  Info,
  Plus,
  Minus,
  Clock,
  Activity
} from 'lucide-react';
import {
  Exercise,
  WorkoutTemplate,
  WorkoutTemplateExercise,
  WorkoutAssignmentExercise,
  StrengthConfiguration,
  CardioSteadyStateConfiguration,
  CardioIntervalsConfiguration,
  ExerciseConfigurationType,
} from '@/types/workout';
import { assignWorkout, formatDateForAPI } from '@/lib/workout-api';
import {
  createDefaultStrengthConfiguration,
  createDefaultCardioSteadyStateConfiguration,
  createDefaultCardioIntervalsConfiguration,
  createDefaultCoreRepBasedConfiguration,
  createDefaultCoreDurationBasedConfiguration,
  createDefaultCardioActivityBasedConfiguration,
  createDefaultCardioStepsBasedConfiguration,
  createDefaultFlexibilityConfiguration,
  createDefaultBalanceConfiguration,
  createDefaultMobilityConfiguration,
  createDefaultPlyometricConfiguration,
  createDefaultYogaPilatesConfiguration,
} from '@/lib/workout-utils';
import TrainerSidebar from '@/components/TrainerSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ExerciseConfiguration } from '@/components/workouts/ExerciseConfiguration';

// Client selection interface
interface ClientOption {
  id: string;
  name: string;
  email: string;
}

// Helper function to format date strings without timezone conversion
function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedTemplateId = searchParams.get('templateId');
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'template' | 'client' | 'configure' | 'schedule' | 'review'>('template');
  
  // Step 1: Template selection
  const [templates, setTemplates] = useState<(WorkoutTemplate & { id: string; hasArchivedExercises?: boolean; isAssignable?: boolean })[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<(WorkoutTemplate & { id: string; hasArchivedExercises?: boolean; isAssignable?: boolean }) | null>(null);
  const [hideUnassignable, setHideUnassignable] = useState(false);
  
  // Step 2: Client selection
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  
  // Step 3: Exercise configuration
  const [libraryExercises, setLibraryExercises] = useState<Record<string, Exercise>>({});
  const [configuredExercises, setConfiguredExercises] = useState<WorkoutAssignmentExercise[]>([]);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  
  // Step 4: Scheduling
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      // Wait for auth to load before redirecting
      if (authLoading) {
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Load templates
        const templatesQuery = query(
          collection(db, 'workoutTemplates'),
          where('isActive', '==', true)
        );
        const templatesSnapshot = await getDocs(templatesQuery);
        const templatesDataRaw = templatesSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as WorkoutTemplate & { id: string }))
          .filter(t => t.createdBy === user.uid || t.scope === 'company');
        
        // Check each template for archived exercises
        const templatesWithStatus = await Promise.all(
          templatesDataRaw.map(async (template) => {
            // Check if any exercises in template are archived
            const exerciseStatuses = await Promise.all(
              template.exercises.map(async (ex) => {
                try {
                  const exerciseDoc = await getDoc(doc(db, 'exercises', ex.exerciseId));
                  return exerciseDoc.exists() && exerciseDoc.data().isActive !== false;
                } catch (error) {
                  console.error(`Error checking exercise ${ex.exerciseId}:`, error);
                  return false; // Treat error as archived to be safe
                }
              })
            );
            
            const hasArchivedExercises = exerciseStatuses.some(status => !status);
            
            return {
              ...template,
              hasArchivedExercises,
              isAssignable: !hasArchivedExercises
            };
          })
        );
        
        setTemplates(templatesWithStatus);

        // If template preselected, load it
        if (preselectedTemplateId) {
          const template = templatesWithStatus.find((t: any) => t.id === preselectedTemplateId);
          if (template) {
            setSelectedTemplate(template);
            setCustomName(template.name);
            setCurrentStep('client');
          }
        }

        // Load clients
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || doc.data().email || 'Unknown',
          email: doc.data().email || '',
        }));
        setClients(clientsData);

        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [user, router, authLoading, preselectedTemplateId]);

  // Load exercise details when template selected
  useEffect(() => {
    const loadExercises = async () => {
      if (!selectedTemplate) return;

      const exerciseIds = selectedTemplate.exercises.map(ex => ex.exerciseId);
      const exercisesMap: Record<string, Exercise> = {};

      for (const exerciseId of exerciseIds) {
        try {
          const exerciseDoc = await getDoc(doc(db, 'exercises', exerciseId));
          if (exerciseDoc.exists()) {
            exercisesMap[exerciseId] = { id: exerciseDoc.id, ...exerciseDoc.data() } as Exercise;
          }
        } catch (error) {
          console.error(`Error loading exercise ${exerciseId}:`, error);
        }
      }

      setLibraryExercises(exercisesMap);

      // Initialize configured exercises with default configurations
      const initialConfigs: WorkoutAssignmentExercise[] = selectedTemplate.exercises.map(templateEx => {
        const exercise = exercisesMap[templateEx.exerciseId];
        if (!exercise) {
          return {
            exerciseId: templateEx.exerciseId,
            exerciseName: 'Unknown Exercise',
            exerciseType: 'strength',
            configuration: createDefaultStrengthConfiguration(),
            notes: '', // Assignment-level notes (client-specific)
          };
        }

        let defaultConfig: ExerciseConfigurationType;
        
        switch (exercise.category) {
          case 'strength':
            defaultConfig = createDefaultStrengthConfiguration();
            break;
          case 'cardio':
            // Default to steady state for cardio
            defaultConfig = createDefaultCardioSteadyStateConfiguration();
            break;
          case 'core':
            // Default to duration-based (planks, holds)
            defaultConfig = createDefaultCoreDurationBasedConfiguration();
            break;
          case 'flexibility':
            defaultConfig = createDefaultFlexibilityConfiguration();
            break;
          case 'balance':
            defaultConfig = createDefaultBalanceConfiguration();
            break;
          case 'mobility':
            defaultConfig = createDefaultMobilityConfiguration();
            break;
          case 'plyometric':
            defaultConfig = createDefaultPlyometricConfiguration();
            break;
          case 'yoga_pilates':
            defaultConfig = createDefaultYogaPilatesConfiguration();
            break;
          default:
            defaultConfig = createDefaultStrengthConfiguration();
        }

        return {
          exerciseId: templateEx.exerciseId,
          exerciseName: exercise.name,
          exerciseType: exercise.category,
          configuration: defaultConfig,
          notes: '', // Assignment-level notes (client-specific)
        };
      });

      setConfiguredExercises(initialConfigs);
    };

    loadExercises();
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: WorkoutTemplate & { id: string }) => {
    setSelectedTemplate(template);
    setCustomName(template.name);
    setCurrentStep('client');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentStep('configure');
  };

  const handleUpdateExerciseConfiguration = (index: number, config: ExerciseConfigurationType) => {
    setConfiguredExercises(prev => prev.map((ex, i) => 
      i === index ? { ...ex, configuration: config } : ex
    ));
  };

  const handleSaveAssignment = async () => {
    if (!user || !selectedTemplate || !selectedClientId || configuredExercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please complete all steps before saving.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await assignWorkout({
        workoutTemplateId: selectedTemplate.id,
        clientId: selectedClientId,
        exercises: configuredExercises,
        scheduledDate: scheduledDate,
        dueDate: dueDate || undefined,
        notes: assignmentNotes || undefined,
        name: customName || selectedTemplate.name,
        // Description comes from template, not stored in assignment
      });

      toast({
        title: "Workout Assigned",
        description: "Workout assigned successfully!",
      });
      router.push('/dashboard/trainer/assignments');
    } catch (error) {
      console.error('Error assigning workout:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
      <TrainerSidebar currentPage="assignments" />
      <SidebarInset>
        <div className="min-h-screen bg-stone-50">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Breadcrumb items={[
                { label: 'Trainer' },
                { label: 'Workout Assignments', href: '/dashboard/trainer/assignments' },
                { label: 'Create Assignment' }
              ]} />
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Assign Workout to Client</h1>
                  <p className="text-muted-foreground mt-1">
                    Select template, configure exercises, and assign to client
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
                  active={currentStep === 'template'} 
                  completed={selectedTemplate !== null}
                  onClick={() => setCurrentStep('template')}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={2} 
                  label="Client" 
                  active={currentStep === 'client'} 
                  completed={selectedClientId !== ''}
                  onClick={selectedTemplate ? () => setCurrentStep('client') : undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={3} 
                  label="Configure" 
                  active={currentStep === 'configure'} 
                  completed={currentStep === 'schedule' || currentStep === 'review'}
                  onClick={selectedClientId ? () => setCurrentStep('configure') : undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={4} 
                  label="Schedule" 
                  active={currentStep === 'schedule'} 
                  completed={currentStep === 'review'}
                  onClick={configuredExercises.length > 0 ? () => setCurrentStep('schedule') : undefined}
                />
                <div className="h-px flex-1 bg-gray-300" />
                <StepIndicator 
                  step={5} 
                  label="Review" 
                  active={currentStep === 'review'} 
                  completed={false}
                  onClick={scheduledDate ? () => setCurrentStep('review') : undefined}
                />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Step 1: Template Selection */}
            {currentStep === 'template' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-4">Select Workout Template</h2>
                <p className="text-gray-600 mb-6">Choose a template to assign to your client</p>
                
                {/* Info banner if any templates are blocked */}
                {templates.some(t => !t.isAssignable) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-900">
                        <strong>Some templates cannot be assigned</strong>
                        <p className="mt-1">
                          Templates containing archived exercises are disabled. You can either 
                          reactivate the archived exercises or edit the template to use 
                          different exercises.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filter toggle */}
                {templates.some(t => !t.isAssignable) && (
                  <div className="mb-4 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hideUnassignable}
                        onChange={(e) => setHideUnassignable(e.target.checked)}
                        className="rounded"
                      />
                      <span>Hide templates with archived exercises</span>
                    </label>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Target className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No templates available. Create one first!</p>
                      <Button 
                        onClick={() => router.push('/dashboard/trainer/workouts/create')}
                        className="mt-4"
                      >
                        Create Template
                      </Button>
                    </div>
                  ) : (
                    templates
                      .filter(t => !hideUnassignable || t.isAssignable)
                      .map((template) => (
                        <button
                          key={template.id}
                          onClick={() => template.isAssignable && handleTemplateSelect(template)}
                          disabled={!template.isAssignable}
                          title={!template.isAssignable 
                            ? 'This template contains archived exercises and cannot be assigned'
                            : 'Click to assign this template'
                          }
                          className={`text-left border rounded-lg p-4 transition-all ${
                            template.isAssignable 
                              ? 'hover:shadow-md hover:border-primary cursor-pointer'
                              : 'opacity-50 cursor-not-allowed bg-gray-100'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            {!template.isAssignable && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full whitespace-nowrap ml-2">
                                Archived Exercises
                              </span>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded">{template.difficulty}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">{template.category}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">{template.exercises.length} exercises</span>
                          </div>
                          
                          {/* Quick action buttons for blocked templates */}
                          {!template.isAssignable && (
                            <div className="mt-3 pt-3 border-t flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/dashboard/trainer/workouts/create?id=${template.id}`);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Edit Template
                              </button>
                              <span className="text-gray-400">•</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push('/dashboard/trainer/exercises');
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                              >
                                Manage Exercises
                              </button>
                            </div>
                          )}
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Client Selection */}
            {currentStep === 'client' && selectedTemplate && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-4">Select Client</h2>
                <p className="text-gray-600 mb-6">Assigning: <strong>{selectedTemplate.name}</strong></p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {clients.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <User className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No clients available</p>
                    </div>
                  ) : (
                    clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client.id)}
                        className={`text-left border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all ${
                          selectedClientId === client.id ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{client.name}</h3>
                            <p className="text-sm text-gray-600">{client.email}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setCurrentStep('template')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Templates
                  </Button>
                  {selectedClientId && (
                    <Button onClick={() => setCurrentStep('configure')}>
                      Next: Configure
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Exercise Configuration */}
            {currentStep === 'configure' && selectedTemplate && selectedClientId && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-4">Configure Exercises</h2>
                <p className="text-gray-600 mb-6">
                  Review the default exercise configurations for this client
                </p>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-900">
                      <strong>Default configurations loaded.</strong> The exercises below show the parameters that will be assigned. Full inline editing coming soon - for now, you can review and proceed to scheduling.
                    </div>
                  </div>
                </div>

                <ExerciseConfiguration
                  exercises={configuredExercises}
                  mode="configure"
                  onExerciseUpdate={(exerciseIndex, updatedConfig) => {
                    handleUpdateExerciseConfiguration(exerciseIndex, updatedConfig);
                  }}
                  readOnly={false}
                />

                <div className="flex justify-between mt-6">
                  <Button variant="outline" onClick={() => setCurrentStep('client')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Clients
                  </Button>
                  <Button onClick={() => setCurrentStep('schedule')}>
                    Next: Set Schedule
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Scheduling */}
            {currentStep === 'schedule' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-6">Schedule Workout</h2>
                
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <Label htmlFor="customName">Assignment Name</Label>
                    <Input
                      id="customName"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={selectedTemplate?.name}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This will be shown to the client. Leave as-is to use template name: "{selectedTemplate?.name}"
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                    <Input
                      id="scheduledDate"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dueDate">Due Date (optional)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Assignment Notes (optional)</Label>
                    <textarea
                      id="notes"
                      value={assignmentNotes}
                      onChange={(e) => setAssignmentNotes(e.target.value)}
                      placeholder="Add notes for the client..."
                      className="mt-2 w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep('configure')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Configuration
                  </Button>
                  <Button onClick={() => setCurrentStep('review')}>
                    Review & Assign
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 'review' && selectedTemplate && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-xl font-semibold mb-6">Review Assignment</h2>
                
                {/* Three Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Column 1: Assignment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      Assignment
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{customName || selectedTemplate.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Template</p>
                        <p className="text-sm text-gray-700">{selectedTemplate.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Details</p>
                        <p className="text-sm text-gray-700">{selectedTemplate.exercises.length} exercises • {selectedTemplate.estimatedDuration} min</p>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Client */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Client
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p className="font-medium text-gray-900">{clients.find(c => c.id === selectedClientId)?.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="text-sm text-gray-700">{clients.find(c => c.id === selectedClientId)?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Schedule */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Schedule
                    </h3>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500">Scheduled</p>
                        <p className="font-medium text-gray-900">{formatDateForDisplay(scheduledDate)}</p>
                      </div>
                      {dueDate && (
                        <div>
                          <p className="text-xs text-gray-500">Due Date</p>
                          <p className="text-sm text-gray-700">{formatDateForDisplay(dueDate)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes - Full Width Below */}
                {assignmentNotes && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-gray-700">{assignmentNotes}</p>
                  </div>
                )}

                {/* Exercise Configuration Preview */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Exercise Configuration</h3>
                  <ExerciseConfiguration
                    exercises={configuredExercises}
                    mode="display"
                    readOnly={true}
                  />
                </div>

                <div className="flex justify-between mt-8">
                  <Button variant="outline" onClick={() => setCurrentStep('schedule')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Schedule
                  </Button>
                  <Button onClick={handleSaveAssignment} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Assigning...' : 'Assign Workout'}
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

// Step Indicator Component
function StepIndicator({ step, label, active, completed, onClick }: { step: number; label: string; active: boolean; completed: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`flex flex-col items-center gap-1 ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
        completed ? 'bg-green-500 text-white' :
        active ? 'bg-primary text-white' :
        'bg-gray-200 text-gray-600'
      }`}>
        {completed ? <CheckCircle className="h-5 w-5" /> : step}
      </div>
      <span className={`text-xs ${active ? 'text-primary font-medium' : 'text-gray-600'}`}>{label}</span>
    </button>
  );
}
