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
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Dumbbell,
  X,
  CheckCircle2,
  Clock,
  ChevronDown,
  Calendar,
  Plus
} from 'lucide-react';

interface ClientData {
  id: string;
  name: string;
  email: string;
  tier?: any;
  lastWorkout?: Date;
  workoutsCompleted: number;
  status: 'active' | 'inactive' | 'pending';
}

export default function ClientsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientData[]>([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [clientSortBy, setClientSortBy] = useState<string>('name-asc');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [clientDetailModalOpen, setClientDetailModalOpen] = useState(false);
  const [openActionsDropdown, setOpenActionsDropdown] = useState<string | null>(null);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [workoutToAssign, setWorkoutToAssign] = useState<any | null>(null);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [assignmentDeadline, setAssignmentDeadline] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const fetchClients = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          
          if (data?.role !== 'trainer' && data?.role !== 'admin') {
            router.push('/dashboard/client');
            return;
          }
          
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client'),
            orderBy('createdAt', 'desc')
          );
          
          const clientsSnapshot = await getDocs(clientsQuery);
          
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
              assignedDate: data.assignedDate?.toDate()
            });
          });
          
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
              status: status
            });
          });
          
          setClients(clientsData);
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
      }
      setLoading(false);
    };

    fetchClients();
  }, [user, router]);

  useEffect(() => {
    let filtered = [...clients];

    if (clientSearchQuery) {
      const query = clientSearchQuery.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query) ||
        client.tier?.name?.toLowerCase().includes(query)
      );
    }

    if (selectedTierFilter !== 'all') {
      filtered = filtered.filter(client => client.tier?.id === selectedTierFilter);
    }

    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === selectedStatusFilter);
    }

    filtered.sort((a, b) => {
      switch (clientSortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'workouts-desc':
          return b.workoutsCompleted - a.workoutsCompleted;
        case 'workouts-asc':
          return a.workoutsCompleted - b.workoutsCompleted;
        default:
          return 0;
      }
    });

    setFilteredClients(filtered);
  }, [clients, clientSearchQuery, selectedTierFilter, selectedStatusFilter, clientSortBy]);

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

  // Load assignments
  useEffect(() => {
    if (user) {
      const loadAssignments = async () => {
        try {
          const assignmentsQuery = query(
            collection(db, 'assigned_workouts'),
            where('trainerId', '==', user.uid),
            orderBy('assignedDate', 'desc')
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
        } catch (error) {
          console.error('Error loading assignments:', error);
        }
      };
      loadAssignments();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading clients...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="clients" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
              <p className="text-muted-foreground mt-1">{filteredClients.length} of {clients.length} clients</p>
            </div>
          </div>

          {/* Search, Filter, and Sort */}
          <div className="bg-white rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or service tier..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={selectedTierFilter}
                onChange={(e) => setSelectedTierFilter(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Tiers</option>
                <option value="in-person-training">In-Person Training</option>
                <option value="online-coaching">Online Coaching</option>
                <option value="complete-transformation">Complete Transformation</option>
                <option value="4-pack-training">4-Pack Training</option>
              </select>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={clientSortBy}
                onChange={(e) => setClientSortBy(e.target.value)}
                className="px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="workouts-desc">Most Active</option>
                <option value="workouts-asc">Least Active</option>
              </select>
            </div>

            {(clientSearchQuery || selectedTierFilter !== 'all' || selectedStatusFilter !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600 font-medium">Active Filters:</span>
                {clientSearchQuery && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                    Search: "{clientSearchQuery}"
                    <button onClick={() => setClientSearchQuery('')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedTierFilter !== 'all' && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                    Tier: {selectedTierFilter}
                    <button onClick={() => setSelectedTierFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedStatusFilter !== 'all' && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2">
                    Status: {selectedStatusFilter}
                    <button onClick={() => setSelectedStatusFilter('all')} className="hover:text-primary/70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={() => {
                    setClientSearchQuery('');
                    setSelectedTierFilter('all');
                    setSelectedStatusFilter('all');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>

          {/* Clients Table */}
          {filteredClients.length > 0 ? (
            <div className="bg-white rounded-xl border overflow-hidden">
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
                    {filteredClients.map((client) => (
                      <tr 
                        key={client.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedClient(client);
                          setClientDetailModalOpen(true);
                        }}
                      >
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
                          <span className="text-sm text-gray-600">
                            {client.lastWorkout 
                              ? new Date(client.lastWorkout).toLocaleDateString() 
                              : 'No activity'}
                          </span>
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
                        <td className="p-4" onClick={(e) => e.stopPropagation()}>
                          <div className="relative">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setOpenActionsDropdown(openActionsDropdown === client.id ? null : client.id)}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            
                            {openActionsDropdown === client.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setSelectedClient(client);
                                      setClientDetailModalOpen(true);
                                      setOpenActionsDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View Details
                                  </button>
                                  <button
                                    onClick={() => alert('Edit client functionality coming soon!')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit className="h-4 w-4" />
                                    Edit Client
                                  </button>
                                  <button
                                    onClick={() => alert('Send message functionality coming soon!')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Users className="h-4 w-4" />
                                    Send Message
                                  </button>
                                  <button
                                    onClick={() => alert('Assign workout functionality coming soon!')}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Dumbbell className="h-4 w-4" />
                                    Assign Workout
                                  </button>
                                  <div className="border-t my-1"></div>
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this client?')) {
                                        alert('Delete client functionality coming soon!');
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete Client
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Clients Found</h3>
              <p className="text-gray-600 mb-6">
                No clients match your current filters. Try adjusting your search or filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setClientSearchQuery('');
                  setSelectedTierFilter('all');
                  setSelectedStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Client Detail Modal */}
      {clientDetailModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setClientDetailModalOpen(false)}>
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-blue-50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedClient.name}</h2>
                    <div className="flex items-center gap-3 mt-1 text-gray-600">
                      <span>{selectedClient.email}</span>
                      <span>•</span>
                      <span>Member since Jan 2025</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setClientDetailModalOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button size="sm" variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    if (workoutTemplates.length === 0) {
                      alert('Please create a workout template first.');
                      return;
                    }
                    setWorkoutToAssign(workoutTemplates[0]);
                    setSelectedClients([selectedClient.id]);
                    setAssignModalOpen(true);
                  }}
                >
                  <Dumbbell className="h-4 w-4 mr-2" />
                  Assign Workout
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
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
                        {selectedClient.tier?.name || 'Basic Plan'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        selectedClient.status === 'active' ? 'bg-green-100 text-green-800' :
                        selectedClient.status === 'inactive' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedClient.status === 'active' ? '✅ Active' :
                         selectedClient.status === 'inactive' ? '❌ Inactive' :
                         '⏳ Pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Payment Type</p>
                      <p className="font-medium">
                        {selectedClient.tier?.id?.includes('online') || selectedClient.tier?.id?.includes('transformation') 
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

              {/* Workout Activity */}
              <div className="bg-white border rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Dumbbell className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">Workout Activity</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Assigned</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {assignments.filter(a => a.clientId === selectedClient.id).length}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{selectedClient.workoutsCompleted}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">In Progress</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {assignments.filter(a => a.clientId === selectedClient.id && a.status === 'in_progress').length}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                    <p className="text-2xl font-bold text-purple-600">75%</p>
                  </div>
                </div>

                {/* Recent Workouts */}
                <div>
                  <h4 className="font-medium mb-3">Recent Workouts</h4>
                  <div className="space-y-2">
                    {assignments
                      .filter(a => a.clientId === selectedClient.id)
                      .slice(0, 3)
                      .map((assignment) => {
                        const workout = workoutTemplates.find(w => w.id === assignment.templateId);
                        return (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                assignment.status === 'completed' ? 'bg-green-100' :
                                assignment.status === 'in_progress' ? 'bg-blue-100' :
                                'bg-gray-100'
                              }`}>
                                {assignment.status === 'completed' ? 
                                  <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                  <Clock className="h-4 w-4 text-blue-600" />
                                }
                              </div>
                              <div>
                                <p className="font-medium">{workout?.name || 'Unknown Workout'}</p>
                                <p className="text-sm text-gray-600">
                                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                                </p>
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              assignment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              assignment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {assignment.status === 'in_progress' ? 'In Progress' : 
                               assignment.status === 'completed' ? 'Completed' : 'Assigned'}
                            </span>
                          </div>
                        );
                      })}
                    {assignments.filter(a => a.clientId === selectedClient.id).length === 0 && (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <Dumbbell className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-600">No workouts assigned yet</p>
                        <Button size="sm" variant="outline" className="mt-3">
                          Assign First Workout
                        </Button>
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
                        {selectedClient.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{selectedClient.name}</p>
                          <span className="text-xs text-gray-500">3 days ago</span>
                        </div>
                        <p className="text-sm text-gray-600">Can we adjust Tuesday's workout? I have a conflict.</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Send New Message
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-between">
              <Button variant="outline" onClick={() => setClientDetailModalOpen(false)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <h2 className="text-2xl font-bold mb-2">Assign Workout to Client</h2>
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
              {/* Workout Selection */}
              <div>
                <label className="font-semibold mb-2 block">Select Workout *</label>
                <select
                  value={workoutToAssign?.id || ''}
                  onChange={(e) => {
                    const workout = workoutTemplates.find(w => w.id === e.target.value);
                    setWorkoutToAssign(workout);
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {workoutTemplates.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.name} • {workout.estimatedDuration} min • {workout.exercises?.length || 0} exercises
                    </option>
                  ))}
                </select>
              </div>

              {/* Client Info */}
              <div>
                <label className="font-semibold mb-2 block">Assigning to:</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                      {clients.find(c => c.id === selectedClients[0])?.name.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{clients.find(c => c.id === selectedClients[0])?.name}</p>
                      <p className="text-sm text-gray-600">{clients.find(c => c.id === selectedClients[0])?.email}</p>
                    </div>
                  </div>
                </div>
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
                  placeholder="Add any instructions or notes for the client..."
                  className="w-full min-h-[100px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Summary */}
              {assignmentDeadline && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Summary:</strong> You are about to assign <strong>{workoutToAssign.name}</strong> to{' '}
                    <strong>{clients.find(c => c.id === selectedClients[0])?.name}</strong> with a deadline of{' '}
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
                disabled={!assignmentDeadline || assigning}
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
                      alert(`Workout assigned successfully to ${clients.find(c => c.id === selectedClients[0])?.name}!`);
                      setAssignModalOpen(false);
                      setSelectedClients([]);
                      setAssignmentDeadline('');
                      setAssignmentNotes('');
                      setWorkoutToAssign(null);
                      // Reload assignments
                      const assignmentsQuery = query(
                        collection(db, 'assigned_workouts'),
                        where('trainerId', '==', user.uid),
                        orderBy('assignedDate', 'desc')
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
                {assigning ? 'Assigning...' : 'Assign Workout'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
