import { useState, useMemo } from 'react';
import { Workout } from '@/types/workout';
import { ClientData } from '../utils/assignmentHelpers';
import { WorkoutTemplate } from './useAssignmentsData';

export function useAssignmentFilters(
  clients: ClientData[],
  workoutTemplates: WorkoutTemplate[],
  workouts: Workout[],
  mode: 'create' | 'view',
  selectedViewClientId: string | null
) {
  // Filter state
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [workoutSearchQuery, setWorkoutSearchQuery] = useState('');
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeWindowWeeks, setTimeWindowWeeks] = useState(2);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = 
        client.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(clientSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [clients, clientSearchQuery]);

  // Filtered workout templates
  const filteredWorkouts = useMemo(() => {
    return workoutTemplates.filter(workout => {
      const matchesSearch = 
        workout.name.toLowerCase().includes(workoutSearchQuery.toLowerCase()) ||
        workout.description?.toLowerCase().includes(workoutSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [workoutTemplates, workoutSearchQuery]);

  // Filtered workout data (assignments)
  const filteredWorkoutsData = useMemo(() => {
    return workouts.filter(workout => {
      // Client filter - REQUIRED when in view mode
      if (mode === 'view' && selectedViewClientId) {
        if (workout.clientId !== selectedViewClientId) {
          return false;
        }
      }
      
      // Time window filter (only in view mode with client selected)
      if (mode === 'view' && selectedViewClientId) {
        const weeksAgo = new Date();
        weeksAgo.setDate(weeksAgo.getDate() - (timeWindowWeeks * 7));
        
        const weeksForward = new Date();
        weeksForward.setDate(weeksForward.getDate() + (timeWindowWeeks * 7));
        
        const dueDate = workout.dueDate ? new Date(workout.dueDate) : new Date(workout.scheduledDate);
        if (dueDate < weeksAgo || dueDate > weeksForward) {
          return false;
        }
      }
      
      // Context-aware search
      const searchLower = assignmentSearchQuery.toLowerCase();
      const matchesSearch = 
        !assignmentSearchQuery || // If no search query, match all
        workout.name?.toLowerCase().includes(searchLower) ||
        workout.notes?.toLowerCase().includes(searchLower) ||
        workout.overallNotes?.toLowerCase().includes(searchLower);
      
      const isOverdue = workout.status !== 'completed' && workout.status !== 'skipped' && 
        workout.dueDate && new Date(workout.dueDate) < new Date();
      const actualStatus = isOverdue ? 'overdue' : workout.status;
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'overdue' && isOverdue) ||
        (statusFilter === 'in_progress' && workout.status === 'started') ||
        (statusFilter !== 'overdue' && actualStatus === statusFilter);
      
      return matchesSearch && matchesStatus;
    });
  }, [workouts, mode, selectedViewClientId, timeWindowWeeks, assignmentSearchQuery, statusFilter]);

  return {
    // State
    clientSearchQuery,
    setClientSearchQuery,
    workoutSearchQuery,
    setWorkoutSearchQuery,
    assignmentSearchQuery,
    setAssignmentSearchQuery,
    statusFilter,
    setStatusFilter,
    timeWindowWeeks,
    setTimeWindowWeeks,
    
    // Filtered data
    filteredClients,
    filteredWorkouts,
    filteredWorkoutsData
  };
}
