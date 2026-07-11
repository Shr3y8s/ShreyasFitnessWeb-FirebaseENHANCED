'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { db, listenToExercises } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  ArrowLeft,
  Search,
  Dumbbell,
  Clock,
  Target,
  Trash2,
  Save,
  Eye,
  Users,
  Tags,
  Library,
  Heart,
  Wind,
  Zap,
  Activity,
  GripVertical,
  X,
  Info
} from 'lucide-react';
import {
  Exercise,
  WorkoutTemplateExercise,
  DIFFICULTY_LEVELS,
  WORKOUT_CATEGORIES,
  EXERCISE_CATEGORIES,
} from '@/types/workout';
import TrainerSidebar from '@/components/TrainerSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Exercise Item Component
function SortableExerciseItem({ 
  exercise, 
  index, 
  onRemove, 
  getExerciseName,
  onUpdateNotes
}: { 
  exercise: WorkoutTemplateExercise & { id: string }; 
  index: number; 
  onRemove: () => void;
  getExerciseName: (id: string) => string;
  onUpdateNotes: (notes: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 mt-1"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <h4 className="font-semibold text-lg">{getExerciseName(exercise.exerciseId)}</h4>
          </div>
          
          {/* Notes removed: Add coaching cues at Exercise level (generic) or Assignment level (client-specific) */}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700 mt-1"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function CreateWorkoutTemplatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('id');
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'exercises' | 'preview'>('basic');
  
  // Exercise library
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [filteredLibraryExercises, setFilteredLibraryExercises] = useState<Exercise[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState<string>('all');
  
  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: 'strength' as 'strength' | 'cardio' | 'hiit' | 'flexibility' | 'mixed',
    estimatedDuration: 45,
    scope: 'personal' as 'personal' | 'company',
    tags: [] as string[],
  });

  // Selected exercises for template
  const [templateExercises, setTemplateExercises] = useState<(WorkoutTemplateExercise & { id: string })[]>([]);
  
  const [tagInput, setTagInput] = useState('');

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const unsubscribe = listenToExercises(user.uid, (exerciseList) => {
          setLibraryExercises(exerciseList);
          setFilteredLibraryExercises(exerciseList);
        });

        if (templateId) {
          const templateDoc = await getDoc(doc(db, 'workoutTemplates', templateId));
          if (templateDoc.exists()) {
            const data = templateDoc.data();
            setTemplateForm({
              name: data.name || '',
              description: data.description || '',
              difficulty: data.difficulty || 'beginner',
              category: data.category || 'strength',
              estimatedDuration: data.estimatedDuration || 45,
              scope: data.scope || 'personal',
              tags: data.tags || [],
            });
            
            const exercises = (data.exercises || []).map((ex: WorkoutTemplateExercise, idx: number) => ({
              ...ex,
              id: `ex-${idx}-${ex.exerciseId}`,
            }));
            setTemplateExercises(exercises);
          }
        }

        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();
  }, [user, router, templateId]);

  useEffect(() => {
    let filtered = libraryExercises;

    if (exerciseSearchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        (exercise.description && exercise.description.toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
      );
    }

    if (selectedExerciseCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedExerciseCategory);
    }

    setFilteredLibraryExercises(filtered);
  }, [libraryExercises, exerciseSearchQuery, selectedExerciseCategory]);

  const handleAddLibraryExercise = (exercise: Exercise) => {
    const newTemplateExercise = {
      id: `ex-${Date.now()}-${exercise.id}`,
      exerciseId: exercise.id,
    };

    setTemplateExercises(prev => [...prev, newTemplateExercise]);
  };

  const handleRemoveTemplateExercise = (id: string) => {
    setTemplateExercises(prev => prev.filter(ex => ex.id !== id));
  };

  const handleUpdateExerciseNotes = (id: string, notes: string) => {
    setTemplateExercises(prev => prev.map(ex => 
      ex.id === id ? { ...ex, notes } : ex
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTemplateExercises((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !templateForm.tags.includes(tagInput.trim())) {
      setTemplateForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTemplateForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSaveTemplate = async () => {
    if (!user || !templateForm.name || templateExercises.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a name and add at least one exercise.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const targetMuscleGroups = Array.from(new Set(
        templateExercises
          .map(te => libraryExercises.find(e => e.id === te.exerciseId))
          .filter(e => e)
          .flatMap(e => e!.primaryMuscles || [])
      ));

      const equipment = Array.from(new Set(
        templateExercises
          .map(te => libraryExercises.find(e => e.id === te.exerciseId))
          .filter(e => e)
          .flatMap(e => e!.equipment || [])
      ));

      const templateData = {
        name: templateForm.name,
        description: templateForm.description || '',
        difficulty: templateForm.difficulty,
        category: templateForm.category,
        estimatedDuration: templateForm.estimatedDuration,
        scope: templateForm.scope,
        tags: templateForm.tags,
        targetMuscleGroups,
        equipment,
        exercises: templateExercises.map(ex => ({
          exerciseId: ex.exerciseId,
        })),
      };

      if (templateId) {
        // Update existing template using cloud function
        const { updateWorkoutTemplate } = await import('@/lib/workout-api');
        await updateWorkoutTemplate({
          templateId,
          ...templateData,
        });
        toast({
          title: "Template Updated",
          description: "Workout template updated successfully!",
        });
      } else {
        // Create new template using cloud function
        const { createWorkoutTemplate } = await import('@/lib/workout-api');
        await createWorkoutTemplate(templateData);
        toast({
          title: "Template Created",
          description: "Workout template created successfully!",
        });
      }
      
      router.push('/dashboard/trainer/workouts');
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Save Failed",
        description: `Failed to ${templateId ? 'update' : 'create'} template. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength': return <Dumbbell className="h-4 w-4" />;
      case 'cardio': return <Heart className="h-4 w-4" />;
      case 'flexibility': return <Wind className="h-4 w-4" />;
      case 'core': return <Zap className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getExerciseName = (exerciseId: string): string => {
    const exercise = libraryExercises.find(ex => ex.id === exerciseId);
    return exercise?.name || 'Unknown Exercise';
  };

  const getExerciseDetails = (exerciseId: string): Exercise | undefined => {
    return libraryExercises.find(ex => ex.id === exerciseId);
  };

  if (loading) {
    return (
      <div className="client-surface flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }


  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="workouts" />
      <SidebarInset>
        <div className="client-surface">
          {/* Header */}

          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Breadcrumb items={[
                { label: 'Training' },
                { label: 'Workout Library', href: '/dashboard/trainer/workouts' },
                { label: templateId ? 'Edit Template' : 'Create Template' }
              ]} />
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    {templateId ? 'Edit Workout Template' : 'Create Workout Template'}
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Build a reusable workout blueprint (configure sets/reps when assigning to clients)
                  </p>
                </div>
                {currentStep !== 'preview' && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('preview')}
                    disabled={!templateForm.name || templateExercises.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview & Save
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Blueprint Mode Info Banner */}
          <div className="bg-blue-50 border-b border-blue-200">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>Blueprint Mode:</strong> This template defines the exercise sequence only. 
                  You'll configure sets, reps, and weights when assigning to specific clients.
                </div>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-3">
              <div className="flex items-center gap-8">
                <button
                  onClick={() => setCurrentStep('basic')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === 'basic' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  Basic Info
                </button>
                <button
                  onClick={() => setCurrentStep('exercises')}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === 'exercises' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Library className="h-4 w-4" />
                  Select Exercises ({templateExercises.length})
                </button>
                <button
                  onClick={() => setCurrentStep('preview')}
                  disabled={templateExercises.length === 0}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === 'preview' ? 'bg-primary text-white' : 
                    templateExercises.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Step 1: Basic Information */}
            {currentStep === 'basic' && (
              <div className="bg-white rounded-xl border p-8">
                <h2 className="text-xl font-semibold mb-6">Template Information</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="name">Template Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Upper Body Strength Program"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        placeholder="Describe the workout goals and what clients can expect..."
                        value={templateForm.description}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-2 w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="15"
                        max="180"
                        value={templateForm.estimatedDuration}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 45 }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Visibility</Label>
                      <div className="mt-2 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setTemplateForm(prev => ({ ...prev, scope: 'personal' }))}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            templateForm.scope === 'personal' ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Personal
                          <p className="text-xs mt-1 opacity-80">Only you can see</p>
                        </button>
                        <button
                          onClick={() => setTemplateForm(prev => ({ ...prev, scope: 'company' }))}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            templateForm.scope === 'company' ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          Company
                          <p className="text-xs mt-1 opacity-80">All trainers</p>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    <div>
                      <Label>Difficulty Level</Label>
                      <div className="mt-2 grid grid-cols-3 gap-3">
                        {DIFFICULTY_LEVELS.map((level) => (
                          <button
                            key={level.value}
                            onClick={() => setTemplateForm(prev => ({ ...prev, difficulty: level.value }))}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                              templateForm.difficulty === level.value ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {level.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Category</Label>
                      <div className="mt-2 space-y-2">
                        {WORKOUT_CATEGORIES.map((category) => (
                          <button
                            key={category.value}
                            onClick={() => setTemplateForm(prev => ({ ...prev, category: category.value }))}
                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                              templateForm.category === category.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium">{category.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="tags">Tags (optional)</Label>
                      <div className="mt-2 flex gap-2">
                        <Input
                          id="tags"
                          placeholder="Add tag..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        />
                        <Button type="button" onClick={handleAddTag} variant="outline">Add</Button>
                      </div>
                      {templateForm.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {templateForm.tags.map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-2">
                              <Tags className="h-3 w-3" />
                              {tag}
                              <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-600">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button onClick={() => setCurrentStep('exercises')} disabled={!templateForm.name}>
                    Next: Select Exercises
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Exercise Selection */}
            {currentStep === 'exercises' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Exercise Library */}
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Library className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Exercise Library</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Click to add exercises to your template</p>

                  <div className="space-y-4 mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search exercises..."
                        value={exerciseSearchQuery}
                        onChange={(e) => setExerciseSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSelectedExerciseCategory('all')}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedExerciseCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        All
                      </button>
                      {EXERCISE_CATEGORIES.map((category) => (
                        <button
                          key={category.value}
                          onClick={() => setSelectedExerciseCategory(category.value)}
                          className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                            selectedExerciseCategory === category.value ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          {getCategoryIcon(category.value)}
                          {category.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {filteredLibraryExercises.length === 0 ? (
                      <div className="text-center py-12">
                        <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          {libraryExercises.length === 0 ? "No exercises in your library yet." : "No exercises match your search."}
                        </p>
                      </div>
                    ) : (
                      filteredLibraryExercises.map((exercise) => (
                        <button
                          key={exercise.id}
                          onClick={() => handleAddLibraryExercise(exercise)}
                          disabled={templateExercises.some(te => te.exerciseId === exercise.id)}
                          className="w-full text-left border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(exercise.category)}
                            <h4 className="font-medium">{exercise.name}</h4>
                          </div>
                          {exercise.description && (
                            <p className="text-sm text-gray-600 line-clamp-2">{exercise.description}</p>
                          )}
                          {templateExercises.some(te => te.exerciseId === exercise.id) && (
                            <p className="text-xs text-green-600 mt-1">✓ Already added</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Template Builder */}
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Template Exercises ({templateExercises.length})</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-6">Drag to reorder • Add optional notes per exercise</p>

                  {templateExercises.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <Target className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No exercises added yet.<br />Click exercises from the library to add them.</p>
                    </div>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={templateExercises.map(ex => ex.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                          {templateExercises.map((exercise, index) => (
                            <SortableExerciseItem
                              key={exercise.id}
                              exercise={exercise}
                              index={index}
                              onRemove={() => handleRemoveTemplateExercise(exercise.id)}
                              getExerciseName={getExerciseName}
                              onUpdateNotes={(notes) => handleUpdateExerciseNotes(exercise.id, notes)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {currentStep === 'preview' && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">Template Preview</h2>
                      <p className="text-gray-600 mt-1">Review your template before {templateId ? 'updating' : 'saving'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={() => setCurrentStep('exercises')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Exercises
                      </Button>
                      <Button onClick={handleSaveTemplate} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : templateId ? 'Update Template' : 'Save Template'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <h1 className="text-3xl font-bold">{templateForm.name}</h1>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        templateForm.scope === 'personal' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {templateForm.scope === 'personal' ? 'Personal' : 'Company'}
                      </span>
                    </div>
                    
                    {templateForm.description && (
                      <p className="text-gray-600 text-lg mb-4">{templateForm.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{templateForm.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{templateForm.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>~{templateForm.estimatedDuration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{templateExercises.length} exercises</span>
                      </div>
                    </div>
                    
                    {templateForm.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {templateForm.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-1">
                            <Tags className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900">
                          <strong>Blueprint Mode Active:</strong> This template shows the exercise sequence only. 
                          Sets, reps, and weights will be configured when assigning to clients.
                        </div>
                      </div>
                    </div>

                    {templateExercises.map((templateEx, index) => {
                      const exerciseDetails = getExerciseDetails(templateEx.exerciseId);
                      return (
                        <div key={templateEx.id} className="border rounded-lg p-6">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                              {index + 1}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-semibold">{getExerciseName(templateEx.exerciseId)}</h3>
                                {exerciseDetails && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    exerciseDetails.category === 'strength' ? 'bg-blue-100 text-blue-800' :
                                    exerciseDetails.category === 'cardio' ? 'bg-red-100 text-red-800' :
                                    exerciseDetails.category === 'core' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {exerciseDetails.category}
                                  </span>
                                )}
                              </div>
                              
                              {exerciseDetails?.description && (
                                <p className="text-sm text-gray-600 mb-3">{exerciseDetails.description}</p>
                              )}

                              {exerciseDetails && (
                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                                  {exerciseDetails.equipment && exerciseDetails.equipment.length > 0 && (
                                    <span>Equipment: {exerciseDetails.equipment.join(', ')}</span>
                                  )}
                                  {exerciseDetails.primaryMuscles && exerciseDetails.primaryMuscles.length > 0 && (
                                    <span>• Muscles: {exerciseDetails.primaryMuscles.join(', ')}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 pt-6 border-t">
                    <div className="flex justify-between items-center">
                      <Button variant="outline" onClick={() => setCurrentStep('exercises')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Exercises
                      </Button>
                      <Button onClick={handleSaveTemplate} disabled={saving} size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : templateId ? 'Update Template' : 'Save Template'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function CreateWorkoutTemplatePage() {
  return (
    <Suspense fallback={
      <div className="client-surface flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    }>

      <CreateWorkoutTemplatePageInner />
    </Suspense>
  );
}
