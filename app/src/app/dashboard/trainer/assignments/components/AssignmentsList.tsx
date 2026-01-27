import React, { useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { Workout } from '@/types/workout';
import { ClientData, getWorkoutDisplayStatus, getStatusBadgeClasses, getStatusLabel } from '../utils/assignmentHelpers';
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

interface AssignmentsListProps {
  filteredWorkoutsData: Workout[];
  clients: ClientData[];
  selectedWorkoutData: Workout | null;
  setSelectedWorkoutData: (workout: Workout) => void;
  selectedViewClientId: string | null;
  onWorkoutDeleted?: () => void;
}

export function AssignmentsList({
  filteredWorkoutsData,
  clients,
  selectedWorkoutData,
  setSelectedWorkoutData,
  selectedViewClientId,
  onWorkoutDeleted
}: AssignmentsListProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (workout: Workout, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't select the workout
    setWorkoutToDelete(workout);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!workoutToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteWorkoutAssignment({ 
        workoutId: workoutToDelete.id 
      });
      
      toast({
        title: "Assignment Deleted",
        description: "The workout assignment has been removed.",
      });
      
      // Close dialog and refresh list
      setShowDeleteDialog(false);
      setWorkoutToDelete(null);
      
      // Call parent callback to reload workouts
      if (onWorkoutDeleted) {
        onWorkoutDeleted();
      }
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Could not delete assignment.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full flex flex-col bg-white rounded-xl border overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h3 className="font-semibold">
          {selectedViewClientId 
            ? (() => {
                const client = clients.find(c => c.id === selectedViewClientId);
                return `${client?.name}'s Workouts`;
              })()
            : 'All Workouts'}
        </h3>
        <p className="text-xs text-gray-600 mt-1">
          {filteredWorkoutsData.length} workout{filteredWorkoutsData.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredWorkoutsData.length > 0 ? (
          filteredWorkoutsData.map((workout) => {
            const client = clients.find(c => c.id === workout.clientId);
            const displayStatus = getWorkoutDisplayStatus(workout);
            const isActive = selectedWorkoutData?.id === workout.id;
            
            return (
              <div
                key={workout.id}
                onClick={() => setSelectedWorkoutData(workout)}
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
                    <p className="text-sm text-gray-600 truncate">{workout.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(displayStatus)}`}>
                        {getStatusLabel(displayStatus)}
                      </span>
                      <span className="text-xs text-gray-600">
                        Due: {workout.dueDate ? workout.dueDate.toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Delete icon - only for scheduled workouts */}
                  {workout.status === 'scheduled' && (
                    <button
                      onClick={(e) => handleDeleteClick(workout, e)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors flex-shrink-0"
                      title="Delete assignment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mb-3" />
            <p className="text-gray-600">No workouts found</p>
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
                {workoutToDelete && (
                  <div className="bg-gray-50 p-3 rounded mt-2 text-sm">
                    <p><strong>Workout:</strong> {workoutToDelete.name}</p>
                    <p><strong>Client:</strong> {clients.find(c => c.id === workoutToDelete.clientId)?.name}</p>
                    <p><strong>Scheduled:</strong> {new Date(workoutToDelete.scheduledDate).toLocaleDateString()}</p>
                  </div>
                )}
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
