'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { db, listenToExercises, createExercise, updateExercise, deleteExercise } from '@/lib/firebase';
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
  X
} from 'lucide-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import {
  Exercise,
  EXERCISE_CATEGORIES,
  MUSCLE_GROUPS,
  EQUIPMENT_OPTIONS
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
  const [sortBy, setSortBy] = useState<string>('name'); // name, date, usage, updated
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New exercise form state
  const [exerciseForm, setExerciseForm] = useState<{
    name: string;
    instructions: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
    targetMuscleGroups: string[];
    equipment: string[];
    notes: string;
    scope: 'personal' | 'company';
  }>({
    name: '',
    instructions: '',
    category: 'strength',
    targetMuscleGroups: [],
    equipment: [],
    notes: '',
    scope: 'personal'
  });

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
        unsubscribe = listenToExercises(user.uid, (exerciseList) => {
          setExercises(exerciseList);
          setFilteredExercises(exerciseList);
        });

        setLoading(false);
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();

    // Return cleanup function directly to React
    return () => {
      if (unsubscribe) {
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
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(query) ||
        exercise.instructions.toLowerCase().includes(query) ||
        exercise.targetMuscleGroups.some(muscle => 
          muscle.toLowerCase().includes(query)
        ) ||
        exercise.equipment.some(eq => 
          eq.toLowerCase().includes(query)
        ) ||
        (exercise.createdByName && exercise.createdByName.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedCategory);
    }

    // Apply scope filter
    if (selectedScope !== 'all') {
      filtered = filtered.filter(exercise => exercise.scope === selectedScope);
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
  }, [exercises, searchQuery, selectedCategory, selectedScope, sortBy]);

  const resetForm = () => {
    setExerciseForm({
      name: '',
      instructions: '',
      category: 'strength',
      targetMuscleGroups: [],
      equipment: [],
      notes: '',
      scope: 'personal'
    });
  };

  const handleCreateExercise = async () => {
    if (!user || !exerciseForm.name || !exerciseForm.instructions) return;

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
      instructions: exercise.instructions,
      category: exercise.category,
      targetMuscleGroups: [...exercise.targetMuscleGroups],
      equipment: [...exercise.equipment],
      notes: exercise.notes || '',
      scope: exercise.scope || 'personal'
    });
  };

  const handleUpdateExercise = async () => {
    if (!editingId || !exerciseForm.name || !exerciseForm.instructions) return;

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

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise? This action cannot be undone.')) return;

    try {
      const result = await deleteExercise(exerciseId);
      if (!result.success) {
        console.error('Failed to delete exercise');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
    }
  };

  const handleMuscleGroupToggle = (muscle: string) => {
    setExerciseForm(prev => ({
      ...prev,
      targetMuscleGroups: prev.targetMuscleGroups.includes(muscle)
        ? prev.targetMuscleGroups.filter(m => m !== muscle)
        : [...prev.targetMuscleGroups, muscle]
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

          <div className="space-y-6">
        {/* Summary Stats Bar */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">Your Library:</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                {exercises.filter(e => e.scope === 'personal').length} Personal
              </span>
              <span className="text-gray-400">·</span>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                {exercises.filter(e => e.scope === 'company').length} Company
              </span>
              <span className="text-gray-400">·</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full font-medium">
                {exercises.length} Total
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Exercise Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Push-ups"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="instructions">Instructions *</Label>
                  <textarea
                    id="instructions"
                    placeholder="Describe how to perform this exercise..."
                    value={exerciseForm.instructions}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                    className="w-full min-h-[100px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {EXERCISE_CATEGORIES.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => setExerciseForm(prev => ({ ...prev, category: category.value }))}
                        className={`p-2 rounded-lg border text-sm transition-colors ${
                          exerciseForm.category === category.value
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div>
                  <Label>Target Muscle Groups</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {MUSCLE_GROUPS.map((muscle) => (
                      <label key={muscle} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={exerciseForm.targetMuscleGroups.includes(muscle)}
                          onChange={() => handleMuscleGroupToggle(muscle)}
                        />
                        <span className="text-sm">{muscle}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Equipment Needed</Label>
                  <div className="mt-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                    {EQUIPMENT_OPTIONS.map((equipment) => (
                      <label key={equipment} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                        <input
                          type="checkbox"
                          checked={exerciseForm.equipment.includes(equipment)}
                          onChange={() => handleEquipmentToggle(equipment)}
                        />
                        <span className="text-sm">{equipment}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <textarea
                    id="notes"
                    placeholder="Additional notes, tips, or modifications..."
                    value={exerciseForm.notes}
                    onChange={(e) => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full min-h-[60px] px-3 py-2 border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <Label>Exercise Scope</Label>
                  <div className="mt-2 space-y-2">
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
                        <div className="text-sm text-gray-600">Only you can see and use this exercise</div>
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
                        <div className="text-sm text-gray-600">All trainers can see and use this exercise</div>
                      </div>
                    </label>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateExercise}
                disabled={!exerciseForm.name || !exerciseForm.instructions || saving}
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
                    /* Edit Form - Similar to create form but inline */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`edit-name-${exercise.id}`}>Exercise Name</Label>
                          <Input
                            id={`edit-name-${exercise.id}`}
                            value={exerciseForm.name}
                            onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Category</Label>
                          <select
                            value={exerciseForm.category}
                            onChange={(e) => setExerciseForm(prev => ({ ...prev, category: e.target.value as any }))}
                            className="w-full px-3 py-2 border rounded-md"
                          >
                            {EXERCISE_CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor={`edit-instructions-${exercise.id}`}>Instructions</Label>
                        <textarea
                          id={`edit-instructions-${exercise.id}`}
                          value={exerciseForm.instructions}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                          className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div className="flex justify-end gap-3">
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
                        
                        <p className="text-gray-600 mb-3">{exercise.instructions}</p>
                        
                        {exercise.targetMuscleGroups.length > 0 && (
                          <div className="mb-2">
                            <span className="text-sm font-medium text-gray-700 mr-2">Target Muscles:</span>
                            <div className="inline-flex flex-wrap gap-1">
                              {exercise.targetMuscleGroups.map((muscle) => (
                                <span key={muscle} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExercise(exercise.id)}
                          disabled={(exercise.usageCount || 0) > 0}
                          title={(exercise.usageCount || 0) > 0 
                            ? `Used in ${exercise.usageCount} workout${exercise.usageCount !== 1 ? 's' : ''} - cannot delete` 
                            : 'Delete exercise'}
                          className={(exercise.usageCount || 0) > 0 
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
