'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { db, listenToExercises, createExercise, incrementExerciseUsage, getWorkoutTemplate, updateWorkoutTemplate } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
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
  CheckCircle2,
  Library,
  Sparkles,
  Filter,
  Heart,
  Wind,
  Zap,
  Activity,
  X
} from 'lucide-react';
import {
  Exercise,
  ExerciseReference,
  CreateWorkoutForm,
  DIFFICULTY_LEVELS,
  WORKOUT_CATEGORIES,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS
} from '@/types/workout';

interface WorkoutExercise {
  type: 'library' | 'custom';
  exercise: Exercise;
  sets?: number;
  reps?: number;
  duration?: number;
  restTime?: number;
  weight?: number;
  notes?: string;
  order: number;
}

export default function EnhancedCreateWorkoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const workoutId = searchParams.get('id'); // Check if editing existing workout
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
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
    isPublic: false
  });

  // Selected exercises for workout
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);

  // Exercise creation modal
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [newExerciseForm, setNewExerciseForm] = useState({
    name: '',
    instructions: '',
    category: 'strength' as const,
    targetMuscleGroups: [] as string[],
    equipment: [] as string[],
    notes: '',
    isPublic: false
  });

  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    const checkAccess = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          
          if (userData?.role !== 'trainer' && userData?.role !== 'admin') {
            router.push('/dashboard/client');
            return;
          }

          // Listen to trainer's exercise library
          const unsubscribe = listenToExercises(user.uid, (exerciseList) => {
            setLibraryExercises(exerciseList);
            setFilteredLibraryExercises(exerciseList);
          });

          setLoading(false);
          return () => unsubscribe();
        } catch (error) {
          console.error('Error checking access:', error);
        }
      }
    };

    checkAccess();
  }, [user, router]);

  // Load workout data if editing
  useEffect(() => {
    const loadWorkoutData = async () => {
      if (workoutId && user) {
        setLoading(true);
        try {
          const result = await getWorkoutTemplate(workoutId);
          if (result.success && result.template) {
            const template: any = result.template;
            
            // Set edit mode
            setIsEditMode(true);
            
            // Pre-populate form fields
            setWorkoutForm({
              name: template.name || '',
              description: template.description || '',
              difficulty: template.difficulty || 'beginner',
              category: template.category || 'strength',
              estimatedDuration: template.estimatedDuration || 30,
              exercises: template.exercises || [],
              tags: template.tags || [],
              isPublic: template.isPublic || false
            });
            
            // Pre-populate exercises
            if (template.exercises && template.exercises.length > 0) {
              const loadedExercises: WorkoutExercise[] = template.exercises.map((ex: any, index: number) => ({
                type: 'library' as const,
                exercise: {
                  id: ex.id || `ex-${index}`,
                  name: ex.name,
                  instructions: ex.instructions,
                  category: ex.category || 'strength',
                  targetMuscleGroups: ex.targetMuscleGroups || [],
                  equipment: ex.equipment || [],
                  notes: ex.notes,
                  createdBy: user.uid,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  isPublic: ex.isPublic || false
                },
                sets: ex.sets,
                reps: ex.reps,
                duration: ex.duration,
                restTime: ex.restTime,
                weight: ex.weight,
                notes: ex.notes,
                order: index
              }));
              setWorkoutExercises(loadedExercises);
            }
          } else {
            alert('Workout not found or you don\'t have permission to edit it.');
            router.push('/dashboard/trainer');
          }
        } catch (error) {
          console.error('Error loading workout:', error);
          alert('Failed to load workout. Please try again.');
          router.push('/dashboard/trainer');
        } finally {
          setLoading(false);
        }
      }
    };

    loadWorkoutData();
  }, [workoutId, user, router]);

  // Filter library exercises
  useEffect(() => {
    let filtered = libraryExercises;

    if (exerciseSearchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        exercise.instructions.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        exercise.targetMuscleGroups.some(muscle => 
          muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
        )
      );
    }

    if (selectedExerciseCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedExerciseCategory);
    }

    setFilteredLibraryExercises(filtered);
  }, [libraryExercises, exerciseSearchQuery, selectedExerciseCategory]);

  const handleAddLibraryExercise = (exercise: Exercise) => {
    const newWorkoutExercise: WorkoutExercise = {
      type: 'library',
      exercise,
      sets: 3,
      reps: exercise.category === 'cardio' ? undefined : 10,
      duration: exercise.category === 'cardio' ? 300 : undefined,
      restTime: 60,
      order: workoutExercises.length
    };

    setWorkoutExercises(prev => [...prev, newWorkoutExercise]);
    incrementExerciseUsage(exercise.id); // Track usage
  };

  const handleCreateAndAddExercise = async () => {
    if (!user || !newExerciseForm.name || !newExerciseForm.instructions) return;

    setSaving(true);
    try {
      const exerciseData = {
        name: newExerciseForm.name,
        instructions: newExerciseForm.instructions,
        category: newExerciseForm.category,
        targetMuscleGroups: newExerciseForm.targetMuscleGroups,
        equipment: newExerciseForm.equipment,
        notes: newExerciseForm.notes,
        createdBy: user.uid,
        isPublic: newExerciseForm.isPublic
      };

      // Always save to library
      const result = await createExercise(exerciseData);
      if (result.success) {
        // Exercise will be added to library automatically via listener
        // Wait a bit for the listener to update, then add to workout
        setTimeout(() => {
          const newExercise = libraryExercises.find(ex => ex.name === newExerciseForm.name);
          if (newExercise) {
            handleAddLibraryExercise(newExercise);
          }
        }, 500);
      }

      // Reset form
      setNewExerciseForm({
        name: '',
        instructions: '',
        category: 'strength',
        targetMuscleGroups: [],
        equipment: [],
        notes: '',
        isPublic: false
      });
      setIsCreatingExercise(false);
    } catch (error) {
      console.error('Error creating exercise:', error);
      alert('Failed to create exercise. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveWorkoutExercise = (index: number) => {
    setWorkoutExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateWorkoutExerciseParams = (index: number, params: Partial<WorkoutExercise>) => {
    setWorkoutExercises(prev => prev.map((ex, i) => 
      i === index ? { ...ex, ...params } : ex
    ));
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
      // Convert workout exercises to the format expected by the database
      // Filter out undefined values to avoid Firestore errors
      const exercisesForTemplate = workoutExercises.map((we, index) => {
        const exercise: any = {
          ...we.exercise,
          id: we.type === 'custom' ? we.exercise.id : `${we.exercise.id}-${index}`,
          order: index
        };
        
        // Only include defined exercise parameters
        if (we.sets !== undefined) exercise.sets = we.sets;
        if (we.reps !== undefined) exercise.reps = we.reps;
        if (we.duration !== undefined && we.duration > 0) exercise.duration = we.duration;
        if (we.restTime !== undefined) exercise.restTime = we.restTime;
        if (we.weight !== undefined) exercise.weight = we.weight;
        if (we.notes !== undefined && we.notes.trim() !== '') exercise.notes = we.notes;
        
        // Ensure createdAt and updatedAt are properly formatted or removed
        if (exercise.createdAt && typeof exercise.createdAt.toDate === 'function') {
          delete exercise.createdAt;
        }
        if (exercise.updatedAt && typeof exercise.updatedAt.toDate === 'function') {
          delete exercise.updatedAt;
        }
        if (exercise.usageCount === undefined) {
          delete exercise.usageCount;
        }
        
        return exercise;
      });

      const workoutData: any = {
        name: workoutForm.name,
        description: workoutForm.description || '',
        difficulty: workoutForm.difficulty,
        category: workoutForm.category,
        estimatedDuration: workoutForm.estimatedDuration,
        exercises: exercisesForTemplate,
        tags: workoutForm.tags,
        isPublic: workoutForm.isPublic,
        targetMuscleGroups: [...new Set(exercisesForTemplate.flatMap((ex: any) => ex.targetMuscleGroups || []))],
        equipment: [...new Set(exercisesForTemplate.flatMap((ex: any) => ex.equipment || []))]
      };

      if (isEditMode && workoutId) {
        // Update existing workout
        const result = await updateWorkoutTemplate(workoutId, workoutData);
        if (result.success) {
          alert('Workout updated successfully!');
          router.push('/dashboard/trainer');
        } else {
          throw new Error('Failed to update workout');
        }
      } else {
        // Create new workout
        workoutData.createdBy = user.uid;
        workoutData.createdAt = serverTimestamp();
        workoutData.updatedAt = serverTimestamp();
        
        await addDoc(collection(db, 'workout_templates'), workoutData);
        alert('Workout created successfully!');
        router.push('/dashboard/trainer');
      }
    } catch (error) {
      console.error('Error saving workout:', error);
      alert(`Failed to ${isEditMode ? 'update' : 'create'} workout. Please try again.`);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard/trainer">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {isEditMode ? 'Edit Workout' : 'Create New Workout'}
                </h1>
                <p className="text-muted-foreground">
                  {isEditMode ? 'Update your workout template' : 'Build a workout using your exercise library'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('preview')}
                disabled={workoutExercises.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                onClick={handleSaveWorkout}
                disabled={!workoutForm.name || workoutExercises.length === 0 || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Workout'}
              </Button>
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
              Add Exercises ({workoutExercises.length})
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

                <div>
                  <Label htmlFor="duration">Estimated Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    max="180"
                    value={workoutForm.estimatedDuration}
                    onChange={(e) => setWorkoutForm(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 30 }))}
                    className="mt-2"
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

                <div>
                  <Label>Tags</Label>
                  <div className="mt-2 space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a tag..."
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      />
                      <Button onClick={handleAddTag} variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {workoutForm.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {workoutForm.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(tag)}
                              className="text-gray-500 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button
                onClick={() => setCurrentStep('exercises')}
                disabled={!workoutForm.name}
              >
                Next: Add Exercises
                <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            </div>
          </div>
        )}

        {/* Exercises Step - Enhanced with Library */}
        {currentStep === 'exercises' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Exercise Library */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Library className="h-5 w-5 text-primary" />
                        Exercise Library
                      </h3>
                      <p className="text-sm text-gray-600">Select exercises from your library or create new ones</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreatingExercise(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create New
                    </Button>
                  </div>

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
                  <div className="max-h-96 overflow-y-auto space-y-3">
                    {filteredLibraryExercises.length === 0 ? (
                      <div className="text-center py-8">
                        <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">
                          {libraryExercises.length === 0 
                            ? "No exercises in your library yet. Create your first exercise!"
                            : "No exercises match your search."}
                        </p>
                      </div>
                    ) : (
                      filteredLibraryExercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="border rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer"
                          onClick={() => handleAddLibraryExercise(exercise)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {getCategoryIcon(exercise.category)}
                                <h4 className="font-medium">{exercise.name}</h4>
                                {exercise.isPublic && (
                                  <span className="px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                    Public
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{exercise.instructions}</p>
                              {exercise.targetMuscleGroups.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {exercise.targetMuscleGroups.slice(0, 3).map((muscle) => (
                                    <span key={muscle} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                      {muscle}
                                    </span>
                                  ))}
                                  {exercise.targetMuscleGroups.length > 3 && (
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                      +{exercise.targetMuscleGroups.length - 3} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <Button size="sm" variant="outline">
                              Add
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Create Exercise Modal */}
                {isCreatingExercise && (
                  <div className="bg-white rounded-xl border p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Create New Exercise
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => setIsCreatingExercise(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="newExerciseName">Exercise Name *</Label>
                        <Input
                          id="newExerciseName"
                          placeholder="e.g., Burpees"
                          value={newExerciseForm.name}
                          onChange={(e) => setNewExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <select
                          value={newExerciseForm.category}
                          onChange={(e) => setNewExerciseForm(prev => ({ ...prev, category: e.target.value as any }))}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          {EXERCISE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="newExerciseInstructions">Instructions *</Label>
                      <textarea
                        id="newExerciseInstructions"
                        placeholder="How to perform this exercise..."
                        value={newExerciseForm.instructions}
                        onChange={(e) => setNewExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                        className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                      />
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> New exercises are automatically saved to your exercise library for reuse in other workouts.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                      <Button variant="outline" onClick={() => setIsCreatingExercise(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateAndAddExercise}
                        disabled={!newExerciseForm.name || !newExerciseForm.instructions || saving}
                      >
                        {saving ? 'Creating...' : 'Create & Add to Workout'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Exercises Panel */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Selected Exercises ({workoutExercises.length})
                </h3>

                {workoutExercises.length === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 text-sm">
                      No exercises selected yet. Choose from your library or create new ones.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {workoutExercises.map((workoutEx, index) => (
                      <div key={`${workoutEx.exercise.id}-${index}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                              <h4 className="font-medium">{workoutEx.exercise.name}</h4>
                              {workoutEx.type === 'library' && (
                                <span className="px-1 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  Library
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {workoutEx.exercise.instructions.slice(0, 60)}...
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveWorkoutExercise(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {/* Exercise Parameters */}
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <Label className="text-xs">Sets</Label>
                            <Input
                              type="number"
                              min="1"
                              value={workoutEx.sets || ''}
                              onChange={(e) => updateWorkoutExerciseParams(index, { 
                                sets: parseInt(e.target.value) || undefined 
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Reps</Label>
                            <Input
                              type="number"
                              min="1"
                              value={workoutEx.reps || ''}
                              onChange={(e) => updateWorkoutExerciseParams(index, { 
                                reps: parseInt(e.target.value) || undefined 
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Duration (s)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={workoutEx.duration || ''}
                              onChange={(e) => updateWorkoutExerciseParams(index, { 
                                duration: parseInt(e.target.value) || undefined 
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Rest (s)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={workoutEx.restTime || ''}
                              onChange={(e) => updateWorkoutExerciseParams(index, { 
                                restTime: parseInt(e.target.value) || undefined 
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {workoutExercises.length > 0 && (
              <div className="flex justify-between">
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
                  <p className="text-gray-600 mt-1">Review your workout template before saving</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setCurrentStep('exercises')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Edit Exercises
                  </Button>
                  <Button onClick={handleSaveWorkout} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Workout'}
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
                  <div key={`preview-${workoutEx.exercise.id}-${index}`} className="border rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">{workoutEx.exercise.name}</h3>
                          {workoutEx.type === 'library' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              From Library
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-4">{workoutEx.exercise.instructions}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {workoutEx.sets && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="font-semibold text-lg">{workoutEx.sets}</div>
                              <div className="text-sm text-gray-600">Sets</div>
                            </div>
                          )}
                          {workoutEx.reps && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="font-semibold text-lg">{workoutEx.reps}</div>
                              <div className="text-sm text-gray-600">Reps</div>
                            </div>
                          )}
                          {workoutEx.duration && workoutEx.duration > 0 && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="font-semibold text-lg">{workoutEx.duration}s</div>
                              <div className="text-sm text-gray-600">Duration</div>
                            </div>
                          )}
                          {workoutEx.restTime && (
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="font-semibold text-lg">{workoutEx.restTime}s</div>
                              <div className="text-sm text-gray-600">Rest</div>
                            </div>
                          )}
                        </div>
                        
                        {workoutEx.exercise.targetMuscleGroups.length > 0 && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700 mr-2">Target Muscles:</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {workoutEx.exercise.targetMuscleGroups.map((muscle) => (
                                <span key={muscle} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {workoutEx.notes && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-sm font-medium text-yellow-800 mb-1">Workout Notes:</div>
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
  );
}
