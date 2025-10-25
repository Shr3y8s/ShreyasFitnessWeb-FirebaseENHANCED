'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { db, listenToWorkoutTemplates, deleteWorkoutTemplate } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
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
  X
} from 'lucide-react';

export default function WorkoutLibraryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<any[]>([]);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);

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

          // Listen to workout templates
          const unsubscribe = listenToWorkoutTemplates(user.uid, (templates) => {
            setWorkoutTemplates(templates);
            setFilteredWorkouts(templates);
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

  // Filter workouts based on search and filters
  useEffect(() => {
    let filtered = workoutTemplates;

    if (workoutSearchQuery) {
      filtered = filtered.filter(workout =>
        workout.name.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
        workout.description?.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
        workout.tags?.some((tag: string) => tag.toLowerCase().includes(workoutSearchQuery.toLowerCase()))
      );
    }

    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(workout => workout.difficulty === selectedDifficulty);
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(workout => workout.category === selectedCategory);
    }

    setFilteredWorkouts(filtered);
  }, [workoutTemplates, workoutSearchQuery, selectedDifficulty, selectedCategory]);

  const handleDeleteWorkout = async (workoutId: string) => {
    if (confirm('Are you sure you want to delete this workout? This action cannot be undone.')) {
      const result = await deleteWorkoutTemplate(workoutId);
      if (result.success) {
        alert('Workout deleted successfully!');
      } else {
        alert('Failed to delete workout. Please try again.');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading workout library...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="workouts" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Workout Library</h1>
              <p className="text-gray-600 mt-1">{workoutTemplates.length} workout{workoutTemplates.length !== 1 ? 's' : ''} total</p>
            </div>
            <Link href="/dashboard/trainer/workouts/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Workout
              </Button>
            </Link>
          </div>

          {/* Search and Filters */}
          {workoutTemplates.length > 0 && (
            <div className="bg-white rounded-xl border p-6">
              <div className="space-y-4">
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

                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">Difficulty:</span>
                    <button
                      onClick={() => setSelectedDifficulty('all')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedDifficulty === 'all' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedDifficulty('beginner')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedDifficulty === 'beginner' ? 'bg-green-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Beginner
                    </button>
                    <button
                      onClick={() => setSelectedDifficulty('intermediate')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedDifficulty === 'intermediate' ? 'bg-yellow-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Intermediate
                    </button>
                    <button
                      onClick={() => setSelectedDifficulty('advanced')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedDifficulty === 'advanced' ? 'bg-red-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Advanced
                    </button>
                  </div>

                  <div className="h-6 w-px bg-gray-300 mx-2" />

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">Category:</span>
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === 'all' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedCategory('strength')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                        selectedCategory === 'strength' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Dumbbell className="h-3 w-3" />
                      Strength
                    </button>
                    <button
                      onClick={() => setSelectedCategory('cardio')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                        selectedCategory === 'cardio' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Heart className="h-3 w-3" />
                      Cardio
                    </button>
                    <button
                      onClick={() => setSelectedCategory('hiit')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                        selectedCategory === 'hiit' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      HIIT
                    </button>
                    <button
                      onClick={() => setSelectedCategory('flexibility')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                        selectedCategory === 'flexibility' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Wind className="h-3 w-3" />
                      Flexibility
                    </button>
                    <button
                      onClick={() => setSelectedCategory('mixed')}
                      className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 transition-colors ${
                        selectedCategory === 'mixed' ? 'bg-primary text-white' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <Activity className="h-3 w-3" />
                      Mixed
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  Showing {filteredWorkouts.length} of {workoutTemplates.length} workout{workoutTemplates.length !== 1 ? 's' : ''}
                </div>
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
                        </div>
                      </div>
                    </div>

                    {workout.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{workout.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{workout.estimatedDuration} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{workout.exercises?.length || 0} exercises</span>
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
                          variant="outline"
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkout(workout.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
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

          {/* Workout Detail Modal */}
          {selectedWorkout && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedWorkout(null)}>
              <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b sticky top-0 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{selectedWorkout.name}</h2>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getDifficultyColor(selectedWorkout.difficulty)}`}>
                          {selectedWorkout.difficulty}
                        </span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm capitalize">
                          {selectedWorkout.category}
                        </span>
                        <span className="text-sm text-gray-600">• {selectedWorkout.estimatedDuration} min</span>
                        <span className="text-sm text-gray-600">• {selectedWorkout.exercises?.length || 0} exercises</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedWorkout(null)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {selectedWorkout.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-gray-600">{selectedWorkout.description}</p>
                    </div>
                  )}

                  {selectedWorkout.tags && selectedWorkout.tags.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkout.tags.map((tag: string) => (
                          <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-3">Exercises ({selectedWorkout.exercises?.length || 0})</h3>
                    <div className="space-y-3">
                      {selectedWorkout.exercises?.map((exercise: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{exercise.name}</h4>
                              <p className="text-sm text-gray-600 mb-2">{exercise.instructions}</p>
                              <div className="flex flex-wrap gap-3 text-sm">
                                {exercise.sets && <span className="text-gray-600">Sets: <strong>{exercise.sets}</strong></span>}
                                {exercise.reps && <span className="text-gray-600">Reps: <strong>{exercise.reps}</strong></span>}
                                {exercise.duration && <span className="text-gray-600">Duration: <strong>{exercise.duration}s</strong></span>}
                                {exercise.restTime && <span className="text-gray-600">Rest: <strong>{exercise.restTime}s</strong></span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t bg-gray-50 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setSelectedWorkout(null)}>
                    Close
                  </Button>
                  <Link href={`/dashboard/trainer/workouts/create?id=${selectedWorkout.id}`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button variant="destructive" onClick={() => {
                    setSelectedWorkout(null);
                    handleDeleteWorkout(selectedWorkout.id);
                  }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
