'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { 
  db, 
  listenToExercises, 
  createExercise, 
  updateExercise, 
  deleteExercise,
  deactivateExercise,
  reactivateExercise,
  checkExerciseUsage
} from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Dumbbell,
  Heart,
  Wind,
  Zap,
  Activity,
  Save,
  X,
  Archive,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  Exercise,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS,
  EQUIPMENT_CATEGORIES,
  POSTURE_OPTIONS,
  MOVEMENT_PATTERNS,
  PLANE_OF_MOTION,
  MUSCLE_GROUPS_CATEGORIES,
  DIFFICULTY_LEVELS,
  GRIP_TYPES
} from '@/types/workout';

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all'); // all, personal, company
  const [selectedStatus, setSelectedStatus] = useState<string>('active'); // all, active, inactive
  const [sortBy, setSortBy] = useState<string>('name'); // name, date, usage, updated
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New exercise form state
  const [exerciseForm, setExerciseForm] = useState<{
    name: string;
    aliases: string[];
    description: string;
    instructions: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'balance' | 'mobility' | 'plyometric' | 'yoga_pilates';
    videoUrl: string;
    imageUrl: string;
    posture: string;
    primaryMuscles: string[];
    secondaryMuscles: string[];
    muscleGroup: string;
    movementPattern: string;
    planeOfMotion: string;
    armLegType: 'single' | 'double';
    gripType: string;
    equipment: string[];
    notes: string;
    scope: 'personal' | 'company';
  }>({
    name: '',
    aliases: [],
    description: '',
    instructions: '',
    category: 'strength',
    videoUrl: '',
    imageUrl: '',
    posture: '',
    primaryMuscles: [],
    secondaryMuscles: [],
    muscleGroup: '',
    movementPattern: '',
    planeOfMotion: '',
    armLegType: 'double',
    gripType: '',
    equipment: [],
    notes: '',
    scope: 'personal'
  });

  // Helper states for UI
  const [aliasInput, setAliasInput] = useState('');
  const [instructionInput, setInstructionInput] = useState('');
  const [activeEquipmentTab, setActiveEquipmentTab] = useState<keyof typeof EQUIPMENT_CATEGORIES>('none');

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const checkAccess = async () => {
      if (authLoading) {
        return;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      if (!canAccessTrainerDashboard) {
        router.push('/dashboard');
        return;
      }

      try {
        // Listen to exercises and store unsubscribe function
        // includeInactive = true to show both active and inactive exercises
        unsubscribe = listenToExercises(user.uid, (exerciseList) => {
          setExercises(exerciseList);
          setFilteredExercises(exerciseList);
        }, true); // Always include inactive so we can filter them in UI

        // Register with centralized registry
        if (unsubscribe) {
          const { registerListener } = require('@/lib/listener-registry');
          registerListener(unsubscribe);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();

    // Return cleanup function directly to React
    return () => {
      if (unsubscribe) {
        const { unregisterListener } = require('@/lib/listener-registry');
        unregisterListener(unsubscribe);
        unsubscribe();
      }
    };
  }, [user, router, authLoading, canAccessTrainerDashboard]);

  // Filter and sort exercises
  useEffect(() => {
    let filtered = exercises;

    // Apply search filter - searches name, instructions, muscle groups, equipment, and creator
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(exercise => {
        const instructionsText = Array.isArray(exercise.instructions) 
          ? exercise.instructions.join(' ').toLowerCase()
          : String(exercise.instructions || '').toLowerCase();
        
        return exercise.name.toLowerCase().includes(query) ||
          instructionsText.includes(query) ||
          (exercise.primaryMuscles || []).some((muscle: string) => 
            muscle.toLowerCase().includes(query)
          ) ||
          exercise.equipment.some((eq: string) => 
            eq.toLowerCase().includes(query)
          ) ||
          (exercise.createdByName && exercise.createdByName.toLowerCase().includes(query));
      });
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory);
    }

    // Apply scope filter
    if (selectedScope !== 'all') {
      filtered = filtered.filter(exercise => exercise.scope === selectedScope);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        // Show exercises that are active (true or undefined/missing field)
        filtered = filtered.filter(exercise => exercise.isActive !== false);
      } else if (selectedStatus === 'inactive') {
        // Show exercises that are explicitly inactive (false)
        // Use strict equality to only match false, not undefined
        filtered = filtered.filter(exercise => exercise.isActive === false);
      }
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredExercises(filtered);
  }, [exercises, searchQuery, selectedCategory, selectedScope, selectedStatus, sortBy]);

  const resetForm = () => {
    setExerciseForm({
      name: '',
      aliases: [],
      description: '',
      instructions: '',
      category: 'strength',
      videoUrl: '',
      imageUrl: '',
      posture: '',
      primaryMuscles: [],
      secondaryMuscles: [],
      muscleGroup: '',
      movementPattern: '',
      planeOfMotion: '',
      armLegType: 'double',
      gripType: '',
      equipment: [],
      notes: '',
      scope: 'personal'
    });
    setAliasInput('');
    setInstructionInput('');
  };

  const handleCreateExercise = async () => {
    if (!user || !exerciseForm.name || exerciseForm.primaryMuscles.length === 0 || !exerciseForm.muscleGroup || exerciseForm.equipment.length === 0) return;

    // Get user's name from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userName = userDoc.exists() ? userDoc.data().name || user.email || 'Unknown' : user.email || 'Unknown';

    setSaving(true);
    try {
      const result = await createExercise({
        ...exerciseForm,
        createdBy: user.uid,
        createdByName: userName,
        isActive: true
      });

      if (result.success) {
        setIsCreating(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setExerciseForm({
      name: exercise.name,
      aliases: exercise.aliases || [],
      description: exercise.description || '',
      instructions: exercise.instructions || '',
      category: exercise.category,
      videoUrl: exercise.videoUrl || '',
      imageUrl: exercise.imageUrl || '',
      posture: exercise.posture || '',
      primaryMuscles: [...(exercise.primaryMuscles || [])],
      secondaryMuscles: [...(exercise.secondaryMuscles || [])],
      muscleGroup: exercise.muscleGroup || '',
      movementPattern: exercise.movementPattern || '',
      planeOfMotion: exercise.planeOfMotion || '',
      armLegType: exercise.armLegType || 'double',
      gripType: exercise.gripType || '',
      equipment: [...exercise.equipment],
      notes: exercise.notes || '',
      scope: exercise.scope || 'personal'
    });
  };

  const handleUpdateExercise = async () => {
    if (!editingId || !exerciseForm.name || exerciseForm.primaryMuscles.length === 0 || !exerciseForm.muscleGroup || exerciseForm.equipment.length === 0) return;

    setSaving(true);
    try {
      const result = await updateExercise(editingId, exerciseForm);
      if (result.success) {
        setEditingId(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating exercise:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (exerciseId: string) => {
    if (!user) return;
    
    if (confirm('Archive this exercise? It will be hidden from your active library but can be restored later.')) {
      const result = await deactivateExercise(exerciseId, user.uid, canAccessAdminDashboard);
      if (!result.success) {
        alert(result.error || 'Failed to archive exercise');
      }
    }
  };

  const handleReactivate = async (exerciseId: string) => {
    if (!user) return;
    
    const result = await reactivateExercise(exerciseId);
    if (!result.success) {
      alert(result.error || 'Failed to restore exercise');
    }
  };

  const handleDelete = async (exerciseId: string) => {
    if (!user) return;
    
    // Check if exercise is used in workouts
    const usage = await checkExerciseUsage(exerciseId);
    
    if (usage.isUsed) {
      alert(`Cannot delete: This exercise is used in ${usage.usedInWorkouts} workout template(s). Please archive it instead.`);
      return;
    }
    
    if (confirm('⚠️ PERMANENTLY DELETE this exercise? This action cannot be undone.\n\nTo keep the exercise but hide it, use the Archive button instead.')) {
      const result = await deleteExercise(exerciseId, user.uid, canAccessAdminDashboard);
      if (!result.success) {
        alert(result.error || 'Failed to delete exercise');
      }
    }
  };

  const handlePrimaryMuscleToggle = (muscle: string) => {
    setExerciseForm(prev => ({
      ...prev,
      primaryMuscles: prev.primaryMuscles.includes(muscle)
        ? prev.primaryMuscles.filter(m => m !== muscle)
        : [...prev.primaryMuscles, muscle]
    }));
  };

  const handleSecondaryMuscleToggle = (muscle: string) => {
    setExerciseForm(prev => ({
      ...prev,
      secondaryMuscles: prev.secondaryMuscles.includes(muscle)
        ? prev.secondaryMuscles.filter(m => m !== muscle)
        : [...prev.secondaryMuscles, muscle]
    }));
  };

  const handleEquipmentToggle = (equipment: string) => {
    setExerciseForm(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(eq => eq !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const canEditExercise = (exercise: Exercise): boolean => {
    if (!user) return false;
    
    // Personal exercises: only creator can edit
    if (exercise.scope === 'personal') {
      return exercise.createdBy === user.uid;
    }
    
    // Company exercises: creator OR admin can edit
    if (exercise.scope === 'company') {
      return exercise.createdBy === user.uid || canAccessAdminDashboard;
    }
    
    return false;
  };

  const getEditTooltip = (exercise: Exercise): string => {
    if (!user) return 'Not authorized';
    
    if (exercise.scope === 'personal' && exercise.createdBy !== user.uid) {
      return 'Only the creator can edit personal exercises';
    }
    
    if (exercise.scope === 'company') {
      if (exercise.createdBy === user.uid) {
        return 'Edit exercise';
      } else if (canAccessAdminDashboard) {
        return 'Edit exercise (admin)';
      } else {
        return 'Only the creator or admins can edit company exercises';
      }
    }
    
    return 'Edit exercise';
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
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading exercise library...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="exercises" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <Breadcrumb items={[
              { label: 'Training' },
              { label: 'Exercise Library' }
            ]} />
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Exercise Library</h1>
                <p className="text-muted-foreground mt-1">Manage your exercise collection and build reusable workouts</p>
              </div>
              <Button
                onClick={() => setIsCreating(true)}
                disabled={isCreating}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Exercise
              </Button>
            </div>
          </div>

          <div className="space-y-6">
        {/* Summary Stats Bar */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Your Library:</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                {exercises.filter(e => e.isActive !== false).length} Active
              </span>
              <span className="text-gray-400">·</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                {exercises.filter(e => e.isActive === false).length} Inactive
              </span>
              <span className="text-gray-400">·</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                {exercises.filter(e => e.scope === 'personal').length} Personal
              </span>
              <span className="text-gray-400">·</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                {exercises.filter(e => e.scope === 'company').length} Company
              </span>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search exercises by name, instructions, or muscle groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
                aria-label="Filter by category"
              >
                <option value="all">All Categories</option>
                {EXERCISE_CATEGORIES.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
                aria-label="Filter by scope"
              >
                <option value="all">All Exercises</option>
                <option value="personal">My Exercises</option>
                <option value="company">Company Library</option>
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
                aria-label="Filter by status"
              >
                <option value="active">Active Only</option>
                <option value="all">All Status</option>
                <option value="inactive">Inactive Only</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm bg-white hover:bg-gray-50 transition-colors"
                aria-label="Sort by"
              >
                <option value="name">Sort: Name (A-Z)</option>
                <option value="date">Sort: Newest First</option>
                <option value="usage">Sort: Most Used</option>
                <option value="updated">Sort: Recently Updated</option>
              </select>
            </div>
          </div>
        </div>

        {/* Create Exercise Form */}
        {isCreating && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Exercise</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-8">
              {/* SECTION 1: Basic Information */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Exercise Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Barbell Bench Press"
                      value={exerciseForm.name}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      placeholder="Brief overview of the exercise..."
                      value={exerciseForm.description}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full min-h-[80px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                    />
                  </div>

                  {/* Visual Category Selector */}
                  <div>
                    <Label>Exercise Category *</Label>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {EXERCISE_CATEGORIES.map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setExerciseForm(prev => ({ ...prev, category: category.value }))}
                          className={`relative p-2.5 rounded-lg border-2 transition-all duration-200 ${
                            exerciseForm.category === category.value
                              ? 'border-primary shadow-md scale-105'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          } ${
                            category.value === 'strength' ? 'bg-gradient-to-br from-blue-50 to-indigo-100' :
                            category.value === 'cardio' ? 'bg-gradient-to-br from-red-50 to-pink-100' :
                            category.value === 'flexibility' ? 'bg-gradient-to-br from-emerald-50 to-teal-100' :
                            category.value === 'core' ? 'bg-gradient-to-br from-purple-50 to-violet-100' :
                            category.value === 'balance' ? 'bg-gradient-to-br from-amber-50 to-orange-100' :
                            category.value === 'mobility' ? 'bg-gradient-to-br from-teal-50 to-cyan-100' :
                            category.value === 'plyometric' ? 'bg-gradient-to-br from-rose-50 to-red-100' :
                            'bg-gradient-to-br from-indigo-50 to-purple-100'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1.5">
                            <div className={`h-6 w-6 ${
                              category.value === 'strength' ? 'text-blue-600' :
                              category.value === 'cardio' ? 'text-red-600' :
                              category.value === 'flexibility' ? 'text-emerald-600' :
                              category.value === 'core' ? 'text-purple-600' :
                              category.value === 'balance' ? 'text-amber-600' :
                              category.value === 'mobility' ? 'text-teal-600' :
                              category.value === 'plyometric' ? 'text-rose-600' :
                              'text-indigo-600'
                            }`}>
                              {getCategoryIcon(category.value)}
                            </div>
                            <span className={`text-xs font-semibold ${
                              category.value === 'strength' ? 'text-blue-700' :
                              category.value === 'cardio' ? 'text-red-700' :
                              category.value === 'flexibility' ? 'text-emerald-700' :
                              category.value === 'core' ? 'text-purple-700' :
                              category.value === 'balance' ? 'text-amber-700' :
                              category.value === 'mobility' ? 'text-teal-700' :
                              category.value === 'plyometric' ? 'text-rose-700' :
                              'text-indigo-700'
                            }`}>{category.label}</span>
                          </div>
                          {exerciseForm.category === category.value && (
                            <div className="absolute top-1 right-1">
                              <CheckCircle2 className="h-4 w-4 text-primary fill-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Aliases (Alternative Names)</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., Bench, Flat Bench..."
                          value={aliasInput}
                          onChange={(e) => setAliasInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (aliasInput.trim() && !exerciseForm.aliases.includes(aliasInput.trim())) {
                                setExerciseForm(prev => ({ ...prev, aliases: [...prev.aliases, aliasInput.trim()] }));
                                setAliasInput('');
                              }
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (aliasInput.trim() && !exerciseForm.aliases.includes(aliasInput.trim())) {
                              setExerciseForm(prev => ({ ...prev, aliases: [...prev.aliases, aliasInput.trim()] }));
                              setAliasInput('');
                            }
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {exerciseForm.aliases.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {exerciseForm.aliases.map((alias, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-sm flex items-center gap-1">
                              {alias}
                              <button
                                onClick={() => setExerciseForm(prev => ({
                                  ...prev,
                                  aliases: prev.aliases.filter((_, i) => i !== index)
                                }))}
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

                  <div>
                    <Label htmlFor="instructions">Instructions</Label>
                    <textarea
                      id="instructions"
                      placeholder="General instructions for performing the exercise..."
                      value={exerciseForm.instructions}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                      className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="videoUrl">Video URL</Label>
                      <Input
                        id="videoUrl"
                        type="url"
                        placeholder="https://example.com/video.mp4"
                        value={exerciseForm.videoUrl}
                        onChange={(e) => setExerciseForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label htmlFor="imageUrl">Image/Thumbnail URL</Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={exerciseForm.imageUrl}
                        onChange={(e) => setExerciseForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Muscle & Movement Data */}

              {/* SECTION 3: Muscle & Movement Data */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Muscle & Movement Data</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Primary Muscles *</Label>
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                      {MUSCLE_GROUPS.map((muscle) => (
                        <label key={muscle} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={exerciseForm.primaryMuscles.includes(muscle)}
                            onChange={() => handlePrimaryMuscleToggle(muscle)}
                          />
                          <span className="text-sm">{muscle}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Secondary Muscles</Label>
                    <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                      {MUSCLE_GROUPS.map((muscle) => (
                        <label key={muscle} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={exerciseForm.secondaryMuscles.includes(muscle)}
                            onChange={() => handleSecondaryMuscleToggle(muscle)}
                          />
                          <span className="text-sm">{muscle}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Muscle Group Category *</Label>
                    <select
                      value={exerciseForm.muscleGroup}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {MUSCLE_GROUPS_CATEGORIES.map((group) => (
                        <option key={group} value={group.toLowerCase().replace(' ', '_')}>{group}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Movement Pattern</Label>
                    <select
                      value={exerciseForm.movementPattern}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, movementPattern: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {MOVEMENT_PATTERNS.map((pattern) => (
                        <option key={pattern} value={pattern.toLowerCase()}>{pattern}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Plane of Motion</Label>
                    <select
                      value={exerciseForm.planeOfMotion}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, planeOfMotion: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                    >
                      <option value="">Select...</option>
                      {PLANE_OF_MOTION.map((plane) => (
                        <option key={plane} value={plane.toLowerCase()}>{plane}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Equipment & Setup */}
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-4 pb-2 border-b">Equipment & Setup</h4>
                <div className="space-y-4">
                  <div>
                    <Label>Equipment Required *</Label>
                    <div className="mt-2">
                      {/* Equipment Category Tabs */}
                      <div className="flex flex-wrap gap-1 mb-3 border-b pb-2">
                        {Object.entries(EQUIPMENT_CATEGORIES).map(([key, category]) => {
                          const categoryKey = key as keyof typeof EQUIPMENT_CATEGORIES;
                          const selectedCount = category.items.filter(item => 
                            exerciseForm.equipment.includes(item)
                          ).length;
                          
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setActiveEquipmentTab(categoryKey)}
                              className={`px-3 py-1.5 text-xs rounded-t transition-colors relative ${
                                activeEquipmentTab === categoryKey
                                  ? 'bg-primary text-white font-medium'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {category.label}
                              {selectedCount > 0 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                                  activeEquipmentTab === categoryKey
                                    ? 'bg-white text-primary'
                                    : 'bg-primary text-white'
                                }`}>
                                  {selectedCount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Equipment Items Grid */}
                      <div className="border rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          {EQUIPMENT_CATEGORIES[activeEquipmentTab].items.map((equipment) => (
                            <label key={equipment} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={exerciseForm.equipment.includes(equipment)}
                                onChange={() => handleEquipmentToggle(equipment)}
                                className="rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <span className="text-sm">{equipment}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* Selected Equipment Summary */}
                      {exerciseForm.equipment.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {exerciseForm.equipment.length} item{exerciseForm.equipment.length !== 1 ? 's' : ''} selected
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Posture/Position</Label>
                      <select
                        value={exerciseForm.posture}
                        onChange={(e) => setExerciseForm(prev => ({ ...prev, posture: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                      >
                        <option value="">Select...</option>
                        {POSTURE_OPTIONS.map((posture) => (
                          <option key={posture} value={posture.toLowerCase()}>{posture}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Grip Type</Label>
                      <select
                        value={exerciseForm.gripType}
                        onChange={(e) => setExerciseForm(prev => ({ ...prev, gripType: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                      >
                        <option value="">Select...</option>
                        {GRIP_TYPES.map((grip) => (
                          <option key={grip} value={grip.toLowerCase()}>{grip}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label>Single vs Double Arm/Leg</Label>
                    <select
                      value={exerciseForm.armLegType}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, armLegType: e.target.value as 'single' | 'double' }))}
                      className="w-full px-3 py-2 border rounded-md mt-2 text-sm"
                    >
                      <option value="double">Double (Both Arms/Legs)</option>
                      <option value="single">Single (One Arm/Leg at a Time)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Exercise Scope */}
              <div>
                <Label>Exercise Scope</Label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="scope"
                      value="personal"
                      checked={exerciseForm.scope === 'personal'}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, scope: 'personal' }))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Personal Exercise</div>
                      <div className="text-sm text-gray-600">Only you can see and use this</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="scope"
                      value="company"
                      checked={exerciseForm.scope === 'company'}
                      onChange={(e) => setExerciseForm(prev => ({ ...prev, scope: 'company' }))}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">Company Library</div>
                      <div className="text-sm text-gray-600">All trainers can see and use this</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateExercise}
                disabled={!exerciseForm.name || exerciseForm.primaryMuscles.length === 0 || !exerciseForm.muscleGroup || exerciseForm.equipment.length === 0 || saving}
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Exercise'}
              </Button>
            </div>
          </div>
        )}

        {/* Exercise List */}
        <div className="bg-white rounded-xl border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold">Your Exercise Library</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredExercises.length} of {exercises.length} exercises
                  {searchQuery && ` matching "${searchQuery}"`}
                </p>
              </div>
            </div>
          </div>

          {filteredExercises.length === 0 ? (
            <div className="p-12 text-center">
              <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h4 className="text-lg font-semibold text-gray-600 mb-2">
                {exercises.length === 0 ? 'No exercises yet' : 'No exercises found'}
              </h4>
              <p className="text-gray-500 mb-4">
                {exercises.length === 0 
                  ? 'Start building your exercise library by adding your first exercise.' 
                  : 'Try adjusting your search or filters.'}
              </p>
              {exercises.length === 0 && (
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Exercise
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredExercises.map((exercise) => (
                <div key={exercise.id} className="p-6 hover:bg-gray-50 transition-colors">
                  {editingId === exercise.id ? (
                    /* Edit Form - Complete form matching create form */
                    <div className="space-y-6 bg-blue-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center pb-3 border-b border-blue-200">
                        <h4 className="font-semibold text-blue-900">Edit Exercise</h4>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* SECTION 1: Basic Information */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h5>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`edit-name-${exercise.id}`}>Exercise Name *</Label>
                            <Input
                              id={`edit-name-${exercise.id}`}
                              value={exerciseForm.name}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`edit-description-${exercise.id}`}>Description</Label>
                            <textarea
                              id={`edit-description-${exercise.id}`}
                              value={exerciseForm.description}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full min-h-[60px] px-3 py-2 border rounded-md mt-1"
                            />
                          </div>
                          
                          {/* Visual Category Selector */}
                          <div>
                            <Label>Exercise Category *</Label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
                              {EXERCISE_CATEGORIES.map((category) => (
                                <button
                                  key={category.value}
                                  type="button"
                                  onClick={() => setExerciseForm(prev => ({ ...prev, category: category.value }))}
                                  className={`relative p-2 rounded-lg border-2 transition-all duration-200 ${
                                    exerciseForm.category === category.value
                                      ? 'border-primary shadow-md scale-105'
                                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                  } ${
                                    category.value === 'strength' ? 'bg-gradient-to-br from-blue-50 to-indigo-100' :
                                    category.value === 'cardio' ? 'bg-gradient-to-br from-red-50 to-pink-100' :
                                    category.value === 'flexibility' ? 'bg-gradient-to-br from-emerald-50 to-teal-100' :
                                    category.value === 'core' ? 'bg-gradient-to-br from-purple-50 to-violet-100' :
                                    category.value === 'balance' ? 'bg-gradient-to-br from-amber-50 to-orange-100' :
                                    category.value === 'mobility' ? 'bg-gradient-to-br from-teal-50 to-cyan-100' :
                                    category.value === 'plyometric' ? 'bg-gradient-to-br from-rose-50 to-red-100' :
                                    'bg-gradient-to-br from-indigo-50 to-purple-100'
                                  }`}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    <div className={`h-5 w-5 ${
                                      category.value === 'strength' ? 'text-blue-600' :
                                      category.value === 'cardio' ? 'text-red-600' :
                                      category.value === 'flexibility' ? 'text-emerald-600' :
                                      category.value === 'core' ? 'text-purple-600' :
                                      category.value === 'balance' ? 'text-amber-600' :
                                      category.value === 'mobility' ? 'text-teal-600' :
                                      category.value === 'plyometric' ? 'text-rose-600' :
                                      'text-indigo-600'
                                    }`}>
                                      {getCategoryIcon(category.value)}
                                    </div>
                                    <span className={`text-xs font-semibold ${
                                      category.value === 'strength' ? 'text-blue-700' :
                                      category.value === 'cardio' ? 'text-red-700' :
                                      category.value === 'flexibility' ? 'text-emerald-700' :
                                      category.value === 'core' ? 'text-purple-700' :
                                      category.value === 'balance' ? 'text-amber-700' :
                                      category.value === 'mobility' ? 'text-teal-700' :
                                      category.value === 'plyometric' ? 'text-rose-700' :
                                      'text-indigo-700'
                                    }`}>{category.label}</span>
                                  </div>
                                  {exerciseForm.category === category.value && (
                                    <div className="absolute top-0.5 right-0.5">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary" />
                                    </div>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`edit-instructions-${exercise.id}`}>Instructions</Label>
                            <textarea
                              id={`edit-instructions-${exercise.id}`}
                              value={exerciseForm.instructions}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                              className="w-full min-h-[80px] px-3 py-2 border rounded-md mt-1"
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor={`edit-videoUrl-${exercise.id}`}>Video URL</Label>
                              <Input
                                id={`edit-videoUrl-${exercise.id}`}
                                type="url"
                                value={exerciseForm.videoUrl}
                                onChange={(e) => setExerciseForm(prev => ({ ...prev, videoUrl: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-imageUrl-${exercise.id}`}>Image/Thumbnail URL</Label>
                              <Input
                                id={`edit-imageUrl-${exercise.id}`}
                                type="url"
                                value={exerciseForm.imageUrl}
                                onChange={(e) => setExerciseForm(prev => ({ ...prev, imageUrl: e.target.value }))}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: Muscle & Movement Data */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Muscle & Movement Data</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Primary Muscles *</Label>
                            <div className="mt-1 max-h-32 overflow-y-auto border rounded-lg p-2 bg-white">
                              {MUSCLE_GROUPS.map((muscle) => (
                                <label key={muscle} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded text-sm">
                                  <input
                                    type="checkbox"
                                    checked={exerciseForm.primaryMuscles.includes(muscle)}
                                    onChange={() => handlePrimaryMuscleToggle(muscle)}
                                  />
                                  <span>{muscle}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label>Secondary Muscles</Label>
                            <div className="mt-1 max-h-32 overflow-y-auto border rounded-lg p-2 bg-white">
                              {MUSCLE_GROUPS.map((muscle) => (
                                <label key={muscle} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded text-sm">
                                  <input
                                    type="checkbox"
                                    checked={exerciseForm.secondaryMuscles.includes(muscle)}
                                    onChange={() => handleSecondaryMuscleToggle(muscle)}
                                  />
                                  <span>{muscle}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <Label>Muscle Group Category *</Label>
                            <select
                              value={exerciseForm.muscleGroup}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, muscleGroup: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-md mt-1 text-sm bg-white"
                            >
                              <option value="">Select...</option>
                              {MUSCLE_GROUPS_CATEGORIES.map((group) => (
                                <option key={group} value={group.toLowerCase().replace(' ', '_')}>{group}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Movement Pattern</Label>
                            <select
                              value={exerciseForm.movementPattern}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, movementPattern: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-md mt-1 text-sm bg-white"
                            >
                              <option value="">Select...</option>
                              {MOVEMENT_PATTERNS.map((pattern) => (
                                <option key={pattern} value={pattern.toLowerCase()}>{pattern}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: Equipment & Setup */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Equipment & Setup</h5>
                        <div className="space-y-3">
                          <div>
                            <Label>Equipment Required *</Label>
                            <div className="mt-1">
                              {/* Equipment Category Tabs */}
                              <div className="flex flex-wrap gap-1 mb-2 border-b pb-1">
                                {Object.entries(EQUIPMENT_CATEGORIES).map(([key, category]) => {
                                  const categoryKey = key as keyof typeof EQUIPMENT_CATEGORIES;
                                  const selectedCount = category.items.filter(item => 
                                    exerciseForm.equipment.includes(item)
                                  ).length;
                                  
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setActiveEquipmentTab(categoryKey)}
                                      className={`px-2 py-1 text-xs rounded-t transition-colors ${
                                        activeEquipmentTab === categoryKey
                                          ? 'bg-primary text-white font-medium'
                                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                      }`}
                                    >
                                      {category.label}
                                      {selectedCount > 0 && (
                                        <span className={`ml-1 px-1 py-0.5 rounded-full text-xs font-bold ${
                                          activeEquipmentTab === categoryKey
                                            ? 'bg-white text-primary'
                                            : 'bg-primary text-white'
                                        }`}>
                                          {selectedCount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              
                              {/* Equipment Items Grid */}
                              <div className="border rounded-lg p-2 bg-white max-h-40 overflow-y-auto">
                                <div className="grid grid-cols-2 gap-2">
                                  {EQUIPMENT_CATEGORIES[activeEquipmentTab].items.map((equipment) => (
                                    <label key={equipment} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded cursor-pointer text-sm">
                                      <input
                                        type="checkbox"
                                        checked={exerciseForm.equipment.includes(equipment)}
                                        onChange={() => handleEquipmentToggle(equipment)}
                                        className="rounded border-gray-300"
                                      />
                                      <span>{equipment}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                              {exerciseForm.equipment.length > 0 && (
                                <div className="mt-1 text-xs text-gray-600">
                                  {exerciseForm.equipment.length} item{exerciseForm.equipment.length !== 1 ? 's' : ''} selected
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Posture/Position</Label>
                              <select
                                value={exerciseForm.posture}
                                onChange={(e) => setExerciseForm(prev => ({ ...prev, posture: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md mt-1 text-sm bg-white"
                              >
                                <option value="">Select...</option>
                                {POSTURE_OPTIONS.map((posture) => (
                                  <option key={posture} value={posture.toLowerCase()}>{posture}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Grip Type</Label>
                              <select
                                value={exerciseForm.gripType}
                                onChange={(e) => setExerciseForm(prev => ({ ...prev, gripType: e.target.value }))}
                                className="w-full px-3 py-2 border rounded-md mt-1 text-sm bg-white"
                              >
                                <option value="">Select...</option>
                                {GRIP_TYPES.map((grip) => (
                                  <option key={grip} value={grip.toLowerCase()}>{grip}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div>
                            <Label>Single vs Double Arm/Leg</Label>
                            <select
                              value={exerciseForm.armLegType}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, armLegType: e.target.value as 'single' | 'double' }))}
                              className="w-full px-3 py-2 border rounded-md mt-1 text-sm bg-white"
                            >
                              <option value="double">Double (Both Arms/Legs)</option>
                              <option value="single">Single (One Arm/Leg at a Time)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Exercise Scope */}
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900 mb-3">Exercise Scope</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <label className="flex items-start gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                            <input
                              type="radio"
                              name={`scope-${exercise.id}`}
                              value="personal"
                              checked={exerciseForm.scope === 'personal'}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, scope: 'personal' }))}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Personal Exercise</div>
                              <div className="text-xs text-gray-600">Only you can see and use this</div>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors bg-white">
                            <input
                              type="radio"
                              name={`scope-${exercise.id}`}
                              value="company"
                              checked={exerciseForm.scope === 'company'}
                              onChange={(e) => setExerciseForm(prev => ({ ...prev, scope: 'company' }))}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium">Company Library</div>
                              <div className="text-xs text-gray-600">All trainers can see and use this</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-blue-200">
                        <Button variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleUpdateExercise}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(exercise.category)}
                            <h4 className="font-semibold text-lg">{exercise.name}</h4>
                            {/* Status Badge */}
                            {exercise.isActive === false && (
                              <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-medium">
                                Inactive
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            EXERCISE_CATEGORIES.find(cat => cat.value === exercise.category)?.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            EXERCISE_CATEGORIES.find(cat => cat.value === exercise.category)?.color === 'red' ? 'bg-red-100 text-red-800' :
                            EXERCISE_CATEGORIES.find(cat => cat.value === exercise.category)?.color === 'green' ? 'bg-green-100 text-green-800' :
                            EXERCISE_CATEGORIES.find(cat => cat.value === exercise.category)?.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {EXERCISE_CATEGORIES.find(cat => cat.value === exercise.category)?.label}
                          </span>
                          {exercise.scope === 'company' ? (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full font-medium">
                              Company Library
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              Personal
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          {exercise.createdByName && (
                            <>
                              <span>Created by {exercise.createdByName}</span>
                              {exercise.createdAt && (
                                <>
                                  <span>·</span>
                                  <span>{new Date(exercise.createdAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </>
                          )}
                          {exercise.updatedAt && exercise.updatedAt !== exercise.createdAt && (
                            <>
                              <span>·</span>
                              <span className="text-blue-600">Updated {new Date(exercise.updatedAt).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                        
                        {exercise.description && (
                          <p className="text-gray-600 mb-2">{exercise.description}</p>
                        )}
                        
                        {exercise.instructions && (
                          <div className="mb-3">
                            <span className="text-sm font-medium text-gray-700">Instructions:</span>
                            {Array.isArray(exercise.instructions) ? (
                              <ol className="list-decimal list-inside text-sm text-gray-600 mt-1 space-y-1">
                                {exercise.instructions.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                            ) : (
                              <p className="text-sm text-gray-600 mt-1">{exercise.instructions}</p>
                            )}
                          </div>
                        )}
                        
                        {(exercise.primaryMuscles || []).length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 mr-2">Primary Muscles:</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {(exercise.primaryMuscles || []).map((muscle: string) => (
                                <span key={muscle} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {(exercise.secondaryMuscles || []).length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 mr-2">Secondary Muscles:</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {(exercise.secondaryMuscles || []).map((muscle: string) => (
                                <span key={muscle} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                  {muscle}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {exercise.equipment.length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 mr-2">Equipment:</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {exercise.equipment.map((eq) => (
                                <span key={eq} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  {eq}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mt-2">
                          Used in {exercise.usageCount || 0} workout{(exercise.usageCount || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditExercise(exercise)}
                          disabled={!canEditExercise(exercise)}
                          title={getEditTooltip(exercise)}
                          className={!canEditExercise(exercise) 
                            ? "text-gray-400 cursor-not-allowed" 
                            : ""}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Archive/Restore Button */}
                        {exercise.isActive !== false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivate(exercise.id)}
                            disabled={!canEditExercise(exercise)}
                            title={!canEditExercise(exercise)
                              ? 'Only the creator or admins can archive exercises'
                              : 'Archive exercise (reversible)'}
                            className={!canEditExercise(exercise)
                              ? "text-gray-400 cursor-not-allowed" 
                              : "text-orange-600 hover:text-orange-700"}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivate(exercise.id)}
                            disabled={!canEditExercise(exercise)}
                            title={!canEditExercise(exercise)
                              ? 'Only the creator or admins can restore exercises'
                              : 'Restore exercise to active library'}
                            className={!canEditExercise(exercise)
                              ? "text-gray-400 cursor-not-allowed" 
                              : "text-blue-600 hover:text-blue-700"}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(exercise.id)}
                          disabled={!canEditExercise(exercise)}
                          title={!canEditExercise(exercise)
                            ? 'Only the creator or admins can delete exercises'
                            : 'Permanently delete exercise (cannot be undone)'}
                          className={!canEditExercise(exercise)
                            ? "text-gray-400 cursor-not-allowed" 
                            : "text-red-500 hover:text-red-700"}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
          </div>
        </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
