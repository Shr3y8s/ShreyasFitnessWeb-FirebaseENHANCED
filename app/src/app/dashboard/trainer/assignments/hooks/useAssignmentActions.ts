import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { WorkoutTemplate } from './useAssignmentsData';

export function useAssignmentActions(reloadWorkouts: () => Promise<void>) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreateAssignment = async (
    selectedClientIds: string[],
    selectedWorkout: WorkoutTemplate | null
  ) => {
    if (!user || selectedClientIds.length === 0 || !selectedWorkout || !dueDate) {
      return;
    }

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
        toast({
          title: "Workout Assigned",
          description: `Successfully assigned to ${selectedClientIds.length} client${selectedClientIds.length !== 1 ? 's' : ''}`,
        });
        
        // Reload workouts
        await reloadWorkouts();
        
        // Clear form
        setDueDate('');
        setNotes('');
        
        return true;
      } else {
        toast({
          title: "Assignment Failed",
          description: result.error?.message || "Failed to assign workout. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      console.error('Error assigning workout:', error);
      toast({
        title: "Error",
        description: "An error occurred while assigning the workout.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    dueDate,
    setDueDate,
    notes,
    setNotes,
    handleCreateAssignment
  };
}
