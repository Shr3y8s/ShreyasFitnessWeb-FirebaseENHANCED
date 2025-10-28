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
  Timestamp
} from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
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
  Filter
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
}

export default function WorkoutAssignmentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // Mode state
  const [mode, setMode] = useState<'create' | 'view'>('create');
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Selection state
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTemplate | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Form state
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Filter state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // UI state
  const [showPreSelectionBanner, setShowPreSelectionBanner] = useState(false);

  // Check for pre-selected clients from URL
  useEffect(() => {
    const preSelectedClients = searchParams.get('clients');
    const urlMode = searchParams.get('mode');
    
    if (preSelectedClients) {
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
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Fetch clients
        const clientsQuery = query(
          collection(db, 'users'),
          where('role', '==', 'client'),
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
          collection(db, 'workout_templates'),
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
          collection(db, 'assigned_workouts'),
          where('trainerId', '==', user.uid),
          orderBy('assignedDate', 'desc')
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignmentsData: Assignment[] = [];
        assignmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          assignmentsData.push({
            id: doc.id,
            clientId: data.clientId,
            templateId: data.templateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedDate?.toDate(),
            dueDate: data.dueDate?.toDate(),
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes
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
  }, [user, router]);

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

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    const client = clients.find(c => c.id === assignment.clientId);
    const workout = workoutTemplates.find(w => w.id === assignment.templateId);
    
    const matchesSearch = 
      client?.name.toLowerCase().includes(assignmentSearchQuery.toLowerCase()) ||
      workout?.name.toLowerCase().includes(assignmentSearchQuery.toLowerCase());
    
    const isOverdue = assignment.status !== 'completed' && new Date(assignment.dueDate) < new Date();
    const actualStatus = isOverdue ? 'overdue' : assignment.status;
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'overdue' && isOverdue) ||
      (statusFilter !== 'overdue' && actualStatus === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

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
          collection(db, 'assigned_workouts'),
          where('trainerId', '==', user.uid),
          orderBy('assignedDate', 'desc')
        );
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        const assignmentsData: Assignment[] = [];
        assignmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          assignmentsData.push({
            id: doc.id,
            clientId: data.clientId,
            templateId: data.templateId,
            trainerId: data.trainerId,
            assignedDate: data.assignedDate?.toDate(),
            dueDate: data.dueDate?.toDate(),
            status: data.status || 'assigned',
            progress: data.progress,
            notes: data.notes
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="assignments" />

      <div className="ml-64 p-8">
        {/* Header with Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <button 
              onClick={() => router.push('/dashboard/trainer/clients')}
              className="text-gray-900 font-medium hover:text-primary transition-colors"
            >
              Client Management
            </button>
            <ChevronRight className="h-4 w-4 mx-2" />
            <span className="text-gray-900 font-medium">Workout Assignments</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Workout Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {assignmentCounts.total} total • {assignmentCounts.active} active • {assignmentCounts.overdue} overdue
          </p>
        </div>

        {/* Mode Toggle - Segmented Control */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-1">
            <button
              onClick={() => setMode('create')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'create'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Dumbbell className="h-4 w-4 inline mr-2" />
              New Assignment
            </button>
            <button
              onClick={() => setMode('view')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'view'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              View Existing
            </button>
          </div>
        </div>

        {/* Master-Detail Split View */}
        <div className="flex gap-6 h-[calc(100vh-280px)]">
          {/* LEFT PANEL */}
          <div className="w-[35%] flex flex-col bg-white rounded-xl border overflow-hidden">
            {mode === 'create' ? (
              /* CREATE MODE: Client Selector */
              <>
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold mb-3">Select Clients</h3>
                  
                  {showPreSelectionBanner && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                      <p className="text-blue-800">
                        {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} pre-selected from Client Management
                      </p>
                    </div>
                  )}
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search clients..."
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    Select All ({filteredClients.length})
                  </label>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {filteredClients.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id);
                    const clientAssignments = assignments.filter(a => a.clientId === client.id);
                    const overdueCount = clientAssignments.filter(a => 
                      a.status !== 'completed' && new Date(a.dueDate) < new Date()
                    ).length;
                    
                    return (
                      <div
                        key={client.id}
                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => toggleClientSelection(client.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                {client.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{client.name}</p>
                                <p className="text-sm text-gray-600 truncate">{client.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                              <span>{clientAssignments.length} assigned</span>
                              {overdueCount > 0 && (
                                <span className="text-red-600">• {overdueCount} overdue</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedClientIds.length > 0 && (
                  <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                    <p className="text-sm font-medium mb-2">
                      {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                      className="w-full"
                    >
                      Clear Selection
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* VIEW MODE: Assignment List */
              <>
                <div className="p-4 border-b flex-shrink-0">
                  <h3 className="font-semibold mb-3">Assignments</h3>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search assignments..."
                      value={assignmentSearchQuery}
                      onChange={(e) => setAssignmentSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  
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

                <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{filteredAssignments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active:</span>
                      <span className="font-medium">{assignmentCounts.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue:</span>
                      <span className="font-medium text-red-600">{assignmentCounts.overdue}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div className="w-[65%] bg-white rounded-xl border overflow-hidden flex flex-col">
            {mode === 'create' ? (
              /* CREATE MODE: Workout Selection & Form */
              selectedClientIds.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Users className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Select Clients to Get Started</h3>
                  <p className="text-gray-600">Choose one or more clients from the list to assign a workout</p>
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
                                  <span>{workout.estimatedDuration || '?'} min</span>
                                  <span>•</span>
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
                                <span className="text-gray-600">Due Date:</span>
                                <span className="font-medium">{new Date(selectedAssignment.dueDate).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Progress:</span>
                                <span className="font-medium">{selectedAssignment.progress?.completionPercentage || 0}%</span>
                              </div>
                              {selectedAssignment.notes && (
                                <div>
                                  <span className="text-gray-600 block mb-1">Notes:</span>
                                  <p className="text-sm">{selectedAssignment.notes}</p>
                                </div>
                              )}
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
                                  <span className="text-gray-600">Duration: <strong>{workout.estimatedDuration || '?'} min</strong></span>
                                  <span className="text-gray-600">Exercises: <strong>{workout.exercises?.length || 0}</strong></span>
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
                                    updateDoc(doc(db, 'assigned_workouts', selectedAssignment.id), {
                                      dueDate: Timestamp.fromDate(new Date(newDeadline))
                                    }).then(() => {
                                      alert('Deadline updated!');
                                      // Reload assignments
                                      const assignmentsQuery = query(
                                        collection(db, 'assigned_workouts'),
                                        where('trainerId', '==', user!.uid),
                                        orderBy('assignedDate', 'desc')
                                      );
                                      getDocs(assignmentsQuery).then(snapshot => {
                                        const assignmentsData: Assignment[] = [];
                                        snapshot.forEach((doc) => {
                                          const data = doc.data();
                                          assignmentsData.push({
                                            id: doc.id,
                                            clientId: data.clientId,
                                            templateId: data.templateId,
                                            trainerId: data.trainerId,
                                            assignedDate: data.assignedDate?.toDate(),
                                            dueDate: data.dueDate?.toDate(),
                                            status: data.status || 'assigned',
                                            progress: data.progress,
                                            notes: data.notes
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
      </div>
    </div>
  );
}
