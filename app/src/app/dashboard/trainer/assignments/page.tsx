'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, Timestamp } from 'firebase/firestore';
import TrainerSidebar from '@/components/TrainerSidebar';
import {
  Calendar,
  Eye,
  X,
  Dumbbell,
  Users
} from 'lucide-react';

export default function AssignmentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [workoutTemplates, setWorkoutTemplates] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);
  const [extendDeadlineModalOpen, setExtendDeadlineModalOpen] = useState(false);
  const [newDeadline, setNewDeadline] = useState<string>('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const data = userDoc.data();
          
          if (data?.role !== 'trainer' && data?.role !== 'admin') {
            router.push('/dashboard/client');
            return;
          }

          // Fetch clients
          const clientsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client')
          );
          const clientsSnapshot = await getDocs(clientsQuery);
          const clientsData: any[] = [];
          clientsSnapshot.forEach((doc) => {
            clientsData.push({ id: doc.id, ...doc.data() });
          });
          setClients(clientsData);

          // Fetch workout templates
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

          // Fetch assignments
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
          console.error('Error fetching data:', error);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-600">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <TrainerSidebar currentPage="assignments" />

      <div className="ml-64 p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Workout Assignments</h1>
              <p className="text-muted-foreground mt-1">{assignments.length} assignment{assignments.length !== 1 ? 's' : ''} total</p>
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
              <Button onClick={() => router.push('/dashboard/trainer/workouts')}>
                <Dumbbell className="h-4 w-4 mr-2" />
                View Workout Library
              </Button>
            </div>
          )}
        </div>
      </div>

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
                disabled={!newDeadline || updating}
                onClick={async () => {
                  if (!newDeadline || !selectedAssignment) return;
                  
                  setUpdating(true);
                  try {
                    await updateDoc(doc(db, 'assigned_workouts', selectedAssignment.id), {
                      dueDate: Timestamp.fromDate(new Date(newDeadline))
                    });
                    
                    alert('Deadline updated successfully!');
                    setExtendDeadlineModalOpen(false);
                    setSelectedAssignment(null);
                    setNewDeadline('');
                    
                    // Reload assignments
                    const assignmentsQuery = query(
                      collection(db, 'assigned_workouts'),
                      where('trainerId', '==', user!.uid),
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
                    console.error('Error updating deadline:', error);
                    alert('Failed to update deadline. Please try again.');
                  } finally {
                    setUpdating(false);
                  }
                }}
              >
                {updating ? 'Updating...' : 'Update Deadline'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
