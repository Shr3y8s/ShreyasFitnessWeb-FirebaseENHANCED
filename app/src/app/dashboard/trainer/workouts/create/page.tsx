'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db, listenToExercises } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  ArrowLeft,
  Plus,
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
  Edit,
  GripVertical,
  X
} from 'lucide-react';
import {
  Exercise,
  WorkoutSet,
  WorkoutExercise,
  CreateWorkoutForm,
  DIFFICULTY_LEVELS,
  WORKOUT_CATEGORIES,
  EXERCISE_CATEGORIES,
  createDefaultSets,
  createEmptySet,
  INTENSITY_OPTIONS,
  SET_TYPE_OPTIONS,
  isTimeBased
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
  onEdit, 
  onRemove, 
  getExerciseName 
}: { 
  exercise: WorkoutExercise; 
  index: number; 
  onEdit: () => void; 
  onRemove: () => void;
  getExerciseName: (id: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `exercise-${index}` });

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
      <div className="flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </button>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
            <h4 className="font-semibold text-lg">{getExerciseName(exercise.exerciseId)}</h4>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'} configured
          </p>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex items-center gap-2"
        >
          <Edit className="h-4 w-4" />
          Edit Sets
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function CreateWorkoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workoutId = searchParams.get('id');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<'basic' | 'exercises' | 'preview'>('basic');
  
  // Exercise library
  const [libraryExercises, setLibraryExercises] = useState<Exercise[]>([]);
  const [filteredLibraryExercises, setFilteredLibraryExercises] = useState<Exercise[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState<string>('all');
  
  // Workout form state
  const [workoutForm, setWorkoutForm] = useState<CreateWorkoutForm>({
    name: '',
    description: '',
    difficulty: 'beginner',
    category: 'strength',
    estimatedDuration: 30,
    exercises: [],
    tags: [],
    scope: 'personal'
  });

  // Selected exercises for workout
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  
  // Side drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);

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

        // Load existing workout if editing
        if (workoutId) {
          const workoutDoc = await getDoc(doc(db, 'workout_templates', workoutId));
          if (workoutDoc.exists()) {
            const data = workoutDoc.data();
            setWorkoutForm({
              name: data.name || '',
              description: data.description || '',
              difficulty: data.difficulty || 'beginner',
              category: data.category || 'strength',
              estimatedDuration: data.estimatedDuration || 30,
              exercises: [],
              tags: data.tags || [],
              scope: data.scope || 'personal'
            });
            setWorkoutExercises(data.exercises || []);
          }
        }

        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();
  }, [user, router, workoutId]);

  // Filter library exercises
  useEffect(() => {
    let filtered = libraryExercises;

    if (exerciseSearchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        (exercise.instructions && exercise.instructions.toLowerCase().includes(exerciseSearchQuery.toLowerCase()))
      );
    }

    if (selectedExerciseCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedExerciseCategory);
    }

    setFilteredLibraryExercises(filtered);
  }, [libraryExercises, exerciseSearchQuery, selectedExerciseCategory]);

  const handleAddLibraryExercise = (exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      exerciseId: exercise.id,
      sets: createDefaultSets(),
      order: workoutExercises.length,
      notes: ''
    };

    setWorkoutExercises(prev => [...prev, newWorkoutExercise]);
  };

  const handleRemoveWorkoutExercise = (index: number) => {
    setWorkoutExercises(prev => prev.filter((_, i) => i !== index));
    if (editingExerciseIndex === index) {
      setDrawerOpen(false);
      setEditingExerciseIndex(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWorkoutExercises((items) => {
        const oldIndex = parseInt(active.id.toString().replace('exercise-', ''));
        const newIndex = parseInt(over.id.toString().replace('exercise-', ''));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const openDrawer = (index: number) => {
    setEditingExerciseIndex(index);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingExerciseIndex(null);
  };

  const handleAddSet = (type: 'warmup' | 'working' = 'working') => {
    if (editingExerciseIndex === null) return;
    
    setWorkoutExercises(prev => prev.map((ex, i) => {
      if (i === editingExerciseIndex) {
        const newSetNumber = ex.sets.length + 1;
        return {
          ...ex,
          sets: [...ex.sets, createEmptySet(newSetNumber, type)]
        };
      }
      return ex;
    }));
  };

  const handleRemoveSet = (setIndex: number) => {
    if (editingExerciseIndex === null) return;
    
    setWorkoutExercises(prev => prev.map((ex, i) => {
      if (i === editingExerciseIndex) {
        const newSets = ex.sets.filter((_, si) => si !== setIndex);
        return {
          ...ex,
          sets: newSets.map((set, idx) => ({ ...set, setNumber: idx + 1 }))
        };
      }
      return ex;
    }));
  };

  const handleUpdateSet = (setIndex: number, updates: Partial<WorkoutSet>) => {
    if (editingExerciseIndex === null) return;
    
    setWorkoutExercises(prev => prev.map((ex, i) => {
      if (i === editingExerciseIndex) {
        return {
          ...ex,
          sets: ex.sets.map((set, si) => si === setIndex ? { ...set, ...updates } : set)
        };
      }
      return ex;
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !workoutForm.tags.includes(tagInput.trim())) {
      setWorkoutForm(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setWorkoutForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const handleSaveWorkout = async () => {
    if (!user || !workoutForm.name || workoutExercises.length === 0) return;

    setSaving(true);
    try {
      const workoutData = {
        name: workoutForm.name,
        description: workoutForm.description || '',
        difficulty: workoutForm.difficulty,
        category: workoutForm.category,
        exercises: workoutExercises.map((ex, idx) => ({ ...ex, order: idx })),
        scope: workoutForm.scope,
        updatedAt: serverTimestamp()
      };

      if (workoutId) {
        // Update existing workout
        await updateDoc(doc(db, 'workout_templates', workoutId), workoutData);
        alert('Workout updated successfully!');
      } else {
        // Create new workout
        await addDoc(collection(db, 'workout_templates'), {
          ...workoutData,
          isActive: true,
          usageCount: 0,
          createdBy: user.uid,
          createdByName: user.displayName || user.email || 'Unknown',
          createdAt: serverTimestamp()
        });
        alert('Workout created successfully!');
      }
      
      router.push('/dashboard/trainer/workouts');
    } catch (error) {
      console.error('Error saving workout:', error);
      alert(`Failed to ${workoutId ? 'update' : 'create'} workout. Please try again.`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  const editingExercise = editingExerciseIndex !== null ? workoutExercises[editingExerciseIndex] : null;

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="workouts" />
      <SidebarInset>
        <div className="min-h-screen bg-stone-50">
          {/* Header */}
          <div className="bg-white border-b">
            <div className="max-w-7xl mx-auto px-6 py-4">
              <Breadcrumb items={[
                { label: 'Training' },
                { label: 'Workout Library', href: '/dashboard/trainer/workouts' },
                { label: workoutId ? 'Edit Workout' : 'Create New Workout' }
              ]} />
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{workoutId ? 'Edit Workout' : 'Create New Workout'}</h1>
                  <p className="text-muted-foreground mt-1">{workoutId ? 'Update workout details and exercises' : 'Build a workout with detailed set prescriptions'}</p>
                </div>
                {currentStep !== 'preview' && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep('preview')}
                    disabled={!workoutForm.name || workoutExercises.length === 0}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview & Save
                  </Button>
                )}
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
                  Build Workout ({workoutExercises.length})
                </button>
                <button
                  onClick={() => setCurrentStep('preview')}
                  disabled={workoutExercises.length === 0}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentStep === 'preview' ? 'bg-primary text-white' : 
                    workoutExercises.length === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
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
            {/* Basic Information Step */}
            {currentStep === 'basic' && (
              <div className="bg-white rounded-xl border p-8">
                <h2 className="text-xl font-semibold mb-6">Workout Information</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column */}
                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="name">Workout Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Upper Body Strength"
                        value={workoutForm.name}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        placeholder="Describe the workout goals and what clients can expect..."
                        value={workoutForm.description}
                        onChange={(e) => setWorkoutForm(prev => ({ ...prev, description: e.target.value }))}
                        className="mt-2 w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
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
                            onClick={() => setWorkoutForm(prev => ({ ...prev, difficulty: level.value }))}
                            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                              workoutForm.difficulty === level.value
                                ? 'border-primary bg-primary text-white'
                                : 'border-gray-200 hover:border-gray-300'
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
                            onClick={() => setWorkoutForm(prev => ({ ...prev, category: category.value }))}
                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                              workoutForm.category === category.value
                                ? 'border-primary bg-primary/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium">{category.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-8">
                  <Button
                    onClick={() => setCurrentStep('exercises')}
                    disabled={!workoutForm.name}
                  >
                    Next: Build Workout
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                </div>
              </div>
            )}

            {/* Exercises Step - Improved Layout */}
            {currentStep === 'exercises' && (
              <div className="relative">
                <div className={`grid transition-all duration-300 ${drawerOpen ? 'grid-cols-[1fr_600px]' : 'grid-cols-[1fr_1fr]'} gap-6`}>
                  {/* Exercise Library */}
                  <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Library className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Exercise Library</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Click to add exercises to your workout</p>

                    {/* Search and Filter */}
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
                            selectedExerciseCategory === 'all' 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          All
                        </button>
                        {EXERCISE_CATEGORIES.map((category) => (
                          <button
                            key={category.value}
                            onClick={() => setSelectedExerciseCategory(category.value)}
                            className={`px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1 ${
                              selectedExerciseCategory === category.value 
                                ? 'bg-primary text-white' 
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            {getCategoryIcon(category.value)}
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Exercise List */}
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {filteredLibraryExercises.length === 0 ? (
                        <div className="text-center py-12">
                          <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-600">
                            {libraryExercises.length === 0 
                              ? "No exercises in your library yet."
                              : "No exercises match your search."}
                          </p>
                        </div>
                      ) : (
                        filteredLibraryExercises.map((exercise) => (
                          <button
                            key={exercise.id}
                            onClick={() => handleAddLibraryExercise(exercise)}
                            className="w-full text-left border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {getCategoryIcon(exercise.category)}
                              <h4 className="font-medium">{exercise.name}</h4>
                            </div>
                            {exercise.instructions && (
                              <p className="text-sm text-gray-600 line-clamp-2">{exercise.instructions}</p>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Workout Builder */}
                  <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Workout Exercises ({workoutExercises.length})</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-6">Drag to reorder • Click "Edit Sets" to configure</p>

                    {workoutExercises.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Target className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          No exercises added yet.<br />Click exercises from the library to add them.
                        </p>
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={workoutExercises.map((_, idx) => `exercise-${idx}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {workoutExercises.map((exercise, index) => (
                              <SortableExerciseItem
                                key={`exercise-${index}`}
                                exercise={exercise}
                                index={index}
                                onEdit={() => openDrawer(index)}
                                onRemove={() => handleRemoveWorkoutExercise(index)}
                                getExerciseName={getExerciseName}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                  </div>
                </div>

                {/* Side Drawer for Editing Sets */}
                {drawerOpen && editingExercise && (
                  <div className="fixed inset-y-0 right-0 w-[600px] bg-white border-l shadow-2xl z-50 overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b p-6 z-10">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{getExerciseName(editingExercise.exerciseId)}</h3>
                          <p className="text-sm text-gray-600 mt-1">Configure sets for this exercise</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={closeDrawer}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      {editingExercise.sets.map((set, setIndex) => (
                        <div key={setIndex} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-semibold text-lg">
                              Set {set.setNumber} • {set.type === 'warmup' ? 'Warmup' : 'Working'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSet(setIndex)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Toggle: Reps vs Duration Mode */}
                          <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex-1">
                              <span className="text-sm font-medium text-blue-900">
                                {set.duration && set.duration > 0 ? '⏱️ Time-Based Exercise' : '🏋️ Rep-Based Exercise'}
                              </span>
                              <p className="text-xs text-blue-700 mt-0.5">
                                {set.duration && set.duration > 0 
                                  ? 'Using duration (planks, holds, cardio)' 
                                  : 'Using reps and weight'}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (set.duration && set.duration > 0) {
                                  // Switch to reps mode: clear duration
                                  handleUpdateSet(setIndex, { duration: undefined });
                                } else {
                                  // Switch to duration mode: set default duration, clear might want to keep reps/weight for reference
                                  handleUpdateSet(setIndex, { duration: 60 });
                                }
                              }}
                              className="whitespace-nowrap"
                            >
                              {set.duration && set.duration > 0 ? '→ Switch to Reps' : '→ Switch to Duration'}
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm">Type</Label>
                              <select
                                value={set.type}
                                onChange={(e) => handleUpdateSet(setIndex, { type: e.target.value as 'warmup' | 'working' })}
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                              >
                                {SET_TYPE_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                            </div>
                            
                            {/* Conditional Fields: Show EITHER duration OR reps/weight */}
                            {set.duration && set.duration > 0 ? (
                              <>
                                <div>
                                  <Label className="text-sm">Duration (seconds)</Label>
                                  <Input
                                    type="number"
                                    value={set.duration}
                                    onChange={(e) => handleUpdateSet(setIndex, { duration: parseInt(e.target.value) || 60 })}
                                    placeholder="60"
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    {set.duration < 60 ? `${set.duration} sec` : 
                                     set.duration === 60 ? '1 min' :
                                     set.duration % 60 === 0 ? `${set.duration / 60} min` :
                                     `${Math.floor(set.duration / 60)}:${(set.duration % 60).toString().padStart(2, '0')}`}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <div>
                                  <Label className="text-sm">Reps</Label>
                                  <Input
                                    value={set.targetReps}
                                    onChange={(e) => handleUpdateSet(setIndex, { targetReps: e.target.value })}
                                    placeholder="8-12"
                                    className="mt-1"
                                  />
                                </div>
                                <div className="col-span-2">
                                  <Label className="text-sm">Weight</Label>
                                  <Input
                                    value={set.targetWeight}
                                    onChange={(e) => handleUpdateSet(setIndex, { targetWeight: e.target.value })}
                                    placeholder="150 lbs or AHAP"
                                    className="mt-1"
                                  />
                                </div>
                              </>
                            )}
                            
                            <div>
                              <Label className="text-sm">Rest (seconds)</Label>
                              <Input
                                type="number"
                                value={set.restSeconds}
                                onChange={(e) => handleUpdateSet(setIndex, { restSeconds: parseInt(e.target.value) || 60 })}
                                className="mt-1"
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-sm">Intensity</Label>
                              <select
                                value={INTENSITY_OPTIONS.find(opt => opt.value === set.intensity) ? set.intensity : 'custom'}
                                onChange={(e) => {
                                  if (e.target.value === 'custom') {
                                    handleUpdateSet(setIndex, { intensity: '' });
                                  } else {
                                    handleUpdateSet(setIndex, { intensity: e.target.value });
                                  }
                                }}
                                className="w-full mt-1 px-3 py-2 border rounded-md"
                              >
                                {INTENSITY_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>
                              {(!INTENSITY_OPTIONS.find(opt => opt.value === set.intensity) || set.intensity === '') && (
                                <Input
                                  value={set.intensity}
                                  onChange={(e) => handleUpdateSet(setIndex, { intensity: e.target.value })}
                                  placeholder="Enter custom intensity..."
                                  className="mt-2"
                                />
                              )}
                            </div>
                            <div>
                              <Label className="text-sm">RPE (optional)</Label>
                              <Input
                                type="number"
                                min="1"
                                max="10"
                                value={set.rpeTarget || ''}
                                onChange={(e) => handleUpdateSet(setIndex, { rpeTarget: e.target.value ? parseInt(e.target.value) : undefined })}
                                placeholder="1-10"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Set Buttons */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => handleAddSet('working')}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Working Set
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => handleAddSet('warmup')}
                          className="flex-1"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Warmup Set
                        </Button>
                      </div>
                    </div>

                    {/* Drawer Footer */}
                    <div className="sticky bottom-0 bg-white border-t p-6">
                      <Button onClick={closeDrawer} className="w-full">
                        Done Editing
                      </Button>
                    </div>
                  </div>
                )}

                {workoutExercises.length > 0 && (
                  <div className="flex justify-between mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep('basic')}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Previous: Basic Info
                    </Button>
                    <Button
                      onClick={() => setCurrentStep('preview')}
                    >
                      Next: Preview
                      <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Preview Step */}
            {currentStep === 'preview' && (
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">Workout Preview</h2>
                      <p className="text-gray-600 mt-1">Review your workout before {workoutId ? 'updating' : 'saving'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" onClick={() => setCurrentStep('exercises')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Exercises
                      </Button>
                      <Button onClick={handleSaveWorkout} disabled={saving}>
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : workoutId ? 'Update Workout' : 'Save Workout'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Workout Header */}
                  <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-4">{workoutForm.name}</h1>
                    {workoutForm.description && (
                      <p className="text-gray-600 text-lg mb-4">{workoutForm.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{workoutForm.difficulty}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-gray-400" />
                        <span className="capitalize">{workoutForm.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{workoutForm.estimatedDuration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{workoutExercises.length} exercises</span>
                      </div>
                    </div>
                    
                    {workoutForm.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {workoutForm.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full flex items-center gap-1">
                            <Tags className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Exercise List Preview */}
                  <div className="space-y-6">
                    {workoutExercises.map((workoutEx, index) => (
                      <div key={index} className="border rounded-lg p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                            {index + 1}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-4">{getExerciseName(workoutEx.exerciseId)}</h3>
                            
                            {/* Sets Display */}
                            <div className="space-y-2">
                              {workoutEx.sets.map((set, setIndex) => (
                                <div key={setIndex} className="flex items-center gap-3 text-sm p-3 bg-gray-50 rounded">
                                  <span className="font-medium w-16">Set {set.setNumber}</span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    set.type === 'warmup' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {set.type === 'warmup' ? 'Warmup' : 'Working'}
                                  </span>
                                  {/* Smart display: Show duration OR reps/weight */}
                                  {isTimeBased(set) ? (
                                    <span className="text-gray-700 font-medium">{set.duration} sec</span>
                                  ) : (
                                    <>
                                      <span className="text-gray-700 font-medium">{set.targetReps} reps</span>
                                      <span className="text-gray-700">× {set.targetWeight}{/^\d+$/.test(set.targetWeight.trim()) ? ' lbs' : ''}</span>
                                    </>
                                  )}
                                  <span className="text-gray-500">• {set.intensity}</span>
                                  <span className="text-gray-500">• {set.restSeconds}s rest</span>
                                  {set.rpeTarget && <span className="text-gray-500">• RPE {set.rpeTarget}</span>}
                                </div>
                              ))}
                            </div>
                            
                            {workoutEx.notes && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="text-sm font-medium text-yellow-800 mb-1">Notes:</div>
                                <div className="text-sm text-yellow-700">{workoutEx.notes}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
