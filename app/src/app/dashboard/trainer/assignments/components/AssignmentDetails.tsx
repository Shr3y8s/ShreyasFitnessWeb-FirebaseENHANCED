import React, { useState } from 'react';
import { Eye, Activity, AlertCircle, Users, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import { Workout } from '@/types/workout';
import { ClientData, getWorkoutDisplayStatus, getStatusBadgeClasses, getStatusLabel } from '../utils/assignmentHelpers';
import { WorkoutExecutionDetailView } from '@/components/workouts/WorkoutExecutionDetailView';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { deleteWorkoutAssignment } from '@/lib/workout-api';
import { useToast } from '@/hooks/use-toast';

interface AssignmentDetailsProps {
  selectedWorkoutData: Workout | null;
  clients: ClientData[];
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function AssignmentDetails({
  selectedWorkoutData,
  clients,
  onNavigate,
  onBack
}: AssignmentDetailsProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to safely format dates (handles both Firestore Timestamps and Date objects)
  const formatDate = (date: any): string => {
    if (!date) return 'N/A';
    try {
      // Check if it's a Firestore Timestamp with toDate() method
      if (typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString();
      }
      // Otherwise treat as Date or date string
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkoutData) return;
    
    setIsDeleting(true);
    try {
      await deleteWorkoutAssignment({ 
        workoutId: selectedWorkoutData.id 
      });
      
      toast({
        title: "Assignment Deleted",
        description: "The workout assignment has been removed.",
      });
      
      // Close dialog and navigate back
      setShowDeleteDialog(false);
      onBack(); // Return to list
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete assignment.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedWorkoutData) {
    return (
      <div className="w-full bg-white rounded-xl border overflow-hidden flex flex-col">
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <Eye className="h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Workout Selected</h3>
          <p className="text-gray-600">Select a workout from the list to view details</p>
        </div>
      </div>
    );
  }

  const client = clients.find(c => c.id === selectedWorkoutData.clientId);
  const displayStatus = getWorkoutDisplayStatus(selectedWorkoutData);
  const hasActualData = selectedWorkoutData.exercises.some(ex => ex.actual);

  return (
    <div className="w-full bg-white rounded-xl border overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-blue-50 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to List
        </Button>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
            {client?.name?.charAt(0) || '?'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{client?.name || 'Unknown Client'}</h2>
            <p className="text-sm text-gray-600">{selectedWorkoutData.name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(displayStatus)}`}>
          {getStatusLabel(displayStatus)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Workout Info */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Workout Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Scheduled Date:</span>
              <span className="font-medium">{formatDate(selectedWorkoutData.scheduledDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">{formatDate(selectedWorkoutData.dueDate)}</span>
            </div>
            {selectedWorkoutData.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">{formatDate(selectedWorkoutData.completedAt)}</span>
              </div>
            )}
            {selectedWorkoutData.durationMinutes && (
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-medium">{selectedWorkoutData.durationMinutes} minutes</span>
              </div>
            )}
            {selectedWorkoutData.notes && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Trainer Notes:</span>
                <span className="font-medium text-right flex-1 ml-4">{selectedWorkoutData.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* Exercise Details - Side-by-Side View (Prescribed + Actual) */}
        {selectedWorkoutData.exercises && selectedWorkoutData.exercises.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Exercise Details</h3>
            </div>
            <WorkoutExecutionDetailView 
              workout={selectedWorkoutData}
              showClientNotes={true}
            />
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1 justify-start"
              onClick={() => {
                if (client) {
                  onNavigate(`/dashboard/trainer/clients-messages?clientId=${client.id}`);
                }
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Message Client
            </Button>
            
            {/* Delete button - only for scheduled workouts */}
            {selectedWorkoutData.status === 'scheduled' && (
              <Button 
                variant="outline" 
                className="flex-1 justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Assignment
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout Assignment?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Are you sure you want to delete this assignment?</p>
                <div className="bg-gray-50 p-3 rounded mt-2 text-sm">
                  <p><strong>Workout:</strong> {selectedWorkoutData.name}</p>
                  <p><strong>Client:</strong> {client?.name}</p>
                  <p><strong>Scheduled:</strong> {formatDate(selectedWorkoutData.scheduledDate)}</p>
                </div>
                <p className="text-red-600 font-medium mt-2">
                  This action cannot be undone.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete Assignment'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
