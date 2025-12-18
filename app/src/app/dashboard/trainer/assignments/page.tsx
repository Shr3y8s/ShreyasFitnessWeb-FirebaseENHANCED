'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import TrainerSidebar from '@/components/TrainerSidebar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { ExerciseConfigurationDisplay } from '@/components/workouts/ExerciseConfigurationDisplay';
import { WorkoutExecutionDetailView } from '@/components/workouts/WorkoutExecutionDetailView';
import { AllClientsOverviewDashboard } from '@/components/workouts/AllClientsOverviewDashboard';
import { WorkoutExecution } from '@/types/workout';
import {
  Calendar,
  Eye,
  X,
  Dumbbell,
  Users,
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  Activity
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
}

interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  estimatedDuration?: number;
  exercises?: any[];
  difficulty?: string;
  targetMuscleGroups?: string[];
}

interface Assignment {
  id: string;
  name: string;  // Assignment name (may differ from template name)
  clientId: string;
  templateId: string;
  trainerId: string;
  assignedDate: Date;
  dueDate: Date;
  status: string;
  progress?: {
    completionPercentage: number;
  };
  notes?: string;
  exercises?: any[];  // Exercise configurations from assignment
}

export default function WorkoutAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, canAccessTrainerDashboard } = useAuth();

  // Mode state - always view mode
  const [mode, setMode] = useState<'create' | 'view'>('view');
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Selection state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTemplate | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [workoutExecution, setWorkoutExecution] = useState<WorkoutExecution | null>(null);
  const [loadingExecution, setLoadingExecution] = useState(false);
  
  // Form state
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedViewClientId, setSelectedViewClientId] = useState<string | null>(null);
  const [timeWindowWeeks, setTimeWindowWeeks] = useState(2); // Default: 2 weeks back + forward
  
  // UI state
  const [showPreSelectionBanner, setShowPreSelectionBanner] = useState(false);

  // Check for pre-selected client from URL
  useEffect(() => {
    const urlClient = searchParams.get('client');
    const preSelectedClients = searchParams.get('clients');
    const urlMode = searchParams.get('mode');
    
    if (urlClient) {
      setSelectedViewClientId(urlClient);
    } else if (preSelectedClients) {
      const clientIds = preSelectedClients.split(',');
      setSelectedClientIds(clientIds);
      setShowPreSelectionBanner(true);
      if (urlMode === 'create') {
        setMode('create');
      }
    }
  }, [searchParams]);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
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
        // Fetch clients assigned to this trainer
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
          where('assignedTrainerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData: ClientData[] = [];
        clientsSnapshot.forEach((doc) => {
          clientsData.push({
            id: doc.id,
            name: doc.data().name,
            email: doc.data().email,
            tier: doc.data().tier
          });
        });
        setClients(clientsData);

        // Fetch workout templates
        const workoutsQuery = query(
          collection(db, 'workoutTemplates'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const workoutsSnapshot = await getDocs(workoutsQuery);
        const workoutsData: WorkoutTemplate[] = [];
        workoutsSnapshot.forEach((doc) => {
          const data = doc.data();
          workoutsData.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            estimatedDuration: data.estimatedDuration,
            exercises: data.exercises,
            difficulty: data.difficulty,
            targetMuscleGroups: data.targetMuscleGroups
          });
        });
        setWorkoutTemplates(workoutsData);

        // Fetch assignments
        const assignmentsQuery = query(
          collection(db, 'workoutAssignments'),
          where('trainerId', '==', user.uid),
          orderBy('assignedAt', 'desc')
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignmentsData: Assignment[] = [];
        assignmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          assignmentsData.push({
            id: doc.id,
            name: data.name || 'Unnamed Assignment',
            clientId: data.clientId,
            templateId: data.workoutTemplateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedAt?.toDate() || new Date(),
            dueDate: typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate?.toDate(),
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes,
            exercises: data.exercises || []
          });
        });
        setAssignments(assignmentsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router, authLoading, canAccessTrainerDashboard]);

  // Fetch workout execution when assignment is selected
  useEffect(() => {
    const fetchExecution = async () => {
      if (!selectedAssignment) {
        setWorkoutExecution(null);
        return;
      }

      setLoadingExecution(true);
      try {
        // Query for execution data
        const executionsQuery = query(
          collection(db, 'workoutExecutions'),
          where('workoutAssignmentId', '==', selectedAssignment.id),
          limit(1)
        );
        
        const executionsSnapshot = await getDocs(executionsQuery);
        
        if (!executionsSnapshot.empty) {
          const executionDoc = executionsSnapshot.docs[0];
          const executionData = executionDoc.data();
          
          // Convert Firestore Timestamps to Dates
          const execution: WorkoutExecution = {
            ...executionData,
            id: executionDoc.id,
            startedAt: executionData.startedAt?.toDate ? executionData.startedAt.toDate() : new Date(executionData.startedAt),
            completedAt: executionData.completedAt?.toDate ? executionData.completedAt.toDate() : executionData.completedAt ? new Date(executionData.completedAt) : undefined,
            createdAt: executionData.createdAt?.toDate ? executionData.createdAt.toDate() : new Date(executionData.createdAt),
            updatedAt: executionData.updatedAt?.toDate ? executionData.updatedAt.toDate() : new Date(executionData.updatedAt),
          } as WorkoutExecution;
          
          setWorkoutExecution(execution);
        } else {
          setWorkoutExecution(null);
        }
      } catch (error) {
        console.error('Error fetching workout execution:', error);
        setWorkoutExecution(null);
      } finally {
        setLoadingExecution(false);
      }
    };

    fetchExecution();
  }, [selectedAssignment]);

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(clientSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter workouts
  const filteredWorkouts = workoutTemplates.filter(workout => {
    const matchesSearch = 
      workout.name.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
      workout.description?.toLowerCase().includes(workoutSearchQuery.toLowerCase());
    return matchesSearch;
  });

  // Filter assignments by selected client and time window
  const filteredAssignments = assignments.filter(assignment => {
    // Client filter - REQUIRED when in view mode
    if (mode === 'view' && selectedViewClientId) {
      if (assignment.clientId !== selectedViewClientId) {
        return false;
      }
    }
    
    // Time window filter (only in view mode with client selected)
    if (mode === 'view' && selectedViewClientId) {
      const weeksAgo = new Date();
      weeksAgo.setDate(weeksAgo.getDate() - (timeWindowWeeks * 7));
      
      const weeksForward = new Date();
      weeksForward.setDate(weeksForward.getDate() + (timeWindowWeeks * 7));
      
      const dueDate = new Date(assignment.dueDate);
      if (dueDate < weeksAgo || dueDate > weeksForward) {
        return false;
      }
    }
    
    const client = clients.find(c => c.id === assignment.clientId);
    const workout = workoutTemplates.find(w => w.id === assignment.templateId);
    
    // Context-aware search - exclude client name when client is already selected
    const searchLower = assignmentSearchQuery.toLowerCase();
    const matchesSearch = 
      !assignmentSearchQuery || // If no search query, match all
      workout?.name.toLowerCase().includes(searchLower) ||
      workout?.description?.toLowerCase().includes(searchLower) ||
      assignment.name?.toLowerCase().includes(searchLower) ||
      assignment.notes?.toLowerCase().includes(searchLower);
    
    const isOverdue = assignment.status !== 'completed' && new Date(assignment.dueDate) < new Date();
    const actualStatus = isOverdue ? 'overdue' : assignment.status;
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'overdue' && isOverdue) ||
      (statusFilter !== 'overdue' && actualStatus === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  // Get client-specific stats
  const getClientStats = (clientId: string) => {
    const clientAssignments = assignments.filter(a => a.clientId === clientId);
    const active = clientAssignments.filter(a => a.status !== 'completed').length;
    const overdue = clientAssignments.filter(a => 
      a.status !== 'completed' && new Date(a.dueDate) < new Date()
    ).length;
    return { active, overdue, total: clientAssignments.length };
  };

  // Selection handlers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClientIds.length === filteredClients.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map(c => c.id));
    }
  };

  const clearSelection = () => {
    setSelectedClientIds([]);
    setSelectedWorkout(null);
    setDueDate('');
    setNotes('');
    setShowPreSelectionBanner(false);
  };

  // Assignment creation
  const handleCreateAssignment = async () => {
    if (!user || selectedClientIds.length === 0 || !selectedWorkout || !dueDate) return;

    setIsProcessing(true);
    try {
      const { assignWorkoutToClients } = await import('@/lib/firebase');
      const result = await assignWorkoutToClients({
        templateId: selectedWorkout.id,
        clientIds: selectedClientIds,
        trainerId: user.uid,
        dueDate: new Date(dueDate),
        notes: notes
      });

      if (result.success) {
        alert(`Success! Workout assigned to ${selectedClientIds.length} client${selectedClientIds.length !== 1 ? 's' : ''}!`);
        
        // Reload assignments
        const assignmentsQuery = query(
          collection(db, 'workoutAssignments'),
          where('trainerId', '==', user.uid),
          orderBy('assignedDate', 'desc')
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignmentsData: Assignment[] = [];
        assignmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          assignmentsData.push({
            id: doc.id,
            name: data.name || 'Unnamed Assignment',
            clientId: data.clientId,
            templateId: data.workoutTemplateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedDate?.toDate(),
            dueDate: data.dueDate?.toDate(),
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes,
            exercises: data.exercises || []
          });
        });
        setAssignments(assignmentsData);
        
        // Clear form
        clearSelection();
        
        // Switch to view mode
        setMode('view');
      } else {
        alert(`Failed to assign workout. ${result.error?.message || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error assigning workout:', error);
      alert('An error occurred while assigning the workout.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get assignment counts
  const assignmentCounts = {
    total: assignments.length,
    active: assignments.filter(a => a.status !== 'completed').length,
    completed: assignments.filter(a => a.status === 'completed').length,
    overdue: assignments.filter(a => 
      a.status !== 'completed' && new Date(a.dueDate) < new Date()
    ).length
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
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb items={[
            { label: 'Training' },
            { label: 'Workout Assignments' }
          ]} />
          <h1 className="text-2xl font-bold text-foreground">Workout Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {assignmentCounts.total} total • {assignmentCounts.active} active • {assignmentCounts.overdue} overdue
          </p>
        </div>

        {/* New Assignment Button */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={() => router.push('/dashboard/trainer/assignments/create')}
            className="bg-primary text-white"
          >
            <Dumbbell className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border p-4 mb-6">
          <div className="flex items-end gap-4">
            {/* Client Selector */}
            <div className="w-[30%]">
              <label className="text-xs text-gray-600 block mb-1 font-medium">Client</label>
              <select
                value={selectedViewClientId || ''}
                onChange={(e) => {
                  const clientId = e.target.value || null;
                  setSelectedViewClientId(clientId);
                  setSelectedAssignment(null);
                  // Update URL
                  if (clientId) {
                    router.push(`/dashboard/trainer/assignments?client=${clientId}`);
                  } else {
                    router.push('/dashboard/trainer/assignments');
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="">📊 All Clients Overview</option>
                {clients.map(client => {
                  const stats = getClientStats(client.id);
                  return (
                    <option key={client.id} value={client.id}>
                      {client.name} {stats.overdue > 0 ? '🔴' : stats.active > 0 ? '🟢' : '⚪'}
                      {' '}({stats.active} active)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Time Window Selector - Only show when client is selected */}
            {selectedViewClientId && (
              <div className="w-[25%]">
                <label className="text-xs text-gray-600 block mb-1 font-medium">Time Window</label>
                <select
                  value={timeWindowWeeks}
                  onChange={(e) => setTimeWindowWeeks(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="1">Last 1 week + Next 1 week</option>
                  <option value="2">Last 2 weeks + Next 2 weeks</option>
                  <option value="3">Last 3 weeks + Next 3 weeks</option>
                  <option value="4">Last 4 weeks + Next 4 weeks</option>
                </select>
              </div>
            )}
            
            {/* Search - Only show when client is selected */}
            {selectedViewClientId && (
              <div className="flex-1">
                <label className="text-xs text-gray-600 block mb-1 font-medium">Search Workouts</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by workout, description, or notes..."
                    value={assignmentSearchQuery}
                    onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            )}
            
            {/* Status Filter - Only show when client is selected */}
            {selectedViewClientId && (
              <div className="w-[20%]">
                <label className="text-xs text-gray-600 block mb-1 font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            )}
          </div>

          {/* Active Filters Summary */}
          {(selectedViewClientId || statusFilter !== 'all' || assignmentSearchQuery) && (
            <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">
                Showing <strong>{filteredAssignments.length}</strong> assignment{filteredAssignments.length !== 1 ? 's' : ''}
                {selectedViewClientId && (() => {
                  const client = clients.find(c => c.id === selectedViewClientId);
                  return client ? ` for ${client.name}` : '';
                })()}
                {selectedViewClientId && ` (${timeWindowWeeks} weeks back/forward)`}
              </span>
            </div>
          )}
        </div>

        {/* Conditional: Dashboard or Split View */}
        {!selectedViewClientId ? (
          /* ALL CLIENTS OVERVIEW - Full Width Dashboard */
          <AllClientsOverviewDashboard
            clients={clients}
            assignments={assignments}
            onSelectClient={(clientId) => {
              setSelectedViewClientId(clientId);
              router.push(`/dashboard/trainer/assignments?client=${clientId}`);
            }}
          />
        ) : (
          /* CLIENT SELECTED - Master-Detail Split View */
          <div className="flex gap-6 h-[calc(100vh-360px)]">
            {/* LEFT PANEL - Assignment List */}
            <div className="w-[35%] flex flex-col bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold">
                    {selectedViewClientId 
                      ? (() => {
                          const client = clients.find(c => c.id === selectedViewClientId);
                          return `${client?.name}'s Workouts`;
                        })()
                      : 'All Assignments'}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {filteredAssignments.length} workout{filteredAssignments.length !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => {
                      const client = clients.find(c => c.id === assignment.clientId);
                      const workout = workoutTemplates.find(w => w.id === assignment.templateId);
                      const isOverdue = assignment.status !== 'completed' && new Date(assignment.dueDate) < new Date();
                      const status = isOverdue ? 'overdue' : assignment.status;
                      const isActive = selectedAssignment?.id === assignment.id;
                      
                      return (
                        <div
                          key={assignment.id}
                          onClick={() => setSelectedAssignment(assignment)}
                          className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                            isActive ? 'bg-blue-50 border-l-4 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {client?.name?.charAt(0) || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client?.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-600 truncate">{workout?.name || 'Unknown Workout'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  status === 'completed' ? 'bg-green-100 text-green-800' :
                                  status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {status === 'in_progress' ? 'In Progress' :
                                   status === 'overdue' ? 'Overdue' :
                                   status.charAt(0).toUpperCase() + status.slice(1)}
                                </span>
                                <span className="text-xs text-gray-600">
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                      <Search className="h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-600">No assignments found</p>
                    </div>
                  )}
                </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="w-[65%] bg-white rounded-xl border overflow-hidden flex flex-col">
            {mode === 'create' ? (
              /* CREATE MODE: Workout Selection & Form */
              selectedClientIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <AlertCircle className="h-16 w-16 text-orange-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">⚠️ Quick Assign Mode</h3>
                  <p className="text-gray-600 mb-4">
                    This is a simplified assignment view without exercise configuration.<br/>
                    For proper workout assignments with sets, reps, and weights:
                  </p>
                  <Button 
                    onClick={() => router.push('/dashboard/trainer/assignments/create')}
                    size="lg"
                    className="mt-2"
                  >
                    <Dumbbell className="h-5 w-5 mr-2" />
                    Use Full Assignment Wizard
                  </Button>
                  <p className="text-sm text-gray-500 mt-4">
                    The wizard guides you through 5 steps including exercise configuration
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">Assigning to {selectedClientIds.length} Client{selectedClientIds.length !== 1 ? 's' : ''}</h3>
                      <Button variant="ghost" size="sm" onClick={clearSelection}>
                        <X className="h-4 w-4 mr-2" />
                        Change
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map(clientId => {
                        const client = clients.find(c => c.id === clientId);
                        if (!client) return null;
                        return (
                          <span key={clientId} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {client.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Workout Selection */}
                    <div>
                      <label className="font-semibold mb-3 block">Select Workout Template *</label>
                      
                      <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search workouts..."
                          value={workoutSearchQuery}
                          onChange={(e) => setWorkoutSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>

                      {workoutTemplates.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-gray-600 mb-4">No workout templates yet</p>
                          <Button onClick={() => router.push('/dashboard/trainer/workouts/create')}>
                            Create Your First Workout
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          {filteredWorkouts.map((workout) => {
                            const isSelected = selectedWorkout?.id === workout.id;
                            return (
                              <div
                                key={workout.id}
                                onClick={() => setSelectedWorkout(workout)}
                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-gray-200 hover:border-primary/50 hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-semibold">{workout.name}</h4>
                                  {isSelected && (
                                    <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                      <CheckCircle2 className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                {workout.description && (
                                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{workout.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-gray-600">
                                  <span>{workout.exercises?.length || 0} exercises</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Assignment Details */}
                    {selectedWorkout && (
                      <>
                        <div>
                          <label className="font-semibold mb-2 block">Due Date *</label>
                          <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="font-semibold mb-2 block">Notes (Optional)</label>
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add instructions or notes..."
                            rows={4}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                          />
                        </div>

                        {dueDate && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              <strong>Summary:</strong> Assigning "{selectedWorkout.name}" to{' '}
                              <strong>{selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}</strong> with
                              deadline <strong>{new Date(dueDate).toLocaleDateString()}</strong>
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  {selectedWorkout && (
                    <div className="p-6 border-t bg-gray-50 flex gap-3 flex-shrink-0">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={clearSelection}
                        disabled={isProcessing}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!dueDate || isProcessing}
                        onClick={handleCreateAssignment}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {isProcessing ? 'Assigning...' : `Assign to ${selectedClientIds.length} Client${selectedClientIds.length !== 1 ? 's' : ''}`}
                      </Button>
                    </div>
                  )}
                </>
              )
            ) : (
              /* VIEW MODE: Assignment Details */
              selectedAssignment ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
                    {(() => {
                      const client = clients.find(c => c.id === selectedAssignment.clientId);
                      const workout = workoutTemplates.find(w => w.id === selectedAssignment.templateId);
                      const isOverdue = selectedAssignment.status !== 'completed' && new Date(selectedAssignment.dueDate) < new Date();
                      const status = isOverdue ? 'overdue' : selectedAssignment.status;
                      
                      return (
                        <>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                              {client?.name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold">{client?.name || 'Unknown Client'}</h2>
                              <p className="text-sm text-gray-600">{workout?.name || 'Unknown Workout'}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            status === 'completed' ? 'bg-green-100 text-green-800' :
                            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            status === 'overdue' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {status === 'in_progress' ? 'In Progress' :
                             status === 'overdue' ? 'Overdue' :
                             status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </>
                      );
                    })()}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {(() => {
                      const workout = workoutTemplates.find(w => w.id === selectedAssignment.templateId);
                      
                      return (
                        <>
                          {/* Assignment Info */}
                          <div className="bg-white border rounded-xl p-6">
                            <h3 className="font-semibold mb-4">Assignment Details</h3>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Assigned Date:</span>
                                <span className="font-medium">{new Date(selectedAssignment.assignedDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Scheduled Date:</span>
                                <span className="font-medium">{new Date(selectedAssignment.assignedDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Due Date:</span>
                                <span className="font-medium">{new Date(selectedAssignment.dueDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Progress:</span>
                                <span className="font-medium">{selectedAssignment.progress?.completionPercentage || 0}%</span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600">Description:</span>
                                <span className="font-medium text-right flex-1 ml-4">
                                  {workout?.description || <span className="text-gray-400 italic">None</span>}
                                </span>
                              </div>
                              <div className="flex justify-between items-start">
                                <span className="text-gray-600">Notes:</span>
                                <span className="font-medium text-right flex-1 ml-4">
                                  {selectedAssignment.notes || <span className="text-gray-400 italic">None</span>}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Workout Details */}
                          {workout && (
                            <div className="bg-white border rounded-xl p-6">
                              <h3 className="font-semibold mb-4">Workout Details</h3>
                              <div className="space-y-3">
                                <div>
                                  <span className="text-gray-600 block mb-1">Workout Name:</span>
                                  <p className="font-medium">{workout.name}</p>
                                </div>
                                {workout.description && (
                                  <div>
                                    <span className="text-gray-600 block mb-1">Description:</span>
                                    <p className="text-sm">{workout.description}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-600">Exercises: <strong>{workout.exercises?.length || 0}</strong></span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Exercise Configuration */}
                          {selectedAssignment.exercises && selectedAssignment.exercises.length > 0 && (
                            <div className="bg-white border rounded-xl p-6">
                              <h3 className="font-semibold mb-4">Exercise Configuration</h3>
                              <ExerciseConfigurationDisplay exercises={selectedAssignment.exercises} />
                            </div>
                          )}

                          {/* Workout Execution Details */}
                          {loadingExecution ? (
                            <div className="bg-white border rounded-xl p-6">
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                <span className="ml-3 text-gray-600">Loading execution data...</span>
                              </div>
                            </div>
                          ) : workoutExecution ? (
                            <div>
                              <div className="flex items-center gap-2 mb-4">
                                <Activity className="h-5 w-5 text-primary" />
                                <h3 className="font-semibold">Client Performance</h3>
                              </div>
                              <WorkoutExecutionDetailView 
                                execution={workoutExecution} 
                                showClientNotes={true}
                              />
                            </div>
                          ) : selectedAssignment.status !== 'scheduled' && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                              <div className="flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                                <div>
                                  <h3 className="font-semibold text-amber-900 mb-1">No Execution Data Yet</h3>
                                  <p className="text-sm text-amber-700">
                                    The client hasn't started tracking this workout yet. Once they begin, you'll see detailed performance data here including:
                                  </p>
                                  <ul className="text-sm text-amber-700 mt-2 space-y-1 list-disc list-inside">
                                    <li>Exercise-by-exercise completion status</li>
                                    <li>Actual sets, reps, and weights used</li>
                                    <li>Workout duration and difficulty rating</li>
                                    <li>Client notes and feedback</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="bg-white border rounded-xl p-6">
                            <h3 className="font-semibold mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                              <Button 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => {
                                  const client = clients.find(c => c.id === selectedAssignment.clientId);
                                  if (client) {
                                    router.push(`/dashboard/trainer/clients-messages?clientId=${client.id}`);
                                  }
                                }}
                              >
                                <Users className="h-4 w-4 mr-2" />
                                Message Client
                              </Button>
                              <Button 
                                variant="outline" 
                                className="w-full justify-start"
                                onClick={() => {
                                  const newDeadline = prompt('Enter new due date (YYYY-MM-DD):', 
                                    new Date(selectedAssignment.dueDate).toISOString().split('T')[0]
                                  );
                                  if (newDeadline) {
                                    updateDoc(doc(db, 'workoutAssignments', selectedAssignment.id), {
                                      dueDate: Timestamp.fromDate(new Date(newDeadline))
                                    }).then(() => {
                                      alert('Deadline updated!');
                                      // Reload assignments
                                      const assignmentsQuery = query(
                                        collection(db, 'workoutAssignments'),
                                        where('trainerId', '==', user!.uid),
                                        orderBy('assignedAt', 'desc')
                                      );
                                      getDocs(assignmentsQuery).then(snapshot => {
                                        const assignmentsData: Assignment[] = [];
                                        snapshot.forEach((doc) => {
                                          const data = doc.data();
                                          assignmentsData.push({
                                            id: doc.id,
                                            name: data.name || 'Unnamed Assignment',
                                            clientId: data.clientId,
                                            templateId: data.workoutTemplateId,
                                            trainerId: data.trainerId,
                                            assignedDate: data.assignedAt?.toDate() || new Date(),
                                            dueDate: typeof data.dueDate === 'string' ? new Date(data.dueDate) : data.dueDate?.toDate(),
                                            status: data.status || 'assigned',
                                            progress: data.progress,
                                            notes: data.notes,
                                            exercises: data.exercises || []
                                          });
                                        });
                                        setAssignments(assignmentsData);
                                        setSelectedAssignment(assignmentsData.find(a => a.id === selectedAssignment.id) || null);
                                      });
                                    }).catch(error => {
                                      console.error('Error updating deadline:', error);
                                      alert('Failed to update deadline');
                                    });
                                  }
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Extend Deadline
                              </Button>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Eye className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Assignment Selected</h3>
                  <p className="text-gray-600">Select an assignment from the list to view details</p>
                </div>
              )
            )}
          </div>
        </div>
        )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
