'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { signOutUser, db, listenToWorkoutTemplates, deleteWorkoutTemplate } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { 
  Users,
  Dumbbell,
  Plus,
  Calendar,
  TrendingUp,
  Settings,
  Bell,
  Search,
  Filter,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
  ArrowLeft,
  Sun,
  Moon,
  ChevronDown,
  MoreVertical,
  Target,
  Eye,
  Edit,
  Trash2,
  Tag,
  Heart,
  Zap,
  Wind,
  Activity,
  Copy,
  X
} from 'lucide-react';

interface UserData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  createdAt: any;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
  lastWorkout?: Date;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
}

export default function TrainerDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [filteredWorkouts, setFilteredWorkouts] = useState<any[]>([]);
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'clients' | 'workouts' | 'assignments' | 'exercises'>('overview');
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [filteredExerciseList, setFilteredExerciseList] = useState<any[]>([]);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedExerciseCategory, setSelectedExerciseCategory] = useState<string>('all');
  const [isCreatingExercise, setIsCreatingExercise] = useState(false);
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [savingExercise, setSavingExercise] = useState(false);
  const [exerciseForm, setExerciseForm] = useState<{
    name: string;
    instructions: string;
    category: 'strength' | 'cardio' | 'flexibility' | 'core' | 'other';
    targetMuscleGroups: string[];
    equipment: string[];
    notes: string;
    isPublic: boolean;
  }>({
    name: '',
    instructions: '',
    category: 'strength',
    targetMuscleGroups: [],
    equipment: [],
    notes: '',
    isPublic: false
  });
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [extendDeadlineModalOpen, setExtendDeadlineModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [workoutToAssign, setWorkoutToAssign] = useState<any | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [assignmentDeadline, setAssignmentDeadline] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          // Fetch trainer/admin data
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          
          // Check if user has trainer/admin role
          if (data?.role !== 'trainer' && data?.role !== 'admin') {
            router.push('/dashboard/client');
            return;
          }
          
          setUserData(data as UserData || null);
          
          // Fetch clients data
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            orderBy('createdAt', 'desc')
          );
          
          const clientsSnapshot = await getDocs(clientsQuery);
          const clientsData: ClientData[] = [];
          
          clientsSnapshot.forEach((doc) => {
            const clientInfo = doc.data();
            clientsData.push({
              id: doc.id,
              name: clientInfo.name,
              email: clientInfo.email,
              tier: clientInfo.tier,
              lastWorkout: new Date(), // TODO: Get from workout progress
              workoutsCompleted: Math.floor(Math.random() * 50), // TODO: Get real data
              status: 'active' // TODO: Determine based on activity
            });
          });
          
          setClients(clientsData);
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, [user, router]);

  // Listen to workout templates
  useEffect(() => {
    if (user) {
      const unsubscribe = listenToWorkoutTemplates(user.uid, (templates) => {
        setWorkoutTemplates(templates);
        setFilteredWorkouts(templates);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Listen to assignments
  useEffect(() => {
    if (user) {
      const assignmentsQuery = query(
        collection(db, 'assigned_workouts'),
        where('trainerId', '==', user.uid),
        orderBy('assignedDate', 'desc')
      );
      
      const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
        const assignmentsData: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          assignmentsData.push({
            id: doc.id,
            ...data,
            assignedDate: data.assignedDate?.toDate(),
            dueDate: data.dueDate?.toDate()
          });
        });
        setAssignments(assignmentsData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Listen to exercises
  useEffect(() => {
    if (user) {
      const exercisesQuery = query(
        collection(db, 'exercises'),
        where('createdBy', '==', user.uid),
        orderBy('name')
      );
      
      const unsubscribe = onSnapshot(exercisesQuery, (snapshot) => {
        const exercisesData: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          exercisesData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate()
          });
        });
        setExercises(exercisesData);
      });

      return () => unsubscribe();
    }
  }, [user]);

  // Filter workouts based on search and filters
  useEffect(() => {
    let filtered = workoutTemplates;

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

    setFilteredWorkouts(filtered);
  }, [workoutTemplates, workoutSearchQuery, selectedDifficulty, selectedCategory]);

  // Filter exercises based on search and category
  useEffect(() => {
    let filtered = exercises;

    if (exerciseSearchQuery) {
      filtered = filtered.filter(exercise =>
        exercise.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        exercise.instructions.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        exercise.targetMuscleGroups?.some((muscle: string) => 
          muscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase())
        )
      );
    }

    if (selectedExerciseCategory !== 'all') {
      filtered = filtered.filter(exercise => exercise.category === selectedExerciseCategory);
    }

    setFilteredExerciseList(filtered);
  }, [exercises, exerciseSearchQuery, selectedExerciseCategory]);

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

  const handleLogout = async () => {
    try {
      const result = await signOutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading trainer dashboard...</div>
      </div>
    );
  }

  // Mock data for dashboard metrics
  const dashboardStats = {
    totalClients: clients.length,
    activeWorkouts: 12,
    completedToday: 8,
    pendingAssignments: 3
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Trainer Sidebar */}
      <div className="fixed left-0 top-0 h-screen w-64 bg-white shadow-lg z-50 flex flex-col">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">SF</div>
            <span className="font-semibold text-lg">TRAINER PORTAL</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-6 overflow-auto">
          {/* Dashboard Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Dashboard</p>
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-2 p-2 rounded-md font-medium text-sm ${
                activeTab === 'overview' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Overview
            </button>
          </div>
          
          {/* Client Management */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Client Management</p>
            <button
              onClick={() => setActiveTab('clients')}
              className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                activeTab === 'clients' ? 'bg-primary text-white' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                All Clients
              </div>
              <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                activeTab === 'clients' ? 'bg-white text-primary' : 'bg-primary text-white'
              }`}>
                {clients.length}
              </span>
            </button>
          </div>

          {/* Workout Management */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Workout Management</p>
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('exercises')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                  activeTab === 'exercises' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Exercise Library
                </div>
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                  activeTab === 'exercises' ? 'bg-white text-primary' : 'bg-primary text-white'
                }`}>
                  {exercises.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('workouts')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                  activeTab === 'workouts' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Workout Library
                </div>
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                  activeTab === 'workouts' ? 'bg-white text-primary' : 'bg-primary text-white'
                }`}>
                  {workoutTemplates.length}
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('assignments')}
                className={`w-full flex items-center justify-between p-2 rounded-md text-sm ${
                  activeTab === 'assignments' ? 'bg-primary text-white' : 'hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Assignments
                </div>
                <span className={`text-xs w-5 h-5 rounded-full flex items-center justify-center ${
                  activeTab === 'assignments' ? 'bg-white text-primary' : 'bg-primary text-white'
                }`}>
                  {assignments.length}
                </span>
              </button>
            </div>
          </div>

          {/* Admin Section */}
          <div>
            <p className="text-xs text-gray-500 mb-2 px-2">Administration</p>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <Settings className="w-4 h-4" />
                System Settings
              </button>
              
              <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 text-sm">
                <BarChart3 className="w-4 h-4" />
                Reports & Analytics
              </button>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 min-w-10 bg-primary rounded-full flex items-center justify-center text-white flex-shrink-0">
                {userData?.name?.charAt(0) || 'T'}
              </div>
              <div>
                <p className="font-semibold">{userData?.name || 'Trainer'}</p>
                <p className="text-sm text-primary font-semibold">trainer/admin</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <LogOut className="w-5 h-5 text-primary" />
            </button>
          </div>
          
          <Link href="/dashboard/client">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              View as Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Trainer Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">Manage your clients, workouts, and track progress</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="text-primary hover:bg-primary/10"
              >
                {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="relative text-primary hover:bg-primary/10"
              >
                <Bell className="h-4 w-4" />
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-white flex items-center justify-center text-xs">
                  2
                </div>
              </Button>
            </div>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold">{dashboardStats.totalClients}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <Dumbbell className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Workouts</p>
                  <p className="text-2xl font-bold">{dashboardStats.activeWorkouts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 rounded-full">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completed Today</p>
                  <p className="text-2xl font-bold">{dashboardStats.completedToday}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Assignments</p>
                  <p className="text-2xl font-bold">{dashboardStats.pendingAssignments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/dashboard/trainer/workouts/create">
                    <Button className="w-full justify-start h-auto p-4 flex-col items-start">
                      <Plus className="h-6 w-6 mb-2" />
                      <span className="font-semibold">Create New Workout</span>
                      <span className="text-sm opacity-80">Build a custom workout template</span>
                    </Button>
                  </Link>
                  
                  <Link href="/dashboard/trainer/clients/assign">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 flex-col items-start">
                      <Calendar className="h-6 w-6 mb-2" />
                      <span className="font-semibold">Assign Workouts</span>
                      <span className="text-sm opacity-80">Schedule workouts for clients</span>
                    </Button>
                  </Link>
                  
                  <Button variant="outline" className="w-full justify-start h-auto p-4 flex-col items-start">
                    <TrendingUp className="h-6 w-6 mb-2" />
                    <span className="font-semibold">View Progress</span>
                    <span className="text-sm opacity-80">Check client workout completion</span>
                  </Button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Client Activity */}
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Recent Client Activity</h3>
                    <Button variant="ghost" size="sm">View All</Button>
                  </div>
                  <div className="space-y-4">
                    {clients.slice(0, 5).map((client) => (
                      <div key={client.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-600">Completed workout 2 hours ago</p>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Upcoming Deadlines</h3>
                    <Button variant="ghost" size="sm">View All</Button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <div className="flex-1">
                        <p className="font-medium">Upper Body Strength - John Doe</p>
                        <p className="text-sm text-gray-600">Due tomorrow</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <div className="flex-1">
                        <p className="font-medium">Cardio Session - Jane Smith</p>
                        <p className="text-sm text-gray-600">Due in 2 days</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <div className="flex-1">
                        <p className="font-medium">Full Body Workout - Mike Johnson</p>
                        <p className="text-sm text-gray-600">Due in 3 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="space-y-6">
              {/* Clients Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Client Management</h2>
                <Link href="/dashboard/trainer/clients/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Client
                  </Button>
                </Link>
              </div>

              {/* Clients Table */}
              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-6 border-b">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search clients..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4 font-semibold">Client</th>
                        <th className="text-left p-4 font-semibold">Service Tier</th>
                        <th className="text-left p-4 font-semibold">Workouts Completed</th>
                        <th className="text-left p-4 font-semibold">Last Activity</th>
                        <th className="text-left p-4 font-semibold">Status</th>
                        <th className="text-left p-4 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {client.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-gray-600">{client.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {client.tier?.name || 'Basic'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="font-medium">{client.workoutsCompleted}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-600">2 hours ago</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-sm ${
                              client.status === 'active' ? 'bg-green-100 text-green-800' :
                              client.status === 'inactive' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assignments' && (
            <div className="space-y-6">
              {/* Assignments Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Workout Assignments</h2>
                  <p className="text-gray-600 mt-1">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} total</p>
                </div>
              </div>

              {/* Assignments Table */}
              {assignments.length > 0 ? (
                <div className="bg-white rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-4 font-semibold">Client</th>
                          <th className="text-left p-4 font-semibold">Workout</th>
                          <th className="text-left p-4 font-semibold">Assigned Date</th>
                          <th className="text-left p-4 font-semibold">Due Date</th>
                          <th className="text-left p-4 font-semibold">Status</th>
                          <th className="text-left p-4 font-semibold">Progress</th>
                          <th className="text-left p-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {assignments.map((assignment) => {
                          const client = clients.find(c => c.id === assignment.clientId);
                          const workout = workoutTemplates.find(w => w.id === assignment.templateId);
                          const isOverdue = assignment.status !== 'completed' && new Date(assignment.dueDate) < new Date();
                          const status = isOverdue ? 'overdue' : assignment.status;
                          
                          return (
                            <tr key={assignment.id} className="hover:bg-gray-50">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                    {client?.name?.charAt(0) || '?'}
                                  </div>
                                  <div>
                                    <p className="font-medium">{client?.name || 'Unknown'}</p>
                                    <p className="text-sm text-gray-600">{client?.email || ''}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <p className="font-medium">{workout?.name || 'Unknown Workout'}</p>
                                <p className="text-sm text-gray-600">{workout?.exercises?.length || 0} exercises</p>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-gray-600">
                                  {assignment.assignedDate ? new Date(assignment.assignedDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="text-sm text-gray-600">
                                  {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                                  status === 'completed' ? 'bg-green-100 text-green-800' :
                                  status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status === 'in_progress' ? 'In Progress' : 
                                   status === 'overdue' ? 'Overdue' :
                                   status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        status === 'completed' ? 'bg-green-500' :
                                        status === 'in_progress' ? 'bg-blue-500' :
                                        status === 'overdue' ? 'bg-red-500' :
                                        'bg-gray-400'
                                      }`}
                                      style={{ width: `${assignment.progress?.completionPercentage || 0}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-gray-600">
                                    {assignment.progress?.completionPercentage || 0}%
                                  </span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      setSelectedAssignment(assignment);
                                      setNewDeadline(assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '');
                                      setExtendDeadlineModalOpen(true);
                                    }}
                                  >
                                    <Calendar className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <Calendar className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Assignments Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Assign workouts to clients to see them tracked here.
                  </p>
                  <Button onClick={() => setActiveTab('workouts')}>
                    <Dumbbell className="h-4 w-4 mr-2" />
                    View Workout Library
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exercises' && (
            <div className="space-y-6">
              {/* Exercises Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Exercise Library</h2>
                  <p className="text-gray-600 mt-1">{exercises.length} exercise{exercises.length !== 1 ? 's' : ''} total</p>
                </div>
                <Button
                  onClick={() => setIsCreatingExercise(true)}
                  disabled={isCreatingExercise}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exercise
                </Button>
              </div>

              {/* Search and Filters - Only show if exercises exist */}
              {exercises.length > 0 && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search exercises by name, instructions, or muscle groups..."
                          value={exerciseSearchQuery}
                          onChange={(e) => setExerciseSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={selectedExerciseCategory}
                        onChange={(e) => setSelectedExerciseCategory(e.target.value)}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="all">All Categories</option>
                        <option value="strength">Strength</option>
                        <option value="cardio">Cardio</option>
                        <option value="flexibility">Flexibility</option>
                        <option value="core">Core</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mt-3">
                    Showing {filteredExerciseList.length} of {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {/* Create Exercise Form */}
              {isCreatingExercise && (
                <div className="bg-white rounded-xl border p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Add New Exercise</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsCreatingExercise(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Exercise Name *</Label>
                        <input
                          id="name"
                          placeholder="e.g., Push-ups"
                          value={exerciseForm.name}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                        />
                      </div>

                      <div>
                        <Label htmlFor="instructions">Instructions *</Label>
                        <textarea
                          id="instructions"
                          placeholder="Describe how to perform this exercise..."
                          value={exerciseForm.instructions}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                          className="w-full min-h-[100px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                        />
                      </div>

                      <div>
                        <Label>Category</Label>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {['strength', 'cardio', 'flexibility', 'core', 'other'].map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setExerciseForm(prev => ({ ...prev, category: cat as any }))}
                              className={`p-2 rounded-lg border text-sm transition-colors capitalize ${
                                exerciseForm.category === cat
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <textarea
                          id="notes"
                          placeholder="Additional notes, tips, or modifications..."
                          value={exerciseForm.notes}
                          onChange={(e) => setExerciseForm(prev => ({ ...prev, notes: e.target.value }))}
                          className="w-full min-h-[60px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={() => setIsCreatingExercise(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={async () => {
                        if (!user || !exerciseForm.name || !exerciseForm.instructions) return;
                        setSavingExercise(true);
                        try {
                          const { createExercise } = await import('@/lib/firebase');
                          const result = await createExercise({
                            ...exerciseForm,
                            createdBy: user.uid
                          });
                          if (result.success) {
                            setIsCreatingExercise(false);
                            setExerciseForm({
                              name: '',
                              instructions: '',
                              category: 'strength',
                              targetMuscleGroups: [],
                              equipment: [],
                              notes: '',
                              isPublic: false
                            });
                          }
                        } catch (error) {
                          console.error('Error creating exercise:', error);
                        } finally {
                          setSavingExercise(false);
                        }
                      }}
                      disabled={!exerciseForm.name || !exerciseForm.instructions || savingExercise}
                    >
                      {savingExercise ? 'Saving...' : 'Save Exercise'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Exercise List */}
              {filteredExerciseList.length > 0 ? (
                <div className="bg-white rounded-xl border">
                  <div className="divide-y">
                    {filteredExerciseList.map((exercise) => (
                      <div key={exercise.id} className="p-6 hover:bg-gray-50 transition-colors">
                        {editingExerciseId === exercise.id ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Exercise Name</Label>
                                <input
                                  value={exerciseForm.name}
                                  onChange={(e) => setExerciseForm(prev => ({ ...prev, name: e.target.value }))}
                                  className="w-full px-3 py-2 border rounded-lg mt-2"
                                />
                              </div>
                              <div>
                                <Label>Category</Label>
                                <select
                                  value={exerciseForm.category}
                                  onChange={(e) => setExerciseForm(prev => ({ ...prev, category: e.target.value as any }))}
                                  className="w-full px-3 py-2 border rounded-lg mt-2"
                                >
                                  <option value="strength">Strength</option>
                                  <option value="cardio">Cardio</option>
                                  <option value="flexibility">Flexibility</option>
                                  <option value="core">Core</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <Label>Instructions</Label>
                              <textarea
                                value={exerciseForm.instructions}
                                onChange={(e) => setExerciseForm(prev => ({ ...prev, instructions: e.target.value }))}
                                className="w-full min-h-[80px] px-3 py-2 border rounded-lg mt-2"
                              />
                            </div>
                            <div className="flex justify-end gap-3">
                              <Button variant="outline" onClick={() => setEditingExerciseId(null)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={async () => {
                                  if (!editingExerciseId || !exerciseForm.name || !exerciseForm.instructions) return;
                                  setSavingExercise(true);
                                  try {
                                    const { updateExercise } = await import('@/lib/firebase');
                                    const result = await updateExercise(editingExerciseId, exerciseForm);
                                    if (result.success) {
                                      setEditingExerciseId(null);
                                      setExerciseForm({
                                        name: '',
                                        instructions: '',
                                        category: 'strength',
                                        targetMuscleGroups: [],
                                        equipment: [],
                                        notes: '',
                                        isPublic: false
                                      });
                                    }
                                  } catch (error) {
                                    console.error('Error updating exercise:', error);
                                  } finally {
                                    setSavingExercise(false);
                                  }
                                }}
                                disabled={savingExercise}
                              >
                                {savingExercise ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{exercise.name}</h4>
                                <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                                  exercise.category === 'strength' ? 'bg-blue-100 text-blue-800' :
                                  exercise.category === 'cardio' ? 'bg-red-100 text-red-800' :
                                  exercise.category === 'flexibility' ? 'bg-green-100 text-green-800' :
                                  exercise.category === 'core' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {exercise.category}
                                </span>
                              </div>
                              <p className="text-gray-600 mb-3">{exercise.instructions}</p>
                              {exercise.notes && (
                                <p className="text-sm text-gray-500 italic">Note: {exercise.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingExerciseId(exercise.id);
                                  setExerciseForm({
                                    name: exercise.name,
                                    instructions: exercise.instructions,
                                    category: exercise.category,
                                    targetMuscleGroups: exercise.targetMuscleGroups || [],
                                    equipment: exercise.equipment || [],
                                    notes: exercise.notes || '',
                                    isPublic: exercise.isPublic || false
                                  });
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this exercise?')) return;
                                  try {
                                    const { deleteExercise } = await import('@/lib/firebase');
                                    await deleteExercise(exercise.id);
                                  } catch (error) {
                                    console.error('Error deleting exercise:', error);
                                  }
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : exercises.length === 0 ? (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <Dumbbell className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Exercises Yet</h3>
                  <p className="text-gray-600 mb-6">
                    Start building your exercise library by adding your first exercise.
                  </p>
                  <Button onClick={() => setIsCreatingExercise(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Exercise
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-xl border p-12 text-center">
                  <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Exercises Found</h3>
                  <p className="text-gray-600 mb-6">Try adjusting your search or filters.</p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setExerciseSearchQuery('');
                      setSelectedExerciseCategory('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'workouts' && (
            <div className="space-y-6">
              {/* Workouts Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">Workout Library</h2>
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

                    {/* Filter Buttons */}
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

                    {/* Results Count */}
                    <div className="text-sm text-gray-600">
                      Showing {filteredWorkouts.length} of {workoutTemplates.length} workout{workoutTemplates.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Workout Cards Grid */}
              {filteredWorkouts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredWorkouts.map((workout) => {
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

                    return (
                      <div
                        key={workout.id}
                        className="bg-white rounded-xl border hover:shadow-lg transition-all group"
                      >
                        <div className="p-6">
                          {/* Header */}
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

                          {/* Description */}
                          {workout.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{workout.description}</p>
                          )}

                          {/* Stats */}
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

                          {/* Tags */}
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

                          {/* Actions */}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
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
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => {
                                setWorkoutToAssign(workout);
                                setAssignModalOpen(true);
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Assign to Clients
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : workoutTemplates.length === 0 ? (
                /* Empty State - No Workouts Created */
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
                /* Empty State - No Results Found */
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
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              selectedWorkout.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                              selectedWorkout.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
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
                      {/* Description */}
                      {selectedWorkout.description && (
                        <div>
                          <h3 className="font-semibold mb-2">Description</h3>
                          <p className="text-gray-600">{selectedWorkout.description}</p>
                        </div>
                      )}

                      {/* Tags */}
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

                      {/* Exercises */}
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
                          Edit Workout
                        </Button>
                      </Link>
                      <Button variant="destructive" onClick={() => {
                        setSelectedWorkout(null);
                        handleDeleteWorkout(selectedWorkout.id);
                      }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Workout
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {assignModalOpen && workoutToAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
          setAssignModalOpen(false);
          setSelectedClients([]);
          setAssignmentDeadline('');
          setAssignmentNotes('');
        }}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Assign Workout to Clients</h2>
                  <p className="text-gray-600">Workout: <strong>{workoutToAssign.name}</strong></p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedClients([]);
                  setAssignmentDeadline('');
                  setAssignmentNotes('');
                }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Client Selection */}
              <div>
                <h3 className="font-semibold mb-3">Select Clients ({selectedClients.length} selected)</h3>
                {clients.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">No clients available</p>
                    <Link href="/dashboard/trainer/clients/new">
                      <Button variant="outline" size="sm" className="mt-3">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Client
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {clients.map((client) => (
                      <label
                        key={client.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClients(prev => [...prev, client.id]);
                            } else {
                              setSelectedClients(prev => prev.filter(id => id !== client.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.email}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' :
                          client.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {client.status}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label className="font-semibold mb-2 block">Due Date *</label>
                <input
                  type="date"
                  value={assignmentDeadline}
                  onChange={(e) => setAssignmentDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-semibold mb-2 block">Notes (Optional)</label>
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  placeholder="Add any instructions or notes for the clients..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Summary */}
              {selectedClients.length > 0 && assignmentDeadline && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Summary:</strong> You are about to assign <strong>{workoutToAssign.name}</strong> to{' '}
                    <strong>{selectedClients.length} client{selectedClients.length !== 1 ? 's' : ''}</strong> with a deadline of{' '}
                    <strong>{new Date(assignmentDeadline).toLocaleDateString()}</strong>.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedClients([]);
                  setAssignmentDeadline('');
                  setAssignmentNotes('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={selectedClients.length === 0 || !assignmentDeadline || assigning}
                onClick={async () => {
                  if (!user || selectedClients.length === 0 || !assignmentDeadline) return;
                  
                  setAssigning(true);
                  try {
                    const { assignWorkoutToClients } = await import('@/lib/firebase');
                    const result = await assignWorkoutToClients({
                      templateId: workoutToAssign.id,
                      clientIds: selectedClients,
                      trainerId: user.uid,
                      dueDate: new Date(assignmentDeadline),
                      notes: assignmentNotes
                    });

                    if (result.success) {
                      alert(`Workout assigned successfully to ${selectedClients.length} client${selectedClients.length !== 1 ? 's' : ''}!`);
                      setAssignModalOpen(false);
                      setSelectedClients([]);
                      setAssignmentDeadline('');
                      setAssignmentNotes('');
                      setWorkoutToAssign(null);
                    } else {
                      alert('Failed to assign workout. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error assigning workout:', error);
                    alert('An error occurred while assigning the workout.');
                  } finally {
                    setAssigning(false);
                  }
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {assigning ? 'Assigning...' : `Assign to ${selectedClients.length} Client${selectedClients.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Deadline Modal */}
      {extendDeadlineModalOpen && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
          setExtendDeadlineModalOpen(false);
          setSelectedAssignment(null);
          setNewDeadline('');
        }}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold mb-1">Extend Deadline</h2>
                  <p className="text-sm text-gray-600">
                    Current deadline: <strong>{selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : 'N/A'}</strong>
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => {
                  setExtendDeadlineModalOpen(false);
                  setSelectedAssignment(null);
                  setNewDeadline('');
                }}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="newDeadline">New Due Date *</Label>
                <input
                  id="newDeadline"
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mt-2"
                />
              </div>

              {newDeadline && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    The deadline will be extended to <strong>{new Date(newDeadline).toLocaleDateString()}</strong>
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setExtendDeadlineModalOpen(false);
                  setSelectedAssignment(null);
                  setNewDeadline('');
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!newDeadline || assigning}
                onClick={async () => {
                  if (!newDeadline || !selectedAssignment) return;
                  
                  setAssigning(true);
                  try {
                    const { updateDoc, doc, Timestamp } = await import('firebase/firestore');
                    await updateDoc(doc(db, 'assigned_workouts', selectedAssignment.id), {
                      dueDate: Timestamp.fromDate(new Date(newDeadline))
                    });
                    
                    alert('Deadline updated successfully!');
                    setExtendDeadlineModalOpen(false);
                    setSelectedAssignment(null);
                    setNewDeadline('');
                  } catch (error) {
                    console.error('Error updating deadline:', error);
                    alert('Failed to update deadline. Please try again.');
                  } finally {
                    setAssigning(false);
                  }
                }}
              >
                {assigning ? 'Updating...' : 'Update Deadline'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
