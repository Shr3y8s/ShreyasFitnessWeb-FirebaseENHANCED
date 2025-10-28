'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import {
  Users,
  Search,
  Dumbbell,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  X,
  ChevronDown
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
  lastWorkout?: Date;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
  paymentStatus?: string;
  subscriptionStatus?: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  
  // Modal state
  const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
  const [bulkMessageModalOpen, setBulkMessageModalOpen] = useState(false);
  const [individualAssignModalOpen, setIndividualAssignModalOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<any | null>(null);
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Derived state
  const activeClient = clients.find(c => c.id === activeClientId);
  const isBulkMode = selectedClientIds.length > 0;
  const isAllSelected = filteredClients.length > 0 && 
    filteredClients.every(c => selectedClientIds.includes(c.id));

  // Selection handlers
  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds(prev => 
      prev.includes(clientId) 
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map(c => c.id));
    }
  };

  const clearSelection = () => {
    setSelectedClientIds([]);
  };

  useEffect(() => {
    const fetchClients = async () => {
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
          
          // Fetch assignments for stats
          const assignmentsQuery = query(
            collection(db, 'assigned_workouts'),
            where('trainerId', '==', user.uid)
          );
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const allAssignments: any[] = [];
          assignmentsSnapshot.forEach((doc) => {
            const data = doc.data();
            allAssignments.push({
              id: doc.id,
              ...data,
              completedAt: data.completedAt?.toDate(),
              assignedDate: data.assignedDate?.toDate(),
              dueDate: data.dueDate?.toDate()
            });
          });
          
          setAssignments(allAssignments);
          
          const clientsData: ClientData[] = [];
          
          clientsSnapshot.forEach((doc) => {
            const clientInfo = doc.data();
            const clientId = doc.id;
            
            const clientAssignments = allAssignments.filter(a => a.clientId === clientId);
            const completedAssignments = clientAssignments.filter(a => a.status === 'completed');
            const lastCompletedWorkout = completedAssignments
              .sort((a, b) => (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0))[0];
            
            let status: 'active' | 'inactive' | 'pending' = 'active';
            if (clientAssignments.length === 0) {
              status = 'pending';
            } else if (lastCompletedWorkout) {
              const daysSinceLastWorkout = Math.floor((Date.now() - lastCompletedWorkout.completedAt.getTime()) / (1000 * 60 * 60 * 24));
              if (daysSinceLastWorkout > 14) {
                status = 'inactive';
              }
            }
            
            clientsData.push({
              id: clientId,
              name: clientInfo.name,
              email: clientInfo.email,
              tier: clientInfo.tier,
              lastWorkout: lastCompletedWorkout?.completedAt || null,
              workoutsCompleted: completedAssignments.length,
              status: status,
              paymentStatus: clientInfo.paymentStatus || 'unknown',
              subscriptionStatus: clientInfo.subscriptionStatus || 'unknown'
            });
          });
          
          setClients(clientsData);
          
          // Auto-select first client
          if (clientsData.length > 0) {
            setActiveClientId(clientsData[0].id);
          }
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
        
        setLoading(false);
      };

      fetchClients();
    }, [user, router]);

  // Load workout templates
  useEffect(() => {
    if (user) {
      const loadWorkouts = async () => {
        try {
          const workoutsQuery = query(
            collection(db, 'workout_templates'),
            where('createdBy', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const workoutsSnapshot = await getDocs(workoutsQuery);
          const workoutsData: any[] = [];
          workoutsSnapshot.forEach((doc) => {
            workoutsData.push({ id: doc.id, ...doc.data() });
          });
          setWorkoutTemplates(workoutsData);
        } catch (error) {
          console.error('Error loading workouts:', error);
        }
      };
      loadWorkouts();
    }
  }, [user]);

  // Filter clients
  useEffect(() => {
    let filtered = [...clients];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query)
      );
    }

    if (tierFilter !== 'all') {
      filtered = filtered.filter(client => client.tier?.id === tierFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter);
    }

    setFilteredClients(filtered);
  }, [clients, searchQuery, tierFilter, statusFilter]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-stone-600">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <TrainerSidebar currentPage="clients" />

      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
          <p className="text-muted-foreground mt-1">{filteredClients.length} of {clients.length} clients</p>
        </div>

        {/* Master-Detail Split View */}
        <div className="flex gap-6 h-[calc(100vh-200px)]">
          {/* LEFT PANEL: Client List (35%) */}
          <div className="w-[35%] flex flex-col bg-white rounded-xl border overflow-hidden">
            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3 flex-shrink-0">
              {/* Selection Header - shows when clients can be selected */}
              {filteredClients.length > 0 && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium">
                      {selectedClientIds.length > 0 
                        ? `${selectedClientIds.length} selected` 
                        : 'Select all'}
                    </span>
                  </label>
                  {selectedClientIds.length > 0 && (
                    <button
                      onClick={clearSelection}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Tiers</option>
                  <option value="in-person-training">In-Person</option>
                  <option value="online-coaching">Online</option>
                  <option value="complete-transformation">Transform</option>
                  <option value="4-pack-training">4-Pack</option>
                </select>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Client List */}
            <div className="flex-1 overflow-y-auto">
              {filteredClients.length > 0 ? (
                <div className="divide-y">
                  {filteredClients.map((client) => {
                    const isSelected = selectedClientIds.includes(client.id);
                    return (
                      <div
                        key={client.id}
                        className={`w-full p-4 hover:bg-gray-50 transition-colors ${
                          activeClientId === client.id ? 'bg-blue-50 border-l-4 border-primary' : ''
                        } ${isSelected ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleClientSelection(client.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary flex-shrink-0"
                          />
                          
                          {/* Client Info - clickable to view details */}
                          <button
                            onClick={() => setActiveClientId(client.id)}
                            className="flex items-center gap-3 flex-1 min-w-0 text-left"
                          >
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                              {client.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{client.name}</p>
                              <p className="text-sm text-gray-600 truncate">{client.email}</p>
                            </div>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 ml-[52px]">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            client.status === 'active' ? 'bg-green-100 text-green-800' :
                            client.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {client.status}
                          </span>
                          <span className="text-xs text-gray-600">
                            {client.workoutsCompleted} workouts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Search className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-gray-600">No clients found</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTierFilter('all');
                      setStatusFilter('all');
                    }}
                    className="mt-3 text-sm text-primary hover:text-primary/80"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: Client Details OR Bulk Actions (65%) */}
          <div className="w-[65%] bg-white rounded-xl border overflow-hidden flex flex-col">
            {isBulkMode ? (
              /* BULK ACTION PANEL */
              <div className="flex flex-col h-full">
                {/* Bulk Actions Header */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-primary/5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">Bulk Actions</h2>
                      <p className="text-gray-600 mt-1">
                        {selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      <X className="h-4 w-4 mr-2" />
                      Clear Selection
                    </Button>
                  </div>

                  {/* Selected Clients List */}
                  <div className="bg-white rounded-lg p-4 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {selectedClientIds.map(clientId => {
                        const client = clients.find(c => c.id === clientId);
                        if (!client) return null;
                        return (
                          <span key={clientId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {client.name}
                            <button
                              onClick={() => toggleClientSelection(clientId)}
                              className="hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Bulk Action Cards */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {/* Send Group Message */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">Send Group Message</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          Send an announcement, reminder, or update to all selected clients at once.
                        </p>
                        <Button onClick={() => {
                          router.push(`/dashboard/trainer/clients-messages?mode=compose&clients=${selectedClientIds.join(',')}`);
                        }}>
                          <Mail className="h-4 w-4 mr-2" />
                          Compose Message
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Assign Workout */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <Dumbbell className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">Assign Workout</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          Assign the same workout program to all selected clients with a common due date.
                        </p>
                        <Button 
                          onClick={() => {
                            router.push(`/dashboard/trainer/assignments?mode=create&clients=${selectedClientIds.join(',')}`);
                          }}
                        >
                          <Dumbbell className="h-4 w-4 mr-2" />
                          Choose Workout
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Change Status */}
                  <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-primary hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-yellow-100 rounded-lg">
                        <Users className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">Update Client Status</h3>
                        <p className="text-gray-600 text-sm mb-4">
                          Bulk update the status of selected clients (Active, Inactive, Pending).
                        </p>
                        <Button variant="outline" onClick={() => alert('Bulk status update coming in Phase 3!')}>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Change Status
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Tip:</strong> Select individual clients by checking their boxes, or use "Select all" to choose all visible clients based on your current filters.
                    </p>
                  </div>
                </div>
              </div>
            ) : activeClient ? (
              <>
                {/* Client Header */}
                <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {activeClient.name.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{activeClient.name}</h2>
                        <p className="text-gray-600">{activeClient.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {/* Payment Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        activeClient.paymentStatus === 'active' ? 'bg-green-100 text-green-800' :
                        activeClient.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        💳 {activeClient.paymentStatus === 'active' ? 'Paid' : 
                            activeClient.paymentStatus === 'pending' ? 'Payment Pending' : 
                            activeClient.paymentStatus || 'Unknown'}
                      </span>
                      {/* Workout Status Badge */}
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        activeClient.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        activeClient.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        💪 {activeClient.status === 'active' ? 'Training' :
                            activeClient.status === 'inactive' ? 'Inactive' :
                            'No Workouts'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${activeClient.id}`)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        router.push(`/dashboard/trainer/assignments?mode=create&clients=${activeClient.id}`);
                      }}
                    >
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Assign Workout
                    </Button>
                  </div>
                </div>

                {/* Client Details Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Subscription & Payment Info */}
                  <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Subscription & Payments</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Current Plan</p>
                          <p className="font-semibold text-lg">
                            {activeClient.tier?.name || 'Basic Plan'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Payment Status</p>
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            activeClient.paymentStatus === 'active' ? 'bg-green-100 text-green-800' :
                            activeClient.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {activeClient.paymentStatus === 'active' ? '✅ Active' :
                             activeClient.paymentStatus === 'pending' ? '⏳ Pending' :
                             activeClient.paymentStatus || 'Unknown'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600">Payment Type</p>
                          <p className="font-medium">
                            {activeClient.tier?.id?.includes('online') || activeClient.tier?.id?.includes('transformation') 
                              ? 'Monthly Subscription' 
                              : 'One-time Payment'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Next Billing</p>
                          <p className="font-medium">Nov 24, 2025</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment History */}
                    <div className="mt-6 pt-4 border-t">
                      <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
                        <ChevronDown className="h-4 w-4" />
                        View Payment History
                      </button>
                    </div>
                  </div>

                  {/* Workout Stats */}
                  <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Dumbbell className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Workout Activity</h3>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Assigned</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {assignments.filter(a => a.clientId === activeClient.id).length}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Completed</p>
                        <p className="text-2xl font-bold text-green-600">
                          {activeClient.workoutsCompleted}
                        </p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">In Progress</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {assignments.filter(a => a.clientId === activeClient.id && a.status === 'in_progress').length}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                        <p className="text-2xl font-bold text-purple-600">75%</p>
                      </div>
                    </div>

                    {/* Recent Workouts */}
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Recent Workouts</h4>
                      <div className="space-y-2">
                        {assignments
                          .filter(a => a.clientId === activeClient.id)
                          .slice(0, 5)
                          .map((assignment) => (
                            <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  assignment.status === 'completed' ? 'bg-green-100' :
                                  'bg-blue-100'
                                }`}>
                                  {assignment.status === 'completed' ? 
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                    <Clock className="h-4 w-4 text-blue-600" />
                                  }
                                </div>
                                <div>
                                  <p className="font-medium">Workout Assignment</p>
                                  <p className="text-sm text-gray-600">
                                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {assignment.status || 'assigned'}
                              </span>
                            </div>
                          ))}
                        {assignments.filter(a => a.clientId === activeClient.id).length === 0 && (
                          <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600">No workouts assigned yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Communication History */}
                  <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold">Communication History</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                            T
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">You</p>
                              <span className="text-xs text-gray-500">2 days ago</span>
                            </div>
                            <p className="text-sm text-gray-600">Great progress on your form! Keep up the excellent work.</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">
                            {activeClient.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{activeClient.name}</p>
                              <span className="text-xs text-gray-500">3 days ago</span>
                            </div>
                            <p className="text-sm text-gray-600">Can we adjust Tuesday's workout? I have a conflict.</p>
                          </div>
                        </div>
                      </div>

                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => router.push(`/dashboard/trainer/clients-messages?clientId=${activeClient.id}`)}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Send New Message
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Users className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Client Selected</h3>
                <p className="text-gray-600">Select a client from the list to view their details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Workout Assignment Modal */}
      {bulkAssignModalOpen && selectedWorkout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setBulkAssignModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Bulk Assign Workout</h2>
                  <p className="text-gray-600">
                    Assigning to <strong>{selectedClientIds.length}</strong> client{selectedClientIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setBulkAssignModalOpen(false);
                    setAssignmentDueDate('');
                    setAssignmentNotes('');
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Workout Selection */}
              <div>
                <label className="font-semibold mb-2 block">Select Workout Template *</label>
                <select
                  value={selectedWorkout?.id || ''}
                  onChange={(e) => {
                    const workout = workoutTemplates.find(w => w.id === e.target.value);
                    setSelectedWorkout(workout);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {workoutTemplates.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} • {workout.estimatedDuration || '?'} min • {workout.exercises?.length || 0} exercises
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Clients */}
              <div>
                <label className="font-semibold mb-2 block">Assigning to:</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {selectedClientIds.map(clientId => {
                      const client = clients.find(c => c.id === clientId);
                      if (!client) return null;
                      return (
                        <span key={clientId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {client.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="font-semibold mb-2 block">Due Date *</label>
                <input
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
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
                  placeholder="Add instructions or notes for all clients..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Summary */}
              {assignmentDueDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Summary:</strong> You are about to assign <strong>{selectedWorkout.name}</strong> to{' '}
                    <strong>{selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}</strong> with a deadline of{' '}
                    <strong>{new Date(assignmentDueDate).toLocaleDateString()}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setBulkAssignModalOpen(false);
                  setAssignmentDueDate('');
                  setAssignmentNotes('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!assignmentDueDate || isProcessing}
                onClick={async () => {
                  if (!user || selectedClientIds.length === 0 || !assignmentDueDate || !selectedWorkout) return;
                  
                  setIsProcessing(true);
                  try {
                    const { assignWorkoutToClients } = await import('@/lib/firebase');
                    const result = await assignWorkoutToClients({
                      templateId: selectedWorkout.id,
                      clientIds: selectedClientIds,
                      trainerId: user.uid,
                      dueDate: new Date(assignmentDueDate),
                      notes: assignmentNotes
                    });

                    if (result.success) {
                      alert(`Success! Workout assigned to ${selectedClientIds.length} client${selectedClientIds.length !== 1 ? 's' : ''}!`);
                      setBulkAssignModalOpen(false);
                      setSelectedClientIds([]);
                      setAssignmentDueDate('');
                      setAssignmentNotes('');
                      
                      // Reload assignments
                      const assignmentsQuery = query(
                        collection(db, 'assigned_workouts'),
                        where('trainerId', '==', user.uid)
                      );
                      const assignmentsSnapshot = await getDocs(assignmentsQuery);
                      const assignmentsData: any[] = [];
                      assignmentsSnapshot.forEach((doc) => {
                        const data = doc.data();
                        assignmentsData.push({
                          id: doc.id,
                          ...data,
                          assignedDate: data.assignedDate?.toDate(),
                          dueDate: data.dueDate?.toDate()
                        });
                      });
                      setAssignments(assignmentsData);
                    } else {
                      alert(`Failed to assign workout. ${result.error?.message || 'Please try again.'}`);
                    }
                  } catch (error) {
                    console.error('Error assigning workout:', error);
                    alert('An error occurred while assigning the workout.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {isProcessing ? 'Assigning...' : `Assign to ${selectedClientIds.length} Client${selectedClientIds.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Workout Assignment Modal */}
      {individualAssignModalOpen && selectedWorkout && activeClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setIndividualAssignModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Assign Workout</h2>
                  <p className="text-gray-600">
                    Assigning to <strong>{activeClient.name}</strong>
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setIndividualAssignModalOpen(false);
                    setAssignmentDueDate('');
                    setAssignmentNotes('');
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Workout Selection */}
              <div>
                <label className="font-semibold mb-2 block">Select Workout Template *</label>
                <select
                  value={selectedWorkout?.id || ''}
                  onChange={(e) => {
                    const workout = workoutTemplates.find(w => w.id === e.target.value);
                    setSelectedWorkout(workout);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {workoutTemplates.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} • {workout.estimatedDuration || '?'} min • {workout.exercises?.length || 0} exercises
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Info */}
              <div>
                <label className="font-semibold mb-2 block">Client:</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {activeClient.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{activeClient.name}</p>
                      <p className="text-sm text-gray-600">{activeClient.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="font-semibold mb-2 block">Due Date *</label>
                <input
                  type="date"
                  value={assignmentDueDate}
                  onChange={(e) => setAssignmentDueDate(e.target.value)}
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
                  placeholder="Add instructions or notes for this client..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Summary */}
              {assignmentDueDate && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Summary:</strong> You are about to assign <strong>{selectedWorkout.name}</strong> to{' '}
                    <strong>{activeClient.name}</strong> with a deadline of{' '}
                    <strong>{new Date(assignmentDueDate).toLocaleDateString()}</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIndividualAssignModalOpen(false);
                  setAssignmentDueDate('');
                  setAssignmentNotes('');
                }}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!assignmentDueDate || isProcessing}
                onClick={async () => {
                  if (!user || !activeClient || !assignmentDueDate || !selectedWorkout) return;
                  
                  setIsProcessing(true);
                  try {
                    const { assignWorkoutToClients } = await import('@/lib/firebase');
                    const result = await assignWorkoutToClients({
                      templateId: selectedWorkout.id,
                      clientIds: [activeClient.id],
                      trainerId: user.uid,
                      dueDate: new Date(assignmentDueDate),
                      notes: assignmentNotes
                    });

                    if (result.success) {
                      alert(`Success! Workout assigned to ${activeClient.name}!`);
                      setIndividualAssignModalOpen(false);
                      setAssignmentDueDate('');
                      setAssignmentNotes('');
                      
                      // Reload assignments
                      const assignmentsQuery = query(
                        collection(db, 'assigned_workouts'),
                        where('trainerId', '==', user.uid)
                      );
                      const assignmentsSnapshot = await getDocs(assignmentsQuery);
                      const assignmentsData: any[] = [];
                      assignmentsSnapshot.forEach((doc) => {
                        const data = doc.data();
                        assignmentsData.push({
                          id: doc.id,
                          ...data,
                          assignedDate: data.assignedDate?.toDate(),
                          dueDate: data.dueDate?.toDate()
                        });
                      });
                      setAssignments(assignmentsData);
                    } else {
                      alert(`Failed to assign workout. ${result.error?.message || 'Please try again.'}`);
                    }
                  } catch (error) {
                    console.error('Error assigning workout:', error);
                    alert('An error occurred while assigning the workout.');
                  } finally {
                    setIsProcessing(false);
                  }
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {isProcessing ? 'Assigning...' : 'Assign Workout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
