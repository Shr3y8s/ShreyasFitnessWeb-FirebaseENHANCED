import React, { useState } from 'react';
import { Eye, Activity, AlertCircle, Users, Calendar, ArrowLeft, Trash2, Copy } from 'lucide-react';
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

  const handleClone = () => {
    if (!selectedWorkoutData) return;
    onNavigate(`/dashboard/trainer/assignments/create?cloneFrom=${selectedWorkoutData.id}`);
  };

  if (!selectedWorkoutData) {
  return (
    <div className="w-full bg-primary/5 border border-primary/50 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-glow">
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
    <div className="w-full bg-primary/5 border border-primary/50 rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:shadow-glow">
      {/* Header */}
      <div className="p-6 border-b border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: All info in single row */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {client?.name?.charAt(0) || '?'}
            </div>
            <span className="font-bold text-xl">{client?.name || 'Unknown Client'}</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClasses(displayStatus)}`}>
              {getStatusLabel(displayStatus)}
            </span>
            <span className="text-gray-400">·</span>
            <span className="font-semibold text-base">"{selectedWorkoutData.name}"</span>
            <span className="text-gray-400">·</span>
            <span className="text-base text-gray-600 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(selectedWorkoutData.scheduledDate)} → {formatDate(selectedWorkoutData.dueDate)}
            </span>
            {selectedWorkoutData.durationMinutes && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-base text-gray-600">⏱️ {selectedWorkoutData.durationMinutes} min</span>
              </>
            )}
            {selectedWorkoutData.completedAt && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-base text-green-600">✓ Completed</span>
              </>
            )}
          </div>
          
          {/* Right: Action Buttons */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (client) {
                  onNavigate(`/dashboard/trainer/clients-messages?clientId=${client.id}`);
                }
              }}
            >
              <Users className="h-4 w-4 mr-2" />
              Message
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleClone}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4 mr-2" />
              Clone
            </Button>
            {selectedWorkoutData.status === 'scheduled' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Trainer Notes - Only show if present */}
        {selectedWorkoutData.notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Trainer Notes:</p>
            <p className="text-sm text-blue-800">{selectedWorkoutData.notes}</p>
          </div>
        )}

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
