'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  listenToWorkoutTemplates, 
  deleteWorkoutTemplate,
  deactivateWorkoutTemplate,
  reactivateWorkoutTemplate,
  checkWorkoutUsage
} from '@/lib/firebase';
import { isTimeBased, formatSetPrescription } from '@/types/workout';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { 
  Plus,
  Search,
  Dumbbell,
  Clock,
  Target,
  Eye,
  Edit,
  Trash2,
  Tag,
  Heart,
  Zap,
  Wind,
  Activity,
  X,
  Archive,
  ArchiveRestore
} from 'lucide-react';

export default function WorkoutLibraryPage() {
  const router = useRouter();
  const { user, userData, loading: authLoading, canAccessTrainerDashboard, canAccessAdminDashboard } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<any[]>([]);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('active'); // active, all, inactive
  const [selectedScope, setSelectedScope] = useState<string>('all'); // all, personal, company
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [sortBy, setSortBy] = useState<string>('modified'); // modified, name, used
  const [exerciseLibrary, setExerciseLibrary] = useState<Map<string, any>>(new Map());

  useEffect(() => {
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
        // Listen to workout templates (includeInactive = true to show both active and inactive)
        const unsubscribe = listenToWorkoutTemplates(user.uid, (templates) => {
          setWorkoutTemplates(templates);
          setFilteredWorkouts(templates);
        }, true);

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

    // Cleanup function
    return () => {
      // The unsubscribe function is created in checkAccess, so we need to track it
      // For now, we'll rely on the centralized cleanup on sign out
    };
  }, [user, router, authLoading, canAccessTrainerDashboard]);

  // Filter and sort workouts
  useEffect(() => {
    let filtered = workoutTemplates;

    // Status filter
    if (selectedStatus === 'active') {
      filtered = filtered.filter(workout => workout.isActive !== false);
    } else if (selectedStatus === 'inactive') {
      filtered = filtered.filter(workout => workout.isActive === false);
    }

    // Scope filter
    if (selectedScope === 'personal') {
      filtered = filtered.filter(workout => workout.scope === 'personal');
    } else if (selectedScope === 'company') {
      filtered = filtered.filter(workout => workout.scope === 'company');
    }

    // Search filter
    if (workoutSearchQuery) {
      filtered = filtered.filter(workout =>
        workout.name.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
        workout.description?.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
        workout.tags?.some((tag: string) => tag.toLowerCase().includes(workoutSearchQuery.toLowerCase()))
      );
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(workout => workout.difficulty === selectedDifficulty);
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(workout => workout.category === selectedCategory);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'used':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'modified':
        default:
          const aDate = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
      }
    });

    setFilteredWorkouts(sorted);
  }, [workoutTemplates, workoutSearchQuery, selectedDifficulty, selectedCategory, selectedStatus, selectedScope, sortBy]);

  const handleDeactivateWorkout = async (workoutId: string) => {
    if (!user) return;
    
    if (confirm('Archive this workout? It will be hidden from your active library but can be restored later.')) {
      const result = await deactivateWorkoutTemplate(workoutId, user.uid, canAccessAdminDashboard);
      if (result.success) {
        toast({
          title: "Workout Archived",
          description: "Workout archived successfully",
        });
      } else {
        toast({
          title: "Archive Failed",
          description: result.error || "Failed to archive workout",
          variant: "destructive",
        });
      }
    }
  };

  const handleReactivateWorkout = async (workoutId: string) => {
    if (!user) return;
    
    const result = await reactivateWorkoutTemplate(workoutId);
    if (result.success) {
      toast({
        title: "Workout Restored",
        description: "Workout restored successfully",
      });
    } else {
      toast({
        title: "Restore Failed",
        description: result.error || "Failed to restore workout",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    if (!user) return;
    
    try {
      // Check if workout is used anywhere (future: check assignments/programs)
      const usage = await checkWorkoutUsage(workoutId);
      
      if (usage.isUsed) {
        toast({
          title: "Cannot Delete Workout",
          description: `This workout is used in ${usage.usedInAssignments} assignment(s). Please archive it instead.`,
          variant: "destructive",
        });
        return;
      }
      
      if (confirm('⚠️ PERMANENTLY DELETE this workout? This action cannot be undone.\n\nTo keep the workout but hide it, use the Archive button instead.')) {
        const result = await deleteWorkoutTemplate(workoutId, user.uid, canAccessAdminDashboard);
        if (result.success) {
          toast({
            title: "Workout Deleted",
            description: "Workout deleted successfully",
          });
        } else {
          toast({
            title: "Delete Failed",
            description: result.error || "Failed to delete workout",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      // Handle errors from checkWorkoutUsage (e.g., permission errors, network issues)
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to verify workout usage. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'strength': return <Dumbbell className="h-4 w-4" />;
      case 'cardio': return <Heart className="h-4 w-4" />;
      case 'hiit': return <Zap className="h-4 w-4" />;
      case 'flexibility': return <Wind className="h-4 w-4" />;
      case 'mixed': return <Activity className="h-4 w-4" />;
      default: return <Dumbbell className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Load exercise library when workout modal opens
  useEffect(() => {
    const loadExercises = async () => {
      if (selectedWorkout && exerciseLibrary.size === 0) {
        try {
          const exercisesRef = collection(db, 'exercises');
          const snapshot = await getDocs(exercisesRef);
          const exerciseMap = new Map();
          snapshot.docs.forEach(doc => {
            exerciseMap.set(doc.id, { id: doc.id, ...doc.data() });
          });
          setExerciseLibrary(exerciseMap);
        } catch (error) {
          console.error('Error loading exercise library:', error);
        }
      }
    };
    loadExercises();
  }, [selectedWorkout]);

  // Function to get exercise name from ID
  const getExerciseName = (exerciseId: string) => {
    const exercise = exerciseLibrary.get(exerciseId);
    return exercise?.name || exerciseId || 'Unknown Exercise';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading workout library...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <TrainerSidebar currentPage="workouts" />
      <SidebarInset>
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <Breadcrumb items={[
              { label: 'Training' },
              { label: 'Workout Library' }
            ]} />
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Workout Library</h1>
                <p className="text-muted-foreground mt-1">Create and manage your workout library</p>
              </div>
              <Link href="/dashboard/trainer/workouts/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Workout
                </Button>
              </Link>
            </div>
          </div>

          {/* Summary Stats Bar */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-4">
            <div className="flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">Your Library:</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  {workoutTemplates.filter(w => w.isActive !== false).length} Active
                </span>
                <span className="text-gray-400">·</span>
                <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                  {workoutTemplates.filter(w => w.isActive === false).length} Inactive
                </span>
                <span className="text-gray-400">·</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                  {workoutTemplates.filter(w => w.scope === 'personal').length} Personal
                </span>
                <span className="text-gray-400">·</span>
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full font-medium">
                  {workoutTemplates.filter(w => w.scope === 'company').length} Company
                </span>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          {workoutTemplates.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search workouts by name, description, or tags..."
                    value={workoutSearchQuery}
                    onChange={(e) => setWorkoutSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Status & Scope Filters + Sort */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
                      aria-label="Filter by status"
                    >
                      <option value="active">Active Only</option>
                      <option value="all">All Status</option>
                      <option value="inactive">Inactive Only</option>
                    </select>
                    
                    <select
                      value={selectedScope}
                      onChange={(e) => setSelectedScope(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
                      aria-label="Filter by scope"
                    >
                      <option value="all">All Workouts</option>
                      <option value="personal">My Workouts</option>
                      <option value="company">Company Library</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-3 py-2 border rounded-lg text-sm bg-white hover:bg-gray-50 transition-colors"
                    >
                      <option value="modified">Recently Modified</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="used">Most Used</option>
                    </select>
                  </div>
                </div>

                {/* Difficulty Filter Row */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Difficulty:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedDifficulty('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === 'all' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedDifficulty('beginner')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === 'beginner' 
                            ? 'bg-green-500 text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:shadow-sm'
                        }`}
                      >
                        Beginner
                      </button>
                      <button
                        onClick={() => setSelectedDifficulty('intermediate')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === 'intermediate' 
                            ? 'bg-yellow-500 text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-yellow-300 hover:shadow-sm'
                        }`}
                      >
                        Intermediate
                      </button>
                      <button
                        onClick={() => setSelectedDifficulty('advanced')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedDifficulty === 'advanced' 
                            ? 'bg-red-500 text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-sm'
                        }`}
                      >
                        Advanced
                      </button>
                    </div>
                  </div>
                </div>

                {/* Category Filter Row */}
                <div className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-4 border">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700 min-w-[80px]">Category:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selectedCategory === 'all' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setSelectedCategory('strength')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                          selectedCategory === 'strength' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-sm'
                        }`}
                      >
                        <Dumbbell className="h-4 w-4" />
                        Strength
                      </button>
                      <button
                        onClick={() => setSelectedCategory('cardio')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                          selectedCategory === 'cardio' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:shadow-sm'
                        }`}
                      >
                        <Heart className="h-4 w-4" />
                        Cardio
                      </button>
                      <button
                        onClick={() => setSelectedCategory('hiit')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                          selectedCategory === 'hiit' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-yellow-300 hover:shadow-sm'
                        }`}
                      >
                        <Zap className="h-4 w-4" />
                        HIIT
                      </button>
                      <button
                        onClick={() => setSelectedCategory('flexibility')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                          selectedCategory === 'flexibility' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:shadow-sm'
                        }`}
                      >
                        <Wind className="h-4 w-4" />
                        Flexibility
                      </button>
                      <button
                        onClick={() => setSelectedCategory('mixed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                          selectedCategory === 'mixed' 
                            ? 'bg-primary text-white shadow-md' 
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:shadow-sm'
                        }`}
                      >
                        <Activity className="h-4 w-4" />
                        Mixed
                      </button>
                    </div>
                  </div>
                </div>

                {/* Results Count */}
                <div className="text-sm text-gray-600 pt-2 border-t">
                  Showing <span className="font-semibold text-gray-900">{filteredWorkouts.length}</span> of <span className="font-semibold text-gray-900">{workoutTemplates.length}</span> workout{workoutTemplates.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Section Header */}
          {filteredWorkouts.length > 0 && (
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 p-4 sticky top-0 z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <Dumbbell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Workout Library
                </h2>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {filteredWorkouts.length} {filteredWorkouts.length === 1 ? 'Workout' : 'Workouts'}
                </span>
              </div>
            </div>
          )}

          {/* Workout Cards Grid */}
          {filteredWorkouts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="bg-white rounded-xl border hover:shadow-lg transition-all group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1 line-clamp-1">{workout.name}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(workout.difficulty)}`}>
                            {workout.difficulty}
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
                            {getCategoryIcon(workout.category)}
                            {workout.category}
                          </span>
                          {workout.isActive === false && (
                            <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full font-medium">
                              Inactive
                            </span>
                          )}
                          {workout.scope === 'company' ? (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full font-medium">
                              Company Library
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                              Personal
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {workout.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{workout.description}</p>
                    )}

                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Dumbbell className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-gray-700 font-medium whitespace-nowrap">{workout.exercises?.length || 0} exercises</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-gray-700 font-medium whitespace-nowrap">
                            {workout.estimatedDuration ? `${workout.estimatedDuration} min` : 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <Activity className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-gray-700 font-medium whitespace-nowrap">Used {workout.usageCount || 0}×</span>
                        </div>
                      </div>
                    </div>

                    {workout.tags && workout.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {workout.tags.slice(0, 3).map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                        {workout.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            +{workout.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-2 pt-4 border-t">
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Link href={`/dashboard/trainer/workouts/create?id=${workout.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        {workout.isActive !== false ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeactivateWorkout(workout.id)}
                            title="Archive workout (reversible)"
                          >
                            <Archive className="h-4 w-4 text-orange-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReactivateWorkout(workout.id)}
                            title="Restore workout to active library"
                          >
                            <ArchiveRestore className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        <div
                          title={(workout.usageCount || 0) > 0 
                            ? `Cannot delete: Used in ${workout.usageCount} assignment(s). Archive instead.`
                            : "Permanently delete workout (cannot be undone)"
                          }
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkout(workout.id)}
                            disabled={(workout.usageCount || 0) > 0}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : workoutTemplates.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Dumbbell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Workouts Yet</h3>
              <p className="text-gray-600 mb-6">Create your first workout template to get started!</p>
              <Link href="/dashboard/trainer/workouts/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Workout
                </Button>
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Workouts Found</h3>
              <p className="text-gray-600 mb-6">Try adjusting your search or filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setWorkoutSearchQuery('');
                  setSelectedDifficulty('all');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}

          {/* Comprehensive Workout Detail View */}
          {selectedWorkout && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWorkout(null)}>
              <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold mb-2">{selectedWorkout.name}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedWorkout.difficulty)}`}>
                          {selectedWorkout.difficulty}
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize flex items-center gap-1">
                          {getCategoryIcon(selectedWorkout.category)}
                          {selectedWorkout.category}
                        </span>
                        {selectedWorkout.isActive === false && (
                          <span className="px-3 py-1 bg-gray-500 text-white text-sm rounded-full font-medium">Inactive</span>
                        )}
                        {selectedWorkout.scope === 'company' && (
                          <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full font-medium">Company Library</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedWorkout(null)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Metadata Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg border p-3">
                      <div className="text-xs text-gray-500 mb-1">Duration</div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-semibold">
                          {selectedWorkout.estimatedDuration ? `${selectedWorkout.estimatedDuration} min` : 'Not set'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                      <div className="text-xs text-gray-500 mb-1">Exercises</div>
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{selectedWorkout.exercises?.length || 0}</span>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg border p-3">
                      <div className="text-xs text-gray-500 mb-1">Usage Count</div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{selectedWorkout.usageCount || 0}×</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Description */}
                  {selectedWorkout.description && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        Description
                      </h3>
                      <p className="text-gray-600">{selectedWorkout.description}</p>
                    </div>
                  )}

                  {/* Tags */}
                  {selectedWorkout.tags && selectedWorkout.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary"></div>
                        Tags
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkout.tags.map((tag: string) => (
                          <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exercise Breakdown */}
                  <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary"></div>
                      Exercise Breakdown ({selectedWorkout.exercises?.length || 0} exercises)
                    </h3>
                    <div className="space-y-4">
                      {selectedWorkout.exercises?.map((workoutExercise: any, index: number) => {
                        // Get full exercise data from library
                        const exercise = workoutExercise.exerciseId 
                          ? exerciseLibrary.get(workoutExercise.exerciseId)
                          : null;
                        const exerciseName = exercise?.name || workoutExercise.name || 'Unknown Exercise';
                        
                        return (
                          <div key={index} className="border rounded-xl overflow-hidden bg-white">
                            <div className="bg-gray-50 px-4 py-3 border-b">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                                  {index + 1}
                                </div>
                                <h4 className="font-semibold text-lg flex-1">{exerciseName}</h4>
                              </div>
                              
                              {/* Exercise Metadata - Compact 4-Column Grid */}
                              {exercise && (
                                <div className="ml-11 grid grid-cols-4 gap-4 text-xs">
                                  {/* Category Column */}
                                  <div>
                                    <div className="text-gray-500 font-medium mb-1">Category</div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded font-medium flex items-center gap-1 w-fit">
                                      {getCategoryIcon(exercise.category)}
                                      {exercise.category}
                                    </span>
                                  </div>
                                  
                                  {/* Muscle Group Column */}
                                  <div>
                                    <div className="text-gray-500 font-medium mb-1">Muscle Group</div>
                                    {exercise.muscleGroup ? (
                                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded font-medium inline-block">
                                        {exercise.muscleGroup.replace('_', ' ')}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                  
                                  {/* Equipment Column */}
                                  <div>
                                    <div className="text-gray-500 font-medium mb-1">Equipment</div>
                                    {exercise.equipment && exercise.equipment.length > 0 && exercise.equipment[0] !== 'none' ? (
                                      <div className="flex flex-wrap gap-1">
                                        {exercise.equipment.map((eq: string) => (
                                          <span key={eq} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                                            {eq.replace('_', ' ')}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">None</span>
                                    )}
                                  </div>
                                  
                                  {/* Primary Muscles Column */}
                                  <div>
                                    <div className="text-gray-500 font-medium mb-1">Targets</div>
                                    {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {exercise.primaryMuscles.map((muscle: string) => (
                                          <span key={muscle} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                                            {muscle.replace('_', ' ')}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {workoutExercise.notes && (
                              <div className="p-4">
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <div className="text-xs font-semibold text-yellow-800 mb-1">Coaching Notes:</div>
                                  <div className="text-sm text-yellow-700">{workoutExercise.notes}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50">
                  <div className="flex gap-3">
                    <Link href={`/dashboard/trainer/workouts/create?id=${selectedWorkout.id}`} className="flex-1">
                      <Button variant="default" className="w-full">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Workout
                      </Button>
                    </Link>
                    {selectedWorkout.isActive !== false ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleDeactivateWorkout(selectedWorkout.id);
                          setSelectedWorkout(null);
                        }}
                      >
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          handleReactivateWorkout(selectedWorkout.id);
                          setSelectedWorkout(null);
                        }}
                      >
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedWorkout(null)}
                    >
                      Close
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
